// tests/cloud-delta.test.mjs — Kiểm thử TỐI ƯU ĐỒNG BỘ "CHỮ KÝ MIỀN" (__dh)
// Mục đích: chứng minh máy nhận THOÁT NHANH (không giải nén/so/gộp 835KB) khi
// dữ liệu hai bên y hệt — cắt lag khi online (nhất là "echo" bản mình vừa đẩy).
//   A. Băm miền: ổn định, đổi khi dữ liệu đổi, bỏ qua khóa meta, gồm deletedIds.
//   B. localHashesNow bám bản ĐẨY (đã gỡ ảnh base64) — đổi thumb KHÔNG đổi băm.
//   C. Hành vi: __dh khớp → KHÔNG gộp; __dh khác/thiếu → gộp như cũ.
//   D. Cấu trúc mã nguồn: __dh có ở cả 3 định dạng + cổng thoát nhanh + vô hiệu cache.
'use strict';
import fs from 'node:fs';

// ─── Stubs môi trường (giống cloud-shard.test.mjs) ────────────────
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
global.ResizeObserver = class { observe(){} unobserve(){} disconnect(){} };
global.Image = class { set src(_) {} addEventListener(){} };
global.fetch = async () => ({ ok: false, status: 0, statusText: 'offline-stub', json: async () => ({}), text: async () => '' });

// ─── IMPORT MODULES (sau khi stub xong) ───────────────────────────
const cloud = await import('../js/cloud.js');
const { state } = await import('../js/state.js');

// ─── KHUNG CHẠY TEST ──────────────────────────────────────────────
let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; console.log('  \u2713 ' + name); }
  else { fail++; console.error('  \u2717 ' + name); }
}

// ─── A. BĂM MIỀN (domainHashes) ───────────────────────────────────
{
  const h = cloud.hashStr('xin chào');
  check('A0: hashStr ổn định (chuỗi giống nhau → cùng băm) + khác chuỗi → khác băm',
    h === cloud.hashStr('xin chào') && h !== cloud.hashStr('xin chao'));

  const base = {
    batches: [{ id: 'b1', qty: 10 }], pressRecords: [], deletedIds: {},
    updatedBy: 'a@x.com', updatedAt: '2026-10-01T00:00:00.000Z'
  };
  const d1 = cloud.domainHashes(base);
  const d2 = cloud.domainHashes(Object.assign({}, base, { updatedBy: 'b@x.com', updatedAt: '2026-11-11T00:00:00.000Z' }));
  check('A1: bỏ qua khóa META (updatedBy/updatedAt) — đổi 2 khóa meta KHÔNG đổi băm miền',
    cloud.sameHashes(d1, d2));
  check('A2: băm miền KHÔNG chứa updatedBy/updatedAt',
    !('updatedBy' in d1) && !('updatedAt' in d1));
  check('A3: băm miền GỒM deletedIds (lần xóa phải làm đổi chữ ký)',
    typeof d1.deletedIds === 'string');

  const d3 = cloud.domainHashes(Object.assign({}, base, { batches: [{ id: 'b1', qty: 11 }] }));
  check('A4: đổi dữ liệu 1 miền → băm miền đó ĐỔI (miền khác giữ nguyên)',
    d3.batches !== d1.batches && d3.pressRecords === d1.pressRecords);

  const d4 = cloud.domainHashes(Object.assign({}, base, { deletedIds: { batches: { b1: 123 } } }));
  check('A5: thêm dấu vết xóa → băm deletedIds đổi', d4.deletedIds !== d1.deletedIds);
  check('A6: hai bản giống hệt → cùng toàn bộ băm', cloud.sameHashes(d1, cloud.domainHashes(base)));
  check('A7: khác tập khóa → sameHashes=false',
    cloud.sameHashes(d1, cloud.domainHashes({ batches: [], pressRecords: [] })) === false);
  check('A8: sameHashes(null, x) = false (an toàn)', cloud.sameHashes(null, d1) === false);
}

// ─── B. BĂM MIỀN BÁM BẢN ĐẨY (đã gỡ ảnh base64) ───────────────────
{
  const thumb = 'data:image/jpeg;base64,' + 'A'.repeat(5000);
  state.materialRecords = [
    { id: 'm1', date: '2026-10-01', type: 'Tre', weight: 100, images: [{ id: 'ph-1', thumb }] }
  ];
  const h1 = cloud.domainHashes(cloud.collectCloudPayload());
  // Đổi CHỈ ảnh thumb → bản ĐẨY mây không mang base64 → băm miền phải GIỮ NGUYÊN
  state.materialRecords = [
    { id: 'm1', date: '2026-10-01', type: 'Tre', weight: 100, images: [{ id: 'ph-1', thumb: thumb + 'ZZZ' }] }
  ];
  const h2 = cloud.domainHashes(cloud.collectCloudPayload());
  check('B1: đổi ảnh base64 (không lên mây) KHÔNG đổi băm miền — tránh đẩy vô ích',
    cloud.sameHashes(h1, h2));
  // Đổi trọng lượng (dữ liệu thật) → băm PHẢI đổi
  state.materialRecords = [
    { id: 'm1', date: '2026-10-01', type: 'Tre', weight: 120, images: [{ id: 'ph-1', thumb }] }
  ];
  const h3 = cloud.domainHashes(cloud.collectCloudPayload());
  check('B2: đổi trọng lượng (dữ liệu thật) → băm miền ĐỔI', !cloud.sameHashes(h1, h3));
  state.materialRecords = [];
}


// ─── C. HÀNH VI THOÁT NHANH / VẪN GỘP ─────────────────────────────
{
  state.pressRecords = [{ id: 'L1', qty: 1, updatedAt: '2020-01-01T00:00:00.000Z' }];
  const snap = cloud.collectCloudPayload();
  const dh = cloud.domainHashes(snap);
  const toDoc = (dataObj) => ({ exists: true, data: () => dataObj });

  // (1) Lần nạp ĐẦU: đi đường đầy đủ (thiết lập fbLastRemote) — dữ liệu giống → không đổi gì
  await cloud.handleRemoteSnapshot(toDoc(Object.assign({}, snap, { __dh: dh })));
  check('C1: lần nạp đầu không đổi dữ liệu cục bộ (dữ liệu giống nhau)',
    state.pressRecords.length === 1 && state.pressRecords[0].id === 'L1');

  // (2) Mây KHÁC + __dh KHÁC → đi đường đầy đủ → GỘP thêm bản ghi mây còn thiếu
  await cloud.handleRemoteSnapshot(toDoc({
    pressRecords: [{ id: 'R1', qty: 9, updatedAt: '2030-01-01T00:00:00.000Z' }],
    __dh: { la: 'khac' }
  }));
  check('C2: __dh KHÁC → vẫn gộp bản ghi mây thiếu (R1 vào máy)',
    state.pressRecords.some(r => r.id === 'R1'));

  // (3) __dh KHỚP băm cục bộ HIỆN TẠI → THOÁT NHANH → bản ghi mây KHÔNG được gộp
  const dhNow = cloud.domainHashes(cloud.collectCloudPayload());
  await cloud.handleRemoteSnapshot(toDoc({
    pressRecords: [{ id: 'R2', qty: 8, updatedAt: '2030-01-01T00:00:00.000Z' }],
    __dh: dhNow
  }));
  check('C3: __dh KHỚP → THOÁT NHANH, KHÔNG gộp bản ghi mây (R2 không vào máy)',
    !state.pressRecords.some(r => r.id === 'R2'));

  // (4) Doc rỗng (mây chưa có dữ liệu) → bỏ qua êm, không lỗi
  await cloud.handleRemoteSnapshot(toDoc({ __dh: dhNow }));
  check('C4: mây chưa có dữ liệu → bỏ qua êm (không lỗi)', state.pressRecords.length >= 2);
  state.pressRecords = [];
}

// ─── D. CẤU TRÚC MÃ NGUỒN (đảm bảo __dh gắn ở MỌI định dạng) ──────
{
  const src = fs.readFileSync(new URL('../js/cloud.js', import.meta.url), 'utf8');
  check('D1: định dạng PLAIN có đính chữ ký miền __dh',
    /Object\.assign\(\{\}, snap, \{ __dh: dh \}\)/.test(src));
  check('D2: định dạng GZIP có __dh', /__fmt: 'gzip', payload: b64, __dh: dh/.test(src));
  check('D3: định dạng SHARD (mục lục) có __dh', /__fmt: fmt, shards: parts\.length, epoch, __dh: dh/.test(src));
  check('D4: cổng THOÁT NHANH trong handleRemoteSnapshot (so __dh với băm cục bộ)',
    /sameHashes\(meta\.__dh, localHashesNow\(\)\)/.test(src));
  check('D5: thoát nhanh KHÔNG áp dụng cho lần nạp đầu', /const firstLoad = !fbDidLoadRemote/.test(src));
  check('D6: firePushSync vô hiệu cache băm cục bộ khi có thay đổi',
    /fbLocalHashes = null; \/\/ có thay đổi cục bộ/.test(src));
  check('D7: sau khi ĐẨY thành công đặt băm = bản vừa đẩy (nhận diện echo của chính mình)',
    /fbPushedDomainHashes = dh; fbLocalHashes = dh;/.test(src));
  check('D8: export đủ API cho tầng delta',
    typeof cloud.domainHashes === 'function' && typeof cloud.sameHashes === 'function' &&
    typeof cloud.hashStr === 'function' && typeof cloud.localHashesNow === 'function');
}

// ─── E. GIAI ĐOẠN 2: ĐỊNH DẠNG DELTA (MỤC LỤC + DOC TỪNG MIỀN) ─────
// Firestore giả lập trong bộ nhớ → chạy THẬT writeCloudSnapshot/readFullCloudObject.
{
  const store = new Map();
  let setCount = 0;
  const makeDoc = (collPath, id) => {
    const key = collPath + '/' + id;
    return {
      _key: key,
      set(data) { setCount++; store.set(key, JSON.parse(JSON.stringify(data))); return Promise.resolve(); },
      get() { return Promise.resolve({ exists: store.has(key), data: () => store.get(key) }); },
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
  const fakeDb = { collection: (name) => makeColl(name) };
  global.__BAMBOO_FIREBASE_READY__ = true;
  global.FIREBASE_CONFIG = { ownerEmail: 'dt55442@gmail.com', projectId: 'test-delta' };
  global.firebase = { apps: [], initializeApp(){}, firestore: () => fakeDb, auth: () => ({ onAuthStateChanged(){}, currentUser: null, signOut(){ return Promise.resolve(); } }) };
  cloud.initFirebase();
  check('E0: Firebase (fake) đã bật → chế độ online', cloud.isFirebaseOnline() === true);

  state.pressRecords = [{ id: 'P1', qty: 10, updatedAt: '2030-01-01T00:00:00.000Z' }];
  state.hrEmployees = [{ id: 'E1', name: 'Nguyễn A', updatedAt: '2030-01-01T00:00:00.000Z' }];
  state.batches = [];
  state.materialRecords = [];

  const r1 = await cloud.writeCloudSnapshot();
  check('E1: lần đẩy đầu → định dạng delta-v1 + ghi ĐỦ mọi miền (>5)', r1.mode === 'delta-v1' && r1.changed > 5);
  {
    const m = store.get('apps/main');
    check('E2: mục lục apps/main có __fmt=delta-v1 + __dh + deletedIds',
      !!m && m.__fmt === 'delta-v1' && !!m.__dh && ('deletedIds' in m));
    const d = store.get('apps/main/d/pressRecords');
    check('E3: có doc riêng miền (apps/main/d/pressRecords) kèm chữ ký h + data',
      !!d && !!d.h && Array.isArray(d.data) && d.data[0].id === 'P1');
  }

  const c2 = setCount;
  const r2 = await cloud.writeCloudSnapshot();
  check('E4: đẩy lần 2 KHÔNG đổi gì → changed = 0 và KHÔNG ghi gì thêm',
    r2.mode === 'delta-v1' && r2.changed === 0 && setCount === c2);

  const c3 = setCount;
  state.pressRecords.push({ id: 'P2', qty: 5, updatedAt: '2030-01-02T00:00:00.000Z' });
  const r3 = await cloud.writeCloudSnapshot();
  check('E5: đổi ĐÚNG 1 miền → chỉ ghi 1 doc miền + 1 mục lục (= 2 lượt ghi)',
    r3.mode === 'delta-v1' && r3.changed === 1 && (setCount - c3) === 2);

  const full = await cloud.readFullCloudObject();
  check('E6: readFullCloudObject ghép đủ dữ liệu từ mục lục + các doc miền',
    !!full && full.pressRecords.length === 2 && full.hrEmployees.length === 1 && Array.isArray(full.batches));
  check('E7: readDomainDoc đọc đúng 1 miền (hrEmployees)', (await cloud.readDomainDoc('hrEmployees')).length === 1);
  check('E8: readDomainDoc miền không tồn tại → undefined', (await cloud.readDomainDoc('khongTonTai')) === undefined);

  // Miền lớn (>600KB) → ghi dạng gzip trong CÙNG 1 doc miền
  state.pressRecords = Array.from({ length: 9000 }, (_, i) => ({
    id: 'BIG' + i, qty: i, note: 'Ghi chú dài cho bản ghi số ' + i + ' — nhà máy Ngọc Sơn Thanh Hóa',
    updatedAt: '2030-01-03T00:00:00.000Z'
  }));
  await cloud.writeCloudSnapshot();
  {
    const d = store.get('apps/main/d/pressRecords');
    check('E9: miền lớn (>600KB) được nén gzip trong 1 doc miền (enc=gzip + payload)',
      !!d && d.enc === 'gzip' && typeof d.payload === 'string' && !('data' in d));
    check('E10: đọc lại miền lớn giải nén đúng 9000 bản ghi',
      (await cloud.readDomainDoc('pressRecords')).length === 9000);
  }

  // Cấu trúc mã nguồn: có bộ điều phối delta + fallback định dạng cũ
  const src2 = fs.readFileSync(new URL('../js/cloud.js', import.meta.url), 'utf8');
  check('E11: doWriteCloudSnapshot ưu tiên delta, fallback định dạng cũ khi miền quá lớn',
    /return await writeDeltaSnapshot\(snap, dh\)/.test(src2) && /domainTooBig/.test(src2) &&
    /async function writeLegacySnapshot/.test(src2));
  check('E12: mục lục delta ghi kèm deletedIds (tombstone không cần doc riêng)',
    /__fmt: 'delta-v1', __dh: dh,\s*\n\s*deletedIds: snap\.deletedIds/.test(src2));
  check('E13: pullDeltaSnapshot chỉ tải doc miền ĐỔI rồi gộp MỘT PHẦN',
    /function pullDeltaSnapshot/.test(src2) && /localH\[k\] !== remoteH\[k\]/.test(src2));
  check('E14: subcollection miền = FB_DOMAIN_COLL, nằm dưới apps/main (rules đã phủ)',
    cloud.FB_DOMAIN_COLL === 'd' && typeof cloud.domainDocRef === 'function');
}

console.log('\nKết quả: ' + pass + ' pass, ' + fail + ' fail');
process.exit(fail ? 1 : 0);

