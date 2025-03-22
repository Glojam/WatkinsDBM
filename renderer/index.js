const minYear = "1970-01-01";
const maxYear = new Date().getFullYear() + "-12-31"; // By default, max year is current year

let unsavedChanges = false; // Useful so we don't need to parse DOM for checking changes
let currentWorkingTable = "players"; // To keep track of the current working table (CWT)
let columnAssociations = null; // JSON column+key associations for all tables, sent over on init
let unsavedInsert = false;
window.electronAPI.onGetColumns((data) => {
    columnAssociations = data;
    addColumns()
})

/**
 * Given current context (currentWorkingTable, etc) adds the top row headers.
 * 
 * Expects a clear page.
 */
function addColumns() {
    let numCols = columnAssociations[currentWorkingTable].columns.length;
    let topRow = document.getElementById("topRow");
    while (topRow.cells.length > 0) { topRow.deleteCell(0); }
    let cMax = numCols;
    if (columnAssociations[currentWorkingTable].join_jersey) { cMax += 3; }
    for (let c = 0; c < cMax; c++) {
        let newCol = topRow.insertCell(-1); // Append to back
        let innerHTML;
        if (cMax - c <= 3 && columnAssociations[currentWorkingTable].join_jersey) {
            innerHTML = columnAssociations["association"].display_names[4 - (cMax - c)];
        } else {
            innerHTML = columnAssociations[currentWorkingTable].display_names[c];
        }
        newCol.innerHTML = innerHTML;
        newCol.className = "tabElement tabElementBolded";
    }
}

/**
 * Shows the spinner loader.
 */
function showLoader() {
    document.getElementById("loader").style.display = "block";
}
/**
 * Hides the spinner loader.
 */
function hideLoader() {
    document.getElementById("loader").style.display = "none";
}

/**
 * Adds CSS styling to a grid cell
 * @param {HTMLElement} cell    Cell to style.
 * @param {number} rowNum       The row number of the cell, for alternating colors    
 */
function styleCell(cell, rowNum) {
    cell.style.borderTopStyle = "dotted";
    cell.style.borderBottomStyle = "dotted";
    cell.className = (rowNum % 2 == 0) ? "tabElement tabElementAlt" : "tabElement";
}

/**
 * Deletes the DOM elements of new added rows
 */
function deleteAddedRows() {
    let table = document.getElementById("dataTable");
    for (i = table.rows.length; i > 0; i--) {
        row = table.rows[i-1];
        if (row.getAttribute("buffer") === "true") { break; }
        table.deleteRow(i-1);
    }
}

/**
 * Marks all cells as unchanged
 */
function resetAllCellChanges() {
    let table = document.getElementById("dataTable");
    // Delete cell changes in top row
    for (let i = 1; i < table.rows.length; i++) {
        let row = table.rows[i];
        if (row.getAttribute("buffer") === "true") { break; }
        for (let j = 0; j < row.cells.length; j++) {
            let cell = row.cells[j];
            if (cell.getAttribute("changed") !== "true") { continue; }

            let inputElement = cell.querySelector('input');
            let innerVal;
            if (inputElement) {
                innerVal = inputElement.value;
            } else {
                innerVal = cell.innerHTML;
            }

            cell.setAttribute("ogInfo", innerVal);
            cell.setAttribute("changed", false)
            cell.classList.toggle("tabElementModified");
        }
    }
    deleteAddedRows();
}

/**
 * Async prompt to ask user if they want to ignore saved changes
 */
async function ignoreUnsavedChanges() {
    let numUnsavedChanged = calcUnsavedChanges()
    if (unsavedChanges) {
        let success = await window.electronAPI.showPrompt(
            "confirmation",
            `You have ${numUnsavedChanged} unsaved change${numUnsavedChanged == 1 ? "" : "s"} that will be cleared. Continue?`,
            "This action cannot be undone.",
            "Confirmation"
        );
        return success;
    }
    return true;
}

/**
 * Performs SQL SELECT on the DB given the left panel search fields
 */
document.getElementById("searchButton").addEventListener("click", async () => {
    let ignoreChanges = await ignoreUnsavedChanges();
    if (!ignoreChanges) { return; }
    showLoader();
    
    let args = {};
    args["first name"] = document.getElementById("firstName").value;
    args["last name"] = document.getElementById("lastName").value;
    args["year"] = document.getElementById("teamYear").value;
    args["opponent"] = document.getElementById("opponent").value;
    args["division"] = document.getElementById("division").value;
    args["position"] = document.getElementById("position").value;
    
    clearWindow();
    addColumns();
    const data = await window.electronAPI.getData(currentWorkingTable, args);
    console.log(data);
    hideLoader();
    if (!data) { return; } // Error msg is thrown on main side
    let add = 0;
    if (columnAssociations[currentWorkingTable].join_jersey) { add = 3; }

    let table = document.getElementById("dataTable");
    let numColumns = columnAssociations[currentWorkingTable].columns.length + add;
    let rowNum = 2
    data.recordsets[0].forEach(record => {
        let newRow = table.insertRow(-1);
        let i = 0;
        for (const [key, value] of Object.entries(record)) {
            if (i > numColumns) { continue; }
            let cell = newRow.insertCell(i);

            if (key == "date" && value !== null) {
                const date = new Date(value);

                const dateString = date.toISOString().split('T')[0]

                const inputElement = document.createElement('input');
                inputElement.type = 'date';
                inputElement.name = 'Date';
                inputElement.value = dateString;
                inputElement.min = minYear;
                inputElement.max = maxYear;

                cell.appendChild(inputElement);
            } else {
                cell.contentEditable = true;
                cell.innerHTML = value !== null ? value : "";
            }

            cell.addEventListener("input", () => {
                let inputElement = cell.querySelector('input');
                let innerVal;
                if (inputElement) {
                    innerVal = inputElement.value;
                } else {
                    innerVal = cell.innerHTML;
                }
                let prevValue = cell.getAttribute("changed");
                cell.setAttribute("changed", (cell.getAttribute("ogInfo") === innerVal) ? "false" : "true");
                if (prevValue !== cell.getAttribute("changed")) {
                    cell.classList.toggle("tabElementModified");
                }
                calcUnsavedChanges()
            })

            let inputElement = cell.querySelector('input');
            if (inputElement) {
                cell.setAttribute("ogInfo", inputElement.value);
            } else {
                cell.setAttribute("ogInfo", cell.innerHTML);
            }
            
            styleCell(cell, rowNum);
            i++;
        }

        while (i < numColumns) {
            newRow.insertCell(i).innerHTML = "";
            i++;
        }
        rowNum++;
    });

    let buttonRow = table.insertRow(-1);
    buttonRow.innerHTML = '<tr id="bufferRow"><td colspan="100%"><button type="button" id="addRowsButton">+ Add Rows</button></td></tr>';
    buttonRow.setAttribute("buffer", "true");
    document.getElementById("addRowsButton").addEventListener("click", addMoreRows);
});

/**
 * Performs SQL UPDATE on the DB given the unsaved changes. 
 * Performs SQL INSERT on the DB given any added rows.
 */
document.getElementById("updateButton").addEventListener("click", async () => {
    if (!unsavedChanges && !unsavedInsert) {
        window.electronAPI.showPrompt(
            "info",
            "No changes to publish.",
            "",
            "Publish"
        );
        return;
    }
    unsavedInsert = false;
    let modifiedRows = [];
    let addedRows = [];
    let table = document.getElementById("dataTable");

    for (let i = 1; i < table.rows.length; i++) {
        let row = table.rows[i];
        if (row.getAttribute("buffer") === "true") { break; }
        let updatedRow = {};
        let oldRow = {};
        let rowHasChanges = false;
        for (let j = 0; j < row.cells.length; j++) {
            let cell = row.cells[j];
            // Check if the cell contains an input element
            let contents;
            let inputElement = cell.querySelector('input');
            if (inputElement) {
                contents = inputElement.value;
            } else {
                contents = cell.innerHTML;
            }

            // Fill out the data for this row if changes exist
            let colName = columnAssociations[currentWorkingTable].columns[j];
            if (cell.getAttribute("ogInfo") !== contents) {
                rowHasChanges = true;
                updatedRow[colName] = contents;
            }
            if (columnAssociations[currentWorkingTable].primary_keys.includes(colName)) {
                oldRow[colName] = cell.getAttribute("ogInfo");
            }
        }
        if (rowHasChanges) {
            modifiedRows.push({ updated: updatedRow, old: oldRow });
        }
    }

    for (i = table.rows.length; i > 0; i--) {
        row = table.rows[i-1];
        if (row.getAttribute("buffer") === "true") { break; }
        let addedRow = {};
        for (let j = 0; j < row.cells.length; j++) {
            if (columnAssociations[currentWorkingTable].join_jersey && (row.cells.length-j) <= 3) { break; }
            let cell = row.cells[j];
            let contents;
            let inputElement = cell.querySelector('input');
            if (inputElement) {
                contents = inputElement.value;
            } else {
                contents = cell.innerHTML;
            }

            // Fill out the data for this row if changes exist
            // Changes dont need to be tracked for added cells
            let colName = columnAssociations[currentWorkingTable].columns[j];
            addedRow[colName] = contents;
        }
        addedRows.push(addedRow);
    }

    console.log(addedRows);

    if (modifiedRows.length == 0 && addedRows.length == 0) {
        window.electronAPI.showPrompt(
            "info",
            "No changes to publish.",
            "",
            "Publish"
        );
        return;
    }

    showLoader();
    let updateString = "";
    if (modifiedRows.length > 0) {
        let success = await window.electronAPI.update(currentWorkingTable, modifiedRows);
        if (success == true) {
            updateString = modifiedRows.length + ` row${modifiedRows.length == 1 ? " was" : "s were"} changed.\n`
        }
    } 
    if (addedRows.length > 0) {
        let success = await window.electronAPI.insert(currentWorkingTable, addedRows);
        if (success == true) {
            updateString += addedRows.length + ` new row${addedRows.length == 1 ? " was" : "s were"} added.`
        }
    }
    if (updateString !== "") {
        window.electronAPI.showPrompt(
            "info",
            `'${columnAssociations[currentWorkingTable].name}' has been updated`,
            updateString,
            "Publish"
        );
    }
    hideLoader();
    resetAllCellChanges();
    calcUnsavedChanges();
});

// Listener to clear rows
document.getElementById("clearButton").addEventListener("click", async () => {
    let ignoreChanges = await ignoreUnsavedChanges();
    if (!ignoreChanges) { return; }
    clearWindow()
});

/**
 * Async. prompts the user to add rows, then appends extra row fields at the bottom of the table.
 * These fields will be SQL INSERTed when the update button is pressed.
 */
async function addMoreRows() {
    let numNewRows = await window.electronAPI.showPrompt(
        "prompt",
        "How many rows?",
        "",
        "Add Rows"
    );
    if (!numNewRows) { return; }
    numNewRows = Math.min(numNewRows, 50);
    unsavedInsert = true;
    let add = 0;
    if (columnAssociations[currentWorkingTable].join_jersey) { add = 3; }
    let table = document.getElementById("dataTable");
    let cMax = columnAssociations[currentWorkingTable].columns.length + add;
    
    for (let r = 0; r < numNewRows; r++) {
        let newRow = table.insertRow(-1);
        for (let c = 0; c < cMax; c++) {
            let newCell = newRow.insertCell(-1);
            
            let innerHTML;
            if (columnAssociations[currentWorkingTable].join_jersey && (cMax - c) <= 3) {
                innerHTML = columnAssociations["association"].defaults[columnAssociations["association"].columns[4 - (cMax - c)]];
            } else {
                innerHTML = columnAssociations[currentWorkingTable].defaults[columnAssociations[currentWorkingTable].columns[c]];
            }
            newCell.innerHTML = (innerHTML !== undefined) ? innerHTML : '';

            styleCell(newCell, r);
            newCell.contentEditable = true;
        }
    }

    calcUnsavedChanges();
};

// Display form to switch table on screen
document.getElementById("switchTable").addEventListener("click", async () => {
    let ignoreChanges = await ignoreUnsavedChanges();
    if (!ignoreChanges) { return; }
    document.getElementById('popupChangeTable').style.display = 'block';
});

// Close the switch table form when the 'x' on the popup is clicked
document.getElementById("closePopup").addEventListener("click", async () => {
    document.getElementById('popupChangeTable').style.display = 'none';
});

// Handle form submission
document.getElementById("switchTableForm").addEventListener('submit', async (event) => {
    event.preventDefault();
    const selectedOption = document.querySelector('input[name="tableOption"]:checked');
    if (selectedOption) {
        currentWorkingTable = selectedOption.value;
        document.getElementById('viewingText').innerHTML = "Viewing: <br>" + columnAssociations[currentWorkingTable].name
    } else {
        window.electronAPI.showPrompt(
            "info",
            "No option was selected.",
            "",
            "Table Change"
        );
    }
    document.getElementById('popupChangeTable').style.display = 'none';
    clearWindow();
});

/**
 * Iterates through all grid cells, and keeps track of differences from original values via attributes to count changes.
 * Added rows count as a single change, no matter how many.
 * @returns {number}    Number of changes that were counted.
 */
function calcUnsavedChanges() {
    unsavedChanges = false; // Assume false, then try and prove it is true
    let table = document.getElementById("dataTable");
    let changeMeter = document.getElementById("changeMeter");

    let numChanges = 0;
    for (let i = 1; i < table.rows.length; i++) {
        let row = table.rows[i];
        for (let j = 0; j < row.cells.length; j++) {
            let cell = row.cells[j];
            if (cell.getAttribute("changed") !== "true") { continue; }
            // Check if the cell contains an input element
            let contents;
            let inputElement = cell.querySelector('input');
            if (inputElement) {
                contents = inputElement.value;
            } else {
                contents = cell.innerHTML;
            }
            if (cell.getAttribute("ogInfo") === contents) { continue; }
            unsavedChanges = true;
            numChanges++;
        }
    }
    if (unsavedInsert) { numChanges++; }
    changeMeter.innerHTML = numChanges + " unsaved change" + (numChanges == 1 ? "." : "s.");
    return numChanges;
}

/**
 * Deletes all rows in the current selection aside from the header.
 */
function clearWindow() {
    let table = document.getElementById("dataTable");
    let rowCount = table.rows.length;
    for (let i = 2; i < rowCount; i++) {
        table.deleteRow(2);
    }
    while (topRow.cells.length > 1) { topRow.deleteCell(0); }
    topRow.cells[0].innerHTML = "No selection."
    unsavedInsert = false;
    calcUnsavedChanges() // Always happens in tandem
}

// Help window popup listener, called externally from main menu
// TODO better formated popup, possibly using a custom notification
window.electronAPI.onShowHelp(() => {
    window.electronAPI.showPrompt(
        "info",
        "How to Use",
        "Search Fields:  Used to search for specific lines of data that have the matching criteria specified or can be left blank to display all\n" +
        "i.e., each search field filters the output by what you enter.\n" +
        "————————————————————————————————————\n" +
        "Search:  Makes a new selection based on search field criteria.\n" +
        "————————————————————————————————————\n" +
        "Clear:  Removes all rows from the selection, but does not affect the database.\n" +
        "————————————————————————————————————\n" +
        "Switch Table:  Displays a popup where you can choose a different table to display. Options are:\n" +
        "• Players  (stats about offensive & defensive players in a single game)\n" +
        "• Goalkeepers  (stats about goalkeepers in a single game)\n" +
        "• Players Total  (totals stats for offensive & defensive players in a season)\n" +
        "• Goalkeepers  Total (totals stats for goalkeepers in a season)\n" +
        "• Team Record  (general details regarding each game played [score, outcome, etc.])\n" +
        "————————————————————————————————————\n" +
        "Publish Changes:  Compiles all changes made to the current selection and updates those rows in the database.\n" +
        "————————————————————————————————————\n" +
        "File Options (Top-left menu):\n" +
        "• Import Files  (used to select |-delimited CSV file(s) whose data values will be added into the database)\n" +
        "• Export Selection  (takes the current selection and exports as a |-delimited CSV file)\n",
        "Help"
    );
});

// Listener to export the current selection to PDF
window.electronAPI.onExportToPDF(() => {
    // Extract table HTML & send to main process
    const tableElement = document.querySelector("#dataTable");
    const tableHTML = tableElement.outerHTML;
    window.electronAPI.sendExportToPDF(tableHTML);
});
