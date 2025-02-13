const path = require('path');
const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const { buildMenu } = require('./menu')
const sql = require('mssql')
const { bulkUpload, fetch, update } = require('./sqlservice')
const isDev = process.env.NODE_ENV !== 'production';
const isMac = process.platform === 'darwin';

function createMainWindow() {
    const mainWindow = new BrowserWindow({
        title: 'Watkins Database Manager',
        show: false,
        webPreferences: {
            worldSafeExecuteJavaScript: true, 
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        icon: './resources/icon.png'
    });

    Menu.setApplicationMenu(buildMenu(mainWindow, bulkUpload));
    mainWindow.loadFile(path.join(__dirname, './renderer/index.html'));
    mainWindow.maximize();
    mainWindow.show();
    if (isDev) { mainWindow.webContents.openDevTools(); }
}

app.whenReady().then(() => {
    ipcMain.handle('getData', fetch);
    createMainWindow();
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createMainWindow();
        }
    })
});

app.on('window-all-closed', () => {
    // This is a quirk of Mac window behavior that is standard practice to implement
    if (!isMac) { app.quit(); }
})
  
ipcMain.on("get-data", async (event, args) => {
    const data = await fetch(args);
    event.reply("reply-get", data);
});

ipcMain.on("update-data", async (event, args) => {
    const data = await update(args);
    event.reply("reply-update", data);
});

ipcMain.handle("upload-file", async (event) => {
    return bulkUpload();
});