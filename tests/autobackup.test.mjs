// tests/autobackup.test.mjs — Kiểm thử AUTO BACKUP (js/autobackup.js):
// chụp bản cất (throttle), ring buffer 10 bản, phục hồi GỘP KHÉO qua
// mergeRemoteIntoLocal (bản ghi mới hơn theo dấu thời gian thắng), không ghi đè mù quáng.
'use strict';

// ─── Stubs môi trường (giống hr-overtime.test.mjs) ──────────────
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
global.matchMedia = () => ({ matches: false, media: '', addListener(){}, removeListener(){}, addEventListener(){}, removeEventListener(){} });
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

// ─── KHUNG CHẠY TEST ──────────────────────────────────────────
let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; console.log('PASS ' + name); }
  else { fail++; console.log('FAIL ' + name); }
}

const { state, STORAGE_KEY_AUTOBACKUP } = await import('../js/state.js');
const ab = await import('../js/autobackup.js');

state.currentUser = { username: 'admin', role: 'admin', fullname: 'Quản Trị', email: 'a@b.c' };

// ═══════════════ A. CHỤP BẢN CẤT: BỎ TRÙNG / CHỐT GIẢM / THROTTLE ═══════════
console.log('--- A. Chụp bản cất: bỏ trùng, chốt giảm đột biến, throttle ---');
state.autoBackups = [];
state.batches = [{ id: 'b1', code: 'N001', quantity: 10, stage: 'say1', note: 'x'.repeat(6000), createdAt: '2026-09-17T00:00:00Z' }];
ab.captureAutoBackup('Lần 1', true);
check('AB: chụp lần 1 tạo 1 bản cất', state.autoBackups.length === 1);
check('AB: bản cất có lý do + người cất', state.autoBackups[0].reason === 'Lần 1' && state.autoBackups[0].by === 'Quản Trị');
check('AB: dữ liệu bản cất chứa lô nan', state.autoBackups[0].data.includes('N001'));
check('AB: bản cất ghi sẵn size + hash (định dạng mới)', Number(state.autoBackups[0].size) > 0 && typeof state.autoBackups[0].hash === 'string' && state.autoBackups[0].hash.length === 8);
check('AB: đã ghi localStorage', JSON.parse(storeBacking.get(STORAGE_KEY_AUTOBACKUP) || '[]').length === 1);
check('AB: throttle — không force thì KHÔNG chụp thêm (trong 5 phút)', (ab.captureAutoBackup('Lần 2', false), state.autoBackups.length === 1));

// BỎ TRÙNG: chụp lại y hệt (force) — hash trùng → không thêm bản
ab.resetCaptureThrottleForTest();
ab.captureAutoBackup('Lần 1 chụp lại (y hệt)', true);
check('AB: bỏ trùng — dữ liệu không đổi thì KHÔNG thêm bản', state.autoBackups.length === 1);

// GẦN NHƯ KHÔNG ĐỔI (bản thường, lệch <2%): thêm 1 lô nhỏ → bị bỏ qua
ab.resetCaptureThrottleForTest();
state.batches.push({ id: 'bx', code: 'N00X', quantity: 1, stage: 'say1', note: 'y', createdAt: '2026-09-17T00:10:00Z' });
ab.captureAutoBackup('Thay đổi tí xíu', false);
check('AB: bản thường lệch <2% → bỏ qua (không thêm bản)', state.autoBackups.length === 1);

// CHỐT GIẢM ĐỘT BIẾN (bản thường nhỏ hơn ≥30%): KHÔNG lưu — phòng kịch bản xóa nhầm
ab.resetCaptureThrottleForTest();
state.batches = [{ id: 'small', code: 'S1', quantity: 1, stage: 'kho', createdAt: '2026-09-17T01:00:00Z' }];
ab.captureAutoBackup('Bị giảm nhỏ', false);
check('AB: bản thường nhỏ hơn ≥30% → KHÔNG lưu (chốt giảm đột biến)', state.autoBackups.length === 1);

// ... nhưng bản FORCE (trước thao tác nguy hiểm) vẫn luôn lưu dù nhỏ hơn
ab.resetCaptureThrottleForTest();
ab.captureAutoBackup('Trước khi nạp file JSON (force)', true);
check('AB: bản FORCE vẫn luôn lưu dù nhỏ hơn', state.autoBackups.length === 2 && state.autoBackups[0].reason === 'Trước khi nạp file JSON (force)');

// BẬC THANG: chụp 12 vòng dữ liệu TĂNG MẠNH (mỗi vòng ~×2 dung lượng)
// → giữ đúng 10 bản: 3 bản mới nhất + mốc tăng dần; bản cột nhỏ bị loại trước.
for (let i = 0; i < 12; i++) {
  ab.resetCaptureThrottleForTest();
  state.batches.push({ id: 'v' + i, code: 'V' + i, quantity: i, stage: 'kho', note: 'z'.repeat(600 * Math.pow(2, i)), createdAt: '2026-09-17T02:' + String(i).padStart(2, '0') + ':00Z' });
  ab.captureAutoBackup('Vòng ' + (i + 1), true);
}
check('AB: trần 10 bản — bậc thang giữ đúng 10', state.autoBackups.length === 10);
check('AB: 3 bản mới nhất luôn được giữ', state.autoBackups.slice(0, 3).every(b => b.reason.startsWith('Vòng ')));
check('AB: bản lớn nhất (Vòng 12) được giữ', state.autoBackups.some(b => b.reason === 'Vòng 12'));
check('AB: bản cột nhỏ (force nhỏ) bị loại thay vì bản lớn', !state.autoBackups.some(b => b.reason === 'Trước khi nạp file JSON (force)'));

// ═══════════════ F. PRUNE BẬC THANG TRỰC TIẾP ═══════════════════
console.log('--- F. pruneAutoBackupsSmart — giữ theo giá trị phục hồi ---');
const mk = (n, size) => ({ ts: new Date(Date.UTC(2026, 8, 17, 0, 0, 0) - n * 60000).toISOString(), by: 'test', reason: 'T' + n, size, data: 'x', hash: 'h' + n });
state.autoBackups = [mk(0, 80), mk(1, 80), mk(2, 80), mk(3, 70), mk(4, 70), mk(5, 1000), mk(6, 950), mk(7, 900), mk(8, 800), mk(9, 500), mk(10, 300), mk(11, 100)];
ab.pruneAutoBackupsSmart();
check('AB: 12 bản → giữ 8 (3 mới nhất + 5 mốc)', state.autoBackups.length === 8);
check('AB: 3 bản mới nhất giữ nguyên', state.autoBackups.some(b => b.reason === 'T0') && state.autoBackups.some(b => b.reason === 'T1') && state.autoBackups.some(b => b.reason === 'T2'));
check('AB: bản lớn nhất nhóm cũ (T5=1000) được giữ', state.autoBackups.some(b => b.reason === 'T5'));
check('AB: mốc tăng dần được giữ (T8=800, T9=500, T10=300, T11=100)', state.autoBackups.some(b => b.reason === 'T8') && state.autoBackups.some(b => b.reason === 'T9') && state.autoBackups.some(b => b.reason === 'T10') && state.autoBackups.some(b => b.reason === 'T11'));
check('AB: trạng thái trung gian nhỏ bị bỏ (T6=950, T7=900)', !state.autoBackups.some(b => b.reason === 'T6' || b.reason === 'T7'));
check('AB: trạng thái cũ nhỏ bị bỏ (T3=70, T4=70)', !state.autoBackups.some(b => b.reason === 'T3' || b.reason === 'T4'));
check('AB: danh sách vẫn sắp mới nhất lên đầu', state.autoBackups[0].reason === 'T0' && String(state.autoBackups[0].ts).localeCompare(String(state.autoBackups[1].ts)) > 0);

// ═══════════════ G. BACKFILL bản cất định dạng cũ (chưa có size/hash) ══
console.log('--- G. backfill — tính bù size/hash cho bản cũ ---');
const legacy = { ts: '2026-09-16T00:00:00Z', by: 'Cũ', reason: 'Bản cũ', data: '{"hello":"world","pad":"' + 'p'.repeat(100) + '"}' };
localStorage.setItem(STORAGE_KEY_AUTOBACKUP, JSON.stringify([legacy]));
ab.loadAutoBackups();
await new Promise((r) => setTimeout(r, 20));
check('AB: bản cũ được tính bù size (độ dài chuỗi trơn)', Number(state.autoBackups[0].size) === legacy.data.length);
check('AB: bản cũ được tính bù hash 8 ký tự', typeof state.autoBackups[0].hash === 'string' && state.autoBackups[0].hash.length === 8);

// ═══════════════ B. PHỤC HỒI GỘP KHÉO ═══════════════════════════
console.log('--- B. Phục hồi bản cất — GỘP KHÉO (không ghi đè mù quáng) ---');
// B1: bản cất chứa lô b1; sau đó máy XÓA b1 đúng quy trình (tombstone) →
//     phục hồi KHÔNG được hồi sinh b1 (tôn trọng tombstone)
ab.captureAutoBackup('Trước khi xóa nhầm', true);
const entryBefore = state.autoBackups.find(b => b.reason === 'Trước khi xóa nhầm');
state.batches = [{ id: 'b2', code: 'N002', quantity: 5, stage: 'kho', createdAt: '2026-09-17T01:00:00Z' }];
state.deletedIds = { batches: { b1: '2026-09-17T02:00:00Z' } };
await ab.restoreAutoBackup(entryBefore.ts);
check('AB: phục hồi KHÔNG hồi sinh b1 đã bị xóa (tombstone thắng)', !state.batches.some(b => b.id === 'b1'));
check('AB: phục hồi KHÔNG mất lô mới b2', state.batches.some(b => b.id === 'b2'));

// B2: bản cất chứa lô b3; sau đó máy MẤT b3 (không tombstone) → phục hồi bổ sung lại
state.batches = [{ id: 'b3', code: 'N003', quantity: 7, stage: 'bao_tinh', createdAt: '2026-09-17T03:00:00Z' }];
state.deletedIds = {};
ab.captureAutoBackup('Bản cất có b3', true);
const entryLost = state.autoBackups.find(b => b.reason === 'Bản cất có b3');
state.batches = [{ id: 'b4', code: 'N004', quantity: 8, stage: 'kho', createdAt: '2026-09-17T04:00:00Z' }]; // giả lập mất b3
await ab.restoreAutoBackup(entryLost.ts);
check('AB: phục hồi bổ sung lại lô b3 bị mất (gộp khéo)', state.batches.some(b => b.id === 'b3'));
check('AB: phục hồi giữ nguyên lô hiện có b4', state.batches.some(b => b.id === 'b4'));

// ═══════════════ C. LOAD từ localStorage ═════════════════════════
console.log('--- C. loadAutoBackups nạp lại từ localStorage ---');
ab.loadAutoBackups();
check('AB: loadAutoBackups nạp lại từ localStorage (khớp số bản)', state.autoBackups.length === JSON.parse(storeBacking.get(STORAGE_KEY_AUTOBACKUP) || '[]').length && state.autoBackups.length > 0);
check('AB: dữ liệu đọc từ localStorage khớp', state.autoBackups.some(b => b.reason === 'Bản cất có b3'));

// ═══════════════ D. XÓA 1 BẢN CẤT ════════════════════════════════
console.log('--- D. deleteAutoBackup ---');
const delTs = state.autoBackups[0].ts;
ab.deleteAutoBackup(delTs);
check('AB: xóa bản cất theo ts', !state.autoBackups.some(b => b.ts === delTs));
check('AB: localStorage cập nhật sau xóa', !JSON.parse(storeBacking.get(STORAGE_KEY_AUTOBACKUP) || '[]').some(b => b.ts === delTs));

// ═══════════════ E. API EXPORT ═══════════════════════════════════
console.log('--- E. API export đầy đủ ---');
check('AB: module export đủ API phục hồi + prune/throttle test', typeof ab.restoreAutoBackup === 'function' && typeof ab.restoreCloudBackup === 'function' && typeof ab.maybeWriteCloudBackup === 'function' && typeof ab.pruneAutoBackupsSmart === 'function' && typeof ab.resetCaptureThrottleForTest === 'function');

console.log(`KẾT QUẢ: ${pass} pass, ${fail} fail`);
if (fail > 0) process.exit(1);
