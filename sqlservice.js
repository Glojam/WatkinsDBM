const { dialog } = require('electron');
const sql = require('mssql')
const fs = require('fs');
const readline = require('readline');

// Primary keys list, necessary for UPDATE sql command to run as efficiently as possible w/ no mistakes
// Strings must exactly match the property names as stored in the database
const playersKeys = ["opponent", "date", "first name", "last name", "year", "varsity"];
const playersCols = [
    "opponent",
    "date",
    "field",
    "outcome",
    "halfScore",
    "halfScoreOpponent",
    "finalScore",
    "finalScoreOpponent",
    "firstName",
    "lastName",
    "year",
    "jersey",
    "position",
    "varsity",
    "played",
    "started",
    "motmAward",
    "sportsmanshipAward",
    "minutes",
    "goals",
    "assists",
    "points",
    "shots",
    "shotsOnGoal",
    "yellows",
    "reds"
  ];

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

// SELECT * FROM Players WHERE 1=0

/**
 * Updates existing data within the database.
 * @param {Electron.IpcMainEvent} event Electron IPC event.
 * @param {Object} args                     Object containing a list of fields to update.
 */
exports.update = async (event, rowNames, modifiedRowList) => {
    function getQueryClause(listPair) {
        let query = "UPDATE Players SET ";
        for (let i = 0; i < listPair[0].length; i++) {
            query += `${playersCols[i]}='${listpair[0][i]}'`
            if (i < listPair[0].length-1) query += ',';
        }
        query += " WHERE ";
        for (let i = 0; i < listPair[0].length; i++) {
            query += `${playersCols[i]}='${listpair[0][i]}'`
            if (i < listPair[0].length-1) query += ',';
        }
        query += ";";
    }
}

/**
 * Pulls data from the database given some filtering options.
 * @param {Electron.IpcMainEvent} event Electron IPC event.
 * @param {Object} args                     Object containing a list of fields to filter from.
 * @return {Promise}
 */
exports.fetch = async (event, args) => {
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

/**
 * Requests the user to select |-delimited CSV files, and imports the data to the database.
 */
exports.bulkUpload = () => {
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
                dialog.showErrorBox(null, {message: "The database server experienced an error during query:\n"+err.message})
            }
        }
    
        await pool.close();
        console.log("Upload complete.");
        dialog.showMessageBox(null, {message: "File upload sucessful."})
    }
    
    // Execute the function
    uploadData().catch(err => console.error("Error:", err));
}