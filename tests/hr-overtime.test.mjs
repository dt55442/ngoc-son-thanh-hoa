// tests/hr-overtime.test.mjs — Kiểm thử thẻ "Đăng Ký Tăng Ca" (tab Nhân Sự):
// tạo đăng ký (giờ DỰ KIẾN), duyệt CHỈ Admin/Manager, giờ TC THỰC TẾ tự tính
// từ Bảng bố trí vị trí theo ngày (hrAssignments) — không lưu cứng.
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


const { state, STORAGE_KEY_HR_OVERTIMES } = await import('../js/state.js');
const hr = await import('../js/hr.js');
const cloud = await import('../js/cloud.js');

state.currentUser = { username: 'admin', role: 'admin', fullname: 'Quản Trị', editTabs: [], allowAdvanced: true };
state.activeView = 'hr-view';
state.hrEmployees = [
  { id: 'empA', code: 'NV001', name: 'Nguyễn Văn A', department: 'Xưởng 1', status: 'active', skills: [], position: '' },
  { id: 'empB', code: 'NV002', name: 'Trần Thị B',   department: 'Xưởng 2', status: 'active', skills: [], position: '' }
];
state.hrPositions = [{ id: 'px1', name: 'Ép ván', department: 'Xưởng 1', note: '' }];
state.hrOvertimes = [];
state.hrAssignments = [];
function setField(id, v) { document.getElementById(id).value = v; }

// ─── A. EDITOR GỬI ĐĂNG KÝ (được phép) ──────────────────────────
state.currentUser = { username: 'ed', role: 'editor', fullname: 'Kế Toán', editTabs: ['hr'], allowAdvanced: false };
setField('ot-employee', 'Nguyễn Văn A'); setField('ot-employee-id', 'empA');
setField('ot-date', '2024-06-06'); setField('ot-start', '17:30'); setField('ot-end', '19:30');
setField('ot-reason', 'Gấp đơn hàng');
hr.handleOvertimeSubmit({ preventDefault(){} });
check('OT: editor gửi được đăng ký (1 đơn, chờ duyệt)', state.hrOvertimes.length === 1 && state.hrOvertimes[0].status === 'pending');
const ot = state.hrOvertimes[0];
check('OT: giờ dự kiến lưu đúng (17:30→19:30, 120 phút)', ot.start === '17:30' && ot.end === '19:30' && ot.plannedMin === 120);
check('OT: localStorage đã ghi', JSON.parse(storeBacking.get(STORAGE_KEY_HR_OVERTIMES) || '[]').length === 1);

// ─── B. GIỜ THỰC TẾ: chưa có trên Bảng bố trí → 0 ───────────────
check('OT: chưa có trên Bảng bố trí -> TC thực tế = 0', hr.overtimeActualMin(ot) === 0);
hr.renderHrView();
check('OT: bảng hiển thị "chưa có"', document.getElementById('hr-ot-body').innerHTML.includes('chưa có'));
check('OT: licznik thẻ mini = 1 chờ duyệt', document.getElementById('hr-mini-count-ot').textContent === '1 chờ duyệt');

// ─── C. SỰ CỐ KÉO DÀI CA: cập nhật giờ thật trên Bảng bố trí ────
// Xưởng 1 hành chính 07:00–17:30 (nghỉ trưa 11:30–13:00):
// làm 07:00–19:00 = 12h -> HC 9h + nghỉ trưa 1h30 -> TC = 1h30 (90 phút)
state.hrAssignments = [{ id: 'a1', date: '2024-06-06', department: 'Xưởng 1', positionId: 'px1', employeeId: 'empA', start: '07:00', end: '19:00', shiftIdx: 0 }];
check('OT: TC thực tế = 90 phút (1h30) tự tính từ Bảng bố trí', hr.overtimeActualMin(ot) === 90);
hr.renderHrView();
check('OT: bảng hiển thị "TC 1h30"', document.getElementById('hr-ot-body').innerHTML.includes('1h30'));
check('OT: giờ dự kiến 19h30 KHÔNG bị đè (hiển thị riêng, định dạng 19h30)', document.getElementById('hr-ot-body').innerHTML.includes('19h30'));
// Sửa lại giờ do sự cố (kéo thêm): 07:00–20:00 -> TC = 2h30
state.hrAssignments[0].end = '20:00';
check('OT: sửa giờ trên Bảng bố trí -> TC thực tế tự cập nhật 150 phút', hr.overtimeActualMin(ot) === 150);

// ─── D. QUYỀN: editor KHÔNG duyệt/xóa được ──────────────────────
hr.approveOvertime(ot.id);
check('OT: editor duyệt -> bị chặn (vẫn pending)', ot.status === 'pending');
hr.deleteOvertime(ot.id);
check('OT: editor xóa -> bị chặn (còn 1 đơn)', state.hrOvertimes.length === 1);
// Manager duyệt được
state.currentUser = { username: 'ql', role: 'manager', fullname: 'Ban Quản Lý', editTabs: [], allowAdvanced: true };
hr.approveOvertime(ot.id);
check('OT: manager duyệt -> approved + ghi người duyệt', ot.status === 'approved' && ot.approvedBy === 'Ban Quản Lý');
// Manager xóa được
hr.deleteOvertime(ot.id);
check('OT: manager xóa -> hết đơn + tombstone', state.hrOvertimes.length === 0 && (state.deletedIds.hrOvertimes || {})[ot.id]);

// ─── E. ĐỒNG BỘ MÂY ─────────────────────────────────────────────
state.hrOvertimes = [{ id: 'ot-r', employeeId: 'empB', date: '2024-06-07', start: '17:30', end: '20:00', plannedMin: 150, reason: '', status: 'pending', createdAt: '' }];
const snap = cloud.collectCloudSnapshot();
check('OT: snapshot mây chứa hrOvertimes', Array.isArray(snap.hrOvertimes) && snap.hrOvertimes.length === 1);
check('OT: cloudCore có khóa hrOvertimes', cloud.cloudCore(snap).includes('"hrOvertimes"'));
cloud.applyFireSnapshot({ hrOvertimes: [{ id: 'ot-remote', employeeId: 'empA', date: '2024-06-08', start: '17:30', end: '19:00', plannedMin: 90, reason: '', status: 'pending', createdAt: '' }] });
check('OT: applyFireSnapshot nhận từ mây', state.hrOvertimes.some(o => o.id === 'ot-remote'));

console.log(`KẾT QUẢ: ${pass} pass, ${fail} fail`);
if (fail) process.exit(1);
