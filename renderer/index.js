// VERY TEMPORARY!
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