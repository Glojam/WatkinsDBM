const path = require('path');
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const sql = require('mssql')
const fs = require('fs');
const readline = require('readline');
const isDev = process.env.NODE_ENV !== 'production';
const isMac = process.platform === 'darwin';

// MSSQL Configuration
const config = {
    user: "SA",
    password: "Sqlpassword!",
    server: "localhost",
    database: "Watkins",
    options: {
        encrypt: true, // Change to true if using Azure
        trustServerCertificate: true,
    },
};

function createMainWindow() {
    const mainWindow = new BrowserWindow({
        title: 'Watkins Database Manager',
        show: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js')
          }          
    });

    mainWindow.loadFile(path.join(__dirname, './renderer/index.html'));
    mainWindow.maximize();
    mainWindow.show();
    if (isDev) { mainWindow.webContents.openDevTools(); }
}

app.whenReady().then(() => {
    ipcMain.handle('getData', getSpecificData);
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

// TODO: pass a 'table' parameter inside args to specify tables aside from Players
// For some reason Event gets passed regardless even though it isnt specified.
async function getSpecificData(event, args) {
    let query = "SELECT * FROM Players";
    let isEmpty = true;
    // TODO: Add protections against SQL injection here
    for(let row of Object.entries(args)) { // 0: name, 1: value
        if (row[1] === "") { continue; }
        if (isEmpty) {
            isEmpty = false;
            query += " WHERE ";
        } else {
            query += " AND ";
        }
        query += `[${row[0]}]='${row[1]}'`;
    }
    query += ";";

    return new Promise((resolve, reject) => {
        setTimeout(async () => {
            try {
                // make sure that any items are correctly URL encoded in the connection string
                // TODO standardize connection string (this format is ugly, use global config instead)
                await sql.connect(config);
                const result = await sql.query(query);
                resolve(result);
            } catch (err) {
                // TODO error popup
                reject("Something went wrong");
                console.log(err);
            }
        }, 2000); // Simulating an async operation with a timeout
    });
}
  
ipcMain.on("getData", async (event, args) => {
    const data = await getSpecificData(args);
    event.reply("sendData", data);
});

//function to execute on button click for file upload button
function upload() {
    // Get all selected files
    // !! WARNING: NO INPUT VALIDATION! TODO: Add regex that confirms each file as acceptable, reject it if otherwise.
    const fileOutputs = dialog.showOpenDialogSync({ properties: ["openFile", "multiSelections"] });
    
    // Function to parse and upload data
    async function uploadData() {
        const pool = await sql.connect(config);
        const rl = readline.createInterface({
            input: fs.createReadStream(fileOutputs[0]), // TODO: this only actually accepts the first file. Should loop and upload all verified files.
            output: process.stdout,
            terminal: false
        });
    
        let isHeader = true; // Skip header row
    
        for await (const line of rl) {
            if (isHeader) {
                isHeader = false;
                continue;
            }
    
            const fields = line.split('|').map(f => f.trim());
    
            if (fields.length < 5) {
                console.warn("Skipping invalid line", line);
                continue;
            }
    
            const [Jersey, Goals, Assists, Shots, MinutesPlayed] = fields.map(Number);
    
            try {
                await pool.request()
                    .input("Jersey", sql.Int, Jersey)
                    .input("Goals", sql.Int, Goals)
                    .input("Assists", sql.Int, Assists)
                    .input("Shots", sql.Int, Shots)
                    .input("MinutesPlayed", sql.Int, MinutesPlayed)
                    .query(`
                        INSERT INTO Players (jersey, goals, assists, shots, minutes)
                        VALUES (@Jersey, @Goals, @Assists, @Shots, @MinutesPlayed)
                    `);
    
                console.log(`Inserted: Jersey #${Jersey}`);
            } catch (err) {
                console.error("Database error:", err.message);
            }
        }
    
        await pool.close();
        console.log("Upload complete.");
    }
    
    // Execute the function
    uploadData().catch(err => console.error("Error:", err));
}
ipcMain.handle("upload-file", async (event, file) => {
    return upload(file);
});