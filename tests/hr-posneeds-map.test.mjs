// tests/hr-posneeds-map.test.mjs â€” SÆ  Äá»’ BONG BÃ“NG NHÃ‚N Sá»° 3 Cáº¤P (21/10/2026)
// Kiá»ƒm thá»­: chia nhu cáº§u theo ca Â· sá»‘ liá»‡u LIVE tá»« Báº£ng bá»‘ trÃ­ (Ä‘ang bá»‘ trÃ­ /
// ká»¹ nÄƒng / dÃ¹ng chung / trÃ¹ng giá» / ngoÃ i ká»¹ nÄƒng / dá»± bá»‹) Â· ngÃ y chÆ°a cÃ³ bá»‘
// trÃ­ (no-data) Â· markup bong bÃ³ng â†’ pill â†’ chip Â· Báº£ng bá»‘ trÃ­ chia ca Â·
// gá»™p bá»™ pháº­n LÃ² HÆ¡i â†’ CÆ¡ Äiá»‡n Â· cáº¥u trÃºc (index/events/CSS/cache).
'use strict';

// â”€â”€â”€ Stubs mÃ´i trÆ°á»ng (giá»‘ng hr-posneeds.test.mjs) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function makeEl(id) {
  const el = {
    id: id || '', value: '', checked: false, disabled: false, hidden: false,
    open: true, textContent: '', innerHTML: '', style: {}, dataset: {}, _h: {},
    offsetWidth: 800, offsetHeight: 500,
    classList: { _s: new Set(), add(c){ this._s.add(c); }, remove(c){ this._s.delete(c); }, toggle(c, f){ if (f === undefined) f = !this._s.has(c); if (f) this._s.add(c); else this._s.delete(c); return f; }, contains(c){ return this._s.has(c); } },
    addEventListener(t, f) { (el._h[t] = el._h[t] || []).push(f); },
    appendChild(c) { return c; }, removeChild(c) { return c; },
    remove(){}, setAttribute(){}, removeAttribute(){}, getAttribute: () => null,
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
global.Chart = class { constructor(){} update(){} resize(){} destroy(){} };
Chart.register = () => {};
if (!global.URL.createObjectURL) global.URL.createObjectURL = () => 'blob:stub';
if (!global.URL.revokeObjectURL) global.URL.revokeObjectURL = () => {};

let pass = 0, fail = 0;
function check(name, cond) { if (cond) { pass++; console.log('PASS â€” ' + name); } else { fail++; console.log('FAIL â€” ' + name); } }

const fs = await import('fs');
const { state } = await import('../js/state.js');
const hr = await import('../js/hr.js');
state.currentUser = { username: 'admin', role: 'admin', editTabs: [], allowAdvanced: true };

const DAY = '2026-10-20';
const NO_DAY = '2026-10-21';
state.hrShifts = [
  { id: 'XÆ°á»Ÿng 2', type: 'lamca', shifts: [
    { name: 'Ca ngÃ y', start: '07:00', end: '19:00', brk: 1.5 },
    { name: 'Ca Ä‘Ãªm',  start: '19:00', end: '07:00', brk: 1 }
  ] }
];
state.hrPositions = [
  { id: 'p1', name: 'Ã‰p vÃ¡n', department: 'XÆ°á»Ÿng 2' },
  { id: 'p2', name: 'Cáº¯t chá»n', department: 'XÆ°á»Ÿng 2' },
  { id: 'pq', name: 'Kiá»ƒm cháº¥t', department: 'QC' }
];
state.hrEmployees = [
  { id: 'e1', name: 'Nguyá»…n VÄƒn A', department: 'XÆ°á»Ÿng 2', status: 'active', skills: ['p1'] },
  { id: 'e2', name: 'Tráº§n Thá»‹ B', department: 'XÆ°á»Ÿng 2', status: 'active', skills: ['p1', 'p2'] },
  { id: 'e3', name: 'LÃª VÄƒn C', department: 'XÆ°á»Ÿng 2', status: 'active', skills: ['p2'] },
  { id: 'e4', name: 'Pháº¡m VÄƒn D', department: 'QC', status: 'active', skills: ['p1'] },
  { id: 'e5', name: 'VÃµ VÄƒn E', department: 'XÆ°á»Ÿng 2', status: 'active', skills: [] },
  { id: 'e6', name: 'Äá»— Thá»‹ F', department: 'XÆ°á»Ÿng 2', status: 'quit', skills: ['p1'] }
];
state.hrPositionNeeds = [
  { id: 'n1', department: 'XÆ°á»Ÿng 2', position: 'Ã‰p vÃ¡n', positionId: 'p1', needQty: 3, haveQty: 9 },
  { id: 'n2', department: 'XÆ°á»Ÿng 2', position: 'Cáº¯t chá»n', positionId: 'p2', needQty: 1, haveQty: 9 },
  { id: 'nq', department: 'QC', position: 'Kiá»ƒm cháº¥t', positionId: 'pq', needQty: 1, haveQty: 0 }
];
state.hrAssignments = [
  { id: 'a1', date: DAY, department: 'XÆ°á»Ÿng 2', positionId: 'p1', employeeId: 'e1', shiftIdx: 0, start: '07:00', end: '19:00' },
  { id: 'a2', date: DAY, department: 'XÆ°á»Ÿng 2', positionId: 'p2', employeeId: 'e1', shiftIdx: 0, start: '07:00', end: '10:00' },
  { id: 'a3', date: DAY, department: 'XÆ°á»Ÿng 2', positionId: 'p1', employeeId: 'e2', shiftIdx: 1, start: '19:00', end: '' },
  { id: 'a4', date: DAY, department: 'XÆ°á»Ÿng 2', positionId: 'p2', employeeId: 'e3', shiftIdx: 1, start: '19:00', end: '' }
];
state.hrBoardDate = DAY;
state.hrBoardDept = 'XÆ°á»Ÿng 2';
hr.hrNeedWriteUi({ dept: '', date: DAY, onlyShort: false, showSkillLinks: false, q: '', openPos: null });

// â”€â”€â”€ A. CHIA NHU Cáº¦U NGÃ€Y â†’ Tá»ªNG CA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
check('CHIA CA: 2 ca Â· 4 â†’ 2+2', hr.hrNeedSplitOf(4, 2, 'even').join('+') === '2+2');
check('CHIA CA: 2 ca Â· 3 â†’ 2+1 (dÆ° dá»“n ca Ä‘áº§u)', hr.hrNeedSplitOf(3, 2, 'even').join('+') === '2+1');
check('CHIA CA: 2 ca Â· 5 â†’ 3+2', hr.hrNeedSplitOf(5, 2, 'even').join('+') === '3+2');
check('CHIA CA: 2 ca Â· 1 â†’ 1+1 (má»—i ca tá»‘i thiá»ƒu 1)', hr.hrNeedSplitOf(1, 2, 'even').join('+') === '1+1');
check('CHIA CA: need 0 â†’ 0+0 (khÃ´ng tá»± bá»‹a 1)', hr.hrNeedSplitOf(0, 2, 'even').join('+') === '0+0');
check('CHIA CA: 1 ca â†’ giá»¯ nguyÃªn', hr.hrNeedSplitOf(3, 1, 'even').join('+') === '3');
check('CHIA CA: cháº¿ Ä‘á»™ "má»—i ca Ä‘á»§ N" â†’ 3+3', hr.hrNeedSplitOf(3, 2, 'each').join('+') === '3+3');
check('CHIA CA: 3 ca Â· 4 â†’ 2+1+1', hr.hrNeedSplitOf(4, 3, 'even').join('+') === '2+1+1');

// â”€â”€â”€ B. Sá» LIá»†U LIVE Tá»ª Báº¢NG Bá» TRÃ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const all = hr.hrNeedAllRows(DAY);
const ctx = all.ctx;
const r1 = all.rows.find(r => r.positionId === 'p1');
const r2 = all.rows.find(r => r.positionId === 'p2');
const rq = all.rows.find(r => r.positionId === 'pq');
check('LIVE: Ä‘á»c Ä‘Æ°á»£c 4 lÆ°á»£t bá»‘ trÃ­ cá»§a ngÃ y', ctx.assigns.length === 4 && ctx.hasData === true);
check('LIVE: Ã‰p vÃ¡n cáº§n 3 â†’ chia 2+1', r1.needPerShift.join('+') === '2+1' && r1.needTotal === 3);
check('LIVE: Ã‰p vÃ¡n cÃ³ 1 ngÆ°á»i ca 1 + 1 ngÆ°á»i ca 2', r1.counts.join('+') === '1+1' && r1.assignedTotal === 2);
check('LIVE: Ã‰p vÃ¡n thiáº¿u 1 (theo ca, KHÃ”NG theo unique)', r1.shortage === 1 && r1.status === 'short');
check('LIVE: Cáº¯t chá»n cáº§n 1 â†’ 1+1 = 2 suáº¥t', r2.needPerShift.join('+') === '1+1' && r2.needTotal === 2);
check('LIVE: Cáº¯t chá»n Ä‘á»§ 2 suáº¥t', r2.shortage === 0 && r2.covered === 2);
check('LIVE: QC chÆ°a bá»‘ trÃ­ ai â†’ thiáº¿u 1', rq.shortage === 1 && rq.assignedTotal === 0);
check('Ká»¸ NÄ‚NG: Ã‰p vÃ¡n 3 ngÆ°á»i (bá» NV Ä‘Ã£ nghá»‰)', r1.skilled === 3 && r1.skilledSame === 2);
check('Ká»¸ NÄ‚NG: 1 ngÆ°á»i 2 ká»¹ nÄƒng KHÃ”NG bá»‹ Ä‘áº¿m thÃ nh 2 ngÆ°á»i á»Ÿ 1 vá»‹ trÃ­', r1.skilled === 3 && r2.skilled === 2);
check('Dá»° Bá»Š: Ã‰p vÃ¡n cÃ²n e4 (QC) chÆ°a bá»‘ trÃ­ + ráº£nh', r1.reserveIds.join(',') === 'e4' && r1.reserveIdleIds.join(',') === 'e4');
check('DÃ™NG CHUNG: e1 lÃ m 2 vá»‹ trÃ­', ctx.shared.has('e1') && r1.sharedEmpIds.includes('e1') && r2.sharedEmpIds.includes('e1'));
check('TRÃ™NG GIá»œ: a1 (07â€“19) vÃ  a2 (07â€“10) cá»§a e1 bá»‹ Ä‘Ã¡nh dáº¥u', ctx.conflict.has('a1') && ctx.conflict.has('a2') && r1.conflictIds.includes('e1'));
check('NGOÃ€I Ká»¸ NÄ‚NG: e1 (chá»‰ cÃ³ ká»¹ nÄƒng Ã‰p vÃ¡n) lÃ m Cáº¯t chá»n', r2.unskilledIds.join(',') === 'e1' && r1.unskilledIds.length === 0);
check('CHÆ¯A KHAI Ká»¸ NÄ‚NG: khÃ´ng bá»‹ káº¿t luáº­n "ngoÃ i ká»¹ nÄƒng"', !r1.unskilledIds.includes('e5'));

// â”€â”€â”€ C. Tá»”NG Há»¢P + BONG BÃ“NG Bá»˜ PHáº¬N â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const t2 = hr.hrNeedTotalsOf(all.rows, 'XÆ°á»Ÿng 2');
check('Tá»”NG XÆ°á»Ÿng 2: cáº§n 5 suáº¥t (3 + 1+1)', t2.need === 5);
check('Tá»”NG XÆ°á»Ÿng 2: bá»‘ trÃ­ 4 Â· thiáº¿u 1', t2.assigned === 4 && t2.shortage === 1);
check('Tá»”NG: 1 ngÆ°á»i dÃ¹ng chung Â· 1 ngÆ°á»i ngoÃ i ká»¹ nÄƒng', t2.shared === 1 && t2.unskilled === 1);
const tAll = hr.hrNeedTotalsOf(all.rows);
check('Tá»”NG toÃ n bá»™: cáº§n 6 Â· thiáº¿u 2 (QC thiáº¿u 1)', tAll.need === 6 && tAll.shortage === 2);
const sums = hr.hrNeedDeptSummaries(all.rows, ctx);
check('BONG BÃ“NG: Ä‘Ãºng 5 bá»™ pháº­n (LÃ² HÆ¡i Ä‘Ã£ gá»™p)', sums.length === 5 && hr.HR_DEPARTMENTS.length === 5);
check('BONG BÃ“NG: XÆ°á»Ÿng 2 = short, QC = short, VÄƒn PhÃ²ng = empty', sums.find(s => s.dept === 'XÆ°á»Ÿng 2').status === 'short' && sums.find(s => s.dept === 'QC').status === 'short' && sums.find(s => s.dept === 'VÄƒn PhÃ²ng').status === 'empty');

// â”€â”€â”€ D. MARKUP 3 Cáº¤P + Báº¢NG Bá» TRÃ CHIA CA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const ui0 = hr.hrNeedReadUi();
const bubHtml = hr.hnmBubblesHtml(all.rows, ctx, '');
check('MARKUP: 5 bong bÃ³ng bá»™ pháº­n (data-hnm-dept)', (bubHtml.match(/data-hnm-dept=/g) || []).length === 5);
check('MARKUP: bong bÃ³ng cÃ³ nÆ°á»›c dÃ¢ng --fill + tÃªn bá»™ pháº­n', bubHtml.includes('--fill:') && bubHtml.includes('XÆ°á»Ÿng 2'));
const row1 = hr.hnmPosRowHtml(r1, ctx, ui0);
check('MARKUP: pill Ã‰p vÃ¡n cÃ³ chip chia ca 2+1', row1.includes('hnm-pos-pill') && row1.includes('>2+1<'));
check('MARKUP: pill cÃ³ Ã´ sá»­a "Cáº§n" + Ã´ thiáº¿u báº¥m Ä‘Æ°á»£c', row1.includes('data-hnm-need="n1"') && row1.includes('data-hnm-add="p1"'));
check('MARKUP: cáº¥p 3 hiá»‡n chip ngÆ°á»i (e1) + badge dÃ¹ng chung', row1.includes('data-hnm-person="e1"') && row1.includes('is-shared'));
const row2 = hr.hnmPosRowHtml(r2, ctx, ui0);
check('MARKUP: chip e1 á»Ÿ Cáº¯t chá»n cÃ³ cá» dÃ¹ng chung + trÃ¹ng giá» + ngoÃ i ká»¹ nÄƒng', row2.includes('is-shared') && row2.includes('is-conflict') && row2.includes('is-unskilled'));
const sharedHtml = hr.hnmSharedColHtml(all.rows, ctx, 'XÆ°á»Ÿng 2', ui0);
check('MARKUP: cá»™t pháº£i liá»‡t kÃª "NgÆ°á»i lÃ m nhiá»u vá»‹ trÃ­"', sharedHtml.includes('NgÆ°á»i lÃ m nhiá»u vá»‹ trÃ­') && sharedHtml.includes('data-hnm-node-pos="p1"'));
const sharedSkill = hr.hnmSharedColHtml(all.rows, ctx, 'XÆ°á»Ÿng 2', Object.assign({}, ui0, { showSkillLinks: true }));
check('MARKUP: báº­t "ÄÆ°á»ng ká»¹ nÄƒng" -> node dá»± bá»‹ e4 + data vá»‹ trÃ­', sharedSkill.includes('is-reserve') && sharedSkill.includes('data-hnm-reserve-pos="p1"'));

hr.renderHrBoard();
const boardHtml = document.getElementById('hr-board').innerHTML;
check('BOARD: Ã‰p vÃ¡n "cáº§n 3 â†’ 2+1"', boardHtml.includes('cáº§n 3 â†’ 2+1'));
check('BOARD: Cáº¯t chá»n "cáº§n 2 â†’ 1+1"', boardHtml.includes('cáº§n 2 â†’ 1+1'));
check('BOARD: chá»‰ cÃ²n 1 Ã´ trá»‘ng (Ã‰p vÃ¡n ca 1 thiáº¿u 1)', (boardHtml.match(/slot empty/g) || []).length === 1);
state.hrPositionNeeds.find(r => r.id === 'n1').needMode = 'each';
hr.renderHrBoard();
const boardEach = document.getElementById('hr-board').innerHTML;
check('BOARD: "má»—i ca Ä‘á»§ N" -> cáº§n 6 â†’ 3+3', boardEach.includes('cáº§n 6 â†’ 3+3'));
check('BOARD: má»—i ca Ä‘á»§ N -> 4 Ã´ trá»‘ng', (boardEach.match(/slot empty/g) || []).length === 4);
state.hrPositionNeeds.find(r => r.id === 'n1').needMode = 'even';

// â”€â”€â”€ E. RENDER THáºº + NGÃ€Y CHÆ¯A CÃ“ Bá» TRÃ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
hr.renderHrNeedCard();
check('RENDER: 5 bong bÃ³ng trong #hnm-dept-bubbles', (document.getElementById('hnm-dept-bubbles').innerHTML.match(/data-hnm-dept=/g) || []).length === 5);
check('RENDER: KPI cÃ³ "Ä‘ang bá»‘ trÃ­" + "cÃ²n thiáº¿u"', document.getElementById('hnm-kpi').innerHTML.includes('Ä‘ang bá»‘ trÃ­') && document.getElementById('hnm-kpi').innerHTML.includes('cÃ²n thiáº¿u'));
check('RENDER: chip tá»•ng "cáº§n 6 suáº¥t Â· Ä‘ang bá»‘ trÃ­ 4 Â· cÃ²n thiáº¿u 2"', document.getElementById('hr-posneed-count').textContent.includes('cáº§n 6 suáº¥t') && document.getElementById('hr-posneed-count').textContent.includes('Ä‘ang bá»‘ trÃ­ 4') && document.getElementById('hr-posneed-count').textContent.includes('cÃ²n thiáº¿u 2'));
check('RENDER: báº£ng chi tiáº¿t cÃ³ cá»™t "CÃ³ Ká»¹ NÄƒng" + "DÃ¹ng Chung"', document.getElementById('hr-posneed-body').innerHTML.includes('hnm-shared-tag'));
hr.hnmSelectDept('XÆ°á»Ÿng 2');
check('RENDER: chá»n bá»™ pháº­n -> data-dept + 2 pill vá»‹ trÃ­', document.getElementById('hr-need-map').dataset.dept === 'XÆ°á»Ÿng 2' && (document.getElementById('hnm-pos-col').innerHTML.match(/hnm-pos-pill/g) || []).length === 2);
check('RENDER: chá»n bá»™ pháº­n -> chip tá»•ng theo bá»™ pháº­n (cáº§n 5 suáº¥t)', document.getElementById('hr-posneed-count').textContent.includes('cáº§n 5 suáº¥t'));
hr.hnmSetDate(NO_DAY);
const rowsNo = hr.hrNeedAllRows(NO_DAY).rows;
check('NO-DATA: ngÃ y chÆ°a bá»‘ trÃ­ -> má»i vá»‹ trÃ­ "no-data", thiáº¿u = 0', rowsNo.every(r => r.status === 'no-data' && r.shortage === 0 && r.covered === 0));
check('NO-DATA: chip tá»•ng ghi rÃµ chÆ°a cÃ³ dá»¯ liá»‡u bá»‘ trÃ­', document.getElementById('hr-posneed-count').textContent.includes('chÆ°a cÃ³ dá»¯ liá»‡u bá»‘ trÃ­'));
check('NO-DATA: khÃ´ng bÃ¡o thiáº¿u trong báº£ng (Ã´ "â€”")', document.getElementById('hr-posneed-body').innerHTML.includes('>â€”</strong>'));
hr.hnmSetDate(DAY);
hr.hnmBack();

// â”€â”€â”€ F. Gá»˜P Bá»˜ PHáº¬N "LÃ’ HÆ I" â†’ "CÆ  ÄIá»†N" â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
state.hrEmployees.push({ id: 'm1', name: 'LÃ² HÆ¡i A', department: 'LÃ² HÆ¡i', status: 'active', skills: [] });
state.hrPositions.push({ id: 'mp', name: 'Äá»‘t lÃ²', department: 'LÃ² HÆ¡i' });
state.hrPositionNeeds.push({ id: 'mn', department: 'LÃ² HÆ¡i', position: 'Äá»‘t lÃ²', positionId: 'mp', needQty: 1 });
state.hrRecruitment = [{ id: 'mr', department: 'LÃ² HÆ¡i', position: 'Äá»‘t lÃ²', needQty: 1 }];
state.hrAssignments.push({ id: 'ma', date: DAY, department: 'LÃ² HÆ¡i', positionId: 'mp', employeeId: 'm1', shiftIdx: 0, start: '07:00', end: '' });
state.hrShifts.push({ id: 'LÃ² HÆ¡i', type: 'hanhchinh', shifts: [{ name: 'SÃ¡ng', start: '07:00', end: '11:30' }] });
state.hrBoardDept = 'LÃ² HÆ¡i';
const moved = hr.migrateHrDeptMerge();
check('Gá»˜P BP: di trÃº 5 miá»n (nhÃ¢n viÃªn Â· vá»‹ trÃ­ Â· nhu cáº§u Â· tuyá»ƒn Â· bá»‘ trÃ­)', moved >= 5);
check('Gá»˜P BP: employees -> CÆ¡ Äiá»‡n', state.hrEmployees.find(e => e.id === 'm1').department === 'CÆ¡ Äiá»‡n');
check('Gá»˜P BP: positions -> CÆ¡ Äiá»‡n', state.hrPositions.find(p => p.id === 'mp').department === 'CÆ¡ Äiá»‡n');
check('Gá»˜P BP: nhu cáº§u -> CÆ¡ Äiá»‡n', state.hrPositionNeeds.find(r => r.id === 'mn').department === 'CÆ¡ Äiá»‡n');
check('Gá»˜P BP: tuyá»ƒn dá»¥ng -> CÆ¡ Äiá»‡n', state.hrRecruitment[0].department === 'CÆ¡ Äiá»‡n');
check('Gá»˜P BP: bá»‘ trÃ­ -> CÆ¡ Äiá»‡n', state.hrAssignments.find(a => a.id === 'ma').department === 'CÆ¡ Äiá»‡n');
check('Gá»˜P BP: cáº¥u hÃ¬nh ca "LÃ² HÆ¡i" Ä‘á»•i id thÃ nh "CÆ¡ Äiá»‡n"', !!state.hrShifts.find(s => s.id === 'CÆ¡ Äiá»‡n') && !state.hrShifts.find(s => s.id === 'LÃ² HÆ¡i'));
check('Gá»˜P BP: báº£ng bá»‘ trÃ­ Ä‘ang xem -> CÆ¡ Äiá»‡n', state.hrBoardDept === 'CÆ¡ Äiá»‡n');
check('Gá»˜P BP: cháº¡y láº§n 2 KHÃ”NG lÃ m gÃ¬ (idempotent)', hr.migrateHrDeptMerge() === 0);
// CÃ³ Cáº¢ 2 cáº¥u hÃ¬nh ca -> giá»¯ CÆ¡ Äiá»‡n, bá» LÃ² HÆ¡i
state.hrShifts.push({ id: 'LÃ² HÆ¡i', type: 'lamca', shifts: [{ name: 'Ca 1', start: '06:00', end: '18:00' }] });
state.hrEmployees.push({ id: 'm2', name: 'LÃ² HÆ¡i B', department: 'LÃ² HÆ¡i', status: 'active', skills: [] });
hr.migrateHrDeptMerge();
check('Gá»˜P BP: cÃ³ cáº£ 2 cáº¥u hÃ¬nh -> chá»‰ cÃ²n CÆ¡ Äiá»‡n', !state.hrShifts.find(s => s.id === 'LÃ² HÆ¡i') && state.hrEmployees.find(e => e.id === 'm2').department === 'CÆ¡ Äiá»‡n');
check('ALIAS: "LÃ² HÆ¡i" -> "CÆ¡ Äiá»‡n"', hr.hrDeptAliasOf('LÃ² HÆ¡i') === 'CÆ¡ Äiá»‡n');
check('ALIAS: nháº­p Excel "lo hoi" -> "CÆ¡ Äiá»‡n"', hr.hrNormDept('lo hoi') === 'CÆ¡ Äiá»‡n');
check('ALIAS: "XÆ°á»Ÿng 2" giá»¯ nguyÃªn', hr.hrDeptAliasOf('XÆ°á»Ÿng 2') === 'XÆ°á»Ÿng 2');
check('KHÃ”NG Äá»¤NG: vá»‹ trÃ­ nháº­p nguyÃªn liá»‡u "lo-hoi" giá»¯ nguyÃªn', hr.hrDeptAliasOf('lo-hoi') === 'lo-hoi');
check('DANH Má»¤C: Ä‘Ãºng 5 bá»™ pháº­n, khÃ´ng cÃ²n LÃ² HÆ¡i', hr.HR_DEPARTMENTS.length === 5 && !hr.HR_DEPARTMENTS.includes('LÃ² HÆ¡i'));

// â”€â”€â”€ G. Cáº¤U TRÃšC (index / events / main / CSS / cache) â”€â”€â”€â”€â”€â”€â”€â”€â”€
const idx = fs.readFileSync('index.html', 'utf8');
const evSrc = fs.readFileSync('js/events.js', 'utf8');
const mainSrc = fs.readFileSync('js/main.js', 'utf8');
const cssSrc = fs.readFileSync('styles.css', 'utf8');
const swSrc = fs.readFileSync('sw.js', 'utf8');
const stateSrc = fs.readFileSync('js/state.js', 'utf8');
const expSrc = fs.readFileSync('js/export-xlsx.js', 'utf8');
check('Cáº¤U TRÃšC: index cÃ³ Ä‘á»§ khá»‘i sÆ¡ Ä‘á»“ 3 cáº¥p', ['hr-need-map', 'hnm-toolbar', 'hnm-kpi', 'hnm-dept-bubbles', 'hnm-focus', 'hnm-pos-col', 'hnm-shared-col', 'hnm-links', 'hnm-legend'].every(id => idx.includes(`id="${id}"`)));
check('Cáº¤U TRÃšC: Ä‘Ã£ bá» select lá»c bá»™ pháº­n cÅ©', !idx.includes('hr-posneed-filter-dept'));
check('Cáº¤U TRÃšC: báº£ng chi tiáº¿t thu gá»n + cá»™t má»›i', idx.includes('hnm-table-box') && idx.includes('CÃ³ Ká»¹ NÄƒng') && idx.includes('Äang Bá»‘ TrÃ­'));
check('Cáº¤U TRÃšC: modal cÃ³ chá»n "CÃ¡ch Chia Ca"', idx.includes('id="posneed-mode"') && idx.includes('Má»—i ca Ä‘á»§ N'));
check('WIRING: events uá»· nhiá»‡m bong bÃ³ng / Ã´ Cáº§n / váº½ láº¡i Ä‘Æ°á»ng', evSrc.includes('data-hnm-dept') && evSrc.includes('data-hnm-need') && evSrc.includes('hnmDrawLinks'));
check('WIRING: main.js xuáº¥t hÃ m sÆ¡ Ä‘á»“ cho onclick', mainSrc.includes('hnmOpenAssign') && mainSrc.includes('hnmSelectDept'));
check('EXCEL: bÃ¡o cÃ¡o cÃ³ cá»™t Cáº§n Ca 1 / NgoÃ i Ká»¹ NÄƒng / DÃ¹ng Chung', expSrc.includes('Cáº§n Ca 1') && expSrc.includes('NgoÃ i Ká»¹ NÄƒng') && expSrc.includes('DÃ¹ng Chung'));
check('CSS: khá»‘i .hnm-* á»Ÿ cáº¥p cao nháº¥t (khÃ´ng lá»t vÃ o @media)', (() => {
  const i = cssSrc.indexOf('.hnm-pos {');
  if (i < 0) return false;
  let d = 0;
  for (let k = 0; k < i; k++) { if (cssSrc[k] === '{') d++; else if (cssSrc[k] === '}') d--; }
  return d === 0;
})());
check('CSS: ngoáº·c { } cÃ¢n báº±ng + cÃ³ keyframes', (cssSrc.match(/{/g) || []).length === (cssSrc.match(/}/g) || []).length && cssSrc.includes('@keyframes hnmFloat'));
check('CACHE: sw.js v486 khá»›p APP_VERSION', /nha-may-ngoc-son-v486/.test(swSrc) && /APP_VERSION = 'v486'/.test(stateSrc));

// â”€â”€â”€ H. Má»ž THáºº THáº¬T â€” CHá»NG Lá»–I "THáºº TRá»NG" (map tháº» â†” pháº§n váº½) â”€
check('THáºº: map cÃ³ Ä‘Ãºng id tháº­t "hr-posneed-card" -> posneeds', hr.hrCardRenderParts('hr-posneed-card').includes('posneeds'));
check('THáºº: alias id cÅ© "hr-posneeds-card" váº«n cháº¡y', hr.hrCardRenderParts('hr-posneeds-card').includes('posneeds'));
check('THáºº: id láº¡ -> váº½ Äá»¦ pháº§n (khÃ´ng tráº£ rá»—ng)', hr.hrCardRenderParts('tháº»-khÃ´ng-tá»“n-táº¡i').length >= 5);
check('THáºº: khÃ´ng cÃ³ tháº» má»Ÿ -> [] (giá»¯ tá»‘i Æ°u chá»‰ váº½ báº£ng bá»‘ trÃ­)', hr.hrCardRenderParts('').length === 0);
const cardIds = [...idx.matchAll(/data-hr-card="([^"]+)"/g)].map(m => m[1]);
check('THáºº: 12 tháº» launcher Ä‘á»u cÃ³ pháº§n váº½ (khÃ´ng tháº» nÃ o trá»‘ng)', cardIds.length === 12 && cardIds.every(id => hr.hrCardRenderParts(id).length > 0));
hr.hrOpenCard('hr-posneed-card');
check('Má»ž THáºº: toolbar + KPI cÃ³ ná»™i dung', document.getElementById('hnm-toolbar').innerHTML.length > 100 && document.getElementById('hnm-kpi').innerHTML.includes('Ä‘ang bá»‘ trÃ­'));
check('Má»ž THáºº: bong bÃ³ng bá»™ pháº­n Ä‘Æ°á»£c váº½', (document.getElementById('hnm-dept-bubbles').innerHTML.match(/data-hnm-dept=/g) || []).length === 5);
check('Má»ž THáºº: báº£ng chi tiáº¿t cÃ³ dÃ²ng dá»¯ liá»‡u', document.getElementById('hr-posneed-body').innerHTML.includes('hnm-status'));

console.log(`\nWYNIK: ${pass} pass, ${fail} fail`);
if (fail > 0) process.exit(1);

