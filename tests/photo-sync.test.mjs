// tests/photo-sync.test.mjs â€” Kiá»ƒm thá»­ KÃŠNH áº¢NH THUMB (js/photo-sync.js)
// Thumb bá»‹ rÃºt khá»i báº£n ghi (nháº¹ localStorage + payload mÃ¢y), Ä‘i KÃŠNH RIÃŠNG:
//   apps/main/photos/<photoId> = { thumb, ts, by }  â€” Ä‘áº©y Dáº¦N, chá»‰ khi online + cÃ³ quyá»n.
//   A. HÃ ng Ä‘á»£i thuáº§n (thÃªm/xÃ³a/Æ°u tiÃªn/thá»© tá»±).
//   B. Dáº¡ng doc mÃ¢y.
//   C. photoPushBatch vá»›i Firestore giáº£ láº­p (Ä‘áº©y/xÃ³a/skip/khÃ´ng Ä‘áº©y trÃ¹ng).
//   D. Kho thumb IndexedDB giáº£ láº­p: put/get/dataURL.
//   E. hydratePhotoThumbs + photoSyncBackfill (khÃ´ng nÃ©m khi thiáº¿u DOM/IDB).
//   F. Integration: photoSyncKick Ä‘áº©y tháº­t lÃªn Firestore giáº£ láº­p.
//   G. Cáº¥u trÃºc mÃ£ nguá»“n (kÃªnh 'photos', sw.js, index.html, materials.js, state.js).
'use strict';
import fs from 'node:fs';

// â”€â”€â”€ Stubs mÃ´i trÆ°á»ng â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function makeEl(id) {
  const el = {
    id: id || '', value: '', checked: false, disabled: false, hidden: false,
    open: true, textContent: '', innerHTML: '', src: '', style: {}, dataset: {}, _h: {},
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
global.XLSX = { utils: { book_new: () => ({ SheetNames: [] }), aoa_to_sheet: () => ({}), json_to_sheet: () => ({}), book_append_sheet(){}, encode_cell: () => 'A1', decode_range: () => ({ s: { r: 0, c: 0 }, e: { r: 0, c: 0 } }) }, writeFile(){}, write: () => new ArrayBuffer(8) };
global.ResizeObserver = class { observe(){} unobserve(){} disconnect(){} };
global.Image = class { set src(_) {} addEventListener(){} };
global.fetch = async () => ({ ok: false, status: 0, statusText: 'offline-stub', json: async () => ({}), text: async () => '' });
global.FileReader = class {
  readAsDataURL() { this.result = 'data:image/jpeg;base64,FROMBLOB'; setTimeout(() => this.onload && this.onload(), 0); }
  readAsText() { this.result = ''; setTimeout(() => this.onload && this.onload(), 0); }
};

// IndexedDB giáº£ láº­p â€” 2 kho: áº£nh full + thumb (blob giáº£ = chuá»—i Ä‘Ã¡nh dáº¥u)
function makeFakeIndexedDB() {
  const stores = { material_photos: new Map(), material_thumbs: new Map() };
  const mkReq = (fn) => { const req = {}; setTimeout(() => { try { req.result = fn(); } catch (e) { req.error = e; } if (req.onsuccess) req.onsuccess(); }, 0); return req; };
  const db = {
    objectStoreNames: { contains: (n) => Object.prototype.hasOwnProperty.call(stores, n) },
    transaction(name) {
      const map = stores[name];
      const tx = { oncomplete: null, onerror: null, onabort: null };
      setTimeout(() => { if (tx.oncomplete) tx.oncomplete(); }, 0);
      tx.objectStore = () => ({
        put(val, key) { map.set(key, val); return {}; },
        get: (key) => mkReq(() => map.get(key)),
        delete(key) { map.delete(key); return {}; },
        getAllKeys: () => mkReq(() => [...map.keys()])
      });
      return tx;
    }
  };
  return { open: () => { const req = {}; setTimeout(() => { req.result = db; if (req.onsuccess) req.onsuccess(); }, 0); return req; }, _stores: stores };
}
const fakeIdb = makeFakeIndexedDB();
Object.defineProperty(global, 'indexedDB', { value: fakeIdb, configurable: true, writable: true });

// â”€â”€â”€ IMPORT MODULES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const cloud = await import('../js/cloud.js');
const ps = await import('../js/photo-sync.js');
const photostore = await import('../js/photo-store.js');
const { state } = await import('../js/state.js');

let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; console.log('  \u2713 ' + name); }
  else { fail++; console.error('  \u2717 ' + name); }
}

// â”€â”€â”€ A. HÃ€NG Äá»¢I THUáº¦N â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
{
  const q = { pending: {}, deleted: {} };
  ps.photoQueueAdd(q, 'ph-a', 100);
  ps.photoQueueAdd(q, 'ph-b', 200);
  check('A1: thÃªm 2 áº£nh â†’ hÃ ng Ä‘á»£i cÃ³ 2 viá»‡c', ps.photoQueueCount(q) === 2);
  check('A2: viá»‡c káº¿ tiáº¿p = áº£nh cÅ© nháº¥t (FIFO theo ts)', ps.photoQueueNext(q).id === 'ph-a');
  ps.photoQueueMarkDeleted(q, 'ph-b', 300);
  check('A3: Ä‘Ã¡nh dáº¥u xÃ³a â†’ xÃ³a Ä‘Æ°á»£c Æ°u tiÃªn TRÆ¯á»šC (trÃ¡nh Ä‘áº©y rá»“i xÃ³a)',
    ps.photoQueueNext(q).op === 'del' && ps.photoQueueNext(q).id === 'ph-b');
  check('A4: áº£nh vá»«a xÃ³a bá»‹ gá»¡ khá»i pending', !('ph-b' in q.pending) && ('ph-b' in q.deleted));
  ps.photoQueueAdd(q, 'ph-b', 400);
  check('A5: thÃªm láº¡i áº£nh Ä‘Ã£ Ä‘Ã¡nh dáº¥u xÃ³a â†’ há»§y dáº¥u xÃ³a (áº£nh má»›i tháº¯ng)',
    !('ph-b' in q.deleted) && q.pending['ph-b'] === 400);
  ps.photoQueueRemove(q, 'ph-a');
  check('A6: gá»¡ 1 viá»‡c â†’ cÃ²n 1', ps.photoQueueCount(q) === 1);
  check('A7: hÃ ng Ä‘á»£i rá»—ng â†’ next = null', (() => { const z = { pending: {}, deleted: {} }; return ps.photoQueueNext(z) === null; })());
  check('A8: photoQueueCount(null) = 0 (an toÃ n) vÃ  ensure táº¡o hÃ ng Ä‘á»£i rá»—ng',
    ps.photoQueueCount(null) === 0 && ps.photoQueueCount({}) === 0);
}

// â”€â”€â”€ B. Dáº NG DOC TRÃŠN MÃ‚Y (chá»‰ THUMB) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
{
  const d = ps.photoDocData('data:image/jpeg;base64,AAA', 'dt55442@gmail.com', 123);
  check('B1: doc mÃ¢y chá»‰ gá»“m thumb + ts + by',
    Object.keys(d).sort().join(',') === 'by,thumb,ts');
  check('B2: KHÃ”NG chá»©a áº£nh full (chá»‰ Ä‘á»“ng bá»™ thumb)', !('full' in d) && d.thumb === 'data:image/jpeg;base64,AAA');
  check('B3: cÃ³ by + ts Ä‘á»ƒ truy váº¿t', d.by === 'dt55442@gmail.com' && d.ts === 123);
  check('B4: háº±ng sá»‘ kÃªnh áº£nh = collection "photos" dÆ°á»›i apps/main', ps.PHOTO_COLL === 'photos');
}

// â”€â”€â”€ Firestore giáº£ láº­p â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function makeFakeFirestore() {
  const store = new Map();
  const makeDoc = (collPath, id) => {
    const key = collPath + '/' + id;
    return {
      set(data) { store.set(key, JSON.parse(JSON.stringify(data))); return Promise.resolve(); },
      get() { return Promise.resolve({ exists: store.has(key), data: () => store.get(key) }); },
      delete() { store.delete(key); return Promise.resolve(); },
      onSnapshot() { return () => {}; },
      collection(sub) { return makeColl(collPath + '/' + id + '/' + sub); },
      where() { return { get: () => Promise.resolve({ forEach(){} }) }; }
    };
  };
  const makeColl = (path) => ({ doc: (id) => makeDoc(path, id), where: () => ({ get: () => Promise.resolve({ forEach(){} }) }) });
  return { _store: store, collection: (name) => makeColl(name) };
}

// â”€â”€â”€ C. Äáº¨Y 1 Äá»¢T (photoPushBatch) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
{
  const db = makeFakeFirestore();
  const q = { pending: {}, deleted: {} };
  ps.photoQueueAdd(q, 'ph-1', 1);
  ps.photoQueueAdd(q, 'ph-2', 2);
  ps.photoQueueMarkDeleted(q, 'ph-9', 3);
  const res = await ps.photoPushBatch(db, q, { readThumb: async (id) => 'THUMB-' + id, by: 'me@x.com', gapMs: 0 });
  check('C1: Ä‘áº©y 2 thumb + xÃ³a 1 doc â†’ Ä‘Ãºng sá»‘ lÆ°á»£ng',
    res.pushed === 2 && res.deleted === 1 && res.remaining === 0);
  check('C2: doc miá»n áº£nh náº±m Ä‘Ãºng Ä‘Æ°á»ng apps/main/photos/<id> (dÆ°á»›i apps/main â†’ rules phá»§ sáºµn)',
    db._store.has('apps/main/photos/ph-1') && db._store.has('apps/main/photos/ph-2'));
  check('C3: ná»™i dung doc = { thumb, ts, by } â€” CHá»ˆ thumb',
    (() => { const d = db._store.get('apps/main/photos/ph-1'); return d.thumb === 'THUMB-ph-1' && d.by === 'me@x.com' && !!d.ts && !('full' in d); })());
  const res2 = await ps.photoPushBatch(db, q, { readThumb: async () => 'X', gapMs: 0 });
  check('C4: hÃ ng Ä‘á»£i rá»—ng â†’ Ä‘á»£t sau KHÃ”NG Ä‘áº©y gÃ¬ (khÃ´ng ghi trÃ¹ng)', res2.pushed === 0 && res2.deleted === 0);

  // Thiáº¿u thumb cá»¥c bá»™ â†’ bá» qua (khÃ´ng ghi doc rÃ¡c), khÃ´ng káº¹t hÃ ng Ä‘á»£i
  const q3 = { pending: {}, deleted: {} };
  ps.photoQueueAdd(q3, 'ph-missing', 5);
  const res3 = await ps.photoPushBatch(db, q3, { readThumb: async () => '', gapMs: 0 });
  check('C5: khÃ´ng cÃ³ thumb cá»¥c bá»™ â†’ SKIP, khÃ´ng ghi doc, hÃ ng Ä‘á»£i sáº¡ch',
    res3.pushed === 0 && res3.skipped === 1 && res3.remaining === 0 && !db._store.has('apps/main/photos/ph-missing'));

  // Lá»—i ghi (máº¥t máº¡ng) â†’ Dá»ªNG, giá»¯ nguyÃªn viá»‡c trong hÃ ng Ä‘á»£i Ä‘á»ƒ láº§n sau Ä‘áº©y tiáº¿p
  const q4 = { pending: {}, deleted: {} };
  ps.photoQueueAdd(q4, 'ph-err', 6);
  const badDb = {
    collection: () => ({
      doc: () => ({
        collection: () => ({ doc: () => ({ set: () => Promise.reject(new Error('offline')), get: () => Promise.resolve({ exists: false }), delete: () => Promise.reject(new Error('offline')) }) }),
        set: () => Promise.reject(new Error('offline')),
        get: () => Promise.resolve({ exists: false }),
        delete: () => Promise.reject(new Error('offline'))
      })
    })
  };
  const res4 = await ps.photoPushBatch(badDb, q4, { readThumb: async () => 'T', gapMs: 0 });
  check('C6: lá»—i ghi â†’ giá»¯ viá»‡c trong hÃ ng Ä‘á»£i (Ä‘áº©y tiáº¿p láº§n sau)',
    res4.pushed === 0 && ps.photoQueueCount(q4) === 1);
}

// â”€â”€â”€ D. KHO THUMB (IndexedDB) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
{
  check('D1: cÃ³ IndexedDB giáº£ â†’ photosAvailable() = true', photostore.photosAvailable() === true);
  const id = await photostore.putThumb('data:image/jpeg;base64,THUMB1', 'ph-d1');
  check('D2: putThumb lÆ°u Ä‘Æ°á»£c (tráº£ vá» Ä‘Ãºng id)', id === 'ph-d1');
  check('D3: hasThumb = true sau khi lÆ°u', (await photostore.hasThumb('ph-d1')) === true);
  check('D4: getThumbDataURL Ä‘á»c láº¡i â†’ dataURL (dÃ¹ng Ä‘á»ƒ Ä‘áº©y mÃ¢y)', (await photostore.getThumbDataURL('ph-d1')) === 'data:image/jpeg;base64,FROMBLOB');
  check('D5: getThumbURL tráº£ objectURL (hiá»ƒn thá»‹ <img>)', (await photostore.getThumbURL('ph-d1')) === 'blob:stub');
  check('D6: allThumbIds cÃ³ id vá»«a lÆ°u', (await photostore.allThumbIds()).has('ph-d1'));
  await photostore.deleteThumb('ph-d1');
  check('D7: deleteThumb xÃ³a khá»i kho', (await photostore.hasThumb('ph-d1')) === false);
  check('D8: áº£nh FULL vÃ  THUMB lÃ  2 kho riÃªng',
    photostore.PHOTO_STORE === 'material_photos' && photostore.PHOTO_THUMB_STORE === 'material_thumbs' && photostore.PHOTO_DB_VERSION === 2);
}

// â”€â”€â”€ E. BACKFILL (náº¡p bÃ¹ áº£nh Ä‘ang cÃ³ thumb cá»¥c bá»™ vÃ o hÃ ng Ä‘á»£i) â”€â”€â”€
{
  await photostore.putThumb('data:image/jpeg;base64,T1', 'ph-e1');
  await photostore.putThumb('data:image/jpeg;base64,T2', 'ph-e2');
  state.materialRecords = [
    { id: 'm1', images: [{ id: 'ph-e1' }, { id: 'ph-e2', thumb: 'data:image/jpeg;base64,INLINE' }] },
    { id: 'm2', images: ['data:image/jpeg;base64,LEGACY'] }   // áº£nh legacy dáº¡ng chuá»—i â†’ bá» qua
  ];
  state.photoQueue = { pending: {}, deleted: {} };
  state.photoUploaded = {};
  const added = await ps.photoSyncBackfill();
  check('E1: backfill Ä‘Æ°a 2 áº£nh {id} vÃ o hÃ ng Ä‘á»£i (bá» qua áº£nh legacy dáº¡ng chuá»—i)', added === 2 && ps.photoQueueCount(state.photoQueue) === 2);
  check('E2: entry {id, thumb} cÃ²n inline â†’ thumb Ä‘Æ°á»£c Ä‘Æ°a vÃ o KHO (khÃ´ng bá» sÃ³t)',
    (await photostore.hasThumb('ph-e2')) === true);
  state.photoUploaded = { 'ph-e1': Date.now() };
  state.photoQueue = { pending: {}, deleted: {} };
  const added2 = await ps.photoSyncBackfill();
  check('E3: áº£nh Ä‘Ã£ Ä‘Ã¡nh dáº¥u "Ä‘Ã£ Ä‘áº©y" khÃ´ng bá»‹ enqueue láº¡i (trÃ¡nh Ä‘áº©y láº¡i má»i áº£nh má»—i láº§n má»Ÿ app)', added2 === 1);
}

// â”€â”€â”€ F. INTEGRATION: photoSyncKick Ä‘áº©y tháº­t (Firestore giáº£ láº­p) â”€â”€â”€
{
  const db = makeFakeFirestore();
  global.__BAMBOO_FIREBASE_READY__ = true;
  global.FIREBASE_CONFIG = { ownerEmail: 'dt55442@gmail.com', projectId: 'test-photo' };
  global.firebase = {
    apps: [], initializeApp(){}, firestore: () => db,
    auth: () => ({ onAuthStateChanged(){}, currentUser: null, signOut(){ return Promise.resolve(); } })
  };
  cloud.initFirebase();
  check('F0: Firebase (fake) Ä‘Ã£ báº­t â†’ online', cloud.isFirebaseOnline() === true);

  // ChÆ°a Ä‘Äƒng nháº­p â†’ KHÃ”NG Ä‘áº©y (chá»‰ xem)
  state.currentUser = null;
  state.photoQueue = { pending: {}, deleted: {} };
  ps.photoQueueAdd(state.photoQueue, 'ph-f1', 1);
  const r0 = await ps.photoSyncKick();
  check('F1: chÆ°a Ä‘Äƒng nháº­p â†’ khÃ´ng Ä‘áº©y (giá»¯ viá»‡c trong hÃ ng Ä‘á»£i)', r0.blocked === true && ps.photoQueueCount(state.photoQueue) === 1);

  // Viewer â†’ KHÃ”NG Ä‘áº©y
  state.currentUser = { email: 'x@y.com', role: 'viewer' };
  const r1 = await ps.photoSyncKick();
  check('F2: tÃ i khoáº£n chá»‰ xem â†’ khÃ´ng Ä‘áº©y', r1.blocked === true && ps.photoQueueCount(state.photoQueue) === 1);

  // Editor â†’ Äáº¨Y: 1 doc áº£nh trÃªn mÃ¢y, hÃ ng Ä‘á»£i sáº¡ch
  state.currentUser = { email: 'editor@x.com', role: 'editor' };
  await photostore.putThumb('data:image/jpeg;base64,FF', 'ph-f1');
  const r2 = await ps.photoSyncKick();
  check('F3: Editor + online â†’ Ä‘áº©y Ä‘Ãºng 1 áº£nh, hÃ ng Ä‘á»£i sáº¡ch',
    r2.pushed === 1 && r2.remaining === 0 && db._store.has('apps/main/photos/ph-f1'));
  check('F4: doc mÃ¢y chá»©a thumb (base64) + by = email ngÆ°á»i Ä‘áº©y',
    (() => { const d = db._store.get('apps/main/photos/ph-f1'); return !!d.thumb && d.by === 'editor@x.com'; })());
  check('F5: Ä‘Ã£ ghi dáº¥u "Ä‘Ã£ Ä‘áº©y" theo mÃ¡y (photoUploaded)',
    !!(state.photoUploaded && state.photoUploaded['ph-f1']));

  // HÃ ng Ä‘á»£i rá»—ng â†’ kick khÃ´ng lÃ m gÃ¬
  const r3 = await ps.photoSyncKick();
  check('F6: hÃ ng Ä‘á»£i rá»—ng â†’ kick tráº£ remaining=0, khÃ´ng ghi thÃªm', r3.remaining === 0);
  check('F7: photoSyncStatus bÃ¡o Ä‘Ãºng sá»‘ áº£nh chá» + Ä‘Ã£ Ä‘áº©y',
    ps.photoSyncStatus().pending === 0 && ps.photoSyncStatus().uploaded >= 1);
  state.currentUser = null;
// â”€â”€â”€ G. Cáº¤U TRÃšC MÃƒ NGUá»’N (kÃªnh áº£nh tÃ¡ch riÃªng) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
{
  const src = fs.readFileSync(new URL('../js/photo-sync.js', import.meta.url), 'utf8');
  const swSrc = fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  const idxSrc = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const matSrc = fs.readFileSync(new URL('../js/materials.js', import.meta.url), 'utf8');
  const stSrc = fs.readFileSync(new URL('../js/state.js', import.meta.url), 'utf8');
  const clSrc = fs.readFileSync(new URL('../js/cloud.js', import.meta.url), 'utf8');
  check('G1: kÃªnh áº£nh dÃ¹ng subcollection apps/main/photos (dÆ°á»›i apps/main â†’ rules phá»§ sáºµn, khÃ´ng sá»­a rules)',
    /const PHOTO_COLL = 'photos'/.test(src) && /collection\(FB_COLL\)\.doc\(FB_DOC\)\.collection\(PHOTO_COLL\)/.test(src));
  check('G2: Ä‘áº©y Dáº¦N â€” cÃ³ giá»›i háº¡n má»—i Ä‘á»£t + nghá»‰ giá»¯a 2 áº£nh',
    /PHOTO_BATCH_LIMIT = 200/.test(src) && /PHOTO_GAP_MS = 120/.test(src));
  check('G3: chá»‰ cháº¡y khi ONLINE + cÃ³ quyá»n (canPushToCloud) + cÃ²n viá»‡c',
    /if \(!isFirebaseOnline\(\) \|\| !canPushToCloud\(\)\)/.test(src));
  check('G4: sw.js thÃªm js/photo-sync.js vÃ o APP_SHELL + tÄƒng CACHE_NAME v486',
    swSrc.includes("'./js/photo-sync.js'") && /nha-may-ngoc-son-v486/.test(swSrc));
  check('G5: index.html cÃ³ nÃºt "Äá»“ng Bá»™ áº¢nh Ngay" + span tráº¡ng thÃ¡i',
    idxSrc.includes('id="btn-sync-photos"') && idxSrc.includes('id="photo-sync-status"'));
  check('G6: materials.js LÆ¯U thumb vÃ o kho riÃªng + enqueue (khÃ´ng nhÃºng thumb vÃ o báº£n ghi)',
    /putThumb\(thumb \|\| full, id\)/.test(matSrc) && /state\.materialFormImages\.push\(\{ id \}\)/.test(matSrc) &&
    /photoSyncEnqueue\(id\)/.test(matSrc));
  check('G7: materials.js xÃ³a áº£nh â†’ dá»n kho thumb + xÃ³a doc mÃ¢y (photoSyncEnqueueDelete)',
    /photoSyncEnqueueDelete/.test(matSrc) && /deleteThumb\(id\)/.test(matSrc));
  check('G8: materials.js hiá»ƒn thá»‹ thumb qua kho/kÃªnh (hydratePhotoThumbs)',
    /hydratePhotoThumbs\(tbody\)/.test(matSrc) && /hydratePhotoThumbs\(wrap\)/.test(matSrc));
  check('G9: migration RÃšT thumb khá»i báº£n ghi (báº£n ghi chá»‰ cÃ²n { id })',
    /next\.push\(thumbOk \? \{ id: entry\.id \} : entry\)/.test(matSrc));
  check('G10: state.js cÃ³ key hÃ ng Ä‘á»£i áº£nh + dáº¥u Ä‘Ã£ Ä‘áº©y (thuáº§n theo mÃ¡y)',
    stSrc.includes('bamboo_tracker_photo_queue_v1') && stSrc.includes('bamboo_tracker_photo_uploaded_v1'));
  check('G11: áº£nh FULL váº«n KHÃ”NG lÃªn mÃ¢y (cloud.js váº«n gá»¡ áº£nh khá»i payload apps/main)',
    /stripMaterialPhotoPayload/.test(clSrc) && /materialRecords: stripMaterialPhotoPayload/.test(clSrc));
  check('G12: háº±ng sá»‘ GAP/BATCH export Ä‘á»ƒ test dÃ¹ng', ps.PHOTO_GAP_MS === 120 && ps.PHOTO_BATCH_LIMIT === 200);
}

console.log('\nKáº¿t quáº£: ' + pass + ' pass, ' + fail + ' fail');
process.exit(fail ? 1 : 0);
}
