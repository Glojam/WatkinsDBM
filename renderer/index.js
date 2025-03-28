const minYear = "1970-01-01";
const maxYear = new Date().getFullYear() + "-12-31"; // By default, max year is current year
const numberSelectorMax = 10000

let unsavedChanges = false; // Useful so we don't need to parse DOM for checking changes
let currentWorkingTable = "players"; // To keep track of the current working table (CWT)
let columnAssociations = null; // JSON column+key associations for all tables, sent over on init
let unsavedInsert = false;
let bufferRow;
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
    if (columnAssociations[currentWorkingTable].addable) {
        bufferRow.innerHTML = '<tr id="bufferRow"><td colspan="100%"><button type="button" id="addRowsButton">+ Add Rows</button></td></tr>';
        document.getElementById("addRowsButton").addEventListener("click", addMoreRows);
    }
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
    deleteAddedRows();
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

// Linear Functions for getting additional data on file input
// Show first step on file upload
window.electronAPI.getMoreInputs(() => {
    document.getElementById('popupField').style.display = 'block';
})

// Handle form submission on step 1
document.getElementById("fieldForm").addEventListener('submit', async (event) => {
    event.preventDefault();
    const selectedOption = document.querySelector('input[name="fieldOption"]:checked');
    if (selectedOption) {
        // TODO: Add Data to SQL Table
        let fieldChoice = selectedOption.value;
        console.log(fieldChoice);

        // Go to next step
        document.getElementById('popupField').style.display = 'none';
        document.getElementById('popupHalfScore').style.display = 'block';
    } else {
        window.electronAPI.showPrompt(
            "info",
            "Please select an option.",
            "",
            "Field Choice"
        );
    }
});

// Handle form submission on step 2
document.getElementById("halfScoreForm").addEventListener('submit', async (event) => {
    event.preventDefault();
    // TODO: Add Data to SQL Table
    const watkinsHalf = document.querySelector('input[name="watkinsHalfScore"]').value;
    const opponentHalf = document.querySelector('input[name="opponentHalfScore"]').value;
    console.log(watkinsHalf + "-" + opponentHalf);

    // Build form for next step
    let startedForm = document.getElementById("startedForm");
    let innerHTML = '<p>Y/N</p>';
    let firstNames = [];
    let lastNames = [];

    const data = await window.electronAPI.getData("association", {});

    data.recordsets[0].forEach(record => {
        for (const [key, value] of Object.entries(record)) {
            if (key == "first name"){ firstNames.push(value); }
            if (key == "last name"){ lastNames.push(value); }
        }
    });

    for (let i = 0; i < firstNames.length; i++){
        innerHTML += '<input type="checkbox" name="startedOption" value="yes' + lastNames[i] + '">';
        innerHTML += '<input type="checkbox" name="startedOption" value="no' + lastNames[i] + '" checked>';
        innerHTML += '<label>';
        innerHTML += "  " + firstNames[i] + " " + lastNames[i];
        innerHTML += '</label><br>';
    }

    innerHTML += '<br><button type="submit">Submit</button>'
    startedForm.innerHTML = innerHTML;

    // Go to next step
    document.getElementById('popupHalfScore').style.display = 'none';
    document.getElementById('popupStarted').style.display = 'block';
});

// Handle form submission on step 3
document.getElementById("startedForm").addEventListener('submit', async (event) => {
    event.preventDefault();
    // TODO: Add Data to SQL Table
    const startedCheckedBoxes = document.querySelectorAll('input[name="startedOption"]:checked');
    let checkedBoxesArr = [];
    startedCheckedBoxes.forEach(checkBox => {
        checkedBoxesArr.push(checkBox.value);
        console.log(checkBox.value);
    });

    // Build form for next step
    let motmForm = document.getElementById("motmForm");
    let innerHTML = '';
    let firstNames = [];
    let lastNames = [];

    const data = await window.electronAPI.getData("association", {});

    data.recordsets[0].forEach(record => {
        for (const [key, value] of Object.entries(record)) {
            if (key == "first name"){ firstNames.push(value); }
            if (key == "last name"){ lastNames.push(value); }
        }
    });

    for (let i = 0; i < firstNames.length; i++){
        innerHTML += '<input type="radio" name="motmOption" value="' + lastNames[i] + '">';
        innerHTML += '<label>';
        innerHTML += "  " + firstNames[i] + " " + lastNames[i];
        innerHTML += '</label><br>';
    }

    innerHTML += '<br><button type="submit">Submit</button>'
    motmForm.innerHTML = innerHTML;

    // Go to next step
    document.getElementById('popupStarted').style.display = 'none';
    document.getElementById('popupMOTM').style.display = 'block';
});

// Handle form submission on step 4
document.getElementById("motmForm").addEventListener('submit', async (event) => {
    event.preventDefault();
    const selectedOption = document.querySelector('input[name="motmOption"]:checked');
    if (selectedOption) {
        // TODO: Add Data to SQL Table
        let motmWinner = selectedOption.value;
        console.log(motmWinner);

        // Build form for next step
        let sportsmanForm = document.getElementById("sportsmanForm");
        let innerHTML = '';
        let firstNames = [];
        let lastNames = [];
    
        const data = await window.electronAPI.getData("association", {});
    
        data.recordsets[0].forEach(record => {
            for (const [key, value] of Object.entries(record)) {
                if (key == "first name"){ firstNames.push(value); }
                if (key == "last name"){ lastNames.push(value); }
            }
        });
    
        for (let i = 0; i < firstNames.length; i++){
            innerHTML += '<input type="radio" name="sportsmanOption" value="' + lastNames[i] + '">';
            innerHTML += '<label>';
            innerHTML += "  " + firstNames[i] + " " + lastNames[i];
            innerHTML += '</label><br>';
        }

        innerHTML += '<br><button type="submit">Submit</button>'
        sportsmanForm.innerHTML = innerHTML;

        // Go to next step
        document.getElementById('popupMOTM').style.display = 'none';
        document.getElementById('popupSportsman').style.display = 'block';
    } else {
        window.electronAPI.showPrompt(
            "info",
            "Please select an option.",
            "",
            "MOTM Choice"
        );
    }
});

// Handle form submission on step 5
document.getElementById("sportsmanForm").addEventListener('submit', async (event) => {
    event.preventDefault();
    const selectedOption = document.querySelector('input[name="sportsmanOption"]:checked');
    if (selectedOption) {
        // TODO: Add Data to SQL Table
        let sportsmanWinner = selectedOption.value;
        console.log(sportsmanWinner);

        // Build form for next step
        let shotsGoalForm = document.getElementById("shotsGoalForm");
        let innerHTML = '';
        let firstNames = [];
        let lastNames = [];
    
        const data = await window.electronAPI.getData("association", {});
    
        data.recordsets[0].forEach(record => {
            for (const [key, value] of Object.entries(record)) {
                if (key == "first name"){ firstNames.push(value); }
                if (key == "last name"){ lastNames.push(value); }
            }
        });
    
        for (let i = 0; i < firstNames.length; i++){
            innerHTML += '<label>';
            innerHTML += firstNames[i] + " " + lastNames[i];
            innerHTML += '</label><input type="number" name="shotsGoal' + lastNames[i] + '" value="0" min="0" max="99"><br>';
        }

        innerHTML += '<br><button type="submit">Submit</button>'
        shotsGoalForm.innerHTML = innerHTML;

        // Go to next step
        document.getElementById('popupSportsman').style.display = 'none';
        document.getElementById('popupShotsGoal').style.display = 'block';
    } else {
        window.electronAPI.showPrompt(
            "info",
            "Please select an option.",
            "",
            "Sportsmanship Choice"
        );
    }
});

// Handle form submission on step 6
document.getElementById("shotsGoalForm").addEventListener('submit', async (event) => {
    event.preventDefault();
    // TODO: Add Data to SQL Table
    let firstNames = [];
    let lastNames = [];
    let shotsGoalArr = [];
    
    const data = await window.electronAPI.getData("association", {});
    
    data.recordsets[0].forEach(record => {
        for (const [key, value] of Object.entries(record)) {
            if (key == "first name"){ firstNames.push(value); }
            if (key == "last name"){ lastNames.push(value); }
        }
    });

    lastNames.forEach(name => {
        shotsGoalArr.push(document.querySelector('input[name="shotsGoal' + name + '"]').value);
        console.log(name + ": " + document.querySelector('input[name="shotsGoal' + name + '"]').value);
    });

    // Build form for next step
    let yellowsForm = document.getElementById("yellowsForm");
    let innerHTML = '';

    for (let i = 0; i < firstNames.length; i++){
        innerHTML += '<input type="checkbox" name="yellows" value="' + lastNames[i] + '">';
        innerHTML += '<label>';
        innerHTML += "  " + firstNames[i] + " " + lastNames[i];
        innerHTML += '</label><br>';
    }

    innerHTML += '<br><button type="submit">Submit</button>'
    yellowsForm.innerHTML = innerHTML;

    // Go to next step
    document.getElementById('popupShotsGoal').style.display = 'none';
    document.getElementById('popupYellows').style.display = 'block';
});

// Handle form submission on step 7
document.getElementById("yellowsForm").addEventListener('submit', async (event) => {
    event.preventDefault();
    // TODO: Add Data to SQL Table
    const yellowsCheckedBoxes = document.querySelectorAll('input[name="yellows"]:checked');
    if (yellowsCheckedBoxes){
        let checkedBoxesArr = [];
        yellowsCheckedBoxes.forEach(checkBox => {
            checkedBoxesArr.push(checkBox.value);
            console.log(checkBox.value);
        });
    } else {
        console.log("No yellows selected");
    }

    // Build form for next step
    let redsForm = document.getElementById("redsForm");
    let innerHTML = '';
    let firstNames = [];
    let lastNames = [];

    const data = await window.electronAPI.getData("association", {});

    data.recordsets[0].forEach(record => {
        for (const [key, value] of Object.entries(record)) {
            if (key == "first name"){ firstNames.push(value); }
            if (key == "last name"){ lastNames.push(value); }
        }
    });

    for (let i = 0; i < firstNames.length; i++){
        innerHTML += '<input type="checkbox" name="reds" value="' + lastNames[i] + '">';
        innerHTML += '<label>';
        innerHTML += "  " + firstNames[i] + " " + lastNames[i];
        innerHTML += '</label><br>';
    }

    innerHTML += '<br><button type="submit">Submit</button>'
    redsForm.innerHTML = innerHTML;

    // Go to next step
    document.getElementById('popupYellows').style.display = 'none';
    document.getElementById('popupReds').style.display = 'block';
});

// Handle form submission on step 8
document.getElementById("redsForm").addEventListener('submit', async (event) => {
    event.preventDefault();
    // TODO: Add Data to SQL Table
    const redsCheckedBoxes = document.querySelectorAll('input[name="reds"]:checked');
    if (redsCheckedBoxes){
        let checkedBoxesArr = [];
        redsCheckedBoxes.forEach(checkBox => {
            checkedBoxesArr.push(checkBox.value);
            console.log(checkBox.value);
        });
    } else {
        console.log("No yellows selected");
    }

    // Close popup
    document.getElementById('popupReds').style.display = 'none';
});

/**
 * Sets HTML to be some kind of special input or selector if appropriate
 * @param {HTMLElement} cell        Cell element to modify
 * @param {string} columnName       Name of the data column
 * @param {any} value               Value to supply the cell
 */
function createInnerHTMLforCell(cell, columnName, value) {
    if (!value && columnName) {
        def = columnAssociations[currentWorkingTable].defaults[columnName];
        value = def ? def : value;
        // todo stupid breaks on teamrecord
    }

    let makeSelector = (options) => {
        var selectList = document.createElement("select");
        cell.appendChild(selectList);

        for (var i = 0; i < options.length; i++) {
            var option = document.createElement("option");
            option.value = options[i];
            option.text = options[i];
            selectList.appendChild(option);
        }
        valueString = String(value);
        if (valueString) {
            selectList.value = valueString;
        }
    }

    if (columnName == "date" && value !== null) {
        const dateString = (new Date(value)).toISOString().split('T')[0]
 
        let inputElement = document.createElement('input');
        inputElement.type = 'date';
        inputElement.name = 'Date';
        inputElement.value = dateString;
        inputElement.min = minYear;
        inputElement.max = maxYear;

        cell.appendChild(inputElement);
    } else if (columnName == "field") {
        makeSelector(["H", "A"]);
    } else if (columnName == "outcome") {
        makeSelector(["W", "L"]);
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
document.getElementById("searchButton").addEventListener("click", async () => {
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
    addColumns();

    const data = await window.electronAPI.getData(currentWorkingTable, args);

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

            createInnerHTMLforCell(cell, key, value)

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

    bufferRow = table.insertRow(-1);
    bufferRow.setAttribute("buffer", "true");
    if (columnAssociations[currentWorkingTable].addable) {
        bufferRow.innerHTML = '<tr id="bufferRow"><td colspan="100%"><button type="button" id="addRowsButton">+ Add Rows</button></td></tr>';
        document.getElementById("addRowsButton").addEventListener("click", addMoreRows);
    }
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
            let selectElement = cell.querySelector('select');
            if (inputElement) {
                contents = inputElement.value;
            } else if (selectElement) {
                contents = selectElement.value;
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
            let selectElement = cell.querySelector('select')
            if (inputElement) {
                contents = inputElement.value;
            } else if (selectElement) {
                contents = selectElement.value;
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
    clearWindow(true)
});

/**
 * Async. prompts the user to add rows, then appends extra row fields at the bottom of the table.
 * These fields will be SQL INSERTed when the update button is pressed.
 */
let addedRowSeq = 1; // Keeps consistent row color alternation if pressed multiple times
async function addMoreRows() {
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
            createInnerHTMLforCell(newCell, columnAssociations[currentWorkingTable].columns[c], (innerHTML !== undefined) ? innerHTML : '')

            styleCell(newCell, addedRowSeq);
        }
    }

    bufferRow.innerHTML = '<tr id="bufferRow"><td colspan="100%"><button type="button" id="addRowsButton">+ Add Rows</button><button type="button" id="deleteRowsButton">Delete</button></td></tr>';
    document.getElementById("deleteRowsButton").addEventListener("click", deleteAddedRows);
    document.getElementById("addRowsButton").addEventListener("click", addMoreRows);
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
    clearWindow(true);
    showSearchableFields();
});

// Linear Functions for getting additional data on file input
// Show first step on file upload
window.electronAPI.getMoreInputs(() => {
    document.getElementById('popupField').style.display = 'block';
})

// Handle form submission on step 1
document.getElementById("fieldForm").addEventListener('submit', async (event) => {
    event.preventDefault();
    const selectedOption = document.querySelector('input[name="fieldOption"]:checked');
    if (selectedOption) {
        // TODO: Add Data to Table

        // Go to next step
        document.getElementById('popupField').style.display = 'none';
        document.getElementById('popupHalfScore').style.display = 'block';
    } else {
        window.electronAPI.showPrompt(
            "info",
            "Please select an option.",
            "",
            "Field Choice"
        );
    }
});

// Handle form submission on step 2
document.getElementById("halfScoreForm").addEventListener('submit', async (event) => {
    event.preventDefault();
    // TODO: Add Data to Table

    // Go to next step
    document.getElementById('popupHalfScore').style.display = 'none';
    //document.getElementById('popupStarted').style.display = 'block';
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
        actualName = colName.replace(/([A-Z])/g, ' $1').trim().toLowerCase();
        let display = nonSearchableFields.includes(actualName) ? "none" : "inline";
        document.getElementById(colName + "Tag").style.display = display;
        document.getElementById(colName).style.display = display;
    });
}

/**
 * Deletes all rows in the current selection aside from the header.
 */
function clearWindow(clearSearchFields) {
    let table = document.getElementById("dataTable");
    let rowCount = table.rows.length;
    for (let i = 2; i < rowCount; i++) {
        table.deleteRow(2);
    }
    while (topRow.cells.length > 1) { topRow.deleteCell(0); }
    topRow.cells[0].innerHTML = "No selection."
    unsavedInsert = false;
    if (clearSearchFields) {
        document.getElementById("firstName").value = '';
        document.getElementById("lastName").value = '';
        document.getElementById("season").value = '';
        document.getElementById("opponent").value = '';
        document.getElementById("division").value = '';
        document.getElementById("position").value = '';
    }
    calcUnsavedChanges(); // Always happens in tandem
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

    // Convert all input fields to their displayed values
    const clonedTable = tableElement.cloneNode(true);
    clonedTable.querySelectorAll("td").forEach(td => {
        const oginfoValue = td.getAttribute("oginfo");
        if (oginfoValue !== null) {
            td.textContent = oginfoValue;  // Replace inner content with oginfo value
        }
    });

    // Get HTML and send to main
    const tableHTML = clonedTable.outerHTML;
    window.electronAPI.sendExportToPDF(tableHTML);
});
