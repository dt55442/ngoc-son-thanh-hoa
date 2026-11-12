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
const { state, STORAGE_KEY_X1_BO_LENGTHS, STORAGE_KEY_X1_BO_WIDTHS } = await import('../js/state.js');
state.currentUser = { username: 'admin', role: 'admin', editTabs: [], allowAdvanced: true };
state.activeView = 'kanban-view';
const x1 = await import('../js/xuong2.js');
const spBO = x1.X1_CHAIN_SPECS.find(spec => spec.key === 'bo');
const spLT = x1.X1_CHAIN_SPECS.find(spec => spec.key === 'locThanh');
const g = id => document.getElementById(id);
const sourceBox = g('x1-loc-thanh-source-rows');
const matrixBox = g('x1-loc-thanh-length-rows');

console.log('--- CẤU TRÚC VÀ DANH MỤC ---');
const appVersion = (stateSrc.match(/APP_VERSION\s*=\s*'(v\d+)'/) || [])[1];
check('Bổ chỉ chọn bản rộng; kích thước dài được nhập tại Lọc Thanh',
  idxHtml.includes('id="x1-bo-widths-btn"') && !idxHtml.includes('id="x1-bo-lengths-btn"') &&
  idxHtml.includes('id="btn-x1-lt-length-catalog"') &&
  idxHtml.includes('x1-loc-thanh-length-wrap'));
check('Lọc Thanh chọn nhiều lô; kg lọc mặc định theo phiếu Bổ, không yêu cầu cân sau sấy',
  idxHtml.includes('id="x1-loc-thanh-source-options"') &&
  idxHtml.includes('<details id="x1-lt-source-dropdown"') &&
  !idxHtml.includes('id="btn-x1-lt-add-source"') &&
  !idxHtml.includes('>Thêm lô</button>') &&
  idxHtml.includes('id="x1-loc-thanh-source-rows"') &&
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
state.x1BoWidthOptions = [];
storeBacking.delete(STORAGE_KEY_X1_BO_WIDTHS);
x1.loadX1BoWidthOptions();
x1.x1BoWidthToggle(11, true);
x1.x1BoWidthToggle(15, true);
check('Bản rộng mặc định vẫn giữ danh mục 11 ly và 15 ly',
  x1.x1BoWidthAll().join(',') === '11,15');

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
  widths: [11, 15], srcType: 'Vầu thanh', srcSupplier: 'NCC Một',
  sourceAllocations: [{ sourceType: 'locOng', sourceId: 'loc-ong-lot-1', qty: 100 }]
};
const bo2 = {
  id: 'bo-lot-2', lotCode: 'B2', date: '2026-11-04', qtyIn: 70, qtyOk: 70,
  widths: [15, 20], srcType: 'Vầu thanh', srcSupplier: 'NCC Hai',
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
  sourceOptionsHtml.includes('NCC Một') && sourceOptionsHtml.includes('11 ly, 15 ly') &&
  sourceOptionsHtml.includes('Còn theo phiếu Bổ 100 kg</strong> | Tổng đầu vào Sấy Sinh cả lô 500 kg') &&
  sourceOptionsHtml.includes('Tổng đầu vào Sấy Sinh cả lô 750 kg'));
x1.x1LtAddSource(bo1.id);
x1.x1LtAddSource(bo2.id);
check('Mỗi lô tự điền phần còn lại theo phiếu Bổ vào một ô kg có thể sửa',
  (sourceBox.innerHTML.match(/data-x1-lt-source-in(?:\s|>)/g) || []).length === 2 &&
  sourceBox.innerHTML.includes('value="100"') && sourceBox.innerHTML.includes('value="70"') &&
  !sourceBox.innerHTML.includes('data-x1-lt-dry-available') &&
  !sourceBox.innerHTML.includes('data-x1-lt-adjustment-reason'));
g('x1-loc-thanh-mode').value = 'loc-thanh';
x1.syncX1LocThanhMode();
check('Ma trận gộp bản rộng từ nhiều lô × 11 chuẩn + kích thước bổ sung',
  JSON.stringify(x1.x1LocThanhSourceDimensions().widths) === '[11,15,20]' &&
  x1.x1LocThanhSourceDimensions().lengths.includes(120) &&
  matrixBox.innerHTML.includes('20 ly') && matrixBox.innerHTML.includes('120 mm'));

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
  firstDisplay.lotCode === 'B1 + B2' && firstDisplay.sourceLots.length === 2 &&
  firstFilter.lengths.includes(120));
x1.renderX1CardOf(spLT.cardId);
const historyHtml = g('x1-loc-thanh-day-cards').innerHTML;
check('Lịch sử ưu tiên tổng kg theo bản rộng × kích thước; phần đối chiếu được thu gọn',
  historyHtml.includes('11 ly · 50 mm') && historyHtml.includes('40 kg') &&
  historyHtml.includes('15 ly · 50 mm') && historyHtml.includes('20 kg') &&
  historyHtml.includes('<details class="x1-lt-reference"') &&
  !historyHtml.includes('x1-lt-mini-table'));

setAllocationRows([]);
setMatrixCells([]);
x1.x1LtAddSource(bo1.id);
setAllocationRows([fakeAllocationRow(bo1.id, 10)]);
g('x1-loc-thanh-mode').value = 'bo-xo';
g('x1-loc-thanh-date').value = '2026-11-06';
g('x1-loc-thanh-ok').value = '10';
g('x1-loc-thanh-loai').value = '0';
x1.handleX1ChainSubmit(spLT, saveEvent());
check('Cho lưu kg lọc mà không cần cân sau sấy hoặc giải trình',
  state.xuong1LocThanhRecords.length === 2 &&
  state.xuong1LocThanhRecords[1].lotAllocations[0].qtyIn === 10 &&
  state.xuong1LocThanhRecords[1].lotAllocations[0].qtyDryAvailable == null);

setAllocationRows([]);
x1.x1LtAddSource(bo1.id);
setAllocationRows([fakeAllocationRow(bo1.id, 25)]);
g('x1-loc-thanh-mode').value = 'bo-xo';
g('x1-loc-thanh-date').value = '2026-11-07';
g('x1-loc-thanh-ok').value = '20';
g('x1-loc-thanh-loai').value = '0';
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
  exportText.includes('KL Chênh (kg)'));

console.log(`\n=== KẾT QUẢ: ${pass} PASS / ${fail} FAIL ===`);
process.exitCode = fail > 0 ? 1 : 0;
