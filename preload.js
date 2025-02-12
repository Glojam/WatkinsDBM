const { contextBridge, ipcRenderer } = require('electron/renderer')

contextBridge.exposeInMainWorld('electronAPI', {
  getData: (args) => ipcRenderer.invoke('getData', args),
  upload: () => ipcRenderer.invoke('upload-file'),
})