// tests/hr-cards.test.mjs — Kiểm thử launcher THẺ NÔI w tab Nhân Sự:
// bảng Nhân Sự jako karty (5 na wiersz desktop / 2 telefon) — liczniki
// na thẻ, otwieranie/schowanie szczegółowego bảng, podświetlenie aktywnej thẻ.
'use strict';

// ─── Stubs môi trường (identyczne z hr-attendance.test.mjs) ──────
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

// ─── KHUNG CHẠY TEST ──────────────────────────────────────────
let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; console.log('PASS ' + name); }
  else { fail++; console.log('FAIL ' + name); }
}

const { state } = await import('../js/state.js');
const hr = await import('../js/hr.js');

// Stan domyślny bảng Nhân Sự w index.html: każda szczegółowa bảng jest
// ukryta (hr-card-hidden) — pojawia się dopiero po bấm thẻ (symulacja HTML).
const HR_CARD_IDS = ['hr-emp-card', 'hr-att-card', 'hr-pos-card', 'hr-ci-card',
  'hr-leave-card', 'hr-stats-card', 'hr-att-stats-card', 'hr-recruit-card'];
HR_CARD_IDS.forEach(id => document.getElementById(id).classList.add('hr-card-hidden'));

state.currentUser = { username: 'admin', role: 'admin', editTabs: [], allowAdvanced: true };
state.hrAttDate = '2024-06-05';
state.hrAttMonth = '2024-06';
state.hrEmployees = [
  { id: 'empA', code: 'NV001', name: 'Nguyễn Văn A', department: 'Xưởng 1', status: 'active', skills: [], joinDate: '' },
  { id: 'empB', code: 'NV002', name: 'Trần Thị B',   department: 'Xưởng 2', status: 'active', skills: [] },
  { id: 'empC', code: 'NV003', name: 'Lê Văn C',     department: 'Lò Hơi',  status: 'quit',   skills: [] }
];
state.hrPositions = [{ id: 'pos1', name: 'Ép ván', department: 'Xưởng 1', note: '' }];
state.hrAttendance = [{ id: 'att-1', date: '2024-06-05', employeeId: 'empA', status: 'work', positions: [], note: '' }];
state.hrLeaves = [
  { id: 'leave-1', employeeId: 'empA', type: 'Việc gia dün', from: '2024-07-10', to: '2024-07-11', days: 2, reason: '', status: 'approved', approvedBy: 'Admin', createdAt: '' },
  { id: 'leave-2', employeeId: 'empB', type: 'Nghỉ phép', from: '2024-08-01', to: '2024-08-01', days: 1, reason: '', status: 'pending', createdAt: '' }
];
state.hrCheckins = [{ id: 'ci1', employeeId: 'empA', date: '2024-06-05', in: '06:40', out: '17:39' }];
state.hrRecruitment = [{ id: 'rec1', department: 'Xưởng 1', position: 'Ép ván', needQty: 3, hiredQty: 1, status: 'open' }];

// ─── A. PODSTAWOWY RENDER → liczniki na thẻ ───────────────────
hr.renderHrView();
check('THẺ: licznik Nhân Viên = 2/3 NV (tylko aktywni)', document.getElementById('hr-mini-count-emp').textContent === '2/3 NV');
check('THẺ: licznik Chấm Công = data + 1 đi làm + 1 chờ duyệt', document.getElementById('hr-mini-count-att').textContent === '05/06/2024 · 1 đi làm · 1 chờ');
check('THẺ: licznik Vị Trí = 1 vị trí', document.getElementById('hr-mini-count-pos').textContent === '1 vị trí');
check('THẺ: licznik Giờ Máy = 1 giờ máy', document.getElementById('hr-mini-count-ci').textContent === '1 giờ máy');
check('THẺ: licznik Xin Nghỉ Phép = 1 chờ duyệt', document.getElementById('hr-mini-count-leave').textContent === '1 chờ duyệt');
check('THẺ: licznik Thống Kê Nghỉ = 2 ngày nghỉ (duyệt)', document.getElementById('hr-mini-count-stats').textContent === '2 ngày nghỉ');
check('THẺ: licznik Thống Kê Đi Làm = 100% đi làm', document.getElementById('hr-mini-count-att-stats').textContent === '100% đi làm');
check('THẺ: licznik Nhân Sự Cần = 1 tuyển · 2 thiếu', document.getElementById('hr-mini-count-recruit').textContent === '1 tuyển · 2 thiếu');

// ─── B. OTWIERANIE / SCHOWANIE SZCZEGÓŁOWEGO BẂGU ────────────
check('THẺ: na start wszystkie bảngi ukryte (display:none)', HR_CARD_IDS.every(id => document.getElementById(id).classList.contains('hr-card-hidden')));

// Bấm thẻ Nhân Viên → bảng pokazany (żadna inna nie może być widoczna)
check('THẺ: hrOpenCard(emp) zwraca true (bảng był ukryty)', hr.hrOpenCard('hr-emp-card') === true);
check('THẺ: bảng Nhân Viên widoczny (bez hr-card-hidden i rate-table-collapsed)',
  !document.getElementById('hr-emp-card').classList.contains('hr-card-hidden')
  && !document.getElementById('hr-emp-card').classList.contains('rate-table-collapsed'));
check('THẺ: pozostałe bảngi nadal ukryte', HR_CARD_IDS.filter(id => id !== 'hr-emp-card').every(id => document.getElementById(id).classList.contains('hr-card-hidden')));

// Bấm thẻ Chấm Công → Nhân Viên automatycznie ukryty (accordion)
check('THẺ: hrOpenCard(att) otwiera Chấm Công', hr.hrOpenCard('hr-att-card') === true);
check('THẺ: widoczny wyłącznie Chấm Công', document.getElementById('hr-att-card').classList.contains('hr-card-hidden') === false
  && document.getElementById('hr-emp-card').classList.contains('hr-card-hidden') === true);

// Ponowne bấm tej samej thẻ → ukrycie z powrotem (condensed view)
check('THẺ: ponowne hrOpenCard(att) zwraca false (ukryto)', hr.hrOpenCard('hr-att-card') === false);
check('THẺ: po ukryciu znów wszystkie schowane', HR_CARD_IDS.every(id => document.getElementById(id).classList.contains('hr-card-hidden')));

// ─── C. SYNCHRONIZACJA PODŚWIETLENIA THẺ ──────────────────────
let syncThrew = false;
try { hr.syncHrMiniActive(); hr.updateHrCardGrid(); } catch (e) { syncThrew = true; }
check('THẺ: syncHrMiniActive + updateHrCardGrid nie rzucają wyjątku', !syncThrew);

// ─── D. POP-UP MODAL: nổi lên overlay + nút Đóng ─────────────────
const _ov = document.getElementById('hr-detail-overlay');
const _te = document.getElementById('hr-detail-title');
hr.hrOpenCard('hr-emp-card');
check('THẺ: mở thẻ → overlay pop-up bật (classList show)', _ov.classList.contains('show'));
check('THẺ: tiêu đề modal gán (fallback "Chi Tiết Nhân Sự")', _te.textContent === 'Chi Tiết Nhân Sự');
check('THẼ: thẻ emp đang mở (không ẩn) khi modal hiển thị', !document.getElementById('hr-emp-card').classList.contains('hr-card-hidden'));
hr.hrCloseOpenCard();
check('THẺ: đóng pop-up → overlay tắt (không show)', !_ov.classList.contains('show'));
check('THẺ: sau khi đóng → thẻ emp lại bị ẩn (hr-card-hidden)', document.getElementById('hr-emp-card').classList.contains('hr-card-hidden'));

console.log(`\nWYNIK: ${pass} pass, ${fail} fail`);
if (fail > 0) process.exit(1);