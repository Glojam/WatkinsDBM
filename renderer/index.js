const minYear = "1970-01-01";
const maxYear = new Date().getFullYear() + "-12-31"; // By default, max year is current year

let unsavedChanges = false; // Useful so we don't need to parse DOM for checking changes
let currentWorkingTable = "Players"; // To keep track of the current working table (CWT)
let columnAssociations = null; // JSON column+key associations for all tables, sent over on init

window.electronAPI.onGetColumns((data) => {
  console.log("hello");
  columnAssociations = data;
  console.log(data);
})

document.getElementById("searchButton").addEventListener("click", async () => {
  // Look through the search fields, and compile the strings into a filtering list
  // For convenience it is assumed empty string = "any"
  let args = {};
  args["first name"] = document.getElementById("firstName").value;
  args["last name"] = document.getElementById("lastName").value;
  args["year"] = document.getElementById("teamYear").value;
  args["opponent"] = document.getElementById("opponent").value;
  args["division"] = document.getElementById("division").value;
  args["position"] = document.getElementById("position").value;

  const data = await window.electronAPI.getData(args);

  let table = document.getElementById("dataTable");
  clearWindow();
  // Get number of columns from the header row
  let numColumns = table.rows[0].cells.length;

  // Loop through all records and add rows
  let rowNum = 2
  data.recordsets[0].forEach(record => {
    let newRow = table.insertRow(-1); // Append new row at the end

    let i = 0;
      for (const [key, value] of Object.entries(record)) {
          if (i < numColumns) {
            let cell = newRow.insertCell(i);

              // Check if special formatting is needed
              if (key == "date" && value !== null) {
                const date = new Date(value);
                const dateString = date.getFullYear() + "-" + (date.getMonth()+1) + "-" + date.getDate();

                const inputElement = document.createElement('input');
                inputElement.type = 'date';
                inputElement.name = 'Date';
                inputElement.value = dateString;
                inputElement.min = minYear;
                inputElement.max = maxYear;
                
                cell.appendChild(inputElement);
                //cell.innerHTML = <input type="date" name="Date" value={dateString} min={minYear} max={maxYear}/>;
              } else {
                cell.contentEditable = true;
                cell.innerHTML = value !== null ? value : ""; // Ensure no null values
              }

              cell.addEventListener("input", () => {
                unsavedChanges = true;
                cell.parentNode.setAttribute("changed", "true");  
              })

              var inputElement = cell.querySelector('input');
              if (inputElement) {
                cell.setAttribute("ogInfo", inputElement.value);
              } else {
                cell.setAttribute("ogInfo", cell.innerHTML);
              }   

              cell.style.borderTopStyle = "dotted";
              cell.style.borderBottomStyle = "dotted";
              cell.className = (rowNum % 2 == 0) ? "tabElement tabElementAlt" : "tabElement";
          }
          i++;
      }

      // Fill any remaining columns with empty cells
      while (i < numColumns) {
          newRow.insertCell(i).innerHTML = "";
          i++;
      }
      rowNum++;
  });
});

document.getElementById("updateButton").addEventListener("click", async () => {
  let modifiedRows = [];
  let table = document.getElementById("dataTable");
  
  for (let i = 0; i < table.rows.length; i++) {
    let row = table.rows[i];
    if (row.getAttribute("changed") === "true") {
      let updatedRow = [];
      let oldRow = [];
      for (let j = 0; j < row.cells.length; j++) {
        let cell = row.cells[j];
        // Check if the cell contains an input element
        var inputElement = cell.querySelector('input');
        if (inputElement) {
          updatedRow.push(inputElement.value);
        } else {
          updatedRow.push(cell.innerHTML);
        }
        oldRow.push(cell.getAttribute("ogInfo"));  
      }
      modifiedRows.push([updatedRow, oldRow]);
    }
  }

  if (modifiedRows.length == 0) { 
    alert("No changes to push.");
    return;
  }
  console.log(modifiedRows)
  //const success = await window.electronAPI.updateData(modifiedRows);
  //alert(success)
});

document.getElementById("clearButton").addEventListener("click", async () => {
  clearWindow()
  unsavedChanges = false;
});

function clearWindow() {
  let table = document.getElementById("dataTable");
  let rowCount = table.rows.length;
  for (let i = 2; i < rowCount; i++) {
    table.deleteRow(2);
  }
}

// Help window popup listener, called externally from main menu
// TODO better formated popup, possibly using a custom notification
window.electronAPI.onShowHelp(() => {
  alert( 
    "Search Fields:  Used to search for specific lines of data that have the matching criteria specified or can be left blank to display all last names\n" + 
    "i.e. Only the search fields that you have specified values within will be search upon & highlighted\n" +
    "ex. Inputing \"John\" in the First Name search field and selecting the year range \"2023-2024\" will show all data records having the first name of John in the 2023-2024 season.\n" +
    "—————————————————————————————————————————————————————————————————————————————————————————————————\n" +
    "Search Button:  Displays database entries into table based on inputs\n" +
    "—————————————————————————————————————————————————————————————————————————————————————————————————\n" +
    "Help Button:  Displays this popup with descriptions of the app's interface\n" +
    "—————————————————————————————————————————————————————————————————————————————————————————————————\n" +
    "Switch Table:  Displays a popup where you can choose a different table to display. Options are:\n" +
    "• Players  (stats about offensive & defensive players in a single game)\n" +
    "• Goalkeepers  (stats about goalkeepers in a single game)\n" +
    "• Players Total  (totals stats for offensive & defensive players in a season)\n" +
    "• Goalkeepers  Total (totals stats for goalkeepers in a season)\n" +
    "• Team Record  (general details regarding each game played [score, outcome, etc.])\n" +
    "—————————————————————————————————————————————————————————————————————————————————————————————————\n" +
    "Upload File:  Used to select a MaxPreps-generated file whose data values will be added into the database."
  );
})
