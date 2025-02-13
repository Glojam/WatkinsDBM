const { contextBridge, ipcRenderer } = require('electron/renderer');

contextBridge.exposeInMainWorld('electronAPI', {
  getData: (args) => ipcRenderer.invoke('getData', args),
  update: (args) => ipcRenderer.invoke('update-data', args),
  upload: () => ipcRenderer.invoke('upload-file'),
  onShowHelp: (callback) => ipcRenderer.on('show-help', (_event, value) => callback(value)),
});