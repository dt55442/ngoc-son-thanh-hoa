// tests/export-tabs.test.mjs — Kiểm thử XUẤT EXCEL RIÊNG THEO TAB
// Bao phủ: modal bộ lọc (Kế Hoạch / Ép Ván / Nguyên Liệu), submit lọc dữ liệu,
// dòng TỔNG CỘNG, tên file, chặn xuất khi không có dữ liệu, đóng modal.
'use strict';

// ─── Stubs môi trường (giống materials.test.mjs) ──────────────────
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
    toDataURL: () => 'data:image/jpeg;base64,CANVASOK',
    getBoundingClientRect: () => ({ top: 0, left: 0, right: 800, bottom: 600, width: 800, height: 600 }),
    focus(){}, click(){}, animate(){ return { cancel(){} }; }
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
global.FileReader = class {
  readAsDataURL() { this.result = 'data:image/jpeg;base64,FAKE'; setTimeout(() => this.onload && this.onload({ target: this }), 0); }
  readAsText() { this.result = '[]'; setTimeout(() => this.onload && this.onload({ target: this }), 0); }
};
global.Image = class {
  constructor() { this.width = 1200; this.height = 900; }
  set src(_) { setTimeout(() => this.onload && this.onload(), 0); }
};
global.Chart = class {
  constructor(ctx, cfg) { this.ctx = ctx; this.config = cfg; this.data = (cfg && cfg.data) || { labels: [], datasets: [] }; }
  update(){} resize(){} destroy(){} render(){} reset(){} getDatasetMeta(){ return { data: [] }; }
};
Chart.register = () => {};
global.lucide = { createIcons(){} };
if (!global.URL.createObjectURL) global.URL.createObjectURL = () => 'blob:stub';
if (!global.URL.revokeObjectURL) global.URL.revokeObjectURL = () => {};

let passed = 0, failed = 0;
function check(name, cond) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.error('FAIL ' + name); }
}

// ─── IMPORT MODULES (sau khi stub xong) ───────────────────────────
const { state } = await import('../js/state.js');
const xlsxMod = await import('../js/export-xlsx.js');

state.currentUser = { username: 'admin', role: 'admin', editTabs: ['kanban', 'planning', 'press', 'materials', 'dashboard'], allowAdvanced: true };

// ─── XLSX GHÉP ĐỂ BẮT FILE + SHEET ───────────────────────────────
let writtenFiles = [];
let lastSheetAoa = null;
let lastSheetName = '';
global.XLSX = {
  utils: {
    book_new: () => ({ sheets: [] }),
    aoa_to_sheet: (aoa) => ({ aoa }),
    book_append_sheet: (wb, ws, name) => { wb.sheets.push({ name, aoa: ws.aoa }); lastSheetAoa = ws.aoa; lastSheetName = name; }
  },
  writeFile: (wb, filename) => { writtenFiles.push({ filename, wb }); },
  write: () => new ArrayBuffer(8)
};

const ev = { preventDefault(){} };
function setVal(id, v) { const el = document.getElementById(id); el.value = v; return el; }
function modalShown(id) { return document.getElementById(id).classList._s.has('show'); }
function lastFile() { return writtenFiles[writtenFiles.length - 1]; }

// ─── DỮ LIỆU GIẢ ──────────────────────────────────────────────
state.materialRates = [
  { id: 'rate-1', product: 'Ván ép 9mm' },
  { id: 'rate-2', product: 'Ván ép 12mm' }
];

state.planningItems = [
  { year: 2026, week: 'Tuần 2',  productId: 'rate-2', qty: 100 },
  { year: 2026, week: 'Tuần 10', productId: 'rate-1', qty: 50 },
  { year: 2025, week: 'Tuần 2',  productId: 'rate-1', qty: 30 }
];

state.pressRecords = [
  { date: '2026-08-10', week: '2026-W33', productId: 'rate-1', productName: 'Ván ép 9mm',  worker: 'Nam',  fpDim: '1220x2440x9',  finishedQty: 40, glue: 8.5, additive: 1.2, vanTho: [{ vtDim: '1200x600x9', vtQty: 50 }], sticks: [{ nanKey: 'A1', sticks: 120 }] },
  { date: '2026-08-11', week: '2026-W33', productId: 'rate-2', productName: 'Ván ép 12mm', worker: 'Hùng', fpDim: '1220x2440x12', finishedQty: 25, glue: 6,   additive: 0.8, vanTho: [], sticks: [] },
  { date: '2025-12-30', week: '2025-W01', productId: 'rate-1', productName: 'Ván ép 9mm',  worker: 'nam',  fpDim: '1220x2440x9',  finishedQty: 10, glue: 2,   additive: 0.3, vanTho: [], sticks: [] }
];

state.materialRecords = [
  { id: 'm1', date: '2026-08-10', week: '2026-W33', type: 'Tre nguyên liệu', supplier: 'NCC A', location: 'lo-hoi',  inputIndex: 1000, outputIndex: 850, weight: 150, unitPrice: 5000,  totalAmount: 750000, note: 'ok', images: ['data:image/jpeg;base64,IMG1'], createdAt: '2026-08-10T01:00:00.000Z' },
  { id: 'm2', date: '2026-08-11', week: '2026-W33', type: 'Keo UF',          supplier: 'NCC B', location: 'xuong-1', inputIndex: 200,  outputIndex: 180, weight: 20,  unitPrice: 30000, totalAmount: 600000, note: '',   images: [], createdAt: '2026-08-11T01:00:00.000Z' },
  { id: 'm3', date: '2025-07-01', week: '2025-W27', type: 'Tre nguyên liệu', supplier: 'NCC A', location: 'xuong-2', inputIndex: 500,  outputIndex: 480, weight: 20,  unitPrice: 5000,  totalAmount: 100000, note: 'cũ', images: [], createdAt: '2025-07-01T01:00:00.000Z' }
];

// ═══════════════════════════════════════════════════════════
// 1) KẾ HOẠCH SẢN XUẤT
// ═══════════════════════════════════════════════════════════
xlsxMod.openPlanningExportModal();
check('KH: mở modal xuất', modalShown('modal-export-planning'));
check('KH: select năm có 2 năm dữ liệu', document.getElementById('export-planning-year').innerHTML.includes('>2025<') && document.getElementById('export-planning-year').innerHTML.includes('>2026<'));
check('KH: select tuần gộp trùng "Tuần 2"', (document.getElementById('export-planning-week').innerHTML.match(/>Tuần 2</g) || []).length === 1);
check('KH: select sản phẩm theo tên định mức', document.getElementById('export-planning-product').innerHTML.includes('Ván ép 9mm'));

xlsxMod.handlePlanningExportSubmit(ev);
check('KH: xuất được 1 file', writtenFiles.length === 1);
check('KH: tên file KeHoach_SanXuat_*.xlsx', /^KeHoach_SanXuat_\d{4}-\d{2}-\d{2}\.xlsx$/.test(lastFile().filename));
check('KH: sheet "Kế Hoạch SX"', lastSheetName === 'Kế Hoạch SX');
const khAoa = lastSheetAoa;
check('KH: đủ 3 dòng dữ liệu + header + tổng (9 dòng)', khAoa.length === 9);
check('KH: sắp xếp năm tăng dần (2025 trước 2026)', khAoa[5][1] === 2025);
check('KH: tuần sắp xếp số học (Tuần 2 trước Tuần 10 trong 2026)', khAoa[6][2] === 'Tuần 2' && khAoa[7][2] === 'Tuần 10');
check('KH: dòng TỔNG CỘNG = 180 tấm', khAoa[8][3] === 'TỔNG CỘNG' && khAoa[8][4] === 180);
check('KH: đóng modal sau khi xuất', !modalShown('modal-export-planning'));

// Lọc theo năm 2026
xlsxMod.openPlanningExportModal();
setVal('export-planning-year', '2026');
xlsxMod.handlePlanningExportSubmit(ev);
check('KH: lọc năm 2026 còn 2 dòng', lastSheetAoa.length === 4 + 1 + 2 + 1);
check('KH: tổng năm 2026 = 150', lastSheetAoa[lastSheetAoa.length - 1][4] === 150);
check('KH: dòng bộ lọc ghi rõ "Năm 2026"', lastSheetAoa[2][0].includes('Năm 2026'));

// Lọc không có kết quả -> không xuất file, modal còn mở
const before = writtenFiles.length;
xlsxMod.openPlanningExportModal();
setVal('export-planning-year', '2026');
setVal('export-planning-product', 'rate-2');
setVal('export-planning-week', 'Tuần 10');
xlsxMod.handlePlanningExportSubmit(ev);
check('KH: lọc vô hiệu -> không tạo file mới', writtenFiles.length === before);
check('KH: lọc vô hiệu -> modal còn mở (để sửa)', modalShown('modal-export-planning'));
xlsxMod.closePlanningExportModal();

// ═══════════════════════════════════════════════════════════
// 2) SẢN LƯỢNG ÉP VÁN
// ═══════════════════════════════════════════════════════════
xlsxMod.openPressExportModal();
check('ÉV: mở modal xuất', modalShown('modal-export-press'));
check('ÉV: select năm có 2025 & 2026', document.getElementById('export-press-year').innerHTML.includes('>2025<') && document.getElementById('export-press-year').innerHTML.includes('>2026<'));
check('ÉV: select tuần hiển thị thân thiện', document.getElementById('export-press-week').innerHTML.includes('Tuần 33 (2026)'));
check('ÉV: select thành phẩm từ snapshot productName', document.getElementById('export-press-product').innerHTML.includes('Ván ép 12mm'));
check('ÉV: công nhân gộp "Nam"/"nam" thành 1', (document.getElementById('export-press-worker').innerHTML.match(/Nam</g) || []).length === 1);

const beforeEvExport = writtenFiles.length;
xlsxMod.handlePressExportSubmit(ev);
check('ÉV: xuất được file', writtenFiles.length === beforeEvExport + 1);
check('ÉV: tên file SanLuong_EpVan_*.xlsx', /^SanLuong_EpVan_\d{4}-\d{2}-\d{2}\.xlsx$/.test(lastFile().filename));
check('ÉV: sheet "Ép Ván"', lastSheetName === 'Ép Ván');
const evAoa = lastSheetAoa;
check('ÉV: đủ 3 dòng dữ liệu + header + tổng (9 dòng)', evAoa.length === 9);
check('ÉV: sắp xếp ngày tăng dần (2025 trước)', evAoa[5][1] === '30/12/25');
check('ÉV: tuần thân thiện trên dòng dữ liệu', evAoa[6][2] === 'Tuần 33 (2026)');
check('ÉV: tóm tắt ván thô "1200x600x9 ×50"', evAoa[6][7] === '1200x600x9 ×50');
check('ÉV: tóm tắt thanh thô "A1: 120 thanh"', evAoa[6][8] === 'A1: 120 thanh');
check('ÉV: dòng TỔNG CỘNG = 75 tấm', evAoa[8][5] === 'TỔNG CỘNG' && evAoa[8][6] === 75);
check('ÉV: tổng keo/phụ gia cộng đúng', Math.abs(evAoa[8][9] - 16.5) < 1e-9 && Math.abs(evAoa[8][10] - 2.3) < 1e-9);
check('ÉV: đóng modal sau khi xuất', !modalShown('modal-export-press'));

// Lọc theo công nhân "nam" (gộp cả "Nam" lẫn "nam")
xlsxMod.openPressExportModal();
setVal('export-press-worker', 'nam');
xlsxMod.handlePressExportSubmit(ev);
check('ÉV: lọc công nhân còn 2 dòng', lastSheetAoa.length === 5 + 2 + 1);
check('ÉV: tổng SL công nhân nam = 50 tấm', lastSheetAoa[lastSheetAoa.length - 1][6] === 50);

// Lọc theo tuần 2026-W33
xlsxMod.openPressExportModal();
setVal('export-press-week', '2026-W33');
xlsxMod.handlePressExportSubmit(ev);
check('ÉV: lọc tuần W33 còn 2 dòng', lastSheetAoa.length === 8);
check('ÉV: dòng bộ lọc ghi tuần thân thiện', lastSheetAoa[2][0].includes('Tuần 33 (2026)'));

// Lọc vô hiệu -> không xuất file, modal còn mở
const beforeEv = writtenFiles.length;
xlsxMod.openPressExportModal();
setVal('export-press-worker', 'nam');
setVal('export-press-product', 'rate-2');
xlsxMod.handlePressExportSubmit(ev);
check('ÉV: lọc vô hiệu -> không tạo file mới', writtenFiles.length === beforeEv);
check('ÉV: lọc vô hiệu -> modal còn mở', modalShown('modal-export-press'));
xlsxMod.closePressExportModal();
xlsxMod.closePlanningExportModal();
check('KH: closePlanningExportModal đóng modal', !modalShown('modal-export-planning'));

// ═══════════════════════════════════════════════════════════
// 3) NGUYÊN LIỆU
// ═══════════════════════════════════════════════════════════
xlsxMod.openMaterialsExportModal();
check('NL: mở modal xuất', modalShown('modal-export-materials'));
check('NL: select loại có "Keo UF"', document.getElementById('export-materials-type').innerHTML.includes('Keo UF'));
check('NL: select NCC có "NCC A"', document.getElementById('export-materials-supplier').innerHTML.includes('NCC A'));

const beforeNlExport = writtenFiles.length;
xlsxMod.handleMaterialsExportSubmit(ev);
check('NL: xuất được file', writtenFiles.length === beforeNlExport + 1);
check('NL: tên file NhatKy_NguyenLieu_*.xlsx', /^NhatKy_NguyenLieu_\d{4}-\d{2}-\d{2}\.xlsx$/.test(lastFile().filename));
check('NL: sheet "Nguyên Liệu"', lastSheetName === 'Nguyên Liệu');
const nlAoa = lastSheetAoa;
check('NL: đủ 3 dòng dữ liệu + header + tổng (9 dòng)', nlAoa.length === 9);
check('NL: sắp xếp mới nhất lên đầu (11/08 trước 10/08)', nlAoa[5][3] === 'Keo UF' && nlAoa[6][3] === 'Tre nguyên liệu');
check('NL: nhãn vị trí "Lò hơi" từ key lo-hoi', nlAoa[6][5] === 'Lò hơi');
check('NL: tuần thân thiện "Tuần 33 (2026)"', nlAoa[5][2] === 'Tuần 33 (2026)');
check('NL: đơn giá định dạng vi-VN "30.000"', nlAoa[5][9] === '30.000');
check('NL: thành tiền "750.000" (150kg × 5.000)', nlAoa[6][10] === '750.000');
check('NL: số ảnh đếm đúng (dòng có 1 ảnh)', nlAoa[6][12] === 1);
check('NL: dòng TỔNG CỘNG = 190 kg', nlAoa[8][5] === 'TỔNG CỘNG' && nlAoa[8][8] === '190');
check('NL: tổng thành tiền = 1.450.000 đ', nlAoa[8][10] === '1.450.000');
check('NL: đóng modal sau khi xuất', !modalShown('modal-export-materials'));

// Lọc theo vị trí Lò hơi
xlsxMod.openMaterialsExportModal();
setVal('export-materials-location', 'lo-hoi');
xlsxMod.handleMaterialsExportSubmit(ev);
check('NL: lọc Lò hơi còn 1 dòng', lastSheetAoa.length === 5 + 1 + 1);
check('NL: tổng Lò hơi = 150 kg', lastSheetAoa[lastSheetAoa.length - 1][8] === '150');

// Lọc theo NCC + loại
xlsxMod.openMaterialsExportModal();
setVal('export-materials-supplier', 'NCC A');
setVal('export-materials-type', 'Tre nguyên liệu');
xlsxMod.handleMaterialsExportSubmit(ev);
check('NL: lọc NCC A + Tre NL còn 2 dòng (m1 + m3)', lastSheetAoa.length === 8);

// Lọc theo khoảng ngày
xlsxMod.openMaterialsExportModal();
setVal('export-materials-date-from', '2026-08-01');
xlsxMod.handleMaterialsExportSubmit(ev);
check('NL: lọc từ 01/08/2026 còn 2 dòng (m1 + m2)', lastSheetAoa.length === 8);
check('NL: dòng bộ lọc ghi khoảng ngày', lastSheetAoa[2][0].includes('2026-08-01'));

// Lọc vô hiệu -> không xuất file, modal còn mở
const beforeNl = writtenFiles.length;
xlsxMod.openMaterialsExportModal();
setVal('export-materials-supplier', 'NCC Không Tồn Tại');
xlsxMod.handleMaterialsExportSubmit(ev);
check('NL: lọc vô hiệu -> không tạo file mới', writtenFiles.length === beforeNl);
check('NL: lọc vô hiệu -> modal còn mở', modalShown('modal-export-materials'));
xlsxMod.closeMaterialsExportModal();
check('NL: closeMaterialsExportModal đóng modal', !modalShown('modal-export-materials'));

// ═══════════════════════════════════════════════════════════
console.log(`\nKẾT QUẢ: ${passed} PASS, ${failed} FAIL`);
if (failed > 0) process.exit(1);

