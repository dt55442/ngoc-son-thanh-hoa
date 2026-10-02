// ═══════════════════════════════════════════════════════════
// js/photo-store.js — KHO ẢNH NGOÀI BẢN GHI (IndexedDB)
// 2 kho:
//   · 'material_photos' = ảnh FULL (JPEG Blob) — CHỈ nằm trên máy, KHÔNG lên mây
//   · 'material_thumbs' = ảnh THUMB (~180px, vài KB) — rút ra khỏi bản ghi để
//     localStorage / bamboo_data.json không phình theo số ảnh; thumb này mới
//     được đồng bộ lên mây qua KÊNH ẢNH RIÊNG (js/photo-sync.js).
// Fallback: nếu IndexedDB không khả dụng (trình duyệt cũ / môi trường test),
// putPhoto/putThumb trả về null và caller giữ ảnh inline (hành vi cũ)
// → không bao giờ MẤT ảnh, chỉ tốn dung lượng hơn.
// ═══════════════════════════════════════════════════════════

const PHOTO_DB_NAME = 'bamboo_tracker_photos';
const PHOTO_DB_VERSION = 2;
const PHOTO_STORE = 'material_photos';
const PHOTO_THUMB_STORE = 'material_thumbs';

let dbPromise = null;
const urlCache = new Map();      // photoId -> objectURL ảnh FULL (tái dùng khi mở lại lightbox)
const thumbUrlCache = new Map(); // photoId -> objectURL ảnh THUMB (bảng nguyên liệu)

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
      if (!db.objectStoreNames.contains(PHOTO_THUMB_STORE)) db.createObjectStore(PHOTO_THUMB_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

// Blob → dataURL (dùng để ĐẨY thumb lên mây; FileReader có trên mọi trình duyệt)
function blobToDataURL(blob) {
  if (!blob) return Promise.resolve('');
  return new Promise((resolve) => {
    try {
      const fr = new FileReader();
      fr.onload = () => resolve(typeof fr.result === 'string' ? fr.result : '');
      fr.onerror = () => resolve('');
      fr.readAsDataURL(blob);
    } catch (e) { resolve(''); }
  });
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

// ─── ẢNH THUMB (kho 'material_thumbs') ────────────────────────
// Thumb được RÚT RA khỏi bản ghi (rec.images[] chỉ còn { id }) nên phải có
// kho riêng để hiển thị bảng + đẩy lên mây qua kênh ảnh (js/photo-sync.js).
async function putThumbBlob(blob, fixedId) {
  if (!blob) return null;
  const id = fixedId || ('ph-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8));
  try {
    const db = await openPhotoDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(PHOTO_THUMB_STORE, 'readwrite');
      tx.objectStore(PHOTO_THUMB_STORE).put(blob, id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error('abort'));
    });
    if (thumbUrlCache.has(id)) { try { URL.revokeObjectURL(thumbUrlCache.get(id)); } catch (e) {} thumbUrlCache.delete(id); }
    return id;
  } catch (e) { return null; }
}

async function putThumb(dataUrl, fixedId) {
  return putThumbBlob(dataUrlToBlob(dataUrl), fixedId);
}

async function getThumbBlob(id) {
  if (!id || !photosAvailable()) return null;
  try {
    const db = await openPhotoDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(PHOTO_THUMB_STORE, 'readonly');
      const req = tx.objectStore(PHOTO_THUMB_STORE).get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch (e) { return null; }
}

// id → objectURL của THUMB (đã cache) — '' nếu chưa có
async function getThumbURL(id) {
  if (!id) return '';
  if (thumbUrlCache.has(id)) return thumbUrlCache.get(id);
  const blob = await getThumbBlob(id);
  if (!blob) return '';
  try {
    const url = URL.createObjectURL(blob);
    thumbUrlCache.set(id, url);
    return url;
  } catch (e) { return ''; }
}

// id → dataURL của THUMB (để đẩy lên mây; '' nếu chưa có)
async function getThumbDataURL(id) {
  return blobToDataURL(await getThumbBlob(id));
}

async function hasThumb(id) {
  return !!(await getThumbBlob(id));
}

async function deleteThumb(id) {
  if (!id) return;
  if (thumbUrlCache.has(id)) {
    try { URL.revokeObjectURL(thumbUrlCache.get(id)); } catch (e) { /* bỏ qua */ }
    thumbUrlCache.delete(id);
  }
  if (!photosAvailable()) return;
  try {
    const db = await openPhotoDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(PHOTO_THUMB_STORE, 'readwrite');
      tx.objectStore(PHOTO_THUMB_STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) { /* bỏ qua */ }
}

async function allThumbIds() {
  try {
    const db = await openPhotoDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(PHOTO_THUMB_STORE, 'readonly');
      const req = tx.objectStore(PHOTO_THUMB_STORE).getAllKeys();
      req.onsuccess = () => resolve(new Set(req.result || []));
      req.onerror = () => reject(req.error);
    });
  } catch (e) { return new Set(); }
}

export {
  PHOTO_DB_NAME,
  PHOTO_DB_VERSION,
  PHOTO_STORE,
  PHOTO_THUMB_STORE,
  allPhotoIds,
  allThumbIds,
  blobToDataURL,
  dataUrlToBlob,
  deletePhoto,
  deletePhotos,
  deleteThumb,
  getPhotoURL,
  getThumbBlob,
  getThumbDataURL,
  getThumbURL,
  hasThumb,
  photosAvailable,
  putPhoto,
  putPhotoBlob,
  putThumb,
  putThumbBlob
};