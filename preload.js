// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld("electron", {
    ipcRenderer: ipcRenderer,
    onResponse: (fn) => {
        ipcRenderer.on("tasks.return", (event, ...args) => fn(...args));
    }
});