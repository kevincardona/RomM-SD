import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import os from 'node:os';
import { exec } from 'node:child_process';
import util from 'node:util';
const execAsync = util.promisify(exec);
const require = createRequire(import.meta.url);

import { initControllers } from './electron/controllers.js';
import { launchGame, runCloudSync } from './electron/launchers.js';
import { addToSteam, addSelfToSteam } from './electron/steamShortcuts.js';
import { downloadRom } from './electron/downloads.js';
import { makeLogger, readConfig, writeConfig, getLogPath, getConfigPath } from './electron/config.js';
import { getEmulatorCommands } from './electron/launchers.js';
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

ipcMain.handle('show-keyboard', async () => {
  try { await execAsync('xdg-open steam://open/keyboard'); } catch (_) {}
});
