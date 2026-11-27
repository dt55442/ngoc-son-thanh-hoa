// tests/sync-conflict.test.mjs â€” Äá»’NG Bá»˜ 2 CHIá»€U AN TOÃ€N (17/10/2026)
// Má»¥c Ä‘Ã­ch: chá»©ng minh 3 lá»—i Ä‘Ã£ sá»­a + 3 lá»›p báº£o vá»‡ má»›i:
//   A. So sÃ¡nh báº£n ghi há»™i tá»¥ (updatedAt â†’ rev â†’ bÄƒm ná»™i dung) â€” 2 mÃ¡y chá»n CÃ™NG báº£n.
//   B. Sá»• Ä‘á»“ng bá»™: biáº¿t báº£n ghi nÃ o CHÆ¯A lÃªn mÃ¢y ká»ƒ cáº£ khi thiáº¿u updatedAt.
//   C. NHáº¬N mÃ¢y nháº­n cáº£ báº£n Sá»¬A (trÆ°á»›c Ä‘Ã¢y chá»‰ bá»• sung báº£n thiáº¿u â†’ mÃ¡y khÃ¡c khÃ´ng tháº¥y).
//   D. Báº£n ghi mÃ¡y Ä‘ang sá»­a CHÆ¯A Äáº¨Y khÃ´ng bá»‹ mÃ¢y ghi Ä‘Ã¨ + ghi sá»• xung Ä‘á»™t.
//   E. Dict (Ä‘á»‹nh má»©c thÃ¡ng): chá»‰ giá»¯ khÃ³a mÃ¡y Ä‘ang sá»­a, nháº­n cÃ¡c khÃ³a khÃ¡c tá»« mÃ¢y.
//   F. Äáº©y báº±ng TRANSACTION: chá»‰ gá»™p báº£n ghi dirty â†’ KHÃ”NG xÃ³a báº£n ghi mÃ¡y khÃ¡c.
//   G. rev tÄƒng Ä‘Æ¡n Ä‘iá»‡u + lastRev/lastSyncedAt lÆ°u Ä‘Ãºng.
//   H. Cáº¥u trÃºc: index.html / events.js / styles.css / sw.js.
'use strict';
import fs from 'node:fs';

// â”€â”€â”€ Stubs mÃ´i trÆ°á»ng (giá»‘ng tests/cloud-delta.test.mjs) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
global.Chart = class { constructor(){ this.data = { labels: [], datasets: [] }; } update(){} resize(){} destroy(){} render(){} reset(){} getDatasetMeta(){ return { data: [] }; } };
Chart.register = () => {};
if (!global.URL.createObjectURL) global.URL.createObjectURL = () => 'blob:stub';
if (!global.URL.revokeObjectURL) global.URL.revokeObjectURL = () => {};
global.XLSX = { utils: { book_new: () => ({ SheetNames: [] }), aoa_to_sheet: () => ({}), json_to_sheet: () => ({}), book_append_sheet(){}, encode_cell: () => 'A1', decode_range: () => ({ s: { r: 0, c: 0 }, e: { r: 0, c: 0 } }) }, writeFile(){}, write: () => new ArrayBuffer(8) };
global.ResizeObserver = class { observe(){} unobserve(){} disconnect(){} };
global.Image = class { set src(_) {} addEventListener(){} };
global.fetch = async () => ({ ok: false, status: 0, statusText: 'offline-stub', json: async () => ({}), text: async () => '' });

// â”€â”€â”€ IMPORT MODULES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const cloud = await import('../js/cloud.js');
const { state } = await import('../js/state.js');

let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; console.log('  \u2713 ' + name); }
  else { fail++; console.error('  \u2717 ' + name); }
}
const SRC = (p) => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// â”€â”€â”€ A. SO SÃNH Báº¢N GHI Há»˜I Tá»¤ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
{
  const a = { id: 'x', qty: 10, updatedAt: '2026-10-10T00:00:00.000Z' };
  const b = { id: 'x', qty: 20, updatedAt: '2026-10-11T00:00:00.000Z' };
  check('A1: báº£n má»›i hÆ¡n (updatedAt) tháº¯ng', cloud.recCompare(b, a) > 0 && cloud.recCompare(a, b) < 0);
  check('A2: cÃ¹ng má»‘c â†’ so rev',
    cloud.recCompare({ id: 'x', rev: 2, updatedAt: a.updatedAt }, { id: 'x', rev: 1, updatedAt: a.updatedAt }) > 0);
  const c = { id: 'x', qty: 10, createdAt: '2026-10-10T00:00:00.000Z' };
  const d = { id: 'x', qty: 20, createdAt: '2026-10-10T00:00:00.000Z' };
  check('A3: THIáº¾U updatedAt + cÃ¹ng createdAt â†’ bÄƒm ná»™i dung quyáº¿t Ä‘á»‹nh (2 mÃ¡y chá»n CÃ™NG báº£n)',
    cloud.recCompare(c, d) !== 0 && Math.sign(cloud.recCompare(c, d)) === -Math.sign(cloud.recCompare(d, c)));
  check('A4: giá»‘ng há»‡t â†’ 0', cloud.recCompare(c, Object.assign({}, c)) === 0);
  check('A5: recHashOf á»•n Ä‘á»‹nh (cÃ¹ng ná»™i dung â†’ cÃ¹ng bÄƒm)', cloud.recHashOf(c) === cloud.recHashOf(Object.assign({}, c)));
}

// â”€â”€â”€ B. Sá»” Äá»’NG Bá»˜: Báº¢N GHI NÃ€O CHÆ¯A LÃŠN MÃ‚Y â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
{
  localStorage.removeItem(cloud.SYNC_STATE_KEY);
  const st = cloud.loadSyncState();
  st.base = {}; st.conflicts = []; st.lastRev = -1;
  state.batches = [{ id: 'b1', qty: 100, quantity: 1, createdAt: '2026-10-01T00:00:00.000Z' }];
  // Äá»”I CHUáº¨N 18/10/2026 (xem .clinerules quy táº¯c 73): trÆ°á»›c Ä‘Ã¢y "chÆ°a cÃ³ base"
  // bá»‹ coi lÃ  KHÃ”NG dirty â†’ mÃ¡y má»›i/xoÃ¡ cache/phá»¥c há»“i backup Máº¤T lá»›p báº£o vá»‡
  // báº£n-sá»­a-chÆ°a-Ä‘áº©y. Nay coi Má»ŒI báº£n ghi hiá»‡n cÃ³ lÃ  chÆ°a Ä‘áº©y.
  check('B0: chÆ°a cÃ³ base â†’ COI Má»ŒI báº£n ghi lÃ  dirty (báº£o vá»‡ báº£n chÆ°a Ä‘áº©y)',
    !!cloud.dirtyDomains().batches && cloud.dirtyDomains().batches.ids.join(',') === 'b1');
  cloud.captureSyncBase();
  check('B1: chá»¥p base â†’ khÃ´ng cÃ²n dirty', Object.keys(cloud.dirtyDomains()).length === 0);
  state.batches[0].qty = 150;   // sá»­a nhÆ°ng KHÃ”NG Ä‘á»•i updatedAt/createdAt
  const d = cloud.dirtyDomains();
  check('B2: sá»­a báº£n ghi (KHÃ”NG cÃ³ updatedAt) váº«n phÃ¡t hiá»‡n dirty nhá» bÄƒm ná»™i dung',
    !!d.batches && d.batches.ids.join(',') === 'b1');
  state.batches.push({ id: 'b2', qty: 5 });
  check('B3: thÃªm báº£n ghi má»›i â†’ dirty', cloud.dirtyDomains().batches.ids.includes('b2'));
  state.x2CapRates = { '2026-10': 100, '2026-11': 200 };
  cloud.captureSyncBase();
  state.x2CapRates['2026-11'] = 250;
  const d2 = cloud.dirtyDomains();
  check('B4: dict â†’ dirty theo Tá»ªNG KHÃ“A thÃ¡ng (khÃ´ng dirty cáº£ dict)',
    !!d2.x2CapRates && d2.x2CapRates.keys.join(',') === '2026-11');
}

// â”€â”€â”€ C. NHáº¬N MÃ‚Y: Báº¢N Sá»¬A PHáº¢I LAN SANG MÃY KHÃC â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
{
  state.batches = [{ id: 'b1', qty: 100, updatedAt: '2026-10-01T00:00:00.000Z' }];
  cloud.captureSyncBase();
  const remote = [{ id: 'b1', qty: 999, updatedAt: '2026-10-05T00:00:00.000Z' }];
  const changed = cloud.mergeRemoteIntoLocal({ batches: remote }, false, true, { protectDirty: true, mergeNewer: true });
  check('C1: NHáº¬N báº£n Sá»¬A tá»« mÃ¢y (má»›i hÆ¡n) â†’ mÃ¡y Ä‘á»•i theo (lá»—i cÅ©: chá»‰ bá»• sung báº£n thiáº¿u)',
    state.batches.length === 1 && state.batches[0].qty === 999 && changed === true);
}

// â”€â”€â”€ D. Báº¢N GHI MÃY ÄANG Sá»¬A CHÆ¯A Äáº¨Y: MÃ‚Y KHÃ”NG ÄÆ¯á»¢C GHI ÄÃˆ â”€â”€â”€â”€â”€
{
  state.batches = [{ id: 'b1', qty: 100, updatedAt: '2026-10-01T00:00:00.000Z' }];
  cloud.clearAllSyncConflicts();
  cloud.captureSyncBase();
  state.batches[0] = { id: 'b1', qty: 555, updatedAt: '2026-10-09T00:00:00.000Z' }; // mÃ¡y sá»­a, CHÆ¯A Ä‘áº©y
  const remote = [
    { id: 'b1', qty: 777, updatedAt: '2026-10-05T00:00:00.000Z' },
    { id: 'b9', qty: 1, updatedAt: '2026-10-06T00:00:00.000Z' }
  ];
  cloud.mergeRemoteIntoLocal({ batches: remote }, false, true, { protectDirty: true, mergeNewer: true });
  check('D1: báº£n ghi mÃ¡y Ä‘ang sá»­a CHÆ¯A Äáº¨Y khÃ´ng bá»‹ mÃ¢y ghi Ä‘Ã¨',
    state.batches.find(r => r.id === 'b1').qty === 555);
  check('D2: báº£n ghi Má»šI cá»§a mÃ¢y váº«n Ä‘Æ°á»£c nháº­n', !!state.batches.find(r => r.id === 'b9'));
  const cs = cloud.syncConflicts();
  check('D3: ghi sá»• XUNG Äá»˜T (batches Â· b1) Ä‘á»ƒ Admin xem',
    cs.some(c => c.domain === 'batches' && c.recId === 'b1'));
  check('D4: Ä‘áº¿m xung Ä‘á»™t cho menu/badge', cloud.syncConflictCount() === cs.length && cs.length >= 1);
  cloud.clearAllSyncConflicts();
}

// â”€â”€â”€ F. Äáº¨Y Báº°NG TRANSACTION: KHÃ”NG XÃ“A Báº¢N GHI Cá»¦A MÃY KHÃC â”€â”€â”€â”€â”€
{
  const store = new Map();
  const stats = { sets: 0, gets: 0 };
  let failCloudWrites = false;
  const makeDoc = (collPath, id) => {
    const key = collPath + '/' + id;
    return {
      _key: key,
      set(data) {
        stats.sets++;
        if (failCloudWrites) {
          const err = new Error('Temporary network failure');
          err.code = 'unavailable';
          throw err;
        }
        store.set(key, JSON.parse(JSON.stringify(data)));
        return Promise.resolve();
      },
      get() { stats.gets++; return Promise.resolve({ exists: store.has(key), data: () => store.get(key) }); },
      delete() { store.delete(key); return Promise.resolve(); },
      onSnapshot() { return () => {}; },
      collection(sub) { return makeColl(collPath + '/' + id + '/' + sub); },
      where() { return { get: () => Promise.resolve({ forEach(){} }) }; }
    };
  };
  const makeColl = (path) => ({
    doc: (id) => makeDoc(path, id),
    where: () => ({ get: () => Promise.resolve({ forEach(){} }) })
  });
  const fakeDb = {
    collection: (name) => makeColl(name),
    // Transaction giáº£ láº­p: Ä‘á»c/ghi NGAY vÃ o store (Firestore tháº­t Ä‘áº£m báº£o nguyÃªn tá»­)
    async runTransaction(fn) {
      const tx = { get: (ref) => ref.get(), set: (ref, data) => { ref.set(data); } };
      return fn(tx);
    }
  };
  global.__BAMBOO_FIREBASE_READY__ = true;
  global.FIREBASE_CONFIG = { ownerEmail: 'dt55442@gmail.com', projectId: 'test-sync' };
  global.firebase = {
    apps: [], initializeApp(){},
    firestore: () => fakeDb,
    auth: () => ({ onAuthStateChanged(){}, currentUser: null, signOut(){ return Promise.resolve(); } })
  };
  cloud.initFirebase();
  check('F0: Firebase (fake) báº­t â†’ cháº¿ Ä‘á»™ online', cloud.isFirebaseOnline() === true);

  // Reset sá»• Ä‘á»“ng bá»™ + dá»¯ liá»‡u tá»‘i thiá»ƒu
  const st = cloud.loadSyncState();
  st.base = {}; st.conflicts = []; st.lastRev = -1;
  state.batches = [{ id: 'a1', qty: 10, updatedAt: '2026-10-01T00:00:00.000Z' }];
  state.pressRecords = [];
  state.x2CapRates = {};

  const r1 = await cloud.writeCloudSnapshot();
  check('F1: Ä‘áº©y Ä‘áº§u báº±ng TRANSACTION (mÃ¢y trá»‘ng â†’ Ä‘áº©y Ä‘á»§)',
    r1.mode === 'delta-v1' && r1.changed > 5);
  {
    const idx = store.get('apps/main');
    const doc = store.get('apps/main/d/batches');
    check('F2: má»¥c lá»¥c cÃ³ rev â‰¥ 1 + __dh + deletedIds',
      !!idx && idx.__fmt === 'delta-v1' && typeof idx.rev === 'number' && idx.rev >= 1 && !!idx.__dh && ('deletedIds' in idx));
    check('F3: doc miá»n batches cÃ³ báº£n ghi a1', !!doc && Array.isArray(doc.data) && doc.data.some(r => r.id === 'a1'));
  }
  // ÄÃ¡nh dáº¥u Ä‘Ã£ Ä‘á»“ng bá»™ (base = dá»¯ liá»‡u vá»«a Ä‘áº©y lÃªn mÃ¢y)
  cloud.captureSyncBase();

  // MÃY B Ä‘áº©y thÃªm báº£n ghi b2 vÃ o CÃ™NG miá»n batches (mÃ´ phá»ng trá»±c tiáº¿p trÃªn mÃ¢y)
  {
    const doc = store.get('apps/main/d/batches');
    doc.data.push({ id: 'b2', qty: 22, updatedAt: '2026-10-02T00:00:00.000Z' });
    doc.h = cloud.hashStr(JSON.stringify(doc.data));
    const idx = store.get('apps/main');
    idx.__dh.batches = doc.h;
    idx.rev = (Number(idx.rev) || 0) + 1;
  }
  // MÃY A sá»­a a1 (mÃ¡y A KHÃ”NG há» biáº¿t b2) â†’ Ä‘áº©y
  state.batches[0] = { id: 'a1', qty: 99, updatedAt: '2026-10-03T00:00:00.000Z' };
  const revBefore = Number(store.get('apps/main').rev) || 0;
  const setsBefore = stats.sets;
  const r2 = await cloud.writeCloudSnapshot();
  {
    const doc = store.get('apps/main/d/batches');
    const idx = store.get('apps/main');
    const a1 = doc.data.find(r => r.id === 'a1');
    check('F4: báº£n ghi mÃ¡y A sá»­a Ä‘Æ°á»£c ghi lÃªn mÃ¢y (qty 99)', !!a1 && a1.qty === 99);
    check('F5: báº£n ghi b2 cá»§a MÃY KHÃC KHÃ”NG bá»‹ xÃ³a (transaction gá»™p, khÃ´ng Ä‘Ã¨ cáº£ miá»n)',
      doc.data.some(r => r.id === 'b2' && r.qty === 22));
    check('F6: chá»‰ ghi 1 doc miá»n + 1 má»¥c lá»¥c (= 2 lÆ°á»£t ghi)', r2.changed === 1 && (stats.sets - setsBefore) === 2);
    check('F7: rev má»¥c lá»¥c TÄ‚NG Ä‘Æ¡n Ä‘iá»‡u', (Number(idx.rev) || 0) === revBefore + 1);
    check('F8: bÄƒm má»¥c lá»¥c cá»§a miá»n batches khá»›p dá»¯ liá»‡u tháº­t trÃªn mÃ¢y',
      idx.__dh.batches === cloud.hashStr(JSON.stringify(doc.data)));
  }
  // Äá»c láº¡i qua API cÃ´ng khai
  {
    const full = await cloud.readFullCloudObject();
    check('F9: readFullCloudObject tháº¥y Ä‘á»§ 2 báº£n ghi (a1 + b2)',
      !!full && Array.isArray(full.batches) && full.batches.length === 2);
    check('F10: readFullCloudObject mang `rev` cá»§a má»¥c lá»¥c', typeof full.rev === 'number' && full.rev >= 2);
  }

  // â”€â”€â”€ G. syncNow: cáº­p nháº­t má»‘c + nháº­n báº£n sá»­a tá»« mÃ¢y â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  state.batches = [{ id: 'a1', qty: 99, updatedAt: '2026-10-03T00:00:00.000Z' }];
  {
    const doc = store.get('apps/main/d/batches');
    doc.data = doc.data.map(r => r.id === 'b2' ? Object.assign({}, r, { qty: 33, updatedAt: '2026-10-08T00:00:00.000Z' }) : r);
    doc.h = cloud.hashStr(JSON.stringify(doc.data));
    const idx = store.get('apps/main');
    idx.__dh.batches = doc.h;
    idx.rev = (Number(idx.rev) || 0) + 1;
  }
  const okSync = await cloud.syncNow({ force: true });
  await sleep(10);
  check('G1: syncNow cháº¡y Ä‘Æ°á»£c (Ä‘á»c má»¥c lá»¥c 1 láº§n)', okSync === true);
  check('G2: syncNow nháº­n báº£n b2 (báº£n ghi mÃ¡y chÆ°a cÃ³)', state.batches.some(r => r.id === 'b2'));
  check('G3: syncNow nháº­n Báº¢N Sá»¬A b2 qty 33',
    state.batches.find(r => r.id === 'b2').qty === 33);
  const st2 = cloud.loadSyncState();
  check('G4: lÆ°u má»‘c lastRev = rev má»¥c lá»¥c', st2.lastRev === (Number(store.get('apps/main').rev) || 0));
  check('G5: lÆ°u thá»i Ä‘iá»ƒm Ä‘á»“ng bá»™ lastSyncedAt', typeof st2.lastSyncedAt === 'string' && st2.lastSyncedAt.length > 10);
  state.currentUser = { email: 'admin@example.test', fullname: 'Admin', role: 'admin' };
  cloud.captureSyncBase();
  state.batches.push({ id: 'pending-upload', qty: 777, createdAt: '2026-10-09T00:00:00.000Z' });
  cloud.markPendingLocal();
  failCloudWrites = true;
  const firstPush = await cloud.flushPendingCloudPush();
  check('G6: lá»—i máº¡ng táº¡m thá»i giá»¯ thay Ä‘á»•i á»Ÿ tráº¡ng thÃ¡i pending',
    firstPush === false && cloud.pendingLocalChanges());
  failCloudWrites = false;
  const retryPush = await cloud.flushPendingCloudPush();
  check('G7: flush thá»­ láº¡i Ä‘áº©y Ä‘Æ°á»£c thay Ä‘á»•i Ä‘Ã£ lÆ°u cá»¥c bá»™',
    retryPush === true &&
    store.get('apps/main/d/batches').data.some(r => r.id === 'pending-upload' && r.qty === 777) &&
    cloud.pendingLocalChanges() === false);
}

// â”€â”€â”€ E. DICT (Äá»ŠNH Má»¨C THÃNG): GIá»® KHÃ“A ÄANG Sá»¬A, NHáº¬N KHÃ“A KHÃC â”€â”€
{
  state.x2CapRates = { '2026-10': 100, '2026-11': 200 };
  cloud.captureSyncBase();
  state.x2CapRates['2026-11'] = 250;   // mÃ¡y sá»­a thÃ¡ng 11 (chÆ°a Ä‘áº©y)
  cloud.mergeRemoteIntoLocal({ x2CapRates: { '2026-10': 111, '2026-11': 222 } }, false, true, { protectDirty: true, mergeNewer: true });
  check('E1: khÃ³a KHÃ”NG sá»­a nháº­n tá»« mÃ¢y (thÃ¡ng 10 = 111)', state.x2CapRates['2026-10'] === 111);
  check('E2: khÃ³a mÃ¡y ÄANG sá»­a giá»¯ báº£n mÃ¡y (thÃ¡ng 11 = 250)', state.x2CapRates['2026-11'] === 250);
}

// â”€â”€â”€ H. Cáº¤U TRÃšC (index.html Â· events.js Â· styles.css Â· sw.js) â”€â”€â”€â”€
{
  const idx = SRC('index.html');
  const ev = SRC('js/events.js');
  const css = SRC('styles.css');
  const cl = SRC('js/cloud.js');
  const sw = SRC('sw.js');
  check('H1: index.html cÃ³ modal XUNG Äá»˜T Äá»’NG Bá»˜ + nÃºt Äá»“ng Bá»™ Ngay',
    /id="modal-sync-conflicts"/.test(idx) && /id="sync-conflict-body"/.test(idx) && /id="btn-sync-now"/.test(idx));
  // Äá»”I CHUáº¨N 18/10/2026 (quy táº¯c 73): má»Ÿ sá»• xung Ä‘á»™t cho BAN QUáº¢N LÃ â€” ngÆ°á»i
  // trá»±c tiáº¿p nháº­p liá»‡u cáº§n tháº¥y xung Ä‘á»™t phÃ¡t sinh khi 2 mÃ¡y cÃ¹ng sá»­a.
  check('H2: nÃºt Xung Äá»™t trong menu â‹® dÃ nh ADMIN + BAN QUáº¢N LÃ (data-manager-only)',
    /id="btn-sync-conflicts"[^>]*data-manager-only/.test(idx) &&
    /body:not\(\.is-manager\):not\(\.is-admin\) \[data-manager-only\]/.test(css));
  check('H3: events.js ná»‘i Äá»“ng Bá»™ Ngay + má»Ÿ/Ä‘Ã³ng sá»• xung Ä‘á»™t',
    /syncNow/.test(ev) && /openSyncConflicts/.test(ev) && /applySyncConflictChoice/.test(ev) &&
    /safeOn\('btn-sync-now'/.test(ev));
  check('H4: styles.css cÃ³ khá»‘i sá»• xung Ä‘á»™t', /\.sync-conflict-row/.test(css) && /\.sync-conflict-json/.test(css));
  check('H5: cloud.js cÃ³ transaction + gá»™p dirty + stripDirty + syncNow + scheduleSyncWatch',
    /function pushDirtyViaTransaction/.test(cl) && /function mergeDirtyIntoRemote/.test(cl) &&
    /function stripDirtyFromRemote/.test(cl) && /function syncNow/.test(cl) &&
    /function scheduleSyncWatch/.test(cl) && /captureSyncBase/.test(cl));
  check('H6: má»¥c lá»¥c mÃ¢y ghi kÃ¨m rev (má»‘c Ä‘Æ¡n Ä‘iá»‡u)',
    /rev: prevRev \+ 1/.test(cl) && /const rev = \(Number\(idx\.rev\) \|\| 0\) \+ 1/.test(cl));
  check('H7: Ä‘Æ°á»ng NHáº¬N khÃ´ng cÃ²n dÃ¹ng add-only (má»i báº£n sá»­a Ä‘á»u Ä‘Æ°á»£c xÃ©t)',
    !/mergeRemoteIntoLocal\(partial, true, true\)/.test(cl) &&
    !/mergeRemoteIntoLocal\(remote, true, true\)/.test(cl));
  check('H8: sw.js Ä‘Ã£ tÄƒng cache cho báº£n Ä‘á»“ng bá»™ má»›i', /nha-may-ngoc-son-v486/.test(sw));
}

// â”€â”€â”€ I. Sá»” XUNG Äá»˜T TRUNG THá»°C (12/11/2026 â€” sá»­a lá»—i "99 dÃ²ng má»—i láº§n táº£i láº¡i") â”€â”€â”€
// NguyÃªn nhÃ¢n Ä‘Ã£ sá»­a:
//   I1. recHashOf dÃ¹ng JSON.stringify THÃ” â†’ lá»‡ch thá»© tá»± khÃ³a cÅ©ng bá»‹ coi lÃ  khÃ¡c
//       nhau â†’ ghi xung Ä‘á»™t GIáº¢ (áº£nh chá»¥p cá»§a ngÆ°á»i dÃ¹ng: 2 bÃªn in giá»‘ng há»‡t).
//   I2. DÃ²ng xung Ä‘á»™t Ä‘Ã£ há»™i tá»¥ khÃ´ng bao giá» Ä‘Æ°á»£c dá»n â†’ sá»• tÃ­ch dÃ²ng "cháº¿t".
//   I3. Báº£n xem trÆ°á»›c 4000 kÃ½ tá»± Ã— 100 dÃ²ng â‰ˆ 700KB náº±m CHUNG key vá»›i `base` â†’
//       localStorage cáº­n Ä‘áº§y thÃ¬ saveSyncState() tháº¥t báº¡i Ã‚M THÄ‚M â†’ base khÃ´ng
//       lÆ°u Ä‘Æ°á»£c â†’ má»—i láº§n má»Ÿ trang dirtyDomains() coi Má»ŒI báº£n ghi lÃ  "chÆ°a Ä‘áº©y"
//       â†’ ghi láº¡i hÃ ng loáº¡t xung Ä‘á»™t; vÃ  báº¥m "XÃ³a sá»• xung Ä‘á»™t" khÃ´ng cÃ³ tÃ¡c dá»¥ng.
await (async () => {
  localStorage.removeItem(cloud.SYNC_STATE_KEY);
  const st0 = cloud.loadSyncState();
  st0.base = {}; st0.conflicts = []; st0.lastRev = -1;

  check('I1: recSame bá» qua thá»© tá»± khÃ³a (cÃ¹ng ná»™i dung = cÃ¹ng báº£n ghi)',
    cloud.recSame({ id: 'a', qty: 1, date: 'x' }, { date: 'x', qty: 1, id: 'a' }) === true);
  check('I2: recSame phÃ¢n biá»‡t Ä‘Æ°á»£c hai báº£n KHÃC sá»‘ liá»‡u',
    cloud.recSame({ id: 'a', qty: 1 }, { id: 'a', qty: 2 }) === false);
  check('I3: recHashOf khÃ´ng Ä‘á»•i khi chá»‰ Ä‘á»•i thá»© tá»± khÃ³a',
    cloud.recHashOf({ a: 1, b: { c: 2, d: 3 } }) === cloud.recHashOf({ b: { d: 3, c: 2 }, a: 1 }));
  check('I4: recHashOf VáºªN Ä‘á»•i khi ná»™i dung Ä‘á»•i',
    cloud.recHashOf({ a: 1 }) !== cloud.recHashOf({ a: 2 }));
  check('I5: canonicalJson sáº¯p khÃ³a lá»“ng nhau + giá»¯ thá»© tá»± máº£ng',
    cloud.canonicalJson({ b: 1, a: [3, 1, 2] }) === '{"a":[3,1,2],"b":1}');

  // Hai báº£n giá»‘ng ná»™i dung â†’ KHÃ”NG Ä‘Æ°á»£c ghi xung Ä‘á»™t
  const before = cloud.syncConflicts().length;
  cloud.recordSyncConflict('khoNotes', 'k1',
    { id: 'k1', qty: 10, updatedAt: 'T1' }, { qty: 10, updatedAt: 'T1', id: 'k1' });
  check('I6: hai bÃªn giá»‘ng ná»™i dung (lá»‡ch thá»© tá»± khÃ³a) â†’ KHÃ”NG ghi xung Ä‘á»™t',
    cloud.syncConflicts().length === before);

  // Hai báº£n thá»±c sá»± khÃ¡c â†’ cÃ³ ghi; xá»­ lÃ½ xong â†’ dÃ²ng bá»‹ loáº¡i khá»i bá»™ nhá»›
  cloud.recordSyncConflict('khoNotes', 'k2', { id: 'k2', qty: 10 }, { id: 'k2', qty: 999 });
  check('I7: hai bÃªn khÃ¡c tháº­t â†’ ghi Ä‘Ãºng 1 dÃ²ng', cloud.syncConflicts().length === before + 1);
  const rowK2 = cloud.syncConflicts().find(c => c.recId === 'k2');
  await cloud.applySyncConflictChoice(rowK2.id, 'ack');
  check('I8: chá»n "ÄÃ£ kiá»ƒm tra" â†’ dÃ²ng biáº¿n máº¥t khá»i sá»• (vÃ  khá»i bá»™ nhá»›)',
    cloud.syncConflicts().every(c => c.recId !== 'k2') &&
    (JSON.parse(localStorage.getItem(cloud.SYNC_STATE_KEY) || '{}').conflicts || []).every(c => !c.resolved));

  // Báº£n xem trÆ°á»›c bá»‹ giá»›i háº¡n â†’ sá»• khÃ´ng phÃ¬nh
  const big = { id: 'k3', blob: 'x'.repeat(9000) };
  cloud.recordSyncConflict('khoNotes', 'k3', big, Object.assign({}, big, { blob: 'y'.repeat(9000) }));
  const row = cloud.syncConflicts().find(c => c.recId === 'k3');
  check('I9: báº£n xem trÆ°á»›c bá»‹ giá»›i háº¡n (khÃ´ng chiáº¿m háº¿t bá»™ nhá»›)',
    !!row && row.localPreview.length <= 1600 && row.remotePreview.length <= 1600);

  // Äáº©y thÃ nh cÃ´ng â†’ miá»n khá»›p mÃ¢y â†’ dÃ²ng xung Ä‘á»™t Ä‘Ã£ há»™i tá»¥ tá»± biáº¿n máº¥t
  state.batches = [{ id: 'bk', qty: 1, updatedAt: '2026-11-12T00:00:00.000Z' }];
  state.khoNotes = [];
  try { await cloud.writeCloudSnapshot(); } catch (e) { /* bá» qua â€” mÃ´i trÆ°á»ng test */ }
  cloud.captureSyncBase(null, {});
  cloud.recordSyncConflict('batches', 'bk', { id: 'bk', qty: 1 }, { id: 'bk', qty: 2 });
  check('I10: trÆ°á»›c khi há»™i tá»¥ â†’ sá»• cÃ³ dÃ²ng batches|bk',
    cloud.syncConflicts().some(c => c.key === 'batches|bk'));
  await cloud.syncNow({ force: true });   // Ä‘á»c láº¡i má»¥c lá»¥c mÃ¢y â†’ lÃ m má»›i bÄƒm mÃ¢y
  cloud.pruneConvergedConflicts();
  check('I11: miá»n Ä‘Ã£ khá»›p mÃ¢y sau khi Ä‘á»“ng bá»™ â†’ dÃ²ng xung Ä‘á»™t tá»± biáº¿n máº¥t',
    !cloud.syncConflicts().some(c => c.key === 'batches|bk'));

  // Káº¿ hoáº¡ch SX: báº£n sá»­a PHáº¢I cÃ³ updatedAt (náº¿u khÃ´ng, recCompare hÃ²a má»‘c â†’
  // quyáº¿t Ä‘á»‹nh báº±ng bÄƒm ná»™i dung â†’ sá»‘ vá»«a sá»­a bá»‹ tráº£ vá» sá»‘ cÅ© khi Ä‘á»“ng bá»™)
  const planSrc = SRC('js/planning.js');
  check('I12: planning.js ghi updatedAt á»Ÿ Má»ŒI Ä‘Æ°á»ng ghi (káº¿ hoáº¡ch + Ä‘á»‹nh má»©c)',
    (planSrc.match(/updatedAt/g) || []).length >= 5 &&
    /item\.updatedAt = nowIso;/.test(planSrc) && /createdAt: rateId \?/.test(planSrc));
  check('I13: báº£n sá»­a káº¿ hoáº¡ch (cÃ³ updatedAt má»›i) tháº¯ng báº£n mÃ¢y cÅ©',
    cloud.recCompare(
      { id: 'p1', qty: 400, createdAt: '2026-10-01T00:00:00.000Z', updatedAt: '2026-11-12T09:00:00.000Z' },
      { id: 'p1', qty: 250, createdAt: '2026-10-01T00:00:00.000Z' }) > 0);
  cloud.clearAllSyncConflicts();
})();

console.log('\nKáº¿t quáº£: ' + pass + ' pass, ' + fail + ' fail');
process.exit(fail ? 1 : 0);



