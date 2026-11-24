// tests/xuong1-bo-lengths.test.mjs — luồng Bổ → tồn sau sấy → Lọc Thanh nhiều lô.
'use strict';
import fs from 'node:fs';

function makeEl(id) {
  const attrs = {};
  const el = {
    id: id || '', value: '', checked: false, disabled: false, hidden: false,
    open: true, textContent: '', innerHTML: '', style: {}, dataset: {}, _h: {},
    offsetWidth: 800, offsetHeight: 500, attrs,
    classList: {
      _s: new Set(), add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); },
      toggle(c, f) { if (f === undefined) f = !this._s.has(c); if (f) this._s.add(c); else this._s.delete(c); return f; },
      contains(c) { return this._s.has(c); }
    },
    addEventListener(t, f) { (el._h[t] = el._h[t] || []).push(f); },
    appendChild(c) { return c; }, removeChild(c) { return c; },
    remove() {}, focus() {}, click() {}, animate() { return { cancel() {} }; },
    setAttribute(k, v) { attrs[k] = String(v); if (k === 'hidden') el.hidden = true; },
    removeAttribute(k) { delete attrs[k]; if (k === 'hidden') el.hidden = false; },
    getAttribute(k) { return (k in attrs) ? attrs[k] : null; },
    querySelector: () => makeEl(), querySelectorAll: () => [],
    closest: () => null, matches: () => false,
    getContext: () => ({ measureText: () => ({ width: 10 }), createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }), drawImage() {} }),
    getBoundingClientRect: () => ({ top: 0, left: 0, right: 800, bottom: 600, width: 800, height: 600 }),
    scrollIntoView() {}, scrollTo() {}, blur() {}, scroll() {}, reset() {}
  };
  return el;
}
const els = new Map();
global.document = {
  body: makeEl('body'), head: makeEl('head'), documentElement: makeEl('html'),
  activeElement: null, readyState: 'complete', visibilityState: 'visible',
  getElementById(id) { if (!els.has(id)) els.set(id, makeEl(id)); return els.get(id); },
  createElement: () => makeEl(), createTextNode: t => ({ textContent: t }),
  querySelector: () => makeEl(), querySelectorAll: () => [],
  addEventListener() {}, removeEventListener() {}, escapeCSS: s => s
};
global.location = { href: 'http://localhost:8080/', origin: 'http://localhost:8080', pathname: '/', search: '', hash: '', reload() {} };
global.history = { replaceState() {}, pushState() {}, back() {}, state: null };
Object.defineProperty(global, 'navigator', { value: { onLine: true, userAgent: 'node-test', language: 'vi' }, configurable: true });
const storeBacking = new Map();
global.localStorage = {
  getItem: k => storeBacking.has(k) ? storeBacking.get(k) : null,
  setItem: (k, v) => { storeBacking.set(k, String(v)); },
  removeItem: k => { storeBacking.delete(k); },
  clear: () => storeBacking.clear(),
  key: i => [...storeBacking.keys()][i] ?? null,
  get length() { return storeBacking.size; }
};
global.addEventListener = () => {}; global.removeEventListener = () => {}; global.dispatchEvent = () => true;
global.requestAnimationFrame = cb => setTimeout(() => cb(Date.now()), 0);
global.cancelAnimationFrame = clearTimeout;
global.window = global; global.self = global;
global.alert = () => {}; global.confirm = () => true; global.prompt = () => '';
global.lucide = { createIcons() {} };
global.Chart = class {
  constructor(ctx, cfg) { this.ctx = ctx; this.config = cfg; this.data = (cfg && cfg.data) || { labels: [], datasets: [] }; }
  update() {} resize() {} destroy() {} render() {} reset() {} getDatasetMeta() { return { data: [] }; }
};
Chart.register = () => {};
if (!global.URL.createObjectURL) global.URL.createObjectURL = () => 'blob:stub';
if (!global.URL.revokeObjectURL) global.URL.revokeObjectURL = () => {};
global.XLSX = {
  utils: { book_new: () => ({ SheetNames: [] }), aoa_to_sheet: () => ({}), json_to_sheet: () => ({}), book_append_sheet() {}, encode_cell: () => 'A1', decode_range: () => ({ s: { r: 0, c: 0 }, e: { r: 0, c: 0 } }) },
  writeFile() {}, write: () => new ArrayBuffer(8)
};
global.fetch = async () => ({ ok: false, status: 0, statusText: 'offline-stub', json: async () => ({}), text: async () => '' });
global.Image = class { set src(_) {} addEventListener() {} };
global.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };

let pass = 0, fail = 0;
function check(label, condition) {
  if (condition) { pass++; console.log('PASS ' + label); }
  else { fail++; console.log('FAIL ' + label); }
}
const read = path => fs.readFileSync(new URL(path, import.meta.url), 'utf8');
const idxHtml = read('../index.html');
const stylesCss = read('../styles.css');
const eventsSrc = read('../js/events.js');
const capacitySrc = read('../js/capacity.js');
const stateSrc = read('../js/state.js');
const exportSrc = read('../js/export-xlsx.js');
const xuong2SrcParser = read('../js/xuong2.js');
const { state, STORAGE_KEY_X1_BO_LENGTHS, STORAGE_KEY_X1_BO_WIDTHS } = await import('../js/state.js');
state.currentUser = { username: 'admin', role: 'admin', editTabs: [], allowAdvanced: true };
state.activeView = 'kanban-view';
const x1 = await import('../js/xuong2.js');
const spBO = x1.X1_CHAIN_SPECS.find(spec => spec.key === 'bo');
const spLT = x1.X1_CHAIN_SPECS.find(spec => spec.key === 'locThanh');
const g = id => document.getElementById(id);
const sourceBox = g('x1-loc-thanh-source-rows');
const matrixBox = g('x1-loc-thanh-length-rows');

console.log('--- BIỂU THỨC SỐ AN TOÀN CHO MA TRẬN ---');
check('Parser biểu thức an toàn được export cho test',
  typeof x1.parseArithmeticExpression === 'function' &&
  typeof x1.parseSafeArithmeticExpression === 'function' &&
  typeof x1.parseX1MatrixValue === 'function' &&
  typeof x1.applyX1MatrixExpressionInput === 'function');
check('Parser tính + - * /, ngoặc và thứ tự phép tính',
  x1.parseArithmeticExpression('123+123') === 246 &&
  x1.parseArithmeticExpression('10+2*5') === 20 &&
  x1.parseArithmeticExpression('(100-25)/5') === 15 &&
  x1.parseArithmeticExpression('-10+25') === 15 &&
  x1.parseArithmeticExpression('8/2*3') === 12);
check('Parser hỗ trợ dấu thập phân phẩy/chấm',
  x1.parseArithmeticExpression('1,5+2.25') === 3.75 &&
  x1.parseArithmeticExpression('12,5/2') === 6.25 &&
  x1.parseX1MatrixValue('40,5+9,5') === 50);
check('Biểu thức chưa đủ/không hợp lệ/chia 0 không bị tính',
  x1.parseArithmeticExpression('123+') == null &&
  x1.parseArithmeticExpression('123/0') == null &&
  x1.parseArithmeticExpression('(123+123') == null &&
  x1.parseArithmeticExpression('123abc') == null &&
  x1.parseArithmeticExpression('1,2,3') == null);
const arithmeticInput = makeEl('expression-input');
arithmeticInput.value = '123+45';
check('Ô nhập giữ nguyên expression khi gõ',
  arithmeticInput.value === '123+45');
check('Parser biểu thức đang gõ đọc đúng tổng liên tục',
  x1.parseArithmeticExpression(arithmeticInput.value) === 168 &&
  x1.parseX1MatrixValue(arithmeticInput.value) === 168);
const blurInput = makeEl('blur-expression');
blurInput.value = '123+45';
x1.applyX1MatrixExpressionInput(blurInput);
check('Blur/change áp dụng helper và thay expression bằng kết quả',
  blurInput.value === '168');
const enterInput = makeEl('enter-expression');
enterInput.value = '123+45';
x1.applyX1MatrixExpressionInput(enterInput);
check('Enter áp dụng helper và thay expression bằng kết quả',
  enterInput.value === '168');
arithmeticInput.value = '123+';
x1.applyX1MatrixExpressionInput(arithmeticInput);
check('Biểu thức chưa hoàn chỉnh giữ nguyên',
  arithmeticInput.value === '123+');
arithmeticInput.value = '123/0';
x1.applyX1MatrixExpressionInput(arithmeticInput);
check('Biểu thức chia 0/không hợp lệ giữ nguyên',
  arithmeticInput.value === '123/0');
check('Listeners chỉ finalize expression ở change/blur/Enter/submit, không thay text trong input',
  !eventsSrc.includes("safeOn(base + '-' + part, 'input', e => {\n          if (sp.key === 'locThanh') applyX1MatrixExpressionInput") &&
  !eventsSrc.includes("ltSourceRows.addEventListener('input', e => {\n        if (e && e.target) applyX1MatrixExpressionInput") &&
  !eventsSrc.includes("ltRows.addEventListener('input', e => {\n        if (e && e.target) applyX1MatrixExpressionInput") &&
  eventsSrc.includes("safeOn(base + '-' + part, 'change'") &&
  eventsSrc.includes("safeOn(base + '-' + part, 'blur'") &&
  eventsSrc.includes("safeOn(base + '-' + part, 'keydown'") &&
  eventsSrc.includes("ltSourceRows.addEventListener('blur'") &&
  eventsSrc.includes("ltRows.addEventListener('blur'") &&
  eventsSrc.includes("ltSourceRows.addEventListener('keydown'") &&
  eventsSrc.includes("ltRows.addEventListener('keydown'") &&
  eventsSrc.includes("finalizeLocThanhExpressions();"));
check('Implementation parser không dùng eval hoặc Function',
  !xuong2SrcParser.includes('eval(') &&
  !/new\s+Function/.test(xuong2SrcParser) &&
  !/\bFunction\s*\(/.test(xuong2SrcParser));

console.log('--- CẤU TRÚC VÀ DANH MỤC ---');
check('Lọc Thanh/Bó Xô chỉ đổi ô khối lượng sang text + inputmode decimal/numeric',
  idxHtml.includes('<input type="text" inputmode="decimal" id="x1-loc-thanh-ok"') &&
  idxHtml.includes('<input type="text" inputmode="decimal" id="x1-loc-thanh-loai"') &&
  xuong2SrcParser.includes('<input type="text" inputmode="decimal" data-x1-lt-source-in') &&
  xuong2SrcParser.includes('<input type="text" inputmode="decimal" class="x1-lt-kg"') &&
  xuong2SrcParser.includes('<input type="text" inputmode="decimal" class="x1-lt-c"') &&
  xuong2SrcParser.includes('<input type="text" inputmode="numeric" min="0" step="1" class="x1-lt-c"'));
const appVersion = (stateSrc.match(/APP_VERSION\s*=\s*'(v\d+)'/) || [])[1];
check('Bổ KHÔNG còn bản rộng (chọn tại ma trận Lọc Thanh); không có picker chiều dài ở Bổ',
  !idxHtml.includes('id="x1-bo-widths-btn"') && !idxHtml.includes('x1-bo-width-picker') &&
  !idxHtml.includes('id="x1-bo-lengths-btn"') &&
  idxHtml.includes('id="btn-x1-lt-length-catalog"') &&
  idxHtml.includes('x1-loc-thanh-length-wrap'));
check('Lọc Thanh chọn nhiều lô; kg lọc mặc định theo phiếu Bổ, không yêu cầu cân sau sấy',
  idxHtml.includes('id="x1-loc-thanh-source-options"') &&
  idxHtml.includes('<details id="x1-lt-source-dropdown"') &&
  !idxHtml.includes('id="btn-x1-lt-add-source"') &&
  !idxHtml.includes('>Thêm lô</button>') &&
  idxHtml.includes('id="x1-loc-thanh-source-rows"') &&
  !idxHtml.includes('Tổng KL Ước Tính') &&
  !idxHtml.includes('Kg ước tính') &&
  !idxHtml.includes('id="x1-loc-thanh-loss-type"') && !idxHtml.includes('id="x1-loc-thanh-loss-note"') &&
  !idxHtml.includes('x1-lt-drying-note'));
check('Phơi Sấy ẩn khỏi thao tác và công suất; lưu schema cũ để đọc lịch sử',
  /id="x1-phoi-say-card" hidden/.test(idxHtml) &&
  !/<option value="phoiSay">/.test(idxHtml) &&
  !/id:\s*'x1phoisay'/.test(capacitySrc) &&
  x1.X1_CHAIN_SPECS.some(spec => spec.key === 'phoiSay'));
check('Events và CSS nối đủ giao diện nhiều lô, danh mục và ma trận kho',
  eventsSrc.includes('data-x1-lt-select-source') &&
  eventsSrc.includes('x1LtAddSource') && eventsSrc.includes('x1LtRemoveSource') &&
  eventsSrc.includes('ltSourceDropdown.open = false') &&
  eventsSrc.includes('x1LtLengthAdd') && stylesCss.includes('.x1-lt-source-options') &&
  stylesCss.includes('.x1-lt-source-trigger') &&
  stylesCss.includes('.x1-lt-source-rows') &&
  stylesCss.includes('.x1-kho-history-block') &&
  (idxHtml.includes('Ma Trận Tồn Nan') || idxHtml.includes('Tồn Theo Kích Thước') || idxHtml.includes('Lịch Sử Xuất Hàng')));
check('Cache APP_VERSION đồng bộ giữa state.js và sw.js',
  !!appVersion && read('../sw.js').includes(`nha-may-ngoc-son-${appVersion}`));
check('Export Excel có các trường phân bổ nguồn và chênh kg',
  exportSrc.includes('Nguồn theo lô / kg lấy') &&
  exportSrc.includes('KL Chênh (kg)') && exportSrc.includes('Lý do chênh'));

check('11 kích thước dài chuẩn luôn có trong danh mục dùng chung',
  x1.x1BoLengthAll().join(',') === '50,60,65,70,75,80,87,90,95,100,105');
state.x1BoLengthOptions = [];
storeBacking.delete(STORAGE_KEY_X1_BO_LENGTHS);
x1.loadX1BoLengthOptions();
g('x1-lt-length-new').value = '120';
x1.x1LtLengthAdd();
check('Kích thước ngoài chuẩn được lưu vào danh mục dùng chung',
  x1.x1BoLengthAll().includes(120) &&
  JSON.parse(localStorage.getItem(STORAGE_KEY_X1_BO_LENGTHS) || '[]').includes(120));
g('x1-lt-length-new').value = '5';
x1.x1LtLengthAdd();
check('Từ chối kích thước ngoài giới hạn', !x1.x1BoLengthAll().includes(5));
check('Bản rộng mặc định của ma trận là 6/11/13/15/21 ly',
  JSON.stringify(x1.X1_LT_WIDTH_DEFAULTS) === '[6,11,13,15,21]');
check('Phân loại mới đủ 6 cột đúng thứ tự; "B non tóp" đổi nhãn thành "B" (giữ id + dữ liệu cũ)',
  JSON.stringify(x1.X1_LT_CLASSES.map(c => c.id)) === JSON.stringify(['A', 'A1', 'nonbt', 'bau', 'bnont', 'loai']) &&
  x1.X1_LT_CLASSES.find(c => c.id === 'bnont').label === 'B');

console.log('--- NHIỀU LÔ, PHIẾU BỔ VÀ ĐỐI SOÁT KHỐI LƯỢNG ---');
state.xuong1SaySinhRecords = [
  { id: 'ss-lot-1', code: 'SS-B1', qty: 500 },
  { id: 'ss-lot-2', code: 'SS-B2', qty: 750 }
];
state.xuong1BocRecords = [
  { id: 'boc-lot-1', saySinhId: 'ss-lot-1', qty: 100 },
  { id: 'boc-lot-2', saySinhId: 'ss-lot-2', qty: 70 }
];
state.xuong1LocOngRecords = [
  { id: 'loc-ong-lot-1', lotCode: 'B1', bocId: 'boc-lot-1', qtyOk: 100 },
  { id: 'loc-ong-lot-2', lotCode: 'B2', bocId: 'boc-lot-2', qtyOk: 70 }
];
state.xuong1CatMatRecords = [];
const bo1 = {
  id: 'bo-lot-1', lotCode: 'B1', date: '2026-11-03', qtyIn: 100, qtyOk: 100,
  srcType: 'Vầu thanh', srcSupplier: 'NCC Một',
  sourceAllocations: [{ sourceType: 'locOng', sourceId: 'loc-ong-lot-1', qty: 100 }]
};
const bo2 = {
  id: 'bo-lot-2', lotCode: 'B2', date: '2026-11-04', qtyIn: 70, qtyOk: 70,
  srcType: 'Vầu thanh', srcSupplier: 'NCC Hai',
  sourceAllocations: [{ sourceType: 'locOng', sourceId: 'loc-ong-lot-2', qty: 70 }]
};
state.xuong1BoRecords = [bo1, bo2];
state.xuong1PhoiSayRecords = [];
state.xuong1LocThanhRecords = [];
state.x1LocThanhEditId = null;
sourceBox.querySelectorAll = () => [];
matrixBox.querySelectorAll = () => [];
g('x1-loc-thanh-mode').value = 'bo-xo';
x1.fillX1ChainOptions(spLT);
const sourceOptionsHtml = g('x1-loc-thanh-source-options').innerHTML;
check('Danh sách chọn lô hiển thị checkbox, thông tin đầy đủ và tồn theo phiếu Bổ',
  (sourceOptionsHtml.match(/type="checkbox" data-x1-lt-select-source/g) || []).length === 2 &&
  sourceOptionsHtml.includes('B1') && sourceOptionsHtml.includes('03/11/26') &&
  sourceOptionsHtml.includes('NCC Một') && !sourceOptionsHtml.includes('Bản rộng') &&
  sourceOptionsHtml.includes('Còn theo phiếu Bổ 100 kg</strong> | Danh định Sấy Sinh 500 kg') &&
  sourceOptionsHtml.includes('Danh định Sấy Sinh 750 kg'));
x1.x1LtAddSource(bo1.id);
x1.x1LtAddSource(bo2.id);
check('Mỗi lô tự điền phần còn lại theo phiếu Bổ vào một ô kg có thể sửa',
  (sourceBox.innerHTML.match(/data-x1-lt-source-in(?:\s|>)/g) || []).length === 2 &&
  sourceBox.innerHTML.includes('value="100"') && sourceBox.innerHTML.includes('value="70"') &&
  !sourceBox.innerHTML.includes('data-x1-lt-dry-available') &&
  !sourceBox.innerHTML.includes('data-x1-lt-adjustment-reason'));
g('x1-loc-thanh-mode').value = 'loc-thanh';
x1.syncX1LocThanhMode();
check('Ma trận 2 cấp: đủ 12 kích thước, mỗi kích thước có dải 5 chip bản rộng (không phụ thuộc lô Bổ)',
  (matrixBox.innerHTML.match(/data-x1-lt-chip=/g) || []).length === 60 &&
  !matrixBox.innerHTML.includes('<option') &&
  matrixBox.innerHTML.includes('— chọn bản rộng') &&
  matrixBox.innerHTML.includes('120 mm') && !matrixBox.innerHTML.includes('20 ly'));
g('x1-loc-thanh-mode').value = 'bo-xo';
x1.syncX1LocThanhMode();
x1.x1LtToggleWidth(50, 11);
check('Bó xô dùng ma trận kích thước/bản rộng nhưng chỉ còn hai cột khối lượng',
  matrixBox.innerHTML.includes('KL Bó') && matrixBox.innerHTML.includes('KL Loại') &&
  !matrixBox.innerHTML.includes('>A1<') && !matrixBox.innerHTML.includes('Bánh tẻ') &&
  matrixBox.innerHTML.includes('data-x1-lt-c="bo"') &&
  matrixBox.innerHTML.includes('data-x1-lt-c="loai"'));
x1.x1LtToggleWidth(50, 11);
g('x1-loc-thanh-mode').value = 'loc-thanh';
x1.syncX1LocThanhMode();
check('Events + CSS nối chip bản rộng 2 cấp; đã bỏ wiring picker bản rộng Bổ và ô select cũ',
  eventsSrc.includes('x1LtToggleWidth') && !eventsSrc.includes('x1-bo-widths-btn') &&
  !eventsSrc.includes('data-x1-lt-row-width') && stylesCss.includes('.x1-lt-wchip'));

function fakeAllocationRow(sourceId, qtyIn) {
  const fields = {
    '[data-x1-lt-source-in]': { value: String(qtyIn) }
  };
  return {
    getAttribute: name => name === 'data-x1-lt-source-row' ? sourceId
      : null,
    querySelector: selector => fields[selector] || null
  };
}
function setAllocationRows(rows) {
  sourceBox.querySelectorAll = selector => selector === '[data-x1-lt-source-row]' ? rows : [];
}
function fakeMatrixCell(width, length, category, value) {
  return {
    getAttribute: name => name === 'data-x1-lt-width' ? String(width)
      : name === 'data-x1-lt-len' ? String(length)
        : name === 'data-x1-lt-c' ? category : null,
    value: String(value)
  };
}
function setMatrixCells(cells) {
  matrixBox.querySelectorAll = selector => selector === 'input[data-x1-lt-c]' ? cells : [];
}
function saveEvent() { return { preventDefault() {} }; }

setAllocationRows([
  fakeAllocationRow(bo1.id, '30+10'),
  fakeAllocationRow(bo2.id, '100/4')
]);
setMatrixCells([
  fakeMatrixCell(11, 50, 'A', '10*4'),
  fakeMatrixCell(11, 50, 'A1', '(50-10)/2')
]);
g('x1-loc-thanh-mode').value = 'loc-thanh';
const parsedAllocations = x1.x1LtReadSourceAllocations();
const parsedMatrix = x1.x1LtMatrixRead();
check('Đọc ma trận dùng parser: kg lô và ô ma trận biểu thức trả đúng số để tính',
  parsedAllocations.find(a => a.sourceId === bo1.id)?.qtyIn === 40 &&
  parsedAllocations.find(a => a.sourceId === bo2.id)?.qtyIn === 25 &&
  parsedMatrix?.ok === 60 &&
  parsedMatrix?.total === 60 &&
  parsedMatrix?.rows?.[0]?.weights?.A === 40 &&
  parsedMatrix?.rows?.[0]?.weights?.A1 === 20);

setAllocationRows([
  fakeAllocationRow(bo1.id, 40),
  fakeAllocationRow(bo2.id, 25)
]);
setMatrixCells([
  fakeMatrixCell(11, 50, 'A', 40),
  fakeMatrixCell(15, 50, 'A1', 20)
]);
g('x1-loc-thanh-date').value = '2026-11-05';
x1.handleX1ChainSubmit(spLT, saveEvent());
const firstFilter = state.xuong1LocThanhRecords[0];
check('Lưu một lượt lọc gom hai lô với kg lấy riêng từng lô',
  !!firstFilter && firstFilter.qtyIn === 65 && firstFilter.lotAllocations.length === 2 &&
  firstFilter.lotAllocations[0].qtyDryAvailable == null &&
  firstFilter.lotAllocations[0].qtyIn === 40 &&
  firstFilter.lotAllocations[1].qtyDryAvailable == null &&
  firstFilter.lotAllocations[1].qtyIn === 25);
check('Đầu ra lưu ở cấp lượt gom, không phân bổ tỷ lệ về lô nguồn',
  firstFilter && firstFilter.matrixRows.length === 2 &&
  firstFilter.lotAllocations.every(allocation => !Object.prototype.hasOwnProperty.call(allocation, 'qtyOk')));
check('Tự tính chênh 5 kg mà không bắt nhập phân loại hoặc lý do',
  firstFilter && firstFilter.qtyOk === 60 && firstFilter.qtyLoss === 5 &&
  !firstFilter.lossType && !firstFilter.lossNote);
check('Tồn theo phiếu Bổ truy theo từng lô sau khi lọc',
  x1.x1LocThanhSourceRemainingOf(bo1, null) === 60 &&
  x1.x1LocThanhSourceRemainingOf(bo2, null) === 45);
firstFilter.lotAllocations[0].qtyDryAvailable = 90;
check('Số cân sau sấy cũ không làm thay đổi tồn tính theo phiếu Bổ',
  x1.x1LocThanhSourceRemainingOf(bo1, null) === 60);
firstFilter.lotAllocations[0].qtyDryAvailable = null;
const firstDisplay = x1.x1ChainDisplay(spLT, firstFilter);
check('Lịch sử truy vết được mã cả hai lô và lưu snapshot kích thước',
  firstDisplay.lotCode === 'SS-B1 + SS-B2' && firstDisplay.sourceLots.length === 2 &&
  firstFilter.lengths.includes(120));
x1.renderX1CardOf(spLT.cardId);
const historyHtml = g('x1-loc-thanh-day-cards').innerHTML;
check('Lịch sử ưu tiên tổng kg theo bản rộng × kích thước; phần đối chiếu được thu gọn',
  historyHtml.includes('11 ly · 50 mm') && historyHtml.includes('40 kg') &&
  historyHtml.includes('15 ly · 50 mm') && historyHtml.includes('20 kg') &&
  historyHtml.includes('<details class="x1-lt-reference"') &&
  !historyHtml.includes('x1-lt-mini-table'));
check('P1. Lịch sử dòng chính TỔNG THEO BẢN RỘNG: 11 ly: 40 kg · 15 ly: 20 kg',
  historyHtml.includes('<strong>11 ly</strong>: 40 kg') &&
  historyHtml.includes('<strong>15 ly</strong>: 20 kg'));
check('P2. Chi tiết từng (bản rộng · kích thước) nằm trong details Chi tiết bấm mới xổ',
  historyHtml.includes('<details class="x1-lt-dim-full"><summary>Chi tiết</summary>') &&
  historyHtml.includes('x1-lt-dim-full-body') &&
  historyHtml.includes('11 ly · 50 mm') && historyHtml.includes('15 ly · 50 mm'));
const ltStart = idxHtml.indexOf('id="x1-loc-thanh-form"');
const ltFormHtml = idxHtml.slice(ltStart, idxHtml.indexOf('</form>', ltStart) + 7);
check('P3. Cấu trúc 3 nút Làm Mới > Lưu > CĐ sau (bỏ nút Lùi) + CSS 3 màu + icon điều hướng',
  ltFormHtml.indexOf('id="btn-cancel-x1-loc-thanh"') < ltFormHtml.indexOf('x1-stage-save') &&
  ltFormHtml.indexOf('x1-stage-save') < ltFormHtml.indexOf('id="btn-x1-lt-stage-next"') &&
  !idxHtml.includes('id="btn-x1-lt-stage-prev"') &&
  idxHtml.includes('x1-stage-next-arrow') && idxHtml.includes('<strong>CĐ sau</strong>') &&
  idxHtml.includes('data-lucide="arrow-right"') &&
  eventsSrc.includes("safeOn('btn-x1-lt-stage-next'") &&
  stylesCss.includes('.x1-stage-next-arrow') && stylesCss.includes('#78350f') &&
  stylesCss.includes('#15803d') && stylesCss.includes('#eff6ff') &&
  stylesCss.includes('#1e40af') && stylesCss.includes('text-shadow: none') &&
  stylesCss.includes('repeat(3, minmax(0, 1fr))'));


setAllocationRows([]);
setMatrixCells([]);
x1.x1LtAddSource(bo1.id);
setAllocationRows([fakeAllocationRow(bo1.id, 10)]);
g('x1-loc-thanh-mode').value = 'bo-xo';
g('x1-loc-thanh-date').value = '2026-11-06';
g('x1-loc-thanh-ok').value = '10';
g('x1-loc-thanh-loai').value = '0';
setMatrixCells([fakeMatrixCell(11, 50, 'bo', 10)]);
x1.handleX1ChainSubmit(spLT, saveEvent());
check('Cho lưu kg lọc mà không cần cân sau sấy hoặc giải trình',
  state.xuong1LocThanhRecords.length === 2 &&
  state.xuong1LocThanhRecords[1].lotAllocations[0].qtyIn === 10 &&
  state.xuong1LocThanhRecords[1].lotAllocations[0].qtyDryAvailable == null &&
  state.xuong1LocThanhRecords[1].matrixRows[0].weights.bo === 10 &&
  state.xuong1LocThanhRecords[1].matrixRows[0].width === 11 &&
  state.xuong1LocThanhRecords[1].matrixRows[0].len === 50);

setAllocationRows([]);
x1.x1LtAddSource(bo1.id);
setAllocationRows([fakeAllocationRow(bo1.id, 25)]);
g('x1-loc-thanh-mode').value = 'bo-xo';
g('x1-loc-thanh-date').value = '2026-11-07';
g('x1-loc-thanh-ok').value = '20';
g('x1-loc-thanh-loai').value = '0';
setMatrixCells([fakeMatrixCell(15, 50, 'bo', 15), fakeMatrixCell(15, 50, 'loai', 5)]);
x1.handleX1ChainSubmit(spLT, saveEvent());
check('Lưu lượt Bó Xô có chênh kg mà không cần giải trình',
  state.xuong1LocThanhRecords.length === 3 &&
  state.xuong1LocThanhRecords[2].qtyLoss === 5 &&
  !state.xuong1LocThanhRecords[2].lossType &&
  !state.xuong1LocThanhRecords[2].lossNote);

console.log('--- KHO NAN VÀ BÁO CÁO ---');
const warehouse = x1.x1WarehouseStockSummary();
check('Kho Nan nhóm theo bản rộng × chiều dài, giữ số liệu phân loại để tham khảo',
  warehouse.matrixRows.some(row => row.width === 11 && row.len === 50 &&
    row.values['A'] === 40) &&
  warehouse.matrixRows.some(row => row.width === 15 && row.len === 50 &&
    row.values['Bó xô'] === 15) &&
  warehouse.matrixKinds.some(kind => kind.label === 'A'));
x1.renderX1CardOf('x1-kho-card');
check('Giao diện Kho Nan: vùng 2 là lịch sử xuất kho (ma trận đã gỡ)',
  !g('x1-kho-inventory').innerHTML.includes('x1-kho-matrix') &&
  (g('x1-kho-inventory').innerHTML.includes('x1-kho-history-block') ||
   g('x1-kho-inventory').innerHTML.includes('Chưa có giao dịch xuất hàng / tiêu hủy nào')));
const report = await import('../js/export-xlsx.js');
const exportData = report.buildX2ExportData('x1locthanh', {});
const exportText = JSON.stringify(exportData && exportData.aoa || []);
check('Excel có mã lô, kg lọc và cột chênh kg',
  exportText.includes('B1') && exportText.includes('B2') &&
  exportText.includes('Nguồn theo lô / kg lấy') &&
  exportText.includes('KL Chênh (kg)') &&
  exportText.includes('KL Bó') &&
  exportText.includes('KL Loại'));

console.log('--- THEO DÕI CỘNG DỒN THEO LÔ BỔ/SẤY SINH ---');
const ssAccept = { id: 'ss-accept-2000', code: 'SS-ACCEPT-2000', qty: 2000 };
const bocAccept = { id: 'boc-accept-2000', saySinhId: ssAccept.id, qty: 2000 };
const locOngAccept = { id: 'loc-ong-accept-2000', bocId: bocAccept.id, qtyOk: 2000 };
const boAccept = {
  id: 'bo-accept-2000', lotCode: 'SS-ACCEPT-2000', date: '2026-11-08', qtyIn: 2000, qtyOk: 2000,
  srcType: 'Vầu thanh', srcSupplier: 'NCC Chốt',
  sourceAllocations: [{ sourceType: 'locOng', sourceId: locOngAccept.id, qty: 2000 }]
};
state.xuong1SaySinhRecords.push(ssAccept);
state.xuong1BocRecords.push(bocAccept);
state.xuong1LocOngRecords.push(locOngAccept);
state.xuong1BoRecords.push(boAccept);
state.xuong1LocThanhRecords.push({
  id: 'lt-accept-650', date: '2026-11-09', qtyIn: 650, qtyOk: 650, qtyLoai: 0,
  lotAllocations: [{ sourceId: boAccept.id, lotCode: 'SS-ACCEPT-2000', qtyIn: 650 }]
});
state.xuong1LocThanhRecords.push({
  id: 'lt-accept-850', date: '2026-11-10', qtyIn: 850, qtyOk: 850, qtyLoai: 0,
  lotAllocations: [{ sourceId: boAccept.id, lotCode: 'SS-ACCEPT-2000', qtyIn: 850 }]
});
const openProgress = x1.x1LocThanhLotProgressOf(boAccept);
check('Lô 2000 kg cộng dồn hai lượt lọc: 650 + 850 = 1500 kg, chưa chốt không có tỷ lệ',
  openProgress.nominalKg === 2000 && openProgress.finishedKg === 1500 &&
  openProgress.closed === false && openProgress.ratio == null);
check('Chốt lô thủ công mới cho tỷ lệ 75% đúng danh định Sấy Sinh',
  x1.x1LocThanhMarkLotDone(boAccept.id, true) &&
  x1.x1LocThanhLotProgressOf(boAccept).closed === true &&
  x1.x1LocThanhLotProgressOf(boAccept).ratio === 75);
check('Tỷ lệ theo lọc hiện tại không được tạo từ tổng lượt đem lọc',
  x1.x1ChainDisplay(spLT, state.xuong1LocThanhRecords.find(r => r.id === 'lt-accept-650')).ratio == null);
const boNoNominal = {
  id: 'bo-no-nominal', lotCode: 'NO-NOMINAL', date: '2026-11-10', qtyIn: 200, qtyOk: 200,
  srcType: 'Vầu thanh', srcSupplier: 'NCC Thiếu danh định',
  sourceAllocations: []
};
state.xuong1BoRecords.push(boNoNominal);
state.xuong1LocThanhRecords.push({
  id: 'lt-no-nominal', date: '2026-11-10', qtyIn: 200, qtyOk: 200, qtyLoai: 0,
  lotAllocations: [{ sourceId: boNoNominal.id, lotCode: 'NO-NOMINAL', qtyIn: 200 }]
});
x1.x1LocThanhMarkLotDone(boNoNominal.id, true);
const noNominalProgress = x1.x1LocThanhLotProgressOf(boNoNominal);
check('Lô đóng có thành phẩm nhưng không có danh định: giữ trạng thái chốt, tỷ lệ lô = không có',
  noNominalProgress.closed &&
  noNominalProgress.finishedKg === 200 &&
  noNominalProgress.nominalKg == null &&
  noNominalProgress.ratio == null);
x1.renderX1CardOf(spLT.cardId);
const noNominalStatsHtml = g('x1-loc-thanh-stats').innerHTML;
check('Tổng hợp lô đóng không cộng tỷ lệ qua lô khác khi có lô thiếu danh định dương',
  noNominalStatsHtml.includes('Tỷ lệ lô đã chốt') &&
  noNominalStatsHtml.includes('—') &&
  !noNominalStatsHtml.includes('85%'));
const noNominalExportData = report.buildX2ExportData('x1locthanh', {});
const noNominalExportText = JSON.stringify(noNominalExportData && noNominalExportData.aoa || []);
check('Excel phân biệt lô đã chốt chưa có tỷ lệ với lô chưa chốt',
  noNominalExportText.includes('NO-NOMINAL') &&
  noNominalExportText.includes('Đã chốt — chưa có tỷ lệ (thiếu khối lượng danh định)') &&
  exportSrc.includes('p.closed') &&
  exportSrc.includes('; chưa chốt, chưa tính tỷ lệ'));
const mixedAccept = { id: 'lt-accept-mixed', date: '2026-11-11', qtyIn: 300, qtyOk: 300, qtyLoai: 0,
  lotAllocations: [{ sourceId: boAccept.id, lotCode: 'SS-ACCEPT-2000', qtyIn: 150 },
    { sourceId: bo1.id, lotCode: 'SS-B1', qtyIn: 150 }] };
state.xuong1LocThanhRecords.push(mixedAccept);
const mixedProgress = x1.x1LocThanhLotCumulativeFinishedOf(boAccept.id);
check('Lượt gom hỗn hợp không phân bổ thành phẩm chính xác vào từng lô',
  mixedProgress.finishedKg === 1500 && mixedProgress.mixedFinishedKg === 300);
const mixedClosedProgress = x1.x1LocThanhLotProgressOf(boAccept);
check('Lô đã chốt có thành phẩm gom hỗn hợp không có tỷ lệ đóng thuyết phục',
  mixedClosedProgress.closed &&
  mixedClosedProgress.mixedFinishedKg === 300 &&
  mixedClosedProgress.ratio == null);
const mixedClosedExportData = report.buildX2ExportData('x1locthanh', {});
const mixedClosedExportText = JSON.stringify(mixedClosedExportData && mixedClosedExportData.aoa || []);
check('Excel phân biệt lô gom hỗn hợp đã chốt với lô thiếu danh định',
  mixedClosedExportText.includes('Đã chốt — chưa có tỷ lệ (gom hỗn hợp/chưa phân bổ)'));
x1.renderX1CardOf(spLT.cardId);
const mixedClosedStatsHtml = g('x1-loc-thanh-stats').innerHTML;
check('Thẻ thống kê đóng lô gom hỗn hợp không hiện số %, mà ghi rõ Chưa phân bổ',
  mixedClosedStatsHtml.includes('Tỷ lệ lô đã chốt · Chưa phân bổ') &&
  mixedClosedStatsHtml.includes('<span class="material-stat-value">—</span>') &&
  !mixedClosedStatsHtml.includes('75%'));
const mixedRatioSource = read("../js/xuong2.js");
check("Summary nhiều lô không gắn tỷ lệ tổng của lô đầu vào một tỷ lệ gom chung",
  !mixedRatioSource.includes("const closedRatio") && mixedRatioSource.includes("Tỷ lệ theo lô:") &&
  !mixedRatioSource.includes("closedRatio ?"));
console.log('--- FOCUS: CHỐT/MỞ LẠI VÀ GIỮ KG ĐÃ NHẬP ---');
const mixedEditStatus = { id: 'lt-mixed-status-edit', date: '2026-11-13', mode: 'bo-xo', qtyIn: 300, qtyOk: 300, qtyLoai: 0,
  lotAllocations: [{ sourceId: bo1.id, lotCode: 'B1', qtyIn: 150 }, { sourceId: bo2.id, lotCode: 'B2', qtyIn: 150 }],
  matrixRows: [{ len: 50, width: 11, weights: { bo: 300, loai: 0 } }] };
x1.x1LocThanhMarkLotDone(bo1.id, true);
x1.x1LocThanhMarkLotDone(bo2.id, false);
state.xuong1LocThanhRecords.push(mixedEditStatus);
x1.editX1Chain(spLT, mixedEditStatus.id);
setAllocationRows([fakeAllocationRow(bo1.id, 150), fakeAllocationRow(bo2.id, 150)]);
setMatrixCells([fakeMatrixCell(11, 50, 'bo', 300)]);
check('Sửa phiên gom hỗn hợp: checkbox phản ánh hỗn hợp tròn/chưa chốt, không mặc định đóng/mở',
  g('x1-loc-thanh-done').indeterminate === true && g('x1-loc-thanh-done').checked === false &&
  x1.x1LocThanhLotDoneOf(bo1) === true && x1.x1LocThanhLotDoneOf(bo2) === false);
x1.handleX1ChainSubmit(spLT, saveEvent());
check('Sửa gom hỗn hợp không đổi trạng thái lô nếu chưa có ý định checkbox rõ',
  x1.x1LocThanhLotDoneOf(bo1) === true && x1.x1LocThanhLotDoneOf(bo2) === false);

const recordsBeforeMixedSummary = state.xuong1LocThanhRecords;
state.xuong1LocThanhRecords = [{ id: 'lt-two-lots-one-session', date: '2026-11-14', qtyIn: 300, qtyOk: 300, qtyLoai: 0,
  lotAllocations: [{ sourceId: bo1.id, lotCode: 'B1', qtyIn: 150 }, { sourceId: bo2.id, lotCode: 'B2', qtyIn: 150 }] }];
const twoLotMixedSummary = x1.x1LocThanhSelectedMixedSummaryOf([bo1.id, bo2.id], null);
check('Hai lô một lượt gom: selected-lot summary đếm lượt gom một lần, không nhân đôi kg',
  twoLotMixedSummary.qtyKg === 300 && twoLotMixedSummary.sessions === 1);
state.xuong1LocThanhRecords = recordsBeforeMixedSummary;
setAllocationRows([]);
setMatrixCells([]);
x1.resetX1ChainForm(spLT);

const xuong2Src = read('../js/xuong2.js');
state.x1LocThanhEditId = 'lt-accept-650';
const editProgress = x1.x1LocThanhLotProgressOf(boAccept, 'lt-accept-650');
check('Sửa lượt lọc: loại lượt cũ khỏi cộng dồn, dự phóng không cộng đúp lượt đang sửa',
  editProgress.finishedKg === 850 &&
  editProgress.finishedKg + 650 === 1500 &&
  mixedRatioSource.includes('x1LocThanhLotProgressOf(source, editId)') &&
  mixedRatioSource.includes('item.progress.finishedKg + addThisSession'));
state.x1LocThanhEditId = null;

state.xuong1LocThanhRecords = [];
x1.x1LtRemoveSource(bo1.id);
x1.x1LtRemoveSource(bo2.id);
x1.x1LtAddSource(bo1.id);
x1.x1LtAddSource(bo2.id);
setAllocationRows([
  fakeAllocationRow(bo1.id, 37),
  fakeAllocationRow(bo2.id, 23)
]);
x1.x1LtRemoveSource(bo2.id);
const allocationsAfterRemove = x1.x1LtReadSourceAllocations();
check('Xóa lô vẫn giữ kg đã gõ của các dòng còn lại trước khi DOM rerender',
  allocationsAfterRemove.find(a => a.sourceId === bo1.id)?.qtyIn === 37);
setAllocationRows([
  fakeAllocationRow(bo1.id, 37),
  fakeAllocationRow(bo2.id, 23)
]);
x1.x1LtAddSource(bo2.id);
const allocationsAfterAdd = x1.x1LtReadSourceAllocations();
check('Thêm lô vẫn giữ kg đã gõ của dòng đang có trước khi rerender mảng lô',
  allocationsAfterAdd.find(a => a.sourceId === bo1.id)?.qtyIn === 37 &&
  allocationsAfterAdd.find(a => a.sourceId === bo2.id)?.qtyIn === 23);

x1.resetX1ChainForm(spLT);
const boReopen = {
  id: 'bo-reopen-no-session', lotCode: 'REOPEN-NO-SESSION', date: '2026-11-12', qtyIn: 120, qtyOk: 120,
  srcType: 'Vầu thanh', srcSupplier: 'NCC Mở lại',
  sourceAllocations: [{ sourceType: 'locOng', sourceId: 'loc-ong-reopen-no-session', qty: 120 }]
};
state.xuong1BoRecords.push(boReopen);
state.xuong1LocThanhRecords = [];
x1.x1LocThanhMarkLotDone(boReopen.id, true);
x1.fillX1ChainOptions(spLT);
check('Lô đã chốt không có lượt lọc vẫn còn trong danh sách để mở lại',
  g('x1-loc-thanh-source-options').innerHTML.includes('REOPEN-NO-SESSION') &&
  x1.x1LocThanhLotDoneOf(boReopen));
x1.x1LtAddSource(boReopen.id);
g('x1-loc-thanh-date').value = '2026-11-12';
g('x1-loc-thanh-done').checked = false;
setAllocationRows([fakeAllocationRow(boReopen.id, 0)]);
x1.handleX1ChainSubmit(spLT, saveEvent());
check('Mở lại bằng ý định zero kg không tạo lượt lọc giả',
  state.xuong1LocThanhRecords.length === 0 &&
  x1.x1LocThanhLotDoneOf(boReopen) === false &&
  boReopen.locThanhLotStatus === 'open');

boReopen.locThanhLotDone = true;
boReopen.locThanhLotClosed = true;
boReopen.finishedClosed = true;
boReopen.lotClosed = true;
boReopen.lotDone = true;
boReopen.locThanhDoneAt = '2026-11-12T00:00:00.000Z';
boReopen.doneAt = '2026-11-12T00:00:00.000Z';
x1.x1LocThanhMarkLotDone(boReopen, false);
check('Mở lô xóa toàn bộ cờ tương thích và timestamp chốt',
  boReopen.locThanhLotDone === undefined && boReopen.locThanhLotClosed === undefined &&
  boReopen.finishedClosed === undefined && boReopen.lotClosed === undefined && boReopen.lotDone === undefined &&
  boReopen.locThanhLotStatus === 'open' && boReopen.locThanhDoneAt === undefined && boReopen.doneAt === undefined);

x1.x1LtAddSource(boReopen.id);
g('x1-loc-thanh-done').checked = true;
x1.x1LtSyncDoneUi();
check('Checkbox bật phản ánh ý định chờ xác nhận đóng',
  g('x1-loc-thanh-done-hint').textContent.includes('CHỜ XÁC NHẬN ĐÓNG LÔ'));
g('x1-loc-thanh-done').checked = false;
x1.x1LtSyncDoneUi();
check('Checkbox tắt phản ánh ý định lô đang mở',
  g('x1-loc-thanh-done-hint').textContent.includes('LÔ ĐANG MỞ'));
x1.x1LocThanhMarkLotDone(boReopen, true);
g('x1-loc-thanh-done').checked = false;
x1.x1LtSyncDoneUi();
check('Checkbox tắt trên lô đã chốt phản ánh ý định chờ mở lại',
  g('x1-loc-thanh-done-hint').textContent.includes('CHỜ XÁC NHẬN MỞ LẠI'));
x1.x1LocThanhMarkLotDone(boReopen, false);
console.log('--- MIGRATE DỮ LIỆU PHÂN LOẠI CŨ (6mm / 13mm) ---');
const legacyRec = {
  id: 'lt-legacy-1', date: '2026-11-08', mode: 'loc-thanh', qtyIn: 100, qtyOk: 100, qtyLoai: 0,
  lotAllocations: [{ sourceId: 'bo-lot-1', lotCode: 'B1', qtyIn: 100, legacy: true }],
  matrixRows: [{ len: 50, counts: { d6: 10, d13: 10, bnont: 5, loai: 2 } }]
};
state.xuong1LocThanhRecords.push(legacyRec);
const legacyDisplay = x1.x1ChainDisplay(spLT, legacyRec);
check('Dữ liệu cũ: 6mm → A; 13mm chia 60% A + 40% A1 (A làm tròn, tổng khớp đúng số cũ)',
  legacyDisplay && Array.isArray(legacyDisplay.matrixRows) &&
  legacyDisplay.matrixRows[0].counts.A === 16 &&
  legacyDisplay.matrixRows[0].counts.A1 === 4 &&
  legacyDisplay.matrixRows[0].counts.bnont === 5 &&
  legacyDisplay.matrixRows[0].counts.loai === 2 &&
  legacyDisplay.matrixRows[0].counts.d6 === undefined &&
  legacyDisplay.matrixRows[0].counts.d13 === undefined);
check('Ma trận cũ sau migrate vẫn vào Kho Nan đúng nhóm A/A1/B (tồn không có bản rộng nằm ở nhóm ngoài ma trận)',
  (() => {
    const wh = x1.x1WarehouseStockSummary();
    return wh.groups.some(g => g.kind === 'A' && g.len === 50 && g.qty === 16) &&
      wh.groups.some(g => g.kind === 'A1' && g.len === 50 && g.qty === 4) &&
      wh.groups.some(g => g.kind === 'B' && g.len === 50 && g.qty === 5);
  })());

x1.x1LocThanhMarkLotDone('bo-lot-1', true);
const legacyClosedProgress = x1.x1LocThanhLotProgressOf(bo1);
check('Lô đóng có ma trận cũ theo số lượng và danh định Sấy Sinh hợp lệ: không quy đổi thành 0kg và không tạo tỷ lệ 0%',
  legacyClosedProgress.closed &&
  legacyClosedProgress.nominalKg === 500 &&
  legacyClosedProgress.legacyCountOutputSessions === 1 &&
  legacyClosedProgress.hasUnquantifiableOutput === true &&
  legacyClosedProgress.ratio == null);

console.log('--- N. BẬT/TẮT CHIP BẢN RỘNG (14/11/2026 — sửa lỗi bấm chip không ăn) ---');
g('x1-loc-thanh-mode').value = 'loc-thanh';
x1.syncX1LocThanhMode();
x1.renderX1LtMatrix();
check('N1. Ma trận mới trống: đủ 60 chip, chưa có dòng nhập nào',
  (matrixBox.innerHTML.match(/data-x1-lt-chip=/g) || []).length === 60 &&
  !matrixBox.innerHTML.includes('data-x1-lt-width='));
x1.x1LtToggleWidth(50, 11);
check('N2. Bấm chip 11 ly của 50 mm → hiện dòng nhập + đúng 1 chip bật',
  matrixBox.innerHTML.includes('data-x1-lt-width="11"') &&
  matrixBox.innerHTML.includes('data-x1-lt-len="50"') &&
  (matrixBox.innerHTML.match(/class="x1-lt-wchip is-on"/g) || []).length === 1);
x1.renderX1LtMatrix();
check('N3. Vẽ lại ma trận (đồng bộ mây) giữ dòng vừa bật dù chưa nhập số',
  matrixBox.innerHTML.includes('data-x1-lt-width="11"') &&
  matrixBox.innerHTML.includes('data-x1-lt-len="50"'));
x1.x1LtToggleWidth(50, 6);
check('N4. Bật thêm 6 ly cùng kích thước → 2 dòng 50 mm (ô kích thước gộp rowspan="2")',
  (matrixBox.innerHTML.match(/data-x1-lt-width="(?:6|11)"/g) || []).length >= 2 &&
  matrixBox.innerHTML.includes('rowspan="2"'));
setMatrixCells([fakeMatrixCell(11, 50, 'A', 30)]);
x1.renderX1LtMatrix();
check('N5. Số đã nhập được giữ khi vẽ lại (11 ly · 50 mm → A 30 kg)',
  matrixBox.innerHTML.includes('value="30"'));
x1.x1LtToggleWidth(50, 11); // stub confirm trả true → đồng ý xoá số
check('N6. Tắt chip có số (đã xác nhận) → dòng 11 ly biến mất, còn dòng 6 ly',
  !matrixBox.innerHTML.includes('data-x1-lt-width="11"') &&
  matrixBox.innerHTML.includes('data-x1-lt-width="6"'));
setMatrixCells([]);
x1.renderX1LtMatrix();
check('N7. Vẽ lại sau khi tắt — dòng 11 ly KHÔNG hồi sinh',
  !matrixBox.innerHTML.includes('data-x1-lt-width="11"') &&
  matrixBox.innerHTML.includes('data-x1-lt-width="6"'));
x1.x1LtToggleWidth(50, 6);
check('N8. Tắt chip không có số → không hỏi, dòng biến mất sạch',
  !matrixBox.innerHTML.includes('data-x1-lt-width="6"') &&
  !matrixBox.innerHTML.includes('data-x1-lt-width="11"'));

console.log('--- MA TRẬN 2 CẤP + PIVOT KHO ---');
x1.renderX1LtMatrix([
  { width: 6, len: 50, weights: { A: 50 } },
  { width: 11, len: 60, weights: { A: 10 } },
  { width: 13, len: 60, weights: { A1: 20 } }
]);
check('Ví dụ 2 cấp: 50mm có 6ly (A 50kg); 60mm có 11ly (A 10kg) + 13ly (A1 20kg) cùng lúc',
  matrixBox.innerHTML.includes('rowspan="2"') &&
  matrixBox.innerHTML.includes('6 ly') && matrixBox.innerHTML.includes('11 ly') && matrixBox.innerHTML.includes('13 ly') &&
  (matrixBox.innerHTML.match(/class="x1-lt-wchip is-on"/g) || []).length === 3 &&
  matrixBox.innerHTML.includes('value="50"') && matrixBox.innerHTML.includes('value="20"'));
x1.renderX1LtMatrix();
x1.x1KhoOpenDetail('vau');
const khoPivot = g('x1-kho-detail-body').innerHTML;
check('Popup Kho 2 cấp: Bản rộng → Kích thước dài, cột khối lượng từng loại',
  khoPivot.includes('Bản rộng') && khoPivot.includes('Kích thước dài') &&
  khoPivot.includes('x1-kho-pivot') && khoPivot.includes('rowspan=') &&
  khoPivot.includes('Tổng cộng'));

console.log('--- O. FORM GỌN 3 HÀNG + DÒNG LÔ CHỈ TÊN (14/11/2026 đợt 4) ---');
const idxForm = idxHtml.slice(idxHtml.indexOf('id="x1-loc-thanh-form"'), idxHtml.indexOf('id="x1-loc-thanh-calc"'));
check('O1. Đã bỏ ô Ghi Chú khỏi form Lọc Thanh',
  idxHtml.includes('id="x1-loc-thanh-form"') &&
  !idxForm.includes('x1-loc-thanh-note') && !idxForm.includes('Ghi Chù'));
check('O2. Hàng 2 gọn Hình thức → Ngày; tổng kg lấy từ các dòng lô, không có trường ước tính',
  ltFormHtml.indexOf('id="x1-loc-thanh-src"') < ltFormHtml.indexOf('id="x1-loc-thanh-mode"') &&
  ltFormHtml.indexOf('id="x1-loc-thanh-mode"') < ltFormHtml.indexOf('id="x1-loc-thanh-date"') &&
  ltFormHtml.indexOf('id="x1-loc-thanh-date"') < ltFormHtml.indexOf('id="x1-loc-thanh-calc"') &&
  !ltFormHtml.includes('Ước Tính') &&
  !ltFormHtml.includes('kg tươi') &&
  idxHtml.includes('type="hidden" id="x1-loc-thanh-in"'));
check('O3. Dropdown nguồn KHÔNG tự đóng sau mỗi lần tích — chỉ đóng khi bấm ra ngoài',
  eventsSrc.includes('ltSourceDropdown.open = false') &&
  eventsSrc.includes("e.target.closest('#x1-lt-source-dropdown')") &&
  !eventsSrc.includes('else if (ltSourceDropdown) ltSourceDropdown.open = false;'));
state.xuong1LocThanhRecords = [];
state.x1LocThanhEditId = null;
x1.x1LtAddSource(bo1.id);
const srcRow = sourceBox.innerHTML;
check('O4. Dòng lô GỌN: chỉ tên lô + ô kg (chi tiết lô nằm trong tooltip)',
  srcRow.includes('class="x1-lt-src-name"') &&
  srcRow.includes('B1') &&
  srcRow.includes('data-x1-lt-source-in') &&
  srcRow.includes('title="Vầu thanh · NCC NCC Một') &&
  srcRow.includes('Phiếu Bổ 100 kg · Còn 100 kg') &&
  srcRow.includes('Danh định Sấy Sinh') &&
  !srcRow.includes('x1-lt-lot-progress') &&
  !stylesCss.includes('.x1-lt-lot-progress') &&
  !srcRow.includes('x1-lt-source-head') && !srcRow.includes('x1-lt-source-fields'));
x1.x1LtRemoveSource(bo1.id);
check('O5. CSS: dòng lô gọn + ma trận cân bằng (chip vừa 1 hàng, cột 170px)',
  stylesCss.includes('.x1-lt-src-name') &&
  stylesCss.includes('.x1-lt-matrix2 thead tr:first-child th:nth-child(1) { width: 170px; }') &&
  stylesCss.includes('.x1-lt-matrix2 .x1-lt-width-chips { gap: 3px; }'));

console.log("--- FOCUS: LƯỢT MỚI KHÔNG ĐƯỢC GIỮ NGUYÊN LÔ ĐÃ ĐÓNG ---");
x1.resetX1ChainForm(spLT);
const boClosedNew = {
  id: "bo-closed-new-session", lotCode: "CLOSED-NEW-SESSION", date: "2026-11-15",
  qtyIn: 100, qtyOk: 100,
  srcType: "Vầu thanh", srcSupplier: "NCC Đóng",
  sourceAllocations: []
};
state.xuong1BoRecords.push(boClosedNew);
x1.x1LocThanhMarkLotDone(boClosedNew.id, true);
x1.resetX1ChainForm(spLT);
x1.x1LtAddSource(boClosedNew.id);
g("x1-loc-thanh-mode").value = "bo-xo";
x1.syncX1LocThanhMode();
g("x1-loc-thanh-date").value = "2026-11-15";
setAllocationRows([fakeAllocationRow(boClosedNew.id, 40)]);
setMatrixCells([fakeMatrixCell(11, 50, "bo", 40)]);

const originalConfirm = global.confirm;
let closedSessionConfirmCount = 0;
let closedSessionConfirmText = "";
global.confirm = message => {
  closedSessionConfirmCount++;
  closedSessionConfirmText = String(message);
  return false;
};
const recordsBeforeClosedNewSession = state.xuong1LocThanhRecords.length;
x1.handleX1ChainSubmit(spLT, saveEvent());
check("Lượt Bó Xô mới có kg nhưng lô đã chốt: xác nhận hủy không lưu và không tự mở",
  closedSessionConfirmCount === 1 &&
  closedSessionConfirmText.includes("MỞ LẠI") &&
  state.xuong1LocThanhRecords.length === recordsBeforeClosedNewSession &&
  x1.x1LocThanhLotDoneOf(boClosedNew) === true);

global.confirm = message => {
  closedSessionConfirmCount++;
  closedSessionConfirmText = String(message);
  return true;
};
x1.handleX1ChainSubmit(spLT, saveEvent());
check("Xác nhận mở lại cho lượt mới rồi mới lưu: lô mở và tạo đúng lượt dương",
  closedSessionConfirmCount === 2 &&
  state.xuong1LocThanhRecords.length === recordsBeforeClosedNewSession + 1 &&
  state.xuong1LocThanhRecords.some(r => r.qtyIn === 40 && r.lotAllocations && r.lotAllocations[0] && r.lotAllocations[0].sourceId === boClosedNew.id) &&
  x1.x1LocThanhLotDoneOf(boClosedNew) === false);

const closedEditSession = {
  id: "lt-edit-linked-closed", date: "2026-11-16", mode: "bo-xo",
  qtyIn: 30, qtyOk: 30, qtyLoai: 0,
  lotAllocations: [{ sourceId: boClosedNew.id, lotCode: "CLOSED-NEW-SESSION", qtyIn: 30 }],
  matrixRows: [{ len: 50, width: 11, weights: { bo: 30, loai: 0 } }]
};
x1.x1LocThanhMarkLotDone(boClosedNew.id, true);
state.xuong1LocThanhRecords.push(closedEditSession);
let editClosedConfirmCount = 0;
global.confirm = () => { editClosedConfirmCount++; return false; };
x1.editX1Chain(spLT, closedEditSession.id);
setAllocationRows([fakeAllocationRow(boClosedNew.id, 35)]);
setMatrixCells([fakeMatrixCell(11, 50, "bo", 35)]);
g("x1-loc-thanh-date").value = "2026-11-16";
x1.handleX1ChainSubmit(spLT, saveEvent());
check("Sửa phiên hiện hữu link lô đã chốt: không bị coi là lượt mới và vẫn giữ trạng thái chốt",
  editClosedConfirmCount === 0 &&
  closedEditSession.qtyIn === 35 &&
  closedEditSession.qtyOk === 35 &&
  x1.x1LocThanhLotDoneOf(boClosedNew) === true);
global.confirm = originalConfirm;

console.log(`\n=== KẾT QUẢ: ${pass} PASS / ${fail} FAIL ===`);
process.exitCode = fail > 0 ? 1 : 0;
