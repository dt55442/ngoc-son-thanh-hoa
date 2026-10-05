// tests/qc-final.test.mjs — THẺ "KIỂM SAU SẢN XUẤT" (tab QC — js/qc-final.js).
// Bao phủ: cặp 2 tuần xuất hàng (tuần lẻ + tuần kế — kiểm tuần 39 hay 40 đều
// lấy cặp 39–40) · danh sách nguồn Kiểm Ván = 2 nhóm (VÁN THÔ BTP của lượt ép
// chưa điền thành phẩm + Thành phẩm Ép Ván — LOẠI mục ĐVT = Thanh theo định mức)
// · lưu/chặn validate ·
// công thức Tổng kiểm = Đạt+Ngoại lệ+Loại · Tổng đạt = Đạt+Ngoại lệ · Tỉ lệ lỗi
// · người kiểm + giờ HC/TC tự động từ vị trí bộ phận QC tên chứa "kiểm" · định
// mức theo tháng + Hiệu suất · sửa/xóa + tombstone · render thẻ ngày + mini
// card · cấu trúc (index.html · qc.js · events.js · state/storage/cloud/history/
// main · sw.js v190 · styles.css).
'use strict';

// ─── Stubs môi trường (giống qc.test.mjs) ──────────────────────────
function makeEl(id) {
  const el = {
    id: id || '', value: '', checked: false, disabled: false, hidden: false,
    open: true, textContent: '', innerHTML: '', style: {}, dataset: {}, _h: {},
    offsetWidth: 800, offsetHeight: 500,
    classList: { _s: new Set(), add(c){ this._s.add(c); }, remove(c){ this._s.delete(c); }, toggle(c, f){ if (f === undefined) f = !this._s.has(c); if (f) this._s.add(c); else this._s.delete(c); return f; }, contains(c){ return this._s.has(c); } },
    addEventListener(t, f) { (el._h[t] = el._h[t] || []).push(f); },
    parentElement: null,
    appendChild(c) { if (c && typeof c === 'object') c.parentElement = el; return c; },
    removeChild(c) { if (c && typeof c === 'object') c.parentElement = null; return c; },
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
const approx = (a, b) => Math.abs(a - b) < 1e-6;
// ═══ PHẦN 2 ═══

// ─── IMPORT MODULES (sau khi stub xong) ────────────────────────────
const { state, STORAGE_KEY_QC_FINAL, STORAGE_KEY_QC_FINAL_RATE } = await import('../js/state.js');
const qcf = await import('../js/qc-final.js');
const qc = await import('../js/qc.js');
const fsMod = await import('node:fs');

function setVal(id, v) { const el = document.getElementById(id); el.value = v; return el; }

// ─── DỮ LIỆU GIẢ ──────────────────────────────────────────────
// Năm 2026: tuần 39 = 21/09–27/09 · tuần 40 = 28/09–04/10 · tuần 41 = 05/10–11/10
state.currentUser = { username: 'admin', role: 'admin', editTabs: [], allowAdvanced: true };
state.pressRecords = [
  { id: 'p1', date: '2026-09-22', week: '2026-W39', year: 2026, productId: 'sp1', productName: 'Ván 1220×2440×9',  finishedQty: 300, vanTho: [], sticks: [] },
  { id: 'p2', date: '2026-09-24', week: '2026-W39', year: 2026, productId: 'sp1', productName: 'Ván 1220×2440×9',  finishedQty: 200, vanTho: [], sticks: [] },
  { id: 'p3', date: '2026-09-30', week: '2026-W40', year: 2026, productId: 'sp2', productName: 'Bullig 1200×300×50', finishedQty: 120, vanTho: [], sticks: [] },
  { id: 'p4', date: '2026-09-23', week: '2026-W39', year: 2026, productId: 'sp2', productName: 'Bullig 1200×300×50', finishedQty: 80,  vanTho: [], sticks: [] },
  { id: 'p5', date: '2026-09-15', week: '2026-W38', year: 2026, productId: 'sp1', productName: 'Ván 1220×2440×9',  finishedQty: 999, vanTho: [], sticks: [] } // NGOÀI cặp
];
state.hrPositions = [
  { id: 'pqcf', name: 'QC Kiểm ván+thanh', department: 'QC', note: '' },
  { id: 'pqcoth', name: 'Kiểm chất',        department: 'QC', note: '' }, // vị trí QC KHÁC — KHÔNG được tính giờ
  { id: 'pep',  name: 'Ép ván',            department: 'Xưởng 2', note: '' }
];
state.hrEmployees = [
  { id: 'e1', code: 'NV01', name: 'Nguyễn Văn A', department: 'QC', status: 'active', skills: [] },
  { id: 'e2', code: 'NV02', name: 'Trần Thị B',   department: 'QC', status: 'active', skills: [] },
  { id: 'e3', code: 'NV03', name: 'Lê Văn C',     department: 'QC', status: 'active', skills: [] }
];
state.hrAssignments = [
  { id: 'asg1', date: '2026-09-23', department: 'QC', positionId: 'pqcf', employeeId: 'e1', start: '07:00', end: '11:30', shiftIdx: 0 },
  { id: 'asg2', date: '2026-09-23', department: 'QC', positionId: 'pqcf', employeeId: 'e2', start: '13:00', end: '',      shiftIdx: 0 },
  { id: 'asg3', date: '2026-09-23', department: 'QC', positionId: 'pqcoth', employeeId: 'e3', start: '07:00', end: '16:00', shiftIdx: 0 }
];
// ═══ PHẦN 3 ═══

// ─── A. CẶP 2 TUẦN XUẤT HÀNG + DANH SÁCH THÀNH PHẨM ──────────
check('CẶP TUẦN: ngày ở tuần 39 (23/09) → cặp 39–40', (() => {
  const p = qcf.qcFinalPairWeeks('2026-09-23'); return p.start === 39 && p.end === 40;
})());
check('CẶP TUẦN: ngày ở tuần 40 (29/09) → VẪN cặp 39–40 (không chồng lấn)',
  (() => { const p = qcf.qcFinalPairWeeks('2026-09-29'); return p.start === 39 && p.end === 40; })());
check('CẶP TUẦN: tuần 41 (07/10) → cặp 41–42 · nhãn "Tuần 41–42"',
  (() => { const p = qcf.qcFinalPairWeeks('2026-10-07'); return p.start === 41 && p.end === 42 && qcf.qcFinalPairLabel('2026-10-07') === 'Tuần 41–42'; })());
check('CẶP TUẦN: tuần 53 tính riêng (không có tuần 54)',
  (() => { const p = qcf.qcFinalPairWeeks('2027-01-01'); return p.end === null; })());
check('THÀNH PHẨM 2 TUẦN: ngày 23/09 → gộp Ép Ván cặp 39–40 (sp1 = 500 · sp2 = 200 · loại lượt tuần 38)',
  (() => {
    const rows = qcf.qcFinalProducts2Weeks('2026-09-23');
    const s1 = rows.find(r => r.productId === 'sp1'), s2 = rows.find(r => r.productId === 'sp2');
    return rows.length === 2 && s1 && s1.qty === 500 && s2 && s2.qty === 200 && rows[0].qty >= rows[1].qty;
  })());
check('THÀNH PHẨM 2 TUẦN: ngày 07/10 (cặp 41–42) → danh sách rỗng (chưa có lượt ép)',
  qcf.qcFinalProducts2Weeks('2026-10-07').length === 0);

// ─── B. NGƯỜI KIỂM + GIỜ TỰ ĐỘNG TỪ NHÂN SỰ ──────────────────
check('VỊ TRÍ KIỂM: CHỈ khớp tên chứa "kiểm" + ("ván"|"thanh") — loại "Kiểm chất"/"Ép ván"',
  qcf.isQcFinalPos('QC Kiểm ván+thanh') === true && qcf.isQcFinalPos('Kiểm ván') === true &&
  qcf.isQcFinalPos('Kiểm thanh') === true && qcf.isQcFinalPos('kiểm ván+thanh') === true &&
  qcf.isQcFinalPos('Kiểm chất') === false && qcf.isQcFinalPos('Kiểm lò sấy') === false &&
  qcf.isQcFinalPos('Kiểm đầu vào') === false && qcf.isQcFinalPos('Ép ván') === false &&
  qcf.isQcFinalPos('Cắt chọn') === false);
check('NGƯỜI KIỂM: 23/09 có 2 người bộ phận QC (người chính + giờ, giờ ra trống = hết ca)',
  (() => {
    const rows = qcf.hrQcFinalAssignmentsOf('2026-09-23');
    return rows.length === 2 && rows[0].name === 'Nguyễn Văn A' && rows[0].time === '07:00–11:30' &&
           rows[1].name === 'Trần Thị B' && rows[1].time === '13:00 → hết ca';
  })());
check('NGƯỜI KIỂM: LỌC VỊ TRÍ — bố trí "Kiểm chất" cùng bộ phận QC cùng ngày KHÔNG bị lấy',
  (() => {
    const rows = qcf.hrQcFinalAssignmentsOf('2026-09-23');
    return rows.length === 2 && rows.every(r => r.positionName === 'QC Kiểm ván+thanh') &&
           !rows.some(r => r.name === 'Lê Văn C');
  })());
check('GIỜ KIỂM HC/TC: 07:00–11:30 + 13:00–hết ca = 9h HC · 0h TC (KHÔNG cộng giờ vị trí QC khác)',
  (() => {
    const sp = qcf.sumQcFinalHoursSplit(qcf.hrQcFinalAssignmentsOf('2026-09-23'), '2026-09-23');
    // Bố trí "Kiểm chất" 07:00–16:00 (9h) nếu bị lọt vào sẽ làm giờ ≠ 9h
    return approx(sp.hc, 9) && approx(sp.tc, 0);
  })());
check('GIỜ NGÀY: qcFinalDayHoursOf chỉ đếm vị trí Kiểm ván+thanh (9h, không phải 18h)',
  (() => {
    const h = qcf.qcFinalDayHoursOf('2026-09-23', []);
    return approx(h.hours, 9) && approx(h.hc, 9) && approx(h.tc, 0);
  })());
check('SNAPSHOT: hrQcFinalSnapshot lưu tên + giờ + HC/TC cùng lượt (phòng khi bố trí bị xóa)',
  (() => {
    const s = qcf.hrQcFinalSnapshot('2026-09-23');
    return s.workerNames === 'Nguyễn Văn A, Trần Thị B' && approx(s.workHours, 9) && approx(s.workHoursHC, 9);
  })());

// ─── C. LOAD / LƯU ────────────────────────────────────────────
qcf.loadQcFinal();
check('LOAD: chưa có dữ liệu → mảng rỗng', Array.isArray(state.qcFinalRecords) && state.qcFinalRecords.length === 0);
qcf.loadQcFinalRates();
check('LOAD ĐỊNH MỨC: chưa có → object rỗng', state.qcFinalRates && typeof state.qcFinalRates === 'object');
storeBacking.set(STORAGE_KEY_QC_FINAL, JSON.stringify([
  { id: 'qcf-old', date: '2026-09-20', workshop: 'x2', inputQty: 100, qtyOk: 90, qtyExcept: 5, qtyReject: 5, updatedAt: '2026-09-20T00:00:00Z' }
]));
qcf.loadQcFinal();
check('LOAD: nạp từ localStorage', state.qcFinalRecords.length === 1 && state.qcFinalRecords[0].id === 'qcf-old');
// ═══ PHẦN 4 ═══

// ─── D. LƯU LƯỢT KIỂM + CHẶN VALIDATE ─────────────────────────
state.qcFinalRecords = [];
setVal('qcf-workshop', 'x2');
setVal('qcf-date', '2026-09-23');
setVal('qcf-input-qty', '500');
setVal('qcf-ok', '380');
setVal('qcf-except', '60');
setVal('qcf-reject', '40');
qcf.handleQcFinalSubmit({ preventDefault(){} });
check('LƯU: 1 lượt kiểm mới (Xưởng 2 · ngày 23/09 · đầu vào 500)', state.qcFinalRecords.length === 1 &&
  state.qcFinalRecords[0].workshop === 'x2' && state.qcFinalRecords[0].date === '2026-09-23' && state.qcFinalRecords[0].inputQty === 500);
check('LƯU: SNAPSHOT người kiểm + giờ cùng lượt (tự động từ Nhân Sự)',
  state.qcFinalRecords[0].workerNames === 'Nguyễn Văn A, Trần Thị B' && approx(state.qcFinalRecords[0].workHoursHC, 9));
check('LƯU: localStorage ghi đúng key bamboo_tracker_qc_final_v1',
  JSON.parse(storeBacking.get(STORAGE_KEY_QC_FINAL)).length === 1);
const rec1 = state.qcFinalRecords[0];

// Chặn: thiếu đầu vào kiểm
const n0 = state.qcFinalRecords.length;
setVal('qcf-input-qty', '');
qcf.handleQcFinalSubmit({ preventDefault(){} });
check('CHẶN: thiếu Đầu vào kiểm → không lưu', state.qcFinalRecords.length === n0);
// Chặn: chưa có kết quả kiểm
setVal('qcf-input-qty', '500');
setVal('qcf-ok', ''); setVal('qcf-except', ''); setVal('qcf-reject', '');
qcf.handleQcFinalSubmit({ preventDefault(){} });
check('CHẶN: Đạt/Ngoại lệ/Loại đều trống → không lưu', state.qcFinalRecords.length === n0);
// Chặn: tổng > đầu vào
setVal('qcf-ok', '400'); setVal('qcf-except', '80'); setVal('qcf-reject', '40');
qcf.handleQcFinalSubmit({ preventDefault(){} });
check('CHẶN: Đạt + Ngoại lệ + Loại (520) > Đầu vào (500) → không lưu', state.qcFinalRecords.length === n0);

// ─── E. CÔNG THỨC 3 CON SỐ ────────────────────────────────────
const d1 = qcf.qcFinalDisplay(rec1);
check('CÔNG THỨC: Tổng kiểm = Đạt + Ngoại lệ + Loại = 480', d1.qtyChecked === 480);
check('CÔNG THỨC: Tổng đạt = Đạt + Ngoại lệ = 440', d1.qtyPass === 440);
check('CÔNG THỨC: Tỉ lệ lỗi = Loại ÷ Tổng kiểm ≈ 8,33%', approx(d1.errPct, (40 / 480) * 100));
check('CÔNG THỨC: Công suất = Tổng kiểm ÷ giờ (480 ÷ 9 ≈ 53,33 tấm/h) · chưa có định mức → Hiệu suất null',
  approx(d1.cap, 480 / 9) && d1.eff === null && d1.rate === null);
check('HIỂN THỊ: nhãn vị trí "Xưởng 2"', d1.workshopLabel === 'Xưởng 2');
// ═══ PHẦN 5 ═══

// ─── F. POPUP ĐỊNH MỨC 2 LOẠI (Kiểm Thanh thanh/h · Kiểm Ván tấm/h) ──
qcf.openQcFinalRateModal();
check('POPUP ĐỊNH MỨC: bấm nút mở được (overlay show) + bảng có hàng tháng',
  document.getElementById('modal-qcf-rate').classList._s.has('show') &&
  document.getElementById('qcf-rate-rows').innerHTML.includes('Tháng'));
setVal('qcf-rate-2026-09-thanh', '500');
setVal('qcf-rate-2026-09-van', '600');
qcf.handleQcFinalRateRowSave('2026-09');
check('ĐỊNH MỨC 2 LOẠI: lưu tháng 9 = { thanh: 500 thanh/h · van: 600 tấm/h } (state + localStorage)',
  state.qcFinalRates['2026-09'] && state.qcFinalRates['2026-09'].thanh === 500 &&
  state.qcFinalRates['2026-09'].van === 600 &&
  JSON.parse(storeBacking.get(STORAGE_KEY_QC_FINAL_RATE))['2026-09'].van === 600);
check('CHẶN ĐỊNH MỨC: cả 2 ô trống → không lưu', (() => {
  setVal('qcf-rate-2026-09-thanh', ''); setVal('qcf-rate-2026-09-van', '');
  qcf.handleQcFinalRateRowSave('2026-09');
  return state.qcFinalRates['2026-09'].van === 600;
})());
check('ĐỊNH MỨC CŨ (số thuần): qcFinalRateEntryOf hiểu là định mức Kiểm Ván', (() => {
  state.qcFinalRates['2026-08'] = 450; // bản cũ lưu bằng số
  const e = qcf.qcFinalRateEntryOf('2026-08');
  return e.thanh === 0 && e.van === 450 && qcf.qcFinalRateOf('2026-08-15', 'van') === 450 &&
         qcf.qcFinalRateOf('2026-08-15', 'thanh') === null;
})());
check('ĐỊNH MỨC THEO LOẠI: rec1 (Kiểm Ván) lấy đúng ĐM van — Công suất 53,33 ÷ 600 ≈ 8,89%',
  (() => { const d = qcf.qcFinalDisplay(rec1); return approx(d.rate, 600) && approx(d.eff, ((480 / 9) / 600) * 100); })());
qcf.closeQcFinalRateModal();
check('POPUP ĐỊNH MỨC: đóng được (overlay ẩn)',
  !document.getElementById('modal-qcf-rate').classList._s.has('show'));

// ─── G. RENDER: THẺ NGÀY + THỐNG KÊ + MINI CARD ───────────────
state.qcFinalRecords = [rec1];
qcf.renderQcFinalCard();
const dayHtml = document.getElementById('qcf-day-cards').innerHTML;
check('THẺ NGÀY: đầu thẻ có Ngày 23/09/26 (dd/mm/yy) + vị trí Xưởng 2',
  dayHtml.includes('x2-day-head') && dayHtml.includes('23/09/26') && dayHtml.includes('Xưởng 2'));
check('THẺ NGÀY: NGƯỜI KIỂM tự động (Nguyễn Văn A + giờ 07:00–11:30, "+1 người khác")',
  dayHtml.includes('Nguyễn Văn A') && dayHtml.includes('07:00–11:30') && dayHtml.includes('+1 người khác'));
check('THẺ NGÀY: GIỜ HC/TC (9h HC · 0h TC)', dayHtml.includes('9h HC') && dayHtml.includes('0h TC'));
check('THẺ NGÀY: đủ Tổng kiểm 480 · Tổng đạt 440 · Tỉ lệ lỗi 8,3%',
  dayHtml.includes('Tổng kiểm') && dayHtml.includes('480') &&
  dayHtml.includes('Tổng đạt') && dayHtml.includes('440') && dayHtml.includes('8,3'));
check('THẺ NGÀY: chip LOẠI KIỂM + ĐM tấm 600 + CÔNG SUẤT 53,3 + HIỆU SUẤT 8,9% (định mức theo loại)',
  dayHtml.includes('qcf-kind-chip') && dayHtml.includes('Kiểm Ván') &&
  dayHtml.includes('ĐM tấm') && dayHtml.includes('600') &&
  dayHtml.includes('53,3') && dayHtml.includes('Hiệu suất') && dayHtml.includes('8,9'));
check('THẺ NGÀY: dòng lượt kiểm có nút Sửa/Xóa gắn data-perm="qc"',
  dayHtml.includes('data-qcf-edit') && dayHtml.includes('data-qcf-delete') && dayHtml.includes('data-perm="qc"'));
const statsHtml = document.getElementById('qcf-stats').innerHTML;
check('THỐNG KÊ: đủ Lượt kiểm · Đầu vào · Tổng kiểm · Tổng đạt · Loại · Tỉ lệ lỗi · Công suất TB',
  statsHtml.includes('Lượt kiểm') && statsHtml.includes('Đầu vào kiểm') && statsHtml.includes('Tổng số lượng kiểm') &&
  statsHtml.includes('Tổng đạt') && statsHtml.includes('Tỉ lệ lỗi') && statsHtml.includes('Công suất TB'));
check('MINI CARD: đếm "1 lượt · 440 tấm đạt"', qcf.qcFinalCardCount() === '1 lượt · 440 tấm đạt');
qc.renderQcView();
check('MINI CARD: renderQcView cập nhật đếm thẻ launcher',
  document.getElementById('qc-mini-count-final').textContent === '1 lượt · 440 tấm đạt');
// ═══ PHẦN 6 ═══

// ─── G2. TỒN KIỂM THEO CẶP TUẦN (Tổng · Đã kiểm · Còn lại) ────
// Kiểm nhiều ngày mới hết số của cặp: sp1 (tổng 500) đã kiểm 200 ngày 24/09
state.qcFinalRecords.push({
  id: 'qcf-sp1', date: '2026-09-24', workshop: 'x2', kind: 'van',
  pairKey: qcf.qcFinalPairKeyOf('2026-09-24'),
  productId: 'sp1', productName: 'Ván 1220×2440×9', inputQty: 200,
  qtyOk: 190, qtyExcept: 10, qtyReject: 0,
  workerNames: '', workTime: '', workHours: 0, workHoursHC: 0, workHoursTC: 0,
  createdAt: '2026-09-24T00:00:00Z', updatedAt: '2026-09-24T00:00:00Z'
});
const stocks = qcf.qcFinalProductStocks('2026-09-23'); // cùng cặp 39–40
const stSp1 = stocks.find(s => s.productId === 'sp1');
const stSp2 = stocks.find(s => s.productId === 'sp2');
check('TỒN KIỂM: sp1 Tổng 500 · Đã kiểm 200 · CÒN LẠI 300 (cùng cặp 39–40)',
  stSp1 && stSp1.total === 500 && stSp1.used === 200 && stSp1.remain === 300);
check('TỒN KIỂM: sp2 chưa kiểm → Còn lại = Tổng (200)',
  stSp2 && stSp2.total === 200 && stSp2.used === 0 && stSp2.remain === 200);
check('TỒN KIỂM: lượt kiểm KHÔNG có pairKey (dữ liệu cũ) vẫn tính theo ngày', (() => {
  delete state.qcFinalRecords[1].pairKey;
  const s = qcf.qcFinalProductStocks('2026-09-23').find(x => x.productId === 'sp1');
  state.qcFinalRecords[1].pairKey = qcf.qcFinalPairKeyOf('2026-09-24');
  return s && s.used === 200 && s.remain === 300;
})());
// Danh sách thẻ hiển thị Tổng/Đã kiểm/Còn lại + chọn thẻ → tự điền CÒN LẠI
setVal('qcf-workshop', 'x2'); setVal('qcf-kind', 'van'); setVal('qcf-date', '2026-09-23');
qcf.syncQcFinalKindFields();
qcf.setQcFinalPickerOpen(true);
const pickHtml = document.getElementById('qcf-product-list').innerHTML;
check('DROPDOWN NỔI: mở → node PORTAL ra `#qc-detail-overlay` (lớp fixed phủ màn hình — không rơi đáy trang)',
  document.getElementById('qcf-picker').parentElement === document.getElementById('qc-detail-overlay'));
check('DROPDOWN NỔI: neo bằng INLINE STYLE — position:absolute + z-index:240 (thắng MỌI stylesheet cũ do cache) + top/left/width là số',
  document.getElementById('qcf-picker').style.position === 'absolute' &&
  document.getElementById('qcf-picker').style.zIndex === '240' &&
  /^\d+px$/.test(document.getElementById('qcf-picker').style.top) &&
  /^\d+px$/.test(document.getElementById('qcf-picker').style.left) &&
  /^\d+px$/.test(document.getElementById('qcf-picker').style.width));
check('DANH SÁCH THẺ: mỗi thẻ 2 dòng — tên + "Tổng 500 · Đã kiểm 200 · Còn lại 300"',
  pickHtml.includes('Tổng <strong>500</strong>') && pickHtml.includes('Đã kiểm 200') &&
  pickHtml.includes('Còn lại 300'));
const pickEvt = { target: { closest: (sel) => (sel === '[data-qcf-product]' ? { getAttribute: () => 'sp1' } : null) } };
qcf.onQcFinalListClick(pickEvt);
check('CHỌN THẺ: ô Đầu vào kiểm tự điền số CÒN LẠI (300 — không phải tổng 500)',
  document.getElementById('qcf-input-qty').value === '300');
qcf.resetQcFinalForm();
check('DROPDOWN NỔI: đóng → node TRỞ VỀ ô Đầu vào kiểm (không còn trong overlay)',
  document.getElementById('qcf-picker').parentElement !== document.getElementById('qc-detail-overlay'));
state.qcFinalRecords = [rec1]; // dọn dữ liệu thêm — trả về 1 lượt để các mục sau đúng
// ═══ PHẦN 6b ═══

// ─── H. LOẠI KIỂM (Thanh / Ván): đơn vị + nguồn danh sách ──────
setVal('qcf-kind', 'thanh');
qcf.syncQcFinalKindFields();
check('KIỂM THANH: đơn vị các ô số lượng đổi thành "thanh" + HIỆN danh sách CỠ thanh (Bào thanh)',
  document.getElementById('qcf-unit-in').textContent === 'thanh' &&
  document.getElementById('qcf-unit-ok').textContent === 'thanh' &&
  document.getElementById('qcf-picker-btn').hidden === false &&
  document.getElementById('qcf-picker-text').textContent === 'Cỡ thanh Bào thanh');
setVal('qcf-kind', 'van');
qcf.syncQcFinalKindFields();
check('KIỂM VÁN: đơn vị về "tấm" + hiện lại picker (Xưởng 2)',
  document.getElementById('qcf-unit-in').textContent === 'tấm' &&
  document.getElementById('qcf-picker-btn').hidden === false);

// ─── H. SỬA / XÓA + TOMBSTONE ─────────────────────────────────
qcf.editQcFinalRecord(rec1.id);
check('SỬA: nạp lại đúng lượt vào form + banner "đang sửa" hiện',
  document.getElementById('qcf-date').value === '2026-09-23' &&
  document.getElementById('qcf-input-qty').value === '500' &&
  document.getElementById('qcf-ok').value === '380' &&
  document.getElementById('qcf-edit-banner').style.display === '');
setVal('qcf-ok', '400'); // 400 + 60 + 40 = 500 ≤ đầu vào 500
qcf.handleQcFinalSubmit({ preventDefault(){} });
check('SỬA: đạt 380 → 400 (Tổng kiểm 500 · Tổng đạt 460 · vẫn 1 lượt · không tạo lượt mới)',
  state.qcFinalRecords.length === 1 && qcf.qcFinalDisplay(state.qcFinalRecords[0]).qtyPass === 460 &&
  qcf.qcFinalDisplay(state.qcFinalRecords[0]).qtyChecked === 500);
qcf.editQcFinalRecord(rec1.id);
qcf.deleteQcFinalRecord(rec1.id);
check('XÓA: xóa lượt kiểm + ghi tombstone (qcFinalRecords)',
  state.qcFinalRecords.length === 0 &&
  state.deletedIds.qcFinalRecords && state.deletedIds.qcFinalRecords[rec1.id]);

// ─── I. VỊ TRÍ XƯỞNG 1: "Sắp có" ──────────────────────────────
setVal('qcf-workshop', 'x1');
qcf.syncQcFinalWorkshopFields();
check('XƯỞNG 1: ẩn nút chọn thành phẩm · hiện chip "Sắp có"',
  document.getElementById('qcf-picker-btn').hidden === true &&
  document.getElementById('qcf-in-soon').hidden === false);
setVal('qcf-workshop', 'x2');
qcf.syncQcFinalWorkshopFields();
check('XƯỞNG 2: hiện lại nút chọn thành phẩm · ẩn chip "Sắp có"',
  document.getElementById('qcf-picker-btn').hidden === false &&
  document.getElementById('qcf-in-soon').hidden === true);

// ─── I2. 'KIỂM THANH' — LINK CỠ THANH ĐẦU RA CỦA BÀO THANH ─────
// Lượt Bào thanh ghi cỡ đầu ra 640×14×12 (đem bào 500 thanh) → QC chọn cỡ này,
// tự điền Đầu vào kiểm = số CÒN LẠI, lưu `sizeKey` để thẻ Bào Tinh đọc lại.
state.xuong2BaoTinhRecords = [
  { id: 'bt1', date: '2026-09-20', kind: 'bao_thanh', inSizeKey: '1200×18×15', inDims: [1200, 18, 15],
    inQty: 500, inSource: 'press', outSizeKey: '640×14×12', outDims: [640, 14, 12] },
  { id: 'bt2', date: '2026-09-21', kind: 'bao_thanh', inSizeKey: '1200×18×15', inDims: [1200, 18, 15],
    inQty: 300, inSource: 'press', outSizeKey: '1200×10×8', outDims: [1200, 10, 8] }
];
setVal('qcf-kind', 'thanh'); setVal('qcf-workshop', 'x2');
qcf.syncQcFinalKindFields();
const sizeStocks = qcf.qcFinalThanhSizeStocks();
check('TỒN CỠ THANH: 2 cỡ đầu ra của Bào thanh — 640×14×12 Tổng 500 · Còn 500',
  sizeStocks.length === 2 &&
  (sizeStocks.find(x => x.sizeKey === '640×14×12') || {}).total === 500 &&
  (sizeStocks.find(x => x.sizeKey === '640×14×12') || {}).remain === 500);
qcf.setQcFinalPickerOpen(true);
const thanhListHtml = document.getElementById('qcf-product-list').innerHTML;
check('DANH SÁCH CỠ THANH: thẻ hiện cỡ mm + Tổng/Đã kiểm/Còn lại + nút chọn data-qcf-size',
  thanhListHtml.includes('640 × 14 × 12 mm') && thanhListHtml.includes('data-qcf-size="640×14×12"') &&
  thanhListHtml.includes('Tổng <strong>500</strong>') && thanhListHtml.includes('Còn lại 500'));
qcf.onQcFinalListClick({ target: { closest: sel => sel === '[data-qcf-size]' ? { getAttribute: () => '640×14×12' } : null } });
check('CHỌN CỠ THANH: ô Đầu vào kiểm tự điền số CÒN LẠI (500)',
  document.getElementById('qcf-input-qty').value === '500');
setVal('qcf-date', '2026-09-22');
setVal('qcf-input-qty', '500'); setVal('qcf-ok', '470'); setVal('qcf-except', '10'); setVal('qcf-reject', '20');
qcf.handleQcFinalSubmit({ preventDefault(){} });
const qcThanh = state.qcFinalRecords[state.qcFinalRecords.length - 1];
check('LƯU KIỂM THANH: lưu kind=thanh + sizeKey/sizeDims của cỡ được kiểm',
  qcThanh.kind === 'thanh' && qcThanh.sizeKey === '640×14×12' &&
  qcThanh.sizeDims.join('×') === '640×14×12' && qcThanh.qtyOk === 470);
check('TỒN CỠ THANH SAU KIỂM: 640×14×12 đã kiểm 500 → Còn 0 · cỡ kia vẫn 300',
  (qcf.qcFinalThanhSizeStocks().find(x => x.sizeKey === '640×14×12') || {}).remain === 0 &&
  (qcf.qcFinalThanhSizeStocks().find(x => x.sizeKey === '1200×10×8') || {}).remain === 300);
qcf.renderQcFinalTable();
check('THẺ NGÀY: lượt Kiểm thanh hiện CHIP CỠ thay cho tên thành phẩm',
  document.getElementById('qcf-day-cards').innerHTML.includes('Cỡ 640 × 14 × 12') &&
  qcf.qcFinalDisplay(qcThanh).sizeKey === '640×14×12');
// SỬA lượt kiểm thanh → khôi phục đúng cỡ + xoá sạch dữ liệu thêm
qcf.editQcFinalRecord(qcThanh.id);
check('SỬA KIỂM THANH: khôi phục lựa chọn cỡ 640 × 14 × 12', (() => {
  qcf.setQcFinalPickerOpen(true);
  const h = document.getElementById('qcf-product-list').innerHTML;
  qcf.setQcFinalPickerOpen(false);
  return h.includes('qcf-product picked');
})());
qcf.deleteQcFinalRecord(qcThanh.id);
state.xuong2BaoTinhRecords = [];
state.qcFinalRecords = [];

// ─── I3. 'KIỂM VÁN' — 2 NHÓM NGUỒN: VÁN THÔ BTP + THÀNH PHẨM ──────────────
// ĐVT phân loại THÀNH PHẨM (1220x2440x9 = Tấm · 640x14x12 = Thanh);
// THỂ TÍCH 1 thế < 0,0015 m³ phân loại VÁN THÔ BTP (không cần định mức).
state.materialRates = [
  { id: 'r-van',   product: '1220x2440x9', unit: 'Tấm',  nanUse: 'Ván' },
  { id: 'r-thanh', product: '640x14x12',   unit: 'Thanh', nanUse: 'Ván' }
];
state.pressRecords = [
  // ① Lượt BTP: CHỈ điền "Ván Thô Tạo Ra", KHÔNG điền Thành Phẩm (cặp 39–40)
  { id: 'pb1', date: '2026-09-22', week: '2026-W39', year: 2026, productId: '', productName: '',
    finishedQty: 0, sticks: [],
    vanTho: [{ vtDim: '1220×2440×9', vtQty: 50 }, { vtDim: '640x14x12', vtQty: 300 },
             { vtDim: '1200×18×15', vtQty: 700 }] }, // 1200×18×15 KHÔNG có định mức → phải LOẠI nhờ thể tích
  // ② Thành phẩm ĐVT = Thanh → PHẢI bị loại khỏi danh sách Kiểm Ván (VD 640x14x12)
  { id: 'pp1', date: '2026-09-23', week: '2026-W39', year: 2026, productId: 'r-thanh', productName: '640x14x12',
    finishedQty: 99, vanTho: [], sticks: [] },
  // ③ Thành phẩm ĐVT = Tấm → giữ lại
  { id: 'pp2', date: '2026-09-24', week: '2026-W39', year: 2026, productId: 'r-van', productName: '1220x2440x9',
    finishedQty: 40, vanTho: [], sticks: [] }
];
setVal('qcf-kind', 'van'); setVal('qcf-workshop', 'x2'); setVal('qcf-date', '2026-09-23');
qcf.syncQcFinalKindFields();
check('VÁN THÔ BTP: tồn gộp theo cỡ — chỉ còn 1220×2440×9 (Tổng 50) · LOẠI 640×14×12 + 1200×18×15 theo THỂ TÍCH', (() => {
  const rows = qcf.qcFinalVanBtpStocks('2026-09-23');
  const van = rows.find(x => x.sizeKey === '1220×2440×9');
  return rows.length === 1 && van && van.total === 50 && van.remain === 50 &&
    van.name === 'Ván thô 1220 × 2440 × 9' &&
    !rows.find(x => x.sizeKey === '640×14×12');
})());
check('VÁN THÔ BTP: cỡ 1200×18×15 KHÔNG có trong định mức vẫn bị LOẠI nhờ thể tích (0,000324 m³ < 0,0015)',
  !qcf.qcFinalVanBtpStocks('2026-09-23').find(x => x.sizeKey === '1200×18×15'));
check('THÀNH PHẨM 2 TUẦN: chỉ còn sp ĐVT Tấm (1220x2440x9 = 40) — loại ĐVT Thanh + lượt BTP', (() => {
  const rows = qcf.qcFinalProducts2Weeks('2026-09-23');
  return rows.length === 1 && rows[0].productId === 'r-van' && rows[0].qty === 40;
})());
qcf.setQcFinalPickerOpen(true);
const vanListHtml = document.getElementById('qcf-product-list').innerHTML;
check('DANH SÁCH KIỂM VÁN: 2 nhóm head (Ván thô BTP · Thành phẩm Ép Ván) + thẻ data-qcf-vt',
  vanListHtml.includes('Ván thô BTP —') && vanListHtml.includes('Thành phẩm Ép Ván —') &&
  vanListHtml.includes('data-qcf-vt="1220×2440×9"') && vanListHtml.includes('data-qcf-product="r-van"'));
check('DANH SÁCH KIỂM VÁN: KHÔNG còn sót thanh — 640×14×12 · 1200×18×15 (BTP) và sp ĐVT Thanh',
  !vanListHtml.includes('640 × 14 × 12') && !vanListHtml.includes('1200 × 18 × 15') &&
  !vanListHtml.includes('data-qcf-product="r-thanh"'));
check('THẺ VÁN THÔ BTP: 2 dòng — "Ván thô 1220 × 2440 × 9 mm" + Tổng 50 · Đã kiểm 0 · Còn lại 50',
  vanListHtml.includes('Ván thô 1220 × 2440 × 9 mm') &&
  vanListHtml.includes('Tổng <strong>50</strong>') &&
  vanListHtml.includes('Đã kiểm 0') && vanListHtml.includes('Còn lại 50'));
qcf.onQcFinalListClick({ target: { closest: sel => sel === '[data-qcf-vt]' ? { getAttribute: () => '1220×2440×9' } : null } });
check('CHỌN THẺ VÁN THÔ: tự điền CÒN LẠI (50) + nhãn nút đổi thành tên ván thô',
  document.getElementById('qcf-input-qty').value === '50' &&
  document.getElementById('qcf-picker-text').textContent === 'Ván thô 1220 × 2440 × 9');
setVal('qcf-ok', '45'); setVal('qcf-except', '3'); setVal('qcf-reject', '2'); // 45+3+2 = 50 = đầu vào
qcf.handleQcFinalSubmit({ preventDefault(){} });
const qcBtp = state.qcFinalRecords[state.qcFinalRecords.length - 1];
check('LƯU KIỂM VÁN BTP: kind=van + sizeKey/sizeDims 1220×2440×9 + productName "Ván thô …" + productId rỗng',
  state.qcFinalRecords.length === 1 && qcBtp.kind === 'van' && qcBtp.sizeKey === '1220×2440×9' &&
  qcBtp.sizeDims.join('×') === '1220×2440×9' &&
  qcBtp.productName === 'Ván thô 1220 × 2440 × 9' && !qcBtp.productId && qcBtp.qtyOk === 45);
check('TỒN BTP SAU KIỂM: 1220×2440×9 đã kiểm 50 → Còn 0',
  (qcf.qcFinalVanBtpStocks('2026-09-23').find(x => x.sizeKey === '1220×2440×9') || {}).remain === 0);
qcf.renderQcFinalTable();
check('THẺ NGÀY: lượt Kiểm ván BTP hiện chip productName "Ván thô 1220 × 2440 × 9"',
  document.getElementById('qcf-day-cards').innerHTML.includes('Ván thô 1220 × 2440 × 9'));
// SỬA lượt BTP → khôi phục lựa chọn (thẻ highlighted trong danh sách 2 nhóm)
qcf.editQcFinalRecord(qcBtp.id);
check('SỬA KIỂM VÁN BTP: khôi phục cỡ 1220×2440×9 (thẻ picked trong danh sách)', (() => {
  qcf.setQcFinalPickerOpen(true);
  const h = document.getElementById('qcf-product-list').innerHTML;
  qcf.setQcFinalPickerOpen(false);
  return h.includes('data-qcf-vt="1220×2440×9"') && h.includes('qcf-product picked');
})());
qcf.deleteQcFinalRecord(qcBtp.id);
check('XÓA LƯỢT BTP: không còn lượt nào + tồn trả lại 50',
  state.qcFinalRecords.length === 0 &&
  (qcf.qcFinalVanBtpStocks('2026-09-23').find(x => x.sizeKey === '1220×2440×9') || {}).remain === 50);
state.pressRecords = []; state.materialRates = []; state.qcFinalRecords = [];

// ─── J. CẤU TRÚC (index.html · qc.js · events.js · 4 nơi · sw.js · css) ──
const idxHtml = fsMod.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const qcJs = fsMod.readFileSync(new URL('../js/qc.js', import.meta.url), 'utf8');
const evJs = fsMod.readFileSync(new URL('../js/events.js', import.meta.url), 'utf8');
const stJs = fsMod.readFileSync(new URL('../js/state.js', import.meta.url), 'utf8');
const stoJs = fsMod.readFileSync(new URL('../js/storage.js', import.meta.url), 'utf8');
const clJs = fsMod.readFileSync(new URL('../js/cloud.js', import.meta.url), 'utf8');
const hiJs = fsMod.readFileSync(new URL('../js/history.js', import.meta.url), 'utf8');
const mnJs = fsMod.readFileSync(new URL('../js/main.js', import.meta.url), 'utf8');
const swJs = fsMod.readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
const cssHtml = fsMod.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
const pkJs = fsMod.readFileSync(new URL('../package.json', import.meta.url), 'utf8');

check('CẤU TRÚC (index.html): thẻ qc-final-card có form · ô Kiểm Loại · picker thành phẩm · thẻ ngày',
  idxHtml.includes('id="qc-final-card"') && idxHtml.includes('id="qcf-form"') &&
  idxHtml.includes('id="qcf-kind"') && idxHtml.includes('id="qcf-product-list"') &&
  idxHtml.includes('id="qcf-day-cards"') && idxHtml.includes('id="qcf-input-qty"'));
check('CẤU TRÚC (index.html): nút "Định mức" TRONG form + popup bảng định mức 2 loại (bỏ thanh .x2-rate-bar cũ)',
  idxHtml.includes('id="btn-qcf-rate"') && idxHtml.includes('id="modal-qcf-rate"') &&
  idxHtml.includes('id="qcf-rate-rows"') && idxHtml.includes('Kiểm Thanh (thanh/h)') &&
  idxHtml.includes('Kiểm Ván (tấm/h)') && !idxHtml.includes('id="qcf-rate-bar"'));
check('CẤU TRÚC (index.html): mini card không còn chú thích "sắp bổ sung"',
  !idxHtml.includes('Kiểm Sau Sản Xuất — kiểm tra thành phẩm trước khi xuất xưởng (sắp bổ sung)'));
check('CẤU TRÚC (qc.js): đếm thẻ qc-final-card dùng qcFinalCardCount + render trong renderQcView',
  qcJs.includes("'qc-final-card':    { el: 'qc-mini-count-final',    count: () => qcFinalCardCount() }") &&
  qcJs.includes('renderQcFinalCard();'));
check('CẤU TRÚC (events.js): wire form · Loại kiểm · picker · sửa/xóa · popup định mức + đóng picker ngoài',
  evJs.includes("safeOn('qcf-form', 'submit'") && evJs.includes('toggleQcFinalPicker') &&
  evJs.includes('onQcFinalTableClick') && evJs.includes("safeOn('qcf-kind', 'change'") &&
  evJs.includes('openQcFinalRateModal') && evJs.includes('onQcFinalRateRowClick') &&
  evJs.includes('qcFinalMaybeClosePicker'));
check('CẤU TRÚC (js/qc-final.js): tồn kiểm theo cặp tuần (pairKey) + đơn vị theo Loại kiểm + tồn ván thô BTP',
  fsMod.readFileSync(new URL('../js/qc-final.js', import.meta.url), 'utf8').includes('qcFinalProductStocks') &&
  fsMod.readFileSync(new URL('../js/qc-final.js', import.meta.url), 'utf8').includes('qcFinalPairKeyOf') &&
  fsMod.readFileSync(new URL('../js/qc-final.js', import.meta.url), 'utf8').includes('syncQcFinalKindFields') &&
  fsMod.readFileSync(new URL('../js/qc-final.js', import.meta.url), 'utf8').includes('qcFinalVanBtpStocks') &&
  fsMod.readFileSync(new URL('../js/qc-final.js', import.meta.url), 'utf8').includes('QC_FINAL_BTP_PIECE_MAX_VOL') &&
  fsMod.readFileSync(new URL('../js/qc-final.js', import.meta.url), 'utf8').includes('data-qcf-vt'));
check('CẤU TRÚC (state.js): 2 key bamboo_tracker_qc_final_v1 + bamboo_tracker_qc_final_rate_v1',
  stJs.includes("bamboo_tracker_qc_final_v1") && stJs.includes("bamboo_tracker_qc_final_rate_v1"));
check('CẤU TRÚC (4 nơi): storage (restore) · cloud (snapshot/core) · history (DOMAINS) · main (load boot)',
  stoJs.includes('restoreQcFinal') && stoJs.includes('qcFinalRecords') &&
  clJs.includes('qcFinalRecords') && clJs.includes('qcFinalRates') &&
  hiJs.includes('qcFinalRecords') && mnJs.includes('loadQcFinal'));
check('CẤU TRÚC (sw.js): CACHE_NAME v194 + js/qc-final.js vào APP_SHELL',
  /nha-may-ngoc-son-v212/.test(swJs) && swJs.includes("'./js/qc-final.js'"));
check('CẤU TRÚC (styles.css): khối CSS riêng của thẻ (form gọn + dropdown nổi position:absolute + dòng lượt kiểm + popup ĐM)',
  cssHtml.includes('.qcf-picker') && cssHtml.includes('.qcf-row-main') && cssHtml.includes('.qcf-ws-chip') &&
  cssHtml.includes('.qcf-kind-chip') && cssHtml.includes('.qcf-product-meta') &&
  cssHtml.includes('.qcf-rate-input') &&
  /\.qcf-picker\s*\{[^}]*position:\s*absolute/.test(cssHtml) && !/\.qcf-picker\s*\{[^}]*position:\s*(static|fixed)/.test(cssHtml));
check('CẤU TRÚC (dropdown nổi): portal ra overlay + neo tọa độ (mở xuống/lên) + giữ neo khi cuộn/resize/Esc',
  (() => {
    const qcfJs = fsMod.readFileSync(new URL('../js/qc-final.js', import.meta.url), 'utf8');
    const evSrc = fsMod.readFileSync(new URL('../js/events.js', import.meta.url), 'utf8');
    return qcfJs.includes("getElementById('qc-detail-overlay') || document.body") &&
           qcfJs.includes('positionQcFinalPicker') && qcfJs.includes('openUp') &&
           qcfJs.includes("box.style.position = 'absolute'") && qcfJs.includes("box.style.zIndex = '240'") &&
           qcfJs.includes("e.target.closest('#qcf-picker')") &&
           evSrc.includes('positionQcFinalPicker') &&
           evSrc.includes("window.addEventListener('scroll', positionQcFinalPicker, true)") &&
           evSrc.includes('setQcFinalPickerOpen(false); return;');
  })());
check('CẤU TRÚC (cloud.js): đăng ký SW với updateViaCache:"none" — sw.js luôn tải mới, hết dính bundle cũ',
  fsMod.readFileSync(new URL('../js/cloud.js', import.meta.url), 'utf8').includes("register('./sw.js', { updateViaCache: 'none' })"));
check('CẤU TRÚC (package.json): tests/qc-final.test.mjs đã vào npm test',
  pkJs.includes('tests/qc-final.test.mjs'));

// ─── TỔNG KẾT ────────────────────────────────────────────────
console.log(`\n=== qc-final.test.mjs: ${passed} PASS · ${failed} FAIL ===`);
if (failed) process.exit(1);
