const Store = require('electron-store');

const stores = new Map();

function getStore(id) {
  if (!stores.has(id)) {
    stores.set(
      id,
      new Store({
        name: id,
      })
    );
  }
  return stores.get(id);
}

module.exports = {
  get: (id, key) => getStore(id).get(key),
  set: (id, key, value) => getStore(id).set(key, value),
  delete: (id, key) => getStore(id).delete(key),
};
