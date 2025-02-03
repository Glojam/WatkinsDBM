const sql = require('mssql')

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