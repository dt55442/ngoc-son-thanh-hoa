// tests/planning-sync-stamp.test.mjs — KẾ HOẠCH SX: BẢN SỬA PHẢI THẮNG KHI ĐỒNG BỘ
// Sửa lỗi người dùng báo: "thẻ kế hoạch sx tự hồi sinh số ban đầu sau khi sửa".
// NGUYÊN NHÂN: js/planning.js trước đây KHÔNG ghi `updatedAt` ở bất kỳ đường ghi
// nào. Nhánh sửa thẻ chỉ đổi item.qty tại chỗ, giữ nguyên createdAt cũ → khi đồng
// bộ, cloud.recCompare() hòa mốc thời gian → quyết định bằng BĂM NỘI DUNG → bản
// trên mây (số cũ) có thể "thắng" → số vừa nhập bị trả về. Nay mọi đường ghi đều
// ghi updatedAt nên bản sửa luôn mới hơn và được giữ.
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
const qtyInputs = [];   // các ô "#plan-edit-items .plan-edit-qty"
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
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.error('  ✗ ' + name); }
}


// ─── A. THÊM KẾ HOẠCH MỚI: có createdAt + updatedAt ─────────────────
{
  state.currentUser = { email: 'admin@test.local', fullname: 'Admin', role: 'admin' };
  state.materialRates = [{ id: 'r1', product: 'Ván 1200x382x12', nan1: '1250x22x8', nanQty1: 40, efficiency: 70, createdAt: '2026-10-01T00:00:00.000Z' }];
  state.planningItems = [];
  document.getElementById('plan-item-year').value = '2026';
  document.getElementById('plan-item-week').value = '40';
  document.getElementById('plan-item-product').value = 'r1';
  document.getElementById('plan-item-qty').value = '250';
  plan.handlePlanningItemSubmit({ preventDefault });
  const it = state.planningItems[0];
  check('A1: thêm kế hoạch có createdAt + updatedAt', !!it && !!it.createdAt && !!it.updatedAt);
  check('A2: số lượng đúng như nhập', it && it.qty === 250);
}

// ─── B. SỬA THẺ: updatedAt mới → bản sửa THẮNG bản mây cũ ───────────
{
  state.planningItems = [{
    id: 'p1', week: 'Tuần 40', year: 2026, productId: 'r1', qty: 250,
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
  check('B1: sửa xong số lượng = 400 (máy)', after.qty === 400);
  check('B2: bản sửa CÓ updatedAt mới (điều kiện để thắng khi đồng bộ)',
    !!after.updatedAt && after.updatedAt > after.createdAt);

  const cloudOld = [{ id: 'p1', week: 'Tuần 40', year: 2026, productId: 'r1', qty: 250, createdAt: '2026-10-01T00:00:00.000Z' }];
  cloud.mergeRemoteIntoLocal({ planningItems: cloudOld }, false, true, { protectDirty: true, mergeNewer: true });
  check('B3: SAU ĐỒNG BỘ số lượng vẫn là 400 (không bị hồi sinh về 250)',
    state.planningItems.find(p => p.id === 'p1').qty === 400);
  check('B4: không sinh thêm dòng trùng', state.planningItems.filter(p => p.id === 'p1').length === 1);

// ─── C. NHÂN BẢN THẺ + D. ĐỊNH MỨC + E. CẤU TRÚC ────────────────────
{
  state.planningItems = [{ id: 'p1', week: 'Tuần 40', year: 2026, productId: 'r1', qty: 250, createdAt: '2026-10-01T00:00:00.000Z' }];
  document.getElementById('plan-edit-mode').value = 'dup';
  document.getElementById('plan-edit-year').value = '2026';
  document.getElementById('plan-edit-week').value = '41';
  document.getElementById('plan-edit-id').value = 'p1';
  qtyInputs.length = 0;
  qtyInputs.push(Object.assign(makeEl('qty2'), { value: '300' }));
  plan.handlePlanningEditSubmit({ preventDefault });
  const dup = state.planningItems.find(p => p.duplicatedFrom === 'p1');
  check('C1: nhân bản ra bản sao tuần 41, số 300', !!dup && dup.qty === 300 && dup.week === 'Tuần 41');
  check('C2: bản sao có createdAt + updatedAt', !!dup && !!dup.createdAt && !!dup.updatedAt);
  check('C3: bản gốc không bị sửa', state.planningItems.find(p => p.id === 'p1').qty === 250);
}
{
  state.materialRates = [{
    id: 'r1', product: 'Ván 1200x382x12', nan1: '1250x22x8', nan1Qty: 40, efficiency: 70,
    createdAt: '2026-10-01T00:00:00.000Z'
  }];
  document.getElementById('mat-rate-id').value = 'r1';
  document.getElementById('mat-rate-product').value = 'Ván 1200x382x12';
  document.getElementById('mat-rate-nan-use').value = 'Ván';
  document.getElementById('mat-rate-unit').value = 'Tấm';
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
  check('D1: sửa định mức giữ đúng hiệu suất mới', r.efficiency === 75);
  check('D2: createdAt gốc được GIỮ (lịch sử không bị đổi)', r.createdAt === '2026-10-01T00:00:00.000Z');
  check('D3: bản sửa có updatedAt mới → thắng bản mây khi đồng bộ',
    !!r.updatedAt && r.updatedAt > r.createdAt);
  cloud.mergeRemoteIntoLocal({
    materialRates: [{ id: 'r1', product: 'Ván 1200x382x12', nan1: '1250x22x8', nan1Qty: 40, efficiency: 70, createdAt: '2026-10-01T00:00:00.000Z' }]
  }, false, true, { protectDirty: true, mergeNewer: true });
  check('D4: sau đồng bộ vẫn giữ hiệu suất vừa sửa (75)', state.materialRates[0].efficiency === 75);
}
{
  const src = SRC('js/planning.js');
  check('E1: handlePlanningItemSubmit ghi updatedAt', /state\.planningItems\.push\(\{[\s\S]{0,400}?updatedAt/.test(src));
  check('E2: nhánh SỬA thẻ ghi item.updatedAt', /item\.updatedAt = nowIso;/.test(src));
  check('E3: định mức ghi updatedAt + giữ createdAt khi sửa',
    /createdAt: rateId \? \(oldRate && oldRate\.createdAt\) \|\| nowIso : nowIso/.test(src));
  check('E4: cloud.js so sánh bản ghi đã chuẩn hóa thứ tự khóa (recSame/canonicalJson)',
    /function canonicalJson/.test(SRC('js/cloud.js')) && /function recSame/.test(SRC('js/cloud.js')));
  check('E5: sw.js + APP_VERSION đã tăng cache',
    /nha-may-ngoc-son-v409/.test(SRC('sw.js')) && /v409/.test(SRC('js/state.js')));
}

console.log('\nKết quả: ' + pass + ' pass, ' + fail + ' fail');
process.exit(fail ? 1 : 0);


  const noStamp = { id: 'p1', qty: 400, createdAt: '2026-10-01T00:00:00.000Z' };
  check('B5: thiếu updatedAt → bản máy KHÔNG chắc thắng (nguyên nhân lỗi cũ)',
    cloud.recCompare(noStamp, { id: 'p1', qty: 250, createdAt: '2026-10-01T00:00:00.000Z' }) !== 1);
}