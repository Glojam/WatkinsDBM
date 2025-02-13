const { contextBridge, ipcRenderer } = require('electron/renderer');

contextBridge.exposeInMainWorld('electronAPI', {
  getData: (args) => ipcRenderer.invoke('getData', args),
  upload: () => ipcRenderer.invoke('upload-file'),
  onShowHelp: (callback) => ipcRenderer.on('show-help', (_event, value) => callback(value)),
});