// tests/kiln.test.mjs â€” Báº¢NG ÄIá»€U KHIá»‚N LÃ’ Sáº¤Y (tháº» Than HÃ³a + Sáº¥y) + THáºº
// "Äá»˜ áº¨M LÃ’ Sáº¤Y" (tab QC). Bao phá»§: suy loáº¡i sáº¥y tá»± Ä‘á»™ng Â· thá»ƒ tÃ­ch/ngÃ y sáº¥y Â·
// 3 mÃ u tráº¡ng thÃ¡i (xanh/vÃ ng/xÃ¡m) Â· ngÆ°á»¡ng Ä‘á»™ áº©m Ä‘áº¡t Â· load/save + mÃ¢y +
// tombstone Â· váº½ báº£ng 2 hÃ ng Â· khung Äiá»u Khiá»ƒn â†” Dá»¯ Liá»‡u (máº·c Ä‘á»‹nh Äiá»u Khiá»ƒn)
// Â· chuyá»ƒn Kho nhanh (icon + kÃ©o tháº£ + hÃ m chung) Â· menu cháº¡m ThÃªm lÃ´ (vá»‹ trÃ­
// Ä‘iá»n sáºµn) Â· báº£ng QC nháº­p Ä‘á»™ áº©m Â· lá»‹ch sá»­ 7 ngÃ y Â· cáº¥u trÃºc HTML/CSS/sw/4 nÆ¡i.
'use strict';

// â”€â”€â”€ Stubs mÃ´i trÆ°á»ng (giá»‘ng qc.test.mjs) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
    getBoundingClientRect: () => ({ top: 0, left: 0, right: 800, bottom: 600, width: 800, height: 600 }),
    reset(){}, focus(){}, click(){}, animate(){ return { cancel(){} }; }
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

let passed = 0, failed = 0;
function check(name, cond) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.error('FAIL ' + name); }
}

// â”€â”€â”€ IMPORT MODULES (sau khi stub xong) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const { state, STORAGE_KEY_QC_KILN_HUMIDITY, STORAGE_KEY_QC_KILN_THRESHOLD, STORAGE_KEY_X2_SAY_FRAME } = await import('../js/state.js');
const kiln = await import('../js/kiln.js');
const bm = await import('../js/batch-modals.js');
const x2 = await import('../js/xuong2.js');
const cloud = await import('../js/cloud.js');
const fsMod = await import('node:fs');

const todayIso = kiln.kilnTodayISO();
const daysAgoIso = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);

// â”€â”€â”€ Dá»® LIá»†U GIáº¢ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
state.currentUser = { username: 'admin', role: 'admin', editTabs: [], allowAdvanced: true };
state.batches = [
  // LÃ´ Ä‘ang á»Ÿ Sáº¥y 1 táº¡i LS3 (5 ngÃ y) + 1 lÃ´ á»Ÿ KHO cÃ¹ng vá»‹ trÃ­ (KHÃ”NG tÃ­nh vÃ o lÃ²)
  { id: 'k1', code: '261001-01', stage: 'say1', date: daysAgoIso(5), location: 'LS3', length: 1250, width: 20, thickness: 10, quantity: 500, volume: 1.5, bambooType: 'A', useFor: 'VÃ¡n', stageHistory: [{ stage: 'say1', date: daysAgoIso(5) }] },
  { id: 'k1b', code: '261001-03', stage: 'kho', date: daysAgoIso(1), location: 'LS3', length: 1250, width: 20, thickness: 10, quantity: 100, volume: 0.2, stageHistory: [{ stage: 'kho', date: daysAgoIso(1) }] },
  // LÃ´ Ä‘ang á»Ÿ Sáº¥y 2 táº¡i LS4 (2 ngÃ y â€” Ä‘Ã£ qua Sáº¥y 1 + Kho)
  { id: 'k2', code: '261001-02', stage: 'say2', date: daysAgoIso(2), location: 'LS4', length: 1250, width: 20, thickness: 10, quantity: 300, volume: 0.9, useFor: 'Bullig', stageHistory: [{ stage: 'say1', date: daysAgoIso(9) }, { stage: 'kho', date: daysAgoIso(7) }, { stage: 'say2', date: daysAgoIso(2) }] }
];

// â”€â”€â”€ A. Dá»® LIá»†U LÃ’: suy loáº¡i sáº¥y Â· thá»ƒ tÃ­ch Â· ngÃ y Â· tráº¡ng thÃ¡i â”€â”€
check('DANH SÃCH LÃ’: máº·c Ä‘á»‹nh 15 lÃ² LS1..LS15 + vá»‹ trÃ­ khai bÃ¡o thÃªm (khÃ´ng trÃ¹ng)',
  kiln.kilnLocations().length === 15 && kiln.kilnLocations()[0] === 'LS1' && kiln.kilnLocations()[14] === 'LS15');
state.x2LotLocations = ['LÃ² 16'];
check('DANH SÃCH LÃ’: vá»‹ trÃ­ khai bÃ¡o thÃªm Ä‘Æ°á»£c ná»‘i vÃ o (16 lÃ²)',
  kiln.kilnLocations().length === 16 && kiln.kilnLocations()[15] === 'LÃ² 16');
state.x2LotLocations = [];

check('LOáº I Sáº¤Y Tá»° Äá»˜NG: LS3 cÃ³ lÃ´ Sáº¥y 1 â†’ "say1" (lÃ´ á»Ÿ KHO cÃ¹ng vá»‹ trÃ­ KHÃ”NG tÃ­nh)',
  kiln.kilnStageOf('LS3') === 'say1' && kiln.kilnStageOf('LS4') === 'say2' && kiln.kilnStageOf('LS5') === '');
check('THá»‚ TÃCH + Sá» LÆ¯á»¢NG LÃ’: LS3 = 1,5 mÂ³ Â· 500 thanh (chá»‰ cá»™ng lÃ´ Ä‘ang sáº¥y)',
  Math.abs(kiln.kilnInfoOf('LS3').volume - 1.5) < 1e-9 && kiln.kilnInfoOf('LS3').qty === 500);
check('NGÃ€Y ÄÃƒ Sáº¤Y: LS3 â‰ˆ 5 ngÃ y Â· LS4 â‰ˆ 2 ngÃ y (tÃ­nh theo láº§n vÃ o cÃ´ng Ä‘oáº¡n HIá»†N Táº I)',
  kiln.kilnInfoOf('LS3').days >= 4 && kiln.kilnInfoOf('LS3').days <= 6 &&
  kiln.kilnInfoOf('LS4').days >= 1 && kiln.kilnInfoOf('LS4').days <= 3);
check('TRáº NG THÃI XÃM: lÃ² trá»‘ng (LS5) = idle Â· thá»ƒ tÃ­ch 0',
  kiln.kilnInfoOf('LS5').status === 'idle' && kiln.kilnInfoOf('LS5').volume === 0);
check('TRáº NG THÃI XANH: Ä‘ang sáº¥y chÆ°a Ä‘o Ä‘á»™ áº©m (LS3) = active',
  kiln.kilnInfoOf('LS3').status === 'active' && kiln.kilnInfoOf('LS3').humidity === null);

// â”€â”€â”€ B. Äá»˜ áº¨M + 3 MÃ€U TRáº NG THÃI â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
check('UPSERT Äá»˜ áº¨M: lÆ°u sá»‘ Ä‘o hÃ´m nay (id kh-<ngÃ y>-<lÃ²>) + Ä‘áº¡t ngÆ°á»¡ng â†’ VÃ€NG (ready)',
  kiln.upsertKilnReading(todayIso, 'LS3', 14) === true &&
  (state.qcKilnReadings || []).some(r => r.id === `kh-${todayIso}-LS3` && r.value === 14) &&
  kiln.kilnInfoOf('LS3').humidity === 14 && kiln.kilnInfoOf('LS3').status === 'ready');
check('Cáº¬P NHáº¬T Sá» ÄO: ghi láº¡i cÃ¹ng ngÃ y/lÃ² â†’ ghi Ä‘Ã¨ (khÃ´ng nhÃ¢n Ä‘Ã´i)',
  kiln.upsertKilnReading(todayIso, 'LS3', 18) === true &&
  state.qcKilnReadings.filter(r => r.location === 'LS3').length === 1 &&
  kiln.kilnInfoOf('LS3').value !== 14 && kiln.kilnInfoOf('LS3').humidity === 18 &&
  kiln.kilnInfoOf('LS3').status === 'active'); // 18 > ngÆ°á»¡ng 15 â†’ váº«n Ä‘ang sáº¥y (xanh)
check('Sá» ÄO CÅ¨ 4 NGÃ€Y: quÃ¡ háº¡n 3 ngÃ y â†’ coi nhÆ° CHÆ¯A cÃ³ Ä‘á»™ áº©m (humidity null)',
  kiln.upsertKilnReading(daysAgoIso(4), 'LS4', 11) === true &&
  kiln.kilnInfoOf('LS4').humidity === null && kiln.kilnInfoOf('LS4').status === 'active');
check('Sá» ÄO TRONG 3 NGÃ€Y: váº«n dÃ¹ng Ä‘Æ°á»£c (LS4 Ä‘o 2 ngÃ y trÆ°á»›c â‰¤ 12% â†’ VÃ€NG)',
  kiln.upsertKilnReading(daysAgoIso(2), 'LS4', 12) === true &&
  kiln.kilnInfoOf('LS4').humidity === 12 && kiln.kilnInfoOf('LS4').status === 'ready');
check('LÃ’ TRá»NG cÃ³ sá»‘ Ä‘o â†’ váº«n XÃM (idle), khÃ´ng vÃ ng',
  kiln.upsertKilnReading(todayIso, 'LS5', 10) === true && kiln.kilnInfoOf('LS5').status === 'idle');
check('XÃ“A Sá» ÄO: upsert giÃ¡ trá»‹ rá»—ng â†’ gá»¡ báº£n ghi + tombstone cháº·n mÃ¢y',
  kiln.upsertKilnReading(todayIso, 'LS5', '') === true &&
  !state.qcKilnReadings.some(r => r.location === 'LS5') &&
  !!(state.deletedIds.qcKilnReadings || {})[`kh-${todayIso}-LS5`]);

// â”€â”€â”€ C. NGÆ¯á» NG Äá»˜ áº¨M Äáº T â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
check('NGÆ¯á» NG Máº¶C Äá»ŠNH: Sáº¥y 1 â‰¤ 15% Â· Sáº¥y 2 â‰¤ 12%',
  kiln.kilnThresholdOf('say1') === 15 && kiln.kilnThresholdOf('say2') === 12);
document.getElementById('kiln-th-say1').value = '13.5';
document.getElementById('kiln-th-say2').value = '10';
kiln.handleKilnThresholdSave();
check('LÆ¯U NGÆ¯á» NG: Sáº¥y 1 = 13,5% Â· Sáº¥y 2 = 10% (state + localStorage)',
  state.qcKilnThresholds.say1 === 13.5 && state.qcKilnThresholds.say2 === 10 &&
  JSON.parse(storeBacking.get(STORAGE_KEY_QC_KILN_THRESHOLD)).say1 === 13.5);
document.getElementById('kiln-th-say1').value = '120';
kiln.handleKilnThresholdSave();
check('CHáº¶N NGÆ¯á» NG SAI: >100% khÃ´ng lÆ°u', state.qcKilnThresholds.say1 === 13.5);
document.getElementById('kiln-th-say1').value = '15';
document.getElementById('kiln-th-say2').value = '12';
kiln.handleKilnThresholdSave();

// â”€â”€â”€ D. LOAD / SAVE + Äá»’NG Bá»˜ MÃ‚Y â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
kiln.saveKilnReadings();
check('SAVE READINGS: ghi localStorage key riÃªng',
  Array.isArray(JSON.parse(storeBacking.get(STORAGE_KEY_QC_KILN_HUMIDITY) || '[]')) &&
  JSON.parse(storeBacking.get(STORAGE_KEY_QC_KILN_HUMIDITY)).length === state.qcKilnReadings.length);
state.qcKilnReadings = [];
kiln.loadKilnData();
check('LOAD KILN DATA: náº¡p láº¡i readings + ngÆ°á»¡ng tá»« localStorage',
  state.qcKilnReadings.length === 3 && state.qcKilnThresholds.say1 === 15);
const snap = cloud.collectCloudSnapshot();
check('MÃ‚Y: snapshot chá»©a qcKilnReadings + qcKilnThresholds',
  Array.isArray(snap.qcKilnReadings) && snap.qcKilnReadings.length === 3 && snap.qcKilnThresholds.say1 === 15);
check('MÃ‚Y: cloudCore cÃ³ 2 khÃ³a má»›i',
  cloud.cloudCore(snap).includes('"qcKilnReadings"') && cloud.cloudCore(snap).includes('"qcKilnThresholds"'));
const kept = state.qcKilnReadings;
cloud.applyFireSnapshot({ qcKilnReadings: [{ id: 'kh-remote', date: todayIso, location: 'LS9', value: 9, updatedAt: new Date().toISOString() }], qcKilnThresholds: { say1: 14, say2: 11 } });
check('MÃ‚Y: applyFireSnapshot nháº­n sá»‘ Ä‘o tá»« mÃ¢y + ngÆ°á»¡ng theo mÃ¢y',
  state.qcKilnReadings.some(r => r.id === 'kh-remote') && state.qcKilnThresholds.say1 === 14);
cloud.applyFireSnapshot({ qcKilnReadings: kept });
state.qcKilnThresholds = { say1: 15, say2: 12 }; // tráº£ ngÆ°á»¡ng chuáº©n cho cÃ¡c test sau

// â”€â”€â”€ E. Váº¼ Báº¢NG ÄIá»€U KHIá»‚N (2 hÃ ng) + 3 MÃ€U + CHÃš GIáº¢I â”€â”€â”€â”€â”€â”€â”€
state.batches.push(
  { id: 'k-date-range-1', stage: 'say1', date: '2026-10-01', location: 'LS10', stageHistory: [{ stage: 'say1', date: '2026-10-01' }, { stage: 'kho', date: '2026-10-02' }, { stage: 'say1', date: '2026-10-15' }] },
  { id: 'k-date-range-2', stage: 'say1', date: '2026-10-16', location: 'LS10', stageHistory: [{ stage: 'say1', date: '2026-10-16' }] },
  { id: 'k-date-range-duplicate', stage: 'say1', date: '2026-10-15', location: 'LS10', stageHistory: [{ stage: 'say1', date: '2026-10-15' }] },
  { id: 'k-date-single', stage: 'say2', date: '2026-10-20', location: 'LS11' }
);
const rangeInfo = kiln.kilnInfoOf('LS10');
check('NGÃ€Y VÃ€O LÃ’: láº¥y láº§n vÃ o cÃ´ng Ä‘oáº¡n gáº§n nháº¥t, gá»™p ngÃ y trÃ¹ng vÃ  hiá»ƒn thá»‹ dáº£i ngÃ y',
  rangeInfo.startDates.join(',') === '2026-10-15,2026-10-16' &&
  rangeInfo.startDateLabel === 'VÃ o lÃ² 15-16/10/2026');
check('NGÃ€Y VÃ€O LÃ’: lÃ´ cÅ© khÃ´ng cÃ³ stageHistory dÃ¹ng ngÃ y cÃ´ng Ä‘oáº¡n hiá»‡n táº¡i',
  kiln.kilnInfoOf('LS11').startDateLabel === 'VÃ o lÃ² 20/10/2026');
kiln.renderKilnBoard();
const boardEl = document.getElementById('x2-kiln-board');
const boardHtml = boardEl.innerHTML;
check('Váº¼ Báº¢NG LÃ’: 15 tháº» Â· 2 hÃ ng Â· xáº¿p Tá»ª PHáº¢I SANG TRÃI (LS12 trÃ¡i â€¦ LS1 pháº£i â€” Ä‘Ãºng sÆ¡ Ä‘á»“ xÆ°á»Ÿng)',
  (boardHtml.match(/data-kiln="/g) || []).length === 15 &&
  (boardHtml.match(/class="kiln-row"/g) || []).length === 2 &&
  boardHtml.indexOf('data-kiln="LS12"') < boardHtml.indexOf('data-kiln="LS1"') &&
  boardHtml.indexOf('data-kiln="LS1"') < boardHtml.indexOf('data-kiln="LS13"'));
check('HÃ€NG 2 NGÆ¯á»¢C CHIá»€U: LS15 bÃªn trÃ¡i â†’ LS14 â†’ LS13 bÃªn pháº£i (Ä‘Ãºng sÆ¡ Ä‘á»“)',
  boardHtml.indexOf('data-kiln="LS15"') < boardHtml.indexOf('data-kiln="LS14"') &&
  boardHtml.indexOf('data-kiln="LS14"') < boardHtml.indexOf('data-kiln="LS13"'));
check('LÃ’ Rá»˜NG + Lá»I ÄI: LS13/14/15 gáº¯n class kiln-wide (x2) + dáº£i "Lá»‘i Ä‘i" náº±m GIá»®A 2 hÃ ng',
  (boardHtml.match(/kiln-wide/g) || []).length === 3 &&
  boardHtml.includes('kiln-aisle') && boardHtml.includes('Lá»‘i Ä‘i') &&
  boardHtml.indexOf('kiln-aisle') > boardHtml.indexOf('data-kiln="LS12"') &&
  boardHtml.indexOf('kiln-aisle') < boardHtml.indexOf('data-kiln="LS13"'));
check('3 MÃ€U TRáº NG THÃI: LS4 vÃ ng (kiln--ready + chip Äáº¡t áº©m) Â· LS3 xanh (kiln--active) Â· lÃ² trá»‘ng xÃ¡m (kiln--idle)',
  boardHtml.includes('kiln--ready') && boardHtml.includes('kiln--active') && boardHtml.includes('kiln--idle') &&
  boardHtml.includes('Äáº¡t áº©m'));
check('THáºº LÃ’: mÃ£ lÃ² + chip loáº¡i sáº¥y (Sáº¥y 1/Sáº¥y 2) + icon VÃ o Kho + ngÃ y sáº¥y + Ä‘á»™ áº©m',
  boardHtml.includes('data-kiln-kho="LS3"') && boardHtml.includes('kiln-stage-say1') && boardHtml.includes('kiln-stage-say2') &&
  /kiln-days/.test(boardHtml) && /kiln-hum/.test(boardHtml));
check('CHIP NGÃ€Y Báº®T Äáº¦U: tháº» lÃ² hiá»ƒn thá»‹ ngÃ y vÃ o sáº¥y thá»±c táº¿ dáº¡ng dáº£i ngÃ y',
  boardHtml.includes('kiln-start-date') && boardHtml.includes('VÃ o lÃ² 15-16/10/2026'));
const legendHtml = document.getElementById('x2-kiln-legend').innerHTML;
check('CHÃš GIáº¢I: Ä‘áº¿m tráº¡ng thÃ¡i + ngÆ°á»¡ng Ä‘áº¡t (Sáº¥y 1 â‰¤ 15% Â· Sáº¥y 2 â‰¤ 12%)',
  legendHtml.includes('Äang sáº¥y') && legendHtml.includes('Äáº¡t áº©m') && legendHtml.includes('ChÆ°a dÃ¹ng') &&
  legendHtml.includes('15%') && legendHtml.includes('12%'));

// â”€â”€â”€ E2. DANH SÃCH NAN TRÃŠN THáºº LÃ’ (rÃª chuá»™t / cháº¡m â†’ xem nhanh) â”€â”€
// ThÃªm 1 lÃ´ ná»¯a vÃ o LS3 Ä‘á»ƒ kiá»ƒm tra nhiá»u dÃ²ng â€” dÃ²ng ÄÃšNG MáºªU
// "1250x22x7 A SL 1500" (khÃ´ng mÃ£ lÃ´, khÃ´ng mÂ³/ngÃ y/Ä‘á»™ áº©m â€” Ä‘Ã£ cÃ³ trÃªn tháº»).
state.batches.push({ id: 'k1c', code: '261003-01', stage: 'say1', date: daysAgoIso(1), location: 'LS3', length: 1250, width: 22, thickness: 7, quantity: 1500, volume: 0.7, bambooType: 'A', stageHistory: [{ stage: 'say1', date: daysAgoIso(1) }] });
kiln.renderKilnBoard();
const boardHtml2 = document.getElementById('x2-kiln-board').innerHTML;
// Cáº¯t ná»™i dung 1 tháº» lÃ² (tá»« data-kiln="LSx" tá»›i tháº» lÃ² káº¿ tiáº¿p)
function tileSliceOf(html, loc) {
  const i = html.indexOf(`data-kiln="${loc}"`);
  if (i < 0) return '';
  const j = html.indexOf('data-kiln="', i + 10);
  return html.slice(i, j < 0 ? html.length : j);
}
check('DANH SÃCH NAN: tháº» lÃ² cÃ³ pop .kiln-nan-pop â€” má»—i lÃ´ 1 dÃ²ng Ä‘Ãºng máº«u "1250x22x7 A SL 1500"',
  boardHtml2.includes('kiln-nan-pop') && boardHtml2.includes('1250x22x7 A SL 1500') &&
  boardHtml2.includes('1250x20x10 A SL 500'));
check('DANH SÃCH NAN â€” Bá»Ž THÃ”NG TIN CÅ¨: háº¿t title "N lÃ´: â€¦" (khÃ´ng láº·p mÃ£ lÃ´/mÂ³/ngÃ y Ä‘Ã£ cÃ³ trÃªn tháº»)',
  !boardHtml2.includes(' lÃ´: ') && !boardHtml2.includes('title="LS'));
check('DANH SÃCH NAN â€” LÃ’ TRá»NG: LS5 KHÃ”NG cÃ³ pop danh sÃ¡ch (chá»‰ lÃ² cÃ³ lÃ´ má»›i hiá»‡n)',
  !tileSliceOf(boardHtml2, 'LS5').includes('kiln-nan-pop'));
// Cháº¡m má»Ÿ menu (LS3) â†’ danh sÃ¡ch náº±m TRONG tháº», TRÆ¯á»šC cÃ¡c nÃºt menu (khÃ´ng Ä‘Ã¨ nÃºt)
const tileLS3 = { getAttribute: (a) => (a === 'data-kiln' ? 'LS3' : null) };
kiln.onKilnBoardClick({ target: { closest: (sel) => (sel === '.kiln-tile' ? tileLS3 : null) } });
const htmlOpenLS3 = document.getElementById('x2-kiln-board').innerHTML; // class kiln-open náº±m á»Ÿ THáºº gá»‘c (trÆ°á»›c data-kiln)
const sliceLS3 = tileSliceOf(htmlOpenLS3, 'LS3');
check('DANH SÃCH NAN â€” CHáº M Má»ž MENU: khá»‘i danh sÃ¡ch náº±m TRÆ¯á»šC nÃºt menu (ThÃªm lÃ´ / VÃ o Kho váº«n báº¥m Ä‘Æ°á»£c)',
  htmlOpenLS3.includes('kiln-open') && sliceLS3.includes('kiln-nan-pop') &&
  sliceLS3.indexOf('kiln-nan-pop') < sliceLS3.indexOf('kiln-menu'));
kiln.onKilnBoardClick({ target: { closest: (sel) => (sel === '.kiln-tile' ? tileLS3 : null) } }); // cháº¡m ná»¯a = Ä‘Ã³ng

// â”€â”€â”€ E3. HÃ€NG 2: LS13/14/15 = 2Ã— lÃ² thÆ°á»ng + 6 Ã´ "Chá» xÃ¢y thÃªm" â”€â”€
kiln.renderKilnBoard();
const boardHtml3 = document.getElementById('x2-kiln-board').innerHTML;
check('HÃ€NG 2 â€” Ã” CHá»œ XÃ‚Y THÃŠM: Ä‘Ãºng 6 Ã´ kiln-todo (12 cá»™t khá»›p hÃ ng 1: 6 Ã´ Ã—1 + 3 lÃ´ rá»™ng Ã—2)',
  (boardHtml3.match(/class="kiln-tile kiln-todo"/g) || []).length === 6 &&
  boardHtml3.includes('Chá» xÃ¢y thÃªm'));
check('HÃ€NG 2 â€” CÄ‚N PHáº¢I: Ã´ chá» xÃ¢y Ä‘á»©ng TRÆ¯á»šC LS15 (bÃªn trÃ¡i), LS13 náº±m sau cÃ¹ng (bÃªn pháº£i â€” dÆ°á»›i LS1+LS2)',
  boardHtml3.indexOf('kiln-todo') < boardHtml3.indexOf('data-kiln="LS15"') &&
  boardHtml3.indexOf('data-kiln="LS13"') > boardHtml3.indexOf('data-kiln="LS14"'));
check('HÃ€NG 2 â€” Ã” CHá»œ XÃ‚Y: KHÃ”NG cÃ³ data-kiln (Ä‘áº¿m lÃ² tháº­t váº«n 15) Â· khÃ´ng kÃ©o tháº£ Ä‘Æ°á»£c',
  (boardHtml3.match(/data-kiln="/g) || []).length === 15);
// Cháº¡m Ã´ "Chá» xÃ¢y thÃªm" â†’ KHÃ”NG má»Ÿ menu (tile .kiln-todo bá»‹ cháº·n trong handler)
const todoTile = { getAttribute: () => null, classList: { contains: () => true } };
kiln.onKilnBoardClick({ target: { closest: (sel) => (sel === '.kiln-tile' ? todoTile : null) } });
check('HÃ€NG 2 â€” CHáº M Ã” CHá»œ XÃ‚Y: khÃ´ng má»Ÿ menu (khÃ´ng cÃ³ kiln-open trÃªn báº£ng)',
  !document.getElementById('x2-kiln-board').innerHTML.includes('kiln-open'));

// â”€â”€â”€ F. KHUNG: Báº¢NG ÄIá»€U KHIá»‚N (máº·c Ä‘á»‹nh) â†” Báº¢NG Dá»® LIá»†U â”€â”€â”€â”€â”€
localStorage.removeItem(STORAGE_KEY_X2_SAY_FRAME);
x2.applyX2SayFrame();
check('KHUNG Máº¶C Äá»ŠNH: Báº£ng Äiá»u Khiá»ƒn hiá»‡n Â· Báº£ng Dá»¯ Liá»‡u áº©n Â· tab Äiá»u Khiá»ƒn active',
  document.getElementById('x2-say-frame-ctrl').hidden === false &&
  document.getElementById('x2-say-frame-data').hidden === true &&
  document.getElementById('x2-say-tab-ctrl').classList.contains('active'));
x2.switchX2SayFrame('data');
check('CHUYá»‚N KHUNG: báº¥m "Báº£ng Dá»¯ Liá»‡u" â†’ khung dá»¯ liá»‡u hiá»‡n + nhá»› theo mÃ¡y',
  document.getElementById('x2-say-frame-data').hidden === false &&
  document.getElementById('x2-say-frame-ctrl').hidden === true &&
  storeBacking.get(STORAGE_KEY_X2_SAY_FRAME) === 'data');
x2.switchX2SayFrame('ctrl');
check('QUAY Láº I: báº¥m "Báº£ng Äiá»u Khiá»ƒn" â†’ khung Ä‘iá»u khiá»ƒn hiá»‡n + báº£ng lÃ² váº½ láº¡i',
  document.getElementById('x2-say-frame-ctrl').hidden === false &&
  document.getElementById('x2-kiln-board').innerHTML.includes('data-kiln="LS1"'));

// â”€â”€â”€ G. CHUYá»‚N KHO NHANH + MENU CHáº M THÃŠM LÃ” â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
state.batches.push({ id: 'k9', code: '261002-09', stage: 'say1', date: daysAgoIso(1), location: 'LS6', length: 1250, width: 18, thickness: 7, quantity: 200, volume: 0.3, stageHistory: [{ stage: 'say1', date: daysAgoIso(1) }] });
const moved = bm.quickTransferLotsToKho('say1', 'LS6', todayIso);
const k9 = state.batches.find(b => b.id === 'k9');
check('CHUYá»‚N KHO NHANH (hÃ m chung): lÃ´ LS6 vÃ o Kho Â· ngÃ y hÃ´m nay Â· lá»‹ch sá»­ +kho Â· cÃ³ undo',
  moved === 1 && k9.stage === 'kho' && k9.khoDate === todayIso &&
  k9.stageHistory.some(h => h.stage === 'kho' && h.date === todayIso) && state.undoStack.length > 0);
check('CHUYá»‚N KHO NHANH: lÃ² LS6 vá» tráº¡ng thÃ¡i XÃM (khÃ´ng cÃ²n lÃ´ Ä‘ang sáº¥y)',
  kiln.kilnInfoOf('LS6').status === 'idle');

// VÃ€O KHO CÃ“ Äá»”I Vá»Š TRÃ + NGÃ€Y THá»°C Táº¾: há»™p thoáº¡i máº·c Ä‘á»‹nh hÃ´m nay, ngÆ°á»i dÃ¹ng sá»­a Ä‘Æ°á»£c
state.batches.push({ id: 'k11', code: '261002-11', stage: 'say2', date: daysAgoIso(1), location: 'LS8', quantity: 50, volume: 0.08, stageHistory: [{ stage: 'say2', date: daysAgoIso(1) }] });
const khoBtnLS8 = { getAttribute: (a) => (a === 'data-kiln-kho' ? 'LS8' : null) };
kiln.onKilnBoardClick({ target: { closest: (sel) => (sel === '[data-kiln-kho]' ? khoBtnLS8 : null) } });
const quickKhoModal = document.getElementById('modal-kiln-quick-kho');
const quickKhoDate = document.getElementById('kiln-quick-kho-date');
const quickKhoLocation = document.getElementById('kiln-quick-kho-location');
check('CHUYá»‚N KHO NHANH: má»Ÿ há»™p thoáº¡i, ngÃ y máº·c Ä‘á»‹nh hÃ´m nay vÃ  cÃ³ gá»£i Ã½ vá»‹ trÃ­',
  quickKhoModal.classList.contains('show') && quickKhoDate.value === todayIso &&
  document.getElementById('kiln-quick-kho-locations').innerHTML.includes('LS3'));
quickKhoDate.value = '2026-10-21';
quickKhoLocation.value = 'K99';
kiln.handleKilnQuickTransferSubmit({ preventDefault(){} });
const k11 = state.batches.find(b => b.id === 'k11');
check('VÃ€O KHO + Äá»”I Vá»Š TRÃ: ghi Ä‘Ãºng ngÃ y thá»±c táº¿, stageHistory vÃ  vá»‹ trÃ­ má»›i',
  k11.stage === 'kho' && k11.khoDate === '2026-10-21' && k11.location === 'K99' &&
  k11.stageHistory.some(h => h.stage === 'kho' && h.date === '2026-10-21'));
// Há»§y há»™p thoáº¡i â†’ KHÃ”NG chuyá»ƒn, khÃ´ng ghi ngÃ y Kho
state.batches.push({ id: 'k12', code: '261002-12', stage: 'say1', date: daysAgoIso(1), location: 'LS9', quantity: 10, volume: 0.02, stageHistory: [{ stage: 'say1', date: daysAgoIso(1) }] });
const khoBtnLS9 = { getAttribute: (a) => (a === 'data-kiln-kho' ? 'LS9' : null) };
kiln.onKilnBoardClick({ target: { closest: (sel) => (sel === '[data-kiln-kho]' ? khoBtnLS9 : null) } });
kiln.closeKilnQuickTransferModal();
const k12 = state.batches.find(b => b.id === 'k12');
check('VÃ€O KHO â€” Há»¦Y Há»˜P THOáº I: lÃ´ váº«n á»Ÿ Sáº¥y 1, khÃ´ng cÃ³ khoDate',
  k12.stage === 'say1' && !k12.khoDate && !document.getElementById('modal-kiln-quick-kho').classList.contains('show'));

// Menu cháº¡m trÃªn LÃ’ TRá»NG â†’ 2 nÃºt ThÃªm (Sáº¥y 1 / Sáº¥y 2)
const tileLS5 = { getAttribute: (a) => (a === 'data-kiln' ? 'LS5' : null) };
kiln.onKilnBoardClick({ target: { closest: (sel) => (sel === '.kiln-tile' ? tileLS5 : null) } });
let htmlLS5 = document.getElementById('x2-kiln-board').innerHTML;
check('MENU CHáº M (lÃ² trá»‘ng): hiá»‡n menu + "ThÃªm Sáº¥y 1" / "ThÃªm Sáº¥y 2"',
  htmlLS5.includes('kiln-menu') && htmlLS5.includes('ThÃªm Sáº¥y 1') && htmlLS5.includes('ThÃªm Sáº¥y 2'));
const addBtn = { getAttribute: () => 'say1' };
kiln.onKilnBoardClick({ target: { closest: (sel) => (sel === '[data-kiln-add]' ? addBtn : null) } });
check('THÃŠM LÃ” Tá»ª LÃ’: má»Ÿ form ThÃªm LÃ´ Sáº¥y Má»›i â€” vá»‹ trÃ­ LS5 + cÃ´ng Ä‘oáº¡n Sáº¥y 1 Ä‘iá»n sáºµn',
  document.getElementById('modal-add-lot').classList._s.has('show') &&
  bm.alCurrentLocation() === 'LS5' && document.getElementById('al-stage').value === 'say1');
bm.closeAddLotModal();
kiln.onKilnBoardClick({ target: { closest: (sel) => (sel === '.kiln-tile' ? tileLS5 : null) } }); // cháº¡m ná»¯a = Ä‘Ã³ng

// Menu trÃªn LÃ’ ÄANG Sáº¤Y (LS4) â†’ "ThÃªm lÃ´" + "VÃ o Kho"
const tileLS4 = { getAttribute: (a) => (a === 'data-kiln' ? 'LS4' : null) };
kiln.onKilnBoardClick({ target: { closest: (sel) => (sel === '.kiln-tile' ? tileLS4 : null) } });
const htmlLS4 = document.getElementById('x2-kiln-board').innerHTML;
check('MENU CHáº M (lÃ² Ä‘ang sáº¥y): cÃ³ "ThÃªm lÃ´" + "VÃ o Kho"',
  htmlLS4.includes('ThÃªm lÃ´') && htmlLS4.includes('VÃ o Kho') && htmlLS4.includes('data-kiln-kho="LS4"'));

// KÃ‰O THáºº LÃ’ tháº£ vÃ o Ã´ KHO = chuyá»ƒn nhanh (LS4 â€” lÃ´ Sáº¥y 2)
let dragPayload = '';
kiln.kilnTileDragStart({ target: { closest: (sel) => (sel === '.kiln-tile' ? { getAttribute: () => 'LS4' } : null) }, dataTransfer: { setData: (k, v) => { dragPayload = v; }, effectAllowed: '' } });
kiln.onKilnKhoDrop({ preventDefault(){}, dataTransfer: { getData: () => dragPayload } });
document.getElementById('kiln-quick-kho-date').value = '2026-10-19';
kiln.handleKilnQuickTransferSubmit({ preventDefault(){} });
check('KÃ‰O THáº¢ VÃ€O KHO: má»Ÿ chung há»™p thoáº¡i vÃ  lÆ°u ngÃ y thá»±c táº¿ Ä‘Ã£ chá»n',
  JSON.parse(dragPayload).kiln === 'LS4' && state.batches.find(b => b.id === 'k2').stage === 'kho' &&
  state.batches.find(b => b.id === 'k2').khoDate === '2026-10-19');

// ICON kho trÃªn tháº» lÃ² = chuyá»ƒn nhanh (LS3 â€” lÃ´ Sáº¥y 1)
const khoBtnLS3 = { getAttribute: (a) => (a === 'data-kiln-kho' ? 'LS3' : null) };
kiln.onKilnBoardClick({ target: { closest: (sel) => (sel === '[data-kiln-kho]' ? khoBtnLS3 : null) } });
document.getElementById('kiln-quick-kho-date').value = '2026-10-22';
kiln.handleKilnQuickTransferSubmit({ preventDefault(){} });
check('ICON VÃ€O KHO: báº¥m icon má»Ÿ há»™p thoáº¡i, lÆ°u ngÃ y thá»±c táº¿ Ä‘Ã£ chá»n',
  state.batches.find(b => b.id === 'k1').stage === 'kho' &&
  state.batches.find(b => b.id === 'k1').khoDate === '2026-10-22');

// â”€â”€â”€ H. MA TRáº¬N Äá»˜ áº¨M (tab QC â€” ngÃ y Ã— lÃ², tá»‘i Æ°u Ä‘iá»‡n thoáº¡i) â”€â”€â”€â”€â”€
const savedReadings = state.qcKilnReadings;
state.qcKilnReadings = [];
check('MINI CARD: chÆ°a nháº­p hÃ´m nay â†’ "ChÆ°a nháº­p hÃ´m nay"', kiln.kilnHumidityCardCount() === 'ChÆ°a nháº­p hÃ´m nay');
state.qcKilnReadings = savedReadings;
check('MINI CARD: cÃ³ sá»‘ Ä‘o hÃ´m nay â†’ "HÃ´m nay: n/â€¦ lÃ²" (gá»™p 2 láº§n Ä‘o theo LÃ’)',
  kiln.kilnHumidityCardCount().startsWith('HÃ´m nay:'));

// LÃ´ Ä‘ang sáº¥y táº¡i LS7 (Sáº¥y 1 â€” ngÆ°á»¡ng 15) Ä‘á»ƒ cÃ³ Ã´ tÃ´ vÃ ng Äáº T áº¨M trÃªn ma tráº­n
state.batches.push({ id: 'k10', code: '261003-10', stage: 'say1', date: daysAgoIso(3), location: 'LS7', length: 1250, width: 18, thickness: 7, quantity: 100, volume: 0.15, stageHistory: [{ stage: 'say1', date: daysAgoIso(3) }] });
// Sá»‘ Ä‘o CÅ¨ Äá»ŠNH Dáº NG CÅ¨ (khÃ´ng cÃ³ slot) táº¡i LS7 â€” 3 ngÃ y trÆ°á»›c, Ä‘áº¡t ngÆ°á»¡ng â†’ Láº§n 1
state.qcKilnReadings.push({ id: `kh-${daysAgoIso(3)}-LS7`, date: daysAgoIso(3), location: 'LS7', value: 14, createdAt: '', updatedAt: '' });

kiln.renderKilnHumidityCard();
const mx = document.getElementById('kiln-hum-matrix').innerHTML;
check('MA TRáº¬N: 15 hÃ ng lÃ² Â· 14 ngÃ y (má»—i ngÃ y 2 cá»™t L1/L2) Â· 30 Ã´ nháº­p hÃ´m nay (15 lÃ² Ã— 2 láº§n)',
  (mx.match(/class="km-kiln"/g) || []).length === 15 &&
  (mx.match(/class="km-day/g) || []).length === 14 &&
  (mx.match(/class="km-input"/g) || []).length === 30);
check('MA TRáº¬N â€” HÃ”M NAY TRÃI NHáº¤T: chip "HÃ´m nay" Ä‘á»©ng trÆ°á»›c má»i Ã´ ngÃ y cÅ©, ngÃ y cÃ ng cÅ© cÃ ng sang pháº£i',
  mx.includes('km-today-chip') &&
  mx.indexOf('km-today-chip') < mx.indexOf('data-km-date=') &&
  mx.indexOf(`data-km-date="${daysAgoIso(1)}"`) < mx.indexOf(`data-km-date="${daysAgoIso(2)}"`));
check('MA TRáº¬N â€” Bá»Ž THEO YÃŠU Cáº¦U: khÃ´ng cÃ²n cá»™t "Äang chá»©a" / lá»‹ch sá»­ riÃªng / Ã´ chá»n ngÃ y',
  !mx.includes('Äang chá»©a') && !mx.includes('data-kiln-hum-load'));
check('MA TRáº¬N â€” Äáº T áº¨M: sá»‘ Ä‘o â‰¤ ngÆ°á»¡ng loáº¡i sáº¥y tÃ´ vÃ ng (km-ok) + sá»‘ cÅ© khÃ´ng slot hiá»ƒu Láº§n 1 + giÃ¡ trá»‹ Ä‘iá»n sáºµn',
  mx.includes('km-ok') && mx.includes('data-kiln-hum="LS7"') && mx.includes('value="18"'));
check('MA TRáº¬N â€” NGÆ¯á» NG: Ä‘iá»n sáºµn Sáº¥y 1 = 15% Â· Sáº¥y 2 = 12%',
  String(document.getElementById('kiln-th-say1').value) === '15' &&
  String(document.getElementById('kiln-th-say2').value) === '12');

// LÆ¯U HÃ”M NAY: Ä‘iá»n L1 LS1 = "14,5" (dáº¥u pháº©y) Â· L2 LS1 = 13 Â· L1 LS2 = trá»‘ng (xÃ³a)
const kmInputs = [];
const mkInput = (loc, slot, val) => Object.assign(makeEl(`km-${loc}-${slot}`), {
  getAttribute: (a) => (a === 'data-kiln-hum' ? loc : (a === 'data-kiln-slot' ? String(slot) : null)),
  value: val
});
kmInputs.push(mkInput('LS1', 1, '14,5'));
kmInputs.push(mkInput('LS1', 2, '13'));
kmInputs.push(mkInput('LS2', 1, ''));
const realQSA = document.querySelectorAll;
document.querySelectorAll = (sel) => (String(sel).includes('.km-input') ? kmInputs : realQSA(sel));
kiln.saveKilnHumidityForm();
document.querySelectorAll = realQSA;
const rL1 = state.qcKilnReadings.find(r => r.id === `kh-${todayIso}-LS1`);
const rL2 = state.qcKilnReadings.find(r => r.id === `kh-${todayIso}-LS1-s2`);
check('LÆ¯U HÃ”M NAY: L1 nháº­n "14,5" = 14.5 (giá»¯ id cÅ©) Â· L2 táº¡o id -s2 Â· Ã´ trá»‘ng khÃ´ng táº¡o sá»‘',
  rL1 && rL1.value === 14.5 && Number(rL1.slot) === 1 &&
  rL2 && rL2.value === 13 && Number(rL2.slot) === 2 &&
  !state.qcKilnReadings.some(r => r.location === 'LS2' && r.date === todayIso));
check('LÆ¯U HÃ”M NAY: ghi localStorage + mini card Ä‘áº¿m "HÃ´m nay: 2/â€¦ lÃ²" (LS3 cÅ© + LS1 má»›i)',
  JSON.parse(storeBacking.get(STORAGE_KEY_QC_KILN_HUMIDITY) || '[]').some(r => r.id === `kh-${todayIso}-LS1-s2`) &&
  kiln.kilnHumidityCardCount().startsWith('HÃ´m nay: 2/'));

// Sá»¬A Ã” QUÃ KHá»¨: báº¥m Ã´ LS2 â€” 3 ngÃ y trÆ°á»›c (Láº§n 1) â†’ prompt nháº­p 11
const cellLS2 = { getAttribute: (a) => ({ 'data-km-cell': 'LS2', 'data-km-date': daysAgoIso(3), 'data-km-slot': '1' }[a] || null) };
const oldPrompt2 = global.prompt;
global.prompt = () => '11';
kiln.onKilnMatrixClick({ target: { closest: (sel) => (sel === '[data-km-cell]' ? cellLS2 : null) } });
check('MA TRáº¬N â€” Sá»¬A Ã” QUÃ KHá»¨: prompt nháº­p 11 â†’ lÆ°u Ä‘Ãºng (ngÃ y, lÃ², Láº§n 1)',
  state.qcKilnReadings.some(r => r.date === daysAgoIso(3) && r.location === 'LS2' && Number(r.slot || 1) === 1 && r.value === 11));
// Ã” quÃ¡ khá»© â€” Sá» SAI (250) bá»‹ cháº·n
global.prompt = () => '250';
kiln.onKilnMatrixClick({ target: { closest: (sel) => (sel === '[data-km-cell]' ? cellLS2 : null) } });
check('MA TRáº¬N â€” CHáº¶N SAI: 250 ngoÃ i 0â€“100 â†’ khÃ´ng lÆ°u',
  !state.qcKilnReadings.some(r => r.location === 'LS2' && r.value === 250));
// Ã” quÃ¡ khá»© â€” Ä‘á»ƒ trá»‘ng = XÃ“A (tombstone)
global.prompt = () => '';
kiln.onKilnMatrixClick({ target: { closest: (sel) => (sel === '[data-km-cell]' ? cellLS2 : null) } });
global.prompt = oldPrompt2;
check('MA TRáº¬N â€” XÃ“A Ã”: Ä‘á»ƒ trá»‘ng â†’ gá»¡ sá»‘ Ä‘o + tombstone',
  !state.qcKilnReadings.some(r => r.date === daysAgoIso(3) && r.location === 'LS2') &&
  !!(state.deletedIds.qcKilnReadings || {})[`kh-${daysAgoIso(3)}-LS2`]);

// â”€â”€â”€ G2. NHáº¬P NHANH NHIá»€U LÃ” Sáº¤Y 2 â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
{
  const previousBatches = state.batches;
  const previousNotes = state.khoNotes;
  state.batches = [];
  state.khoNotes = [];
  const date = '2026-10-24';
  bm.openAddLotModal({ stage: 'say2', location: 'LS12' });
  document.getElementById('al-date').value = date;
  document.getElementById('al-bulk-default-length').value = '1250';
  const makeBulkRow = (dimensions, quantities) => {
    const values = {
      '[data-al-bulk-dim="length"]': { value: dimensions.length },
      '[data-al-bulk-dim="width"]': { value: dimensions.width },
      '[data-al-bulk-dim="thickness"]': { value: dimensions.thickness },
      '[data-al-bulk-qty="A"]': { value: quantities.A },
      '[data-al-bulk-qty="A1"]': { value: quantities.A1 },
      '[data-al-bulk-qty="B"]': { value: quantities.B }
    };
    return {
      querySelector: (selector) => values[selector] || null,
      querySelectorAll: (selector) => selector === '[data-al-bulk-qty]'
        ? [values['[data-al-bulk-qty="A"]'], values['[data-al-bulk-qty="A1"]'], values['[data-al-bulk-qty="B"]']]
        : []
    };
  };
  const row = makeBulkRow({ length: '', width: '22', thickness: '9' }, { A: '420', A1: '1330', B: '' });
  const overrideRow = makeBulkRow({ length: '1300', width: '18', thickness: '7' }, { A: '', A1: '', B: '240' });
  document.getElementById('al-bulk-rows').querySelectorAll = (selector) =>
    selector === '[data-al-bulk-row]' ? [row, overrideRow] : [];
  bm.toggleAlBulkEntryMode();
  bm.handleAddLotSubmit({ preventDefault(){} });
  const created = state.batches.filter(b => b.stage === 'say2' && b.location === 'LS12');
  check('NHáº¬P NHANH Sáº¤Y 2: táº¡o riÃªng lÃ´ A/A1 theo sá»‘ lÆ°á»£ng báº£ng kÃª, cÃ¹ng lÃ² vÃ  ngÃ y',
    created.length === 3 && created.some(b => b.bambooType === 'A' && b.quantity === 420) &&
    created.some(b => b.bambooType === 'A1' && b.quantity === 1330) &&
    created.some(b => b.bambooType === 'B' && b.quantity === 240));
  check('NHáº¬P NHANH Sáº¤Y 2: chiá»u dÃ i chung 1250 vÃ  chiá»u dÃ i riÃªng 1300 Ä‘Æ°á»£c Ã¡p dá»¥ng Ä‘Ãºng',
    created.filter(b => b.width === 22).every(b => b.length === 1250) &&
    created.some(b => b.width === 18 && b.thickness === 7 && b.length === 1300));
  check('NHáº¬P NHANH Sáº¤Y 2: lá»‹ch sá»­ Kho â†’ Sáº¥y 2 cÃ¹ng ngÃ y + tá»± táº¡o phiáº¿u xuáº¥t Sáº¥y 2 Ä‘Ã£ duyá»‡t',
    created.every(b => b.khoDate === date && b.say2Date === date &&
      b.stageHistory.length === 2 && b.stageHistory[0].stage === 'kho' &&
      b.stageHistory[1].stage === 'say2') &&
    created.every(b => state.khoNotes.some(n => n.autoSay2 && n.status === 'da_duyet' &&
      n.lots.some(l => l.batchId === b.id && l.qty === b.quantity))));
  const bulkRows = document.getElementById('al-bulk-rows');
  document.getElementById('al-bulk-default-length').value = '1300';
  overrideRow.querySelector('[data-al-bulk-dim="length"]').value = '1250';
  check('NHáº¬P NHANH Sáº¤Y 2: Ä‘á»•i chiá»u dÃ i chung sang 1300; chiá»u rá»™ng/dÃ y chá»‰ nháº­n nhÃ³m quy Ä‘á»‹nh',
    bm.readAlBulkRows().items.filter(item => item.width === 22).every(item => item.length === 1300) &&
    bm.readAlBulkRows().items.some(item => item.width === 18 && item.thickness === 7 && item.length === 1250));
  bulkRows.querySelectorAll = (selector) => selector === '[data-al-bulk-row]'
    ? [makeBulkRow({ length: '', width: '17', thickness: '9' }, { A: '1', A1: '', B: '' })]
    : [];
  check('NHáº¬P NHANH Sáº¤Y 2: tá»« chá»‘i chiá»u rá»™ng ngoÃ i danh sÃ¡ch quy Ä‘á»‹nh',
    bm.readAlBulkRows().error.includes('Rá»™ng 15/18/22/24'));
  const previousInsertAdjacentHTML = bulkRows.insertAdjacentHTML;
  const inheritedRow = makeBulkRow({ length: '', width: '24', thickness: '11' }, { A: '', A1: '', B: '' });
  bulkRows.querySelectorAll = (selector) => selector === '[data-al-bulk-row]' ? [inheritedRow] : [];
  bulkRows.insertAdjacentHTML = (_position, html) => { bulkRows._addedRowHtml = html; };
  bm.alBulkAddRow();
  check('NHáº¬P NHANH Sáº¤Y 2: dÃ²ng má»›i káº¿ thá»«a rá»™ng/dÃ y dÃ²ng trÆ°á»›c nhÆ°ng khÃ´ng sao chÃ©p sá»‘ lÆ°á»£ng',
    /data-al-bulk-dim="width"[^>]*><option value="">Chá»n<\/option><option value="15">15<\/option><option value="18">18<\/option><option value="22">22<\/option><option value="24" selected>24<\/option>/.test(bulkRows._addedRowHtml) &&
    /data-al-bulk-dim="thickness"[^>]*><option value="">Chá»n<\/option><option value="7">7<\/option><option value="8">8<\/option><option value="9">9<\/option><option value="10">10<\/option><option value="11" selected>11<\/option>/.test(bulkRows._addedRowHtml) &&
    !/data-al-bulk-qty="(?:A|A1|B)"[^>]*value=/.test(bulkRows._addedRowHtml));
  bulkRows.insertAdjacentHTML = previousInsertAdjacentHTML;
  state.batches = previousBatches;
  state.khoNotes = previousNotes;
}

// â”€â”€â”€ I. Cáº¤U TRÃšC (index.html Â· styles.css Â· sw.js Â· 4 nÆ¡i ná»‘i dá»¯ liá»‡u) â”€â”€â”€
const idxHtml = fsMod.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const cssHtml = fsMod.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
const swJs = fsMod.readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
const jsState = fsMod.readFileSync(new URL('../js/state.js', import.meta.url), 'utf8');
const jsStorage = fsMod.readFileSync(new URL('../js/storage.js', import.meta.url), 'utf8');
const jsCloud = fsMod.readFileSync(new URL('../js/cloud.js', import.meta.url), 'utf8');
const jsHistory = fsMod.readFileSync(new URL('../js/history.js', import.meta.url), 'utf8');
const jsMain = fsMod.readFileSync(new URL('../js/main.js', import.meta.url), 'utf8');
const jsEvents = fsMod.readFileSync(new URL('../js/events.js', import.meta.url), 'utf8');
check('Cáº¤U TRÃšC (index.html): 2 tab chuyá»ƒn khung + 2 khung + báº£ng lÃ² + Ã´ Kho + chÃº giáº£i',
  idxHtml.includes('id="x2-say-tab-ctrl"') && idxHtml.includes('id="x2-say-tab-data"') &&
  idxHtml.includes('id="x2-say-frame-ctrl"') && idxHtml.includes('id="x2-say-frame-data"') &&
  idxHtml.includes('id="x2-kiln-board"') && idxHtml.includes('id="x2-kiln-kho-drop"') &&
  idxHtml.includes('id="x2-kiln-legend"'));
check('NHáº¬P NHANH Sáº¤Y 2: cÃ³ báº£ng nhiá»u dÃ²ng vÃ  Ä‘iá»u khiá»ƒn thÃªm dÃ²ng',
  idxHtml.includes('id="al-bulk-toggle"') && idxHtml.includes('id="al-bulk-rows"') &&
  idxHtml.includes('id="al-bulk-add-row"') && idxHtml.includes('id="al-bulk-default-length"') &&
  idxHtml.includes('value="1250"') && idxHtml.includes('value="15"') && idxHtml.includes('value="18"') &&
  idxHtml.includes('value="22"') && idxHtml.includes('value="24"') && idxHtml.includes('value="7"') &&
  idxHtml.includes('value="11"') &&
  jsEvents.includes('al-bulk-toggle'));
check('Cáº¤U TRÃšC (index.html): tháº» QC "Äá»™ áº¨m LÃ² Sáº¥y" â€” launcher + ngÆ°á»¡ng + MA TRáº¬N (Ä‘Ã£ bá» lá»‹ch sá»­ / cá»™t Äang chá»©a / Ã´ chá»n ngÃ y)',
  idxHtml.includes('data-qc-card="qc-humidity-card"') && idxHtml.includes('id="qc-humidity-card"') &&
  idxHtml.includes('id="kiln-th-say1"') && idxHtml.includes('id="kiln-th-say2"') &&
  idxHtml.includes('id="btn-kiln-th-save"') && idxHtml.includes('id="btn-kiln-hum-save"') &&
  idxHtml.includes('id="kiln-hum-matrix"') && idxHtml.includes('id="qc-mini-count-humidity"') &&
  !idxHtml.includes('id="kiln-hum-history-rows"') && !idxHtml.includes('id="kiln-hum-date"') &&
  !idxHtml.includes('id="kiln-hum-rows"') && !idxHtml.includes('Äang chá»©a (lÃ´'));
check('Cáº¤U TRÃšC (styles.css): khung áº©n + 3 mÃ u + chip Ä‘áº¡t áº©m + menu + lá»‘i Ä‘i + lÃ² rá»™ng + MA TRáº¬N (sticky cá»™t LÃ² Â· highlight hÃ´m nay Â· Ã´ nháº­p sá»‘)',
  cssHtml.includes('.x2-say-frame[hidden]') && cssHtml.includes('.kiln-tile.kiln--active') &&
  cssHtml.includes('.kiln-tile.kiln--ready') && cssHtml.includes('.kiln-tile.kiln--idle') &&
  cssHtml.includes('.kiln-ready-chip') && cssHtml.includes('.kiln-start-date') && cssHtml.includes('.kiln-menu') &&
  cssHtml.includes('.kiln-legend') && cssHtml.includes('.kiln-kho-drop.kiln-drop-over') &&
  cssHtml.includes('.kiln-aisle') && cssHtml.includes('.kiln-tile.kiln-wide') &&
  cssHtml.includes('.kiln-hum-matrix-wrap') && cssHtml.includes('.km-kiln') &&
  cssHtml.includes('.km-today-chip') && cssHtml.includes('.km-input') && cssHtml.includes('.km-ok'));
check('Cáº¤U TRÃšC (styles.css): DANH SÃCH NAN trÃªn tháº» lÃ² â€” pop hover (media hover:hover) + khá»‘i tÄ©nh khi má»Ÿ menu',
  cssHtml.includes('.kiln-nan-pop') && cssHtml.includes('@media (hover: hover)') &&
  cssHtml.includes('.kiln-tile.kiln-open .kiln-nan-pop') && cssHtml.includes('.kiln-nan-line'));
check('Cáº¤U TRÃšC (styles.css): pop Ná»”I TRÃŠN CÃ™NG (hover cÃ³ z-index:40) + hÃ ng 2 cÄƒn pháº£i + lÃ´ rá»™ng 2Ã— (calc) + Ã´ chá» xÃ¢y',
  /\.kiln-tile:hover \{ transform:[^}]*z-index: 40;/.test(cssHtml) &&
  /\.kiln-row\.kiln-row-2\s*\{[^}]*justify-content: flex-end|\.kiln-row:last-child \{ justify-content: flex-end; \}/.test(cssHtml) &&
  cssHtml.includes('calc((100% - 11 * 8px) / 6 + 8px)') &&
  cssHtml.includes('.kiln-tile.kiln-todo'));
check('Cáº¤U TRÃšC (sw.js): CACHE_NAME v486 + js/kiln.js trong APP_SHELL',
  /nha-may-ngoc-son-v486/.test(swJs) && swJs.includes("'./js/kiln.js'"));
check('Cáº¤U TRÃšC (js): key riÃªng + ná»‘i Ä‘á»§ state/storage/cloud/history/main/events',
  jsState.includes('bamboo_tracker_qc_kiln_humidity_v1') && jsState.includes('bamboo_tracker_qc_kiln_threshold_v1') &&
  jsState.includes('bamboo_tracker_x2_say_frame_v1') && jsStorage.includes('restoreQcKilnReadings') &&
  jsStorage.includes('qcKilnThresholds') && jsCloud.includes('qcKilnReadings') &&
  jsHistory.includes('qcKilnReadings') && jsMain.includes('loadKilnData') &&
  jsEvents.includes('x2-say-tab-ctrl') && jsEvents.includes('btn-kiln-hum-save') &&
  jsEvents.includes('x2-kiln-kho-drop') && jsEvents.includes('kiln-quick-kho-form') &&
  idxHtml.includes('id="kiln-quick-kho-date"') && jsEvents.includes('kiln-hum-matrix'));

console.log(`\nKáº¾T QUáº¢: ${passed} pass, ${failed} fail`);
if (failed) process.exit(1);

