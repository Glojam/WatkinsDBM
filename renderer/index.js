// index.js
const { ipcRenderer } = window.electron;

document.getElementById('searchButton').addEventListener('click', () => {
  ipcRenderer.send('getData');
});

window.electron.onResponse((json) => console.log(json));