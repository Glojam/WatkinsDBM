const { app, Menu, ipcRenderer, nativeImage } = require('electron');
const path = require('path');
const openAboutWindow = require('about-window').default;
const isMac = process.platform === 'darwin';

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
                        let success = await upload();
                        if (!success) { return; }
                        window.webContents.send('get-inputs');
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
                    ])
            ]
        },
        // { role: 'viewMenu' }
        {
            label: 'View',
            submenu: [
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
                { 
                    label: 'About',
                    click: () => openAboutWindow({
                        icon_path: path.join(__dirname, 'resources', 'icon-small.png'),                      
                        product_name: "Watkins Database Manager",
                        copyright: 'Copyright (c) 2025 Watkins Memorial High School',
                        description: "Remote database interface app tailored for Watkins Memorial High School.\n\nRepo: https://github.com/Glojam/WatkinsDBM",
                        adjust_window_size: true,
                        show_close_button: "OK",
                    }),
                }
            ]

        }
    ]);
}