
const Store = require('electron-store').default;

const store = new Store();

module.exports = {
  get: (key) => store.get(key),
  set: (key, value) => store.set(key, value),
  delete: (key) => store.delete(key),
};
