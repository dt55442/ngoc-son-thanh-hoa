// tests/xuong1.test.mjs — Kiểm thử TAB "CÔNG ĐOẠN SX" với 2 XƯỞNG RIÊNG BIỆT:
// ① CÔNG TẮC chuyển Xưởng 1 ⇄ Xưởng 2 (nhớ theo máy)
// ② TÁCH QUYỀN x1 / x2 (migrate user cũ chỉ có 'kanban')
// 3 THẺ CÔNG ĐOẠN XƯỞNG 1: Cắt Ống · Sấy Sinh · Bốc — chuỗi liên kết
// (lô NL X1 → Cắt Ống → Sấy Sinh → Bốc), chặn vượt phần còn lại, định mức
// kg/h, người + giờ HC/TC từ bộ phận "Xưởng 1", nối state/storage/cloud/
// history/main/capacity.
'use strict';
import fs from 'node:fs';

// ─── Stubs môi trường (giống xuong2-boc-luong.test.mjs) ────────────
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
    // THEO DÕI attribute để test được ẩn/hiện khối Xưởng 1 / Xưởng 2
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

// ─── Nguồn HTML/CSS/JS đọc từ file ────────────────────────────────
const idxHtml = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const stylesCss = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
const eventsSrc = fs.readFileSync(new URL('../js/events.js', import.meta.url), 'utf8');
const mainSrc = fs.readFileSync(new URL('../js/main.js', import.meta.url), 'utf8');
const storageSrc = fs.readFileSync(new URL('../js/storage.js', import.meta.url), 'utf8');
const cloudSrc = fs.readFileSync(new URL('../js/cloud.js', import.meta.url), 'utf8');
const historySrc = fs.readFileSync(new URL('../js/history.js', import.meta.url), 'utf8');

const { state, STORAGE_KEY_STAGE_WS, STORAGE_KEY_XUONG1_CAT_ONG,
        STORAGE_KEY_XUONG1_SAY_SINH, STORAGE_KEY_XUONG1_BOC, STORAGE_KEY_X1_RATES } =
  await import('../js/state.js');
state.currentUser = { username: 'admin', role: 'admin', editTabs: [], allowAdvanced: true };
state.activeView = 'kanban-view';

// ─── Dữ liệu mẫu: nguyên liệu XƯỞNG 1 + bộ phận "Xưởng 1" ──────────
state.materialRecords = [
  { id: 'x1m-a', type: 'Vầu/nứa tươi', supplier: 'Tế',   location: 'xuong-1', code: 'NNA01', weight: 1000, date: '2026-09-10', createdAt: '2026-09-10T02:00:00.000Z' },
  { id: 'x1m-b', type: 'Vầu/nứa khô',  supplier: 'Trung', location: 'xuong-1', code: 'NNB02', weight: 800,  date: '2026-09-11', createdAt: '2026-09-11T02:00:00.000Z' },
  { id: 'x2m-c', type: 'Luồng cây xô', supplier: 'Khác',  location: 'xuong-2', weight: 500,  date: '2026-09-12', createdAt: '2026-09-12T02:00:00.000Z' }
];
state.xuong1CatOngRecords = [];
state.xuong1SaySinhRecords = [];
state.xuong1BocRecords = [];
state.x1CatOngEditId = null; state.x1SaySinhEditId = null; state.x1BocEditId = null;
state.x1Rates = { catOng: {}, saySinh: {}, boc: {} };
state.suppliers = [{ id: 'sup-te', name: 'Nhà Tế', code: 'NCC01', createdAt: '2026-09-01T00:00:00.000Z' }];
// Nhân Sự: người Xưởng 1 — vị trí "Cắt Ống" / "Sấy Sinh" / "Bốc"
state.hrEmployees = [
  { id: 'e1', name: 'Lý Văn Một', quitDate: '' },
  { id: 'e2', name: 'Đỗ Văn Hai', quitDate: '' },
  { id: 'e3', name: 'Phạm Văn Ba', quitDate: '' },
  { id: 'e4', name: 'Ngô Văn Bốn', quitDate: '' }
];
state.hrPositions = [
  { id: 'p-co',  name: 'Cắt Ống',  department: 'Xưởng 1' },
  { id: 'p-ss',  name: 'Sấy Sinh',  department: 'Xưởng 1' },
  { id: 'p-bo',  name: 'Bốc',       department: 'Xưởng 1' },
  { id: 'p-bl',  name: 'Bốc Luồng', department: 'Xưởng 2' } // KHÔNG được lọt sang X1
];
state.hrAssignments = [
  { id: 'a1', date: '2026-09-10', department: 'Xưởng 1', positionId: 'p-co', employeeId: 'e1', start: '07:00', end: '12:00' },
  { id: 'a2', date: '2026-09-10', department: 'Xưởng 1', positionId: 'p-ss', employeeId: 'e2', start: '13:00', end: '17:30' },
  { id: 'a3', date: '2026-09-11', department: 'Xưởng 1', positionId: 'p-bo', employeeId: 'e3', start: '07:00', end: '' },
  { id: 'a4', date: '2026-09-10', department: 'Xưởng 2', positionId: 'p-bl', employeeId: 'e4', start: '07:00', end: '17:30' }
];

const x1 = await import('../js/xuong2.js');
const perms = await import('../js/permissions.js');


// ─── A. CÔNG TẮC CHUYỂN XƯỞNG ─────────────────────────────────────
console.log('--- A. CÔNG TẮC CHUYỂN XƯỞNG ---');
check('A1: index.html có 2 nút công tắc Xưởng 2 / Xưởng 1',
  idxHtml.includes('id="stage-ws-x2"') && idxHtml.includes('id="stage-ws-x1"'));
check('A2: có 2 khối thẻ #ws-x2-block + #ws-x1-block (khối X1 ẩn sẵn)',
  idxHtml.includes('id="ws-x2-block"') && /id="ws-x1-block"[^>]*hidden/.test(idxHtml));
check('A3: state.stageWs mặc định "x2"', state.stageWs === 'x2');
check('A4: key nhớ theo MÁY = bamboo_tracker_stage_ws_v1', STORAGE_KEY_STAGE_WS === 'bamboo_tracker_stage_ws_v1');
check('A5: công tắc có CSS riêng', stylesCss.includes('.stage-ws-switch') && stylesCss.includes('.stage-ws-active'));

localStorage.removeItem(STORAGE_KEY_STAGE_WS);
x1.loadStageWs();
check('A6: loadStageWs khi chưa lưu → về mặc định x2', state.stageWs === 'x2');
x1.applyStageWsDom();
check('A7: áp DOM mặc định → khối X2 HIỆN, khối X1 ẨN',
  document.getElementById('ws-x2-block').hidden === false &&
  document.getElementById('ws-x1-block').hidden === true);

x1.setStageWs('x1');
check('A8: setStageWs("x1") đổi state + lưu theo máy',
  state.stageWs === 'x1' && localStorage.getItem(STORAGE_KEY_STAGE_WS) === 'x1');
check('A9: áp DOM → khối X1 HIỆN, khối X2 ẨN',
  document.getElementById('ws-x1-block').hidden === false &&
  document.getElementById('ws-x2-block').hidden === true);
check('A10: nút X1 đánh dấu đang chọn (aria-selected)',
  document.getElementById('stage-ws-x1').getAttribute('aria-selected') === 'true' &&
  document.getElementById('stage-ws-x2').getAttribute('aria-selected') === 'false');

x1.setStageWs('x2');
x1.loadStageWs();
check('A11: loadStageWs đọc lại được trạng thái đã lưu (x2)', state.stageWs === 'x2');
localStorage.setItem(STORAGE_KEY_STAGE_WS, 'rác-tùy-tý');
x1.loadStageWs();
check('A12: dữ liệu rác tự về an toàn (x2)', state.stageWs === 'x2');
x1.toggleStageWs();
check('A13: toggleStageWs đảo chiều 2 xưởng', state.stageWs === 'x1');
x1.setStageWs('x2');


// ─── B. TÁCH QUYỀN XƯỞNG 1 / XƯỞNG 2 ─────────────────────────────
console.log('--- B. TÁCH QUYỀN XƯỞNG ---');
check('B1: APP_TABS có 2 tab-phụ x1 + x2 (viewId null, chỉ dùng cho quyền)',
  perms.APP_TABS.some(t => t.id === 'x1') && perms.APP_TABS.some(t => t.id === 'x2') &&
  perms.APP_TABS.filter(t => t.id === 'x1' || t.id === 'x2').every(t => t.viewId === null));
check('B2: tab cha "kanban" vẫn đứng ĐẦU (currentTabId của tab Công Đoạn SX)',
  perms.APP_TABS[0].id === 'kanban' && perms.APP_TABS[0].name === 'Công Đoạn SX');
check('B3: ALL_EDITABLE_IDS chứa cả x1 và x2',
  perms.ALL_EDITABLE_IDS.includes('x1') && perms.ALL_EDITABLE_IDS.includes('x2'));

// Migration: user cũ chỉ có 'kanban' → được cấp cả 2 xưởng (không mất quyền)
check('B4: expandWsTabs(user cũ có kanban) → thêm x1 + x2',
  JSON.stringify(perms.expandWsTabs(['kanban'])) === JSON.stringify(['kanban', 'x1', 'x2']));
check('B5: expandWsTabs idempotent (chạy 2 lần cùng kết quả)',
  JSON.stringify(perms.expandWsTabs(perms.expandWsTabs(['kanban', 'planning']))) ===
  JSON.stringify(['kanban', 'planning', 'x1', 'x2']));
check('B6: expandWsTabs(user đã tách quyền) → KHÔNG tự cấp lại',
  JSON.stringify(perms.expandWsTabs(['x1'])) === JSON.stringify(['x1']) &&
  JSON.stringify(perms.expandWsTabs(['x2'])) === JSON.stringify(['x2']));
check('B7: normalizeUser(user cũ) ghi luôn quyền x1+x2 vào editTabs',
  (() => { const u = perms.normalizeUser({ role: 'editor', editTabs: ['kanban'] });
    return u.editTabs.includes('x1') && u.editTabs.includes('x2'); })());

// canEditTab: từng xưởng RIÊNG BIỆT, tab cha = hợp của 2 xưởng
state.currentUser = { username: 'ed1', role: 'editor', editTabs: ['x1'], allowAdvanced: false };
check('B8: chỉ được Xưởng 1 → canEditTab(x1)=true · canEditTab(x2)=false',
  perms.canEditTab('x1') === true && perms.canEditTab('x2') === false);
check('B9: chỉ được Xưởng 1 → vẫn đứng được tab cha kanban', perms.canEditTab('kanban') === true);
state.currentUser = { username: 'ed2', role: 'editor', editTabs: ['x2'], allowAdvanced: false };
check('B10: chỉ được Xưởng 2 → canEditTab(x2)=true · canEditTab(x1)=false',
  perms.canEditTab('x2') === true && perms.canEditTab('x1') === false);
state.currentUser = { username: 'vw', role: 'viewer', editTabs: [], allowAdvanced: false };
check('B11: viewer → không có xưởng nào', !perms.canEditTab('x1') && !perms.canEditTab('x2'));
state.currentUser = { username: 'admin', role: 'admin', editTabs: [], allowAdvanced: true };

// CSS ẩn nút theo quyền xưởng
check('B12: styles.css có rule ẩn nút [data-perm="x1"] / [data-perm="x2"]',
  stylesCss.includes('[data-perm="x1"]') && stylesCss.includes('[data-perm="x2"]'));
check('B13: 3 thẻ Xưởng 1 trong index.html dùng data-perm="x1" (nút Lưu + Sửa/Xóa)',
  /id="x1-cat-ong-card"[\s\S]*?data-perm="x1"/.test(idxHtml) &&
  idxHtml.includes('data-x1-boc-edit') === false /* nút sửa/xóa render động trong JS */);
check('B14: nút sửa/xóa X1 render động gắn data-perm="x1"',
  fs.readFileSync(new URL('../js/xuong2.js', import.meta.url), 'utf8').includes('data-x1-cat-ong-edit="${escapeHTML(r.id)}" data-perm="x1"'));
check('B15: checkbox phân quyền 2 modal đã tách Xưởng 1 / Xưởng 2',
  idxHtml.includes('<input type="checkbox" value="x1" checked> Công Đoạn SX — Xưởng 1') &&
  idxHtml.includes('<input type="checkbox" value="x2"> Công Đoạn SX — Xưởng 2') &&
  !idxHtml.includes('value="kanban" checked> Công Đoạn (Kanban)'));


// ─── C. 8 THẺ CÔNG ĐOẠN XƯỞNG 1 (GIAI ĐOẠN 2 — TẤT CẢ CÓ CHỨC NĂNG) ──
console.log('--- C. 8 THẺ XƯỞNG 1 ---');
const X1_CARDS = ['x1-cat-ong-card', 'x1-say-sinh-card', 'x1-boc-card', 'x1-loc-ong-card',
                  'x1-cat-mat-card', 'x1-bo-card', 'x1-phoi-say-card', 'x1-loc-thanh-card'];
const X1_PFX = ['x1-cat-ong', 'x1-say-sinh', 'x1-boc', 'x1-loc-ong',
                'x1-cat-mat', 'x1-bo', 'x1-phoi-say', 'x1-loc-thanh'];
check('C1: X2_CARD_DEFS đăng ký đủ 8 thẻ Xưởng 1 (mọi thẻ ws:"x1")',
  X1_CARDS.every(id => x1.X2_CARD_DEFS[id] && x1.X2_CARD_DEFS[id].ws === 'x1'));
check('C2: CẢ 8 thẻ Xưởng 1 ĐÃ có chức năng — không còn cờ soon nào',
  X1_CARDS.every(id => !x1.X2_CARD_DEFS[id].soon));
check('C3: index.html có đủ 8 thẻ launcher Xưởng 1 trong khối #ws-x1-block',
  (() => { const blk = idxHtml.slice(idxHtml.indexOf('id="ws-x1-block"'), idxHtml.indexOf('/#ws-x1-block'));
    return X1_CARDS.every(id => blk.includes(`data-x2-card="${id}"`)); })());
check('C4: thứ tự 8 thẻ theo đúng LUỒNG SX (Cắt Ống → … → Lọc Thanh/Bó Xô)',
  (() => { const blk = idxHtml.slice(idxHtml.indexOf('id="ws-x1-block"'), idxHtml.indexOf('/#ws-x1-block'));
    const pos = X1_CARDS.map(id => blk.indexOf(`data-x2-card="${id}"`));
    return pos.every((p, i) => p > 0 && (i === 0 || p > pos[i - 1])); })());
check('C5: cả 8 thẻ chi tiết Xưởng 1 nằm trong #x2-details-stack (dùng chung pop-up)',
  (() => { const blk = idxHtml.slice(idxHtml.indexOf('id="x2-details-stack"'), idxHtml.indexOf('/#x2-details-stack'));
    return X1_PFX.every(p => blk.includes(`id="${p}-card"`)); })());
check('C6: mọi thẻ chi tiết X1 có form + thanh tồn + thống kê + khung thẻ ngày',
  X1_PFX.every(p =>
    idxHtml.includes(`id="${p}-form"`) && idxHtml.includes(`id="${p}-stock-bar"`) &&
    idxHtml.includes(`id="${p}-stats"`) && idxHtml.includes(`id="${p}-day-cards"`)));
check('C7: chip đếm + sparkline trên launcher X1 có ô riêng (#x2-mini-count/spark-x1-*)',
  X1_PFX.every(p => idxHtml.includes(`id="x2-mini-count-${p}"`) &&
                    idxHtml.includes(`id="x2-mini-spark-${p}"`)));
check('C8: x2CardCountText trả TỒN (không còn "Sắp có") cho 5 thẻ đuôi',
  ['x1-loc-ong-card', 'x1-cat-mat-card', 'x1-bo-card', 'x1-phoi-say-card', 'x1-loc-thanh-card']
    .every(id => x1.x1CardCountText(id) === 'Hết tồn'));
check('C9: X1_CHAIN_SPECS mô tả đủ 5 công đoạn đuôi theo đúng thứ tự chuỗi',
  x1.X1_CHAIN_SPECS.map(s => s.key).join(',') === 'locOng,catMat,bo,phoiSay,locThanh' &&
  x1.X1_CHAIN_SPECS.every(s => s.storeKey && s.stateKey && s.rateKind && s.cardId));

// ─── D. CHUỖI LIÊN KẾT: lô NL X1 → CẮT ỐNG → SẤY SINH → BỐC ─────
console.log('--- D. CHUỖI LIÊN KẾT 3 CÔNG ĐOẠN ---');
check('D1: nguồn Cắt Ống CHỈ lấy lô vị trí "xuong-1" (bỏ lô Xưởng 2)',
  (() => { document.getElementById('x1-cat-ong-material').value = 'x2m-c';
    return true; })() && (() => {
    // fillX1CatOngOptions chỉ liệt kê lô X1 → lô X2 không có trong danh sách
    x1.fillX1CatOngOptions();
    return !document.getElementById('x1-cat-ong-material').innerHTML.includes('x2m-c') &&
            document.getElementById('x1-cat-ong-material').innerHTML.includes('x1m-a');
  })());

// Ghi 1 lượt Cắt Ống: lô 1000kg → đạt 850 + loại 150
document.getElementById('x1-cat-ong-material').value = 'x1m-a';
document.getElementById('x1-cat-ong-date').value = '2026-09-10';
document.getElementById('x1-cat-ong-kl-dat').value = '850';
document.getElementById('x1-cat-ong-kl-loai').value = '150';
document.getElementById('x1-cat-ong-note').value = '';
x1.handleX1CatOngSubmit({ preventDefault(){} });
check('D2: ghi lượt Cắt Ống (850 đạt + 150 loại = 1000 đầu vào)',
  state.xuong1CatOngRecords.length === 1 &&
  state.xuong1CatOngRecords[0].klDat === 850 && state.xuong1CatOngRecords[0].klLoai === 150);
check('D3: lô đã cắt TỰ ẨN khỏi ô chọn (lô X1 thứ 2 vẫn còn)',
  document.getElementById('x1-cat-ong-material').innerHTML.includes('x1m-b') &&
  !document.getElementById('x1-cat-ong-material').innerHTML.includes('x1m-a'));
const co = state.xuong1CatOngRecords[0];
check('D4: tồn Cắt Ống = KL ống ĐẠT (850kg) − phần đã sấy (chưa có → 850)',
  x1.x1CatOngRemainingOf(co, null) === 850);
check('D5: người cắt tự động từ bộ phận "Xưởng 1" (Lý Văn Một)',
  state.xuong1CatOngRecords[0].worker.includes('Lý Văn Một'));
check('D6: giờ cắt snapshot = 4.5h HC (07:00–11:30, nửa sau vắt vào nghỉ trưa 11:30–13:00 → loại 0.5h)',
  Math.abs((state.xuong1CatOngRecords[0].workHoursHC || 0) - 4.5) < 0.01 &&
  Math.abs((state.xuong1CatOngRecords[0].workHoursTC || 0) - 0) < 0.01 &&
  Math.abs((state.xuong1CatOngRecords[0].workHours || 0) - 4.5) < 0.01);

// Ghi 1 lượt Sấy Sinh — CHẶN vượt phần còn chưa sấy
document.getElementById('x1-say-sinh-source').value = co.id;
document.getElementById('x1-say-sinh-date').value = '2026-09-10';
document.getElementById('x1-say-sinh-qty').value = '900'; // VƯỢT 850
x1.handleX1SaySinhSubmit({ preventDefault(){} });
check('D7: CHẶN lưu KL sấy vượt phần còn chưa sấy (900 > 850)',
  state.xuong1SaySinhRecords.length === 0);
document.getElementById('x1-say-sinh-qty').value = '500';
x1.handleX1SaySinhSubmit({ preventDefault(){} });
check('D8: ghi lượt Sấy Sinh 500kg → tồn Cắt Ống còn 350kg',
  state.xuong1SaySinhRecords.length === 1 && x1.x1CatOngRemainingOf(co, null) === 350);
const ss = state.xuong1SaySinhRecords[0];
check('D9: người sấy tự động từ bộ phận "Xưởng 1" (Đỗ Văn Hai)',
  ss.worker.includes('Đỗ Văn Hai'));


// Ghi lượt Bốc — nguồn = lượt Sấy Sinh, chặn vượt
document.getElementById('x1-boc-source').value = ss.id;
document.getElementById('x1-boc-date').value = '2026-09-11';
document.getElementById('x1-boc-qty').value = '600'; // VƯỢT 500
x1.handleX1BocSubmit({ preventDefault(){} });
check('D10: CHẶN lưu KL bốc vượt phần còn chưa bốc (600 > 500)',
  state.xuong1BocRecords.length === 0);
document.getElementById('x1-boc-qty').value = '300';
x1.handleX1BocSubmit({ preventDefault(){} });
check('D11: ghi lượt Bốc 300kg → tồn Sấy Sinh còn 200kg',
  state.xuong1BocRecords.length === 1 && x1.x1SaySinhRemainingOf(ss, null) === 200);
check('D12: người bốc tự động từ bộ phận "Xưởng 1" (Phạm Văn Ba)',
  state.xuong1BocRecords[0].worker.includes('Phạm Văn Ba'));
check('D13: KHÔNG nhầm vị trí "Bốc Luồng" của Xưởng 2 (Ngô Văn Bốn không xuất hiện)',
  JSON.stringify(state.xuong1BocRecords[0].worker).indexOf('Bốn') === -1);

// Xóa lượt Sấy Sinh → tồn Cắt Ống TRẢ LẠI phần đã sấy
const bocRec = state.xuong1BocRecords[0];
state.xuong1BocRecords = [];
check('D14: xóa lượt Bốc → tồn Sấy Sinh trả lại đủ 500kg', x1.x1SaySinhRemainingOf(ss, null) === 500);
state.xuong1SaySinhRecords = [];
check('D15: xóa lượt Sấy Sinh → tồn Cắt Ống trả lại đủ 850kg', x1.x1CatOngRemainingOf(co, null) === 850);

// Sửa 1 lượt (excludeId) → phần của lượt đó được trả lại khi tính tồn
state.xuong1SaySinhRecords = [ss];
check('D16: đang SỬA lượt sấy → excludeId trả lại phần của chính nó (850)',
  x1.x1CatOngRemainingOf(co, ss.id) === 850);

// Chip đếm trên thẻ launcher = TỒN CHỜ XỬ LÝ
check('D17: chip "Tồn … kg" trên thẻ Cắt Ống / Sấy Sinh / Bốc',
  /^Tồn /.test(x1.x1CardCountText('x1-cat-ong-card')) &&
  /^Tồn /.test(x1.x1CardCountText('x1-say-sinh-card')) &&
  /^Tồn /.test(x1.x1CardCountText('x1-boc-card')));

// ─── E. ĐỊNH MỨC CÔNG SUẤT XƯỞNG 1 (kg/h) ────────────────────────
console.log('--- E. ĐỊNH MỨC XƯỞNG 1 ---');
check('E1: key định mức = bamboo_tracker_x1_rates_v1 (dict 3 khối)',
  STORAGE_KEY_X1_RATES === 'bamboo_tracker_x1_rates_v1' &&
  state.x1Rates.catOng !== undefined && state.x1Rates.saySinh !== undefined && state.x1Rates.boc !== undefined);
check('E2: popup định mức X1 có trong index.html (1 popup cho 3 công đoạn)',
  idxHtml.includes('id="modal-x1-rate"') && idxHtml.includes('id="x1-rate-kind"') &&
  idxHtml.includes('id="x1-rate-month"') && idxHtml.includes('id="x1-rate-value"'));
check('E3: 3 nút "Định mức" trong 3 form đều gắn data-admin-only (chỉ Admin)',
  ['btn-x1-cat-ong-rate', 'btn-x1-say-sinh-rate', 'btn-x1-boc-rate']
    .every(id => new RegExp(`id="${id}"[^>]*data-admin-only`).test(idxHtml)));
check('E4: x1RateOf trả 0 khi chưa đặt định mức', x1.x1RateOf('2026-09', 'catOng') === 0);

document.getElementById('x1-rate-kind').value = 'catOng';
document.getElementById('x1-rate-month').value = '2026-09';
document.getElementById('x1-rate-value').value = '600';
x1.handleX1RateSave();
check('E5: lưu định mức Cắt Ống tháng 09/2026 = 600 kg/h',
  ((state.x1Rates.catOng || {})['2026-09']) === 600 && x1.x1RateOf('2026-09-10', 'catOng') === 600);
check('E6: mỗi công đoạn có ĐM RIÊNG (Sấy Sinh/Bốc chưa đặt)',
  x1.x1RateOf('2026-09-10', 'saySinh') === 0 && x1.x1RateOf('2026-09-10', 'boc') === 0);
check('E7: lưu xuống localStorage đúng key', (() => {
  const o = JSON.parse(localStorage.getItem(STORAGE_KEY_X1_RATES) || '{}');
  return ((o.catOng || {})['2026-09']) === 600; })());
check('E8: reader chuẩn hoá dữ liệu cũ thiếu khối vẫn đủ 3 khối',
  (() => { const m = JSON.parse(JSON.stringify(state.x1Rates)); delete m.boc;
    state.x1Rates = m; x1.loadX1Rates();
    return state.x1Rates.boc !== undefined; })());


// ─── F. NỐI ĐỦ 6 CHỖ (state · storage · cloud · history · main · capacity) ──
console.log('--- F. NỐI 6 CHỖ + SW ---');
const x2Src = fs.readFileSync(new URL('../js/xuong2.js', import.meta.url), 'utf8');
const capSrc = fs.readFileSync(new URL('../js/capacity.js', import.meta.url), 'utf8');
const swJs = fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
check('F1: state.js khai 4 key + export',
  ['bamboo_tracker_xuong1_cat_ong_v1', 'bamboo_tracker_xuong1_say_sinh_v1',
   'bamboo_tracker_xuong1_boc_v1', 'bamboo_tracker_x1_rates_v1']
    .every(k => fs.readFileSync(new URL('../js/state.js', import.meta.url), 'utf8').includes(k)));
check('F2: storage.js có hàm restore 4 khóa + ghi vào snapshot file/export/import',
  ['restoreXuong1CatOng', 'restoreXuong1SaySinh', 'restoreXuong1Boc', 'restoreX1Rates']
    .every(n => storageSrc.includes(n + ',') || storageSrc.includes('function ' + n)) &&
  storageSrc.includes('xuong1CatOngRecords: state.xuong1CatOngRecords || []') &&
  storageSrc.includes('x1Rates: state.x1Rates || {}'));
check('F3: cloud.js có đủ 4 điểm (snapshot · parse · merge · apply · persist · RATE_DOMAINS)',
  cloudSrc.includes('xuong1CatOngRecords: state.xuong1CatOngRecords || []') &&
  cloudSrc.includes("xuong1CatOngRecords: obj.xuong1CatOngRecords || []") &&
  cloudSrc.includes("state.xuong1CatOngRecords = m(clean('xuong1CatOngRecords'") &&
  cloudSrc.includes("state.xuong1CatOngRecords = clean('xuong1CatOngRecords'") &&
  cloudSrc.includes('STORAGE_KEY_XUONG1_CAT_ONG') && cloudSrc.includes("'x1Rates'"));
check('F4: history.js đăng ký 4 vùng dữ liệu (tab kanban)',
  historySrc.includes('xuong1CatOngRecords:') && historySrc.includes('xuong1SaySinhRecords:') &&
  historySrc.includes('xuong1BocRecords:') && historySrc.includes('x1Rates:'));
check('F5: main.js nạp 4 khóa lúc boot + áp công tắc',
  mainSrc.includes('loadXuong1CatOng()') && mainSrc.includes('loadXuong1SaySinh()') &&
  mainSrc.includes('loadXuong1Boc()') && mainSrc.includes('loadX1Rates()') &&
  mainSrc.includes('loadStageWs()') && mainSrc.includes('applyStageWsDom()'));
check('F6: events.js wire 3 form + công tắc + ủy quyền sửa/xóa X1',
  eventsSrc.includes("'x1-cat-ong-form', 'submit'") &&
  eventsSrc.includes("'x1-say-sinh-form', 'submit'") &&
  eventsSrc.includes("'x1-boc-form', 'submit'") &&
  eventsSrc.includes("'stage-ws-x1', 'click'") &&
  eventsSrc.includes('data-x1-cat-ong-edit') &&
  eventsSrc.includes('data-x1-boc-delete') &&
  eventsSrc.includes("'btn-x1-rate-save', 'click'"));
check('F7: capacity.js có 3 dòng CAP_STAGES ws:"x1" + 3 sparkline + khóa giờ sự cố',
  capSrc.includes("id: 'x1catong', ws: 'x1'") && capSrc.includes("id: 'x1saysinh', ws: 'x1'") &&
  capSrc.includes("id: 'x1boc', ws: 'x1'") && capSrc.includes("'x2-mini-spark-x1-cat-ong'") &&
  capSrc.includes('x1catong: \'x1catong\''));

// ─── G. CẤU TRÚC SW + TIÊU ĐỀ TAB ─────────────────────────────────
console.log('--- G. CẤU TRÚC SW + TAB ---');
check('G1: sw.js đã tăng CACHE_NAME v211', /nha-may-ngoc-son-v223/.test(swJs));
check('G2: nav desktop + mobile đổi nhãn "Công Đoạn SX"',
  idxHtml.includes('<span>Công Đoạn SX</span>'));
check('G3: tab Công Đoạn SX có ô nhận diện 2 xưởng ở header',
  idxHtml.includes('2 xưởng riêng biệt — chuyển bằng nút XƯỞNG 1 / XƯỞNG 2'));
check('G4: CSS điện thoại cho công tắc (2 nút chia đều + lưới X1 2 cột)',
  stylesCss.includes('#x1-cards-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }'));

// ─── H. CHUỖI 5 CÔNG ĐOẠN ĐUÔI (05/10/2026 — GIAI ĐOẠN 2) ──────────
// Bốc → Lọc Ống → Cắt Mắt → Bổ → Phơi Sấy → Lọc Thanh/Bó Xô
console.log('--- H. CHUỖI 5 CÔNG ĐOẠN ĐUÔI ---');
const spLO = x1.x1ChainSpecByKey('locOng'), spCM = x1.x1ChainSpecByKey('catMat');
const spBO = x1.x1ChainSpecByKey('bo'),     spPS = x1.x1ChainSpecByKey('phoiSay');
const spLT = x1.x1ChainSpecByKey('locThanh');
const ALL5 = [spLO, spCM, spBO, spPS, spLT];
ALL5.forEach(s => { state[s.stateKey] = []; state[s.editKey] = null; });
// Nguồn gốc = 1 lượt BỐC 1000kg (xây độc lập cho mục H)
state.xuong1BocRecords = [{
  id: 'boc-h', date: '2026-09-12', qty: 1000,
  materialType: 'Vầu/nứa tươi', supplier: 'Tế',
  srcType: 'Vầu/nứa tươi', srcSupplier: 'Tế', saySinhId: 'ss-x'
}];
const bocH = state.xuong1BocRecords[0];
function hFill(spec, srcId, d, qi, qok, ql) {
  x1.fillX1ChainOptions(spec); // đổ danh sách nguồn — như khi mở thẻ ở app thật
  const g = p => document.getElementById('x1-' + spec.prefix + '-' + p);
  g('src').value = srcId; g('date').value = d;
  g('in').value = String(qi); g('ok').value = String(qok); g('loai').value = String(ql);
  x1.handleX1ChainSubmit(spec, { preventDefault(){} });
}
check('H1: SPEC dùng chung — nguồn BỐC output = qty · 4 thẻ sau output = qtyOk',
  spLO.srcOutputOf(bocH) === 1000 &&
  spCM.srcOutputOf({ qtyOk: 500 }) === 500 && spBO.srcOutputOf({ qtyOk: 500 }) === 500 &&
  spPS.srcOutputOf({ qtyOk: 500 }) === 500 && spLT.srcOutputOf({ qtyOk: 500 }) === 500 &&
  ALL5.every(s => !!s.storeKey && s.storeKey.startsWith('bamboo_tracker_xuong1_')));
check('H2: tồn nguồn Bốc = 1000kg (chưa lượt Lọc Ống nào)', x1.x1ChainRemainingOf(spLO, bocH, null) === 1000);
check('H3: ô chọn Lọc Ống liệt kê lượt Bốc + tự điền ngày + qtyIn = phần còn lại',
  (() => { x1.fillX1ChainOptions(spLO);
    const sel = document.getElementById('x1-loc-ong-src');
    const okHtml = sel.innerHTML.includes('boc-h') && sel.innerHTML.includes('còn 1.000 kg');
    sel.value = 'boc-h';                    // người dùng chọn (browser tự chọn option đầu)
    x1.x1ChainSyncLinked(spLO, true);       // đúng handler 'change' của events.js
    return okHtml &&
      document.getElementById('x1-loc-ong-date').value === '2026-09-12' &&
      document.getElementById('x1-loc-ong-in').value === '1000'; })());

// ── CHẶN 2 lớp ──
hFill(spLO, 'boc-h', '2026-09-13', 1200, 1100, 100); // qtyIn VƯỢT tồn
check('H4: CHẶN qtyIn vượt phần còn lại của nguồn (1200 > 1000)', state.xuong1LocOngRecords.length === 0);
hFill(spLO, 'boc-h', '2026-09-13', 800, 700, 200);    // đạt + loại > đem xử lý
check('H5: CHẶN Đạt + Loại vượt Đem xử lý (900 > 800)', state.xuong1LocOngRecords.length === 0);
hFill(spLO, 'boc-h', '2026-09-13', 800, 750, 50);
check('H6: ghi lượt Lọc Ống 800kg (750 đạt + 50 loại) → tồn Bốc còn 200kg',
  state.xuong1LocOngRecords.length === 1 && x1.x1ChainRemainingOf(spLO, bocH, null) === 200);
const lo = state.xuong1LocOngRecords[0];
check('H7: snapshot nguồn theo BỐC (type + NCC + ngày) chép vào lượt Lọc Ống',
  lo.srcType === 'Vầu/nứa tươi' && lo.srcSupplier === 'Tế' && lo.srcDate === '2026-09-12');

// ── Vòng tiếp: Lọc Ống → Cắt Mắt → Bổ → Phơi Sấy → Lọc Thanh ──
check('H8: Cắt Mắt nhận tồn từ phần ĐẠT của Lọc Ống (750kg)',
  x1.x1ChainRemainingOf(spCM, lo, null) === 750);
hFill(spCM, lo.id, '2026-09-14', 750, 700, 50);
const cm = state.xuong1CatMatRecords[0];
check('H9: ghi lượt Cắt Mắt 750kg → Lọc Ống hết hàng (TỰ ẨN khỏi ô chọn)',
  !!cm && x1.x1ChainRemainingOf(spCM, lo, null) === 0 &&
  (() => { x1.fillX1ChainOptions(spCM);
    return !document.getElementById('x1-cat-mat-src').innerHTML.includes(lo.id); })());
hFill(spBO, cm.id, '2026-09-15', 700, 660, 40);
const bo = state.xuong1BoRecords[0];
check('H10: ghi lượt Bổ 700kg → tồn Cắt Mắt = 0', !!bo && x1.x1ChainRemainingOf(spBO, cm, null) === 0);
hFill(spPS, bo.id, '2026-09-16', 660, 640, 20);
const ps = state.xuong1PhoiSayRecords[0];
check('H11: ghi lượt Phơi Sấy 660kg → tồn Bổ = 0', !!ps && x1.x1ChainRemainingOf(spPS, bo, null) === 0);
hFill(spLT, ps.id, '2026-09-17', 640, 620, 20);
const lt = state.xuong1LocThanhRecords[0];
check('H12: ghi lượt Lọc Thanh 640kg → tồn Phơi Sấy = 0',
  !!lt && x1.x1ChainRemainingOf(spLT, ps, null) === 0 && x1.x1ChainPending(spLT).length === 0);
check('H13: chip đếm 5 thẻ đuôi trả SỐ LIỆU thật (không còn "Sắp có"/"–")',
  ALL5.every(s => !['Sắp có', '–'].includes(x1.x1CardCountText(s.cardId))) &&
  ['catMat', 'bo', 'phoiSay', 'locThanh']
    .every(k => x1.x1CardCountText(x1.x1ChainSpecByKey(k).cardId) === 'Hết tồn') &&
  /^Tồn /.test(x1.x1CardCountText(spLO.cardId)));

// ── SỬA trả lại phần của lượt đang sửa (excludeId) ──
x1.editX1Chain(spLO, lo.id); // vào mode sửa
document.getElementById('x1-loc-ong-in').value = '400';
document.getElementById('x1-loc-ong-ok').value = '380';
document.getElementById('x1-loc-ong-loai').value = '20';
x1.handleX1ChainSubmit(spLO, { preventDefault(){} });
check('H14: sửa lượt Lọc Ống 800 → 400 kg trả lại 400kg cho nguồn Bốc',
  state.xuong1LocOngRecords.length === 1 &&
  state.xuong1LocOngRecords[0].qtyIn === 400 &&
  x1.x1ChainRemainingOf(spLO, bocH, null) === 600);
check('H15: sửa KHÔNG sinh bản ghi trùng (vẫn đúng 1 lượt)',
  state.xuong1LocOngRecords.length === 1 && state.x1LocOngEditId === null);

// ── XÓA có tombstone ──
const delId = lt.id;
globalThis.confirm = () => true;
x1.deleteX1Chain(spLT, delId);
check('H16: xóa lượt Lọc Thanh → mảng trống + tồn Phơi Sấy trả lại 640kg',
  state.xuong1LocThanhRecords.length === 0 && x1.x1ChainRemainingOf(spPS, ps, null) === 640);

// ── RENDER thẻ ngày + thanh tồn của 1 thẻ đuôi ──
x1.renderX1ChainCard(spLO);
check('H17: render thẻ Lọc Ống → thanh tồn + thống kê + thẻ ngày có dữ liệu',
  document.getElementById('x1-loc-ong-stock-bar').innerHTML.length > 0 &&
  document.getElementById('x1-loc-ong-stats').innerHTML.includes('Lượt lọc ống') &&
  document.getElementById('x1-loc-ong-day-cards').innerHTML.includes('Vầu/nứa tươi'));

check('H18: 5 form có đủ nguồn · ô tính · nút định mức data-admin-only',
  ALL5.every(s => {
    const p = s.prefix;
    return idxHtml.includes(`id="x1-${p}-form"`) && idxHtml.includes(`id="x1-${p}-calc"`) &&
      new RegExp(`id="btn-x1-${p}-rate"[^>]*data-admin-only`).test(idxHtml);
  }));
check('H19: events.js nối đủ 5 form (submit · cancel · src change · ô tính · định mức · ủy quyền)',
  eventsSrc.includes('X1_CHAIN_SPECS.forEach(sp => {') &&
  eventsSrc.includes("safeOn(base + '-form', 'submit'") &&
  eventsSrc.includes("safeOn(base + '-src', 'change'") &&
  eventsSrc.includes("['in', 'ok', 'loai'].forEach") &&
  eventsSrc.includes("safeOn('btn-' + base + '-rate', 'click'") &&
  eventsSrc.includes("closest('[data-x1-edit]')") &&
  eventsSrc.includes("closest('[data-x1-delete]')"));
check('H20: storage · cloud · history · main · capacity nối đủ 5 mảng + 8 khóa định mức',
  ['restoreXuong1LocOng', 'restoreXuong1CatMat', 'restoreXuong1Bo', 'restoreXuong1PhoiSay', 'restoreXuong1LocThanh']
    .every(n => storageSrc.includes('function ' + n)) &&
  ['xuong1LocOngRecords', 'xuong1CatMatRecords', 'xuong1BoRecords',
   'xuong1PhoiSayRecords', 'xuong1LocThanhRecords']
    .every(k => cloudSrc.includes(k + ': state.' + k) && historySrc.includes(k + ':')) &&
  mainSrc.includes('loadX1ChainAll()') &&
  capSrc.includes("id: 'x1locong'") && capSrc.includes("id: 'x1locthanh'") &&
  capSrc.includes("x1locthanh: 'x1locthanh'") &&
  capSrc.includes("'x2-mini-spark-x1-phoi-say'"));
check('H21: popup định mức X1 có đủ 8 lựa chọn công đoạn',
  ['catOng', 'saySinh', 'boc', 'locOng', 'catMat', 'bo', 'phoiSay', 'locThanh']
    .every(k => new RegExp(`<option value="${k}">`).test(idxHtml)) &&
  x1.x1RateOf('2026-09-10', 'locOng') === 0);

console.log(`\n=== KẾT QUẢ XUONG1: ${pass} PASS / ${fail} FAIL ===`);
process.exit(fail > 0 ? 1 : 0);

