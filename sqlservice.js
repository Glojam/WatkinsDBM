const { dialog, BrowserWindow } = require('electron');
const sql = require('mssql');
const fs = require('fs');
const readline = require('readline');
const path = require('path');
const columnAssociations = require('./columns.json');
let util;

// Because this is a CommonJS file we need to await import() to import a .mjs file since require() doesn't work on those.
// Necessary for that file to be .mjs since the frontend are ES modules, which needs to use import { }.
(async () => { util = await import('./util.mjs'); })();

// File-scoped variable to keep track of current working opponent name, given from previous bulk upload and accessed by fieldData
var opponentMatch;
// Universal pool instance; orders of magnitude faster to query from just 1 pool than to use multiple
var poolPromise;

// MSSQL Configuration
var config = {
    user: "",
    password: "",
    server: "",
    port: "",
    database: 'Watkins',
    options: {
        encrypt: true, // Change to true if using Azure
        trustServerCertificate: true,
    },
};

/**
 * Log out of the current profile.
 * @param {Electron.IpcMainEvent} event Electron IPC event
 */
exports.logout = async (event) => {
    if (poolPromise == undefined) { return; }
    try {
        poolPromise.close();
    } catch (err) {
        console.log(err);
    }
}

/**
 * Log into a database profile.
 * @param {Electron.IpcMainEvent} event Electron IPC event
 * @param {Object} credentials          Table of profile credentials
 * @return {Promise<any>}               Promise containing data or error
 */
exports.login = async (event, credentials) => {
    this.logout();
    config.user = credentials.user;
    config.password = credentials.password;
    config.server = credentials.server;
    config.port = credentials.port;
    try {
        poolPromise = await sql.connect(config);
        return true;
    } catch (err) {
        return err.toString();
    }
}

/**
 * Given context of previous file import and form response data, fills missing gaps in import data
 * @param {Electron.IpcMainEvent} event Electron IPC event
 * @param {Array} responses             Container for all responses
 * @return {Boolean}                    True if success, false if error
 */
exports.fieldData = async (responses, window) => {
    window.webContents.send('change-spinner', true);
    async function uploadFieldData() {
        // Loop through the data array
        for (let i = 0; i < responses.length; i++) {
            // Construct the SQL query to update the appropriate column
            const Playersquery = `
                    SET Context_Info 0x55555
                    UPDATE p
                    SET p.[${responses[i].property}] = @data
                    FROM Players p
                    JOIN association a ON a.jersey = p.jersey AND a.season = p.season
                    WHERE
                    (a.[last name] = @lastName OR @lastName IS NULL)
                    AND p.opponent = @oppM
                    AND CONVERT(date, p.[date]) = CONVERT(date, GETDATE())
                    SET Context_Info 0x0
                `;
            const goalKeepersquery = `
                SET Context_Info 0x55555
                UPDATE gk
                SET gk.[${responses[i].property}] = @data
                FROM goalkeepers gk
                JOIN association a ON a.jersey = gk.jersey AND a.season = gk.season
                WHERE
                (a.[last name] = @lastName OR @lastName IS NULL)
                AND gk.opponent = @oppM
                AND CONVERT(date, gk.[date]) = CONVERT(date, GETDATE())
                SET Context_Info 0x0
                `;
            const propertyMap = {
                "started": "games started",
                "motm award": "motm awards",
                "sportsmanship award": "sportsmanship awards"
            };

            const originalProperty = responses[i].property;
            const property = propertyMap[originalProperty] || originalProperty;

            const playersTotalquery = `
                    SET Context_Info 0x55555;
                    UPDATE pt
                    SET pt.[${property}] = ISNULL(pt.[${property}], 0) + CAST(@data AS INT)
                    FROM playersTotal pt
                    JOIN association a ON a.jersey = pt.jersey AND a.season = pt.season
                    WHERE
                        a.[last name] = @lastName
                        AND pt.season = YEAR(GETDATE());
                    SET Context_Info 0x0;
                `;
            const goalkeepersTotalquery = `
                SET Context_Info 0x55555
                UPDATE gkt
                SET gkt.[${property}] = ISNULL(gkt.[${property}], 0) + CAST(@data AS INT)
                FROM goalkeepersTotal as gkt
                JOIN association a ON a.jersey = gkt.jersey AND a.season = gkt.season
                WHERE
                (a.[last name] = @lastName)
                AND
                gkt.season = YEAR(GETDATE())
                SET Context_Info 0x0
                `;
            const isCard = ['reds', 'yellows'].includes(responses[i].property);
            const teamRecordquery = `
                SET Context_Info 0x55555;
                
                UPDATE tr
                SET tr.[${responses[i].property}] = ${isCard
                    ? `ISNULL(tr.[${responses[i].property}], 0) + CAST(@data AS INT)`
                    : `@data`
                }
                FROM teamRecord as tr
                WHERE
                  (opponent = @oppM)
                  AND CONVERT(date, tr.[date]) = CONVERT(date, GETDATE());
                
                SET Context_Info 0x0;
                `;
            let sqlType = sql.NVarChar
            switch (typeof (responses[i].data)) {
                case "boolean": sqlType = sql.Bit;
                case "number": sqlType = sql.Int;
            }

            // Run the query with parameterized values
            //Updates Players
            await poolPromise.request()
                .input('data', sqlType, responses[i].data)   // Use appropriate SQL data type
                .input('lastName', sql.NVarChar, responses[i].lastName)
                .input('oppM', sql.NVarChar, opponentMatch[1])
                .query(Playersquery);
            console.log(`Updated ${responses[i].property} for ${responses[i].lastName} with value: ${responses[i].data}`);
            //Updates Goalkeepers
            if (responses[i].property != "shots on goal") {
                await poolPromise.request()
                    .input('data', sqlType, responses[i].data)   // Use appropriate SQL data type
                    .input('lastName', sql.NVarChar, responses[i].lastName)
                    .input('oppM', sql.NVarChar, opponentMatch[1])
                    .query(goalKeepersquery);
                console.log(`Updated ${responses[i].property} for ${responses[i].lastName} with value: ${responses[i].data}`);
            }
            //Updates PlayersTotal
            if (responses[i].property != "field" && responses[i].property != "half score" && responses[i].property != "half score opponent") {
                await poolPromise.request()
                    .input('data', sqlType, responses[i].data)   // Use appropriate SQL data type
                    .input('lastName', sql.NVarChar, responses[i].lastName)
                    .input('oppM', sql.NVarChar, opponentMatch[1])
                    .query(playersTotalquery);
                console.log(`Updated ${responses[i].property} for ${responses[i].lastName} with value: ${responses[i].data}`);
            }
            //Updates goalkeepersTotal
            if (responses[i].property != "field" && responses[i].property != "half score" && responses[i].property != "half score opponent" && responses[i].property != "shots on goal") {
                await poolPromise.request()
                    .input('data', sqlType, responses[i].data)   // Use appropriate SQL data type
                    .input('lastName', sql.NVarChar, responses[i].lastName)
                    .input('oppM', sql.NVarChar, opponentMatch[1])
                    .query(goalkeepersTotalquery);
                console.log(`Updated ${responses[i].property} for ${responses[i].lastName} with value: ${responses[i].data}`);
            }
            //Updates teamRecord
            if (responses[i].property != "shots on goal" && responses[i].property != "motm award" && responses[i].property != "sportsmanship award" && responses[i].property != "started") {
                await poolPromise.request()
                    .input('data', sqlType, responses[i].data)   // Use appropriate SQL data type
                    .input('lastName', sql.NVarChar, responses[i].lastName)
                    .input('oppM', sql.NVarChar, opponentMatch[1])
                    .query(teamRecordquery);
                console.log(`Updated ${responses[i].property} for ${responses[i].lastName} with value: ${responses[i].data}`);
            }
        }


        window.webContents.send('change-spinner', false);
        dialog.showMessageBox(window, {
            'type': 'info',
            'detail': `Search "${opponentMatch[1]}" in Opponent to see details for this match.`,
            'title': 'Bulk Upload',
            'message': 'Bulk upload complete',
        })
    }
    // Execute the function
    return await uploadFieldData().then(
        // Success
        () => {
            window.webContents.send('change-spinner', false);
            return true;
        },
        // Failure
        (err) => {
            console.error('Error:', err);
            dialog.showMessageBox(null, {
                type: 'error',
                detail: util.makeErrorReadable(err.toString()),
                title: 'SQL Error',
                message: 'Query failed: An internal server error occurred.'
            });
            window.webContents.send('change-spinner', false);
            return false;
        }
    );
}

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
        for (const listPair of rowsList) {
            await poolPromise.request().query(getQueryClause(listPair));
        }
        return true;
    } catch (err) {
        console.error('Error:', err);
        dialog.showMessageBox(null, {
            'type': 'error',
            'detail': util.makeErrorReadable(err.toString()),
            'title': 'SQL Error',
            'message': 'Query failed: An internal server error occured.'
        });
        return false;
    }
};

/**
 * Inserts rows into a table
 * @param {Electron.IpcMainEvent} event Electron IPC event
 * @param {string} tableName            The table to query
 * @param {Object} rowsList             List of list of data
 * @return {Promise<any>}               Promise containing data or error
 */
exports.insert = async (event, tableName, rowsList) => {
    function getQueryClause(thisRow) {
        let query = `INSERT INTO ${tableName} VALUES (`;
        let rowKeys = Object.keys(thisRow);
        let i = 0;
        for (let key of rowKeys) {
            query += `'${thisRow[key]}'`;
            if (i < rowKeys.length - 1) query += ',';
            i++;
        }
        query += ');';
        return query;
    }

    try {
        for (const listPair of rowsList) {
            await poolPromise.request().query(getQueryClause(listPair));
        }
        return true;
    } catch (err) {
        console.error('Error:', err);
        dialog.showMessageBox(null, {
            'type': 'error',
            'detail': util.makeErrorReadable(err.toString()),
            'title': 'SQL Error',
            'message': 'Query failed: An internal server error occured.'
        });
        return false;
    }
};

/**
 * Pulls data from the database given some filtering options.
 * @param {Electron.IpcMainEvent} event Electron IPC event
 * @param {string} tableName            The table to query
 * @param {Object} args                 Object containing a list of fields to filter from
 * @return {Promise<any>}               Promise containing data or error
 */
exports.fetch = async (event, tableName, args) => {
    let query;
    if (columnAssociations[tableName].join_jersey) {
        query = `SELECT p.*,a.[first name],a.[last name],a.[year]
                FROM ${tableName} p
                INNER JOIN Association a
                ON p.season = a.season
                AND p.jersey = a.jersey`
    } else {
        query = `SELECT * FROM ${tableName}`;
    }

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
        const result = await poolPromise.request().query(query);
        return result;
    } catch (err) {
        console.error('Error:', err);
        dialog.showMessageBox(null, {
            'type': 'error',
            'detail': util.makeErrorReadable(err.toString()),
            'title': 'SQL Error',
            'message': 'Query failed: An internal server error occured.'
        });
        return false;
    }
};

/**
 * Requests the user to select |-delimited CSV files and imports the data to the database.
 * @param {BrowserWindow} window    Window for sending IPC messages
 * @return {Boolean}                True if success, false if error
 */
exports.bulkUpload = async (window) => {
    // Get all selected files
    const fileOutputs = dialog.showOpenDialogSync({
        title: 'Import Files',
        buttonLabel: 'Import',
        filters: [{ name: 'Text Files', extensions: ['txt'] }],
        properties: ['openFile', 'multiSelections'],
    });

    window.webContents.send('change-spinner', true);

    // Function to parse and upload data
    async function uploadData() {
        const rl = readline.createInterface({
            input: fs.createReadStream(fileOutputs[0]), // TODO: this only actually accepts the first file. Could loop and upload all verified files.
            output: process.stdout,
            terminal: false,
        });

        let isHeader = true; // Skip header row
        const MarkerScore = 9999;
        var finalScore = 0;
        var finalScoreOpp = 0;
        var fileName = path.basename(fileOutputs[0]);
        opponentMatch = fileName.match(/^.*WMHS vs (.+)\.txt$/);
        var finalOutcome;
        var markerOutcome = 'M'
        var totalShots = 0;
        var totalShotsOpp = 0;
        for await (const line of rl) {
            //updates player table
            const fields = line.split('|').map((f) => f.trim());
            if (fields.length < 5) {
                console.warn('Skipping invalid line', line);
                continue;
            }
            if (isHeader) {
                isHeader = false;
                continue;
            }

            const [Jersey, Goals, Assists, Shots, MinutesPlayed, GoalsAgainst, Saves, ShutOuts] = fields.map(Number);
            if (!isNaN(Goals)) {

                var Points = (Goals * 2) + Assists;
                finalScore += Goals;
                finalScoreOpp += GoalsAgainst;
                var Played;
                totalShots += Shots;
                totalShotsOpp += Saves;
                totalShotsOpp += GoalsAgainst;
                console.log(totalShotsOpp);
                if (MinutesPlayed != 0) {
                    Played = 1;
                }
                else {
                    Played = 0;
                }
            }

            await poolPromise.request()
                .input('Jersey', sql.Int, Jersey)
                .input('Goals', sql.Int, Goals)
                .input('Assists', sql.Int, Assists)
                .input('Shots', sql.Int, Shots)
                .input('MinutesPlayed', sql.Int, MinutesPlayed)
                .input('Points', sql.Int, Points)
                .input('Played', sql.Int, Played)
                .input('MarkerScore', sql.Int, MarkerScore)
                .input('OpponentMatch', sql.VarChar, opponentMatch[1])
                .input('MarkerOutcome', sql.Char, markerOutcome)
                .input('GoalsAgainst', sql.Int, GoalsAgainst)
                .input('Saves', sql.Int, Saves)
                .input('ShutOuts', sql.Int, ShutOuts)
                .query(`
                    -- Insert into goalkeepers if position is 'g'
                    WITH PositionData AS (
                        SELECT position
                        FROM association
                        WHERE jersey = @Jersey
                    )
                    INSERT INTO goalkeepers (jersey, minutes, played, "final score", "final score opponent", opponent, outcome, date, "goals against", saves, shutouts)
                    SELECT @Jersey, @MinutesPlayed, @Played, @MarkerScore, @MarkerScore, @OpponentMatch, @MarkerOutcome, GETDATE(), @GoalsAgainst, @Saves, @ShutOuts
                    FROM PositionData
                    WHERE position = 'g';
            
                    -- Insert into players if position is not 'g'
                    WITH PositionData AS (
                        SELECT position
                        FROM association
                        WHERE jersey = @Jersey
                    )
                    INSERT INTO Players (jersey, goals, assists, shots, minutes, points, played, "final score", "final score opponent", opponent, outcome, date)
                    SELECT @Jersey, @Goals, @Assists, @Shots, @MinutesPlayed, @Points, @Played, @MarkerScore, @MarkerScore, @OpponentMatch, @MarkerOutcome, GETDATE()
                    FROM PositionData
                    WHERE position <> 'g';
                `);
            console.log(`Inserted: Jersey #${Jersey}`);

            //updates playersTotal table

            await poolPromise.request()
                .input('Jersey', sql.Int, Jersey)
                .input('Goals', sql.Int, Goals)
                .input('Assists', sql.Int, Assists)
                .input('Shots', sql.Int, Shots)
                .input('MinutesPlayed', sql.Int, MinutesPlayed)
                .input('Points', sql.Int, Points)
                .input('Played', sql.Int, Played)
                .input('GoalsAgainst', sql.Int, GoalsAgainst)
                .input('Saves', sql.Int, Saves)
                .input('ShutOuts', sql.Int, ShutOuts)
                .query(`
                    -- First, check the player's position
                    DECLARE @Position VARCHAR(10);
            
                    -- Get the position for the given jersey
                    SELECT @Position = position
                    FROM association
                    WHERE jersey = @Jersey;
            
                    -- Conditional MERGE for PlayersTotal (if position is not 'g')
                    IF @Position <> 'g'
                    BEGIN
                        MERGE INTO playersTotal AS target
                        USING (VALUES (@Jersey, @Goals, @MinutesPlayed, @Points, @Assists, @Shots, @Played, YEAR(GETDATE()))) 
                        AS source (jersey, goals, minutes, points, assists, shots, played, season)
                        ON target.jersey = source.jersey AND target.season = source.season
                        WHEN MATCHED THEN
                            UPDATE SET 
                                target.[games played] = target.[games played] + source.played,
                                target.minutes = target.minutes + source.minutes,
                                target.points = target.points + source.points,
                                target.goals = target.goals + source.goals,
                                target.assists = target.assists + source.assists,
                                target.shots = target.shots + source.shots
                        WHEN NOT MATCHED THEN
                            INSERT (jersey, season, [games played], points, goals, assists, shots, minutes)
                            VALUES (source.jersey, YEAR(GETDATE()), source.played, source.points, source.goals, source.assists, source.shots, source.minutes);
                    END
            
                    -- Conditional MERGE for GoalkeepersTotal (if position is 'g')
                    IF @Position = 'g'
                    BEGIN
                        MERGE INTO goalkeeperstotal AS target
                        USING (VALUES (@Jersey, @Goals, @MinutesPlayed, @Points, @Assists, @Shots, @Played, YEAR(GETDATE()), @GoalsAgainst, @Saves, @ShutOuts)) 
                        AS source (jersey, goals, minutes, points, assists, shots, played, season, goalsAgainst, saves, shutouts)
                        ON target.jersey = source.jersey AND target.season = source.season
                        WHEN MATCHED THEN
                            UPDATE SET 
                                target.[games played] = target.[games played] + source.played,
                                target.minutes = target.minutes + source.minutes,
                                target.[goals against] = target.[goals against] + source.goalsAgainst,
                                target.saves = target.saves + source.saves,
                                target.shutouts = target.shutouts + source.shutouts,
                                target.[goals against average] = 
                                    CASE 
                                        WHEN (target.[games played] + source.played) = 0 THEN 0
                                        ELSE (target.[goals against] + source.goalsAgainst) / (target.[games played] + source.played)
                                    END,
                                target.[saves average] = 
                                    CASE 
                                        WHEN (target.[games played] + source.played) = 0 THEN 0
                                        ELSE (target.saves + source.saves) / (target.[games played] + source.played)
                                    END
                        WHEN NOT MATCHED THEN
                            INSERT (jersey, season, [games played], minutes, [goals against], [goals against average], saves, [saves average], shutouts)
                            VALUES (source.jersey, YEAR(GETDATE()), source.played, source.minutes, source.goalsAgainst, source.goalsAgainst, source.saves, source.saves, source.shutouts);
                    END
                `);

            console.log(`Inserted/Updated: Jersey #${Jersey}`);

        }
        if (finalScore < finalScoreOpp) {
            finalOutcome = 'L';
        }
        else if (finalScore > finalScoreOpp) {
            finalOutcome = 'W';
        }
        else {
            finalOutcome = 'T';
        }

        await poolPromise.request()
            .input('FinalScore', sql.Int, finalScore)
            .query(`
                    SET Context_Info 0x55555
                    UPDATE Players
                    SET "final score" = @FinalScore WHERE "final score" = 9999;
                    SET Context_Info 0x0
                `);

        await poolPromise.request()
            .input('FinalScoreOpp', sql.Int, finalScoreOpp)
            .query(`
                    SET Context_Info 0x55555
                    UPDATE Players
                    SET "final score opponent" = @FinalScoreOpp WHERE "final score opponent" = 9999;
                    SET Context_Info 0x0
                `)

        await poolPromise.request()
            .input('FinalOutcome', sql.Char, finalOutcome)
            .query(`
                    SET Context_Info 0x55555
                    UPDATE Players
                    SET "outcome" = @FinalOutcome WHERE "outcome" = 'M';
                    SET Context_Info 0x0
                `)

        await poolPromise.request()
            .input('FinalScore', sql.Int, finalScore)
            .query(`
                    SET Context_Info 0x55555
                    UPDATE goalkeepers
                    SET "final score" = @FinalScore WHERE "final score" = 9999;
                    SET Context_Info 0x0
                `);

        await poolPromise.request()
            .input('FinalScoreOpp', sql.Int, finalScoreOpp)
            .query(`
                    SET Context_Info 0x55555
                    UPDATE goalkeepers
                    SET "final score opponent" = @FinalScoreOpp WHERE "final score opponent" = 9999;
                    SET Context_Info 0x0
                `)

        await poolPromise.request()
            .input('FinalOutcome', sql.Char, finalOutcome)
            .query(`
                    SET Context_Info 0x55555
                    UPDATE goalkeepers
                    SET "outcome" = @FinalOutcome WHERE "outcome" = 'M';
                    SET Context_Info 0x0
                `)

        // Update TeamRecord

        await poolPromise.request()
            .input('FinalScore', sql.Int, finalScore)
            .input('FinalScoreOpp', sql.Int, finalScoreOpp)
            .input('FinalOutcome', sql.Char, finalOutcome)
            .input('OpponentMatch', sql.VarChar, opponentMatch[1])
            .input('TotalShots', sql.Int, totalShots)
            .input('TotalShotsOpp', sql.Int, totalShotsOpp)
            .query(`
                    INSERT INTO teamRecord (opponent, outcome, "final score", "final score opponent", "shots for", date, "shots against")
                    VALUES (@OpponentMatch, @FinalOutcome, @FinalScore, @FinalScoreOpp,@TotalShots, GETDATE(), @TotalShotsOpp)
                `);

        console.log('Upload complete.');
    }

    // Execute the function
    return await uploadData().then(
        // Success
        () => {
            window.webContents.send('change-spinner', false);
            return true;
        },
        // Failure
        (err) => {
            console.error('Error:', err);
            dialog.showMessageBox(null, {
                type: 'error',
                detail: util.makeErrorReadable(err.toString()),
                title: 'SQL Error',
                message: 'Query failed: An internal server error occurred.'
            });
            window.webContents.send('change-spinner', false);
            return false;
        }
    );
};