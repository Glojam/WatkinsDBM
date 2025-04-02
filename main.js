const path = require('path');
const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const { buildMenu } = require('./menu');
const fs = require('fs');
const prompt = require('electron-prompt');
const { bulkUpload, fetch, insert, update, login, logout } = require('./sqlservice');
const columnAssociations = require('./columns.json');
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
    ipcMain.handle('login', login);
    ipcMain.on('logout', (logout) => {
        Menu.setApplicationMenu(null); 
        logout;
    });

    //ipcMain.handle('get-cols', () => {return columnAssociations})
    Menu.setApplicationMenu(null); 
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

ipcMain.on('set-user-role', (event, role) => {
    Menu.setApplicationMenu(buildMenu(mainWindow, bulkUpload));

    // Change menu visibility options
    const menu = Menu.getApplicationMenu();
    menu.getMenuItemById("import-option").visible = role;
});

ipcMain.on('export-to-pdf', async (event, tableHTML) => {
    const pdfPath = await dialog.showSaveDialog({
        title: 'Save PDF',
        defaultPath: 'exported_page.pdf',
        filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
    });

    if (pdfPath.canceled) return;

    // Create an off-screen window
    let printWindow = new BrowserWindow({
        show: false,  // Hidden window
        webPreferences: { offscreen: true } // No UI needed
    });

    // Generate a full HTML document for the table
    const tableHTMLPage = `
        <html>
        <head>
            <title>Table Export</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                table { border-collapse: collapse; width: 100%; }
                th, td { border: 1px solid black; padding: 8px; text-align: left; }
            </style>
        </head>
        <body>
            ${tableHTML}
        </body>
        </html>
    `;

    printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(tableHTMLPage)}`);

    printWindow.webContents.once('did-finish-load', () => {
        printWindow.webContents.printToPDF({ 
            landscape: true,
            marginsType: 1,
            printBackground: true,
            pageSize: { width: 12, height: 20 }
        }).then(data => {
            fs.writeFile(pdfPath.filePath, data, (err) => {
                if (err) {
                    console.error(err);
                    return;
                }
            });
        }).catch(err => {
            console.error(err);
        });
    });
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