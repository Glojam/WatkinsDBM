const path = require('path');
const { app, BrowserWindow, ipcMain, dialog, Menu, nativeImage } = require('electron');
const { buildMenu } = require('./menu')
const sql = require('mssql')
const prompt = require('electron-prompt');
const { bulkUpload, fetch, insert, update } = require('./sqlservice')
const columnAssociations = require('./columns.json')
const isDev = process.env.NODE_ENV !== 'production';
const isMac = process.platform === 'darwin';

var mainWindow;

function createMainWindow() {
    mainWindow = new BrowserWindow({
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
    ipcMain.handle('update-data', update);
    ipcMain.handle('insert-data', insert);

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

ipcMain.handle("upload-file", async (event) => {
    return bulkUpload();
});

ipcMain.handle("show-message", async (event, type, message, hint = "", title = "") => {
    if (type == "confirmation") {
        let res = dialog.showMessageBox(mainWindow, {
            'type': 'question',
            'detail': hint,
            'title': title,
            'message': message,
            'buttons': [
                'Yes',
                'No'
            ]
        }).then((result) => {
            return result.response === 0;
        });
        return await res;
    } else if (type == "info") {
        dialog.showMessageBox(mainWindow, {
            'type': 'info',
            'detail': hint,
            'title': title,
            'message': message,
        })
    } else if (type == "prompt") {
        let res = prompt({
            title: title,
            label: message,
            value: '',
            inputAttrs: {
                type: 'number', requird: 'true'
            },
            type: 'input'
        }, mainWindow)
        .then((r) => {
            return r !== null ? r : false;
        })
        .catch(console.error);
        return await res;
    }
    return true;
});