const path = require('path');
const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const { buildMenu } = require('./menu')
const sql = require('mssql')
const { bulkUpload, fetch, update } = require('./sqlservice')
const columnAssociations = require('./columns.json')
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

    // Send the list of columns & keys to the frontend
    // Must be done once it is finished loading
    // NOTE: There is a possibility loading fails, in such case the app must be relaunched.
    mainWindow.webContents.on('did-finish-load', () => {
        mainWindow.webContents.send('get-cols', columnAssociations);
    });
   
    mainWindow.webContents.on('did-fail-load', () => {
        mainWindow.webContents.send('get-cols', columnAssociations);
    });
}

app.whenReady().then(() => {
    ipcMain.handle('get-data', fetch);

    //ipcMain.handle('get-cols', () => {return columnAssociations})
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

ipcMain.on("update-data", async (event, args) => {
    const data = await update(args);
    event.reply("reply-update", data);
});

ipcMain.handle("upload-file", async (event) => {
    return bulkUpload();
});