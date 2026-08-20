
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const { exec } = require('child_process');
const { download } = require('electron-dl');
const decompress = require('decompress');

const { deleteAsync } = require('del');

const store = require('./store.cjs');
const fsHelpers = require('./fsHelpers.cjs');

const squirrelStartup = require('electron-squirrel-startup');
const path = require('path');
const { error } = require('console');

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
      devTools: true
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'right' });
  } else {
    mainWindow.loadFile( 
      fsHelpers.join(__dirname, "../../dist/index.html")
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
    return new Promise((resolve, reject) => {
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
         fsHelpers.renameSync(path.join(tmpDir, "Scripts"), finalDir);

          // Delete archive & tmpDir (del module checks for current working dir, overridable but good sanity check)
          process.chdir(workDir);
          deleteAsync(archivePath);
          deleteAsync(tmpDir);
          // Notify UI "download (and post-processing) is ready"
          mainWindow.webContents.send('download-ready', finalDir);
        })
        .catch(err => {
          console.log("Renaming failed");
          console.error(err);
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

// Relay error message
ipcMain.on('process-error-from-worker', (event, args) => {
  mainWindow.webContents.send('process-error-from-worker', {...args, error: true});
});

ipcMain.on('message-from-worker-all-scenarios-complete', (event, ...args) => {
  const payload = args[0];
  mainWindow.webContents.send('all-scenarios-complete', payload)
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

// Relay message to run create VLEM project
ipcMain.on('message-from-ui-to-create-project', (event, args) => {
  createProjectWorkerWindow.webContents.send('create-project', args);
});

// Relay message emme project created
ipcMain.on('message-from-worker-creating-project-completed', (event, args) => {
  mainWindow.webContents.send('creating-project-completed', args.error);
});

// Relay a loggable event in worker; worker => main => UI
ipcMain.on('loggable-event-from-worker', (event, args) => {
  if (!args) return;

  const { time, ...rest } = args;

  mainWindow.webContents.send('loggable-event', {
    ...rest,
    time: time || new Date()
  });
});


