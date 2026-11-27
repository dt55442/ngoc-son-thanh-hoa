// tests/planning-sync-stamp.test.mjs â€” Káº¾ HOáº CH SX: Báº¢N Sá»¬A PHáº¢I THáº®NG KHI Äá»’NG Bá»˜
// Sá»­a lá»—i ngÆ°á»i dÃ¹ng bÃ¡o: "tháº» káº¿ hoáº¡ch sx tá»± há»“i sinh sá»‘ ban Ä‘áº§u sau khi sá»­a".
// NGUYÃŠN NHÃ‚N: js/planning.js trÆ°á»›c Ä‘Ã¢y KHÃ”NG ghi `updatedAt` á»Ÿ báº¥t ká»³ Ä‘Æ°á»ng ghi
// nÃ o. NhÃ¡nh sá»­a tháº» chá»‰ Ä‘á»•i item.qty táº¡i chá»—, giá»¯ nguyÃªn createdAt cÅ© â†’ khi Ä‘á»“ng
// bá»™, cloud.recCompare() hÃ²a má»‘c thá»i gian â†’ quyáº¿t Ä‘á»‹nh báº±ng BÄ‚M Ná»˜I DUNG â†’ báº£n
// trÃªn mÃ¢y (sá»‘ cÅ©) cÃ³ thá»ƒ "tháº¯ng" â†’ sá»‘ vá»«a nháº­p bá»‹ tráº£ vá». Nay má»i Ä‘Æ°á»ng ghi Ä‘á»u
// ghi updatedAt nÃªn báº£n sá»­a luÃ´n má»›i hÆ¡n vÃ  Ä‘Æ°á»£c giá»¯.
'use strict';
import fs from 'node:fs';
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
const qtyInputs = [];   // cÃ¡c Ã´ "#plan-edit-items .plan-edit-qty"
global.document = {
  body: makeEl('body'), head: makeEl('head'), documentElement: makeEl('html'),
  activeElement: null, readyState: 'complete', visibilityState: 'visible',
  getElementById(id) { if (!els.has(id)) els.set(id, makeEl(id)); return els.get(id); },
  createElement: () => makeEl(), createTextNode: (t) => ({ textContent: t }),
  querySelector: () => makeEl(),
  querySelectorAll: (sel) => (String(sel).indexOf('plan-edit-qty') >= 0 ? qtyInputs.slice() : []),
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
  clear: () => storeBacking.clear(), key: (i) => [...storeBacking.keys()][i] ?? null,
  get length() { return storeBacking.size; }
};
global.addEventListener = () => {}; global.removeEventListener = () => {}; global.dispatchEvent = () => true;
global.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
global.cancelAnimationFrame = clearTimeout;
global.window = global; global.self = global;
global.alert = () => {}; global.confirm = () => true; global.prompt = () => '';
global.lucide = { createIcons(){} };
global.Chart = class { constructor(){ this.data = { labels: [], datasets: [] }; } update(){} resize(){} destroy(){} render(){} reset(){} getDatasetMeta(){ return { data: [] }; } };
Chart.register = () => {};
if (!global.URL.createObjectURL) global.URL.createObjectURL = () => 'blob:stub';
if (!global.URL.revokeObjectURL) global.URL.revokeObjectURL = () => {};
global.XLSX = { utils: { book_new: () => ({ SheetNames: [] }), aoa_to_sheet: () => ({}), json_to_sheet: () => ({}), book_append_sheet(){}, encode_cell: () => 'A1', decode_range: () => ({ s: { r: 0, c: 0 }, e: { r: 0, c: 0 } }) }, writeFile(){}, write: () => new ArrayBuffer(8) };
global.ResizeObserver = class { observe(){} unobserve(){} disconnect(){} };
global.Image = class { set src(_) {} addEventListener(){} };
global.fetch = async () => ({ ok: false, status: 0, statusText: 'offline-stub', json: async () => ({}), text: async () => '' });

const plan = await import('../js/planning.js');
const cloud = await import('../js/cloud.js');
const { state } = await import('../js/state.js');
const SRC = (p) => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const preventDefault = () => {};

let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; console.log('  âœ“ ' + name); }
  else { fail++; console.error('  âœ— ' + name); }
}


// â”€â”€â”€ A. THÃŠM Káº¾ HOáº CH Má»šI: cÃ³ createdAt + updatedAt â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
{
  state.currentUser = { email: 'admin@test.local', fullname: 'Admin', role: 'admin' };
  state.materialRates = [{ id: 'r1', product: 'VÃ¡n 1200x382x12', nan1: '1250x22x8', nanQty1: 40, efficiency: 70, createdAt: '2026-10-01T00:00:00.000Z' }];
  state.planningItems = [];
  document.getElementById('plan-item-year').value = '2026';
  document.getElementById('plan-item-week').value = '40';
  document.getElementById('plan-item-product').value = 'r1';
  document.getElementById('plan-item-qty').value = '250';
  plan.handlePlanningItemSubmit({ preventDefault });
  const it = state.planningItems[0];
  check('A1: thÃªm káº¿ hoáº¡ch cÃ³ createdAt + updatedAt', !!it && !!it.createdAt && !!it.updatedAt);
  check('A2: sá»‘ lÆ°á»£ng Ä‘Ãºng nhÆ° nháº­p', it && it.qty === 250);
}

// â”€â”€â”€ B. Sá»¬A THáºº: updatedAt má»›i â†’ báº£n sá»­a THáº®NG báº£n mÃ¢y cÅ© â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
{
  state.planningItems = [{
    id: 'p1', week: 'Tuáº§n 40', year: 2026, productId: 'r1', qty: 250,
    createdAt: '2026-10-01T00:00:00.000Z'
  }];
  cloud.captureSyncBase(null, {});
  document.getElementById('plan-edit-mode').value = 'edit';
  document.getElementById('plan-edit-year').value = '2026';
  document.getElementById('plan-edit-week').value = '40';
  document.getElementById('plan-edit-id').value = 'p1';
  qtyInputs.length = 0;
  qtyInputs.push(Object.assign(makeEl('qty1'), { value: '400' }));
  plan.handlePlanningEditSubmit({ preventDefault });
  const after = state.planningItems.find(p => p.id === 'p1');
  check('B1: sá»­a xong sá»‘ lÆ°á»£ng = 400 (mÃ¡y)', after.qty === 400);
  check('B2: báº£n sá»­a CÃ“ updatedAt má»›i (Ä‘iá»u kiá»‡n Ä‘á»ƒ tháº¯ng khi Ä‘á»“ng bá»™)',
    !!after.updatedAt && after.updatedAt > after.createdAt);

  const cloudOld = [{ id: 'p1', week: 'Tuáº§n 40', year: 2026, productId: 'r1', qty: 250, createdAt: '2026-10-01T00:00:00.000Z' }];
  cloud.mergeRemoteIntoLocal({ planningItems: cloudOld }, false, true, { protectDirty: true, mergeNewer: true });
  check('B3: SAU Äá»’NG Bá»˜ sá»‘ lÆ°á»£ng váº«n lÃ  400 (khÃ´ng bá»‹ há»“i sinh vá» 250)',
    state.planningItems.find(p => p.id === 'p1').qty === 400);
  check('B4: khÃ´ng sinh thÃªm dÃ²ng trÃ¹ng', state.planningItems.filter(p => p.id === 'p1').length === 1);

// â”€â”€â”€ C. NHÃ‚N Báº¢N THáºº + D. Äá»ŠNH Má»¨C + E. Cáº¤U TRÃšC â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
{
  state.planningItems = [{ id: 'p1', week: 'Tuáº§n 40', year: 2026, productId: 'r1', qty: 250, createdAt: '2026-10-01T00:00:00.000Z' }];
  document.getElementById('plan-edit-mode').value = 'dup';
  document.getElementById('plan-edit-year').value = '2026';
  document.getElementById('plan-edit-week').value = '41';
  document.getElementById('plan-edit-id').value = 'p1';
  qtyInputs.length = 0;
  qtyInputs.push(Object.assign(makeEl('qty2'), { value: '300' }));
  plan.handlePlanningEditSubmit({ preventDefault });
  const dup = state.planningItems.find(p => p.duplicatedFrom === 'p1');
  check('C1: nhÃ¢n báº£n ra báº£n sao tuáº§n 41, sá»‘ 300', !!dup && dup.qty === 300 && dup.week === 'Tuáº§n 41');
  check('C2: báº£n sao cÃ³ createdAt + updatedAt', !!dup && !!dup.createdAt && !!dup.updatedAt);
  check('C3: báº£n gá»‘c khÃ´ng bá»‹ sá»­a', state.planningItems.find(p => p.id === 'p1').qty === 250);
}
{
  state.materialRates = [{
    id: 'r1', product: 'VÃ¡n 1200x382x12', nan1: '1250x22x8', nan1Qty: 40, efficiency: 70,
    createdAt: '2026-10-01T00:00:00.000Z'
  }];
  document.getElementById('mat-rate-id').value = 'r1';
  document.getElementById('mat-rate-product').value = 'VÃ¡n 1200x382x12';
  document.getElementById('mat-rate-nan-use').value = 'VÃ¡n';
  document.getElementById('mat-rate-unit').value = 'Táº¥m';
  document.getElementById('mat-rate-code').value = '';
  document.getElementById('mat-rate-fullname').value = '';
  document.getElementById('mat-rate-press-type').value = '';
  document.getElementById('mat-rate-nan1').value = '1250x22x8';
  document.getElementById('mat-rate-nan1-qty').value = '40';
  document.getElementById('mat-rate-nan2').value = '';
  document.getElementById('mat-rate-nan2-qty').value = '';
  document.getElementById('mat-rate-nan3').value = '';
  document.getElementById('mat-rate-nan3-qty').value = '';
  document.getElementById('mat-rate-glue').value = '0.5';
  document.getElementById('mat-rate-additive').value = '0.05';
  document.getElementById('mat-rate-efficiency').value = '75';
  plan.handleMaterialRateSubmit({ preventDefault });
  const r = state.materialRates[0];
  check('D1: sá»­a Ä‘á»‹nh má»©c giá»¯ Ä‘Ãºng hiá»‡u suáº¥t má»›i', r.efficiency === 75);
  check('D2: createdAt gá»‘c Ä‘Æ°á»£c GIá»® (lá»‹ch sá»­ khÃ´ng bá»‹ Ä‘á»•i)', r.createdAt === '2026-10-01T00:00:00.000Z');
  check('D3: báº£n sá»­a cÃ³ updatedAt má»›i â†’ tháº¯ng báº£n mÃ¢y khi Ä‘á»“ng bá»™',
    !!r.updatedAt && r.updatedAt > r.createdAt);
  cloud.mergeRemoteIntoLocal({
    materialRates: [{ id: 'r1', product: 'VÃ¡n 1200x382x12', nan1: '1250x22x8', nan1Qty: 40, efficiency: 70, createdAt: '2026-10-01T00:00:00.000Z' }]
  }, false, true, { protectDirty: true, mergeNewer: true });
  check('D4: sau Ä‘á»“ng bá»™ váº«n giá»¯ hiá»‡u suáº¥t vá»«a sá»­a (75)', state.materialRates[0].efficiency === 75);
}
{
  const src = SRC('js/planning.js');
  check('E1: handlePlanningItemSubmit ghi updatedAt', /state\.planningItems\.push\(\{[\s\S]{0,400}?updatedAt/.test(src));
  check('E2: nhÃ¡nh Sá»¬A tháº» ghi item.updatedAt', /item\.updatedAt = nowIso;/.test(src));
  check('E3: Ä‘á»‹nh má»©c ghi updatedAt + giá»¯ createdAt khi sá»­a',
    /createdAt: rateId \? \(oldRate && oldRate\.createdAt\) \|\| nowIso : nowIso/.test(src));
  check('E4: cloud.js so sÃ¡nh báº£n ghi Ä‘Ã£ chuáº©n hÃ³a thá»© tá»± khÃ³a (recSame/canonicalJson)',
    /function canonicalJson/.test(SRC('js/cloud.js')) && /function recSame/.test(SRC('js/cloud.js')));
  check('E5: sw.js + APP_VERSION Ä‘Ã£ tÄƒng cache',
    /nha-may-ngoc-son-v486/.test(SRC('sw.js')) && /v486/.test(SRC('js/state.js')));
}

console.log('\nKáº¿t quáº£: ' + pass + ' pass, ' + fail + ' fail');
process.exit(fail ? 1 : 0);


  const noStamp = { id: 'p1', qty: 400, createdAt: '2026-10-01T00:00:00.000Z' };
  check('B5: thiáº¿u updatedAt â†’ báº£n mÃ¡y KHÃ”NG cháº¯c tháº¯ng (nguyÃªn nhÃ¢n lá»—i cÅ©)',
    cloud.recCompare(noStamp, { id: 'p1', qty: 250, createdAt: '2026-10-01T00:00:00.000Z' }) !== 1);
}
