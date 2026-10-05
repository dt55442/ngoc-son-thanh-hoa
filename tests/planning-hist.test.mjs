// tests/planning-hist.test.mjs — Tab Kế Hoạch:
//  (1) BẢNG ĐỊNH MỨC NGUYÊN VẬT LIỆU: bỏ 3 cột "Số Lượng" (16 → 13 cột — số
//      lượng đã in ở dòng nhỏ dưới ô "Loại Nan N") + bọc khung cuộn dọc
//      .table-scroll (thead dính).
//  (2) SỔ LỊCH SỬ BẢN GHI KẾ HOẠCH: thay lưới thẻ (~6 cột → 52 tuần xuống
//      dòng 12 lần) bằng BẢNG GỌN 1 DÒNG/TUẦN gom nhóm theo THÁNG + thanh
//      lọc QUÝ/THÁNG + tìm nhanh + ẩn tuần đã đạt + bấm dòng bung chi tiết.
'use strict';

import fs from 'node:fs';

// ─── Stubs môi trường (giống qc.test.mjs) ────────────────────────
function makeEl(id) {
  const el = {
    id: id || '', value: '', checked: false, disabled: false, hidden: false,
    open: true, textContent: '', innerHTML: '', style: {}, dataset: {}, _h: {}, _tag: '',
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
  createElement: (tag) => { const e = makeEl(); e._tag = tag || ''; return e; },
  createTextNode: (t) => ({ textContent: t }),
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
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ─── IMPORT (sau khi stub xong) ───────────────────────────────────
const { state } = await import('../js/state.js');
const planning = await import('../js/planning.js');

// ═══════════════════════════════════════════════════════════════════
// A. BẢNG ĐỊNH MỨC — BỎ 3 CỘT "SỐ LƯỢNG" + CUỘN DỌC
// ═══════════════════════════════════════════════════════════════════
console.log('--- A. BẢNG ĐỊNH MỨC NGUYÊN VẬT LIỆU ---');
const htmlSrc = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const cssSrc = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
const jsSrc  = fs.readFileSync(new URL('../js/planning.js', import.meta.url), 'utf8');
const evSrc  = fs.readFileSync(new URL('../js/events.js', import.meta.url), 'utf8');

const rateBlock = htmlSrc.slice(htmlSrc.indexOf('id="material-rate-table"'), htmlSrc.indexOf('id="material-rate-body"'));
const thCount = (rateBlock.match(/<th[ >]/g) || []).length;
check('A1: bảng định mức còn ĐÚNG 13 cột (đã bỏ 3 cột "Số Lượng")', thCount === 13);
check('A2: KHÔNG còn <th>Số Lượng</th> trong bảng định mức', !rateBlock.includes('<th>Số Lượng</th>'));
check('A3: vẫn giữ 2 cột "Sử Dụng Nan" + "ĐVT"', rateBlock.includes('<th>Sử Dụng Nan</th>') && rateBlock.includes('<th>ĐVT</th>'));
check('A4: bọc khung cuộn dọc dùng chung .table-scroll (thead dính + max-height)',
  htmlSrc.includes('class="table-responsive table-scroll"') && jsSrc.includes('colspan="13"') && !jsSrc.includes('colspan="16"'));
check('A5: CSS có style .rate-nan-info + .rate-nan-qty (số lượng ở dòng nhỏ dưới loại nan)',
  cssSrc.includes('.rate-nan-info {') && cssSrc.includes('.rate-nan-qty {'));
check('A6: CSS #material-rate-table thu hẹp min-width (780px, giảm từ 900px)',
  /#material-rate-table\s*\{\s*min-width:\s*780px/.test(cssSrc));

// Render thật → đếm số <td> của 1 dòng
state.currentUser = { username: 'admin', role: 'admin', editTabs: [], allowAdvanced: true };
state.materialRates = [
  { id: 'r1', product: '1200x382x12', nanUse: 'Ván', unit: 'Tấm', nan1: '1250×18×7', nan1Qty: 6,
    nan2: '1250×22×7', nan2Qty: 4, nan3: '', nan3Qty: 0, glue: 1, additive: 0.1, efficiency: 70 },
  { id: 'r2', product: '1250x80x12', nanUse: 'Bullig', unit: 'Thanh', nan1: '1250×80×12', nan1Qty: 1 / 6,
    nan2: '', nan2Qty: 0, nan3: '', nan3Qty: 0, glue: 2, additive: 0.2, efficiency: 75 }
];
const created = [];
const origCreate = document.createElement;
document.createElement = (tag) => { const e = origCreate(tag); created.push(e); return e; };
try { planning.renderMaterialRatesTable(); } catch (e) { console.error('render lỗi:', e.message); }
document.createElement = origCreate;
const trs = created.filter(e => e._tag === 'tr');
check('A7: render 1 dòng cho mỗi định mức (2 dòng)', trs.length === 2);
const row1 = (trs[0] && trs[0].innerHTML) || '';
check('A8: mỗi dòng ĐÚNG 13 ô <td> (hết 3 cột Số Lượng thừa)', (row1.match(/<td[ >]/g) || []).length === 13);
check('A9: dòng có ô "Loại Nan 1" kèm SỐ LƯỢNG ở dòng nhỏ (.rate-nan-qty)',
  row1.includes('rate-nan-info') && row1.includes('rate-nan-qty') && row1.includes('× 6'));
const row2 = (trs[1] && trs[1].innerHTML) || '';
check('A10: phân số được giữ nguyên (1/6) thay vì đổi thành số thập phân', row2.includes('× 1/6'));

// ═══════════════════════════════════════════════════════════════════
// B. SỔ LỊCH SỬ KẾ HOẠCH — CẤU TRÚC
// ═══════════════════════════════════════════════════════════════════
console.log('--- B. SỔ LỊCH SỬ KẾ HOẠCH: CẤU TRÚC ---');
check('B1: CSS đã GỠ lưới thẻ .planning-week-grid / .planning-week-card',
  !/^\s*\.planning-week-grid\s*\{/m.test(cssSrc) && !/^\s*\.planning-week-card\s*\{/m.test(cssSrc));
check('B2: CSS có bảng sổ .plan-hist-table + thead dính (sticky)',
  cssSrc.includes('.plan-hist-table {') && cssSrc.includes('.plan-hist-table thead th {') && cssSrc.includes('position: sticky;'));
check('B3: CSS có dòng tiêu đề THÁNG dính .plan-hist-month th', cssSrc.includes('.plan-hist-month th {'));
check('B4: CSS có thanh công cụ .plan-hist-bar + ô tìm .ph-search', cssSrc.includes('.plan-hist-bar {') && cssSrc.includes('.ph-search {'));
check('B5: CSS giữ nguyên class dòng chi tiết .planning-week-item* + .plan-item-capacity',
  cssSrc.includes('.planning-week-items {') && cssSrc.includes('.planning-week-item {') && cssSrc.includes('.plan-item-capacity {'));
check('B6: trạng thái UI theo MÁY — key riêng bamboo_tracker_plan_hist_ui_v1 (không đồng bộ mây)',
  jsSrc.includes("PLAN_HIST_UI_KEY = 'bamboo_tracker_plan_hist_ui_v1'"));
check('B7: KHÔNG thêm khóa mới vào state.js (thuần UI)',
  !fs.readFileSync(new URL('../js/state.js', import.meta.url), 'utf8').includes('planHist'));
check('B8: events.js nối đủ 4 nhóm sự kiện (tìm · tháng+checkbox · quý · dòng)',
  evSrc.includes("id === 'plan-hist-search'") && evSrc.includes("id === 'plan-hist-month'") &&
  evSrc.includes("id === 'plan-hist-hide-done'") && evSrc.includes('[data-plan-hist-q]') &&
  evSrc.includes('planHistOnRowClick'));

// ═══════════════════════════════════════════════════════════════════
// C. RENDER THẬT VỚI 52 TUẦN
// ═══════════════════════════════════════════════════════════════════
console.log('--- C. RENDER 52 TUẦN ---');
const Y = 2026;
state.planningItems = [];
for (let w = 1; w <= 52; w++) {
  state.planningItems.push({ id: `p-${w}`, year: Y, week: `Tuần ${w}`, productId: 'r1', qty: w * 10 });
}
state.pressRecords = [];
state.planningForecast = {};
state.planningStock = {};
state.batches = [];

// Đặt bộ lọc mặc định TRƯỚC lần render đầu (loadPlanHistUi đọc localStorage)
localStorage.setItem('bamboo_tracker_plan_hist_ui_v1',
  JSON.stringify({ q: 'all', month: 'all', search: '', hideDone: false, open: {} }));

planning.renderPlanningListSection(Y);
const box = document.getElementById('planning-list-section');
const wrapHtml = box.innerHTML;
check('C1: tiêu đề "Lịch Sử Bản Ghi Kế Hoạch Sản Xuất — Năm 2026"',
  wrapHtml.includes('Lịch Sử Bản Ghi Kế Hoạch Sản Xuất — Năm 2026'));
check('C2: có khung cuộn .plan-hist-wrap bọc BẢNG .plan-hist-table',
  wrapHtml.includes('plan-hist-wrap') && wrapHtml.includes('plan-hist-table'));
check('C3: ĐÚNG 7 cột, cột Tuần đứng đầu',
  wrapHtml.includes('<th class="ph-c-week">Tuần</th>') && (wrapHtml.match(/<th[ >]/g) || []).length === 7);
check('C4: thanh công cụ đủ 5 nút QUÝ + ô Tháng + ô tìm + ẩn tuần đã đạt',
  (wrapHtml.match(/data-plan-hist-q=/g) || []).length === 5 &&
  wrapHtml.includes('id="plan-hist-month"') && wrapHtml.includes('id="plan-hist-search"') &&
  wrapHtml.includes('id="plan-hist-hide-done"'));

const body = document.getElementById('plan-hist-body');
const rowsHtml = body.innerHTML;
const nWeekRows = (rowsHtml.match(/class="plan-hist-row/g) || []).length;
const nMonthRows = (rowsHtml.match(/class="plan-hist-month"/g) || []).length;
check('C5: 52 tuần → ĐÚNG 52 dòng tuần (hết 12 hàng thẻ cao)', nWeekRows === 52);
check('C6: gom nhóm THEO THÁNG — 12 dòng tiêu đề tháng cho 52 tuần ISO 2026',
  nMonthRows === 12 && rowsHtml.includes('Tháng 1/2026') && rowsHtml.includes('Tháng 12/2026'));
check('C7: đếm số tuần ở thanh công cụ = "52/52 tuần"',
  document.getElementById('plan-hist-count').textContent === '52/52 tuần');
check('C8: mỗi dòng có chip sản phẩm; cột "Có Thể Ép" ở hàng cột',
  (rowsHtml.match(/class="ph-chip"/g) || []).length === 52 && wrapHtml.includes('Có Thể Ép'));
check('C9: mỗi dòng tuần có 1 nút Nhân bản + 1 nút Sửa (52 cặp)',
  (rowsHtml.match(/app\.duplicatePlanningGroup\(/g) || []).length === 52 &&
  (rowsHtml.match(/app\.editPlanningGroup\(/g) || []).length === 52);
check('C10: có cột khoảng ngày dd/mm – dd/mm', rowsHtml.includes('02/03 – 08/03'));
check('C11: KHÔNG bung chi tiết mặc định', !rowsHtml.includes('plan-hist-detail'));
check('C12: CSS dòng tháng dính top:31px (ngay dưới hàng cột)',
  /\.plan-hist-month th \{[^}]*top: 31px/s.test(cssSrc));
check('C13: CSS .planning-list-section bỏ max-height cũ → CHỈ bảng tự cuộn',
  /\.planning-list-section \{[^}]*max-height: none/s.test(cssSrc));


// ═══════════════════════════════════════════════════════════════════
// D. BỘ LỌC QUÝ / THÁNG / TÌM / ẨN TUẦN ĐÃ ĐẠT
// ═══════════════════════════════════════════════════════════════════
console.log('--- D. BỘ LỌC ---');
check('D1: planHistQuarterOf: T1–13→Q1 · T14–26→Q2 · T27–39→Q3 · T40–52→Q4',
  planning.planHistQuarterOf(1) === 'q1' && planning.planHistQuarterOf(13) === 'q1' &&
  planning.planHistQuarterOf(14) === 'q2' && planning.planHistQuarterOf(26) === 'q2' &&
  planning.planHistQuarterOf(27) === 'q3' && planning.planHistQuarterOf(39) === 'q3' &&
  planning.planHistQuarterOf(40) === 'q4' && planning.planHistQuarterOf(52) === 'q4');

planning.planHistOnQuarter('q2');
const q2Rows = (document.getElementById('plan-hist-body').innerHTML.match(/class="plan-hist-row/g) || []).length;
check('D2: lọc Q2 → đúng 13 tuần (14–26)', q2Rows === 13);
check('D3: nút Q2 gắn class active',
  document.getElementById('planning-list-section').innerHTML.includes('class="ph-seg-btn active" data-plan-hist-q="q2"'));
check('D4: bộ lọc Q2 được GHI MÁY', JSON.parse(localStorage.getItem('bamboo_tracker_plan_hist_ui_v1')).q === 'q2');

planning.planHistOnQuarter('all');
check('D5: về "Cả năm" → 52 tuần trở lại',
  (document.getElementById('plan-hist-body').innerHTML.match(/class="plan-hist-row/g) || []).length === 52);

planning.planHistOnMonth('3');
const m3Html = document.getElementById('plan-hist-body').innerHTML;
check('D6: lọc Tháng 3/2026 → đúng 4 tuần ISO (Tuần 10–13)',
  (m3Html.match(/class="plan-hist-row/g) || []).length === 4 &&
  m3Html.includes('data-plan-hist-week="10"') && m3Html.includes('data-plan-hist-week="13"'));
check('D7: còn đúng 1 dòng tiêu đề "Tháng 3/2026"',
  (m3Html.match(/class="plan-hist-month"/g) || []).length === 1 && m3Html.includes('Tháng 3/2026'));
planning.planHistOnMonth('all');

planning.planHistOnSearch({ target: { value: '1250' } });
await sleep(260);
check('D8: tìm "1250" khớp loại nan 1250×18×7 → 52 tuần',
  (document.getElementById('plan-hist-body').innerHTML.match(/class="plan-hist-row/g) || []).length === 52);
planning.planHistOnSearch({ target: { value: 'khong-ton-tai-zzz' } });
await sleep(260);
check('D9: không khớp → dòng trống "Không có tuần nào khớp bộ lọc"',
  document.getElementById('plan-hist-body').innerHTML.includes('plan-hist-empty'));
planning.planHistOnSearch({ target: { value: '' } });
await sleep(260);

// Ẩn tuần đã ép đủ (ép đủ tuần LẺ → còn 26 tuần CHƯA đạt)
state.pressRecords = [];
for (let w = 1; w <= 52; w++) {
  if (w % 2 === 0) continue;
  state.pressRecords.push({ id: `pr-${w}`, date: '2026-03-05', week: `Tuần ${w}`, year: Y,
    productId: 'r1', finishedQty: w * 10, sticks: [], vanTho: [] });
}
planning.planHistOnHideDone(true);
check('D10: "Chỉ tuần chưa đạt" → ẩn 26 tuần đã ép đủ, còn 26 tuần',
  (document.getElementById('plan-hist-body').innerHTML.match(/class="plan-hist-row/g) || []).length === 26);
planning.planHistOnHideDone(false);
check('D11: tắt bộ lọc → đủ 52 tuần',
  (document.getElementById('plan-hist-body').innerHTML.match(/class="plan-hist-row/g) || []).length === 52);
state.pressRecords = [];


// ═══════════════════════════════════════════════════════════════════
// E. BUNG / THU CHI TIẾT DÒNG
// ═══════════════════════════════════════════════════════════════════
console.log('--- E. BUNG CHI TIẾT DÒNG ---');
planning.planHistToggleWeek('10');
let eh = document.getElementById('plan-hist-body').innerHTML;
check('E1: bung Tuần 10 → thêm 1 dòng .plan-hist-detail', (eh.match(/class="plan-hist-detail"/g) || []).length === 1);
check('E2: dòng chi tiết có loại nan + "Có thể ép" + nút xóa từng kế hoạch',
  eh.includes('planning-week-item-nan') && eh.includes('Có thể ép:') && eh.includes("app.deletePlanningItem('p-10')"));
check('E3: dòng Tuần 10 gắn class is-open', /<tr class="plan-hist-row is-open" data-plan-hist-week="10">/.test(eh));
check('E4: trạng thái bung được GHI MÁY (mở lại vẫn còn)',
  JSON.parse(localStorage.getItem('bamboo_tracker_plan_hist_ui_v1')).open['10'] === 1);
planning.planHistToggleWeek('10');
check('E5: bấm nữa → THU GỌN (hết dòng chi tiết)', !document.getElementById('plan-hist-body').innerHTML.includes('plan-hist-detail'));

// ═══════════════════════════════════════════════════════════════════
// F. KHOẢNG NGÀY TUẦN ISO + THÁNG CỦA TUẦN
// ═══════════════════════════════════════════════════════════════════
console.log('--- F. KHOẢNG NGÀY TUẦN ISO ---');
const r1 = planning.planWeekRangeISO(Y, 1);
check('F1: Tuần 1/2026 = 29/12/2025 → 04/01/2026 (ISO)', r1.start === '2025-12-29' && r1.end === '2026-01-04');
const r10 = planning.planWeekRangeISO(Y, 10);
check('F2: Tuần 10/2026 = 02/03 → 08/03', r10.start === '2026-03-02' && r10.end === '2026-03-08');
check('F3: tháng của tuần lấy theo THỨ NĂM (Tuần 10 → tháng 3)', planning.planWeekMonthOf(Y, 10) === 3);
check('F4: Tuần 1/2026 có thứ Năm 01/01/2026 → tháng 1', planning.planWeekMonthOf(Y, 1) === 1);
check('F5: tuần nằm đè 2 tháng (T52/2025… ) vẫn vào đúng 1 nhóm — không tách đôi',
  planning.planWeekMonthOf(Y, 13) === 3 && planning.planWeekMonthOf(Y, 14) === 4);

// ═══════════════════════════════════════════════════════════════════
// G. TRẠNG THÁI RỖNG
// ═══════════════════════════════════════════════════════════════════
console.log('--- G. RỖNG ---');
state.planningItems = [];
planning.renderPlanningListSection(Y);
check('G1: không có kế hoạch → thông báo "Chưa có"',
  document.getElementById('planning-list-section').innerHTML.includes('Chưa có'));
state.planningItems = [{ id: 'p-1', year: Y, week: 'Tuần 1', productId: 'r1', qty: 100 }];
planning.renderPlanningListSection(Y);
check('G2: có dữ liệu trở lại → bảng sổ dựng đủ', document.getElementById('planning-list-section').innerHTML.includes('plan-hist-table'));

console.log(`\nKẾT QUẢ: ${passed} pass, ${failed} fail`);
if (failed > 0) process.exit(1);

