const { contextBridge, ipcRenderer } = require('electron/renderer')

contextBridge.exposeInMainWorld('electronAPI', {
  getData: () => ipcRenderer.invoke('getData'),
  upload: () => ipcRenderer.invoke('upload-file'),
})