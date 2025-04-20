/**
 * Takes a error message and attempts to make it more human readable
 * @param {String} err  String containing the error
 * @return {String}     String containing reworded error
 */
export function makeErrorReadable(err) {
    if (err.match("Violation of PRIMARY KEY constraint")) {
        return "Duplicate primary key! If you get this error, it means you just tried to add duplicate data to the table.\n" +
               "  • If you are seeing this after doing an import, it means the game data is already in the database.\n" +
               "  • If you are seeing this after trying to add rows, it means you are adding primary keys that already exist.\n\n" +
               "Detected duplicate key value: " + `${err.match(/\(([^)]+)\)\.?$/)[0]}`
    }
    if (err.match("ConnectionError: Failed to connect to")) {
        return "Failed to connect. Check your internet connection or server credentials and try again.";
    } else if (err.match("ConnectionError: Login failed for user")) {
        return "Incorrect password for selected user.";
    } else if (err.match("getaddrinfo ENOTFOUND")) {
        return "Invalid server name.";
    }
    return err;
}