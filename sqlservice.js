const { dialog } = require('electron');
const sql = require('mssql')
const fs = require('fs');
const readline = require('readline');
const { table } = require('console');
const columnAssociations = require('./columns.json');

const queryTimeout = 1500 // Milliseconds; time allotted for queries before timeout

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

/**
 * Updates existing data within the database.
 * @param {Electron.IpcMainEvent} event Electron IPC event
 * @param {string} tableName            The table to query
 * @param {Object} rowsList             List of list pairs (modified and unmodified data, in that order)
 * @return {Promise<any>}               Promise containing data or error
 */
exports.update = async (event, tableName, rowsList) => {
    function getQueryClause(listPair) { // this func is unfinished, ignore
        let updatedKeys = Object.keys(listPair.updated);
        let oldKeys = Object.keys(listPair.old);
        let query = `UPDATE ${tableName} SET `;
        let index = 0;
        for (let key of updatedKeys) {
            query += `[${key}]='${listPair.updated[key]}'`
            if (index < updatedKeys.length-1) query += ',';
            index++;
        }
        query += " WHERE ";
        index = 0;
        for (let key of oldKeys) {
            query += `[${key}]='${listPair.old[key]}'`
            if (index < oldKeys.length-1) query += ' AND ';
            index++;
        }
        query += ";";
        return query;
    }

    return new Promise((resolve, reject) => {
        setTimeout(async () => {
            try {
                const pool = await sql.connect(config);
                for (const listPair of rowsList) {
                    await pool.request().query(getQueryClause(listPair));
                }
                await pool.close();
                resolve(true);
            } catch (err) {
                reject("Something went wrong");
                console.log(err);
            }
        }, queryTimeout);
    });   
}

/**
 * Pulls data from the database given some filtering options
 * @param {Electron.IpcMainEvent} event Electron IPC event
 * @param {Object} args                 Object containing a list of fields to filter from
 * @return {Promise<any>}               Promise containing data or error
 */
exports.fetch = async (event, args) => {
    let query = "SELECT * FROM Players";
    let isEmpty = true;
    // TODO: Add protections against SQL injection here
    for (let row of Object.entries(args)) { // 0: name, 1: value
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
                await sql.connect(config);
                const result = await sql.query(query);
                resolve(result);
            } catch (err) {
                // TODO error popup
                reject("Something went wrong");
                console.log(err);
            }
        }, queryTimeout); // Simulating an async operation with a timeout
    });
}

/**
 * Requests the user to select |-delimited CSV files, and imports the data to the database
 */
exports.bulkUpload = () => {
    // Get all selected files
    // !! WARNING: NO INPUT VALIDATION! TODO: Add regex that confirms each file as acceptable, reject it if otherwise.
    const fileOutputs = dialog.showOpenDialogSync(
        { 
            title: "Import Files",
            buttonLabel: "Import",
            filters: [
                { name: "CSV Files", extensions: ["csv"] },
            ],
            properties: ["openFile", "multiSelections"] 
        }
    );
    
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