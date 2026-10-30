// tests/hr-render-parts.test.mjs — KIỂM THỬ TỐI ƯU TAB NHÂN SỰ (20/10/2026)
// Mục tiêu: chặn tái phát 3 lỗi hiệu năng đã sửa:
//   1. Thao tác bố trí/vị trí KHÔNG được vẽ lại cả 12 bảng (renderHrView)
//   2. Lưu dữ liệu KHÔNG được ghi lại cả 12 key localStorage
//   3. Icon lucide chỉ được vẽ 1 lần cho mỗi lượt render (gom theo khung hình)
// Kèm: chỉ mục O(1) phải cho KẾT QUẢ GIỐNG HỆT cách quét tuyến tính, và bảng
// dài phải bị giới hạn 200 dòng + nút "Xem thêm".
'use strict';
import fs from 'node:fs';

// ─── Stubs môi trường (giống hr-board.test.mjs) ─────────────────
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
let writeCalls = [];
global.localStorage = {
  getItem: (k) => (storeBacking.has(k) ? storeBacking.get(k) : null),
  setItem: (k, v) => { writeCalls.push(k); storeBacking.set(k, String(v)); },
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
let lucideCalls = 0;
global.lucide = { createIcons() { lucideCalls++; } };
global.Chart = class {
  constructor(ctx, cfg) { this.ctx = ctx; this.config = cfg; this.data = (cfg && cfg.data) || { labels: [], datasets: [] }; }
  update(){} resize(){} destroy(){} render(){} reset(){} getDatasetMeta(){ return { data: [] }; }
};
Chart.register = () => {};
if (!global.URL.createObjectURL) global.URL.createObjectURL = () => 'blob:stub';
if (!global.URL.revokeObjectURL) global.URL.revokeObjectURL = () => {};

let pass = 0, fail = 0;
function check(name, cond) { if (cond) { pass++; console.log('PASS — ' + name); } else { fail++; console.log('FAIL — ' + name); } }
const tick = () => new Promise(r => setTimeout(r, 20));

// ─── Dữ liệu giả lập ────────────────────────────────────────────
const { state, STORAGE_KEY_HR_EMPLOYEES, STORAGE_KEY_HR_POSITIONS, STORAGE_KEY_HR_ASSIGN, STORAGE_KEY_HR_ATTENDANCE } = await import('../js/state.js');
const hr = await import('../js/hr.js');

state.currentUser = { username: 'admin', role: 'admin', editTabs: [], allowAdvanced: true };
const N_EMP = 250;
state.hrEmployees = [];
for (let i = 0; i < N_EMP; i++) {
  state.hrEmployees.push({ id: 'emp' + i, code: 'NV' + String(i + 1).padStart(3, '0'), name: 'Nhân viên ' + i, department: 'Xưởng 2', status: 'active', skills: [] });
}
state.hrPositions = [
  { id: 'p1', name: 'Ép ván X2', department: 'Xưởng 2' },
  { id: 'p2', name: 'Bốc luồng', department: 'Xưởng 2' }
];
// Có sẵn dòng "Nhân sự cần" cho 2 vị trí → tránh ensure tự thêm (làm nhiễu phép đếm ghi localStorage)
state.hrPositionNeeds = [
  { id: 'posneed-pos-p1', department: 'Xưởng 2', position: 'Ép ván X2', positionId: 'p1', needQty: 2, haveQty: 0 },
  { id: 'posneed-pos-p2', department: 'Xưởng 2', position: 'Bốc luồng', positionId: 'p2', needQty: 1, haveQty: 0 }
];
state.hrShifts = []; state.hrLeaves = []; state.hrOvertimes = [];
state.hrRecruitment = []; state.hrCiAcks = []; state.hrWorkCalendar = {};
state.hrCheckins = [];
state.hrBoardDept = 'Xưởng 2';
state.hrBoardDate = '2026-09-15';
state.hrAttDate = '2026-09-15';
state.hrAttMonth = '2026-10';
state.hrAssignments = [
  { id: 'asg-1', date: '2026-09-15', department: 'Xưởng 2', positionId: 'p1', shiftIdx: 0, employeeId: 'emp0', start: '07:00', end: '', updatedAt: '2026-09-15T00:00:00.000Z' }
];
state.hrAttendance = [];
for (let d = 1; d <= 3; d++) {
  const date = '2026-10-0' + d;
  state.hrAttendance.push({ id: 'att-emp0-' + d, employeeId: 'emp0', date, status: 'work', positions: ['p1'] });
  state.hrAttendance.push({ id: 'att-emp1-' + d, employeeId: 'emp1', date, status: d === 3 ? 'absent' : 'work', positions: [] });
}

// ─── A. LƯU CHỈ KEY THAY ĐỔI ────────────────────────────────────
// Chỉ đếm key NHÂN SỰ (logDataChange còn ghi key lịch sử sửa đổi)
const hrWrites = () => writeCalls.filter(k => k.indexOf('bamboo_tracker_hr_') === 0);
writeCalls = [];
hr.saveHrData(['hrPositions']);
check('SAVE: chỉ ghi 1 key đúng domain (hrPositions)',
  hrWrites().length === 1 && hrWrites()[0] === STORAGE_KEY_HR_POSITIONS);
writeCalls = [];
hr.saveHrData(['hrAssignments', 'hrAttendance']);
check('SAVE: 2 domain → đúng 2 key (bố trí + chấm công)',
  hrWrites().length === 2 && hrWrites().indexOf(STORAGE_KEY_HR_ASSIGN) !== -1 && hrWrites().indexOf(STORAGE_KEY_HR_ATTENDANCE) !== -1);
writeCalls = [];
hr.saveHrData();
check('SAVE: không truyền tham số = hành vi cũ (ghi đủ 15 key — thêm dữ liệu đánh giá công nhân)', hrWrites().length === 15);

// ─── B. RENDER THEO PHẦN (renderAll không vẽ 12 bảng) ──────────
document.getElementById('hr-employees-body').innerHTML = '';
document.getElementById('hr-board').innerHTML = '';
hr.renderHrVisible();       // không thẻ nào mở
check('RENDER: renderHrVisible() KHÔNG vẽ bảng Nhân viên khi thẻ đang đóng',
  document.getElementById('hr-employees-body').innerHTML === '');
check('RENDER: renderHrVisible() vẫn vẽ bảng bố trí',
  document.getElementById('hr-board').innerHTML.includes('board-col-head'));

hr.renderHrView();          // không tham số = vẽ đủ (giữ hành vi cũ)
check('RENDER: renderHrView() vẫn vẽ bảng Nhân viên như cũ',
  document.getElementById('hr-employees-body').innerHTML.includes('Nhân viên 0'));

// ─── C. ICON LUCIDE GOM 1 LẦN / LƯỢT RENDER ─────────────────────
lucideCalls = 0;
hr.renderHrView();
await tick();
check('ICON: cả lượt render chỉ gọi lucide 1 lần (trước đây 8 lần)', lucideCalls === 1);

// ─── D. GIỚI HẠN 200 DÒNG + "XEM THÊM" ──────────────────────────
const rowsOf = (id) => (document.getElementById(id).innerHTML.match(/<tr/g) || []).length;
const bodyHTML = document.getElementById('hr-employees-body').innerHTML;
check('ROWS: 250 nhân viên → 200 dòng dữ liệu + 1 dòng "Xem thêm"', rowsOf('hr-employees-body') === 201);
check('ROWS: có nút Xem thêm gọi app.hrShowMoreRows', bodyHTML.includes('app.hrShowMoreRows'));
check('ROWS: nút ghi rõ đang hiện 200/250', bodyHTML.includes('200/250'));
hr.hrShowMoreRows('employees');
check('ROWS: bấm Xem thêm → đủ 250 dòng, hết nút Xem thêm',
  rowsOf('hr-employees-body') === 250 && !document.getElementById('hr-employees-body').innerHTML.includes('app.hrShowMoreRows'));

// ─── E. CHỈ MỤC O(1) CHO KẾT QUẢ GIỐNG QUÉT TUYẾN TÍNH ──────────
const stats = hr.computeAttendanceStats('2026-10');
const s0 = stats.find(s => s.emp.id === 'emp0');
const s1 = stats.find(s => s.emp.id === 'emp1');
check('INDEX: emp0 đi làm 3 ngày (đúng như quét tuyến tính)', !!s0 && s0.work === 3 && s0.absent === 0);
check('INDEX: emp1 đi làm 2 + vắng 1', !!s1 && s1.work === 2 && s1.absent === 1);
check('INDEX: sửa trạng thái tại chỗ → thống kê thấy ngay', (() => {
  state.hrAttendance.find(a => a.id === 'att-emp1-3').status = 'work';
  const s = hr.computeAttendanceStats('2026-10').find(x => x.emp.id === 'emp1');
  return s.work === 3 && s.absent === 0;
})());
check('INDEX: thay cả bản ghi → lưu lại (bump chỉ mục) đọc đúng', (() => {
  const idx = state.hrAttendance.findIndex(a => a.id === 'att-emp1-3');
  state.hrAttendance[idx] = { ...state.hrAttendance[idx], status: 'absent' };
  hr.saveHrData(['hrAttendance']);
  const s = hr.computeAttendanceStats('2026-10').find(x => x.emp.id === 'emp1');
  return s.work === 2 && s.absent === 1;
})());

// ─── F. THÊM BỐ TRÍ KHÔNG VẼ LẠI 12 BẢNG ────────────────────────
hr.renderHrView();
const empBefore = document.getElementById('hr-employees-body').innerHTML;
const statsBefore = document.getElementById('hr-att-stats-body').innerHTML;
document.getElementById('board-assign-mode').value = '';
document.getElementById('board-assign-movefrom').value = '';
document.getElementById('board-assign-date').value = '2026-09-15';
document.getElementById('board-assign-pos').value = 'p2';
document.getElementById('board-assign-shiftidx').value = '0';
document.getElementById('board-assign-employee-id').value = 'emp5';
document.getElementById('board-assign-start').value = '07:00';
document.getElementById('board-assign-end').value = '';
const assignBefore = state.hrAssignments.length;
hr.handleBoardAssignSubmit({ preventDefault() {} });
check('BOARD-FAST: thêm bố trí → có bản ghi mới', state.hrAssignments.length === assignBefore + 1);
check('BOARD-FAST: bảng Nhân viên KHÔNG bị dựng lại', document.getElementById('hr-employees-body').innerHTML === empBefore);
check('BOARD-FAST: bảng Thống kê đi làm KHÔNG bị dựng lại', document.getElementById('hr-att-stats-body').innerHTML === statsBefore);
check('BOARD-FAST: bảng bố trí CÓ cập nhật (thấy người mới)',
  document.getElementById('hr-board').innerHTML.includes(hr.hrShortName('Nhân viên 5')));
check('BOARD-FAST: chỉ ghi 3 key (bố trí + chấm công + nhân viên)', (() => {
  writeCalls = [];
  document.getElementById('board-assign-employee-id').value = 'emp6';
  hr.handleBoardAssignSubmit({ preventDefault() {} });
  const w = hrWrites();
  return w.length === 3 &&
    w.indexOf(STORAGE_KEY_HR_ASSIGN) !== -1 &&
    w.indexOf(STORAGE_KEY_HR_ATTENDANCE) !== -1 &&
    w.indexOf(STORAGE_KEY_HR_EMPLOYEES) !== -1;
})());

// ─── G. CẤU TRÚC MÃ NGUỒN ───────────────────────────────────────
const src = fs.readFileSync(new URL('../js/hr.js', import.meta.url), 'utf8');
const mainSrc = fs.readFileSync(new URL('../js/main.js', import.meta.url), 'utf8');
check('SRC: có bảng ánh xạ HR_DOMAIN_IO cho saveHrData', src.includes('const HR_DOMAIN_IO'));
check('SRC: có chỉ mục Map (hrIdx) + hrBumpIndex', src.includes('const hrIdx =') && src.includes('function hrBumpIndex'));
check('SRC: có hàm gom icon hrScheduleIcons', src.includes('function hrScheduleIcons'));
check('SRC: có renderHrVisible + renderHrAfterBoardChange', src.includes('function renderHrVisible') && src.includes('function renderHrAfterBoardChange'));
check('SRC: thao tác bố trí/vị trí KHÔNG còn gọi renderHrView() trực tiếp',
  !/function handleBoardAssignSubmit[\s\S]{0,5000}renderHrView\(\)/.test(src) &&
  !/function handlePositionSubmit[\s\S]{0,2000}renderHrView\(\)/.test(src));
check('SRC: không còn .find() tuyến tính trong các hàm tra cứu nóng',
  !/function attRecordOf\([^)]*\) \{\s*return \(state\.hrAttendance/.test(src) &&
  !/function hrEmpById\(id\) \{ return \(state\.hrEmployees/.test(src));
check('SRC: main.js dùng renderHrVisible (renderAll + switchView)', (mainSrc.match(/renderHrVisible\(\)/g) || []).length >= 2);
check('SRC: main.js đã công bố app.hrShowMoreRows', mainSrc.includes('hrShowMoreRows'));

console.log('\n───────────────────────────');
console.log(`HR-RENDER-PARTS: ${pass} PASS, ${fail} FAIL`);
if (fail) process.exit(1);
