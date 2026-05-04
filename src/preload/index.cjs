
const { contextBridge, ipcRenderer, shell } = require('electron');

const os = require('os');
const fs = require('fs');
const path = require('path');

const fsHelpers = require('../main/fsHelpers.cjs');
const { brotliDecompress } = require('zlib');

contextBridge.exposeInMainWorld('system', {
  homedir: () => os.homedir(),
});

contextBridge.exposeInMainWorld('store', {
  get: (key) => ipcRenderer.invoke('store:get', key),
  set: (key, value) => ipcRenderer.invoke('store:set', { key, value }),
  delete: (key) => ipcRenderer.invoke('store:delete', key),
});

contextBridge.exposeInMainWorld('files', {
  openFileDialog: (args) => ipcRenderer.invoke('open-file-dialog', args),
});


contextBridge.exposeInMainWorld('path', {
  join: (...args) => path.join(...args),
  dirname: (p) => path.dirname(p),
  basename: (p) => path.basename(p),
  extname: (p) => path.extname(p),
  resolve: (...args) => path.resolve(...args),
});


contextBridge.exposeInMainWorld('env', {
  get: (key) => process.env[key],
  pipInstall: (pipPath, requirementsPath) =>
    ipcRenderer.invoke('pip-install', pipPath, requirementsPath),
});


contextBridge.exposeInMainWorld('electron', {
  openExternal: (url) => shell.openExternal(url),
  openPath: (path) => shell.openPath(path),
  setMaxListeners: (amount) => ipcRenderer.setMaxListeners(amount),
});

contextBridge.exposeInMainWorld('fsHelpers', {
  exists: (p) => fsHelpers.exists(p),
  join: (a, b) => path.join(a, b),
  readFileSync: (p) =>  fsHelpers.readFileSync(p),
  readdirSync: (p) =>  fsHelpers.readdirSync (p),
  unlinkSync: (p) =>  fsHelpers.unlinkSync(p),
  renameSync: (a, b) =>  fsHelpers.renameSync(a, b),
  writeFileSync: (a, b) =>  fsHelpers.writeFileSync(a, b),
});

contextBridge.exposeInMainWorld('dialog', {
  showOpenDialog: (options) =>
    ipcRenderer.invoke('dialog:showOpenDialog', options),
  showSaveDialog: (options) =>
    ipcRenderer.invoke('dialog:showSaveDialog', options),
});

contextBridge.exposeInMainWorld('ipc', {
  send: (channel, data) => ipcRenderer.send(channel, data),
  invoke: (channel, data) => ipcRenderer.invoke(channel, data),
  on: (channel, callback) => {
    const listener = (_event, ...args) => callback(...args);
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
  },
  removeListener: (channel, listener) => ipcRenderer.removeListener(channel, listener),
});
