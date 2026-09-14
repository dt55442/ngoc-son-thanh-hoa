// tests/cloud-shard.test.mjs — Kiểm thử cơ chế CHỐNG VƯỢT GIỚI HẠN 1 MiB/doc
// của Firestore (lỗi thật: "Document 'apps/main' ... size (1,049,120 bytes)
// exceeds the maximum allowed size of 1,048,576 bytes"):
//   1) Nén gzip bản JSON snapshot (CompressionStream có sẵn của trình duyệt)
//   2) Chia mảnh (shard) base64/JSON thành nhiều doc ≤ ~700KB khi cần
// Dùng trực tiếp các hàm thuần đã export từ js/cloud.js (giống qc.test.mjs).
'use strict';

// ─── Stubs môi trường (giống qc.test.mjs) ────────────────────────
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

// ─── KHUNG CHẠY TEST ──────────────────────────────────────────────
let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; console.log('  \u2713 ' + name); }
  else { fail++; console.error('  \u2717 ' + name); }
}
const KB = 1024;
const fmtKB = (n) => (n / KB).toFixed(0) + ' KB';

// ─── A. TIỆN ÍCH BYTE / GZIP CƠ BẢN ──────────────────────────────
check('A1: utf8Bytes đếm đúng bytes UTF-8 (tiếng Việt 3 bytes/ký tự)',
  cloud.utf8Bytes('a') === 1 && cloud.utf8Bytes('ạ') === 3 && cloud.utf8Bytes('ngà') === 4);
{
  const s = 'Dữ liệu tiếng Việt "Lô Hội" 123 — emoji 🏭 giữa chuỗi';
  const g = await cloud.gzipStringToBase64(s);
  const back = await cloud.gunzipBase64ToString(g);
  check('A2: gzip → base64 → giải nén khôi phục nguyên vẹn chuỗi (tiếng Việt + emoji)', back === s);
  check('A3: base64 là ASCII (byte = ký tự)', g.length === cloud.utf8Bytes(g));
  const empty = await cloud.gzipStringToBase64('');
  check('A4: gzip chuỗi rỗng vẫn giải nén được', (await cloud.gunzipBase64ToString(empty)) === '');
}

// ─── B. MÔ PHỎNG DỮ LIỆU THẬT ~1.05 MB (đúng mức gây lỗi) ─────────
// Sinh snapshot giống collectCloudSnapshot: nhiều bản ghi tiếng Việt, ISO date, id...
// (ước lượng số bản ghi trước để tránh stringify cả snapshot sau từng lần thêm)
function makeBigSnapshot(targetBytes) {
  const words = (n) => Array.from({ length: n }, (_, i) => 'NgọcSơn' + i).join(' ');
  const out = {
    batches: [], customCharts: [], materialRates: [], materialRecords: [],
    materialPlan: {}, planningItems: [], planningForecast: {}, planningStock: {},
    qcExports: [], pressRecords: [], pressNotes: [],
    hrEmployees: [], hrLeaves: [], hrRecruitment: [], hrPositionNeeds: [],
    hrShifts: [], hrAssignments: [], hrPositions: [], hrAttendance: [], hrCheckins: [],
    history: [], deletedIds: {},
    updatedBy: 'dt55442@gmail.com', updatedAt: new Date().toISOString()
  };
  const stamp = new Date(1700000000000).toISOString();
  const pushSet = (i) => {
    out.batches.push({
      id: 'b' + i, code: 'LÔ-' + (1000 + i), product: 'Ván ép Cẩm La Vàng ' + words(4),
      status: i % 3 === 0 ? 'done' : 'in-progress', createdAt: stamp, updatedAt: stamp,
      note: 'Ghi chú công đoạn nhà máy ' + words(6), qty: 120 + (i % 50), week: 'Tuần ' + (i % 52 + 1), year: 2026
    });
    out.pressRecords.push({ id: 'p' + i, batchId: 'b' + i, line: 'Dây ' + (i % 4 + 1), qty: 90 + (i % 30), note: words(3), createdAt: stamp, updatedAt: stamp });
    out.materialRecords.push({ id: 'm' + i, batchId: 'b' + i, name: 'Keo dán ' + words(3), qty: 12 + (i % 7), unit: 'kg', createdAt: stamp, updatedAt: stamp });
    out.history.push({ id: 'h' + i, at: stamp, user: 'dt55442@gmail.com', desc: 'Sửa bản ghi ' + words(5) });
  };
  pushSet(0);
  const perRecord = cloud.utf8Bytes(JSON.stringify(out)); // ~1 bộ 4 bản ghi
  const n = Math.max(1, Math.floor(targetBytes / perRecord));
  for (let i = 1; i <= n; i++) pushSet(i);
  // Tinh chỉnh: thêm lần lượt cho tới khi VƯỢT đúng mức mục tiêu (vài bước)
  let k = n + 1;
  while (cloud.utf8Bytes(JSON.stringify(out)) < targetBytes) { pushSet(k++); }
  return out;
}
const big = makeBigSnapshot(1049120); // đúng bằng mức dữ liệu gây lỗi của người dùng
const raw = JSON.stringify(big);
const rawSize = cloud.utf8Bytes(raw);
console.log('  ℹ Snapshot mô phỏng: ' + fmtKB(rawSize) + ' (JSON trơn), ' + big.batches.length + ' lô');
check('B1: snapshot mô phỏng VƯỢT giới hạn 1 MiB của Firestore (tái hiện lỗi thật)', rawSize > 1048576);

// ─── C. LỚP 1: NÉN GZIP — 1 doc duy nhất ─────────────────────────
const t0 = Date.now();
const b64 = await cloud.gzipStringToBase64(raw);
const ms = Date.now() - t0;
console.log('  ℹ Sau nén gzip + base64: ' + fmtKB(b64.length) + ' (' + (100 - Math.round(b64.length / rawSize * 100)) + '% nhỏ hơn), nén trong ' + ms + 'ms');
check('C1: gzip đủ nhỏ để nằm trong MỘT doc (≤ ' + fmtKB(cloud.CLOUD_GZIP_LIMIT) + ')', b64.length <= cloud.CLOUD_GZIP_LIMIT);
check('C2: giải nén khôi phục nguyên vẹn JSON ~1MB', (await cloud.gunzipBase64ToString(b64)) === raw);

// ─── D. LỚP 2: CHIA MẢNH (SHARD) — hoạt động dù dữ liệu lớn cỡ nào ──
const parts = cloud.chunkString(b64, cloud.CLOUD_SHARD_PART_GZIP);
console.log('  ℹ Chia ' + parts.length + ' mảnh gzip-base64, mảnh lớn nhất: ' + fmtKB(Math.max(...parts.map(p => p.length))));
check('D1: mỗi mảnh gzip-base64 ≤ ' + fmtKB(cloud.CLOUD_SHARD_PART_GZIP) + ' (an toàn dưới 1MiB/doc)',
  parts.every(p => p.length <= cloud.CLOUD_SHARD_PART_GZIP));
check('D2: ghép đủ mảnh → giải nén → JSON nguyên vẹn', (await cloud.gunzipBase64ToString(parts.join(''))) === raw);
check('D3: số mảnh = ceil(kích thước / kích thước mảnh)', parts.length === Math.ceil(b64.length / cloud.CLOUD_SHARD_PART_GZIP));

// Fallback trình duyệt cũ (không có CompressionStream): shard JSON trơn
const pparts = cloud.chunkString(raw, cloud.CLOUD_SHARD_PART_PLAIN);
check('D4: mỗi mảnh JSON trơn mã hóa UTF-8 < 1MiB (biên 3 bytes/ký tự)',
  pparts.every(p => cloud.utf8Bytes(p) < 1048576));
check('D5: ghép mảnh JSON trơn → parse nguyên vẹn', JSON.stringify(JSON.parse(pparts.join(''))) === raw);

// ─── E. MÔ PHỎNG VÒNG ĐỜI SHARD THẬT (mục lục + epoch) ───────────
// Giả lập Firestore bằng Map: doc 'main' (mục lục) + các mảnh shards/i —
// kiểm tra LOGIC lắp ráp theo epoch (đúng cách assembleRemoteObject đọc mây).
{
  const docs = new Map();
  const setShard = (i, part, ep) => docs.set('shard:' + i, { part, idx: i, epoch: ep, ts: Date.now() });
  const setMeta = (m) => docs.set('main', m);
  // Lần đẩy 1: dữ liệu 1MB chia 2 mảnh (epoch cũ)
  const epoch1 = 'abc123';
  parts.forEach((p, i) => setShard(i, p, epoch1));
  setMeta({ __fmt: 'shard-gzip', shards: parts.length, epoch: epoch1 });
  const load = (meta) => {
    const loaded = [];
    for (let i = 0; i < meta.shards; i++) {
      const d = docs.get('shard:' + i);
      if (d && d.epoch === meta.epoch) loaded[d.idx] = d.part;
    }
    return loaded;
  };
  const back1 = await cloud.gunzipBase64ToString(load(docs.get('main')).join(''));
  check('E1: lắp ráp shard theo epoch → dữ liệu nguyên vẹn', back1 === raw);
  // Lần đẩy 2: dữ liệu mới GỌN hơn, chỉ 1 mảnh (epoch mới). Nếu lắp ráp KHÔNG
  // lọc epoch -> sẽ nạp phải mảnh cũ idx=0 (dữ liệu 1MB) hoặc báo thiếu mảnh.
  const newText = 'Bản dữ liệu mới GỌN hơn trên mây';
  const single = await cloud.gzipStringToBase64(newText);
  const epoch2 = 'def456';
  setShard(0, single, epoch2);
  setMeta({ __fmt: 'shard-gzip', shards: 1, epoch: epoch2 });
  const loaded2 = load(docs.get('main'));
  check('E2: mảnh của epoch CŨ bị BỎ QUA — chỉ nạp mảnh cùng epoch mục lục',
    loaded2.length === 1 && (await cloud.gunzipBase64ToString(loaded2.join(''))) === newText);
  // Mục lục trỏ SAI epoch/số mảnh (bị hỏng) → phần thiếu phải được phát hiện,
  // KHÔNG được nhầm lấy mảnh của epoch cũ (giống assembleRemoteObject: fill(null))
  const metaBad = { __fmt: 'shard-gzip', shards: 2, epoch: 'zzz999' };
  const loaded3 = new Array(metaBad.shards).fill(null);
  for (let i = 0; i < metaBad.shards; i++) {
    const d = docs.get('shard:' + i);
    if (d && d.epoch === metaBad.epoch) loaded3[d.idx] = d.part;
  }
  check('E3: mục lục trỏ epoch lạ → mọi mảnh được coi là THIẾU (không nhầm mảnh cũ)',
    loaded3.filter(p => p === null).length === 2 && loaded3.filter(p => typeof p === 'string').length === 0);
}

console.log('\nKết quả: ' + pass + ' pass, ' + fail + ' fail');
process.exit(fail ? 1 : 0);