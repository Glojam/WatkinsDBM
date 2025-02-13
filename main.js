const path = require('path');
const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const { buildMenu } = require('./menu')
const sql = require('mssql')
const { upload, fetch } = require('./sqlservice')
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
        }          
    });

    Menu.setApplicationMenu(buildMenu(mainWindow, upload));
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
  
ipcMain.on("getData", async (event, args) => {
    const data = await fetch(args);
    event.reply("sendData", data);
});

ipcMain.handle("upload-file", async (event) => {
    return upload();
});