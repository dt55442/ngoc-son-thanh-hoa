// tests/hr-attendance.test.mjs — Kiểm thử mở rộng tab Nhân Sự:
// chấm công & phân vị theo ngày (hrAttendance), danh mục vị trí làm việc
// (hrPositions), kỹ năng nhân viên (hrEmployees.skills), thống kê đi làm
// theo tháng, gắn/xóa dữ liệu khi xóa NV & vị trí, đồng bộ mây.
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

// ─── KHUNG CHẠY TEST ──────────────────────────────────────────
let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; console.log('PASS ' + name); }
  else { fail++; console.log('FAIL ' + name); }
}
const ev = { preventDefault(){} };
function setVal(id, v) { const el = document.getElementById(id); el.value = v; return el; }
function modalShown(id) { return document.getElementById(id).classList._s.has('show'); }

const { state, STORAGE_KEY_HR_ATTENDANCE, STORAGE_KEY_HR_POSITIONS } = await import('../js/state.js');
const hr = await import('../js/hr.js');
const cloud = await import('../js/cloud.js');

// ─── DỮ LIỆU GIẢ ──────────────────────────────────────────────
// Lưu ý: đặt nhân viên/đơn nghỉ SAU mục A vì loadHrData() ghi đè từ localStorage
state.currentUser = { username: 'admin', role: 'admin', editTabs: [], allowAdvanced: true };
state.hrEmployees = [];
state.hrLeaves = [];
state.hrAttendance = [];
state.hrPositions = [];

// ─── A. LOAD / SAVE ───────────────────────────────────────────
hr.loadHrData();
check('HR-ATT: load khi chưa có dữ liệu -> mảng rỗng', Array.isArray(state.hrPositions) && Array.isArray(state.hrAttendance) && state.hrPositions.length === 0 && state.hrAttendance.length === 0);
storeBacking.set(STORAGE_KEY_HR_ATTENDANCE, JSON.stringify([{ id: 'att-x', date: '2024-06-05', employeeId: 'empA', status: 'work', positions: [] }]));
hr.loadHrData();
check('HR-ATT: load chấm công từ localStorage', state.hrAttendance.length === 1 && state.hrAttendance[0].status === 'work');
state.hrAttendance = [];

// Nhân viên giả (sau loadHrData để không bị ghi đè)
state.hrEmployees = [
  { id: 'empA', code: 'NV001', name: 'Nguyễn Văn A', department: 'Xưởng 1', status: 'active', skills: [], joinDate: '' },
  { id: 'empB', code: 'NV002', name: 'Trần Thị B',   department: 'Xưởng 2', status: 'active', skills: [] },
  { id: 'empC', code: 'NV003', name: 'Lê Văn C',     department: 'Lò Hơi',  status: 'quit',   skills: [] },
  { id: 'empD', code: 'NV004', name: 'Phạm Thị D',   department: 'Xưởng 1', status: 'active', skills: [], joinDate: '2024-06-20' }
];

// ─── B. VỊ TRÍ LÀM VIỆC (CRUD) ────────────────────────────────
hr.openPositionModal();
check('HR-ATT: mở modal vị trí thành công', modalShown('modal-position'));
check('HR-ATT: select bộ phận của modal có danh mục + mục rỗng', document.getElementById('position-department').innerHTML.includes('Xưởng 1') && document.getElementById('position-department').innerHTML.includes('value=""'));
setVal('position-name', 'Ép ván');
hr.handlePositionSubmit(ev);
check('HR-ATT: thêm vị trí "Ép ván" thành công', state.hrPositions.length === 1 && state.hrPositions[0].name === 'Ép ván' && String(state.hrPositions[0].id).startsWith('pos-'));
hr.handlePositionSubmit(ev); // trùng tên -> chặn
check('HR-ATT: chặn vị trí trùng tên', state.hrPositions.length === 1);
setVal('position-name', 'Bào tinh');
hr.handlePositionSubmit(ev);
const p1 = state.hrPositions[0].id, p2 = state.hrPositions[1].id;
check('HR-ATT: có 2 vị trí (Ép ván, Bào tinh)', state.hrPositions.length === 2 && !!p1 && !!p2);
hr.renderHrPositionsTable();
check('HR-ATT: bảng vị trí hiển thị tên + đếm NV kỹ năng', document.getElementById('hr-positions-body').innerHTML.includes('Ép ván') && document.getElementById('hr-positions-body').innerHTML.includes('0 NV'));

// ─── C. KỸ NĂNG NHÂN VIÊN ─────────────────────────────────────
state.hrEmployees[0].skills = [p1, p2]; // A biết cả 2 vị trí
hr.renderEmployeeSkillsBox([p1, p2]);
const skillsHTML = document.getElementById('employee-skills-box').innerHTML;
check('HR-ATT: ô kỹ năng render checkbox cho từng vị trí', skillsHTML.includes(`value="${p1}"`) && skillsHTML.includes(`value="${p2}"`));
check('HR-ATT: kỹ năng đã chọn được tick sẵn (checked)', skillsHTML.includes('checked'));
hr.renderHrPositionsTable();
check('HR-ATT: bảng vị trí đếm đúng 1 NV có kỹ năng "Ép ván"', document.getElementById('hr-positions-body').innerHTML.includes('1 NV'));

// ─── D. CHẤM CÔNG THEO NGÀY ───────────────────────────────────
hr.setAttendanceStatus('empA', '2024-06-05', 'work');
check('HR-ATT: chấm Đi làm tạo 1 bản ghi (status work)', state.hrAttendance.length === 1 && state.hrAttendance[0].status === 'work' && state.hrAttendance[0].date === '2024-06-05');
check('HR-ATT: attStatusOf trả "work"', hr.attStatusOf('empA', '2024-06-05') === 'work');
check('HR-ATT: id bản ghi ổn định att-<ngày>-<NV>', state.hrAttendance[0].id === 'att-2024-06-05-empA');
hr.setAttendanceNote('empA', '2024-06-05', 'OT ca chiều');
check('HR-ATT: ghi chú lưu vào bản ghi cùng ngày', hr.attRecordOf('empA', '2024-06-05').note === 'OT ca chiều');
hr.toggleAttendancePosition('empB', '2024-06-05', p1); // chưa chấm -> tự chấm Đi làm
const recB = hr.attRecordOf('empB', '2024-06-05');
check('HR-ATT: bấm chip vị trí khi chưa chấm -> tự chấm Đi làm + phân vị', !!recB && recB.status === 'work' && recB.positions.length === 1 && recB.positions[0] === p1);
hr.toggleAttendancePosition('empB', '2024-06-05', p1);
check('HR-ATT: bấm chip lần nữa -> bỏ phân vị (vẫn Đi làm)', recB.positions.length === 0 && recB.status === 'work');
hr.setAttendanceStatus('empA', '2024-06-05', ''); // bỏ chấm (có ghi chú -> confirm, stub true)
check('HR-ATT: bỏ chấm xóa bản ghi', hr.attRecordOf('empA', '2024-06-05') === null);
hr.setAttendanceStatus('empA', '2024-06-06', 'absent');
check('HR-ATT: ghi Vắng (không phép)', hr.attStatusOf('empA', '2024-06-06') === 'absent');

// ─── E. NGHỈ CÓ PHÉP SUY RA TỪ ĐƠN ĐÃ DUYỆT ───────────────────
state.hrLeaves.push({ id: 'leave-1', employeeId: 'empA', type: 'Việc gia đình', from: '2024-06-10', to: '2024-06-11', days: 2, reason: 'Việc nhà', status: 'approved', approvedBy: 'Nguyễn Văn Quản (Ban QL)', createdAt: '2024-06-01T00:00:00Z' });
state.hrLeaves.push({ id: 'leave-2', employeeId: 'empB', type: 'Nghỉ phép', from: '2024-06-12', to: '2024-06-12', days: 1, reason: '', status: 'pending', createdAt: '2024-06-01T00:00:00Z' });
check('HR-ATT: đơn ĐÃ DUYỆT phủ ngày -> trạng thái "leave"', hr.attStatusOf('empA', '2024-06-10') === 'leave' && hr.attStatusOf('empA', '2024-06-11') === 'leave');
check('HR-ATT: ngoài phạm vi đơn -> không phải leave', hr.attStatusOf('empA', '2024-06-12') === '');
check('HR-ATT: đơn CHỜ DUYỆT không đổi trạng thái chấm công', hr.attStatusOf('empB', '2024-06-12') === '' && !!hr.pendingLeaveOn('empB', '2024-06-12'));
check('HR-ATT: approvedLeaveOn trả đúng đơn', !!hr.approvedLeaveOn('empA', '2024-06-10') && hr.approvedLeaveOn('empA', '2024-06-10').id === 'leave-1');
hr.hrAttSetDate('2024-06-10');
hr.renderHrAttendanceCard();
const attHTML = document.getElementById('hr-att-body').innerHTML;
check('HR-ATT: bảng chấm công hiển thị "Nghỉ Có Phép ✓" + người duyệt', attHTML.includes('Nghỉ Có Phép ✓') && attHTML.includes('duyệt bởi'));
check('HR-ATT: ngày không có đơn -> cột đơn nghỉ để trống', attHTML.includes('Đơn chờ duyệt') === false || attHTML.indexOf('Đơn chờ duyệt') > attHTML.indexOf('hr-att-body') );
check('HR-ATT: chip vị trí bị khóa (disabled) khi nghỉ có phép', attHTML.includes(' disabled'));
hr.hrAttSetDate('2024-06-06');
hr.renderHrAttendanceCard();
check('HR-ATT: ngày vắng hiển thị option "absent" chọn sẵn', document.getElementById('hr-att-body').innerHTML.includes('value="absent" selected'));
hr.hrAttSetDate('2024-06-12');
hr.renderHrAttendanceCard();
check('HR-ATT: đơn chờ duyệt hiện chip riêng (đúng ngày phủ đơn)', document.getElementById('hr-att-body').innerHTML.includes('Đơn chờ duyệt'));

// ─── F. THỐNG KÊ ĐI LÀM THEO THÁNG (2024-06 — 30 ngày) ────────
state.hrAttendance = [];
hr.setAttendanceStatus('empA', '2024-06-05', 'work');   // 1 ngày công
hr.setAttendanceStatus('empA', '2024-06-06', 'absent'); // 1 ngày vắng
// nghỉ phép 06-10..06-11 đã duyệt từ mục E
const stats = hr.computeAttendanceStats('2024-06');
const stA = stats.find(s => s.emp.id === 'empA');
const stB = stats.find(s => s.emp.id === 'empB');
const stD = stats.find(s => s.emp.id === 'empD');
check('HR-ATT: thống kê NV A — 1 công, 2 nghỉ phép, 1 vắng, tỷ lệ 25%', !!stA && stA.work === 1 && stA.leave === 2 && stA.absent === 1 && stA.rate === 25);
check('HR-ATT: NV B chưa chấm ngày nào -> counted 0, rate null, vẫn liệt kê', !!stB && stB.counted === 0 && stB.rate === null && stB.unmarked === 30);
check('HR-ATT: NV đã nghỉ việc (C) không nằm trong thống kê', !stats.some(s => s.emp.id === 'empC'));
check('HR-ATT: NV vào làm ngày 20/06 chỉ tính từ ngày vào (11 ngày chưa chấm)', !!stD && stD.unmarked === 11 && stD.counted === 0);
hr.hrAttSetMonth('2024-06');
hr.renderHrAttendanceStats();
check('HR-ATT: chips thống kê có tỷ lệ đi làm tổng', document.getElementById('hr-att-stats-chips').innerHTML.includes('Tỷ lệ đi làm'));
check('HR-ATT: bảng thống kê có cột tỷ lệ 25% cho NV A', document.getElementById('hr-att-stats-body').innerHTML.includes('25%'));

// ─── G. XÓA NHÂN VIÊN / VỊ TRÍ DỌN DẸP ────────────────────────
hr.toggleAttendancePosition('empB', '2024-06-15', p2);
hr.deleteEmployee('empB');
check('HR-ATT: xóa NV cũng xóa chấm công của NV đó', !state.hrAttendance.some(a => a.employeeId === 'empB') && !state.hrEmployees.some(e => e.id === 'empB'));
hr.toggleAttendancePosition('empA', '2024-06-16', p1);
hr.deletePosition(p1);
check('HR-ATT: xóa vị trí gỡ khỏi kỹ năng NV', state.hrPositions.length === 1 && !(state.hrEmployees[0].skills || []).includes(p1));
check('HR-ATT: xóa vị trí gỡ khỏi phân vị đã lưu', (hr.attRecordOf('empA', '2024-06-16')?.positions || []).length === 0);

// ─── H. ĐỒNG BỘ MÂY ───────────────────────────────────────────
const snap = cloud.collectCloudSnapshot();
check('Cloud: snapshot chứa hrPositions & hrAttendance', Array.isArray(snap.hrPositions) && Array.isArray(snap.hrAttendance));
check('Cloud: cloudCore có khóa dữ liệu mới', cloud.cloudCore(snap).includes('"hrPositions"') && cloud.cloudCore(snap).includes('"hrAttendance"'));
const remoteRec = { id: 'att-2024-06-17-empA', date: '2024-06-17', employeeId: 'empA', status: 'work', positions: [], note: '', createdAt: '2024-06-17T00:00:00Z', updatedAt: '2024-06-17T00:00:00Z' };
cloud.applyFireSnapshot({ hrAttendance: [remoteRec] });
check('Cloud: áp snapshot mây (applyFireSnapshot) nhận bản ghi chấm công', (state.hrAttendance || []).some(a => a.id === 'att-2024-06-17-empA'));
check('Cloud: dữ liệu mây được lưu localStorage', JSON.parse(storeBacking.get(STORAGE_KEY_HR_ATTENDANCE) || '[]').some(a => a.id === 'att-2024-06-17-empA'));

// ─── J. NẠP GIỜ TỪ MÁY CHẤM CÔNG (EXCEL) + ĐỐI CHIẾU ──────────
// File kiểu (a): từng dòng 1 ngày có Giờ vào/ra riêng
const aoaInOut = [
  ['Mã NV', 'Họ tên', 'Ngày', 'Giờ vào', 'Giờ ra'],
  ['NV001', 'Nguyễn Văn A', '05/06/2024', '07:05', '17:30'],
  ['NV001', 'Nguyễn Văn A', '06/06/2024', '07:10', '17:00'],
  ['NV099', 'Người Lạ',    '06/06/2024', '08:00', '16:00'] // không khớp NV -> bỏ qua
];
const colA = hr.ciAutoMapCols(aoaInOut[0]);
check('CI: tự nhận cột (Mã NV, Ngày, Giờ vào, Giờ ra)', colA.code === 0 && colA.date === 2 && colA.timeIn === 3 && colA.timeOut === 4);
const resA = hr.importCheckinsFromSheet(aoaInOut, colA, 'may-cham-cong-a.xlsx');
check('CI: nạp kiểu (a) — 2 ngày khớp, 1 dòng lạ bỏ qua', resA.matched === 2 && resA.unmatched.length === 1 && resA.unmatched[0].key === 'NV099');
const ciA = hr.checkinRecordOf('empA', '2024-06-05');
check('CI: bản ghi giờ máy đúng (07:05–17:30)', !!ciA && ciA.in === '07:05' && ciA.out === '17:30' && ciA.punches === 1 && ciA.fileName === 'may-cham-cong-a.xlsx');

// File kiểu (b): từng lần quét (cột datetime) — gộp đầu = vào, cuối = ra
state.hrCheckins = [];
const aoaPunch = [
  ['Mã NV', 'Thời gian'],
  ['NV001', '05/06/2024 07:05'],
  ['NV001', '05/06/2024 11:30'],
  ['NV001', '05/06/2024 17:30'],
  ['NV004', '05/06/2024 07:00']
];
const colB = hr.ciAutoMapCols(aoaPunch[0]);
check('CI: tự nhận cột kiểu từng lần quét', colB.code === 0 && colB.date === 1 && colB.timeIn === -1);
const resB = hr.importCheckinsFromSheet(aoaPunch, colB, 'may-cham-cong-b.xlsx');
check('CI: nạp kiểu (b) — 4 lần quét gộp thành 2 ngày', resB.punches === 4 && resB.matched === 2);
const ciB = hr.checkinRecordOf('empA', '2024-06-05');
check('CI: gộp lần quét — đầu 07:05 = vào, cuối 17:30 = ra, 3 lần quét', !!ciB && ciB.in === '07:05' && ciB.out === '17:30' && ciB.punches === 3);
check('CI: 1 lần quét duy nhất -> chỉ có giờ vào', hr.checkinRecordOf('empD', '2024-06-05')?.in === '07:00' && !hr.checkinRecordOf('empD', '2024-06-05').out);

// Parse giờ linh hoạt
check('CI: parse giờ "7h05" / "0705" / Date object', hr.ciNormTime('7h05') === '07:05' && hr.ciNormTime('0705') === '07:05' && hr.ciNormTime(new Date(2024, 5, 5, 8, 5)) === '08:05');
const pdt = hr.ciNormDateTime('2024-06-05 07:30');
check('CI: parse datetime ISO "2024-06-05 07:30"', pdt.date === '2024-06-05' && pdt.time === '07:30');

// Đối chiếu & áp dụng
state.hrAttendance = [];
check('CI: đối chiếu — máy có giờ, chấm tay chưa chấm', hr.attStatusOf('empA', '2024-06-05') === '');
hr.applyCheckinRecord('empA', '2024-06-05');
check('CI: Áp Dụng 1 dòng -> chấm tay thành Đi làm', hr.attStatusOf('empA', '2024-06-05') === 'work');
hr.setAttendanceStatus('empD', '2024-06-05', 'absent'); // chấm tay Vắng nhưng máy có vân tay
hr.applyCheckinRecord('empD', '2024-06-05');
check('CI: Áp Dụng ghi Vắng sai -> đổi thành Đi làm theo máy', hr.attStatusOf('empD', '2024-06-05') === 'work');
hr.setAttendanceStatus('empA', '2024-06-06', '');
state.hrAttendance = state.hrAttendance.filter(a => !(a.employeeId === 'empA' && a.date === '2024-06-06'));
hr.importCheckinsFromSheet(aoaInOut, colA, 'may-cham-cong-a.xlsx'); // nạp lại để có ngày 06/06 trong dữ liệu máy
hr.applyAllCheckins(); // ngày 06/06 empA máy xác nhận mà chưa chấm
check('CI: Áp Dụng Tất Cả -> ngày thiếu được chấm Đi làm', hr.attStatusOf('empA', '2024-06-06') === 'work');
// Đơn nghỉ đã duyệt -> KHÔNG áp dụng theo máy
state.hrLeaves.push({ id: 'leave-ci', employeeId: 'empA', type: 'Nghỉ phép', from: '2024-06-10', to: '2024-06-10', days: 1, reason: '', status: 'approved', approvedBy: 'QL', createdAt: '2024-06-01T00:00:00Z' });
hr.importCheckinsFromSheet([['Mã NV', 'Ngày', 'Giờ vào', 'Giờ ra'], ['NV001', '10/06/2024', '07:00', '17:00']], hr.ciAutoMapCols(['Mã NV', 'Ngày', 'Giờ vào', 'Giờ ra']), 'c.xlsx');
hr.applyCheckinRecord('empA', '2024-06-10');
check('CI: ngày nghỉ CÓ PHÉP được bảo vệ — máy không đè lên đơn duyệt', hr.attStatusOf('empA', '2024-06-10') === 'leave');
hr.renderHrCheckinTable();
const ciHTML = document.getElementById('hr-ci-body').innerHTML;
check('CI: bảng đối chiếu hiển thị Khớp ✓ và Nghỉ có phép', ciHTML.includes('Khớp ✓') && ciHTML.includes('Nghỉ có phép'));
hr.deleteCheckinsAll();
check('CI: Xóa Hết chỉ dọn giờ máy, giữ nguyên chấm công tay', state.hrCheckins.length === 0 && hr.attStatusOf('empA', '2024-06-05') === 'work');

// Cloud sync
const snap2 = cloud.collectCloudSnapshot();
check('Cloud: snapshot chứa hrCheckins', Array.isArray(snap2.hrCheckins));
check('Cloud: cloudCore có khóa hrCheckins', cloud.cloudCore(snap2).includes('"hrCheckins"'));

// ─── K. FILE THẬT TỪ MÁY: 3 DÒNG ĐẦU TRANG + LƯỚI CỘT "LẦN 1..N" ──
// Mô phỏng đúng cấu trúc file "BÁO CÁO DỮ LIỆU CHẤM CÔNG" máy xuất:
// tiêu đề ở dòng 4; cột STT/Phòng ban/Mã NV/Họ Tên/Chức danh/Ngày/Lần 1..9;
// giờ HH:MM:SS; ngày dd-MM-yyyy; 1 dòng = 1 NV × 1 ngày.
state.hrCheckins = [];
const aoaReal = [
  ['Công ty TNHH Ngọc Sơn'],
  ['BÁO CÁO DỮ LIỆU CHẤM CÔNG'],
  ['Từ ngày 01-08-2026 Đến ngày 31-08-2026'],
  [],
  ['STT', 'Phòng ban', 'Mã NV', 'Họ Tên', 'Chức danh', 'Ngày', 'Lần 1', 'Lần 2', 'Lần 3', 'Lần 4', 'Lần 5', 'Lần 6', 'Lần 7', 'Lần 8', 'Lần 9'],
  ['1', 'Tổ 1', 'NV001', 'Hà Thị Mùi', 'Nhân viên', '01-08-2026', '06:40:26', '17:39:07'],
  ['2', 'Tổ 1', 'NV001', 'Hà Thị Mùi', 'Nhân viên', '02-08-2026', '06:48:44', '18:01:58'],
  ['3', 'Tổ 1', 'NV001', 'Hà Thị Mùi', 'Nhân viên', '03-08-2026', '06:52:03', '11:31:32', '19:32:33'],
  ['4', 'Tổ 1', 'NV004', 'Phạm Thị D', 'Nhân viên', '01-08-2026', '06:50:00']
];
const hdrIdx = hr.ciFindHeaderRow(aoaReal);
check('CI-MC: tìm đúng dòng tiêu đề (dòng 4, sau 3 dòng đầu trang)', hdrIdx === 4);
const colR = hr.ciAutoMapCols(aoaReal[hdrIdx]);
check('CI-MC: nhận Mã NV / Họ Tên / Ngày + 9 cột "Lần 1..9" (bỏ qua STT, Phòng ban, Chức danh)', colR.code === 2 && colR.name === 3 && colR.date === 5 && colR.punchCols.length === 9 && colR.punchCols[0] === 6);
const resR = hr.importCheckinsFromSheet(aoaReal.slice(hdrIdx), colR, 'bao-cao-cham-cong-08-2026.xlsx');
check('CI-MC: nạp 4 ngày (3 NV001 + 1 NV004), 8 lần quét', resR.matched === 4 && resR.punches === 8 && resR.unmatched.length === 0);
const ciR1 = hr.checkinRecordOf('empA', '2026-08-01');
check('CI-MC: 01-08-2026 — vào 06:40, ra 17:39 (cắt từ HH:MM:SS)', !!ciR1 && ciR1.in === '06:40' && ciR1.out === '17:39' && ciR1.punches === 2);
const ciR3 = hr.checkinRecordOf('empA', '2026-08-03');
check('CI-MC: 03-08-2026 3 lần quét (trưa về) — vào 06:52, ra 19:32, đếm 3', !!ciR3 && ciR3.in === '06:52' && ciR3.out === '19:32' && ciR3.punches === 3);
check('CI-MC: 1 lần quét duy nhất (NV004) -> chỉ có giờ vào 06:50', hr.checkinRecordOf('empD', '2026-08-01')?.in === '06:50' && !hr.checkinRecordOf('empD', '2026-08-01').out);
hr.renderHrCheckinTable();
check('CI-MC: bảng đối chiếu hiển thị giờ máy dạng 06:40–17:39', document.getElementById('hr-ci-body').innerHTML.includes('06:40–17:39'));
hr.applyAllCheckins();
check('CI-MC: Áp Dụng Tất Cả theo file máy -> 4 ngày thành Đi làm', hr.attStatusOf('empA', '2026-08-01') === 'work' && hr.attStatusOf('empA', '2026-08-03') === 'work' && hr.attStatusOf('empD', '2026-08-01') === 'work');

// ─── L. BẢNG CHẤM CÔNG: NHÓM BỘ PHẬN + TÌM NHANH + VỊ TRÍ THEO BỘ PHẬN ──
state.hrCheckins = [];
state.hrAttendance = [];
state.hrLeaves = [];
state.hrEmployees = [
  { id: 'empA', code: 'NV001', name: 'Nguyễn Văn A', department: 'Xưởng 1',   status: 'active', skills: [], joinDate: '' },
  { id: 'empD', code: 'NV004', name: 'Phạm Thị D',   department: 'Xưởng 1',   status: 'active', skills: [], joinDate: '' },
  { id: 'empE', code: 'NV005', name: 'Võ Văn E',     department: 'Cơ Điện',   status: 'active', skills: [] },
  { id: 'empF', code: 'NV006', name: 'Bùi Thị F',    department: 'Văn Phòng', status: 'active', skills: [] }
];
state.hrPositions = [
  { id: 'px1',    name: 'Ép ván',       department: 'Xưởng 1' },
  { id: 'pvp',    name: 'Kế toán',      department: 'Văn Phòng' },
  { id: 'pchung', name: 'Hỗ trợ chung', department: '' }
];
document.getElementById('hr-att-search').value = '';
hr.hrAttSetDate('2024-06-05');
hr.renderHrAttendanceCard();
const orderHTML = document.getElementById('hr-att-body').innerHTML;
const iF = orderHTML.indexOf('Bùi Thị F'), iE = orderHTML.indexOf('Võ Văn E'),
      iA = orderHTML.indexOf('Nguyễn Văn A'), iD = orderHTML.indexOf('Phạm Thị D');
check('ATT: sắp xếp nhóm bộ phận Văn Phòng -> Cơ Điện -> Xưởng 1 (trong nhóm theo tên A trước D)', iF !== -1 && iE !== -1 && iA !== -1 && iD !== -1 && iF < iE && iE < iA && iA < iD);
// Tìm nhanh theo tên
document.getElementById('hr-att-search').value = 'Bùi';
hr.renderHrAttendanceCard();
check('ATT: tìm nhanh "Bùi" -> còn đúng 1 dòng', (document.getElementById('hr-att-body').innerHTML.match(/<tr/g) || []).length === 1);
// Tìm nhanh theo mã NV
document.getElementById('hr-att-search').value = 'NV004';
hr.renderHrAttendanceCard();
const rowD = document.getElementById('hr-att-body').innerHTML;
check('ATT: tìm theo mã "NV004" -> đúng Phạm Thị D', rowD.includes('Phạm Thị D') && (rowD.match(/<tr/g) || []).length === 1);
// Vị trí hiển thị theo bộ phận nhân viên
document.getElementById('hr-att-search').value = 'Bùi Thị F';
hr.renderHrAttendanceCard();
const rowF = document.getElementById('hr-att-body').innerHTML;
check('ATT: NV Văn Phòng chỉ thấy "Kế toán" + "Hỗ trợ chung", KHÔNG thấy "Ép ván" (Xưởng 1)', rowF.includes('Kế toán') && rowF.includes('Hỗ trợ chung') && !rowF.includes('Ép ván'));
document.getElementById('hr-att-search').value = 'Nguyễn Văn A';
hr.renderHrAttendanceCard();
const rowA = document.getElementById('hr-att-body').innerHTML;
check('ATT: NV Xưởng 1 thấy "Ép ván" + "Hỗ trợ chung", KHÔNG thấy "Kế toán"', rowA.includes('Ép ván') && rowA.includes('Hỗ trợ chung') && !rowA.includes('Kế toán'));
// Kỹ năng chéo bộ phận vẫn hiển thị để phân khi cần
state.hrEmployees[0].skills = ['pvp']; // A (Xưởng 1) biết cả "Kế toán" (Văn Phòng)
hr.renderHrAttendanceCard();
const rowA2 = document.getElementById('hr-att-body').innerHTML;
check('ATT: kỹ năng chéo bộ phận (★) vẫn hiển thị trong chips', rowA2.includes('Kế toán'));
state.hrEmployees[0].skills = [];
// Ô kỹ năng trong modal nhân viên: lọc theo bộ phận đang chọn (stub bộ phận rỗng -> chỉ vị trí chung + đã chọn)
hr.renderEmployeeSkillsBox(['px1']);
const skHTML = document.getElementById('employee-skills-box').innerHTML;
check('ATT: ô kỹ năng lọc theo bộ phận — hiện vị trí chung + đã chọn, ẩn vị trí bộ phận khác', skHTML.includes('Hỗ trợ chung') && skHTML.includes('Ép ván') && !skHTML.includes('Kế toán'));

// ─── M. "NV CÓ KỸ NĂNG": CƠ CHẾ TÍNH + ĐỒNG BỘ TỪ LỊCH SỬ PHÂN VỊ ──
// Cột "NV Có Kỹ Năng" đếm NV có kỹ năng ĐƯỢC TICK trong hồ sơ (hrEmployees.skills),
// KHÔNG tự tổng hợp từ chip phân vị theo ngày (tránh kỹ năng "ảo" từ phân ca tạm thời).
state.hrEmployees = [
  { id: 'empA', code: 'NV001', name: 'Nguyễn Văn A', department: 'Xưởng 1', status: 'active', skills: [], joinDate: '' },
  { id: 'empD', code: 'NV004', name: 'Phạm Thị D',   department: 'Xưởng 1', status: 'active', skills: [], joinDate: '' }
];
state.hrPositions = [{ id: 'px1', name: 'Ép ván', department: 'Xưởng 1' }];
state.hrAttendance = [];
hr.toggleAttendancePosition('empA', '2024-06-05', 'px1'); // phân vị theo ngày (chip)
hr.toggleAttendancePosition('empD', '2024-06-05', 'px1');
hr.renderHrPositionsTable();
const posCell0 = document.getElementById('hr-positions-body').innerHTML;
check('SKILL: chưa tick kỹ năng -> vẫn "0 NV" dù đã phân vị theo ngày (đúng cơ chế)', posCell0.includes('0 NV'));
check('SKILL: có gợi ý "từng phân: 2 NV" + hướng dẫn đồng bộ', posCell0.includes('từng phân: 2 NV') && posCell0.includes('Đồng Bộ Kỹ Năng'));
hr.syncSkillsFromAssignments(); // confirm stub = true
check('SKILL: Đồng Bộ Kỹ Năng -> cộng kỹ năng vào hồ sơ từ lịch sử phân vị', (hr.hrEmpSkillsForTest ? [] : state.hrEmployees[0].skills).includes('px1') && state.hrEmployees[1].skills.includes('px1'));
hr.renderHrPositionsTable();
check('SKILL: sau đồng bộ đếm "2 NV" + hiện tên', document.getElementById('hr-positions-body').innerHTML.includes('2 NV') && document.getElementById('hr-positions-body').innerHTML.includes('Nguyễn Văn A'));
const skillsBefore = JSON.stringify(state.hrEmployees.map(e => e.skills));
hr.syncSkillsFromAssignments(); // gọi lại -> không thêm trùng
check('SKILL: đồng bộ lần nữa không nhân đôi kỹ năng', JSON.stringify(state.hrEmployees.map(e => e.skills)) === skillsBefore);
// Xóa NV -> vị trí đếm lại
hr.deleteEmployee('empD');
hr.renderHrPositionsTable();
check('SKILL: xóa NV -> đếm còn "1 NV"', document.getElementById('hr-positions-body').innerHTML.includes('1 NV'));

// ─── N. BỘ LỌC DANH SÁCH NHÂN VIÊN (sửa bug reset + cuộn 10 dòng) ──
state.hrEmployees = [
  { id: 'empA', code: 'NV001', name: 'Nguyễn Văn A', department: 'Xưởng 1',   status: 'active', skills: [] },
  { id: 'empD', code: 'NV004', name: 'Phạm Thị D',   department: 'Xưởng 1',   status: 'active', skills: [] },
  { id: 'empE', code: 'NV005', name: 'Võ Văn E',     department: 'Cơ Điện',   status: 'active', skills: [] },
  { id: 'empF', code: 'NV006', name: 'Bùi Thị F',    department: 'Văn Phòng', status: 'active', skills: [] },
  { id: 'empG', code: 'NV007', name: 'Trần Văn G',   department: 'Xưởng 2',   status: 'pause',  skills: [] }
];
// Lọc bộ phận: chỉ Xưởng 1 (A, D)
document.getElementById('hr-emp-filter-dept').value = 'Xưởng 1';
document.getElementById('hr-emp-filter-status').value = 'all';
document.getElementById('hr-emp-search').value = '';
hr.renderHrEmployeesTable();
check('FILTER: lọc Bộ phận "Xưởng 1" -> đúng 2 dòng (A, D)', (document.getElementById('hr-employees-body').innerHTML.match(/<tr/g) || []).length === 2 && document.getElementById('hr-employees-count').textContent === '2 / 5 nhân viên');
// Lọc trạng thái: Tạm nghỉ (G)
document.getElementById('hr-emp-filter-dept').value = 'all';
document.getElementById('hr-emp-filter-status').value = 'pause';
hr.renderHrEmployeesTable();
check('FILTER: lọc Trạng thái "Tạm nghỉ" -> đúng Trần Văn G', (document.getElementById('hr-employees-body').innerHTML.match(/<tr/g) || []).length === 1 && document.getElementById('hr-employees-body').innerHTML.includes('Trần Văn G'));
// Tìm kiếm
document.getElementById('hr-emp-filter-status').value = 'all';
document.getElementById('hr-emp-search').value = 'Võ';
hr.renderHrEmployeesTable();
check('FILTER: tìm "Võ" -> đúng 1 dòng Võ Văn E', (document.getElementById('hr-employees-body').innerHTML.match(/<tr/g) || []).length === 1 && document.getElementById('hr-employees-body').innerHTML.includes('Võ Văn E'));
// REGRESSION: renderHrView (populateHrSelects) KHÔNG được reset bộ lọc Bộ phận đang chọn
document.getElementById('hr-emp-search').value = '';
document.getElementById('hr-emp-filter-dept').value = 'Xưởng 1';
hr.renderHrView();
check('FILTER: renderHrView giữ nguyên lựa chọn "Xưởng 1" (không snap về Tất Cả)', document.getElementById('hr-emp-filter-dept').value === 'Xưởng 1' && (document.getElementById('hr-employees-body').innerHTML.match(/<tr/g) || []).length === 2);
// Dọn bộ lọc cho test render cuối
document.getElementById('hr-emp-filter-dept').value = 'all';

// ─── O. LIÊN KẾT NHÂN SỰ ↔ CÔNG NHÂN ÉP (tab Sản lượng ép ván) ────
state.hrEmployees = [
  { id: 'empA', code: 'NV001', name: 'Nguyễn Văn A', department: 'Xưởng 2', status: 'active', skills: [] },
  { id: 'empD', code: 'NV004', name: 'Phạm Thị D',   department: 'Xưởng 2', status: 'active', skills: [] },
  { id: 'empE', code: 'NV005', name: 'Võ Văn E',     department: 'Xưởng 2', status: 'active', skills: [] }
];
state.hrPositions = [{ id: 'px1', name: 'Ép ván', department: 'Xưởng 2' }, { id: 'pchung', name: 'Hỗ trợ chung', department: '' }];
state.hrAttendance = [];
// Ngày 05/06: A và D được phân "Ép ván", E phân vị khác
hr.toggleAttendancePosition('empA', '2024-06-05', 'px1');
hr.toggleAttendancePosition('empD', '2024-06-05', 'px1');
hr.toggleAttendancePosition('empE', '2024-06-05', 'pchung');
check('PRES-W: hrWorkersForPress chỉ lấy người được phân vị Ép (A, D)', hr.hrWorkersForPress('2024-06-05').map(w => w.id).join(',') === 'empA,empD');
check('PRES-W: hrEmpByName khớp tên bỏ dấu/hoa-thường ("nguyễn văn  a")', !!hr.hrEmpByName('nguyễn văn  a') && hr.hrEmpByName('nguyễn văn  a').id === 'empA');
check('PRES-W: tên không có trong Nhân Sự -> null', hr.hrEmpByName('Người Lạ') === null);
// Modal chi tiết công nhân ép: 1 khớp hồ sơ + 1 chưa có hồ sơ
const press = await import('../js/press.js');
state.pressRecords = [{ id: 'pr1', date: '2024-06-05', worker: 'Nguyễn Văn A, Người Lạ', sticks: [], vanTho: [] }];
press.openPressWorkersModal('pr1');
check('PRES-W: mở modal chi tiết công nhân ép', document.getElementById('modal-press-workers').classList._s.has('show'));
const pwHTML = document.getElementById('press-workers-body').innerHTML;
check('PRES-W: dòng khớp hồ sơ hiện Mã NV + "Đi làm ✓" + phân vị Ép', pwHTML.includes('NV001') && pwHTML.includes('Đi làm ✓') && pwHTML.includes('Ép ván'));
check('PRES-W: tên ngoài Nhân Sự cảnh báo "Chưa có hồ sơ"', pwHTML.includes('Người Lạ') && pwHTML.includes('Chưa có hồ sơ'));
check('PRES-W: chips tổng hợp đếm đúng (1 khớp, 1 phân vị Ép)', document.getElementById('press-workers-summary').innerHTML.includes('Khớp hồ sơ Nhân Sự: <strong>1</strong>') && document.getElementById('press-workers-summary').innerHTML.includes('Được phân vị Ép: <strong>1</strong>'));
press.closePressWorkersModal();
check('PRES-W: đóng modal', !document.getElementById('modal-press-workers').classList._s.has('show'));
// Nhân viên nghỉ có phép vẫn có tên trong lượt ép -> cảnh báo
state.hrLeaves.push({ id: 'lv', employeeId: 'empA', type: 'Ốm', from: '2024-06-06', to: '2024-06-06', days: 1, reason: '', status: 'approved', createdAt: '2024-06-01T00:00:00Z' });
state.pressRecords = [{ id: 'pr2', date: '2024-06-06', worker: 'Nguyễn Văn A', sticks: [], vanTho: [] }];
press.openPressWorkersModal('pr2');
check('PRES-W: ngày có đơn nghỉ duyệt -> chip "Nghỉ có phép" cảnh báo', document.getElementById('press-workers-body').innerHTML.includes('Nghỉ có phép'));

// ─── I. RENDER TOÀN TAB KHÔNG LỖI ─────────────────────────────
let renderOk = true;
try { hr.renderHrView(); } catch (e) { renderOk = false; console.log('renderHrView error:', e && e.message); }
check('HR-ATT: renderHrView (cả 7 bảng) chạy không lỗi', renderOk);

console.log('───────────────────────────');
console.log(`HR-ATTENDANCE: ${pass} PASS, ${fail} FAIL`);
process.exitCode = fail ? 1 : 0;