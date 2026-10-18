// tests/sync-hardening.test.mjs — GÓI 1+2+3 (18/10/2026 — quy tắc 73)
// Mục đích: khoá các hành vi CHỐNG LỆCH SỐ LIỆU giữa các máy:
//   A. Hợp dấu vết xoá (tombstone) — KHÔNG ghi đè bản của máy khác.
//   B. "Chưa có base" ⇒ coi mọi bản ghi là CHƯA ĐẨY (không mất lớp bảo vệ).
//   C. Danh sách việc chưa lên mây ở mức TỪNG bản ghi + chấm vàng + banner SỔ CÁI.
//   D. Chính sách ghi 3 tầng (offline/warn/online) — phiếu kho = warn (chốt 18/10).
//   E. Khoá mềm khi sửa (60 giây) — biết người khác đang sửa.
//   F. Cấu trúc: phiên bản hiển thị · SW no-store · quyền BQL thấy xung đột · rules.
'use strict';
import fs from 'node:fs';

function makeEl(id) {
  const el = {
    id: id || '', value: '', checked: false, disabled: false, hidden: false,
    open: true, textContent: '', innerHTML: '', style: {}, dataset: {}, _h: {},
    offsetWidth: 800, offsetHeight: 500,
    classList: { _s: new Set(), add(c){ this._s.add(c); }, remove(c){ this._s.delete(c); }, toggle(c, f){ if (f === undefined) f = !this._s.has(c); if (f) this._s.add(c); else this._s.delete(c); return f; }, contains(c){ return this._s.has(c); } },
    addEventListener(t, f) { (el._h[t] = el._h[t] || []).push(f); },
    appendChild(c) { return c; }, removeChild(c) { return c; },
    remove(){}, setAttribute(){}, removeAttribute(){}, getAttribute: () => null,
    querySelector: () => makeEl(), querySelectorAll: () => [],
    closest: () => null, matches: () => false,
    getContext: () => ({ measureText: () => ({ width: 10 }), createLinearGradient: () => ({ addColorStop(){} }), createRadialGradient: () => ({ addColorStop(){} }), drawImage(){} }),
    getBoundingClientRect: () => ({ top: 0, left: 0, right: 800, bottom: 600, width: 800, height: 600 }),
    reset(){}, focus(){}, click(){}
  };
  return el;
}
const els = new Map();
global.document = {
  body: makeEl('body'), head: makeEl('head'), documentElement: makeEl('html'),
  activeElement: null, readyState: 'complete', visibilityState: 'visible',
  getElementById(id) { if (!els.has(id)) els.set(id, makeEl(id)); return els.get(id); },
  createElement: () => makeEl(), createTextNode: (t) => ({ textContent: t }),
  querySelector: () => makeEl(), querySelectorAll: () => [],
  addEventListener(){}, removeEventListener(){}
};
global.location = { href: 'http://localhost/', origin: 'http://localhost', reload(){} };
Object.defineProperty(global, 'navigator', { value: { onLine: true, userAgent: 'node-test' }, configurable: true });
global.matchMedia = () => ({ matches: false, addListener(){}, addEventListener(){} });
const store = new Map();
global.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => { store.set(k, String(v)); },
  removeItem: (k) => { store.delete(k); },
  clear: () => store.clear(),
  key: (i) => [...store.keys()][i] ?? null,
  get length() { return store.size; }
};
global.addEventListener = () => {}; global.removeEventListener = () => {}; global.dispatchEvent = () => true;
global.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
global.cancelAnimationFrame = clearTimeout;
global.window = global; global.self = global;
global.alert = () => {}; global.confirm = () => true; global.prompt = () => '';
global.lucide = { createIcons(){} };

const { state } = await import('../js/state.js');
const cloud = await import('../js/cloud.js');
const read = (p) => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; console.log('PASS ' + name); }
  else { fail++; console.log('FAIL ' + name); }
}

// ─── A. HỢP TOMBSTONE ──────────────────────────────────────────
const m = cloud.mergeTombMaps(
  { batches: { a: '2026-10-01T00:00:00.000Z', b: '2026-10-05T00:00:00.000Z' } },
  { batches: { a: '2026-10-03T00:00:00.000Z', c: '2026-10-04T00:00:00.000Z' }, khoNotes: { k1: '2026-10-02T00:00:00.000Z' } }
);
check('A1: HỢP tombstone — giữ id của CẢ 2 phía (a,b của mây + c của máy)',
  Object.keys(m.batches).sort().join(',') === 'a,b,c');
check('A2: mốc MUỘN HƠN thắng khi cùng id (a = 03/10 chứ không phải 01/10)',
  m.batches.a === '2026-10-03T00:00:00.000Z');
check('A3: giữ cả miền khác (khoNotes)', !!m.khoNotes && m.khoNotes.k1 === '2026-10-02T00:00:00.000Z');
const cloudSrc = read('js/cloud.js');
check('A4: đường ĐẨY delta ghi tombstone ĐÃ HỢP (không còn deletedIds: snap.deletedIds)',
  cloudSrc.includes('deletedIds: mergedTomb') && !/^\s*deletedIds: snap\.deletedIds/m.test(cloudSrc));
check('A5: transaction cũng hợp tombstone của mục lục mây',
  /mergeTombMaps\(idx\.deletedIds, snap\.deletedIds\)/.test(cloudSrc));

// ─── B. CHƯA CÓ BASE ⇒ MỌI BẢN GHI LÀ CHƯA ĐẨY ────────────────
localStorage.removeItem(cloud.SYNC_STATE_KEY);
const st = cloud.loadSyncState();
st.base = {}; st.conflicts = []; st.lastRev = -1; st.pendingSince = 0;
state.batches = [{ id: 'b1', quantity: 10, createdAt: '2026-10-01T00:00:00.000Z' }];
const d0 = cloud.dirtyDomains();
check('B1: chưa có base ⇒ bản ghi hiện có VẪN là "chưa đẩy" (bảo vệ)',
  !!d0.batches && d0.batches.ids.join(',') === 'b1');
cloud.captureSyncBase();
check('B2: sau captureSyncBase → hết dirty', !cloud.dirtyDomains().batches);
state.batches[0].quantity = 12;
check('B3: sửa số lượng (không đổi updatedAt) → phát hiện dirty',
  cloud.dirtyDomains().batches.ids.join(',') === 'b1');

// ─── C. PANEL "VIỆC CHƯA LÊN MÂY" + BANNER SỔ CÁI ─────────────
state.currentUser = { email: 'a@b.c', fullname: 'A', role: 'admin' };
const pend = cloud.pendingRecords();
check('C1: pendingRecords liệt kê TỪNG bản ghi (miền + id)',
  pend.some(p => p.domain === 'batches' && p.id === 'b1'));
check('C2: isRecordPending / pendingMarkHtml cho đúng bản ghi',
  cloud.isRecordPending('batches', 'b1') === true &&
  cloud.pendingMarkHtml('batches', 'b1').includes('sync-rec-pending') &&
  cloud.pendingMarkHtml('batches', 'khong-co') === '');
// Sổ cái: 1 phiếu kho chưa đẩy là banner ĐỎ hiện NGAY (không chờ ngưỡng 50)
state.khoNotes = [{ id: 'k1', qty: 5, date: '2026-10-18', status: 'cho_duyet' }];
cloud.captureSyncBase();
state.khoNotes[0].qty = 6;
// Lưu dữ liệu thật → firePushSync gọi markPendingLocal (xoá cache + ghi mốc chờ)
cloud.markPendingLocal();
cloud.updateSyncPendingBanner();
const banner = document.getElementById('sync-pending-banner');
check('C3: banner hiện NGAY khi có phiếu kho chưa lên mây + tô ĐỎ (is-core)',
  banner.hidden === false && banner.classList.contains('is-core'));
check('C4: nội dung banner nói rõ SỔ CÁI + cảnh báo đừng duyệt trùng máy khác',
  document.getElementById('sync-pending-banner-text').textContent.includes('SỔ CÁI'));
// Đẩy xong (clearPendingLocal xoá cache + mốc chờ) → banner phải TẮT
state.khoNotes[0].qty = 5; cloud.captureSyncBase(); cloud.clearPendingLocal();
cloud.updateSyncPendingBanner();
check('C5: hết việc chờ đẩy → banner TẮT', document.getElementById('sync-pending-banner').hidden === true);

// ─── D. CHÍNH SÁCH GHI 3 TẦNG ─────────────────────────────────
check('D1: phiếu kho + kiểm kê = warn (CHỐT 18/10: không chặn, chỉ cảnh báo)',
  cloud.DOMAIN_POLICY.khoNotes === 'warn' && cloud.DOMAIN_POLICY.x2Stocktakes === 'warn');
check('D2: định mức/kế hoạch = warn',
  cloud.DOMAIN_POLICY.materialRates === 'warn' && cloud.DOMAIN_POLICY.planningItems === 'warn');
check('D3: miền chưa khai = offline (lượt sản xuất, chấm công… ghi bình thường)',
  cloud.domainPolicyOf('xuong2CutRecords') === 'offline');
const okLocal = await cloud.requireOnlineWrite('khoNotes', 'phiếu kho');
check('D4: chưa bật Firebase (chạy cục bộ) → vẫn cho ghi', okLocal === true);

// ─── E. KHOÁ MỀM KHI SỬA ─────────────────────────────────────
const rec = { id: 'k2', qty: 1 };
check('E1: máy này nhận khoá', cloud.claimEditLock(rec) === true && !!cloud.editLockOf(rec));
rec.editLock = { by: 'nguoi-khac@x', name: 'Người Khác', at: Date.now() };
global.confirm = () => false;
check('E2: người khác đang sửa + người dùng HUỶ → KHÔNG lấy khoá',
  cloud.claimEditLock(rec) === false);
global.confirm = () => true;
check('E3: người dùng ĐỒNG Ý ghi đè → lấy được khoá', cloud.claimEditLock(rec) === true);
check('E4: cảnh báo HTML nêu tên người đang sửa', cloud.editLockWarnHtml(rec).includes('đang sửa'));
rec.editLock = { by: 'x', name: 'X', at: Date.now() - 120000 };
check('E5: khoá quá 60 giây tự hết hiệu lực', cloud.editLockOf(rec) === null);
cloud.releaseEditLock(rec);
check('E6: release xoá khoá', !rec.editLock);

// ─── F. CẤU TRÚC ──────────────────────────────────────────────
const idxSrc = read('index.html');
const cssSrc = read('styles.css');
const evSrc = read('js/events.js');
const swSrc = read('sw.js');
const rulesSrc = read('firestore.rules');
const stSrc = read('js/state.js');
const x2Src = read('js/xuong2.js');
const ver = (stSrc.match(/APP_VERSION\s*=\s*'(v\d+)'/) || [])[1];
const cache = (swSrc.match(/CACHE_NAME\s*=\s*'nha-may-ngoc-son-(v\d+)'/) || [])[1];
check('F1: số phiên bản hiển thị KHỚP CACHE_NAME sw.js (' + ver + ')', !!ver && ver === cache);
check('F2: menu ⋮ có Việc Chưa Lên Mây + Tải Lại Bản Mới Nhất + số phiên bản',
  idxSrc.includes('id="btn-pending-list"') && idxSrc.includes('id="btn-hard-reload"') &&
  idxSrc.includes('id="app-version-label"'));
check('F3: có banner ghi tạm + modal danh sách việc chưa lên mây',
  idxSrc.includes('id="sync-pending-banner"') && idxSrc.includes('id="modal-pending-list"'));
check('F4: SW đọc mã ứng dụng bằng no-store (không dính HTTP cache GitHub Pages)',
  /fetch\(request, \{ cache: 'no-store' \}\)/.test(swSrc));
check('F5: sổ XUNG ĐỘT mở cho Ban Quản Lý (data-manager-only) + CSS',
  idxSrc.includes('id="btn-sync-conflicts" data-manager-only') &&
  cssSrc.includes('body:not(.is-manager):not(.is-admin) [data-manager-only]'));
check('F6: events.js nối 4 nút mới + Esc đóng panel',
  evSrc.includes("'btn-pending-list'") && evSrc.includes("'btn-hard-reload'") &&
  evSrc.includes("'sync-pending-banner-btn'") && evSrc.includes("'btn-pending-sync'"));
check('F7: CSS có banner + panel + chấm vàng + khoá mềm',
  cssSrc.includes('.sync-pending-banner') && cssSrc.includes('.pending-card') &&
  cssSrc.includes('.sync-rec-pending') && cssSrc.includes('.sync-edit-lock'));
check('F8: xuong2.js cảnh báo khi lưu/duyệt phiếu kho + khoá mềm + chấm vàng',
  x2Src.includes("warnOfflineWrite('khoNotes'") && x2Src.includes('claimEditLock(n)') &&
  x2Src.includes("pendingMarkHtml('khoNotes', n.id)"));
check('F9: firestore.rules KHÔNG còn đọc công khai apps/*',
  !/allow read: if true;/.test(rulesSrc) && /allow read: if isSignedIn\(\);/.test(rulesSrc));

console.log('\n=== KẾT QUẢ SYNC-HARDENING: ' + pass + ' PASS / ' + fail + ' FAIL ===');
if (fail) process.exitCode = 1;
