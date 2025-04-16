const { FusesPlugin } = require('@electron-forge/plugin-fuses');
const { FuseV1Options, FuseVersion } = require('@electron/fuses');
const icoPath = './resources/appicon.ico';

module.exports = {
    packagerConfig: {
        asar: true,
        icon: icoPath
    },
    rebuildConfig: {},
    makers: [
        {
            // Builds project for Windows (using Squirrel framework)
            name: '@electron-forge/maker-squirrel',
            config: {
                // The ICO file to use as the icon for the generated Setup.exe
                setupIcon: icoPath
            }
        },
        {
            // Builds zip files for the project, platform-independent
            name: '@electron-forge/maker-zip',
            platforms: ['darwin'],
        },
        {
            // Builds for Debian platforms (e.g. Ubunut)
            name: '@electron-forge/maker-deb',
            config: {
                options: {
                    icon: icoPath
                }
            }
        },
        {
            // Builds for RedHat-based Linux distributions (e.g. Fedora)
            name: '@electron-forge/maker-rpm',
            config: {
                icon: icoPath,
                description: "Front end management toolkit for managing sport statistics databases.",
            },
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
