
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

// Relay messages
ipcMain.on('message-from-ui-to-run-scenarios', (_e, args) =>
  entrypointWorkerWindow.webContents.send('run-scenarios', args)
);

ipcMain.on('message-from-ui-to-run-cba-script', (_e, args) =>
  cbaWorkerWindow.webContents.send('run-cba-script', args)
);

ipcMain.on('message-from-ui-to-create-emme-bank', (_e, args) =>
  createEmmeBankWorkerWindow.webContents.send('create-emme-bank', args)
);

ipcMain.on('message-from-ui-to-create-project', (_e, args) =>
  createProjectWorkerWindow.webContents.send('create-project', args)
);

// Worker → UI relays
ipcMain.on('message-from-worker-scenario-complete', (_e, args) =>
  mainWindow.webContents.send('scenario-complete', args)
);

ipcMain.on('message-from-worker-all-scenarios-complete', () =>
  mainWindow.webContents.send('all-scenarios-complete')
);

ipcMain.on('loggable-event-from-worker', (_e, args) =>
  mainWindow.webContents.send('loggable-event', args)
);