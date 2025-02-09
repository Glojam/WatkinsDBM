// VERY TEMPORARY
//listener and actions for search button
document.getElementById('searchButton').addEventListener('click', async () => {
  const data = await window.electronAPI.getData();
  console.log(data);
  var table = document.getElementById('dataTable');
  var i = 0;
  console.log(data);
  for (const [key, value] of Object.entries(data.recordsets[0][0])) {
    // console.log(`${key}: ${value}`);
    table.rows[1].cells[i].innerHTML = value;
    i++;
  }
});
// listener and action for button to upload files to database
document.getElementById('update').addEventListener('click', async () => {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "text/plain";
  input.style.display = "none";
  input.addEventListener("change", function () {
      if (input.files.length > 0) {
          alert("Selected file: " + input.files[0].name);
          console.log(input.files[0].path)
          handleUpload(input.files[0].path)
      }
  });
  document.body.appendChild(input);
  input.click();
  document.body.removeChild(input);
  console.log(input);
});
async function handleUpload(input) {
  const filePath = input; // Replace with actual file input
  const response = await window.electronAPI.upload(filePath);
  console.log(response);
}