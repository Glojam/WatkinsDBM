const path = require('path');
const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const { buildMenu } = require('./menu');
const fs = require('fs');
const prompt = require('electron-prompt');
const { bulkUpload, fetch, insert, update, fieldData, login, logout } = require('./sqlservice');
const columnAssociations = require('./columns.json');
const isDev = process.env.NODE_ENV === 'dev';
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
        icon: './resources/appicon.ico'
    });

    mainWindow.loadFile(path.join(__dirname, './renderer/index.html'));
    if (isDev) { mainWindow.webContents.openDevTools(); }


    // Send the list of columns & keys to the frontend
    // Must be done once it is finished loading
    // NOTE: There is a possibility loading fails, in such case the app must be relaunched.
    mainWindow.webContents.on('did-finish-load', () => {
        mainWindow.webContents.send('get-is-dev', isDev);
        mainWindow.webContents.send('get-cols', columnAssociations);

        // Set the theme if it has been saved previously.
        try {
            themeDataPath = path.join(app.getPath("userData"), "theme.json");
            const themeData = require(themeDataPath);
            mainWindow.webContents.send('change-theme', themeData.theme);
        } catch(err) {
            console.log(err.toString());
        }

        mainWindow.maximize();
        mainWindow.show();
    });

    mainWindow.webContents.on('did-fail-load', () => {
        mainWindow.webContents.send('get-cols', columnAssociations);
    });
}

// Can be later adapted to save more than just themes
function saveThemeData(themeName) {
    try {
        fs.writeFileSync(path.join(app.getPath("userData"), "theme.json"), JSON.stringify( {"theme": themeName} ))
    } catch {
        console.log("Failed to store theme data.")
    }
}

app.whenReady().then(() => {
    ipcMain.handle('get-data', fetch);
    ipcMain.handle('update-data', update);
    ipcMain.handle('insert-data', insert);
    ipcMain.handle('login', login);
    ipcMain.on('field-data', async(event, responses)=>{fieldData(responses, mainWindow)});

    ipcMain.on('logout', () => {
        Menu.setApplicationMenu(null); 
        logout();
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
    return bulkUpload(mainWindow);
});

ipcMain.on('set-user-role', (event, role) => {
    Menu.setApplicationMenu(buildMenu(mainWindow, async()=>{return await bulkUpload(mainWindow)}, saveThemeData));

    // Set the menu selector theme if it's been changed (for dark mode)
    try {
        themeDataPath = path.join(app.getPath("userData"), "theme.json");
        const themeData = require(themeDataPath);
        Menu.getApplicationMenu().getMenuItemById('radio-' + themeData.theme).checked = true;
    } catch(err) {
        console.log(err.toString());
    }

    // Change menu visibility options
    const menu = Menu.getApplicationMenu();
    menu.getMenuItemById("import-option").visible = role;
});

ipcMain.on('export-to-pdf', async (event, tableHTML) => {
    const pdfPath = await dialog.showSaveDialog(mainWindow, {
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
            dialog.showMessageBox(null, {
                'type': 'error',
                'detail': err.toString(),
                'title': 'SQL Error',
                'message': 'Save to PDF failed: An error occured.'
            });
            console.error(err);
        });
    });
});

ipcMain.on('export-to-csv', async (event, dataTable) => {
    const csvPath = await dialog.showSaveDialog(mainWindow, {
        title: 'Save CSV',
        defaultPath: 'exported_page.csv',
        filters: [{ name: 'CSV Files', extensions: ['csv'] }], 
    });

    if (csvPath.canceled) return;

    csvString = dataTable.map(row => row.join(',')).join('\n');

    fs.writeFile(csvPath.filePath, csvString, (err) => {
        if (err) {
            dialog.showMessageBox(null, {
                'type': 'error',
                'detail': err.toString(),
                'title': 'SQL Error',
                'message': 'Save to CSV failed: An error occured.'
            });
            console.error(err);
            return;
        }
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
            type: 'input',
            resizable: true,
            icon: './resources/icon.png',
            skipTaskbar: true,
        }, mainWindow)
        .then((r) => {
            return r !== null ? r : false;
        })
        .catch(console.error);
        return await res;
    }
    return true;
});