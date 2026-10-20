// tests/shift-split.test.mjs — TÁCH DỮ LIỆU THEO CA (2 CA) CHO CÁC THẺ CÔNG ĐOẠN
// ─────────────────────────────────────────────────────────────────────────────
// Bối cảnh: tab Nhân Sự có nút "Ca Làm Việc" — bộ phận để chế độ "Làm ca" thì
// Bảng bố trí tách 2 cột ca (Ca ngày / Ca đêm) và mỗi lượt bố trí lưu shiftIdx.
// Trước đây các thẻ Xưởng 2 gộp NGƯỜI + GIỜ của cả 2 ca thành 1 con số/ngày →
// không biết ca nào làm bao nhiêu.
// GIAI ĐOẠN 1 (bài này): thẻ ngày tách riêng từng ca —
//   • NGƯỜI + GIỜ HC/TC của mỗi ca = SỐ THẬT (từ Bảng bố trí, tách theo cửa sổ ca)
//   • SẢN LƯỢNG mỗi ca = ƯỚC TÍNH (phân bổ theo tỉ lệ giờ làm) vì form nhập 1 số
//     cho cả ngày ⇒ công suất/hiệu suất từng ca LUÔN bằng nhau (toán học) nên
//     KHÔNG hiện để tránh kết luận sai + có ghi chú nhắc người dùng.
//   • Chỉ khi sản lượng được nhập RIÊNG từng ca (bước sau) mới hiện C.suất/H.suất
//     và gắn ★ cho ca hiệu suất cao hơn (cờ perShiftQty).
'use strict';
import fs from 'node:fs';

// ─── Stubs môi trường (giống xuong2-ho-tro.test.mjs) ────────────────────
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

const { state } = await import('../js/state.js');
state.currentUser = { username: 'admin', role: 'admin', editTabs: [], allowAdvanced: true };
state.activeView = 'kanban-view';
const utils = await import('../js/utils.js');

// ─── Bộ ca "Làm ca" 2 ca dùng chung cho mọi bộ phận trong bài test ──────
const LAMCA = () => ({
  type: 'lamca',
  shifts: [
    { name: 'Ca ngày', start: '07:00', end: '19:00' },
    { name: 'Ca đêm', start: '19:00', end: '07:00' }
  ]
});
state.hrShifts = [
  { id: 'Xưởng 2', ...LAMCA() },
  { id: 'Xưởng 1', ...LAMCA() },
  { id: 'QC', ...LAMCA() }
];
state.hrWorkCalendar = {};   // không cài gì → 2026-10-05 (Thứ 2) là ngày làm việc
state.hrEmployees = [
  { id: 'eA', name: 'Nguyễn Văn A' },
  { id: 'eB', name: 'Trần Thị B' },
  { id: 'eC', name: 'Lê Văn C' },
  { id: 'eD', name: 'Phạm Thị D' }
];
state.hrPositions = [];
state.hrAssignments = [];
const DAY = '2026-10-05';

// ═══ A. GỘP THEO CA (utils.shiftGroupRows) ══════════════════════════════
const gA = utils.shiftGroupRows([
  { shiftIdx: 0, name: 'Nguyễn Văn A', hc: 12, tc: 0 },
  { shiftIdx: 1, name: 'Trần Thị B', hc: 6, tc: 2 },
  { shiftIdx: 0, name: 'Nguyễn Văn A', hc: 0, tc: 1 }   // cùng người, cùng ca → tên KHÔNG lặp
]);
check('A1: gộp theo chỉ số ca — 2 nhóm, sắp theo ca', gA.length === 2 && gA[0].shiftIdx === 0 && gA[1].shiftIdx === 1);
check('A2: cộng giờ HC/TC theo ca + tên không trùng', gA[0].hc === 12 && gA[0].tc === 1 && gA[0].hours === 13 && gA[0].names.join(',') === 'Nguyễn Văn A');
check('A3: ca 2 = 6h HC + 2h TC = 8h', gA[1].hours === 8 && gA[1].names.length === 1);
check('A4: ngày 1 ca → chỉ 1 nhóm (khối ca tự ẩn ở tầng HTML)',
  utils.shiftGroupRows([{ shiftIdx: 0, name: 'A', hc: 9, tc: 0 }]).length === 1);

// ═══ B. CHIA SẢN LƯỢNG / CÔNG SUẤT / HIỆU SUẤT THEO CA ══════════════════
const secB = utils.shiftSectionRows({
  groups: utils.shiftGroupRows([
    { shiftIdx: 0, name: 'A', hc: 12, tc: 0 },
    { shiftIdx: 1, name: 'B', hc: 6, tc: 0 }
  ]),
  qty: 18000, unit: 'kg/h', rate: 1000, incHours: 0
});
check('B1: chia sản lượng theo TỈ LỆ GIỜ LÀM (12/18 → 12.000 · 6/18 → 6.000)',
  secB[0].qty === 12000 && secB[1].qty === 6000);
check('B2: công suất mỗi ca = sản lượng ca ÷ giờ ca (1.000 kg/h cả 2 ca)',
  secB[0].cap === 1000 && secB[1].cap === 1000);
check('B3: phân bổ theo giờ ⇒ hiệu suất 2 ca BẰNG NHAU (đúng bản chất ƯỚC TÍNH)',
  secB[0].eff === 100 && secB[1].eff === 100);
check('B4: công đoạn chỉ 1 ca → null (không dựng khối)',
  utils.shiftSectionRows({ groups: utils.shiftGroupRows([{ shiftIdx: 0, name: 'A', hc: 9, tc: 0 }]) }) === null);
const secB2 = utils.shiftSectionRows({
  groups: utils.shiftGroupRows([
    { shiftIdx: 0, name: 'A', hc: 12, tc: 0, qty: 15000 },   // sản lượng nhập RIÊNG từng ca (bước sau)
    { shiftIdx: 1, name: 'B', hc: 6, tc: 0, qty: 3000 }
  ]),
  qty: 18000, unit: 'kg/h', rate: 1000, incHours: 0
});
check('B5: có sản lượng RIÊNG theo ca → dùng số của ca (1.250 vs 500 kg/h)',
  secB2[0].cap === 1250 && secB2[1].cap === 500 && secB2[0].eff === 125 && secB2[1].eff === 50);

// ═══ C. KHỐI HTML "THEO CA" ═════════════════════════════════════════════
const META = { 0: { name: 'Ca ngày', start: '07:00', end: '19:00' }, 1: { name: 'Ca đêm', start: '19:00', end: '07:00' } };
const secCOf = (o) => ({
  label: 'Cắt chọn', unit: 'kg/h', rate: 1000, incHours: 0, qty: 18000,
  groups: utils.shiftGroupRows([
    { shiftIdx: 0, name: 'A (test)', hc: 12, tc: 0 },
    { shiftIdx: 1, name: 'B (test)', hc: 6, tc: 0 }
  ]),
  ...(o || {})
});
const htmlC = utils.shiftBreakdownHtml({ date: DAY, incHours: 0, shiftMeta: META, sections: [secCOf()] });
check('C1: có khối .x2-shift-rows + đúng 2 dòng ca',
  htmlC.includes('class="x2-shift-rows"') && (htmlC.match(/class="x2-shift-row"/g) || []).length === 2);
check('C2: tên ca + khung giờ lấy từ Cài Đặt Ca', htmlC.includes('Ca ngày') && htmlC.includes('Ca đêm') && htmlC.includes('07:00–19:00'));
check('C3: NGƯỜI + GIỜ là số THẬT của từng ca',
  htmlC.includes('A (test)') && htmlC.includes('B (test)') && htmlC.includes('12,0h HC') && htmlC.includes('6,0h HC'));
check('C4: sản lượng mỗi ca ghi rõ là ƯỚC TÍNH (SL ~)', (htmlC.match(/SL ~/g) || []).length === 2);
check('C5: KHÔNG hiện C.suất/H.suất từng ca khi sản lượng còn ghi chung',
  !htmlC.includes('C.suất') && !htmlC.includes('H.suất'));
check('C6: có ghi chú TRUNG THỰC — chưa so được ca nào làm tốt hơn',
  htmlC.includes('chưa so được ca nào làm tốt hơn'));
const htmlPerf = utils.shiftBreakdownHtml({
  date: DAY, incHours: 0, shiftMeta: META, perShiftQty: true,
  sections: [secCOf({
    groups: utils.shiftGroupRows([
      { shiftIdx: 0, name: 'A (test)', hc: 12, tc: 0, qty: 15000 },
      { shiftIdx: 1, name: 'B (test)', hc: 6, tc: 0, qty: 3000 }
    ])
  })]
});
check('C7: perShiftQty → hiện C.suất + H.suất + ★ cho ca cao hơn',
  htmlPerf.includes('C.suất') && htmlPerf.includes('H.suất') && htmlPerf.includes('x2-shift-best') && !htmlPerf.includes('chưa so được'));
check('C8: ngày 1 ca → chuỗi rỗng (giao diện cũ giữ nguyên)',
  utils.shiftBreakdownHtml({ date: DAY, shiftMeta: META, sections: [{ groups: utils.shiftGroupRows([{ shiftIdx: 0, name: 'A', hc: 9, tc: 0 }]) }] }) === '');
check('C9: 2 ca HÒA hiệu suất → KHÔNG gắn ★ (tránh kết luận sai)',
  (() => { const h = utils.shiftBreakdownHtml({ date: DAY, shiftMeta: META, perShiftQty: true, sections: [secCOf()] }); return h.includes('H.suất') && !h.includes('x2-shift-best'); })());

// ═══ D. THẺ XƯỞNG 2 (Chọn Nan Thô) — RENDER THẬT ═══════════════════════
const x2 = await import('../js/xuong2.js');
state.hrPositions.push({ id: 'pcn', name: 'Chọn Nan Thô', department: 'Xưởng 2' });
const asgCN = (id, shiftIdx, employeeId, start, end) =>
  ({ id, date: DAY, department: 'Xưởng 2', positionId: 'pcn', shiftIdx, employeeId, start, end });
state.hrAssignments = [asgCN('s1', 0, 'eA', '07:00', '19:00'), asgCN('s2', 1, 'eB', '19:00', '01:00')];
state.x2ChonNanRates = { '2026-10': 500 };
state.xuong2ChonNanThoRecords = [{
  id: 'cn1', date: DAY, quantity: 1000, cls: 'A', sizeKey: '1250×18×7', dims: [1250, 18, 7],
  external: false, materialType: 'Luồng cây xô', supplier: 'Nhà Tế', unitVol: 0.000157,
  createdAt: '2026-10-05T02:00:00.000Z'
}];
x2.renderX2ChonNanTable();
const cnHtml = els.get('x2-cn-day-cards').innerHTML;
check('D1: thẻ ngày Chọn Nan có khối THEO CA', cnHtml.includes('class="x2-shift-rows"'));
check('D2: đúng 2 dòng ca + tên 2 ca',
  (cnHtml.match(/class="x2-shift-row"/g) || []).length === 2 && cnHtml.includes('Ca ngày') && cnHtml.includes('Ca đêm'));
check('D3: NGƯỜI mỗi ca đúng (A = ca ngày · B = ca đêm)',
  cnHtml.includes('Nguyễn Văn A') && cnHtml.includes('Trần Thị B'));
check('D4: GIỜ từng ca = số thật (ca ngày 12h − 1h30 nghỉ = 10h30 HC · ca đêm 6h HC)',
  cnHtml.includes('10,5h HC') && cnHtml.includes('6,0h HC'));
check('D5: sản lượng ƯỚC TÍNH + ghi chú chưa so được ca nào tốt hơn',
  (cnHtml.match(/SL ~/g) || []).length === 2 && cnHtml.includes('chưa so được ca nào làm tốt hơn'));
state.hrAssignments = [asgCN('s1', 0, 'eA', '07:00', '19:00')];
x2.renderX2ChonNanTable();
check('D6: ngày chỉ 1 ca → KHÔNG hiện khối theo ca (giao diện cũ)',
  !els.get('x2-cn-day-cards').innerHTML.includes('x2-shift-rows'));
state.hrAssignments = [];
x2.renderX2ChonNanTable();
check('D7: xóa hết bố trí → không hiện khối (KHÔNG bịa số)',
  !els.get('x2-cn-day-cards').innerHTML.includes('x2-shift-rows'));

// ═══ E. THẺ HỖ TRỢ — KHỐI CA KHÔNG CÓ CÔNG SUẤT/HIỆU SUẤT ══════════════
state.hrPositions.push({ id: 'pht', name: 'Hỗ trợ/ Công đoạn lẻ', department: 'Xưởng 2' });
const asgHT = (id, shiftIdx, employeeId, start, end) =>
  ({ id, date: DAY, department: 'Xưởng 2', positionId: 'pht', shiftIdx, employeeId, start, end });
state.hrAssignments = [asgHT('h1', 0, 'eA', '07:00', '19:00'), asgHT('h2', 1, 'eB', '19:00', '01:00')];
state.xuong2HoTroRecords = [{
  id: 'ht1', date: DAY, workName: 'Dọn xưởng', asgIds: ['h1', 'h2'], worker: '', workTime: '',
  createdAt: '2026-10-05T02:00:00.000Z'
}];
x2.renderXuong2HoTroTable();
const htHtml = els.get('x2-ht-day-cards').innerHTML;
check('E1: thẻ Hỗ Trợ có khối theo ca', htHtml.includes('class="x2-shift-rows"'));
check('E2: KHÔNG có C.suất/H.suất (công việc phát sinh)', !htHtml.includes('C.suất') && !htHtml.includes('H.suất'));
check('E3: KHÔNG hiện sản lượng ước tính (không có sản lượng)',
  !htHtml.includes('SL ~') && htHtml.includes('Nguyễn Văn A') && htHtml.includes('Trần Thị B'));

// ═══ F. XƯỞNG 1 (Cắt Ống) — GIỜ THEO BỘ PHẬN "Xưởng 1" ════════════════
state.hrPositions.push({ id: 'px1co', name: 'Cắt Ống', department: 'Xưởng 1' });
state.hrAssignments = [
  { id: 'xa', date: DAY, department: 'Xưởng 1', positionId: 'px1co', shiftIdx: 0, employeeId: 'eC', start: '07:00', end: '19:00' },
  { id: 'xb', date: DAY, department: 'Xưởng 1', positionId: 'px1co', shiftIdx: 1, employeeId: 'eD', start: '19:00', end: '01:00' }
];
state.materialRecords = [{ id: 'x1m1', location: 'xuong-1', type: 'Vầu cây tươi', weight: 1000, date: DAY, supplier: 'Nhà Tế' }];
state.xuong1CatOngRecords = [{
  id: 'x1co1', materialId: 'x1m1', date: DAY, klDat: 600, klLoai: 100, klMat: 50, klNgon: 50,
  createdAt: '2026-10-05T02:00:00.000Z'
}];
state.x1Rates = { catOng: { '2026-10': 500 } };
x2.renderX1CatOngCard();
const x1Html = els.get('x1-cat-ong-day-cards').innerHTML;
check('F1: thẻ ngày Xưởng 1 có khối theo ca', x1Html.includes('class="x2-shift-rows"'));
check('F2: người + giờ từng ca theo bộ phận Xưởng 1 (10h30 · 6h HC)',
  x1Html.includes('Lê Văn C') && x1Html.includes('Phạm Thị D') && x1Html.includes('10,5h HC') && x1Html.includes('6,0h HC'));

// ═══ G. ÉP VÁN (thẻ trong tab Công Đoạn SX) ═════════════════════════════
const press = await import('../js/press.js');
state.hrPositions.push({ id: 'pep', name: 'Ép ván', department: 'Xưởng 2' });
state.hrAssignments = [
  { id: 'p1', date: DAY, department: 'Xưởng 2', positionId: 'pep', shiftIdx: 0, employeeId: 'eC', start: '07:00', end: '19:00' },
  { id: 'p2', date: DAY, department: 'Xưởng 2', positionId: 'pep', shiftIdx: 1, employeeId: 'eD', start: '19:00', end: '01:00' }
];
state.pressRecords = [{
  id: 'pr1', date: DAY, year: '2026', productName: 'Ván 1200x382x12', finishedQty: 40,
  sticks: [], vanTho: [{ vtDim: '1200x600x9', vtQty: 2 }]
}];
state.pressNotes = [];
state.pressYearFilter = 'all';
state.pressWeekFilter = 'all';
state.x2EpVanRates = { '2026-10': 1 };
press.renderX2EpVanDayCards();
const pvHtml = els.get('x2-epv-day-cards').innerHTML;
check('G1: thẻ ngày Ép Ván có khối theo ca (m³/h)', pvHtml.includes('class="x2-shift-rows"') && pvHtml.includes('Ép ván'));
check('G2: người + giờ từng ca của Ép Ván',
  pvHtml.includes('10,5h HC') && pvHtml.includes('6,0h HC') && pvHtml.includes('Lê Văn C') && pvHtml.includes('Phạm Thị D'));

// ═══ H. QC — KIỂM SAU SẢN XUẤT ══════════════════════════════════════════
const qcf = await import('../js/qc-final.js');
state.hrPositions.push({ id: 'pqc', name: 'QC Kiểm ván+thanh', department: 'QC' });
state.hrAssignments = [
  { id: 'qa', date: DAY, department: 'QC', positionId: 'pqc', shiftIdx: 0, employeeId: 'eC', start: '07:00', end: '19:00' },
  { id: 'qb', date: DAY, department: 'QC', positionId: 'pqc', shiftIdx: 1, employeeId: 'eD', start: '19:00', end: '01:00' }
];
state.qcFinalRecords = [{
  id: 'qcf1', date: DAY, workshop: 'x2', kind: 'van', inputQty: 100, qtyOk: 90, qtyExcept: 5,
  qtyReject: 5, productName: 'Ván 1200x382x12'
}];
state.qcFinalRates = { '2026-10': { van: 20, thanh: 100 } };
qcf.renderQcFinalTable();
const qcfHtml = els.get('qcf-day-cards').innerHTML;
check('H1: thẻ ngày QC có khối theo ca', qcfHtml.includes('class="x2-shift-rows"'));
check('H2: người + giờ từng ca của QC (10h30 · 6h HC)',
  qcfHtml.includes('10,5h HC') && qcfHtml.includes('6,0h HC') && qcfHtml.includes('Lê Văn C'));

// ═══ I. CẤU TRÚC (styles / sw / js) ═════════════════════════════════════
const cssSrc = fs.readFileSync('styles.css', 'utf8');
const swSrc = fs.readFileSync('sw.js', 'utf8');
const uSrc = fs.readFileSync('js/utils.js', 'utf8');
const x2Src = fs.readFileSync('js/xuong2.js', 'utf8');
const pSrc = fs.readFileSync('js/press.js', 'utf8');
const qSrc = fs.readFileSync('js/qc-final.js', 'utf8');
check('I1: styles.css có khối .x2-shift-rows / -chip / -note / -best',
  cssSrc.includes('.x2-shift-rows {') && cssSrc.includes('.x2-shift-chip {') &&
  cssSrc.includes('.x2-shift-note {') && cssSrc.includes('.x2-shift-best {'));
check('I2: utils.js export 4 helper tách ca',
  ['shiftGroupRows', 'shiftFmtNum', 'shiftSectionRows', 'shiftBreakdownHtml'].every(n => uSrc.includes(`  ${n},`)));
check('I3: 4 thẻ ngày 1 công đoạn + 3 thẻ ĐÃ TÁCH CA (Bổ Ống/Bào Thô/Chọn Nan) + 3 thẻ 2 công đoạn + Xưởng 1',
  (x2Src.match(/\$\{x2ShiftBlockOf\(/g) || []).length === 4 &&
  (x2Src.match(/shiftIdx == null \? x2ShiftBlockOf\(/g) || []).length === 3 &&
  (x2Src.match(/\$\{x2ShiftBlockMulti\(/g) || []).length === 3 &&
  x2Src.includes('cfg.shiftMatchPos ? shiftGroupsForX1(') &&
  (x2Src.match(/shiftMatchPos/g) || []).length >= 5);
check('I4: press.js + qc-final.js dùng CHUNG helper (không copy HTML/CSS)',
  pSrc.includes('shiftBreakdownHtml') && pSrc.includes('epVanShiftGroups') &&
  qSrc.includes('shiftBreakdownHtml') && qSrc.includes('qcShiftGroups'));
check('I5: sw.js đã tăng cache (v259) để PWA không dùng bản cũ', swSrc.includes('nha-may-ngoc-son-v290'));

// ═══ J. GIAI ĐOẠN 2 — NHẬP SẢN LƯỢNG RIÊNG THEO CA ═══════════════════════
// (Bổ Ống · Chạy Máy Bào Thô · Chọn Nan Thô · Than Hóa + Sấy)

// ── J1. CHỌN NAN NGOÀI CÔNG ĐOẠN + Ô CA → giờ/người chỉ của ca đó ────────
state.hrPositions.push({ id: 'pcn2', name: 'Chọn Nan Thô', department: 'Xưởng 2' });
state.hrPositions.push({ id: 'pth', name: 'Than hóa', department: 'Xưởng 2' });
state.hrAssignments = [
  { id: 'c1', date: DAY, department: 'Xưởng 2', positionId: 'pcn2', shiftIdx: 0, employeeId: 'eA', start: '07:00', end: '19:00' },
  { id: 'c2', date: DAY, department: 'Xưởng 2', positionId: 'pcn2', shiftIdx: 1, employeeId: 'eB', start: '19:00', end: '01:00' }
];
state.xuong2ChonNanThoRecords = [];
state.x2ChonNanEditId = null;
document.getElementById('x2-cn-baotho').value = '__new__';   // Thêm loại mới (nan mua ngoài — không cần chuỗi)
document.getElementById('x2-cn-ncc').value = 'NCC Ngoài';
document.getElementById('x2-cn-dai').value = '900';
document.getElementById('x2-cn-rong').value = '70';
document.getElementById('x2-cn-day').value = '10';
document.getElementById('x2-cn-class').value = 'A';
document.getElementById('x2-cn-qty').value = '500';
document.getElementById('x2-cn-date').value = DAY;
x2.syncX2ShiftField('x2-cn-shift', 'Xưởng 2', DAY, null);   // nạp options trước khi chọn
document.getElementById('x2-cn-shift').value = '1';          // CA ĐÊM
x2.handleXuong2ChonNanSubmit({ preventDefault(){} });
const cnShiftRec = (state.xuong2ChonNanThoRecords || []).find(r => r.date === DAY && r.shiftIdx === 1);
check('J1: lưu lượt Chọn Nan có ghi CA → bản ghi lưu shiftIdx = 1', !!cnShiftRec && cnShiftRec.shiftIdx === 1);
check('J2: SNAPSHOT giờ của lượt = CHỈ ca đêm (6h HC · 0h TC, không cộng ca ngày)',
  cnShiftRec && Math.abs(Number(cnShiftRec.workHoursHC) - 6) < 1e-9 && Math.abs(Number(cnShiftRec.workHoursTC)) < 1e-9);
check('J3: SNAPSHOT người của lượt = CHỈ người ca đêm', cnShiftRec && cnShiftRec.worker === 'Trần Thị B');

// ── J4. THẺ NGÀY TÁCH THEO (NGÀY, CA) + CHIP SO SÁNH ─────────────────────
state.x2ChonNanRates = { '2026-10': 500 };
state.xuong2ChonNanThoRecords = [
  { id: 'cn-s0', date: DAY, quantity: 2000, cls: 'A', sizeKey: '1250×18×7', dims: [1250, 18, 7], external: false, materialType: 'Luồng cây', supplier: 'Nhà Tế', shiftIdx: 0, unitVol: 0.000157, createdAt: '2026-10-05T02:00:00.000Z' },
  { id: 'cn-s1', date: DAY, quantity: 900, cls: 'A', sizeKey: '1250×18×7', dims: [1250, 18, 7], external: false, materialType: 'Luồng cây', supplier: 'Nhà Tế', shiftIdx: 1, unitVol: 0.000157, createdAt: '2026-10-05T03:00:00.000Z' },
  { id: 'cn-s2', date: DAY, quantity: 400, cls: 'B', sizeKey: '1250×24×8', dims: [1250, 24, 8], external: false, materialType: 'Luồng cây', supplier: 'Nhà Tế', unitVol: 0.00024, createdAt: '2026-10-05T04:00:00.000Z' }
];
x2.renderX2ChonNanTable();
const cnCards = els.get('x2-cn-day-cards').innerHTML;
check('J4: thẻ ngày Chọn Nan tách 2 ca cùng ngày (2 thẻ, có chip ca)',
  (cnCards.match(/data-shift="0"/g) || []).length === 1 && (cnCards.match(/data-shift="1"/g) || []).length === 1 &&
  cnCards.includes('Ca ngày') && cnCards.includes('Ca đêm'));
check('J5: thẻ CẢ NGÀY / CHƯA RÕ CA riêng cho lượt không ghi ca',
  cnCards.includes('Cả ngày / chưa rõ ca') && (cnCards.match(/data-shift=""/g) || []).length === 1);
check('J6: công suất 2 ca KHÁC NHAU theo SỐ THẬT (ca ngày 2.000÷10h30=190 · ca đêm 900÷6h=150 thanh/h)',
  (cnCards.match(/190 thanh\/h/g) || []).length >= 1 && (cnCards.match(/150 thanh\/h/g) || []).length >= 1);
check('J7: có chip SO SÁNH hiệu suất với ca kia (▲/▼)',
  cnCards.includes('x2-shift-cmp') && (cnCards.includes('▲') || cnCards.includes('▼')));
check('J8: thẻ "chưa rõ ca" vẫn giữ khối ƯỚC TÍNH Giai đoạn 1 + ghi chú trung thực',
  cnCards.includes('chưa so được ca nào làm tốt hơn'));

// ── J9. LIÊN KẾT CHỌN NAN → BÀO THÔ LỌC THEO CA ───────────────────────────
const btFake = { id: 'bt-x', date: DAY, shiftIdx: 0, daiText: '1250', rongText: '18', dayText: '7', dais: [1250], rongs: [18], thicks: [7] };
state.xuong2ChonNanThoRecords = [
  { id: 'k0', baothoId: 'bt-x', date: DAY, quantity: 100, cls: 'A', sizeKey: '1250×18×7', dims: [1250, 18, 7], external: false, shiftIdx: 0, unitVol: 0.000157, volume: 0.0157 },
  { id: 'k1', baothoId: 'bt-x', date: DAY, quantity: 250, cls: 'A', sizeKey: '1250×18×7', dims: [1250, 18, 7], external: false, shiftIdx: 1, unitVol: 0.000157, volume: 0.0393 },
  { id: 'k2', baothoId: 'bt-x', date: DAY, quantity: 50, cls: 'A', sizeKey: '1250×18×7', dims: [1250, 18, 7], external: false, unitVol: 0.000157, volume: 0.0079 }
];
const qShift0 = x2.baoThoQtyOf(btFake);
check('J9: Bào Thô ca 1 → chỉ cộng 100 thanh của lượt CÙNG ca (không cộng 250 của ca kia, 50 chưa rõ ca)',
  qShift0.qty === 100 && qShift0.otherQty === 300);
const qNoShift = x2.baoThoQtyOf({ id: 'bt-x', date: DAY, shiftIdx: null, dais: [1250], rongs: [18], thicks: [7] });
check('J10: Bào Thô KHÔNG ghi ca → chỉ cộng 50 thanh không ghi ca + cảnh báo 350 thanh ở ca khác',
  qNoShift.qty === 50 && qNoShift.otherQty === 350);

// ── J11. THAN HÓA: CA CỦA LÔ (sayShift) + DÒNG PHỤ "THEO CA" ─────────────
check('J11: sayShiftMapOf giữ ca công đoạn kia + ghi đè đúng công đoạn đang lưu',
  JSON.stringify(x2.sayShiftMapOf({ say1: 1 }, 'say2', 0)) === JSON.stringify({ say1: 1, say2: 0 }) &&
  x2.sayShiftMapOf(null, 'say1', 1).say1 === 1);
state.batches = [
  { id: 'B1', code: 'L1', stage: 'say1', date: DAY, length: 1250, width: 18, thickness: 7, quantity: 1000, volume: 0.157, useFor: 'Ván', location: 'LS1', sayCharges: { say1: 111 }, sayShift: { say1: 0 }, createdAt: '2026-10-05T02:00:00.000Z' },
  { id: 'B2', code: 'L2', stage: 'say1', date: DAY, length: 1250, width: 18, thickness: 7, quantity: 500, volume: 0.0785, useFor: 'Ván', location: 'LS1', sayCharges: { say1: 222 }, sayShift: { say1: 1 }, createdAt: '2026-10-05T03:00:00.000Z' }
];
state.hrAssignments = [
  { id: 't1', date: DAY, department: 'Xưởng 2', positionId: 'pth', shiftIdx: 0, employeeId: 'eC', start: '07:00', end: '19:00' },
  { id: 't2', date: DAY, department: 'Xưởng 2', positionId: 'pth', shiftIdx: 1, employeeId: 'eD', start: '19:00', end: '01:00' }
];
state.x2SayRates = { s1: {}, s2: {} };
state.x2SayTimes = {};
state.x2SayIncidents = {};
const sayRows = x2.sayChargeRows();
const sayDay = sayRows.find(r => r.date === DAY);
check('J12: mỗi LẦN than hóa mang CA của lô (ca 1 và ca 2 khác nhau)',
  !!sayDay && sayDay.charges.length === 2 &&
  sayDay.charges.some(c => c.shiftIdx === 0) && sayDay.charges.some(c => c.shiftIdx === 1));
x2.renderX2SayStats();
const sayHtml = els.get('x2-say-day-rows').innerHTML;
check('J13: bảng thống kê Than Hóa có DÒNG PHỤ theo ca (m³ + giờ thật + công suất/hiệu suất của ca)',
  sayHtml.includes('x2-say-shift-row') && (sayHtml.match(/data-shift-idx="0"/g) || []).length >= 1 &&
  (sayHtml.match(/data-shift-idx="1"/g) || []).length >= 1);
check('J14: m³ tách đúng theo ca (ca 1 = 0,157 m³ · ca 2 = 0,0785 m³ — SỐ THẬT của lô)',
  sayHtml.includes('0,157') && sayHtml.includes('0,0785'));
check('J15: dòng ca ghi người của đúng ca đó (ca 1 = Lê Văn C · ca 2 = Phạm Thị D)',
  sayHtml.includes('Lê Văn C') && sayHtml.includes('Phạm Thị D'));
check('J16: ô nhập "Số lần TH" của NHÓM vẫn chỉ 1 ô/ngày (không nhân đôi theo ca)',
  (sayHtml.match(/data-say-times="2026-10-05"/g) || []).length === 1);

// ── J17. CẤU TRÚC GIAI ĐOẠN 2 ────────────────────────────────────────────
const idxSrc = fs.readFileSync('index.html', 'utf8');
const bmSrc = fs.readFileSync('js/batch-modals.js', 'utf8');
check('J17: index.html có 3 ô Ca (Bổ Ống · Bào Thô · Chọn Nan) + ô Ca của Thêm Lô Sấy Mới',
  idxSrc.includes('id="x2-bo-ong-shift"') && idxSrc.includes('id="x2-bao-tho-shift"') &&
  idxSrc.includes('id="x2-cn-shift"') && idxSrc.includes('id="al-shift"'));
check('J18: batch-modals ghi CA (sayShift) ở CẢ 5 nhánh lưu lô (4 gán khi tạo + 2 gán tại chỗ)',
  (bmSrc.match(/sayShift: sayShiftMapOf\(/g) || []).length === 4 &&
  (bmSrc.match(/sayShift = sayShiftMapOf\(/g) || []).length === 2);
check('J19: CSS có chip ca / chip so sánh / cảnh báo lệch ca / dòng ca Than Hóa',
  cssSrc.includes('.x2-day-shift-chip') && cssSrc.includes('.x2-shift-cmp') &&
  cssSrc.includes('.x2-shift-cross') && cssSrc.includes('.x2-say-shift-row'));

// ── J20. KHÔNG CHIA HIỆU SUẤT THEO SẤY 1 / SẤY 2 — GỘP TRONG CA (18/10/2026) ──
// Thêm 1 lô vào Sấy 2 CÙNG NGÀY, CÙNG CA 1 → ca 1 phải gộp cả 2 công đoạn sấy.
state.batches.push({
  id: 'B3', code: 'L3', stage: 'say2', date: '2026-10-04',
  length: 1250, width: 18, thickness: 9, quantity: 400, volume: 0.05,
  useFor: 'Ván', location: 'LS1',
  stageHistory: [{ stage: 'say2', date: DAY }],
  sayCharges: { say2: 333 }, sayShift: { say2: 0 }, createdAt: '2026-10-05T04:00:00.000Z'
});
const sayDay2 = x2.sayChargeRows().find(r => r.date === DAY);
const perf2 = x2.sayShiftPerfOf(sayDay2);
check('J20: hiệu suất gộp TRONG CA — ca 1 gồm CẢ Sấy 1 và Sấy 2 (1 lần mỗi công đoạn)',
  perf2.length === 2 && perf2[0].stageTurns.say1 === 1 && perf2[0].stageTurns.say2 === 1);
check('J21: giờ cần của ca = Σ phút của CẢ 2 công đoạn (ca 1: 105\' + 50\' = 2,583h)',
  Math.abs(perf2[0].need - (155 / 60)) < 1e-6);
x2.renderX2SayStats();
const sayHtml2 = els.get('x2-say-day-rows').innerHTML;
check('J22: bảng chỉ có 1 dòng/ca (KHÔNG lặp theo Sấy 1 / Sấy 2) + ghi rõ thành phần ca',
  (sayHtml2.match(/<tr class="x2-say-shift-row"/g) || []).length === 2 &&
  sayHtml2.includes('Sấy 1: 1') && sayHtml2.includes('Sấy 2: 1'));
check('J23: dòng ca có NHÃN "So ca kia" (▲/▼) giống thẻ Chọn Nan Thô',
  sayHtml2.includes('x2-shift-cmp') && sayHtml2.includes('So ca kia'));
const pct0 = (perf2[0].need / (perf2[0].hours - perf2[0].incH)) * 100;
const pct1 = (perf2[1].need / (perf2[1].hours - perf2[1].incH)) * 100;
const deltaTxt = Math.abs(pct0 - pct1).toLocaleString('vi-VN', { maximumFractionDigits: 1 });
check(`J24: con số so sánh đúng ĐIỂM % (${pct0.toFixed(1)}% ↔ ${pct1.toFixed(1)}% → ▲/▼ ${deltaTxt}%)`,
  sayHtml2.includes(`▲ ${deltaTxt}%`) && sayHtml2.includes(`▼ ${deltaTxt}%`));

console.log(`\n=== TÁCH DỮ LIỆU THEO CA: ${pass} PASS / ${fail} FAIL ===`);
process.exit(fail ? 1 : 0);
