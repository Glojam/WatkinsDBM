const { contextBridge, ipcRenderer } = require('electron/renderer')

contextBridge.exposeInMainWorld('electronAPI', {
  getData: () => ipcRenderer.invoke('getData'),
  upload: (file) => ipcRenderer.invoke('upload-file', file)
})