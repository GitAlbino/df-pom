const { FusesPlugin } = require('@electron-forge/plugin-fuses');
const { FuseV1Options, FuseVersion } = require('@electron/fuses');

module.exports = {
  packagerConfig: {
    asar: true,
    executableName: "df-pom",
    ignore: [
      /^\/.git$/,
      /^\/.github$/,
      /^\/out$/,
      /^\/testsExports$/,
      /^\/\.gitignore$/,
      /^\/README\.md$/,
      /^\/forge\.config\.js$/,
    ],
    extraResource: [
      "lua"
    ],
    icon: 'df-pom-icon'
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        exeName: "DF-Pom",
        setupIcon: "df-pom-icon.ico",
      },
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin', 'linux'],
    },
    {
      name: '@electron-forge/maker-deb',
      config: {
        options: {
          bin: "df-pom",
          icon: "df-pom-icon.png",
        }
      },
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {
        options: {
          bin: "df-pom",
        }
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
  hooks: {
    postMake: async (config, makeResults) => {
      const path = require('path');
      const fs = require('fs');

      for (const result of makeResults) {
        for (let i = 0; i < result.artifacts.length; i++) {
          const artifact = result.artifacts[i];
          if (artifact.endsWith('.zip')) {
            const dir = path.dirname(artifact);
            const newName = `DF-Pom_${result.platform}_${result.arch}.zip`;
            const newPath = path.join(dir, newName);

            fs.renameSync(artifact, newPath);
            console.log(`Renamed: ${artifact} → ${newPath}`);

            result.artifacts[i] = newPath;
          }
        }
      }
      return makeResults;
    }
  }
};
