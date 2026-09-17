// ═══════════════════════════════════════════════════════════
// js/autobackup.js — AUTO BACKUP (chống "sai xót/xóa nhầm" mất dữ liệu)
// ───────────────────────────────────────────────────────────
// Lớp 1 — CỤC BỘ (localStorage, key bamboo_tracker_autobackup_v1): ring buffer
//          10 snapshot gần nhất. Chụp tại thời điểm rủi ro nhất:
//            · trước khi "Tải Dữ Liệu Từ Mây Về Máy" (ghi đè máy),
//            · trước khi nạp/phục hồi file JSON,
//            · (throttle 5 phút) sau mỗi lần đẩy mây thành công.
// Lớp 2 — MÂY (Firestore apps/backups/dates/<ngày>): 1 bản/ngày, nén gzip,
//          giữ 14 ngày, tự dọn bản cũ — phòng khi máy hỏng localStorage.
// Lớp 3 — THƯ MỤC DỮ LIỆU: storage.js tự copy bamboo_data.json cũ sang
//          backups/ trước khi ghi đè (giữ 10 bản) — xem js/storage.js.
// PHỤC HỒI luôn GỘP KHÉO qua mergeRemoteIntoLocal (bản mới hơn theo dấu
// thời gian thắng, tôn trọng tombstone) — KHÔNG ghi đè mù quáng.
// ═══════════════════════════════════════════════════════════
import { canPushToCloud, collectCloudSnapshot, gzipStringToBase64, gunzipBase64ToString, initLucide, isFirebaseOnline, mergeRemoteIntoLocal, utf8Bytes } from './cloud.js';
import { STORAGE_KEY_AUTOBACKUP, state } from './state.js';
import { escapeHTML, showToast } from './utils.js';

  const AUTOBACKUP_LIMIT = 10;            // số bản cất cục bộ giữ lại (cũ nhất bị loại)
  const CLOUD_BACKUP_KEEP_DAYS = 14;      // số ngày giữ backup trên mây
  const CLOUD_BACKUP_MAX_DOC = 900000;    // trần ký tự payload (dưới giới hạn 1 MiB của Firestore)
  const PUSH_CAPTURE_GAP_MS = 5 * 60 * 1000; // throttle chụp sau khi đồng bộ mây
  const CLOUD_BACKUP_KEY = 'bamboo_tracker_cloudbackup_v1'; // { lastDate: 'yyyy-mm-dd' }
  let lastPushCaptureAt = 0;              // mốc throttle chụp (máy cục bộ)

  // ─── NẠP / LƯU DANH SÁCH BẢN CẤT CỤC BỘ ──────────────────────
  export function loadAutoBackups() {
    try { state.autoBackups = JSON.parse(localStorage.getItem(STORAGE_KEY_AUTOBACKUP) || '[]'); }
    catch (e) { state.autoBackups = []; }
    if (!Array.isArray(state.autoBackups)) state.autoBackups = [];
  }
  function saveAutoBackupsLocal() {
    try { localStorage.setItem(STORAGE_KEY_AUTOBACKUP, JSON.stringify(state.autoBackups)); }
    catch (e) {
      // Vượt hạn mức localStorage → bỏ bản cũ nhất rồi thử lại 1 lần
      try {
        state.autoBackups.pop();
        localStorage.setItem(STORAGE_KEY_AUTOBACKUP, JSON.stringify(state.autoBackups));
      } catch (e2) { console.warn('[AUTOBACKUP] Không lưu được bản cất cục bộ', e2); }
    }
  }

  // Giải nén dữ liệu của 1 bản cất (data = chuỗi JSON hoặc { gz: base64 })
  async function decodeEntryData(entry) {
    if (entry && entry.data && typeof entry.data === 'object' && typeof entry.data.gz === 'string') {
      return gunzipBase64ToString(entry.data.gz);
    }
    return (entry && typeof entry.data === 'string') ? entry.data : '';
  }

  // Nén nền bản cất (chuỗi JSON nặng ~10 lần bản gzip) — fire & forget
  function recompressEntryAsync(entry) {
    if (typeof CompressionStream !== 'function') return; // môi trường không nén được → giữ chuỗi trơn
    (async () => {
      try {
        const gz = await gzipStringToBase64(entry.data);
        if (gz && gz.length < entry.data.length) {
          entry.data = { gz };
          saveAutoBackupsLocal();
        }
      } catch (err) { /* giữ bản trơn */ }
    })();
  }

  // ─── CHỤP 1 BẢN CẤT (serialize ĐỒNG BỘ để đúng trạng thái hiện tại) ──
  export function captureAutoBackup(reason, force) {
    try {
      if (!force && Date.now() - lastPushCaptureAt < PUSH_CAPTURE_GAP_MS) return;
      let raw = '';
      try { raw = JSON.stringify(collectCloudSnapshot()); } catch (e) { return; }
      if (!raw || raw.length < 30) return; // dữ liệu rỗng → không có gì đáng cất
      lastPushCaptureAt = Date.now();
      const entry = {
        ts: new Date().toISOString(),
        by: (state.currentUser && (state.currentUser.fullname || state.currentUser.email)) || 'Khách',
        reason: String(reason || ''),
        data: raw
      };
      state.autoBackups.unshift(entry); // mới nhất lên đầu
      while (state.autoBackups.length > AUTOBACKUP_LIMIT) state.autoBackups.pop();
      saveAutoBackupsLocal();
      recompressEntryAsync(entry); // nén nền để tiết kiệm localStorage
    } catch (e) { console.warn('[AUTOBACKUP] Lỗi chụp bản cất', e); }
  }

  // ─── PHỤC HỒI 1 BẢN CẤT CỤC BỘ (GỘP KHÉO, không ghi đè mù quáng) ──
  export async function restoreAutoBackup(ts) {
    const entry = (state.autoBackups || []).find((b) => b.ts === ts);
    if (!entry) { showToast('Không tìm thấy bản cất này (có thể đã bị xóa).', 'error'); return; }
    let raw = '';
    try { raw = await decodeEntryData(entry); } catch (e) { raw = ''; }
    let snap = null;
    try { snap = JSON.parse(raw); } catch (e) { snap = null; }
    if (!snap) { showToast('Bản cất hỏng — không đọc được dữ liệu.', 'error'); return; }
    captureAutoBackup('Trước khi phục hồi bản cất', true); // chụp hiện tại trước khi đụng dữ liệu
    const changed = mergeRemoteIntoLocal(snap, false);
    showToast(changed
      ? 'Đã phục hồi bản cất (' + fmtTs(entry.ts) + ') — gộp khéo, bản ghi mới hơn được giữ lại.'
      : 'Bản cất không có dữ liệu mới hơn so với hiện tại — không thay đổi gì.', 'success');
  }

  // Xóa 1 bản cất cục bộ (dọn dẹp thủ công)
  export function deleteAutoBackup(ts) {
    state.autoBackups = (state.autoBackups || []).filter((b) => b.ts !== ts);
    saveAutoBackupsLocal();
    renderAutoBackupList();
  }

  // ─── LỚP 2: BACKUP MÂY (1 BẢN/NGÀY, GIỮ 14 NGÀY) ─────────────
  function cloudBackupCol(db) { return db.collection('apps').doc('backups').collection('dates'); }
  function todayKey() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  // Gọi SAU MỖI lần đẩy mây thành công — tự chặn "hôm nay đã cất rồi"
  export async function maybeWriteCloudBackup() {
    try {
      const db = (window.firebase && window.firebase.firestore) ? window.firebase.firestore() : null;
      if (!isFirebaseOnline() || !db || !state.currentUser || !canPushToCloud()) return;
      const key = todayKey();
      let meta = null;
      try { meta = JSON.parse(localStorage.getItem(CLOUD_BACKUP_KEY) || 'null'); } catch (e) {}
      if (meta && meta.lastDate === key) return; // hôm nay đã cất bản backup mây
      const raw = JSON.stringify(collectCloudSnapshot());
      const gzOk = typeof CompressionStream === 'function';
      const payload = gzOk ? await gzipStringToBase64(raw) : raw;
      if (utf8Bytes(payload) > CLOUD_BACKUP_MAX_DOC) {
        console.warn('[AUTOBACKUP] Backup mây quá lớn — bỏ qua hôm nay (dữ liệu chính vẫn đồng bộ bình thường)');
        return;
      }
      await cloudBackupCol(db).doc(key).set({
        __fmt: gzOk ? 'gzip' : 'plain',
        payload,
        updatedBy: state.currentUser.email || 'unknown',
        updatedAt: new Date().toISOString(),
        ts: Date.now()
      });
      try { localStorage.setItem(CLOUD_BACKUP_KEY, JSON.stringify({ lastDate: key })); } catch (e) {}
      console.log('[AUTOBACKUP] Đã cất backup mây ngày ' + key);
      pruneCloudBackups(db); // dọn bản cũ (>14 ngày) — nền, không chặn
    } catch (e) { console.warn('[AUTOBACKUP] Lỗi backup mây (dữ liệu chính không bị ảnh hưởng)', e); }
  }
  async function pruneCloudBackups(db) {
    try {
      const qs = await cloudBackupCol(db).get();
      const cutoff = Date.now() - CLOUD_BACKUP_KEEP_DAYS * 24 * 60 * 60 * 1000;
      const dels = [];
      qs.forEach((d) => {
        const dd = d.data() || {};
        if (Number(dd.ts) && Number(dd.ts) < cutoff) dels.push(d.ref.delete());
      });
      if (dels.length) await Promise.all(dels);
    } catch (e) { console.warn('[AUTOBACKUP] Lỗi dọn backup mây cũ', e); }
  }

  // Liệt kê backup mây (cho modal Admin)
  export async function listCloudBackups() {
    const db = (window.firebase && window.firebase.firestore) ? window.firebase.firestore() : null;
    if (!isFirebaseOnline() || !db) return [];
    const qs = await cloudBackupCol(db).get();
    const out = [];
    qs.forEach((d) => {
      const dd = d.data() || {};
      out.push({
        id: d.id,
        updatedBy: dd.updatedBy || '?',
        updatedAt: dd.updatedAt || '',
        size: (dd.payload && dd.payload.length) || 0
      });
    });
    out.sort((a, b) => b.id.localeCompare(a.id)); // mới nhất trước
    return out;
  }
  export async function restoreCloudBackup(id) {
    const db = (window.firebase && window.firebase.firestore) ? window.firebase.firestore() : null;
    if (!isFirebaseOnline() || !db) { showToast('Chưa online — không đọc được backup mây.', 'error'); return; }
    showToast('Đang tải backup mây ' + id + ' ...', 'info');
    try {
      const snap = await cloudBackupCol(db).doc(id).get();
      if (!snap.exists) { showToast('Không tìm thấy backup ' + id + ' trên mây.', 'error'); return; }
      const dd = snap.data() || {};
      let raw = '';
      if (dd.__fmt === 'gzip') raw = await gunzipBase64ToString(dd.payload || '');
      else raw = String(dd.payload || '');
      const remote = JSON.parse(raw);
      captureAutoBackup('Trước khi phục hồi backup mây ' + id, true);
      const changed = mergeRemoteIntoLocal(remote, false);
      showToast(changed
        ? 'Đã phục hồi backup mây ' + id + ' — gộp khéo, bản ghi mới hơn được giữ lại.'
        : 'Backup mây không có dữ liệu mới hơn hiện tại.', 'success');
    } catch (e) {
      console.warn('[AUTOBACKUP] Lỗi phục hồi backup mây', e);
      showToast('Lỗi phục hồi backup mây: ' + ((e && e.message) || e), 'error');
    }
  }

  // ─── ĐỊNH DẠNG THỜI GIAN / DUNG LƯỢNG ────────────────────────
  function fmtTs(iso) {
    const d = new Date(iso);
    if (isNaN(d)) return String(iso || '');
    const pad = (n) => String(n).padStart(2, '0');
    return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear()
      + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }
  function fmtSize(n) {
    if (!n) return '?';
    return n > 1024 * 1024 ? (n / 1024 / 1024).toFixed(1) + ' MB' : Math.round(n / 1024) + ' KB';
  }

  // ─── MODAL: BẢN CẤT TRÊN MÁY ──────────────────────────────────
  export function openAutoBackupModal() {
    renderAutoBackupList();
    document.getElementById('modal-autobackup')?.classList.add('show');
  }
  export function closeAutoBackupModal() {
    document.getElementById('modal-autobackup')?.classList.remove('show');
  }
  export function renderAutoBackupList() {
    const box = document.getElementById('autobackup-list');
    if (!box) return;
    const list = state.autoBackups || [];
    if (!list.length) {
      box.innerHTML = '<div style="text-align:center;color:var(--text-muted);font-size:0.85rem;padding:20px 0;">Chưa có bản cất nào trên máy này.</div>';
      return;
    }
    box.innerHTML = list.map((b) => (
      '<div class="autobackup-row">'
      + '<div class="ab-info">'
      + '<div class="ab-ts">' + escapeHTML(fmtTs(b.ts)) + '</div>'
      + '<div class="ab-meta">' + escapeHTML(b.by || '?')
      + (b.reason ? ' · ' + escapeHTML(b.reason) : '') + '</div>'
      + '</div>'
      + '<button type="button" class="btn btn-outline btn-sm" onclick="window.app.restoreAutoBackup(\'' + escapeHTML(b.ts) + '\')">Phục hồi</button>'
      + '<button type="button" class="btn btn-outline btn-sm ab-del" title="Xóa bản cất này" onclick="window.app.deleteAutoBackup(\'' + escapeHTML(b.ts) + '\')">✕</button>'
      + '</div>'
    )).join('');
  }

  // ─── MODAL: BẢN CẤT TRÊN MÂY ──────────────────────────────────
  export function openCloudBackupModal() {
    document.getElementById('modal-cloud-backup')?.classList.add('show');
    renderCloudBackupList();
  }
  export function closeCloudBackupModal() {
    document.getElementById('modal-cloud-backup')?.classList.remove('show');
  }
  export async function renderCloudBackupList() {
    const box = document.getElementById('cloudbackup-list');
    if (!box) return;
    box.innerHTML = '<div style="text-align:center;color:var(--text-muted);font-size:0.85rem;padding:20px 0;">Đang tải danh sách backup trên mây...</div>';
    try {
      const list = await listCloudBackups();
      if (!list.length) {
        box.innerHTML = '<div style="text-align:center;color:var(--text-muted);font-size:0.85rem;padding:20px 0;">Chưa có backup nào trên mây.<br>Backup tự được cất 1 lần/ngày, sau lần đẩy dữ liệu lên mây ĐẦU TIÊN trong ngày.</div>';
        return;
      }
      box.innerHTML = list.map((b) => (
        '<div class="autobackup-row">'
        + '<div class="ab-info">'
        + '<div class="ab-ts">' + escapeHTML(b.id) + '</div>'
        + '<div class="ab-meta">' + escapeHTML(b.updatedBy)
        + (b.updatedAt ? ' · ' + escapeHTML(fmtTs(b.updatedAt)) : '')
        + ' · ' + fmtSize(b.size) + '</div>'
        + '</div>'
        + '<button type="button" class="btn btn-outline btn-sm" onclick="window.app.restoreCloudBackup(\'' + escapeHTML(b.id) + '\')">Phục hồi</button>'
        + '</div>'
      )).join('');
      initLucide();
    } catch (e) {
      box.innerHTML = '<div style="text-align:center;color:var(--danger);font-size:0.85rem;padding:20px 0;">Lỗi tải backup mây: ' + escapeHTML(String((e && e.message) || e)) + '</div>';
    }
  }
