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
check('CẮT: sản lượng ngày 10/09 = 2,5 xe (1.000÷600 + 500÷600 — đơn vị mới xe/h)',
  Math.abs(cutDays[0].qty - 2.5) < 1e-9);
const cutRow = cap.capStageWeekRow(cutSt, wk); // CHƯA có ĐM — dùng kiểm tra số thô
check('CẮT: tuần = 3 lượt · 3,83 xe · 9 giờ (5 + 4)',
  cutRow.turns === 3 && Math.abs(cutRow.qty - (2300 / 600)) < 1e-9 && cutRow.hours === 9);
check('CẮT: chưa có ĐM → hiệu suất tuần "—"', cutRow.eff == null);
// Định mức CŨ khai 300 kg/h → tự quy đổi ÷ 600 = 0,5 xe/h (hiệu suất KHÔNG đổi)
state.x2CapRates = { '2026-09': 300 };
const cutRowRated = cap.capStageWeekRow(cutSt, wk);
check('CẮT: công suất tuần = 3,83 xe ÷ 9h ≈ 0,426 xe/h', approx(cutRowRated.cap, (2300 / 600) / 9));
check('CẮT: ĐM cũ 300 kg/h → 0,5 xe/h · hiệu suất tuần vẫn ≈ 85,2%',
  approx(cutRowRated.rate, 0.5) && approx(cutRowRated.eff, (2300 / 600) / 9 / 0.5 * 100, 1e-4));
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
const saySt = cap.CAP_STAGES.find(s => s.id === 'say');
const sayDays = cap.capStageDayRows(saySt, wk);
check('THAN HÓA + SẤY: 1 công đoạn GỘP — KHÔNG còn 2 dòng "Sấy 1" / "Sấy 2" (18/10/2026)',
  !!saySt && saySt.label === 'Than Hóa + Sấy' &&
  cap.CAP_STAGES.filter(s => s.id === 'say1' || s.id === 'say2').length === 0);
check('THAN HÓA + SẤY: 2 m³ vào sấy ngày 10/09 → 1 lần (dữ liệu mới đếm theo lượt lưu/mặc định)',
  sayDays.length === 1 && sayDays[0].turns === 1 && approx(sayDays[0].qty, 2));
check('THAN HÓA + SẤY: giờ cần = 105 phút ÷ 60 = 1,75h', approx(sayDays[0].need, 105 / 60));
check('THAN HÓA + SẤY: giờ thực từ Bảng bố trí "Than hóa" = 4h HC (07:00–11:00, không vắt nghỉ trưa)', approx(sayDays[0].hours, 4));
const sayRow = cap.capStageWeekRow(saySt, wk);
check('THAN HÓA + SẤY: hiệu suất = 1,75 ÷ 4 = 43,75%', approx(sayRow.eff, 43.75, 1e-4));
check('THAN HÓA + SẤY: nhãn ĐM hiện đủ 2 công đoạn sấy (S1 · S2) + phút/lần "105\'"',
  String(sayRow.rateText).includes('S1') && String(sayRow.rateText).includes('S2') && String(sayRow.rateText).includes("105'"));
state.x2SayIncidents = { '2026-09-10': 1 };
const sayRow2 = cap.capStageWeekRow(saySt, wk);
check('THAN HÓA + SẤY: có sự cố 1h → hiệu suất = 1,75 ÷ (4 − 1) ≈ 58,3%', approx(sayRow2.eff, (1.75 / 3) * 100, 1e-4));

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
check('XƯỞNG: 5 công đoạn có dữ liệu / 14 công đoạn', w.dataCount === 5 && w.stagesCount === 14);
check('XƯỞNG: tổng giờ = 9 + 4 + 3 + 4 + 4 = 24h (mỗi ngày mỗi CĐ đếm 1 lần)', approx(w.hours, 24));
check('XƯỞNG: 4 công đoạn tính được hiệu suất · 0 công đoạn đạt ≥100%', w.effCount === 4 && w.passCount === 0);
check('XƯỞNG: hiệu suất xưởng = bình quân gia quyền theo GIỜ', approx(w.eff, expectedWsEff, 1e-6));
check('XƯỞNG: nút thắt cổ chai = Than Hóa + Sấy (hiệu suất thấp nhất)', w.bottleneck && w.bottleneck.st.id === 'say');

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
check('RENDER: cột Nút thắt hiện đúng công đoạn thấp nhất', tbody.innerHTML.includes('Than Hóa + Sấy'));
cap.toggleCapacityWeekOpen(wk);
check('TẦNG 2: bấm tuần → xổ bảng công đoạn (có cột "Định mức tuần")', tbody.innerHTML.includes('Định mức tuần'));
check('TẦNG 2: có dòng Cắt Chọn kèm chip đơn vị xe/h', tbody.innerHTML.includes('Cắt Chọn') && tbody.innerHTML.includes('xe/h'));
check('TẦNG 2: dòng Bào Thô hiện "chưa có ĐM" (chưa khai định mức)', tbody.innerHTML.includes('chưa có ĐM'));
check('TẦNG 2: có cột So tuần trước + nút Mở thẻ công đoạn',
  tbody.innerHTML.includes('cap-delta') && tbody.innerHTML.includes('data-cap-open-card="x2-cut-card"'));
cap.toggleCapacityStageDays('cut');
check('TẦNG 3: bấm công đoạn → xổ khối NGÀY (cap-day-tr)', tbody.innerHTML.includes('cap-day-tr'));
check('TẦNG 3: ngày 10/09/26 · 2,5 xe · công suất ngày 0,5 xe/h (2,5 ÷ 5h)', tbody.innerHTML.includes('10/09/26') && tbody.innerHTML.includes('2,5 xe') && tbody.innerHTML.includes('0,5 xe/h'));
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
check('XƯỞNG 1: bảng hiện thông báo "chưa có số liệu" (đã khai 3 công đoạn, chưa ghi lượt — KHÔNG bịa số)',
  document.getElementById('capacity-week-rows').innerHTML.includes('Xưởng 1 — chưa có số liệu.') &&
  document.getElementById('capacity-week-rows').innerHTML.includes('Cắt Ống · Sấy Sinh · Bốc'));
check('XƯỞNG 1: sổ đăng ký đã có 8 công đoạn X1 · chưa có tuần dữ liệu nào',
  cap.capStagesOf('x1').length === 8 && cap.capWeekRowsFor('x1').length === 0);
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
check('SPARK: thẻ Than Hóa + Sấy có sparkline (dòng gộp có hiệu suất)',
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
check('CẤU TRÚC (index.html): chữ nút toolbar bọc .cap-btn-text để gọn trên điện thoại (desktop vẫn hiện)',
  indexHtml.includes('class="cap-btn-text">Biểu đồ') && indexHtml.includes('class="cap-btn-text">Bảng dữ liệu') &&
  indexHtml.includes('class="cap-btn-text">In báo cáo') && indexHtml.includes('id="cap-toggle-label"') &&
  indexHtml.includes('id="cap-view-visual"') && indexHtml.includes('id="btn-cap-print"'));
check('CẤU TRÚC (styles.css): khối CSS thẻ tổng hợp + sparkline + màu ngưỡng',
  stylesCss.includes('.cap-mode-btn') && stylesCss.includes('.cap-spark-svg') &&
  stylesCss.includes('.cap-eff-good') && stylesCss.includes('.cap-eff-low'));
check('CẤU TRÚC (styles.css): điện thoại ẩn chữ cụm Biểu đồ/Bảng + In/Thu gọn, giữ chữ Tuần/Tháng',
  stylesCss.includes('.cap-view-toggle .cap-btn-text') && stylesCss.includes('display: none') &&
  stylesCss.includes('.cap-period-toggle .pv-unit-btn'));
check('CẤU TRÚC (sw.js): APP_SHELL có js/capacity.js', swJs.includes("'./js/capacity.js'"));
check('CẤU TRÚC (sw.js): đã tăng CACHE_NAME v318', /nha-may-ngoc-son-v318/.test(swJs));
check('SỔ ĐĂNG KÝ: 14 dòng công đoạn Xưởng 2 (Than Hóa + Sấy GỘP 1 dòng · Bullig · Cắt Ván · Bào Ván tách 2) · 8 dòng Xưởng 1',
  cap.capStagesOf('x2').length === 14 && cap.capStagesOf('x1').length === 8 &&
  cap.capStagesOf('x1').map(s => s.id).join(',') ===
    'x1catong,x1saysinh,x1boc,x1locong,x1catmat,x1bo,x1phoisay,x1locthanh');
check('SỔ ĐĂNG KÝ: mỗi công đoạn khai đủ đơn vị + thẻ gốc ở tab Công Đoạn (cardId) + xưởng đúng',
  cap.CAP_STAGES.every(s => s.cardId && s.unit && s.unitQty &&
    (s.ws === 'x2' || (s.ws === 'x1' && s.cardId.startsWith('x1-')))) &&
  cap.CAP_STAGES.filter(s => s.ws === 'x1').every(s => s.cardId.startsWith('x1-')));

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
check('GAUGE: chip "Nút thắt" hiện đúng công đoạn Than Hóa + Sấy',
  visualRow.innerHTML.includes('Nút thắt') && visualRow.innerHTML.includes('Than Hóa + Sấy'));
check('RANK: đủ 14 hàng công đoạn (data-cap-rank)', (visualRow.innerHTML.match(/data-cap-rank=/g) || []).length === 14);
check('RANK: tag "nút thắt" gắn đúng Than Hóa + Sấy', /Than Hóa \+ Sấy[^<]*<em class="cap-rank-bt"/.test(visualRow.innerHTML));
check('GỠ BẢN ĐỒ NHIỆT: dải trực quan KHÔNG còn lưới nhiệt (đã bỏ 21/10/2026 để tiết kiệm diện tích)',
  !visualRow.innerHTML.includes('data-cap-heat') && !visualRow.innerHTML.includes('cap-heat'));
check('CHART: mặc định tự chọn NÚT THẮT (Than Hóa + Sấy) → panel đúng tiêu đề + canvas (trong dải trực quan)',
  state.capUi.chartStage === 'say' &&
  visualRow.innerHTML.includes('cap-chart-head') && visualRow.innerHTML.includes('Than Hóa + Sấy') &&
  visualRow.innerHTML.includes('id="cap-stage-chart"'));
check('CHART: instance Chart.js đã tạo', !!state.capacityStageInstance);
cap.selectCapacityStage('cut');
check('CHART: bấm hàng rank "Cắt Chọn" → panel đổi tiêu đề + dựng lại instance',
  visualRow.innerHTML.includes('<strong>Cắt Chọn</strong> — 8 tuần gần nhất') && !!state.capacityStageInstance);
cap.selectCapacityStage('cut'); // bấm lần nữa → đóng panel
check('CHART: bấm lần nữa → đóng panel (KHÔNG tự mở lại nút thắt)',
  state.capUi.chartStage === '' && state.capUi.chartClosed === true &&
  document.getElementById('cap-stage-chart-panel').hidden === true && state.capacityStageInstance == null);
cap.setCapacityWeek(cap.capWeekShift(wk, -1)); // đổi kỳ về tuần trước
cap.selectCapacityStage('cut');
check('CHART: đổi kỳ (‹ ›) rồi chọn công đoạn → đúng kỳ + mở panel đúng công đoạn',
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
check('CHẾ ĐỘ: quay lại "Biểu đồ" → dải trực quan đủ 3 khối + đã lưu',
  savedView2.view === 'visual' && document.getElementById('cap-visual-row').hidden === false &&
  visualRow.innerHTML.includes('cap-gauge') && visualRow.innerHTML.includes('cap-rank') &&
  !visualRow.innerHTML.includes('cap-heat') && visualRow.innerHTML.includes('cap-stage-chart-panel'));
const dashJs = fs.readFileSync(new URL('../js/dashboard.js', import.meta.url), 'utf8');
const capJs = fs.readFileSync(new URL('../js/capacity.js', import.meta.url), 'utf8');
check('CẤU TRÚC (index.html): nút chuyển chế độ + khối trực quan (canvas do JS dựng)',
  indexHtml.includes('data-cap-view="visual"') && indexHtml.includes('data-cap-view="table"') &&
  indexHtml.includes('id="cap-visual-row"') && indexHtml.includes('id="cap-table-wrap"'));
check('CẤU TRÚC (capacity.js): panel biểu đồ dựng canvas #cap-stage-chart + plugin vạch 100%',
  capJs.includes('id="cap-stage-chart"') && capJs.includes("id: 'capTargetLine'"));
check('CẤU TRÚC (dashboard.js): nút mở rộng nhận thẻ tổng hợp + instance chart riêng',
  dashJs.includes('.capacity-card') && dashJs.includes('#cap-stage-chart'));
check('CẤU TRÚC (styles.css): CSS widget trực quan + cảnh báo quá hạn + fullscreen thẻ tổng hợp',
  stylesCss.includes('.cap-stale-head') && stylesCss.includes('.cap-gauge-svg') &&
  stylesCss.includes('.capacity-card:fullscreen') && !stylesCss.includes('.cap-heat-cell'));

// ─── O. NÚT CHẾ ĐỘ TƯƠNG PHẢN · KÉO NGANG NHIỆT · MÀU TAB ĐANG CHỌN ──
check('NÚT CHẾ ĐỘ: nút chưa chọn = chữ ĐẬM (không còn chữ trắng khó thấy)',
  stylesCss.includes('.pv-unit-btn {') &&
  stylesCss.includes('color: var(--text-main); /* chữ ĐẬM — đọc rõ trên nền thẻ sáng/khaki */'));
check('NÚT CHẾ ĐỘ: nút đang chọn nổi gradient xanh teal + chữ trắng',
  stylesCss.includes('.pv-unit-btn.active') &&
  stylesCss.includes('background: linear-gradient(135deg, #0f766e, #0369a1)'));
check('GỠ BẢN ĐỒ NHIỆT: KHÔNG còn CSS lưới nhiệt / kéo ngang nhiệt (đã bỏ 21/10/2026)',
  !stylesCss.includes('.cap-heat-grid') && !stylesCss.includes('.cap-heat-dragging') &&
  !stylesCss.includes('.cap-heat-cell') && !capJs.includes('capAttachHeatDrag'));
check('GỠ BẢN ĐỒ NHIỆT: KHÔNG còn markup/handler ô nhiệt trong capacity.js + events.js',
  !capJs.includes('data-cap-heat') && !capJs.includes('capHeatHtml') &&
  !fs.readFileSync(new URL('../js/events.js', import.meta.url), 'utf8').includes('data-cap-heat'));
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
check('THÁNG: nhãn rút gọn "T9" cho trục biểu đồ', 
  cap.capPeriodShortLabel('2026-09', 'month') === 'T9' && cap.capPeriodShortLabel(wk, 'week') === `T${cap.capWeekNumOf(wk)}`);

// P2. Gộp theo THÁNG (mode='month') — cùng dữ liệu đã seed ở trên
const cutStP = cap.CAP_STAGES.find(s => s.id === 'cut');
const cutMonthRow = cap.capStagePeriodRow(cutStP, '2026-09', 'month');
check('THÁNG: Cắt Chọn gộp CẢ THÁNG = 3 lượt · 3,83 xe · 9 giờ (giờ vẫn đếm 1 lần/ngày)',
  cutMonthRow.turns === 3 && Math.abs(cutMonthRow.qty - (2300 / 600)) < 1e-9 && cutMonthRow.hours === 9);
check('THÁNG: định mức cũ 300 kg/h → 0,5 xe/h → hiệu suất ≈ 85,2%',
  approx(cutMonthRow.rate, 0.5) && approx(cutMonthRow.eff, (2300 / 600) / 9 / 0.5 * 100, 1e-4));
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
check('IN: KHÔNG chứa bản đồ nhiệt (đã gỡ) · biểu đồ 8 kỳ (cap-stage-chart) · gauge (cap-gauge)',
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

// ─── R. HIỆU SUẤT THAN HÓA + SẤY TÍNH TRONG CA (18/10/2026) ─────
// 2 ca cùng ngày → mỗi ca 1 dòng, giờ là giờ THẬT của ca; KHÔNG chia Sấy 1/Sấy 2
// và KHÔNG nhân đôi giờ (Σ giờ các ca = đúng giờ của ngày).
const D2 = '2026-09-21';
const wk2 = cap.capWeekKeyOf(D2);
state.hrShifts = [{
  id: 'Xưởng 2', type: 'lamca',
  shifts: [{ name: 'Ca ngày', start: '07:00', end: '19:00' }, { name: 'Ca đêm', start: '19:00', end: '07:00' }]
}];
state.hrWorkCalendar = {};
state.hrPositions = [{ id: 'pth', name: 'Than hóa', department: 'Xưởng 2' }];
state.hrEmployees = [{ id: 'e1', name: 'Nguyễn Văn A' }, { id: 'e2', name: 'Trần Thị B' }];
state.hrAssignments = [
  { id: 'ta1', date: D2, department: 'Xưởng 2', positionId: 'pth', employeeId: 'e1', start: '07:00', end: '19:00', shiftIdx: 0 },
  { id: 'ta2', date: D2, department: 'Xưởng 2', positionId: 'pth', employeeId: 'e2', start: '19:00', end: '07:00', shiftIdx: 1 }
];
state.batches = [
  { id: 'sl1', code: 'SL-1', date: D2, stage: 'say1', quantity: 1000, volume: 4, length: 1250, width: 18, thickness: 7, sayCharges: { say1: 111 }, sayShift: { say1: 0 } },
  { id: 'sl2', code: 'SL-2', date: D2, stage: 'say1', quantity: 500, volume: 2, length: 1250, width: 18, thickness: 9, sayCharges: { say1: 222 }, sayShift: { say1: 1 } }
];
state.x2SayIncidents = {};
state.x2SayTimes = {};
const sayWeek2 = cap.capStagePeriodRow(saySt, wk2, 'week');
check('CA (Tổng hợp): 2 ca cùng ngày → 2 DÒNG (ngày, ca) — KHÔNG tách Sấy 1 / Sấy 2',
  sayWeek2.days.length === 2 && sayWeek2.days.map(d => d.shiftIdx).join(',') === '0,1');
check('CA (Tổng hợp): giờ từng ca là GIỜ THẬT (ca ngày 10,5h · ca đêm 11h) — Σ 21,5h = giờ ngày (KHÔNG nhân đôi)',
  approx(sayWeek2.days[0].hours, 10.5) && approx(sayWeek2.days[1].hours, 11) && approx(sayWeek2.hours, 21.5));
check('CA (Tổng hợp): hiệu suất kỳ = Σ giờ cần (3,5h) ÷ Σ giờ thực (21,5h) ≈ 16,3%',
  approx(sayWeek2.days.reduce((a, d) => a + d.need, 0), 3.5) && approx(sayWeek2.eff, (3.5 / 21.5) * 100, 1e-4));
check('CA (Tổng hợp): hiệu suất TỪNG CA = giờ cần của ca ÷ giờ thực của ca (1,75 ÷ 10,5 ≈ 16,7%)',
  approx((sayWeek2.days[0].need / (sayWeek2.days[0].hours - sayWeek2.days[0].incident)) * 100, (1.75 / 10.5) * 100, 1e-4));
check('CA (Tổng hợp): m³ của ca = m³ THẬT của các lô thuộc ca đó',
  approx(sayWeek2.days[0].qty, 4) && approx(sayWeek2.days[1].qty, 2));
cap.setCapacityView('table');
cap.setCapacityWeek(wk2);
cap.toggleCapacityWeekOpen(wk2);
cap.toggleCapacityStageDays('say');
const capTbodyCa = document.getElementById('capacity-week-rows').innerHTML;
check('CA (Tổng hợp): tầng NGÀY gắn CHIP CA cho từng dòng (data-shift-idx)',
  capTbodyCa.includes('x2-day-shift-chip') && capTbodyCa.includes('data-shift-idx="1"'));
check('CA (Tổng hợp): cột Định mức của dòng gộp ghi rõ CẢ 2 công đoạn sấy (S1 · S2), KHÔNG phải 0 m³/h',
  capTbodyCa.includes('S1 ') && capTbodyCa.includes('S2 ') && !capTbodyCa.includes('÷ ĐM 0'));

// ─── S. CẢNH BÁO DỮ LIỆU QUÁ HẠN (21/10/2026 — thay bản đồ nhiệt đã gỡ) ──
// Quy tắc: quá 1 NGÀY LÀM VIỆC chưa cập nhật là cảnh báo; bỏ qua CN/ngày nghỉ
// theo Lịch Làm Việc (trừ ngày làm bù); công đoạn chưa từng nhập → 'never' (xám).
state.hrWorkCalendar = { '2026-10': { weekdaysOff: [0] } };
check('QUÁ HẠN: CN mặc định nghỉ → không tính là ngày làm việc (17/10 Thứ 7 → 19/10 Thứ 2 = 1 ngày)',
  cap.capIsWorkDay('2026-10-17') && !cap.capIsWorkDay('2026-10-18') &&
  cap.capIsWorkDay('2026-10-19') && cap.capWorkDaysSince('2026-10-17', '2026-10-19') === 1);
check('QUÁ HẠN: ngày nghỉ/lễ trong Lịch (restDays) và ngày LÀM BÙ (workDays) đọc đúng',
  (() => {
    state.hrWorkCalendar = { '2026-10': { weekdaysOff: [0], restDays: ['2026-10-19'], workDays: ['2026-10-18'] } };
    const ok = !cap.capIsWorkDay('2026-10-19') && cap.capIsWorkDay('2026-10-18');
    state.hrWorkCalendar = { '2026-10': { weekdaysOff: [0] } };
    return ok;
  })());
check('QUÁ HẠN: "hôm nay" lấy theo GIỜ MÁY (không lệch 1 ngày do toISOString/UTC)',
  cap.capTodayLocalISO() === (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })());
check('QUÁ HẠN: ngày lịch (16/10 → 20/10 = 4) khác ngày làm việc (3: 17, 19, 20 — bỏ CN 18)',
  cap.capCalendarDaysSince('2026-10-16', '2026-10-20') === 4 &&
  cap.capWorkDaysSince('2026-10-16', '2026-10-20') === 3);

// Dữ liệu thử: chỉ Bổ Ống cũ (16/10) + Cắt Chọn mới (20/10), các công đoạn khác rỗng
[
  'xuong2BoluongRecords', 'xuong2CutRecords', 'xuong2BoOngRecords', 'xuong2BaoThoRecords',
  'xuong2ChonNanThoRecords', 'xuong2BaoTinhRecords', 'pressRecords', 'xuong2BulligRecords',
  'xuong2CatVanRecords', 'xuong2BaoVanRecords', 'xuong1CatOngRecords', 'xuong1SaySinhRecords',
  'xuong1BocRecords', 'xuong1LocOngRecords', 'xuong1CatMatRecords', 'xuong1BoRecords',
  'xuong1PhoiSayRecords', 'xuong1LocThanhRecords'
].forEach(k => { state[k] = []; });
state.batches = [];
state.x2SayRates = {}; state.x2SayIncidents = {}; state.x2SayTimes = {};
state.xuong2CutRecords = [{ id: 's-cut', materialId: 'mat-a', date: '2026-10-20', cutHours: 8 }];
state.xuong2BoOngRecords = [{ id: 's-boong', date: '2026-10-16', inputOng: 1000 }];
const staleScan = cap.capStaleScan('2026-10-21');
const staleCut = staleScan.find(r => r.stageId === 'cut');
const staleBoong = staleScan.find(r => r.stageId === 'boong');
const staleX1 = staleScan.find(r => r.stageId === 'x1catong');
check('QUÁ HẠN: mới 1 ngày làm việc (Cắt Chọn 20/10) → KHÔNG cảnh báo', staleCut && staleCut.status === 'ok');
check('QUÁ HẠN: 4 ngày làm việc (Bổ Ống 16/10) → cảnh báo + đếm đúng ngày lịch/ngày làm việc',
  staleBoong && staleBoong.status === 'late' && staleBoong.workDays === 4 && staleBoong.calDays === 5);
check('QUÁ HẠN: nêu ĐÚNG xưởng + công đoạn (Xưởng 2 · Bổ Ống)', staleBoong.wsLabel === 'Xưởng 2' && staleBoong.stageLabel === 'Bổ Ống');
check('QUÁ HẠN: công đoạn chưa từng nhập → never (KHÔNG đỏ), vẫn có trong panel',
  staleX1 && staleX1.status === 'never' && staleX1.wsLabel === 'Xưởng 1');
check('QUÁ HẠN: quét CẢ 2 xưởng dù đang xem Xưởng 2 (14 X2 + 8 X1 = 22 công đoạn)',
  state.capUi.ws === 'x2' && staleScan.length === 22 &&
  staleScan.some(r => r.ws === 'x1') && staleScan.some(r => r.ws === 'x2'));
const lateRows = staleScan.filter(r => r.status === 'late');
const neverRows = staleScan.filter(r => r.status === 'never');
check('QUÁ HẠN: tóm tắt 1 dòng ghi đúng xưởng + công đoạn + số ngày',
  cap.capStaleSummaryOf(lateRows).includes('Xưởng 2') && cap.capStaleSummaryOf(lateRows).includes('Bổ Ống (4 ngày)'));
check('QUÁ HẠN: câu ảnh hưởng nêu hụt hiệu suất + công đoạn sau bị thiếu đầu vào',
  cap.capStaleImpactOf(staleBoong).includes('thấp hơn thực tế') &&
  cap.capStaleImpactOf(staleBoong).includes('Chạy Máy Bào Thô'));


const staleHtml = cap.capStaleHtml(lateRows, neverRows);
check('QUÁ HẠN: banner + panel nêu ngày cập nhật cuối, số ngày, nút Mở thẻ đúng công đoạn',
  staleHtml.includes('Bổ Ống') && staleHtml.includes('16/10') &&
  staleHtml.includes('data-cap-open-card="x2-bo-ong-card"') && staleHtml.includes('Chưa cập nhật'));
check('QUÁ HẠN: panel có mục xám công đoạn chưa từng nhập + khối nhắc ẢNH HƯỞNG',
  staleHtml.includes('Chưa từng có số liệu') &&
  staleHtml.includes('Số liệu không cập nhật thì ảnh hưởng thế nào?') &&
  staleHtml.includes('Hiệu suất xưởng tuần/tháng bị hụt hoặc sai') &&
  staleHtml.includes('Báo cáo In · Xuất Excel · Trợ lý AI'));
cap.renderCapStale(staleScan, false);
check('QUÁ HẠN: renderCapStale đổ banner vào #cap-stale + chip #cap-stale-chip',
  document.getElementById('cap-stale').hidden === false &&
  document.getElementById('cap-stale').innerHTML.includes('Bổ Ống') &&
  document.getElementById('cap-stale-chip').hidden === false &&
  document.getElementById('cap-stale-chip').innerHTML.includes('CĐ quá hạn'));
cap.renderCapStale(staleScan, true);
check('QUÁ HẠN: xưởng chưa có số liệu (suppress) → ẩn banner + chip, không chồng thông báo',
  document.getElementById('cap-stale').hidden === true &&
  document.getElementById('cap-stale-chip').hidden === true);
// Không báo sai khi số liệu là HÔM NAY/HÔM QUA
state.xuong2BoOngRecords = [{ id: 's-boong2', date: '2026-10-20', inputOng: 900 }];
check('QUÁ HẠN: cập nhật hôm qua → không còn cảnh báo (tránh báo phiền buổi sáng)',
  cap.capStaleScan('2026-10-21').every(r => r.stageId !== 'boong' || r.status === 'ok'));
state.xuong2BoOngRecords = [{ id: 's-boong', date: '2026-10-16', inputOng: 1000 }];
// Nhớ trạng thái mở/đóng panel THEO MÁY (state.capUi.staleOpen trong key UI sẵn có)
cap.toggleCapStale(true);
const staleUiSaved = JSON.parse(localStorage.getItem(STORAGE_KEY_CAPACITY_UI) || '{}');
check('QUÁ HẠN: mở panel nhớ theo máy (staleOpen=true) + tự mở rộng thẻ khi đang thu gọn',
  state.capUi.staleOpen === true && staleUiSaved.staleOpen === true && state.capUi.collapsed === false);
cap.toggleCapStale(false);
check('QUÁ HẠN: bấm lại → đóng panel (staleOpen=false)', state.capUi.staleOpen === false);
const capJsStale = fs.readFileSync(new URL('../js/capacity.js', import.meta.url), 'utf8');
const evJsStale = fs.readFileSync(new URL('../js/events.js', import.meta.url), 'utf8');
check('CẤU TRÚC (index.html): có banner #cap-stale + chip #cap-stale-chip trong thẻ công suất',
  indexHtml.includes('id="cap-stale"') && indexHtml.includes('id="cap-stale-chip"'));
check('CẤU TRÚC (capacity.js): CAP_STALE_DAYS + quét 2 xưởng + ngày theo giờ máy',
  capJsStale.includes('const CAP_STALE_DAYS = 1') && capJsStale.includes('function capStaleScan(') &&
  capJsStale.includes('capTodayLocalISO'));
check('CẤU TRÚC (events.js + styles.css): nối toggle panel/chip + CSS banner & bảng chi tiết',
  evJsStale.includes('toggleCapStale') && evJsStale.includes('#cap-stale-toggle') &&
  stylesCss.includes('.cap-stale-panel') && stylesCss.includes('.cap-stale-impact'));

// ─── HIỆU SUẤT CÔNG NHÂN: gia quyền theo giờ, fail-closed khi thiếu liên kết ──
state.hrEmployees = [{ id: 'eff-worker', name: 'Công nhân kiểm thử' }];
state.hrPositions = [
  { id: 'eff-cut', name: 'Cắt Chọn', department: 'Xưởng 2' },
  { id: 'eff-boong', name: 'Bổ Ống', department: 'Xưởng 2' }
];
state.hrShifts = [{ id: 'Xưởng 2', type: 'hanhchinh', shifts: [
  { name: 'Sáng', start: '07:00', end: '11:30' },
  { name: 'Chiều', start: '13:00', end: '17:30' }
] }];
state.hrAssignments = [
  { id: 'eff-cut-day1', date: '2026-09-10', employeeId: 'eff-worker', department: 'Xưởng 2', positionId: 'eff-cut', start: '07:00', end: '09:00', shiftIdx: 0 },
  { id: 'eff-boong-day1a', date: '2026-09-10', employeeId: 'eff-worker', department: 'Xưởng 2', positionId: 'eff-boong', start: '09:00', end: '11:30', shiftIdx: 0 },
  { id: 'eff-boong-day1b', date: '2026-09-10', employeeId: 'eff-worker', department: 'Xưởng 2', positionId: 'eff-boong', start: '13:00', end: '16:30', shiftIdx: 0 },
  { id: 'eff-cut-day2a', date: '2026-09-11', employeeId: 'eff-worker', department: 'Xưởng 2', positionId: 'eff-cut', start: '07:00', end: '11:30', shiftIdx: 0 },
  { id: 'eff-cut-day2b', date: '2026-09-11', employeeId: 'eff-worker', department: 'Xưởng 2', positionId: 'eff-cut', start: '13:00', end: '16:30', shiftIdx: 0 }
];
state.x2CapRates = { '2026-09': 1 };
state.x2BoOngRates = { '2026-09': 100 };
state.materialRecords = [];
state.xuong2CutRecords = [
  { id: 'eff-cut-rec1', date: '2026-09-10', inputKind: 'luong-cay', inputWeight: 1200, carts: 2, kgPerCart: 600 },
  { id: 'eff-cut-rec2', date: '2026-09-11', inputKind: 'luong-cay', inputWeight: 3600, carts: 6, kgPerCart: 600 }
];
state.xuong2BoOngRecords = [{ id: 'eff-boong-rec', date: '2026-09-10', inputOng: 300 }];
const weightedEfficiency = cap.computeWorkerStageEfficiency('2026-09').get('eff-worker');
check('ĐÁNH GIÁ HS: nhiều công đoạn/ngày và giờ tháng được gia quyền, không lấy max',
  !!weightedEfficiency && weightedEfficiency.efficiency === 68.8 &&
  weightedEfficiency.validHours === 16 && weightedEfficiency.assignedHours === 16 &&
  weightedEfficiency.coverageRate === 100 && weightedEfficiency.stages === 2);

state.hrAssignments = state.hrAssignments.concat([
  { id: 'eff-unlinked', date: '2026-09-10', employeeId: '', department: 'Xưởng 2', positionId: 'eff-cut', start: '09:00', end: '10:00', shiftIdx: 0 }
]);
const incompleteEfficiency = cap.computeWorkerStageEfficiency('2026-09').get('eff-worker');
check('ĐÁNH GIÁ HS: thiếu employeeId làm loại cả ngày công đoạn không khớp giờ nhóm',
  !!incompleteEfficiency && incompleteEfficiency.efficiency === 64.3 &&
  incompleteEfficiency.validHours === 14 && incompleteEfficiency.coverageRate === 87.5);

state.hrAssignments = state.hrAssignments.filter(a => a.id !== 'eff-unlinked').concat([
  { id: 'eff-overlap', date: '2026-09-10', employeeId: 'eff-worker', department: 'Xưởng 2', positionId: 'eff-cut', start: '08:00', end: '10:00', shiftIdx: 0 }
]);
const overlapEfficiency = cap.computeWorkerStageEfficiency('2026-09').get('eff-worker');
check('ĐÁNH GIÁ HS: loại giờ phân công chồng lấn và không cộng trùng',
  !!overlapEfficiency && overlapEfficiency.efficiency === 75 &&
  overlapEfficiency.validHours === 8 && overlapEfficiency.overlapCount === 3);

// ─── Tổng kết ───────────────────────────────────────────────────
console.log(`\nKết quả: ${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
