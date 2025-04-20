const { FusesPlugin } = require('@electron-forge/plugin-fuses');
const { FuseV1Options, FuseVersion } = require('@electron/fuses');
const path = require('path');
const icoPath = path.join(__dirname, './resources/appicon.ico');

module.exports = {
    packagerConfig: {
        asar: true,
        icon: icoPath,
        "ignore": [
            "/passwords.json"
        ]
    },
    rebuildConfig: {},
    makers: [
        {
            // Builds Windows installewr
            name: "@electron-forge/maker-wix",
            config: {
                language: 1033,
                manufacturer: 'Watkins Memorial High School',
                description: 'Frontend database management suite for a tailored sports database.',
                exe: 'Watkins Database Manager',
                icon: icoPath,
                name: 'Watkins Database Manager',
                shortName: 'WatkinsDBM',
                version: require('./package.json').version,
                ui: {
                    chooseDirectory: true,
                    images: {
                        background: path.join(__dirname, './resources/installer_background.bmp'),
                        banner: path.join(__dirname, './resources/installer_banner.bmp'),
                    }
                }
            }
        },
        {
            // Builds MacOS installer
            name: '@electron-forge/maker-dmg',
            config: {
                name: 'Watkins Database Manager',
                background: path.join(__dirname, './resources/background.png'),
                icon: path.join(__dirname, './resources/icon.png'),
                overwrite: true,
            }
        },
        {
            // Builds zip files for the project, platform-independent
            name: '@electron-forge/maker-zip',
            platforms: ['darwin'],
        },
        {
            // Builds for Debian platforms (e.g. Ubuntu)
            name: '@electron-forge/maker-deb',
            config: {
                options: {
                    icon: icoPath
                }
            }
        },
    ],
    plugins: [
        {
            name: '@electron-forge/plugin-auto-unpack-natives',
            config: {},
        },
        // Fuses are used to enable/disable various Electron functionality
        // at package time, before code signing the application
        new FusesPlugin({
            version: FuseVersion.V1,
            [FuseV1Options.RunAsNode]: false,
            [FuseV1Options.EnableCookieEncryption]: true,
            [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
            [FuseV1Options.EnableNodeCliInspectArguments]: false,
            [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
            [FuseV1Options.OnlyLoadAppFromAsar]: true,
        }),
    ],
};
