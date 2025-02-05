const fs = require('fs');
const readline = require('readline');
const sql = require('mssql');

// MSSQL Configuration
const config = {
    user: 'SA',
    password: 'sqlpassword!',
    server: 'localhost',
    database: 'Watkins',
    options: {
        encrypt: true, // Change to true if using Azure
        trustServerCertificate: true,
    },
};

// File path
const filePath = 'WMHS vs Reynoldsburg.txt'; // Change this to your actual file

// Function to parse and upload data
async function uploadData() {
    const pool = await sql.connect(config);
    const rl = readline.createInterface({
        input: fs.createReadStream(filePath),
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
            console.warn('Skipping invalid line:', line);
            continue;
        }

        const [Jersey, Goals, Assists, Shots, MinutesPlayed] = fields.map(Number);

        try {
            await pool.request()
                .input('Jersey', sql.Int, Jersey)
                .input('Goals', sql.Int, Goals)
                .input('Assists', sql.Int, Assists)
                .input('Shots', sql.Int, Shots)
                .input('MinutesPlayed', sql.Int, MinutesPlayed)
                .query(`
                    INSERT INTO Players (jersey, goals, assists, shots, minutes)
                    VALUES (@Jersey, @Goals, @Assists, @Shots, @MinutesPlayed)
                `);

            console.log(`Inserted: Jersey #${Jersey}`);
        } catch (err) {
            console.error('Database error:', err.message);
        }
    }

    await pool.close();
    console.log('Upload complete.');
}

// Execute the function
uploadData().catch(err => console.error('Error:', err));