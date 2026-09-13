// ═══════════════════════════════════════════════════════════
// js/tombstone.js — DẤU VẾT XÓA (tombstone) cho đồng bộ mây
// ═══════════════════════════════════════════════════════════
// VẤN ĐỀ: đồng bộ mây gộp theo kiểu "chỉ BỔ SUNG bản còn thiếu"
// (mergeAddMissing trong cloud.js) — KHÔNG BAO GIỜ xóa. Nên khi máy A xóa
// một dòng (VD lượt ép ván), máy B vẫn giữ dòng cũ trong localStorage của nó
// và lần đẩy dữ liệu sau đó sẽ đưa dòng đã xóa NGƯỢC LÊN MÂY → máy A tải
// lại trang thì dòng "sống lại" dù đã xóa nhiều lần.
//
// GIẢI PHÁP: mỗi lần xóa bản ghi, ghi lại { <id>: <thời điểm xóa ISO> } vào
// state.deletedIds (lưu localStorage + đẩy lên mây cùng snapshot). Khi gộp
// dữ liệu từ mây (mergeRemoteIntoLocal / applyFireSnapshot):
//   • Bản ghi có id nằm trong dấu vết xóa → BỊ BỎ QUA (không nhận về máy);
//   • Bản cũ còn sót trên máy cũng bị GỠ BỎ → lần xóa lan truyền mọi máy;
//   • Bản ghi có dấu thời gian MỚI HƠN lần xóa → coi là "thêm lại có chủ đích"
//     (hoàn tác / nhập lại cùng id) → dấu vết xóa được GỠ (hồi sinh bản ghi).
// Dấu vết xóa quá cũ (90 ngày) được dọn dẹp để không phình to vô hạn.
// ═══════════════════════════════════════════════════════════
import { STORAGE_KEY_DELETED_IDS, state } from './state.js';

export const TOMBSTONE_MAX_AGE_DAYS = 90; // thời gian "ghi nhớ" lần xóa

function recStamp(r) {
  return String((r && (r.updatedAt || r.createdAt)) || '');
}

export function saveDeletedIds() {
  try { localStorage.setItem(STORAGE_KEY_DELETED_IDS, JSON.stringify(state.deletedIds || {})); } catch (e) { /* bỏ qua */ }
}

// Dọn các dấu vết xóa quá cũ (hơn TOMBSTONE_MAX_AGE_DAYS ngày)
function pruneDeletedIds() {
  const tomb = state.deletedIds;
  if (!tomb || typeof tomb !== 'object') return;
  const cutoff = new Date(Date.now() - TOMBSTONE_MAX_AGE_DAYS * 24 * 3600 * 1000).toISOString();
  for (const colKey of Object.keys(tomb)) {
    const col = tomb[colKey];
    if (!col || typeof col !== 'object') { delete tomb[colKey]; continue; }
    for (const id of Object.keys(col)) {
      if (String(col[id]) < cutoff) delete col[id];
    }
    if (!Object.keys(col).length) delete tomb[colKey];
  }
}

// Nạp dấu vết xóa lúc mở app (gọi 1 lần trong main.js trước initHistory)
export function loadDeletedIds() {
  const raw = localStorage.getItem(STORAGE_KEY_DELETED_IDS);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      state.deletedIds = (parsed && typeof parsed === 'object') ? parsed : {};
    } catch (e) { state.deletedIds = {}; }
  } else {
    state.deletedIds = {};
  }
  pruneDeletedIds();
  saveDeletedIds();
}

// GHI dấu vết xóa cho 1 id hoặc mảng id của một danh sách
// (gọi ngay TRƯỚC khi lọc bản ghi khỏi state & save — để lần đẩy mây
// tiếp theo mang theo tombstone, các máy khác sẽ không hồi sinh bản ghi)
export function trackDeleted(collection, ids) {
  if (!collection) return;
  const arr = Array.isArray(ids) ? ids : [ids];
  const real = arr.filter(x => x !== undefined && x !== null && x !== '');
  if (!real.length) return;
  if (!state.deletedIds || typeof state.deletedIds !== 'object') state.deletedIds = {};
  const col = state.deletedIds[collection] = state.deletedIds[collection] || {};
  const now = new Date().toISOString();
  for (const id of real) col[id] = now;
  saveDeletedIds();
}

// GỠ dấu vết xóa (hoàn tác phục hồi lại bản ghi / bản ghi được thêm lại có chủ đích)
export function untrackDeleted(collection, ids) {
  if (!state.deletedIds || !state.deletedIds[collection]) return;
  const col = state.deletedIds[collection];
  const arr = Array.isArray(ids) ? ids : [ids];
  let removed = false;
  for (const id of arr) {
    if (id && (id in col)) { delete col[id]; removed = true; }
  }
  if (!Object.keys(col).length) delete state.deletedIds[collection];
  if (removed) saveDeletedIds();
}

// Bản đồ tombstone của một danh sách ({ id: thời điểm xóa }) — có thể rỗng
export function getDeletedMap(collection) {
  const tomb = state.deletedIds;
  return (tomb && tomb[collection]) || {};
}

// Hợp nhất dấu vết xóa từ mây vào máy: id có thời điểm xóa MUỘN HƠN thắng.
// changed: { flag } — được bật true nếu tombstone của máy thay đổi.
export function mergeTombstones(remoteDeleted, changed) {
  if (!remoteDeleted || typeof remoteDeleted !== 'object') return state.deletedIds || {};
  if (!state.deletedIds || typeof state.deletedIds !== 'object') state.deletedIds = {};
  for (const colKey of Object.keys(remoteDeleted)) {
    const src = remoteDeleted[colKey];
    if (!src || typeof src !== 'object') continue;
    const dst = state.deletedIds[colKey] = state.deletedIds[colKey] || {};
    for (const id of Object.keys(src)) {
      const rTs = String(src[id] || '');
      if (!rTs) continue;
      if (!dst[id] || rTs > String(dst[id])) {
        dst[id] = rTs;
        if (changed) changed.flag = true;
      }
    }
  }
  return state.deletedIds;
}

// Lọc 1 danh sách bản ghi theo tombstone:
//   - bỏ bản ghi đã bị xóa (id có trong dấu vết xóa, dấu thời gian không mới hơn);
//   - bản ghi MỚI HƠN lần xóa → hồi sinh: gỡ dấu vết + giữ bản ghi;
//   - changed: { flag } bật true nếu có gì đó thay đổi (bị loại hoặc hồi sinh).
// Trả về mảng mới (không đổi mảng gốc).
export function applyTombstonesToRecordList(collection, arr, changed) {
  const list = Array.isArray(arr) ? arr : [];
  const col = getDeletedMap(collection);
  if (!Object.keys(col).length) return list;
  const out = [];
  for (const r of list) {
    if (!r || !r.id) { out.push(r); continue; }
    const delTs = col[r.id];
    if (delTs === undefined) { out.push(r); continue; }
    if (recStamp(r) > String(delTs)) {
      // Bản ghi được sửa/thêm lại SAU lần xóa → hồi sinh, gỡ dấu vết xóa
      delete col[r.id];
      if (changed) changed.flag = true;
      out.push(r);
      continue;
    }
    if (changed) changed.flag = true; // bản ghi bị chặn bởi lần xóa → loại
  }
  if (state.deletedIds && state.deletedIds[collection] === col && !Object.keys(col).length) {
    delete state.deletedIds[collection];
  }
  return out;
}

// Mây/máy có dấu vết xóa nào không (dùng để quyết định có cần gộp không,
// kể cả khi các danh sách dữ liệu đều rỗng — máy khác xóa HẾT dữ liệu)
export function hasDeletedIds(obj) {
  const tomb = obj && obj.deletedIds;
  if (!tomb || typeof tomb !== 'object') return false;
  return Object.keys(tomb).some(colKey => {
    const col = tomb[colKey];
    return col && typeof col === 'object' && Object.keys(col).length > 0;
  });
}

// Lọc các TUẦN của kế hoạch nguyên liệu (materialPlan) theo tombstone:
// tuần đã bị xóa (updatedAt không mới hơn lần xóa) → bỏ; mới hơn → hồi sinh.
export function stripTombstonedPlanWeeks(planObj, changed) {
  const src = (planObj && typeof planObj === 'object') ? planObj : {};
  const col = getDeletedMap('materialPlan');
  if (!Object.keys(col).length) return src;
  const out = {};
  for (const wk of Object.keys(src)) {
    const rWeek = (src[wk] && typeof src[wk] === 'object') ? src[wk] : {};
    const delTs = col[wk];
    if (delTs !== undefined) {
      if (String((rWeek && rWeek.updatedAt) || '') > String(delTs)) {
        delete col[wk]; // tuần được tạo/sửa lại sau khi xóa → hồi sinh
        if (changed) changed.flag = true;
      } else {
        if (changed) changed.flag = true;
        continue; // tuần đã bị xóa → không nhận lại
      }
    }
    out[wk] = rWeek;
  }
  if (state.deletedIds && state.deletedIds.materialPlan === col && !Object.keys(col).length) {
    delete state.deletedIds.materialPlan;
  }
  return out;
}

