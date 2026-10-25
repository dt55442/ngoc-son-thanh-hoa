// tests/sync-conflict.test.mjs — ĐỒNG BỘ 2 CHIỀU AN TOÀN (17/10/2026)
// Mục đích: chứng minh 3 lỗi đã sửa + 3 lớp bảo vệ mới:
//   A. So sánh bản ghi hội tụ (updatedAt → rev → băm nội dung) — 2 máy chọn CÙNG bản.
//   B. Sổ đồng bộ: biết bản ghi nào CHƯA lên mây kể cả khi thiếu updatedAt.
//   C. NHẬN mây nhận cả bản SỬA (trước đây chỉ bổ sung bản thiếu → máy khác không thấy).
//   D. Bản ghi máy đang sửa CHƯA ĐẨY không bị mây ghi đè + ghi sổ xung đột.
//   E. Dict (định mức tháng): chỉ giữ khóa máy đang sửa, nhận các khóa khác từ mây.
//   F. Đẩy bằng TRANSACTION: chỉ gộp bản ghi dirty → KHÔNG xóa bản ghi máy khác.
//   G. rev tăng đơn điệu + lastRev/lastSyncedAt lưu đúng.
//   H. Cấu trúc: index.html / events.js / styles.css / sw.js.
'use strict';
import fs from 'node:fs';

// ─── Stubs môi trường (giống tests/cloud-delta.test.mjs) ──────────
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

// ─── IMPORT MODULES ───────────────────────────────────────────────
const cloud = await import('../js/cloud.js');
const { state } = await import('../js/state.js');

let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; console.log('  \u2713 ' + name); }
  else { fail++; console.error('  \u2717 ' + name); }
}
const SRC = (p) => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ─── A. SO SÁNH BẢN GHI HỘI TỤ ───────────────────────────────────
{
  const a = { id: 'x', qty: 10, updatedAt: '2026-10-10T00:00:00.000Z' };
  const b = { id: 'x', qty: 20, updatedAt: '2026-10-11T00:00:00.000Z' };
  check('A1: bản mới hơn (updatedAt) thắng', cloud.recCompare(b, a) > 0 && cloud.recCompare(a, b) < 0);
  check('A2: cùng mốc → so rev',
    cloud.recCompare({ id: 'x', rev: 2, updatedAt: a.updatedAt }, { id: 'x', rev: 1, updatedAt: a.updatedAt }) > 0);
  const c = { id: 'x', qty: 10, createdAt: '2026-10-10T00:00:00.000Z' };
  const d = { id: 'x', qty: 20, createdAt: '2026-10-10T00:00:00.000Z' };
  check('A3: THIẾU updatedAt + cùng createdAt → băm nội dung quyết định (2 máy chọn CÙNG bản)',
    cloud.recCompare(c, d) !== 0 && Math.sign(cloud.recCompare(c, d)) === -Math.sign(cloud.recCompare(d, c)));
  check('A4: giống hệt → 0', cloud.recCompare(c, Object.assign({}, c)) === 0);
  check('A5: recHashOf ổn định (cùng nội dung → cùng băm)', cloud.recHashOf(c) === cloud.recHashOf(Object.assign({}, c)));
}

// ─── B. SỔ ĐỒNG BỘ: BẢN GHI NÀO CHƯA LÊN MÂY ─────────────────────
{
  localStorage.removeItem(cloud.SYNC_STATE_KEY);
  const st = cloud.loadSyncState();
  st.base = {}; st.conflicts = []; st.lastRev = -1;
  state.batches = [{ id: 'b1', qty: 100, quantity: 1, createdAt: '2026-10-01T00:00:00.000Z' }];
  // ĐỔI CHUẨN 18/10/2026 (xem .clinerules quy tắc 73): trước đây "chưa có base"
  // bị coi là KHÔNG dirty → máy mới/xoá cache/phục hồi backup MẤT lớp bảo vệ
  // bản-sửa-chưa-đẩy. Nay coi MỌI bản ghi hiện có là chưa đẩy.
  check('B0: chưa có base → COI MỌI bản ghi là dirty (bảo vệ bản chưa đẩy)',
    !!cloud.dirtyDomains().batches && cloud.dirtyDomains().batches.ids.join(',') === 'b1');
  cloud.captureSyncBase();
  check('B1: chụp base → không còn dirty', Object.keys(cloud.dirtyDomains()).length === 0);
  state.batches[0].qty = 150;   // sửa nhưng KHÔNG đổi updatedAt/createdAt
  const d = cloud.dirtyDomains();
  check('B2: sửa bản ghi (KHÔNG có updatedAt) vẫn phát hiện dirty nhờ băm nội dung',
    !!d.batches && d.batches.ids.join(',') === 'b1');
  state.batches.push({ id: 'b2', qty: 5 });
  check('B3: thêm bản ghi mới → dirty', cloud.dirtyDomains().batches.ids.includes('b2'));
  state.x2CapRates = { '2026-10': 100, '2026-11': 200 };
  cloud.captureSyncBase();
  state.x2CapRates['2026-11'] = 250;
  const d2 = cloud.dirtyDomains();
  check('B4: dict → dirty theo TỪNG KHÓA tháng (không dirty cả dict)',
    !!d2.x2CapRates && d2.x2CapRates.keys.join(',') === '2026-11');
}

// ─── C. NHẬN MÂY: BẢN SỬA PHẢI LAN SANG MÁY KHÁC ─────────────────
{
  state.batches = [{ id: 'b1', qty: 100, updatedAt: '2026-10-01T00:00:00.000Z' }];
  cloud.captureSyncBase();
  const remote = [{ id: 'b1', qty: 999, updatedAt: '2026-10-05T00:00:00.000Z' }];
  const changed = cloud.mergeRemoteIntoLocal({ batches: remote }, false, true, { protectDirty: true, mergeNewer: true });
  check('C1: NHẬN bản SỬA từ mây (mới hơn) → máy đổi theo (lỗi cũ: chỉ bổ sung bản thiếu)',
    state.batches.length === 1 && state.batches[0].qty === 999 && changed === true);
}

// ─── D. BẢN GHI MÁY ĐANG SỬA CHƯA ĐẨY: MÂY KHÔNG ĐƯỢC GHI ĐÈ ─────
{
  state.batches = [{ id: 'b1', qty: 100, updatedAt: '2026-10-01T00:00:00.000Z' }];
  cloud.clearAllSyncConflicts();
  cloud.captureSyncBase();
  state.batches[0] = { id: 'b1', qty: 555, updatedAt: '2026-10-09T00:00:00.000Z' }; // máy sửa, CHƯA đẩy
  const remote = [
    { id: 'b1', qty: 777, updatedAt: '2026-10-05T00:00:00.000Z' },
    { id: 'b9', qty: 1, updatedAt: '2026-10-06T00:00:00.000Z' }
  ];
  cloud.mergeRemoteIntoLocal({ batches: remote }, false, true, { protectDirty: true, mergeNewer: true });
  check('D1: bản ghi máy đang sửa CHƯA ĐẨY không bị mây ghi đè',
    state.batches.find(r => r.id === 'b1').qty === 555);
  check('D2: bản ghi MỚI của mây vẫn được nhận', !!state.batches.find(r => r.id === 'b9'));
  const cs = cloud.syncConflicts();
  check('D3: ghi sổ XUNG ĐỘT (batches · b1) để Admin xem',
    cs.some(c => c.domain === 'batches' && c.recId === 'b1'));
  check('D4: đếm xung đột cho menu/badge', cloud.syncConflictCount() === cs.length && cs.length >= 1);
  cloud.clearAllSyncConflicts();
}

// ─── F. ĐẨY BẰNG TRANSACTION: KHÔNG XÓA BẢN GHI CỦA MÁY KHÁC ─────
{
  const store = new Map();
  const stats = { sets: 0, gets: 0 };
  const makeDoc = (collPath, id) => {
    const key = collPath + '/' + id;
    return {
      _key: key,
      set(data) { stats.sets++; store.set(key, JSON.parse(JSON.stringify(data))); return Promise.resolve(); },
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
    // Transaction giả lập: đọc/ghi NGAY vào store (Firestore thật đảm bảo nguyên tử)
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
  check('F0: Firebase (fake) bật → chế độ online', cloud.isFirebaseOnline() === true);

  // Reset sổ đồng bộ + dữ liệu tối thiểu
  const st = cloud.loadSyncState();
  st.base = {}; st.conflicts = []; st.lastRev = -1;
  state.batches = [{ id: 'a1', qty: 10, updatedAt: '2026-10-01T00:00:00.000Z' }];
  state.pressRecords = [];
  state.x2CapRates = {};

  const r1 = await cloud.writeCloudSnapshot();
  check('F1: đẩy đầu bằng TRANSACTION (mây trống → đẩy đủ)',
    r1.mode === 'delta-v1' && r1.changed > 5);
  {
    const idx = store.get('apps/main');
    const doc = store.get('apps/main/d/batches');
    check('F2: mục lục có rev ≥ 1 + __dh + deletedIds',
      !!idx && idx.__fmt === 'delta-v1' && typeof idx.rev === 'number' && idx.rev >= 1 && !!idx.__dh && ('deletedIds' in idx));
    check('F3: doc miền batches có bản ghi a1', !!doc && Array.isArray(doc.data) && doc.data.some(r => r.id === 'a1'));
  }
  // Đánh dấu đã đồng bộ (base = dữ liệu vừa đẩy lên mây)
  cloud.captureSyncBase();

  // MÁY B đẩy thêm bản ghi b2 vào CÙNG miền batches (mô phỏng trực tiếp trên mây)
  {
    const doc = store.get('apps/main/d/batches');
    doc.data.push({ id: 'b2', qty: 22, updatedAt: '2026-10-02T00:00:00.000Z' });
    doc.h = cloud.hashStr(JSON.stringify(doc.data));
    const idx = store.get('apps/main');
    idx.__dh.batches = doc.h;
    idx.rev = (Number(idx.rev) || 0) + 1;
  }
  // MÁY A sửa a1 (máy A KHÔNG hề biết b2) → đẩy
  state.batches[0] = { id: 'a1', qty: 99, updatedAt: '2026-10-03T00:00:00.000Z' };
  const revBefore = Number(store.get('apps/main').rev) || 0;
  const setsBefore = stats.sets;
  const r2 = await cloud.writeCloudSnapshot();
  {
    const doc = store.get('apps/main/d/batches');
    const idx = store.get('apps/main');
    const a1 = doc.data.find(r => r.id === 'a1');
    check('F4: bản ghi máy A sửa được ghi lên mây (qty 99)', !!a1 && a1.qty === 99);
    check('F5: bản ghi b2 của MÁY KHÁC KHÔNG bị xóa (transaction gộp, không đè cả miền)',
      doc.data.some(r => r.id === 'b2' && r.qty === 22));
    check('F6: chỉ ghi 1 doc miền + 1 mục lục (= 2 lượt ghi)', r2.changed === 1 && (stats.sets - setsBefore) === 2);
    check('F7: rev mục lục TĂNG đơn điệu', (Number(idx.rev) || 0) === revBefore + 1);
    check('F8: băm mục lục của miền batches khớp dữ liệu thật trên mây',
      idx.__dh.batches === cloud.hashStr(JSON.stringify(doc.data)));
  }
  // Đọc lại qua API công khai
  {
    const full = await cloud.readFullCloudObject();
    check('F9: readFullCloudObject thấy đủ 2 bản ghi (a1 + b2)',
      !!full && Array.isArray(full.batches) && full.batches.length === 2);
    check('F10: readFullCloudObject mang `rev` của mục lục', typeof full.rev === 'number' && full.rev >= 2);
  }

  // ─── G. syncNow: cập nhật mốc + nhận bản sửa từ mây ─────────────
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
  check('G1: syncNow chạy được (đọc mục lục 1 lần)', okSync === true);
  check('G2: syncNow nhận bản b2 (bản ghi máy chưa có)', state.batches.some(r => r.id === 'b2'));
  check('G3: syncNow nhận BẢN SỬA b2 qty 33',
    state.batches.find(r => r.id === 'b2').qty === 33);
  const st2 = cloud.loadSyncState();
  check('G4: lưu mốc lastRev = rev mục lục', st2.lastRev === (Number(store.get('apps/main').rev) || 0));
  check('G5: lưu thời điểm đồng bộ lastSyncedAt', typeof st2.lastSyncedAt === 'string' && st2.lastSyncedAt.length > 10);
}

// ─── E. DICT (ĐỊNH MỨC THÁNG): GIỮ KHÓA ĐANG SỬA, NHẬN KHÓA KHÁC ──
{
  state.x2CapRates = { '2026-10': 100, '2026-11': 200 };
  cloud.captureSyncBase();
  state.x2CapRates['2026-11'] = 250;   // máy sửa tháng 11 (chưa đẩy)
  cloud.mergeRemoteIntoLocal({ x2CapRates: { '2026-10': 111, '2026-11': 222 } }, false, true, { protectDirty: true, mergeNewer: true });
  check('E1: khóa KHÔNG sửa nhận từ mây (tháng 10 = 111)', state.x2CapRates['2026-10'] === 111);
  check('E2: khóa máy ĐANG sửa giữ bản máy (tháng 11 = 250)', state.x2CapRates['2026-11'] === 250);
}

// ─── H. CẤU TRÚC (index.html · events.js · styles.css · sw.js) ────
{
  const idx = SRC('index.html');
  const ev = SRC('js/events.js');
  const css = SRC('styles.css');
  const cl = SRC('js/cloud.js');
  const sw = SRC('sw.js');
  check('H1: index.html có modal XUNG ĐỘT ĐỒNG BỘ + nút Đồng Bộ Ngay',
    /id="modal-sync-conflicts"/.test(idx) && /id="sync-conflict-body"/.test(idx) && /id="btn-sync-now"/.test(idx));
  // ĐỔI CHUẨN 18/10/2026 (quy tắc 73): mở sổ xung đột cho BAN QUẢN LÝ — người
  // trực tiếp nhập liệu cần thấy xung đột phát sinh khi 2 máy cùng sửa.
  check('H2: nút Xung Đột trong menu ⋮ dành ADMIN + BAN QUẢN LÝ (data-manager-only)',
    /id="btn-sync-conflicts"[^>]*data-manager-only/.test(idx) &&
    /body:not\(\.is-manager\):not\(\.is-admin\) \[data-manager-only\]/.test(css));
  check('H3: events.js nối Đồng Bộ Ngay + mở/đóng sổ xung đột',
    /syncNow/.test(ev) && /openSyncConflicts/.test(ev) && /applySyncConflictChoice/.test(ev) &&
    /safeOn\('btn-sync-now'/.test(ev));
  check('H4: styles.css có khối sổ xung đột', /\.sync-conflict-row/.test(css) && /\.sync-conflict-json/.test(css));
  check('H5: cloud.js có transaction + gộp dirty + stripDirty + syncNow + scheduleSyncWatch',
    /function pushDirtyViaTransaction/.test(cl) && /function mergeDirtyIntoRemote/.test(cl) &&
    /function stripDirtyFromRemote/.test(cl) && /function syncNow/.test(cl) &&
    /function scheduleSyncWatch/.test(cl) && /captureSyncBase/.test(cl));
  check('H6: mục lục mây ghi kèm rev (mốc đơn điệu)',
    /rev: prevRev \+ 1/.test(cl) && /const rev = \(Number\(idx\.rev\) \|\| 0\) \+ 1/.test(cl));
  check('H7: đường NHẬN không còn dùng add-only (mọi bản sửa đều được xét)',
    !/mergeRemoteIntoLocal\(partial, true, true\)/.test(cl) &&
    !/mergeRemoteIntoLocal\(remote, true, true\)/.test(cl));
  check('H8: sw.js đã tăng cache cho bản đồng bộ mới', /nha-may-ngoc-son-v308/.test(sw));
}

console.log('\nKết quả: ' + pass + ' pass, ' + fail + ' fail');
process.exit(fail ? 1 : 0);
