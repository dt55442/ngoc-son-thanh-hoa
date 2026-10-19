// tests/report-center.test.mjs — TRUNG TÂM XUẤT EXCEL (17/10/2026)
//   • 1 modal dùng chung thay 6 modal cũ: Tab → Báo cáo → Bộ lọc → Xem Trước/Xuất
//   • Mọi báo cáo đi qua engine chuẩn hoá: ô SỐ = number, dòng TỔNG CỘNG,
//     AutoFilter trên vùng dữ liệu, ngày giờ theo GIỜ MÁY VN
//   • 8 thẻ Xưởng 1 xuất ĐÚNG vùng dữ liệu (trước đây rơi về 'batch' = Lô nan)
'use strict';

// ─── Stubs môi trường (giống export-stage.test.mjs) ────────────────
function makeEl(id) {
  const el = {
    id: id || '', value: '', checked: false, disabled: false, hidden: false,
    open: true, textContent: '', innerHTML: '', style: {}, dataset: {}, _h: {},
    offsetWidth: 800, offsetHeight: 500,
    classList: {
      _s: new Set(), add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); },
      toggle(c, f) { if (f === undefined) f = !this._s.has(c); if (f) this._s.add(c); else this._s.delete(c); return f; },
      contains(c) { return this._s.has(c); }
    },
    addEventListener(t, f) { (el._h[t] = el._h[t] || []).push(f); },
    appendChild(c) { return c; }, removeChild(c) { return c; }, remove() {},
    setAttribute() {}, getAttribute: () => null,
    querySelector: () => makeEl(), querySelectorAll: () => [],
    closest: () => null, matches: () => false,
    getContext: () => ({ measureText: () => ({ width: 10 }), createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }), drawImage() {} }),
    toDataURL: () => 'data:image/jpeg;base64,CANVASOK',
    getBoundingClientRect: () => ({ top: 0, left: 0, right: 800, bottom: 600, width: 800, height: 600 }),
    focus() {}, click() {}, animate() { return { cancel() {} }; }
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
  addEventListener() {}, removeEventListener() {}, escapeCSS: (s) => s
};
global.location = { href: 'http://localhost:8080/', origin: 'http://localhost:8080', pathname: '/', search: '', hash: '', reload() {} };
global.history = { replaceState() {}, pushState() {}, back() {}, state: null };
Object.defineProperty(global, 'navigator', { value: { onLine: true, userAgent: 'node-test', language: 'vi' }, configurable: true });
global.matchMedia = () => ({ matches: false, media: '', addListener() {}, removeListener() {}, addEventListener() {} });
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

let passed = 0, failed = 0;
function check(name, cond) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.error('FAIL ' + name); }
}

const fs = await import('node:fs');
const { state } = await import('../js/state.js');
const rc = await import('../js/report-center.js');
const specs = await import('../js/report-specs.js');
const x2 = await import('../js/xuong2.js');
const xlsx = await import('../js/export-xlsx.js');
const idxHtml = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const evSrc = fs.readFileSync(new URL('../js/events.js', import.meta.url), 'utf8');
const swSrc = fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
const cssSrc = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');

state.currentUser = { username: 'admin', role: 'admin', editTabs: ['kanban'], allowAdvanced: true };

// ─── XLSX ghép để bắt file ────────────────────────────────────────
let writtenFiles = [];
let lastSheetAoa = null, lastSheetName = '';
global.XLSX = {
  utils: {
    book_new: () => ({ sheets: [], SheetNames: [] }),
    aoa_to_sheet: (aoa) => ({ aoa }),
    book_append_sheet: (wb, ws, name) => {
      wb.sheets.push({ name, aoa: ws.aoa }); wb.SheetNames.push(name);
      lastSheetAoa = ws.aoa; lastSheetName = name;
    }
  },
  writeFile: (wb, filename) => { writtenFiles.push({ filename, wb }); },
  write: () => new ArrayBuffer(8)
};

// ─── A. DANH MỤC BÁO CÁO ─────────────────────────────────────────
check('A1. Có đủ 6 nhóm báo cáo (X2/X1/Kế Hoạch/Nguyên Liệu/QC/Nhân Sự)',
  specs.REPORT_GROUPS.length === 6 && specs.REPORT_GROUPS.map(g => g.id).join(',') === 'x2,x1,planning,materials,qc,hr');
check('A2. Tổng số báo cáo = 43 (16 X2 + 8 X1 + 3 KH + 2 NL + 3 QC + 11 NS)',
  specs.REPORT_SPECS.length === 43);
check('A3. 13 báo cáo Xưởng 2 + 8 báo cáo Xưởng 1',
  specs.reportsOfGroup('x2').length === 16 && specs.reportsOfGroup('x1').length === 8);
check('A4. MỌI thẻ có nguồn xuất đều có báo cáo (22 thẻ)',
  Object.keys(x2.X2_CARD_EXPORT_SOURCE).length === 22 &&
  Object.keys(x2.X2_CARD_EXPORT_SOURCE).every(cardId => !!specs.reportIdForCard(cardId)));
check('A5. Thẻ Xưởng 1 trỏ ĐÚNG báo cáo X1 (không còn rơi về batch)',
  specs.reportIdForCard('x1-cat-ong-card') === 'x1catong' &&
  specs.reportIdForCard('x1-loc-thanh-card') === 'x1locthanh' &&
  specs.reportById('x1catong').source === 'x1catong');

// ─── B. DỮ LIỆU MẪU + DỰNG BÁO CÁO ──────────────────────────────
state.materialRecords = [
  { id: 'm1', type: 'Luồng cây tươi', supplier: 'Nhà Tế', location: 'xuong-2', weight: 1000, date: '2026-10-05' }
];
state.xuong2CutRecords = [
  { id: 'c1', materialId: 'm1', date: '2026-10-05', inputWeight: 1000, klOngLuong: 450, klCuiDot: 50, klCayLoai: 20, note: '' }
];
state.xuong1CatOngRecords = [
  { id: 'x1a', materialId: 'm1', date: '2026-10-06', inputWeight: 500, klDat: 300, klLoai: 50, klMat: 20, klNgon: 30, note: '' }
];
state.batches = [
  { id: 'b1', code: 'L1', stage: 'kho', location: 'K1', quantity: 100, length: 1250, width: 18, thickness: 7, date: '2026-10-01', createdAt: '2026-10-01T01:00:00.000Z' }
];

rc.openReportCenter('cut');
check('B1. Mở Trung Tâm Xuất: modal hiện + tiêu đề đúng báo cáo',
  document.getElementById('modal-report-center').classList.contains('show') &&
  String(document.getElementById('report-center-subtitle').textContent).includes('Nhật ký Cắt'));
check('B2. Vẽ 6 tab nhóm + chip báo cáo của nhóm đang chọn',
  String(document.getElementById('report-center-tabs').innerHTML).includes('data-rc-group="x2"') &&
  String(document.getElementById('report-center-list').innerHTML).includes('data-rc-report="cut"'));
check('B3. Bộ lọc KỲ tự sinh (chọn kiểu kỳ + giá trị + nút ‹ ›)',
  String(document.getElementById('report-center-filters').innerHTML).includes('id="rc-f-period-mode"'));

rc.rcValues.periodMode = 'all';
rc.rcValues.periodKey = '';
const dCut = rc.buildReportData();
check('B4. Báo cáo Cắt Chọn: header hàng 5 (index 4) + 1 dòng dữ liệu (có cột LOẠI ĐẦU VÀO + SỐ XE)',
  !!dCut && dCut.headerRow === 4 && dCut.aoa[4][0] === 'Stt' &&
  dCut.aoa[4][5] === 'Loại Đầu Vào' && dCut.aoa[4][6] === 'Số Xe' &&
  dCut.aoa[4][7] === 'KL Đầu Vào (kg)' &&
  dCut.aoa.length === 7);
check('B5. Ô SỐ là NUMBER THẬT (1000 kg vào + 450 kg ống đạt) — không còn chuỗi "1.000"',
  typeof dCut.aoa[5][7] === 'number' && dCut.aoa[5][7] === 1000 &&
  typeof dCut.aoa[5][8] === 'number' && dCut.aoa[5][8] === 450);
check('B6. Có dòng TỔNG CỘNG + tổng KL đầu vào = 1000',
  String(dCut.aoa[6][1]).includes('TỔNG CỘNG') && dCut.aoa[6][7] === 1000);
check('B7. AutoFilter chỉ trên VÙNG DỮ LIỆU, KHÔNG gồm dòng tổng (A5:T6)',
  dCut.autofilter === 'A5:T6');
check('B8. Có zCells định dạng số cho cột kg (2 chữ số thập phân)',
  Object.keys(dCut.zCells || {}).length > 0 && dCut.zCells['5,7'] === '#,##0.00');
check('B9. Ngày xuất dùng GIỜ MÁY (dd/mm/yyyy HH:mm), không phải UTC ISO',
  /^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/.test(String(dCut.aoa[1][0]).replace('Ngày xuất: ', '')));
// ─── C. XƯỞNG 1 KHÔNG CÒN XUẤT NHẦM LÔ NAN ─────────────────────
rc.openReportCenter('x1catong');
const dX1 = rc.buildReportData();
check('C1. Thẻ Cắt Ống xuất ĐÚNG dữ liệu Xưởng 1 (không phải Lô nan)',
  !!dX1 && String(dX1.aoa[0][0]).includes('XƯỞNG 1') && String(dX1.aoa[0][0]).includes('CẮT ỐNG') &&
  !String(dX1.aoa[0][0]).includes('LÔ NAN'));
check('C2. Cột đúng công đoạn Cắt Ống (KL Lô Đầu Vào · KL Đạt · KL Mắt · KL Ngọn)',
  dX1.aoa[4].join('|').includes('KL Đạt (kg)') && dX1.aoa[4].join('|').includes('KL Mắt (kg)') &&
  dX1.aoa[4].join('|').includes('KL Ngọn (kg)'));
check('C3. Số liệu X1 là number thật (KL lô đầu vào lấy từ Nguyên liệu = 1000)',
  typeof dX1.aoa[5][5] === 'number' && dX1.aoa[5][5] === 1000);

// Lượt Lọc Ống (công đoạn đuôi X1) — dùng spec chung X1_CHAIN_SPECS
state.xuong1LocOngRecords = [
  { id: 'lo1', bocId: '', date: '2026-10-07', qtyIn: 100, qtyOk: 80, qtyLoai: 20, srcType: 'Vầu/nứa', srcSupplier: 'Nhà Tế', note: '' }
];
rc.openReportCenter('x1locong');
const dX1Chain = rc.buildReportData();
check('C4. Báo cáo 5 công đoạn đuôi X1 dùng spec chung (có cột KL Vào/Đạt/Loại + Nguồn)',
  !!dX1Chain && dX1Chain.aoa[4].join('|').includes('KL Vào (kg)') &&
  dX1Chain.aoa[4].join('|').includes('KL Đạt (kg)'));

// ─── D. KỲ LỌC (Ngày/Tuần/Tháng/Năm) ───────────────────────────
check('D1. Tuần ISO: khóa dạng YYYY-Www + khoảng đúng 7 ngày',
  (function () {
    const k = rc.isoWeekKey('2026-10-17');
    const r = rc.periodRange('week', k);
    const days = (new Date(r.to) - new Date(r.from)) / 86400000;
    return /^2026-W\d{2}$/.test(k) && days === 6;
  })());
check('D2. Tháng 10/2026 = 01/10 → 31/10',
  JSON.stringify(rc.periodRange('month', '2026-10')) === JSON.stringify({ from: '2026-10-01', to: '2026-10-31' }));
check('D3. Năm 2026 = 01/01 → 31/12',
  JSON.stringify(rc.periodRange('year', '2026')) === JSON.stringify({ from: '2026-01-01', to: '2026-12-31' }));
check('D4. "Tất cả thời gian" = không lọc',
  rc.periodRange('all', '') .from === '' && rc.periodRange('all', '').to === '');

rc.openReportCenter('cut');
rc.rcValues.periodMode = 'month';
rc.rcValues.periodKey = '2026-11';
check('D5. Chọn tháng KHÔNG có dữ liệu → không dựng báo cáo (không tạo file rỗng)',
  rc.buildReportData() === null);
rc.rcValues.periodKey = '2026-10';
check('D6. Chọn đúng tháng có dữ liệu → dựng được báo cáo',
  !!rc.buildReportData());

// ─── E. XEM TRƯỚC / XUẤT FILE / XUẤT CẢ NHÓM ───────────────────
rc.openReportCenter('cut');
rc.rcValues.periodMode = 'all';
rc.openReportPreview();
check('E1. "Xem Trước" mở màn xem trước dùng chung + đóng modal xuất',
  document.getElementById('modal-export-preview').classList.contains('show') &&
  !document.getElementById('modal-report-center').classList.contains('show'));
check('E2. Bảng xem trước có <thead> cho hàng tiêu đề (in lặp trang)',
  String(document.getElementById('export-preview-table-box').innerHTML).includes('<thead>'));

writtenFiles = [];
rc.openReportCenter('cut');
rc.handleReportSubmit({ preventDefault() {} });
check('E3. Xuất file .xlsx đúng tên + sheet name KHÔNG chứa ký tự cấm',
  writtenFiles.length === 1 && /^Xuong2_cut_\d{4}-\d{2}-\d{2}\.xlsx$/.test(writtenFiles[0].filename) &&
  !/[\\/?*[\]:]/.test(lastSheetName));
check('E4. Xuất xong đóng Trung Tâm Xuất',
  !document.getElementById('modal-report-center').classList.contains('show'));

writtenFiles = [];
rc.openReportCenter('x1catong');
rc.exportReportGroup();
check('E5. "Xuất Cả Nhóm": 1 file nhiều sheet (chỉ báo cáo CÓ dữ liệu — X1: Cắt Ống + Lọc Ống)',
  writtenFiles.length === 1 && /^BaoCao_X1_\d{4}-\d{2}-\d{2}\.xlsx$/.test(writtenFiles[0].filename) &&
  writtenFiles[0].wb.SheetNames.length === 2 &&
  writtenFiles[0].wb.SheetNames.some(n => n.includes('Cắt Ống')) &&
  writtenFiles[0].wb.SheetNames.some(n => n.includes('Lọc Ống')));


// ─── F. CẤU TRÚC (index / events / sw / css / engine) ──────────
check('F1. index.html có modal Trung Tâm Xuất + ĐÃ XÓA 6 modal xuất cũ',
  idxHtml.includes('id="modal-report-center"') && idxHtml.includes('id="report-center-filters"') &&
  idxHtml.includes('id="btn-report-export"') && idxHtml.includes('id="btn-report-preview"') &&
  idxHtml.includes('id="btn-report-multi"') &&
  !idxHtml.includes('id="modal-custom-export"') && !idxHtml.includes('id="modal-export-planning"') &&
  !idxHtml.includes('id="modal-export-press"') && !idxHtml.includes('id="modal-export-materials"') &&
  !idxHtml.includes('id="modal-export-qc"') && !idxHtml.includes('id="modal-export-hr"'));
check('F2. Nút xuất ở từng tab vẫn còn (đổi ruột sang center, không đổi vị trí)',
  idxHtml.includes('id="btn-open-export-modal"') && idxHtml.includes('id="btn-export-x2"') &&
  idxHtml.includes('id="btn-open-export-planning"') && idxHtml.includes('id="btn-open-export-materials"') &&
  idxHtml.includes('id="btn-open-export-qc"') && idxHtml.includes('id="btn-open-export-hr"') &&
  idxHtml.includes('id="btn-preview-x2"'));
check('F3. events.js nối center: mở theo thẻ/tab + 4 nút + lọc',
  evSrc.includes("safeOn('btn-report-export'") && evSrc.includes("safeOn('btn-report-preview'") &&
  evSrc.includes("safeOn('btn-report-multi'") && evSrc.includes("openReportCenter(x2OpenCardExportSource())") &&
  evSrc.includes("openReportCenter('plan-items')") && evSrc.includes("openReportCenter('qc-export')") &&
  evSrc.includes("safeOn('report-center-filters',      'change', onReportFilterChange)"));
check('F4. sw.js: cache v275 + nạp report-specs.js/report-center.js vào APP_SHELL',
  swSrc.includes("nha-may-ngoc-son-v285") && swSrc.includes("./js/report-specs.js") &&
  swSrc.includes("./js/report-center.js"));
check('F5. CSS có khối .rc-* + in lặp tiêu đề + JS ghi rõ giới hạn viền/màu',
  cssSrc.includes('.rc-card') && cssSrc.includes('.rc-filter-grid') &&
  cssSrc.includes('#export-preview-print-area thead { display: table-header-group; }') &&
  fs.readFileSync(new URL('../js/report-center.js', import.meta.url), 'utf8')
    .includes('KHÔNG ghi được viền/màu'));
// F5b. CSS KHÔNG ĐƯỢC LỒNG SAI trong @media: khối .rc-* phải ở CẤP CAO NHẤT.
// Lỗi thật 18/10/2026: thiếu "}" đóng @media (max-width: 639.98px) của khối
// .kho-warn-* ⇒ TOÀN BỘ .rc-* bị cuốn vào media query điện thoại → mở Trung Tâm
// Xuất trên máy tính thì modal KHÔNG có style (chip báo cáo dính thành 1 dòng chữ).
// → Test phải kiểm CẤU TRÚC NGOẶC, không chỉ "includes(.rc-card)".
function cssDepthOfNeedle(src, needle) {
  const lines = String(src).split(/\r?\n/);
  let depth = 0;
  for (const line of lines) {
    if (line.includes(needle)) return depth;
    depth += (line.match(/{/g) || []).length - (line.match(/}/g) || []).length;
    if (depth < 0) return -999; // ngoặc đóng thừa
  }
  return -1; // không tìm thấy
}
const cssOpenBraces = (cssSrc.match(/{/g) || []).length;
const cssCloseBraces = (cssSrc.match(/}/g) || []).length;
check('F5b. CSS .rc-* ở CẤP CAO NHẤT (không lồng trong @media) + ngoặc cân bằng',
  cssDepthOfNeedle(cssSrc, '.rc-card {') === 0 &&
  cssDepthOfNeedle(cssSrc, '.rc-list {') === 0 &&
  cssDepthOfNeedle(cssSrc, '.rc-filter-grid {') === 0 &&
  cssOpenBraces === cssCloseBraces);
check('F6. Engine ghi AutoFilter + chuẩn hoá tên sheet (Excel không cho \\ / ? * [ ] :)',
  (function () {
    const src = fs.readFileSync(new URL('../js/export-xlsx.js', import.meta.url), 'utf8');
    return src.includes("ws['!autofilter'] = { ref: d.autofilter }") &&
      src.includes("String(d.sheetName || 'Sheet').replace(/[\\\\/?*[\\]:]/g, ' ')");
  })());

// Báo cáo tab Kế Hoạch (Định Mức NVL) dựng được từ state
state.materialRates = [{
  id: 'rate-1', product: '1200x382x12', nanUse: 'Ván', unit: 'Tấm',
  productCode: 'SP1', fullName: 'Ván 1200x382x12', pressType: 'Ép nóng',
  nan1: '1250x18x7', nan1Qty: 1 / 6, nan2: '', nan2Qty: 0, nan3: '', nan3Qty: 0,
  glue: 1.2, additive: 0.3, efficiency: 70
}];
rc.openReportCenter('plan-rates');
const dRates = rc.buildReportData();
check('F7. Báo cáo Định Mức NVL: đủ cột + cỡ sản phẩm KHÔNG còn tiền tố "Ván"',
  !!dRates && dRates.aoa[4].join('|').includes('Sử Dụng Nan') &&
  dRates.aoa[4].join('|').includes('Số Lượng Nan 1') &&
  dRates.aoa[5][1] === '1200x382x12' && dRates.aoa[5][2] === 'Ván');

console.log(`\n=== TRUNG TÂM XUẤT EXCEL: ${passed} PASS / ${failed} FAIL ===`);
process.exit(failed ? 1 : 0);


