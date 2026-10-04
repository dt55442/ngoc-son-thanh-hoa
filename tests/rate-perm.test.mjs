// tests/rate-perm.test.mjs — CHỈ QUẢN TRỊ (ADMIN) ĐƯỢC CẬP NHẬT ĐỊNH MỨC
// + ĐỒNG BỘ ĐỊNH MỨC SANG MÁY KHÁC (lỗi "định mức – hiệu suất tab Công Đoạn
//   không cập nhật trên máy viewer"):
//   A. permissions.canEditRate() đúng vai trò · B. Chặn mọi handler định mức
//   C. Cấu trúc HTML/CSS (data-admin-only) · D. Tường lửa mây RATE_DOMAINS
//   E. Nhận mây: applyFireSnapshot đủ khóa + chọn bên mới hơn + cờ chờ đẩy
'use strict';
import fs from 'node:fs';

// ─── Stubs môi trường (giống cloud-delta.test.mjs) ────────────────
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
    getBoundingClientRect: () => ({ top: 0, left: 0, width: 800, height: 600, right: 800, bottom: 600 }),
    reset(){}, focus(){}, click(){}, animate(){ return { cancel(){} }; }
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
  addEventListener(){}, removeEventListener(){}, escapeCSS: (s) => s
};
global.location = { href: 'http://localhost:8080/', origin: 'http://localhost:8080', pathname: '/', search: '', hash: '', reload(){} };
global.history = { replaceState(){}, pushState(){}, back(){}, state: null };
Object.defineProperty(global, "navigator", { value: { onLine: true, userAgent: 'node-test', language: 'vi' }, configurable: true });
global.matchMedia = () => ({ matches: false, media: '', addListener(){}, removeListener(){}, addEventListener(){} });
const storeBacking = new Map();
global.localStorage = {
  getItem: (k) => (storeBacking.has(k) ? storeBacking.get(k) : null),
  setItem: (k, v) => { storeBacking.set(k, String(v)); },
  removeItem: (k) => { storeBacking.delete(k); },
  clear: () => storeBacking.clear(),
  key: (i) => [...storeBacking.keys()][i] ?? null,
  get length() { return storeBacking.size; }
};
global.addEventListener = () => {}; global.removeEventListener = () => {}; global.dispatchEvent = () => true;
global.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
global.cancelAnimationFrame = clearTimeout;
global.window = global; global.self = global;
global.alert = () => {}; global.confirm = () => true; global.prompt = () => '';
global.lucide = { createIcons(){} };
global.Chart = class {
  constructor(ctx, cfg) { this.ctx = ctx; this.config = cfg; this.data = (cfg && cfg.data) || { labels: [], datasets: [] }; }
  update(){} resize(){} destroy(){} render(){} reset(){} getDatasetMeta(){ return { data: [] }; }
};
Chart.register = () => {};
if (!global.URL.createObjectURL) global.URL.createObjectURL = () => 'blob:stub';
if (!global.URL.revokeObjectURL) global.URL.revokeObjectURL = () => {};
global.XLSX = {
  utils: { book_new: () => ({ SheetNames: [] }), aoa_to_sheet: () => ({}), json_to_sheet: () => ({}), book_append_sheet(){}, encode_cell: () => 'A1', decode_range: () => ({ s: { r: 0, c: 0 }, e: { r: 0, c: 0 } }) },
  writeFile(){}, write: () => new ArrayBuffer(8)
};
global.ResizeObserver = class { observe(){} unobserve(){} disconnect(){} };
global.Image = class { set src(_) {} addEventListener(){} };
global.fetch = async () => ({ ok: false, status: 0, statusText: 'offline-stub', json: async () => ({}), text: async () => '' });

// ─── IMPORT MODULES (sau khi stub xong) ───────────────────────────
const cloud = await import('../js/cloud.js');
const perms = await import('../js/permissions.js');
const { state, STORAGE_KEY_X2_CAP_RATE, STORAGE_KEY_QC_FINAL_RATE, STORAGE_KEY_X2_EP_VAN_RATE, STORAGE_KEY_MATERIAL_RATES } = await import('../js/state.js');
const x2 = await import('../js/xuong2.js');
const press = await import('../js/press.js');
const qcf = await import('../js/qc-final.js');
const planning = await import('../js/planning.js');

const ADMIN = { username: 'admin', role: 'admin', fullname: 'Quản Trị', email: 'a@b.c', editTabs: [], allowAdvanced: true };
const EDITOR_FULL = { username: 'ed', role: 'editor', fullname: 'Người Sửa', email: 'e@b.c', editTabs: ['kanban', 'planning', 'qc', 'press'], allowAdvanced: false };

// ─── KHUNG CHẠY TEST ──────────────────────────────────────────────
let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.error('  ✗ ' + name); }
}
const setVal = (id, v) => { document.getElementById(id).value = v; };
const run = (fn) => { try { fn(); } catch (e) { /* render stub — bỏ qua, phần logic đã chạy trước đó */ } };

// ─── A. QUYỀN canEditRate() ───────────────────────────────────────
console.log('--- A. QUYỀN CẬP NHẬT ĐỊNH MỨC ---');
state.currentUser = Object.assign({}, ADMIN);
check('A1: ADMIN → sửa được định mức', perms.canEditRate() === true);
state.currentUser = { username: 'ql', role: 'manager', fullname: 'Ban QL', editTabs: ['kanban', 'planning', 'qc', 'press'], allowAdvanced: true };
check('A2: MANAGER (kể cả được cấp đủ tab) → KHÔNG sửa được định mức', perms.canEditRate() === false);
state.currentUser = Object.assign({}, EDITOR_FULL);
check('A3: EDITOR được cấp 4 tab → vẫn KHÔNG sửa được định mức', perms.canEditRate() === false);
state.currentUser = { username: 'view', role: 'viewer', fullname: 'Người Xem', editTabs: [], allowAdvanced: false };
check('A4: VIEWER → false', perms.canEditRate() === false);
state.currentUser = null;
check('A5: khách (chưa đăng nhập) → false', perms.canEditRate() === false);

// ─── B. HANDLER LƯU / MỞ BẢNG ĐỊNH MỨC ──────────────────────────
console.log('--- B. CHẶN HANDLER ĐỊNH MỨC VỚI NON-ADMIN ---');
state.activeView = 'kanban-view';

// B1/B2 — Cắt Chọn (x2CapRates)
state.currentUser = Object.assign({}, EDITOR_FULL);
state.x2CapRates = { '2026-09': 3600 };
setVal('x2-rate-month', '2026-09'); setVal('x2-rate-value', '415');
run(() => x2.handleX2CapRateSave());
check('B1: editor KHÔNG lưu được định mức Cắt Chọn (state giữ 3.600)',
  state.x2CapRates['2026-09'] === 3600 &&
  JSON.parse(storeBacking.get(STORAGE_KEY_X2_CAP_RATE) || '{}')['2026-09'] !== 415);
state.currentUser = Object.assign({}, ADMIN);
run(() => x2.handleX2CapRateSave());
check('B2: ADMIN lưu được → 415 kg/h (state + localStorage)',
  state.x2CapRates['2026-09'] === 415 &&
  JSON.parse(storeBacking.get(STORAGE_KEY_X2_CAP_RATE) || '{}')['2026-09'] === 415);
cloud.clearPendingLocal();

// B3/B4 — Ép Ván (x2EpVanRates) — trước đây KHÔNG có gate nào
state.currentUser = Object.assign({}, EDITOR_FULL);
state.x2EpVanRates = { '2026-09': 0.06 };
setVal('x2-epv-rate-month', '2026-09'); setVal('x2-epv-rate-value', '0.09');
run(() => press.handleX2EpVanRateSave());
check('B3: editor KHÔNG lưu được định mức Ép Ván (trước đây không có gate)', state.x2EpVanRates['2026-09'] === 0.06);
state.currentUser = Object.assign({}, ADMIN);
run(() => press.handleX2EpVanRateSave());
check('B4: ADMIN lưu được định mức Ép Ván (0,09 m³/h)',
  state.x2EpVanRates['2026-09'] === 0.09 &&
  JSON.parse(storeBacking.get(STORAGE_KEY_X2_EP_VAN_RATE) || '{}')['2026-09'] === 0.09);
cloud.clearPendingLocal();

// B5/B6 — Định mức Kiểm Sau Sản Xuất (qcFinalRates)
state.currentUser = Object.assign({}, EDITOR_FULL);
state.qcFinalRates = { '2026-09': { thanh: 500, van: 600 } };
setVal('qcf-rate-2026-09-thanh', '700'); setVal('qcf-rate-2026-09-van', '800');
run(() => qcf.handleQcFinalRateRowSave('2026-09'));
check('B5: editor KHÔNG lưu được định mức kiểm QC',
  state.qcFinalRates['2026-09'].thanh === 500 && state.qcFinalRates['2026-09'].van === 600);
state.currentUser = Object.assign({}, ADMIN);
run(() => qcf.handleQcFinalRateRowSave('2026-09'));
check('B6: ADMIN lưu được định mức kiểm QC (700/800)',
  state.qcFinalRates['2026-09'].thanh === 700 && state.qcFinalRates['2026-09'].van === 800 &&
  JSON.parse(storeBacking.get(STORAGE_KEY_QC_FINAL_RATE) || '{}')['2026-09'].thanh === 700);
cloud.clearPendingLocal();

// B7/B8/B9 — ĐỊNH MỨC NGUYÊN VẬT LIỆU (tab Kế Hoạch)
state.currentUser = Object.assign({}, EDITOR_FULL);
state.materialRates = [];
setVal('mat-rate-id', ''); setVal('mat-rate-product', '1200x382x12');
setVal('mat-rate-nan1', 'nan-a'); setVal('mat-rate-nan1-qty', '1');
setVal('mat-rate-glue', '0.5'); setVal('mat-rate-additive', '0.1'); setVal('mat-rate-efficiency', '70');
run(() => planning.handleMaterialRateSubmit({ preventDefault() {} }));
check('B7: editor KHÔNG thêm được ĐỊNH MỨC NGUYÊN VẬT LIỆU', state.materialRates.length === 0);
state.currentUser = Object.assign({}, ADMIN);
run(() => planning.handleMaterialRateSubmit({ preventDefault() {} }));
check('B8: ADMIN thêm được định mức nguyên vật liệu',
  state.materialRates.length === 1 && state.materialRates[0].product === '1200x382x12' &&
  JSON.parse(storeBacking.get(STORAGE_KEY_MATERIAL_RATES) || '[]').length === 1);
run(() => planning.deleteMaterialRate(state.materialRates[0].id));
check('B9: ADMIN xóa được định mức (state rỗng)', state.materialRates.length === 0);
cloud.clearPendingLocal();

// B10/B11/B12 — MỞ BẢNG ĐỊNH MỨC
state.currentUser = Object.assign({}, EDITOR_FULL);
check('B10: editor KHÔNG mở được popup định mức Cắt',
  x2.openX2RatePopup('modal-x2-cut-rate') === false &&
  !document.getElementById('modal-x2-cut-rate').classList.contains('show'));
state.currentUser = Object.assign({}, ADMIN);
check('B11: ADMIN mở được popup định mức Cắt',
  x2.openX2RatePopup('modal-x2-cut-rate') === true &&
  document.getElementById('modal-x2-cut-rate').classList.contains('show'));
x2.closeX2RatePopup('modal-x2-cut-rate');
check('B12: ADMIN cũng mở được bảng định mức Kiểm QC', (() => {
  qcf.openQcFinalRateModal();
  const on = document.getElementById('modal-qcf-rate').classList.contains('show');
  qcf.closeQcFinalRateModal();
  return on;
})());

// ─── C. CẤU TRÚC HTML/CSS ─────────────────────────────────────────
console.log('--- C. CẤU TRÚC HTML/CSS ---');
const idxHtml = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const cssSrc = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
check('C1: CSS có rule ẩn nút với người KHÔNG phải admin',
  /body:not\(\.is-admin\)\s*\[data-admin-only\]/.test(cssSrc));
const RATE_BTN_IDS = ['btn-x2-cut-rate', 'btn-x2-blg-rate', 'btn-x2-ong-rate', 'btn-x2-bt-rate',
  'btn-x2-cn-rate', 'btn-x2-say-rate', 'btn-x2-btinh-rate', 'btn-x2-bl-rate',
  'btn-x2-epv-rate', 'btn-qcf-rate', 'btn-add-material-rate'];
check('C2: cả 11 nút "Định mức" trong index.html đều gắn data-admin-only',
  RATE_BTN_IDS.every(id => new RegExp(`id="${id}"[^>]*data-admin-only`).test(idxHtml)));
check('C3: các nút LƯU trong popup định mức cũng gắn data-admin-only',
  ['btn-x2-rate-save', 'btn-x2-blg-rate-save', 'btn-x2-ong-rate-save', 'btn-x2-bt-rate-save',
    'btn-x2-cn-rate-save', 'btn-x2-epv-rate-save', 'btn-x2-bl-rate-save',
    'btn-qcf-rate-add-month', 'btn-x2-btinh-rate-add-month', 'btn-x2sr-add-month'
  ].every(id => new RegExp(`id="${id}"[^>]*data-admin-only`).test(idxHtml)));
const x2Src = fs.readFileSync(new URL('../js/xuong2.js', import.meta.url), 'utf8');
const qcfSrc = fs.readFileSync(new URL('../js/qc-final.js', import.meta.url), 'utf8');
const plSrc = fs.readFileSync(new URL('../js/planning.js', import.meta.url), 'utf8');
check('C4: nút render động trong JS cũng gắn data-admin-only',
  x2Src.includes('data-x2sr-save="${escapeHTML(m)}" data-admin-only') &&
  qcfSrc.includes('data-qcf-rate-save="${m}" data-admin-only') &&
  plSrc.includes('data-perm="planning" data-admin-only'));

// ─── D. TƯỜNG LƯA MÂY + CỔNG QUYỀN ───────────────────────────────
console.log('--- D. TƯỜNG LƯA ĐỊNH MỨC TRÊN MÂY ---');
const cloudSrc = fs.readFileSync(new URL('../js/cloud.js', import.meta.url), 'utf8');
check('D1: RATE_DOMAINS = 11 miền định mức (materialRates + QC + 9 định mức Xưởng 2)',
  cloud.RATE_DOMAINS.size === 11 && cloud.RATE_DOMAINS.has('materialRates') &&
  cloud.RATE_DOMAINS.has('qcFinalRates') && cloud.RATE_DOMAINS.has('x2CapRates') &&
  cloud.RATE_DOMAINS.has('x2EpVanRates') && cloud.RATE_DOMAINS.has('x2BulligRates') &&
  !cloud.RATE_DOMAINS.has('x2StageIncidents') && !cloud.RATE_DOMAINS.has('x2SayTimes'));
check('D2: máy KHÔNG có quyền sửa định mức → che miền định mức trước khi đẩy',
  /if \(!canEditRate\(\)\)/.test(cloudSrc) && /shieldRateDomainsForPush\(snap\)/.test(cloudSrc));
check('D3: có cổng requireRatePermission + permissions.canEditRate',
  /function requireRatePermission/.test(cloudSrc) &&
  /export function canEditRate\(\)/.test(fs.readFileSync(new URL('../js/permissions.js', import.meta.url), 'utf8')));
check('D4: 4 module lưu định mức đều import requireRatePermission',
  ['xuong2', 'press', 'qc-final', 'planning'].every(f => {
    const s = fs.readFileSync(new URL(`../js/${f}.js`, import.meta.url), 'utf8');
    return /import \{[^}]*requireRatePermission[^}]*\} from '\.\/cloud\.js'/.test(s);
  }));
const gateCount = ['xuong2', 'press', 'qc-final', 'planning'].reduce((n, f) =>
  n + (fs.readFileSync(new URL(`../js/${f}.js`, import.meta.url), 'utf8').match(/requireRatePermission\(\)/g) || []).length, 0);
check('D5: đủ điểm chặn requireRatePermission trong 4 module (≥ 17)', gateCount >= 17);

// ─── E. NHẬN MÂY: ĐỦ KHÓA + CHỌN BÊN MỚI HƠN ───────────────────
console.log('--- E. ĐỒNG BỘ ĐỊNH MỨC KHI NHẬN MÂY ---');
cloud.clearPendingLocal();
// E1–E5: applyFireSnapshot (nút "Tải Từ Mây Về Máy") — nhóm khóa TRƯỚC ĐÂY BỊ THIẾU
state.x2CapRates = { '2026-09': 111 };
state.xuong2CutRecords = [];
state.suppliers = [];
state.x2LotLocations = ['LS1'];
state.x2BaoThanhOutSizes = [];
cloud.applyFireSnapshot({
  deletedIds: {},
  x2CapRates: { '2026-09': 3600, '2026-10': 500 },
  x2EpVanRates: { '2026-09': 0.06 },
  x2BoluongRates: { '2026-09': 900 }, x2BoOngRates: { '2026-09': 1512 },
  x2BaoThoRates: { '2026-09': 800 }, x2ChonNanRates: { '2026-09': 800 },
  x2BaoTinhRates: { '2026-09': { tinh: 711, ha_cap: 600, bao_thanh: 650 } },
  x2SayRates: { s1: { '2026-09': { van: { phut: 130 } } }, s2: {} },
  x2BulligRates: { gc: { '2026-09': 100 }, ct: { '2026-09': 200 } },
  x2SayTimes: { '2026-09-10|say1': 2 }, x2SayIncidents: { '2026-09-10': 1 },
  x2StageIncidents: { 'cut|2026-09-10': 1.5 },
  xuong2CutRecords: [{ id: 'cut-x', date: '2026-09-10', updatedAt: '2026-09-10T02:00:00.000Z' }],
  suppliers: [{ id: 'sup-x', name: 'Nhà Tế', createdAt: '2026-09-01T00:00:00.000Z' }],
  x2LotLocations: ['LS1', 'Lò 16'], x2BaoThanhOutSizes: ['640x14x12']
});
check('E1: "Tải Mây Về Máy" cập nhật ĐỊNH MỨC (mây thắng theo tháng)',
  state.x2CapRates['2026-09'] === 3600 && state.x2CapRates['2026-10'] === 500 &&
  state.x2EpVanRates['2026-09'] === 0.06 && state.x2BoluongRates['2026-09'] === 900 &&
  state.x2BoOngRates['2026-09'] === 1512 && state.x2BaoThoRates['2026-09'] === 800 &&
  state.x2ChonNanRates['2026-09'] === 800 && state.x2BaoTinhRates['2026-09'].tinh === 711 &&
  state.x2SayRates.s1['2026-09'].van.phut === 130 && state.x2BulligRates.gc['2026-09'] === 100 &&
  state.x2BulligRates.ct['2026-09'] === 200);
check('E2: "Tải Mây Về Máy" cập nhật GIỜ SỰ CỐ + SỐ LẦN TH',
  state.x2StageIncidents['cut|2026-09-10'] === 1.5 && state.x2SayIncidents['2026-09-10'] === 1 &&
  state.x2SayTimes['2026-09-10|say1'] === 2);
check('E3: "Tải Mây Về Máy" cập nhật NHẬT KÝ XƯỞNG 2 + NHÀ CUNG',
  (state.xuong2CutRecords || []).some(r => r.id === 'cut-x') &&
  (state.suppliers || []).some(s => s.id === 'sup-x'));
check('E4: "Tải Mây Về Máy" gộp vị trí sấy + cỡ đầu ra (không mất cái máy có)',
  state.x2LotLocations.includes('LS1') && state.x2LotLocations.includes('Lò 16') &&
  state.x2BaoThanhOutSizes.includes('640x14x12'));
check('E5: đã ghi xuống localStorage (giữ nguyên sau khi tải lại trang)',
  JSON.parse(storeBacking.get(STORAGE_KEY_X2_CAP_RATE) || '{}')['2026-09'] === 3600);

// E6: đồng bộ TỰ ĐỘNG — mây thắng khi máy KHÔNG có bản sửa chờ đẩy
cloud.clearPendingLocal();
state.x2CapRates = { '2026-11': 111 };
cloud.mergeRemoteIntoLocal({ x2CapRates: { '2026-11': 999, '2026-12': 222 } }, true, true);
check('E6: nhận mây tự động → ĐỊNH MỨC THEO MÂY (bản cũ "máy thắng" không cập nhật)',
  state.x2CapRates['2026-11'] === 999 && state.x2CapRates['2026-12'] === 222);

// E7/E8: đang có bản sửa CHƯA lên mây → GIỮ máy (sửa offline không bị mất)
state.x2CapRates = { '2026-11': 111 };
cloud.markPendingLocal();
cloud.mergeRemoteIntoLocal({ x2CapRates: { '2026-11': 999 } }, true, true);
check('E7: có bản sửa CHƯA đẩy → giữ giá trị máy', state.x2CapRates['2026-11'] === 111);
check('E8: cờ "chờ đẩy" được LƯU XUỐNG MÁY (nhớ cả sau khi tải lại trang)',
  storeBacking.get('bamboo_tracker_cloud_pending_v1') === '1');
cloud.clearPendingLocal();
check('E9: đẩy/xoá cờ thành công → xoá khỏi localStorage', !storeBacking.has('bamboo_tracker_cloud_pending_v1'));

// E10: đường gộp TRƯỚC KHI ĐẨY / phục hồi backup vẫn "máy thắng" như cũ
state.x2CapRates = { '2026-11': 111 };
cloud.mergeRemoteIntoLocal({ x2CapRates: { '2026-11': 999 } }, true);
check('E10: gộp trước khi đẩy (không truyền cờ) → vẫn giữ máy', state.x2CapRates['2026-11'] === 111);

// E11: tab Kế Hoạch (dự báo/tồn kho) giờ cũng nhận từ mây khi đồng bộ tự động
state.planningForecast = { 2026: { a: 1 } };
cloud.mergeRemoteIntoLocal({ planningForecast: { 2026: { a: 2 }, 2027: { b: 9 } } }, true, true);
check('E11: DỰ BÁO kế hoạch nhận từ mây (đã gỡ nhánh chặn cũ)',
  state.planningForecast['2026'].a === 2 && state.planningForecast['2027'].b === 9);

// E12: cấu trúc nguồn — 2 chỗ NHẬN mây bật "mây thắng", chỗ gộp trước khi đẩy KHÔNG bật
check('E12: nhận mây (full + delta) bật "mây thắng"; gộp trước khi đẩy KHÔNG bật',
  (cloudSrc.match(/mergeRemoteIntoLocal\([^)]*, true, true\)/g) || []).length === 2 &&
  /mergeRemoteIntoLocal\(full, true\)/.test(cloudSrc));

console.log('\nKết quả: ' + pass + ' pass, ' + fail + ' fail');
process.exit(fail ? 1 : 0);
