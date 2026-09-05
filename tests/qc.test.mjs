// tests/qc.test.mjs — Kiểm thử tab QC (Bảng Xuất Hàng) + cột Số Lượng Xuất
// trong biểu đồ Kế Hoạch vs Đã Ép.
// Bao phủ: load/save, render bảng + dòng tổng, modal thêm dòng (thành phẩm
// trong kế hoạch & ngoài danh sách), validate, sửa inline, điền nhanh tuần
// cho cả danh sách, xóa dòng, phân quyền, dữ liệu biểu đồ, đồng bộ mây.
'use strict';

// ─── Stubs môi trường (giống export-tabs.test.mjs) ────────────────
function makeEl(id) {
  const el = {
    id: id || '', value: '', checked: false, disabled: false, hidden: false,
    open: true, textContent: '', innerHTML: '', style: {}, dataset: {}, _h: {},
    offsetWidth: 800, offsetHeight: 500,
    classList: { _s: new Set(), add(c){ this._s.add(c); }, remove(c){ this._s.delete(c); }, toggle(c, f){ if (f === undefined) f = !this._s.has(c); if (f) this._s.add(c); else this._s.delete(c); return f; }, contains(c){ return this._s.has(c); } },
    addEventListener(t, f) { (el._h[t] = el._h[t] || []).push(f); },
    appendChild(c) { return c; }, removeChild(c) { return c; },
    remove(){}, setAttribute(){}, getAttribute: () => null,
    querySelector: () => makeEl(), querySelectorAll: () => [],
    closest: () => null, matches: () => false,
    getContext: () => ({ measureText: () => ({ width: 10 }), createLinearGradient: () => ({ addColorStop(){} }), createRadialGradient: () => ({ addColorStop(){} }), drawImage(){} }),
    getBoundingClientRect: () => ({ top: 0, left: 0, right: 800, bottom: 600, width: 800, height: 600 }),
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

let passed = 0, failed = 0;
function check(name, cond) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.error('FAIL ' + name); }
}

// ─── IMPORT MODULES (sau khi stub xong) ───────────────────────────
const { state, STORAGE_KEY_QC_EXPORTS } = await import('../js/state.js');
const qc = await import('../js/qc.js');
const press = await import('../js/press.js');
const cloud = await import('../js/cloud.js');
const perms = await import('../js/permissions.js');

const ev = { preventDefault(){} };
function setVal(id, v) { const el = document.getElementById(id); el.value = v; return el; }
function modalShown(id) { return document.getElementById(id).classList._s.has('show'); }
const approx = (a, b) => Math.abs(a - b) < 1e-9;

// ─── DỮ LIỆU GIẢ ──────────────────────────────────────────────
state.currentUser = { username: 'admin', role: 'admin', editTabs: [], allowAdvanced: true };

state.materialRates = [
  { id: 'rate-1', product: 'Ván 1200x382x9' },
  { id: 'rate-2', product: 'Ván 1200x382x12' }
];

state.planningItems = [
  { year: 2026, week: 'Tuần 33', productId: 'rate-2', qty: 100 },
  { year: 2026, week: 'Tuần 10', productId: 'rate-1', qty: 50 }
];

// ─── A. LOAD / SAVE ───────────────────────────────────────────
qc.loadQcExports();
check('QC: load khi chưa có dữ liệu -> mảng rỗng', Array.isArray(state.qcExports) && state.qcExports.length === 0);

storeBacking.set(STORAGE_KEY_QC_EXPORTS, JSON.stringify([
  { id: 'qc-x', productId: 'rate-1', name: '', week: 'Tuần 33', qty: 10, note: '' }
]));
qc.loadQcExports();
check('QC: load từ localStorage + tự điền năm thiếu', state.qcExports.length === 1 && state.qcExports[0].year === new Date().getFullYear());

// ─── B. RENDER BẢNG ───────────────────────────────────────────
qc.renderQcView();
const tbodyEl = document.getElementById('qc-table-body');
check('QC: toolbar điền nhanh tuần có 53 tuần', (document.getElementById('qc-quick-week').innerHTML.match(/<option/g) || []).length === 53);
check('QC: bảng hiển thị tên hàng tra từ định mức', tbodyEl.innerHTML.includes('Ván 1200x382x9'));

state.qcExports.push({ id: 'qc-custom', productId: null, name: 'Hàng mẫu khách B', week: 'Tuần 33', year: 2026, qty: 5, note: '' });
qc.renderQcTable();
check('QC: dòng ngoài danh sách có nhãn "ngoài kế hoạch"', tbodyEl.innerHTML.includes('ngoài kế hoạch') && tbodyEl.innerHTML.includes('Hàng mẫu khách B'));
check('QC: dòng tổng hiển thị đúng (10 + 5 = 15)', document.getElementById('qc-table-foot').innerHTML.includes('15'));

// ─── C. MODAL THÊM DÒNG ───────────────────────────────────────
qc.openQcExportModal();
const prodSel = document.getElementById('qc-product');
check('QC: mở modal thành công', modalShown('modal-qc-export'));
check('QC: select thành phẩm lấy từ kế hoạch (rate-1)', prodSel.innerHTML.includes('rate-1') && prodSel.innerHTML.includes('Ván 1200x382x9'));
check('QC: có lựa chọn thêm ngoài danh sách', prodSel.innerHTML.includes('__custom__'));
check('QC: select tuần của modal có 53 tuần + mục rỗng', (document.getElementById('qc-week').innerHTML.match(/<option/g) || []).length === 54);

setVal('qc-product', '__custom__');
qc.onQcProductChange();
check('QC: chọn ngoài danh sách -> hiện ô nhập tên mới', document.getElementById('qc-custom-name-group').style.display === '' && document.getElementById('qc-custom-name').required === true);
setVal('qc-product', '');
qc.onQcProductChange();
check('QC: bỏ chọn -> ẩn ô nhập tên mới', document.getElementById('qc-custom-name-group').style.display === 'none');

// ─── D. SUBMIT: thành phẩm trong kế hoạch ─────────────────────
const beforeSubmit = state.qcExports.length;
setVal('qc-product', 'rate-1'); setVal('qc-year', '2026'); setVal('qc-week', '33');
setVal('qc-qty', '25'); setVal('qc-note', '  gấp  ');
qc.handleQcExportSubmit(ev);
const added = state.qcExports[state.qcExports.length - 1];
check('QC: submit từ danh sách -> thêm đúng 1 dòng', state.qcExports.length === beforeSubmit + 1);
check('QC: dòng mới đủ trường (tên/mã/tuần/năm/SL/ghi chú)', added.productId === 'rate-1' && added.name === 'Ván 1200x382x9' && added.week === 'Tuần 33' && added.year === 2026 && added.qty === 25 && added.note === 'gấp');
check('QC: đóng modal sau khi thêm', !modalShown('modal-qc-export'));

// ─── E. SUBMIT: thành phẩm ngoài danh sách ────────────────────
setVal('qc-product', '__custom__'); qc.onQcProductChange();
setVal('qc-custom-name', 'Đơn lẻ khách C'); setVal('qc-year', '2026'); setVal('qc-week', '34');
setVal('qc-qty', '7'); setVal('qc-note', '');
qc.handleQcExportSubmit(ev);
const custom = state.qcExports[state.qcExports.length - 1];
check('QC: thêm thành phẩm ngoài danh sách -> lưu tên + không có mã', custom.productId === null && custom.name === 'Đơn lẻ khách C' && custom.week === 'Tuần 34' && custom.qty === 7);

// ─── F. VALIDATE ──────────────────────────────────────────────
let n = state.qcExports.length;
setVal('qc-product', 'rate-1'); setVal('qc-year', '2026'); setVal('qc-week', '33'); setVal('qc-qty', '0');
qc.handleQcExportSubmit(ev);
check('QC: chặn số lượng <= 0', state.qcExports.length === n);
setVal('qc-qty', '10'); setVal('qc-week', '');
qc.handleQcExportSubmit(ev);
check('QC: chặn thiếu tuần', state.qcExports.length === n);
setVal('qc-week', '33'); setVal('qc-product', '__custom__'); qc.onQcProductChange(); setVal('qc-custom-name', '   ');
qc.handleQcExportSubmit(ev);
check('QC: chặn thành phẩm ngoài danh sách thiếu tên', state.qcExports.length === n);

// ─── G. SỬA TRỰC TIẾP TRÊN BẢNG ───────────────────────────────
qc.updateQcExportRow(added.id, 'qty', '55');
check('QC: sửa số lượng trực tiếp', added.qty === 55);
qc.updateQcExportRow(added.id, 'week', '34');
check('QC: sửa tuần trực tiếp -> "Tuần 34"', added.week === 'Tuần 34');
qc.updateQcExportRow(added.id, 'note', '  đã xuất  ');
check('QC: sửa ghi chú trực tiếp (cắt khoảng trắng)', added.note === 'đã xuất');
const persisted = JSON.parse(storeBacking.get(STORAGE_KEY_QC_EXPORTS));
check('QC: sửa dòng được ghi xuống localStorage', persisted.some(r => r.id === added.id && r.qty === 55));

// ─── H. ĐIỀN NHANH TUẦN CHO CẢ DANH SÁCH ─────────────────────
setVal('qc-quick-week', '36'); setVal('qc-quick-year', '2026');
qc.applyQcWeekToAll();
check('QC: điền nhanh áp dụng tuần + năm cho TẤT CẢ các dòng', state.qcExports.every(r => r.week === 'Tuần 36' && r.year === 2026));

// ─── I. XÓA DÒNG ──────────────────────────────────────────────
n = state.qcExports.length;
qc.deleteQcExport(added.id);
check('QC: xóa dòng khỏi danh sách', state.qcExports.length === n - 1 && !state.qcExports.some(r => r.id === added.id));

// ─── J. PHÂN QUYỀN ────────────────────────────────────────────
state.currentUser = { username: 'view', role: 'viewer', editTabs: [], allowAdvanced: false };
check('QC: viewer không có quyền sửa tab QC', perms.canEditTab('qc') === false);
qc.renderQcTable();
check('QC: input bảng bị khóa với người không đủ quyền', document.getElementById('qc-table-body').innerHTML.includes('disabled'));
state.currentUser = { username: 'admin', role: 'admin', editTabs: [], allowAdvanced: true };

// ─── K. BIỂU ĐỒ KẾ HOẠCH vs ĐÃ ÉP + CỘT SỐ LƯỢNG XUẤT ─────────
state.pressRecords = [
  { date: '2026-08-10', week: '2026-W33', productId: 'rate-1', fpDim: '1220x2440x9',  finishedQty: 40, vanTho: [], sticks: [] },
  { date: '2026-08-11', week: '2026-W33', productId: 'rate-2', fpDim: '1220x2440x12', finishedQty: 25, vanTho: [], sticks: [] }
];
state.qcExports = [
  { id: 'q1', productId: 'rate-1', name: 'Ván 1200x382x9',  week: 'Tuần 33', year: 2026, qty: 30, note: '' },
  { id: 'q2', productId: null,     name: 'Ván 1200x382x12', week: 'Tuần 33', year: 2026, qty: 12, note: 'khớp theo tên' },
  { id: 'q3', productId: 'rate-1', name: 'Ván 1200x382x9',  week: 'Tuần 33', year: 2025, qty: 999, note: 'năm khác -> loại' },
  { id: 'q4', productId: null,     name: 'Hàng lạ không khớp mã', week: 'Tuần 33', year: 2026, qty: 50, note: 'bỏ qua' }
];
state.planVsPressYear = '2026';
state.planVsPressWeek = 33;
press.renderPlanVsPressChart();
const chart = state.planVsPressInstance;
const unitVol1 = (1200 * 382 * 9) / 1e9;
const unitVol2 = (1200 * 382 * 12) / 1e9;
check('Biểu đồ: có 3 bộ dữ liệu (Kế Hoạch / Đã Ép / Số Lượng Xuất)', chart.data.datasets.length === 3);
check('Biểu đồ: bộ thứ 3 là "Số Lượng Xuất"', chart.data.datasets[2].label === 'Số Lượng Xuất');
check('Biểu đồ: mã hàng sắp theo tổng (rate-2 trước rate-1)', chart.data.labels[0] === 'Ván 1200x382x12' && chart.data.labels[1] === 'Ván 1200x382x9');
check('Biểu đồ: SL xuất theo mã (12 tấm rate-2 trước, 30 tấm rate-1 sau)',
  approx(chart.data.datasets[2].data[0], 12 * unitVol2) && approx(chart.data.datasets[2].data[1], 30 * unitVol1));
check('Biểu đồ: dòng năm khác / không khớp mã bị loại (999 & 50 không xuất hiện)',
  !chart.data.datasets[2].data.some(v => v > 30 * unitVol1 + 1e-9));
check('Biểu đồ: cột Kế Hoạch giữ nguyên (rate-2 = 100 tấm)', approx(chart.data.datasets[0].data[0], 100 * unitVol2));
check('Biểu đồ: cột Đã Ép theo thể tích fpDim (40 tấm rate-1)', approx(chart.data.datasets[1].data[1], (1220 * 2440 * 9 / 1e9) * 40));

// ─── L. ĐỒNG BỘ MÂY ───────────────────────────────────────────
const snap = cloud.collectCloudSnapshot();
check('Mây: snapshot chứa qcExports', Array.isArray(snap.qcExports) && snap.qcExports.length === state.qcExports.length);
check('Mây: cloudCore bao gồm qcExports', cloud.cloudCore(snap).includes('"qcExports"'));
cloud.applyFireSnapshot({ qcExports: [{ id: 'qc-remote', productId: 'rate-2', name: '', week: 'Tuần 40', year: 2026, qty: 9, note: '' }] });
check('Mây: applyFireSnapshot nhận qcExports từ mây', state.qcExports.length === 1 && state.qcExports[0].id === 'qc-remote');

console.log(`\n=== KẾT QUẢ: ${passed} PASS / ${failed} FAIL ===`);
process.exit(failed > 0 ? 1 : 0);



