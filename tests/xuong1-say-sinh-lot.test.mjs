// tests/xuong1-say-sinh-lot.test.mjs — MÃ LÔ · CHU KỲ · QC · NHẮC LÔ CŨ
import fs from 'node:fs';

function makeEl(id) {
  const el = {
    id: id || '', value: '', checked: false, disabled: false, hidden: false,
    open: true, textContent: '', innerHTML: '', style: {}, dataset: {}, _h: {},
    offsetWidth: 800, offsetHeight: 500,
    classList: { _s: new Set(), add(c){ this._s.add(c); }, remove(c){ this._s.delete(c); }, toggle(c, f){ if (f === undefined) f = this._s.has(c); if (f) this._s.add(c); else this._s.delete(c); return f; }, contains(c){ return this._s.has(c); } },
    addEventListener(t, f) { (el._h[t] = el._h[t] || []).push(f); },
    appendChild(c) { return c; }, removeChild(c) { return c; },
    remove(){}, setAttribute(){}, removeAttribute(){}, getAttribute: () => null,
    querySelector: () => makeEl(), querySelectorAll: () => [],
    closest: () => null, matches: () => false, scrollIntoView(){}, focus(){}, click(){},
    getContext: () => ({ measureText: () => ({ width: 10 }), createLinearGradient: () => ({ addColorStop(){} }), createRadialGradient: () => ({ addColorStop(){} }), drawImage(){} }),
    getBoundingClientRect: () => ({ top: 0, left: 0, right: 800, bottom: 600, width: 800, height: 600 }),
    reset(){}, animate(){ return { cancel(){} }; }
  };
  return el;
}
function makeSelect(id) {
  const el = makeEl(id);
  let html = '';
  let options = [];
  el.multiple = id === 'x1-say-sinh-source';
  Object.defineProperty(el, 'innerHTML', {
    configurable: true,
    get() { return html; },
    set(v) {
      html = String(v == null ? '' : v);
      const selected = new Set(options.filter(o => o.selected).map(o => o.value));
      options = [...html.matchAll(/<option[^>]*value="([^"]*)"/g)].map(m => ({
        value: m[1], selected: selected.has(m[1])
      }));
      if (!el.multiple && !options.some(o => o.selected) && options.length) options[0].selected = true;
    }
  });
  Object.defineProperty(el, 'options', { get() { return options; } });
  Object.defineProperty(el, 'selectedOptions', { get() { return options.filter(o => o.selected); } });
  Object.defineProperty(el, 'value', {
    get() { return (options.find(o => o.selected) || {}).value || ''; },
    set(value) {
      options.forEach(o => { o.selected = String(o.value) === String(value); });
    }
  });
  if (id === 'x1-say-sinh-qc-status') {
    el.innerHTML = '<option value="pending">Chờ QC</option><option value="pass">Đạt</option><option value="fail">Không đạt</option>';
  }
  return el;
}
const SELECT_IDS = new Set(['x1-say-sinh-source', 'x1-say-sinh-repeat-lot', 'x1-say-sinh-qc-status', 'x1-boc-source']);
const els = new Map();
function elOf(id) { if (!els.has(id)) els.set(id, SELECT_IDS.has(id) ? makeSelect(id) : makeEl(id)); return els.get(id); }
global.document = {
  body: makeEl('body'), head: makeEl('head'), documentElement: makeEl('html'),
  activeElement: null, readyState: 'complete', visibilityState: 'visible',
  getElementById(id) { return elOf(id); },
  createElement: () => makeEl(), createTextNode: (t) => ({ textContent: t }),
  querySelector: () => makeEl(), querySelectorAll: () => [],
  addEventListener(){}, removeEventListener(){}, escapeCSS: (s) => s
};
global.location = { href: 'http://localhost:8080/', origin: 'http://localhost:8080', pathname: '/', search: '', hash: '', reload(){} };
global.history = { replaceState(){}, pushState(){}, back(){}, state: null };
Object.defineProperty(global, 'navigator', { value: { onLine: true, userAgent: 'node-test', language: 'vi' }, configurable: true });
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
global.Chart = class { constructor(c, cfg){ this.ctx=c; this.config=cfg; this.data=(cfg&&cfg.data)||{labels:[],datasets:[]}; } update(){} resize(){} destroy(){} render(){} reset(){} getDatasetMeta(){ return { data: [] }; } };
Chart.register = () => {};
if (!global.URL.createObjectURL) global.URL.createObjectURL = () => 'blob:stub';
if (!global.URL.revokeObjectURL) global.URL.revokeObjectURL = () => {};
global.XLSX = { utils: { book_new: () => ({ SheetNames: [] }), aoa_to_sheet: () => ({}), json_to_sheet: () => ({}), book_append_sheet(){}, encode_cell: () => 'A1', decode_range: () => ({ s: { r: 0, c: 0 }, e: { r: 0, c: 0 } }) }, writeFile(){}, write: () => new ArrayBuffer(8) };
global.fetch = async () => ({ ok: false, status: 0, statusText: 'offline', json: async () => ({}), text: async () => '' });
global.Image = class { set src(_) {} };
global.ResizeObserver = class { observe(){} unobserve(){} disconnect(){} };

let pass = 0, fail = 0;
function check(label, cond) {
  if (cond) { pass++; console.log('PASS ' + label); }
  else { fail++; console.log('FAIL ' + label); }
}
function selectValues(id, values) {
  const sel = document.getElementById(id);
  const selected = new Set(values.map(String));
  sel.options.forEach(o => { o.selected = selected.has(String(o.value)); });
}
function setAllocation(id, qty) {
  document.getElementById(`x1-say-sinh-allocation-${id}`).value = String(qty);
}
const { state } = await import('../js/state.js');
state.currentUser = { username: 'admin', role: 'admin', editTabs: [], allowAdvanced: true };
state.activeView = 'kanban-view';
const x2 = await import('../js/xuong2.js');

const pad = n => String(n).padStart(2, '0');
function isoAgo(n) {
  const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
const rec = (id, date, extra = {}) => Object.assign({
  id, date, qty: 100, srcType: 'Vầu', srcSupplier: 'Tế', createdAt: date + 'T02:00:00.000Z'
}, extra);
state.hrAssignments = [];
state.xuong1BocRecords = [];
state.xuong1CatOngRecords = [];
state.x1CatOngEditId = null;
state.x1SaySinhEditId = null;
state.xuong1SaySinhRecords = [];

console.log('--- A. MÃ LÔ: tiền tố + ngày + số thứ tự 3 chữ số ---');
check('A1: Vầu → V · Nứa → N · loại khác lấy chữ đầu · rỗng → X',
  x2.x1SsPrefixOf('Vầu cây tươi') === 'V' && x2.x1SsPrefixOf('NỨA khô') === 'N' &&
  x2.x1SsPrefixOf('Luồng cây') === 'L' && x2.x1SsPrefixOf('') === 'X');
check('A2: mã lô đầu tháng = V + yymmdd + 001', x2.x1SsMakeCode('2026-10-19', 'Vầu cây') === 'V261019001');
state.xuong1SaySinhRecords = [
  rec('a1', '2026-10-01', { code: 'V261001001' }),
  rec('a2', '2026-10-19', { code: 'V261019002' })
];
check('A3: số thứ tự nối tiếp trong THÁNG (V lô 3)', x2.x1SsMakeCode('2026-10-19', 'Vầu') === 'V261019003');
check('A4: N có dãy RIÊNG (N lô 1) và tháng mới reset về 001',
  x2.x1SsMakeCode('2026-10-19', 'Nứa') === 'N261019001' &&
  x2.x1SsMakeCode('2026-11-02', 'Vầu') === 'V261102001');

console.log('--- B. MIGRATE lô cũ + không đổi mã khi sửa/xoá ---');
state.xuong1SaySinhRecords = [
  rec('old2', '2026-09-12', { qty: 50 }),
  rec('old1', '2026-09-10', { qty: 60 }),
  rec('old3', '2026-09-12', { qty: 70, createdAt: '2026-09-12T05:00:00.000Z' }),
  rec('n1', '2026-09-11', { qty: 40, srcType: 'Nứa' })
];
state.xuong1SaySinhRecords.forEach(r => { delete r.code; });
const migrated = x2.ensureX1SaySinhCodes(false);
const codeOf = id => (state.xuong1SaySinhRecords.find(r => r.id === id) || {}).code;
check('B1: lô cũ được cấp mã theo THỨ TỰ thời gian (old1 → old2 → old3)',
  migrated && codeOf('old1') === 'V260910001' && codeOf('old2') === 'V260912002' && codeOf('old3') === 'V260912003');
check('B2: N có dãy riêng (n1 = N260911001)', codeOf('n1') === 'N260911001');
const snapshot = state.xuong1SaySinhRecords.map(r => r.code).join(',');
x2.ensureX1SaySinhCodes(false);
check('B3: chạy lại KHÔNG đổi mã (idempotent)', state.xuong1SaySinhRecords.map(r => r.code).join(',') === snapshot);
state.xuong1SaySinhRecords.push(rec('dup', '2026-09-15', { code: 'V260910001' }));
x2.ensureX1SaySinhCodes(false);
check('B4: mã TRÙNG được cấp lại (không còn 2 lô cùng mã)',
  codeOf('dup') !== 'V260910001' && state.xuong1SaySinhRecords.filter(r => r.code === 'V260910001').length === 1);
// SỬA lô: đổi chu kỳ/đánh giá QC nhưng mã giữ nguyên
state.materialRecords = [{ id: 'mat-v', type: 'Vầu tươi', supplier: 'Tế', location: 'xuong-1', weight: 1000, date: '2026-09-01', createdAt: '2026-09-01T02:00:00.000Z' }];
state.xuong1SaySinhRecords = [rec('edit-me', '2026-09-20', { materialId: 'mat-v', code: 'V260920007', qty: 100, sulfurQty: 1 })];
x2.fillX1SaySinhOptions();
selectValues('x1-say-sinh-source', ['mat-v']);
setAllocation('mat-v', 90);
document.getElementById('x1-say-sinh-sulfur-qty').value = '2';
document.getElementById('x1-say-sinh-note').value = '';
x2.setX1SaySinhQcStatus('edit-me', 'pass');
x2.editX1SaySinh('edit-me');
document.getElementById('x1-say-sinh-date').value = '2026-09-25';
setAllocation('mat-v', 90);
document.getElementById('x1-say-sinh-sulfur-qty').value = '2';
x2.handleX1SaySinhSubmit({ preventDefault(){} });
const edited = state.xuong1SaySinhRecords.find(r => r.id === 'edit-me');
check('B5: sửa phân bổ/chu kỳ và QC, mã lô giữ nguyên',
  edited.code === 'V260920007' && edited.date === '2026-09-25' &&
  edited.sourceAllocations[0].qty === 90 && edited.cycles[0].sulfurQty === 2 && edited.qcStatus === 'pass');
// XOÁ lô giữa: mã các lô khác không đổi
state.xuong1SaySinhRecords = [
  rec('k1', '2026-09-01', { code: 'V260901001' }),
  rec('k2', '2026-09-02', { code: 'V260902002' }),
  rec('k3', '2026-09-03', { code: 'V260903003' })
];
x2.deleteX1SaySinh('k2');
check('B6: XOÁ lô không đánh lại số (k3 vẫn V260903003)',
  (state.xuong1SaySinhRecords.find(r => r.id === 'k3') || {}).code === 'V260903003');

console.log('--- C. TUỔI LÔ + ƯU TIÊN LÔ CŨ NHẤT ---');
state.xuong1BocRecords = [];
state.xuong1SaySinhRecords = [
  rec('today', isoAgo(0), { qty: 100, code: 'V000000001' }),
  rec('d5', isoAgo(5), { qty: 100, code: 'V000000002', cycles: [{ date: isoAgo(5), sulfurQty: 1 }, { date: isoAgo(4), sulfurQty: 2 }] }),
  rec('d2', isoAgo(4), { qty: 100, code: 'V000000003' })
];
check('C1: hôm nay = 0 ngày · lô 5 ngày trước = 5 ngày',
  x2.x1SsDaysOf(state.xuong1SaySinhRecords[0]) === 0 &&
  x2.x1SsDaysOf(state.xuong1SaySinhRecords[1]) === 5);
check('C2: lô cũ thiếu đánh giá QC được xếp Chờ QC', x2.x1SsQcStatusOf(state.xuong1SaySinhRecords[2]) === 'pending');
check('C3: số lần sấy và lượng lưu huỳnh cộng dồn theo chu kỳ',
  x2.x1SsCyclesOf(state.xuong1SaySinhRecords[1]).length === 2 &&
  x2.x1SaySinhDisplay(state.xuong1SaySinhRecords[1]).sulfurQty === 3);
state.xuong1BocRecords.push({ id: 'b-full', saySinhId: 'd5', date: isoAgo(1), qty: 100 });
check('C4: lô đã Bốc hết được bỏ khỏi danh sách nhắc tồn', !x2.x1SsOldLots().some(r => r.id === 'd5'));
state.xuong1BocRecords = [];
check('C5: danh sách nhắc xếp lô cũ nhất trước; tổng số chu kỳ được đếm',
  x2.x1SsOldLots().map(r => r.id).join(',') === 'd5,d2,today' && x2.x1SsTotalCycleCount() === 4);

console.log('--- D. NHIỀU PHIẾU + CHU KỲ LẶP + QC ---');
state.xuong1BocRecords = [];
state.xuong1SaySinhRecords = [];
state.xuong1CatOngRecords = [];
state.materialRecords = [
  { id: 'mat-v', type: 'Vầu tươi', supplier: 'Tế', location: 'xuong-1', weight: 1000, date: '2026-10-01', createdAt: '2026-10-01T02:00:00.000Z' },
  { id: 'mat-n', type: 'Nứa khô', supplier: 'Lý', location: 'xuong-1', weight: 500, date: '2026-10-02', createdAt: '2026-10-02T02:00:00.000Z' }
];
x2.fillX1SaySinhOptions();
selectValues('x1-say-sinh-source', ['mat-v', 'mat-n']);
x2.x1SaySinhRenderAllocations();
setAllocation('mat-v', 100);
setAllocation('mat-n', 200);
document.getElementById('x1-say-sinh-date').value = '2026-10-19';
document.getElementById('x1-say-sinh-sulfur-qty').value = '3.5';
x2.handleX1SaySinhSubmit({ preventDefault(){} });
const created = state.xuong1SaySinhRecords[0];
check('D1: một lô liên kết nhiều phiếu và giữ phân bổ khối lượng chính xác',
  !!created && created.code === 'V261019001' && created.qty === 300 &&
  created.sourceAllocations.length === 2 &&
  created.sourceAllocations.find(a => a.sourceId === 'mat-v').qty === 100 &&
  created.sourceAllocations.find(a => a.sourceId === 'mat-n').qty === 200);
check('D2: chu kỳ đầu lưu lượng lưu huỳnh và trạng thái QC Chờ QC',
  created.cycles.length === 1 && created.cycles[0].sulfurQty === 3.5 && created.qcStatus === 'pending');
check('D3: số lượng còn lại được trừ chính xác ở từng phiếu',
  x2.x1SaySinhDirectRemainingOf(state.materialRecords[0], null) === 900 &&
  x2.x1SaySinhDirectRemainingOf(state.materialRecords[1], null) === 300);
check('D3b: lịch sử và display thể hiện khối lượng phân bổ của từng phiếu',
  x2.x1SaySinhDisplay(created).sourceSummary.includes('100 kg') &&
  x2.x1SaySinhDisplay(created).sourceSummary.includes('200 kg'));
document.getElementById('x1-say-sinh-repeat-lot').value = created.id;
x2.x1SaySinhSyncLinked(true);
document.getElementById('x1-say-sinh-date').value = '2026-10-20';
document.getElementById('x1-say-sinh-sulfur-qty').value = '1.25';
x2.handleX1SaySinhSubmit({ preventDefault(){} });
check('D4: sấy tiếp bổ sung chu kỳ cùng lô, không đổi mã hoặc trừ lại nguyên liệu',
  created.cycles.length === 2 && created.cycles[1].sulfurQty === 1.25 &&
  created.code === 'V261019001' && created.qty === 300 && created.qcStatus === 'pending' &&
  x2.x1SaySinhDirectRemainingOf(state.materialRecords[0], null) === 900);
check('D4b: chu kỳ mới đưa QC về Chờ QC cho đến khi kiểm tra thủ công',
  x2.setX1SaySinhQcStatus(created.id, 'pass') && created.qcStatus === 'pass');
check('D5: sửa lô nạp đúng phân bổ và đánh giá QC hiện tại',
  (x2.editX1SaySinh(created.id), created.qcStatus === 'pass' &&
   document.getElementById('x1-say-sinh-sulfur-qty').value === '3.5'));

console.log('--- E. CẢNH BÁO LÔ CŨ NHẤT + BỐC ---');
state.x1SaySinhEditId = null;
state.xuong1SaySinhRecords = [
  rec('r-old', isoAgo(10), { qty: 100, code: 'V261001001', cycles: [{ date: isoAgo(10), sulfurQty: 2 }, { date: isoAgo(8), sulfurQty: 1 }] }),
  rec('r-new', isoAgo(4), { qty: 90, code: 'V261002002' }),
  rec('r-not', isoAgo(1), { qty: 80, code: 'V261003003', qcStatus: 'fail' })
];
x2.renderX1SaySinhCard();
const barHtml = document.getElementById('x1-say-sinh-stock-bar').innerHTML;
check('E1: thanh tồn chỉ nhắc số lần sấy và tuổi lô cũ nhất',
  barHtml.includes('4 lần sấy sinh') && barHtml.includes('lô cũ nhất 10 ngày') && !barHtml.includes('đạt ngày'));
check('E2: thống kê hiển thị số lần sấy và ngày của lô cũ nhất',
  document.getElementById('x1-say-sinh-stats').innerHTML.includes('2') &&
  document.getElementById('x1-say-sinh-stats').innerHTML.includes('Ngày lô cũ nhất'));
const table = document.getElementById('x1-say-sinh-day-cards').innerHTML;
check('E3: lịch sử hiển thị chu kỳ, QC thủ công và không dùng nhãn đạt ngày',
  table.includes('Số lần · Lưu huỳnh') && table.includes('Chờ QC') &&
  table.includes('Không đạt') && !table.includes('đạt ngày'));
check('E3b: QC cập nhật trực tiếp trên lô, không cần sửa chu kỳ',
  x2.setX1SaySinhQcStatus('r-new', 'pass') &&
  state.xuong1SaySinhRecords.find(r => r.id === 'r-new').qcStatus === 'pass');
check('E4: chip launcher nhắc lô cũ nhất, không đánh dấu tự động Đạt',
  x2.x1CardCountText('x1-say-sinh-card').includes('lô cũ nhất 10 ngày') &&
  !x2.x1CardCountText('x1-say-sinh-card').includes('lô đạt'));
x2.x1SsOpenOldPanel();
const panel = document.getElementById('x1-ss-ready-panel');
check('E5: panel mở và ưu tiên lô cũ nhất',
  panel.hidden === false && panel.innerHTML.includes('V261001001') &&
  panel.innerHTML.includes('2 lần sấy sinh') && panel.innerHTML.includes('10 ngày'));
x2.x1SsOldStep(1);
check('E6: điều hướng sang lô kế tiếp theo thứ tự ngày', panel.innerHTML.includes('V261002002'));
x2.x1SsOldStep(1);
check('E7: điều hướng tiếp theo vẫn xếp lô cũ trước', panel.innerHTML.includes('V261003003'));
x2.x1SsOldStep(1);
check('E8: điều hướng vòng về lô cũ nhất', panel.innerHTML.includes('V261001001'));
x2.x1SsCloseReadyPanel();
check('E9: Đóng panel → ẩn', panel.hidden === true);
x2.renderX1BocCard();
const bocSel = document.getElementById('x1-boc-source');
check('E10: ô chọn Bốc hiện tuổi lô và trạng thái QC thủ công',
  bocSel.innerHTML.includes('[V261001001]') && bocSel.innerHTML.includes('Chờ QC') &&
  !bocSel.innerHTML.includes('⚠ đạt'));
x2.x1SsOpenBocFor('r-new');
check('E11: "Mở thẻ Bốc" chọn sẵn đúng lô được nhắc', bocSel.value === 'r-new');

console.log('--- F. CẤU TRÚC (index/events/CSS/export/sw) ---');
const idxHtml = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const evSrc = fs.readFileSync(new URL('../js/events.js', import.meta.url), 'utf8');
const cssSrc = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
const expSrc = fs.readFileSync(new URL('../js/export-xlsx.js', import.meta.url), 'utf8');
const swSrc = fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
check('F1: form có chọn nhiều phiếu, phân bổ, lưu huỳnh, QC và lô sấy tiếp',
  idxHtml.includes('id="x1-say-sinh-source" multiple') &&
  idxHtml.includes('id="x1-say-sinh-allocations"') &&
  idxHtml.includes('id="x1-say-sinh-sulfur-qty"') &&
  idxHtml.includes('id="x1-say-sinh-repeat-lot"') &&
  !idxHtml.includes('id="x1-say-sinh-qc-status"') &&
  table.includes('data-x1-say-sinh-qc'));
check('F2: events.js nối chọn nhiều nguồn, chu kỳ sấy lại và cảnh báo lô cũ',
  evSrc.includes("'x1-say-sinh-allocations'") && evSrc.includes("'x1-say-sinh-repeat-lot'") &&
  evSrc.includes("'x1-say-sinh-day-cards', 'change'") &&
  evSrc.includes("'x1-ss-ready-btn'") && evSrc.includes('x1SsOpenOldPanel'));
check('F3: styles.css có kiểu phân bổ, trạng thái QC và panel cảnh báo',
  cssSrc.includes('.x1-ss-allocation-list') && cssSrc.includes('.x1-ss-qc.is-pass') &&
  cssSrc.includes('.x1-ss-ready-panel[hidden]'));
check('F4: export Excel có chu kỳ, lưu huỳnh và đánh giá QC thủ công',
  expSrc.includes("'Số Lần Sấy'") && expSrc.includes("'KL Lưu Huỳnh (kg)'") &&
  expSrc.includes("'Đánh Giá QC'") && expSrc.includes("'Phiếu Đầu Vào / Phân Bổ'") &&
  !expSrc.includes("'Ngày Đạt'"));
check('F5: sw.js cache version bumped', /nha-may-ngoc-son-v308/.test(swSrc));
check('F6: file test này đã nằm trong chuỗi npm test', (pkg.scripts.test || '').includes('xuong1-say-sinh-lot.test.mjs'));

console.log(`\n=== KẾT QUẢ X1 SẤY SINH LOT: ${pass} PASS / ${fail} FAIL ===`);
process.exit(fail > 0 ? 1 : 0);
