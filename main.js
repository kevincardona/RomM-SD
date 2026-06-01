import { app, BrowserWindow, ipcMain, session } from 'electron';
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
import { addToSteam, addSelfToSteam } from './electron/steamShortcuts.js';
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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const logger = makeLogger();

let sdl = null;
try { sdl = require('@kmamal/sdl'); }
catch (e) { logger.error(`SDL not available, controller support disabled: ${e.message}`); }

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
    const { hostname } = new URL(baseUrl);
    const ses = session.fromPartition(BROWSER_PLAY_PARTITION);
    // SameSite is intentionally unset: the window starts at about:blank, and
    // samesite=strict cookies would be dropped on the first cross-site nav.
    // The server's own response to the page load will set a CSRF cookie;
    // we only need to seed the session cookie here.
    await ses.cookies.set({ url: baseUrl, name: 'romm_session', value: auth.sessionId, domain: hostname, path: '/', httpOnly: true });

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
