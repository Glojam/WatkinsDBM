const { contextBridge, ipcRenderer } = require('electron/renderer');

contextBridge.exposeInMainWorld('electronAPI', {
    getData: (tableName, args) => ipcRenderer.invoke('get-data', tableName, args),
    update: (tableName, rowsList) => ipcRenderer.invoke('update-data', tableName, rowsList),
    insert: (tableName, rowsList) => ipcRenderer.invoke('insert-data', tableName, rowsList),
    upload: () => ipcRenderer.invoke('upload-file'),
    sendExportToPDF: (html) => ipcRenderer.send('export-to-pdf', html),
    showPrompt: (type, message, hint, title) => ipcRenderer.invoke('show-message', type, message, hint, title),
    onGetColumns: (callback) => ipcRenderer.on('get-cols', (_event, value) => callback(value)),
    onShowHelp: (callback) => ipcRenderer.on('show-help', (_event, value) => callback(value)),
    onExportToPDF: (callback) => ipcRenderer.on('export-to-pdf', callback),
});