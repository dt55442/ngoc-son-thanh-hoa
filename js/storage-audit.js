// ═══════════════════════════════════════════════════════════
// js/storage-audit.js — CÔNG CỤ "BỘ NHỚ MÁY" (17/11/2026)
// ───────────────────────────────────────────────────────────
// BỐI CẢNH: máy người dùng báo "Bộ nhớ máy đầy" liên tục dù cơ chế tự dọn
// (quy tắc 109 — safeSetItemWithRecovery) đã cắt bản cất tự động/sổ xung
// đột/nhật ký. Nguyên nhân: hạn mức localStorage CHỈ ~5 MB/trang web (trình
// duyệt chặn cứng, KHÔNG nâng được) trong khi dữ liệu công đoạn nhiều tháng +
// cache Nhân sự + bản cất cộng lại vượt hạn mức.
//
// Công cụ này (menu ⋮ → "Bộ Nhớ Máy") giúp Admin:
//   1. XEM: bảng dung lượng TỪNG key localStorage sắp xếp giảm dần;
//   2. DỌN NHANH các key PHỤ TRỢ (an toàn — KHÔNG đụng dữ liệu chính):
//      bản cất tự động · nhật ký lịch sử · sổ xung đột · cache Nhân sự ·
//      tombstone quá 90 ngày;
//   3. DẶN DÒ: luôn nhắc xuất JSON sao lưu TRƯỚC khi dọn.
// KHÔNG import cloud.js (kéo cả module mây vào) — key sổ đồng bộ khai cứng
// kèm chú thích khớp SYNC_STATE_KEY của js/cloud.js. Chỉ import utils.
// ═══════════════════════════════════════════════════════════
import { escapeHTML, showToast } from './utils.js';
import { estimateBrowserStorage, requestPersistentStorage } from './storage-adapter.js';

const SA_MODAL_ID = 'modal-storage-audit';
const SA_BODY_ID = 'sa-body';
// Khớp các STORAGE_KEY trong js/state.js — khai cứng để module gọn.
const SA_KEY_AUTOBACKUP = 'bamboo_tracker_autobackup_v1';
const SA_KEY_HISTORY = 'bamboo_tracker_history_v1';
const SA_KEY_DELETED_IDS = 'bamboo_tracker_deleted_ids_v1';
const SA_KEY_SYNC_STATE = 'bamboo_tracker_sync_state_v1'; // = SYNC_STATE_KEY (js/cloud.js)
// 3 cache Nhân sự (bản đầy nằm IndexedDB — xem js/repo.js CACHE_MONTHS)
const SA_HR_KEYS = [
  { key: 'bamboo_tracker_hr_assignments_v1', label: 'Cache Nhân sự — Bảng bố trí' },
  { key: 'bamboo_tracker_hr_attendance_v1', label: 'Cache Nhân sự — Chấm công' },
  { key: 'bamboo_tracker_hr_checkins_v1', label: 'Cache Nhân sự — Giờ máy' },
];

// Nhãn thân thiện cho key hay gặp (còn lại hiện thẳng tên key)
const SA_KEY_LABELS = {
  [SA_KEY_AUTOBACKUP]: 'Bản cất tự động (tối đa 10 bản)',
  [SA_KEY_HISTORY]: 'Lịch sử sửa đổi (audit log)',
  [SA_KEY_DELETED_IDS]: 'Dấu vết xóa (tombstone)',
  [SA_KEY_SYNC_STATE]: 'Sổ đồng bộ mây (base + xung đột)',
  'bamboo_tracker_data_v1': 'DỮ LIỆU CHÍNH — Lô nan',
  'bamboo_tracker_materials_v1': 'DỮ LIỆU CHÍNH — Nguyên liệu',
  'bamboo_tracker_press_records_v1': 'DỮ LIỆU CHÍNH — Ép ván',
  'bamboo_tracker_users_v3': 'Người dùng + quyền',
  'bamboo_tracker_custom_charts_v1': 'Biểu đồ tùy chỉnh',
};

// ─── ĐO DUNG LƯỢNG ───────────────────────────────────────────
// Bỏ qua key rỗng; bytes tính theo UTF-16 (2 byte/ký tự) như trình duyệt.
export function saUsageEntries() {
  const out = [];
  if (typeof localStorage === 'undefined') return out;
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k == null) continue;
    let v = '';
    try { v = localStorage.getItem(k) || ''; } catch (e) { continue; }
    if (!v) continue;
    out.push({
      key: k,
      label: SA_KEY_LABELS[k] || k,
      bytes: (k.length + v.length) * 2,
      chars: v.length,
      isCore: (SA_KEY_LABELS[k] || '').indexOf('DỮ LIỆU CHÍNH') === 0,
    });
  }
  out.sort((a, b) => b.bytes - a.bytes);
  return out;
}

export function fmtSaBytes(bytes) {
  const b = Math.max(0, Number(bytes) || 0);
  if (b >= 1024 * 1024) return (b / (1024 * 1024)).toFixed(2) + ' MB';
  if (b >= 1024) return Math.ceil(b / 1024) + ' KB';
  return b + ' B';
}

// ─── CÁC HÀM DỌN (mỗi hàm trả về số KÝ TỰ đã giải phóng; 0 = không dọn được) ──
// Đều chỉ đụng key PHỤ TRỢ — dữ liệu chính không bao giờ bị đụng.

export function saTrimAutoBackups(keep) {
  const n = Math.max(1, Number(keep) || 1);
  const raw = localStorage.getItem(SA_KEY_AUTOBACKUP);
  if (!raw) return 0;
  let list;
  try { list = JSON.parse(raw); } catch (e) { return 0; }
  if (!Array.isArray(list) || list.length <= n) return 0;
  const kept = list.slice(0, n); // mới nhất đứng đầu (captureAutoBackup unshift)
  const str = JSON.stringify(kept);
  try { localStorage.setItem(SA_KEY_AUTOBACKUP, str); } catch (e) { return 0; }
  return raw.length - str.length;
}

export function saTrimHistory(keep) {
  const n = Math.max(10, Number(keep) || 60);
  const raw = localStorage.getItem(SA_KEY_HISTORY);
  if (!raw) return 0;
  let list;
  try { list = JSON.parse(raw); } catch (e) { return 0; }
  if (!Array.isArray(list) || list.length <= n) return 0;
  const str = JSON.stringify(list.slice(-n)); // giữ các dòng MỚI NHẤT
  try { localStorage.setItem(SA_KEY_HISTORY, str); } catch (e) { return 0; }
  return raw.length - str.length;
}

export function saClearSyncConflicts() {
  const raw = localStorage.getItem(SA_KEY_SYNC_STATE);
  if (!raw) return 0;
  let st;
  try { st = JSON.parse(raw); } catch (e) { return 0; }
  if (!st || typeof st !== 'object') return 0;
  const conflicts = Array.isArray(st.conflicts) ? st.conflicts : [];
  if (!conflicts.length) return 0;
  st.conflicts = [];
  const str = JSON.stringify(st);
  try { localStorage.setItem(SA_KEY_SYNC_STATE, str); } catch (e) { return 0; }
  return raw.length - str.length;
}

// Cắt 3 cache Nhân sự về 1 tháng gần nhất (dữ liệu đầy nằm IndexedDB + mây).
// Nếu tháng này chưa có dữ liệu → giữ THÁNG MỚI NHẤT có dữ liệu (1 tháng).
function saMonthKeyOf(rec) {
  return String((rec && (rec.date || rec.from || (rec.createdAt || '').slice(0, 10))) || '').slice(0, 7);
}
export function saTrimHrCache() {
  const now = new Date();
  const m0 = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
  let freed = 0;
  SA_HR_KEYS.forEach(({ key }) => {
    const raw = localStorage.getItem(key);
    if (!raw) return;
    let arr;
    try { arr = JSON.parse(raw); } catch (e) { return; }
    if (!Array.isArray(arr) || !arr.length) return;
    let target = m0;
    if (!arr.some(r => saMonthKeyOf(r) === m0)) {
      let best = '';
      arr.forEach(r => { const m = saMonthKeyOf(r); if (m > best && /^\d{4}-\d{2}/.test(m)) best = m; });
      if (!best) return; // không có bản ghi nào có ngày hợp lệ → thôi
      target = best;
    }
    const kept = arr.filter(r => saMonthKeyOf(r) === target);
    const str = JSON.stringify(kept);
    if (str.length >= raw.length) return; // không tiết kiệm được thì thôi
    try { localStorage.setItem(key, str); } catch (e) { return; }
    freed += raw.length - str.length;
  });
  return freed;
}

// Dọn tombstone quá 90 ngày (cùng quy tắc TOMBSTONE_MAX_AGE_DAYS của tombstone.js)
export function saPruneTombstones(days) {
  const max = Math.max(1, Number(days) || 90);
  const raw = localStorage.getItem(SA_KEY_DELETED_IDS);
  if (!raw) return 0;
  let tomb;
  try { tomb = JSON.parse(raw); } catch (e) { return 0; }
  if (!tomb || typeof tomb !== 'object') return 0;
  const cutoff = new Date(Date.now() - max * 24 * 3600 * 1000).toISOString();
  let removed = 0;
  for (const colKey of Object.keys(tomb)) {
    const col = tomb[colKey];
    if (!col || typeof col !== 'object') { delete tomb[colKey]; continue; }
    for (const id of Object.keys(col)) {
      if (String(col[id]) < cutoff) { delete col[id]; removed++; }
    }
    if (!Object.keys(col).length) delete tomb[colKey];
  }
  if (!removed) return 0;
  const str = JSON.stringify(tomb);
  try { localStorage.setItem(SA_KEY_DELETED_IDS, str); } catch (e) { return 0; }
  return raw.length - str.length;
}

// ─── HÀNH ĐỘNG DỌN — render nút + chạy theo data-sa-act ──────
const SA_ACTIONS = [
  { act: 'autobackup', label: 'Bản cất tự động → giữ 1 bản mới nhất', warn: 'Các bản cũ vẫn có bản sao JSON/mây/file. Chỉ giữ 1 bản mới nhất trên máy này?', run: () => saTrimAutoBackups(1) },
  { act: 'history', label: 'Lịch sử sửa đổi → giữ 60 dòng gần nhất', warn: 'Các dòng lịch sử cũ sẽ bị bỏ (chỉ là vết audit, không phải dữ liệu)?', run: () => saTrimHistory(60) },
  { act: 'conflicts', label: 'Xoá sổ xung đột đồng bộ', warn: 'Các dòng xung đột chưa xử lý sẽ mất khỏi sổ (hệ thống tự phát hiện lại khi 2 máy khác nhau). Tiếp tục?', run: () => saClearSyncConflicts() },
  { act: 'hrcache', label: 'Cache Nhân sự → giữ 1 tháng gần nhất', warn: 'Chỉ cắt CACHE localStorage — dữ liệu đầy vẫn nằm trong kho IndexedDB và mây, mở app tự nạp bù. Tiếp tục?', run: () => saTrimHrCache() },
  { act: 'tombstones', label: 'Dọn dấu vết xóa quá 90 ngày', warn: 'Dấu vết xóa quá 90 ngày sẽ bị gỡ (chuẩn hệ thống — bản ghi đã bị xoá không hồi sinh trong 90 ngày đầu). Tiếp tục?', run: () => saPruneTombstones(90) },
];

export function runStorageAuditAction(act) {
  const def = SA_ACTIONS.find(a => a.act === act);
  if (!def) return 0;
  if (!confirm(def.warn)) return 0;
  let freed = 0;
  try { freed = def.run() || 0; } catch (e) { console.error('[BỘ NHỚ] Lỗi khi dọn:', e); }
  const msg = freed > 0
    ? 'Đã dọn "' + def.label.split('→')[0].trim() + '" — giải phóng khoảng ' + fmtSaBytes(freed * 2) + '.'
    : 'Không có gì cần dọn ở mục này (đã gọn).';
  try { showToast(msg, freed > 0 ? 'success' : 'info'); } catch (e) { console.info(msg); }
  if (freed > 0) { try { renderStorageAudit(); } catch (e) { /* modal chưa mở */ } }
  return freed;
}

async function updateRealStorageEstimate() {
  const el = document.getElementById('sa-real-estimate');
  if (!el) return;
  const estimate = await estimateBrowserStorage();
  if (!estimate.supported) {
    el.innerHTML = 'Trình duyệt không cung cấp số liệu dung lượng tổng; bảng trên vẫn đo riêng localStorage.';
    return;
  }
  const pct = estimate.usagePercent;
  const used = fmtSaBytes(estimate.usage);
  const quota = fmtSaBytes(estimate.quota);
  el.innerHTML =
    '<strong>Dung lượng origin thực tế:</strong> ' + used + ' / ' + quota + ' (' + pct + '%)' +
    '<br><span>' + (estimate.persistent
      ? 'Trang đã được đánh dấu bảo vệ khỏi tự động dọn bớt của trình duyệt.'
      : 'Trang chưa được đánh dấu persistent storage; có thể nhờ trình duyệt bảo vệ dữ liệu này.') +
    '</span>';
}

export async function requestPersistentStorageFromAudit() {
  const ok = await requestPersistentStorage();
  showToast(ok
    ? 'Trình duyệt đã bảo vệ dữ liệu offline; dữ liệu không dễ bị tự xóa khi bộ nhớ thấp.'
    : 'Trình duyệt chưa cho phép bảo vệ dữ liệu; có thể thử lại sau khi người dùng tương tác với trang.',
  ok ? 'success' : 'warning');
  await updateRealStorageEstimate();
  return ok;
}

// ─── RENDER + MỞ/ĐÓNG MODAL ─────────────────────────────────
export function renderStorageAudit() {
  const body = document.getElementById(SA_BODY_ID);
  if (!body) return;
  const entries = saUsageEntries();
  const total = entries.reduce((s, e) => s + e.bytes, 0);
  const quota = 5 * 1024 * 1024; // hạn mức phổ biến của trình duyệt
  const pct = Math.min(100, Math.round(total / quota * 100));
  const top = entries.slice(0, 15);
  const rows = top.map((e, i) => {
    const share = total > 0 ? Math.round(e.bytes / total * 100) : 0;
    return '<tr' + (e.isCore ? ' class="sa-core"' : '') + '>' +
      '<td class="sa-rank">' + (i + 1) + '</td>' +
      '<td class="sa-name" title="' + escapeHTML(e.key) + '">' + escapeHTML(e.label) + '</td>' +
      '<td class="sa-bytes">' + fmtSaBytes(e.bytes) + '</td>' +
      '<td class="sa-share">' + share + '%</td>' +
      '</tr>';
  }).join('');
  const emptyNote = top.length
    ? (entries.length > top.length ? '<p class="sa-note">… và ' + (entries.length - top.length) + ' key nhỏ khác.</p>' : '')
    : '<p class="sa-note">Không có dữ liệu nào trong bộ nhớ máy.</p>';
  const actions = SA_ACTIONS.map(a =>
    '<button type="button" class="btn btn-outline btn-sm sa-act-btn" data-sa-act="' + a.act + '">' +
    escapeHTML(a.label) + '</button>').join('');
  body.innerHTML =
    '<div class="sa-total' + (pct >= 90 ? ' sa-total-bad' : pct >= 70 ? ' sa-total-warn' : '') + '">' +
    '<strong>' + fmtSaBytes(total) + '</strong> / ~5 MB hạn mức trình duyệt (' + pct + '%)' +
    '</div>' +
    '<div class="sa-real-estimate" id="sa-real-estimate">Đang đo dung lượng thực tế của origin…</div>' +
    '<button type="button" class="btn btn-outline btn-sm" id="btn-sa-persistent">Bảo vệ dữ liệu offline</button>' +
    '<div class="sa-tip">💡 Nên <strong>xuất JSON sao lưu trước</strong> (menu ⋮ → Sao Lưu JSON) rồi mới bấm dọn. ' +
    'Các nút dưới đây chỉ dọn dữ liệu PHỤ TRỢ — <u>không bao giờ</u> đụng dữ liệu chính.</div>' +
    (top.length ? '<div class="table-responsive sa-table-wrap"><table class="sa-table"><thead><tr>' +
      '<th>#</th><th>Thành phần</th><th>Dung lượng</th><th>Tỷ trọng</th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table></div>' + emptyNote : '') +
    '<div class="sa-actions" id="sa-actions">' + actions + '</div>' +
    '<p class="sa-note">⚠ Hạn mức localStorage của trình duyệt KHÔNG thể nâng cấp (~5 MB/trang web). ' +
    'Dữ liệu lớn đã được app chuyển sang <strong>IndexedDB</strong> (hàng trăm MB) và đồng bộ mây — ' +
    'cache Nhân sự trong bảng chỉ là bản tạm để mở app nhanh.</p>';
  updateRealStorageEstimate();
}

export function openStorageAudit() {
  const overlay = document.getElementById(SA_MODAL_ID);
  if (!overlay) { showToast('Chưa tìm thấy khung Bộ Nhớ Máy — hãy tải lại bản mới nhất (menu ⋮).', 'error'); return; }
  renderStorageAudit();
  overlay.classList.add('show');
}

export function closeStorageAudit() {
  const overlay = document.getElementById(SA_MODAL_ID);
  if (overlay) overlay.classList.remove('show');
}

export function storageAuditIsOpen() {
  const overlay = document.getElementById(SA_MODAL_ID);
  return !!(overlay && overlay.classList.contains('show'));
}
