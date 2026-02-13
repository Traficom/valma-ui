const {app, BrowserWindow, ipcMain} = require('electron');
const {download} = require('electron-dl');
const path = require('path');
const fs = require('fs');
const del = require('del');
const decompress = require('decompress');
const Store = require('electron-store');

// Handle breaking changes in electron-store-v7.0.0:
// https://github.com/sindresorhus/electron-store/releases/tag/v7.0.0
Store.initRenderer();

// @electron/remote/main must be initialized in the main process before it can be used from the renderer:
require('@electron/remote/main').initialize();

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {app.quit();}

// Keep a global reference of certain objects, so they won't be garbage collected. (This is Electron-app best practise)
let mainWindow, entrypointWorkerWindow, cbaWorkerWindow, createEmmeBankWorkerWindow, createProjectWorkerWindow;

async function createUI() {
  // Render main window including UI (index.html linking to all UI components)
  mainWindow = new BrowserWindow({
    width: 1320,
    height: 1200,
    resizable: true,
    maximizable: true,
    fullscreen: true,
    fullscreenable: false,
    autoHideMenuBar: true,
    webPreferences: {
      devTools: true, // There's no reason to disable these (CTRL+SHIFT+i) https://superuser.com/questions/367662/ctrlshifti-in-windows-7
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
    }
  });
  // Uncomment when you want devTools in browser window
  // mainWindow.webContents.openDevTools()
  await mainWindow.loadFile('src/renderer/index.html');
  // Starting from electron v14
  require("@electron/remote/main").enable(mainWindow.webContents);

  // Quit when main window is closed
  mainWindow.on('closed', () => {
    app.quit();
  });
  // Uncomment when you want to see where your main setting are saved
  // console.log('Settings directory '+ app.getPath('userData'));
}

async function createEntrypointWorker() {
  // Create hidden window for background process #1 (Electron best practise, alternative is web workers with limited API)
  entrypointWorkerWindow = new BrowserWindow({webPreferences: {nodeIntegration: true, contextIsolation: false, enableRemoteModule: true}, show: false});
  await entrypointWorkerWindow.loadFile('src/background/lem_entrypoint_worker.html');
}

async function createCbaScriptWorker() {
  // Create hidden window for background process #2 (Electron best practise, alternative is web workers with limited API)
  cbaWorkerWindow = new BrowserWindow({webPreferences: {nodeIntegration: true, contextIsolation: false, enableRemoteModule: true}, show: false});
  await cbaWorkerWindow.loadFile('src/background/cba_script_worker.html');
}

async function createEmmeBankWorker() {
  // Create hidden window for background process #3 (Electron best practise, alternative is web workers with limited API)
  createEmmeBankWorkerWindow = new BrowserWindow({webPreferences: {nodeIntegration: true, contextIsolation: false, enableRemoteModule: true}, show: false});
  await createEmmeBankWorkerWindow.loadFile('src/background/create_emme_bank_worker.html');
}

async function createProjectWorker() {
  // Create hidden window for background process #3 (Electron best practise, alternative is web workers with limited API)
  createProjectWorkerWindow = new BrowserWindow({webPreferences: {nodeIntegration: true, contextIsolation: false, enableRemoteModule: true}, show: false});
  await createProjectWorkerWindow.loadFile('src/background/create_project_worker.html');
}


// When Electron has initialized, and is ready to create windows. Some APIs can only be used from here on.
app.on('ready', async () => {
  await createUI();
  await createEntrypointWorker();
  await createCbaScriptWorker();
  await createEmmeBankWorker();
  await createProjectWorker();
});

ipcMain.on('message-from-ui-to-download-model-scripts', (event, args) => {
  const workDir = args.destinationDir;
  const tmpDir = path.join(workDir, "lem-model-system-tmp-workdir");
  const finalDir = path.join(workDir, `lem-model-system-${args.version}-${args.postfix}`);

  // Download model system repo (passed in args.url - may vary in future depending on tag/version)
  download(
    BrowserWindow.getFocusedWindow(),
    `https://github.com/Traficom/valma-model-system/archive/${args.version}.zip`,
    {
      directory: workDir
    }
  )
    .then((downloadItem) => {
      const archivePath = downloadItem.getSavePath();

      // Decompress downloaded archive to tmpDir
      decompress(archivePath, tmpDir, {strip: 1})
        .then(() => {
          // Single-out "/Scripts" folder and move it to destination
          fs.renameSync(path.join(tmpDir, "Scripts"), finalDir);

          // Delete archive & tmpDir (del module checks for current working dir, overridable but good sanity check)
          process.chdir(workDir);
          del.sync(archivePath);
          del.sync(tmpDir);
          // Notify UI "download (and post-processing) is ready"
          mainWindow.webContents.send('download-ready', finalDir);
        });
    });
});

// Relay message to run all scenarios; UI => main => worker
ipcMain.on('message-from-ui-to-run-scenarios', (event, args) => {
  entrypointWorkerWindow.webContents.send('run-scenarios', args);
});

// Relay message to run Cost-Benefit Analysis script; UI => main => worker
ipcMain.on('message-from-ui-to-run-cba-script', (event, args) => {
  cbaWorkerWindow.webContents.send('run-cba-script', args);
});

// Relay message (interruption) to terminate current scenario and cancel any queued scenarios; UI => main => worker
ipcMain.on('message-from-ui-to-cancel-scenarios', (event, args) => {
  entrypointWorkerWindow.webContents.send('cancel-scenarios');
});

// Relay message of scenarios complete when switching to next; worker => main => UI
ipcMain.on('message-from-worker-scenario-complete', (event, args) => {
  mainWindow.webContents.send('scenario-complete', args);
});

// Relay message of all scenarios complete; worker => main => UI
ipcMain.on('message-from-worker-all-scenarios-complete', (event, args) => {
  mainWindow.webContents.send('all-scenarios-complete', args);
});

// Relay a loggable UI-event in worker; worker => main => UI
ipcMain.on('loggable-ui-event-from-worker', (event, args) => {
  mainWindow.webContents.send('loggable-event', args);
});

// Relay message to run create emme bank
ipcMain.on('message-from-ui-to-create-emme-bank', (event, args) => {
  createEmmeBankWorkerWindow.webContents.send('create-emme-bank', args);
});

// Relay message emme bank created
ipcMain.on('message-from-worker-creating-emme-bank-completed', (event, args) => {
  mainWindow.webContents.send('creating-emme-bank-completed', args.error);
});

// Relay message to run create emme project
ipcMain.on('message-from-ui-to-create-project', (event, args) => {
  createProjectWorkerWindow.webContents.send('create-project', args);
});

// Relay message emme project created
ipcMain.on('message-from-worker-creating-project-completed', (event, args) => {
  mainWindow.webContents.send('creating-project-completed', args.error);
});


// Relay a loggable event in worker; worker => main => UI
ipcMain.on('loggable-event-from-worker', (event, args) => {
  event_time = args["time"];
  delete(args["time"]);
  // python-shell 3.0.0 breaking change: Every character from
  // stderr is its own value (like {0: 'h', 1: 'e', 2: 'l', 3: 'l', 4: 'o'})
  // so let us join all values into one string ('hello').
  event_string = Object.values(args).join('');
  // Try to read the string as JSON. If it fails, use the whole string
  // as a message. Messages via utils.log are written to stderr as JSON.
  // Warnings from numpy tend to be written as plain-text. 
  try {
    // utils.log
    event_args = JSON.parse(event_string);
  } catch (error) {
    // numpy warnings and other non-log messages
    event_args = {
      "level": "EXCEPTION",
      "message": event_string,
    };
  }
  event_args["time"] = event_time;
  mainWindow.webContents.send('loggable-event', event_args);
});

// // Log worker-errors (by PythonShell, not stderr) in main console
// ipcMain.on('process-error-from-worker', (event, args) => {
//   mainWindow.webContents.send('loggable-event', {
//     "level": "ERROR",
//     "message": (typeof args === "string") ? args : JSON.stringify(args)
//   });
// });
