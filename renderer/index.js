const minYear = "1970-01-01";
const maxYear = new Date().getFullYear() + "-12-31"; // By default, max year is current year

let unsavedChanges = false; // Useful so we don't need to parse DOM for checking changes
let currentWorkingTable = "players"; // To keep track of the current working table (CWT)
let columnAssociations = null; // JSON column+key associations for all tables, sent over on init

window.electronAPI.onGetColumns((data) => {
  columnAssociations = data;
  addColumns()
})

function addColumns() {
  let numCols = columnAssociations[currentWorkingTable].columns.length;
  let topRow = document.getElementById("topRow");
  while (topRow.cells.length > 0) { topRow.deleteCell(0); }
  for (let c = 0; c < numCols; c++) {
    let newCol = topRow.insertCell(-1); // Append to back
    newCol.innerHTML = columnAssociations[currentWorkingTable].display_names[c];
    newCol.className = "tabElement tabElementBolded";
  }
}

function showLoader() {
  document.getElementById("loader").style.display = "block";
}

function hideLoader() {
  document.getElementById("loader").style.display = "none";
}

document.getElementById("searchButton").addEventListener("click", async () => {
  let numUnsavedChanged = calcUnsavedChanges()
  if (unsavedChanges) {
    let success = await window.electronAPI.showPrompt(
      "confirmation", 
      `You have ${numUnsavedChanged} unsaved change${numUnsavedChanged == 1 ? "" : "s"} that will be cleared. Continue?`,
      "This action cannot be undone."
    );    
    if (!success) { return; }
  }
  showLoader();
  try {
    let args = {};
    args["first name"] = document.getElementById("firstName").value;
    args["last name"] = document.getElementById("lastName").value;
    args["year"] = document.getElementById("teamYear").value;
    args["opponent"] = document.getElementById("opponent").value;
    args["division"] = document.getElementById("division").value;
    args["position"] = document.getElementById("position").value;
    clearWindow();
    addColumns();
    const data = await window.electronAPI.getData(args);
    let me = 0/0;
    let table = document.getElementById("dataTable");

    let numColumns = columnAssociations[currentWorkingTable].columns.length;
    let rowNum = 2
    data.recordsets[0].forEach(record => {
      let newRow = table.insertRow(-1); 
      let i = 0;
      for (const [key, value] of Object.entries(record)) {
        if (i > numColumns) { continue; }
        let cell = newRow.insertCell(i);

        if (key == "date" && value !== null) {
          const date = new Date(value);
          const dateString = date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate();

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

        cell.style.borderTopStyle = "dotted";
        cell.style.borderBottomStyle = "dotted";
        cell.className = (rowNum % 2 == 0) ? "tabElement tabElementAlt" : "tabElement";
        i++;
      }
      
      while (i < numColumns) {
        newRow.insertCell(i).innerHTML = "";
        i++;
      }
      rowNum++;
    });
  } catch (error) {
    alert("An error occured while fetching: \n" + error);
  } finally {
    hideLoader();
  }
});

document.getElementById("updateButton").addEventListener("click", async () => {
  if (!unsavedChanges) {
    alert("No unsaved changes to publish.");
    return;
  }

  let modifiedRows = [];
  let table = document.getElementById("dataTable");

  for (let i = 1; i < table.rows.length; i++) {
    let row = table.rows[i];
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
      modifiedRows.push({updated: updatedRow, old: oldRow});
    }
  }

  if (modifiedRows.length == 0) {
    alert("No changes to push.");
    return;
  }

  console.log(modifiedRows);
  let success = await window.electronAPI.update(currentWorkingTable, modifiedRows);
  alert(success)
});

document.getElementById("clearButton").addEventListener("click", async () => {
  let numUnsavedChanged = calcUnsavedChanges()
  if (unsavedChanges) {
    let success = await window.electronAPI.showPrompt(
      "confirmation", 
      `You have ${numUnsavedChanged} unsaved change${numUnsavedChanged == 1 ? "" : "s"} that will be cleared. Continue?`,
      "This action cannot be undone."
    );
    if (!success) { return; }
  }
  clearWindow()
});

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
  changeMeter.innerHTML = numChanges + " unsaved change" + (numChanges == 1 ? "." : "s.");
  return numChanges;
}

function clearWindow() {
  let table = document.getElementById("dataTable");
  let rowCount = table.rows.length;
  for (let i = 2; i < rowCount; i++) {
    table.deleteRow(2);
  }
  while (topRow.cells.length > 1) { topRow.deleteCell(0); }
  topRow.cells[0].innerHTML = "No selection."
  calcUnsavedChanges() // Always happens in tandem
}

// Help window popup listener, called externally from main menu
// TODO better formated popup, possibly using a custom notification
window.electronAPI.onShowHelp(() => {
  alert(
    "Search Fields:  Used to search for specific lines of data that have the matching criteria specified or can be left blank to display all\n" +
    "i.e., each search field filters the output by what you enter.\n" +    
    "————————————————————————————————————————————\n" +
    "Search:  Makes a new selection based on search field criteria.\n" +
    "————————————————————————————————————————————\n" +
    "Clear:  Removes all rows from the selection, but does not affect the database.\n" +
    "————————————————————————————————————————————\n" +
    "Switch Table:  Displays a popup where you can choose a different table to display. Options are:\n" +
    "• Players  (stats about offensive & defensive players in a single game)\n" +
    "• Goalkeepers  (stats about goalkeepers in a single game)\n" +
    "• Players Total  (totals stats for offensive & defensive players in a season)\n" +
    "• Goalkeepers  Total (totals stats for goalkeepers in a season)\n" +
    "• Team Record  (general details regarding each game played [score, outcome, etc.])\n" +
    "————————————————————————————————————————————\n" +
    "Publish Changes:  Compiles all changes made to the current selection and updates those rows in the database.\n" +
    "————————————————————————————————————————————\n" +
    "File Options (Top-left menu):\n" + 
    "• Import Files  (used to select |-delimited CSV file(s) whose data values will be added into the database)\n" +
    "• Export Selection  (takes the current selection and exports as a |-delimited CSV file)\n"
  );
})
