// tests/xuong1-bo-lengths.test.mjs — 11/2026: CHIỀU DÀI THANH Ở THẺ BỔ XƯỞNG 1
// (nút nổi bung list tick + nút "Thêm", lưu theo TỪNG LÔ vào trường `lengths` của bản ghi
// xuong1BoRecords) và THẺ LỌC THANH/BÓ XÔ (2 hình thức: lọc thanh theo chiều dài của
// đúng lô nguồn / bó xô tính theo kg).
'use strict';
import fs from 'node:fs';

// ─── Stubs môi trường (cùng khuôn tests/xuong1.test.mjs) ────────────
function makeEl(id) {
  const attrs = {};
  const el = {
    id: id || '', value: '', checked: false, disabled: false, hidden: false,
    open: true, textContent: '', innerHTML: '', style: {}, dataset: {}, _h: {},
    offsetWidth: 800, offsetHeight: 500, attrs,
    classList: { _s: new Set(), add(c){ this._s.add(c); }, remove(c){ this._s.delete(c); }, toggle(c, f){ if (f === undefined) f = !this._s.has(c); if (f) this._s.add(c); else this._s.delete(c); return f; }, contains(c){ return this._s.has(c); } },
    addEventListener(t, f) { (el._h[t] = el._h[t] || []).push(f); },
    appendChild(c) { return c; }, removeChild(c) { return c; },
    remove(){}, focus(){}, click(){}, animate(){ return { cancel(){} }; },
    setAttribute(k, v) { attrs[k] = String(v); if (k === 'hidden') el.hidden = true; },
    removeAttribute(k) { delete attrs[k]; if (k === 'hidden') el.hidden = false; },
    getAttribute(k) { return (k in attrs) ? attrs[k] : null; },
    querySelector: () => makeEl(), querySelectorAll: () => [],
    closest: () => null, matches: () => false,
    getContext: () => ({ measureText: () => ({ width: 10 }), createLinearGradient: () => ({ addColorStop(){} }), createRadialGradient: () => ({ addColorStop(){} }), drawImage(){} }),
    getBoundingClientRect: () => ({ top: 0, left: 0, right: 800, bottom: 600, width: 800, height: 600 }),
    scrollIntoView(){}, scrollTo(){}, blur(){}, scroll(){},
    reset(){}
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

const read = (p) => fs.readFileSync(new URL(p, import.meta.url), 'utf8');
const idxHtml = read('../index.html');
const stylesCss = read('../styles.css');
const eventsSrc = read('../js/events.js');
const mainSrc = read('../js/main.js');
const storageSrc = read('../js/storage.js');
const cloudSrc = read('../js/cloud.js');
const historySrc = read('../js/history.js');
const swSrc = read('../sw.js');
const x2Src = read('../js/xuong2.js');
const stateSrc = read('../js/state.js');
const exportSrc = read('../js/export-xlsx.js');

const { state, STORAGE_KEY_X1_BO_LENGTHS, STORAGE_KEY_X1_BO_WIDTHS } = await import('../js/state.js');
state.currentUser = { username: 'admin', role: 'admin', editTabs: [], allowAdvanced: true };
state.activeView = 'kanban-view';
const x1 = await import('../js/xuong2.js');

const spBO = x1.X1_CHAIN_SPECS.find(s => s.key === 'bo');
const spLT = x1.X1_CHAIN_SPECS.find(s => s.key === 'locThanh');
const g = id => document.getElementById(id);

// ─── A. CẤU TRÚC ────────────────────────────────────────────────────
console.log('--- A. CẤU TRÚC ---');
check('A1: state.js khai key chiều dài/bản rộng + field + export + version v384',
  stateSrc.includes('bamboo_tracker_x1_bo_lengths_v1') && stateSrc.includes('x1BoLengthOptions: []') &&
  stateSrc.includes('bamboo_tracker_x1_bo_widths_v1') && stateSrc.includes('x1BoWidthOptions: []') &&
  stateSrc.includes('STORAGE_KEY_X1_BO_LENGTHS,') && stateSrc.includes('STORAGE_KEY_X1_BO_WIDTHS,') &&
  stateSrc.includes("APP_VERSION = 'v384'"));
check('A2: form Bổ gọn, có tooltip và hai bộ chọn, không còn ô Ghi Chú/Đạt/Loại',
  idxHtml.includes('id="x1-bo-lengths-btn"') && idxHtml.includes('id="x1-bo-lengths-picker"') &&
  idxHtml.includes('id="x1-bo-widths-btn"') && idxHtml.includes('id="x1-bo-width-picker"') &&
  idxHtml.includes('Gom theo lô: Ống Đạt từ Lọc Ống + phần Ống Sót Mắt đã Cắt Mắt') &&
  !idxHtml.includes('id="x1-bo-note"') && !idxHtml.includes('id="x1-bo-ok"') && !idxHtml.includes('id="x1-bo-loai"'));
check('A3: index.html form Lọc Thanh có mode + wrap bảng dài + okrow',
  idxHtml.includes('id="x1-loc-thanh-mode"') && idxHtml.includes('id="x1-loc-thanh-length-wrap"') &&
  idxHtml.includes('id="x1-loc-thanh-length-rows"') && idxHtml.includes('id="x1-loc-thanh-okrow"') &&
  idxHtml.includes('id="x1-lt-add-row"') &&
  idxHtml.includes('id="btn-x1-lt-stage-prev"') && idxHtml.includes('id="btn-x1-lt-stage-next"') &&
  idxHtml.includes('class="x1-bo-actions x1-lt-actions"') &&
  idxHtml.includes('class="x1-ss-input-btn x1-bo-action-btn is-neutral" id="btn-cancel-x1-loc-thanh"') &&
  idxHtml.includes('class="x1-ss-input-btn x1-bo-action-btn" data-perm="x1"><i data-lucide="check"></i><strong>Lưu Lượt Lọc Thanh</strong>') &&
  idxHtml.includes('id="x1-kho-card"') &&
  idxHtml.indexOf('id="x1-loc-thanh-src"') < idxHtml.indexOf('id="x1-loc-thanh-mode"'));
check('A3b: Lọc Thanh có 4 nút cùng hàng trên desktop và 2 cột trên mobile',
  stylesCss.includes('.x1-lt-actions { grid-template-columns: repeat(4, minmax(0, 1fr))') &&
  stylesCss.includes('@media (max-width: 639.98px)') &&
  stylesCss.includes('.x1-bo-actions { grid-template-columns: repeat(2, minmax(0, 1fr)); }'));
check('A4: events.js nối đủ (nút · tick · thêm · mode · đổi nguồn · thêm/xóa dòng)',
  eventsSrc.includes("safeOn('x1-bo-lengths-btn'") && eventsSrc.includes("safeOn('x1-loc-thanh-mode'") &&
  eventsSrc.includes("safeOn('x1-bo-widths-btn'") &&
  eventsSrc.includes("safeOn('btn-x1-bo-stage-prev'") && eventsSrc.includes("safeOn('btn-x1-bo-stage-next'") &&
  eventsSrc.includes("safeOn('btn-x1-lt-stage-prev'") && eventsSrc.includes("safeOn('btn-x1-lt-stage-next'") &&
  eventsSrc.includes('x1LocThanhNavigateStage') &&
  eventsSrc.includes("safeOn('x1-lt-add-row'") && eventsSrc.includes('data-x1-bo-len') &&
  eventsSrc.includes('data-x1-lt-del') && eventsSrc.includes("safeOn('x1-loc-thanh-src'"));
check('A5: xuong2.js đăng ký dropdown nổi + danh mục bản rộng + điều hướng',
  x2Src.includes("['x1-bo-width-picker', 'x1-bo-widths-btn']") &&
  x2Src.includes('X1_BO_LENGTH_DEFAULTS = [50, 60, 65, 70, 75, 80, 87, 90, 95, 100, 105]') &&
  x2Src.includes('X1_BO_WIDTH_DEFAULTS = [11, 15]') && x2Src.includes('x1BoWidthsTogglePicker,') &&
  x2Src.includes('x1BoNavigateStage,') && x2Src.includes('x1LocThanhNavigateStage,') &&
  x2Src.includes("x1-kho-card") && x2Src.includes('x1BoLengthsOfPhoiSay,'));
check('A6: CSS khối mới ở depth 0 + ngoặc cân bằng',
  (() => {
    const i = stylesCss.indexOf('.x1-bo-width-picker {');
    let d = 0;
    for (let j = 0; j < i; j++) { if (stylesCss[j] === '{') d++; else if (stylesCss[j] === '}') d--; }
    return d === 0 && stylesCss.includes('.x1-bo-actions') && stylesCss.includes('.x1-lt-row') &&
      stylesCss.includes('#x1-loc-thanh-length-rows .x1-lt-matrix tbody') &&
      stylesCss.includes('.x1-lt-mobile-history') &&
      (stylesCss.match(/{/g) || []).length === (stylesCss.match(/}/g) || []).length;
  })());
check('A7: danh mục bản rộng nối storage · cloud · history · main',
  storageSrc.includes('function restoreX1BoLengthOptions') &&
  (storageSrc.match(/x1BoLengthOptions: state\.x1BoLengthOptions/g) || []).length === 2 &&
  storageSrc.includes('function restoreX1BoWidthOptions') &&
  (storageSrc.match(/x1BoWidthOptions: state\.x1BoWidthOptions/g) || []).length === 2 &&
  cloudSrc.includes('x1BoLengthOptions: state.x1BoLengthOptions') &&
  cloudSrc.includes('x1BoLengthOptions: obj.x1BoLengthOptions') &&
  cloudSrc.includes('if (remote.x1BoLengthOptions)') &&
  cloudSrc.includes('if (data.x1BoLengthOptions)') &&
  cloudSrc.includes('STORAGE_KEY_X1_BO_LENGTHS, JSON.stringify(state.x1BoLengthOptions') &&
  cloudSrc.includes('x1BoWidthOptions: state.x1BoWidthOptions') &&
  cloudSrc.includes('x1BoWidthOptions: obj.x1BoWidthOptions') &&
  cloudSrc.includes('if (remote.x1BoWidthOptions)') &&
  cloudSrc.includes('if (data.x1BoWidthOptions)') &&
  cloudSrc.includes('STORAGE_KEY_X1_BO_WIDTHS, JSON.stringify(state.x1BoWidthOptions') &&
  historySrc.includes('x1BoLengthOptions:') && historySrc.includes('x1BoWidthOptions:') &&
  mainSrc.includes('loadX1BoLengthOptions()') && mainSrc.includes('loadX1BoWidthOptions()'));
check('A8: bản rộng có trong nhật ký và Excel', x2Src.includes('Bản rộng (ly)') &&
  exportSrc.includes('Bản Rộng (ly)') && exportSrc.includes('(d.widths || []).join'));
check('A9: sw.js cache v384', swSrc.includes('nha-may-ngoc-son-v384'));
check('A10: test nằm trong chuỗi npm test', read('../package.json').includes('tests/xuong1-bo-lengths.test.mjs'));

// ─── B. DANH MỤC GỢI Ý + PICKER ─────────────────────────────────────
console.log('--- B. DANH MỤC + PICKER ---');
check('B1: mặc định đủ 11 chiều dài',
  x1.x1BoLengthAll().join(',') === '50,60,65,70,75,80,87,90,95,100,105');
check('B1a: danh mục bản rộng mặc định 11 ly và 15 ly', x1.x1BoWidthAll().join(',') === '11,15');
storeBacking.delete(STORAGE_KEY_X1_BO_LENGTHS);
x1.loadX1BoLengthOptions();
check('B2: load khi chưa có key → options rỗng', Array.isArray(state.x1BoLengthOptions) && state.x1BoLengthOptions.length === 0);
state.x1BoLengthOptions = [120];
x1.saveX1BoLengthOptions();
check('B3: save ghi localStorage đúng key', JSON.parse(localStorage.getItem(STORAGE_KEY_X1_BO_LENGTHS) || '[]').includes(120));
x1.loadX1BoLengthOptions();
check('B4: load lại đọc được + hợp nhất với 11 mặc định (12 giá trị)',
  x1.x1BoLengthAll().includes(120) && x1.x1BoLengthAll().includes(50) && x1.x1BoLengthAll().length === 12);
g('x1-bo-len-new').value = '135';
x1.x1BoLengthAdd();
check('B5: Thêm 135 → có trong all + đã lưu options',
  x1.x1BoLengthAll().includes(135) && JSON.parse(localStorage.getItem(STORAGE_KEY_X1_BO_LENGTHS)).includes(135));
g('x1-bo-len-new').value = '5';
x1.x1BoLengthAdd();
check('B6: nhập sai (5 mm) bị chặn, không thêm', !x1.x1BoLengthAll().includes(5));
state.x1BoWidthOptions = [];
storeBacking.delete(STORAGE_KEY_X1_BO_WIDTHS);
x1.loadX1BoWidthOptions();
check('B7: load bản rộng khi chưa có key → options rỗng',
  Array.isArray(state.x1BoWidthOptions) && state.x1BoWidthOptions.length === 0);
state.x1BoWidthOptions = [13];
x1.saveX1BoWidthOptions();
x1.loadX1BoWidthOptions();
check('B8: bản rộng tùy chỉnh được lưu và gộp với mặc định',
  x1.x1BoWidthAll().join(',') === '11,13,15' &&
  JSON.parse(localStorage.getItem(STORAGE_KEY_X1_BO_WIDTHS)).includes(13));
g('x1-bo-width-new').value = '17';
x1.x1BoWidthAdd();
check('B9: Thêm 17 ly lưu vào danh mục dùng lại và tự chọn',
  x1.x1BoWidthAll().join(',') === '11,13,15,17' &&
  g('x1-bo-widths-btn').innerHTML.includes('1 bản rộng'));
g('x1-bo-width-new').value = '0';
x1.x1BoWidthAdd();
check('B10: bản rộng không dương bị chặn', !x1.x1BoWidthAll().includes(0));
x1.x1BoWidthToggle(15, true);
x1.renderX1BoWidthsPicker();
check('B11: bộ chọn nhiều bản rộng cập nhật số lựa chọn', g('x1-bo-widths-btn').innerHTML.includes('2 bản rộng'));
x1.x1BoWidthsLoadFromRec({ widths: [15, 11, 15] });
check('B12: nạp bản rộng theo lượt chuẩn hóa và sắp xếp',
  g('x1-bo-widths-btn').innerHTML.includes('2 bản rộng') &&
  JSON.stringify(x1.x1BoWidthsOfRec({ widths: [15, 11, 15] })) === '[11,15]');
x1.x1BoLengthsResetDefault();
x1.x1BoLengthToggle(80, false);
x1.renderX1BoLengthsPicker();
check('B7: reset về 11 loại rồi bỏ tick 80 → nút hiện "10 loại"',
  g('x1-bo-lengths-btn').innerHTML.includes('10 loại'));
x1.x1BoLengthToggle(80, true);

// ─── C. LƯU THEO TỪNG LÔ Ở THẺ BỔ ──────────────────────────────────
console.log('--- C. LƯU THEO LÔ (thẻ Bổ) ---');
state.xuong1CatMatRecords = [
  { id: 'cm-1', locOngId: '', date: '2026-11-02', qtyIn: 100, qtyOk: 80, qtyLoai: 20,
    srcType: 'Vầu/nứa', srcSupplier: 'Nhà Tế', srcDate: '2026-11-01', createdAt: '2026-11-02T02:00:00.000Z' }
];
state.xuong1BoRecords = [];
state.x1BoEditId = null;
// chỉ tick 50 + 80
x1.x1BoLengthsResetDefault();
x1.X1_BO_LENGTH_DEFAULTS.forEach(v => { if (v !== 50 && v !== 80) x1.x1BoLengthToggle(v, false); });
x1.x1BoWidthsLoadFromRec({ widths: [] });
x1.x1BoWidthToggle(11, true);
x1.x1BoWidthToggle(15, true);
x1.renderX1ChainCard(spBO); // vẽ lại thẻ (giả lập đồng bộ mây) — KHÔNG được reset tick
check('C1: render lại thẻ KHÔNG reset tick đang chọn (vẫn 2 loại)',
  g('x1-bo-lengths-btn').innerHTML.includes('2 loại'));
// thẻ Bổ gom nguồn theo NHÓM lô → ô chọn mang id của NHÓM (fillX1ChainOptions tự chọn đầu)
x1.fillX1ChainOptions(spBO);
check('C1a: ô chọn lô hiển thị tồn hiện tại / tổng khối lượng nguồn ban đầu',
  g('x1-bo-src').innerHTML.includes('Tồn 80/80 kg'));
g('x1-bo-date').value = '2026-11-03';
g('x1-bo-in').value = '60';
x1.handleX1ChainSubmit(spBO, { preventDefault() {} });
const bo1 = state.xuong1BoRecords[0];
check('C2: lưu chiều dài và nhiều bản rộng theo từng lượt Bổ',
  !!bo1 && JSON.stringify(bo1.lengths) === '[50,80]' && JSON.stringify(bo1.widths) === '[11,15]');
check('C2a: KL Bổ Đạt tự bằng KL đem bổ, KL loại tự bằng 0',
  bo1.qtyIn === 60 && bo1.qtyOk === 60 && bo1.qtyLoai === 0);
// chặn khi không tick gì
x1.X1_BO_LENGTH_DEFAULTS.forEach(v => x1.x1BoLengthToggle(v, false));
const nBefore = state.xuong1BoRecords.length;
x1.fillX1ChainOptions(spBO);
g('x1-bo-date').value = '2026-11-04';
g('x1-bo-in').value = '10';
x1.handleX1ChainSubmit(spBO, { preventDefault() {} });
// tick rỗng (chưa đụng picker) → fallback về 11 mặc định thay vì chặn nhập liệu
check('C3: tick rỗng → fallback lưu 11 chiều dài mặc định',
  state.xuong1BoRecords.length === nBefore + 1 &&
  state.xuong1BoRecords[nBefore].lengths.length === 11);
check('C3a: Bản rộng là tùy chọn, lượt không chọn nào lưu mảng rỗng',
  JSON.stringify(state.xuong1BoRecords[nBefore].widths) === '[]');
// sửa lượt: nạp lại tick từ record rồi thêm 95
x1.editX1Chain(spBO, bo1.id);
check('C4: sửa lượt nạp lại chiều dài và bản rộng đã chọn',
  g('x1-bo-lengths-btn').innerHTML.includes('2 loại') &&
  g('x1-bo-widths-btn').innerHTML.includes('2 bản rộng'));
x1.x1BoLengthToggle(95, true);
x1.x1BoWidthToggle(13, true);
x1.fillX1ChainOptions(spBO);
g('x1-bo-date').value = '2026-11-03';
g('x1-bo-in').value = '60';
x1.handleX1ChainSubmit(spBO, { preventDefault() {} });
check('C5: sửa lượt cập nhật chiều dài/bản rộng trên đúng bản ghi cũ',
  state.xuong1BoRecords.length === 2 && JSON.stringify(bo1.lengths) === '[50,80,95]' &&
  JSON.stringify(bo1.widths) === '[11,13,15]');
bo1.note = 'Ghi chú lịch sử cũ';
const getById = document.getElementById.bind(document);
document.getElementById = id => id === 'x1-bo-note' ? null : getById(id);
x1.editX1Chain(spBO, bo1.id);
g('x1-bo-in').value = '60';
x1.handleX1ChainSubmit(spBO, { preventDefault() {} });
document.getElementById = getById;
check('C5a: sửa bản ghi cũ không làm mất ghi chú lịch sử đã ẩn khỏi form', bo1.note === 'Ghi chú lịch sử cũ');
check('C6: bản ghi cũ không có lengths → fallback toàn bộ danh mục',
  x1.x1BoLengthsOfRec({ id: 'old' }).length === x1.x1BoLengthAll().length);
check('C7: x1BoLengthsOfRec chuẩn hoá + sắp xếp', JSON.stringify(x1.x1BoLengthsOfRec({ lengths: [95, 50, 80] })) === '[50,80,95]');
check('C8: x1BoWidthsOfRec chuẩn hóa + sắp xếp', JSON.stringify(x1.x1BoWidthsOfRec({ widths: [15, 11, 15] })) === '[11,15]');

// ─── D. ĐIỀU HƯỚNG CÔNG ĐOẠN ──────────────────────────────────────
console.log('--- D. ĐIỀU HƯỚNG LÙI/TIẾN ---');
const boCountBeforeNav = state.xuong1BoRecords.length;
g('x1-bo-in').value = '777';
x1.x1BoNavigateStage(-1);
check('D1: Lùi mở Cắt Mắt, không tự lưu và giữ số đang nhập',
  state.x2OpenCardId === 'x1-cat-mat-card' &&
  state.xuong1BoRecords.length === boCountBeforeNav &&
  g('x1-bo-in').value === '777');
x1.x1BoNavigateStage(1);
check('D2: Tiến mở Phơi Sấy mà không tự lưu',
  state.x2OpenCardId === 'x1-phoi-say-card' && state.xuong1BoRecords.length === boCountBeforeNav);

// ─── E. TRUY CHUỖI LÔ NGUỒN SANG LỌC THANH ──────────────────────────
console.log('--- E. LỌC THANH/BÓ XÔ đọc kích thước theo lô nguồn ---');
state.xuong1PhoiSayRecords = [
  { id: 'ps-1', boId: bo1.id, date: '2026-11-03', qtyIn: 200, qtyOk: 200, qtyLoai: 0,
    srcType: 'Vầu/nứa', srcSupplier: 'Nhà Tế', srcDate: '2026-11-03', createdAt: '2026-11-03T02:00:00.000Z' }
];
const boLtSource = {
  id: 'bo-lt', date: '2026-11-03', qtyIn: 1000, qtyOk: 1000, qtyLoai: 0,
  lengths: [50, 80], widths: [11, 15], srcType: 'Vầu thanh không cạo',
  srcSupplier: 'Nhà Tế', srcDate: '2026-11-02'
};
state.xuong1BoRecords.push(boLtSource);
state.xuong1LocThanhRecords = [];
state.x1LocThanhEditId = null;
g('x1-loc-thanh-src').value = 'bo-lt';
check('D1: x1BoLengthsOfPhoiSay truy đúng sang lô Bổ nguồn', JSON.stringify(x1.x1BoLengthsOfPhoiSay('ps-1')) === '[50,80,95]');
check('D2: nguồn mất link → fallback danh mục gợi ý', x1.x1BoLengthsOfPhoiSay('ps-khong-co').length === x1.x1BoLengthAll().length);
check('D2a: Lọc Thanh lấy nguồn trực tiếp từ Bổ Xưởng 1 và đúng bản rộng × chiều dài',
  spLT.srcField === 'boId' && spLT.srcRecords().includes(boLtSource) &&
  JSON.stringify(x1.x1LocThanhSourceDimensions().widths) === '[11,15]');
g('x1-loc-thanh-src').value = 'bo-lt';
check('D2b: nguồn Bổ còn 1.000 kg trước lượt Phơi Sấy/Lọc Thanh', x1.x1ChainRemainingOf(spLT, boLtSource, null) === 1000);
x1.fillX1ChainOptions(spLT);
check('D2c: lượt mới chọn nguồn Bổ, không đưa lượt Phơi Sấy cũ vào danh sách',
  g('x1-loc-thanh-src').innerHTML.includes('bo-lt') && !g('x1-loc-thanh-src').innerHTML.includes('ps-1'));
g('x1-loc-thanh-src').value = 'ps-1';
x1.renderX1LocThanhLengthRows([{ len: 50, kg: 30 }, { len: 80, kg: 25 }]);
const ltHtml = g('x1-loc-thanh-length-rows').innerHTML;
check('D3: bảng chọn dài chỉ hiện đúng chiều dài của lô nguồn (50/80/95, KHÔNG có 60)',
  ltHtml.includes('value="50"') && ltHtml.includes('value="95"') && !ltHtml.includes('value="60"'));
// 2 chế độ
g('x1-loc-thanh-mode').value = 'bo-xo';
x1.syncX1LocThanhMode();
check('D4: bó xô → ẨN bảng dài, HIỆN hàng KL thành phẩm/loại',
  g('x1-loc-thanh-length-wrap').hidden === true && g('x1-loc-thanh-okrow').hidden === false);
g('x1-loc-thanh-mode').value = 'loc-thanh';
x1.syncX1LocThanhMode();
check('D5: lọc thanh → HIỆN bảng dài, ẨN hàng KL tay',
  g('x1-loc-thanh-length-wrap').hidden === false && g('x1-loc-thanh-okrow').hidden === true);

// ─── E. SUBMIT LỌC THANH — GIAO DIỆN DÒNG KG (BẢN CŨ, giữ tương thích) ──
console.log('--- E. LƯU LƯỢT LỌC THANH/BÓ XÔ (bản cũ dạng kg) ---');
const ltBox = g('x1-loc-thanh-length-rows');
const fakeRow = (len, kg) => ({ querySelector: (sel) => sel.includes('lt-len') ? { value: String(len) } : { value: String(kg) } });
// E1: lọc thanh bản cũ — qtyOk tự = tổng các dòng kg (renderX1LocThanhLengthRows chuyển về giao diện cũ)
x1.renderX1LocThanhLengthRows([]);
ltBox.querySelectorAll = () => [fakeRow(50, 30), fakeRow(80, 20)];
g('x1-loc-thanh-mode').value = 'loc-thanh';
g('x1-loc-thanh-src').value = 'ps-1';
g('x1-loc-thanh-date').value = '2026-11-04';
g('x1-loc-thanh-in').value = '55';
g('x1-loc-thanh-ok').value = ''; g('x1-loc-thanh-loai').value = '5';
x1.handleX1ChainSubmit(spLT, { preventDefault() {} });
const lt1 = state.xuong1LocThanhRecords[0];
check('E1: bản cũ — lọc thanh lưu mode + lengthRows kg + qtyOk = tổng 50 kg',
  !!lt1 && lt1.mode === 'loc-thanh' && lt1.qtyOk === 50 &&
  JSON.stringify(lt1.lengthRows) === '[{"len":50,"kg":30},{"len":80,"kg":20}]' && lt1.matrixRows === null);
// E2: tổng vượt KL vào → chặn
ltBox.querySelectorAll = () => [fakeRow(50, 100)];
const nLT = state.xuong1LocThanhRecords.length;
g('x1-loc-thanh-mode').value = 'loc-thanh'; // reset form về bó xô nên phải set lại
g('x1-loc-thanh-src').value = 'ps-1'; g('x1-loc-thanh-date').value = '2026-11-05';
g('x1-loc-thanh-in').value = '55'; g('x1-loc-thanh-loai').value = '0';
x1.handleX1ChainSubmit(spLT, { preventDefault() {} });
check('E2: tổng KL các chiều dài (100) vượt KL vào (60) → bị CHẶN', state.xuong1LocThanhRecords.length === nLT);
// E3: bó xô — chỉ kg, lengthRows null
g('x1-loc-thanh-mode').value = 'bo-xo';
ltBox.querySelectorAll = () => [];
g('x1-loc-thanh-src').value = 'ps-1'; g('x1-loc-thanh-date').value = '2026-11-06';
g('x1-loc-thanh-in').value = '40'; g('x1-loc-thanh-ok').value = '35'; g('x1-loc-thanh-loai').value = '5';
x1.handleX1ChainSubmit(spLT, { preventDefault() {} });
const lt2 = state.xuong1LocThanhRecords.find(r => r.date === '2026-11-06');
check('E3: bó xô lưu mode=bo-xo, lengthRows=null, qtyOk nhập tay 35',
  !!lt2 && lt2.mode === 'bo-xo' && lt2.lengthRows === null && lt2.qtyOk === 35);
// E4: sửa bó xô nạp lại mode
x1.editX1Chain(spLT, lt2.id);
check('E4: sửa lượt bó xô nạp lại mode', g('x1-loc-thanh-mode').value === 'bo-xo');
x1.resetX1ChainForm(spLT);
// ─── M. MA TRẬN CHỌN THANH — bản rộng × chiều dài × kg từng loại ──
console.log('--- M. MA TRẬN BẢN RỘNG × CHIỀU DÀI × PHÂN LOẠI VẦU ---');
check('M0: X1_LT_CLASSES đủ 8 phân loại theo bảng Excel của xưởng (KHÁC NAN_CLASSES Xưởng 2)',
  x1.X1_LT_CLASSES.length === 8 &&
  ['A', 'A1', 'd6', 'd13', 'bau', 'nonbt', 'bnont', 'loai'].every((id, i) => x1.X1_LT_CLASSES[i].id === id) &&
  x1.X1_LT_CLASSES[4].label === 'Cắt đầu' && x1.X1_LT_CLASSES[5].label === 'Vầu non bánh tẻ');
// M1: chế độ Lọc thanh (lượt MỚI) → ma trận TỰ SINH theo bản rộng × chiều dài từ lô Bổ
state.x1LocThanhEditId = null;
g('x1-loc-thanh-mode').value = 'loc-thanh';
g('x1-loc-thanh-src').value = 'bo-lt';
x1.syncX1LocThanhMode();
const mxHtml = g('x1-loc-thanh-length-rows').innerHTML;
check('M1: tự sinh 4 tổ hợp bản rộng × chiều dài + 8 cột phân loại khối lượng',
  mxHtml.includes('11 ly') && mxHtml.includes('15 ly') && mxHtml.includes('50 mm') && mxHtml.includes('80 mm') &&
  mxHtml.includes('data-x1-lt-c="loai"') && mxHtml.includes('Cắt đầu') &&
  mxHtml.includes('Bánh tẻ') && mxHtml.includes('B non tóp') && mxHtml.includes('Khối lượng (kg)'));
check('M1b: mỗi ô kg mang thuộc tính bản rộng + chiều dài + phân loại',
  mxHtml.includes('data-x1-lt-c="A"') && mxHtml.includes('data-x1-lt-width="11"') &&
  mxHtml.includes('data-x1-lt-len="50"') && mxHtml.includes('step="any"'));
// M2: đọc kg theo tổ hợp kích thước và từng phân loại.
const fakeCell = (width, len, cls, v) => ({
  getAttribute: k => k === 'data-x1-lt-width' ? String(width)
    : k === 'data-x1-lt-len' ? String(len)
      : k === 'data-x1-lt-c' ? cls : null,
  value: v
});
ltBox.querySelectorAll = (sel) => sel === 'input[data-x1-lt-c]'
  ? [fakeCell(11, 50, 'A', 15), fakeCell(11, 50, 'A1', 20), fakeCell(11, 50, 'd6', 2),
     fakeCell(11, 50, 'd13', 3), fakeCell(11, 50, 'bnont', 1),
     fakeCell(15, 80, 'A', 8), fakeCell(15, 80, 'loai', 2)]
  : [];
const mRead = x1.x1LtMatrixRead();
check('M2: x1LtMatrixRead gộp đúng kg — đạt 49 · Loại 2 · Tổng 51 · 11ly × 50mm tổng 41kg',
  !!mRead && mRead.unit === 'kg' && mRead.ok === 49 && mRead.loai === 2 && mRead.total === 51 &&
  mRead.rows.length === 2 && mRead.rows[0].width === 11 && mRead.rows[0].len === 50 &&
  mRead.rows[0].weights.A === 15 && mRead.rows[0].total === 41);
// M3: lưu lượt ma trận kg; không cho tổng đầu ra vượt KL đầu vào.
g('x1-loc-thanh-mode').value = 'loc-thanh';
g('x1-loc-thanh-src').value = 'bo-lt';
g('x1-loc-thanh-date').value = '2026-11-07';
g('x1-loc-thanh-in').value = '55';
x1.handleX1ChainSubmit(spLT, { preventDefault() {} });
const ltMx = state.xuong1LocThanhRecords.find(r => r.date === '2026-11-07');
check('M3: lưu ma trận kg → bản rộng/chiều dài + qtyOk 49kg · qtyLoai 2kg',
  !!ltMx && ltMx.mode === 'loc-thanh' && Array.isArray(ltMx.matrixRows) && ltMx.qtyOk === 49 &&
  ltMx.qtyLoai === 2 && ltMx.lengthRows === null && ltMx.matrixRows[0].width === 11 &&
  ltMx.matrixRows[0].weights.A === 15 && ltMx.matrixRows[0].total === 41);
check('M3a: lưu lượt mới trừ tồn Bổ theo KL đầu vào; sửa lượt được hoàn lại phần đang sửa',
  x1.x1ChainRemainingOf(spLT, boLtSource, null) === 945 &&
  x1.x1ChainRemainingOf(spLT, boLtSource, ltMx.id) === 1000);
const nBeforeOverweight = state.xuong1LocThanhRecords.length;
ltBox.querySelectorAll = sel => sel === 'input[data-x1-lt-c]' ? [fakeCell(11, 50, 'A', 56)] : [];
g('x1-loc-thanh-mode').value = 'loc-thanh';
g('x1-loc-thanh-src').value = 'bo-lt';
g('x1-loc-thanh-date').value = '2026-11-09';
g('x1-loc-thanh-in').value = '55';
x1.handleX1ChainSubmit(spLT, { preventDefault() {} });
check('M3b: khối lượng ma trận vượt KL đem lọc bị chặn', state.xuong1LocThanhRecords.length === nBeforeOverweight);
// M4: ma trận trống → chặn
ltBox.querySelectorAll = () => [];
const nBeforeMx = state.xuong1LocThanhRecords.length;
g('x1-loc-thanh-mode').value = 'loc-thanh';
g('x1-loc-thanh-src').value = 'ps-1'; g('x1-loc-thanh-date').value = '2026-11-08';
g('x1-loc-thanh-in').value = '55';
x1.handleX1ChainSubmit(spLT, { preventDefault() {} });
check('M4: ma trận trống (không nhập số nào) → bị CHẶN', state.xuong1LocThanhRecords.length === nBeforeMx);
// M5: sửa lượt ma trận → điền sẵn kg theo đúng tổ hợp kích thước
x1.editX1Chain(spLT, ltMx.id);
const mxEditHtml = g('x1-loc-thanh-length-rows').innerHTML;
check('M5: sửa lượt ma trận điền sẵn kg (15/20/2) theo đúng bản rộng × chiều dài',
  mxEditHtml.includes('value="15"') && mxEditHtml.includes('value="20"') && mxEditHtml.includes('value="2"') &&
  mxEditHtml.includes('data-x1-lt-width="11"'));
check('M5a: ô ma trận có nhãn phân loại cho giao diện thẻ điện thoại',
  mxEditHtml.includes('data-label="A"') && mxEditHtml.includes('data-label="A1"') &&
  mxEditHtml.includes('data-label="6mm"'));
x1.resetX1ChainForm(spLT);
// M6: lịch sử — mini ma trận + nhãn Lọc thanh
x1.renderX1ChainCard(spLT);
const histHtml = g('x1-loc-thanh-day-cards').innerHTML;
check('M6: lịch sử ghi loại nguyên liệu và bảng kg có bản rộng × chiều dài',
  histHtml.includes('Loại Nguyên Liệu') && histHtml.includes('Vầu thanh không cạo') &&
  histHtml.includes('x1-lt-mini') && histHtml.includes('11 ly') && histHtml.includes('50 mm') &&
  histHtml.includes('Khối lượng (kg)') && histHtml.includes('B non tóp') && histHtml.includes('Lọc thanh') &&
  histHtml.includes('x1-lt-mobile-entry') && histHtml.includes('Chi tiết phân loại'));
// M7: kg matrix ratio valid and dimensions follow the selected Bổ source.
check('M7: x1ChainDisplay có tỷ lệ kg + bản rộng/chiều dài từ Bổ',
  x1.x1ChainDisplay(spLT, ltMx).ratio === (49 / 55 * 100) &&
  x1.x1ChainDisplay(spLT, ltMx).lengths.join(',') === '50,80' &&
  x1.x1ChainDisplay(spLT, ltMx).widths.join(',') === '11,15');
// M8: xuất Excel ma trận với Loại Nguyên Liệu, kích thước và kg theo phân loại
const x2exp = await import('../js/export-xlsx.js');
const exMx = x2exp.buildX2ExportData('x1locthanh', {});
const exMxStr = exMx ? JSON.stringify(exMx.aoa || []) : '';
check('M8: xuất Excel có cột bản rộng/dài/phân loại/tổng/đơn vị và kg',
  !!exMx && exMxStr.includes('Loại Nguyên Liệu') && exMxStr.includes('Bản Rộng (ly)') &&
  exMxStr.includes('Kích Thước Dài (mm)') && exMxStr.includes('Vầu 6mm') &&
  exMxStr.includes('Tổng') && exMxStr.includes('50 mm') && exMxStr.includes('15') && exMxStr.includes('"kg"'));
// M9: đổi nguồn khi đang nhập ma trận → GIỮ số đã nhập cho chiều dài còn có ở nguồn mới
g('x1-loc-thanh-mode').value = 'loc-thanh';
g('x1-loc-thanh-src').value = 'bo-lt';
x1.syncX1LocThanhMode();
ltBox.querySelectorAll = (sel) => sel === 'input[data-x1-lt-c]'
  ? [fakeCell(11, 50, 'A', 25), fakeCell(15, 80, 'A1', 15)] : [];
x1.x1LtOnSrcChange(); // cùng nguồn — giữ nguyên số đã nhập
check('M9: đổi nguồn (cùng nguồn) giữ số đã nhập trong ma trận',
  x1.x1LtMatrixRead() !== null && x1.x1LtMatrixRead().rows.length === 2 &&
  x1.x1LtMatrixRead().rows[0].weights.A === 25 && x1.x1LtMatrixRead().rows[1].weights.A1 === 15);

// Dữ liệu ma trận số lượng cũ vẫn xem/sửa được mà không bị đổi nhãn thành kg.
const legacyMatrix = {
  id: 'lt-matrix-old', date: '2026-11-08', phoiSayId: 'ps-1', boId: '',
  qtyIn: 40, qtyOk: 7, qtyLoai: 2, mode: 'loc-thanh',
  matrixRows: [{ len: 50, counts: { A: 5, A1: 2, loai: 2 }, total: 9 }]
};
state.xuong1LocThanhRecords.push(legacyMatrix);
x1.editX1Chain(spLT, legacyMatrix.id);
const legacyCell = (len, cls, value) => ({
  getAttribute: k => k === 'data-x1-lt-len' ? String(len) : k === 'data-x1-lt-c' ? cls : null,
  value
});
ltBox.querySelectorAll = sel => sel === 'input[data-x1-lt-c]'
  ? [legacyCell(50, 'A', 5), legacyCell(50, 'A1', 2), legacyCell(50, 'loai', 2)] : [];
check('M10: ma trận số lượng cũ vẫn hiện nhãn riêng và sửa được',
  g('x1-loc-thanh-length-rows').innerHTML.includes('Số lượng (dữ liệu cũ)') &&
  g('x1-loc-thanh-length-rows').innerHTML.includes('value="5"') &&
  x1.x1LtMatrixRead().unit === 'count' && x1.x1ChainDisplay(spLT, legacyMatrix).ratio === null);

// ─── F. HIỂN THỊ TRONG BẢNG LỊCH SỬ ────────────────────────────────
console.log('--- F. BẢNG LỊCH SỬ ---');
x1.renderX1ChainCard(spBO);
check('F1: bảng lịch sử Bổ hiển thị chiều dài và bản rộng của từng lượt',
  g('x1-bo-day-cards').innerHTML.includes('Chiều dài (mm)') &&
  g('x1-bo-day-cards').innerHTML.includes('Bản rộng (ly)') &&
  g('x1-bo-day-cards').innerHTML.includes('50 · 80 · 95 mm') &&
  g('x1-bo-day-cards').innerHTML.includes('11 · 13 · 15 ly'));
x1.renderX1ChainCard(spLT);
check('F2: bảng lịch sử Lọc Thanh có cột "Hình thức" + nhãn Bó xô/Lọc thanh',
  g('x1-loc-thanh-day-cards').innerHTML.includes('Hình thức') &&
  g('x1-loc-thanh-day-cards').innerHTML.includes('Bó xô') &&
  g('x1-loc-thanh-day-cards').innerHTML.includes('50mm: 30kg'));

console.log('─── KẾT QUẢ: ' + pass + ' PASS / ' + fail + ' FAIL ───');
if (fail > 0) process.exitCode = 1;
