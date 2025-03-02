const { dialog } = require('electron');
const sql = require('mssql');
const fs = require('fs');
const readline = require('readline');
const passwords = require('./passwords.json')

// MSSQL Configuration
const config = {
    user: passwords.user,
    password: passwords.password,
    server: passwords.server,
    database: 'Watkins',
    options: {
        encrypt: true, // Change to true if using Azure
        trustServerCertificate: true,
    },
};

// Universal pool instance; orders of magnitude faster to query from just 1 pool than to use multiple
const poolPromise = sql.connect(config);

/**
 * Updates existing data within the database.
 * @param {Electron.IpcMainEvent} event Electron IPC event
 * @param {string} tableName            The table to query
 * @param {Object} rowsList             List of list pairs (modified and unmodified data, in that order)
 * @return {Promise<any>}               Promise containing data or error
 */
exports.update = async (event, tableName, rowsList) => {
    function getQueryClause(listPair) {
        let updatedKeys = Object.keys(listPair.updated);
        let oldKeys = Object.keys(listPair.old);
        let query = `UPDATE ${tableName} SET `;
        let index = 0;
        for (let key of updatedKeys) {
            query += `[${key}]='${listPair.updated[key]}'`;
            if (index < updatedKeys.length - 1) query += ',';
            index++;
        }
        query += ' WHERE ';
        index = 0;
        for (let key of oldKeys) {
            query += `[${key}]='${listPair.old[key]}'`;
            if (index < oldKeys.length - 1) query += ' AND ';
            index++;
        }
        query += ';';
        return query;
    }

    try {
        const pool = await poolPromise;
        for (const listPair of rowsList) {
            await pool.request().query(getQueryClause(listPair));
        }
        return true;
    } catch (err) {
        dialog.showMessageBox(null, {
            'type': 'error',
            'detail': err.toString(),
            'title': 'SQL Error',
            'message': 'Query failed: An internal server error occured.'
        });
    }
};

/**
 * Pulls data from the database given some filtering options.
 * @param {Electron.IpcMainEvent} event Electron IPC event
 * @param {Object} args                 Object containing a list of fields to filter from
 * @return {Promise<any>}               Promise containing data or error
 */
exports.fetch = async (event, args) => {
    let query = 'SELECT * FROM Players';
    let isEmpty = true;

    // TODO: Add protections against SQL injection here
    for (let row of Object.entries(args)) {
        // 0: name, 1: value
        if (row[1] === '') {
            continue;
        }
        if (isEmpty) {
            isEmpty = false;
            query += ' WHERE ';
        } else {
            query += ' AND ';
        }
        query += `[${row[0]}]='${row[1]}'`;
    }
    query += ';';

    try {
        const pool = await poolPromise;
        const result = await pool.request().query(query);
        return result;
    } catch (err) {
        dialog.showMessageBox(null, {
            'type': 'error',
            'detail': err.toString(),
            'title': 'SQL Error',
            'message': 'Query failed: An internal server error occured.'
        });
    }
};

/**
 * Requests the user to select |-delimited CSV files and imports the data to the database.
 */
exports.bulkUpload = () => {
    // Get all selected files
    // !! WARNING: NO INPUT VALIDATION! TODO: Add regex that confirms each file as acceptable, reject it if otherwise.
    const fileOutputs = dialog.showOpenDialogSync({
        title: 'Import Files',
        buttonLabel: 'Import',
        filters: [{ name: 'Text Files', extensions: ['txt'] }],
        properties: ['openFile', 'multiSelections'],
    });

    // Function to parse and upload data
    async function uploadData() {
        const pool = await poolPromise;
        const rl = readline.createInterface({
            input: fs.createReadStream(fileOutputs[0]), // TODO: this only actually accepts the first file. Should loop and upload all verified files.
            output: process.stdout,
            terminal: false,
        });

        let isHeader = true; // Skip header row
        const MarkerScore = 9999;
        var finalScore = 0;
        var finalScoreOpp = 0;
        for await (const line of rl) {
            if (isHeader) {
                isHeader = false;
                continue;
            }

            const fields = line.split('|').map((f) => f.trim());

            if (fields.length < 5) {
                console.warn('Skipping invalid line', line);
                continue;
            }

            const [Jersey, Goals, Assists, Shots, MinutesPlayed, GoalsAgainst] = fields.map(Number);
            if (!isNaN(Goals)){
                var Points = (Goals * 2) + Assists;
                finalScore += Goals;
                finalScoreOpp +=GoalsAgainst;
                var Played;
                if(MinutesPlayed != 0){
                    Played = 1;
                }
                else{
                    Played = 0;
                }
            }
            try {
                await pool.request()
                    .input('Jersey', sql.Int, Jersey)
                    .input('Goals', sql.Int, Goals)
                    .input('Assists', sql.Int, Assists)
                    .input('Shots', sql.Int, Shots)
                    .input('MinutesPlayed', sql.Int, MinutesPlayed)
                    .input('Points', sql.Int, Points)
                    .input('Played', sql.Int, Played)
                    .input('MarkerScore', sql.Int, MarkerScore)
                    .query(`
                        INSERT INTO Players (jersey, goals, assists, shots, minutes, points, played, "final score", "final score opponent")
                        VALUES (@Jersey, @Goals, @Assists, @Shots, @MinutesPlayed, @Points, @Played, @MarkerScore, @MarkerScore)
                    `);

                console.log(`Inserted: Jersey #${Jersey}`);
            } catch (err) {
                dialog.showMessageBox(null, {
                    'type': 'error',
                    'detail': err.toString(),
                    'title': 'SQL Error',
                    'message': 'Query failed: An internal server error occured.'
                });
            }
        }
            try {
                await pool.request()
                    .input('FinalScore', sql.Int, finalScore)
                    .query(`
                        UPDATE Players
                        SET "final score" = @FinalScore WHERE "final score" = 9999;
                    `);
            } catch (err) {
                dialog.showMessageBox(null, {
                    'type': 'error',
                    'detail': err.toString(),
                    'title': 'SQL Error',
                    'message': 'Query failed: An internal server error occured.'
                });
            }
            try {
                await pool.request()
                .input('FinalScoreOpp', sql.Int, finalScoreOpp)
                .query(`
                    UPDATE Players
                    SET "final score opponent" = @FinalScoreOpp WHERE "final score opponent" = 9999;
                    `)
            } catch (err) {
                dialog.showMessageBox(null, {
                    'type': 'error',
                    'detail': err.toString(),
                    'title': 'SQL Error',
                    'message': 'Query failed: An internal server error occured.'
                });
            }
        console.log('Upload complete.');
        dialog.showMessageBox(null, { message: 'File upload successful.' });
    }

    // Execute the function
    uploadData().catch((err) => console.error('Error:', err));
};