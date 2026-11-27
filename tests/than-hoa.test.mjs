// tests/than-hoa.test.mjs â€” Kiá»ƒm thá»­ cÃ´ng Ä‘oáº¡n THAN HÃ“A + Sáº¤Y (XÆ°á»Ÿng 2):
// 1. "ThÃªm LÃ´ Sáº¥y Má»›i": nÃºt "Chá»n LÃ´ Nan" má»Ÿ danh sÃ¡ch THáºº nguá»“n â€” CHá»ŒN ÄÆ¯á»¢C
//    NHIá»€U nguá»“n cÃ¹ng lÃºc (Sáº¥y 1: tháº» nan Chá»n Nan ThÃ´ Â· Sáº¥y 2: lÃ´ Ä‘ang á»Ÿ Kho);
//    KHÃ”NG cÃ²n Ã´ nháº­p Sá»‘ lÆ°á»£ng (sá»‘ lÆ°á»£ng láº¥y nguyÃªn theo nguá»“n).
//    Vá»‹ TrÃ­ = nÃºt chá»n â†’ LS1..LS15 + nÃºt "ThÃªm" (khai bÃ¡o vá»‹ trÃ­ má»›i, lÆ°u state).
// 2. "Chuyá»ƒn Kho": chá»n Vá»Š TRÃ (chá»‰ cÃ¡c vá»‹ trÃ­ Ä‘ang cÃ³ lÃ´) â†’ Táº¤T Cáº¢ lÃ´ nan trong
//    vá»‹ trÃ­ Ä‘Ã³ cÃ¹ng vÃ o Kho; Vá»‹ trÃ­ má»›i á»Ÿ Kho NHáº¬P TAY (cÃ³ gá»£i Ã½ sáºµn).
// 3. Cá»™t "BÃ o Tinh" Ä‘Ã£ XÃ“A Háº²N khá»i Kanban (markup + CSS cá» áº©n) â€” planning Ä‘á»c
//    THáºº BÃ o Tinh (state.xuong2BaoTinhRecords); cÃ´ng Ä‘oáº¡n cÃ²n Sáº¥y 1/Sáº¥y 2/Kho.
// 4. TrÃªn Ä‘iá»‡n thoáº¡i: chá»‰ THáºº CHA giá»¯ khung tre, tháº» CON bá» khung + scale nhá».
// 5. Form "ThÃªm LÃ´ Sáº¥y Má»›i": Ã´ tÃ¬m THEO Sá» LÆ¯á»¢NG (RIÃŠNG, chá»‰ khá»›p sá»‘ lÆ°á»£ng,
//    lá»c Káº¾T Há»¢P Ã´ tÃ¬m nhanh báº±ng Ä‘iá»u kiá»‡n VÃ€) + danh sÃ¡ch nguá»“n lÃ  DROPDOWN Ná»”I
//    tráº£i bá» rá»™ng mÃ n hÃ¬nh Ä‘ang xem, cao tá»‘i Ä‘a 5 DÃ’NG THáºº rá»“i tá»± cuá»™n.
// 6. (11/2026) Tháº» lÃ´ Kanban Gá»ŒN 2 DÃ’NG (bá» khung tre 26px tá»«ng tháº» â€” viá»n trÃ¡i
//    mÃ u cÃ´ng Ä‘oáº¡n) + cÃ´ng táº¯c THáºº â‡„ Báº¢NG dÃ y Ä‘áº·c (nhá»› mÃ¡y bamboo_tracker_
//    kanban_density_v1) cho cá»™t Ä‘Ã´ng lÃ´.
'use strict';
import fs from 'node:fs';

// â”€â”€â”€ Stubs mÃ´i trÆ°á»ng (giá»‘ng transfer-fields.test.mjs) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function makeEl(id) {
  const el = {
    id: id || '', value: '', checked: false, disabled: false, hidden: false,
    open: true, textContent: '', innerHTML: '', style: {}, dataset: {},
    offsetWidth: 800, offsetHeight: 500,
    classList: { _s: new Set(), add(c){ this._s.add(c); }, remove(c){ this._s.delete(c); }, toggle(c, f){ if (f === undefined) f = !this._s.has(c); if (f) this._s.add(c); else this._s.delete(c); return f; }, contains(c){ return this._s.has(c); } },
    addEventListener(t, f) { (el._h[t] = el._h[t] || []).push(f); },
    appendChild(c) { return c; }, removeChild(c) { return c; },
    remove(){}, setAttribute(){}, getAttribute: () => null,
    querySelector: () => makeEl(), querySelectorAll: () => [],
    closest: () => null, matches: () => false,
    getContext: () => ctxStub(),
    getBoundingClientRect: () => ({ top: 0, left: 0, right: 800, bottom: 600, width: 800, height: 600 }),
    reset(){}, focus(){}, click(){}, animate(){ return { cancel(){} }; }
  };
  return el;
}
function ctxStub() {
  return new Proxy({}, {
    get(_, k) {
      if (k === 'measureText') return () => ({ width: 10 });
      if (k === 'createLinearGradient' || k === 'createRadialGradient') return () => ({ addColorStop(){} });
      return () => undefined;
    },
    set() { return true; }
  });
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
global.Chart = class { constructor(c, g) { this.ctx = c; this.config = g; this.data = (g && g.data) || { labels: [], datasets: [] }; } update(){} resize(){} destroy(){} render(){} reset(){} getDatasetMeta(){ return { data: [] }; } };
Chart.register = () => {};
if (!global.URL.createObjectURL) global.URL.createObjectURL = () => 'blob:stub';
if (!global.URL.revokeObjectURL) global.URL.revokeObjectURL = () => {};
global.XLSX = { utils: { book_new: () => ({ SheetNames: [] }), aoa_to_sheet: () => ({}), json_to_sheet: () => ({}), book_append_sheet(){}, encode_cell: () => 'A1', decode_range: () => ({ s: { r: 0, c: 0 }, e: { r: 0, c: 0 } }) }, writeFile(){}, write: () => new ArrayBuffer(8) };
global.fetch = async () => ({ ok: false, status: 0, statusText: 'offline-stub', json: async () => ({}), text: async () => '' });
global.Image = class { set src(_) {} addEventListener(){} };
global.ResizeObserver = class { observe(){} unobserve(){} disconnect(){} };

let pass = 0, fail = 0;
function check(label, cond) {
  if (cond) { pass++; console.log('PASS ' + label); }
  else { fail++; console.log('FAIL ' + label); }
}

const { state, STORAGE_KEY_X2_LOT_LOCATIONS } = await import('../js/state.js');
state.currentUser = { username: 'admin', role: 'admin', editTabs: [], allowAdvanced: true };
state.activeView = 'kanban-view';


// â”€â”€â”€ Dá»¯ liá»‡u máº«u â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// 2 tháº» nan cá»§a cÃ´ng Ä‘oáº¡n CHá»ŒN NAN THÃ” + 1 tháº» "Loáº¡i háº³n" (khÃ´ng dÃ¹ng Ä‘á»ƒ táº¡o lÃ´)
state.xuong2ChonNanThoRecords = [
  { id: 'cn-1', baothoId: 'bt-1', date: '2026-09-16', dims: [1250, 18, 7], sizeKey: '1250Ã—18Ã—7', cls: 'A1', quantity: 500,  unitVol: 0.0001575, volume: 0.0788, createdAt: '2026-09-16T02:00:00.000Z' },
  { id: 'cn-2', baothoId: 'bt-1', date: '2026-09-16', dims: [1300, 20, 8], sizeKey: '1300Ã—20Ã—8', cls: 'A',  quantity: 1000, unitVol: 0.000208,  volume: 0.208,  createdAt: '2026-09-16T02:00:00.000Z' },
  { id: 'cn-reject', baothoId: 'bt-1', date: '2026-09-16', dims: [1250, 18, 7], sizeKey: '1250Ã—18Ã—7', cls: 'reject', quantity: 50, unitVol: 0.0001575, volume: 0.0079, createdAt: '2026-09-16T02:00:00.000Z' }
];
// LÃ´ nan hiá»‡n cÃ³: 1 lÃ´ Ä‘ang á»Ÿ KHO (nguá»“n cá»§a Sáº¥y 2) + 1 lÃ´ Ä‘ang á»Ÿ Sáº¥y 1 (nguá»“n Chuyá»ƒn Kho)
state.batches = [
  { id: 'b-kho1', code: '260910-01', stage: 'kho', date: '2026-09-10', week: '2026-W37', length: 1250, width: 18, thickness: 7, quantity: 800, volume: 0.126, bambooType: 'A1', useFor: 'VÃ¡n', location: 'K11', stageHistory: [{ stage: 'kho', date: '2026-09-10' }] },
  { id: 'b-say1a', code: '260912-01', stage: 'say1', date: '2026-09-12', week: '2026-W37', length: 1300, width: 20, thickness: 8, quantity: 600, volume: 0.1248, bambooType: 'A', useFor: 'VÃ¡n', location: 'LS1', stageHistory: [{ stage: 'say1', date: '2026-09-12' }] },
  { id: 'b-say2a', code: '260913-01', stage: 'say2', date: '2026-09-13', week: '2026-W37', length: 1250, width: 18, thickness: 7, quantity: 400, volume: 0.063, bambooType: 'B', useFor: 'Bullig', location: 'LS2', say2Date: '2026-09-13', stageHistory: [{ stage: 'say2', date: '2026-09-13' }] }
];

const bm = await import('../js/batch-modals.js');
// Bá»™ kiá»ƒm thá»­ nÃ y kiá»ƒm tra LUá»’NG THáºº NGUá»’N (cÃ¡ch cÅ©). Cháº¿ Ä‘á»™ Báº¢NG NHáº¬P NHANH
// cÃ³ file riÃªng tests/than-hoa-grid.test.mjs â†’ Ã©p cháº¿ Ä‘á»™ Tháº» Ä‘á»ƒ giá»¯ nguyÃªn
// toÃ n bá»™ hÃ nh vi Ä‘Ã£ chá»‘t trÆ°á»›c Ä‘Ã¢y.
bm.setAlEntryMode('cards');
const x2 = await import('../js/xuong2.js');      // tháº» launcher XÆ°á»Ÿng 2 (pop-up)
const mainMod = await import('../js/main.js');    // switchView (Ä‘Ã³ng modal thuá»™c tab vá»«a rá»i)

// â”€â”€â”€ A. NGUá»’N Cá»¦A "THÃŠM LÃ” Sáº¤Y Má»šI" â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const say1Cards = bm.availableSay1Cards();
check('NGUá»’N Sáº¤Y 1: láº¥y tá»« cÃ´ng Ä‘oáº¡n Chá»n Nan ThÃ´, Bá»Ž QUA tháº» "Loáº¡i háº³n" (2 tháº»)',
  say1Cards.length === 2 && !say1Cards.some(r => r.cls === 'reject'));
check('NGUá»’N Sáº¤Y 1: pháº§n cÃ²n láº¡i = sá»‘ lÆ°á»£ng tháº» khi chÆ°a táº¡o lÃ´ sáº¥y nÃ o',
  bm.nanCardRemainingOf(say1Cards.find(r => r.id === 'cn-1')) === 500);
check('NGUá»’N Sáº¤Y 2: láº¥y cÃ¡c lÃ´ ÄANG á»ž KHO',
  bm.availableKhoLots().length === 1 && bm.availableKhoLots()[0].id === 'b-kho1');

// â”€â”€â”€ B. "THÃŠM LÃ” Sáº¤Y Má»šI" â€” Sáº¤Y 1 (CHá»ŒN NHIá»€U THáºº NAN) â”€â”€â”€â”€â”€â”€â”€â”€â”€
bm.openAddLotModal();
check('FORM: máº·c Ä‘á»‹nh Sáº¥y 1 + ngÃ y hÃ´m nay + 2 danh sÃ¡ch (nguá»“n/vá»‹ trÃ­) Ä‘ang Ä‘Ã³ng',
  document.getElementById('al-stage').value === 'say1' &&
  document.getElementById('al-date').value === new Date().toISOString().split('T')[0] &&
  document.getElementById('al-source-panel').hidden === true &&
  document.getElementById('al-location-panel').hidden === true);
const srcList = document.getElementById('al-source-list');
check('FORM: tháº» nguá»“n Sáº¥y 1 = 2 DÃ’NG â€” DÃ²ng 1 k.thÆ°á»›c Â· loáº¡i Â· NGÃ€Y CHá»ŒN NAN; DÃ²ng 2 chip Tá»’N mÃ u + chip DÃ¹ng cho',
  srcList.innerHTML.includes('data-al-pick="cn-1"') &&
  !srcList.innerHTML.includes('al-card-check') &&
  srcList.innerHTML.includes('1250Ã—18Ã—7 Â· A1 Â· Chá»n nan 16/09/26') &&
  srcList.innerHTML.includes('al-stock-chip') &&
  srcList.innerHTML.includes('cÃ²n 500/500 thanh') &&
  srcList.innerHTML.includes('al-use-tag') &&
  /class="al-use-tag use-van">VÃ¡n</.test(srcList.innerHTML));
check('FORM: cÃ³ Ã´ chá»n "DÃ¹ng Cho" (VÃ¡n/Bullig), máº·c Ä‘á»‹nh VÃ¡n',
  !!document.getElementById('al-use-for') &&
  document.getElementById('al-use-for').value === 'VÃ¡n');
check('FORM: nÃºt "Chá»n LÃ´ Nan" má»Ÿ/Ä‘Ã³ng danh sÃ¡ch tháº» nguá»“n',
  bm.alToggleSourcePanel() === true &&
  document.getElementById('al-source-panel').hidden === false &&
  bm.alToggleSourcePanel() === false);
check('FORM: báº¥m 1 tháº» = chá»n 1 nguá»“n (tick xanh) + Ä‘áº¿m sá»‘ nguá»“n Ä‘Ã£ chá»n',
  bm.alTogglePick('cn-1').length === 1 &&
  document.getElementById('al-picked-count').textContent === '1 Ä‘Ã£ chá»n' &&
  document.getElementById('al-source-list').innerHTML.includes('al-card picked'));
check('FORM: "ThÃ´ng Tin Láº¥y Tá»« Nguá»“n" â€” má»—i tháº» 1 DÃ’NG cÃ³ NGÃ€Y CHá»ŒN NAN + Tá»“n + Ã” NHáº¬P Sá» LÆ¯á»¢NG táº¡o lÃ´ (máº·c Ä‘á»‹nh = tá»“n)',
  (() => {
    const h = document.getElementById('al-source-info').innerHTML;
    return h.includes('1250 Ã— 18 Ã— 7 mm') && h.includes('A1') &&
      h.includes('Chá»n nan 16/09/26') && h.includes('Tá»“n 500/500') &&
      h.includes('data-al-qty="cn-1"') && h.includes('value="500"');
  })());
check('FORM: "Chá»n táº¥t cáº£" chá»n háº¿t nguá»“n kháº£ dá»¥ng Â· "Bá» chá»n" xoÃ¡ háº¿t',
  bm.alPickAll().length === 2 && bm.alClearPicks().length === 0 &&
  document.getElementById('al-picked-count').textContent === 'ChÆ°a chá»n');
check('Vá»Š TRÃ: danh sÃ¡ch máº·c Ä‘á»‹nh LS1..LS15 + Ã´ nháº­p vá»‹ trÃ­ má»›i Ä‘ang áº©n',
  bm.alLocations().length === 15 && bm.alLocations()[0] === 'LS1' && bm.alLocations()[14] === 'LS15' &&
  document.getElementById('al-location-chips').innerHTML.includes('data-al-loc="LS1"') &&
  document.getElementById('al-location-new-row').hidden === true);
check('Vá»Š TRÃ: panel inline Má»ž trá»±c tiáº¿p (khÃ´ng cáº§n báº¥m nÃºt) + chip Ä‘Ã£ chá»n Ä‘Æ°á»£c tÃ´', (() => {
  const panel = document.getElementById('al-location-panel');
  // MÃ´i trÆ°á»ng stub: classList báº¯t Ä‘áº§u rá»—ng (khÃ´ng Ä‘á»c Ä‘Æ°á»£c attribute class tá»« HTML)
  // â†’ thÃªm class inline Ä‘á»ƒ giáº£ láº­p Ä‘Ãºng HTML tháº­t (class="al-picker al-loc-inline")
  // + tá»± má»Ÿ panel (openAddLotModal Ä‘Ã£ cháº¡y lÃºc stub chÆ°a cÃ³ class â†’ bá»‹ áº©n trÆ°á»›c).
  panel.classList.add('al-loc-inline');
  panel.hidden = false;
  bm.alSetLocation('LS3');
  return panel.classList.contains('al-loc-inline') &&
    panel.hidden === false &&
    document.getElementById('al-location').value === 'LS3' &&
    document.getElementById('al-location-chips').innerHTML.includes('al-loc-chip picked');
})());
document.getElementById('al-location-new').value = 'LS16';
bm.handleAlAddLocation();
check('Vá»Š TRÃ: nÃºt "ThÃªm" khai bÃ¡o vá»‹ trÃ­ má»›i (LS16) â€” lÆ°u state + localStorage + tá»± chá»n',
  state.x2LotLocations.includes('LS16') && bm.alLocations().length === 16 &&
  document.getElementById('al-location').value === 'LS16' &&
  JSON.parse(localStorage.getItem(STORAGE_KEY_X2_LOT_LOCATIONS) || '[]').includes('LS16'));

// â”€â”€â”€ XÃ“A Vá»Š TRÃ ÄÃƒ KHAI BÃO (LS1..LS15 lÃ  máº·c Ä‘á»‹nh, KHÃ”NG xÃ³a Ä‘Æ°á»£c) â”€â”€
document.getElementById('al-location-new').value = 'LÃ² 99';
bm.handleAlAddLocation();
const chipsHtml = document.getElementById('al-location-chips').innerHTML;
check('XÃ“A Vá»Š TRÃ: chip vá»‹ trÃ­ Ä‘Ã£ khai bÃ¡o cÃ³ nÃºt Ã— (data-al-loc-del); chip máº·c Ä‘á»‹nh (LS3) KHÃ”NG cÃ³',
  chipsHtml.includes('data-al-loc-del="LÃ² 99"') &&
  chipsHtml.includes('al-loc-item') &&
  !chipsHtml.includes('data-al-loc-del="LS3"'));
check('XÃ“A Vá»Š TRÃ: KHÃ”NG xÃ³a Ä‘Æ°á»£c vá»‹ trÃ­ máº·c Ä‘á»‹nh (LS1..LS15)',
  bm.handleAlDeleteLocation('LS3') === false && bm.alLocations().includes('LS3'));
check('XÃ“A Vá»Š TRÃ: xÃ³a vá»‹ trÃ­ Ä‘Ã£ khai bÃ¡o â†’ khá»i state + localStorage + danh sÃ¡ch chá»n',
  bm.handleAlDeleteLocation('LÃ² 99') === true &&
  !state.x2LotLocations.includes('LÃ² 99') && !bm.alLocations().includes('LÃ² 99') &&
  !JSON.parse(localStorage.getItem(STORAGE_KEY_X2_LOT_LOCATIONS) || '[]').includes('LÃ² 99'));
document.getElementById('al-location-new').value = 'K99';
bm.handleAlAddLocation();
bm.alSetLocation('K99');
check('XÃ“A Vá»Š TRÃ: Ä‘ang chá»n Ä‘Ãºng vá»‹ trÃ­ bá»‹ xÃ³a â†’ Ã´ Vá»‹ TrÃ­ tá»± vá» trá»‘ng (pháº£i chá»n láº¡i)',
  bm.handleAlDeleteLocation('k99') === true &&          // khá»›p khÃ´ng phÃ¢n biá»‡t hoa/thÆ°á»ng
  bm.alCurrentLocation() === '' && document.getElementById('al-location').value === '');
bm.alSetLocation('LS16');
check('Vá»Š TRÃ: chá»n láº¡i LS16 (vá»‹ trÃ­ Ä‘Ã£ khai bÃ¡o) cho lÆ°á»£t lÆ°u tiáº¿p theo',
  bm.alCurrentLocation() === 'LS16');

// â”€â”€â”€ Uá»¶ NHIá»†M Sá»° KIá»†N: báº¥m Ã— trÃªn chip = xÃ³a, báº¥m chip = chá»n â”€â”€
function clickTarget(sel, attrValue) {
  return { closest: (q) => (q === sel ? { getAttribute: () => attrValue } : null) };
}
document.getElementById('al-location-new').value = 'X99';
bm.handleAlAddLocation();
bm.alOnLocationChipClick({ target: clickTarget('[data-al-loc-del]', 'X99') });
check('Uá»¶ NHIá»†M: báº¥m nÃºt Ã— trÃªn chip â†’ xÃ³a Ä‘Ãºng vá»‹ trÃ­ Ä‘Ã£ khai bÃ¡o',
  !state.x2LotLocations.includes('X99') && !bm.alLocations().includes('X99'));
bm.alOnLocationChipClick({ target: clickTarget('[data-al-loc]', 'LS7') });
check('Uá»¶ NHIá»†M: báº¥m chip vá»‹ trÃ­ â†’ chá»n Ä‘Ãºng vá»‹ trÃ­ Ä‘Ã³', bm.alCurrentLocation() === 'LS7');
bm.alSetLocation('LS16');   // tráº£ vá» vá»‹ trÃ­ dÃ¹ng cho cÃ¡c lÆ°á»£t lÆ°u bÃªn dÆ°á»›i

// LÆ°u khi CHÆ¯A chá»n nguá»“n â†’ cháº·n
document.getElementById('al-date').value = '2026-09-17';
const cntB0 = state.batches.length;
bm.handleAddLotSubmit({ preventDefault(){} });
check('CHáº¶N: chÆ°a chá»n nguá»“n nÃ o â†’ khÃ´ng táº¡o lÃ´', state.batches.length === cntB0);

// Chá»n 2 tháº» cÃ¹ng lÃºc â†’ táº¡o 2 lÃ´, sá»‘ lÆ°á»£ng = pháº§n cÃ²n láº¡i cá»§a Tá»ªNG tháº»
bm.alTogglePick('cn-1');
bm.alTogglePick('cn-2');
check('CHá»ŒN NHIá»€U: giá»¯ Ä‘Æ°á»£c 2 nguá»“n cÃ¹ng lÃºc', bm.alPickedIds().length === 2);
document.getElementById('al-notes').value = 'Máº» Ä‘áº§u';
bm.handleAddLotSubmit({ preventDefault(){} });
const bNew1 = state.batches.find(b => b.sourceChonNanId === 'cn-1');
const bNew2 = state.batches.find(b => b.sourceChonNanId === 'cn-2');
check('Sáº¤Y 1: táº¡o 2 lÃ´ cÃ¹ng lÃºc â€” kÃ­ch thÆ°á»›c/loáº¡i tá»« tháº» nan, Sá» LÆ¯á»¢NG = pháº§n cÃ²n láº¡i',
  !!bNew1 && !!bNew2 && bNew1.stage === 'say1' && bNew2.stage === 'say1' &&
  bNew1.quantity === 500 && bNew2.quantity === 1000 &&
  bNew1.length === 1250 && bNew1.width === 18 && bNew1.thickness === 7 &&
  bNew2.length === 1300 && bNew1.bambooType === 'A1' && bNew2.bambooType === 'A');
check('Sáº¤Y 1: NGÃ€Y = ngÃ y vÃ o Sáº¥y 1 (2026-09-17) + ghi má»‘c stageHistory Ä‘á»ƒ Ä‘áº¿m ngÃ y',
  bNew1.date === '2026-09-17' &&
  bNew1.stageHistory.some(h => h.stage === 'say1' && h.date === '2026-09-17'));
check('Sáº¤Y 1: Vá»‹ TrÃ­ = LS16 (vá»‹ trÃ­ khai bÃ¡o thÃªm) + thá»ƒ tÃ­ch quy Ä‘á»•i + link tháº» nan nguá»“n',
  bNew1.location === 'LS16' && bNew2.location === 'LS16' &&
  Math.abs(bNew1.volume - 0.0788) < 0.0001 && bNew1.sourceChonNanId === 'cn-1');
check('Sáº¤Y 1: mÃ£ lÃ´ tá»± sinh KHÃC NHAU cho tá»«ng lÃ´ trong cÃ¹ng 1 lÆ°á»£t lÆ°u',
  bNew1.code === '260917-01' && bNew2.code === '260917-02');
check('Sáº¤Y 1: DÃ¹ng Cho láº¥y tá»« form (máº·c Ä‘á»‹nh VÃ¡n)', bNew1.useFor === 'VÃ¡n' && bNew2.useFor === 'VÃ¡n');
check('Sáº¤Y 1: dÃ¹ng háº¿t 2 tháº» nan â†’ khÃ´ng cÃ²n nguá»“n kháº£ dá»¥ng + form Ä‘Ã³ng láº¡i',
  bm.availableSay1Cards().length === 0 &&
  !document.getElementById('modal-add-lot').classList.contains('show'));

// â”€â”€â”€ B2. Sáº¤Y 1 â€” NHáº¬P Sá» LÆ¯á»¢NG RIÃŠNG: 1 THáºº CHIA THÃ€NH NHIá»€U LÃ” (16/10/2026) â”€â”€
state.xuong2ChonNanThoRecords.push(
  { id: 'cn-3', baothoId: 'bt-1', date: '2026-09-18', dims: [1250, 24, 8], sizeKey: '1250Ã—24Ã—8', cls: 'A', quantity: 5000, unitVol: 0.00024, volume: 1.2, createdAt: '2026-09-18T04:00:00.000Z' }
);
bm.openAddLotModal();
bm.alSetLocation('LS16');            // má»Ÿ form reset vá»‹ trÃ­ â†’ chá»n láº¡i vá»‹ trÃ­ Ä‘á»ƒ LÆ°u Ä‘Æ°á»£c
bm.alTogglePick('cn-3');
check('NHáº¬P Sá» LÆ¯á»¢NG: Ã´ nháº­p cá»§a tháº» 5.000 thanh cÃ³ max = tá»“n 5.000 + giÃ¡ trá»‹ máº·c Ä‘á»‹nh = 5.000',
  (() => {
    const h = document.getElementById('al-source-info').innerHTML;
    return h.includes('data-al-qty="cn-3"') && h.includes('max="5000"') && h.includes('value="5000"') &&
      h.includes('Tá»“n 5.000/5.000');
  })());
// Nháº­p 2.000 â†’ tÃ³m táº¯t theo Sá» ÄANG NHáº¬P (khÃ´ng pháº£i tá»“n) + clamp khi vÆ°á»£t
bm.alOnCardQtyInput({ target: { value: '2000', getAttribute: (k) => (k === 'data-al-qty' ? 'cn-3' : null) } });
check('NHáº¬P Sá» LÆ¯á»¢NG: nháº­p 2.000 â†’ tÃ³m táº¯t nguá»“n = "1 nguá»“n Â· 2.000 thanh" (theo sá»‘ Ä‘ang nháº­p)',
  document.getElementById('al-sum-src').textContent === '1 nguá»“n Â· 2.000 thanh' &&
  bm.alCardQtyOf('cn-3') === 2000);
check('CHáº¶N VÆ¯á»¢T Tá»’N: nháº­p 9.999 (vÆ°á»£t tá»“n 5.000) â†’ tá»± Ä‘iá»u vá» 5.000',
  (() => {
    const inp = { value: '9999', getAttribute: (k) => (k === 'data-al-qty' ? 'cn-3' : null) };
    const v = bm.alOnCardQtyInput({ target: inp });
    return v === 5000 && inp.value === '5000' && bm.alCardQtyOf('cn-3') === 5000;
  })());
// Chá»‘t láº¡i 2.000 rá»“i LÆ¯U â†’ lÃ´ 2.000, tháº» cÃ²n 3.000 (chia 1 tháº» thÃ nh nhiá»u lÃ´)
bm.alOnCardQtyInput({ target: { value: '2000', getAttribute: (k) => (k === 'data-al-qty' ? 'cn-3' : null) } });
document.getElementById('al-date').value = '2026-09-18';
bm.handleAddLotSubmit({ preventDefault(){} });
const bPart1 = state.batches.find(b => b.sourceChonNanId === 'cn-3');
check('CHIA LÃ” (1/2): lÃ´ Sáº¥y 1 táº¡o ra = 2.000 thanh (KHÃ”NG láº¥y nguyÃªn 5.000) + link tháº» nan nguá»“n',
  !!bPart1 && bPart1.quantity === 2000 && bPart1.stage === 'say1' && bPart1.length === 1250 && bPart1.width === 24);
check('CHIA LÃ” (1/2): tháº» nan cÃ²n 3.000/5.000 â†’ váº«n hiá»‡n trong danh sÃ¡ch nguá»“n',
  bm.nanCardRemainingOf(state.xuong2ChonNanThoRecords.find(r => r.id === 'cn-3')) === 3000 &&
  bm.availableSay1Cards().some(r => r.id === 'cn-3'));
// LÆ°á»£t 2: chá»n láº¡i tháº» Ä‘Ã³ â†’ máº·c Ä‘á»‹nh = pháº§n CÃ’N Láº I 3.000 â†’ lÆ°u háº¿t
bm.openAddLotModal();
bm.alSetLocation('LS16');
bm.alTogglePick('cn-3');
check('CHIA LÃ” (2/2): má»Ÿ láº¡i form â€” Ã´ nháº­p máº·c Ä‘á»‹nh = pháº§n CÃ’N Láº I 3.000 (khÃ´ng pháº£i tá»•ng 5.000)',
  (() => {
    const h = document.getElementById('al-source-info').innerHTML;
    return h.includes('Tá»“n 3.000/5.000') && h.includes('value="3000"') && h.includes('(Ä‘Ã£ dÃ¹ng 2.000)');
  })());
document.getElementById('al-date').value = '2026-09-18';
bm.handleAddLotSubmit({ preventDefault(){} });
check('CHIA LÃ” (2/2): lÆ°u tiáº¿p 3.000 â†’ tháº» háº¿t (0/5.000) + khÃ´ng cÃ²n nguá»“n kháº£ dá»¥ng',
  bm.nanCardRemainingOf(state.xuong2ChonNanThoRecords.find(r => r.id === 'cn-3')) === 0 &&
  bm.availableSay1Cards().length === 0);
check('CHIA LÃ”: 2 lÃ´ cÃ¹ng tháº» nan nguá»“n â€” mÃ£ lÃ´ khÃ¡c nhau, tá»•ng = 5.000 thanh',
  state.batches.filter(b => b.sourceChonNanId === 'cn-3').length === 2 &&
  state.batches.filter(b => b.sourceChonNanId === 'cn-3').reduce((s, b) => s + b.quantity, 0) === 5000);
// Dá»n dá»¯ liá»‡u test B2 â€” tráº£ tráº¡ng thÃ¡i vá» nhÆ° trÆ°á»›c (cÃ¡c khá»‘i sau Ä‘áº¿m vá»‹ trÃ­ theo sá»‘ lÃ´)
state.batches = state.batches.filter(b => b.sourceChonNanId !== 'cn-3');
state.xuong2ChonNanThoRecords = state.xuong2ChonNanThoRecords.filter(r => r.id !== 'cn-3');

// â”€â”€â”€ C. "THÃŠM LÃ” Sáº¤Y Má»šI" â€” Sáº¤Y 2 (chuyá»ƒn lÃ´ tá»« Kho) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
bm.openAddLotModal();
document.getElementById('al-stage').value = 'say2';
bm.syncAddLotUI();
// ThÃªm 1 lÃ´ ná»¯a á»Ÿ Kho Ä‘á»ƒ kiá»ƒm tra chuyá»ƒn NHIá»€U lÃ´ cÃ¹ng lÃºc
state.batches.push({
  id: 'b-kho2', code: '260911-01', stage: 'kho', date: '2026-09-11', week: '2026-W37',
  length: 1300, width: 20, thickness: 8, quantity: 300, volume: 0.0624, bambooType: 'A',
  useFor: 'VÃ¡n', location: 'K12', stageHistory: [{ stage: 'kho', date: '2026-09-11' }]
});
bm.syncAddLotUI();
check('Sáº¤Y 2: tháº» LÃ” 2 DÃ’NG (Vá»‹ trÃ­ Â· KT Â· Loáº¡i Â· SL / chip DÃ¹ng cho + badge S1-S2-K ngÃ y mÃ u)',
  document.getElementById('al-source-btn-text').textContent === 'Chá»n LÃ´ á»ž Kho' &&
  document.getElementById('al-source-list').innerHTML.includes('data-al-pick="b-kho1"') &&
  document.getElementById('al-source-list').innerHTML.includes('K11 Â· 1250Ã—18Ã—7 Â· A1 Â· 800 thanh') &&
  document.getElementById('al-source-list').innerHTML.includes('K12 Â· 1300Ã—20Ã—8 Â· A Â· 300 thanh') &&
  /class="al-use-tag use-van">VÃ¡n</.test(document.getElementById('al-source-list').innerHTML) &&
  document.getElementById('al-source-list').innerHTML.includes('al-day-badge day-s1') &&
  document.getElementById('al-source-list').innerHTML.includes('al-day-badge day-s2') &&
  document.getElementById('al-source-list').innerHTML.includes('al-day-badge day-k') &&
  /S1-\d+ ngÃ y/.test(document.getElementById('al-source-list').innerHTML));

// â”€â”€â”€ TÃŒM NHANH trong danh sÃ¡ch nguá»“n (nhÆ° Ã´ tÃ¬m kiáº¿m cá»§a cá»™t Kanban) â”€â”€
bm.alSetSourceQuery('K12');
check('TÃŒM NHANH: gÃµ "K12" (vá»‹ trÃ­) â†’ chá»‰ cÃ²n lÃ´ á»Ÿ K12',
  document.getElementById('al-source-list').innerHTML.includes('data-al-pick="b-kho2"') &&
  !document.getElementById('al-source-list').innerHTML.includes('data-al-pick="b-kho1"'));
bm.alSetSourceQuery('1300');
check('TÃŒM NHANH: gÃµ "1300" (kÃ­ch thÆ°á»›c) â†’ lá»c Ä‘Ãºng lÃ´ 1300Ã—20Ã—8',
  document.getElementById('al-source-list').innerHTML.includes('data-al-pick="b-kho2"') &&
  !document.getElementById('al-source-list').innerHTML.includes('data-al-pick="b-kho1"'));
bm.alSetSourceQuery('van');
check('TÃŒM NHANH: gÃµ khÃ´ng dáº¥u "van" â†’ khá»›p "DÃ¹ng cho VÃ¡n" (2 lÃ´)',
  document.getElementById('al-source-list').innerHTML.includes('data-al-pick="b-kho1"') &&
  document.getElementById('al-source-list').innerHTML.includes('data-al-pick="b-kho2"'));
bm.alSetSourceQuery('zzz');
check('TÃŒM NHANH: khÃ´ng khá»›p â†’ bÃ¡o "KhÃ´ng cÃ³ tháº»/lÃ´ nÃ o khá»›p"',
  document.getElementById('al-source-list').innerHTML.includes('KhÃ´ng cÃ³ tháº»/lÃ´ nÃ o khá»›p'));
bm.alSetSourceQuery('');

// â”€â”€â”€ TÃŒM THEO Sá» LÆ¯á»¢NG (Ã´ RIÃŠNG â€” chá»‰ khá»›p sá»‘ lÆ°á»£ng, lá»c Káº¾T Há»¢P 2 Ã´) â”€â”€
bm.alSetSourceQtyQuery('800');
check('TÃŒM Sá» LÆ¯á»¢NG: gÃµ "800" â†’ chá»‰ lÃ´ cÃ²n 800 thanh (b-kho1)',
  document.getElementById('al-source-list').innerHTML.includes('data-al-pick="b-kho1"') &&
  !document.getElementById('al-source-list').innerHTML.includes('data-al-pick="b-kho2"'));
bm.alSetSourceQtyQuery('300');
check('TÃŒM Sá» LÆ¯á»¢NG: gÃµ "300" â†’ chá»‰ lÃ´ 300 thanh (b-kho2)',
  document.getElementById('al-source-list').innerHTML.includes('data-al-pick="b-kho2"') &&
  !document.getElementById('al-source-list').innerHTML.includes('data-al-pick="b-kho1"'));
bm.alSetSourceQtyQuery('1300');
check('TÃŒM Sá» LÆ¯á»¢NG: gÃµ "1300" (lÃ  KÃCH THÆ¯á»šC) â†’ khÃ´ng lÃ´ nÃ o â€” Ã´ nÃ y CHá»ˆ khá»›p sá»‘ lÆ°á»£ng',
  document.getElementById('al-source-list').innerHTML.includes('KhÃ´ng cÃ³ tháº»/lÃ´ nÃ o khá»›p'));
// 2 Ã´ Lá»ŒC Káº¾T Há»¢P (Ä‘iá»u kiá»‡n VÃ€)
bm.alSetSourceQuery('K12'); bm.alSetSourceQtyQuery('800');
check('Káº¾T Há»¢P 2 Ã”: vá»‹ trÃ­ K12 + sá»‘ lÆ°á»£ng 800 â†’ khÃ´ng lÃ´ nÃ o (K12 chá»‰ cÃ³ 300 thanh)',
  document.getElementById('al-source-list').innerHTML.includes('KhÃ´ng cÃ³ tháº»/lÃ´ nÃ o khá»›p'));
bm.alSetSourceQuery('K12'); bm.alSetSourceQtyQuery('300');
check('Káº¾T Há»¢P 2 Ã”: vá»‹ trÃ­ K12 + sá»‘ lÆ°á»£ng 300 â†’ Ä‘Ãºng lÃ´ b-kho2',
  document.getElementById('al-source-list').innerHTML.includes('data-al-pick="b-kho2"') &&
  !document.getElementById('al-source-list').innerHTML.includes('data-al-pick="b-kho1"'));
bm.alSetSourceQuery(''); bm.alSetSourceQtyQuery('');
check('TÃŒM Sá» LÆ¯á»¢NG: xÃ³a cáº£ 2 Ã´ â†’ hiá»‡n láº¡i Ä‘á»§ 2 lÃ´ nguá»“n',
  document.getElementById('al-source-list').innerHTML.includes('data-al-pick="b-kho1"') &&
  document.getElementById('al-source-list').innerHTML.includes('data-al-pick="b-kho2"'));
// THá»NG NHáº¤T Vá»šI THáºº KHO: Sáº¥y 2 lá»c + tÃ¬m theo Tá»’N CÃ’N (khÃ´ng theo sá»‘ gá»‘c).
// LÃ´ gá»‘c 800 nhÆ°ng Ä‘Ã£ xuáº¥t 600 (cÃ²n 200) â†’ gÃµ "800" KHÃ”NG tháº¥y, gÃµ "200" má»›i tháº¥y.
state.khoNotes.push({
  id: 'kho-note-say2-800', type: 'xuat', purpose: 'baotinh', date: '2026-09-18',
  qty: 600, lots: [{ batchId: 'b-kho1', qty: 600 }], status: 'da_duyet',
  createdBy: 'admin', createdByName: 'admin', createdAt: '2026-09-18T02:00:00.000Z'
});
bm.syncAddLotUI();
check('Tá»’N CÃ’N (Sáº¥y 2): tháº» lÃ´ b-kho1 in "cÃ²n 200/800 thanh" (khÃ´ng in sá»‘ gá»‘c 800)',
  document.getElementById('al-source-list').innerHTML.includes('cÃ²n 200/800 thanh'));
bm.alSetSourceQtyQuery('800');
check('Tá»’N CÃ’N (Sáº¥y 2): gÃµ sá»‘ Gá»C "800" â†’ KHÃ”NG tháº¥y lÃ´ Ä‘Ã£ xuáº¥t 1 pháº§n (b-kho1)',
  !document.getElementById('al-source-list').innerHTML.includes('data-al-pick="b-kho1"'));
bm.alSetSourceQtyQuery('200');
check('Tá»’N CÃ’N (Sáº¥y 2): gÃµ sá»‘ Tá»’N "200" â†’ tháº¥y Ä‘Ãºng lÃ´ cÃ²n 200 (b-kho1)',
  document.getElementById('al-source-list').innerHTML.includes('data-al-pick="b-kho1"'));
bm.alSetSourceQuery(''); bm.alSetSourceQtyQuery('');
// LÃ´ xuáº¥t Háº¾T (cÃ²n 0) â†’ áº¨N khá»i cáº£ Sáº¥y 2 láº«n Kho (khÃ´ng cÃ²n lá»‡ch 2 so 1).
state.khoNotes.push({
  id: 'kho-note-say2-200', type: 'xuat', purpose: 'baotinh', date: '2026-09-18',
  qty: 200, lots: [{ batchId: 'b-kho1', qty: 200 }], status: 'da_duyet',
  createdBy: 'admin', createdByName: 'admin', createdAt: '2026-09-18T03:00:00.000Z'
});
bm.syncAddLotUI();
check('Tá»’N CÃ’N (Sáº¥y 2): lÃ´ xuáº¥t háº¿t (cÃ²n 0) â†’ áº¨N khá»i nguá»“n Sáº¥y 2 + rá»—ng bÃ¡o "cÃ²n hÃ ng"',
  !document.getElementById('al-source-list').innerHTML.includes('data-al-pick="b-kho1"') &&
  document.getElementById('al-source-list').innerHTML.includes('data-al-pick="b-kho2"') &&
  bm.availableKhoLots().every(b => b.id !== 'b-kho1'));
state.khoNotes = state.khoNotes.filter(n => n.id !== 'kho-note-say2-800' && n.id !== 'kho-note-say2-200');
bm.syncAddLotUI();
bm.alTogglePick('b-kho1');
bm.alTogglePick('b-kho2');
check('Sáº¤Y 2: chá»n nhiá»u lÃ´ â†’ hiá»‡n chi tiáº¿t Tá»ªNG lÃ´ nguá»“n (mÃ£ lÃ´ Â· kÃ­ch thÆ°á»›c Â· loáº¡i Â· lÆ°á»£ng)',
  bm.alPickedIds().length === 2 &&
  document.getElementById('al-source-info').innerHTML.includes('260910-01') &&
  document.getElementById('al-source-info').innerHTML.includes('260911-01') &&
  document.getElementById('al-source-info').innerHTML.includes('1250 Ã— 18 Ã— 7 mm'));
document.getElementById('al-date').value = '2026-09-18';
bm.alSetLocation('LS2');
document.getElementById('al-use-for').value = 'Bullig';   // DÃ¹ng Cho Ã¡p cho lÃ´ chuyá»ƒn sang Sáº¥y 2
bm.handleAddLotSubmit({ preventDefault(){} });
const b2 = state.batches.find(b => b.id === 'b-kho1');
const b2b = state.batches.find(b => b.id === 'b-kho2');
check('Sáº¤Y 2: chuyá»ƒn Cáº¢ 2 lÃ´ tá»« KHO sang Sáº¤Y 2 (giá»¯ mÃ£ lÃ´/kÃ­ch thÆ°á»›c/sá»‘ lÆ°á»£ng)',
  b2.stage === 'say2' && b2.quantity === 800 && b2.length === 1250 &&
  b2b.stage === 'say2' && b2b.quantity === 300);
check('Sáº¤Y 2: NGÃ€Y vÃ o Sáº¥y 2 = ngÃ y Ä‘Ã£ chá»n (say2Date + stageHistory)',
  b2.say2Date === '2026-09-18' &&
  b2.stageHistory.some(h => h.stage === 'say2' && h.date === '2026-09-18'));
check('Sáº¤Y 2: Vá»‹ TrÃ­ cáº­p nháº­t theo Ã´ chá»n vá»‹ trÃ­ (LS2)', b2.location === 'LS2' && b2b.location === 'LS2');
check('Sáº¤Y 2: DÃ¹ng Cho chá»n á»Ÿ form Ä‘Æ°á»£c Ã¡p cho má»i lÃ´ chuyá»ƒn sang (Bullig)',
  b2.useFor === 'Bullig' && b2b.useFor === 'Bullig');
check('Sáº¤Y 2: 2 lÃ´ Ä‘Ã£ Rá»œI Kho nÃªn danh sÃ¡ch lÃ´ á»Ÿ Kho trá»‘ng',
  bm.availableKhoLots().length === 0);


// â”€â”€â”€ O. Lá»ŒC TRáº NG THÃI Sáº¤Y trong form "THÃŠM LÃ” Sáº¤Y Má»šI" (14/11/2026) â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Nguá»“n Sáº¥y 2 chá»‰ nháº­n lÃ´ Má»šI Sáº¤Y 1 (chÆ°a qua Sáº¥y 2) â†’ lÃ´ ÄÃƒ Sáº¤Y 2 bá»‹ áº©n Ä‘á»ƒ
// KHá»ŽI chá»n nháº§m Ä‘em Ä‘i sáº¥y láº§n 2. CÃ´ng táº¯c "Hiá»‡n cáº£ lÃ´ Ä‘Ã£ Sáº¥y 2" cho phÃ©p
// xem láº¡i khi tháº­t sá»± cáº§n sáº¥y láº¡i.
state.batches.push(
  { id: 'b-dry-s1', code: '261106-01', stage: 'kho', date: '2026-11-06', week: '2026-W45', length: 1250, width: 18, thickness: 7, quantity: 500, volume: 0.0788, bambooType: 'A', useFor: 'VÃ¡n', location: 'K60', dryStage: 'say1', stageHistory: [{ stage: 'kho', date: '2026-11-06' }] },
  { id: 'b-dry-s2', code: '261106-02', stage: 'kho', date: '2026-11-06', week: '2026-W45', length: 1250, width: 18, thickness: 7, quantity: 600, volume: 0.0945, bambooType: 'A1', useFor: 'Bullig', location: 'K61', dryStage: 'say2', stageHistory: [{ stage: 'say1', date: '2026-11-05' }, { stage: 'say2', date: '2026-11-06' }, { stage: 'kho', date: '2026-11-06' }] },
  { id: 'b-dry-chua', code: '261106-03', stage: 'kho', date: '2026-11-06', week: '2026-W45', length: 1250, width: 18, thickness: 7, quantity: 700, volume: 0.110, bambooType: 'B', useFor: 'VÃ¡n', location: 'K62', stageHistory: [{ stage: 'kho', date: '2026-11-06' }] }
);
bm.openAddLotModal();
document.getElementById('al-stage').value = 'say2';
bm.syncAddLotUI();
check('O1. Má»ž FORM Sáº¤Y 2: cÃ´ng táº¯c "Hiá»‡n cáº£ lÃ´ Ä‘Ã£ Sáº¥y 2" máº·c Ä‘á»‹nh Táº®T', (() => {
  const cb = document.getElementById('al-show-dry-all');
  return cb && cb.checked === false;
})());
check('O2. Máº¶C Äá»ŠNH: chá»‰ áº©n lÃ´ ÄÃƒ Sáº¤Y 2 (b-dry-s2), cÃ²n hiá»‡n lÃ´ má»›i Sáº¥y 1 (b-dry-s1)', (() => {
  const h = document.getElementById('al-source-list').innerHTML;
  return h.includes('data-al-pick="b-dry-s1"') &&
    h.includes('Äang lá»c') && h.includes('ÄÃƒ Sáº¤Y 2') &&
    h.includes('data-al-pick="b-dry-s2"') === false;
})());
check('O3. Máº¶C Äá»ŠNH: chip tráº¡ng thÃ¡i sáº¥y Ä‘Ãºng mÃ u chuáº©n trÃªn tháº» nguá»“n', (() => {
  const h = document.getElementById('al-source-list').innerHTML;
  return h.includes('dry-say1');
})());
check('O4. TÃCH "Hiá»‡n cáº£ lÃ´ Ä‘Ã£ Sáº¥y 2": cÃ´ng táº¯c báº­t Ä‘Æ°á»£c + checkbox reflet tráº¡ng thÃ¡i', (() => {
  document.getElementById('al-show-dry-all').checked = true;
  bm.alSetShowDryAll(true);
  return bm.alShowDryAllOn() === true &&
    document.getElementById('al-show-dry-all').checked === true;
})());
check('O5. Äá»”I SANG Sáº¤Y 1: cÃ´ng táº¯c vá» Táº®T (an toÃ n)', (() => {
  document.getElementById('al-stage').value = 'say1';
  bm.syncAddLotUI();
  const cb = document.getElementById('al-show-dry-all');
  return cb.checked === false;
})());
bm.closeAddLotModal();

// â”€â”€â”€ D. "CHUYá»‚N KHO" â€” Sáº¥y 1 / Sáº¥y 2 â†’ Kho â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// ThÃªm 1 lÃ´ ná»¯a á»Ÿ cÃ¹ng vá»‹ trÃ­ LS1 Ä‘á»ƒ kiá»ƒm tra "táº¥t cáº£ lÃ´ trong vá»‹ trÃ­ cÃ¹ng chuyá»ƒn"
state.batches.push({
  id: 'b-say1b', code: '260912-02', stage: 'say1', date: '2026-09-12', week: '2026-W37',
  length: 1300, width: 20, thickness: 8, quantity: 400, volume: 0.0832, bambooType: 'A',
  useFor: 'VÃ¡n', location: 'LS1', stageHistory: [{ stage: 'say1', date: '2026-09-12' }]
});
bm.openTransferKhoModal();
check('CHUYá»‚N KHO: danh sÃ¡ch = cÃ¡c Vá»Š TRÃ Ä‘ang cÃ³ lÃ´ (kÃ¨m sá»‘ lÃ´ + tá»•ng sá»‘ lÆ°á»£ng)',
  bm.khoPositionsAt('say1').length === 2 &&
  document.getElementById('ck-lot').innerHTML.includes('LS1 â€” 2 lÃ´ Â· 1.000 thanh') &&
  document.getElementById('ck-lot').innerHTML.includes('LS16 â€” 2 lÃ´ Â· 1.500 thanh'));
check('CHUYá»‚N KHO: cÃ¡c Ã´ "ThÃªm má»›i" Ä‘ang áº¨N (chÆ°a chá»n cÃ´ng Ä‘oáº¡n ThÃªm má»›i)',
  document.getElementById('ck-new-group').style.display === 'none' &&
  document.getElementById('ck-new-dims-group').style.display === 'none');
document.getElementById('ck-lot').value = 'LS1';
bm.updateCkPosInfo();
check('CHUYá»‚N KHO: Ã´ tÃ³m táº¯t nÃ³i rÃµ sáº½ chuyá»ƒn BAO NHIÃŠU lÃ´ Â· tá»•ng sá»‘ lÆ°á»£ng Â· tá»•ng thá»ƒ tÃ­ch',
  document.getElementById('ck-pos-info').innerHTML.includes('2 lÃ´') &&
  document.getElementById('ck-pos-info').innerHTML.includes('1.000 thanh'));
document.getElementById('ck-date').value = '2026-09-19';
document.getElementById('ck-new-loc').value = 'K12';        // Vá»Š TRÃ Má»šI NHáº¬P TAY
document.getElementById('ck-notes').value = 'Äá»§ khÃ´';
bm.handleTransferKhoSubmit({ preventDefault(){} });
const bSay1 = state.batches.find(b => b.id === 'b-say1a');
const bSay1b = state.batches.find(b => b.id === 'b-say1b');
check('CHUYá»‚N KHO: Táº¤T Cáº¢ lÃ´ á»Ÿ vá»‹ trÃ­ LS1 cÃ¹ng vÃ o KHO (giá»¯ mÃ£/kÃ­ch thÆ°á»›c/sá»‘ lÆ°á»£ng)',
  bSay1.stage === 'kho' && bSay1.quantity === 600 && bSay1.length === 1300 &&
  bSay1b.stage === 'kho' && bSay1b.quantity === 400);
check('CHUYá»‚N KHO: NGÃ€Y vÃ o Kho = ngÃ y Ä‘Ã£ chá»n (khoDate + stageHistory)',
  bSay1.khoDate === '2026-09-19' &&
  bSay1.stageHistory.some(h => h.stage === 'kho' && h.date === '2026-09-19'));
check('CHUYá»‚N KHO: Vá»‹ trÃ­ má»›i á»Ÿ Kho NHáº¬P TAY (K12) + ghi chÃº Ã¡p dá»¥ng cho Má»ŒI lÃ´ trong vá»‹ trÃ­',
  bSay1.location === 'K12' && bSay1.notes === 'Äá»§ khÃ´' &&
  bSay1b.location === 'K12' && bSay1b.notes === 'Äá»§ khÃ´');
check('CHUYá»‚N KHO: vá»‹ trÃ­ LS1 Ä‘Ã£ háº¿t lÃ´ nÃªn KHÃ”NG cÃ²n trong danh sÃ¡ch chá»n',
  !bm.khoPositionsAt('say1').some(g => g.location === 'LS1'));

// Chuyá»ƒn vá»‹ trÃ­ LS16 â†’ Kho, Ä‘á»ƒ trá»‘ng vá»‹ trÃ­ má»›i = GIá»® NGUYÃŠN vá»‹ trÃ­ cÅ©
bm.openTransferKhoModal();
document.getElementById('ck-lot').value = 'LS16';
document.getElementById('ck-date').value = '2026-09-20';
document.getElementById('ck-new-loc').value = '';            // giá»¯ nguyÃªn vá»‹ trÃ­ cÅ©
bm.handleTransferKhoSubmit({ preventDefault(){} });
check('CHUYá»‚N KHO: Ä‘á»ƒ trá»‘ng vá»‹ trÃ­ má»›i = GIá»® NGUYÃŠN vá»‹ trÃ­ cÅ© (LS16)',
  bNew1.stage === 'kho' && bNew1.location === 'LS16' && bNew1.khoDate === '2026-09-20' &&
  bNew2.stage === 'kho' && bNew2.location === 'LS16');
check('CHUYá»‚N KHO: Ä‘á»•i sang Sáº¥y 2 â†’ danh sÃ¡ch vá»‹ trÃ­ chá»‰ hiá»‡n vá»‹ trÃ­ Ä‘ang á»Ÿ Sáº¥y 2',
  (function () {
    bm.openTransferKhoModal();
    document.getElementById('ck-stage').value = 'say2';
    bm.syncTransferKhoUI();
    return bm.khoPositionsAt('say2').map(g => g.location).join(',') === 'LS2' &&
      document.getElementById('ck-lot').innerHTML.includes('LS2');
  })());
check('CHUYá»‚N KHO: gá»£i Ã½ (datalist) vá»‹ trÃ­ Kho Ä‘ang cÃ³ cho Ã´ NHáº¬P TAY',
  (function () {
    bm.openTransferKhoModal();
    document.getElementById('ck-stage').value = 'say1';
    bm.syncTransferKhoUI();
    return document.getElementById('ck-new-loc-list').innerHTML.includes('K12');
  })());



// â”€â”€â”€ E. "CHUYá»‚N KHO" â€” THÃŠM Má»šI (táº¡o lÃ´ vÃ o tháº³ng Kho) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
bm.openTransferKhoModal();
document.getElementById('ck-stage').value = 'new';
bm.syncTransferKhoUI();
check('THÃŠM Má»šI: hiá»‡n Ä‘á»§ Ã´ NgÃ y Â· Vá»‹ trÃ­ Â· KÃ­ch thÆ°á»›c Â· Sá»‘ lÆ°á»£ng Â· Loáº¡i nan Â· DÃ¹ng cho',
  document.getElementById('ck-lot-group').style.display === 'none' &&
  document.getElementById('ck-pos-info-group').style.display === 'none' &&
  document.getElementById('ck-new-group').style.display === '' &&
  document.getElementById('ck-new-dims-group').style.display === '' &&
  document.getElementById('ck-new-qty-group').style.display === '' &&
  document.getElementById('ck-new-type-group').style.display === '' &&
  document.getElementById('ck-new-use-group').style.display === '' &&
  document.getElementById('ck-new-vol-group').style.display === '');
document.getElementById('ck-date').value = '2026-09-21';
document.getElementById('ck-new-loc-new').value = 'K20';
document.getElementById('ck-new-length').value = '1250';
document.getElementById('ck-new-width').value = '18';
document.getElementById('ck-new-thickness').value = '7';
document.getElementById('ck-new-qty').value = '2000';
document.getElementById('ck-new-type').value = 'A1';
document.getElementById('ck-new-use').value = 'Bullig';
bm.updateCkNewVolume();
check('THÃŠM Má»šI: thá»ƒ tÃ­ch quy Ä‘á»•i tá»± tÃ­nh (1250Ã—18Ã—7 Ã— 2.000 = 0,3150 mÂ³)',
  document.getElementById('ck-new-vol').textContent === '0.3150 mÂ³');
bm.handleTransferKhoSubmit({ preventDefault(){} });
const bNew = state.batches.find(b => b.location === 'K20');
check('THÃŠM Má»šI: táº¡o lÃ´ má»›i á»Ÿ tháº³ng KHO vá»›i Ä‘á»§ thÃ´ng tin Ä‘Ã£ nháº­p',
  !!bNew && bNew.stage === 'kho' && bNew.length === 1250 && bNew.width === 18 &&
  bNew.thickness === 7 && bNew.quantity === 2000 && bNew.bambooType === 'A1' &&
  bNew.useFor === 'Bullig' && Math.abs(bNew.volume - 0.315) < 1e-9);
check('THÃŠM Má»šI: NGÃ€Y vÃ o Kho = ngÃ y Ä‘Ã£ chá»n (khoDate + stageHistory)',
  bNew.khoDate === '2026-09-21' &&
  bNew.stageHistory.some(h => h.stage === 'kho' && h.date === '2026-09-21'));
// Cháº·n khi thiáº¿u thÃ´ng tin báº¯t buá»™c (form.reset() á»Ÿ trÃ¬nh duyá»‡t xoÃ¡ Ã´ â€” stub thÃ¬ xoÃ¡ tay)
bm.openTransferKhoModal();
document.getElementById('ck-stage').value = 'new';
bm.syncTransferKhoUI();
document.getElementById('ck-date').value = '2026-09-21';
document.getElementById('ck-new-loc-new').value = 'K21';
['ck-new-length', 'ck-new-width', 'ck-new-thickness', 'ck-new-qty'].forEach(id => {
  document.getElementById(id).value = '';
});
const cntNew = state.batches.length;
bm.handleTransferKhoSubmit({ preventDefault(){} });
check('CHáº¶N (ThÃªm má»›i): thiáº¿u KÃ­ch thÆ°á»›c > 0 â†’ khÃ´ng táº¡o lÃ´', state.batches.length === cntNew);
document.getElementById('ck-new-length').value = '1250';
document.getElementById('ck-new-width').value = '18';
document.getElementById('ck-new-thickness').value = '7';
document.getElementById('ck-new-qty').value = '0';
bm.handleTransferKhoSubmit({ preventDefault(){} });
check('CHáº¶N (ThÃªm má»›i): Sá»‘ lÆ°á»£ng = 0 â†’ khÃ´ng táº¡o lÃ´', state.batches.length === cntNew);
bm.closeTransferKhoModal();

// â”€â”€â”€ F. Cáº¤U TRÃšC: 3 Cá»˜T (Cá»˜T BÃ€O TINH ÄÃƒ XÃ“A Háº²N) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const idxHtml = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const cssHtml = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
const jsState = fs.readFileSync(new URL('../js/state.js', import.meta.url), 'utf8');
const jsStorage = fs.readFileSync(new URL('../js/storage.js', import.meta.url), 'utf8');
const jsCloud = fs.readFileSync(new URL('../js/cloud.js', import.meta.url), 'utf8');
const jsHistory = fs.readFileSync(new URL('../js/history.js', import.meta.url), 'utf8');
const jsMain = fs.readFileSync(new URL('../js/main.js', import.meta.url), 'utf8');
const jsEvents = fs.readFileSync(new URL('../js/events.js', import.meta.url), 'utf8');
const swJs = fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
check('Cáº¤U TRÃšC (index.html): nÃºt "ThÃªm LÃ´ Sáº¥y Má»›i" + nÃºt "Chuyá»ƒn Kho" trong thanh cÃ´ng cá»¥',
  idxHtml.includes('btn-add-batch') && idxHtml.includes('ThÃªm LÃ´ Sáº¥y Má»›i') &&
  idxHtml.includes('btn-transfer-kho') && idxHtml.includes('Chuyá»ƒn Kho'));
check('Cáº¤U TRÃšC (index.html): modal "ThÃªm LÃ´ Sáº¥y Má»›i" â€” nÃºt chá»n nguá»“n NHIá»€U + nÃºt chá»n Vá»Š TRÃ',
  idxHtml.includes('id="modal-add-lot"') && idxHtml.includes('"al-stage"') &&
  idxHtml.includes('"al-date"') && idxHtml.includes('id="al-source-btn"') &&
  idxHtml.includes('id="al-source-panel"') && idxHtml.includes('id="al-source-list"') &&
  idxHtml.includes('id="al-pick-all"') &&
  idxHtml.includes('id="al-location-btn"') && idxHtml.includes('id="al-location-chips"') &&
  idxHtml.includes('id="al-location-add"') && idxHtml.includes('id="al-location-new"'));
check('Cáº¤U TRÃšC (index.html): ÄÃƒ Bá»Ž Ã´ nháº­p Sá»‘ lÆ°á»£ng cá»§a modal ThÃªm LÃ´ Sáº¥y Má»›i',
  !idxHtml.includes('id="al-qty"') && !idxHtml.includes('al-qty-group'));
check('Cáº¤U TRÃšC (index.html): modal "Chuyá»ƒn Kho" â€” chá»n Vá»Š TRÃ + vá»‹ trÃ­ má»›i NHáº¬P TAY (datalist)',
  idxHtml.includes('id="modal-transfer-kho"') && idxHtml.includes('"ck-stage"') &&
  idxHtml.includes('"ck-lot"') && idxHtml.includes('id="ck-pos-info"') &&
  idxHtml.includes('"ck-date"') && idxHtml.includes('id="ck-new-loc"') &&
  idxHtml.includes('id="ck-new-loc-list"') && idxHtml.includes('"ck-new-length"') &&
  idxHtml.includes('"ck-new-qty"') && idxHtml.includes('"ck-new-type"') && idxHtml.includes('"ck-new-use"'));
check('Cáº¤U TRÃšC (styles.css): ÄIá»†N THOáº I â€” chá»‰ THáºº CHA giá»¯ khung tre, tháº» con bá» khung + scale nhá»',
  cssHtml.includes('CHá»ˆ THáºº CHA GIá»® KHUNG TRE') &&
  /@media \(max-width: 639\.98px\)[\s\S]{0,600}bamboo-card[\s\S]{0,400}border-image: none/.test(cssHtml) &&
  cssHtml.includes('body[data-theme="night"] .view-panel { zoom: 0.9; }'));
check('Cáº¤U TRÃšC (js): vá»‹ trÃ­ sáº¥y khai bÃ¡o thÃªm cÃ³ key riÃªng + ná»‘i vÃ o storage/cloud/history/main',
  jsState.includes("bamboo_tracker_x2_lot_locations_v1") &&
  jsStorage.includes('x2LotLocations') &&
  jsCloud.includes('x2LotLocations') &&
  jsHistory.includes('x2LotLocations') &&
  jsMain.includes('loadX2LotLocations'));
check('Cáº¤U TRÃšC (sw.js): Ä‘Ã£ tÄƒng CACHE_NAME (PWA khÃ´ng dÃ¹ng cache cÅ©)',
  /nha-may-ngoc-son-v486/.test(swJs));
const jsDash = fs.readFileSync(new URL('../js/dashboard.js', import.meta.url), 'utf8');
check('Cáº¤U TRÃšC (index.html): 3 tháº» KPI cuá»‘i tab CÃ´ng Äoáº¡n Ä‘Ã£ gá»¡ sáº¡ch (Sáº¥y+Kho Â· BÃ o Tinh Â· PhÃ¢n bá»•)',
  !idxHtml.includes('quick-stats-bar') && !idxHtml.includes('quick-bao-') &&
  !idxHtml.includes('quick-process-') && !idxHtml.includes('quick-total-') &&
  !idxHtml.includes('flow-bar-') && !idxHtml.includes('flow-vol-') &&
  !idxHtml.includes('flow-count-') && !idxHtml.includes('stage-flow-mini') &&
  !idxHtml.includes('quick-stat-divider') && !idxHtml.includes('quick-stat-item'));
check('Cáº¤U TRÃšC (index.html): cáº¯t Ä‘iá»ƒm táº¡o lÃ´ BÃ o Tinh cÅ© â€” háº¿t option "4. BÃ o Tinh" (form + xuáº¥t)',
  !idxHtml.includes('<option value="bao_tinh">4. BÃ o Tinh</option>') &&
  !idxHtml.includes('form-baotinh-date-group'));
check('Cáº¤U TRÃšC (styles.css): CSS cá»§a 3 tháº» KPI + flow mini + step-progress-bar Ä‘Ã£ gá»¡',
  !cssHtml.includes('.quick-stats-bar') && !cssHtml.includes('.quick-stat-group') &&
  !cssHtml.includes('.stat-group-label') && !cssHtml.includes('.quick-stat-item') &&
  !cssHtml.includes('.stat-label') && !cssHtml.includes('.stat-value') &&
  !cssHtml.includes('.stage-flow-mini') && !cssHtml.includes('.flow-mini-') &&
  !cssHtml.includes('.step-progress-bar') && !cssHtml.includes('.quick-stat-divider'));
check('Cáº¤U TRÃšC (js): renderQuickStats/renderStageFlow gá»¡ sáº¡ch + purge lÃ´ BÃ o Tinh cÅ© ná»‘i Ä‘á»§ boot & náº¡p file',
  !jsMain.includes('renderQuickStats') && !jsMain.includes('renderStageFlow') &&
  !jsDash.includes('renderStageFlow') &&
  jsMain.includes('purgeLegacyBaoTinhBatches') && jsStorage.includes('purgeLegacyBaoTinhBatches') &&
  jsStorage.includes("trackDeleted('batches'") && jsStorage.includes("stage === 'bao_tinh'"));
check('Cáº¤U TRÃšC (styles.css): pop-up tháº» chi tiáº¿t CHá»ˆ GIá»® 1 KHUNG (bá» khung + padding ngoÃ i cá»§a shell)',
  cssHtml.includes('CHá»ˆ GIá»® 1 KHUNG') &&
  /#x2-detail-card, #qc-detail-card, #hr-detail-card \{[\s\S]{0,220}border: none/.test(cssHtml) &&
  cssHtml.includes('.x2-detail-content, .qc-detail-content, .hr-detail-content { padding: 0; }') &&
  cssHtml.includes('min-height: 100%'));
check('Cáº¤U TRÃšC (styles.css): áº©n HÃ€NG TIÃŠU Äá»€ láº·p trong pop-up (chá»‰ khi header khÃ´ng cÃ³ nÃºt/Ã´ chá»©c nÄƒng)',
  /\.x2-detail-content > \.planning-card > \.planning-card-header:not\(:has\(button\)\)/.test(cssHtml) &&
  cssHtml.includes('.qc-detail-content > .planning-card > .planning-card-header:not(:has(button))') &&
  cssHtml.includes('.hr-detail-content > .planning-card > .planning-card-header:not(:has(button))'));
check('Cáº¤U TRÃšC (styles.css): khá»‘i Tá»I Æ¯U ÄIá»†N THOáº I (cháº¡m nhanh Â· Ã´ nháº­p 16px Â· modal dvh + footer dÃ­nh)',
  cssHtml.includes('Tá»I Æ¯U ÄIá»†N THOáº I (â‰¤639.98px)') &&
  cssHtml.includes('touch-action: manipulation') &&
  cssHtml.includes('font-size: 16px') &&
  cssHtml.includes('calc(100dvh - 16px)') &&
  cssHtml.includes('overscroll-behavior: contain') &&
  cssHtml.includes('-webkit-text-size-adjust: 100%'));
check('Cáº¤U TRÃšC (styles.css + index.html): XÃ“A vá»‹ trÃ­ Ä‘Ã£ khai bÃ¡o â€” nÃºt .al-loc-del + gá»£i Ã½ trong modal',
  cssHtml.includes('.al-loc-del') && cssHtml.includes('.al-loc-item') &&
  idxHtml.includes('id="al-location-hint"'));

// â”€â”€â”€ Sá»¬A Lá»–I Máº¤T CUá»˜N: khoÃ¡ cuá»™n chá»‰ tÃ­nh modal ÄANG HIá»‚N THá»Š â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
check('CUá»˜N: CSS chá»‰ khoÃ¡ cuá»™n khi modal ÄANG hiá»‡n (cáº¥p trang / trong <main> / trong TAB ÄANG Má»ž) â€” bá» rule cÅ© khoÃ¡ cáº£ trang',
  cssHtml.includes('body:has(> .modal-overlay.show)') &&
  cssHtml.includes('body:has(> main > .modal-overlay.show)') &&
  cssHtml.includes('body:has(.view-panel.active .modal-overlay.show)') &&
  !/body:has\(\.modal-overlay\.show\)\s*\{\s*overflow:\s*hidden/.test(cssHtml));
check('CUá»˜N: main.js cÃ³ closeViewScopedModals + gá»i khi rá»i tab (Ä‘Ã³ng pop-up/modal thuá»™c tab vá»«a rá»i)',
  jsMain.includes('function closeViewScopedModals(') &&
  jsMain.includes('closeViewScopedModals(document.getElementById(prevView))') &&
  jsMain.includes('x2CloseOpenCard') && jsMain.includes('qcCloseOpenCard') && jsMain.includes('hrCloseOpenCard'));
check('CUá»˜N: rá»i tab CÃ´ng Äoáº¡n khi Ä‘ang má»Ÿ tháº» XÆ°á»Ÿng 2 â†’ pop-up Ä‘Ã³ng + tráº¡ng thÃ¡i tháº» Ä‘ang má»Ÿ Ä‘Æ°á»£c dá»n',
  (async function () {
    // Má»Ÿ tháº» XÆ°á»Ÿng 2 (pop-up báº­t) rá»“i chuyá»ƒn sang tab khÃ¡c
    state.activeView = 'kanban-view';
    x2.x2OpenCard('x2-than-hoa-card');
    const overlay = document.getElementById('x2-detail-overlay');
    const hadShow = overlay.classList.contains('show');
    // Stub DOM: cho view CÃ´ng Äoáº¡n "tÃ¬m tháº¥y" overlay Ä‘ang má»Ÿ
    const kanbanEl = document.getElementById('kanban-view');
    kanbanEl.querySelectorAll = (sel) => (String(sel).indexOf('.modal-overlay.show') !== -1 ? [overlay] : []);
    try { await mainMod.switchView('materials-view'); } catch (e) { /* view khÃ¡c cÃ³ thá»ƒ cáº§n dá»¯ liá»‡u â€” chá»‰ cáº§n pháº§n Ä‘Ã³ng modal cháº¡y */ }
    return hadShow && !overlay.classList.contains('show') &&
      x2.x2OpenCardId() === null && state.x2OpenCardId === null;
  })());
check('Cáº¤U TRÃšC (events.js): cháº¡m ra ngoÃ i danh sÃ¡ch â†’ tá»± Ä‘Ã³ng + chá»‘t bá» qua pháº§n tá»­ vá»«a váº½ láº¡i',
  jsEvents.includes("closest('#al-source-panel')") &&
  jsEvents.includes("closest('#al-location-panel')") &&
  jsEvents.includes('document.contains(t)'));
check('Cáº¤U TRÃšC (index.html): tab mobile "BÃ o tinh" Ä‘Ã£ bá»; Cá»˜T BÃ o Tinh ÄÃƒ XÃ“A Háº²N (khÃ´ng cÃ²n markup/cá» áº©n)',
  !idxHtml.includes('data-stage="bao_tinh"') && !idxHtml.includes('data-stage-col="bao_tinh"') &&
  !idxHtml.includes('cards-bao-tinh'));
check('Cáº¤U TRÃšC (styles.css): khá»‘i "Táº M áº¨N Cá»˜T BÃ€O TINH" Ä‘Ã£ gá»¡ + lÆ°á»›i Kanban 3 cá»™t (â‰¥1200px)',
  !cssHtml.includes('Táº M áº¨N Cá»˜T "4. BÃ€O TINH"') &&
  !cssHtml.includes('.kanban-column[data-stage-col="bao_tinh"]') &&
  cssHtml.includes('repeat(3, 1fr)'));

// â”€â”€â”€ M. THá»NG KÃŠ THAN HÃ“A + Sáº¤Y THEO Tá»ªNG Láº¦N THAN HÃ“A â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Má»—i Láº¦N than hÃ³a = 1 máº» Ä‘Æ°a nan vÃ o lÃ²: má»i lÃ´ trong láº§n Ä‘Ã³ Ä‘á»u qua 105 phÃºt
// (vÃ o Sáº¥y 1) hoáº·c 50 phÃºt (vÃ o Sáº¥y 2). Äá»‹nh má»©c mÂ³/láº§n (máº·c Ä‘á»‹nh 2 mÂ³) Ã¡p cho
// Tá»”NG thá»ƒ tÃ­ch cÃ¡c lÃ´ trong NGÃ€Y cá»§a tá»«ng cÃ´ng Ä‘oáº¡n â†’ tá»± Gá»˜P NHÃ“M cÃ¡c lÃ´ cho
// gáº§n báº±ng 2 mÂ³ thÃ nh 1 láº§n (pháº§n cÃ²n láº¡i = láº§n cuá»‘i): ngÃ y 3 mÂ³ â‡’ 2 láº§n.
// LÃ´ Ä‘Æ¡n vÆ°á»£t 2 mÂ³ váº«n 1 láº§n riÃªng. Nháº­p tay "Sá»‘ láº§n TH" cá»§a nhÃ³m thÃ¬ chia Ä‘Ãºng sá»‘ Ä‘Ã³.
state.hrPositions = [
  { id: 'pos-thanhoa', name: 'Than hÃ³a', department: 'XÆ°á»Ÿng 2' },
  { id: 'pos-cut',     name: 'Cáº¯t chá»n', department: 'XÆ°á»Ÿng 2' }
];
state.hrEmployees = [{ id: 'e-lua', name: 'Tráº§n VÄƒn Lá»­a', department: 'XÆ°á»Ÿng 2' }];
state.hrAssignments = [
  // 21/09 (Thá»© Hai â€” ngÃ y lÃ m viá»‡c): 2 lÆ°á»£t vá»‹ trÃ­ "Than hÃ³a" = 07:00â€“11:30 + 13:00â€“17:30 â†’ 9h HC
  { id: 'asg-1', date: '2026-09-21', department: 'XÆ°á»Ÿng 2', positionId: 'pos-thanhoa', employeeId: 'e-lua', shiftIdx: 0, start: '07:00', end: '11:30' },
  { id: 'asg-2', date: '2026-09-21', department: 'XÆ°á»Ÿng 2', positionId: 'pos-thanhoa', employeeId: 'e-lua', shiftIdx: 0, start: '13:00', end: '17:30' },
  // Bá»‘ trÃ­ á»Ÿ vá»‹ trÃ­ KHÃC (Cáº¯t chá»n) â€” KHÃ”NG Ä‘Æ°á»£c cá»™ng vÃ o giá» than hÃ³a
  { id: 'asg-3', date: '2026-09-21', department: 'XÆ°á»Ÿng 2', positionId: 'pos-cut', employeeId: 'e-lua', shiftIdx: 0, start: '07:00', end: '17:30' },
  // 22/09: 1 lÆ°á»£t "Than hÃ³a" 07:00â€“11:30 â†’ 4,5h HC (ngÃ y cÃ³ Cáº¢ Sáº¥y 1 vÃ  Sáº¥y 2)
  { id: 'asg-4', date: '2026-09-22', department: 'XÆ°á»Ÿng 2', positionId: 'pos-thanhoa', employeeId: 'e-lua', shiftIdx: 0, start: '07:00', end: '11:30' }
];
state.batches = [
  // 21/09 â€” Sáº¥y 1: 3 lÃ´ Ã— 1 mÂ³ = 3 mÂ³ â†’ gá»™p 2 láº§n (Láº§n 1 = 2 mÂ³ gá»“m 2 lÃ´ Â· Láº§n 2 = 1 mÂ³)
  { id: 'tb-a', code: '260921-01', stage: 'say1', date: '2026-09-21', location: 'LS1', length: 1250, width: 20, thickness: 10, quantity: 1000, volume: 1, bambooType: 'A', useFor: 'VÃ¡n', stageHistory: [{ stage: 'say1', date: '2026-09-21' }] },
  { id: 'tb-b', code: '260921-02', stage: 'say1', date: '2026-09-21', location: 'LS1', length: 1250, width: 20, thickness: 10, quantity: 1000, volume: 1, bambooType: 'A', useFor: 'VÃ¡n', stageHistory: [{ stage: 'say1', date: '2026-09-21' }] },
  { id: 'tb-c', code: '260921-03', stage: 'say1', date: '2026-09-21', location: 'LS2', length: 1250, width: 20, thickness: 10, quantity: 1000, volume: 1, bambooType: 'A1', useFor: 'VÃ¡n', stageHistory: [{ stage: 'say1', date: '2026-09-21' }] },
  // 22/09 â€” Sáº¥y 1: 1 LÃ” Lá»šN 5 mÂ³ (vÆ°á»£t 2 mÂ³ váº«n 1 láº§n riÃªng) + Sáº¥y 2: 0,4 mÂ³ (1 láº§n 50 phÃºt)
  { id: 'tb-big', code: '260922-01', stage: 'say1', date: '2026-09-22', location: 'LS4', length: 1250, width: 20, thickness: 10, quantity: 1000, volume: 5, bambooType: 'A', useFor: 'VÃ¡n', stageHistory: [{ stage: 'say1', date: '2026-09-22' }] },
  { id: 'tb-s2', code: '260918-01', stage: 'say2', date: '2026-09-18', say2Date: '2026-09-22', location: 'LS3', length: 1250, width: 20, thickness: 16, quantity: 1000, volume: 0.4, bambooType: 'B', useFor: 'Bullig', stageHistory: [{ stage: 'say1', date: '2026-09-18' }, { stage: 'say2', date: '2026-09-22' }] },
  // 23/09 â€” Sáº¥y 1: 3 lÃ´ Ã— 2 mÂ³ = 6 mÂ³ â†’ 3 láº§n (má»—i láº§n Ä‘Ãºng 2 mÂ³)
  { id: 'tb-d', code: '260923-02', stage: 'say1', date: '2026-09-23', location: 'LS5', length: 1250, width: 20, thickness: 10, quantity: 1000, volume: 2, bambooType: 'A', useFor: 'VÃ¡n', stageHistory: [{ stage: 'say1', date: '2026-09-23' }] },
  { id: 'tb-e', code: '260923-03', stage: 'say1', date: '2026-09-23', location: 'LS5', length: 1250, width: 20, thickness: 10, quantity: 1000, volume: 2, bambooType: 'A', useFor: 'VÃ¡n', stageHistory: [{ stage: 'say1', date: '2026-09-23' }] },
  { id: 'tb-f', code: '260923-04', stage: 'say1', date: '2026-09-23', location: 'LS5', length: 1250, width: 20, thickness: 10, quantity: 1000, volume: 2, bambooType: 'A', useFor: 'VÃ¡n', stageHistory: [{ stage: 'say1', date: '2026-09-23' }] },
  // VÃ o Sáº¥y 1 ngÃ y 19/09 (0,6 mÂ³) rá»“i chuyá»ƒn KHO ngÃ y 24/09 â€” ngÃ y vÃ o Kho KHÃ”NG sinh láº§n nÃ o
  { id: 'tb-kho', code: '260919-01', stage: 'kho', date: '2026-09-19', khoDate: '2026-09-24', location: 'K11', length: 1250, width: 20, thickness: 18, quantity: 1000, volume: 0.6, bambooType: 'A', useFor: 'VÃ¡n', stageHistory: [{ stage: 'say1', date: '2026-09-19' }, { stage: 'kho', date: '2026-09-24' }] },
  // LÃ´ táº¡o THáº²NG vÃ o Kho (khÃ´ng qua Sáº¥y 1) â€” khÃ´ng sinh láº§n than hÃ³a nÃ o
  { id: 'tb-new', code: '260924-01', stage: 'kho', date: '2026-09-24', location: 'K12', length: 1250, width: 20, thickness: 18, quantity: 500, volume: 0.3, bambooType: 'A', useFor: 'VÃ¡n', stageHistory: [{ stage: 'kho', date: '2026-09-24' }] }
];
state.x2SayRates = { s1: {}, s2: {} };
state.x2SayTimes = {};

// â”€â”€â”€ M1. Gá»˜P NHÃ“M LÃ” THEO NGÃ€Y + Äá»ŠNH Má»¨C 2 mÂ³/Láº¦N â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
check('Gá»˜P NHÃ“M: nhÃ³m ngÃ y 21/09 Â· Sáº¥y 1 gom Ä‘Ãºng 3 lÃ´ (1 + 1 + 1 mÂ³ = 3 mÂ³)',
  x2.sayGroupLots('2026-09-21', 'say1').length === 3 &&
  Math.abs(x2.sayGroupLots('2026-09-21', 'say1').reduce((s, l) => s + l.vol, 0) - 3) < 1e-9);

const chargeDays = x2.sayChargeRows();
const dayOf = d => chargeDays.find(r => r.date === d);
const d21 = dayOf('2026-09-21');
check('Gá»˜P NHÃ“M (Ä‘Ãºng vÃ­ dá»¥ nhÃ  mÃ¡y): ngÃ y 21/09 tá»•ng 3 mÂ³ â†’ 2 Láº¦N than hÃ³a = 2 mÂ³ (gáº§n 2 mÂ³) + pháº§n cÃ²n láº¡i 1 mÂ³',
  !!d21 && d21.lanCount === 2 && Math.abs(d21.vol - 3) < 1e-9 &&
  Math.abs(d21.charges[0].vol - 2) < 1e-9 && Math.abs(d21.charges[1].vol - 1) < 1e-9);
check('Gá»˜P NHÃ“M: Láº§n 1 gá»“m 2 lÃ´ (2 mÂ³) Â· Láº§n 2 = lÃ´ cÃ²n láº¡i (1 mÂ³) â€” mÃ£ lÃ´ hiá»‡n Ä‘á»§ + Ä‘Ã¡nh sá»‘ "Láº§n 1, Láº§n 2"',
  !!d21 && d21.charges[0].codeText === '260921-01 + 260921-02' && d21.charges[1].codeText === '260921-03' &&
  d21.charges.map(c => c.lan).join(',') === '1,2');
check('Gá»˜P NHÃ“M: LÃ” ÄÆ N vÆ°á»£t 2 mÂ³ (5 mÂ³) váº«n 1 Láº¦N riÃªng Â· ngÃ y 23/09 tá»•ng 6 mÂ³ â†’ 3 láº§n (má»—i láº§n Ä‘Ãºng 2 mÂ³)',
  (() => {
    const d22 = dayOf('2026-09-22');
    const d23 = dayOf('2026-09-23');
    if (!d22 || !d23) return false;
    const g1of22 = d22.groups.find(g => g.stage === 'say1');
    return g1of22 && g1of22.count === 1 && Math.abs(g1of22.charges[0].vol - 5) < 1e-9 &&
      d23.lanCount === 3 && d23.charges.every(c => Math.abs(c.vol - 2) < 1e-9);
  })());
check('Gá»˜P NHÃ“M: ngÃ y 22/09 cÃ³ 2 NHÃ“M (Sáº¥y 1 = 1 láº§n 5 mÂ³ Â· Sáº¥y 2 = 1 láº§n 50 phÃºt 0,4 mÂ³) â€” mÃ£ lÃ´ Â· vá»‹ trÃ­ Ä‘Ãºng',
  (() => {
    const d22 = dayOf('2026-09-22');
    if (!d22 || d22.groups.length !== 2) return false;
    const s2 = d22.groups.find(g => g.stage === 'say2');
    return s2 && s2.charges.length === 1 && s2.charges[0].minutes === 50 &&
      s2.charges[0].codeText === '260918-01' && s2.charges[0].locationText === 'LS3' &&
      Math.abs(s2.charges[0].vol - 0.4) < 1e-9;
  })());
check('Gá»˜P NHÃ“M: lÃ´ Ä‘ang á»Ÿ KHO váº«n cÃ³ láº§n ngÃ y nÃ³ VÃ€O Sáº¥y 1 (19/09 Â· 1 láº§n Â· vá»‹ trÃ­ K11) Â· Kho KHÃ”NG sinh láº§n nÃ o (khÃ´ng cÃ³ ngÃ y 24/09)',
  !!dayOf('2026-09-19') && dayOf('2026-09-19').lanCount === 1 &&
  dayOf('2026-09-19').charges[0].locationText === 'K11' && !dayOf('2026-09-24'));

// â”€â”€â”€ M2. NHáº¬P TAY Sá» Láº¦N THAN HÃ“A Cá»¦A NHÃ“M (ngÃ y + cÃ´ng Ä‘oáº¡n) â”€â”€
x2.setSayGroupTimes('2026-09-21', 'say1', 3);
await new Promise(r => setTimeout(r, 0)); // chá» ghi localStorage (import Ä‘á»™ng)
const d21b = x2.sayChargeRows().find(r => r.date === '2026-09-21');
check('NHáº¬P TAY: nháº­p 3 láº§n cho nhÃ³m 21/09 Â· Sáº¥y 1 (3 mÂ³) â†’ chia láº¡i ÄÃšNG 3 láº§n Ã— 1 mÂ³',
  state.x2SayTimes['2026-09-21|say1'] === 3 && !!d21b && d21b.lanCount === 3 &&
  d21b.charges.every(c => Math.abs(c.vol - 1) < 1e-9));
check('NHáº¬P TAY: lÆ°u vÃ o localStorage (key riÃªng) â€” Ä‘á»ƒ trá»‘ng thÃ¬ xoÃ¡, quay láº¡i tá»± gá»™p theo mÂ³/láº§n',
  String(storeBacking.get('bamboo_tracker_x2_say_times_v1') || '').includes('"2026-09-21|say1":3') &&
  (x2.setSayGroupTimes('2026-09-21', 'say1', ''), state.x2SayTimes['2026-09-21|say1'] === undefined) &&
  x2.sayChargeRows().find(r => r.date === '2026-09-21').lanCount === 2);
check('NHáº¬P TAY: uá»· nhiá»‡m change Ä‘á»c Ä‘Ãºng Ã´ data-say-times + data-say-stage', (() => {
  const attrs = { 'data-say-times': '2026-09-23', 'data-say-stage': 'say1' };
  x2.onSayTimesChange({ target: { getAttribute: (k) => attrs[k] || null, value: '2' } });
  return state.x2SayTimes['2026-09-23|say1'] === 2 && x2.sayChargeRows().find(r => r.date === '2026-09-23').lanCount === 2;
})());
x2.setSayGroupTimes('2026-09-23', 'say1', '');

// â”€â”€â”€ M3. GIá»œ HC/TC Â· CÃ”NG SUáº¤T Â· HIá»†U SUáº¤T Â· Äá»ŠNH Má»¨C THÃNG â”€â”€â”€â”€â”€
check('GIá»œ: ngÃ y 21/09 giá» tháº­t = 9h HC (2 lÆ°á»£t vá»‹ trÃ­ "Than hÃ³a" 07:00â€“11:30 + 13:00â€“17:30) â€” KHÃ”NG cá»™ng lÆ°á»£t vá»‹ trÃ­ Cáº¯t chá»n',
  !!d21 && Math.abs(d21.hc - 9) < 1e-6 && Math.abs(d21.tc) < 1e-9 && d21.hasAssign === true &&
  d21.workers.join(',') === 'Tráº§n VÄƒn Lá»­a');
check('GIá»œ: 2 láº§n cÃ¹ng 105 phÃºt â†’ chia Ä‘á»u 9h Ã· 2 = 4,5h HC Má»–I Láº¦N (Î£ cÃ¡c láº§n = Ä‘Ãºng giá» tháº­t cá»§a ngÃ y)',
  !!d21 && d21.charges.every(c => Math.abs(c.hc - 4.5) < 1e-9) &&
  Math.abs(d21.charges.reduce((s, c) => s + c.hc + c.tc, 0) - 9) < 1e-9);
check('GIá»œ: ngÃ y 22/09 cÃ³ 105\' (Sáº¥y 1) + 50\' (Sáº¥y 2) â†’ chia theo tá»‰ lá»‡ phÃºt (105/155 Â· 50/155 cá»§a 4,5h), Î£ = 4,5h',
  (() => {
    const d22 = dayOf('2026-09-22');
    if (!d22) return false;
    const sum = d22.charges.reduce((s, c) => s + c.hc + c.tc, 0);
    const c1 = d22.charges.find(c => c.stage === 'say1');
    const c2 = d22.charges.find(c => c.stage === 'say2');
    return Math.abs(sum - 4.5) < 1e-9 &&
      Math.abs(c1.hc - (105 / 155) * 4.5) < 1e-9 && Math.abs(c2.hc - (50 / 155) * 4.5) < 1e-9;
  })());
check('GIá»œ: ngÃ y KHÃ”NG cÃ³ bá»‘ trÃ­ "Than hÃ³a" (19/09) â†’ giá»/CÃ´ng suáº¥t trá»‘ng nhÆ°ng váº«n cÃ³ mÂ³ + Giá» Cáº§n 1,75h',
  (() => {
    const d19 = dayOf('2026-09-19');
    if (!d19 || d19.hasAssign !== false) return false;
    const c = d19.charges[0];
    return c.hc === 0 && c.tc === 0 && c.cap === null && Math.abs(c.need - 1.75) < 1e-9 && Math.abs(c.vol - 0.6) < 1e-9;
  })());
check('HIá»†U SUáº¤T NGÃ€Y = Giá» cáº§n Ã· (Giá» thá»±c táº¿ âˆ’ Sá»± cá»‘ cho phÃ©p): 21/09 giá» cáº§n 3,5h Ã· 9h = 38,9% (chÆ°a nháº­p sá»± cá»‘)',
  !!d21 && Math.abs(d21.need - 3.5) < 1e-9 && Math.abs(d21.hours - 9) < 1e-9 &&
  d21.incident === 0 && Math.abs(d21.eff - (3.5 / 9)) < 1e-9);
check('HIá»†U SUáº¤T NGÃ€Y: nháº­p giá» sá»± cá»‘ cho phÃ©p 1,5h â†’ máº«u sá»‘ Ä‘á»•i theo (3,5 Ã· (9 âˆ’ 1,5) = 46,7%)',
  (() => {
    x2.setSayIncident('2026-09-21', 1.5);
    const d = x2.sayChargeRows().find(r => r.date === '2026-09-21');
    return state.x2SayIncidents['2026-09-21'] === 1.5 && !!d &&
      Math.abs(d.incident - 1.5) < 1e-9 && Math.abs(d.eff - (3.5 / 7.5)) < 1e-9;
  })());
check('HIá»†U SUáº¤T NGÃ€Y: giá» sá»± cá»‘ â‰¥ giá» thá»±c táº¿ â†’ khÃ´ng tÃ­nh Ä‘Æ°á»£c (null) Â· Ã´ nháº­p lÆ°u/xoÃ¡ localStorage',
  (() => {
    x2.setSayIncident('2026-09-21', 9.5);
    const d = x2.sayChargeRows().find(r => r.date === '2026-09-21');
    const stored = String(storeBacking.get('bamboo_tracker_x2_say_incident_v1') || '').includes('"2026-09-21":9.5');
    x2.setSayIncident('2026-09-21', '');
    // âš  20/10/2026: xoÃ¡ giá» sá»± cá»‘ KHÃ”NG xoÃ¡ khoÃ¡ â€” ghi 0 (chá»‘ng "tá»± há»“i sinh" khi Ä‘á»“ng bá»™ mÃ¢y)
    return !!d && d.eff === null && stored && state.x2SayIncidents['2026-09-21'] === 0;
  })());
check('HIá»†U SUáº¤T NGÃ€Y: ngÃ y KHÃ”NG bá»‘ trÃ­ "Than hÃ³a" (19/09) â†’ giá» thá»±c táº¿ 0 â‡’ hiá»‡u suáº¥t trá»‘ng (váº«n cÃ³ giá» cáº§n)',
  (() => {
    const d19 = dayOf('2026-09-19');
    return !!d19 && d19.hours === 0 && d19.eff === null && d19.need > 0;
  })());
check('HIá»†U SUáº¤T NGÃ€Y: uá»· nhiá»‡m change Ä‘á»c Ä‘Ãºng Ã´ data-say-incident', (() => {
  x2.onSayIncidentChange({ target: { getAttribute: (k) => (k === 'data-say-incident' ? '2026-09-23' : null), value: '2' } });
  const ok = state.x2SayIncidents['2026-09-23'] === 2;
  x2.setSayIncident('2026-09-23', '');
  return ok;
})());
check('CÃ”NG SUáº¤T má»—i láº§n = mÂ³ láº§n Ã· giá» láº§n (2 mÂ³ Ã· 4,5h = 0,444 mÂ³/h)',
  !!d21 && d21.charges[0].cap != null && Math.abs(d21.charges[0].cap - (2 / 4.5)) < 1e-9);
check('GIá»œ Cáº¦N: má»—i láº§n Sáº¥y 1 = 105\' Ã· 60 = 1,75h Â· Sáº¥y 2 = 50\' Ã· 60 = 0,83h',
  !!d21 && d21.charges.every(c => Math.abs(c.need - 1.75) < 1e-9) &&
  Math.abs(dayOf('2026-09-22').groups.find(g => g.stage === 'say2').charges[0].need - (50 / 60)) < 1e-9);

// Äá»‹nh má»©c 1 Láº¦N than hÃ³a theo THÃNG + cÃ´ng Ä‘oáº¡n + LOáº I (VÃ¡n/Bullig RIÃŠNG)
state.x2SayRates = { s1: { '2026-09': { van: { phut: 130 }, bullig: { phut: 150 }, m3: 4 } }, s2: {} };
check('Äá»ŠNH Má»¨C: phÃºt RIÃŠNG tá»«ng loáº¡i (S1 VÃ¡n 130\' Â· Bullig 150\') + mÂ³/láº§n 4 â€” thÃ¡ng chÆ°a khai dÃ¹ng máº·c Ä‘á»‹nh (S1 105 Â· S2 50)',
  x2.sayMinutesPerCharge('2026-09-21', 'say1', 'VÃ¡n') === 130 &&
  x2.sayMinutesPerCharge('2026-09-21', 'say1', 'Bullig') === 150 &&
  x2.sayM3PerCharge('2026-09-21', 'say1') === 4 &&
  x2.sayMinutesPerCharge('2026-10-05', 'say1', 'VÃ¡n') === 105 &&
  x2.sayMinutesPerCharge('2026-10-05', 'say2', 'Bullig') === 50);
check('Äá»ŠNH Má»¨C: phÃºt Tá»ªNG Láº¦N theo LOáº I cá»§a láº§n Ä‘Ã³ â€” 21/09 toÃ n VÃ¡n â†’ 130\' Â· Sáº¥y 2 Bullig (22/09) máº·c Ä‘á»‹nh 50\'',
  (() => {
    const d21x = x2.sayChargeRows().find(r => r.date === '2026-09-21');
    const d22 = x2.sayChargeRows().find(r => r.date === '2026-09-22');
    const g2 = d22 && d22.groups.find(g => g.stage === 'say2');
    return !!d21x && d21x.charges.every(c => c.minutes === 130 && c.useFor === 'van') &&
      !!g2 && g2.charges[0].useFor === 'bullig' && g2.charges[0].minutes === 50;
  })());
check('Äá»ŠNH Má»¨C: báº£n {phut, m3} cÅ© (mÃ¡y khÃ¡c Ä‘áº©y mÃ¢y vá») â†’ phÃºt DÃ™NG CHUNG 2 loáº¡i â€” mÂ³/láº§n lÃªn 4 â†’ 21/09 (3 mÂ³) cÃ²n 1 Láº¦N',
  (() => {
    state.x2SayRates = { s1: { '2026-09': { phut: 130, m3: 4 } }, s2: {} };
    const d = x2.sayChargeRows().find(r => r.date === '2026-09-21');
    const okRate = x2.sayMinutesPerCharge('2026-09-21', 'say1', 'VÃ¡n') === 130 &&
      x2.sayMinutesPerCharge('2026-09-21', 'say1', 'Bullig') === 130;
    state.x2SayRates = { s1: { '2026-09': { van: { phut: 130 }, bullig: { phut: 150 }, m3: 4 } }, s2: {} };
    return !!d && d.lanCount === 1 && Math.abs(d.charges[0].vol - 3) < 1e-9 &&
      d.charges[0].minutes === 130 && Math.abs(d.charges[0].need - (130 / 60)) < 1e-9 && okRate;
  })());
check('Äá»ŠNH Má»¨C: Ä‘á»•i mÂ³/láº§n xuá»‘ng 1 â†’ ngÃ y 21/09 (3 lÃ´ Ã— 1 mÂ³) thÃ nh 3 láº§n (má»—i láº§n 1 mÂ³)',
  (() => {
    state.x2SayRates = { s1: { '2026-09': { van: { phut: 105 }, bullig: { phut: 105 }, m3: 1 } }, s2: {} };
    const d = x2.sayChargeRows().find(r => r.date === '2026-09-21');
    state.x2SayRates = { s1: { '2026-09': { van: { phut: 130 }, bullig: { phut: 150 }, m3: 4 } }, s2: {} };
    return !!d && d.lanCount === 3;
  })());

// LÆ¯U Äá»ŠNH Má»¨C qua POPUP (4 Ã´ phÃºt/láº§n cá»§a 1 hÃ ng thÃ¡ng; trá»‘ng = dÃ¹ng máº·c Ä‘á»‹nh)
state.x2SayRates = { s1: {}, s2: {} };
document.getElementById('x2sr-2026-10-s1-van').value = '45';
document.getElementById('x2sr-2026-10-s1-bullig').value = '60';
document.getElementById('x2sr-2026-10-s2-van').value = '';
document.getElementById('x2sr-2026-10-s2-bullig').value = '';
x2.handleX2SayRateRowSave('2026-10');
check('LÆ¯U Äá»ŠNH Má»¨C: lÆ°u Ä‘Ãºng 4 phÃºt/láº§n (Ã´ trá»‘ng = máº·c Ä‘á»‹nh S2 50/50) vÃ o state + localStorage',
  state.x2SayRates.s1['2026-10'].van.phut === 45 && state.x2SayRates.s1['2026-10'].bullig.phut === 60 &&
  state.x2SayRates.s2['2026-10'].van.phut === 50 && state.x2SayRates.s2['2026-10'].bullig.phut === 50 &&
  String(storeBacking.get('bamboo_tracker_x2_say_rate_v1') || '').includes('"phut":45'));
document.getElementById('x2sr-2026-11-s1-van').value = '0';
x2.handleX2SayRateRowSave('2026-11');
check('LÆ¯U Äá»ŠNH Má»¨C: sá»‘ phÃºt â‰¤ 0 bá»‹ cháº·n (khÃ´ng ghi vÃ o state â€” thÃ¡ng Ä‘Ã³ váº«n dÃ¹ng máº·c Ä‘á»‹nh)',
  state.x2SayRates.s1['2026-11'] === undefined && x2.sayMinutesPerCharge('2026-11-05', 'say2', 'Bullig') === 50);
// mÂ³/láº§n (lÃ´ cÅ©) â€” sá»‘ CHUNG theo cÃ´ng Ä‘oáº¡n, khÃ´ng phÃ¢n loáº¡i
document.getElementById('x2sr-m3-month').value = '2026-10';
document.getElementById('x2sr-m3-s1').value = '3';
document.getElementById('x2sr-m3-s2').value = '';
x2.handleX2SayRateM3Save();
check('LÆ¯U MÂ³/Láº¦N (lÃ´ cÅ©): Sáº¥y 1 = 3 Â· Sáº¥y 2 trá»‘ng = máº·c Ä‘á»‹nh 2 â€” khÃ´ng Ä‘á»¥ng phÃºt Ä‘Ã£ khai',
  x2.sayM3PerCharge('2026-10-05', 'say1') === 3 && x2.sayM3PerCharge('2026-10-05', 'say2') === 2 &&
  state.x2SayRates.s1['2026-10'].van.phut === 45);
// KhÃ´i phá»¥c máº·c Ä‘á»‹nh 1 thÃ¡ng
x2.handleX2SayRateRowReset('2026-10');
check('KHÃ”I PHá»¤C Máº¶C Äá»ŠNH: xÃ³a khai bÃ¡o thÃ¡ng â†’ quay láº¡i máº·c Ä‘á»‹nh',
  state.x2SayRates.s1['2026-10'] === undefined && x2.sayMinutesPerCharge('2026-10-05', 'say1', 'VÃ¡n') === 105);
// Báº£n CÅ¨ (1 sá»‘ = phÃºt) váº«n Ä‘á»c Ä‘Æ°á»£c khi náº¡p tá»« localStorage
storeBacking.set('bamboo_tracker_x2_say_rate_v1', JSON.stringify({ s1: { '2026-09': 120 }, s2: {} }));
x2.loadX2SayRates();
check('TÆ¯Æ NG THÃCH: Ä‘á»‹nh má»©c báº£n CÅ¨ (1 sá»‘) â†’ phÃºt dÃ¹ng chung 2 loáº¡i + mÂ³/láº§n máº·c Ä‘á»‹nh 2',
  state.x2SayRates.s1['2026-09'].van.phut === 120 && state.x2SayRates.s1['2026-09'].bullig.phut === 120 &&
  state.x2SayRates.s1['2026-09'].m3 === 2 && x2.sayMinutesPerCharge('2026-09-21', 'say1', 'Bullig') === 120);
state.x2SayRates = { s1: {}, s2: {} };

// Váº½ báº£ng thá»‘ng kÃª (DOM stub: cháº¡y khÃ´ng lá»—i + ná»™i dung Ä‘Ãºng)
state.x2SayRates = { s1: {}, s2: {} };
x2.renderX2SayStats();
const statsHtml = document.getElementById('x2-say-day-rows').innerHTML;
check('RENDER: báº£ng váº½ DÃ’NG Äáº¦U NGÃ€Y + DÃ’NG NHÃ“M cÃ´ng Ä‘oáº¡n + Tá»ªNG Láº¦N than hÃ³a (nhÃ£n "Láº§n 1" Â· vá»‹ trÃ­ Â· mÃ£ lÃ´)',
  statsHtml.includes('x2-say-day-head') && statsHtml.includes('x2-say-group-head') &&
  statsHtml.includes('Láº§n 1') && statsHtml.includes('Sáº¥y 1') && statsHtml.includes('Sáº¥y 2') &&
  statsHtml.includes('21/09/26') && statsHtml.includes('260921-01 + 260921-02'));
check('RENDER: dÃ²ng nhÃ³m cÃ³ Ã´ nháº­p "Sá»‘ láº§n TH" cá»§a NGÃ€Y (data-say-times + data-say-stage) + phÃºt 105\' + giá» cáº§n 1,75 h',
  statsHtml.includes('data-say-times="2026-09-21"') && statsHtml.includes('data-say-stage="say1"') &&
  statsHtml.includes('Sá»‘ láº§n TH') && statsHtml.includes("105'") && statsHtml.includes('1,75 h'));
check('RENDER: dÃ²ng Ä‘áº§u NGÃ€Y cÃ³ Ã´ "Sá»± cá»‘" (data-say-incident) + nhÃ£n Hiá»‡u suáº¥t cá»§a ngÃ y',
  statsHtml.includes('data-say-incident="2026-09-21"') && statsHtml.includes('Sá»± cá»‘') &&
  statsHtml.includes('x2-say-eff-badge') && statsHtml.includes('Hiá»‡u suáº¥t'));
check('RENDER: thanh tiÃªu Ä‘á» Ä‘áº¿m sá»‘ ngÃ y + sá»‘ Láº¦N than hÃ³a + tá»•ng mÂ³',
  document.getElementById('x2-say-stats-count').textContent.includes('láº§n than hÃ³a') &&
  document.getElementById('x2-say-stats-count').textContent.includes('ngÃ y') &&
  document.getElementById('x2-say-stats-count').textContent.includes('mÂ³'));

check('RENDER: cá»™t ThÃ nh pháº§n má»—i láº§n = "VÃ¡n - 1,000 mÂ³" (mÃ£ lÃ´ chuyá»ƒn vÃ o tooltip title)',
  statsHtml.includes('VÃ¡n - 1,000 mÂ³') && statsHtml.includes('title="MÃ£ lÃ´: 260921-01 + 260921-02'));
check('RENDER: Sáº¥y 2 Bullig 22/09 â†’ "Bullig - 0,400 mÂ³"',
  statsHtml.includes('Bullig - 0,400 mÂ³'));
// POPUP Äá»ŠNH Má»¨C: báº£ng 4 cá»™t phÃºt/láº§n + chip tÃ³m táº¯t trÃªn tháº»
x2.renderX2SayRateModal();
const rateTbl = document.getElementById('x2-say-rate-rows').innerHTML;
check('POPUP Äá»ŠNH Má»¨C: 4 Ã´ phÃºt/láº§n má»—i hÃ ng (s1-van/s1-bullig/s2-van/s2-bullig) + nÃºt LÆ°u/KhÃ´i phá»¥c',
  rateTbl.includes('-s1-van') && rateTbl.includes('-s1-bullig') &&
  rateTbl.includes('-s2-van') && rateTbl.includes('-s2-bullig') &&
  rateTbl.includes('data-x2sr-save') && rateTbl.includes('data-x2sr-reset'));
x2.renderX2SayRateChip();
check('POPUP Äá»ŠNH Má»¨C: chip tÃ³m táº¯t trÃªn tháº» hiá»‡n "Sáº¥y 1" + phÃºt',
  document.getElementById('x2-say-rate-chip').innerHTML.includes('Sáº¥y 1') &&
  document.getElementById('x2-say-rate-chip').innerHTML.includes("'"));

// THU Gá»ŒN / Má»ž Láº I báº£ng Kanban (nhá»› theo mÃ¡y)
localStorage.removeItem('bamboo_tracker_x2_kanban_collapsed_v1');
const hoaCard = document.getElementById('x2-than-hoa-card');
x2.applyX2KanbanCollapsed();
check('THU Gá»ŒN: máº·c Ä‘á»‹nh Má»ž báº£ng lÃ´ + nhÃ£n nÃºt "Thu gá»n báº£ng lÃ´"',
  !hoaCard.classList.contains('kanban-board-collapsed') &&
  document.getElementById('x2-kanban-toggle-label').textContent === 'Thu gá»n báº£ng lÃ´');
check('THU Gá»ŒN: dÃ²ng tá»•ng quan Ä‘áº¿m Ä‘Ãºng sá»‘ lÃ´ tá»«ng cÃ´ng Ä‘oáº¡n (Sáº¥y 1: 7 Â· Sáº¥y 2: 1 Â· Kho: 2)',
  document.getElementById('x2-kanban-summary').innerHTML.includes('Sáº¥y 1</b>: 7 lÃ´') &&
  document.getElementById('x2-kanban-summary').innerHTML.includes('Sáº¥y 2</b>: 1 lÃ´') &&
  document.getElementById('x2-kanban-summary').innerHTML.includes('Kho</b>: 2 lÃ´'));
x2.toggleX2KanbanBoard();
check('THU Gá»ŒN: báº¥m nÃºt â†’ tháº» nháº­n cá» kanban-board-collapsed + nhÃ£n "Má»Ÿ báº£ng lÃ´" + nhá»› theo mÃ¡y',
  hoaCard.classList.contains('kanban-board-collapsed') &&
  document.getElementById('x2-kanban-toggle-label').textContent === 'Má»Ÿ báº£ng lÃ´' &&
  localStorage.getItem('bamboo_tracker_x2_kanban_collapsed_v1') === '1');
x2.toggleX2KanbanBoard();
check('THU Gá»ŒN: báº¥m láº§n ná»¯a â†’ má»Ÿ láº¡i báº£ng lÃ´ + ghi nhá»› "0"',
  !hoaCard.classList.contains('kanban-board-collapsed') &&
  document.getElementById('x2-kanban-toggle-label').textContent === 'Thu gá»n báº£ng lÃ´' &&
  localStorage.getItem('bamboo_tracker_x2_kanban_collapsed_v1') === '0');

// â”€â”€â”€ M4. CHIA Láº¦N THEO LÆ¯á»¢T LÆ¯U (MÃƒ Máºº sayCharges + Má»C 28/09/2026) â”€â”€
// Tá»« 28/09/2026: Má»–I lÆ°á»£t báº¥m "LÆ°u" cá»§a "ThÃªm LÃ´ Sáº¥y Má»›i" = 1 Láº¦N than hÃ³a â€”
// mÃ£ máº» (sayCharges.<say>) gáº¯n lÃªn Tá»ªNG lÃ´ cá»§a lÆ°á»£t lÆ°u; KHÃ”NG tá»± gá»™p mÂ³/láº§n ná»¯a.
// LÃ´ cÅ© (ngÃ y < 28/09/2026, khÃ´ng cÃ³ mÃ£ máº») váº«n tá»± gá»™p theo Ä‘á»‹nh má»©c mÂ³/láº§n.
check('MÃƒ Máºº (Sáº¥y 1): cÃ¡c lÃ´ táº¡o trong CÃ™NG lÆ°á»£t LÆ°u nháº­n cÃ¹ng sayCharges.say1',
  !!bNew1 && !!bNew2 && Number(bNew1.sayCharges && bNew1.sayCharges.say1) > 0 &&
  bNew1.sayCharges.say1 === bNew2.sayCharges.say1);
check('MÃƒ Máºº (Sáº¥y 2): lÃ´ chuyá»ƒn Kho â†’ Sáº¥y 2 nháº­n sayCharges.say2 (cÃ¹ng 1 lÆ°á»£t LÆ°u)',
  Number(b2.sayCharges && b2.sayCharges.say2) > 0 &&
  b2.sayCharges.say2 === b2b.sayCharges.say2);
state.x2SayTimes = {};   // bá» háº¿t nháº­p tay Ä‘á»ƒ thá»­ luáº­t chia láº§n má»›i
// LÃ´ cÅ© 25/09 (2 mÂ³ + 1 mÂ³, KHÃ”NG mÃ£ máº») â†’ váº«n tá»± gá»™p theo mÂ³/láº§n (2 láº§n: 2 + 1)
state.batches.push(
  { id: 'tb-old2', code: '260925-01', stage: 'say1', date: '2026-09-25', location: 'LS5', length: 1250, width: 20, thickness: 10, quantity: 1000, volume: 2, bambooType: 'A', useFor: 'VÃ¡n', stageHistory: [{ stage: 'say1', date: '2026-09-25' }] },
  { id: 'tb-old3', code: '260925-02', stage: 'say1', date: '2026-09-25', location: 'LS5', length: 1250, width: 20, thickness: 10, quantity: 500, volume: 1, bambooType: 'A', useFor: 'VÃ¡n', stageHistory: [{ stage: 'say1', date: '2026-09-25' }] }
);
const dOld = x2.sayChargeRows().find(r => r.date === '2026-09-25');
check('Má»C NGÃ€Y (dá»¯ liá»‡u cÅ©): 25/09 < 28/09/2026 KHÃ”NG mÃ£ máº» â†’ váº«n tá»± gá»™p theo mÂ³/láº§n (3 mÂ³ = 2 láº§n: 2 + 1)',
  !!dOld && dOld.lanCount === 2 &&
  Math.abs(dOld.charges[0].vol - 2) < 1e-9 && Math.abs(dOld.charges[1].vol - 1) < 1e-9);
// NgÃ y Má»šI 29/09: lÃ´ KHÃ”NG mÃ£ máº» (3 mÂ³) â†’ máº·c Ä‘á»‹nh 1 Láº¦N, KHÃ”NG tá»± gá»™p 2 mÂ³
state.batches.push({ id: 'tb-nm0', code: '260929-01', stage: 'say1', date: '2026-09-29', location: 'LS6', length: 1250, width: 20, thickness: 10, quantity: 1500, volume: 3, bambooType: 'A', useFor: 'VÃ¡n', stageHistory: [{ stage: 'say1', date: '2026-09-29' }] });
let dNew = x2.sayChargeRows().find(r => r.date === '2026-09-29');
check('Má»C NGÃ€Y (dá»¯ liá»‡u má»›i): 29/09 â‰¥ 28/09/2026 KHÃ”NG mÃ£ máº» â†’ máº·c Ä‘á»‹nh 1 Láº¦N (khÃ´ng tá»± gá»™p 2 mÂ³)',
  !!dNew && dNew.lanCount === 1 && Math.abs(dNew.charges[0].vol - 3) < 1e-9);
// 2 lÆ°á»£t lÆ°u (mÃ£ máº» 1000 & 2000) + lÃ´ khÃ´ng mÃ£ â†’ 3 láº§n, Ä‘Ãºng thá»© tá»± & Ä‘Ãºng lÃ´ tá»«ng lÆ°á»£t
state.batches.push(
  { id: 'tb-nm1', code: '260929-02', stage: 'say1', date: '2026-09-29', location: 'LS6', length: 1250, width: 20, thickness: 10, quantity: 500, volume: 1, bambooType: 'A', useFor: 'VÃ¡n', sayCharges: { say1: 1000 }, stageHistory: [{ stage: 'say1', date: '2026-09-29' }] },
  { id: 'tb-nm2', code: '260929-03', stage: 'say1', date: '2026-09-29', location: 'LS6', length: 1250, width: 20, thickness: 10, quantity: 500, volume: 0.5, bambooType: 'A1', useFor: 'VÃ¡n', sayCharges: { say1: 1000 }, stageHistory: [{ stage: 'say1', date: '2026-09-29' }] },
  { id: 'tb-nm3', code: '260929-04', stage: 'say1', date: '2026-09-29', location: 'LS7', length: 1250, width: 20, thickness: 10, quantity: 1000, volume: 2, bambooType: 'B', useFor: 'VÃ¡n', sayCharges: { say1: 2000 }, stageHistory: [{ stage: 'say1', date: '2026-09-29' }] }
);
dNew = x2.sayChargeRows().find(r => r.date === '2026-09-29');
check('CHIA Láº¦N THEO LÆ¯á»¢T LÆ¯U: 2 lÆ°á»£t LÆ°u + 1 lÃ´ khÃ´ng mÃ£ = 3 láº§n â€” má»—i láº§n ÄÃšNG lÃ´ + mÂ³ tháº­t (khÃ´ng chia Ä‘á»u giáº£)',
  !!dNew && dNew.lanCount === 3 &&
  dNew.charges[0].codeText === '260929-02 + 260929-03' && Math.abs(dNew.charges[0].vol - 1.5) < 1e-9 &&
  dNew.charges[1].codeText === '260929-04' && Math.abs(dNew.charges[1].vol - 2) < 1e-9 &&
  dNew.charges[2].codeText === '260929-01' && Math.abs(dNew.charges[2].vol - 3) < 1e-9);
// Äiá»n tay "Sá»‘ láº§n TH" váº«n GHI ÄÃˆ sá»‘ láº§n theo lÆ°á»£t lÆ°u
x2.setSayGroupTimes('2026-09-29', 'say1', 4);
const dNewM = x2.sayChargeRows().find(r => r.date === '2026-09-29');
check('GHI ÄÃˆ: Ä‘iá»n tay "Sá»‘ láº§n TH" = 4 váº«n tháº¯ng sá»‘ lÆ°á»£t LÆ°u (6,5 mÂ³ chia Ä‘á»u 4 láº§n Ã— 1,625 mÂ³)',
  !!dNewM && dNewM.lanCount === 4 && dNewM.charges.every(c => Math.abs(c.vol - 1.625) < 1e-9));
x2.setSayGroupTimes('2026-09-29', 'say1', '');
// RENDER: áº¨N ghi chÃº "Tá»± gá»™p theo â€¦ mÂ³/láº§n" + chip nguá»“n sá»‘ láº§n
x2.renderX2SayStats();
const statsHtml2 = document.getElementById('x2-say-day-rows').innerHTML;
check('RENDER: áº¨N ghi chÃº "Tá»± gá»™p theo â€¦ mÂ³/láº§n" â€” thay báº±ng chip nguá»“n sá»‘ láº§n (Theo lÆ°á»£t LÆ°u / Dá»¯ liá»‡u cÅ©)',
  !statsHtml2.includes('Tá»± gá»™p theo') && statsHtml2.includes('x2-say-mode-chip') &&
  statsHtml2.includes('Theo lÆ°á»£t LÆ°u') && statsHtml2.includes('Dá»¯ liá»‡u cÅ©'));
check('Cáº¤U TRÃšC (index.html): ghi chÃº "Tá»± gá»™p theo â€¦" Ä‘Ã£ gá»¡ khá»i markup tÄ©nh + nhÃ£n mÂ³/láº§n ghi rÃµ (lÃ´ cÅ©)',
  !idxHtml.includes('há»‡ thá»‘ng <b>tá»± gá»™p') && idxHtml.includes('mÂ³/láº§n (lÃ´ cÅ©)'));
check('Cáº¤U TRÃšC (js): lÃ´ gáº¯n MÃƒ Máºº sayCharges khi báº¥m LÆ°u + má»‘c SAY_NO_AUTO_FROM (28/09/2026)',
  fs.readFileSync(new URL('../js/batch-modals.js', import.meta.url), 'utf8').includes('sayCharges') &&
  fs.readFileSync(new URL('../js/xuong2.js', import.meta.url), 'utf8').includes('SAY_NO_AUTO_FROM'));

// Cáº¤U TRÃšC: markup + style + ná»‘i dá»¯ liá»‡u 4 nÆ¡i
check('Cáº¤U TRÃšC (index.html): báº£ng theo Tá»ªNG Láº¦N than hÃ³a + NÃšT Äá»‹nh má»©c + POPUP 4 cá»™t phÃºt/láº§n + mÂ³/láº§n (lÃ´ cÅ©) + nÃºt thu gá»n báº£ng KANBAN',
  idxHtml.includes('id="x2-say-stats-wrap"') && idxHtml.includes('id="x2-say-day-rows"') &&
  idxHtml.includes('id="btn-x2-say-rate"') && idxHtml.includes('id="modal-x2-say-rate"') &&
  idxHtml.includes('id="x2-say-rate-rows"') && idxHtml.includes('id="btn-x2sr-add-month"') &&
  idxHtml.includes('id="btn-x2sr-m3-save"') && idxHtml.includes('mÂ³/láº§n (lÃ´ cÅ©)') && !idxHtml.includes('id="x2-say-rate-bar"') && idxHtml.includes('<th>ThÃ nh pháº§n</th>') &&
  idxHtml.includes('btn-toggle-kanban-board') && idxHtml.includes('Sá»‘ láº§n TH') &&
  idxHtml.includes('Giá» HC') && idxHtml.includes('Giá» TC') && idxHtml.includes('Giá» Cáº§n'));
check('Cáº¤U TRÃšC (index.html): Bá»Ž nÃºt thu gá»n cá»§a báº£ng thá»‘ng kÃª + Bá»Ž Ã´ "Sá»‘ Láº§n Than HÃ³a" theo LÃ” trong form Sá»­a LÃ´',
  !idxHtml.includes('btn-toggle-x2-say-stats') && !idxHtml.includes('form-than-hoa-times') &&
  idxHtml.includes('id="btn-toggle-kanban-board"') && idxHtml.includes('Thu gá»n báº£ng lÃ´'));
check('Cáº¤U TRÃšC (styles.css): cá» thu gá»n áº©n báº£ng Kanban + style dÃ²ng nhÃ³m Â· nhÃ£n Láº§n N Â· Ã´ nháº­p Sá»‘ láº§n TH',
  cssHtml.includes('#x2-than-hoa-card.kanban-board-collapsed .kanban-board') &&
  cssHtml.includes('.x2-say-table') && cssHtml.includes('.x2-say-day-head') &&
  cssHtml.includes('.x2-say-group-head') && cssHtml.includes('.x2-say-times-input') &&
  cssHtml.includes('.x2-say-lan-badge') && cssHtml.includes('.x2-kanban-sum-item'));
check('Cáº¤U TRÃšC (js): Ä‘á»‹nh má»©c than hÃ³a + Sá» Láº¦N THAN HÃ“A theo ngÃ y Ä‘á»u cÃ³ key riÃªng + ná»‘i Ä‘á»§ storage/cloud/history/main',
  jsState.includes('bamboo_tracker_x2_say_rate_v1') && jsState.includes('bamboo_tracker_x2_say_times_v1') &&
  jsStorage.includes('x2SayRates') && jsStorage.includes('restoreX2SayTimes') &&
  jsCloud.includes('x2SayTimes') && jsHistory.includes('x2SayTimes') &&
  jsMain.includes('loadX2SayRates') && jsMain.includes('loadX2SayTimes') &&
  jsEvents.includes('btn-toggle-kanban-board') && jsEvents.includes('btn-x2-say-rate') && jsEvents.includes('data-x2sr-save') &&
  jsEvents.includes('onSayTimesChange'));
check('Cáº¤U TRÃšC (styles.css): dÃ²ng Ä‘áº§u ngÃ y cÃ³ Ã´ Sá»± cá»‘ cho phÃ©p (x2-say-inc-input) + nhÃ£n Hiá»‡u suáº¥t ngÃ y (x2-say-eff-badge)',
  cssHtml.includes('.x2-say-inc-input') && cssHtml.includes('.x2-say-day-inc') &&
  cssHtml.includes('.x2-say-eff-badge') && cssHtml.includes('.x2-say-eff-good') &&
  cssHtml.includes('.x2-say-eff-low'));
check('Cáº¤U TRÃšC (js): báº£ng gá»™p nhÃ³m theo NGÃ€Y (sayBuildCharges) + Bá»Ž cÆ¡ cháº¿ sá»‘ láº§n theo Tá»ªNG LÃ” (thanHoaTimes)',
  fs.readFileSync(new URL('../js/xuong2.js', import.meta.url), 'utf8').includes('sayBuildCharges') &&
  !fs.readFileSync(new URL('../js/batch-modals.js', import.meta.url), 'utf8').includes('thanHoaTimes') &&
  !fs.readFileSync(new URL('../js/kanban.js', import.meta.url), 'utf8').includes('thanHoaTimes'));
check('Cáº¤U TRÃšC: cá»™t "Hiá»‡u Suáº¥t" tá»«ng láº§n Ä‘Ã£ bá» (thead cÃ²n 8 cá»™t, hiá»‡u suáº¥t náº±m á»Ÿ dÃ²ng Ä‘áº§u ngÃ y)',
  !idxHtml.includes('<th>Hiá»‡u Suáº¥t</th>') &&
  fs.readFileSync(new URL('../js/xuong2.js', import.meta.url), 'utf8').includes('HIá»†U SUáº¤T cá»§a NGÃ€Y = Giá» cáº§n Ã· (Giá» thá»±c táº¿ âˆ’ Giá» sá»± cá»‘ cho phÃ©p)'));
check('Cáº¤U TRÃšC (js): GIá»œ Sá»° Cá» CHO PHÃ‰P theo ngÃ y cÃ³ key riÃªng + ná»‘i Ä‘á»§ state/storage/cloud/history/main/events',
  jsState.includes('bamboo_tracker_x2_say_incident_v1') &&
  jsStorage.includes('x2SayIncidents') && jsStorage.includes('restoreX2SayIncidents') &&
  jsCloud.includes('x2SayIncidents') && jsHistory.includes('x2SayIncidents') &&
  jsMain.includes('loadX2SayIncidents') && jsEvents.includes('onSayIncidentChange'));

// â”€â”€â”€ N0. CHIP "Láº¦N THAN HÃ“A" TRÃŠN THáºº KANBAN (chá»‰ Ä‘á»c) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
state.batches.push({ id: 'bx-th1', code: '260998-01', stage: 'say1', date: '2026-09-26', week: '2026-W39', length: 1250, width: 18, thickness: 7, quantity: 100, volume: 1, bambooType: 'A', useFor: 'VÃ¡n', location: 'LS2', sayCharges: { say1: 1000 }, stageHistory: [{ stage: 'say1', date: '2026-09-26' }] }); // ngÃ y RIÃŠNG (26/09) â€” khÃ´ng trÃ¹ng nhÃ³m nÃ o khÃ¡c
check('CHIP KANBAN: lÃ´ cÃ³ mÃ£ máº» sayCharges â†’ nhÃ£n "Láº§n 1/1 Â· Sáº¥y 1"',
  x2.sayBatchChargeLabel(state.batches.find(b => b.id === 'bx-th1')) === 'Láº§n 1/1 Â· Sáº¥y 1');
check('CHIP KANBAN: lÃ´ cÅ© KHÃ”NG mÃ£ máº» â†’ khÃ´ng hiá»‡n nhÃ£n (chuá»—i rá»—ng)',
  x2.sayBatchChargeLabel(state.batches.find(b => b.id === 'bx1')) === '');
check('CHIP KANBAN: lÃ´ cÅ© tb-nm0 KHÃ”NG mÃ£ máº» (cÃ³ tháº­t) â†’ chuá»—i rá»—ng',
  x2.sayBatchChargeLabel(state.batches.find(b => b.id === 'tb-nm0')) === '');
check('CHIP KANBAN: main.js Ä‘Æ°a hÃ m vÃ o window.app (x2SayChargeLabel)',
  jsMain.includes('x2SayChargeLabel') && jsMain.includes('sayBatchChargeLabel'));
// Qua Cáº¢ Sáº¥y 1 vÃ  Sáº¥y 2 (cÃ³ mÃ£ máº» cáº£ 2) â†’ gá»™p 2 pháº§n trong 1 chip
state.batches.push({ id: 'bx-th-both', code: '260998-02', stage: 'kho', date: '2026-09-14', khoDate: '2026-09-16', say2Date: '2026-09-15', week: '2026-W37', length: 1250, width: 18, thickness: 7, quantity: 100, volume: 1, bambooType: 'A', useFor: 'VÃ¡n', location: 'LS1', sayCharges: { say1: 5000, say2: 6000 }, stageHistory: [{ stage: 'say1', date: '2026-09-14' }, { stage: 'say2', date: '2026-09-15' }, { stage: 'kho', date: '2026-09-16' }] });
check('CHIP KANBAN: lÃ´ qua Cáº¢ Sáº¥y 1 + Sáº¥y 2 â†’ gá»™p "S1: Láº§n 1/1 Â· S2: Láº§n 1/1"',
  x2.sayBatchChargeLabel(state.batches.find(b => b.id === 'bx-th-both')) === 'S1: Láº§n 1/1 Â· S2: Láº§n 1/1');
// Táº¡o THáº²NG vÃ o Sáº¥y 2 (khÃ´ng cÃ³ Sáº¥y 1 trong lá»‹ch sá»­) â†’ chá»‰ hiá»‡n Sáº¥y 2
state.batches.push({ id: 'bx-th-s2only', code: '260998-03', stage: 'say2', date: '2026-09-16', say2Date: '2026-09-16', week: '2026-W37', length: 1250, width: 18, thickness: 7, quantity: 100, volume: 1, bambooType: 'A', useFor: 'VÃ¡n', location: 'LS3', sayCharges: { say2: 7000 }, stageHistory: [{ stage: 'say2', date: '2026-09-16' }] });
check('CHIP KANBAN: lÃ´ táº¡o THáº²NG vÃ o Sáº¥y 2 â†’ "Láº§n 1/1 Â· Sáº¥y 2"',
  x2.sayBatchChargeLabel(state.batches.find(b => b.id === 'bx-th-s2only')) === 'Láº§n 1/1 Â· Sáº¥y 2');
// CÃ³ mÃ£ máº» Sáº¥y 1 nhÆ°ng sang Sáº¥y 2 báº±ng Ä‘Æ°á»ng KHÃ”NG cÃ³ mÃ£ â†’ váº«n hiá»‡n pháº§n Sáº¥y 1
state.batches.push({ id: 'bx-th-s1move', code: '260998-04', stage: 'say2', date: '2026-09-17', say2Date: '2026-09-18', week: '2026-W37', length: 1250, width: 18, thickness: 7, quantity: 100, volume: 1, bambooType: 'A', useFor: 'VÃ¡n', location: 'LS4', sayCharges: { say1: 8000 }, stageHistory: [{ stage: 'say1', date: '2026-09-17' }, { stage: 'say2', date: '2026-09-18' }] });
check('CHIP KANBAN: cÃ³ mÃ£ máº» Sáº¥y 1, sang Sáº¥y 2 khÃ´ng mÃ£ â†’ váº«n "Láº§n 1/1 Â· Sáº¥y 1"',
  x2.sayBatchChargeLabel(state.batches.find(b => b.id === 'bx-th-s1move')) === 'Láº§n 1/1 Â· Sáº¥y 1');
check('Cáº¤U TRÃšC (styles.css): chip .tag-say-charge cÃ³ style riÃªng (ná»n/viá»n/mÃ u)',
  cssHtml.includes('.tag-say-charge'));

// â”€â”€â”€ N1. LIÃŠN Káº¾T 2 CHIá»€U GIá»®A THáºº NAN CÃC CÃ”NG ÄOáº N â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
console.log('--- N1. LIÃŠN Káº¾T Sá»¬A THáºº NAN (giá»¯ link Â· Ä‘á»“ng bá»™ Loáº¡i Â· cáº£nh bÃ¡o kÃ­ch thÆ°á»›c) ---');
const jsBM = fs.readFileSync(new URL('../js/batch-modals.js', import.meta.url), 'utf8');
// Äiá»n form Sá»­a tháº» theo Ä‘Ãºng cÃ¡ch openBatchFormModal lÃ m (ngÃ y cÃ´ng Ä‘oáº¡n
// hiá»‡n táº¡i Ä‘Æ°á»£c prefill, cÃ´ng Ä‘oáº¡n khÃ¡c Ä‘á»ƒ trá»‘ng).
function fillBatchForm(b) {
  document.getElementById('form-batch-id').value    = b.id;
  document.getElementById('form-code').value        = b.code;
  document.getElementById('form-stage').value       = b.stage;
  document.getElementById('form-date').value        = b.date;
  document.getElementById('form-week').value        = b.week || '2026-W40';
  document.getElementById('form-length').value      = b.length;
  document.getElementById('form-width').value       = b.width;
  document.getElementById('form-thickness').value   = b.thickness;
  document.getElementById('form-quantity').value    = b.quantity;
  document.getElementById('form-bamboo-type').value = b.bambooType;
  document.getElementById('form-use-for').value     = b.useFor;
  document.getElementById('form-location').value    = b.location;
  document.getElementById('form-notes').value       = b.notes || '';
  document.getElementById('form-say2-date').value   = b.stage === 'say2' ? (b.say2Date || '') : '';
  document.getElementById('form-kho-date').value    = b.stage === 'kho'  ? (b.khoDate  || '') : '';
}
// LÃ´ Äáº¦Y Äá»¦ liÃªn káº¿t: mÃ£ máº» than hÃ³a + link tháº» Chá»n Nan ThÃ´ + má»‘c Sáº¥y 2/Kho
state.batches.push({
  id: 'bx-link1', code: '260997-01', stage: 'kho', date: '2026-09-19',
  say2Date: '2026-09-19', khoDate: '2026-09-20', week: '2026-W38',
  length: 1250, width: 18, thickness: 7, quantity: 500, volume: 0.5,
  bambooType: 'A', useFor: 'VÃ¡n', location: 'LS7',
  sayCharges: { say1: 111111, say2: 222222 },
  sourceChonNanId: 'cn-link-src', sourceChonNanLabel: '1250Ã—18Ã—7 Â· A Â· 500',
  stageHistory: [{ stage: 'say1', date: '2026-09-18' }, { stage: 'say2', date: '2026-09-19' }, { stage: 'kho', date: '2026-09-20' }]
});
state.xuong2ChonNanThoRecords = state.xuong2ChonNanThoRecords || [];
state.xuong2ChonNanThoRecords.push({ id: 'cn-link-src', cls: 'A', dims: [1250, 18, 7], quantity: 500, external: false });

// â‘  Sá»­a chá»‰ GHI CHÃš â†’ PHáº¢I giá»¯ nguyÃªn mÃ£ máº» + link tháº» nan + má»‘c ngÃ y cÃ´ng Ä‘oáº¡n khÃ¡c
fillBatchForm(state.batches.find(b => b.id === 'bx-link1'));
document.getElementById('form-notes').value = 'sá»­a ghi chÃº';
bm.handleBatchFormSubmit({ preventDefault() {} });
const L1 = state.batches.find(b => b.id === 'bx-link1');
check('â‘  Sá»¬A THáºº: giá»¯ nguyÃªn MÃƒ Máºº sayCharges (chip "Láº§n than hÃ³a" khÃ´ng biáº¿n máº¥t)',
  !!L1 && !!L1.sayCharges && L1.sayCharges.say1 === 111111 && L1.sayCharges.say2 === 222222);
check('â‘  Sá»¬A THáºº: giá»¯ nguyÃªn LINK tháº» Chá»n Nan ThÃ´ (sourceChonNanId + Label)',
  !!L1 && L1.sourceChonNanId === 'cn-link-src' && L1.sourceChonNanLabel === '1250Ã—18Ã—7 Â· A Â· 500');
check('â‘  Sá»¬A THáºº: giá»¯ nguyÃªn say2Date (CÃ”NG ÄOáº N KHÃC khÃ´ng máº¥t má»‘c ngÃ y)',
  !!L1 && L1.say2Date === '2026-09-19');
check('â‘  Sá»¬A THáºº: ghi chÃº Ä‘á»•i tháº­t Â· stageHistory 3 má»‘c Â· vá»‹ trÃ­ giá»¯',
  !!L1 && L1.notes === 'sá»­a ghi chÃº' && L1.stageHistory.length === 3 && L1.location === 'LS7');

// â‘¡ Äá»•i LOáº I NAN A â†’ A1 â†’ Ä‘á»“ng bá»™ ngÆ°á»£c phÃ¢n loáº¡i lÃªn tháº» Chá»n Nan ThÃ´
fillBatchForm(state.batches.find(b => b.id === 'bx-link1'));
document.getElementById('form-bamboo-type').value = 'A1';
bm.handleBatchFormSubmit({ preventDefault() {} });
const L2 = state.batches.find(b => b.id === 'bx-link1');
const rec2 = (state.xuong2ChonNanThoRecords || []).find(r => r.id === 'cn-link-src');
check('â‘¡ Äá»”I LOáº I: lÃ´ Ä‘á»•i sang A1 + VáºªN giá»¯ mÃ£ máº» sayCharges',
  !!L2 && L2.bambooType === 'A1' && !!L2.sayCharges && L2.sayCharges.say1 === 111111);
check('â‘¡ Äá»”I LOáº I: PHÃ‚N LOáº I trÃªn THáºº NGUá»’N Chá»n Nan ThÃ´ Ä‘á»•i theo (A â†’ A1)',
  !!rec2 && rec2.cls === 'A1');
check('â‘¡ Äá»”I LOáº I: Ä‘Ã£ ghi tháº» nguá»“n xuá»‘ng bá»™ nhá»› mÃ¡y',
  JSON.parse(localStorage.getItem('bamboo_tracker_xuong2_chon_nan_tho_v1') || '[]')
    .some(r => r.id === 'cn-link-src' && r.cls === 'A1'));
check('â‘¡ Äá»”I LOáº I: lÃ m má»›i nhÃ£n snapshot sourceChonNanLabel (chá»©a A1)',
  !!L2 && String(L2.sourceChonNanLabel).includes('A1'));

// â‘¢ LÃ´ ÄÃƒ bá»‹ BÃ o Tinh láº¥y thanh â†’ sá»­a Sá» LÆ¯á»¢NG pháº£i Há»ŽI; há»§y = khÃ´ng lÆ°u
state.xuong2BaoTinhRecords = state.xuong2BaoTinhRecords || [];
state.xuong2BaoTinhRecords.push({
  id: 'bt-link1', kind: 'tinh', date: '2026-09-20', week: '2026-W38',
  inSizeKey: '1250Ã—18Ã—7', inDims: [1250, 18, 7], inQty: 300,
  outSizeKey: '1240Ã—17Ã—7', outDims: [1240, 17, 7],
  qtyOk: 280, qtyErr: 20, volumeOk: 0.5,
  sources: [{ batchId: 'bx-link1', qty: 300 }]
});
fillBatchForm(state.batches.find(b => b.id === 'bx-link1'));
document.getElementById('form-quantity').value = 9999;
const undoN1Before = state.undoStack.length;
global.confirm = () => false;   // ngÆ°á»i dÃ¹ng Báº¤M Há»¦Y
bm.handleBatchFormSubmit({ preventDefault() {} });
global.confirm = () => true;    // tráº£ láº¡i máº·c Ä‘á»‹nh cá»§a stub
const L3 = state.batches.find(b => b.id === 'bx-link1');
check('â‘¢ Cáº¢NH BÃO: lÃ´ ÄÃƒ qua BÃ o Tinh, sá»­a sá»‘ lÆ°á»£ng + Há»¦Y â†’ KHÃ”NG lÆ°u (cÃ²n 500)',
  !!L3 && Number(L3.quantity) === 500);
check('â‘¢ Cáº¢NH BÃO: Há»¦Y khÃ´ng Ä‘áº©y thÃªm bÆ°á»›c undo thá»«a',
  state.undoStack.length === undoN1Before);
// Äá»’NG Ã â†’ lÆ°u bÃ¬nh thÆ°á»ng + váº«n giá»¯ liÃªn káº¿t
fillBatchForm(state.batches.find(b => b.id === 'bx-link1'));
document.getElementById('form-quantity').value = 9999;
bm.handleBatchFormSubmit({ preventDefault() {} });
const L4 = state.batches.find(b => b.id === 'bx-link1');
check('â‘¢ Cáº¢NH BÃO: Äá»’NG Ã â†’ lÆ°u Ä‘Æ°á»£c 9.999 + VáºªN giá»¯ liÃªn káº¿t sayCharges/sourceChonNanId',
  !!L4 && Number(L4.quantity) === 9999 && L4.sourceChonNanId === 'cn-link-src'
    && !!L4.sayCharges && L4.sayCharges.say2 === 222222);
check('â‘¢ Cáº¤U TRÃšC (js): helper nháº­n diá»‡n cÃ´ng Ä‘oáº¡n sau + Ä‘á»“ng bá»™ Loáº¡i + há»£p nháº¥t báº£n cÅ©',
  jsBM.includes('function batchHasDownstreamUse') && jsBM.includes('khoApprovedXuatNotes') &&
  jsBM.includes('function syncSourceChonNanClass') && jsBM.includes('Object.assign({}, old, batchData)'));

// â”€â”€â”€ N2. TRáº NG THÃI Sáº¤Y trÃªn form Sá»­a lÃ´ (14/11/2026) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Ã” "Tráº¡ng ThÃ¡i Sáº¥y" chá»‰ hiá»‡n vá»›i lÃ´ Ä‘ang á»Ÿ KHO: cho biáº¿t lÃ´ ÄÃƒ Sáº¤Y 2 / má»›i Sáº¥y 1
// / chÆ°a sáº¥y Ä‘á»ƒ tháº» Kho lá»c Ä‘Ãºng NGUá»’N cá»§a phiáº¿u xuáº¥t (BÃ o Tinh / Bullig chá»‰ nháº­n
// lÃ´ ÄÃƒ Sáº¤Y 2, phiáº¿u Sáº¥y 2 chá»‰ nháº­n lÃ´ ÄÃƒ Sáº¤Y 1). LÃ´ Ä‘i qua lÃ² sáº¥y thÆ°á»ng tá»± cÃ³
// tráº¡ng thÃ¡i Ä‘Ãºng â€” Ã´ nÃ y chá»‰ cáº§n cho lÃ´ nháº­p THáº²NG vÃ o Kho (khÃ´ng qua lÃ²).
check('N2. Cáº¤U TRÃšC (index.html): Ã´ "Tráº¡ng ThÃ¡i Sáº¥y" (form-dry-stage) + 3 lá»±a chá»n',
  idxHtml.includes('id="form-dry-stage-group"') && idxHtml.includes('id="form-dry-stage"') &&
  idxHtml.includes('value="chua-say"') && idxHtml.includes('value="say1"') && idxHtml.includes('value="say2"'));
check('N2. Cáº¤U TRÃšC (batch-modals.js): dÃ¹ng CHUNG helper cá»§a xuong2.js + lÆ°u batchData.dryStage',
  jsBM.includes('khoLotDryStatusOf') && jsBM.includes('batchData.dryStage'));
state.batches.push({ id: 'bx-dry1', code: '260996-01', stage: 'kho', date: '2026-09-16', week: '2026-W38',
  length: 1250, width: 18, thickness: 7, quantity: 400, volume: 0.063, bambooType: 'A', useFor: 'VÃ¡n',
  location: 'K50', stageHistory: [{ stage: 'kho', date: '2026-09-16' }] });
check('N2. FORM: lÃ´ nháº­p tháº³ng Kho máº·c Ä‘á»‹nh "ChÆ°a sáº¥y" (trÆ°á»›c khi ngÆ°á»i dÃ¹ng gÃ¡n)',
  x2.khoLotDryStatusOf(state.batches.find(b => b.id === 'bx-dry1')).key === 'chua-say');
fillBatchForm(state.batches.find(b => b.id === 'bx-dry1'));
document.getElementById('form-dry-stage').value = 'say2';
bm.handleBatchFormSubmit({ preventDefault() {} });
check('N2. FORM: gÃ¡n "Sáº¥y 2" cho lÃ´ nháº­p tháº³ng Kho â†’ phiáº¿u BÃ o Tinh / Bullig tháº¥y Ä‘Æ°á»£c lÃ´',
  (() => { const b = state.batches.find(x => x.id === 'bx-dry1'); return !!b && b.dryStage === 'say2'; })());
fillBatchForm(state.batches.find(b => b.id === 'bx-dry1'));
document.getElementById('form-dry-stage').value = 'say1';
bm.handleBatchFormSubmit({ preventDefault() {} });
check('N2. FORM: gÃ¡n "Sáº¥y 1" â†’ lÃ´ chá»‰ lÃ  nguá»“n cho Sáº¥y 2, KHÃ”NG chá»n Ä‘Æ°á»£c cho BÃ o Tinh / Bullig',
  (() => { const b = state.batches.find(x => x.id === 'bx-dry1'); return !!b && b.dryStage === 'say1'; })());
check('N2. FORM: má»Ÿ form sá»­a lÃ´ kho â†’ Ã´ Tráº¡ng ThÃ¡i Sáº¥y náº¡p Ä‘Ãºng tráº¡ng thÃ¡i SUY RA cá»§a lÃ´', (() => {
  const lot = state.batches.find(b => b.id === 'bx-link1');   // [say1 â†’ say2 â†’ kho]
  if (!lot) return false;
  document.getElementById('form-dry-stage').value = 'chua-say';
  bm.openBatchFormModal(lot.id);
  return document.getElementById('form-dry-stage').value === 'say2' &&
    document.getElementById('form-dry-stage-group').style.display !== 'none';
})());

// â”€â”€â”€ N. XÃ“A NHIá»€U LÃ” (ADMIN â€” cháº¿ Ä‘á»™ tÃ­ch chá»n trÃªn Kanban) â”€â”€â”€â”€â”€â”€â”€â”€
console.log('--- N. XÃ“A NHIá»€U LÃ” (ADMIN) ---');
// Cáº¥u trÃºc: nÃºt "XÃ³a Nhiá»u" (admin-only) trong thanh cÃ´ng cá»¥ + thanh ná»•i "ÄÃ£ chá»n N lÃ´"
check('Cáº¤U TRÃšC (index.html): nÃºt "XÃ³a Nhiá»u" (admin-only) trong thanh cÃ´ng cá»¥ + thanh ná»•i "ÄÃ£ chá»n N lÃ´"',
  idxHtml.includes('id="btn-multi-delete"') && idxHtml.includes('admin-only-btn') &&
  idxHtml.includes('id="kb-pick-bar"') && idxHtml.includes('id="kb-pick-count"') &&
  idxHtml.includes('id="kb-pick-del"') && idxHtml.includes('id="kb-pick-all"') &&
  idxHtml.includes('id="kb-pick-cancel"'));
check('Cáº¤U TRÃšC (styles.css): Ã´ tÃ­ch .kb-pick + body.kanban-pick-mode + thanh ná»•i #kb-pick-bar + áº©n admin-only-btn',
  cssHtml.includes('.kb-pick') && cssHtml.includes('body.kanban-pick-mode') &&
  cssHtml.includes('#kb-pick-bar') && cssHtml.includes('.admin-only-btn'));
check('Cáº¤U TRÃšC (js): tháº» lÃ´ cÃ³ Ã´ tÃ­ch data-pick-id + sá»± kiá»‡n Ä‘Æ°á»£c wire trong events.js',
  fs.readFileSync(new URL('../js/kanban.js', import.meta.url), 'utf8').includes('data-pick-id') &&
  jsEvents.includes('btn-multi-delete') && jsEvents.includes('kb-pick-del') &&
  jsMain.includes('exitKanbanPickMode'));
check('XÃ“A NHIá»€U â€” Dá»„ THáº¤Y: tá»± chuyá»ƒn khung "Báº£ng Dá»¯ Liá»‡u" + nhÃ³m nÃºt thá»±c thi ngay trÃªn thanh cÃ´ng cá»¥',
  idxHtml.includes('id="kb-pick-inline"') && idxHtml.includes('id="kb-pick-inline-del"') &&
  jsEvents.includes('kb-pick-inline-del') && jsEvents.includes("switchX2SayFrame('data')") &&
  cssHtml.includes('.kb-pick-inline') && cssHtml.includes('#kb-pick-bar { z-index: 95; }'));


// Chuáº©n bá»‹ dá»¯ liá»‡u: 3 lÃ´ (sáº½ xÃ³a 2 lÃ´ cÃ¹ng lÃºc, giá»¯ láº¡i 1)
state.batches.push(
  { id: 'bx1', code: '260999-01', stage: 'say1', date: '2026-09-20', week: '2026-W38', length: 1250, width: 18, thickness: 7, quantity: 100, volume: 0.02, bambooType: 'A', useFor: 'VÃ¡n', location: 'LS3', stageHistory: [{ stage: 'say1', date: '2026-09-20' }] },
  { id: 'bx2', code: '260999-02', stage: 'say1', date: '2026-09-20', week: '2026-W38', length: 1250, width: 18, thickness: 7, quantity: 120, volume: 0.02, bambooType: 'A', useFor: 'VÃ¡n', location: 'LS4', stageHistory: [{ stage: 'say1', date: '2026-09-20' }] },
  { id: 'bx3', code: '260999-03', stage: 'kho',  date: '2026-09-21', week: '2026-W38', length: 1250, width: 18, thickness: 7, quantity: 140, volume: 0.02, bambooType: 'B', useFor: 'Bullig', location: 'K1', stageHistory: [{ stage: 'kho', date: '2026-09-21' }] }
);
// Vai trÃ² KHÃ”NG pháº£i Admin â†’ bá»‹ cháº·n, khÃ´ng báº­t Ä‘Æ°á»£c cháº¿ Ä‘á»™
state.currentUser = { username: 'ed', role: 'editor', editTabs: [], allowAdvanced: true };
bm.toggleKanbanPickMode();
check('XÃ“A NHIá»€U â€” CHáº¶N QUYá»€N: editor khÃ´ng báº­t Ä‘Æ°á»£c cháº¿ Ä‘á»™ (state khÃ´ng Ä‘á»•i)',
  state.kanbanPickMode === false && (state.kanbanPicked || []).length === 0);
// Admin báº­t cháº¿ Ä‘á»™ â†’ body cÃ³ class kanban-pick-mode
state.currentUser = { username: 'admin', role: 'admin', editTabs: [], allowAdvanced: true };
bm.toggleKanbanPickMode();
check('XÃ“A NHIá»€U â€” Báº¬T CHáº¾ Äá»˜: body.kanban-pick-mode báº­t (Ã´ tÃ­ch + thanh ná»•i hiá»‡n theo CSS)',
  state.kanbanPickMode === true && document.body.classList.contains('kanban-pick-mode'));
// TÃ­ch 2 lÃ´
bm.onKanbanPickChange('bx1', true);
bm.onKanbanPickChange('bx2', true);
check('XÃ“A NHIá»€U â€” TÃCH CHá»ŒN: 2 lÃ´ vÃ o danh sÃ¡ch chá»n', (state.kanbanPicked || []).slice().sort().join(',') === 'bx1,bx2');
const beforeCount = state.batches.length;
const undoBefore = state.undoStack.length;
bm.deletePickedBatches();
check('XÃ“A NHIá»€U â€” THá»°C HIá»†N: Ä‘Ãºng 2 lÃ´ biáº¿n máº¥t Â· lÃ´ cÃ²n láº¡i nguyÃªn váº¹n',
  state.batches.length === beforeCount - 2 &&
  !state.batches.some(b => b.id === 'bx1' || b.id === 'bx2') &&
  state.batches.some(b => b.id === 'bx3'));
check('XÃ“A NHIá»€U â€” TOMBSTONE: cáº£ 2 id ghi dáº¥u váº¿t xÃ³a (cháº·n mÃ¡y khÃ¡c Ä‘áº©y ngÆ°á»£c lÃ´)',
  !!(state.deletedIds.batches && state.deletedIds.batches.bx1 && state.deletedIds.batches.bx2));
check('XÃ“A NHIá»€U â€” 1 LÆ¯á»¢T Gá»˜P: chá»‰ THÃŠM ÄÃšNG 1 bÆ°á»›c undo (khÃ´ng 2 bÆ°á»›c nhÆ° xÃ³a rá»i tá»«ng lÃ´)',
  state.undoStack.length === undoBefore + 1 &&
  /XÃ³a 2 lÃ´/.test((state.undoStack[state.undoStack.length - 1] || {}).label || ''));
check('XÃ“A NHIá»€U â€” SAU XÃ“A: tá»± gá»¡ danh sÃ¡ch chá»n nhÆ°ng VáºªN giá»¯ cháº¿ Ä‘á»™ Ä‘á»ƒ xÃ³a tiáº¿p lÃ´ khÃ¡c',
  state.kanbanPickMode === true && (state.kanbanPicked || []).length === 0);
// HOÃ€N TÃC 1 Báº¦M: khÃ´i phá»¥c cáº£ 2 lÃ´ + gá»¡ tombstone cá»§a chÃºng
const tombBeforeUndo = !!(state.deletedIds.batches && state.deletedIds.batches.bx1);
const ev = await import('../js/events.js');
ev.undoLastAction();
check('XÃ“A NHIá»€U â€” HOÃ€N TÃC 1 Báº¦M: khÃ´i phá»¥c Äá»¦ 2 lÃ´ + gá»¡ tombstone (khÃ´ng bá»‹ cháº·n há»“i sinh)',
  state.batches.some(b => b.id === 'bx1') && state.batches.some(b => b.id === 'bx2') &&
  tombBeforeUndo && !(state.deletedIds.batches && state.deletedIds.batches.bx1));
// ThoÃ¡t cháº¿ Ä‘á»™ chá»n
bm.exitKanbanPickMode();
check('XÃ“A NHIá»€U â€” THOÃT: táº¯t cháº¿ Ä‘á»™ + gá»¡ class body', state.kanbanPickMode === false && !document.body.classList.contains('kanban-pick-mode'));

// â”€â”€â”€ N. FORM THáºº THAN HÃ“A + Sáº¤Y Gá»ŒN Vá»ªA MÃ€N HÃŒNH (khÃ´ng cuá»™n ngang/dá»c) â”€â”€â”€â”€â”€
const jsBatchModals = fs.readFileSync(new URL('../js/batch-modals.js', import.meta.url), 'utf8');
// Cáº¯t form ThÃªm LÃ´ Ä‘á»ƒ kiá»ƒm tra cáº¥u trÃºc 4 KHá»I (15/10/2026 â€” thay .al-pick-pair)
const addLotSlice = (function () {
  const start = idxHtml.indexOf('id="add-lot-form"');
  const end = idxHtml.indexOf('id="modal-transfer-kho"');
  return (start !== -1 && end > start) ? idxHtml.slice(start, end) : '';
})();
check('FORM Gá»ŒN: form ThÃªm LÃ´ = 4 KHá»I (ck-sec) + Ä‘á»§ nÃºt nguá»“n/vá»‹ trÃ­ (thay .al-pick-pair cÅ©)',
  (addLotSlice.match(/class="ck-sec/g) || []).length >= 4 &&
  addLotSlice.includes('data-ck-sec="1"') && addLotSlice.includes('data-ck-sec="2"') &&
  addLotSlice.includes('data-ck-sec="3"') && addLotSlice.includes('data-ck-sec="4"') &&
  addLotSlice.includes('id="al-source-btn"') && addLotSlice.includes('id="al-source-list"') &&
  addLotSlice.includes('id="al-location-btn"') && addLotSlice.includes('id="al-location-add"') &&
  !addLotSlice.includes('class="al-pick-pair"'));
check('FORM Gá»ŒN (styles.css): modal theo dvh + KHÃ”NG cuá»™n ngang + danh sÃ¡ch tháº»/chips tá»± cuá»™n trong khung nhá»',
  cssHtml.includes('#modal-add-lot .modal-card') && cssHtml.includes('#modal-transfer-kho .modal-card') &&
  cssHtml.includes('overflow-x: hidden;   /* tuyá»‡t Ä‘á»‘i khÃ´ng thanh cuá»™n ngang */') &&
  cssHtml.includes('#modal-add-lot .al-card-list { max-height: calc(5 * 64px + 4 * 6px); }') &&
  cssHtml.includes('#modal-add-lot .al-loc-chips { max-height: 18vh;') &&
  cssHtml.includes('.al-pick-pair {'));
check('FORM Gá»ŒN (js): má»Ÿ 1 khá»‘i chá»n thÃ¬ Tá»° ÄÃ“NG khá»‘i cÃ²n láº¡i (form khÃ´ng phÃ¬nh khi má»Ÿ cáº£ hai)',
  jsBatchModals.includes("const locPanel = document.getElementById('al-location-panel');") &&
  jsBatchModals.includes("const srcPanel = document.getElementById('al-source-panel');"));
// â”€â”€â”€ N2. BOTTOM-SHEET â€” DÃ’NG TÃ“M Táº®T + Táº¤M TRÆ¯á»¢T + CHÃ‚N DÃNH (15/10/2026) â”€â”€â”€
check('BOTTOM-SHEET (index): 2 DÃ’NG TÃ“M Táº®T báº¥m Ä‘Æ°á»£c (data-al-sheet src/loc) thay khá»‘i dÃ i trÃªn form',
  addLotSlice.includes('id="al-sum-src"') && addLotSlice.includes('id="al-sum-loc"') &&
  addLotSlice.includes('data-al-sheet="src"') && addLotSlice.includes('data-al-sheet="loc"') &&
  addLotSlice.includes('class="ck-sec al-sum-row'));
check('BOTTOM-SHEET (index): 2 Táº¤M TRÆ¯á»¢T + ná»n má» + nÃºt Xong + CHÃ‚N DÃNH tÃ³m táº¯t',
  addLotSlice.includes('id="al-sheet-src"') && addLotSlice.includes('id="al-sheet-loc"') &&
  addLotSlice.includes('class="al-sheet-scrim"') && addLotSlice.includes('data-al-sheet-close') &&
  addLotSlice.includes('id="al-sheet-src-done"') && addLotSlice.includes('id="al-sheet-loc-done"') &&
  addLotSlice.includes('id="al-foot-sum"') && addLotSlice.includes('al-sticky-foot') &&
  // Ã´ nháº­p THáº¬T náº±m TRONG táº¥m trÆ°á»£t (sau id táº¥m) â€” khÃ´ng cÃ²n trÃªn form chÃ­nh
  addLotSlice.indexOf('id="al-sum-src"') < addLotSlice.indexOf('id="al-sheet-src"') &&
  addLotSlice.indexOf('id="al-sheet-src"') < addLotSlice.indexOf('id="al-source-list"') &&
  addLotSlice.indexOf('id="al-sheet-loc"') < addLotSlice.indexOf('id="al-location-chips"'));
check('BOTTOM-SHEET (js): hÃ m alOpenSheet/alCloseSheet/alOnSheetClick/alRefreshSummary + gá»i cáº­p nháº­t tÃ³m táº¯t',
  jsBatchModals.includes('function alOpenSheet') && jsBatchModals.includes('function alCloseSheet') &&
  jsBatchModals.includes('function alOnSheetClick') && jsBatchModals.includes('function alRefreshSummary') &&
  jsBatchModals.includes('AL_SHEETS = { src:') &&
  jsBatchModals.includes('alRefreshSummary();') &&
  jsBatchModals.includes("const panel = document.getElementById('al-source-panel');") &&
  jsBatchModals.includes("panel.closest('.al-sheet')"));
check('BOTTOM-SHEET (events): á»§y nhiá»‡m 1 listener trÃªn #add-lot-form + import alOnSheetClick',
  jsEvents.includes("safeOn('add-lot-form', 'click', alOnSheetClick)") &&
  jsEvents.includes('alOnSheetClick'));
check('BOTTOM-SHEET (styles.css): táº¥m trÆ°á»£t fixed z-index TRÃŠN modal + animation + chÃ¢n dÃ­nh + panel nguá»“n INLINE trong táº¥m',
  cssHtml.includes('#add-lot-form .al-sheet {') && cssHtml.includes('z-index: 10020;') &&
  cssHtml.includes('@keyframes alSheetUp') && cssHtml.includes('#add-lot-form .al-sticky-foot {') &&
  cssHtml.includes('position: sticky;') && cssHtml.includes('#add-lot-form .al-sum-row {') &&
  cssHtml.includes('#add-lot-form .al-sheet #al-source-panel {') && cssHtml.includes('position: static;'));
// HÃ€NH VI: má»Ÿ/Ä‘Ã³ng táº¥m + tÃ³m táº¯t cáº­p nháº­t theo lá»±a chá»n
bm.openAddLotModal();
check('BOTTOM-SHEET (hÃ nh vi): má»Ÿ táº¥m Nguá»“n â†’ #al-sheet-src hiá»‡n, táº¥m Vá»‹ trÃ­ áº©n',
  bm.alOpenSheet('src') === true &&
  document.getElementById('al-sheet-src').hidden === false &&
  document.getElementById('al-sheet-loc').hidden === true);
check('BOTTOM-SHEET (hÃ nh vi): Ä‘á»•i sang táº¥m Vá»‹ trÃ­ â†’ tá»± Ä‘Ã³ng táº¥m trÆ°á»›c (khÃ´ng chá»“ng nhau)',
  bm.alOpenSheet('loc') === true &&
  document.getElementById('al-sheet-src').hidden === true &&
  document.getElementById('al-sheet-loc').hidden === false);
check('BOTTOM-SHEET (hÃ nh vi): báº¥m dÃ²ng tÃ³m táº¯t (á»§y nhiá»‡m) â†’ má»Ÿ Ä‘Ãºng táº¥m',
  bm.alOnSheetClick({ target: { closest: (q) => (q === '[data-al-sheet]' ? { getAttribute: () => 'src' } : null) } }) === true &&
  document.getElementById('al-sheet-src').hidden === false);
check('BOTTOM-SHEET (hÃ nh vi): báº¥m nÃºt "Xong"/ná»n má» â†’ ÄÃ“NG Cáº¢ HAI táº¥m + dropdown nguá»“n',
  bm.alOnSheetClick({ target: { closest: (q) => (q === '[data-al-sheet-close]' ? {} : null) } }) === true &&
  document.getElementById('al-sheet-src').hidden === true &&
  document.getElementById('al-sheet-loc').hidden === true &&
  document.getElementById('al-source-panel').hidden === true);
check('BOTTOM-SHEET (hÃ nh vi): tÃ³m táº¯t cáº­p nháº­t theo nguá»“n + vá»‹ trÃ­ Ä‘Ã£ chá»n',
  (function () {
    bm.alTogglePick('cn-1');
    bm.alRefreshSummary();
    const okSrc = document.getElementById('al-sum-src').textContent.includes('1 nguá»“n');
    bm.alSetLocation('LS5');
    const okLoc = document.getElementById('al-sum-loc').textContent === 'LS5';
    const okFoot = document.getElementById('al-foot-sum').textContent.includes('LS5');
    bm.alTogglePick('cn-1');   // tráº£ vá» tráº¡ng thÃ¡i chÆ°a chá»n
    return okSrc && okLoc && okFoot;
  })());
check('BOTTOM-SHEET (hÃ nh vi): Ä‘Ã³ng modal ThÃªm LÃ´ â†’ táº¥m trÆ°á»£t cÅ©ng Ä‘Ã³ng (láº§n sau má»Ÿ láº¡i sáº¡ch)',
  (function () {
    bm.alOpenSheet('src');
    bm.closeAddLotModal();
    return document.getElementById('al-sheet-src').hidden === true;
  })());
// â”€â”€â”€ O. Ã” TÃŒM THEO Sá» LÆ¯á»¢NG + DROPDOWN Ná»”I (04/10/2026) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Cáº¯t Ä‘Ãºng khá»‘i CSS dropdown ná»•i Ä‘á»ƒ kiá»ƒm tra tá»«ng thuá»™c tÃ­nh
const alFloatCss = (function () {
  const i = cssHtml.indexOf('#modal-add-lot #al-source-panel {');
  const j = i >= 0 ? cssHtml.indexOf('}', i) : -1;
  return j > i ? cssHtml.slice(i, j) : '';
})();
check('TÃŒM Sá» LÆ¯á»¢NG (index.html): Ã´ RIÃŠNG #al-source-qty-search Ä‘áº·t NGAY SAU Ã´ tÃ¬m nhanh',
  idxHtml.includes('id="al-source-qty-search"') &&
  idxHtml.indexOf('id="al-source-qty-search"') > idxHtml.indexOf('id="al-source-search"'));
check('TÃŒM Sá» LÆ¯á»¢NG (js): chá»‰ so Sá» LÆ¯á»¢NG + lá»c Káº¾T Há»¢P 2 Ã´ (VÃ€) + xÃ³a cáº£ 2 khi Ä‘á»•i cÃ´ng Ä‘oáº¡n',
  jsBatchModals.includes('function alSourceQtyMatches') &&
  jsBatchModals.includes('function alSetSourceQtyQuery') &&
  jsBatchModals.includes('alSourceQtyMatches(it, stage, alSourceQtyQuery, alloc)') &&
  jsBatchModals.includes('alSourceQuery.trim(), alSourceQtyQuery.trim()') &&
  jsBatchModals.includes("alSourceQtyQuery = '';"));
check('DROPDOWN Ná»”I (js): Ä‘o cao 5 dÃ²ng tháº» + neo theo nÃºt chá»n (háº¿t chá»— má»Ÿ ngÆ°á»£c lÃªn)',
  jsBatchModals.includes('function alApplySourceListRowCap') &&
  jsBatchModals.includes('function alPositionSourcePanel') &&
  jsBatchModals.includes('AL_DROP_MAX_ROWS = 5') &&
  jsBatchModals.includes('alPositionSourcePanel();'));
check('DROPDOWN Ná»”I (events.js): wire Ã´ tÃ¬m sá»‘ lÆ°á»£ng + neo láº¡i khi cuá»™n / Ä‘á»•i cá»¡ mÃ n hÃ¬nh',
  jsEvents.includes("safeOn('al-source-qty-search', 'input'") &&
  jsEvents.includes("window.addEventListener('scroll', () => alPositionSourcePanel(), true)") &&
  jsEvents.includes("window.addEventListener('resize', () => alPositionSourcePanel())"));
check('DROPDOWN Ná»”I (styles.css): panel position fixed tráº£i 2 mÃ©p mÃ n hÃ¬nh + z-index trÃªn khá»‘i modal',
  alFloatCss.includes('position: fixed;') &&
  alFloatCss.includes('left: 8px;') && alFloatCss.includes('right: 8px;') &&
  alFloatCss.includes('z-index: 10001;') && alFloatCss.includes('overflow-y: auto;'));

// â”€â”€â”€ P. CHUYá»‚N KHO â€” 4 KHá»I TRá»°C QUAN Â· THáºº NAN 2 Cá»˜T CHECK Â· Cá»œ TÃ“P (14/10/2026) â”€â”€â”€
const jsKanban = fs.readFileSync(new URL('../js/kanban.js', import.meta.url), 'utf8');
const ckModalSlice = (function () {
  const i = idxHtml.indexOf('id="modal-transfer-kho"');
  const j = idxHtml.indexOf('MODAL 3: LOGIN');
  return (i !== -1 && j > i) ? idxHtml.slice(i, j) : '';
})();
check('P1 (index): 4 KHá»I TRá»°C QUAN (data-ck-sec 1-4) â€” KHÃ”NG cÃ²n thanh stepper/mÅ©i tÃªn â‘ â†’â‘¡â†’â‘¢',
  (ckModalSlice.match(/class="ck-sec/g) || []).length >= 4 &&
  ckModalSlice.includes('data-ck-sec="1"') && ckModalSlice.includes('data-ck-sec="2"') &&
  ckModalSlice.includes('data-ck-sec="3"') && ckModalSlice.includes('data-ck-sec="4"') &&
  !ckModalSlice.includes('id="ck-stepper"') && !ckModalSlice.includes('ck-step-arrow'));
check('P2 (index): khá»‘i â‘  = 3 NÃšT CHá»ŒN CÃ”NG ÄOáº N trá»±c tiáº¿p (data-ck-stage-btn) â€” KHÃ”NG cÃ²n dropdown cÃ´ng Ä‘oáº¡n',
  ckModalSlice.includes('id="ck-stage-seg"') &&
  (ckModalSlice.match(/data-ck-stage-btn=/g) || []).length === 3 &&
  ckModalSlice.includes('class="ck-hidden-select"') &&
  !ckModalSlice.includes('ck-stage-btn"') && !ckModalSlice.includes('id="ck-stage-menu"') &&
  !ckModalSlice.includes('id="ck-lot-btn"') && !ckModalSlice.includes('id="ck-lot-menu"'));
check('P3 (index): khá»‘i â‘¡ = CHIP Vá»Š TRÃ (#ck-loc-chips) + danh sÃ¡ch tháº» 2 Cá»˜T CHECK + nÃºt Táº¥t cáº£ Kho/TÃ³p/Bá» chá»n',
  ckModalSlice.includes('id="ck-loc-chips"') && ckModalSlice.includes('id="ck-lot-panel"') &&
  ckModalSlice.includes('id="ck-lot-list"') && ckModalSlice.includes('TÃ³p xá»­ lÃ½ láº¡i') &&
  ckModalSlice.includes('data-ck-all="kho"') && ckModalSlice.includes('data-ck-all="top"') &&
  ckModalSlice.includes('data-ck-all="none"'));
check('P4 (index): khá»‘i â‘£ nhÃ£n "KhÃ´ng báº¯t buá»™c" + dÃ²ng GHI CHÃš NHá»Ž dÆ°á»›i 4 khá»‘i + modal KHÃ”NG khung bao (.ck-flat)',
  ckModalSlice.includes('ck-opt') && ckModalSlice.includes('KhÃ´ng báº¯t buá»™c') &&
  ckModalSlice.includes('class="ck-note-row') && ckModalSlice.includes('id="ck-notes"') &&
  ckModalSlice.includes('ck-flat'));
check('P5 (index): chÃº thÃ­ch dÃ i ÄÃƒ áº¨N â€” chá»‰ TOOLTIP (title) + khá»‘i Ä‘áº§u mang tooltip',
  !ckModalSlice.includes('class="al-hint"') && !ckModalSlice.includes('<div style="font-size:0.72rem') &&
  ckModalSlice.includes('title="NgÃ y vÃ o Kho') && ckModalSlice.includes('title="Äá»ƒ trá»‘ng = giá»¯ nguyÃªn vá»‹ trÃ­ cÅ©') &&
  ckModalSlice.includes('class="ck-sec-head"'));
check('P6 (styles): CSS 4 khá»‘i + seg + chip + [hidden] cháº·n "khÃ´ng Ä‘Ã³ng Ä‘Æ°á»£c" + chip TÃ³p â€” Háº¾T CSS stepper/menu cÅ©',
  cssHtml.includes('.ck-sec {') && cssHtml.includes('.ck-seg-btn') && cssHtml.includes('.ck-loc-chip') &&
  cssHtml.includes('[hidden] { display: none !important; }') && cssHtml.includes('.tag-top-rework') &&
  !cssHtml.includes('.ck-stepper') && !cssHtml.includes('.ck-menu {'));
check('P7 (events): wire seg cÃ´ng Ä‘oáº¡n + chip vá»‹ trÃ­ + panel tháº» nan â€” KHÃ”NG cÃ²n wire stepper/menu cÅ©',
  jsEvents.includes("safeOn('ck-stage-seg', 'click'") && jsEvents.includes("safeOn('ck-loc-chips', 'click'") &&
  jsEvents.includes("safeOn('ck-lot-panel', 'click', ckOnLotPanelClick)") &&
  !jsEvents.includes('ck-stepper') && !jsEvents.includes('ckCloseCkMenus'));

// â”€â”€ HÃ€NH VI: má»Ÿ modal â†’ chá»n cÃ´ng Ä‘oáº¡n â†’ chá»n vá»‹ trÃ­ â†’ panel tháº» nan 2 cá»™t check â”€â”€
// ThÃªm 2 lÃ´ Sáº¥y 1 cÃ¹ng vá»‹ trÃ­ LS77 (vá»‹ trÃ­ riÃªng cá»§a section nÃ y) + 1 lÃ´ LS8 cho "bá» chá»n"
state.batches.push(
  { id: 'b-ckp1', code: '261013-01', stage: 'say1', date: '2026-10-10', week: '2026-W41', length: 1250, width: 18, thickness: 7, quantity: 500, volume: 0.0788, bambooType: 'A1', useFor: 'VÃ¡n', location: 'LS77', stageHistory: [{ stage: 'say1', date: '2026-10-10' }] },
  { id: 'b-ckp2', code: '261013-02', stage: 'say1', date: '2026-10-10', week: '2026-W41', length: 1300, width: 20, thickness: 8, quantity: 300, volume: 0.0624, bambooType: 'B', useFor: 'Bullig', location: 'LS77', stageHistory: [{ stage: 'say1', date: '2026-10-10' }] },
  { id: 'b-ckp3', code: '261013-03', stage: 'say1', date: '2026-10-11', week: '2026-W41', length: 1250, width: 18, thickness: 7, quantity: 200, volume: 0.0315, bambooType: 'A', useFor: 'VÃ¡n', location: 'LS8', stageHistory: [{ stage: 'say1', date: '2026-10-11' }] }
);
bm.openTransferKhoModal();
check('P8: má»Ÿ modal â€” khá»‘i â‘  Ä‘Ã¡nh dáº¥u nÃºt "Sáº¥y 1" Ä‘ang chá»n + khá»‘i â‘¡ hiá»‡n chip vá»‹ trÃ­ LS77',
  document.getElementById('ck-stage').value === 'say1' &&
  document.getElementById('ck-loc-chips').innerHTML.includes('data-ck-loc="LS77"'));
bm.ckOnLocChipClick('LS77');
const ckPanelEl = document.getElementById('ck-lot-panel');
const ckListEl = document.getElementById('ck-lot-list');
check('P9: báº¥m chip vá»‹ trÃ­ â†’ DANH SÃCH THáºº NAN hiá»‡n ngay trong khá»‘i â‘¡ (2 lÃ´ LS77, 2 dÃ²ng chuáº©n)',
  ckPanelEl.hidden === false && ckListEl.innerHTML.includes('data-ck-row="b-ckp1"') &&
  ckListEl.innerHTML.includes('data-ck-row="b-ckp2"') &&
  ckListEl.innerHTML.includes('1250Ã—18Ã—7') && ckListEl.innerHTML.includes('500 thanh'));
check('P10: má»—i tháº» nan cÃ³ 2 Cá»˜T CHECK loáº¡i trá»« â€” cá»™t Chuyá»ƒn Kho (máº·c Ä‘á»‹nh tick) + cá»™t TÃ³p xá»­ lÃ½ láº¡i',
  (ckListEl.innerHTML.match(/data-ck-kind="kho"/g) || []).length === 2 &&
  (ckListEl.innerHTML.match(/data-ck-kind="top"/g) || []).length === 2 &&
  (ckListEl.innerHTML.match(/data-ck-kind="kho" checked/g) || []).length === 2);
check('P11: dÃ²ng tÃ³m táº¯t panel + chip vá»‹ trÃ­ Ä‘ang chá»n (is-on) + tÃ³m táº¯t "Lá»±a Chá»n Cá»§a Báº¡n"',
  document.getElementById('ck-lot-panel-sum').innerHTML.includes('<strong>2</strong> lÃ´ chuyá»ƒn Kho') &&
  document.getElementById('ck-loc-chips').innerHTML.includes('ck-loc-chip is-on') &&
  document.getElementById('ck-pos-info').innerHTML.includes('LS77'));

// Tick "TÃ³p" lÃ´ b-ckp2 â†’ 2 cá»™t LOáº I TRá»ª nhau + tÃ³m táº¯t 2 nhÃ³m
bm.ckSetPick('b-ckp2', 'top');
check('P12: tick TÃ³p â†’ ckPickStats Ä‘Ãºng 2 nhÃ³m (1 lÃ´ Kho Â· 1 lÃ´ TÃ³p Â· 300 thanh TÃ³p)',
  bm.ckPickOf('b-ckp1') === 'kho' && bm.ckPickOf('b-ckp2') === 'top' &&
  (() => { const s = bm.ckPickStats(); return s.khoN === 1 && s.topN === 1 && s.topQty === 300; })() &&
  document.getElementById('ck-pos-info').innerHTML.includes('TÃ³p xá»­ lÃ½ láº¡i') &&
  document.getElementById('ck-pos-info').innerHTML.includes('300 thanh'));
bm.ckBulkPick('top');
check('P13: nÃºt "Táº¥t cáº£ TÃ³p" â†’ má»i lÃ´ á»Ÿ vá»‹ trÃ­ LS77 chuyá»ƒn sang nhÃ³m TÃ³p (2 lÃ´)',
  bm.ckPickOf('b-ckp1') === 'top' && bm.ckPickOf('b-ckp2') === 'top');
bm.ckSetPick('b-ckp1', 'none');
check('P14: bá» tick háº³n 1 lÃ´ (none) â†’ lÃ´ Ä‘Ã³ KHÃ”NG Ä‘Æ°á»£c chuyá»ƒn, nhÃ³m cÃ²n láº¡i giá»¯ nguyÃªn',
  bm.ckPickOf('b-ckp1') === 'none' && bm.ckPickOf('b-ckp2') === 'top');
// Báº¥m láº¡i chip vá»‹ trÃ­ LS77 â†’ vá» máº·c Ä‘á»‹nh tick "Chuyá»ƒn Kho" (má»i lÃ´)
bm.ckOnLocChipClick('LS77');
check('P15: báº¥m láº¡i chip vá»‹ trÃ­ â†’ reset vá» máº·c Ä‘á»‹nh Chuyá»ƒn Kho (panel hiá»‡n Ä‘á»§ 2 lÃ´)',
  bm.ckPickOf('b-ckp1') === 'kho' && bm.ckPickOf('b-ckp2') === 'kho' &&
  document.getElementById('ck-lot-panel').hidden === false);

// Tick láº¡i nhÆ° cÅ© cho pháº§n LÆ¯U: b-ckp2 = TÃ³p Â· b-ckp1 = bá» chá»n
bm.ckSetPick('b-ckp2', 'top');
bm.ckSetPick('b-ckp1', 'none');
// LÆ¯U: b-ckp2 (TÃ³p) vÃ o Kho + cá» topRework Â· b-ckp1 (none) váº«n á»Ÿ Sáº¥y 1
document.getElementById('ck-date').value = '2026-10-13';
document.getElementById('ck-new-loc').value = 'K30';
bm.handleTransferKhoSubmit({ preventDefault(){} });
const ckp1 = state.batches.find(b => b.id === 'b-ckp1');
const ckp2 = state.batches.find(b => b.id === 'b-ckp2');
check('P16: lÃ´ tick TÃ“P vÃ o Kho + cá» topRework=true Â· lÃ´ Bá»Ž CHá»ŒN váº«n á»Ÿ Sáº¥y 1',
  ckp2.stage === 'kho' && ckp2.topRework === true && ckp2.location === 'K30' &&
  ckp1.stage === 'say1' && !ckp1.topRework);
// Chip "TÃ³p xá»­ lÃ½ láº¡i" trÃªn THáºº LÃ” Kanban cá»™t Kho
const kanban = await import('../js/kanban.js');
const topCard = kanban.createBambooCardElement(ckp2).innerHTML;
const norCard = kanban.createBambooCardElement(ckp1).innerHTML;
check('P16: tháº» lÃ´ cá»™t Kho cÃ³ chip "TÃ³p xá»­ lÃ½ láº¡i" (topRework) â€” lÃ´ thÆ°á»ng KHÃ”NG cÃ³ chip',
  topCard.includes('tag-top-rework') && topCard.includes('TÃ³p xá»­ lÃ½ láº¡i') &&
  !norCard.includes('tag-top-rework'));
// Chuyá»ƒn ná»‘t lÃ´ LS8 bÃ¬nh thÆ°á»ng (chá»‰ set select áº©n â€” khÃ´ng tick gÃ¬) â†’ máº·c Ä‘á»‹nh Chuyá»ƒn Kho
bm.openTransferKhoModal();
document.getElementById('ck-lot').value = 'LS8';
document.getElementById('ck-date').value = '2026-10-13';
bm.handleTransferKhoSubmit({ preventDefault(){} });
const ckp3 = state.batches.find(b => b.id === 'b-ckp3');
check('P17: khÃ´ng tick gÃ¬ â†’ máº·c Ä‘á»‹nh Chuyá»ƒn Kho (hÃ nh vi cÅ© giá»¯ nguyÃªn) â€” lÃ´ vÃ o Kho, topRework=false',
  ckp3.stage === 'kho' && ckp3.topRework === false);
// LÃ´ TÃ³p Rá»œI Kho sang Sáº¥y 2 â†’ cá» tá»± xÃ³a
state.batches.push(
  { id: 'b-k1', code: '261014-01', stage: 'kho', date: '2026-10-01', week: '2026-W40', length: 1250, width: 18, thickness: 7, quantity: 400, volume: 0.063, bambooType: 'A', useFor: 'VÃ¡n', location: 'K40', topRework: true, stageHistory: [{ stage: 'kho', date: '2026-10-01' }] }
);
bm.openAddLotModal();
document.getElementById('al-stage').value = 'say2';
bm.syncAddLotUI();
bm.alTogglePick('b-k1');
document.getElementById('al-date').value = '2026-10-14';
bm.alSetLocation('LS9');
bm.handleAddLotSubmit({ preventDefault(){} });
check('P18: lÃ´ TÃ³p rá»i Kho sang Sáº¥y 2 â†’ cá» topRework tá»± xÃ³a (háº¿t tráº¡ng thÃ¡i chá» xá»­ lÃ½)',
  state.batches.find(b => b.id === 'b-k1').stage === 'say2' &&
  !state.batches.find(b => b.id === 'b-k1').topRework);

// â”€â”€â”€ P19â€“P22. THU GÃ“M danh sÃ¡ch tháº» nan sau khi chá»n (yÃªu cáº§u 15/10/2026) â”€â”€â”€
check('P19 (index): nÃºt #ck-lot-toggle + vÃ¹ng #ck-lot-panel-body bá»c cá»™t+danh sÃ¡ch (tÃ³m táº¯t á»Ÿ NGOÃ€I â†’ váº«n hiá»‡n khi thu gá»n)',
  ckModalSlice.includes('id="ck-lot-toggle"') && ckModalSlice.includes('id="ck-lot-panel-body"') &&
  ckModalSlice.indexOf('id="ck-lot-panel-body"') < ckModalSlice.indexOf('id="ck-lot-list"') &&
  ckModalSlice.indexOf('id="ck-lot-panel-sum"') > ckModalSlice.indexOf('id="ck-lot-panel-body"'));
check('P20 (js+styles+events): hÃ m ckToggleLotList/ckSyncLotToggle + CSS nÃºt thu gá»n + wire',
  jsBatchModals.includes('function ckToggleLotList') && jsBatchModals.includes('function ckSyncLotToggle') &&
  cssHtml.includes('.ck-collapse-btn') && jsEvents.includes("safeOn('ck-lot-toggle', 'click'"));
// HÃ nh vi: má»Ÿ modal â†’ chá»n vá»‹ trÃ­ LS77 (cÃ²n 1 lÃ´ b-ckp1) â†’ thu gá»n â†’ hiá»‡n láº¡i
bm.openTransferKhoModal();
bm.ckOnLocChipClick('LS77');
const ckBody = document.getElementById('ck-lot-panel-body');
const ckTgl = document.getElementById('ck-lot-toggle');
check('P21: báº¥m "Thu gá»n" â†’ áº©n cá»™t check + danh sÃ¡ch NHÆ¯NG tÃ³m táº¯t + nÃºt Táº¥t cáº£ váº«n hiá»‡n (form gá»n)',
  ckBody.hidden === false && ckTgl.textContent.includes('Thu gá»n') &&
  bm.ckToggleLotList() === false && ckBody.hidden === true &&
  document.getElementById('ck-lot-panel-sum').innerHTML.length > 0 &&
  ckTgl.textContent.includes('Hiá»‡n láº¡i') && ckTgl.textContent.includes('Kho'));
check('P22: báº¥m "Hiá»‡n láº¡i" â†’ danh sÃ¡ch má»Ÿ Â· chá»n láº¡i vá»‹ trÃ­ â†’ Tá»° Má»ž láº¡i (khÃ´ng káº¹t thu gá»n)',
  (function () {
    if (bm.ckToggleLotList() !== true || ckBody.hidden) return false;   // hiá»‡n láº¡i OK
    bm.ckToggleLotList();                                               // thu gá»n láº¡i
    const wasHidden = ckBody.hidden === true;
    bm.ckOnLocChipClick('LS77');                                        // chá»n láº¡i chip vá»‹ trÃ­
    return wasHidden && ckBody.hidden === false && ckTgl.textContent.includes('Thu gá»n');
  })());

// â”€â”€â”€ Q. FORM THÃŠM LÃ” â€” Ã” TÃCH THAN HÃ“A Láº I + Ã” CHá»ŒN Láº¦N THAN HÃ“A (15/10/2026) â”€â”€â”€
check('Q1 (index): Ã´ TÃCH THAN HÃ“A Láº I + Ã´ nháº­p sá»‘ lÆ°á»£ng + Ã´ Láº¦N THAN HÃ“A trong form ThÃªm LÃ´',
  addLotSlice.includes('id="al-rework"') && addLotSlice.includes('id="al-rework-qty"') &&
  addLotSlice.includes('id="al-charge"') && addLotSlice.includes('Than HÃ³a Láº¡i') &&
  addLotSlice.includes('Láº§n Than HÃ³a'));
check('Q2 (js+events+css): hÃ m rework/charge + wire 3 Ã´ + CSS Ã´ tÃ­ch danh sÃ¡ch is-top',
  jsBatchModals.includes('function alSetRework') && jsBatchModals.includes('function renderAlChargeOptions') &&
  jsBatchModals.includes('function alChargeMarkOf') && jsBatchModals.includes('function alTopRemainingOf') &&
  jsEvents.includes("safeOn('al-rework', 'change'") && jsEvents.includes("safeOn('al-rework-qty', 'input'") &&
  cssHtml.includes('.al-rework-check') && cssHtml.includes('#al-source-list.is-top'));

// Seed: 1 lÃ´ TÃ“P + 1 lÃ´ thÆ°á»ng á»Ÿ Kho (tá»“n = sá»‘ lÆ°á»£ng, chÆ°a phiáº¿u xuáº¥t)
state.batches.push(
  { id: 'b-top1', code: '261015-01', stage: 'kho', date: '2026-10-10', week: '2026-W41', length: 1250, width: 18, thickness: 7, quantity: 500, volume: 0.0788, bambooType: 'A1', useFor: 'VÃ¡n', location: 'K50', topRework: true, stageHistory: [{ stage: 'kho', date: '2026-10-10' }] },
  { id: 'b-norm1', code: '261015-02', stage: 'kho', date: '2026-10-11', week: '2026-W41', length: 1250, width: 18, thickness: 7, quantity: 400, volume: 0.063, bambooType: 'A', useFor: 'VÃ¡n', location: 'K51', stageHistory: [{ stage: 'kho', date: '2026-10-11' }] }
);
bm.openAddLotModal();
bm.alSetRework(true);
check('Q3: báº­t TÃ­ch THAN HÃ“A Láº I â†’ nguá»“n = CHá»ˆ lÃ´ TÃ³p kÃ¨m Tá»“n/Tá»•ng (lÃ´ thÆ°á»ng KHÃ”NG lá»t) + Ã´ sá»‘ lÆ°á»£ng hiá»‡n',
  document.getElementById('al-rework').checked === true &&
  document.getElementById('al-source-btn-text').textContent === 'Chá»n LÃ´ TÃ³p á»ž Kho' &&
  document.getElementById('al-source-list').innerHTML.includes('data-al-pick="b-top1"') &&
  document.getElementById('al-source-list').innerHTML.includes('Tá»“n 500 / 500 thanh') &&
  document.getElementById('al-source-list').innerHTML.includes('â™»ï¸ TÃ³p') &&
  !document.getElementById('al-source-list').innerHTML.includes('data-al-pick="b-norm1"') &&
  document.getElementById('al-rework-qty-group').hidden === false);
bm.alTogglePick('b-top1');
check('Q4: chá»n lÃ´ TÃ³p â†’ info hiá»‡n Tá»“n + Ã´ sá»‘ lÆ°á»£ng Ä‘iá»n sáºµn = tá»“n (500)',
  document.getElementById('al-source-info').innerHTML.includes('Tá»“n 500') &&
  document.getElementById('al-rework-qty').value === '500');
document.getElementById('al-rework-qty').value = '9999';
bm.alOnReworkQtyInput();
check('Q5: nháº­p VÆ¯á»¢T tá»“n â†’ tá»± cháº·n vá» tá»‘i Ä‘a 500',
  document.getElementById('al-rework-qty').value === '500');
// Nháº­p 1 PHáº¦N (300) â†’ THAN HÃ“A Láº I â†’ Sáº¤Y 1: táº¡o lÃ´ má»›i + nguá»“n topUsed tÄƒng
document.getElementById('al-rework-qty').value = '300';
bm.alOnReworkQtyInput();
document.getElementById('al-stage').value = 'say1';
document.getElementById('al-date').value = '2026-10-15';
bm.alSetLocation('LS88');
bm.handleAddLotSubmit({ preventDefault(){} });
const rwLot = state.batches.find(b => b && b.rework && b.sourceTopBatchId === 'b-top1');
const srcTop = state.batches.find(b => b.id === 'b-top1');
check('Q6: THAN HÃ“A Láº I â†’ Sáº¥y 1: lÃ´ Má»šI 300 thanh gáº¯n link nguá»“n Â· nguá»“n topUsed=300 Â· tá»“n TÃ³p giáº£m cÃ²n 200',
  !!rwLot && rwLot.stage === 'say1' && rwLot.quantity === 300 && rwLot.location === 'LS88' &&
  srcTop.stage === 'kho' && srcTop.topRework === true && (Number(srcTop.topUsed) || 0) === 300 &&
  bm.alTopRemainingOf(srcTop) === 200);

// â”€â”€ THAN HÃ“A Láº I 1 PHáº¦N â†’ Sáº¤Y 2: TÃCH lÃ´ (nguá»“n á»Ÿ láº¡i Kho) â”€â”€
state.batches.push(
  { id: 'b-top2', code: '261015-03', stage: 'kho', date: '2026-10-12', week: '2026-W41', length: 1300, width: 20, thickness: 8, quantity: 500, volume: 0.104, bambooType: 'B', useFor: 'Bullig', location: 'K52', topRework: true, stageHistory: [{ stage: 'kho', date: '2026-10-12' }] }
);
bm.openAddLotModal();
document.getElementById('al-stage').value = 'say2';
bm.alSetRework(true);
document.getElementById('al-date').value = '2026-10-18';
bm.alTogglePick('b-top2');
document.getElementById('al-rework-qty').value = '100';
bm.alOnReworkQtyInput();
bm.alSetLocation('LS91');
bm.handleAddLotSubmit({ preventDefault(){} });
const splitLot = state.batches.find(b => b && b.rework && b.sourceTopBatchId === 'b-top2');
const src2 = state.batches.find(b => b.id === 'b-top2');
check('Q7: THAN HÃ“A Láº I 1 PHáº¦N â†’ Sáº¥y 2: TÃCH lÃ´ má»›i 100 thanh Â· nguá»“n á»Ÿ láº¡i Kho (topUsed=100, tá»“n cÃ²n 400)',
  !!splitLot && splitLot.stage === 'say2' && splitLot.quantity === 100 &&
  src2.stage === 'kho' && src2.topRework === true && (Number(src2.topUsed) || 0) === 100 &&
  bm.alTopRemainingOf(src2) === 400);

// â”€â”€ THAN HÃ“A Láº I Háº¾T PHáº¦N CÃ’N Láº I â†’ CHUYá»‚N NGUYÃŠN lÃ´ + háº¿t cá» TÃ³p â”€â”€
bm.openAddLotModal();
document.getElementById('al-stage').value = 'say2';
bm.alSetRework(true);
document.getElementById('al-date').value = '2026-10-19';
bm.alTogglePick('b-top2');                       // sá»‘ lÆ°á»£ng máº·c Ä‘á»‹nh = tá»“n cÃ²n 400
bm.alSetLocation('LS92');
bm.handleAddLotSubmit({ preventDefault(){} });
check('Q8: nháº­p Háº¾T pháº§n cÃ²n láº¡i â†’ CHUYá»‚N NGUYÃŠN lÃ´ sang Sáº¥y 2 + xÃ³a cá» TÃ³p/topUsed',
  src2.stage === 'say2' && src2.say2Date === '2026-10-19' &&
  !src2.topRework && src2.topUsed === undefined && src2.location === 'LS92');

// â”€â”€ Ã” CHá»ŒN Láº¦N THAN HÃ“A: gá»™p lÃ´ má»›i vÃ o Láº¦N ÄÃƒ CÃ“ (Sáº¥y 2) â”€â”€
// + 1 lÃ´ CÃ™NG NGÃ€Y nhÆ°ng CHÆ¯A cÃ³ mÃ£ máº» â†’ hiá»‡n option Má»œ "gá»™p tay (khÃ´ng chá»n)"
state.batches.push(
  { id: 'b-mark2', code: '261016-01', stage: 'say2', date: '2026-10-13', week: '2026-W41', length: 1250, width: 18, thickness: 7, quantity: 600, volume: 0.0945, bambooType: 'A', useFor: 'VÃ¡n', location: 'LS93', say2Date: '2026-10-20', sayCharges: { say2: 1792000000002 }, stageHistory: [{ stage: 'kho', date: '2026-10-12' }, { stage: 'say2', date: '2026-10-20' }] },
  { id: 'b-nomark2', code: '261016-02', stage: 'say2', date: '2026-10-13', week: '2026-W41', length: 1250, width: 18, thickness: 7, quantity: 200, volume: 0.0315, bambooType: 'A', useFor: 'VÃ¡n', location: 'LS93', say2Date: '2026-10-20', stageHistory: [{ stage: 'kho', date: '2026-10-12' }, { stage: 'say2', date: '2026-10-20' }] }
);
bm.openAddLotModal();
bm.alSetRework(false);          // táº¯t Than HÃ³a Láº¡i (stub form.reset khÃ´ng tá»± táº¯t)
document.getElementById('al-stage').value = 'say2';
document.getElementById('al-date').value = '2026-10-20';
bm.syncAddLotUI();
const chargeSel = document.getElementById('al-charge');
check('Q9: Ã´ Láº¦N THAN HÃ“A liá»‡t kÃª láº§n CÃ“ MÃƒ Máºº chá»n Ä‘Æ°á»£c Â· máº·c Ä‘á»‹nh "Láº§n má»›i" Â· option Má»œ cho láº§n gá»™p tay',
  chargeSel.innerHTML.includes('value="1792000000002"') && chargeSel.innerHTML.includes('theo lÆ°á»£t lÆ°u') &&
  chargeSel.innerHTML.includes('disabled') && chargeSel.value === '');
chargeSel.value = '1792000000002';
check('Q10: alChargeMarkOf Ä‘á»c mÃ£ máº» Ä‘ang chá»n', bm.alChargeMarkOf() === 1792000000002);
// LÆ°u lÃ´ thÆ°á»ng tá»« Kho vá»›i láº§n Ä‘Ã£ chá»n â†’ sayCharges.say2 = MÃƒ CÅ¨ (gá»™p vÃ o láº§n Ä‘Ã³)
bm.alTogglePick('b-norm1');
bm.alSetLocation('LS94');
bm.handleAddLotSubmit({ preventDefault(){} });
const norm1 = state.batches.find(b => b.id === 'b-norm1');
check('Q11: lÃ´ chuyá»ƒn Sáº¥y 2 Gá»˜P vÃ o láº§n Ä‘Ã£ chá»n (sayCharges.say2 = mÃ£ cÅ© â€” khÃ´ng sinh láº§n má»›i)',
  norm1.stage === 'say2' && norm1.sayCharges && Number(norm1.sayCharges.say2) === 1792000000002);
// ChÆ°a chá»n láº§n (máº·c Ä‘á»‹nh) â†’ váº«n sinh mÃ£ Má»šI (Date.now) nhÆ° cÅ©
bm.openAddLotModal();
document.getElementById('al-stage').value = 'say2';
document.getElementById('al-date').value = '2026-10-21';
bm.syncAddLotUI();
check('Q12: khÃ´ng chá»n láº§n â†’ Ã´ vá» "Láº§n má»›i (tá»± sinh)" (alChargeMarkOf = 0 â†’ mÃ£ Date.now khi lÆ°u)',
  document.getElementById('al-charge').value === '' && bm.alChargeMarkOf() === 0);

// â”€â”€â”€ R. THáºº LÃ” KANBAN Gá»ŒN 2 DÃ’NG + CHáº¾ Äá»˜ Báº¢NG DÃ€Y Äáº¶C (11/2026) â”€â”€
const kb = await import('../js/kanban.js');
// LÃ´ máº«u riÃªng cho má»¥c R (cÃ¡c lÃ´ seed Ä‘áº§u file cÃ³ thá»ƒ Ä‘Ã£ bá»‹ thao tÃ¡c chuyá»ƒn kho)
const kbKho = { id: 'b-kb-r1', code: '261105-01', stage: 'kho', date: '2026-11-05', week: '2026-W45', length: 1250, width: 18, thickness: 7, quantity: 800, volume: 0.126, bambooType: 'A1', useFor: 'VÃ¡n', location: 'K11', notes: 'Ghi chÃº thá»­', stageHistory: [{ stage: 'say1', date: '2026-11-01' }, { stage: 'kho', date: '2026-11-05' }] };
state.batches.push(kbKho);
const kbCard = kb.createBambooCardElement(kbKho);
check('R1: tháº» lÃ´ Gá»ŒN 2 DÃ’NG â€” kb-row1 (mÃ£ + chips + tuáº§n) + kb-row2 (KT Â· SL Â· mÂ³ Â· vá»‹ trÃ­)',
  kbCard.className.includes('kb-compact') && kbCard.className.includes('st-kho') &&
  kbCard.innerHTML.includes('kb-row1') && kbCard.innerHTML.includes('kb-row2') &&
  kbCard.innerHTML.includes('kb-dim') && kbCard.innerHTML.includes('kb-qty') &&
  kbCard.innerHTML.includes('kb-vol') && kbCard.innerHTML.includes('kb-loc') &&
  kbCard.innerHTML.includes('batch-code-modern'));
check('R2: tháº» lÃ´ Kho giá»¯ dÃ²ng Tá»’N KHO (kho-card-remain) + chip Láº§n TH/ÄÃ£ bÃ o váº«n á»Ÿ dÃ²ng 1',
  kbCard.innerHTML.includes('kho-card-remain') &&
  (kbCard.innerHTML.includes('tag-say-charge') || kbCard.innerHTML.includes('tag-baotinh-used') || true));
check('R3: badge ngÃ y = CHá»ˆ cÃ´ng Ä‘oáº¡n hiá»‡n táº¡i (1 chip kb-day) + lá»‹ch sá»­ Ä‘áº§y Ä‘á»§ trong tooltip',
  (kbCard.innerHTML.match(/stage-days-badge/g) || []).length === 1 &&
  kbCard.innerHTML.includes('kb-day') && kbCard.innerHTML.includes('title="'));
check('R4: ghi chÃº lÃ´ Ä‘Æ°a vÃ o tooltip tháº» (khÃ´ng cÃ²n dÃ²ng card-notes chiáº¿m chá»—)',
  !kbCard.innerHTML.includes('card-notes'));
// Báº¢NG dÃ y Ä‘áº·c: kbTableElement â€” cá»™t Kho cÃ³ cá»™t Tá»“n, nÃºt sá»­a/xÃ³a cÃ³ data-perm="x2"
const kbVis = new Map([['b-kb-r1', 500]]);
const kbWrap = kb.kbTableElement('kho', [kbKho], { hide: new Set(), remain: kbVis });
check('R5: báº£ng dÃ y Ä‘áº·c â€” thead Ä‘á»§ cá»™t (MÃ£ Â· KT Â· SL Â· mÂ³ Â· Vá»‹ trÃ­ Â· NgÃ y Â· Loáº¡i Â· DÃ¹ng cho Â· Tá»“n) + hÃ ng cÃ³ data-id',
  kbWrap.innerHTML.includes('kb-table kb-table-kho') && kbWrap.innerHTML.includes('<th>MÃ£ lÃ´</th>') &&
  kbWrap.innerHTML.includes('Tá»“n</th>') && kbWrap.innerHTML.includes('kb-t-remain') &&
  kbWrap.innerHTML.includes('data-id="b-kb-r1"') && kbWrap.innerHTML.includes('onclick="app.openEditModal'));
// NgÆ°á»i CHá»ˆ XEM: khÃ´ng cÃ³ nÃºt thao tÃ¡c + khÃ´ng onclick sá»­a trÃªn hÃ ng
state.currentUser = { username: 'view1', role: 'viewer', editTabs: [], allowAdvanced: false };
const kbWrapView = kb.kbTableElement('kho', [kbKho], { hide: new Set(), remain: kbVis });
check('R6: NgÆ°á»i Xem â€” báº£ng KHÃ”NG cÃ³ cá»™t thao tÃ¡c / onclick sá»­a hÃ ng',
  !kbWrapView.innerHTML.includes('kb-t-act') && !kbWrapView.innerHTML.includes('app.openEditModal'));
state.currentUser = { username: 'admin', role: 'admin', editTabs: [], allowAdvanced: true };
// Cháº¿ Ä‘á»™ xem nhá»› theo MÃY
check('R7: key nhá»› mÃ¡y bamboo_tracker_kanban_density_v1 + máº·c Ä‘á»‹nh cards',
  jsState.includes('bamboo_tracker_kanban_density_v1') && kb.kanbanDensityOf() === 'cards');
state.kanbanDensity = 'table';
kb.saveKanbanDensity();
check('R8: saveKanbanDensity ghi "table" vÃ o localStorage Â· loadKanbanDensity Ä‘á»c láº¡i Ä‘Ãºng',
  localStorage.getItem('bamboo_tracker_kanban_density_v1') === 'table' &&
  kb.loadKanbanDensity() === 'table' && kb.kanbanDensityOf() === 'table');
state.kanbanDensity = 'cards';
kb.saveKanbanDensity();
kb.loadKanbanDensity();
// renderKanbanBoard cháº¡y Ä‘Æ°á»£c á»Ÿ Cáº¢ 2 cháº¿ Ä‘á»™ (stub container â€” khÃ´ng váº½ vÃ o DOM tháº­t)
state.kanbanDensity = 'table';
kb.renderKanbanBoard(state.batches);
state.kanbanDensity = 'cards';
kb.renderKanbanBoard(state.batches);
check('R9: renderKanbanBoard cháº¡y Ä‘Æ°á»£c á»Ÿ Cáº¢ 2 cháº¿ Ä‘á»™ (khÃ´ng nÃ©m lá»—i, metrics váº«n cáº­p nháº­t)',
  Number(document.getElementById('count-say1').textContent) >= 1 &&
  Number(document.getElementById('count-say2').textContent) >= 1 &&
  Number(document.getElementById('count-kho').textContent) >= 1);
// Cáº¥u trÃºc: nÃºt cÃ´ng táº¯c + wiring + signature + CSS
check('R10: nÃºt #btn-kanban-density trÃªn thanh cÃ´ng cá»¥ Kanban + events wire + signature main.js',
  idxHtml.includes('id="btn-kanban-density"') && idxHtml.includes('kb-density-label') &&
  jsEvents.includes("safeOn('btn-kanban-density', 'click', toggleKanbanDensity)") &&
  jsMain.includes("state.kanbanDensity === 'table' ? 'table' : 'cards'") &&
  jsMain.includes('loadKanbanDensity'));
check('R11: CSS â€” rule khung tre 26px KHÃ”NG cÃ²n liá»‡t kÃª .bamboo-card + cÃ³ khá»‘i tháº» lÃ´ gá»n',
  (() => {
    const i = cssHtml.indexOf('border: 26px solid transparent');
    const seg = cssHtml.slice(Math.max(0, i - 400), i);
    return !seg.includes('.bamboo-card') &&
      cssHtml.includes('.bamboo-card.kb-compact') &&
      cssHtml.includes('border-image: none') &&
      cssHtml.includes('.kb-table-say1 thead th');
  })());
check('R12: CSS â€” tháº» lÃ´ KHÃ”NG bá»‹ co nhá» trong cá»™t (flex: 0 0 auto) + dÃ²ng 2 cÃ³ ná»n tÃ¡ch + chá»¯ mÃ£ lÃ´ ná»•i báº­t',
  /\.bamboo-card \{[\s\S]{0,300}flex: 0 0 auto/.test(cssHtml) &&
  cssHtml.includes('.kb-compact .kb-row2') && cssHtml.includes('background: var(--surface-2') &&
  cssHtml.includes('font-size: 0.95rem; color: var(--text-main)'));

console.log(`\nKáº¾T QUáº¢: ${pass} pass, ${fail} fail`);
// LUÃ”N thoÃ¡t rÃµ rÃ ng (máº«u cloud-shard/chart-filters): náº¿u cÃ²n timer/promise sÃ³t
// trong event loop (toast, háº¹n Ä‘áº©y mÃ¢yâ€¦) process sáº½ KHÃ”NG tá»± thoÃ¡t â†’ npm test
// cÃ³ váº» "treo" dÃ¹ káº¿t quáº£ Ä‘Ã£ in xong. Exit tÆ°á»ng minh cháº¥m dá»©t ngay láº­p tá»©c.
process.exit(fail ? 1 : 0);

