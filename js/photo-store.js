// ═══════════════════════════════════════════════════════════
// js/photo-store.js — KHO ẢNH FULL NGOÀI BẢN GHI (IndexedDB)
// Bản ghi nguyên liệu chỉ giữ thumbnail nhỏ (~vài KB) inline;
// ảnh full (JPEG Blob) nằm trong IndexedDB store 'material_photos'
// → localStorage / bamboo_data.json / Firestore không còn phình to
//   khi số ảnh đính kèm tăng theo năm tháng.
// Fallback: nếu IndexedDB không khả dụng (trình duyệt cũ / môi trường
// test), putPhoto trả về null và caller giữ ảnh full inline (hành vi cũ)
// → không bao giờ MẤT ảnh, chỉ tốn dung lượng hơn.
// ═══════════════════════════════════════════════════════════

const PHOTO_DB_NAME = 'bamboo_tracker_photos';
const PHOTO_DB_VERSION = 1;
const PHOTO_STORE = 'material_photos';

let dbPromise = null;
const urlCache = new Map(); // photoId -> objectURL (tái dùng khi mở lại lightbox)

function photosAvailable() {
  return typeof indexedDB !== 'undefined' && !!indexedDB;
}

function openPhotoDb() {
  if (!photosAvailable()) return Promise.reject(new Error('IndexedDB không khả dụng'));
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(PHOTO_DB_NAME, PHOTO_DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(PHOTO_STORE)) db.createObjectStore(PHOTO_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

// dataURL → Blob (nhị phân gọn hơn chuỗi base64 ~25%)
function dataUrlToBlob(dataUrl) {
  const m = /^data:([^;,]+)(;base64)?,(.*)$/.exec(String(dataUrl || ''));
  if (!m || !m[2]) return null;
  try {
    const bin = atob(m[3]);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type: m[1] || 'image/jpeg' });
  } catch (e) { return null; }
}

// Lưu Blob với id có sẵn (nạp bù từ file) hoặc tự sinh id mới.
// Trả về id; không lưu được → null.
async function putPhotoBlob(blob, fixedId) {
  if (!blob) return null;
  const id = fixedId || ('ph-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8));
  try {
    const db = await openPhotoDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(PHOTO_STORE, 'readwrite');
      tx.objectStore(PHOTO_STORE).put(blob, id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error('abort'));
    });
    return id;
  } catch (e) { return null; }
}

// Lưu 1 ảnh full (dataURL) vào kho → trả về id mới; không lưu được → null
async function putPhoto(dataUrl, fixedId) {
  return putPhotoBlob(dataUrlToBlob(dataUrl), fixedId);
}

// id → objectURL để gắn vào <img> (đã cache); không có → ''
async function getPhotoURL(id) {
  if (!id) return '';
  if (urlCache.has(id)) return urlCache.get(id);
  try {
    const db = await openPhotoDb();
    const blob = await new Promise((resolve, reject) => {
      const tx = db.transaction(PHOTO_STORE, 'readonly');
      const req = tx.objectStore(PHOTO_STORE).get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
    if (!blob) return '';
    const url = URL.createObjectURL(blob);
    urlCache.set(id, url);
    return url;
  } catch (e) { return ''; }
}

async function deletePhoto(id) {
  if (!id) return;
  if (urlCache.has(id)) {
    try { URL.revokeObjectURL(urlCache.get(id)); } catch (e) { /* bỏ qua */ }
    urlCache.delete(id);
  }
  try {
    const db = await openPhotoDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(PHOTO_STORE, 'readwrite');
      tx.objectStore(PHOTO_STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) { /* bỏ qua */ }
}

async function deletePhotos(ids) {
  for (const id of (ids || [])) await deletePhoto(id);
}

// Toàn bộ id ảnh đang có trong kho (nạp bù / thống kê)
async function allPhotoIds() {
  try {
    const db = await openPhotoDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(PHOTO_STORE, 'readonly');
      const req = tx.objectStore(PHOTO_STORE).getAllKeys();
      req.onsuccess = () => resolve(new Set(req.result || []));
      req.onerror = () => reject(req.error);
    });
  } catch (e) { return new Set(); }
}

export {
  PHOTO_DB_NAME,
  PHOTO_STORE,
  allPhotoIds,
  dataUrlToBlob,
  deletePhoto,
  deletePhotos,
  getPhotoURL,
  photosAvailable,
  putPhoto,
  putPhotoBlob
};