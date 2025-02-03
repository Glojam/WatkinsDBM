const sql = require('mssql')

// TODO this is a test; move this to sqlservice.js
// Authentication information should NEVER be stored in-app!
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