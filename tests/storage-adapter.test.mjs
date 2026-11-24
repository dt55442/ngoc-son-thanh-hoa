'use strict';

import fs from 'node:fs';

let pass = 0;
let fail = 0;
function check(name, condition) {
  if (condition) {
    pass++;
    console.log('PASS - ' + name);
  } else {
    fail++;
    console.log('FAIL - ' + name);
  }
}

const backing = new Map();
globalThis.localStorage = {
  getItem(key) { return backing.has(String(key)) ? backing.get(String(key)) : null; },
  setItem(key, value) { backing.set(String(key), String(value)); },
  removeItem(key) { backing.delete(String(key)); },
  clear() { backing.clear(); },
  key(index) { return [...backing.keys()][index] ?? null; },
  get length() { return backing.size; }
};
globalThis.window = globalThis;

const adapter = await import('../js/storage-adapter.js');

backing.set('bamboo_tracker_data_v3', JSON.stringify([{ id: 'lot-1' }]));
backing.set('bamboo_tracker_history_v1', JSON.stringify([{ n: 1 }]));

check('A1: registry contains core data and audit domains',
  adapter.isCoreStorageKey('bamboo_tracker_data_v3')
  && adapter.isCoreStorageKey('bamboo_tracker_history_v1'));
check('A2: UI preference key is not a core domain',
  !adapter.isCoreStorageKey('bamboo_tracker_capacity_ui_v1'));

const init = await adapter.initializeCoreStorage();
check('A3: IndexedDB fallback does not delete legacy core data',
  typeof init.migrated === 'number'
  && backing.has('bamboo_tracker_data_v3')
  && backing.has('bamboo_tracker_history_v1'));

const restored = await adapter.restoreCoreStorage();
check('A4: fallback restore keeps state/data safe',
  Array.isArray(restored.restored)
  && restored.restored.length >= 0);

const estimate = await adapter.estimateBrowserStorage();
check('A5: storage estimate has a stable result shape',
  typeof estimate.supported === 'boolean'
  && typeof estimate.usagePercent === 'number');

const repoSrc = fs.readFileSync(new URL('../js/repo.js', import.meta.url), 'utf8');
const mainSrc = fs.readFileSync(new URL('../js/main.js', import.meta.url), 'utf8');
const swSrc = fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
const stateSrc = fs.readFileSync(new URL('../js/state.js', import.meta.url), 'utf8');

check('B1: repo has a key-value IndexedDB store',
  repoSrc.includes('REPO_KV_STORE') && repoSrc.includes('putKv') && repoSrc.includes('loadKv'));
check('B2: boot initializes and restores core storage',
  mainSrc.includes('initializeCoreStorage()') && mainSrc.includes('restoreCoreStorage()'));
check('B3: PWA precaches the storage adapter',
  swSrc.includes("'./js/storage-adapter.js'"));
check('B4: PWA cache and app version stay synchronized',
  swSrc.includes('nha-may-ngoc-son-v456')
  && stateSrc.includes("APP_VERSION = 'v456'")
  && /nha-may-ngoc-son-v(\d+)/.exec(swSrc)[1] === '456');

console.log(`\nSTORAGE-ADAPTER: ${pass} PASS, ${fail} FAIL`);
if (fail) process.exit(1);
