import Store from 'electron-store';

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

export const get = (key) => store.get(key);
export const getAll = () => store.store;
export const set = (key, value) => store.set(key, value);
export const del = (key) => store.delete(key);

export default {
  get,
  set,
  delete: del,
};