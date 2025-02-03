const path = require('path');
const { app, BrowserWindow, ipcMain } = require('electron');
const { electron } = require('process');
const sql = require('mssql')

const isDev = process.env.NODE_ENV !== 'production';
const isMac = process.platform === 'darwin';

function createMainWindow() {
    const mainWindow = new BrowserWindow({
        title: 'Watkins Database Manager',
        show: false
    });

    mainWindow.loadFile(path.join(__dirname, './renderer/index.html'));
    mainWindow.maximize();
    mainWindow.show();
    if (isDev) { mainWindow.webContents.openDevTools(); }

    // TODO this is a test; move this to sqlservice.js
    // Authentication information should NEVER be stored
    (async () => {
        try {
            // make sure that any items are correctly URL encoded in the connection string
            await sql.connect('Server=localhost,1433;Database=Watkins;User Id=SA;Password=Sqlpassword!;Encrypt=true;TrustServerCertificate=true');
            const result = await sql.query`select * from Players`;
            console.dir(result);
        } catch (err) {
            console.log(err);
        }
    })()
}

app.whenReady().then(() => {
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