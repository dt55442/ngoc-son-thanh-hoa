// tests/capacity.test.mjs — Kiểm thử BẢNG TỔNG HỢP CÔNG SUẤT & HIỆU SUẤT
// (thẻ #capacity-card — đầu tab Tổng Quan, js/capacity.js):
//   • Khóa tuần ISO khớp materialWeekLabel + dịch tuần 2 chiều;
//   • Giờ đếm ĐÚNG 1 LẦN mỗi (công đoạn, ngày) — 2 lượt cắt cùng ngày không nhân đôi giờ;
//   • Công suất/Hiệu suất TUẦN = Σ sản lượng ÷ Σ giờ ÷ định mức tuần;
//   • Định mức TUẦN vắt 2 tháng = bình quân GIA QUYỀN theo sản lượng;
//   • Chọn Nan Thô bỏ lượt nan mua ngoài (external); Bào Thô chờ Chọn Nan Thô → "—";
//   • Than Hóa + Sấy: hiệu suất = giờ cần ÷ (giờ thực − sự cố) + ĐM phút/m³ mỗi lần;
//   • Ép Ván theo m³/h; Hiệu suất XƯỞNG bình quân gia quyền theo giờ + nút thắt;
//   • 3 tầng render (tuần → công đoạn → ngày) + đổi xưởng + thu gọn + nhớ UI;
//   • Sparkline SVG 8 tuần trên mini card; cấu trúc index.html/styles.css/sw.js.
'use strict';
import fs from 'node:fs';

// ─── Stubs môi trường (giống xuong2-bo-ong.test.mjs) ─────────────
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
global.fetch = async () => ({ ok: false, status: 0, statusText: 'offline-stub', json: async () => ({}), text: async () => '' });
global.Image = class { set src(_) {} addEventListener(){} };
global.ResizeObserver = class { observe(){} unobserve(){} disconnect(){} };

let pass = 0, fail = 0;
function check(label, cond) {
  if (cond) { pass++; console.log('PASS ' + label); }
  else { fail++; console.log('FAIL ' + label); }
}
const approx = (a, b, eps = 1e-6) => Math.abs(Number(a) - Number(b)) < eps;

const { state, STORAGE_KEY_CAPACITY_UI } = await import('../js/state.js');
state.currentUser = { username: 'admin', role: 'admin', editTabs: [], allowAdvanced: true };
state.activeView = 'dashboard-view';

const mats = await import('../js/materials.js');
const x2 = await import('../js/xuong2.js');
const cap = await import('../js/capacity.js');
// ─── A. TUẦN ISO ──────────────────────────────────────────────
check('TUẦN: khóa tuần khớp materialWeekLabel (chuẩn chung của app)',
  cap.capWeekKeyOf('2026-09-10') === mats.materialWeekLabel('2026-09-10'));
const wk = cap.capWeekKeyOf('2026-09-10');
check('TUẦN: khóa đúng dạng YYYY-Wnn', /^\d{4}-W\d{2}$/.test(wk));
check('TUẦN: dịch −1 tuần rồi +1 tuần → về đúng khóa ban đầu',
  cap.capWeekShift(cap.capWeekShift(wk, -1), 1) === wk);
check('TUẦN: nhãn khoảng ngày dạng dd/MM – dd/MM',
  /^\d{2}\/\d{2} – \d{2}\/\d{2}$/.test(cap.capWeekRangeLabel(wk)));
check('TUẦN: số tuần khớp khóa', cap.capWeekNumOf(wk) === Number(wk.split('-W')[1]));

// helper: ISO từ nhãn khoảng tuần (dùng để tìm tuần vắt 2 tháng)
function isoFromRangeLabel(lbl, year) {
  const m = /^(\d{2})\/(\d{2}) – (\d{2})\/(\d{2})$/.exec(String(lbl || ''));
  if (!m) return null;
  return [`${year}-${m[2]}-${m[1]}`, `${year}-${m[4]}-${m[3]}`];
}

// ─── B. CẮT CHỌN: giờ đếm 1 LẦN/ngày + công suất/hiệu suất tuần ──
state.materialRecords = [
  { id: 'mat-a', type: 'Luồng cây xô', supplier: 'Nhà Tế', location: 'xuong-2', weight: 1000, date: '2026-09-10' },
  { id: 'mat-b', type: 'Luồng cây xô', supplier: 'Nhà Tế', location: 'xuong-2', weight: 500, date: '2026-09-10' },
  { id: 'mat-c', type: 'Luồng ống', supplier: 'Nhà Trung', location: 'xuong-2', weight: 800, date: '2026-09-11' }
];
state.xuong2CutRecords = [
  { id: 'c1', materialId: 'mat-a', date: '2026-09-10', cutHours: 5 },
  { id: 'c2', materialId: 'mat-b', date: '2026-09-10', cutHours: 5 },
  { id: 'c3', materialId: 'mat-c', date: '2026-09-11', cutHours: 4 }
];
const cutSt = cap.CAP_STAGES.find(s => s.id === 'cut');
const cutDays = cap.capStageDayRows(cutSt, wk);
check('CẮT: 2 ngày có dữ liệu trong tuần (10/09 và 11/09)', cutDays.length === 2);
check('CẮT: ngày 10/09 có 2 lượt nhưng GIỜ chỉ đếm 1 LẦN = 5h (không nhân đôi)',
  cutDays[0].turns === 2 && cutDays[0].hours === 5);
check('CẮT: sản lượng ngày 10/09 = 1.500 kg (cộng đủ 2 lượt)', cutDays[0].qty === 1500);
const cutRow = cap.capStageWeekRow(cutSt, wk); // CHƯA có ĐM — dùng kiểm tra số thô
check('CẮT: tuần = 3 lượt · 2.300 kg · 9 giờ (5 + 4)',
  cutRow.turns === 3 && cutRow.qty === 2300 && cutRow.hours === 9);
check('CẮT: chưa có ĐM → hiệu suất tuần "—"', cutRow.eff == null);
state.x2CapRates = { '2026-09': 300 };
const cutRowRated = cap.capStageWeekRow(cutSt, wk);
check('CẮT: công suất tuần = 2.300 ÷ 9 ≈ 255,556 kg/h', approx(cutRowRated.cap, 2300 / 9));
check('CẮT: hiệu suất tuần = 255,556 ÷ 300 ≈ 85,2%', approx(cutRowRated.eff, (2300 / 9) / 300 * 100, 1e-4));
check('EXPORT: 6 hàm đọc định mức đã export từ xuong2.js (1 nguồn chân lý)',
  typeof x2.capRateOf === 'function' && typeof x2.bulligRateOf === 'function' &&
  typeof x2.boOngRateOf === 'function' && typeof x2.baoThoRateOf === 'function' &&
  typeof x2.chonNanRateOf === 'function' && typeof x2.baoTinhRateOf === 'function');

// ─── C. BỔ ỐNG: Định mức TUẦN vắt 2 tháng = bình quân theo sản lượng ──
let straddle = null;
{
  let cursor = cap.capWeekKeyOf('2026-09-05');
  for (let i = 0; i < 10 && !straddle; i++) {
    const pair = isoFromRangeLabel(cap.capWeekRangeLabel(cursor), cap.capWeekYearOf(cursor));
    if (pair && pair[0].slice(0, 7) !== pair[1].slice(0, 7)) straddle = { wk: cursor, d1: pair[0], d2: pair[1] };
    cursor = cap.capWeekShift(cursor, 1);
  }
}
check('TUẦN: tìm được tuần vắt 2 tháng quanh tháng 9/2026', !!straddle);
state.xuong2BoOngRecords = [
  { id: 'b1', date: straddle.d1, inputOng: 600, workHours: 6 },
  { id: 'b2', date: straddle.d2, inputOng: 400, workHours: 4 }
];
const m1 = straddle.d1.slice(0, 7), m2 = straddle.d2.slice(0, 7);
state.x2BoOngRates = { [m1]: 100, [m2]: 200 };
const boongSt = cap.CAP_STAGES.find(s => s.id === 'boong');
const boongRow = cap.capStageWeekRow(boongSt, straddle.wk);
check('BỔ ỐNG: định mức tuần = (600×100 + 400×200) ÷ 1.000 = 140 kg/h', approx(boongRow.rate, 140));
check('BỔ ỐNG: công suất tuần = 1.000 ÷ 10 = 100 kg/h', approx(boongRow.cap, 100));
check('BỔ ỐNG: hiệu suất tuần = 100 ÷ 140 ≈ 71,4%', approx(boongRow.eff, (100 / 140) * 100, 1e-4));

// ─── D. CHỌN NAN THÔ: bỏ lượt nan mua ngoài (external) ──────────
state.xuong2ChonNanThoRecords = [
  { id: 'cn1', date: '2026-09-10', dims: [1250, 80, 7], quantity: 200, workHours: 4 },
  { id: 'cn2', date: '2026-09-10', dims: [1250, 80, 7], quantity: 100, external: true, workHours: 4 }
];
state.x2ChonNanRates = { '2026-09': 60 };
const cnSt = cap.CAP_STAGES.find(s => s.id === 'chonnan');
const cnRow = cap.capStageWeekRow(cnSt, wk);
check('CHỌN NAN: chỉ cộng phần sang Bào Thô (bỏ external) → 200 thanh · 2 lượt', cnRow.qty === 200 && cnRow.turns === 2);
check('CHỌN NAN: giờ đếm 1 lần/ngày = 4h', cnRow.hours === 4);
check('CHỌN NAN: hiệu suất = (200÷4) ÷ 60 ≈ 83,3%', approx(cnRow.eff, (200 / 4) / 60 * 100, 1e-4));

// ─── E. BÀO THÔ: chờ Chọn Nan Thô → sản lượng "—" (không bịa số) ──
state.xuong2BaoThoRecords = [
  { id: 'bt1', date: '2026-09-10', daiText: '1250', rongText: '80', dayText: '12', workHours: 3 }
];
state.x2BaoThoRates = {}; // chưa khai định mức
const bthSt = cap.CAP_STAGES.find(s => s.id === 'baotho');
const bthRow = cap.capStageWeekRow(bthSt, wk);
check('BÀO THÔ: chưa link Chọn Nan Thô → qty null (không bịa số)', bthRow.qty == null && bthRow.qtyKnown === false);
check('BÀO THÔ: công suất + hiệu suất đều "—"', bthRow.cap == null && bthRow.eff == null);
// ─── F. THAN HÓA + SẤY: giờ cần ÷ (giờ thực − sự cố) ────────────
const indexHtml = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const stylesCss = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
const swJs = fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8');

state.batches = [
  { id: 'lot1', code: 'L-001', date: '2026-09-10', stage: 'say1', quantity: 1000, volume: 2, location: 'LS1' }
];
state.hrEmployees = [{ id: 'e1', name: 'Nguyễn Văn A', quitDate: '' }];
state.hrPositions = [
  { id: 'pth', name: 'Than hóa', department: 'Xưởng 2' },
  { id: 'pep', name: 'Ép ván X2', department: 'Xưởng 2' }
];
state.hrAssignments = [
  { id: 'a1', date: '2026-09-10', department: 'Xưởng 2', positionId: 'pth', employeeId: 'e1', start: '07:00', end: '11:00' },
  { id: 'a2', date: '2026-09-10', department: 'Xưởng 2', positionId: 'pep', employeeId: 'e1', start: '07:00', end: '11:00' }
];
state.x2SayTimes = {};
state.x2SayIncidents = {};
const say1St = cap.CAP_STAGES.find(s => s.id === 'say1');
const say2St = cap.CAP_STAGES.find(s => s.id === 'say2');
const sayDays = cap.capStageDayRows(say1St, wk);
check('SẤY 1: 2 m³ vào Sấy 1 ngày 10/09 → 1 lần (dữ liệu mới đếm theo lượt lưu/mặc định)',
  sayDays.length === 1 && sayDays[0].turns === 1 && approx(sayDays[0].qty, 2));
check('SẤY 1: giờ cần = 105 phút ÷ 60 = 1,75h', approx(sayDays[0].need, 105 / 60));
check('SẤY 1: giờ thực từ Bảng bố trí "Than hóa" = 4h HC (07:00–11:00, không vắt nghỉ trưa)', approx(sayDays[0].hours, 4));
const sayRow = cap.capStageWeekRow(say1St, wk);
check('SẤY 1: hiệu suất = 1,75 ÷ 4 = 43,75%', approx(sayRow.eff, 43.75, 1e-4));
check('SẤY 1: nhãn ĐM 1 lần hiện "105\'" (phút/lần)', String(sayRow.rateText).includes("105'"));
state.x2SayIncidents = { '2026-09-10': 1 };
const sayRow2 = cap.capStageWeekRow(say1St, wk);
check('SẤY 1: có sự cố 1h → hiệu suất = 1,75 ÷ (4 − 1) ≈ 58,3%', approx(sayRow2.eff, (1.75 / 3) * 100, 1e-4));
check('SẤY 2: không có lô nào vào Sấy 2 → 0 lượt', cap.capStageWeekRow(say2St, wk).turns === 0);

// ─── G. ÉP VÁN: m³/h theo phân vị ÉP VÁN thật ───────────────────
state.pressRecords = [
  { id: 'p1', date: '2026-09-10', finishedQty: 20, vanTho: [{ vtDim: '1200x600x12', vtQty: 10 }] }
];
state.x2EpVanRates = { '2026-09': 0.03 };
const epSt = cap.CAP_STAGES.find(s => s.id === 'epvan');
const epRow = cap.capStageWeekRow(epSt, wk);
check('ÉP VÁN: thể tích tuần = 0,0864 m³ (10 tấm ván thô 1200×600×12)', approx(epRow.qty, 0.0864, 1e-6));
check('ÉP VÁN: giờ từ phân vị Ép = 4h', approx(epRow.hours, 4));
check('ÉP VÁN: hiệu suất = (0,0864÷4) ÷ 0,03 = 72%', approx(epRow.eff, 72, 1e-4));

// ─── H. HIỆU SUẤT XƯỞNG (tầng 1) = bình quân gia quyền theo giờ ──
const w = cap.capWorkshopWeekRow('x2', wk);
const expectedWsEff = (cutRowRated.eff * cutRowRated.hours + cnRow.eff * cnRow.hours + sayRow2.eff * sayRow2.hours + epRow.eff * epRow.hours)
  / (cutRowRated.hours + cnRow.hours + sayRow2.hours + epRow.hours);
check('XƯỞNG: 5 công đoạn có dữ liệu / 10 công đoạn', w.dataCount === 5 && w.stagesCount === 10);
check('XƯỞNG: tổng giờ = 9 + 4 + 3 + 4 + 4 = 24h (mỗi ngày mỗi CĐ đếm 1 lần)', approx(w.hours, 24));
check('XƯỞNG: 4 công đoạn tính được hiệu suất · 0 công đoạn đạt ≥100%', w.effCount === 4 && w.passCount === 0);
check('XƯỞNG: hiệu suất xưởng = bình quân gia quyền theo GIỜ', approx(w.eff, expectedWsEff, 1e-6));
check('XƯỞNG: nút thắt cổ chai = Sấy 1 (hiệu suất thấp nhất)', w.bottleneck && w.bottleneck.st.id === 'say1');

// ─── I. RENDER 3 TẦNG + ĐỔI XƯỞNG + THU GỌN ─────────────────────
cap.setCapacityWeek(wk);
check('RENDER: nhãn xưởng mặc định "Xưởng 2"', document.getElementById('capacity-mode-label').textContent === 'Xưởng 2');
check('RENDER: nhãn tuần hiện "Tuần ..."', document.getElementById('capacity-week-label').textContent.includes('Tuần'));
check('RENDER: dải chip tổng quan có "Hiệu suất xưởng" + "Nút thắt"',
  document.getElementById('cap-summary-strip').innerHTML.includes('Hiệu suất xưởng') &&
  document.getElementById('cap-summary-strip').innerHTML.includes('Nút thắt'));
const tbody = document.getElementById('capacity-week-rows');
check('RENDER: dòng tuần đang chọn mang data-cap-week-row', tbody.innerHTML.includes(`data-cap-week-row="${wk}"`));
check('RENDER: bảng tầng 1 có ít nhất 2 dòng tuần (tuần dữ liệu + tuần hiện tại)',
  (tbody.innerHTML.match(/data-cap-week-row=/g) || []).length >= 2);
check('RENDER: cột Nút thắt hiện đúng công đoạn thấp nhất', tbody.innerHTML.includes('Than Hóa + Sấy (Sấy 1)'));
cap.toggleCapacityWeekOpen(wk);
check('TẦNG 2: bấm tuần → xổ bảng công đoạn (có cột "Định mức tuần")', tbody.innerHTML.includes('Định mức tuần'));
check('TẦNG 2: có dòng Cắt Chọn kèm chip đơn vị kg/h', tbody.innerHTML.includes('Cắt Chọn') && tbody.innerHTML.includes('kg/h'));
check('TẦNG 2: dòng Bào Thô hiện "chưa có ĐM" (chưa khai định mức)', tbody.innerHTML.includes('chưa có ĐM'));
check('TẦNG 2: có cột So tuần trước + nút Mở thẻ công đoạn',
  tbody.innerHTML.includes('cap-delta') && tbody.innerHTML.includes('data-cap-open-card="x2-cut-card"'));
cap.toggleCapacityStageDays('cut');
check('TẦNG 3: bấm công đoạn → xổ khối NGÀY (cap-day-tr)', tbody.innerHTML.includes('cap-day-tr'));
check('TẦNG 3: ngày 10/09/26 · 1.500 kg · công suất ngày 300 kg/h (1500 ÷ 5h)', tbody.innerHTML.includes('10/09/26') && tbody.innerHTML.includes('1.500 kg') && tbody.innerHTML.includes('300 kg/h'));
cap.toggleCapacityStageDays('cut');
check('TẦNG 3: bấm lần nữa → đóng khối ngày', !tbody.innerHTML.includes('cap-day-tr'));
// ─── K. ĐIỀU HƯỚNG TUẦN + ĐỔI XƯỞNG + THU GỌN + NHỚ UI ─────────
cap.setCapacityWeek(wk);
cap.shiftCapacityWeek(1);
check('ĐIỀU HƯỚNG: › sang tuần kế → tuần mới được chọn + tầng công đoạn tự xổ',
  state.capUi.week === cap.capWeekShift(wk, 1) && state.capUi.weekOpen === state.capUi.week);
check('ĐIỀU HƯỚNG: tuần không có dữ liệu → hiện thông báo (không bịa số)',
  document.getElementById('capacity-week-rows').innerHTML.includes('Không có lượt nào trong tuần này'));
cap.toggleCapacityWorkshop();
check('XƯỞNG 1: đổi xưởng → nhãn "Xưởng 1" + thẻ gắn class cap-ws-x1',
  document.getElementById('capacity-mode-label').textContent === 'Xưởng 1' &&
  document.getElementById('capacity-card').classList.contains('cap-ws-x1'));
check('XƯỞNG 1: bảng hiện thông báo "Sắp có" (không bịa số)',
  document.getElementById('capacity-week-rows').innerHTML.includes('Xưởng 1 — Sắp có'));
check('XƯỞNG 1: sổ đăng ký chưa có công đoạn X1 · chưa có tuần dữ liệu',
  cap.capStagesOf('x1').length === 0 && cap.capWeekRowsFor('x1').length === 0);
cap.toggleCapacityWorkshop();
check('XƯỞNG 2: đổi lại → nhãn "Xưởng 2"', document.getElementById('capacity-mode-label').textContent === 'Xưởng 2');
cap.toggleCapacityCollapse();
check('THU GỌN: thân thẻ ẩn + nút thành "Mở rộng"',
  document.getElementById('capacity-body').hidden === true &&
  document.getElementById('cap-toggle-label').textContent === 'Mở rộng');
cap.toggleCapacityCollapse();
check('THU GỌN: mở lại thân thẻ', document.getElementById('capacity-body').hidden === false);
cap.setCapacityWeek(wk);
const savedUi = JSON.parse(localStorage.getItem(STORAGE_KEY_CAPACITY_UI) || '{}');
check('NHỚ UI: trạng thái đã lưu theo máy (xưởng + tuần đang xem)',
  savedUi.ws === 'x2' && savedUi.week === wk);
localStorage.setItem(STORAGE_KEY_CAPACITY_UI, JSON.stringify({ ws: 'x9', week: 'khong-hop-le', collapsed: 'yes' }));
cap.loadCapacityUi();
check('NHỚ UI: dữ liệu rác tự về mặc định an toàn (x2 · week rỗng · không thu gọn)',
  state.capUi.ws === 'x2' && state.capUi.week === '' && state.capUi.collapsed === false);
cap.setCapacityWeek(wk); // nạp lại tuần dữ liệu cho các kiểm thử sau

// ─── L. SPARKLINE HIỆU SUẤT 8 TUẦN TRÊN MINI CARD ───────────────
cap.renderX2MiniSparklines();
check('SPARK: thẻ Cắt Chọn có SVG + số % tuần này',
  document.getElementById('x2-mini-spark-cut').innerHTML.includes('cap-spark-svg') &&
  document.getElementById('x2-mini-spark-cut').innerHTML.includes('cap-spark-val'));
check('SPARK: thẻ Bullig chưa có dữ liệu → "chưa có ĐM" (không bịa số)',
  document.getElementById('x2-mini-spark-bullig').innerHTML.includes('cap-spark-none'));
check('SPARK: thẻ Than Hóa + Sấy có sparkline (Sấy 1 có hiệu suất)',
  document.getElementById('x2-mini-spark-than-hoa').innerHTML.includes('cap-spark-svg'));
const sparkCut = cap.capSparkSeries(['cut']);
check('SPARK: chuỗi 8 tuần · phần tử CUỐI là tuần có dữ liệu có hiệu suất',
  sparkCut.length === 8 && sparkCut[7].eff != null);
check('SPARK: 8 chổ gắn sparkline đều có trong index.html (8 thẻ launcher có dữ liệu)',
  ['cut', 'bo-ong', 'bao-tho', 'chon-nan-tho', 'than-hoa', 'bao-tinh', 'ep-van', 'bullig']
    .every(k => indexHtml.includes(`id="x2-mini-spark-${k}"`)));

// ─── M. CẤU TRÚC + SỔ ĐĂNG KÝ ───────────────────────────────────
check('CẤU TRÚC (index.html): thẻ tổng hợp đủ nút (đổi xưởng · tuần · thu gọn · bảng tuần)',
  indexHtml.includes('id="capacity-card"') && indexHtml.includes('id="capacity-week-rows"') &&
  indexHtml.includes('id="capacity-mode-toggle"') && indexHtml.includes('id="btn-toggle-capacity"') &&
  indexHtml.includes('id="capacity-week-prev"') && indexHtml.includes('id="capacity-week-next"'));
check('CẤU TRÚC (index.html): thẻ tổng hợp đặt TRƯỚC thẻ biểu đồ gộp #plan-vs-press-card (lãnh đạo thấy đầu tiên)',
  indexHtml.indexOf('id="capacity-card"') >= 0 &&
  indexHtml.indexOf('id="capacity-card"') < indexHtml.indexOf('id="plan-vs-press-card"'));
check('CẤU TRÚC (styles.css): khối CSS thẻ tổng hợp + sparkline + màu ngưỡng',
  stylesCss.includes('.cap-mode-btn') && stylesCss.includes('.cap-spark-svg') &&
  stylesCss.includes('.cap-eff-good') && stylesCss.includes('.cap-eff-low'));
check('CẤU TRÚC (sw.js): APP_SHELL có js/capacity.js', swJs.includes("'./js/capacity.js'"));
check('CẤU TRÚC (sw.js): đã tăng CACHE_NAME v194', /nha-may-ngoc-son-v197/.test(swJs));
check('SỔ ĐĂNG KÝ: 10 dòng công đoạn Xưởng 2 (Bullig tách Gia công/Chọn thanh) · Xưởng 1 = 0 dòng',
  cap.capStagesOf('x2').length === 10 && cap.capStagesOf('x1').length === 0);
check('SỔ ĐĂNG KÝ: mỗi công đoạn khai đủ đơn vị + thẻ gốc ở tab Công Đoạn (cardId)',
  cap.CAP_STAGES.every(s => s.cardId && s.unit && s.unitQty && s.ws === 'x2'));

// ─── N. CHẾ ĐỘ "BIỂU ĐỒ" ⇄ "BẢNG DỮ LIỆU" + 4 WIDGET TRỰC QUAN ──
state.capUi.chartStage = '';
cap.setCapacityWeek(wk); // render lại với tuần dữ liệu (chế độ mặc định)
const visualRow = document.getElementById('cap-visual-row');
check('CHẾ ĐỘ: mặc định là "Biểu đồ" (visual)', state.capUi.view === 'visual');
check('CHẾ ĐỘ: nút "Biểu đồ" đang active, nút "Bảng" không',
  document.getElementById('cap-view-visual').classList.contains('active') &&
  !document.getElementById('cap-view-table').classList.contains('active'));
const wEffNow = cap.capWorkshopWeekRow('x2', wk);
check('GAUGE: có đồng hồ + số % khớp hiệu suất xưởng tính được',
  visualRow.innerHTML.includes('cap-gauge-val') &&
  visualRow.innerHTML.includes(wEffNow.eff.toLocaleString('vi-VN', { maximumFractionDigits: 1 }) + '%'));
check('GAUGE: chip "Nút thắt" hiện đúng công đoạn Sấy 1',
  visualRow.innerHTML.includes('Nút thắt') && visualRow.innerHTML.includes('Sấy 1'));
check('RANK: đủ 10 hàng công đoạn (data-cap-rank)', (visualRow.innerHTML.match(/data-cap-rank=/g) || []).length === 10);
check('RANK: tag "nút thắt" gắn đúng Sấy 1', /Sấy 1[^<]*<em class="cap-rank-bt"/.test(visualRow.innerHTML));
check('HEAT: đủ 80 ô dữ liệu (8 tuần × 10 công đoạn)', (visualRow.innerHTML.match(/data-cap-heat="/g) || []).length === 80);
check('HEAT: legend đủ 4 mức màu', (visualRow.innerHTML.match(/cap-legend-item/g) || []).length === 4);
check('CHART: mặc định tự chọn NÚT THẮT (Sấy 1) → panel đúng tiêu đề + canvas (trong dải trực quan)',
  state.capUi.chartStage === 'say1' &&
  visualRow.innerHTML.includes('cap-chart-head') && visualRow.innerHTML.includes('Sấy 1') &&
  visualRow.innerHTML.includes('id="cap-stage-chart"'));
check('CHART: instance Chart.js đã tạo', !!state.capacityStageInstance);
cap.selectCapacityStage('cut');
check('CHART: bấm hàng rank "Cắt Chọn" → panel đổi tiêu đề + dựng lại instance',
  visualRow.innerHTML.includes('<strong>Cắt Chọn</strong> — 8 tuần gần nhất') && !!state.capacityStageInstance);
cap.selectCapacityStage('cut'); // bấm lần nữa → đóng panel
check('CHART: bấm lần nữa → đóng panel (KHÔNG tự mở lại nút thắt)',
  state.capUi.chartStage === '' && state.capUi.chartClosed === true &&
  document.getElementById('cap-stage-chart-panel').hidden === true && state.capacityStageInstance == null);
cap.selectCapacityStage('cut', cap.capWeekShift(wk, -1)); // bấm ô nhiệt tuần trước
check('CHART: bấm ô nhiệt tuần trước → đổi tuần + mở panel đúng công đoạn',
  state.capUi.week === cap.capWeekShift(wk, -1) && state.capUi.chartStage === 'cut');
cap.setCapacityWeek(wk); // quay lại tuần dữ liệu
// Thiếu Chart.js → hiện text thay thế, KHÔNG crash (guard window.Chart)
const ChartStubKeep = global.Chart;
delete global.Chart;
cap.selectCapacityStage('baotinh');
check('CHART: thiếu Chart.js → hiện text thay thế, instance hủy sạch',
  document.getElementById('cap-stage-chart-box').innerHTML.includes('cap-chart-fallback') &&
  state.capacityStageInstance == null);
global.Chart = ChartStubKeep;
cap.selectCapacityStage('cut'); // khôi phục canvas + biểu đồ
// Chuyển sang chế độ BẢNG DỮ LIỆU
cap.setCapacityView('table');
check('CHẾ ĐỘ: nút "Bảng dữ liệu" active + dải trực quan ẨN và RỖNG (tránh 2 canvas cùng id)',
  document.getElementById('cap-view-table').classList.contains('active') &&
  document.getElementById('cap-visual-row').hidden === true &&
  document.getElementById('cap-visual-row').innerHTML === '');
check('CHẾ ĐỘ: bảng 3 tầng hiện lại (table-wrap không ẩn)', document.getElementById('cap-table-wrap').hidden === false);
cap.toggleCapacityWeekOpen(wk); // mở tầng công đoạn của tuần dữ liệu
cap.toggleCapacityStageDays('cut');
check('CHẾ ĐỘ BẢNG: tầng 2 mở → chart combo hiện ngay trong khối tầng 2 (cap-chart-tr + instance)',
  document.getElementById('capacity-week-rows').innerHTML.includes('cap-chart-tr') && !!state.capacityStageInstance);
cap.toggleCapacityStageDays('cut');
const savedView = JSON.parse(localStorage.getItem(STORAGE_KEY_CAPACITY_UI) || '{}');
check('NHỚ UI: chế độ "Bảng dữ liệu" đã lưu theo máy', savedView.view === 'table');
cap.setCapacityView('visual');
const savedView2 = JSON.parse(localStorage.getItem(STORAGE_KEY_CAPACITY_UI) || '{}');
check('CHẾ ĐỘ: quay lại "Biểu đồ" → dải trực quan đủ 4 khối + đã lưu',
  savedView2.view === 'visual' && document.getElementById('cap-visual-row').hidden === false &&
  visualRow.innerHTML.includes('cap-gauge') && visualRow.innerHTML.includes('cap-rank') &&
  visualRow.innerHTML.includes('cap-heat') && visualRow.innerHTML.includes('cap-stage-chart-panel'));
const dashJs = fs.readFileSync(new URL('../js/dashboard.js', import.meta.url), 'utf8');
const capJs = fs.readFileSync(new URL('../js/capacity.js', import.meta.url), 'utf8');
check('CẤU TRÚC (index.html): nút chuyển chế độ + khối trực quan (canvas do JS dựng)',
  indexHtml.includes('data-cap-view="visual"') && indexHtml.includes('data-cap-view="table"') &&
  indexHtml.includes('id="cap-visual-row"') && indexHtml.includes('id="cap-table-wrap"'));
check('CẤU TRÚC (capacity.js): panel biểu đồ dựng canvas #cap-stage-chart + plugin vạch 100%',
  capJs.includes('id="cap-stage-chart"') && capJs.includes("id: 'capTargetLine'"));
check('CẤU TRÚC (dashboard.js): nút mở rộng nhận thẻ tổng hợp + instance chart riêng',
  dashJs.includes('.capacity-card') && dashJs.includes('#cap-stage-chart'));
check('CẤU TRÚC (styles.css): CSS widget trực quan + fullscreen thẻ tổng hợp',
  stylesCss.includes('.cap-heat-cell') && stylesCss.includes('.cap-gauge-svg') &&
  stylesCss.includes('.capacity-card:fullscreen'));

// ─── O. NÚT CHẾ ĐỘ TƯƠNG PHẢN · KÉO NGANG NHIỆT · MÀU TAB ĐANG CHỌN ──
check('NÚT CHẾ ĐỘ: nút chưa chọn = chữ ĐẬM (không còn chữ trắng khó thấy)',
  stylesCss.includes('.pv-unit-btn {') &&
  stylesCss.includes('color: var(--text-main); /* chữ ĐẬM — đọc rõ trên nền thẻ sáng/khaki */'));
check('NÚT CHẾ ĐỘ: nút đang chọn nổi gradient xanh teal + chữ trắng',
  stylesCss.includes('.pv-unit-btn.active') &&
  stylesCss.includes('background: linear-gradient(135deg, #0f766e, #0369a1)'));
check('NHIỆT: cuộn ngang mượt (touch + overscroll contain) + scrollbar mảnh',
  stylesCss.includes('.cap-heat-grid') && stylesCss.includes('-webkit-overflow-scrolling: touch;   /* cuộn mượt trên iOS */') &&
  stylesCss.includes('overscroll-behavior-x: contain') && stylesCss.includes('.cap-heat-grid.cap-heat-dragging'));
check('NHIỆT: kéo ngang bằng chuột/cảm ứng (Pointer Events trong capacity.js)',
  capJs.includes('capAttachHeatDrag') && capJs.includes('pointerdown') && capJs.includes('scrollLeft = startLeft - dx'));
check('NHIỆT: lưới nhiệt có id="cap-heat-grid" — hàm kéo ngang tìm ĐÚNG phần tử\n' +
  '  (trước đây markup thiếu id → getElementById trả null → kéo chuột không bao giờ gắn được)',
  capJs.includes('id="cap-heat-grid"') && capJs.includes("getElementById('cap-heat-grid')"));
check('TAB: bỏ ép màu xanh lá #2e7d32 cho tab đang chọn ở theme hiện tại',
  !stylesCss.includes('body[data-theme="night"] .nav-btn.active') &&
  !stylesCss.includes('#2e7d32;\n  text-shadow'));
check('TAB: tab Nhân Sự có màu đặc trưng riêng (hổ phách) + bỏ accent tab đã xóa',
  stylesCss.includes('data-target="hr-view"') && stylesCss.includes('--tab-accent: #d97706') &&
  !stylesCss.includes('data-target="press-view"'));

// ─── P. CHẾ ĐỘ THÁNG + GIỜ HC/TC TÁCH RIÊNG + IN BÁO CÁO (30/09/2026) ──
// P1. Nhãn + dịch tháng (vắt năm)
check('THÁNG: dịch ±1 tháng vắt năm đúng (2025-01 −1 = 2024-12 · 2024-12 +1 = 2025-01)',
  cap.capMonthShift('2025-01', -1) === '2024-12' && cap.capMonthShift('2024-12', 1) === '2025-01');
check('THÁNG: nhãn đầy đủ = "Tháng 9/2026 · 01/09 – 30/09"',
  cap.capMonthHeadLabel('2026-09') === 'Tháng 9/2026' &&
  cap.capMonthRangeLabel('2026-09') === '01/09 – 30/09' &&
  cap.capPeriodLabel('2026-09', 'month') === 'Tháng 9/2026 · 01/09 – 30/09');
check('THÁNG: nhãn rút gọn "T9" cho trục biểu đồ/ô bản đồ nhiệt',
  cap.capPeriodShortLabel('2026-09', 'month') === 'T9' && cap.capPeriodShortLabel(wk, 'week') === `T${cap.capWeekNumOf(wk)}`);

// P2. Gộp theo THÁNG (mode='month') — cùng dữ liệu đã seed ở trên
const cutStP = cap.CAP_STAGES.find(s => s.id === 'cut');
const cutMonthRow = cap.capStagePeriodRow(cutStP, '2026-09', 'month');
check('THÁNG: Cắt Chọn gộp CẢ THÁNG = 3 lượt · 2.300 kg · 9 giờ (giờ vẫn đếm 1 lần/ngày)',
  cutMonthRow.turns === 3 && cutMonthRow.qty === 2300 && cutMonthRow.hours === 9);
check('THÁNG: định mức = ĐM của chính tháng (300 kg/h) → hiệu suất ≈ 85,2%',
  approx(cutMonthRow.rate, 300) && approx(cutMonthRow.eff, (2300 / 9) / 300 * 100, 1e-4));
check('TUẦN: bản cũ capStageWeekRow giữ nguyên hành vi (không đổi gì)',
  cap.capStageWeekRow(cutStP, wk).turns === 3 && cap.capStageWeekRow(cutStP, wk).hours === 9);

// P3. Đổi chế độ + chọn tháng + điều hướng kỳ
cap.setCapacityMode('month');
check('THÁNG: setCapacityMode("month") → mode = "month" + tự neo kỳ mới nhất CÓ dữ liệu (2026-09)',
  state.capUi.mode === 'month' && state.capUi.week === '' && cap.capSelectedPeriod() === '2026-09');
cap.setCapacityMonth('2026-09');
check('THÁNG: chọn tháng 9/2026 → nhãn thẻ hiện "Tháng 9/2026"',
  state.capUi.week === '2026-09' &&
  document.getElementById('capacity-week-label').textContent.includes('Tháng 9/2026'));
check('THÁNG: ô chọn tháng #cap-month hiện ra + đồng bộ đúng giá trị',
  document.getElementById('cap-month').hidden === false &&
  document.getElementById('cap-month').value === '2026-09');
cap.shiftCapacityWeek(1);
check('THÁNG: › nhảy sang tháng kế (2026-10) + tầng công đoạn tự xổ',
  state.capUi.week === cap.capMonthShift('2026-09', 1) && state.capUi.weekOpen === state.capUi.week);
cap.setCapacityMonth('2026-09'); // tự xổ tầng công đoạn của tháng 9
cap.toggleCapacityStageDays('cut');
const capTbodyMonth = document.getElementById('capacity-week-rows');
check('THÁNG: tầng 2 có cột "Định mức tháng" + "So tháng trước" + Giờ HC/TC tách riêng (cap-hc/cap-tc)',
  capTbodyMonth.innerHTML.includes('Định mức tháng') && capTbodyMonth.innerHTML.includes('So tháng trước') &&
  capTbodyMonth.innerHTML.includes('cap-hc') && capTbodyMonth.innerHTML.includes('cap-tc'));
cap.toggleCapacityStageDays('cut');

// P4. Giờ HC/TC ở chip tổng quan + tổng xưởng
cap.setCapacityView('visual');
const stripMonth = document.getElementById('cap-summary-strip');
check('HC/TC: dải chip có "Giờ HC" · "Giờ TC" · "Tổng" (tách riêng, không gộp "x (a/b)")',
  stripMonth.innerHTML.includes('Giờ HC') && stripMonth.innerHTML.includes('Giờ TC') &&
  stripMonth.innerHTML.includes('Tổng'));
const wSep = cap.capWorkshopWeekRow('x2', wk);
check('HC/TC: tổng xưởng tuần dữ liệu — HC = 8h (Sấy 4h + Ép 4h) · TC = 0 · tổng giờ 24h',
  approx(wSep.hc, 8) && wSep.tc === 0 && approx(wSep.hours, 24));

// P5. Báo cáo IN — chỉ thông tin chung của TẤT CẢ bộ phận
const reportHtml = cap.buildCapacityReportHtml();
check('IN: báo cáo có tiêu đề NHÀ MÁY + kỳ báo cáo đang xem (Tháng 9/2026)',
  reportHtml.includes('NHÀ MÁY NGỌC SƠN THANH HÓA') && reportHtml.includes('Tháng 9/2026'));
check('IN: gồm TẤT CẢ bộ phận trong sổ CAP_WORKSHOPS (Xưởng 2 có bảng + TỔNG, Xưởng 1 ghi chú chưa có dữ liệu)',
  reportHtml.includes('Xưởng 2') && reportHtml.includes('TỔNG Xưởng 2') &&
  reportHtml.includes('Xưởng 1') && reportHtml.includes('Chưa có công đoạn nào'));
check('IN: bảng có cột Giờ HC · Giờ TC · Tổng giờ RIÊNG BIỆT',
  reportHtml.includes('Giờ HC') && reportHtml.includes('Giờ TC') && reportHtml.includes('Tổng giờ'));
check('IN: KHÔNG chứa bản đồ nhiệt (data-cap-heat) · biểu đồ 8 kỳ (cap-stage-chart) · gauge (cap-gauge)',
  !reportHtml.includes('data-cap-heat') && !reportHtml.includes('cap-stage-chart') && !reportHtml.includes('cap-gauge'));
check('IN: dòng TỔNG xưởng KHÔNG cộng sản lượng khác đơn vị (ô sản lượng là "—")',
  /TỔNG Xưởng 2[\s\S]*?<td class="num"[^>]*>—<\/td>/.test(reportHtml));
cap.setCapacityMode('week');
const reportWeek = cap.buildCapacityReportHtml();
check('IN: chế độ TUẦN → báo cáo neo đúng tuần đang xem (nhãn "Tuần ...")',
  reportWeek.includes('THEO TUẦN') && reportWeek.includes('Tuần '));

// P6. CẤU TRÚC mới trong index.html / styles.css / events.js
const evJs = fs.readFileSync(new URL('../js/events.js', import.meta.url), 'utf8');
check('CẤU TRÚC (index.html): đủ nút Tuần⇄Tháng + ô chọn tháng + In báo cáo + vùng in riêng',
  indexHtml.includes('id="cap-mode-week"') && indexHtml.includes('id="cap-mode-month"') &&
  indexHtml.includes('id="cap-month"') && indexHtml.includes('id="btn-cap-print"') &&
  indexHtml.includes('id="cap-print-area"'));
check('CẤU TRÚC (styles.css): CSS ô chọn tháng + khối in body.cap-printing (A4 ngang)',
  stylesCss.includes('.cap-month-input') && stylesCss.includes('body.cap-printing #cap-print-area') &&
  stylesCss.includes('@page { size: A4 landscape; margin: 8mm; }'));
check('CẤU TRÚC (events.js): đã nối Tuần⇄Tháng + ô tháng + In báo cáo',
  evJs.includes("setCapacityMode('week')") && evJs.includes("setCapacityMode('month')") &&
  evJs.includes('setCapacityMonth') && evJs.includes("'btn-cap-print'"));

// ─── Tổng kết ───────────────────────────────────────────────────
console.log(`\nKết quả: ${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
