
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const { exec } = require('child_process');
const { download } = require('electron-dl');
const { deleteAsync: del } = require('del');
const decompress = require('decompress');

const store = require('./store.cjs');
const fsHelpers = require('./fsHelpers.cjs');

const squirrelStartup = require('electron-squirrel-startup');
const path = require('path');

// Handle squirrel startup
if (squirrelStartup) {
  app.quit();
}


let mainWindow;
let entrypointWorkerWindow;
let cbaWorkerWindow;
let createEmmeBankWorkerWindow;
let createProjectWorkerWindow;

const isDev = !app.isPackaged;

// ─────────────────────────────────────────────
// Window creation
// ─────────────────────────────────────────────
function createUI() {
  mainWindow = new BrowserWindow({
    width: 1320,
    height: 1200,
    resizable: true,
    maximizable: true,
    fullscreen: false,
    autoHideMenuBar: true,
    webPreferences: {
      zoomFactor: 1,
      preload: fsHelpers.join(__dirname, '../preload/index.cjs'),
      contextIsolation: true,
      sandbox: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'right' });
  } else {
    mainWindow.loadFile(
      fsHelpers.join(__dirname, '../../dist/renderer/index.html')
    );
  }

  mainWindow.on('closed', () => app.quit());
}

// ─────────────────────────────────────────────
// Workers
// ─────────────────────────────────────────────
async function createWorker(file) {
  const win = new BrowserWindow({
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });
  await win.loadFile(file);
  return win;
}

// ─────────────────────────────────────────────
// App lifecycle
// ─────────────────────────────────────────────
app.whenReady().then(async () => {
  createUI();
  entrypointWorkerWindow = await createWorker(
    'src/background/lem_entrypoint_worker.html'
  );
  cbaWorkerWindow = await createWorker(
    'src/background/cba_script_worker.html'
  );
  createEmmeBankWorkerWindow = await createWorker(
    'src/background/create_emme_bank_worker.html'
  );
  createProjectWorkerWindow = await createWorker(
    'src/background/create_project_worker.html'
  );
});

// ─────────────────────────────────────────────
// IPC HANDLERS
// ─────────────────────────────────────────────

ipcMain.handle('dialog:showOpenDialog', (_e, options) =>
  dialog.showOpenDialog(options)
);

ipcMain.handle('dialog:showSaveDialog', (_e, options) =>
  dialog.showSaveDialog(options)
);


ipcMain.handle('project:list-scenarios', async (_e, folder) => {
  if (!folder || typeof folder !== 'string' || !fsHelpers.existsSync(folder)) {
    return [];
  }

  const scenarios = [];
  for (const file of fsHelpers.readdirSync(folder)) {
    if (!file.endsWith('.json')) continue;
    scenarios.push(
      JSON.parse(fsHelpers.readFileSync(fsHelpers.join(folder, file), 'utf8'))
    );
  }
  return scenarios;
});

ipcMain.handle('open-file-dialog', async (_event, options) => {
  return dialog.showOpenDialog(options);
});


ipcMain.handle(
  'pip-install',
  async (_event, pipPath, requirementsPath) => {
    return new Promise<{ stdout, stderr }>((resolve, reject) => {
      exec(
        `"${pipPath}" install --user -r "${requirementsPath}"`,
        (error, stdout, stderr) => {
          if (error) {
            reject(error.message);
          } else {
            resolve({ stdout, stderr });
          }
        }
      );
    });
  }
);

// Store APIs
ipcMain.handle('store:get', (_e, { key }) => store.get(key));
ipcMain.handle('store:set', (_e, { key, value }) => store.set(key, value));
ipcMain.handle('store:delete', (_e, { key }) => store.delete(key));

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

// Relay messages
ipcMain.on('message-from-ui-to-run-scenarios', (_e, args) =>
  entrypointWorkerWindow.webContents.send('run-scenarios', args)
);

ipcMain.on('message-from-ui-to-run-cba-script', (_e, args) =>
  cbaWorkerWindow.webContents.send('run-cba-script', args)
);

ipcMain.on('message-from-ui-to-cancel-scenarios', (event, args) => {
  entrypointWorkerWindow.webContents.send('cancel-scenarios');
});

// Relay message of scenarios complete when switching to next; worker => main => UI

ipcMain.on('message-from-worker-scenario-complete', (event, ...args) => {
  const payload = args[0];
  mainWindow.webContents.send('scenario-complete', payload);
});

ipcMain.on('message-from-ui-to-create-project', (_e, args) =>
  createProjectWorkerWindow.webContents.send('create-project', args)
);

ipcMain.on('message-from-worker-all-scenarios-complete', (event, ...args) => {
  const payload = args[0];
  mainWindow.webContents.send('all-scenarios-complete', payload)
});

ipcMain.on('loggable-ui-event-from-worker', (event, args) => {
  mainWindow.webContents.send('loggable-event', args);
});

// Relay a loggable UI-event in worker; worker => main => UI
ipcMain.on('loggable-ui-event-from-worker', (event, args) => {
  mainWindow.webContents.send('loggable-event', args);
});

// Relay message to run create emme bank
ipcMain.on('message-from-ui-to-create-emme-bank', (_e, args) =>
  createEmmeBankWorkerWindow.webContents.send('create-emme-bank', args)
);

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

