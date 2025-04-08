const { contextBridge, ipcRenderer } = require('electron/renderer');

contextBridge.exposeInMainWorld('electronAPI', {
    getData: (tableName, args) => ipcRenderer.invoke('get-data', tableName, args),
    update: (tableName, rowsList) => ipcRenderer.invoke('update-data', tableName, rowsList),
    insert: (tableName, rowsList) => ipcRenderer.invoke('insert-data', tableName, rowsList),
    upload: () => ipcRenderer.invoke('upload-file'),
    login: (credentials) => ipcRenderer.invoke('login', credentials),
    logout: () => ipcRenderer.send('logout'),
    setUserRole: (role) => ipcRenderer.send('set-user-role', role),
    showPrompt: (type, message, hint, title) => ipcRenderer.invoke('show-message', type, message, hint, title),
    getMoreInputs: (callback) => ipcRenderer.on('get-inputs', (_event, value) => callback(value)),
    onGetColumns: (callback) => ipcRenderer.on('get-cols', (_event, value) => callback(value)),
    onGetIsDev: (callback) => ipcRenderer.on('get-is-dev', (_event, value) => callback(value)),
    onShowHelp: (callback) => ipcRenderer.on('show-help', (_event, value) => callback(value)),
    onExportToPDF: (callback) => ipcRenderer.on('export-to-pdf', callback),
    sendExportToPDF: (html) => ipcRenderer.send('export-to-pdf', html),
    onExportToCSV: (callback) => ipcRenderer.on('export-to-csv', callback),
    sendExportToCSV: (html) => ipcRenderer.send('export-to-csv', html),
    onChangeTheme: (callback) => ipcRenderer.on('change-theme', (_event, value) => callback(value)),
    fieldData: (data) => ipcRenderer.send('field-data', data),
    onShowSpinner: (callback) => ipcRenderer.on('change-spinner', (_event, value) => callback(value)),
});