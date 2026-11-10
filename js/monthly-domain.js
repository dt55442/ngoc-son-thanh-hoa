import * as repo from './repo.js';

export async function persistMonthlyDomain(domain, storageKey, records, options) {
  const data = Array.isArray(records) ? records : [];
  const opts = options || {};
  let indexedError = null;

  if (repo.available()) {
    try {
      const result = await repo.putDomain(domain, data, {
        dropMissing: !!opts.dropMissing,
        changedMonths: opts.changedMonths
      });
      if (result && result.persisted) {
        try {
          const cacheMonths = Number(opts.cacheMonths) > 0 ? Number(opts.cacheMonths) : 1;
          localStorage.setItem(storageKey, JSON.stringify(repo.cacheSlice(data, cacheMonths)));
          return { persisted: true, backend: 'indexedDB', cacheError: null };
        } catch (cacheError) {
          return { persisted: true, backend: 'indexedDB', cacheError };
        }
      }
      indexedError = (result && result.error) || repo.lastWriteErrorRef();
    } catch (error) {
      indexedError = error;
    }
  }

  try {
    localStorage.setItem(storageKey, JSON.stringify(data));
    return { persisted: true, backend: 'localStorage', indexedError };
  } catch (localError) {
    return { persisted: false, backend: null, indexedError, localError };
  }
}

export async function hydrateMonthlyDomain(domain, localRecords, mergeRecords) {
  const local = Array.isArray(localRecords) ? localRecords : [];
  if (!repo.available()) return { records: local, backend: 'localStorage' };

  await repo.prime([domain]);
  const indexed = await repo.loadDomain(domain);
  const records = typeof mergeRecords === 'function'
    ? mergeRecords(indexed, local)
    : [...indexed, ...local];
  return { records, backend: 'indexedDB' };
}
