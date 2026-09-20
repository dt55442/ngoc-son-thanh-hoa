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
const { state, STORAGE_KEY_HR_SHIFTS, STORAGE_KEY_HR_ASSIGN } = await import('../js/state.js');
const hr = await import('../js/hr.js');
const cloud = await import('../js/cloud.js');

state.currentUser = { username: 'admin', role: 'admin', editTabs: [], allowAdvanced: true };
state.hrEmployees = [
  { id: 'empA', code: 'NV001', name: 'Nguyễn Văn A', department: 'Xưởng 2', status: 'active', skills: ['px2'] },
  { id: 'empB', code: 'NV002', name: 'Hà Văn Chiến', department: 'Xưởng 2', status: 'active', skills: [] },
  { id: 'empC', code: 'NV003', name: 'Trần Thị C',   department: 'QC',      status: 'active', skills: [] }
];
state.hrPositions = [
  { id: 'px2',  name: 'Ép ván X2', department: 'Xưởng 2', note: '' },
  { id: 'pkh2', name: 'Kho X2',    department: 'Xưởng 2', note: '' }
];
state.hrPositionNeeds = [
  { id: 'posneed-pos-px2',  department: 'Xưởng 2', position: 'Ép ván X2', positionId: 'px2',  needQty: 3, haveQty: 1 },
  { id: 'posneed-pos-pkh2', department: 'Xưởng 2', position: 'Kho X2',    positionId: 'pkh2', needQty: 2, haveQty: 0 }
];
state.hrShifts = [];
state.hrAssignments = [];
state.hrAttendance = [];

// ─── A. HELPERS ────────────────────────────────────────────────
check('BOARD: hrShortName "Hà Văn Chiến" -> "H.V.Chiến"', hr.hrShortName('Hà Văn Chiến') === 'H.V.Chiến');
check('BOARD: fmtHour "07:00" -> "7h00"', hr.fmtHour('07:00') === '7h00');
check('BOARD: ca mặc định Hành chính 07:00–17:30', (() => {
  const cfg = hr.hrShiftCfg('Xưởng 2');
  return cfg.type === 'hanhchinh' && cfg.shifts[0].start === '07:00' && cfg.shifts[cfg.shifts.length - 1].end === '17:30';
})());
check('BOARD: preset Làm ca = 2 ca (ngày/đêm)', hr.BOARD_SHIFT_PRESETS.lamca.shifts.length === 2);

// ─── B. RENDER BOARD (mặc định Xưởng 2) ────────────────────────
// CỐ ĐỊNH ngày làm việc thường (thứ Ba 15/09) — tránh test flaky theo ngày hệ
// thống: nếu chạy vào Chủ nhật/lễ, quy tắc "ngày nghỉ đi làm → toàn TC" làm
// badge HC/TC lệch so với kỳ vọng (đã gặp khi chạy vào CN 20/09/2026).
state.hrBoardDate = '2026-09-15';
hr.renderHrView();
check('BOARD: mặc định mở Xưởng 2', state.hrBoardDept === 'Xưởng 2');
check('BOARD: tab bộ phận render đủ 6 bộ phận', (document.getElementById('hr-board-dept-tabs').innerHTML.match(/data-board-dept/g) || []).length === 6);
const boardHTML = document.getElementById('hr-board').innerHTML;
check('BOARD: lưới thẻ — 2 cột vị trí (board-col)', (boardHTML.match(/board-col-head/g) || []).length === 2);
check('BOARD: 5 ô trống "?" (cần 3 + 2, chưa gán ai)', (boardHTML.match(/slot empty/g) || []).length === 5);
check('BOARD: chip tổng hợp "Đã bố trí 0/5"', document.getElementById('hr-board-count').innerHTML.includes('Đã bố trí') && document.getElementById('hr-board-count').innerHTML.includes('0</strong>/5'));
check('BOARD: nhãn cột "Hành chính" + giờ 7h00–17h30', boardHTML.includes('Hành chính') && boardHTML.includes('7h00') && boardHTML.includes('17h30'));
check('BOARD: chấm tròn trạng thái chưa đủ (warn)', boardHTML.includes('board-col-dot warn'));
check('BOARD: badge "cần" trên đầu cột', boardHTML.includes('cần 3') && boardHTML.includes('cần 2'));

// ─── C. GÁN NGƯỜI VÀO Ô (3 bước) ───────────────────────────────
// Mô phỏng modal đã điền: chọn NV B (chưa có kỹ năng Ép ván), bắt đầu 7h30, kết thúc trống (= hết ca)
document.getElementById('board-assign-mode').value = '';
document.getElementById('board-assign-movefrom').value = '';
document.getElementById('board-assign-date').value = state.hrBoardDate;
document.getElementById('board-assign-pos').value = 'px2';
document.getElementById('board-assign-shiftidx').value = '0';
document.getElementById('board-assign-employee-id').value = 'empB';
document.getElementById('board-assign-start').value = '07:30';
document.getElementById('board-assign-end').value = '';
const ev = { preventDefault(){} };
hr.handleBoardAssignSubmit(ev);
check('BOARD: gán người -> hrAssignments có 1 bản ghi', (state.hrAssignments || []).length === 1);
const asg = state.hrAssignments[0];
check('BOARD: bản ghi đúng vị trí + ca + giờ bắt đầu 07:30', asg.positionId === 'px2' && asg.start === '07:30' && asg.end === '' && (asg.shiftIdx || 0) === 0);
check('BOARD: gán người -> tự chấm Đi làm ngày đó', (state.hrAttendance || []).some(a => a.employeeId === 'empB' && a.date === asg.date && a.status === 'work'));
check('BOARD: người gán tự học kỹ năng vị trí', (state.hrEmployees.find(e => e.id === 'empB').skills || []).includes('px2'));
check('BOARD: board render ô XANH avatar + tên rút gọn + giờ', document.getElementById('hr-board').innerHTML.includes('H.V.Chiến') && document.getElementById('hr-board').innerHTML.includes('7h30') && document.getElementById('hr-board').innerHTML.includes('>HC<'));
check('BOARD: nút "+" Thêm người cho từng cột vị trí (2 cột -> 2 nút)', (document.getElementById('hr-board').innerHTML.match(/slot add/g) || []).length === 2);
check('BOARD: đã bỏ thẻ mini — board luôn hiển thị trực tiếp', typeof hr.HR_CARD_DEFS['hr-board-card'] === 'undefined' && document.getElementById('hr-board-card') !== null);

// ─── D. 1 NGƯỜI NHIỀU VỊ TRÍ TRONG NGÀY ────────────────────────
document.getElementById('board-assign-pos').value = 'pkh2';
document.getElementById('board-assign-employee-id').value = 'empB';
document.getElementById('board-assign-start').value = '09:00';
document.getElementById('board-assign-end').value = '11:30';
hr.handleBoardAssignSubmit(ev);
check('BOARD: empB làm 2 vị trí trong ngày (2 bản ghi)', (state.hrAssignments || []).filter(a => a.employeeId === 'empB').length === 2);
const times = hr.hrAssignTimesOf('empB', state.hrBoardDate);
check('BOARD: hrAssignTimesOf trả giờ làm sắp theo bắt đầu', times.length === 2 && times[0].start === '07:30' && times[1].start === '09:00');

// ─── E. CÀI ĐẶT CA: LÀM CA -> 2 CỘT ────────────────────────────
state.hrShifts = [{ id: 'Xưởng 2', type: 'lamca', shifts: [{ name: 'Ca ngày', start: '07:00', end: '19:00' }, { name: 'Ca đêm', start: '19:00', end: '07:00' }] }];
hr.renderHrBoard();
check('BOARD: Làm ca -> 2 cột (Ca ngày / Ca đêm)', document.getElementById('hr-board').innerHTML.includes('Ca ngày') && document.getElementById('hr-board').innerHTML.includes('Ca đêm'));
check('BOARD: bản ghi gán trước (cột 0) vẫn hiển thị sau đổi ca', document.getElementById('hr-board').innerHTML.includes('H.V.Chiến'));
state.hrShifts = [];

// ─── E2. KÉO SANG VỊ TRÍ KHÁC: GIỮ LỊCH SỬ TẠI VỊ TRÍ CŨ ───────
// Mô phỏng dời bản ghi đầu (px2 07:30) sang pkh2 bắt đầu 12:00
document.getElementById('board-assign-mode').value = '';
document.getElementById('board-assign-movefrom').value = asg.id;
document.getElementById('board-assign-pos').value = 'pkh2';
document.getElementById('board-assign-shiftidx').value = '0';
document.getElementById('board-assign-employee-id').value = 'empB';
document.getElementById('board-assign-start').value = '12:00';
document.getElementById('board-assign-end').value = '';
hr.handleBoardAssignSubmit(ev);
const oldHist = state.hrAssignments.find(a => a.id === asg.id);
check('BOARD: kéo đi -> bản ghi cũ VẪN còn tại vị trí cũ (lịch sử)', !!oldHist && oldHist.positionId === 'px2');
check('BOARD: giờ cũ tự chấm dứt lúc giờ mới (07:30–12:00)', oldHist.end === '12:00');
check('BOARD: bản ghi mới tại vị trí kéo đến (12:00 -> hết ca)', (state.hrAssignments || []).some(a => a.positionId === 'pkh2' && a.employeeId === 'empB' && a.start === '12:00' && a.end === ''));
// Giờ mới <= giờ cũ -> bản ghi cũ GIỮ NGUYÊN (không bao giờ xóa lịch sử)
state.hrPositions.push({ id: 'pkh3', name: 'Kho TP X2', department: 'Xưởng 2', note: '' });
const moved = state.hrAssignments.find(a => a.positionId === 'pkh2' && a.start === '12:00');
document.getElementById('board-assign-movefrom').value = moved.id;
document.getElementById('board-assign-pos').value = 'pkh3';
document.getElementById('board-assign-start').value = '07:00';
document.getElementById('board-assign-end').value = '';
hr.handleBoardAssignSubmit(ev);
check('BOARD: giờ mới <= giờ cũ -> bản ghi cũ GIỮ NGUYÊN (không xóa)', (state.hrAssignments || []).some(a => a.id === moved.id && a.positionId === 'pkh2' && a.end === ''));
check('BOARD: bản ghi mới tại vị trí mới (07:00 -> hết ca)', (state.hrAssignments || []).some(a => a.positionId === 'pkh3' && a.employeeId === 'empB' && a.start === '07:00' && a.end === ''));

// ─── E2b. LUỒNG KÉO THẺ THẬT (qua hrBoardOpenAssign mode=move) ──
// Kéo chip pkh3 07h00 sang px2, điền giờ mới 12h00:
//   bản ghi cũ pkh3 GIỮ + chấm dứt 07:00–12:00; bản ghi MỚI px2 12:00→hết ca
const asg4 = state.hrAssignments.find(a => a.positionId === 'pkh3' && a.start === '07:00');
hr.hrBoardOpenAssign('px2', 0, `move:${asg4.id}`);
check('BOARD: luồng kéo thật -> modal ở chế độ TẠO MỚI (mode rỗng) + movefrom đúng', document.getElementById('board-assign-mode').value === '' && document.getElementById('board-assign-movefrom').value === asg4.id);
document.getElementById('board-assign-date').value = state.hrBoardDate;
document.getElementById('board-assign-start').value = '12:00';
document.getElementById('board-assign-end').value = '';
hr.handleBoardAssignSubmit(ev);
check('BOARD: kéo (luồng thật) -> bản ghi cũ pkh3 GIỮ, chấm dứt 07:00–12:00', (state.hrAssignments || []).some(a => a.id === asg4.id && a.positionId === 'pkh3' && a.start === '07:00' && a.end === '12:00'));
check('BOARD: kéo (luồng thật) -> bản ghi MỚI px2 12:00→hết ca (không ghi đè cũ)', (state.hrAssignments || []).some(a => a.positionId === 'px2' && a.employeeId === 'empB' && a.start === '12:00' && a.end === ''));

// ─── E3. CHẶN TRÙNG + CHO PHÉP NHIỀU KHUNG GIỜ ─────────────────
const cntBefore = state.hrAssignments.length;
document.getElementById('board-assign-mode').value = '';
document.getElementById('board-assign-movefrom').value = '';
document.getElementById('board-assign-pos').value = 'pkh2';
document.getElementById('board-assign-shiftidx').value = '0';
document.getElementById('board-assign-employee-id').value = 'empB';
document.getElementById('board-assign-start').value = '10:00';
document.getElementById('board-assign-end').value = '11:00';
hr.handleBoardAssignSubmit(ev);
check('BOARD: chặn trùng — cùng vị trí, khung giờ giao nhau (10h–11h giao 9h–11h30)', state.hrAssignments.length === cntBefore);
// Khung giờ KHÔNG giao nhau (07h00–09h00) -> cho phép (người làm nhiều khung giờ)
document.getElementById('board-assign-start').value = '07:00';
document.getElementById('board-assign-end').value = '09:00';
hr.handleBoardAssignSubmit(ev);
check('BOARD: cùng vị trí, khung giờ KHÁC -> vẫn thêm được', state.hrAssignments.length === cntBefore + 1);
// Gợi ý: người đã bố trí được ĐÁNH DẤU (không ẩn) kèm tóm tắt giờ đã làm
hr.hrBoardOpenAssign('px2', 0, '');
hr.renderBoardAssignSuggestions('');
const sugHTML = document.getElementById('board-assign-suggest').innerHTML;
check('BOARD: gợi ý đánh dấu "Đã bố trí" cho người đã có giờ (vẫn chọn được)', sugHTML.includes('Đã bố trí') && sugHTML.includes('data-emp-id="empB"'));
hr.closeBoardAssignModal();

// ─── F. XÓA GÁN + ĐỒNG BỘ MÂY ──────────────────────────────────
hr.hrBoardRemoveAssign(state.hrAssignments[0].id);
check('BOARD: bỏ người khỏi vị trí -> còn 5 bản ghi + tombstone', (state.hrAssignments || []).length === 5 && (state.deletedIds.hrAssignments || {})[asg.id]);
const snap = cloud.collectCloudSnapshot();
check('BOARD: snapshot mây chứa hrAssignments + hrShifts', Array.isArray(snap.hrAssignments) && Array.isArray(snap.hrShifts));
check('BOARD: cloudCore có 2 khóa mới', cloud.cloudCore(snap).includes('"hrAssignments"') && cloud.cloudCore(snap).includes('"hrShifts"'));
const savedAssignments = state.hrAssignments;
cloud.applyFireSnapshot({ hrAssignments: [{ id: 'asg-remote', date: state.hrBoardDate, department: 'Xưởng 2', positionId: 'px2', shiftIdx: 1, employeeId: 'empC', start: '19:00', end: '' }] });
check('BOARD: applyFireSnapshot nhận gán từ mây', (state.hrAssignments || []).some(a => a.id === 'asg-remote'));
check('BOARD: dữ liệu mây lưu localStorage', JSON.parse(storeBacking.get(STORAGE_KEY_HR_ASSIGN) || '[]').some(a => a.id === 'asg-remote'));
// applyFireSnapshot THAY THẾ toàn bộ collection theo mây — khôi phục dữ liệu
// địa phương để các test sau (HC/TC, chấm công) tiếp tục với bản ghi đã tạo
state.hrAssignments = savedAssignments;

// ─── G. TÁCH GIỜ HC (hành chính) / TC (tăng ca) + hiển thị chấm công ──
// Quy tắc: HC = trong giờ ca chuẩn (07:00–17:30), nghỉ trưa 11:30–13:00
// KHÔNG tính vào HC lẫn TC; TC = chỉ phần ngoài giờ ca (trước 7h00 / sau 17h30)
check('HC/TC: làm đủ ngày 07:00–17h30 -> HC 9h, TC 0', (() => {
  const r = hr.hrSplitHoursHC('Xưởng 2', '07:00', '17:30', 0);
  return r.hc === 540 && r.tc === 0;
})());
check('HC/TC: 07:00–18:00 -> HC 9h, TC 0h30 (ví dụ của khách)', (() => {
  const r = hr.hrSplitHoursHC('Xưởng 2', '07:00', '18:00', 0);
  return r.hc === 540 && r.tc === 30;
})());
check('HC/TC: 07:00–19:00 -> HC 9h, TC 1h30', (() => {
  const r = hr.hrSplitHoursHC('Xưởng 2', '07:00', '19:00', 0);
  return r.hc === 540 && r.tc === 90;
})());
check('HC/TC: 06:30–18:00 -> HC 9h, TC 1h (sớm 30p + muộn 30p)', (() => {
  const r = hr.hrSplitHoursHC('Xưởng 2', '06:30', '18:00', 0);
  return r.hc === 540 && r.tc === 60;
})());
check('HC/TC: trong ca (08:00–11:00) -> HC 3h, TC 0', (() => {
  const r = hr.hrSplitHoursHC('Xưởng 2', '08:00', '11:00', 0);
  return r.hc === 180 && r.tc === 0;
})());
check('HC/TC: vắng mặt cả ngày (12:00–12:30 đúng nghỉ trưa) -> HC 0, TC 0', (() => {
  const r = hr.hrSplitHoursHC('Xưởng 2', '12:00', '12:30', 0);
  return r.hc === 0 && r.tc === 0;
})());
state.hrShifts = [{ id: 'Xưởng 2', type: 'lamca', shifts: [{ name: 'Ca ngày', start: '07:00', end: '19:00' }, { name: 'Ca đêm', start: '19:00', end: '07:00' }] }];
check('HC/TC: làm ca 07:00–20:30 -> HC 12h, TC 1h30', (() => {
  const r = hr.hrSplitHoursHC('Xưởng 2', '07:00', '20:30', 0);
  return r.hc === 720 && r.tc === 90;
})());
check('HC/TC: ca đêm 19:00–07:00 (qua đêm) -> HC 12h, TC 0', (() => {
  const r = hr.hrSplitHoursHC('Xưởng 2', '19:00', '07:00', 1);
  return r.hc === 720 && r.tc === 0;
})());
state.hrShifts = [];

// Chấm công: có bố trí qua Board -> chỉ hiện vị trí hôm đó + badge HC/TC
state.hrAttDate = state.hrBoardDate;
hr.renderHrAttendanceCard();
const attHTML2 = document.getElementById('hr-att-body').innerHTML;
const fsDbg = await import('node:fs');
fsDbg.writeFileSync('debug-att.html', attHTML2);
check('HC/TC: badge tổng HC 18h (5 lượt gán của empB)', attHTML2.includes('HC <strong>18h</strong>'));
check('HC/TC: không có TC khi làm trong giờ', attHTML2.includes('TC <strong>') === false);
check('HC/TC: chip từng lượt gán (Kho TP X2 7h00–12h00 · Kho X2 7h00–9h00 · 12h00)', attHTML2.includes('Kho TP X2') && attHTML2.includes('7h00–12h00') && attHTML2.includes('7h00–9h00') && attHTML2.includes('12h00'));

// ─── H. THÊM VỊ TRÍ: trùng tên KHÁC bộ phận vẫn thêm được ─────────
// ("Kho X2" đã tồn tại ở Xưởng 2 — thêm "Kho X2" cho QC phải được phép)
const posCntBefore = state.hrPositions.length;
document.getElementById('position-id').value = '';
document.getElementById('position-name').value = 'Kho X2';
document.getElementById('position-department').value = 'QC';
document.getElementById('position-note').value = '';
hr.handlePositionSubmit(ev);
check('POS: thêm vị trí TRÙNG TÊN nhưng KHÁC bộ phận -> thành công', state.hrPositions.length === posCntBefore + 1 && state.hrPositions.some(p => p.name === 'Kho X2' && p.department === 'QC'));
// Trùng tên + trùng bộ phận -> chặn (đúng là trùng)
hr.handlePositionSubmit(ev);
check('POS: trùng tên + trùng bộ phận -> chặn (không thêm)', state.hrPositions.length === posCntBefore + 1);
// Modal thêm vị trí mặc định Bộ Phận theo bộ phận đang xem trên Board
hr.openPositionModal();
check('POS: modal thêm vị trí mặc định Bộ Phận = bộ phận Board đang xem', document.getElementById('position-department').value === 'Xưởng 2');
hr.closePositionModal();
// Vị trí mới tự xuất hiện trong bảng trung gian + Board (tự nạp)
check('POS: vị trí mới tự có dòng trong "Nhân sự cần tại vị trí"', (state.hrPositionNeeds || []).some(r => r.position === 'Kho X2' && r.department === 'QC'));

// ─── I. ĐIỀN TAY KHUNG GIỜ KHÁC: giờ bắt đầu mới = giờ kết thúc vị trí cũ ──
// (cùng logic với kéo thẻ: bản cũ được chấm dứt lúc giờ bắt đầu mới, giữ lịch sử)
const dayT = '2030-05-10';
state.hrAssignments = (state.hrAssignments || []).filter(a => a.date !== dayT);
// aT1: empB tại Kho X2 (pkh2) 7h00 → hết ca (end rỗng)
const aT1 = { id: 'asg-t1', date: dayT, department: 'Xưởng 2', positionId: 'pkh2', shiftIdx: 0, employeeId: 'empB', start: '07:00', end: '', shiftLabel: 'Hành chính' };
state.hrAssignments.push(aT1);
document.getElementById('board-assign-mode').value = '';
document.getElementById('board-assign-movefrom').value = '';
document.getElementById('board-assign-date').value = dayT;
document.getElementById('board-assign-pos').value = 'px2';
document.getElementById('board-assign-shiftidx').value = '0';
document.getElementById('board-assign-employee-id').value = 'empB';
document.getElementById('board-assign-start').value = '09:00';
document.getElementById('board-assign-end').value = '12:00';
hr.handleBoardAssignSubmit(ev);
const aT2 = (state.hrAssignments || []).find(a => a.positionId === 'px2' && a.date === dayT && a.employeeId === 'empB');
check('BOARD: điền tay khung khác -> tạo bản ghi mới tại vị trí mới (09h00–12h00)', !!aT2 && aT2.start === '09:00' && aT2.end === '12:00');
check('BOARD: điền tay -> giờ kết thúc vị trí cũ TỰ = giờ bắt đầu mới (9h00)', aT1.end === '09:00');
check('BOARD: điền tay GIỮ LỊCH SỬ vị trí cũ (bản ghi vẫn còn, chỉ cắt giờ)', (state.hrAssignments || []).some(a => a.id === 'asg-t1'));

// Giờ kết thúc cũ là GIỜ CỤ THỂ (17h30) — cũng tự cắt về giờ bắt đầu mới
const aT3 = { id: 'asg-t3', date: dayT, department: 'Xưởng 2', positionId: 'pkh2', shiftIdx: 0, employeeId: 'empA', start: '07:00', end: '17:30', shiftLabel: 'Hành chính' };
state.hrAssignments.push(aT3);
document.getElementById('board-assign-employee-id').value = 'empA';
document.getElementById('board-assign-start').value = '15:00';
document.getElementById('board-assign-end').value = '';
hr.handleBoardAssignSubmit(ev);
check('BOARD: giờ cũ cụ thể (17h30) cũng tự cắt về giờ bắt đầu mới (15h00)', aT3.end === '15:00');

// Giờ mới KHÔNG muộn hơn giờ bắt đầu cũ -> bản cũ giữ nguyên (không xóa lịch sử)
const aT5 = { id: 'asg-t5', date: dayT, department: 'Xưởng 2', positionId: 'pkh2', shiftIdx: 0, employeeId: 'empB', start: '13:00', end: '17:30', shiftLabel: 'Hành chính' };
state.hrAssignments.push(aT5);
document.getElementById('board-assign-employee-id').value = 'empB';
document.getElementById('board-assign-start').value = '07:00';
document.getElementById('board-assign-end').value = '08:00';
hr.handleBoardAssignSubmit(ev);
check('BOARD: giờ mới sớm hơn giờ bắt đầu cũ -> bản cũ GIỮ NGUYÊN (13h00–17h30)', aT5.start === '13:00' && aT5.end === '17:30');

// Kéo thẻ (move) — hành vi cũ GIỮ NGUYÊN: dời aT5 sang px2 lúc 15h00 -> aT5.end = 15h00
document.getElementById('board-assign-movefrom').value = 'asg-t5';
document.getElementById('board-assign-pos').value = 'px2';
document.getElementById('board-assign-shiftidx').value = '0';
document.getElementById('board-assign-employee-id').value = 'empB';
document.getElementById('board-assign-start').value = '15:00';
document.getElementById('board-assign-end').value = '';
hr.handleBoardAssignSubmit(ev);
check('BOARD: kéo thẻ dời vị trí -> giờ kết thúc cũ = giờ bắt đầu mới (không đổi hành vi)', aT5.end === '15:00' && aT5.positionId === 'pkh2');

console.log(`\nWYNIK: ${pass} pass, ${fail} fail`);
if (fail > 0) process.exit(1);


