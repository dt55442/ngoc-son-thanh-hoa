// tests/hr-posneeds.test.mjs — Kiểm thử module "NHÂN SỰ CẦN TẠI CÁC VỊ TRÍ"
// (bảng dữ liệu trung gian: số người cần / số người hiện có theo vị trí + bộ phận):
// render bảng, bộ lọc bộ phận, đếm từ hồ sơ (Đồng Bộ Từ Hồ Sơ), lưu localStorage,
// card-launcher counter, đồng bộ mây (collectCloudSnapshot / cloudCore).
'use strict';

// ─── Stubs môi trường (giống hr-cards.test.mjs) ─────────────────
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

let pass = 0, fail = 0;
function check(name, cond) { if (cond) { pass++; console.log('PASS — ' + name); } else { fail++; console.log('FAIL — ' + name); } }


// ─── Dữ liệu giả lập ────────────────────────────────────────────
const { state, STORAGE_KEY_HR_POSNEEDS } = await import('../js/state.js');
const hr = await import('../js/hr.js');
const cloud = await import('../js/cloud.js');

state.currentUser = { username: 'admin', role: 'admin', editTabs: [], allowAdvanced: true };
state.hrEmployees = [
  { id: 'empA', code: 'NV001', name: 'Nguyễn Văn A', department: 'Xưởng 1', status: 'active', skills: ['px1'], position: '' },
  { id: 'empB', code: 'NV002', name: 'Trần Thị B',   department: 'Xưởng 1', status: 'active', skills: ['px1'], position: '' },
  { id: 'empC', code: 'NV003', name: 'Lê Văn C',     department: 'Xưởng 1', status: 'quit',   skills: ['px1'], position: '' },
  { id: 'empD', code: 'NV004', name: 'Phạm Thị D',   department: 'QC',      status: 'active', skills: [],      position: 'Kiểm chất' }
];
state.hrPositions = [
  { id: 'px1', name: 'Ép ván',    department: 'Xưởng 1', note: '' },
  { id: 'pqc', name: 'Kiểm chất', department: 'QC',      note: '' }
];
state.hrPositionNeeds = []; // để bảng TỰ NẠP từ danh mục vị trí

// ─── A. TỰ NẠP TẤT CẢ VỊ TRÍ VÀO BẢNG ──────────────────────────
hr.renderHrView();
check('POS-NEED: tự nạp 2 dòng cho 2 vị trí danh mục', state.hrPositionNeeds.length === 2);
const autoIds = state.hrPositionNeeds.map(r => r.id).sort().join(',');
check('POS-NEED: id ổn định posneed-pos-<vị trí id>', autoIds === 'posneed-pos-pqc,posneed-pos-px1');
const px1row = state.hrPositionNeeds.find(r => r.positionId === 'px1');
const pqcrow = state.hrPositionNeeds.find(r => r.positionId === 'pqc');
check('POS-NEED: Số người hiện có tự đếm (Ép ván=2 bỏ NV nghỉ, Kiểm chất=1)', px1row.haveQty === 2 && pqcrow.haveQty === 1);
check('POS-NEED: Số người cần mặc định = 1', px1row.needQty === 1 && pqcrow.needQty === 1);
let bodyHTML = document.getElementById('hr-posneed-body').innerHTML;
check('POS-NEED: render 2 dòng + ô nhập số (value="2")', (bodyHTML.match(/<tr/g) || []).length === 2 && bodyHTML.includes('Ép ván') && bodyHTML.includes('value="2"'));
check('POS-NEED: chip tổng hợp "Cần 2 — hiện có 3"', document.getElementById('hr-posneed-count').textContent.includes('Cần 2') && document.getElementById('hr-posneed-count').textContent.includes('hiện có 3'));

// ─── B. CHỈNH SỬA TAY từng ô Số người cần / hiện có ────────────
hr.hrSetPositionNeedQty('posneed-pos-px1', 'needQty', '5');
hr.hrSetPositionNeedQty('posneed-pos-px1', 'haveQty', '3');
check('POS-NEED: sửa tay cần=5, hiện có=3', px1row.needQty === 5 && px1row.haveQty === 3);
check('POS-NEED: bảng hiển thị giá trị sửa (value="5")', document.getElementById('hr-posneed-body').innerHTML.includes('value="5"'));
check('POS-NEED: đã lưu localStorage sau sửa tay', JSON.parse(storeBacking.get(STORAGE_KEY_HR_POSNEEDS) || '[]').some(r => r.id === 'posneed-pos-px1' && r.needQty === 5));

// ─── C. BỘ LỌC BỘ PHẬN ─────────────────────────────────────────
document.getElementById('hr-posneed-filter-dept').value = 'QC';
hr.renderPositionNeedsTable();
let bodyQC = document.getElementById('hr-posneed-body').innerHTML;
check('POS-NEED: lọc Bộ phận QC -> 1 dòng (Kiểm chất)', (bodyQC.match(/<tr/g) || []).length === 1 && bodyQC.includes('Kiểm chất') && !bodyQC.includes('Ép ván'));
document.getElementById('hr-posneed-filter-dept').value = 'all';

// ─── D. ĐỒNG BỘ TỪ HỒ SƠ (lấy dữ liệu từ bảng khác) ────────────
hr.syncPositionNeedsFromEmployees();
check('POS-NEED: đồng bộ ghi đè số tay -> Ép ván hiện có = 2', px1row.haveQty === 2);
check('POS-NEED: localStorage cập nhật sau đồng bộ', JSON.parse(storeBacking.get(STORAGE_KEY_HR_POSNEEDS) || '[]').some(r => r.id === 'posneed-pos-px1' && r.haveQty === 2));

// ─── E. THẺ LAUNCHER (counter trên thẻ mini) ───────────────────
hr.renderHrView();
// Ép ván: cần 5 - có 2 = thiếu 3; Kiểm chất: cần 1 - có 1 = 0
check('POS-NEED: licznik thẻ = "2 vị trí · thiếu 3"', document.getElementById('hr-mini-count-posneed').textContent === '2 vị trí · thiếu 3');

// ─── F. XÓA DÒNG TỰ NẠP -> KHÔNG HỒI SINH ──────────────────────
hr.deletePositionNeed('posneed-pos-pqc');
check('POS-NEED: xóa dòng -> còn 1 dòng + tombstone', state.hrPositionNeeds.length === 1 && (state.deletedIds.hrPositionNeeds || {})['posneed-pos-pqc']);
hr.renderHrView();
check('POS-NEED: render sau xóa KHÔNG nạp lại vị trí đã xóa', (document.getElementById('hr-posneed-body').innerHTML.match(/<tr/g) || []).length === 1);

// ─── G. ĐỒNG BỘ MÂY ────────────────────────────────────────────
const snap = cloud.collectCloudSnapshot();
check('POS-NEED: snapshot mây chứa hrPositionNeeds', Array.isArray(snap.hrPositionNeeds) && snap.hrPositionNeeds.length === 1);
check('POS-NEED: cloudCore có khóa hrPositionNeeds', cloud.cloudCore(snap).includes('"hrPositionNeeds"'));
cloud.applyFireSnapshot({ hrPositionNeeds: [{ id: 'pn-remote', department: 'Lò Hơi', position: 'Đốt lò', positionId: '', needQty: 1, haveQty: 1, notes: '' }] });
check('POS-NEED: applyFireSnapshot nhận dòng từ mây', (state.hrPositionNeeds || []).some(r => r.id === 'pn-remote'));
check('POS-NEED: dữ liệu mây lưu localStorage', JSON.parse(storeBacking.get(STORAGE_KEY_HR_POSNEEDS) || '[]').some(r => r.id === 'pn-remote'));

console.log(`\nWYNIK: ${pass} pass, ${fail} fail`);
if (fail > 0) process.exit(1);

