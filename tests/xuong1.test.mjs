// tests/xuong1.test.mjs â€” Kiá»ƒm thá»­ TAB "CÃ”NG ÄOáº N SX" vá»›i 2 XÆ¯á»žNG RIÃŠNG BIá»†T:
// â‘  CÃ”NG Táº®C chuyá»ƒn XÆ°á»Ÿng 1 â‡„ XÆ°á»Ÿng 2 (nhá»› theo mÃ¡y)
// â‘¡ TÃCH QUYá»€N x1 / x2 (migrate user cÅ© chá»‰ cÃ³ 'kanban')
// 8 tháº» launcher XÆ°á»Ÿng 1; PhÆ¡i Sáº¥y lÃ  tá»“n trung gian áº©n, giá»¯ schema lá»‹ch sá»­.
// (lÃ´ NL X1 â†’ Cáº¯t á»ng â†’ Sáº¥y Sinh â†’ Bá»‘c), cháº·n vÆ°á»£t pháº§n cÃ²n láº¡i, Ä‘á»‹nh má»©c
// kg/h, ngÆ°á»i + giá» HC/TC tá»« bá»™ pháº­n "XÆ°á»Ÿng 1", ná»‘i state/storage/cloud/
// history/main/capacity.
'use strict';
import fs from 'node:fs';
import { mergeX1RecordsByTimestamp } from '../js/record-merge.js';

// â”€â”€â”€ Stubs mÃ´i trÆ°á»ng (giá»‘ng xuong2-boc-luong.test.mjs) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
    // THEO DÃ•I attribute Ä‘á»ƒ test Ä‘Æ°á»£c áº©n/hiá»‡n khá»‘i XÆ°á»Ÿng 1 / XÆ°á»Ÿng 2
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

// â”€â”€â”€ Nguá»“n HTML/CSS/JS Ä‘á»c tá»« file â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const idxHtml = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const stylesCss = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
const eventsSrc = fs.readFileSync(new URL('../js/events.js', import.meta.url), 'utf8');
const mainSrc = fs.readFileSync(new URL('../js/main.js', import.meta.url), 'utf8');
const storageSrc = fs.readFileSync(new URL('../js/storage.js', import.meta.url), 'utf8');
const cloudSrc = fs.readFileSync(new URL('../js/cloud.js', import.meta.url), 'utf8');
const historySrc = fs.readFileSync(new URL('../js/history.js', import.meta.url), 'utf8');

const { state, APP_VERSION, STORAGE_KEY_STAGE_WS, STORAGE_KEY_XUONG1_CAT_ONG,
        STORAGE_KEY_XUONG1_SAY_SINH, STORAGE_KEY_XUONG1_BOC, STORAGE_KEY_X1_RATES,
        STORAGE_KEY_X1_NAN_PLAN } =
  await import('../js/state.js');
state.currentUser = { username: 'admin', role: 'admin', editTabs: [], allowAdvanced: true };
state.activeView = 'kanban-view';

// â”€â”€â”€ Dá»¯ liá»‡u máº«u: nguyÃªn liá»‡u XÆ¯á»žNG 1 + bá»™ pháº­n "XÆ°á»Ÿng 1" â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// âš  12/10/2026: Cáº¯t á»ng CHá»ˆ nháº­n lÃ´ cÃ³ CHá»® "CÃ‚Y" â†’ x1m-a/b/e cÃ³ chá»¯ cÃ¢y,
//   x1m-d (XÆ°á»Ÿng 1 NHÆ¯NG khÃ´ng chá»¯ cÃ¢y) PHáº¢I bá»‹ loáº¡i khá»i Ã´ chá»n;
//   x1m-e viáº¿t HOA "CÃ‚Y" Ä‘á»ƒ kiá»ƒm tra khá»›p KHÃ”NG phÃ¢n biá»‡t hoa/thÆ°á»ng.
state.materialRecords = [
  { id: 'x1m-a', type: 'Váº§u cÃ¢y tÆ°Æ¡i',     supplier: 'Táº¿',   location: 'xuong-1', code: 'NNA01', weight: 1000, date: '2026-09-10', createdAt: '2026-09-10T02:00:00.000Z' },
  { id: 'x1m-b', type: 'Ná»©a cÃ¢y khÃ´',      supplier: 'Trung', location: 'xuong-1', code: 'NNB02', weight: 800,  date: '2026-09-11', createdAt: '2026-09-11T02:00:00.000Z' },
  { id: 'x1m-d', type: 'Váº§u/ná»©a mua sáºµn',  supplier: 'Dung', location: 'xuong-1', code: 'NND04', weight: 600,  date: '2026-09-13', createdAt: '2026-09-13T02:00:00.000Z' },
  { id: 'x1m-e', type: 'Ná»©a CÃ‚Y TÆ°Æ¡i',     supplier: 'LÃ½',   location: 'xuong-1', code: 'NNE05', weight: 400,  date: '2026-09-14', createdAt: '2026-09-14T02:00:00.000Z' },
  { id: 'x2m-c', type: 'Luá»“ng cÃ¢y xÃ´', supplier: 'KhÃ¡c',  location: 'xuong-2', weight: 500,  date: '2026-09-12', createdAt: '2026-09-12T02:00:00.000Z' }
];
state.xuong1CatOngRecords = [];
state.xuong1SaySinhRecords = [];
state.xuong1BocRecords = [];
state.x1CatOngEditId = null; state.x1SaySinhEditId = null; state.x1BocEditId = null;
state.x1Rates = { catOng: {}, saySinh: {}, boc: {} };
state.suppliers = [{ id: 'sup-te', name: 'NhÃ  Táº¿', code: 'NCC01', createdAt: '2026-09-01T00:00:00.000Z' }];
// NhÃ¢n Sá»±: ngÆ°á»i XÆ°á»Ÿng 1 â€” vá»‹ trÃ­ "Cáº¯t á»ng" / "Sáº¥y Sinh" / "Bá»‘c"
state.hrEmployees = [
  { id: 'e1', name: 'LÃ½ VÄƒn Má»™t', quitDate: '' },
  { id: 'e2', name: 'Äá»— VÄƒn Hai', quitDate: '' },
  { id: 'e3', name: 'Pháº¡m VÄƒn Ba', quitDate: '' },
  { id: 'e4', name: 'NgÃ´ VÄƒn Bá»‘n', quitDate: '' },
  { id: 'e5', name: 'Nguyá»…n Bá»• Má»™t', quitDate: '' },
  { id: 'e6', name: 'Nguyá»…n Bá»• Hai', quitDate: '' }
];
state.hrPositions = [
  { id: 'p-co',  name: 'Cáº¯t á»ng',  department: 'XÆ°á»Ÿng 1' },
  { id: 'p-ss',  name: 'Sáº¥y Sinh', department: 'XÆ°á»Ÿng 1' },
  { id: 'p-bo',  name: 'Bá»‘c',      department: 'XÆ°á»Ÿng 1' },
  { id: 'p-bo1', name: 'Bá»• á»‘ng 1', department: 'XÆ°á»Ÿng 1' },
  { id: 'p-bo2', name: 'Bá»• á»‘ng 2', department: 'XÆ°á»Ÿng 1' },
  { id: 'p-bl',  name: 'Bá»‘c Luá»“ng', department: 'XÆ°á»Ÿng 2' } // KHÃ”NG Ä‘Æ°á»£c lá»t sang X1
];
state.hrAssignments = [
  { id: 'a1', date: '2026-09-10', department: 'XÆ°á»Ÿng 1', positionId: 'p-co', employeeId: 'e1', start: '07:00', end: '12:00' },
  { id: 'a2', date: '2026-09-10', department: 'XÆ°á»Ÿng 1', positionId: 'p-ss', employeeId: 'e2', start: '13:00', end: '17:30' },
  { id: 'a3', date: '2026-09-11', department: 'XÆ°á»Ÿng 1', positionId: 'p-bo', employeeId: 'e3', start: '07:00', end: '' },
  { id: 'a4', date: '2026-09-10', department: 'XÆ°á»Ÿng 2', positionId: 'p-bl', employeeId: 'e4', start: '07:00', end: '17:30' },
  { id: 'a5', date: '2026-09-22', department: 'XÆ°á»Ÿng 1', positionId: 'p-bo1', employeeId: 'e5', start: '07:00', end: '11:00' },
  { id: 'a6', date: '2026-09-22', department: 'XÆ°á»Ÿng 1', positionId: 'p-bo2', employeeId: 'e6', start: '07:00', end: '16:00' }
];

const x1 = await import('../js/xuong2.js');
const perms = await import('../js/permissions.js');
const sysSettings = await import('../js/sys-settings.js');
const reportSpecs = await import('../js/report-specs.js');
const exportXlsx = await import('../js/export-xlsx.js');


// â”€â”€â”€ A. CÃ”NG Táº®C CHUYá»‚N XÆ¯á»žNG â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
console.log('--- A. CÃ”NG Táº®C CHUYá»‚N XÆ¯á»žNG ---');
check('A1: index.html cÃ³ 2 nÃºt cÃ´ng táº¯c XÆ°á»Ÿng 2 / XÆ°á»Ÿng 1',
  idxHtml.includes('id="stage-ws-x2"') && idxHtml.includes('id="stage-ws-x1"'));
check('A2: cÃ³ 2 khá»‘i tháº» #ws-x2-block + #ws-x1-block (khá»‘i X1 áº©n sáºµn)',
  idxHtml.includes('id="ws-x2-block"') && /id="ws-x1-block"[^>]*hidden/.test(idxHtml));
check('A3: state.stageWs máº·c Ä‘á»‹nh "x2"', state.stageWs === 'x2');
check('A4: key nhá»› theo MÃY = bamboo_tracker_stage_ws_v1', STORAGE_KEY_STAGE_WS === 'bamboo_tracker_stage_ws_v1');
check('A5: cÃ´ng táº¯c cÃ³ CSS riÃªng', stylesCss.includes('.stage-ws-switch') && stylesCss.includes('.stage-ws-active'));

localStorage.removeItem(STORAGE_KEY_STAGE_WS);
x1.loadStageWs();
check('A6: loadStageWs khi chÆ°a lÆ°u â†’ vá» máº·c Ä‘á»‹nh x2', state.stageWs === 'x2');
x1.applyStageWsDom();
check('A7: Ã¡p DOM máº·c Ä‘á»‹nh â†’ khá»‘i X2 HIá»†N, khá»‘i X1 áº¨N',
  document.getElementById('ws-x2-block').hidden === false &&
  document.getElementById('ws-x1-block').hidden === true);

x1.setStageWs('x1');
check('A8: setStageWs("x1") Ä‘á»•i state + lÆ°u theo mÃ¡y',
  state.stageWs === 'x1' && localStorage.getItem(STORAGE_KEY_STAGE_WS) === 'x1');
check('A9: Ã¡p DOM â†’ khá»‘i X1 HIá»†N, khá»‘i X2 áº¨N',
  document.getElementById('ws-x1-block').hidden === false &&
  document.getElementById('ws-x2-block').hidden === true);
check('A10: nÃºt X1 Ä‘Ã¡nh dáº¥u Ä‘ang chá»n (aria-selected)',
  document.getElementById('stage-ws-x1').getAttribute('aria-selected') === 'true' &&
  document.getElementById('stage-ws-x2').getAttribute('aria-selected') === 'false');

x1.setStageWs('x2');
x1.loadStageWs();
check('A11: loadStageWs Ä‘á»c láº¡i Ä‘Æ°á»£c tráº¡ng thÃ¡i Ä‘Ã£ lÆ°u (x2)', state.stageWs === 'x2');
localStorage.setItem(STORAGE_KEY_STAGE_WS, 'rÃ¡c-tÃ¹y-tÃ½');
x1.loadStageWs();
check('A12: dá»¯ liá»‡u rÃ¡c tá»± vá» an toÃ n (x2)', state.stageWs === 'x2');
x1.toggleStageWs();
check('A13: toggleStageWs Ä‘áº£o chiá»u 2 xÆ°á»Ÿng', state.stageWs === 'x1');
x1.setStageWs('x2');


// â”€â”€â”€ B. TÃCH QUYá»€N XÆ¯á»žNG 1 / XÆ¯á»žNG 2 â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
console.log('--- B. TÃCH QUYá»€N XÆ¯á»žNG ---');
check('B1: APP_TABS cÃ³ 2 tab-phá»¥ x1 + x2 (viewId null, chá»‰ dÃ¹ng cho quyá»n)',
  perms.APP_TABS.some(t => t.id === 'x1') && perms.APP_TABS.some(t => t.id === 'x2') &&
  perms.APP_TABS.filter(t => t.id === 'x1' || t.id === 'x2').every(t => t.viewId === null));
check('B2: tab cha "kanban" váº«n Ä‘á»©ng Äáº¦U (currentTabId cá»§a tab CÃ´ng Äoáº¡n SX)',
  perms.APP_TABS[0].id === 'kanban' && perms.APP_TABS[0].name === 'CÃ´ng Äoáº¡n SX');
check('B3: ALL_EDITABLE_IDS chá»©a cáº£ x1 vÃ  x2',
  perms.ALL_EDITABLE_IDS.includes('x1') && perms.ALL_EDITABLE_IDS.includes('x2'));

// Migration: user cÅ© chá»‰ cÃ³ 'kanban' â†’ Ä‘Æ°á»£c cáº¥p cáº£ 2 xÆ°á»Ÿng (khÃ´ng máº¥t quyá»n)
check('B4: expandWsTabs(user cÅ© cÃ³ kanban) â†’ thÃªm x1 + x2',
  JSON.stringify(perms.expandWsTabs(['kanban'])) === JSON.stringify(['kanban', 'x1', 'x2']));
check('B5: expandWsTabs idempotent (cháº¡y 2 láº§n cÃ¹ng káº¿t quáº£)',
  JSON.stringify(perms.expandWsTabs(perms.expandWsTabs(['kanban', 'planning']))) ===
  JSON.stringify(['kanban', 'planning', 'x1', 'x2']));
check('B6: expandWsTabs(user Ä‘Ã£ tÃ¡ch quyá»n) â†’ KHÃ”NG tá»± cáº¥p láº¡i',
  JSON.stringify(perms.expandWsTabs(['x1'])) === JSON.stringify(['x1']) &&
  JSON.stringify(perms.expandWsTabs(['x2'])) === JSON.stringify(['x2']));
check('B7: normalizeUser(user cÅ©) ghi luÃ´n quyá»n x1+x2 vÃ o editTabs',
  (() => { const u = perms.normalizeUser({ role: 'editor', editTabs: ['kanban'] });
    return u.editTabs.includes('x1') && u.editTabs.includes('x2'); })());

// canEditTab: tá»«ng xÆ°á»Ÿng RIÃŠNG BIá»†T, tab cha = há»£p cá»§a 2 xÆ°á»Ÿng
state.currentUser = { username: 'ed1', role: 'editor', editTabs: ['x1'], allowAdvanced: false };
check('B8: chá»‰ Ä‘Æ°á»£c XÆ°á»Ÿng 1 â†’ canEditTab(x1)=true Â· canEditTab(x2)=false',
  perms.canEditTab('x1') === true && perms.canEditTab('x2') === false);
check('B9: chá»‰ Ä‘Æ°á»£c XÆ°á»Ÿng 1 â†’ váº«n Ä‘á»©ng Ä‘Æ°á»£c tab cha kanban', perms.canEditTab('kanban') === true);
state.currentUser = { username: 'ed2', role: 'editor', editTabs: ['x2'], allowAdvanced: false };
check('B10: chá»‰ Ä‘Æ°á»£c XÆ°á»Ÿng 2 â†’ canEditTab(x2)=true Â· canEditTab(x1)=false',
  perms.canEditTab('x2') === true && perms.canEditTab('x1') === false);
state.currentUser = { username: 'vw', role: 'viewer', editTabs: [], allowAdvanced: false };
check('B11: viewer â†’ khÃ´ng cÃ³ xÆ°á»Ÿng nÃ o', !perms.canEditTab('x1') && !perms.canEditTab('x2'));
state.currentUser = { username: 'admin', role: 'admin', editTabs: [], allowAdvanced: true };

// CSS áº©n nÃºt theo quyá»n xÆ°á»Ÿng
check('B12: styles.css cÃ³ rule áº©n nÃºt [data-perm="x1"] / [data-perm="x2"]',
  stylesCss.includes('[data-perm="x1"]') && stylesCss.includes('[data-perm="x2"]'));
check('B13: 3 tháº» XÆ°á»Ÿng 1 trong index.html dÃ¹ng data-perm="x1" (nÃºt LÆ°u + Sá»­a/XÃ³a)',
  /id="x1-cat-ong-card"[\s\S]*?data-perm="x1"/.test(idxHtml) &&
  idxHtml.includes('data-x1-boc-edit') === false /* nÃºt sá»­a/xÃ³a render Ä‘á»™ng trong JS */);
check('B14: nÃºt sá»­a/xÃ³a X1 render Ä‘á»™ng gáº¯n data-perm="x1"',
  fs.readFileSync(new URL('../js/xuong2.js', import.meta.url), 'utf8').includes('data-x1-cat-ong-edit="${escapeHTML(r.id)}" data-perm="x1"'));
check('B15: checkbox phÃ¢n quyá»n 2 modal Ä‘Ã£ tÃ¡ch XÆ°á»Ÿng 1 / XÆ°á»Ÿng 2',
  idxHtml.includes('<input type="checkbox" value="x1" checked> CÃ´ng Äoáº¡n SX â€” XÆ°á»Ÿng 1') &&
  idxHtml.includes('<input type="checkbox" value="x2"> CÃ´ng Äoáº¡n SX â€” XÆ°á»Ÿng 2') &&
  !idxHtml.includes('value="kanban" checked> CÃ´ng Äoáº¡n (Kanban)'));


// â”€â”€â”€ C. 8 THáºº CÃ”NG ÄOáº N XÆ¯á»žNG 1 (GIAI ÄOáº N 2 â€” Táº¤T Cáº¢ CÃ“ CHá»¨C NÄ‚NG) â”€â”€
console.log('--- C. THáºº XÆ¯á»žNG 1 ---');
const X1_CARDS = ['x1-cat-ong-card', 'x1-say-sinh-card', 'x1-boc-card', 'x1-loc-ong-card',
                  'x1-cat-mat-card', 'x1-bo-card', 'x1-phoi-say-card', 'x1-loc-thanh-card', 'x1-kho-card'];
const X1_LAUNCHER_CARDS = X1_CARDS.filter(id => id !== 'x1-phoi-say-card');
const X1_PFX = ['x1-cat-ong', 'x1-say-sinh', 'x1-boc', 'x1-loc-ong',
                'x1-cat-mat', 'x1-bo', 'x1-phoi-say', 'x1-loc-thanh'];
check('C1: X2_CARD_DEFS Ä‘Äƒng kÃ½ cÃ¡c tháº» XÆ°á»Ÿng 1, gá»“m tháº» PhÆ¡i Sáº¥y lá»‹ch sá»­ vÃ  Kho Nan',
  X1_CARDS.every(id => x1.X2_CARD_DEFS[id] && x1.X2_CARD_DEFS[id].ws === 'x1'));
check('C2: má»i tháº» XÆ°á»Ÿng 1 Ä‘Ã£ cÃ³ chá»©c nÄƒng â€” khÃ´ng cÃ²n cá» soon nÃ o',
  X1_CARDS.every(id => !x1.X2_CARD_DEFS[id].soon));
check('C3: launcher XÆ°á»Ÿng 1 áº©n PhÆ¡i Sáº¥y trong khá»‘i #ws-x1-block',
  (() => { const blk = idxHtml.slice(idxHtml.indexOf('id="ws-x1-block"'), idxHtml.indexOf('/#ws-x1-block'));
    return X1_LAUNCHER_CARDS.every(id => blk.includes(`data-x2-card="${id}"`)) &&
      !blk.includes('data-x2-card="x1-phoi-say-card"'); })());
check('C4: thá»© tá»± tháº» theo luá»“ng SX, Kho Nan sau Lá»c Thanh/BÃ³ XÃ´',
  (() => { const blk = idxHtml.slice(idxHtml.indexOf('id="ws-x1-block"'), idxHtml.indexOf('/#ws-x1-block'));
    const pos = X1_LAUNCHER_CARDS.map(id => blk.indexOf(`data-x2-card="${id}"`));
    return pos.every((p, i) => p > 0 && (i === 0 || p > pos[i - 1])); })());
check('C5: chi tiáº¿t 8 cÃ´ng Ä‘oáº¡n vÃ  Kho Nan náº±m trong #x2-details-stack',
  (() => { const blk = idxHtml.slice(idxHtml.indexOf('id="x2-details-stack"'), idxHtml.indexOf('/#x2-details-stack'));
    return X1_PFX.every(p => blk.includes(`id="${p}-card"`)) && blk.includes('id="x1-kho-card"'); })());
check('C6: má»i tháº» chi tiáº¿t X1 cÃ³ form + thanh tá»“n + khung tháº» ngÃ y (KPI Thá»‘ng KÃª TRá»ª Sáº¥y Sinh â€” Ä‘Ã£ gá»¡ 11/2026)',
  X1_PFX.every(p =>
    idxHtml.includes(`id="${p}-form"`) && idxHtml.includes(`id="${p}-stock-bar"`) &&
    idxHtml.includes(`id="${p}-day-cards"`)) &&
  X1_PFX.filter(p => p !== 'x1-say-sinh').every(p => idxHtml.includes(`id="${p}-stats"`)) &&
  !idxHtml.includes('id="x1-say-sinh-stats"'));
check('C7: chip Ä‘áº¿m + sparkline trÃªn launcher X1 cÃ³ Ã´ riÃªng (#x2-mini-count/spark-x1-*)',
  X1_PFX.filter(p => p !== 'x1-phoi-say').every(p => idxHtml.includes(`id="x2-mini-count-${p}"`) &&
                    idxHtml.includes(`id="x2-mini-spark-${p}"`)));
check('C8: x2CardCountText tráº£ Tá»’N (khÃ´ng cÃ²n "Sáº¯p cÃ³") cho 5 tháº» Ä‘uÃ´i',
  ['x1-loc-ong-card', 'x1-cat-mat-card', 'x1-bo-card', 'x1-phoi-say-card', 'x1-loc-thanh-card']
    .every(id => x1.x1CardCountText(id) === 'Háº¿t tá»“n'));
check('C9: X1_CHAIN_SPECS mÃ´ táº£ Ä‘á»§ 5 cÃ´ng Ä‘oáº¡n Ä‘uÃ´i theo Ä‘Ãºng thá»© tá»± chuá»—i',
  x1.X1_CHAIN_SPECS.map(s => s.key).join(',') === 'locOng,catMat,bo,phoiSay,locThanh' &&
  x1.X1_CHAIN_SPECS.every(s => s.storeKey && s.stateKey && s.rateKind && s.cardId));
check('C10: form Lá»c á»ng Ä‘á»•i tÃªn KL sÃ³t máº¯t vÃ  gom 3 Ã´ KL theo kÃ­ch thÆ°á»›c gá»n',
  /id="x1-loc-ong-card"[\s\S]*?KL SÃ³t Máº¯t \(kg\)/.test(idxHtml) &&
  (idxHtml.match(/class="form-group x1-loc-ong-qty-group"/g) || []).length === 3 &&
  stylesCss.includes('.x2-form-row .form-group.x1-loc-ong-qty-group { flex: 0 0 160px; }') &&
  stylesCss.includes('flex: 1 1 calc(50% - 4px) !important;'));

// â”€â”€â”€ D. CHUá»–I LIÃŠN Káº¾T: lÃ´ NL X1 â†’ Cáº®T á»NG â†’ Sáº¤Y SINH â†’ Bá»C â”€â”€â”€â”€â”€
console.log('--- D. CHUá»–I LIÃŠN Káº¾T 3 CÃ”NG ÄOáº N ---');
check('D1: nguá»“n Cáº¯t á»ng CHá»ˆ láº¥y lÃ´ vá»‹ trÃ­ "xuong-1" (bá» lÃ´ XÆ°á»Ÿng 2)',
  (() => { document.getElementById('x1-cat-ong-material').value = 'x2m-c';
    return true; })() && (() => {
    // fillX1CatOngOptions chá»‰ liá»‡t kÃª lÃ´ X1 â†’ lÃ´ X2 khÃ´ng cÃ³ trong danh sÃ¡ch
    x1.fillX1CatOngOptions();
    return !document.getElementById('x1-cat-ong-material').innerHTML.includes('x2m-c') &&
            document.getElementById('x1-cat-ong-material').innerHTML.includes('x1m-a');
  })());

// Ghi 1 lÆ°á»£t Cáº¯t á»ng: lÃ´ 1000kg â†’ Ä‘áº¡t 850 + loáº¡i 150
document.getElementById('x1-cat-ong-material').value = 'x1m-a';
document.getElementById('x1-cat-ong-date').value = '2026-09-10';
document.getElementById('x1-cat-ong-kl-dat').value = '850';
document.getElementById('x1-cat-ong-kl-loai').value = '150';
document.getElementById('x1-cat-ong-note').value = '';
x1.handleX1CatOngSubmit({ preventDefault(){} });
check('D2: ghi lÆ°á»£t Cáº¯t á»ng (850 Ä‘áº¡t + 150 loáº¡i = 1000 Ä‘áº§u vÃ o)',
  state.xuong1CatOngRecords.length === 1 &&
  state.xuong1CatOngRecords[0].klDat === 850 && state.xuong1CatOngRecords[0].klLoai === 150);
check('D3: lÃ´ Ä‘Ã£ cáº¯t Tá»° áº¨N khá»i Ã´ chá»n (lÃ´ X1 thá»© 2 váº«n cÃ²n)',
  document.getElementById('x1-cat-ong-material').innerHTML.includes('x1m-b') &&
  !document.getElementById('x1-cat-ong-material').innerHTML.includes('x1m-a'));
const co = state.xuong1CatOngRecords[0];
check('D4: tá»“n Cáº¯t á»ng = KL á»‘ng Äáº T (850kg) âˆ’ pháº§n Ä‘Ã£ sáº¥y (chÆ°a cÃ³ â†’ 850)',
  x1.x1CatOngRemainingOf(co, null) === 850);
check('D5: ngÆ°á»i cáº¯t tá»± Ä‘á»™ng tá»« bá»™ pháº­n "XÆ°á»Ÿng 1" (LÃ½ VÄƒn Má»™t)',
  state.xuong1CatOngRecords[0].worker.includes('LÃ½ VÄƒn Má»™t'));
check('D6: giá» cáº¯t snapshot = 4.5h HC (07:00â€“11:30, ná»­a sau váº¯t vÃ o nghá»‰ trÆ°a 11:30â€“13:00 â†’ loáº¡i 0.5h)',
  Math.abs((state.xuong1CatOngRecords[0].workHoursHC || 0) - 4.5) < 0.01 &&
  Math.abs((state.xuong1CatOngRecords[0].workHoursTC || 0) - 0) < 0.01 &&
  Math.abs((state.xuong1CatOngRecords[0].workHours || 0) - 4.5) < 0.01);

// Ghi 1 lÆ°á»£t Sáº¥y Sinh â€” CHáº¶N vÆ°á»£t pháº§n cÃ²n chÆ°a sáº¥y
document.getElementById('x1-say-sinh-source').value = co.id;
document.getElementById('x1-say-sinh-date').value = '2026-09-10';
x1.x1SaySinhRenderAllocations();
document.getElementById(`x1-say-sinh-allocation-${co.id}`).value = '900'; // VÆ¯á»¢T 850
document.getElementById('x1-say-sinh-sulfur-qty').value = '2';
x1.handleX1SaySinhSubmit({ preventDefault(){} });
check('D7: CHáº¶N lÆ°u KL sáº¥y vÆ°á»£t pháº§n cÃ²n chÆ°a sáº¥y (900 > 850)',
  state.xuong1SaySinhRecords.length === 0);
document.getElementById(`x1-say-sinh-allocation-${co.id}`).value = '500';
x1.handleX1SaySinhSubmit({ preventDefault(){} });
check('D8: ghi lÆ°á»£t Sáº¥y Sinh 500kg â†’ tá»“n Cáº¯t á»ng cÃ²n 350kg',
  state.xuong1SaySinhRecords.length === 1 && x1.x1CatOngRemainingOf(co, null) === 350);
const ss = state.xuong1SaySinhRecords[0];
check('D9: ngÆ°á»i sáº¥y tá»± Ä‘á»™ng tá»« bá»™ pháº­n "XÆ°á»Ÿng 1" (Äá»— VÄƒn Hai)',
  ss.worker.includes('Äá»— VÄƒn Hai'));


// Ghi lÆ°á»£t Bá»‘c â€” nguá»“n = lÆ°á»£t Sáº¥y Sinh, cháº·n vÆ°á»£t
document.getElementById('x1-boc-source').value = ss.id;
document.getElementById('x1-boc-date').value = '2026-09-11';
document.getElementById('x1-boc-qty').value = '600'; // VÆ¯á»¢T 500
x1.handleX1BocSubmit({ preventDefault(){} });
check('D10: CHáº¶N lÆ°u KL bá»‘c vÆ°á»£t pháº§n cÃ²n chÆ°a bá»‘c (600 > 500)',
  state.xuong1BocRecords.length === 0);
document.getElementById('x1-boc-qty').value = '300';
x1.handleX1BocSubmit({ preventDefault(){} });
check('D11: ghi lÆ°á»£t Bá»‘c 300kg â†’ tá»“n Sáº¥y Sinh cÃ²n 200kg',
  state.xuong1BocRecords.length === 1 && x1.x1SaySinhRemainingOf(ss, null) === 200);
check('D12: ngÆ°á»i bá»‘c tá»± Ä‘á»™ng tá»« bá»™ pháº­n "XÆ°á»Ÿng 1" (Pháº¡m VÄƒn Ba)',
  state.xuong1BocRecords[0].worker.includes('Pháº¡m VÄƒn Ba'));
check('D13: KHÃ”NG nháº§m vá»‹ trÃ­ "Bá»‘c Luá»“ng" cá»§a XÆ°á»Ÿng 2 (NgÃ´ VÄƒn Bá»‘n khÃ´ng xuáº¥t hiá»‡n)',
  JSON.stringify(state.xuong1BocRecords[0].worker).indexOf('Bá»‘n') === -1);

// XÃ³a lÆ°á»£t Sáº¥y Sinh â†’ tá»“n Cáº¯t á»ng TRáº¢ Láº I pháº§n Ä‘Ã£ sáº¥y
const bocRec = state.xuong1BocRecords[0];
state.xuong1BocRecords = [];
check('D14: xÃ³a lÆ°á»£t Bá»‘c â†’ tá»“n Sáº¥y Sinh tráº£ láº¡i Ä‘á»§ 500kg', x1.x1SaySinhRemainingOf(ss, null) === 500);
state.xuong1SaySinhRecords = [];
check('D15: xÃ³a lÆ°á»£t Sáº¥y Sinh â†’ tá»“n Cáº¯t á»ng tráº£ láº¡i Ä‘á»§ 850kg', x1.x1CatOngRemainingOf(co, null) === 850);

// Sá»­a 1 lÆ°á»£t (excludeId) â†’ pháº§n cá»§a lÆ°á»£t Ä‘Ã³ Ä‘Æ°á»£c tráº£ láº¡i khi tÃ­nh tá»“n
state.xuong1SaySinhRecords = [ss];
check('D16: Ä‘ang Sá»¬A lÆ°á»£t sáº¥y â†’ excludeId tráº£ láº¡i pháº§n cá»§a chÃ­nh nÃ³ (850)',
  x1.x1CatOngRemainingOf(co, ss.id) === 850);

// Chip Ä‘áº¿m trÃªn tháº» launcher = Tá»’N CHá»œ Xá»¬ LÃ
check('D17: chip "Tá»“n â€¦ kg" trÃªn tháº» Cáº¯t á»ng / Sáº¥y Sinh / Bá»‘c',
  /^Tá»“n /.test(x1.x1CardCountText('x1-cat-ong-card')) &&
  /^Tá»“n /.test(x1.x1CardCountText('x1-say-sinh-card')) &&
  /^Tá»“n /.test(x1.x1CardCountText('x1-boc-card')));

// â”€â”€â”€ E. Äá»ŠNH Má»¨C CÃ”NG SUáº¤T XÆ¯á»žNG 1 (kg/h) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
console.log('--- E. Äá»ŠNH Má»¨C XÆ¯á»žNG 1 ---');
check('E1: key Ä‘á»‹nh má»©c = bamboo_tracker_x1_rates_v1 (dict 3 khá»‘i)',
  STORAGE_KEY_X1_RATES === 'bamboo_tracker_x1_rates_v1' &&
  state.x1Rates.catOng !== undefined && state.x1Rates.saySinh !== undefined && state.x1Rates.boc !== undefined);
check('E2: popup Ä‘á»‹nh má»©c X1 cÃ³ trong index.html (1 popup cho 3 cÃ´ng Ä‘oáº¡n)',
  idxHtml.includes('id="modal-x1-rate"') && idxHtml.includes('id="x1-rate-kind"') &&
  idxHtml.includes('id="x1-rate-month"') && idxHtml.includes('id="x1-rate-value"'));
check('E3: 3 nÃºt "Äá»‹nh má»©c" trong 3 form Ä‘á»u gáº¯n data-admin-only (chá»‰ Admin)',
  ['btn-x1-cat-ong-rate', 'btn-x1-say-sinh-rate', 'btn-x1-boc-rate']
    .every(id => new RegExp(`id="${id}"[^>]*data-admin-only`).test(idxHtml)));
check('E4: x1RateOf tráº£ 0 khi chÆ°a Ä‘áº·t Ä‘á»‹nh má»©c', x1.x1RateOf('2026-09', 'catOng') === 0);

document.getElementById('x1-rate-kind').value = 'catOng';
document.getElementById('x1-rate-month').value = '2026-09';
document.getElementById('x1-rate-value').value = '600';
x1.handleX1RateSave();
check('E5: lÆ°u Ä‘á»‹nh má»©c Cáº¯t á»ng thÃ¡ng 09/2026 = 600 kg/h',
  ((state.x1Rates.catOng || {})['2026-09']) === 600 && x1.x1RateOf('2026-09-10', 'catOng') === 600);
check('E6: má»—i cÃ´ng Ä‘oáº¡n cÃ³ ÄM RIÃŠNG (Sáº¥y Sinh/Bá»‘c chÆ°a Ä‘áº·t)',
  x1.x1RateOf('2026-09-10', 'saySinh') === 0 && x1.x1RateOf('2026-09-10', 'boc') === 0);
check('E7: lÆ°u xuá»‘ng localStorage Ä‘Ãºng key', (() => {
  const o = JSON.parse(localStorage.getItem(STORAGE_KEY_X1_RATES) || '{}');
  return ((o.catOng || {})['2026-09']) === 600; })());
check('E8: reader chuáº©n hoÃ¡ dá»¯ liá»‡u cÅ© thiáº¿u khá»‘i váº«n Ä‘á»§ 3 khá»‘i',
  (() => { const m = JSON.parse(JSON.stringify(state.x1Rates)); delete m.boc;
    state.x1Rates = m; x1.loadX1Rates();
    return state.x1Rates.boc !== undefined; })());


// â”€â”€â”€ F. Ná»I Äá»¦ 6 CHá»– (state Â· storage Â· cloud Â· history Â· main Â· capacity) â”€â”€
console.log('--- F. Ná»I 6 CHá»– + SW ---');
const x2Src = fs.readFileSync(new URL('../js/xuong2.js', import.meta.url), 'utf8');
const exportSrc = fs.readFileSync(new URL('../js/export-xlsx.js', import.meta.url), 'utf8');
const capSrc = fs.readFileSync(new URL('../js/capacity.js', import.meta.url), 'utf8');
const swJs = fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
check('F1: state.js khai 4 key + export',
  ['bamboo_tracker_xuong1_cat_ong_v1', 'bamboo_tracker_xuong1_say_sinh_v1',
   'bamboo_tracker_xuong1_boc_v1', 'bamboo_tracker_x1_rates_v1']
    .every(k => fs.readFileSync(new URL('../js/state.js', import.meta.url), 'utf8').includes(k)));
check('F2: storage.js cÃ³ hÃ m restore 4 khÃ³a + ghi vÃ o snapshot file/export/import',
  ['restoreXuong1CatOng', 'restoreXuong1SaySinh', 'restoreXuong1Boc', 'restoreX1Rates']
    .every(n => storageSrc.includes(n + ',') || storageSrc.includes('function ' + n)) &&
  storageSrc.includes('xuong1CatOngRecords: state.xuong1CatOngRecords || []') &&
  storageSrc.includes('x1Rates: state.x1Rates || {}'));
check('F3: cloud.js cÃ³ Ä‘á»§ 4 Ä‘iá»ƒm (snapshot Â· parse Â· merge Â· apply Â· persist Â· RATE_DOMAINS)',
  cloudSrc.includes('xuong1CatOngRecords: state.xuong1CatOngRecords || []') &&
  cloudSrc.includes("xuong1CatOngRecords: obj.xuong1CatOngRecords || []") &&
  cloudSrc.includes("state.xuong1CatOngRecords = m(clean('xuong1CatOngRecords'") &&
  cloudSrc.includes("state.xuong1CatOngRecords = clean('xuong1CatOngRecords'") &&
  cloudSrc.includes('STORAGE_KEY_XUONG1_CAT_ONG') && cloudSrc.includes("'x1Rates'"));
check('F4: history.js Ä‘Äƒng kÃ½ 4 vÃ¹ng dá»¯ liá»‡u (tab kanban)',
  historySrc.includes('xuong1CatOngRecords:') && historySrc.includes('xuong1SaySinhRecords:') &&
  historySrc.includes('xuong1BocRecords:') && historySrc.includes('x1Rates:'));
check('F5: main.js náº¡p 4 khÃ³a lÃºc boot + Ã¡p cÃ´ng táº¯c',
  mainSrc.includes('loadXuong1CatOng()') && mainSrc.includes('loadXuong1SaySinh()') &&
  mainSrc.includes('loadXuong1Boc()') && mainSrc.includes('loadX1Rates()') &&
  mainSrc.includes('loadStageWs()') && mainSrc.includes('applyStageWsDom()'));
check('F6: events.js wire 3 form + cÃ´ng táº¯c + á»§y quyá»n sá»­a/xÃ³a X1',
  eventsSrc.includes("'x1-cat-ong-form', 'submit'") &&
  eventsSrc.includes("'x1-say-sinh-form', 'submit'") &&
  eventsSrc.includes("'x1-boc-form', 'submit'") &&
  eventsSrc.includes("'stage-ws-x1', 'click'") &&
  eventsSrc.includes('data-x1-cat-ong-edit') &&
  eventsSrc.includes('data-x1-boc-delete') &&
  eventsSrc.includes("'btn-x1-rate-save', 'click'"));
check('F6b: Bá»• / Bá»‘c / Lá»c á»ng / Cáº¯t Máº¯t dÃ¹ng 3 nÃºt Ä‘á»“ng bá»™ LÃ m Má»›i > LÆ°u > CÄ sau',
  idxHtml.includes('id="btn-x1-bo-stage-next"') &&
  idxHtml.includes('id="btn-x1-boc-stage-next"') &&
  idxHtml.includes('id="btn-x1-loc-ong-stage-next"') &&
  idxHtml.includes('id="btn-x1-cat-mat-stage-next"') &&
  !idxHtml.includes('id="btn-x1-bo-stage-prev"') &&
  !idxHtml.includes('id="btn-x1-loc-ong-stage-prev"') &&
  !idxHtml.includes('id="btn-x1-cat-mat-stage-prev"') &&
  idxHtml.includes('x1-bo-actions-bo') &&
  idxHtml.includes('x1-boc-actions') &&
  idxHtml.includes('x1-loc-ong-actions') &&
  idxHtml.includes('x1-cat-mat-actions') &&
  stylesCss.includes('repeat(3, minmax(0, 1fr))'));
check('F6c: gá»™p báº£n ghi X1 trÃ¹ng id khÃ´ng lÃ m máº¥t field schema cÅ©',
  (() => {
    const oldRecord = {
      id: 'x1-merge-test', updatedAt: '2026-11-18T12:00:00.000Z',
      qtyIn: 100, legacyLotCode: 'X1-CU', lotAllocations: [{ sourceId: 'lot-cu', qtyIn: 100 }]
    };
    const newRecord = {
      id: 'x1-merge-test', updatedAt: '2026-11-18T13:00:00.000Z',
      qtyIn: 125, matrixRows: [{ len: 50, width: 11, total: 125 }]
    };
    const merged = mergeX1RecordsByTimestamp([newRecord], [oldRecord])[0];
    return merged.qtyIn === 125 &&
      merged.legacyLotCode === 'X1-CU' &&
      merged.lotAllocations[0].sourceId === 'lot-cu' &&
      merged.matrixRows[0].total === 125;
  })());
check('F7: capacity.js cÃ³ 3 dÃ²ng CAP_STAGES ws:"x1" + 3 sparkline + khÃ³a giá» sá»± cá»‘',
  capSrc.includes("id: 'x1catong', ws: 'x1'") && capSrc.includes("id: 'x1saysinh', ws: 'x1'") &&
  capSrc.includes("id: 'x1boc', ws: 'x1'") && capSrc.includes("'x2-mini-spark-x1-cat-ong'") &&
  capSrc.includes('x1catong: \'x1catong\''));

// â”€â”€â”€ G. Cáº¤U TRÃšC SW + TIÃŠU Äá»€ TAB â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
console.log('--- G. Cáº¤U TRÃšC SW + TAB ---');
check('G1: sw.js Ä‘Ã£ tÄƒng CACHE_NAME cho giao diá»‡n má»›i', /nha-may-ngoc-son-v486/.test(swJs));
check('G2: nav desktop + mobile Ä‘á»•i nhÃ£n "CÃ´ng Äoáº¡n SX"',
  idxHtml.includes('<span>CÃ´ng Ä‘oáº¡n</span>') &&
  idxHtml.includes('title="CÃ´ng Äoáº¡n SX"'));
check('G3: tab CÃ´ng Äoáº¡n SX cÃ³ Ã´ nháº­n diá»‡n 2 xÆ°á»Ÿng á»Ÿ header',
  idxHtml.includes('2 xÆ°á»Ÿng riÃªng biá»‡t â€” chuyá»ƒn báº±ng nÃºt XÆ¯á»žNG 1 / XÆ¯á»žNG 2'));
check('G4: CSS Ä‘iá»‡n thoáº¡i cho cÃ´ng táº¯c (2 nÃºt chia Ä‘á»u + lÆ°á»›i X1 2 cá»™t)',
  stylesCss.includes('#x1-cards-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }'));

// â”€â”€â”€ H. CHUá»–I 5 CÃ”NG ÄOáº N ÄUÃ”I (05/10/2026 â€” GIAI ÄOáº N 2) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Bá»‘c â†’ Lá»c á»ng â†’ Cáº¯t Máº¯t â†’ Bá»• â†’ PhÆ¡i Sáº¥y â†’ Lá»c Thanh/BÃ³ XÃ´
console.log('--- H. CHUá»–I 5 CÃ”NG ÄOáº N ÄUÃ”I ---');
const spLO = x1.x1ChainSpecByKey('locOng'), spCM = x1.x1ChainSpecByKey('catMat');
const spBO = x1.x1ChainSpecByKey('bo'),     spPS = x1.x1ChainSpecByKey('phoiSay');
const spLT = x1.x1ChainSpecByKey('locThanh');
const ALL5 = [spLO, spCM, spBO, spPS, spLT];
ALL5.forEach(s => { state[s.stateKey] = []; state[s.editKey] = null; });
// Nguá»“n gá»‘c = 1 lÆ°á»£t Bá»C 1000kg (xÃ¢y Ä‘á»™c láº­p cho má»¥c H)
const saySinhRecordsBeforeChain = state.xuong1SaySinhRecords;
state.xuong1BocRecords = [{
  id: 'boc-h', date: '2026-09-12', qty: 1000,
  materialType: 'Váº§u/ná»©a tÆ°Æ¡i', supplier: 'Táº¿',
  srcType: 'Váº§u/ná»©a tÆ°Æ¡i', srcSupplier: 'Táº¿', saySinhId: 'ss-x'
}];
state.xuong1SaySinhRecords = [...saySinhRecordsBeforeChain, {
  id: 'ss-x', code: 'SS-2026-0910-01', date: '2026-09-10'
}];
const bocH = state.xuong1BocRecords[0];
function hFill(spec, srcId, d, qi, qok, ql) {
  x1.fillX1ChainOptions(spec); // Ä‘á»• danh sÃ¡ch nguá»“n â€” nhÆ° khi má»Ÿ tháº» á»Ÿ app tháº­t
  const g = p => document.getElementById('x1-' + spec.prefix + '-' + p);
  const grouped = spec.sourceGroups
    ? x1.x1ChainPending(spec).find(s => s.sources.some(a => a.sourceId === srcId))
    : null;
  g('src').value = grouped ? grouped.id : srcId; g('date').value = d;
  g('in').value = String(qi); g('ok').value = String(qok); g('loai').value = String(ql);
  x1.handleX1ChainSubmit(spec, { preventDefault(){} });
}
check('H1: Cáº¯t Máº¯t láº¥y qtyLoai tá»« Lá»c á»ng; cÃ¡c cÃ´ng Ä‘oáº¡n káº¿ tiáº¿p váº«n láº¥y qtyOk',
  spLO.srcOutputOf(bocH) === 1000 &&
  spCM.srcOutputOf({ qtyOk: 500, qtyLoai: 30 }) === 30 && spBO.srcOutputOf({ qtyOk: 500 }) === 500 &&
  spPS.srcOutputOf({ qtyOk: 500 }) === 500 && spLT.srcOutputOf({ qtyOk: 500 }) === 500 &&
  ALL5.every(s => !!s.storeKey && s.storeKey.startsWith('bamboo_tracker_xuong1_')));
check('H2: tá»“n nguá»“n Bá»‘c = 1000kg (chÆ°a lÆ°á»£t Lá»c á»ng nÃ o)', x1.x1ChainRemainingOf(spLO, bocH, null) === 1000);
check('H3: Ã´ chá»n Lá»c á»ng liá»‡t kÃª lÆ°á»£t Bá»‘c + tá»± Ä‘iá»n ngÃ y + qtyIn = pháº§n cÃ²n láº¡i',
  (() => { x1.fillX1ChainOptions(spLO);
    const sel = document.getElementById('x1-loc-ong-src');
    const okHtml = sel.innerHTML.includes('boc-h') &&
      sel.innerHTML.includes('[SS-2026-0910-01]') && sel.innerHTML.includes('NCC Táº¿') &&
      sel.innerHTML.includes('Bá»‘c 12/09/26') && sel.innerHTML.includes('Tá»“n 1.000 kg');
    sel.value = 'boc-h';                    // ngÆ°á»i dÃ¹ng chá»n (browser tá»± chá»n option Ä‘áº§u)
    x1.x1ChainSyncLinked(spLO, true);       // Ä‘Ãºng handler 'change' cá»§a events.js
    return okHtml &&
      document.getElementById('x1-loc-ong-date').value === '2026-09-12' &&
      document.getElementById('x1-loc-ong-in').value === '1000'; })());

// â”€â”€ CHáº¶N 2 lá»›p â”€â”€
hFill(spLO, 'boc-h', '2026-09-13', 1200, 1100, 100); // qtyIn VÆ¯á»¢T tá»“n
check('H4: CHáº¶N qtyIn vÆ°á»£t pháº§n cÃ²n láº¡i cá»§a nguá»“n (1200 > 1000)', state.xuong1LocOngRecords.length === 0);
hFill(spLO, 'boc-h', '2026-09-13', 800, 700, 200);    // Ä‘áº¡t + loáº¡i > Ä‘em xá»­ lÃ½
check('H5: CHáº¶N Äáº¡t + Loáº¡i vÆ°á»£t Äem xá»­ lÃ½ (900 > 800)', state.xuong1LocOngRecords.length === 0);
hFill(spLO, 'boc-h', '2026-09-13', 800, 750, 50);
check('H6: ghi lÆ°á»£t Lá»c á»ng 800kg (750 Ä‘áº¡t + 50 loáº¡i) â†’ tá»“n Bá»‘c cÃ²n 200kg',
  state.xuong1LocOngRecords.length === 1 && x1.x1ChainRemainingOf(spLO, bocH, null) === 200);
const lo = state.xuong1LocOngRecords[0];
check('H7: snapshot nguá»“n theo Bá»C (type + NCC + ngÃ y) chÃ©p vÃ o lÆ°á»£t Lá»c á»ng',
  lo.srcType === 'Váº§u/ná»©a tÆ°Æ¡i' && lo.srcSupplier === 'Táº¿' && lo.srcDate === '2026-09-12' &&
  lo.lotCode === 'SS-2026-0910-01');

// â”€â”€ VÃ²ng tiáº¿p: Lá»c á»ng â†’ Cáº¯t Máº¯t â†’ Bá»• â†’ PhÆ¡i Sáº¥y â†’ Lá»c Thanh â”€â”€
check('H8: Cáº¯t Máº¯t nháº­n tá»“n tá»« KL sÃ³t máº¯t cá»§a Lá»c á»ng (50kg)',
  x1.x1ChainRemainingOf(spCM, lo, null) === 50 &&
  (() => { x1.fillX1ChainOptions(spCM);
    const optionHtml = document.getElementById('x1-cat-mat-src').innerHTML;
    return optionHtml.includes('[SS-2026-0910-01]') && optionHtml.includes('NCC Táº¿') &&
      optionHtml.includes('Lá»c á»ng 13/09/26') && optionHtml.includes('Tá»“n 50 kg'); })());
hFill(spCM, lo.id, '2026-09-14', 50, 45, 5);
const cm = state.xuong1CatMatRecords[0];
check('H9: ghi lÆ°á»£t Cáº¯t Máº¯t 50kg â†’ KL sÃ³t máº¯t cá»§a Lá»c á»ng háº¿t hÃ ng (Tá»° áº¨N khá»i Ã´ chá»n)',
  !!cm && cm.lotCode === 'SS-2026-0910-01' &&
  x1.x1ChainDisplay(spCM, cm).lotCode === 'SS-2026-0910-01' &&
  x1.x1ChainRemainingOf(spCM, lo, null) === 0 &&
  (() => { x1.fillX1ChainOptions(spCM);
    return !document.getElementById('x1-cat-mat-src').innerHTML.includes(lo.id); })());
x1.fillX1ChainOptions(spBO);
const boGroup = x1.x1ChainPending(spBO).find(g => g.sources.some(s => s.sourceId === cm.id));
check('H9a: chá»n theo lÃ´ tá»± gom á»ng Äáº¡t tá»« Lá»c á»ng + Äáº¡t tá»« Cáº¯t Máº¯t = 795kg',
  !!boGroup && document.getElementById('x1-bo-in').value === '795' &&
  document.getElementById('x1-bo-src').innerHTML.includes('á»ng Äáº¡t tá»« Lá»c á»ng + SÃ³t Máº¯t Ä‘Ã£ Cáº¯t Máº¯t'));
hFill(spBO, cm.id, '2026-09-15', 45, 40, 5);
const bo = state.xuong1BoRecords[0];
check('H10: Bá»• má»™t pháº§n Æ°u tiÃªn Äáº¡t tá»« Cáº¯t Máº¯t, giá»¯ láº¡i pháº§n Lá»c á»ng chÆ°a Bá»•',
  !!bo && bo.lotCode === 'SS-2026-0910-01' &&
  bo.sourceAllocations.some(a => a.sourceType === 'catMat' && a.sourceId === cm.id && a.qty === 45) &&
  x1.x1ChainRemainingOf(spBO, cm, null) === 0 &&
  x1.x1ChainPending(spBO).reduce((s, g) => s + x1.x1ChainRemainingOf(spBO, g, null), 0) === 750);
hFill(spPS, bo.id, '2026-09-16', 40, 35, 5);
const ps = state.xuong1PhoiSayRecords[0];
check('H11: ghi lÆ°á»£t PhÆ¡i Sáº¥y 40kg â†’ tá»“n Bá»• = 5kg',
  !!ps && ps.lotCode === 'SS-2026-0910-01' && x1.x1ChainRemainingOf(spPS, bo, null) === 5);
const lt = {
  id: 'lt-legacy-h', date: '2026-09-17', phoiSayId: ps.id, boId: bo.id,
  qtyIn: 35, qtyOk: 30, qtyLoai: 5, lotCode: 'SS-2026-0910-01'
};
state.xuong1LocThanhRecords.push(lt);
check('H12: báº£n ghi cÅ© Lá»c Thanh váº«n láº¥y 35kg tá»« PhÆ¡i Sáº¥y; nguá»“n má»›i chá» theo Bá»•',
  !!lt && lt.lotCode === 'SS-2026-0910-01' &&
  x1.x1ChainRemainingOf(spLT, ps, null) === 0 &&
  x1.x1ChainPending(spLT).some(src => src.id === bo.id) &&
  x1.x1ChainPending(spLT).reduce((sum, src) => sum + x1.x1ChainRemainingOf(spLT, src, null), 0) === 5);
const chainForLot = [[spLO, lo], [spCM, cm], [spBO, bo], [spPS, ps], [spLT, lt]];
chainForLot.forEach(([, record]) => { delete record.lotCode; });
check('H12a: dá»¯ liá»‡u cÅ© váº«n truy ngÆ°á»£c mÃ£ lÃ´ qua cÃ¡c liÃªn káº¿t cÃ´ng Ä‘oáº¡n',
  chainForLot.every(([spec, record]) =>
    x1.x1ChainDisplay(spec, record).lotCode === 'SS-2026-0910-01'));
chainForLot.forEach(([, record]) => { record.lotCode = 'SS-2026-0910-01'; });
check('H13: chip Ä‘áº¿m 5 tháº» Ä‘uÃ´i tráº£ Sá» LIá»†U tháº­t (khÃ´ng cÃ²n "Sáº¯p cÃ³"/"â€“")',
  ALL5.every(s => !['Sáº¯p cÃ³', 'â€“'].includes(x1.x1CardCountText(s.cardId))) &&
  ['catMat', 'bo', 'phoiSay', 'locThanh']
    .every(k => k === 'bo'
      ? x1.x1CardCountText(x1.x1ChainSpecByKey(k).cardId) === 'Tá»“n 750 kg'
      : k === 'phoiSay'
        ? x1.x1CardCountText(x1.x1ChainSpecByKey(k).cardId) === 'Tá»“n 5 kg'
        : k === 'locThanh'
          ? x1.x1CardCountText(x1.x1ChainSpecByKey(k).cardId) === 'Tá»“n 5 kg'
          : x1.x1CardCountText(x1.x1ChainSpecByKey(k).cardId) === 'Háº¿t tá»“n') &&
  /^Tá»“n /.test(x1.x1CardCountText(spLO.cardId)));

// â”€â”€ Sá»¬A tráº£ láº¡i pháº§n cá»§a lÆ°á»£t Ä‘ang sá»­a (excludeId) â”€â”€
x1.editX1Chain(spLO, lo.id); // vÃ o mode sá»­a
document.getElementById('x1-loc-ong-in').value = '400';
document.getElementById('x1-loc-ong-ok').value = '380';
document.getElementById('x1-loc-ong-loai').value = '20';
x1.handleX1ChainSubmit(spLO, { preventDefault(){} });
check('H14: sá»­a lÆ°á»£t Lá»c á»ng 800 â†’ 400 kg tráº£ láº¡i 400kg cho nguá»“n Bá»‘c',
  state.xuong1LocOngRecords.length === 1 &&
  state.xuong1LocOngRecords[0].qtyIn === 400 &&
  x1.x1ChainRemainingOf(spLO, bocH, null) === 600);
check('H15: sá»­a KHÃ”NG sinh báº£n ghi trÃ¹ng (váº«n Ä‘Ãºng 1 lÆ°á»£t)',
  state.xuong1LocOngRecords.length === 1 && state.x1LocOngEditId === null);

// â”€â”€ XÃ“A cÃ³ tombstone â”€â”€
const delId = lt.id;
globalThis.confirm = () => true;
x1.deleteX1Chain(spLT, delId);
check('H16: xÃ³a lÆ°á»£t Lá»c Thanh â†’ máº£ng trá»‘ng + tá»“n PhÆ¡i Sáº¥y tráº£ láº¡i 35kg',
  state.xuong1LocThanhRecords.length === 0 && x1.x1ChainRemainingOf(spPS, ps, null) === 35);

// â”€â”€ RENDER tháº» ngÃ y + thanh tá»“n cá»§a 1 tháº» Ä‘uÃ´i â”€â”€
x1.renderX1ChainCard(spLO);
check('H17: render tháº» Lá»c á»ng â†’ hiá»ƒn thá»‹ mÃ£ lÃ´ trong lá»‹ch sá»­',
  document.getElementById('x1-loc-ong-day-cards').innerHTML.includes('SS-2026-0910-01'));
check('H17b: lá»‹ch sá»­ Lá»c á»ng váº«n hiá»ƒn thá»‹ nguá»“n vÃ  thá»‘ng kÃª',
  document.getElementById('x1-loc-ong-day-cards').innerHTML.includes('Váº§u/ná»©a tÆ°Æ¡i') &&
  document.getElementById('x1-loc-ong-stock-bar').innerHTML.length > 0 &&
  document.getElementById('x1-loc-ong-stats').innerHTML.includes('LÆ°á»£t lá»c á»‘ng'));
check('H17c: xuáº¥t Excel chuá»—i XÆ°á»Ÿng 1 cÃ³ cá»™t MÃ£ LÃ´',
  exportSrc.includes("'MÃ£ LÃ´'") && exportSrc.includes("d.lotCode || ''"));
check('H17d: xuáº¥t Excel Lá»c á»ng gá»i KL Loáº¡i lÃ  KL SÃ³t Máº¯t, cÃ´ng Ä‘oáº¡n khÃ¡c giá»¯ nhÃ£n chung',
  exportSrc.includes("spec.key === 'locOng' ? 'KL SÃ³t Máº¯t (kg)' : 'KL Loáº¡i (kg)'"));
state.xuong1SaySinhRecords = saySinhRecordsBeforeChain;

check('H18: 5 form cÃ³ Ä‘á»§ nguá»“n Â· Ã´ tÃ­nh Â· nÃºt Ä‘á»‹nh má»©c data-admin-only',
  ALL5.every(s => {
    const p = s.prefix;
    return idxHtml.includes(`id="x1-${p}-form"`) && idxHtml.includes(`id="x1-${p}-calc"`) &&
      new RegExp(`id="btn-x1-${p}-rate"[^>]*data-admin-only`).test(idxHtml);
  }));
check('H19: events.js ná»‘i Ä‘á»§ 5 form (submit Â· cancel Â· src change Â· Ã´ tÃ­nh Â· Ä‘á»‹nh má»©c Â· á»§y quyá»n)',
  eventsSrc.includes('X1_CHAIN_SPECS.forEach(sp => {') &&
  eventsSrc.includes("safeOn(base + '-form', 'submit'") &&
  eventsSrc.includes("safeOn(base + '-src', 'change'") &&
  eventsSrc.includes("['in', 'ok', 'loai'].forEach") &&
  eventsSrc.includes("safeOn('btn-' + base + '-rate', 'click'") &&
  eventsSrc.includes("closest('[data-x1-edit]')") &&
  eventsSrc.includes("closest('[data-x1-delete]')"));
check('H20: storage Â· cloud Â· history Â· main Â· capacity giá»¯ dá»¯ liá»‡u cÅ© nhÆ°ng bá» PhÆ¡i Sáº¥y khá»i cÃ´ng suáº¥t',
  ['restoreXuong1LocOng', 'restoreXuong1CatMat', 'restoreXuong1Bo', 'restoreXuong1PhoiSay', 'restoreXuong1LocThanh']
    .every(n => storageSrc.includes('function ' + n)) &&
  ['xuong1LocOngRecords', 'xuong1CatMatRecords', 'xuong1BoRecords',
   'xuong1PhoiSayRecords', 'xuong1LocThanhRecords']
    .every(k => cloudSrc.includes(k + ': state.' + k) && historySrc.includes(k + ':')) &&
  mainSrc.includes('loadX1ChainAll()') &&
  capSrc.includes("id: 'x1locong'") && capSrc.includes("id: 'x1locthanh'") &&
  capSrc.includes("x1locthanh: 'x1locthanh'") &&
  !capSrc.includes("id: 'x1phoisay'") &&
  !capSrc.includes("'x2-mini-spark-x1-phoi-say'"));
check('H21: popup Ä‘á»‹nh má»©c X1 chá»‰ cÃ³ 7 cÃ´ng Ä‘oáº¡n thao tÃ¡c',
  ['catOng', 'saySinh', 'boc', 'locOng', 'catMat', 'bo', 'locThanh']
    .every(k => new RegExp(`<option value="${k}">`).test(idxHtml)) &&
  !new RegExp('<option value="phoiSay">').test(idxHtml) &&
  x1.x1RateOf('2026-09-10', 'locOng') === 0);

// â”€â”€â”€ I. YÃŠU Cáº¦U 12/10/2026: Lá»ŒC LÃ” "CÃ‚Y" Â· Bá»Ž QUA Cáº®T Máº®T Â· VÃ™NG XÆ¯á»žNG 1 â”€â”€
console.log('--- I. Lá»ŒC CÃ‚Y + Bá»Ž QUA Cáº®T Máº®T + VÃ™NG THáºº X1 ---');
check('I1: nguá»“n Cáº¯t á»ng CHá»ˆ nháº­n lÃ´ cÃ³ chá»¯ "cÃ¢y" (lÃ´ X1 khÃ´ng chá»¯ cÃ¢y + lÃ´ X2 bá»‹ loáº¡i)',
  (() => { x1.fillX1CatOngOptions();
    const h = document.getElementById('x1-cat-ong-material').innerHTML;
    // x1m-a Ä‘Ã£ cáº¯t (áº©n â€” D3), cÃ²n x1m-b/e chá» cáº¯t; x1m-d (khÃ´ng chá»¯ cÃ¢y) + x2m-c (X2) loáº¡i
    return h.includes('x1m-b') && h.includes('x1m-e') && !h.includes('x1m-d') && !h.includes('x2m-c'); })());
check('I1b: x1IsCayLot khá»›p má»m â€” "Váº§u CÃ‚Y"/"nua cay" nháº­n, "Váº§u/ná»©a mua sáºµn" loáº¡i',
  x1.x1IsCayLot({ type: 'Váº§u CÃ‚Y tÆ°Æ¡i' }) && x1.x1IsCayLot({ type: 'nua cay kho' }) &&
  x1.x1IsCayLot({ type: 'Luá»“ng cÃ¢y xÃ´' }) && !x1.x1IsCayLot({ type: 'Váº§u/ná»©a mua sáºµn' }) &&
  !x1.x1IsCayLot({ type: '' }) && !x1.x1IsCayLot(null));

// â”€â”€ LÃ´ Lá»c á»ng sinh ra tá»« chuá»—i Äáº¦U TIÃŠN lÃ  Cáº¯t á»ng â†’ Bá»Ž QUA Cáº¯t Máº¯t â”€â”€
// (dÃ¹ng láº¡i lÆ°á»£t sáº¥y ss + lÆ°á»£t cáº¯t á»‘ng co cá»§a má»¥c D â€” chuá»—i link nguyÃªn váº¹n)
state.xuong1BocRecords.push({
  id: 'boc-via', date: '2026-09-20', qty: 2060, saySinhId: ss.id,
  materialType: 'Váº§u cÃ¢y tÆ°Æ¡i', supplier: 'Táº¿', srcType: 'Váº§u cÃ¢y tÆ°Æ¡i', srcSupplier: 'Táº¿'
});
state.xuong1LocOngRecords.push({
  id: 'lo-via', bocId: 'boc-via', lotCode: 'SS-2026-0920-01', date: '2026-09-21', qtyIn: 500, qtyOk: 480, qtyLoai: 100,
  srcType: 'Váº§u cÃ¢y tÆ°Æ¡i', srcSupplier: 'Táº¿', srcDate: '2026-09-10'
});
const loVia = state.xuong1LocOngRecords.find(r => r.id === 'lo-via');
check('I2: x1LocOngViaCutOng truy Ä‘Æ°á»£c chuá»—i Lá»c á»ng â†’ Bá»‘c â†’ Sáº¥y Sinh â†’ Cáº¯t á»ng',
  x1.x1LocOngViaCutOng(loVia) === true && x1.x1LocOngViaCutOng({ id: 'x', bocId: 'khÃ´ng-cÃ³' }) === false &&
  x1.x1LocOngViaCutOng(null) === false);
check('I3: lÃ´ ÄÃƒ qua Cáº¯t á»ng áº¨N khá»i Ã´ chá»n Cáº®T Máº®T (ká»ƒ cáº£ khi cÃ²n tá»“n)',
  x1.x1ChainRemainingOf(spCM, loVia, null) === 100 &&
  (() => { x1.fillX1ChainOptions(spCM);
    return !document.getElementById('x1-cat-mat-src').innerHTML.includes('lo-via'); })());
// LÆ°á»£t Cáº®T Máº®T CÅ¨ váº«n Ä‘Ã³ng gÃ³p Ä‘áº§u ra riÃªng; khÃ´ng trá»« chÃ©o vÃ o á»ng Äáº¡t tá»« Lá»c.
state.xuong1CatMatRecords.push({
  id: 'cm-legacy', locOngId: 'lo-via', date: '2026-09-19', qtyIn: 100, qtyOk: 95, qtyLoai: 5,
  srcType: 'Váº§u cÃ¢y tÆ°Æ¡i', srcSupplier: 'Táº¿'
});
const viaGroup = x1.x1ChainPending(spBO).find(g => g.sources.some(s => s.sourceId === 'lo-via'));
check('I4: lÃ´ cÃ³ 480kg á»ng Äáº¡t tá»« Lá»c + 95kg Äáº¡t tá»« Cáº¯t Máº¯t, khÃ´ng trá»« chÃ©o',
  !!viaGroup && x1.x1ChainRemainingOf(spBO, viaGroup, null) === 575 &&
  x1.x1ChainRemainingOf(spCM, loVia, null) === 0);
check('I5: Ã´ chá»n Bá»• gom theo mÃ£ lÃ´ sá»‘ng vÃ  tá»± tÃ­nh tá»•ng 575kg tá»« hai nhÃ¡nh',
  (() => { x1.fillX1ChainOptions(spBO);
    const h = document.getElementById('x1-bo-src').innerHTML;
    document.getElementById('x1-bo-src').value = viaGroup.id;
    x1.x1ChainSyncLinked(spBO, true);
    return h.includes('Theo lÃ´: Lá»c á»ng + Cáº¯t Máº¯t') &&
           h.includes('[V260910001]') && h.includes('Tá»“n 575/2.060 kg') &&
           document.getElementById('x1-bo-in').value === '575'; })());
const oldViaOk = loVia.qtyOk, oldCmOk = state.xuong1CatMatRecords.find(r => r.id === 'cm-legacy').qtyOk;
loVia.qtyOk = 480.5;
state.xuong1CatMatRecords.find(r => r.id === 'cm-legacy').qtyOk = 95.25;
x1.fillX1ChainOptions(spBO);
document.getElementById('x1-bo-src').value = viaGroup.id;
x1.x1ChainSyncLinked(spBO, true);
check('I5a: tá»± Ä‘iá»n giá»¯ nguyÃªn pháº§n tháº­p phÃ¢n cá»§a tá»•ng hai nhÃ¡nh',
  document.getElementById('x1-bo-in').value === '575.75');
loVia.qtyOk = oldViaOk;
state.xuong1CatMatRecords.find(r => r.id === 'cm-legacy').qtyOk = oldCmOk;
hFill(spBO, loVia.id, '2026-09-22', 575, 370, 10);
const boVia = state.xuong1BoRecords.find(r =>
  Array.isArray(r.sourceAllocations) && r.sourceAllocations.some(a => a.sourceId === 'lo-via'));
check('I6: lÆ°á»£t Bá»• lÆ°u phÃ¢n bá»• vÃ o cáº£ hai nguá»“n; háº¿t tá»“n cá»§a lÃ´ vÃ  tá»± áº©n',
  !!boVia && !boVia.catMatId && !boVia.locOngId &&
  boVia.sourceAllocations.some(a => a.sourceType === 'locOng' && a.sourceId === 'lo-via' && a.qty === 480) &&
  boVia.sourceAllocations.some(a => a.sourceType === 'catMat' && a.sourceId === 'cm-legacy' && a.qty === 95) &&
  x1.x1ChainRemainingOf(spBO, loVia, null) === 0 &&
  x1.x1ChainRemainingOf(spBO, state.xuong1CatMatRecords.find(r => r.id === 'cm-legacy'), null) === 0 &&
  (() => { x1.fillX1ChainOptions(spBO);
    return !document.getElementById('x1-bo-src').innerHTML.includes('[SS-2026-0920-01]'); })());
check('I6a: giá» Bá»• láº¥y Ä‘Ãºng vá»‹ trÃ­ HR "Bá»• á»‘ng 1", khÃ´ng láº¥y "Bá»• á»‘ng 2"',
  boVia.worker === 'Nguyá»…n Bá»• Má»™t' && !boVia.worker.includes('Nguyá»…n Bá»• Hai') &&
  boVia.workHours > 0 && boVia.workHoursHC > 0);
state.x1Rates.bo = { '2026-09': 1 };
check('I6b: tháº» ngÃ y Bá»• cÃ³ cÃ´ng suáº¥t vÃ  hiá»‡u suáº¥t theo Ä‘á»‹nh má»©c thÃ¡ng nhÆ° XÆ°á»Ÿng 2',
  (() => { x1.renderX1ChainCard(spBO);
    const h = document.getElementById('x1-bo-day-cards').innerHTML;
    const cap = h.match(/CÃ´ng suáº¥t thá»±c táº¿: <strong>([^<]+)<\/strong>/);
    const eff = h.match(/Hiá»‡u suáº¥t: <strong><strong[^>]*>([^<]+)<\/strong>/);
    return x1.x1RateOf('2026-09-22', 'bo') === 1 &&
      !!cap && /\d/.test(cap[1]) && !!eff && /\d/.test(eff[1]) && eff[1].includes('%');
  })());
check('I7: chip Cáº¯t Máº¯t háº¿t tá»“n cho lÃ´ Ä‘Ã£ Ä‘i theo nhÃ¡nh bá» qua',
  x1.x1CardCountText('x1-cat-mat-card') === 'Háº¿t tá»“n' &&
  (() => { x1.fillX1ChainOptions(spCM);
    return !document.getElementById('x1-cat-mat-src').innerHTML.includes('lo-via'); })() &&
  /^Tá»“n /.test(x1.x1CardCountText('x1-bo-card')));
check('I8: báº£ng lá»‹ch sá»­ Bá»• hiá»‡n rÃµ nguá»“n tá»•ng há»£p theo lÃ´',
  (() => { x1.renderX1ChainCard(spBO);
    return document.getElementById('x1-bo-day-cards').innerHTML.includes('á»ng Äáº¡t tá»« Lá»c á»ng + SÃ³t Máº¯t Ä‘Ã£ Cáº¯t Máº¯t'); })());
(() => {
    x1.editX1Chain(spBO, boVia.id);
    document.getElementById('x1-bo-in').value = '500';
    x1.handleX1ChainSubmit(spBO, { preventDefault(){} });
})();
check('I8a: sá»­a lÆ°á»£t Bá»• cáº­p nháº­t cÃ¹ng báº£n ghi thÃ nh 500kg',
  boVia.qtyIn === 500 && boVia.qtyOk === 500 && boVia.qtyLoai === 0 &&
  state.xuong1BoRecords.filter(r => r.boSourceGroupId === boVia.boSourceGroupId).length === 1);
check('I8b: sá»­a Bá»• váº«n láº¥y 95kg tá»« Cáº¯t Máº¯t',
  boVia.sourceAllocations.some(a => a.sourceType === 'catMat' && a.qty === 95));
check('I8c: sá»­a Bá»• láº¥y 405kg tá»« Lá»c á»ng',
  boVia.sourceAllocations.some(a => a.sourceType === 'locOng' && a.qty === 405));
check('I8d: sá»­a Bá»• tráº£ 75kg cÃ²n láº¡i vá» tá»“n theo lÃ´',
  (() => {
    const editedGroup = x1.x1ChainPending(spBO).find(g => g.id === boVia.boSourceGroupId);
    return !!editedGroup && x1.x1ChainRemainingOf(spBO, editedGroup, null) === 75;
  })());
check('I8e: xÃ³a lÆ°á»£t Bá»• tráº£ láº¡i lÆ°á»£ng Ä‘Ã£ dÃ¹ng á»Ÿ cáº£ Lá»c á»ng vÃ  Cáº¯t Máº¯t',
  (() => {
    x1.deleteX1Chain(spBO, boVia.id);
    const restored = x1.x1ChainPending(spBO).find(g => g.sources.some(s => s.sourceId === 'lo-via'));
    return !state.xuong1BoRecords.includes(boVia) && !!restored &&
      x1.x1ChainRemainingOf(spBO, restored, null) === 575;
  })());
const legacyBoDirect = {
  id: 'legacy-bo-direct', locOngId: lo.id, date: '2026-09-23',
  qtyIn: 20, qtyOk: 18, qtyLoai: 2, lotCode: 'SS-2026-0910-01'
};
state.xuong1BoRecords.push(legacyBoDirect);
check('I8f: lÆ°á»£t Bá»• cÅ© liÃªn káº¿t Lá»c á»ng váº«n hiá»ƒn thá»‹ Ä‘Ãºng nguá»“n vÃ  mÃ£ lÃ´',
  x1.x1ChainDisplay(spBO, legacyBoDirect).srcRoute === 'Lá»c á»ng â€” bá» qua Cáº¯t Máº¯t' &&
  x1.x1ChainDisplay(spBO, legacyBoDirect).lotCode === 'SS-2026-0910-01');
x1.editX1Chain(spBO, legacyBoDirect.id);
document.getElementById('x1-bo-in').value = '30';
x1.handleX1ChainSubmit(spBO, { preventDefault(){} });
check('I8g: sá»­a lÆ°á»£t Bá»• cÅ© Ä‘á»•i sang liÃªn káº¿t phÃ¢n bá»• má»›i mÃ  khÃ´ng táº¡o lÆ°á»£t trÃ¹ng',
  !legacyBoDirect.locOngId && !legacyBoDirect.catMatId &&
  legacyBoDirect.sourceAllocations.some(a =>
    a.sourceType === 'locOng' && a.sourceId === lo.id && a.qty === 30) &&
  state.xuong1BoRecords.filter(r => r.id === legacyBoDirect.id).length === 1);
const legacyBoCatMat = {
  id: 'legacy-bo-catmat', catMatId: 'cm-legacy', date: '2026-09-23',
  qtyIn: 10, qtyOk: 9, qtyLoai: 1, lotCode: 'SS-2026-0920-01'
};
state.xuong1BoRecords.push(legacyBoCatMat);
check('I8h: lÆ°á»£t Bá»• cÅ© liÃªn káº¿t Cáº¯t Máº¯t váº«n truy Ä‘Æ°á»£c lÃ´ vÃ  nguá»“n',
  x1.x1ChainDisplay(spBO, legacyBoCatMat).srcRoute === 'Cáº¯t Máº¯t' &&
  x1.x1ChainDisplay(spBO, legacyBoCatMat).lotCode === 'V260910001');

// â”€â”€ Cáº¤U TRÃšC: 8 cÃ´ng Ä‘oáº¡n XÆ°á»Ÿng 1 bá»c Ä‘á»§ 3 vÃ¹ng nhÆ° XÆ°á»Ÿng 2 â”€â”€
check('I9: 8 cÃ´ng Ä‘oáº¡n XÆ°á»Ÿng 1 bá»c vÃ¹ng .x2-zone â€” Sáº¥y Sinh 2 vÃ¹ng, 7 tháº» cÃ²n láº¡i 3 vÃ¹ng = 23 vÃ¹ng',
  (() => { const blk = idxHtml.slice(idxHtml.indexOf('id="x1-cat-ong-card"'), idxHtml.indexOf('id="x1-kho-card"'));
    return (blk.match(/class="x2-zone"/g) || []).length === 23 &&
      (blk.match(new RegExp('data-zone="1"', 'g')) || []).length === 8 &&
      (blk.match(new RegExp('data-zone="2"', 'g')) || []).length === 7 &&
      (blk.match(new RegExp('data-zone="3"', 'g')) || []).length === 8; })());
check('I10: nhÃ£n form pháº£n Ã¡nh quy táº¯c má»›i (CHá»ˆ lÃ´ chá»¯ "CÃ‚Y" Â· bá» qua Cáº¯t Máº¯t)',
  idxHtml.includes('CHá»ˆ hiá»‡n lÃ´ CÃ“ CHá»® "CÃ‚Y"') &&
  idxHtml.includes('lÃ´ ÄÃƒ qua Cáº¯t á»ng hiá»‡n á»Ÿ tháº» Bá»• (bá» qua Cáº¯t Máº¯t)') &&
  idxHtml.includes('Gom theo lÃ´: á»ng Äáº¡t tá»« Lá»c á»ng + pháº§n á»ng SÃ³t Máº¯t Ä‘Ã£ Cáº¯t Máº¯t') &&
  idxHtml.includes('LÃ´ Ä‘Ã£ qua Cáº¯t á»ng váº«n giá»¯ nhÃ¡nh bá» qua Cáº¯t Máº¯t.'));
check('I11: SPEC tháº» Bá»• gom theo lÃ´ vÃ  khá»›p riÃªng vá»‹ trÃ­ HR "Bá»• á»‘ng 1"',
  typeof spBO.sourceGroups === 'function' && typeof spBO.sourceAllocationsOf === 'function' &&
  spBO.posMatch('Bá»• á»‘ng 1') && !spBO.posMatch('Bá»• á»‘ng 2') &&
  typeof spCM.srcVisible === 'function' && spBO.altSrcField === 'locOngId');

// â”€â”€â”€ J. Sáº¤Y SINH 2 NGUá»’N â€” LÃ” Váº¦U/Ná»¨A KHÃ”NG CHá»® "CÃ‚Y" Sáº¤Y THáº²NG â”€â”€â”€â”€â”€â”€â”€â”€
// (12/10/2026: nguá»“n â‘  lÆ°á»£t Cáº¯t á»ng (Váº§u cÃ¢y) Â· nguá»“n â‘¡ lÃ´ NL XÆ°á»Ÿng 1
//  KHÃ”NG chá»¯ "cÃ¢y" â€” sáº¥y THáº²NG, bá» qua Cáº¯t á»ng)
console.log('--- J. Sáº¤Y SINH 2 NGUá»’N ---');
const mDirect = (state.materialRecords || []).find(m => m.id === 'x1m-d');
check('J1: Ã´ chá»n Sáº¥y Sinh cÃ³ 2 nhÃ³m â€” Cáº¯t á»ng + "Nháº­p tháº³ng â€¦ bá» qua Cáº¯t á»ng" (chá»‰ lÃ´ khÃ´ng chá»¯ cÃ¢y)',
  (() => { x1.fillX1SaySinhOptions();
    const h = document.getElementById('x1-say-sinh-source').innerHTML;
    return h.includes('optgroup') && h.includes('Tá»« Cáº¯t á»ng') &&
           h.includes('Nháº­p tháº³ng Váº§u/Ná»©a â€” bá» qua Cáº¯t á»ng') &&
           h.includes('x1m-d') && h.includes('cÃ²n 600 kg') &&
           !h.includes('x1m-b') && !h.includes('x1m-e') && !h.includes('x2m-c'); })());
check('J2: helper tá»“n nguá»“n tháº³ng (600kg) + x1SaySinhFindSrc phÃ¢n loáº¡i Ä‘Ãºng nhÃ¡nh',
  x1.x1SaySinhDirectRemainingOf(mDirect, null) === 600 &&
  (() => { const f = x1.x1SaySinhFindSrc('x1m-d'); return f && f.kind === 'material'; })() &&
  (() => { const f = x1.x1SaySinhFindSrc(co.id); return f && f.kind === 'catOng'; })() &&
  x1.x1SaySinhFindSrc('khÃ´ng-tá»“n-táº¡i') === null);

// Ghi lÆ°á»£t sáº¥y THáº²NG â€” cháº·n trÆ°á»›c
document.getElementById('x1-say-sinh-source').value = 'x1m-d';
document.getElementById('x1-say-sinh-date').value = '2026-09-25';
x1.x1SaySinhRenderAllocations();
document.getElementById('x1-say-sinh-allocation-x1m-d').value = '700'; // VÆ¯á»¢T 600
document.getElementById('x1-say-sinh-sulfur-qty').value = '2';
x1.handleX1SaySinhSubmit({ preventDefault(){} });
check('J3: CHáº¶N KL sáº¥y tháº³ng vÆ°á»£t pháº§n cÃ²n láº¡i cá»§a lÃ´ (700 > 600) â€” váº«n 1 lÆ°á»£t cÅ©',
  state.xuong1SaySinhRecords.length === 1);
document.getElementById('x1-say-sinh-allocation-x1m-d').value = '200';
x1.handleX1SaySinhSubmit({ preventDefault(){} });
const ssDirect = state.xuong1SaySinhRecords.find(r => r.materialId === 'x1m-d');
check('J4: ghi lÆ°á»£t sáº¥y tháº³ng 200kg â€” ghi materialId (catOngId rá»—ng) + tá»“n lÃ´ vá» 400kg',
  !!ssDirect && !ssDirect.catOngId && x1.x1SaySinhDirectRemainingOf(mDirect, null) === 400);

check('J5: thanh tá»“n + chip Sáº¥y Sinh Cá»˜NG cáº£ 2 nhÃ¡nh (350 Cáº¯t á»ng + 400 tháº³ng = 750kg)',
  (() => { x1.renderX1SaySinhCard();
    return document.getElementById('x1-say-sinh-stock-bar').innerHTML.includes('750'); })() &&
  x1.x1CardCountText('x1-say-sinh-card').startsWith('Tá»“n 750 kg'));

check('J6: sá»­a lÆ°á»£t sáº¥y tháº³ng khÃ´i phá»¥c Ã´ nguá»“n x1m-d + excludeId tráº£ pháº§n lÆ°á»£t (600)',
  (() => { x1.editX1SaySinh(ssDirect.id);
    const ok = document.getElementById('x1-say-sinh-source').value === 'x1m-d';
    const rest = x1.x1SaySinhDirectRemainingOf(mDirect, ssDirect.id);
    x1.resetX1SaySinhForm();
    return ok && rest === 600; })());

check('J7: báº£ng lá»‹ch sá»­ lÆ°á»£t sáº¥y tháº³ng hiá»‡n dÃ²ng chÃº "Nháº­p tháº³ng â€” bá» qua Cáº¯t á»ng"',
  (() => { x1.renderX1SaySinhCard();
    const h = document.getElementById('x1-say-sinh-day-cards').innerHTML;
    return h.includes('bá» qua Cáº¯t á»ng') && h.includes('200'); })());
check('J8: nhÃ£n form diá»…n giáº£i 2 nguá»“n + capacity.js váº«n Ä‘á»c x1SaySinhDisplay + tháº» Bá»‘c nháº­n nguá»“n sáº¥y tháº³ng',
  x2Src.includes('phiáº¿u Ä‘áº§u vÃ o á»Ÿ form trÃªn rá»“i ghi chu ká»³ sáº¥y') &&
  capSrc.includes('x1SaySinhDisplay') &&
  (() => { x1.fillX1BocOptions();
    return document.getElementById('x1-boc-source').innerHTML.includes('x1ss-'); })());

// â”€â”€â”€ K. Cáº®T NHIá»€U Láº¦N + KL Máº®T/NGá»ŒN + CHá»T HAO Há»¤T (13/10/2026) â”€â”€â”€â”€
// 1 lÃ´ NL X1 cÃ³ thá»ƒ cáº¯t NHIá»€U láº§n; 4 Ã´ KL (Äáº¡t/Loáº¡i/Máº¯t/Ngá»n) cá»™ng dá»“n
// khÃ´ng Ä‘Æ°á»£c vÆ°á»£t KL Ä‘áº§u vÃ o; tick "ÄÃ£ cáº¯t xong" â†’ chá»‘t hao há»¥t + khÃ³a lÃ´.
console.log('--- K. Cáº®T NHIá»€U Láº¦N + HAO Há»¤T ---');
check('K1: form Cáº¯t á»ng cÃ³ 4 Ã´ KL (dat/loai/mat/ngon) + checkbox "ÄÃ£ cáº¯t xong" + max=99999',
  ['x1-cat-ong-kl-dat', 'x1-cat-ong-kl-loai', 'x1-cat-ong-kl-mat', 'x1-cat-ong-kl-ngon']
    .every(id => idxHtml.includes(`id="${id}"`)) &&
  idxHtml.includes('id="x1-cat-ong-done"') && /max="99999"/.test(idxHtml) &&
  idxHtml.includes('ÄÃ£ cáº¯t xong lÃ´ nÃ y'));
check('K2: CSS 4 Ã´ háº¹p (.x1-co-kg) + hÃ ng chá»‘t (.x1-co-done-row) + chip (.x1-co-done-tag)',
  stylesCss.includes('.x1-co-kg') && stylesCss.includes('.x1-co-done-row') &&
  stylesCss.includes('.x1-co-done-tag'));
check('K3: events.js ná»‘i 4 Ã´ input + checkbox change vÃ o x1CatOngCalc',
  eventsSrc.includes("'x1-cat-ong-kl-mat'") && eventsSrc.includes("'x1-cat-ong-kl-ngon'") &&
  eventsSrc.includes("'x1-cat-ong-done', 'change'"));
state.materialRecords.push(
  { id: 'x1m-f', type: 'Váº§u cÃ¢y cáº¯t nhiá»u láº§n', supplier: 'Táº¿', location: 'xuong-1', code: 'NNF06', weight: 800, date: '2026-09-15', createdAt: '2026-09-15T02:00:00.000Z' });
function kCut(matId, d, dat, loai, matKg, ngon, done) {
  document.getElementById('x1-cat-ong-material').value = matId;
  document.getElementById('x1-cat-ong-date').value = d;
  document.getElementById('x1-cat-ong-kl-dat').value = String(dat);
  document.getElementById('x1-cat-ong-kl-loai').value = String(loai);
  document.getElementById('x1-cat-ong-kl-mat').value = String(matKg);
  document.getElementById('x1-cat-ong-kl-ngon').value = String(ngon);
  document.getElementById('x1-cat-ong-done').checked = !!done;
  x1.handleX1CatOngSubmit({ preventDefault(){} });
}
kCut('x1m-f', '2026-09-15', 300, 50, 20, 10, false);
const kfRecs = () => (state.xuong1CatOngRecords || []).filter(r => r.materialId === 'x1m-f');
const matF = (state.materialRecords || []).find(m => m.id === 'x1m-f');
check('K4: cáº¯t lÆ°á»£t 1 (300+50+20+10=380) â€” lÃ´ x1m-f VáºªN hiá»‡n á»Ÿ Ã´ chá»n (cÃ²n 420) vÃ¬ CHÆ¯A chá»‘t xong',
  kfRecs().length === 1 && kfRecs()[0].klMat === 20 && kfRecs()[0].klNgon === 10 &&
  x1.x1CatOngLotUsedOf('x1m-f', null) === 380 &&
  x1.x1CatOngLotRemainingOf(matF, null) === 420 &&
  x1.x1CatOngLotTurnsOf('x1m-f') === 1 &&
  (() => { x1.fillX1CatOngOptions();
    return document.getElementById('x1-cat-ong-material').innerHTML.includes('x1m-f'); })());
kCut('x1m-f', '2026-09-16', 300, 100, 20, 20, false);
check('K5: CHáº¶N lÆ°á»£t 2 vÆ°á»£t pháº§n cÃ²n láº¡i (380 + 440 = 820 > 800) â€” váº«n 1 lÆ°á»£t',
  kfRecs().length === 1);
kCut('x1m-f', '2026-09-16', 200, 50, 30, 20, false);
check('K6: cáº¯t lÆ°á»£t 2 (300) â€” cá»™ng dá»“n 680, cÃ²n 120, 2 lÆ°á»£t, lÃ´ váº«n hiá»‡n á»Ÿ Ã´ chá»n',
  kfRecs().length === 2 && x1.x1CatOngLotUsedOf('x1m-f', null) === 680 &&
  x1.x1CatOngLotRemainingOf(matF, null) === 120 && x1.x1CatOngLotTurnsOf('x1m-f') === 2 &&
  (() => { x1.fillX1CatOngOptions();
    return document.getElementById('x1-cat-ong-material').innerHTML.includes('x1m-f'); })());
kCut('x1m-f', '2026-09-17', 100000, 0, 0, 0, false);
check('K7: CHáº¶N Ã´ KL vÆ°á»£t 5 chá»¯ sá»‘ (100000 > 99999) â€” váº«n 2 lÆ°á»£t', kfRecs().length === 2);
kCut('x1m-f', '2026-09-17', 0, 0, 0, 0, true);
check('K8: tick "ÄÃ£ cáº¯t xong" â€” cá» lotDone trÃªn Cáº¢ 2 lÆ°á»£t + hao há»¥t 120 + lÃ´ áº¨N khá»i Ã´ chá»n',
  kfRecs().length === 2 && kfRecs().every(r => r.lotDone === true) &&
  x1.x1CatOngLotDoneOf('x1m-f') === true &&
  (() => { x1.fillX1CatOngOptions();
    return !document.getElementById('x1-cat-ong-material').innerHTML.includes('x1m-f'); })());
check('K9: display tráº£ lotDone=true + loss=120 (hao há»¥t = Ä‘áº§u vÃ o âˆ’ cá»™ng dá»“n)',
  (() => { const d = x1.x1CatOngDisplay(kfRecs()[1]);
    return d.lotDone === true && d.loss === 120 && d.lotRemaining === 120 && d.turnKg === 300; })());
x1.editX1CatOng(kfRecs()[0].id);
document.getElementById('x1-cat-ong-kl-dat').value = '350';
document.getElementById('x1-cat-ong-done').checked = true;
x1.handleX1CatOngSubmit({ preventDefault(){} });
check('K10: sá»­a lÆ°á»£t 1 (Ä‘áº¡t 300â†’350) khi lÃ´ Ä‘Ã£ chá»‘t â€” hao há»¥t TÃNH Láº I 120â†’70 + váº«n giá»¯ cá»',
  x1.x1CatOngLotUsedOf('x1m-f', null) === 730 &&
  x1.x1CatOngLotRemainingOf(matF, null) === 70 &&
  x1.x1CatOngLotDoneOf('x1m-f') === true &&
  (() => { const d = x1.x1CatOngDisplay(kfRecs()[0]);
    return d.loss === 70 && d.lotDone === true; })());
x1.editX1CatOng(kfRecs()[1].id);
document.getElementById('x1-cat-ong-done').checked = false;
x1.handleX1CatOngSubmit({ preventDefault(){} });
check('K11: bá» tick "ÄÃ£ cáº¯t xong" â€” cá» gá»¡ háº¿t + lÃ´ hiá»‡n láº¡i á»Ÿ Ã´ chá»n (cÃ²n 70)',
  kfRecs().every(r => !r.lotDone) && x1.x1CatOngLotDoneOf('x1m-f') === false &&
  x1.x1CatOngLotRemainingOf(matF, null) === 70 &&
  (() => { x1.fillX1CatOngOptions();
    return document.getElementById('x1-cat-ong-material').innerHTML.includes('x1m-f'); })());
check('K12: chip launcher Cáº¯t á»ng = Tá»”NG pháº§n CHÆ¯A cáº¯t cá»§a Má»ŒI lÃ´ chá» (x1m-f gÃ³p 70, khÃ´ng pháº£i 800)',
  (() => {
    const pend = x1.x1MaterialInputs().filter(m =>
      !x1.x1CatOngLotDoneOf(m.id) && x1.x1CatOngLotRemainingOf(m, null) > 0);
    const total = pend.reduce((s, m) => s + x1.x1CatOngLotRemainingOf(m, null), 0);
    const chip = x1.x1CardCountText('x1-cat-ong-card');
    return chip === `Tá»“n ${total.toLocaleString('vi-VN', { maximumFractionDigits: 2 })} kg` && total > 0;
  })());
check('K13: lÆ°á»£t CÅ¨ thiáº¿u klMat/klNgon â†’ display hiá»ƒu báº±ng 0 (khÃ´ng vá»¡ báº£ng/capacity)',
  (() => { const old = { materialId: 'x1m-f', klDat: 100, klLoai: 10 };
    const d = x1.x1CatOngDisplay(old);
    return d.klMat === 0 && d.klNgon === 0 && d.turnKg === 110; })());
check('K14: capacity.js Ä‘á»c turnKg (KL cáº¯t Ä‘Æ°á»£c/lÆ°á»£t) â€” cáº¯t nhiá»u láº§n khÃ´ng Ä‘áº¿m trÃ¹ng',
  capSrc.includes('qty: d.turnKg') && capSrc.includes('d.turnKg'));

state.xuong1BocRecords.push({
  id: 'boc-stock-denominator', date: '2026-11-09', qty: 2060,
  saySinhId: ss.id, srcType: 'Váº§u', srcSupplier: 'NhÃ  Khanh'
});
state.xuong1LocOngRecords.push({
  id: 'loc-ong-stock-denominator', bocId: 'boc-stock-denominator',
  lotCode: 'V261019002', date: '2026-11-09', qtyIn: 2060, qtyOk: 2056, qtyLoai: 4,
  srcType: 'Váº§u', srcSupplier: 'NhÃ  Khanh'
});
x1.fillX1ChainOptions(spBO);
check('K15: nguá»“n Bá»• gom mÃ£ lÃ´ sá»‘ng hiá»ƒn thá»‹ Ä‘Ãºng lÆ°á»£ng cÃ²n / tá»•ng lÆ°á»£ng gá»‘c tá»« Bá»‘c',
  document.getElementById('x1-bo-src').innerHTML.includes('Tá»“n 2.621/4.120 kg'));

state.xuong1LocThanhRecords = [
  {
    id: 'warehouse-loc-thanh', date: '2026-11-10', mode: 'loc-thanh',
    lotCode: 'W01', srcType: 'Váº§u thanh khÃ´ng cáº¡o', qtyIn: 50, qtyOk: 40, qtyLoai: 5,
    matrixRows: [{ width: 11, len: 50, weights: { A: 25, A1: 15, loai: 5 } }]
  },
  { id: 'warehouse-bo-xo', date: '2026-11-11', mode: 'bo-xo', lotCode: 'W02', qtyIn: 15, qtyOk: 12, qtyLoai: 3 },
  {
    id: 'warehouse-legacy-count', date: '2026-11-12', mode: 'loc-thanh',
    lotCode: 'W03', qtyIn: 10, qtyOk: 3, qtyLoai: 1,
    matrixRows: [{ len: 60, counts: { A: 3, loai: 1 } }]
  }
];
const warehouseStock = x1.x1WarehouseStockSummary();
check('K16: Kho Nan XÆ°á»Ÿng 1 tá»± cá»™ng kg Ä‘áº¡t, tÃ¡ch BÃ³ XÃ´ vÃ  khÃ´ng tÃ­nh Loáº¡i/SL cÅ© thÃ nh kg',
  warehouseStock.totalKg === 52 && warehouseStock.locThanhKg === 40 &&
  warehouseStock.boXoKg === 12 && warehouseStock.legacyCount === 3);
check('K17: chip Kho Nan hiá»ƒn thá»‹ tá»•ng thÃ nh pháº©m tá»± tÃ­nh',
  x1.x1CardCountText('x1-kho-card') === 'Tá»“n 52 kg');
x1.x2OpenCard('x1-kho-card');
const warehouseHtml = document.getElementById('x1-kho-inventory').innerHTML;
check('K18: vÃ¹ng 2 = Lá»ŠCH Sá»¬ XUáº¤T KHO (báº£ng ma tráº­n Ä‘Ã£ gá»¡ â€” chi tiáº¿t tá»“n xem á»Ÿ popup)',
  (warehouseHtml.includes('x1-kho-history-block') ||
   warehouseHtml.includes('ChÆ°a cÃ³ giao dá»‹ch xuáº¥t hÃ ng / tiÃªu há»§y nÃ o')) &&
  !warehouseHtml.includes('x1-kho-matrix') &&
  !warehouseHtml.includes('PhÃ¢n loáº¡i tham kháº£o'));
x1.x2CloseOpenCard();
check('K19: nÃºt LÃ¹i má»Ÿ Bá»• vÃ  nÃºt Tiáº¿n má»Ÿ Kho Nan XÆ°á»Ÿng 1',
  x1.x1LocThanhNavigateStage(-1) && state.x2OpenCardId === 'x1-bo-card' &&
  (x1.x2CloseOpenCard(), x1.x1LocThanhNavigateStage(1)) &&
  state.x2OpenCardId === 'x1-kho-card' &&
  eventsSrc.includes("safeOn('btn-x1-lt-stage-prev'") &&
  eventsSrc.includes("safeOn('btn-x1-lt-stage-next'"));

// â”€â”€â”€ K2. KHO NAN XÆ¯á»žNG 1 â€” Sá»¬A Lá»–I "Báº¤M NÃšT KHÃ”NG CÃ“ TÃC Dá»¤NG" + NÃšT Äá»” MÃ€U â”€â”€
// Lá»—i gá»‘c: `x1KhoExportFormHtml` quyáº¿t Ä‘á»‹nh má»Ÿ form báº±ng
// `getElementById('x1-kho-export-form')?.classList.contains('show')` â€” element bá»‹ innerHTML
// dá»±ng láº¡i má»—i láº§n render nÃªn KHÃ”NG Tá»’N Táº I â‡’ isOpen luÃ´n false â‡’ báº¥m Xuáº¥t hÃ ng/TiÃªu há»§y
// chá»‰ Ä‘á»•i state rá»“i váº½ láº¡i toolbar, khÃ´ng bao giá» hiá»‡n form.
check('K20: tráº¡ng thÃ¡i má»Ÿ form dá»±a theo STATE, bá» háº³n kiá»ƒm tra classList.contains(\'show\') trÃªn DOM',
  !x2Src.includes("getElementById('x1-kho-export-form')?.classList.contains('show')") &&
  x2Src.includes('const isOpen = !!f.type;'));
state.x1KhoExportForm = { type: 'xuat', material: '', width: 0, len: 0, qty: 0, note: '' };
x1.x2CloseOpenCard(); x1.x2OpenCard('x1-kho-card'); // Ã©p váº½ láº¡i (tháº» Ä‘ang má»Ÿ tá»« K19)
const khoStatsOpen = document.getElementById('x1-kho-stats').innerHTML;
check('K21: state cÃ³ type â†’ form giao dá»‹ch HIá»†N NGAY (cÃ³ Ã´ nháº­p + nÃºt LÆ°u giao dá»‹ch)',
  khoStatsOpen.includes('id="x1-kho-export-form"') &&
  khoStatsOpen.includes('data-x1-kho-export-save') &&
  khoStatsOpen.includes('LÆ°u giao dá»‹ch') &&
  khoStatsOpen.includes('x1-kho-export-material') &&
  khoStatsOpen.includes('x1-kho-export-size') &&
  khoStatsOpen.includes('x1-kho-export-qty'));
state.x1KhoExportForm = { type: '', material: '', width: 0, len: 0, qty: 0, note: '' };
x1.x2CloseOpenCard(); x1.x2OpenCard('x1-kho-card'); // Ã©p váº½ láº¡i (renderX1KhoCard khÃ´ng export)
const khoStatsClosed = document.getElementById('x1-kho-stats').innerHTML;
check('K22: state trá»‘ng â†’ hiá»ƒn thá»‹ nÃºt Xuáº¥t hÃ ng / TiÃªu há»§y (khÃ´ng cÃ²n form)',
  khoStatsClosed.includes('data-x1-kho-export-open="xuat"') &&
  khoStatsClosed.includes('data-x1-kho-export-open="tieu-huy"') &&
  !khoStatsClosed.includes('x1-kho-export-save'));
check('K23: hÃ m Ä‘á»“ng bá»™ Ã´ nháº­p form Ä‘Æ°á»£c export + events ná»‘i change/input cho cáº£ 4 Ã´',
  typeof x1.x1KhoSyncFormFields === 'function' &&
  eventsSrc.includes('x1KhoSyncFormFields') &&
  eventsSrc.includes("'x1-kho-export-material', 'x1-kho-export-size', 'x1-kho-export-qty', 'x1-kho-export-note'") &&
  eventsSrc.includes("['change', 'input']"));
// LÆ°u giao dá»‹ch CHáº Y THáº¬T: Ã´ nháº­p stub tráº£ giÃ¡ trá»‹ ngÆ°á»i dÃ¹ng â†’ sync Ä‘á»c ká»‹p â†’ khÃ´ng bá»‹
// toast "Vui lÃ²ng chá»n nguyÃªn liá»‡u" (lá»—i cÅ© do f.material luÃ´n rá»—ng) vÃ  khÃ´ng "KhÃ´ng Ä‘á»§ tá»“n"
// (lá»—i cÅ© do options nguyÃªn liá»‡u khÃ´ng khá»›p material thá»±c cá»§a tá»“n kho)
const khoMat = (x1.x1WarehouseStockSummary().groups.find(g => g.width === 11 && g.len === 50 && g.unit === 'kg') || {}).material || 'Váº§u';
document.getElementById('x1-kho-export-material').value = khoMat;
document.getElementById('x1-kho-export-size').value = '11|50';
document.getElementById('x1-kho-export-qty').value = '10';
document.getElementById('x1-kho-export-note').value = 'bÃ¡n thá»­';
state.x1KhoExportForm = { type: 'xuat', material: '', width: 0, len: 0, qty: 0, note: '' };
state.x1KhoExports = [];
x1.x1KhoSaveExport();
const savedExp = (state.x1KhoExports || [])[0] || {};
check('K24: LÆ°u giao dá»‹ch Ä‘á»c Ä‘Ãºng Ã´ nháº­p (nguyÃªn liá»‡u/kÃ­ch thÆ°á»›c/SL/ghi chÃº) vÃ  trá»« tá»“n',
  !!savedExp.id && savedExp.type === 'xuat' && savedExp.material === khoMat &&
  savedExp.width === 11 && savedExp.len === 50 && savedExp.qty === 10 &&
  savedExp.note === 'bÃ¡n thá»­' && savedExp.unit === 'kg' &&
  x1.x1WarehouseStockSummary().totalKg === 42); // 52 âˆ’ 10 Ä‘Ã£ xuáº¥t
check('K25: báº¥m tháº»/nÃºt Váº§u má»Ÿ POPUP chi tiáº¿t (khÃ´ng ná»Ÿ rá»™ng ngay trong tháº» ná»¯a)',
  eventsSrc.includes('[data-x1-kho-detail]') &&
  eventsSrc.includes('.x1-kho-detail-wrap') &&
  eventsSrc.includes('modal-x1-kho-detail') &&
  eventsSrc.includes('x1KhoCloseDetail') &&
  !x2Src.includes("${detailOpen.vau ? x1KhoDetailHtml('Váº§u') : ''}") &&
  !x2Src.includes("${detailOpen.nua ? x1KhoDetailHtml('Ná»©a') : ''}"));
check('K26: nÃºt Ä‘á»• mÃ u gradient + hiá»‡u á»©ng ná»•i (hover translateY + shadow, táº¯t khi Giáº£m Hiá»‡u á»¨ng)',
  stylesCss.includes('.x1-kho-export-toolbar .btn-success {') &&
  stylesCss.includes('linear-gradient(135deg, #16a34a') &&
  stylesCss.includes('.x1-kho-export-toolbar .btn-danger {') &&
  stylesCss.includes('.x1-kho-export-actions .btn-primary {') &&
  stylesCss.includes('.x1-kho-history-table .btn-danger {') &&
  stylesCss.includes('.x1-kho-kpi-toggle:hover {') &&
  stylesCss.includes('translateY(-2px)') &&
  stylesCss.includes('body[data-fx="low"] .x1-kho-export-toolbar .btn') &&
  stylesCss.includes('.x1-kho-kpi-card { cursor: pointer; }'));
// â”€â”€â”€ K3. Sá»¬A Lá»–I Bá» Cá»¤C / TRá»°C QUAN (Ã¡nh áº£nh ngÆ°á»i dÃ¹ng 11/2026) â”€â”€
check('K27: báº£ng khÃ´ng cÃ²n má»Ÿ/Ä‘Ã³ng báº±ng <details> (phÃ¢n loáº¡i hiá»‡n trá»±c tiáº¿p)', !x2Src.includes('x1-kho-kind-details'));
check('K28: cÃ³ dÃ²ng Ä‘á»‘i chiáº¿u Váº§u/Ná»©a/KhÃ¡c = Tá»•ng; vÃ¹ng 2 lo pháº§n trá»‘ng (khÃ´ng cÃ²n gá»£i Ã½ má» trÃ´i ná»•i)',
  x2Src.includes('x1-kho-recon') && x2Src.includes('Äá»‘i chiáº¿u:') &&
  x2Src.includes('ChÆ°a cÃ³ giao dá»‹ch xuáº¥t hÃ ng / tiÃªu há»§y nÃ o') &&
  !x2Src.includes('x1-kho-empty-hint'));
// Sá»­a lá»—i lÆ°á»›i: #x1-kho-stats pháº£i trá»Ÿ vá» khá»‘i dá»c (material-stats lÃ  grid auto-fit 150px
// â‡’ nÃºt + chá»¯ "chÆ°a cÃ³ giao dá»‹ch" náº±m cÃ¹ng hÃ ng, tháº» KPI bá»‹ bÃ³p â€” Ä‘Ãºng lá»—i trong áº£nh)
check('K29: #x1-kho-stats Ã©p display:block (khÃ´ng cÃ²n bá»‹ grid .material-stats kÃ©o lá»‡ch hÃ ng)',
  stylesCss.includes('#x1-kho-stats { display: block; }') &&
  !stylesCss.includes('#x1-kho-stats material-stats'));
// POPUP chi tiáº¿t: báº¥m Váº§u â†’ Ä‘á»• báº£ng vÃ o #x1-kho-detail-body + hiá»‡n overlay .show
state.x1KhoExports = []; state.x1KhoExportForm = { type: '', material: '', width: 0, len: 0, qty: 0, note: '' };
state.x1KhoDetailOpen = { vau: false, nua: false };
x1.x1KhoOpenDetail('Váº§u');
const khoDetailBody = document.getElementById('x1-kho-detail-body').innerHTML;
const khoOverlay = document.getElementById('modal-x1-kho-detail');
check('K30: POPUP chi tiáº¿t hiá»‡n Cáº¢ hÃ ng khÃ´ng kÃ­ch thÆ°á»›c (BÃ³ xÃ´ â†’ "â€”"), khÃ´ng bÃ¡o "chÆ°a cÃ³ kÃ­ch thÆ°á»›c"',
  khoDetailBody.includes('x1-kho-detail-wrap') &&
  khoDetailBody.includes('data-label="KÃ­ch thÆ°á»›c dÃ i">â€”') && // hÃ ng chÆ°a khai ghi "â€”", khÃ´ng máº¥t dÃ²ng
  khoDetailBody.includes('BÃ³ xÃ´') &&
  khoOverlay.classList.contains('show') &&
  khoOverlay.getAttribute('aria-hidden') === 'false' &&
  !khoDetailBody.includes('ChÆ°a cÃ³ kÃ­ch thÆ°á»›c nÃ o tá»“n kho'));
x1.x1KhoCloseDetail();
check('K31: Ä‘Ã³ng popup â†’ overlay bá» .show, â–² trÃªn tháº» KPI táº¯t (khÃ´ng cÃ²n ná»Ÿ rá»™ng inline)',
  !khoOverlay.classList.contains('show') &&
  !document.getElementById('x1-kho-stats').innerHTML.includes('x1-kho-detail-wrap') &&
  document.getElementById('x1-kho-stats').innerHTML.includes('data-x1-kho-detail-toggle="vau"'));
check('K32: chÃ­nh táº£ "Ná»©a" (khÃ´ng cÃ²n "Ná»­a") trÃªn toÃ n bá»™ khá»‘i tháº» Kho X1',
  !x2Src.includes('Ná»­a') &&
  x2Src.includes("x1-kho-kpi-title\">Ná»©a<") &&
  x2Src.includes("x1KhoMatGroupOf(g.material) === 'Ná»©a'"));
check('K33: nhÃ£n phÃ¢n loáº¡i X1 TRUNG TÃNH â€” tháº» Ná»©a khÃ´ng Ä‘Æ°á»£c hiá»‡n "Váº§u A/13mm/â€¦"',
  !x2Src.includes("label: 'Váº§u ") &&
  !x2Src.includes("label: 'Váº§u A'") &&
  ["label: 'A'", "label: 'A1'", "label: 'Non bÃ¡nh táº»'",
   "label: 'Cáº¯t Ä‘áº§u'", "label: 'B'", "label: 'Loáº¡i'"].every(s => x2Src.includes(s)));
// Gá»i báº±ng KHÃ“A 'vau'/'nua' Ä‘Ãºng nhÆ° click tháº­t trÃªn tháº» (delegation truyá»n data-* = khÃ³a)
x1.x1KhoOpenDetail('vau');
const khoDetailByKey = document.getElementById('x1-kho-detail-body').innerHTML;
const khoTitleByKey = document.getElementById('x1-kho-detail-title').innerHTML;
check('K34: gá»i báº±ng khÃ³a "vau" váº«n má»Ÿ Ä‘Ãºng báº£ng Váº§u (tiÃªu Ä‘á» CÃ“ Dáº¤U + báº£ng tá»“n khÃ´ng rá»—ng)',
  khoTitleByKey.includes('Váº§u â€” Chi Tiáº¿t Tá»“n Kho') &&
  khoDetailByKey.includes('x1-kho-detail-wrap') &&
  khoDetailByKey.includes('BÃ³ xÃ´') &&
  !khoDetailByKey.includes('ChÆ°a cÃ³ tá»“n kho (kg) nÃ o ghi nháº­n'));
x1.x1KhoOpenDetail('nua');
const khoDetailNua = document.getElementById('x1-kho-detail-body').innerHTML;
const khoTitleNua = document.getElementById('x1-kho-detail-title').innerHTML;
check('K35: gá»i báº±ng khÃ³a "nua" â†’ tiÃªu Ä‘á» "Ná»©a" CÃ“ Dáº¤U (khÃ´ng hiá»‡n "nua" khÃ´ng dáº¥u ná»¯a)',
  khoTitleNua.includes('Ná»©a â€” Chi Tiáº¿t Tá»“n Kho') &&
  !khoTitleNua.includes('>nua<') &&
  khoDetailNua.includes('cho Ná»©a')); // dá»¯ liá»‡u máº«u chÆ°a cÃ³ tá»“n Ná»©a â†’ bÃ¡o trung thá»±c, nhÆ°ng TÃŠN cÃ³ dáº¥u
x1.x1KhoCloseDetail();

// â”€â”€â”€ L. Káº¾ HOáº CH XUáº¤T NAN XÆ¯á»žNG 1 (52/53 TUáº¦N ISO) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
console.log('--- L. Káº¾ HOáº CH XUáº¤T NAN X1 ---');
check('L1: state.js / storage-adapter khai bÃ¡o key vÃ  state káº¿ hoáº¡ch X1',
  STORAGE_KEY_X1_NAN_PLAN === 'bamboo_tracker_x1_nan_plan_v1' &&
  fs.readFileSync(new URL('../js/state.js', import.meta.url), 'utf8').includes('x1NanPlans: []') &&
  fs.readFileSync(new URL('../js/state.js', import.meta.url), 'utf8').includes("x1NanPlanViewMode: 'week'") &&
  fs.readFileSync(new URL('../js/state.js', import.meta.url), 'utf8').includes("x1NanPlanPeriod: ''") &&
  fs.readFileSync(new URL('../js/storage-adapter.js', import.meta.url), 'utf8')
    .includes('[STORAGE_KEY_X1_NAN_PLAN, \'x1NanPlans\']'));
check('L2: HTML cÃ³ launcher + toolbar Tuáº§n/ThÃ¡ng/NÄƒm, Ä‘iá»u hÆ°á»›ng ká»³, nÄƒm/form/báº£ng Ä‘á»™ng',
  idxHtml.includes('data-x2-card="x1-nan-plan-card"') &&
  idxHtml.includes('id="x1-nan-plan-card"') &&
  idxHtml.includes('data-x1-nan-plan-view="week"') &&
  idxHtml.includes('data-x1-nan-plan-view="month"') &&
  idxHtml.includes('data-x1-nan-plan-view="year"') &&
  idxHtml.includes('id="x1-nan-plan-prev"') &&
  idxHtml.includes('id="x1-nan-plan-next"') &&
  idxHtml.includes('id="x1-nan-plan-period-label"') &&
  idxHtml.includes('id="x1-nan-plan-year"') &&
  idxHtml.includes('ThÃªm sáº£n pháº©m') &&
  idxHtml.includes('id="x1-nan-plan-form"') &&
  idxHtml.includes('id="x1-nan-plan-head"') &&
  idxHtml.includes('id="x1-nan-plan-body"') &&
  !idxHtml.includes('id="x1-nan-plan-roman"') &&
  !idxHtml.includes('Cáº£ hai') &&
  idxHtml.includes('Váº§u / Ná»©a') &&
  idxHtml.includes('data-x1-nan-plan-material="Váº§u"') &&
  idxHtml.includes('data-x1-nan-plan-material="Ná»©a"') &&
  idxHtml.includes('id="x1-nan-plan-product"') &&
  !idxHtml.includes('id="x1-nan-plan-priority"') &&
  !idxHtml.includes('x1-nan-plan-priority-toggle') &&
  idxHtml.includes('id="x1-nan-plan-material-chips"') &&
  idxHtml.includes('data-x1-nan-plan-width="11"') &&
  idxHtml.includes('data-x1-nan-plan-length="50"') &&
  idxHtml.includes('data-x1-nan-plan-class="A"') &&
  idxHtml.includes('data-x1-nan-plan-class="Loáº¡i"'));
check('L3: CSS káº¿ hoáº¡ch gá»n, cÃ³ cuá»™n, form/44px/khá»‘i Ä‘iá»ƒm liÃªn tá»¥c nhÆ°ng KHÃ”NG cÃ²n báº£ng 13k px',
  stylesCss.includes('.x1-nan-plan-table-wrap') &&
  stylesCss.includes('.x1-nan-plan-week input') &&
  stylesCss.includes('.x1-nan-plan-week-priority') &&
  stylesCss.includes('.x1-nan-plan-level.level-1') &&
  stylesCss.includes('.x1-nan-plan-level.level-2') &&
  stylesCss.includes('.x1-nan-plan-level.level-4') &&
  stylesCss.includes('.x1-nan-plan-level.level-8') &&
  stylesCss.includes('.x1-nan-plan-view-modes') &&
  stylesCss.includes('.x1-nan-plan-period-label') &&
  stylesCss.includes('.x1-nan-plan-identity') &&
  !stylesCss.includes('.x1-nan-plan-product-priority') &&
  !stylesCss.includes('.x1-nan-plan-child-priority') &&
  !stylesCss.includes('.x1-nan-plan-priority-toggle') &&
  !stylesCss.includes('min-width: 13000px'));
check('L4: khÃ´ng táº¡o dá»¯ liá»‡u káº¿ hoáº¡ch máº«u â€” load key rá»—ng tráº£ máº£ng rá»—ng',
  (() => {
    localStorage.removeItem(STORAGE_KEY_X1_NAN_PLAN);
    state.x1NanPlans = [];
    x1.loadX1NanPlans();
    return Array.isArray(state.x1NanPlans) && state.x1NanPlans.length === 0;
  })());
check('L5: normalize dÃ²ng káº¿ hoáº¡ch báº¯t buá»™c Ä‘á»§ year/material/width/len vÃ  theo sá»‘ tuáº§n ISO',
  (() => {
    const n = x1.x1NanNormalizePlanRecord({
      id: 'plan-normalize', year: 2026, material: 'nua',
      romanNo: 'ii', productName: 'Thanh Ná»©a A', width: 11.26, length: 50.4,
      classification: 'A1',
      weeks: { '1': 100, '53': 999, '0': 200, 'x': 300 }
    });
    const n2021 = x1.x1NanNormalizePlanRecord({
      id: 'plan-2021', year: 2021, material: 'vau',
      romanNo: 'I', productName: 'Thanh Váº§u', width: 11, len: 50,
      classification: 'Non bÃ¡nh táº»', weeks: { '53': 999, '52': 200 }
    });
    return n && n.romanNo === '' && x1.x1NanNormalizeRomanNo('II') === '' && n.productName === 'Thanh Ná»©a A' &&
      n.material === 'Ná»©a' && n.width === 11.3 && n.len === 50 && n.length === 50 &&
      n.classification === 'A1' &&
      n.weeks['1'] === 100 && n.weeks['53'] === 999 &&
      !Object.prototype.hasOwnProperty.call(n.weeks, '0') &&
      n2021 && n2021.romanNo === '' && n2021.weeks['52'] === 200 &&
      !Object.prototype.hasOwnProperty.call(n2021.weeks, '53');
  })());
check('L6: helper ISO tuáº§n Ä‘á»c Ä‘Ãºng nÄƒmâ€“tuáº§n ISO',
  (() => {
    const w1 = x1.x1NanIsoWeekParts('2026-01-01');
    const w38 = x1.x1NanIsoWeekParts('2026-09-14');
    const w53 = x1.x1NanIsoWeekParts('2026-12-31');
    return w1.year === 2026 && w1.week === 1 &&
      w38.year === 2026 && w38.week === 38 &&
      w53.year === 2026 && w53.week === 53 &&
      x1.x1NanWeeksInYear(2026) === 53 &&
      x1.x1NanWeeksInYear(2021) === 52 &&
      x1.x1NanIsoWeekParts('invalid').week === 0;
  })());
check('L6B: thÃ¡ng gá»™p tuáº§n theo NGÃ€Y THá»¨ HAI cá»§a tuáº§n ISO',
  (() => {
    const sep = x1.x1NanMonthMondayWeeks('2026-09');
    const dec = x1.x1NanMonthMondayWeeks('2025-12');
    const jan = x1.x1NanMonthMondayWeeks('2026-01');
    return sep.length >= 4 && sep.every(w => w.monday.slice(0, 7) === '2026-09') &&
      dec.some(w => w.year === 2026 && w.week === 1 && w.monday === '2025-12-29') &&
      jan.every(w => w.monday.slice(0, 7) === '2026-01') &&
      x1.x1NanMonthShift('2026-12', 1) === '2027-01' &&
      x1.x1NanWeekKey(2026, 53) === '2026-W53';
  })());
check('L7: thá»±c táº¿ ghÃ©p ngÃ y ISO + nguá»“n Váº§u/Ná»©a + matrix width/len, khÃ´ng cá»™ng KL Loáº¡i',
  (() => {
    state.xuong1LocThanhRecords = [{
      id: 'lt-plan-a', date: '2026-09-14',
      lotAllocations: [{ srcType: 'Váº§u', qtyIn: 100 }, { srcType: 'Ná»©a', qtyIn: 100 }],
      matrixRows: [{ width: 11, len: 50, weights: { A: 40, A1: 10, loai: 25 } }]
    }, {
      id: 'lt-plan-bo', date: '2026-09-15', mode: 'bo-xo',
      srcType: 'Váº§u',
      matrixRows: [{ width: 12, len: 100, weights: { bo: 80, loai: 20 } }]
    }, {
      id: 'lt-plan-old', date: '2026-09-16', srcType: 'Ná»©a',
      lengthRows: [{ len: 50, kg: 30 }]
    }];
    const map = x1.x1NanActualMap(2026, state.xuong1LocThanhRecords);
    return map['2026|38|Váº§u|11|50'] === 25 &&
      map['2026|38|Ná»©a|11|50'] === 25 &&
      map['2026|38|Váº§u|11|50|A'] === 20 &&
      map['2026|38|Ná»©a|11|50|A'] === 20 &&
      map['2026|38|Váº§u|11|50|A1'] === 5 &&
      map['2026|38|Ná»©a|11|50|A1'] === 5 &&
      map['2026|38|Váº§u|12|100'] === 80 &&
      !Object.keys(map).some(k => k.includes('|Ná»©a|0|50'));
  })());
check('L7B: A + A1 gom vÃ o má»™t quy cÃ¡ch material-size, khÃ´ng táº¡o dÃ²ng riÃªng',
  (() => {
    const plans = [
      { id: 'pa', year: 2026, romanNo: '', productName: 'Thanh A', material: 'Váº§u', width: 11, length: 50, classification: 'A', weeks: { '38': 40 } },
      { id: 'pa1', year: 2026, romanNo: '', productName: 'Thanh A', material: 'Váº§u', width: 11, length: 50, classification: 'A1', weeks: { '38': 10 } }
    ];
    const grouped = x1.x1NanPlanGroupedRecords(plans);
    const child = grouped[0] && grouped[0].children[0];
    const actualWeeks = child ? x1.x1NanPlanChildActualWeeks(child, 2026, x1.x1NanActualMap(2026, state.xuong1LocThanhRecords)) : [];
    return grouped.length === 1 &&
      grouped[0].children.length === 1 &&
      child.plans.length === 2 &&
      x1.x1NanPlanChildClassifications(child).join('/') === 'A/A1' &&
      (actualWeeks[37] || 0) === 25;
  })());
check('L7C: "Váº§u / Ná»©a" lÃ  nguyÃªn liá»‡u thay tháº¿ duy nháº¥t vÃ  gom tá»“n theo phÃ¢n loáº¡i',
  (() => {
    const alt = x1.x1NanNormalizePlanRecord({
      id: 'plan-alt', year: 2026, material: 'Váº§u / Ná»©a',
      productName: 'Thanh thay tháº¿', width: 11, length: 50,
      classification: 'A', priority: true, weeks: { '38': 800 }
    });
    const groupedLegacy = x1.x1NanPlanGroupedRecords([
      { id: 'legacy-vau', year: 2026, productName: 'Thanh thá»­', material: 'Váº§u', width: 11, length: 50, classification: 'A', weeks: { '38': 100 } },
      { id: 'legacy-nua', year: 2026, productName: 'Thanh thá»­', material: 'Ná»©a', width: 11, length: 50, classification: 'A1', weeks: { '38': 200 } }
    ]);
    const stock = { groups: [
      { unit: 'kg', material: 'Váº§u', width: 11, len: 50, kind: 'A', qty: 500 },
      { unit: 'kg', material: 'Váº§u', width: 11, len: 50, kind: 'A1', qty: 300 }
    ] };
    const exactBreakdown = x1.x1NanStockBreakdownOf('Váº§u', 11, 50, stock);
    const altBreakdown = x1.x1NanStockBreakdownOf('Váº§u / Ná»©a', 11, 50, stock);
    const text = x1.x1NanStockBreakdownText('Váº§u', 11, 50, stock);
    return alt &&
      alt.material === 'Váº§u / Ná»©a' &&
      alt.priority === false &&
      groupedLegacy.length === 1 &&
      groupedLegacy[0].children.length === 1 &&
      groupedLegacy[0].children[0].material === 'Váº§u / Ná»©a' &&
      exactBreakdown.A === 500 &&
      exactBreakdown.A1 === 300 &&
      exactBreakdown.total === 800 &&
      altBreakdown.total === 800 &&
      text === 'Váº§u A 500 kg Â· Váº§u A1 300 kg';
  })());
check('L7D: tooltip tá»“n theo nguyÃªn liá»‡u + cÃ¡c phÃ¢n loáº¡i Ä‘Ã£ chá»n, khÃ´ng láº·p tá»•ng kho',
  (() => {
    const stock = { groups: [
      { unit: 'kg', material: 'Váº§u', width: 11, len: 50, kind: 'A', qty: 1472 },
      { unit: 'kg', material: 'Váº§u', width: 11, len: 50, kind: 'A1', qty: 600 },
      { unit: 'kg', material: 'Váº§u', width: 11, len: 50, kind: 'B', qty: 900 },
      { unit: 'kg', material: 'Váº§u', width: 11, len: 50, kind: 'Loáº¡i', qty: 100 }
    ] };
    const textPrimitive = x1.x1NanStockBreakdownText(
      'Váº§u', 11, 50, ['A', 'A1'], stock);
    const textObject = x1.x1NanStockBreakdownText(
      { material: 'Váº§u', width: 11, length: 50,
        plans: [
          { classification: 'A' },
          { classification: 'A1' }
        ] },
      stock);
    const altStock = { groups: [
      { unit: 'kg', material: 'Váº§u', width: 11, len: 50, kind: 'A', qty: 1472 },
      { unit: 'kg', material: 'Váº§u', width: 11, len: 50, kind: 'A1', qty: 600 },
      { unit: 'kg', material: 'Ná»©a', width: 11, len: 50, kind: 'A', qty: 100 },
      { unit: 'kg', material: 'Ná»©a', width: 11, len: 50, kind: 'A1', qty: 50 }
    ] };
    const altText = x1.x1NanStockTooltipText(
      'Váº§u / Ná»©a', 11, 50, altStock, ['A', 'A1']);
    return textPrimitive === 'Váº§u A 1472 kg Â· Váº§u A1 600 kg' &&
      textObject === textPrimitive &&
      !textPrimitive.includes('B ') &&
      !textPrimitive.includes('Loáº¡i') &&
      !textPrimitive.includes('Tá»•ng') &&
      altText === 'Váº§u A 1472 kg Â· Váº§u A1 600 kg Â· Ná»©a A 100 kg Â· Ná»©a A1 50 kg';
  })());
check('L8: helper tá»· lá»‡ Ä‘Ã¡p á»©ng vÃ  chuá»—i liÃªn tá»¥c 1/2/4/8 tuáº§n',
  x1.x1NanResponseRatio(80, 80) === 100 &&
  x1.x1NanResponseRatio(80, 100) === 125 &&
  x1.x1NanResponseRatio(0, 100) === null &&
  x1.x1NanContinuousStreakAt([100,100,100,100,100,100,100,100], [100,100,100,100,100,100,100,100], 0) === 1 &&
  x1.x1NanContinuousStreakAt([100,100,100,100,100,100,100,100], [100,100,100,100,100,100,100,100], 1) === 2 &&
  x1.x1NanContinuousStreakAt([100,100,100,100,100,100,100,100], [100,100,100,100,100,100,100,100], 3) >= 4 &&
  x1.x1NanContinuousStreakAt([100,100,100,100,100,100,100,100], [100,100,100,100,100,100,100,100], 7) === 8 &&
  x1.x1NanContinuousMaxLevel(
    [100,100,100,100,100,100,100,100],
    [100,100,100,100,100,100,100,100]
  ) === 8);
check('L8B: Æ°u tiÃªn Ä‘Ãºng tuáº§n phÃ¢n bá»• tá»“n trÆ°á»›c, thay tháº¿ dÃ¹ng cáº£ Váº§u/Ná»©a',
  (() => {
    state.x1NanPlans = [
      { id: 'priority-a', year: 2026, productName: 'Æ¯u tiÃªn A', material: 'Váº§u', width: 11, length: 50, classification: 'A', priority: false, priorityWeeks: { '2026-W38': true }, weeks: { '38': 800 } },
      { id: 'priority-b', year: 2026, productName: 'ThÆ°á»ng B', material: 'Váº§u', width: 11, length: 50, classification: 'A', priority: false, priorityWeeks: { '2026-W38': false }, weeks: { '38': 500 } }
    ];
    const grouped = x1.x1NanPlanGroupedRecords(state.x1NanPlans);
    const stock = { groups: [
      { unit: 'kg', material: 'Váº§u', width: 11, len: 50, kind: 'A', qty: 800 }
    ] };
    const allocation = x1.x1NanAllocateStockForPlans(
      grouped, 'week', 2026, '2026-W38', [], stock);
    const high = grouped.find(group => group.productName === 'Æ¯u tiÃªn A').children[0];
    const low = grouped.find(group => group.productName === 'ThÆ°á»ng B').children[0];
    const highAllocation = allocation.get(high);
    const lowAllocation = allocation.get(low);
    const altPlans = [
      { id: 'alt-a', year: 2026, productName: 'Thay tháº¿', material: 'Váº§u / Ná»©a', width: 11, length: 50, classification: 'A', priority: false, priorityWeeks: { '2026-W38': true }, weeks: { '38': 800 } }
    ];
    const altGrouped = x1.x1NanPlanGroupedRecords(altPlans);
    const altStock = { groups: [
      { unit: 'kg', material: 'Váº§u', width: 11, len: 50, kind: 'A', qty: 500 },
      { unit: 'kg', material: 'Ná»©a', width: 11, len: 50, kind: 'A', qty: 300 }
    ] };
    const altAllocation = x1.x1NanAllocateStockForPlans(
      altGrouped, 'week', 2026, '2026-W38', [], altStock);
    const altChild = altGrouped[0].children[0];
    const altResult = altAllocation.get(altChild);
    return highAllocation.allocatedStock === 800 &&
      lowAllocation.allocatedStock === 0 &&
      x1.x1NanResponseRatio(highAllocation.planQty, highAllocation.allocatedStock) === 100 &&
      altResult.allocatedStock === 800 &&
      altResult.planQty === 800;
  })());
check('L9: form thÃªm/sá»­a lÆ°u dÃ²ng vÃ  sá»‘ Ã´ tuáº§n Ä‘á»™ng trong localStorage',
  (() => {
    state.x1NanPlans = [];
    state.x1NanPlanYear = '2026';
    const yearEl = document.getElementById('x1-nan-plan-year');
    if (yearEl) yearEl.value = '2026';
    x1.x1NanPlanStartForm();
    document.getElementById('x1-nan-plan-product').value = 'Thanh Váº§u';
    document.getElementById('x1-nan-plan-material').value = 'Váº§u';
    document.getElementById('x1-nan-plan-width').value = '11';
    document.getElementById('x1-nan-plan-length').value = '50';
    document.getElementById('x1-nan-plan-class').value = 'A';
    if (!x1.x1NanPlanSaveForm()) return false;
    const plan = (state.x1NanPlans || [])[0];
    if (!plan || plan.year !== 2026 || plan.romanNo !== '' ||
        plan.productName !== 'Thanh Váº§u' || plan.material !== 'Váº§u' ||
        plan.width !== 11 || plan.len !== 50 || plan.length !== 50 ||
        plan.classification !== 'A') return false;
    if (!x1.x1NanPlanStartForm(plan.id)) return false;
    document.getElementById('x1-nan-plan-product').value = 'Thanh Váº§u';
    document.getElementById('x1-nan-plan-material').value = 'Váº§u';
    document.getElementById('x1-nan-plan-width').value = '12';
    document.getElementById('x1-nan-plan-length').value = '50';
    document.getElementById('x1-nan-plan-class').value = 'A';
    if (!x1.x1NanPlanSaveForm()) return false;
    const savedPlan = (state.x1NanPlans || []).find(p => p && p.width === 12);
    if (!savedPlan || savedPlan.width !== 12) return false;
    if (!x1.x1NanPlanSetWeekValue(savedPlan.id, 38, '125.5')) return false;
    if (!x1.x1NanPlanSetWeekValue(savedPlan.id, 53, '175.5')) return false;
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY_X1_NAN_PLAN) || '[]');
    const saved = stored.find(p => p && p.id === savedPlan.id);
    return !!saved && saved.weeks['38'] === 125.5 && saved.weeks['53'] === 175.5;
  })());
check('L9B: chá»n Váº§u + Ná»©a táº¡o má»™t tá»• há»£p thay tháº¿ "Váº§u / Ná»©a", khÃ´ng nhÃ¢n báº£n exact',
  (() => {
    const nodeWith = (attr, value) => {
      const node = makeEl();
      node.setAttribute(attr, value);
      node.setAttribute('aria-pressed', 'true');
      node.classList.toggle('is-active', true);
      return node;
    };
    const matBox = makeEl('x1-nan-plan-material-chips');
    matBox.querySelectorAll = () => [
      nodeWith('data-x1-nan-plan-material', 'Váº§u'),
      nodeWith('data-x1-nan-plan-material', 'Ná»©a')
    ];
    const widthBox = makeEl('x1-nan-plan-width-chips');
    widthBox.querySelectorAll = () => [
      nodeWith('data-x1-nan-plan-width', '11'),
      nodeWith('data-x1-nan-plan-width', '12')
    ];
    const lengthBox = makeEl('x1-nan-plan-length-chips');
    lengthBox.querySelectorAll = () => [
      nodeWith('data-x1-nan-plan-length', '50'),
      nodeWith('data-x1-nan-plan-length', '60')
    ];
    const classBox = makeEl('x1-nan-plan-class-chips');
    classBox.querySelectorAll = () => [
      nodeWith('data-x1-nan-plan-class', 'A'),
      nodeWith('data-x1-nan-plan-class', 'A1')
    ];
    els.set('x1-nan-plan-material-chips', matBox);
    els.set('x1-nan-plan-width-chips', widthBox);
    els.set('x1-nan-plan-length-chips', lengthBox);
    els.set('x1-nan-plan-class-chips', classBox);
    state.x1NanPlans = [];
    state.x1NanPlanYear = '2026';
    if (document.getElementById('x1-nan-plan-year')) document.getElementById('x1-nan-plan-year').value = '2026';
    x1.x1NanPlanStartForm();
    document.getElementById('x1-nan-plan-product').value = 'Thanh Váº§u/Ná»©a';
    if (!x1.x1NanPlanSaveForm()) return false;
    return state.x1NanPlans.length === 8 &&
      state.x1NanPlans.every(p => p.romanNo === '' &&
        p.productName === 'Thanh Váº§u/Ná»©a') &&
      new Set(state.x1NanPlans.map(p => p.material)).size === 1 &&
      state.x1NanPlans.every(p => p.material === 'Váº§u / Ná»©a') &&
      state.x1NanPlans.every(p => p.priority === false) &&
      state.x1NanPlans.every(p => p.priorityWeeks && Object.keys(p.priorityWeeks).length === 0) &&
      new Set(state.x1NanPlans.map(p => p.width)).size === 2 &&
      new Set(state.x1NanPlans.map(p => p.length)).size === 2 &&
      new Set(state.x1NanPlans.map(p => p.classification)).size === 2 &&
      eventsSrc.includes("const pressed = target.getAttribute") &&
      !eventsSrc.includes("sibling === target");
  })());
check('L10: máº·c Ä‘á»‹nh tuáº§n chá»‰ render 1 ká»³, khÃ´ng render 52/53 cá»™t tuáº§n',
  (() => {
    state.x1NanPlanYear = '2026';
    state.x1NanPlanViewMode = 'week';
    state.x1NanPlanPeriod = '2026-W38';
    const yearEl = document.getElementById('x1-nan-plan-year');
    if (yearEl) yearEl.value = '2026';
    x1.renderX1NanPlanCard();
    const head = document.getElementById('x1-nan-plan-head').innerHTML;
    const body = document.getElementById('x1-nan-plan-body').innerHTML;
    return !head.includes('colspan="3"') &&
      !head.includes('Tuáº§n 53') &&
      !head.includes('TT La MÃ£') &&
      !body.includes('data-x1-nan-plan-week="53"') &&
      (head.match(/Káº¿ hoáº¡ch/g) || []).length === 1 &&
      !head.includes('Thá»±c táº¿ ká»³') &&
      !body.includes('x1-nan-plan-actual') &&
      (head.match(/ÄÃ¡p á»©ng/g) || []).length === 1 &&
      head.includes('Sáº£n pháº©m') &&
      head.includes('Quy cÃ¡ch') &&
      head.includes('PhÃ¢n loáº¡i') &&
      head.includes('Tá»“n hiá»‡n táº¡i') &&
      head.includes('Kháº£ nÄƒng') &&
      head.includes('Káº¿ hoáº¡ch ká»³ (kg)') &&
      body.includes('x1-nan-plan-product-header') &&
      !body.includes('data-x1-nan-plan-product-priority') &&
      !body.includes('data-x1-nan-plan-child-priority') &&
      !body.includes('TT La MÃ£') &&
      body.includes('data-x1-nan-plan-week="38"') &&
      body.includes('data-x1-nan-plan-week-priority="2026-W38"') &&
      body.includes('>Æ¯u tiÃªn</') &&
      body.includes('x1-nan-plan-input-unit') &&
      body.includes('Káº¿ hoáº¡ch');
  })());
check('L10B: thÃ¡ng/nÄƒm lÃ  view read-only; chá»‰ giá»¯ káº¿ hoáº¡ch/Ä‘Ã¡p á»©ng/tá»“n/kháº£ nÄƒng',
  (() => {
    state.x1NanPlanYear = '2026';
    state.x1NanPlanViewMode = 'month';
    state.x1NanPlanPeriod = '2026-09';
    x1.renderX1NanPlanCard();
    const monthHead = document.getElementById('x1-nan-plan-head').innerHTML;
    const monthBody = document.getElementById('x1-nan-plan-body').innerHTML;
    state.x1NanPlanViewMode = 'year';
    state.x1NanPlanPeriod = '2026';
    x1.renderX1NanPlanCard();
    const yearHead = document.getElementById('x1-nan-plan-head').innerHTML;
    const yearBody = document.getElementById('x1-nan-plan-body').innerHTML;
    return monthHead.includes('ThÃ¡ng') &&
      monthHead.includes('Káº¿ hoáº¡ch ká»³') &&
      !monthBody.includes('data-x1-nan-plan-week=') &&
      !yearHead.includes('12 thÃ¡ng') &&
      yearHead.includes('Káº¿ hoáº¡ch ká»³') &&
      !yearBody.includes('data-x1-nan-plan-week=') &&
      !monthHead.includes('Thá»±c táº¿ ká»³') &&
      !yearHead.includes('Thá»±c táº¿ ká»³') &&
      !monthBody.includes('x1-nan-plan-week-priority') &&
      !yearBody.includes('x1-nan-plan-week-priority') &&
      !monthBody.includes('data-x1-nan-plan-child-priority') &&
      !yearBody.includes('data-x1-nan-plan-child-priority') &&
      !monthBody.includes('data-x1-nan-plan-product-priority') &&
      !yearBody.includes('data-x1-nan-plan-product-priority') &&
      yearHead.includes('ÄÃ¡p á»©ng') &&
      yearHead.includes('Tá»“n hiá»‡n táº¡i') &&
      yearHead.includes('Kháº£ nÄƒng') &&
      yearHead.includes('Thao tÃ¡c');
  })());
check('L11: events ná»‘i cháº¿ Ä‘á»™ xem, Ä‘iá»u hÆ°á»›ng ká»³, nÄƒm/thÃªm/há»§y/lÆ°u/sá»­a/xÃ³a/nháº­p tuáº§n',
  eventsSrc.includes("safeOn('x1-nan-plan-year', 'change'") &&
  eventsSrc.includes("safeOn('x1-nan-plan-prev', 'click'") &&
  eventsSrc.includes("safeOn('x1-nan-plan-next', 'click'") &&
  eventsSrc.includes("data-x1-nan-plan-view") &&
  eventsSrc.includes("safeOn('btn-x1-nan-plan-add', 'click'") &&
  eventsSrc.includes("safeOn('btn-x1-nan-plan-save', 'click'") &&
  eventsSrc.includes("safeOn('x1-nan-plan-form', 'click'") &&
  eventsSrc.includes('data-x1-nan-plan-material') &&
  eventsSrc.includes('data-x1-nan-plan-width') &&
  eventsSrc.includes('data-x1-nan-plan-length') &&
  eventsSrc.includes('data-x1-nan-plan-class') &&
  eventsSrc.includes('data-x1-nan-plan-week-priority') &&
  eventsSrc.includes('x1NanPlanSetWeekPriority') &&
  !eventsSrc.includes('data-x1-nan-plan-product-priority') &&
  !eventsSrc.includes('data-x1-nan-plan-child-priority') &&
  eventsSrc.includes("[data-x1-nan-plan-week]") &&
  eventsSrc.includes("[data-x1-nan-plan-edit]") &&
  eventsSrc.includes("[data-x1-nan-plan-delete]") &&
  eventsSrc.includes('requestAnimationFrame') &&
  eventsSrc.includes('saveInlinePlanWeek'));
check('L12: storage/cloud/history/main ná»‘i x1NanPlans',
  storageSrc.includes('restoreX1NanPlans') &&
  storageSrc.includes('x1NanPlans: state.x1NanPlans') &&
  cloudSrc.includes('x1NanPlans: state.x1NanPlans') &&
  cloudSrc.includes("if (remote.x1NanPlans)") &&
  cloudSrc.includes("if (data.x1NanPlans)") &&
  historySrc.includes('x1NanPlans:') &&
  mainSrc.includes('loadX1NanPlans()'));
check('L13: PWA/cache + APP_VERSION khá»›p v486',
  APP_VERSION === 'v486' &&
  swJs.includes('nha-may-ngoc-son-v486') &&
  fs.readFileSync(new URL('../js/state.js', import.meta.url), 'utf8').includes("APP_VERSION = 'v486'"));
check('L14: quyá»n + mapping export + bÃ¡o cÃ¡o káº¿ hoáº¡ch X1 Ä‘Ãºng',
  (() => {
    state.x1NanPlans = [
      { id: 'p2026', year: 2026, romanNo: 'I', productName: 'Thanh Váº§u A', material: 'Váº§u', width: 11, length: 50, len: 50, classification: 'A', weeks: { '53': 175.5, '38': 125.5 } },
      { id: 'p2026-a1', year: 2026, romanNo: 'II', productName: 'Thanh Váº§u A', material: 'Váº§u', width: 11, length: 50, len: 50, classification: 'A1', weeks: { '53': 24.5, '38': 14.5 } },
      { id: 'p2021', year: 2021, romanNo: 'II', productName: 'Thanh Ná»©a B', material: 'Ná»©a', width: 12, length: 50, len: 50, classification: 'B', weeks: { '52': 200 } }
    ];
    const d2026 = exportXlsx.buildX2ExportData('x1nanplan', { year: '2026', from: '', to: '' });
    const d2021 = exportXlsx.buildX2ExportData('x1nanplan', { year: '2021', from: '', to: '' });
    const h2026 = d2026 && d2026.aoa ? d2026.aoa[4] : [];
    const h2021 = d2021 && d2021.aoa ? d2021.aoa[4] : [];
    return sysSettings.AREA_BY_CARD['x1-nan-plan-card'] === 'x1.prod' &&
      x1.X2_CARD_EXPORT_SOURCE['x1-nan-plan-card'] === 'x1nanplan' &&
      exportSrc.includes("{ id: 'x1nanplan'") &&
      exportSrc.includes("source === 'x1nanplan'") &&
      reportSpecs.reportIdForCard('x1-nan-plan-card') === 'x1nanplan' &&
      reportSpecs.reportById('x1nanplan')?.source === 'x1nanplan' &&
      !h2026.includes('TT La MÃ£') && h2026.includes('TÃªn Sáº£n Pháº©m') &&
      h2026.includes('NguyÃªn Liá»‡u') &&
      h2026.includes('Báº£n Rá»™ng (ly)') && h2026.includes('PhÃ¢n Loáº¡i') &&
      h2026.includes('Tá»“n Hiá»‡n Táº¡i (kg)') && h2026.includes('Kháº£ NÄƒng ÄÃ¡p á»¨ng') &&
      h2026.includes('Tuáº§n 53 (kg)') &&
      h2021.includes('Tuáº§n 52 (kg)') && !h2021.includes('Tuáº§n 53 (kg)');
  })());
check('L15: Ã´ tuáº§n cÃ³ aria/title kg/danh má»¥c/kÃ­ch thÆ°á»›c/tuáº§n + action/input 44px + identity/action cá»‘ Ä‘á»‹nh',
  (() => {
    state.x1NanPlanYear = '2026';
    state.x1NanPlanViewMode = 'week';
    state.x1NanPlanPeriod = '2026-W38';
    x1.renderX1NanPlanCard();
    const body = document.getElementById('x1-nan-plan-body').innerHTML;
    return body.includes('aria-label=') &&
      body.includes('title=') &&
      body.includes('kg') &&
      body.includes('ly') &&
      body.includes('mm') &&
      body.includes('Tuáº§n') &&
      stylesCss.includes('min-height: 44px') &&
      stylesCss.includes('.x1-nan-plan-actions .btn-icon { width: 44px; height: 44px') &&
      stylesCss.includes('.x1-nan-plan-table th:first-child') &&
      stylesCss.includes('.x1-nan-plan-table th:last-child');
  })());
check('L16: tá»“n kho exact vÃ  kháº£ nÄƒng Ä‘Ã¡p á»©ng tuáº§n hiá»‡n táº¡i',
  (() => {
    state.xuong1LocThanhRecords = [{
      id: 'lt-stock-a', date: '2026-09-14', srcType: 'Váº§u',
      mode: 'loc-thanh',
      matrixRows: [{ width: 11, len: 50, weights: { A: 100, A1: 20, loai: 30 } }]
    }];
    state.x1KhoExports = [{
      id: 'export-a', date: '2026-09-15', type: 'xuat',
      material: 'Váº§u', width: 11, len: 50, qty: 40, unit: 'kg'
    }];
    const summary = x1.x1WarehouseStockSummary();
    const stockA = x1.x1NanStockQtyOf({
      material: 'Váº§u', width: 11, length: 50, classification: 'A'
    }, summary);
    const stockWrong = x1.x1NanStockQtyOf({
      material: 'Ná»©a', width: 11, length: 50, classification: 'A'
    }, summary);
    const stockLoai = x1.x1NanStockQtyOf({
      material: 'Váº§u', width: 11, length: 50, classification: 'Loáº¡i'
    }, summary);
    const plan = {
      year: 2026, material: 'Váº§u', width: 11, length: 50,
      classification: 'A', weeks: { '38': 80, '39': 80 }
    };
    const actual = Array.from({ length: 53 }, () => 0);
    actual[37] = 80;
    actual[38] = 80;
    const cover = x1.x1NanCapacitySummaryOf(plan, actual, 100, 2026, 38);
    const deficit = x1.x1NanCapacitySummaryOf(plan, actual, 50, 2026, 38);
    return stockA === 60 && stockWrong === 0 && stockLoai === 0 &&
      cover.covered === true && cover.deficit === 0 &&
      deficit.covered === false && deficit.deficit === 30 &&
      cover.level >= 2;
  })());

check('L17A: nháº­p tá»•ng tuáº§n phÃ¢n bá»• theo tá»· lá»‡ káº¿ hoáº¡ch con vÃ  chia Ä‘á»u náº¿u chÆ°a cÃ³ giÃ¡ trá»‹',
  (() => {
    state.x1NanPlanViewMode = 'week';
    state.x1NanPlanPeriod = '2026-W38';
    state.x1NanPlans = [
      { id: 'child-a', year: 2026, productName: 'Chia káº¿ hoáº¡ch', material: 'Váº§u', width: 11, length: 50, classification: 'A', weeks: { '38': 30, '39': 5 }, priority: false },
      { id: 'child-b', year: 2026, productName: 'Chia káº¿ hoáº¡ch', material: 'Váº§u', width: 11, length: 50, classification: 'A1', weeks: { '38': 70, '39': 7 }, priority: false }
    ];
    if (!x1.x1NanPlanSetChildWeekValue(['child-a', 'child-b'], 38, '100')) return false;
    const weightedA = state.x1NanPlans.find(p => p.id === 'child-a');
    const weightedB = state.x1NanPlans.find(p => p.id === 'child-b');
    if (!weightedA || !weightedB ||
      weightedA.weeks['38'] !== 30 || weightedB.weeks['38'] !== 70 ||
      weightedA.weeks['39'] !== 5 || weightedB.weeks['39'] !== 7) return false;

    state.x1NanPlans = [
      { id: 'child-c', year: 2026, productName: 'Chia Ä‘á»u', material: 'Váº§u', width: 11, length: 50, classification: 'A', weeks: { '39': 3 }, priority: false },
      { id: 'child-d', year: 2026, productName: 'Chia Ä‘á»u', material: 'Váº§u', width: 11, length: 50, classification: 'A1', weeks: { '39': 4 }, priority: false }
    ];
    if (!x1.x1NanPlanSetChildWeekValue(['child-c', 'child-d'], 38, '100')) return false;
    const equalC = state.x1NanPlans.find(p => p.id === 'child-c');
    const equalD = state.x1NanPlans.find(p => p.id === 'child-d');
    return !!equalC && !!equalD &&
      equalC.weeks['38'] === 50 && equalD.weeks['38'] === 50 &&
      equalC.weeks['39'] === 3 && equalD.weeks['39'] === 4;
  })());

check('L17B: tá»“n thay tháº¿ cá»™ng Ä‘á»§ Váº§u/Ná»©a cho cÃ¹ng báº£n rá»™ng, dÃ i vÃ  phÃ¢n loáº¡i',
  (() => {
    const stock = { groups: [
      { unit: 'kg', material: 'Váº§u', width: 11, len: 50, kind: 'A', qty: 500 },
      { unit: 'kg', material: 'Ná»©a', width: 11, len: 50, kind: 'A', qty: 300 },
      { unit: 'kg', material: 'Váº§u', width: 11, len: 50, kind: 'A1', qty: 200 }
    ] };
    const altQty = x1.x1NanStockQtyOf(
      { material: 'Váº§u / Ná»©a', width: 11, length: 50, classification: 'A' },
      stock);
    const altBreakdown = x1.x1NanStockBreakdownOf(
      'Váº§u / Ná»©a', 11, 50, stock);
    return altQty === 800 &&
      altBreakdown.A === 800 &&
      altBreakdown.A1 === 200 &&
      altBreakdown.total === 1000 &&
      x1.x1NanStockQtyOf('Váº§u', 11, 50, 'A', stock) === 500 &&
      x1.x1NanStockQtyOf('Ná»©a', 11, 50, 'A', stock) === 300;
  })());

check('L17C: merge Váº§u/Ná»©a exact vá»›i thay tháº¿, giá»¯ tuáº§n vÃ  khÃ´ng Ä‘á»ƒ exact trÃ¹ng',
  (() => {
    const nodeWith = (attr, value) => {
      const node = makeEl();
      node.setAttribute(attr, value);
      node.setAttribute('aria-pressed', 'true');
      node.classList.toggle('is-active', true);
      return node;
    };
    const widthBox = makeEl('x1-nan-plan-width-chips');
    widthBox.querySelectorAll = () => [nodeWith('data-x1-nan-plan-width', '11')];
    const lengthBox = makeEl('x1-nan-plan-length-chips');
    lengthBox.querySelectorAll = () => [nodeWith('data-x1-nan-plan-length', '50')];
    const classBox = makeEl('x1-nan-plan-class-chips');
    classBox.querySelectorAll = () => [nodeWith('data-x1-nan-plan-class', 'A')];
    els.set('x1-nan-plan-width-chips', widthBox);
    els.set('x1-nan-plan-length-chips', lengthBox);
    els.set('x1-nan-plan-class-chips', classBox);

    const matAltBox = makeEl('x1-nan-plan-material-chips');
    matAltBox.querySelectorAll = () => [
      nodeWith('data-x1-nan-plan-material', 'Váº§u'),
      nodeWith('data-x1-nan-plan-material', 'Ná»©a')
    ];
    els.set('x1-nan-plan-material-chips', matAltBox);
    state.x1NanPlans = [
      { id: 'merge-vau', year: 2026, productName: 'Merge thay tháº¿', material: 'Váº§u', width: 11, length: 50, classification: 'A', weeks: { '38': 100 }, priority: false },
      { id: 'merge-nua', year: 2026, productName: 'Merge thay tháº¿', material: 'Ná»©a', width: 11, length: 50, classification: 'A', weeks: { '38': 200 }, priority: false }
    ];
    state.x1NanPlanYear = '2026';
    document.getElementById('x1-nan-plan-year').value = '2026';
    x1.x1NanPlanStartForm();
    document.getElementById('x1-nan-plan-product').value = 'Merge thay tháº¿';
    if (!x1.x1NanPlanSaveForm()) return false;
    const altRows = state.x1NanPlans.filter(p =>
      p && p.productName === 'Merge thay tháº¿' &&
      p.width === 11 && p.length === 50 && p.classification === 'A');
    if (altRows.length !== 1 || altRows[0].material !== 'Váº§u / Ná»©a' ||
      altRows[0].weeks['38'] !== 300) return false;

    const matVauBox = makeEl('x1-nan-plan-material-chips');
    matVauBox.querySelectorAll = () => [
      nodeWith('data-x1-nan-plan-material', 'Váº§u')
    ];
    els.set('x1-nan-plan-material-chips', matVauBox);
    state.x1NanPlans = [
      { id: 'merge-alt', year: 2026, productName: 'Äá»•i sang exact', material: 'Váº§u / Ná»©a', width: 11, length: 50, classification: 'A', weeks: { '39': 250 }, priority: false },
      { id: 'merge-vau-existing', year: 2026, productName: 'Äá»•i sang exact', material: 'Váº§u', width: 11, length: 50, classification: 'A', weeks: { '39': 50 }, priority: false }
    ];
    state.x1NanPlanYear = '2026';
    document.getElementById('x1-nan-plan-year').value = '2026';
    x1.x1NanPlanStartForm();
    document.getElementById('x1-nan-plan-product').value = 'Äá»•i sang exact';
    if (!x1.x1NanPlanSaveForm()) return false;
    const exactRows = state.x1NanPlans.filter(p =>
      p && p.productName === 'Äá»•i sang exact' &&
      p.width === 11 && p.length === 50 && p.classification === 'A');
    return exactRows.length === 1 &&
      exactRows[0].material === 'Váº§u' &&
      exactRows[0].weeks['39'] === 300 &&
      state.x1NanPlans.every(p => p.material !== 'Váº§u / Ná»©a');
  })());

check('L17D: Æ°u tiÃªn theo tuáº§n rollback state vÃ  DOM khi lÆ°u tháº¥t báº¡i',
  (() => {
    state.x1NanPlans = [
      { id: 'priority-fail', year: 2026, productName: 'Æ¯u tiÃªn rollback', material: 'Váº§u', width: 11, length: 50, classification: 'A', weeks: { '38': 20 }, priorityWeeks: {}, priority: false }
    ];
    state.x1NanPlanViewMode = 'week';
    state.x1NanPlanPeriod = '2026-W38';
    const originalSetItem = localStorage.setItem;
    let saveFailed = false;
    try {
      localStorage.setItem = () => { throw new Error('offline write failure'); };
      saveFailed = !x1.x1NanPlanSetWeekPriority(['priority-fail'], '2026-W38', true);
    } finally {
      localStorage.setItem = originalSetItem;
    }
    const plan = state.x1NanPlans.find(p => p.id === 'priority-fail');
    return saveFailed &&
      plan && plan.priority === false &&
      !plan.priorityWeeks['2026-W38'] &&
      eventsSrc.includes('const previous = !desired') &&
      eventsSrc.includes('x1NanPlanSetWeekPriority') &&
      eventsSrc.includes('data-x1-nan-plan-week-priority');
  })());

check('L17E: Æ°u tiÃªn theo tuáº§n lÆ°u Ä‘Ãºng YYYY-Www chá»‰ trÃªn dÃ²ng káº¿ hoáº¡ch exact',
  (() => {
    state.x1NanPlans = [
      { id: 'scope-a-2026', year: 2026, productName: 'Scope sáº£n pháº©m', material: 'Váº§u', width: 11, length: 50, classification: 'A', weeks: { '38': 20 }, priorityWeeks: {}, priority: false },
      { id: 'scope-a1-2026', year: 2026, productName: 'Scope sáº£n pháº©m', material: 'Váº§u', width: 11, length: 50, classification: 'A1', weeks: { '38': 10 }, priorityWeeks: {}, priority: false },
      { id: 'scope-a-2025', year: 2025, productName: 'Scope sáº£n pháº©m', material: 'Váº§u', width: 11, length: 50, classification: 'A', weeks: { '38': 30 }, priorityWeeks: {}, priority: false }
    ];
    state.x1NanPlanViewMode = 'week';
    state.x1NanPlanPeriod = '2026-W38';
    if (!x1.x1NanPlanSetWeekPriority(['scope-a-2026'], '2026-W38', true)) return false;
    const exactA = state.x1NanPlans.find(p => p.id === 'scope-a-2026');
    const exactA1 = state.x1NanPlans.find(p => p.id === 'scope-a1-2026');
    const sameSize2025 = state.x1NanPlans.find(p => p.id === 'scope-a-2025');
    if (exactA.priorityWeeks['2026-W38'] !== true ||
      exactA1.priorityWeeks['2026-W38'] ||
      sameSize2025.priorityWeeks['2026-W38']) return false;
    if (!x1.x1NanPlanSetWeekPriority(['scope-a-2026', 'scope-a1-2026'], '38', true)) return false;
    if (exactA.priorityWeeks['2026-W38'] !== true ||
      exactA1.priorityWeeks['2026-W38'] !== true ||
      sameSize2025.priorityWeeks['2026-W38']) return false;
    x1.renderX1NanPlanCard();
    const body = document.getElementById('x1-nan-plan-body').innerHTML;
    return exactA.priority === false &&
      exactA1.priority === false &&
      sameSize2025.priority === false &&
      body.includes('data-x1-nan-plan-week-priority="2026-W38"') &&
      body.includes('>Æ¯u tiÃªn</') &&
      !body.includes('data-x1-nan-plan-child-priority') &&
      !body.includes('data-x1-nan-plan-product-priority');
  })());

console.log(`\n=== Káº¾T QUáº¢ XUONG1: ${pass} PASS / ${fail} FAIL ===`);
process.exit(fail > 0 ? 1 : 0);

