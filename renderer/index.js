import { fieldForm, halfScoreForm, startedForm, motmForm, sportsmanForm, shotsGoalForm, yellowsForm, redsForm } from "./forms.js";
import { makeErrorReadable } from "../util.mjs";
const pageInfo = {
    login: {html: "./login.html", func: makeLoginConnections},
    main: {html: "./main.html", func: makeMainConnections}
}
const minYear = "1970-01-01";
const maxYear = new Date().getFullYear() + "-12-31"; // By default, max year is current year
const numberSelectorMax = 10000;        // Max value for any number input
const timeout = 60 * 5 * 1000;          // Time (in milliseconds) of inactivity before user gets kicked off

let isDev = false;                      // (Do not change) turned on if dev env is detected, to enable quick testing features
let unsavedChanges = false;             // Useful so we don't need to parse DOM for checking changes
let unsavedInsert = false;              // Ditto - for added rows
let currentWorkingTable = "players";    // To keep track of the current working table (CWT)
let columnAssociations = null;          // JSON column+key associations for all tables, sent over on init
let isAdmin = false;                    // Determines what frontend features should be enabled
let currentlyConnecting = false;        // Connect button debounce
let addedRowSeq = 1;                    // Keeps consistent row color alternation if pressed multiple times, for added rows
let currentPage = "";                   // String name of the current page
let bufferRow;                          // Reference to HTMLelement of the buffer row, which contains the "Add Rows" button

/**
 * Hooks up connections from Login DOM elements to functions
 * This is necessary when the page is rewritten
 */
async function makeLoginConnections(extras) {
    document.getElementById("connectButton").addEventListener("click", async () => { connect(); });
    if (extras.inactive) {
        document.getElementById("errorText").innerHTML = "You were disconnected due to inactivity.";
    }
    // DEV ONLY
    if (!isDev) { return; }
    let passwords = JSON.parse(await (await fetch("../passwords.json")).text());
    document.getElementById("serverInput").value = passwords.server;
    document.getElementById("portInput").value = passwords.port;
    document.getElementById("usernameInput").value = passwords.devEnv;
    document.getElementById("passwordInput").value = passwords[passwords.devEnv];
}

/**
 * Hooks up connections from Main DOM elements to functions
 * This is necessary when the page is rewritten
 */
async function makeMainConnections(extras) {
    currentWorkingTable = "players";

    document.getElementById("modeTag").innerHTML = (isAdmin ? "Admin" : "Guest") + " Mode" + `<div id="viewingText">Viewing: <br>Players</div>`;
    if (isAdmin) { 
        (document.getElementById("modeTag").classList.toggle("guestModeItem")); 
    }

    document.getElementById("searchButton").addEventListener("click", async () => { searchDataFields(); });
    document.getElementById("updateButton").addEventListener("click", async () => { updateDataFields(); });

    // Listener to clear rows
    document.getElementById("clearButton").addEventListener("click", async () => {
        let ignoreChanges = await ignoreUnsavedChanges();
        if (!ignoreChanges) { return; }
        clearWindow(true, true);
    });

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
            document.getElementById('viewingText').innerHTML = "Viewing: <br>" + columnAssociations[currentWorkingTable].name;
        } else {
            window.electronAPI.showPrompt(
                "info",
                "No option was selected.",
                "",
                "Table Change"
            );
        }
        document.getElementById('popupChangeTable').style.display = 'none';
        clearWindow(true, true);
        showSearchableFields();
    });

    document.getElementById("disconnectButton").addEventListener("click", async () => {
        let ignoreChanges = await ignoreUnsavedChanges();
        if (!ignoreChanges) { return; }
        window.electronAPI.logout();
        switchPage("login");
    });

    // Handle form submission on step 1
    document.getElementById("fieldForm").addEventListener('submit', async (event) => { await fieldForm(event); });
    // Handle form submission on step 2
    document.getElementById("halfScoreForm").addEventListener('submit', async (event) => { await halfScoreForm(event); });
    // Handle form submission on step 3
    document.getElementById("startedForm").addEventListener('submit', async (event) => { await startedForm(event); });
    // Handle form submission on step 4
    document.getElementById("motmForm").addEventListener('submit', async (event) => { await motmForm(event); });
    // Handle form submission on step 5
    document.getElementById("sportsmanForm").addEventListener('submit', async (event) => { await sportsmanForm(event); });
    // Handle form submission on step 6
    document.getElementById("shotsGoalForm").addEventListener('submit', async (event) => { await shotsGoalForm(event); });
    // Handle form submission on step 7
    document.getElementById("yellowsForm").addEventListener('submit', async (event) => { await yellowsForm(event); });
    // Handle form submission on step 8
    document.getElementById("redsForm").addEventListener('submit', async (event) => { await redsForm(event); });
    document.getElementById("changeMeter").style.display = isAdmin ? "block" : "none";
    document.getElementById("updateButton").style.display = isAdmin ? "block" : "none";

    addColumns();
    addBufferRow();
    showSearchableFields();
}

/**
 * Switches the page to the name specified (login, main, etc.)
 * @param {String} to       Page name to switch to (from pageInfo)
 * @param {Object} extras   JSON object containing any variables the new page may need
 */
async function switchPage(to, extras = {}) {
    currentPage = to;
    let container = document.getElementById("mainContainer");
    container.innerHTML = "";
    const response = await fetch(pageInfo[to].html);
    container.innerHTML = await response.text();
    pageInfo[to].func(extras);
}

async function connect() {
    if (currentlyConnecting) { return; }
    currentlyConnecting = true;
    let buttonElement = document.getElementById("connectButton");
    document.getElementById("errorText").innerHTML = "";

    let credentials = {};
    credentials.user = document.getElementById("usernameInput").value;
    credentials.password = document.getElementById("passwordInput").value;
    credentials.server = document.getElementById("serverInput").value;
    credentials.port = Number(document.getElementById("portInput").value);

    showLoader();
    buttonElement.style.display = "none";
    let successOrError = await window.electronAPI.login(credentials);
    hideLoader();
    buttonElement.style.display = "block";
    currentlyConnecting = false;
    isAdmin = document.getElementById("usernameInput").value === "Admin";
    if (successOrError == true) {
        switchPage("main");
        window.electronAPI.setUserRole(isAdmin);
    } else {
        document.getElementById("errorText").innerHTML = makeErrorReadable(successOrError);
    }
}

/**
 * Given current context (currentWorkingTable, etc) adds the top row headers.
 * 
 * Expects a clear page
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
function styleCell(cell, rowNum, valueIsReadOnly) {
    cell.style.borderTopStyle = "dotted";
    cell.style.borderBottomStyle = "dotted";
    cell.className = (rowNum % 2 == 0) ? "tabElement tabElementAlt" : "tabElement";
    if (valueIsReadOnly) { cell.classList.toggle("cellUneditable"); }
}

/**
 * Deletes the DOM elements of new added rows
 */
function deleteAddedRows() {
    let table = document.getElementById("dataTable");
    for (let i = table.rows.length; i > 0; i--) {
        let row = table.rows[i-1];
        if (row.getAttribute("buffer") === "true") { break; }
        table.deleteRow(i-1);
    }
    if (columnAssociations[currentWorkingTable].addable && isAdmin) {
        bufferRow.innerHTML = '<tr id="bufferRow"><td colspan="100%"><button type="button" id="addRowsButton">+ Add Rows</button></td></tr>';
        document.getElementById("addRowsButton").addEventListener("click", addMoreRows);
    }
    addedRowSeq = 1; // Make sure the first added row is always grey for readability
    unsavedInsert = false;
    calcUnsavedChanges();
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
            let selectElement = cell.querySelector('select')
            let innerVal;
            if (inputElement) {
                innerVal = inputElement.value;
            } else if (selectElement) {
                innerVal = selectElement.value;
            } else {
                innerVal = cell.innerHTML;
            }

            cell.setAttribute("ogInfo", innerVal);
            cell.setAttribute("changed", false)
            cell.classList.toggle("tabElementModified");
            if (inputElement) {
                inputElement.classList.toggle("whiteTextForInput");
            } else if (selectElement) {
                selectElement.classList.toggle("whiteTextForInput");
            }
        }
    }
}

/**
 * Async prompt to ask user if they want to ignore saved changes
 */
async function ignoreUnsavedChanges() {
    let numUnsavedChanged = calcUnsavedChanges()
    if (unsavedChanges || unsavedInsert) {
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
 * Sets HTML to be some kind of special input or selector if appropriate
 * @param {HTMLElement} cell        Cell element to modify
 * @param {string} columnName       Name of the data column
 * @param {any} value               Value to supply the cell
 */
function createInnerHTMLforCell(cell, columnName, value) {
    if (!value && columnName) {
        let def = columnAssociations[currentWorkingTable].defaults[columnName];
        value = def ? def : value;
        // todo stupid breaks on teamrecord
    }

    let makeSelector = (options) => {
        var selectList = document.createElement("select");
        selectList.classList.toggle("tableInput");
        cell.appendChild(selectList);

        for (var i = 0; i < options.length; i++) {
            var option = document.createElement("option");
            option.value = options[i];
            option.text = options[i];
            selectList.appendChild(option);
        }
        let valueString = String(value);
        if (valueString) {
            selectList.value = valueString;
        }
    }

    if (columnName == "date" && value !== null) {
        const dateString = (new Date(value)).toISOString().split('T')[0];
 
        let inputElement = document.createElement('input');
        inputElement.classList.toggle("tableInput");
        inputElement.type = 'date';
        inputElement.name = 'Date';
        inputElement.value = dateString;
        inputElement.min = minYear;
        inputElement.max = maxYear;

        cell.appendChild(inputElement);
    } else if (columnName == "field") {
        makeSelector(["H", "A"]);
    } else if (columnName == "outcome") {
        makeSelector(["W", "L", "T"]);
    } else if ((columnName == "played" || columnName == "started" || columnName == "motm award" || columnName == "sportsmanship award")) {
        makeSelector(["true", "false"]);
    } else if (columnName == "year") {
        makeSelector(["1", "2", "3", "4"]);
    } else if (columnName == "division") {
        makeSelector(["D1", "D2", "D3", "D4"]);
    } else if (columnName == "position") {
        makeSelector(["F", "M", "D", "G"]);
    } else if ((columnName == "opponent" || columnName == "first name" || columnName == "last name")) {
        cell.contentEditable = true;
        cell.innerHTML = value !== null ? value : "";
    } else {
        let numberInput = document.createElement("input");
        numberInput.classList.toggle("tableInput");
        cell.appendChild(numberInput);
        numberInput.type = "number";
        numberInput.min = 0;
        numberInput.max = numberSelectorMax;
        numberInput.step = 1;
        numberInput.value = value ? value : 0;
    }
}

/**
 * Performs SQL SELECT on the DB given the left panel search fields
 */
async function searchDataFields() {
    let ignoreChanges = await ignoreUnsavedChanges();
    if (!ignoreChanges) { return; }

    showLoader();
    
    let args = {};
    args["first name"] = document.getElementById("firstName").value;
    args["last name"] = document.getElementById("lastName").value;
    args["season"] = document.getElementById("season").value;
    args["opponent"] = document.getElementById("opponent").value;
    args["division"] = document.getElementById("division").value;
    args["position"] = document.getElementById("position").value;
    
    clearWindow();

    const data = await window.electronAPI.getData(currentWorkingTable, args);

    hideLoader();

    if (!data) {
        // Error msg is thrown on main side
        // Debug: restore page format to prevent entire app from breaking
        addColumns();
        addBufferRow();
        return; 
    }

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
            
            // Values are read-only if they are explicity defined as such, OR if they are joined from another table
            let valueIsReadOnly = columnAssociations[currentWorkingTable].readonly_cols.includes(key) || (columnAssociations[currentWorkingTable].columns.includes(key) == false);

            // Do not add input selectors or changed listeners if in guess mode
            if (!isAdmin || valueIsReadOnly) {
                if (key == "date" && value !== null) {
                    cell.innerHTML = (new Date(value)).toISOString().split('T')[0];
                } else {
                    cell.innerHTML = value;
                }
                styleCell(cell, rowNum, valueIsReadOnly);
                i++;
                continue;
            }

            createInnerHTMLforCell(cell, key, value);

            cell.addEventListener("input", () => {
                let inputElement = cell.querySelector('input');
                let selectElement = cell.querySelector('select');
                let innerVal;
                if (inputElement) {
                    innerVal = inputElement.value;
                } else if (selectElement) {
                    innerVal = selectElement.value;
                } else {
                    innerVal = cell.innerHTML;
                }
                let prevValue = cell.getAttribute("changed");
                cell.setAttribute("changed", (cell.getAttribute("ogInfo") === innerVal) ? "false" : "true");
                if (prevValue !== cell.getAttribute("changed")) {
                    cell.classList.toggle("tabElementModified");
                    if (inputElement) {
                        inputElement.classList.toggle("whiteTextForInput");
                    } else if (selectElement) {
                        selectElement.classList.toggle("whiteTextForInput");
                    }
                }
                calcUnsavedChanges()
            })

            let inputElement = cell.querySelector('input');
            let selectElement = cell.querySelector('select');
            if (inputElement) {
                cell.setAttribute("ogInfo", inputElement.value);
            } else if (selectElement) {
                cell.setAttribute("ogInfo", selectElement.value);
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
    addBufferRow();
}

/**
 * Adds the "Add Rows" button in a buffer row at the bottom of the page
 */
function addBufferRow() {
    bufferRow = document.getElementById("dataTable").insertRow(-1);
    bufferRow.setAttribute("buffer", "true");
    if (columnAssociations[currentWorkingTable].addable && isAdmin) {
        bufferRow.innerHTML = '<tr id="bufferRow"><td colspan="100%"><button type="button" id="addRowsButton">+ Add Rows</button></td></tr>';
        document.getElementById("addRowsButton").addEventListener("click", addMoreRows);
    }
}

/**
 * Performs SQL UPDATE on the DB given the unsaved changes. 
 * Performs SQL INSERT on the DB given any added rows.
 */
async function updateDataFields() {
    if (!isAdmin) { return; }
    if (!unsavedChanges && !unsavedInsert) {
        window.electronAPI.showPrompt(
            "info",
            "No changes to publish.",
            "",
            "Publish"
        );
        return;
    }
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
            const colName = columnAssociations[currentWorkingTable].columns[j];

            let cell = row.cells[j];
            // Check if the cell contains an input element
            let contents;
            let inputElement = cell.querySelector('input');
            let selectElement = cell.querySelector('select');
            if (inputElement) {
                contents = inputElement.value;
            } else if (selectElement) {
                contents = selectElement.value;
            } else {
                contents = cell.innerHTML;
            }
            
            let valueIsReadOnly = columnAssociations[currentWorkingTable].readonly_cols.includes(colName) || (columnAssociations[currentWorkingTable].columns.includes(colName) == false)

            // Fill out the data for this row if changes exist
            if ((cell.getAttribute("ogInfo") !== contents) && !valueIsReadOnly) {
                rowHasChanges = true;
                updatedRow[colName] = contents;             
            }
            if (columnAssociations[currentWorkingTable].primary_keys.includes(colName)) {
                oldRow[colName] = cell.getAttribute("ogInfo") || contents;
            }
        }
        if (rowHasChanges) {
            modifiedRows.push({ updated: updatedRow, old: oldRow });
        }
    }

    for (let i = table.rows.length; i > 0; i--) {
        let row = table.rows[i-1];
        if (row.getAttribute("buffer") === "true") { break; }
        let addedRow = {};
        for (let j = 0; j < row.cells.length; j++) {
            if (columnAssociations[currentWorkingTable].join_jersey && (row.cells.length-j) <= 3) { break; }
            let cell = row.cells[j];
            let contents;
            let inputElement = cell.querySelector('input');
            let selectElement = cell.querySelector('select');
            if (inputElement) {
                contents = inputElement.value;
            } else if (selectElement) {
                contents = selectElement.value;
            } else {
                contents = cell.innerHTML;
            }

            // Fill out the data for this row if changes exist
            // Changes dont need to be tracked for added cells
            const colName = columnAssociations[currentWorkingTable].columns[j];
            addedRow[colName] = contents;
        }
        addedRows.push(addedRow);
    }

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
            updateString = modifiedRows.length + ` row${modifiedRows.length == 1 ? " was" : "s were"} changed.\n`;
            resetAllCellChanges();
        }
    } 
    if (addedRows.length > 0) {
        let success = await window.electronAPI.insert(currentWorkingTable, addedRows);
        if (success == true) {
            updateString += addedRows.length + ` new row${addedRows.length == 1 ? " was" : "s were"} added.`;
            deleteAddedRows();
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
    calcUnsavedChanges();
}

/**
 * Async. prompts the user to add rows, then appends extra row fields at the bottom of the table.
 * These fields will be SQL INSERTed when the update button is pressed.
 */
async function addMoreRows() {
    if (!isAdmin) { return; }
    let numNewRows = await window.electronAPI.showPrompt(
        "prompt",
        "How many rows?",
        "",
        "Add Rows"
    );
    if (!numNewRows) { return; }
    if (numNewRows < 1) { return; }
    numNewRows = Math.min(numNewRows, 50);
    unsavedInsert = true;
    let add = 0;
    if (columnAssociations[currentWorkingTable].join_jersey) { add = 3; }
    let table = document.getElementById("dataTable");
    let cMax = columnAssociations[currentWorkingTable].columns.length + add;

    for (let r = 0; r < numNewRows; r++) {
        let newRow = table.insertRow(-1);
        addedRowSeq++;
        for (let c = 0; c < cMax; c++) {
            let newCell = newRow.insertCell(-1);
            
            let innerHTML;
            if (columnAssociations[currentWorkingTable].join_jersey && (cMax - c) <= 3) {
                innerHTML = columnAssociations["association"].defaults[columnAssociations["association"].columns[4 - (cMax - c)]];
            } else {
                innerHTML = columnAssociations[currentWorkingTable].defaults[columnAssociations[currentWorkingTable].columns[c]];
            }
            createInnerHTMLforCell(newCell, columnAssociations[currentWorkingTable].columns[c], (innerHTML !== undefined) ? innerHTML : '');

            styleCell(newCell, addedRowSeq);
        }
    }

    bufferRow.innerHTML = '<tr id="bufferRow"><td colspan="100%"><button type="button" id="addRowsButton">+ Add Rows</button><button type="button" id="deleteRowsButton">Delete</button></td></tr>';
    document.getElementById("deleteRowsButton").addEventListener("click", deleteAddedRows);
    document.getElementById("addRowsButton").addEventListener("click", addMoreRows);
    calcUnsavedChanges();
};

/**
 * Iterates through all grid cells, and keeps track of differences from original values via attributes to count changes.
 * Added rows count as a single change, no matter how many.
 * @returns {number}    Number of changes that were counted.
 */
function calcUnsavedChanges() {
    if (!isAdmin) { return; }
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
            let selectElement = cell.querySelector('select')
            if (inputElement) {
                contents = inputElement.value;
            } else if (selectElement) {
                contents = selectElement.value;
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
 * Displays only the applicable search fields for the CWT
 */
function showSearchableFields() {
    let allFields = ["firstName", "lastName", "season", "opponent", "division", "position"];
    let nonSearchableFields = columnAssociations[currentWorkingTable].non_searchable;
    allFields.forEach((colName) => {
        let actualName = colName.replace(/([A-Z])/g, ' $1').trim().toLowerCase();
        let display = nonSearchableFields.includes(actualName) ? "none" : "inline";
        document.getElementById(colName + "Tag").style.display = display;
        document.getElementById(colName).style.display = display;
    });
}

/**
 * Deletes all rows in the current selection aside from the header.
 */
function clearWindow(clearSearchFields, appendAddRowsButton) {
    let table = document.getElementById("dataTable");
    let rowCount = table.rows.length;
    deleteAddedRows();
    for (let i = 2; i < rowCount; i++) {
        table.deleteRow(2);
    }
    unsavedInsert = false;
    if (clearSearchFields) {
        document.getElementById("firstName").value = '';
        document.getElementById("lastName").value = '';
        document.getElementById("season").value = '';
        document.getElementById("opponent").value = '';
        document.getElementById("division").value = '';
        document.getElementById("position").value = '';
    }
    addColumns();
    if (appendAddRowsButton) { addBufferRow(); }
    calcUnsavedChanges(); // Always happens in tandem
}

/**
 * Runs a background thread that logs user out if inactive
 */
function runInactivityLoop() {
    let time;
    window.onload = resetTimer;
    document.onmousemove = resetTimer;
    document.onkeydown = resetTimer;
    document.onload = resetTimer;
    document.onmousemove = resetTimer;
    document.ontouchstart = resetTimer;
    document.onkeydown = resetTimer;

    function logout() {
        if (currentPage != "main") { return; }
        window.electronAPI.logout();
        switchPage("login", {"inactive": true});
    }

    function resetTimer() {
        clearTimeout(time);
        time = setTimeout(logout, timeout);
        // 1000 milliseconds = 1 second
    }
};

/**
 * Gets the HTML contents of the data table minus any input or css fluff
 * @returns {String} The table HTML
 */
function getDataTable() {
    // Extract table HTML & send to main process
    const tableElement = document.querySelector("#dataTable");

    // Convert all input fields to their displayed values
    const clonedTable = tableElement.cloneNode(true);
    clonedTable.querySelectorAll("td").forEach(td => {
        const oginfoValue = td.getAttribute("oginfo");
        if (oginfoValue !== null) {
            td.textContent = oginfoValue;  // Replace inner content with oginfo value
        }
    });
    // Delete the add rows button
    clonedTable.querySelectorAll("tr").forEach(tr => {
        if (tr.getAttribute("buffer") == "true") { tr.remove(); }
    });

    // Get HTML and send to main
    return clonedTable;
}

// Listener to export the current selection to PDF
window.electronAPI.onExportToPDF(() => {
    window.electronAPI.sendExportToPDF(getDataTable().outerHTML);
});

// Listener to export the current selection to CSV
window.electronAPI.onExportToCSV(() => {
    let dataStream = [];
    getDataTable().querySelectorAll("tr").forEach(row => {
        let rowTab = [];
        for (let c = 0; c < row.cells.length; c++) {
            rowTab.push(row.cells[c].innerText);
        }
        if (rowTab.length > 0) { dataStream.push(rowTab) };
    });

    window.electronAPI.sendExportToCSV(dataStream);
});

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
        "• Players Total  (total stats for offensive & defensive players in a season)\n" +
        "• Goalkeepers Total (total stats for goalkeepers in a season)\n" +
        "• Team Record  (general details regarding each game played [score, outcome, etc.])\n" +
        "• Association  (list that maps jersey number and season to names)\n" +
        "————————————————————————————————————\n" +
        "Publish Changes:  Compiles all changes made to the current selection and updates those rows in the database.\n" +
        "————————————————————————————————————\n" +
        "File Options (Top-left menu):\n" +
        "• Import Files  (used to select |-delimited CSV file(s) whose data values will be added into the database)\n" +
        "• Export Selection  (takes the current selection and exports as PDF or CSV)\n",
        "Help"
    );
});

// Linear Functions for getting additional data on file input
// Show first step on file upload
window.electronAPI.getMoreInputs(() => {
    document.getElementById('popupField').style.display = 'block';
})

// Linear Functions for getting additional data on file input
// Show first step on file upload
window.electronAPI.getMoreInputs(() => {
    document.getElementById('popupField').style.display = 'block';
})

window.electronAPI.onChangeTheme((toTheme) => {
    document.documentElement.setAttribute('data-theme', toTheme);
})

window.electronAPI.onShowSpinner((shown) => {
    shown ? showLoader() : hideLoader();
})

// Listener to set column associations table; should only fire once
window.electronAPI.onGetIsDev((serverIsDev) => { isDev = serverIsDev; })

// Listener to set column associations table; should only fire once
window.electronAPI.onGetColumns((data) => {
    columnAssociations = data;
    switchPage("login");
    runInactivityLoop();
})