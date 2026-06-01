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
  onDownloadProgress: (callback) => ipcRenderer.on('download-progress', (event, data) => callback(data)),
  addToSteam: (data) => ipcRenderer.invoke('add-to-steam', data),
  addSelfToSteam: () => ipcRenderer.invoke('add-self-to-steam'),
  launchGame: (data) => ipcRenderer.invoke('launch-game', data),
  runCloudSync: (action) => ipcRenderer.invoke('run-cloud-sync', action),
  controllerRumble: (opts) => ipcRenderer.invoke('controller-rumble', opts),
  showKeyboard: () => ipcRenderer.invoke('show-keyboard'),
  onControllerButton: (cb) => ipcRenderer.on('controller-button', (_e, data) => cb(data)),
  onControllerAxis: (cb) => ipcRenderer.on('controller-axis', (_e, data) => cb(data)),
  offControllerButton: (cb) => ipcRenderer.removeListener('controller-button', cb),
  offControllerAxis: (cb) => ipcRenderer.removeListener('controller-axis', cb),
});
