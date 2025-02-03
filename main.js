const path = require('path');
const { app, BrowserWindow, ipcMain } = require('electron');
const sql = require('mssql')

const isDev = process.env.NODE_ENV !== 'production';
const isMac = process.platform === 'darwin';

function createMainWindow() {
    const mainWindow = new BrowserWindow({
        title: 'Watkins Database Manager',
        show: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            enableRemoteModule: false,
            nodeIntegration: false
          }          
    });

    mainWindow.loadFile(path.join(__dirname, './renderer/index.html'));
    mainWindow.maximize();
    mainWindow.show();
    if (isDev) { mainWindow.webContents.openDevTools(); }
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

async function getSpecificData() {
    return new Promise((resolve, reject) => {
        setTimeout(async () => {
            try {
                // make sure that any items are correctly URL encoded in the connection string
                await sql.connect('Server=localhost,1433;Database=Watkins;User Id=SA;Password=Sqlpassword!;Encrypt=true;TrustServerCertificate=true');
                const result = await sql.query`select * from Players`;
               // console.dir(result);
                resolve(result)
            } catch (err) {
                reject("Something went wrong")
                console.log(err);
            }
        }, 2000); // Simulating an async operation with a timeout
    });
}
  
ipcMain.on('getData', async (event, arg) => {
    const data = await getSpecificData();
    event.reply('sendData', data);
});