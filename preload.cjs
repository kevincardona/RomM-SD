const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  ping: () => ipcRenderer.invoke('ping'),
  getConfig: () => ipcRenderer.invoke('get-config'),
  getHomeDir: () => ipcRenderer.invoke('get-homedir'),
  getLogs: () => ipcRenderer.invoke('get-logs'),
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
});
