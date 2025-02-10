// VERY TEMPORARY
//listener and actions for search button
document.getElementById('searchButton').addEventListener('click', async () => {
  const data = await window.electronAPI.getData();
  console.log(data);

  var table = document.getElementById('dataTable');

  // Remove all previous data rows, but keep the headers
  while (table.rows.length > 2) {
      table.deleteRow(2);
  }

  // Get number of columns from the header row
  var numColumns = table.rows[1].cells.length;

  // Loop through all records and add rows
  data.recordsets[0].forEach(record => {
      var newRow = table.insertRow(-1); // Append new row at the end

      var i = 0;
      for (const [key, value] of Object.entries(record)) {
          if (i < numColumns) {
              var cell = newRow.insertCell(i);
              cell.innerHTML = value !== null ? value : ''; // Ensure no null values
              cell.className ="tabElement"
          }
          i++;
      }

      // Fill any remaining columns with empty cells
      while (i < numColumns) {
          newRow.insertCell(i).innerHTML = '';
          i++;
      }
  });
});
// listener and action for button to upload files to database
document.getElementById('update').addEventListener('click', async () => {
  handleUpload()
});
async function handleUpload() {
  //const filePath = input; // Replace with actual file input
  const response = await window.electronAPI.upload();
  console.log(response);
}
