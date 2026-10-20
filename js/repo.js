// ═══════════════════════════════════════════════════════════
// js/repo.js — KHO DỮ LIỆU LỚN THEO THÁNG (IndexedDB) — 20/10/2026
// ───────────────────────────────────────────────────────────
// VÌ SAO: mỗi tháng dữ liệu Nhân Sự (bố trí + chấm công + giờ máy) của
// 120 người ≈ 2,6 MB chuỗi JSON. localStorage chỉ 5–10 MB và mỗi lần lưu
// cũ phải ghi lại TOÀN BỘ mảng ⇒ đầy bộ nhớ sau 1–3 tháng + mỗi thao tác
// tốn ~1 giây. Kho này lưu TỪNG THÁNG thành một bản ghi riêng:
//   · Lưu: chỉ ghi lại tháng có dữ liệu ĐỔI (dựa trên số bản ghi + mốc mới nhất)
//   · Nạp: đọc các tháng rồi ghép lại thành mảng như cũ (không phải sửa 40+
//     chỗ đang đọc state.hrAssignments/hrAttendance/hrCheckins)
//   · Không có IndexedDB (Node test / trình duyệt cũ) → tự dùng bộ nhớ RAM,
//     giữ nguyên hành vi cũ, KHÔNG mất dữ liệu.
// KHÔNG lên mây trực tiếp ở đây — việc đồng bộ vẫn do js/cloud.js lo.
// ═══════════════════════════════════════════════════════════

const REPO_DB_NAME = 'bamboo_tracker_records';
const REPO_DB_VERSION = 1;
const REPO_STORE = 'months';

let dbPromise = null;
// Cache RAM: `${domain}|${month}` → { domain, month, count, stamp, json }
const cache = new Map();
// Miền đã ghi THÀNH CÔNG xuống IndexedDB ít nhất 1 lần — chỉ khi đó mới được
// phép thu gọn bản sao localStorage (tránh mất dữ liệu nếu IndexedDB lỗi).
const writeOk = Object.create(null);
// Hàng đợi ghi (gộp nhiều lần lưu liên tiếp) — không chặn UI
let writeChain = Promise.resolve();
let lastWriteError = null;

function available() {
  return typeof indexedDB !== 'undefined' && !!indexedDB;
}

function openDb() {
  if (!available()) return Promise.reject(new Error('IndexedDB không khả dụng'));
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(REPO_DB_NAME, REPO_DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(REPO_STORE)) db.createObjectStore(REPO_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

// Tháng của 1 bản ghi: ưu tiên date → from (đơn nghỉ) → createdAt → '0000-00'
function monthOf(rec) {
  const d = (rec && (rec.date || rec.from || (rec.createdAt || '').slice(0, 10))) || '';
  return /^\d{4}-\d{2}/.test(String(d)) ? String(d).slice(0, 7) : '0000-00';
}

// Gom mảng bản ghi thành { 'YYYY-MM': [..] } — KHÔNG sửa dữ liệu gốc
function groupByMonth(arr) {
  const out = Object.create(null);
  (arr || []).forEach(r => {
    const m = monthOf(r);
    if (!out[m]) out[m] = [];
    out[m].push(r);
  });
  return out;
}

// Danh sách n tháng gần nhất (YYYY-MM) — dùng cho cache localStorage
function recentMonths(n) {
  const d = new Date(); const out = [];
  for (let i = 0; i < n; i++) {
    const dt = new Date(d.getFullYear(), d.getMonth() - i, 1);
    out.push(dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0'));
  }
  return out;
}

// Lọc mảng bản ghi còn n tháng gần nhất (cache mở app nhanh)
function cacheSlice(arr, n) {
  const months = new Set(recentMonths(n || 2));
  return (arr || []).filter(r => months.has(monthOf(r)));
}

// Dùng cho quyết định "có được thu gọn localStorage hay chưa": chỉ true khi
// IndexedDB khả dụng VÀ miền này đã có dữ liệu nằm an toàn trong đó.
function healthy(domain) {
  return available() && (writeOk[domain] === true || monthsOf(domain).length > 0);
}

// "Dấu vân tay" rẻ để biết 1 tháng có đổi không: số bản ghi + mốc updatedAt lớn nhất
function stampOf(list) {
  let stamp = '';
  (list || []).forEach(r => {
    const s = String((r && (r.updatedAt || r.createdAt)) || '');
    if (s > stamp) stamp = s;
  });
  return stamp;
}

function cacheKey(domain, month) { return domain + '|' + month; }

function readRow(domain, month) {
  const c = cache.get(cacheKey(domain, month));
  return c ? JSON.parse(c.json) : [];
}

// Đọc toàn bộ 1 miền (ghép các tháng, sắp theo tháng tăng dần)
function loadDomainSync(domain) {
  const months = [...cache.keys()]
    .filter(k => k.indexOf(domain + '|') === 0)
    .map(k => k.slice(domain.length + 1))
    .sort();
  let out = [];
  months.forEach(m => { out = out.concat(readRow(domain, m)); });
  return out;
}

function loadDomain(domain) {
  if (!available()) return Promise.resolve(loadDomainSync(domain));
  return openDb().then(db => new Promise((resolve) => {
    const tx = db.transaction(REPO_STORE, 'readonly');
    const store = tx.objectStore(REPO_STORE);
    const out = [];
    const range = (typeof IDBKeyRange !== 'undefined') ? IDBKeyRange.bound(domain + '|', domain + '|\uffff') : null;
    const req = range ? store.openCursor(range) : store.openCursor();
    req.onsuccess = () => {
      const cur = req.result;
      if (cur) {
        const v = cur.value;
        if (v && v.json) {
          cache.set(cacheKey(v.domain, v.month), v);
          try { out.push(...JSON.parse(v.json)); } catch (e) {}
        }
        cur.continue();
      }
    };
    tx.oncomplete = () => resolve(out);
    tx.onerror = () => resolve(loadDomainSync(domain));
  })).catch(() => loadDomainSync(domain));
}

// Ghi 1 miền: CHỈ serialize + ghi các THÁNG ĐÃ ĐỔI.
// opts.dropMissing = true CHỈ khi biết chắc `arr` là TOÀN BỘ dữ liệu của miền
// (vd sau khi đã nạp đủ từ IndexedDB / nhận đủ từ mây). Mặc định KHÔNG xoá
// tháng vắng mặt — tránh mất dữ liệu khi app vừa mở, state mới có 2 tháng cache.
function putDomain(domain, arr, opts) {
  const dropMissing = !!(opts && opts.dropMissing);
  const groups = groupByMonth(arr);
  const changed = [];
  const removed = [];

  Object.keys(groups).forEach(month => {
    const list = groups[month];
    const count = list.length;
    const stamp = stampOf(list);
    const k = cacheKey(domain, month);
    const old = cache.get(k);
    if (old && old.count === count && old.stamp === stamp) return; // không đổi
    const row = { domain, month, count, stamp, json: JSON.stringify(list) };
    cache.set(k, row);
    changed.push(row);
  });
  if (dropMissing) {
    [...cache.keys()].forEach(k => {
      if (k.indexOf(domain + '|') !== 0) return;
      const month = k.slice(domain.length + 1);
      if (!groups[month] || !groups[month].length) {
        cache.delete(k);
        removed.push(month);
      }
    });
  }

  if (!available() || (!changed.length && !removed.length)) {
    return Promise.resolve({ domain, changed, removed, persisted: false });
  }
  // Nối vào hàng đợi để 2 lần lưu liên tiếp không ghi chồng
  writeChain = writeChain.then(() => openDb()).then(db => new Promise((resolve) => {
    const tx = db.transaction(REPO_STORE, 'readwrite');
    const store = tx.objectStore(REPO_STORE);
    changed.forEach(row => store.put(row, cacheKey(row.domain, row.month)));
    removed.forEach(m => store.delete(cacheKey(domain, m)));
    tx.oncomplete = () => { writeOk[domain] = true; resolve({ domain, changed, removed, persisted: true }); };
    tx.onerror = () => { lastWriteError = tx.error; resolve({ domain, changed, removed, persisted: false }); }
  })).catch(e => { lastWriteError = e; return { domain, changed, removed, persisted: false }; });
  return writeChain;
}

// Chờ mọi lần ghi xong (dùng cho test + trước khi xuất file/backup)
function flush() { return writeChain.catch(() => {}); }

// Chuỗi JSON theo tháng (backup/đồng bộ KHÔNG cần parse lại)
function dumpStrings() {
  const out = {};
  cache.forEach((row, k) => { out[k] = row.json; });
  return out;
}

function monthArrays(domain) {
  const out = {};
  [...cache.keys()].filter(k => k.indexOf(domain + '|') === 0).forEach(k => {
    out[k.slice(domain.length + 1)] = readRow(domain, k.slice(domain.length + 1));
  });
  return out;
}

function monthsOf(domain) {
  return [...cache.keys()]
    .filter(k => k.indexOf(domain + '|') === 0)
    .map(k => k.slice(domain.length + 1))
    .sort();
}

function jsonOf(domain, month) {
  const row = cache.get(cacheKey(domain, month));
  return row ? row.json : '';
}

function clearDomain(domain) {
  [...cache.keys()].forEach(k => { if (k.indexOf(domain + '|') === 0) cache.delete(k); });
  if (!available()) return Promise.resolve();
  return openDb().then(db => new Promise((resolve) => {
    const tx = db.transaction(REPO_STORE, 'readwrite');
    const store = tx.objectStore(REPO_STORE);
    const range = (typeof IDBKeyRange !== 'undefined') ? IDBKeyRange.bound(domain + '|', domain + '|\uffff') : null;
    store.delete(range);
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  })).catch(() => {});
}

// Nạp sẵn cache từ IndexedDB (gọi 1 lần lúc boot trước khi hydrate)
function prime(domains) {
  if (!available()) return Promise.resolve(false);
  return openDb().then(db => new Promise((resolve) => {
    const tx = db.transaction(REPO_STORE, 'readonly');
    const store = tx.objectStore(REPO_STORE);
    const req = store.openCursor();
    req.onsuccess = () => {
      const cur = req.result;
      if (cur) {
        const v = cur.value;
        if (v && v.domain && (!domains || domains.indexOf(v.domain) !== -1)) cache.set(cacheKey(v.domain, v.month), v);
        cur.continue();
      }
    };
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => resolve(false);
  })).catch(() => false);
}

export {
  available, cacheSlice, clearDomain, healthy, dumpStrings, flush, groupByMonth, jsonOf, loadDomain,
  loadDomainSync, monthArrays, monthOf, monthsOf, prime, putDomain, recentMonths, stampOf,
  cache as repoCache, lastWriteErrorRef
};
function lastWriteErrorRef() { return lastWriteError; }
