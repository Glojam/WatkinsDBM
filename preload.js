const { contextBridge, ipcRenderer } = require('electron/renderer');

contextBridge.exposeInMainWorld('electronAPI', {
  getData: (args) => ipcRenderer.invoke('get-data', args),
  update: (tableName, rowsList) => ipcRenderer.invoke('update-data', tableName, rowsList),
  upload: () => ipcRenderer.invoke('upload-file'),
  showPrompt: (type, message, hint) => ipcRenderer.invoke('show-message', type, message, hint),
  onGetColumns: (callback) => ipcRenderer.on('get-cols', (_event, value) => callback(value)),
  onShowHelp: (callback) => ipcRenderer.on('show-help', (_event, value) => callback(value)),
});