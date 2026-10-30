// tests/hr-checkin-compare.test.mjs — ĐỐI CHIẾU BẢNG BỐ TRÍ ↔ MÁY CHẤM CÔNG
// Quy tắc chốt 19/10/2026:
//  • Chấm sớm tối đa < 30 phút: tính giờ làm TỪ GIỜ BẮT ĐẦU CA, không sinh TC.
//  • Tăng ca sau hết ca: mỗi 30 phút mới tính → LÀM TRÒN XUỐNG
//    (17:59 → 0'; 18:10 → 30'; 18:35 → 60'; 19:30 → 120').
//  • Ngày nghỉ/lễ: toàn bộ giờ đi làm = TC, KHÔNG làm tròn.
//  • Nghỉ phép cả ngày + có quẹt → cờ đỏ; nghỉ theo giờ → so phần còn phải làm.
//  • Tăng ca: TC máy (đã tròn) ⟷ Σ đơn TC đã duyệt.
//  • Tự điền giờ kết thúc: chỉ ngày đã qua, ô đang trống, lượt bố trí CUỐI.
'use strict';

// ─── Stubs môi trường (giống tests/hr-timesheet.test.mjs) ──────────
function makeEl(id) {
  const el = {
    id: id || '', value: '', checked: false, disabled: false, hidden: false,
    open: true, textContent: '', innerHTML: '', style: {}, dataset: {}, _h: {},
    offsetWidth: 800, offsetHeight: 500,
    classList: { _s: new Set(), add(c){ this._s.add(c); }, remove(c){ this._s.delete(c); }, toggle(c, f){ if (f === undefined) f = !this._s.has(c); if (f) this._s.add(c); else this._s.delete(c); return f; }, contains(c){ return this._s.has(c); } },
    addEventListener(t, f) { (el._h[t] = el._h[t] || []).push(f); },
    appendChild(c) { return c; }, removeChild(c) { return c; },
    remove(){}, setAttribute(){}, getAttribute: () => null,
    querySelector: () => makeEl(), querySelectorAll: () => [],
    closest: () => null, matches: () => false,
    getContext: () => ({ measureText: () => ({ width: 10 }), createLinearGradient: () => ({ addColorStop(){} }), createRadialGradient: () => ({ addColorStop(){} }), drawImage(){} }),
    toDataURL: () => 'data:image/jpeg;base64,CANVASOK',
    getBoundingClientRect: () => ({ top: 0, left: 0, right: 800, bottom: 600, width: 800, height: 600 }),
    focus(){}, click(){}, reset(){}, animate(){ return { cancel(){} }; }
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

let passed = 0, failed = 0;
function check(name, cond) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.error('FAIL ' + name); }
}
const fs = await import('node:fs');

const { state } = await import('../js/state.js');
const hr = await import('../js/hr.js');

const Y = '2026-08-15';                 // ngày thường, đã qua
const TODAY = new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0') + '-' + String(new Date().getDate()).padStart(2, '0');

function reset(over) {
  state.currentUser = { username: 'admin', role: 'admin', fullname: 'Test Admin', editTabs: ['hr'], allowAdvanced: true };
  state.hrEmployees = [{ id: 'e1', code: 'QS00327', name: 'Hà Thị Mùi', department: 'Xưởng 2', status: 'active', skills: [] }];
  state.hrPositions = [{ id: 'p1', name: 'Cắt chọn', department: 'Xưởng 2' }];
  state.hrShifts = [];
  state.hrAssignments = [];
  state.hrAttendance = [];
  state.hrCheckins = [];
  state.hrLeaves = [];
  state.hrOvertimes = [];
  state.hrCiAcks = [];
  state.hrWorkCalendar = {};
  Object.assign(state, over || {});
}
function assign(over) {
  return Object.assign({ id: 'a1', date: Y, department: 'Xưởng 2', positionId: 'p1', shiftIdx: 0,
    employeeId: 'e1', start: '07:00', end: '', createdAt: '', updatedAt: '' }, over || {});
}
function checkin(over) {
  return Object.assign({ id: 'ci-1', employeeId: 'e1', date: Y, in: '06:56', out: '18:35', punches: 2 }, over || {});
}
function attWork() {
  state.hrAttendance = [{ id: 'att-1', employeeId: 'e1', date: Y, status: 'work', positions: [], note: '' }];
}

// ─── A. CHUẨN HOÁ GIỜ / NGÀY + NHẬN CỘT FILE MÁY ──────────────────
check('A1 ciNormTime cắt giây "06:56:23" -> 06:56', hr.ciNormTime('06:56:23') === '06:56');
check('A2 ciNormTime "7h05"', hr.ciNormTime('7h05') === '07:05');
check('A3 ciNormTime "0705"', hr.ciNormTime('0705') === '07:05');
check('A4 ciNormTime số Excel 0.2951388 -> 07:05', hr.ciNormTime(425 / 1440) === '07:05');
check('A5 ciNormTime serial 46249.2951388 -> 07:05', hr.ciNormTime(46249 + 425 / 1440) === '07:05');
check('A6 ciNormDateTime "15-08-2026"', hr.ciNormDateTime('15-08-2026').date === '2026-08-15');
check('A7 ciNormDateTime serial 46249 -> 2026-08-15', hr.ciNormDateTime(46249).date === '2026-08-15');
check('A8 ciNormDateTime serial .5 -> 12:00', hr.ciNormDateTime(46249.5).time === '12:00');
check('A9 ciTimeFromNum âm / quá lớn -> rỗng', hr.ciTimeFromNum(-1) === '' && hr.ciTimeFromNum(99999) === '');

const aoaImg = [
  ['CÔNG TY TNHH NGỌC SƠN'],
  ['BÁO CÁO DỮ LIỆU CHẤM CÔNG'],
  ['Từ ngày 01-08-2026 Đến ngày 31-08-2026'],
  [],
  ['STT', 'Phòng ban', 'Mã NV', 'Họ Tên', 'Chức danh', 'Ngày', 'Lần 1', 'Lần 2', 'Lần 3', 'Lần 4', 'Lần 5', 'Lần 6', 'Lần 7', 'Lần 8', 'Lần 9'],
  ['14', 'Tổ 1', 'QS00327', 'Hà thị mùi', 'Nhân viên', '15-08-2026', '06:56:23', '18:35:10'],
  ['43', 'Tổ 2', 'QS00030', 'Phạm Thị Quyên', 'Nhân viên', '16-08-2026', '06:44:09']
];
const hdr = hr.ciFindHeaderRow(aoaImg);
check('A10 tìm đúng dòng tiêu đề thứ 5', hdr === 4);
const col = hr.ciAutoMapCols(aoaImg[hdr]);
check('A11 nhận cột Phòng ban / Mã NV / Họ Tên / Ngày + 9 cột lần quét',
  col.dept === 1 && col.code === 2 && col.name === 3 && col.date === 5 && col.punchCols.length === 9);
reset({ hrEmployees: [
  { id: 'e1', code: 'QS00327', name: 'Hà Thị Mùi', department: 'Xưởng 2', status: 'active', skills: [] },
  { id: 'e2', code: 'QS00030', name: 'Phạm Thị Quyên', department: 'Xưởng 2', status: 'active', skills: [] }
] });
const resImg = hr.importCheckinsFromSheet(aoaImg.slice(hdr), col, 'bao-cao-08-2026.xlsx');
check('A12 nạp 2 ngày (2 NV), 3 lần quét', resImg.matched === 2 && resImg.punches === 3);
const ciImg = hr.checkinRecordOf('e1', '2026-08-15');
check('A13 dòng 15-08-2026 -> vào 06:56, ra 18:35 (bỏ giây)', !!ciImg && ciImg.in === '06:56' && ciImg.out === '18:35');
check('A14 lưu ĐỦ danh sách lần quét (punchTimes)', Array.isArray(ciImg.punchTimes) && ciImg.punchTimes.length === 2);
const ciImg2 = hr.checkinRecordOf('e2', '2026-08-16');
check('A15 1 lần quét -> chỉ có giờ vào', !!ciImg2 && ciImg2.in === '06:44' && !ciImg2.out);

// ─── B. QUY TẮC GIỜ: CHẤM SỚM / ĐI MUỘN / VỀ SỚM / TC KHỐI 30' ────
function setupDay(opts) {
  const o = opts || {};
  reset();
  state.hrAssignments = [assign({ end: o.end === undefined ? '' : o.end, start: o.start || '07:00' })];
  state.hrCheckins = [checkin({ in: o.in || '06:56', out: o.out === undefined ? '18:35' : o.out })];
  if (o.att !== false) attWork();
  return hr.ciCompareDay('e1', Y);
}
let r = setupDay({});
check('B1 bố trí 07:00→hết ca = HC 9h, TC 0', r.plan.hc === 540 && r.plan.tc === 0);
check('B2 quẹt 06:56 được tính từ 07:00 (không sinh TC sớm)', r.actual.inMin === 420);
check('B3 ra 18:35 -> làm tròn XUỐNG mốc 30\' = 18:30 -> TC 60 phút', r.actual.tcRaw === 60 && r.actual.tc === 60);
check('B4 HC thực tế = 9h', r.actual.hc === 540);
check('B5 kết luận Khớp (không muộn / không sớm)', r.verdict === 'ok' && r.actual.lateMin === 0 && r.actual.earlyOutMin === 0);

r = setupDay({ in: '06:20', out: '17:30' });
check('B6 quẹt sớm 40 phút -> cờ "quẹt sớm", vẫn tính từ 07:00, TC 0',
  r.flags.includes('early_punch') && r.actual.inMin === 420 && r.actual.tc === 0);

r = setupDay({ in: '07:15' });
check('B7 vào 07:15 -> làm tròn LÊN mốc 30\' = 07:30 -> đi muộn 30 phút, kết luận "Đi muộn"', r.actual.lateMin === 30 && r.verdict === 'late');

r = setupDay({ out: '15:30' });
check('B8 ra 15:30 -> về sớm 120 phút', r.actual.earlyOutMin === 120 && r.verdict === 'early');

r = setupDay({ out: '17:59' });
check('B9 ra 17:59 -> TC 0 (chưa đủ 30 phút)', r.actual.tc === 0);
r = setupDay({ out: '18:00' });
check('B10 ra 18:00 -> TC 30 phút', r.actual.tc === 30);
r = setupDay({ out: '18:10' });
check('B11 ra 18:10 -> TC 30 phút (làm tròn xuống)', r.actual.tc === 30);
r = setupDay({ out: '18:29' });
check('B12 ra 18:29 -> TC 30 phút', r.actual.tc === 30);
r = setupDay({ out: '18:30' });
check('B13 ra 18:30 -> TC 60 phút', r.actual.tc === 60);
r = setupDay({ out: '19:30' });
check('B14 ra 19:30 -> TC 120 phút', r.actual.tc === 120);

// ─── C. NGÀY NGHỈ / LỄ: TOÀN BỘ LÀ TC, KHÔNG LÀM TRÒN ────────────
reset({
  hrWorkCalendar: { '2026-09': { weekdaysOff: [], restDays: ['2026-09-02'] } },
  hrAssignments: [assign({ date: '2026-09-02' })],
  hrCheckins: [checkin({ date: '2026-09-02', in: '07:00', out: '17:30' })],
  hrAttendance: [{ id: 'att-r', employeeId: 'e1', date: '2026-09-02', status: 'work', positions: [], note: '' }]
});
const rRest = hr.ciCompareDay('e1', '2026-09-02');
check('C1 ngày lễ 02/09: đi làm đủ ngày -> HC 0, toàn bộ 540 = TC', rRest.actual.hc === 0 && rRest.actual.tc === 540);
check('C2 ngày lễ KHÔNG làm tròn 30 phút', rRest.actual.tcRaw === rRest.actual.tc);

// ─── D. CA ĐÊM: GHÉP LẦN QUẸT SÁNG HÔM SAU LÀM GIỜ RA ────────────
reset({
  hrShifts: [{ id: 'Xưởng 2', type: 'lamca', shifts: [
    { name: 'Ca ngày', start: '07:00', end: '19:00', brk: 1.5 },
    { name: 'Ca đêm', start: '19:00', end: '07:00', brk: 1 }] }],
  hrAssignments: [assign({ date: '2026-09-10', start: '19:00', end: '', shiftIdx: 1 })],
  hrCheckins: [
    checkin({ id: 'ci-n1', date: '2026-09-10', in: '18:55', out: '' }),
    checkin({ id: 'ci-n2', date: '2026-09-11', in: '07:05', out: '' })
  ],
  hrAttendance: [{ id: 'att-n', employeeId: 'e1', date: '2026-09-10', status: 'work', positions: [], note: '' }]
});
const rNight = hr.ciCompareDay('e1', '2026-09-10');
check('D1 ghép giờ ra qua đêm (07:05 làm tròn xuống mốc 30\' = 07:00)',
  rNight.actual.crossNight === true && rNight.actual.outMin === 1440 + 420);
check('D2 giờ HC ca đêm = 11h (đã trừ 1h nghỉ cuối ca), TC 0',
  rNight.actual.hc === 660 && rNight.actual.tc === 0);

// ─── E. NGHỈ PHÉP: CẢ NGÀY / THEO GIỜ ─────────────────────────────
reset({
  hrAssignments: [assign({})],
  hrCheckins: [checkin({ in: '07:00', out: '17:30' })],
  hrLeaves: [{ id: 'lv1', employeeId: 'e1', type: 'Nghỉ phép', from: Y, to: Y, days: 1,
    durationMode: 'full', status: 'approved', approvedBy: 'QL' }]
});
let rLeave = hr.ciCompareDay('e1', Y);
check('E1 nghỉ cả ngày nhưng CÓ quẹt máy -> cờ đỏ leave_punch',
  rLeave.verdict === 'leave_punch' && rLeave.needsReview === true);

reset({
  hrAssignments: [assign({})],
  hrLeaves: [{ id: 'lv2', employeeId: 'e1', type: 'Nghỉ phép', from: Y, to: Y, days: 1,
    durationMode: 'full', status: 'approved' }]
});
rLeave = hr.ciCompareDay('e1', Y);
check('E2 nghỉ cả ngày KHÔNG quẹt -> "Nghỉ có phép" (không cần xác nhận)',
  rLeave.verdict === 'leave_ok' && rLeave.needsReview === false);

reset({
  hrAssignments: [assign({})],
  hrCheckins: [checkin({ in: '07:00', out: '13:00' })],
  hrLeaves: [{ id: 'lv3', employeeId: 'e1', type: 'Nghỉ phép', from: Y, to: Y, days: 0.5,
    durationMode: 'hours', hours: 4, status: 'approved' }],
  hrAttendance: [{ id: 'att-p', employeeId: 'e1', date: Y, status: 'work', positions: [], note: '' }]
});
rLeave = hr.ciCompareDay('e1', Y);
check('E3 nghỉ 4 giờ: còn phải làm 5h, thực tế 6h -> lệch +60 phút, kết luận leave_hours',
  rLeave.leave.fullDay === false && rLeave.leaveDeltaMin === 60 && rLeave.verdict === 'leave_hours');

// ─── F. TĂNG CA: TC MÁY ⟷ ĐƠN ĐÃ DUYỆT ───────────────────────────
function setupOt(plannedMin, status) {
  setupDay({ out: '19:30' }); // TC máy = 120
  if (plannedMin > 0) {
    state.hrOvertimes = [{ id: 'ot1', employeeId: 'e1', date: Y, start: '17:30', end: '19:30',
      plannedMin, status: status || 'approved', approvedBy: 'QL' }];
  }
  return hr.ciCompareDay('e1', Y);
}
let rOt = setupOt(120);
check('F1 đơn 120\' + máy 120\' -> TC khớp đơn', rOt.otStatus === 'ok' && rOt.otDelta === 0);
rOt = setupOt(60);
check('F2 đơn 60\' + máy 120\' -> TC vượt đơn +60\'', rOt.otStatus === 'over' && rOt.otDelta === 60);
rOt = setupOt(180);
check('F3 đơn 180\' + máy 120\' -> TC thiếu so đơn -60\'', rOt.otStatus === 'short' && rOt.otDelta === -60);
rOt = setupOt(0);
check('F4 máy có TC nhưng KHÔNG có đơn -> "chưa đăng ký"', rOt.otStatus === 'unregistered');
rOt = setupOt(120, 'pending');
check('F5 đơn chờ duyệt -> cảnh báo "chờ duyệt"', rOt.otStatus === 'pending');

// ─── G. BỐ TRÍ ↔ MÁY ↔ CHẤM TAY ───────────────────────────────────
reset({
  hrEmployees: [
    { id: 'e1', code: 'QS1', name: 'Hà Thị Mùi', department: 'Xưởng 2', status: 'active', skills: [] },
    { id: 'e2', code: 'QS2', name: 'Phạm Thị Quyên', department: 'Xưởng 2', status: 'active', skills: [] }
  ],
  hrAssignments: [assign({})],
  hrCheckins: [checkin({ id: 'ci-other', employeeId: 'e2', in: '07:00', out: '17:00' })] // máy CÓ dữ liệu ngày này
});
let rG = hr.ciCompareDay('e1', Y);
check('G1 có bố trí + máy có dữ liệu nhưng NV không quẹt -> "Không quẹt máy"',
  rG.verdict === 'no_punch' && rG.needsReview === true);

reset({
  hrCheckins: [checkin({ in: '07:00', out: '17:30' })],
  hrAttendance: []
});
rG = hr.ciCompareDay('e1', Y);
check('G2 máy có quẹt nhưng CHƯA bố trí, chưa chấm tay -> "Máy có quẹt, chưa bố trí"',
  rG.verdict === 'no_plan' && rG.needsReview === true);

reset({
  hrCheckins: [checkin({ in: '07:00', out: '17:30' })],
  hrAttendance: [{ id: 'att-w', employeeId: 'e1', date: Y, status: 'work', positions: [], note: '' }]
});
rG = hr.ciCompareDay('e1', Y);
check('G3 chưa bố trí nhưng chấm tay Đi làm -> coi là Khớp + nhắc "chưa bố trí"',
  rG.verdict === 'ok' && rG.flags.includes('no_plan_info'));

reset({
  hrAssignments: [assign({})],
  hrCheckins: [checkin({ in: '07:00', out: '17:30' })],
  hrAttendance: [{ id: 'att-a', employeeId: 'e1', date: Y, status: 'absent', positions: [], note: '' }]
});
rG = hr.ciCompareDay('e1', Y);
check('G4 chấm tay "Vắng" nhưng máy có quẹt -> cờ đỏ', rG.verdict === 'absent_punch');

reset({ hrAssignments: [assign({})], hrCheckins: [checkin({ in: '07:00', out: '17:30' })] });
rG = hr.ciCompareDay('e1', Y);
check('G5 máy có quẹt + chưa ai chấm tay -> "Chưa chấm tay"',
  rG.verdict === 'unmarked' && rG.needsReview === true);

// ─── H. DANH SÁCH DÒNG + BỘ LỌC ──────────────────────────────────
reset({
  hrEmployees: [
    { id: 'e1', code: 'QS1', name: 'Hà Thị Mùi', department: 'Xưởng 2', status: 'active', skills: [] },
    { id: 'e2', code: 'QS2', name: 'Phạm Thị Quyên', department: 'Xưởng 1', status: 'active', skills: [] }
  ],
  hrAssignments: [assign({}), assign({ id: 'a2', employeeId: 'e2', date: Y, department: 'Xưởng 1', positionId: 'p1' })],
  hrCheckins: [checkin({ out: '17:30' }), checkin({ id: 'ci-2', employeeId: 'e2', out: '17:30' })],
  hrAttendance: [
    { id: 'att-1', employeeId: 'e1', date: Y, status: 'work', positions: [], note: '' },
    { id: 'att-2', employeeId: 'e2', date: Y, status: 'work', positions: [], note: '' }
  ]
});
check('H1 lấy đủ dòng trong kỳ', hr.ciRowsForRange(Y, Y, {}).length === 2);
check('H2 lọc theo bộ phận', hr.ciRowsForRange(Y, Y, { dept: 'Xưởng 1' }).length === 1);
check('H3 tìm nhanh bỏ dấu ("quyen")', hr.ciRowsForRange(Y, Y, { q: 'quyen' }).length === 1);
check('H4 "chỉ dòng cần xác nhận" loại dòng Khớp', hr.ciRowsForRange(Y, Y, { onlyIssues: true }).length === 0);
check('H5 thống kê: 2 dòng, 2 khớp, 0 cần xác nhận',
  (() => { const s = hr.ciSummaryOf(hr.ciRowsForRange(Y, Y, {})); return s.total === 2 && s.ok === 2 && s.review === 0; })());

reset({
  hrLeaves: [{ id: 'lv9', employeeId: 'e1', type: 'Nghỉ phép', from: Y, to: Y, days: 1, durationMode: 'full', status: 'approved' }]
});
check('H6 ngày nghỉ có phép KHÔNG hiện mặc định', hr.ciRowsForRange(Y, Y, {}).length === 0);
check('H7 bật "hiện ngày nghỉ" thì có dòng', hr.ciRowsForRange(Y, Y, { includeLeave: true }).length === 1);

// ─── I. TỰ ĐIỀN GIỜ KẾT THÚC THỰC TẾ ─────────────────────────────
reset({ hrAssignments: [assign({})], hrCheckins: [checkin({ out: '18:35' })] });
let sug = hr.ciSuggestEndFills({ round: false });
check('I1 có 1 gợi ý cho lượt bố trí đang trống giờ kết thúc', sug.length === 1);
check('I2 chế độ ĐÚNG GIỜ MÁY -> 18:30 (giờ ra đã làm tròn xuống mốc 30\')', sug[0].newEnd === '18:30');
check('I3 gợi ý kèm HC/TC trước → sau', sug[0].before.hc === 540 && sug[0].before.tc === 0 && sug[0].after.tc === 60);
sug = hr.ciSuggestEndFills({ round: true });
check('I4 chế độ LÀM TRÒN XUỐNG 30\' -> 18:30', sug[0].newEnd === '18:30');

reset({ hrAssignments: [assign({ end: '17:30' })], hrCheckins: [checkin({})] });
check('I5 ô giờ kết thúc ĐÃ NHẬP TAY -> không gợi ý (không ghi đè)', hr.ciSuggestEndFills({}).length === 0);

reset({ hrAssignments: [assign({ date: TODAY })], hrCheckins: [checkin({ date: TODAY, out: '18:00' })] });
check('I6 HÔM NAY chưa xong ca -> không gợi ý', hr.ciSuggestEndFills({}).length === 0);

reset({ hrAssignments: [assign({}), assign({ id: 'a2', start: '13:00', end: '', positionId: 'p2' })], hrCheckins: [checkin({})] });
state.hrPositions.push({ id: 'p2', name: 'Bổ ống', department: 'Xưởng 2' });
sug = hr.ciSuggestEndFills({});
check('I7 nhiều lượt bố trí trong ngày -> chỉ gợi ý LƯỢT CUỐI', sug.length === 1 && sug[0].assignId === 'a2');

reset({ hrAssignments: [assign({})], hrCheckins: [checkin({ out: '18:35' })] });
const nFill = hr.ciApplyEndFills(hr.ciSuggestEndFills({}));
check('I8 áp dụng -> ghi giờ kết thúc (đã làm tròn 30\') + đánh dấu lấy từ máy',
  nFill === 1 && state.hrAssignments[0].end === '18:30' && state.hrAssignments[0].endSource === 'machine');
check('I9 áp dụng lần 2 -> không còn dòng nào (không ghi đè)', hr.ciApplyEndFills(hr.ciSuggestEndFills({})) === 0);

// ─── J. ĐÁNH DẤU "ĐÃ XÁC NHẬN" ───────────────────────────────────
reset({ hrAssignments: [assign({})], hrCheckins: [checkin({ out: '16:30' })] });
check('J1 trước khi xác nhận: cần xác nhận', hr.ciCompareDay('e1', Y).needsReview === true);
const ackRec = hr.ciAckDay('e1', Y, 'đã kiểm tra — về sớm có phép');
check('J2 Admin xác nhận -> lưu sổ (by/at/note)',
  !!ackRec && ackRec.by === 'Test Admin' && ackRec.note.includes('về sớm'));
const afterAck = hr.ciCompareDay('e1', Y);
check('J3 dòng đã xác nhận KHÔNG còn tính "cần xác nhận"', afterAck.ack !== null && afterAck.needsReview === false);
hr.ciUnackDay('e1', Y);
check('J4 bỏ xác nhận -> xoá khỏi sổ + tính lại cần xác nhận',
  state.hrCiAcks.length === 0 && hr.ciCompareDay('e1', Y).needsReview === true);
state.currentUser = { username: 'ed', role: 'editor', editTabs: ['hr'] };
check('J5 Editor KHÔNG được xác nhận', hr.ciAckDay('e1', Y) === null);

// ─── K. RENDER BẢNG ──────────────────────────────────────────────
state.currentUser = { username: 'admin', role: 'admin', fullname: 'Test Admin', editTabs: ['hr'], allowAdvanced: true };
reset({ hrAssignments: [assign({})], hrCheckins: [checkin({ in: '06:56', out: '18:35' })], hrAttendance: [] });
hr.renderHrCheckinTable();
const htmlK = document.getElementById('hr-ci-body').innerHTML;
check('K1 hiện giờ máy dạng 06:56–18:35', htmlK.includes('06:56–18:35'));
check('K2 hiện "Chưa chấm tay" + nút "Xử lý" (thay nút Xác Nhận cũ — 20/10/2026)',
  htmlK.includes('Chưa chấm tay') && htmlK.includes('Xử lý') && htmlK.includes('data-ci-pay="1"') && !htmlK.includes('Xác Nhận'));
check('K3 hiện vị trí bố trí + "hết ca"', htmlK.includes('Cắt chọn') && htmlK.includes('hết ca'));
check('K4 dải chip có "Tổng" và "Cần xác nhận"',
  document.getElementById('hr-ci-chips').innerHTML.includes('Tổng:') &&
  document.getElementById('hr-ci-chips').innerHTML.includes('Cần xác nhận'));
check('K5 tiêu đề đếm dòng có "cần xác nhận"',
  document.getElementById('hr-ci-count').textContent.includes('cần xác nhận'));

reset();
hr.renderHrCheckinTable();
check('K6 chưa có dữ liệu -> thông báo bấm Nạp Giờ Máy',
  document.getElementById('hr-ci-body').innerHTML.includes('Nạp Giờ Máy'));

// ─── L. CẤU TRÚC FILE ────────────────────────────────────────────
const idxHtml = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const evSrc = fs.readFileSync(new URL('../js/events.js', import.meta.url), 'utf8');
const hrSrc = fs.readFileSync(new URL('../js/hr.js', import.meta.url), 'utf8');
const cssSrc = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
const swSrc = fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
check('L1 index: đủ bộ lọc + nút điền giờ kết thúc + modal xem trước',
  idxHtml.includes('id="hr-ci-month"') && idxHtml.includes('id="hr-ci-filter-dept"') &&
  idxHtml.includes('id="hr-ci-only-issues"') && idxHtml.includes('id="hr-ci-show-leave"') &&
  idxHtml.includes('id="btn-ci-endfill"') && idxHtml.includes('id="modal-ci-endfill"') &&
  idxHtml.includes('id="ci-endfill-body"') && idxHtml.includes('id="hr-ci-chips"'));
const ciTable = idxHtml.slice(idxHtml.indexOf('id="hr-ci-table"'), idxHtml.indexOf('id="hr-ci-body"'));
check('L2 index: bảng đối chiếu 8 cột', (ciTable.match(/<th[\s>]/g) || []).length === 8);
check('L3 index: tùy chọn tự điền khi nạp file',
  idxHtml.includes('id="checkin-import-autofill"') && idxHtml.includes('id="checkin-import-round"'));
check('L4 events nối đủ bộ lọc + điền giờ + xác nhận',
  evSrc.includes("safeOn('hr-ci-month'") && evSrc.includes("safeOn('btn-ci-endfill'") &&
  evSrc.includes("safeOn('btn-ci-endfill-apply'") && evSrc.includes("'[data-ci-ack],[data-ci-unack]'"));
check('L5 hr.js có engine + hàm chia giờ theo phút',
  hrSrc.includes('function ciCompareDay(') && hrSrc.includes('function hrSplitHoursHCMin(') &&
  hrSrc.includes('CI_OT_BLOCK_MIN'));
check('L6 styles.css có khối .ci-*',
  /\.ci-row-review\s*>\s*td\s*\{/.test(cssSrc) && /\.ci-ack-chip\s*\{/.test(cssSrc));
check('L7 sw.js cache v283', swSrc.includes('nha-may-ngoc-son-v323'));
const specsSrc = fs.readFileSync(new URL('../js/report-specs.js', import.meta.url), 'utf8');
const rcSrc = fs.readFileSync(new URL('../js/report-center.js', import.meta.url), 'utf8');
check('L8 báo cáo "Đối Chiếu Bố Trí ↔ Máy" có trong Trung tâm Xuất Excel',
  specsSrc.includes("id: 'hr-ci-compare'") && rcSrc.includes("spec.kind === 'ciCompare'"));

// ─── M. CA ĐÊM: GHÉP CẶP QUA NGÀY (20/10/2026) ───────────────────
// Máy xuất MỖI DÒNG = 1 NGÀY dương lịch: người làm ca đêm 20:00→06:00 có
// 06:0x (RA của ca HÔM TRƯỚC) và 19:4x (VÀO của ca HÔM NAY) trên CÙNG dòng.
// Engine phải ghép 19:46 hôm nay ↔ 06:02 NGÀY KẾ, KHÔNG được hiểu thành
// "06:00→19:46 = 13h45 đi làm" (thực chất là nghỉ ở nhà).
const N16 = '2026-10-16', N17 = '2026-10-17', N18 = '2026-10-18', N19 = '2026-10-19';
function nightAssign(id, date) {
  return { id, employeeId: 'e1', date, department: 'Xưởng 2', positionId: 'p1',
    shiftIdx: 1, start: '20:00', end: '', createdAt: '', updatedAt: '' };
}
function ciRec(id, date, times) {
  return { id, employeeId: 'e1', date,
    in: times[0] || '', out: times.length > 1 ? times[times.length - 1] : '',
    punches: times.length, punchTimes: times.slice() };
}
function nightData(over) {
  reset(Object.assign({
    hrShifts: [{ id: 'Xưởng 2', type: 'lamca', shifts: [
      { name: 'Ca ngày', start: '07:00', end: '19:00', brk: 1.5 },
      { name: 'Ca đêm', start: '20:00', end: '06:00', brk: 1 }] }],
    hrAssignments: [nightAssign('n16', N16), nightAssign('n17', N17), nightAssign('n19', N19)],
    hrCheckins: [
      ciRec('c16', N16, ['06:00', '19:40']),
      ciRec('c17', N17, ['06:01', '19:46']),
      ciRec('c18', N18, ['06:02']),
      ciRec('c19', N19, ['19:42'])
    ],
    hrAttendance: [
      { id: 'att-16', employeeId: 'e1', date: N16, status: 'work', positions: [], note: '' },
      { id: 'att-17', employeeId: 'e1', date: N17, status: 'work', positions: [], note: '' },
      { id: 'att-19', employeeId: 'e1', date: N19, status: 'work', positions: [], note: '' }
    ]
  }, over || {}));
}
nightData();
const plan17 = hr.ciPlannedOf('e1', N17);
check('M1 nhận đúng ca đêm (khung 20:00→06:00 vắt qua nửa đêm)', !!hr.ciPlanNightOf(plan17));
const pair17 = hr.ciNightPairOf('e1', N17, plan17);
check('M2 ghép VÀO 19:46 hôm nay + RA 06:02 NGÀY KẾ (+1440), dùng đúng lần quẹt sáng',
  pair17 && pair17.inMin === 1186 && pair17.outMin === 1440 + 362 &&
  pair17.outNextDay === true && pair17.morningUsed.join(',') === '362');
check('M3 lần quẹt sáng 06:01 của ngày 17/10 bị ca đêm 16/10 lấy → KHÔNG dùng cho ngày 17/10',
  hr.ciUsablePunchesOf('e1', N17).join(',') === '1186');
const rN17 = hr.ciCompareDay('e1', N17);
check('M4 giờ vào tính từ 20:00 (quẹt 19:46 sớm 14\' < 30\'), giờ ra 06:02 → làm tròn xuống 06:00',
  rN17.actual.inMin === 1200 && rN17.actual.outMin === 1440 + 360 && rN17.actual.crossNight === true);
check('M5 HC 9h · TC 0 (2 phút lẻ làm tròn XUỐNG 0) — KHÔNG còn "06:00→19:46 = 13h45"',
  rN17.actual.hc === 540 && rN17.actual.tc === 0);
check('M6 kết luận "Khớp" — hết "Về sớm −614\'" của cách tính cũ',
  rN17.verdict === 'ok' && rN17.actual.earlyOutMin === 0 && !rN17.flags.includes('early'));
check('M7 cột giờ máy hiện cặp ĐÃ GHÉP + đánh dấu qua ngày',
  rN17.timeText === '19:46–06:02 (+1)');
const rN18 = hr.ciCompareDay('e1', N18);
check('M8 ngày chỉ có lần quẹt sáng → "Giờ ra ca đêm hôm trước", KHÔNG cần xác nhận',
  rN18.verdict === 'night_out' && rN18.needsReview === false);
check('M9 chuỗi giờ máy ngày đó ghi rõ là giờ ra ca đêm hôm trước',
  rN18.timeText.includes('06:02') && rN18.timeText.includes('ra ca đêm hôm trước'));
check('M10 biết nó thuộc ca đêm ngày 17/10', (hr.ciNightConsumedOf('e1', N18) || {}).fromDate === N17);
check('M11 ẩn khỏi danh sách "chỉ dòng cần xác nhận"',
  hr.ciRowsForRange(N18, N18, { onlyIssues: true }).length === 0);
const rN19 = hr.ciCompareDay('e1', N19);
check('M12 ca đêm chưa có lần quẹt sáng hôm sau → "Thiếu giờ ra" (không bịa giờ)',
  rN19.verdict === 'no_out' && rN19.actual.inMin === 1200 && rN19.actual.outMin === 0);
check('M13 Bảng chấm công tháng lấy đúng HC ca đêm (9h)',
  hr.ciTimesheetHours({ id: 'e1' }, 'Xưởng 2', N17).hc === 540);
const sugN = hr.ciSuggestEndFills({ round: false });
const sugN17 = sugN.find(x => x.date === N17);
check('M14 tự điền giờ kết thúc ca đêm = 06:00 (giờ ra ngày kế, đã làm tròn 30\')',
  !!sugN17 && sugN17.newEnd === '06:00' && sugN17.punchOut === '06:00');

// Ngày sau CÓ bố trí nhưng chỉ quẹt giờ ra ca đêm hôm trước
nightData({
  hrAssignments: [nightAssign('n17', N17), nightAssign('n18', N18)],
  hrCheckins: [ciRec('c17', N17, ['06:01', '19:46']), ciRec('c18', N18, ['06:02'])]
});
const rN18plan = hr.ciCompareDay('e1', N18);
check('M15 ngày sau CÓ bố trí nhưng chỉ quẹt giờ ra ca đêm → "Không quẹt máy" + nhắc rõ',
  rN18plan.verdict === 'no_punch' && rN18plan.flags.includes('night_out_only') &&
  rN18plan.needsReview === true);

nightData({ hrAttendance: [] });
hr.applyAllCheckins();
check('M16 Áp Dụng Tất Cả KHÔNG chấm "Đi làm" cho ngày chỉ có giờ ra ca đêm hôm trước',
  !state.hrAttendance.some(a => a.date === N18) && state.hrAttendance.some(a => a.date === N17));
nightData({ hrAttendance: [] });
hr.applyCheckinRecord('e1', N18);
check('M17 Áp Dụng riêng ngày đó cũng bị chặn (không ghi chấm tay sai ngày)',
  !state.hrAttendance.some(a => a.date === N18));

// Ca ngày + ca đêm trong CÙNG ngày → KHÔNG ghép (tránh đoán sai), giữ cách tính cũ
nightData({ hrAssignments: [
  { id: 'mix1', employeeId: 'e1', date: N17, department: 'Xưởng 2', positionId: 'p1',
    shiftIdx: 0, start: '07:00', end: '19:00' },
  nightAssign('mix2', N17)
] });
check('M18 ngày trộn ca ngày + ca đêm → KHÔNG bật chế độ ghép ca đêm',
  hr.ciPlanNightOf(hr.ciPlannedOf('e1', N17)) === null);

// Ngày thường (nhiều lần quẹt) vẫn lấy sớm nhất = vào, muộn nhất = ra
reset({
  hrAssignments: [assign({})],
  hrCheckins: [{ id: 'ci-m', employeeId: 'e1', date: Y, in: '06:56', out: '18:35',
    punches: 4, punchTimes: ['06:56', '11:30', '13:00', '18:35'] }],
  hrAttendance: [{ id: 'att-m', employeeId: 'e1', date: Y, status: 'work', positions: [], note: '' }]
});
const rMulti = hr.ciCompareDay('e1', Y);
check('M19 ngày thường 4 lần quẹt: vào 06:56→07:00 · ra 18:35→18:30 (HC 9h · TC 60\')',
  rMulti.actual.inMin === 420 && rMulti.actual.outMin === 1110 &&
  rMulti.actual.hc === 540 && rMulti.actual.tc === 60 && rMulti.verdict === 'ok');

// ─── M2. CẤU TRÚC: LOADING + CẢNH BÁO ĐỔI CA ─────────────────────
check('M20 nạp file: hiện LOADING NGAY khi chọn file (TRƯỚC readAsArrayBuffer) + xoay câu vui',
  hrSrc.indexOf('showTreLoading(funLabels[0], { dur: 800, phrases: funLabels })') > -1 &&
  hrSrc.indexOf('showTreLoading(funLabels[0]') < hrSrc.indexOf('reader.readAsArrayBuffer(file)') &&
  hrSrc.includes('Chờ xíu nha… đang bê file Excel của máy chấm công về'));
check('M21 nạp file: có reader.onerror dọn overlay + finally hideTreLoading(treOk, { minShow: 800 })',
  hrSrc.includes('reader.onerror = () =>') && hrSrc.includes('hideTreLoading(false)') &&
  hrSrc.includes('hideTreLoading(treOk, { minShow: 800 })'));
check('M22 bấm "Nạp Dữ Liệu" cũng có LOADING + chống bấm lặp (ciImporting) + finally dọn',
  /function doCheckinImport\(\)[\s\S]{0,1600}?ciImporting[\s\S]{0,1600}?showTreLoading\(funLabels\[0\]/.test(hrSrc) &&
  /function doCheckinImport\(\)[\s\S]{0,6000}?finally\s*\{[\s\S]{0,400}?hideTreLoading\(treOk, \{ minShow: 800 \}\)/.test(hrSrc));
check('M23 đổi giờ/nghỉ của ca có dữ liệu → CẢNH BÁO tính lại lịch sử (confirm)',
  /const hasHistory = \(state\.hrAssignments \|\| \[\]\)\.some/.test(hrSrc) &&
  hrSrc.includes('TÍNH LẠI toàn bộ lịch sử của bộ phận này'));

// ─── N. 3 LỖI CÔNG THỨC NGƯỜI DÙNG BÁO (20/10/2026) ─────────────
//  N1 (hình 2): nghỉ của ca đặt GIỮA CA — nửa buổi chiều vẫn đủ 4h30.
//  N2 (hình 3): bố trí GỘP khoảng trùng + giờ quẹt làm tròn mốc 30'.
//  N3 (hình 1): đoạn 0 phút KHÔNG phình thành cả ca + cờ "thiếu vị trí bố trí".
const CA_NGAY = { id: 'Xưởng 2', type: 'lamca', shifts: [
  { name: 'Ca ngày', start: '07:00', end: '17:30', brk: 1.5 },
  { name: 'Ca đêm', start: '20:00', end: '06:00', brk: 1 }] };
const D14 = '2026-10-14', D16 = '2026-10-16';
function nAssign(id, over) {
  return Object.assign({ id, employeeId: 'e1', date: D14, department: 'Xưởng 2',
    positionId: 'p1', shiftIdx: 0, start: '07:00', end: '', createdAt: '', updatedAt: '' }, over || {});
}
// ── N1: HÌNH 2 — không có bố trí, quẹt 12:59–17:34
reset({ hrShifts: [CA_NGAY], hrAssignments: [], hrCheckins: [checkin({ date: D14, in: '12:59', out: '17:34' })] });
const rN1 = hr.ciCompareDay('e1', D14);
check('N1 nghỉ giữa ca (11:30–13:00) → làm 12:59–17:34 = HC 4h30 (trước đây 3h01)',
  rN1.actual.hc === 270 && rN1.actual.tc === 0);
check('N1b giờ quẹt làm tròn mốc 30\' → vào 13:00 · ra 17:30',
  rN1.actual.inMin === 780 && rN1.actual.outMin === 1050);

// ── N2: HÌNH 3 — 2 vị trí CHỒNG GIỜ + quẹt 06:50–11:31
reset({ hrShifts: [CA_NGAY], hrAssignments: [nAssign('n2a'), nAssign('n2b', { start: '07:00', end: '11:30' })],
  hrCheckins: [checkin({ date: D14, in: '06:50', out: '11:31' })] });
const planN2 = hr.ciPlannedOf('e1', D14);
check('N2 bố trí GỘP khoảng trùng → 9h HC (trước đây cộng dồn thành 13h30)',
  planN2.hc === 540 && planN2.tc === 0);
const rN2 = hr.ciCompareDay('e1', D14);
check('N2b nửa buổi 06:50–11:31 → HC 4h30 · TC 0 (trước đây 4h31)',
  rN2.actual.hc === 270 && rN2.actual.tc === 0 && rN2.actual.outMin === 690);
reset({ hrShifts: [CA_NGAY], hrAssignments: [nAssign('n2c', { end: '09:30' }), nAssign('n2d', { id: 'n2d', start: '09:30' })] });
check('N2c 07:00–09:30 + 09:30–hết ca = 9h HC (đúng ví dụ người dùng)',
  hr.ciPlannedOf('e1', D14).hc === 540);

// ── N3: HÌNH 1 — cùng bố trí 17:30–19:30 (TC 2h), 2 người quẹt khác nhau
reset({ hrShifts: [CA_NGAY],
  hrEmployees: [
    { id: 'e1', code: 'QS00398', name: 'Lương Thị Mùng', department: 'Xưởng 2', status: 'active', skills: [] },
    { id: 'e2', code: 'QS00399', name: 'Phạm Thị Hoan', department: 'Xưởng 2', status: 'active', skills: [] }],
  hrAssignments: [
    nAssign('n3a', { employeeId: 'e1', date: D16, start: '17:30', end: '19:30' }),
    nAssign('n3b', { id: 'n3b', employeeId: 'e2', date: D16, start: '17:30', end: '19:30' })],
  hrCheckins: [
    checkin({ id: 'c1', employeeId: 'e1', date: D16, in: '06:47', out: '19:30' }),
    checkin({ id: 'c2', employeeId: 'e2', date: D16, in: '06:48', out: '17:30' })],
  hrAttendance: [
    { id: 'at1', employeeId: 'e1', date: D16, status: 'work', positions: [], note: '' },
    { id: 'at2', employeeId: 'e2', date: D16, status: 'work', positions: [], note: '' }] });
const rM = hr.ciCompareDay('e1', D16);
check('N3 quẹt 06:47–19:30 với bố trí 17:30–19:30 → HC 0 · TC 2h (Khớp)',
  rM.actual.hc === 0 && rM.actual.tc === 120 && rM.verdict === 'ok');
const rH = hr.ciCompareDay('e2', D16);
check('N3b quẹt 06:48–17:30 → 0 phút làm: HC 0 · TC 0 (KHÔNG còn "HC 9h · TC 13h30")',
  rH.actual.hc === 0 && rH.actual.tc === 0 && rH.actual.workedMin === 0);
check('N3c cờ zero_span + bất thường "quẹt dài hơn bố trí" (nghi thiếu vị trí bố trí)',
  rH.actual.flags.includes('zero_span') && rH.anomalies.includes('zero_span') && rH.anomalies.includes('punch_over_plan'));
check('N3d người quẹt cả ngày cũng được nhắc thiếu vị trí bố trí', rM.anomalies.includes('punch_over_plan'));
check('N3e thống kê + lọc "chỉ dòng bất thường"',
  (() => {
    const rows = hr.ciRowsForRange(D16, D16, {});
    return hr.ciSummaryOf(rows).bad === 2 &&
      hr.ciRowsForRange(D16, D16, { onlyAnomaly: true }).length === 2;
  })());

// ── N4: LÀM TRÒN MỐC 30' HAI ĐẦU (vào lên · ra xuống)
reset({ hrShifts: [CA_NGAY], hrAssignments: [nAssign('n4')],
  hrCheckins: [checkin({ date: D14, in: '12:31', out: '17:29' })] });
const rN4 = hr.ciCompareDay('e1', D14);
check('N4 12:31 → 13:00 và 17:29 → 17:00 (làm tròn mốc 30\' hai đầu)',
  rN4.actual.inMin === 780 && rN4.actual.outMin === 1020 && rN4.actual.hc === 240);

// ── N5: CẤU TRÚC (lọc bất thường + quy tắc mới trên giao diện)
check('N5 index có lọc "Chỉ dòng bất thường" + hint quy tắc làm tròn 30\'/nghỉ giữa ca',
  idxHtml.includes('id="hr-ci-only-anomaly"') && idxHtml.includes('làm tròn mốc 30') &&
  idxHtml.includes('GIỮA CA'));
check('N5b styles.css có dòng bất thường + chip cảnh báo',
  cssSrc.includes('.ci-row-bad') && cssSrc.includes('.ci-bad-hint') && cssSrc.includes('.hr-stat-chip.is-danger'));
check('N5c events nối lọc bất thường + hr.js có ciAnomalyOf',
  evSrc.includes("safeOn('hr-ci-only-anomaly', 'change'") &&
  hrSrc.includes('function ciAnomalyOf(') && hrSrc.includes('CI_ANOMALY_LABEL'));

console.log(`\nHR-CHECKIN-COMPARE: ${passed} PASS, ${failed} FAIL`);
if (failed > 0) process.exit(1);





