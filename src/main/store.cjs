const Store = require('electron-store').default;

const store = new Store();

// --- MIGRATION ---
function migrateSettingsIfNeeded() {
  const settings = store.get('settings');

  // Old format: stringified JSON
  if (typeof settings === 'string') {
    try {
      const parsed = JSON.parse(settings);
      store.set('settings', parsed);
      console.log('✅ Migrated settings from string to object');
    } catch (e) {
      console.error('❌ Failed to migrate settings:', e);
    }
  }
}

// Run migration immediately on load
migrateSettingsIfNeeded();

module.exports = {
  get: (key) => store.get(key),
  set: (key, value) => store.set(key, value),
  delete: (key) => store.delete(key),
};
