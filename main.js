import { app, BrowserWindow, ipcMain, session, shell } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import os from 'node:os';
import { exec } from 'node:child_process';
import util from 'node:util';
const execAsync = util.promisify(exec);
const require = createRequire(import.meta.url);

import { initControllers } from './electron/controllers.js';
import { launchGame, runCloudSync, getEmulatorCommands, resolveInstallPaths, biosBasePath } from './electron/launchers.js';
import { addToSteam, addSelfToSteam, addBrowserGameToSteam, removeFromSteam } from './electron/steamShortcuts.js';
import { downloadRom } from './electron/downloads.js';
import { makeLogger, readConfig, writeConfig, getLogPath, getConfigPath } from './electron/config.js';
import {
  listGameSaves,
  getSaveStatus,
  pushSaves,
  pullSaves,
  deleteCachedSave,
  listAllCachedGames,
  listAllGamesWithSaves,
  deleteSaveFile,
  snapshotGame,
  startSaveWatcher,
  stopSaveWatcher,
  stopAllWatchers,
} from './electron/saveManager.js';
import {
  getUninstallSummary,
  wipeGames,
  wipeBios,
  wipeSaves,
  wipeConfig,
  wipeLibraryCache,
  readLibraryCache,
  writeLibraryCache,
  openAppImageLocation,
  getAppImagePath,
} from './electron/uninstall.js';
import { checkPrerequisites } from './electron/prerequisites.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const logger = makeLogger();

// Parse startup deep link: --play-browser-rom <romId> or --play-browser-rom=<romId>
const pendingDeepLinkRomId = (() => {
  const eqArg = process.argv.find(a => a.startsWith('--play-browser-rom='));
  if (eqArg) return eqArg.split('=')[1];
  const idx = process.argv.indexOf('--play-browser-rom');
  return idx !== -1 && process.argv[idx + 1] ? process.argv[idx + 1] : null;
})();

let sdl = null;
try { sdl = require('@kmamal/sdl'); }
catch (e) { logger.error(`SDL not available, controller support disabled: ${e.message}`); }

let autoUpdater = null;
try { autoUpdater = require('electron-updater').autoUpdater; }
catch (e) { logger.error(`electron-updater unavailable: ${e.message}`); }

let controllers = null;

function createWindow() {
  const win = new BrowserWindow({
    width: 1280, height: 800,
    title: 'ROMM-SD',
    icon: path.join(__dirname, 'build', 'icon.png'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  if (process.env.VITE_DEV_SERVER_URL) win.loadURL(process.env.VITE_DEV_SERVER_URL);
  else win.loadFile(path.join(__dirname, 'dist', 'index.html'));
  return win;
}

app.whenReady().then(() => {
  createWindow();
  controllers = initControllers(sdl, logger);
  initAutoUpdater();

  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => {
  stopAllWatchers();
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('ping', () => 'pong');
ipcMain.handle('get-config', readConfig);
ipcMain.handle('save-config', async (_e, config) => { try { await writeConfig(config); return { success: true }; } catch (e) { return { success: false, error: e.message }; } });
ipcMain.handle('get-homedir', () => os.homedir());
ipcMain.handle('get-logs', async () => { try { return await (await import('node:fs/promises')).readFile(getLogPath(), 'utf-8'); } catch { return 'No logs found.'; } });
ipcMain.handle('get-config-path', () => getConfigPath());
ipcMain.handle('get-version', async () => {
  try {
    const appImage = process.env.APPIMAGE;
    if (!appImage) return require('./package.json').version;
    const sidecar = path.join(path.dirname(appImage), 'romm-sd.version');
    return await (await import('node:fs/promises')).readFile(sidecar, 'utf-8');
  } catch { return require('./package.json').version; }
});

ipcMain.handle('check-file-exists', async (_e, filePath) => {
  try { const s = await (await import('node:fs/promises')).stat(filePath); return { exists: true, size: s.size }; }
  catch (e) { return { exists: false, size: 0, error: e.message }; }
});

ipcMain.handle('check-bulk-files', async (_e, filePaths) => {
  const fs = await import('node:fs/promises');
  const results = await Promise.all(filePaths.map(async (p) => { try { await fs.access(p); return true; } catch { return false; } }));
  return { success: true, results };
});

ipcMain.handle('delete-file', async (_e, filePath) => {
  try { await (await import('node:fs/promises')).unlink(filePath); return { success: true }; }
  catch (e) { return { success: false, error: e.message }; }
});

ipcMain.handle('download-rom', (event, payload) => downloadRom({ ...payload, sender: event.sender }, logger));

ipcMain.handle('launch-game', async (_e, payload) => {
  return await launchGame(payload, logger);
});
ipcMain.handle('run-cloud-sync', (_e, action) => runCloudSync(action, logger));

ipcMain.handle('list-game-saves', async (_e, payload) => {
  return await listGameSaves(payload);
});
ipcMain.handle('get-save-status', async (_e, payload) => {
  return await getSaveStatus(payload);
});
ipcMain.handle('push-saves', async (event, payload) => {
  return await pushSaves({ ...payload, sender: event.sender, logInfo: logger.info, logError: logger.error });
});
ipcMain.handle('pull-saves', async (event, payload) => {
  return await pullSaves({ ...payload, sender: event.sender, logInfo: logger.info, logError: logger.error });
});
ipcMain.handle('delete-cached-save', async (_e, payload) => {
  return await deleteCachedSave(payload);
});
ipcMain.handle('delete-save-file', async (_e, payload) => {
  return await deleteSaveFile(payload);
});
ipcMain.handle('list-all-cached-games', async (_e, payload) => {
  return await listAllCachedGames(payload || {});
});
ipcMain.handle('list-games-with-saves', async (_e, payload) => {
  return await listAllGamesWithSaves(payload);
});
ipcMain.handle('snapshot-game', async (event, payload) => {
  return await snapshotGame({ ...payload, logInfo: logger.info, logError: logger.error });
});
ipcMain.handle('start-save-watcher', async (_e, payload) => {
  const { gameKey, ...opts } = payload || {};
  if (!gameKey) return { success: false, error: 'gameKey required' };
  startSaveWatcher(gameKey, { ...opts, logInfo: logger.info, logError: logger.error });
  return { success: true };
});
ipcMain.handle('stop-save-watcher', async (_e, payload) => {
  const { gameKey } = payload || {};
  if (!gameKey) return { success: false, error: 'gameKey required' };
  stopSaveWatcher(gameKey);
  return { success: true };
});

ipcMain.handle('add-to-steam', (_e, payload) => addToSteam(payload, { ...logger, resolveCommands: getEmulatorCommands }));
ipcMain.handle('add-self-to-steam', () => addSelfToSteam(logger));
ipcMain.handle('add-browser-game-to-steam', (_e, payload) => addBrowserGameToSteam(payload, logger));
ipcMain.handle('get-pending-deep-link', () => pendingDeepLinkRomId ? { type: 'browser-play', romId: pendingDeepLinkRomId } : null);

ipcMain.handle('controller-rumble', (_e, opts) => { controllers?.rumble(opts); });

ipcMain.handle('resolve-bios-paths', (_e, payload) => {
  try {
    return { success: true, paths: resolveInstallPaths(payload || {}) };
  } catch (e) { return { success: false, error: e.message }; }
});
ipcMain.handle('get-bios-base-path', (_e, payload) => {
  try { return { success: true, path: biosBasePath(payload?.emudeckPath) }; }
  catch (e) { return { success: false, error: e.message }; }
});

const BROWSER_PLAY_PARTITION = 'persist:romm-play';
let browserPlayWindow = null;

async function rommSessionLogin(baseUrl, token) {
  // RomM's /api/login is POST-only; the CSRF middleware short-circuits when
  // an Authorization: Basic ... header is present, so no CSRF cookie/header
  // dance is needed. The response carries a romm_session cookie set by
  // RedisSessionMiddleware — we just lift it into the Electron session.
  const res = await fetch(`${baseUrl}/api/login`, {
    method: 'POST',
    headers: { 'Authorization': token },
  });
  if (res.status === 401 || res.status === 403) {
    throw new Error('RomM rejected the saved credentials — re-check your username/password in Settings');
  }
  if (!res.ok) throw new Error(`RomM login returned ${res.status}`);
  const setCookie = res.headers.get('set-cookie') || '';
  const sessionMatch = setCookie.match(/(?:^|, |; )romm_session=([^;,]+)/);
  if (!sessionMatch) throw new Error('RomM did not issue a session cookie (check that auth is enabled on the server)');
  return { sessionId: sessionMatch[1].trim() };
}

ipcMain.handle('open-browser-play', async (_e, payload) => {
  const { serverUrl, romId, romName, token } = payload || {};
  if (!serverUrl || !romId) return { success: false, error: 'serverUrl and romId required' };

  let baseUrl;
  try {
    baseUrl = new URL(serverUrl).origin;
  } catch (e) {
    return { success: false, error: `Invalid server URL: ${e.message}` };
  }
  const playUrl = `${baseUrl}/console/rom/${encodeURIComponent(romId)}/play`;

  if (browserPlayWindow && !browserPlayWindow.isDestroyed()) {
    try { browserPlayWindow.close(); } catch { /* already destroyed */ }
  }

  try {
    const auth = await rommSessionLogin(baseUrl, token);
    const ses = session.fromPartition(BROWSER_PLAY_PARTITION);
    // Set the session cookie scoped to the URL — no explicit domain so Electron
    // derives it correctly (explicit domain breaks IP-address servers).
    // expirationDate keeps the session alive across opens so save states persist.
    await ses.cookies.set({
      url: baseUrl,
      name: 'romm_session',
      value: auth.sessionId,
      path: '/',
      httpOnly: true,
      expirationDate: Math.floor(Date.now() / 1000) + 86400,
    });

    browserPlayWindow = new BrowserWindow({
      width: 1280,
      height: 800,
      title: romName ? `▶ ${romName}` : 'RomM Play',
      autoHideMenuBar: true,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        partition: BROWSER_PLAY_PARTITION,
      },
    });
    browserPlayWindow.on('closed', () => { browserPlayWindow = null; });

    await browserPlayWindow.loadURL(playUrl);
    logger.info(`Browser play: opened ${playUrl} for ${romName || `rom ${romId}`}`);
    return { success: true };
  } catch (e) {
    logger.error(`Browser play: ${e.message}`);
    return { success: false, error: e.message };
  }
});

ipcMain.handle('close-browser-play', () => {
  if (browserPlayWindow && !browserPlayWindow.isDestroyed()) {
    try { browserPlayWindow.close(); } catch { /* already destroyed */ }
  }
  browserPlayWindow = null;
  return { success: true };
});

app.on('before-quit', () => {
  if (browserPlayWindow && !browserPlayWindow.isDestroyed()) {
    try { browserPlayWindow.close(); } catch { /* already destroyed */ }
  }
});

ipcMain.handle('show-keyboard', async () => {
  try { await execAsync('xdg-open steam://open/keyboard'); } catch (_) {}
});

function initAutoUpdater() {
  if (!autoUpdater || !app.isPackaged) return;
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.logger = {
    info: (m) => logger.info(`[updater] ${m}`),
    warn: (m) => logger.info(`[updater] ${m}`),
    error: (m) => logger.error(`[updater] ${m}`),
    debug: () => {},
    log: () => {},
  };
  const forward = (channel, payload) => {
    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed()) win.webContents.send(channel, payload);
    }
  };
  autoUpdater.on('checking-for-update', () => forward('update-checking', null));
  autoUpdater.on('update-available', (info) => forward('update-available', {
    version: info.version,
    releaseName: info.releaseName || null,
    releaseNotes: typeof info.releaseNotes === 'string' ? info.releaseNotes : null,
    releaseDate: info.releaseDate,
  }));
  autoUpdater.on('update-not-available', (info) => forward('update-not-available', { version: info.version }));
  autoUpdater.on('download-progress', (p) => forward('update-progress', {
    percent: p.percent,
    transferred: p.transferred,
    total: p.total,
    bytesPerSecond: p.bytesPerSecond,
  }));
  autoUpdater.on('update-downloaded', (info) => forward('update-downloaded', { version: info.version }));
  autoUpdater.on('error', (err) => forward('update-error', { message: err?.message || String(err) }));
}

ipcMain.handle('check-for-updates', async () => {
  if (!autoUpdater || !app.isPackaged) {
    return { supported: false, currentVersion: require('./package.json').version, reason: !app.isPackaged ? 'dev' : 'updater-unavailable' };
  }
  try {
    const result = await autoUpdater.checkForUpdates();
    return {
      supported: true,
      currentVersion: autoUpdater.currentVersion?.version || require('./package.json').version,
      updateInfo: result?.updateInfo ? {
        version: result.updateInfo.version,
        releaseName: result.updateInfo.releaseName || null,
        releaseNotes: typeof result.updateInfo.releaseNotes === 'string' ? result.updateInfo.releaseNotes : null,
        releaseDate: result.updateInfo.releaseDate,
      } : null,
    };
  } catch (e) {
    return { supported: true, error: e.message, currentVersion: require('./package.json').version };
  }
});

ipcMain.handle('download-update', async () => {
  if (!autoUpdater) return { success: false, error: 'Updater unavailable' };
  try { await autoUpdater.downloadUpdate(); return { success: true }; }
  catch (e) { return { success: false, error: e.message }; }
});

ipcMain.handle('install-update', () => {
  if (!autoUpdater) return { success: false, error: 'Updater unavailable' };
  autoUpdater.quitAndInstall();
  return { success: true };
});

ipcMain.handle('get-uninstall-summary', async (_e, config) => {
  return await getUninstallSummary(config || {});
});

ipcMain.handle('uninstall-wipe-games', async (_e, config) => wipeGames(config || {}));
ipcMain.handle('uninstall-wipe-bios', async (_e, config) => wipeBios(config || {}));
ipcMain.handle('uninstall-wipe-saves', () => wipeSaves());
ipcMain.handle('uninstall-wipe-config', () => wipeConfig());
ipcMain.handle('uninstall-wipe-library-cache', () => wipeLibraryCache());
ipcMain.handle('uninstall-remove-from-steam', async () => removeFromSteam('ROMM-SD'));
ipcMain.handle('open-appimage-location', () => openAppImageLocation());
ipcMain.handle('get-appimage-path', () => getAppImagePath());

ipcMain.handle('get-library-cache', () => readLibraryCache());
ipcMain.handle('save-library-cache', async (_e, library) => writeLibraryCache(library));
ipcMain.handle('clear-library-cache', () => wipeLibraryCache());

ipcMain.handle('check-prerequisites', async () => {
  try { return { success: true, ...(await checkPrerequisites()) }; }
  catch (e) { return { success: false, error: e.message }; }
});

ipcMain.handle('check-ryujinx-firmware', async () => {
  const { readdir } = await import('node:fs/promises');
  const HOME = os.homedir();
  const candidates = [
    path.join(HOME, '.config', 'Ryujinx', 'bis', 'system', 'Contents', 'registered'),
    path.join(HOME, '.var', 'app', 'org.ryujinx.Ryujinx', 'config', 'Ryujinx', 'bis', 'system', 'Contents', 'registered'),
  ];
  for (const p of candidates) {
    try {
      const entries = await readdir(p);
      if (entries.length > 0) return { installed: true };
    } catch {}
  }
  return { installed: false };
});

ipcMain.handle('install-switch-firmware', async (_e, firmwarePath) => {
  const HOME = os.homedir();
  const launcherPath = path.join(HOME, 'Emulation', 'tools', 'launchers', 'ryujinx.sh');

  // Try Flatpak Ryujinx (most common on Linux/Steam Deck via EmuDeck)
  try {
    await execAsync('which flatpak');
    exec(`flatpak run org.ryujinx.Ryujinx --install-firmware "${firmwarePath}"`);
    return { success: true, message: 'Ryujinx is opening to install the firmware. When prompted, confirm the install, then close Ryujinx.' };
  } catch {
    logger.info('install-switch-firmware: flatpak not available');
  }

  // Try EmuDeck launcher script
  try {
    await execAsync(`[ -x "${launcherPath}" ]`);
    exec(`"${launcherPath}" --install-firmware "${firmwarePath}"`);
    return { success: true, message: 'Ryujinx is opening to install the firmware. When prompted, confirm the install, then close Ryujinx.' };
  } catch {
    logger.info('install-switch-firmware: EmuDeck launcher not available or not executable');
  }

  return {
    success: false,
    error: `Ryujinx could not be launched automatically.\n\nTo install manually:\n1. Open Ryujinx\n2. Tools → Install Firmware\n3. Select the file at: ${firmwarePath}`,
  };
});

ipcMain.handle('fetch-image', async (_e, url, token) => {
  try {
    const headers = {};
    if (token) headers['Authorization'] = token;
    const res = await fetch(url, { headers });
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    return Buffer.from(buf).toString('base64');
  } catch {
    return null;
  }
});

ipcMain.handle('open-external', async (_e, url) => {
  if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) {
    return { success: false, error: 'Only http(s) URLs are allowed.' };
  }
  try { await shell.openExternal(url); return { success: true }; }
  catch (e) { return { success: false, error: e.message }; }
});
