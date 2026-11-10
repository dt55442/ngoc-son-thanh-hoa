export function localStorageSizeSummary() {
  if (typeof localStorage === 'undefined') return { bytes: 0, largest: [] };
  let bytes = 0;
  const largest = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key == null) continue;
    try {
      const value = localStorage.getItem(key) || '';
      const size = (key.length + value.length) * 2;
      bytes += size;
      largest.push({ key, bytes: size });
    } catch (error) {
      console.warn('[STORAGE] Không đo được kích thước key localStorage:', key, error);
    }
  }
  largest.sort((a, b) => b.bytes - a.bytes);
  return { bytes, largest: largest.slice(0, 5) };
}

export function formatStorageSize(bytes) {
  const size = Math.max(0, Number(bytes) || 0);
  return size >= 1024 * 1024
    ? `${(size / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.ceil(size / 1024)} KB`;
}

export function reportStorageFailure(label, key, error) {
  const usage = localStorageSizeSummary();
  console.error('[STORAGE] Không lưu bền được ' + label, {
    key,
    localStorageBytes: usage.bytes,
    largestKeys: usage.largest
  }, error);
  return `Không lưu bền được ${label}. localStorage đang dùng khoảng ${formatStorageSize(usage.bytes)}; hãy giữ trang mở và xuất/đồng bộ bản sao lưu trước khi tải lại.`;
}
