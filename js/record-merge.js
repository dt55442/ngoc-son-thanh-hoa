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
