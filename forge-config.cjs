const { utils: { fromBuildIdentifier } } = require('@electron-forge/core');
const packageJson = require('./package.json');

/**
 * Electron Forge config.
 *
 * https://www.electronforge.io/config/makers/squirrel.windows
 * https://www.electronforge.io/config/makers/zip
 * https://www.electronforge.io/config/publishers/github
 */
module.exports = {
    // Previously, buildIdentidier was either 'prod' or 'beta'. Now, it is always 'prod'.
    buildIdentifier: 'prod',
    packagerConfig: {
        appBundleId: fromBuildIdentifier({ prod: 'fi.traficom.valma.ui', beta: 'fi.traficom.beta.valma.ui' }),
        icon: "./appicons/icons/win/favicon.ico"
    },
    makers: [
        {
            name: "@electron-forge/maker-squirrel",
            config: {
                name: "lem",
                authors: "Traficom, Helsingin Seudun Liikenne -kuntayhtyma",
            }
        },
        {
            name: "@electron-forge/maker-zip",
        },
        {
            name: "@electron-forge/maker-deb",
            config: {}
        },
    ],
    publishers: [
        {
            name: '@electron-forge/publisher-github',
            config: {
                repository: {
                    owner: 'Traficom',
                    name: 'valma-ui'
                },
                draft: true,
                prerelease: false,
                authToken: process.env.GITHUB_TOKEN,
                tagName: packageJson.version,
            }
        }
    ],
    hooks: {
        afterAllArtifactBuild: async (forgeConfig) => {
          console.log(`Testing afterAllArtifactBuild hook: ${process.platform}`);
        },
        postPackage: async (forgeConfig, options) => {
            console.info('Testing postPackage, Packages built at:', options.outputPaths);
        }
      }
}
