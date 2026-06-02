const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  ping: () => ipcRenderer.invoke('ping'),
  getConfig: () => ipcRenderer.invoke('get-config'),
  getHomeDir: () => ipcRenderer.invoke('get-homedir'),
  getLogs: () => ipcRenderer.invoke('get-logs'),
  getVersion: () => ipcRenderer.invoke('get-version'),
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),
  checkFileExists: (filePath) => ipcRenderer.invoke('check-file-exists', filePath),
  checkBulkFiles: (filePaths) => ipcRenderer.invoke('check-bulk-files', filePaths),
  deleteFile: (filePath) => ipcRenderer.invoke('delete-file', filePath),
  downloadRom: (data) => ipcRenderer.invoke('download-rom', data),
  onDownloadProgress: (callback) => {
    const listener = (event, data) => callback(data);
    ipcRenderer.on('download-progress', listener);
    return () => ipcRenderer.removeListener('download-progress', listener);
  },
  addToSteam: (data) => ipcRenderer.invoke('add-to-steam', data),
  addSelfToSteam: () => ipcRenderer.invoke('add-self-to-steam'),
  addBrowserGameToSteam: (data) => ipcRenderer.invoke('add-browser-game-to-steam', data),
  getPendingDeepLink: () => ipcRenderer.invoke('get-pending-deep-link'),
  launchGame: (data) => ipcRenderer.invoke('launch-game', data),
  runCloudSync: (action) => ipcRenderer.invoke('run-cloud-sync', action),
  listGameSaves: (data) => ipcRenderer.invoke('list-game-saves', data),
  getSaveStatus: (data) => ipcRenderer.invoke('get-save-status', data),
  pushSaves: (data) => ipcRenderer.invoke('push-saves', data),
  pullSaves: (data) => ipcRenderer.invoke('pull-saves', data),
  deleteCachedSave: (data) => ipcRenderer.invoke('delete-cached-save', data),
  deleteSaveFile: (data) => ipcRenderer.invoke('delete-save-file', data),
  listAllCachedGames: (data) => ipcRenderer.invoke('list-all-cached-games', data),
  listGamesWithSaves: (data) => ipcRenderer.invoke('list-games-with-saves', data),
  snapshotGame: (data) => ipcRenderer.invoke('snapshot-game', data),
  startSaveWatcher: (data) => ipcRenderer.invoke('start-save-watcher', data),
  stopSaveWatcher: (data) => ipcRenderer.invoke('stop-save-watcher', data),
  resolveBiosPaths: (data) => ipcRenderer.invoke('resolve-bios-paths', data),
  getBiosBasePath: (data) => ipcRenderer.invoke('get-bios-base-path', data),
  openBrowserPlay: (data) => ipcRenderer.invoke('open-browser-play', data),
  closeBrowserPlay: () => ipcRenderer.invoke('close-browser-play'),
  controllerRumble: (opts) => ipcRenderer.invoke('controller-rumble', opts),
  showKeyboard: () => ipcRenderer.invoke('show-keyboard'),
  onControllerButton: (cb) => {
    const listener = (_e, data) => cb(data);
    ipcRenderer.on('controller-button', listener);
    return () => ipcRenderer.removeListener('controller-button', listener);
  },
  onControllerAxis: (cb) => {
    const listener = (_e, data) => cb(data);
    ipcRenderer.on('controller-axis', listener);
    return () => ipcRenderer.removeListener('controller-axis', listener);
  },

  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  installUpdate: () => ipcRenderer.invoke('install-update'),
  onUpdateChecking: (cb) => {
    const listener = () => cb();
    ipcRenderer.on('update-checking', listener);
    return () => ipcRenderer.removeListener('update-checking', listener);
  },
  onUpdateAvailable: (cb) => {
    const listener = (_e, data) => cb(data);
    ipcRenderer.on('update-available', listener);
    return () => ipcRenderer.removeListener('update-available', listener);
  },
  onUpdateNotAvailable: (cb) => {
    const listener = (_e, data) => cb(data);
    ipcRenderer.on('update-not-available', listener);
    return () => ipcRenderer.removeListener('update-not-available', listener);
  },
  onUpdateProgress: (cb) => {
    const listener = (_e, data) => cb(data);
    ipcRenderer.on('update-progress', listener);
    return () => ipcRenderer.removeListener('update-progress', listener);
  },
  onUpdateDownloaded: (cb) => {
    const listener = (_e, data) => cb(data);
    ipcRenderer.on('update-downloaded', listener);
    return () => ipcRenderer.removeListener('update-downloaded', listener);
  },
  onUpdateError: (cb) => {
    const listener = (_e, data) => cb(data);
    ipcRenderer.on('update-error', listener);
    return () => ipcRenderer.removeListener('update-error', listener);
  },

  getUninstallSummary: (config) => ipcRenderer.invoke('get-uninstall-summary', config),
  uninstallWipeGames: (config) => ipcRenderer.invoke('uninstall-wipe-games', config),
  uninstallWipeBios: (config) => ipcRenderer.invoke('uninstall-wipe-bios', config),
  uninstallWipeSaves: () => ipcRenderer.invoke('uninstall-wipe-saves'),
  uninstallWipeConfig: () => ipcRenderer.invoke('uninstall-wipe-config'),
  uninstallWipeLibraryCache: () => ipcRenderer.invoke('uninstall-wipe-library-cache'),
  uninstallRemoveFromSteam: () => ipcRenderer.invoke('uninstall-remove-from-steam'),
  openAppImageLocation: () => ipcRenderer.invoke('open-appimage-location'),
  getAppImagePath: () => ipcRenderer.invoke('get-appimage-path'),

  getLibraryCache: () => ipcRenderer.invoke('get-library-cache'),
  saveLibraryCache: (library) => ipcRenderer.invoke('save-library-cache', library),
  clearLibraryCache: () => ipcRenderer.invoke('clear-library-cache'),

  checkPrerequisites: () => ipcRenderer.invoke('check-prerequisites'),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  fetchImage: (url, token) => ipcRenderer.invoke('fetch-image', url, token),
  checkRyujinxFirmware: () => ipcRenderer.invoke('check-ryujinx-firmware'),
  installSwitchFirmware: (firmwarePath) => ipcRenderer.invoke('install-switch-firmware', firmwarePath),
});
