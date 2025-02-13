const minYear = "1970-01-01"
const maxYear = new Date().getFullYear() + "-12-31" // By default, max year is current year

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
  console.log(data)
  var table = document.getElementById("dataTable");
  clearWindow();
  // Get number of columns from the header row
  var numColumns = table.rows[0].cells.length;

  // Loop through all records and add rows
  var rowNum = 2
  data.recordsets[0].forEach(record => {
      var newRow = table.insertRow(-1); // Append new row at the end

      var i = 0;
      for (const [key, value] of Object.entries(record)) {
          if (i < numColumns) {
              var cell = newRow.insertCell(i);

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

document.getElementById("clearButton").addEventListener("click", async () => {
  clearWindow()
});

function clearWindow() {
  var table = document.getElementById("dataTable");
  var rowCount = table.rows.length;
  for (var i = 2; i < rowCount; i++) {
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
