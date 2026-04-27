
const { contextBridge, ipcRenderer } = require('electron');

const os = require('os');
const fs = require('fs');
const path = require('path');

const fsHelpers = require('../main/fsHelpers.cjs');

contextBridge.exposeInMainWorld('system', {
  homedir: () => os.homedir(),
});

contextBridge.exposeInMainWorld('store', {
  get: (key) => ipcRenderer.invoke('store:get', key),
  set: (key, value) => ipcRenderer.invoke('store:set', { key, value }),
});


contextBridge.exposeInMainWorld('api', {
  openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
  path: {
    basename: (p) => path.basename(p),
    dirname: (p) => path.dirname(p),
    extname: (p) => path.extname(p),
    resolve: (p) => path.resolve(p)
  },
});


contextBridge.exposeInMainWorld('path', {
  join: (...args) => path.join(...args),
  dirname: (p) => path.dirname(p),
  basename: (p) => path.basename(p),
  resolve: (...args) => path.resolve(...args),
});


contextBridge.exposeInMainWorld('env', {
  get: (key) => process.env[key],
});


contextBridge.exposeInMainWorld('configStore', {
  get: (id, key) => ipcRenderer.invoke('configStore:get', { id, key }),
  set: (id, key, value) =>
    ipcRenderer.invoke('configStore:set', { id, key, value }),
  delete: (id, key) =>
    ipcRenderer.invoke('configStore:delete', { id, key }),
});

contextBridge.exposeInMainWorld('electron', {
  openExternal: (url) => shell.openExternal(url),
  openPath: (path) => shell.openPath(path),
});

contextBridge.exposeInMainWorld('fsHelpers', {
  exists: fsHelpers.exists,
  join: fsHelpers.join,
  readFileSync: fsHelpers.readFileSync,
  readdirSync: fsHelpers.readdirSync,
  unlinkSync: fsHelpers.unlinkSync,
  renameSync: fsHelpers.renameSync,
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
});
