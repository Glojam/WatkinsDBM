const { app, Menu, ipcRenderer, nativeImage } = require('electron');
const isMac = process.platform === 'darwin'

exports.buildMenu = (window, upload, saveThemeData) => {
    return Menu.buildFromTemplate([
        // { role: 'appMenu' }
        ...(isMac
            ? [{
                label: app.name,
                submenu: [
                    { role: 'about' },
                    { type: 'separator' },
                    { role: 'services' },
                    { type: 'separator' },
                    { role: 'hide' },
                    { role: 'hideOthers' },
                    { role: 'unhide' },
                    { type: 'separator' },
                    { role: 'quit' }
                ]
            }]
            : []),
        // { role: 'fileMenu' }
        {
            label: 'File',
            submenu: [
                {
                    role: 'Import Files',
                    label: 'Import Files',
                    id: "import-option",
                    click: async () => {
                        try {
                            await upload();
                            window.webContents.send('get-inputs');
                        } catch (error) {
                            console.log("Import canceled");
                        }
                    },
                },
                {
                    role: 'Export Selection',
                    label: 'Export Selection',
                    submenu: [
                        {
                            role: 'as pdf',
                            label: 'As PDF',
                            click: () => { window.webContents.send('export-to-pdf'); }
                        },
                        {
                            role: 'as csv',
                            label: 'As CSV',
                            click: () => { window.webContents.send('export-to-csv'); }
                        }
                    ]
                },
                { type: 'separator' },
                isMac ? { role: 'close' } : { role: 'quit' }
            ],

        },
        // { role: 'editMenu' }
        {
            label: 'Edit',
            submenu: [
                { role: 'undo' },
                { role: 'redo' },
                { type: 'separator' },
                { role: 'cut' },
                { role: 'copy' },
                { role: 'paste' },
                ...(isMac
                    ? [
                        { role: 'pasteAndMatchStyle' },
                        { role: 'delete' },
                        { role: 'selectAll' },
                        { type: 'separator' },
                        {
                            label: 'Speech',
                            submenu: [
                                { role: 'startSpeaking' },
                                { role: 'stopSpeaking' }
                            ]
                        }
                    ]
                    : [
                        { role: 'delete' },
                        { type: 'separator' },
                        { role: 'selectAll' }
                    ])
            ]
        },
        // { role: 'viewMenu' }
        {
            label: 'View',
            submenu: [
                { role: 'minimize' },
                ...(isMac
                    ? [
                        { type: 'separator' },
                        { role: 'front' },
                        { type: 'separator' },
                        { role: 'window' }
                    ]
                    : [
                        //{ role: 'close' }
                    ]),
                { type: 'separator' },
                { role: 'resetZoom' },
                { role: 'zoomIn' },
                { role: 'zoomOut' },
                { type: 'separator' },
                {
                    label: 'Themes',
                    submenu: [
                        {
                            label: 'Light',
                            type: 'radio',
                            id: 'radio-light',
                            click: () => {
                                window.webContents.send('change-theme', 'light');
                                saveThemeData('light');
                            }
                        },
                        {
                            label: 'Dark',
                            type: 'radio',
                            id: 'radio-dark',
                            click: () => {
                                window.webContents.send('change-theme', 'dark');
                                saveThemeData('dark');
                            }
                        },
                    ]
                },
                { type: 'separator' },
                { role: 'togglefullscreen' }
            ]
        },
        {
            label: 'Help',
            submenu: [
                {
                    label: 'Getting Started',
                    click: () => window.webContents.send('show-help'),
                },
                { type: 'separator' },
                { role: 'About' } // TODO contain basic information on app, watkins, usage, and credits (libraries, etc)
            ]

        }
    ]);
}