// tests/xuong1-say-sinh-lot.test.mjs — MÃ LÔ · ĐẾM NGÀY · CẢNH BÁO "ĐẠT NGÀY"
// Thẻ Sấy Sinh (Xưởng 1) — 19/10/2026
//  · Mã lô = <V|N|chữ đầu><yy><mm><dd><NNN> (số thứ tự 3 chữ số theo THÁNG)
//  · Lô cũ chưa có mã được cấp 1 lần (idempotent), sửa lô KHÔNG đổi mã
//  · Đếm ngày tới HÔM NAY · đạt ngày khi đủ `readyDays` VÀ còn chưa Bốc
//  · Panel xem nhanh: quá hạn lâu nhất trước + nút Tiếp/Trước
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
  Object.defineProperty(el, 'innerHTML', {
    configurable: true,
    get() { return html; },
    set(v) {
      html = String(v == null ? '' : v);
      const vals = [...html.matchAll(/<option[^>]*value="([^"]*)"/g)].map(m => m[1]);
      el.value = vals.length ? vals[0] : '';
    }
  });
  return el;
}
const SELECT_IDS = new Set(['x1-say-sinh-source', 'x1-boc-source']);
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
// SỬA lô: đổi ngày nhưng mã giữ nguyên
state.materialRecords = [{ id: 'mat-v', type: 'Vầu tươi', supplier: 'Tế', location: 'xuong-1', weight: 1000, date: '2026-09-01', createdAt: '2026-09-01T02:00:00.000Z' }];
state.xuong1SaySinhRecords = [rec('edit-me', '2026-09-20', { materialId: 'mat-v', code: 'V260920007', qty: 100 })];
state.x1SaySinhEditId = 'edit-me';
x2.fillX1SaySinhOptions();
document.getElementById('x1-say-sinh-source').value = 'mat-v';
document.getElementById('x1-say-sinh-date').value = '2026-09-25';
document.getElementById('x1-say-sinh-qty').value = '90';
document.getElementById('x1-say-sinh-ready').value = '5';
x2.handleX1SaySinhSubmit({ preventDefault(){} });
const edited = state.xuong1SaySinhRecords.find(r => r.id === 'edit-me');
check('B5: SỬA lô đổi Ngày nhưng MÃ LÔ giữ nguyên + cập nhật Ngày Đạt',
  edited.code === 'V260920007' && edited.readyDays === 5 && edited.date === '2026-09-25');
// XOÁ lô giữa: mã các lô khác không đổi
state.xuong1SaySinhRecords = [
  rec('k1', '2026-09-01', { code: 'V260901001' }),
  rec('k2', '2026-09-02', { code: 'V260902002' }),
  rec('k3', '2026-09-03', { code: 'V260903003' })
];
x2.deleteX1SaySinh('k2');
check('B6: XOÁ lô không đánh lại số (k3 vẫn V260903003)',
  (state.xuong1SaySinhRecords.find(r => r.id === 'k3') || {}).code === 'V260903003');

console.log('--- C. ĐẾM NGÀY + ĐIỀU KIỆN ĐẠT (còn chưa Bốc) ---');
state.xuong1BocRecords = [];
state.xuong1SaySinhRecords = [
  rec('today', isoAgo(0), { qty: 100, readyDays: 3, code: 'V000000001' }),
  rec('d5', isoAgo(5), { qty: 100, readyDays: 3, code: 'V000000002' }),
  rec('d2', isoAgo(4), { qty: 100, code: 'V000000003' })
];
check('C1: hôm nay = 0 ngày · lô 5 ngày trước = 5 ngày',
  x2.x1SsDaysOf(state.xuong1SaySinhRecords[0]) === 0 &&
  x2.x1SsDaysOf(state.xuong1SaySinhRecords[1]) === 5);
check('C2: thiếu readyDays → mặc định 3 ngày', x2.x1SsReadyDaysOf(state.xuong1SaySinhRecords[2]) === 3);
check('C3: đạt ngày khi đủ ngưỡng + còn chưa Bốc',
  x2.x1SsIsReady(state.xuong1SaySinhRecords[1]) === true &&
  x2.x1SsIsReady(state.xuong1SaySinhRecords[0]) === false);
state.xuong1BocRecords.push({ id: 'b-full', saySinhId: 'd5', date: isoAgo(1), qty: 100 });
check('C4: lô đã Bốc HẾT → không còn cảnh báo', x2.x1SsIsReady(state.xuong1SaySinhRecords[1]) === false);
state.xuong1BocRecords = [];
check('C5: danh sách đạt ngày sắp QUÁ HẠN LÂU NHẤT trước',
  x2.x1SsReadyLots().map(r => r.id).join(',') === 'd5,d2' && x2.x1SsReadyCount() === 2);

console.log('--- D. LƯU LÔ MỚI: mã + Ngày Đạt (nhớ theo máy) ---');
state.xuong1BocRecords = [];
state.xuong1SaySinhRecords = [];
state.xuong1CatOngRecords = [];
state.materialRecords = [{ id: 'mat-v', type: 'Vầu tươi', supplier: 'Tế', location: 'xuong-1', weight: 1000, date: '2026-10-01', createdAt: '2026-10-01T02:00:00.000Z' }];
x2.fillX1SaySinhOptions();
document.getElementById('x1-say-sinh-source').value = 'mat-v';
document.getElementById('x1-say-sinh-date').value = '2026-10-19';
document.getElementById('x1-say-sinh-qty').value = '100';
document.getElementById('x1-say-sinh-ready').value = '4';
x2.handleX1SaySinhSubmit({ preventDefault(){} });
const created = state.xuong1SaySinhRecords[0];
check('D1: lô mới có MÃ V261019001 + readyDays = 4 (ô Ngày Đạt)',
  !!created && created.code === 'V261019001' && created.readyDays === 4);
check('D2: nhớ giá trị Ngày Đạt dùng gần nhất theo máy (localStorage)',
  localStorage.getItem('bamboo_tracker_x1_ss_ready_days_v1') === '4' && x2.x1SsReadyDefaultOf() === 4);
check('D3: form reset nạp lại Ngày Đạt mặc định đã nhớ (4)',
  document.getElementById('x1-say-sinh-ready').value === '4');
x2.editX1SaySinh(created.id);
check('D4: mở SỬA nạp đúng Ngày Đạt của lô', document.getElementById('x1-say-sinh-ready').value === '4');

console.log('--- E. PANEL ĐẠT NGÀY: mở · Tiếp/Trước · Mở thẻ Bốc ---');
state.x1SaySinhEditId = null;
state.xuong1SaySinhRecords = [
  rec('r-old', isoAgo(10), { qty: 100, readyDays: 2, code: 'V261001001' }),
  rec('r-new', isoAgo(4), { qty: 90, readyDays: 3, code: 'V261002002' }),
  rec('r-not', isoAgo(1), { qty: 80, readyDays: 5, code: 'V261003003' })
];
x2.renderX1SaySinhCard();
const barHtml = document.getElementById('x1-say-sinh-stock-bar').innerHTML;
check('E1: thanh tồn hiện nút cảnh báo "2 lô đã đạt ngày"',
  barHtml.includes('x1-ss-ready-btn') && barHtml.includes('2 lô đã đạt ngày'));
check('E2: thống kê có ô Lô đạt ngày chờ Bốc = 2',
  document.getElementById('x1-say-sinh-stats').innerHTML.includes('2') &&
  document.getElementById('x1-say-sinh-stats').innerHTML.includes('Lô đạt ngày chờ Bốc'));
const table = document.getElementById('x1-say-sinh-day-cards').innerHTML;
check('E3: bảng có cột Mã lô + chip ngày (đạt/quá hạn)',
  table.includes('Mã lô · Ngày sấy') && table.includes('V261001001') &&
  table.includes('x1-ss-day-chip is-over') && table.includes('x1-ss-day-chip is-ready'));
check('E4: chip launcher có "⚠ 2 lô đạt"',
  x2.x1CardCountText('x1-say-sinh-card').includes('⚠ 2 lô đạt'));
x2.x1SsOpenReadyPanel();
const panel = document.getElementById('x1-ss-ready-panel');
check('E5: panel mở, lô QUÁ HẠN LÂU NHẤT trước (r-old, 8 ngày quá hạn)',
  panel.hidden === false && panel.innerHTML.includes('V261001001') && panel.innerHTML.includes('(1/2)'));
x2.x1SsReadyStep(1);
check('E6: bấm Tiếp → sang lô kế (r-new)', panel.innerHTML.includes('V261002002') && panel.innerHTML.includes('(2/2)'));
x2.x1SsReadyStep(1);
check('E7: Tiếp ở lô cuối → QUAY VÒNG về lô đầu', panel.innerHTML.includes('V261001001'));
x2.x1SsReadyStep(-1);
check('E8: Trước ở lô đầu → về lô cuối', panel.innerHTML.includes('V261002002'));
x2.x1SsOpenReadyPanelFor('r-new');
check('E9: bấm chip ngày của 1 lô → panel mở đúng lô đó', panel.innerHTML.includes('V261002002') && panel.innerHTML.includes('(2/2)'));
x2.x1SsCloseReadyPanel();
check('E10: Đóng panel → ẩn', panel.hidden === true);
x2.renderX1BocCard();
const bocSel = document.getElementById('x1-boc-source');
check('E11: ô chọn Bốc hiện [MÃ LÔ] + số ngày + cờ ⚠ cho lô đạt',
  bocSel.innerHTML.includes('[V261001001]') && bocSel.innerHTML.includes('⚠ đạt'));
x2.x1SsOpenBocFor('r-new');
check('E12: "Mở thẻ Bốc" chọn sẵn đúng lô vừa xem', bocSel.value === 'r-new');

console.log('--- F. CẤU TRÚC (index/events/CSS/export/sw) ---');
const idxHtml = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const evSrc = fs.readFileSync(new URL('../js/events.js', import.meta.url), 'utf8');
const cssSrc = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
const expSrc = fs.readFileSync(new URL('../js/export-xlsx.js', import.meta.url), 'utf8');
const swSrc = fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
check('F1: index.html có ô #x1-say-sinh-ready (mặc định 3) + panel #x1-ss-ready-panel (hidden)',
  idxHtml.includes('id="x1-say-sinh-ready"') && idxHtml.includes('id="x1-ss-ready-panel"') &&
  idxHtml.includes('value="3"'));
check('F2: events.js nối nút cảnh báo + panel + chip + ô thống kê',
  evSrc.includes("'x1-ss-ready-btn'") && evSrc.includes("'x1-ss-ready-panel'") &&
  evSrc.includes("'[data-x1-ss-lot]'") && evSrc.includes("'[data-x1-ss-ready-open]'"));
check('F3: styles.css có khối .x1-ss-ready-panel[hidden] + chip .is-over/.is-ready',
  cssSrc.includes('.x1-ss-ready-panel[hidden]') && cssSrc.includes('.x1-ss-day-chip.is-over') &&
  cssSrc.includes('.x1-ss-day-chip.is-ready'));
check('F4: export Excel có cột Mã Lô + Số Ngày + Ngày Đạt + Mã Lô Nguồn',
  expSrc.includes("'Mã Lô'") && expSrc.includes("'Số Ngày'") &&
  expSrc.includes("'Ngày Đạt'") && expSrc.includes("'Mã Lô Nguồn'"));
check('F5: sw.js cache v288', /nha-may-ngoc-son-v301/.test(swSrc));
check('F6: file test này đã nằm trong chuỗi npm test', (pkg.scripts.test || '').includes('xuong1-say-sinh-lot.test.mjs'));

console.log(`\n=== KẾT QUẢ X1 SẤY SINH LOT: ${pass} PASS / ${fail} FAIL ===`);
process.exit(fail > 0 ? 1 : 0);
