// tests/history.test.mjs — Kiểm thử tính năng LỊCH SỬ SỬA ĐỔI (audit log)
// Bao phủ: ghi log khi tab lưu dữ liệu (thêm/sửa/xóa), không ghi khi không đổi,
// giới hạn số dòng, lưu localStorage, chỉ Admin mở được modal, lọc theo tab/người.
'use strict';

// ─── Stubs môi trường (giống qc.test.mjs) ─────────────────────────
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

// ─── IMPORT MODULES ────────────────────────────────────────────────
const { state, STORAGE_KEY_HISTORY } = await import('../js/state.js');
const historyMod = await import('../js/history.js');
const press = await import('../js/press.js');
const perms = await import('../js/permissions.js');

function modalShown(id) { return document.getElementById(id).classList._s.has('show'); }

// ─── CHUẨN BỊ ───────────────────────────────────────────────────
state.currentUser = { username: 'admin', fullname: 'Quản trị viên', email: 'admin@x.vn', role: 'admin' };
state.pressRecords = [];
historyMod.initHistory(); // nạp lịch sử + lập snapshot nền

// Không ghi log khi dữ liệu không đổi
press.savePressRecords();
check('HIST-1: lưu mà không có thay đổi -> không ghi log', (state.history || []).length === 0);

// Thêm lượt ép -> ghi log "Thêm"
state.pressRecords = [{ id: 'pr1', date: '2026-09-12', week: 'Tuần 37', year: 2026, sticks: [], vanTho: [] }];
press.savePressRecords();
check('HIST-2: thêm lượt ép -> có 1 dòng lịch sử', state.history.length === 1);
check('HIST-3: đúng người dùng (fullname)', state.history[0].user === 'Quản trị viên');
check('HIST-4: đúng tab (press)', state.history[0].tab === 'press');
check('HIST-5: đúng thao tác (add)', state.history[0].action === 'add');
check('HIST-6: chi tiết có nhãn nhận dạng (ngày)', String(state.history[0].detail).includes('2026-09-12'));

// Sửa lượt ép -> "Sửa" + trường cũ -> mới
state.pressRecords[0].glue = 12;
press.savePressRecords();
check('HIST-7: sửa trường -> ghi log "edit"', state.history.length === 2 && state.history[1].action === 'edit');
check('HIST-8: chi tiết có "glue ... 12"', /glue.*12/.test(state.history[1].detail));

// Lưu lần nữa (không đổi) -> không thêm dòng
press.savePressRecords();
check('HIST-9: lưu lại không đổi -> không thêm dòng', state.history.length === 2);

// Xóa lượt ép -> "Xóa"
state.pressRecords = [];
press.savePressRecords();
check('HIST-10: xóa -> ghi log "delete"', state.history.length === 3 && state.history[2].action === 'delete');

// Trường nhiễu (updatedAt) không bị coi là thay đổi
state.pressRecords = [{ id: 'pr2', date: '2026-09-12', sticks: [], vanTho: [], updatedAt: 'x1' }];
press.savePressRecords();
const lenBeforeNoise = state.history.length;
state.pressRecords[0].updatedAt = 'x2';
press.savePressRecords();
check('HIST-11: đổi riêng updatedAt -> không ghi log', state.history.length === lenBeforeNoise);

// ─── GIỚI HẠN SỐ DÒNG ─────────────────────────────────────────
for (let i = 0; i < 320; i++) {
  state.pressRecords = [{ id: 'px' + i, date: '2026-01-01', sticks: [], vanTho: [] }];
  press.savePressRecords();
}
check('HIST-12: giới hạn 300 dòng (không vượt)', state.history.length === historyMod.HISTORY_LIMIT && state.history.length <= 300);
check('HIST-13: giữ dòng MỚI NHẤT (bỏ dòng cũ)', state.history[state.history.length - 1].detail.includes('px319'));

// Lịch sử được lưu localStorage
const saved = JSON.parse(localStorage.getItem(STORAGE_KEY_HISTORY) || '[]');
check('HIST-14: đã lưu localStorage', Array.isArray(saved) && saved.length === state.history.length);

// ─── CHỈ ADMIN MỞ ĐƯỢC MODAL ──────────────────────────────────
state.currentUser = { username: 'viewer1', fullname: 'Người Xem', email: 'v@x.vn', role: 'viewer' };
historyMod.openHistoryModal('press');
check('HIST-15: viewer mở modal -> bị chặn', !modalShown('modal-history'));

state.currentUser = { username: 'admin', fullname: 'Quản trị viên', email: 'admin@x.vn', role: 'admin' };
historyMod.openHistoryModal('press');
check('HIST-16: admin mở modal -> hiển thị', modalShown('modal-history'));
check('HIST-17: danh sách render theo tab đã chọn', document.getElementById('history-list').innerHTML.includes('Lượt ép ván'));

// Lọc theo tab khác (không có lịch sử) -> thông báo rỗng
historyMod.setHistoryTabFilter('qc');
check('HIST-18: tab QC không có log -> hiện thông báo rỗng', document.getElementById('history-list').innerHTML.includes('Chưa có lịch sử'));

// Lọc theo người dùng
historyMod.setHistoryTabFilter('press');
historyMod.setHistoryUserFilter('Người lạ');
check('HIST-19: lọc người không tồn tại -> danh sách rỗng', document.getElementById('history-list').innerHTML.includes('Chưa có lịch sử'));
historyMod.setHistoryUserFilter('Quản trị viên');
check('HIST-20: lọc đúng người -> có dòng lịch sử', !document.getElementById('history-list').innerHTML.includes('Chưa có lịch sử'));

// Đóng modal
historyMod.closeHistoryModal();
check('HIST-21: đóng modal', !modalShown('modal-history'));

// Viewer không xóa được lịch sử
const beforeClear = state.history.length;
state.currentUser = { username: 'viewer1', fullname: 'Người Xem', email: 'v@x.vn', role: 'viewer' };
historyMod.clearHistory();
check('HIST-22: viewer không xóa được lịch sử', state.history.length === beforeClear);

console.log(`\nKết quả: ${passed} PASS, ${failed} FAIL`);
if (failed > 0) process.exit(1);
