export function mergeRecordsByTimestamp(incomingArr, localArr) {
  const incoming = Array.isArray(incomingArr) ? incomingArr : [];
  const local = Array.isArray(localArr) ? localArr : [];
  const map = new Map();
  const noId = [];
  for (const record of incoming) {
    if (record && record.id) map.set(record.id, record);
  }
  for (const record of local) {
    if (!record) continue;
    if (!record.id) {
      noId.push(record);
      continue;
    }
    const current = map.get(record.id);
    const localStamp = String(record.updatedAt || record.createdAt || '');
    const currentStamp = String((current && (current.updatedAt || current.createdAt)) || '');
    if (!current || localStamp >= currentStamp) map.set(record.id, record);
  }
  return [...noId, ...map.values()];
}

function mergeRecordSnapshots(base, winner) {
  if (!base || typeof base !== 'object' || Array.isArray(base)) return winner;
  if (!winner || typeof winner !== 'object' || Array.isArray(winner)) return base;
  const out = { ...base };
  for (const [key, value] of Object.entries(winner)) {
    if (value === undefined || value === null) continue;
    if (value && typeof value === 'object' && !Array.isArray(value) &&
        base[key] && typeof base[key] === 'object' && !Array.isArray(base[key])) {
      out[key] = mergeRecordSnapshots(base[key], value);
    } else {
      out[key] = value;
    }
  }
  return out;
}

export function mergeX1RecordsByTimestamp(incomingArr, localArr) {
  const incoming = Array.isArray(incomingArr) ? incomingArr : [];
  const local = Array.isArray(localArr) ? localArr : [];
  const map = new Map();
  const noId = [];
  const noIdKeys = new Set();
  const addNoId = record => {
    if (!record) return;
    const key = JSON.stringify(record);
    if (noIdKeys.has(key)) return;
    noIdKeys.add(key);
    noId.push(record);
  };
  for (const record of incoming) {
    if (record && record.id) map.set(record.id, record);
  }
  for (const record of incoming) {
    if (!record) continue;
    if (!record.id) addNoId(record);
  }
  for (const record of local) {
    if (!record) continue;
    if (!record.id) {
      addNoId(record);
      continue;
    }
    const incomingRecord = incoming.find(r => r && r.id === record.id);
    if (!incomingRecord) {
      map.set(record.id, record);
      continue;
    }
    const incomingStamp = String(incomingRecord.updatedAt || incomingRecord.createdAt || '');
    const localStamp = String(record.updatedAt || record.createdAt || '');
    if (incomingStamp >= localStamp) {
      map.set(record.id, mergeRecordSnapshots(record, incomingRecord));
    } else {
      map.set(record.id, mergeRecordSnapshots(incomingRecord, record));
    }
  }
  for (const record of incoming) {
    if (!record) continue;
    if (!record.id) continue;
    if (!map.has(record.id) && !local.some(r => r && r.id === record.id)) {
      map.set(record.id, record);
    }
  }
  return [...noId, ...map.values()];
}
