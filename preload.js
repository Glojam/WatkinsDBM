const { contextBridge, ipcRenderer } = require('electron/renderer');

contextBridge.exposeInMainWorld('electronAPI', {
  getData: (args) => ipcRenderer.invoke('get-data', args),
  update: (args) => ipcRenderer.invoke('update-data', args),
  upload: () => ipcRenderer.invoke('upload-file'),
  onGetColumns: (callback) => ipcRenderer.on('get-cols', (_event, value) => callback(value)),
  onShowHelp: (callback) => ipcRenderer.on('show-help', (_event, value) => callback(value)),
});