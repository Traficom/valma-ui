import versions from '../versions';


/**
 * Check and try to set EMME's Python location on Windows,
 * searching from common known paths.
 *
 * IMPORTANT:
 * - Logic intentionally unchanged
 * - Order of checks preserved
 */
export const searchEMMEPython = (): [boolean, string | null] => {
  // Set Windows python exe path postfix (e.g. Python311\python.exe)
  const p = getVersion(versions.emme_python);
  const pythonPathPostfix = `Python${p.major}${p.minor}\\python.exe`;
  const fsHelpers = window.fsHelpers;
  const path = (window as any).path

  // Search from environment variable "EMMEPATH"
  const envEmmePath = (window as any).env.get('EMMEPATH') ?? '';
  const envEmmePythonPath = fsHelpers.join(envEmmePath, pythonPathPostfix);

  if (envEmmePath && fsHelpers.exists(envEmmePythonPath)) {
    return [true, envEmmePythonPath];
  }

  // Not found based on EMMEPATH, try guessing common locations
  const e = getVersion(versions.emme_system);

  const commonEmmePath = `Bentley\\OpenPaths`;
  const emmeMajor = `\\EMME ${e.major}`;
  const emmeSemver = `\\Emme ${e.semver}`;

  const drives = ['C:', 'D:', 'E:', 'F:', 'G:', 'H:', 'I:', 'J:', '/'];

  const paths = [
    `\\Program Files\\${commonEmmePath}\\${emmeSemver}\\${pythonPathPostfix}`,
    `\\Program Files (x86)\\${commonEmmePath}\\${emmeSemver}\\${pythonPathPostfix}`,
    `\\${commonEmmePath}\\${emmeSemver}\\${pythonPathPostfix}`,
    `\\${commonEmmePath}${emmeMajor}\\${emmeSemver}\\${pythonPathPostfix}`,
    'usr/bin/python2', // for devs on macOS/Linux
  ];

  const allPathCombinations = drives.reduce<string[]>((acc, d) => {
    return acc.concat(paths.map(p => `${d}${p}`));
  }, []);

  const firstExisting = allPathCombinations.find(p => fsHelpers.exists(p));

  if (firstExisting) {
    return [true, firstExisting];
  }

  return [false, null];
};

/**
 * Dissect a semantic version string
 */
function getVersion(
  semver?: string
): {
  semver?: string;
  major: string;
  minor: string;
  patch: string;
} {
  const tokens = semver ? semver.split('.', 3) : [];

  return {
    semver,
    major: tokens[0] ?? '',
    minor: tokens[1] ?? '',
    patch: tokens[2] ?? '',
  };
}