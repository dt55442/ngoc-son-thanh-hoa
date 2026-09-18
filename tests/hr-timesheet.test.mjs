// tests/hr-timesheet.test.mjs — Kiểm thử LỊCH LÀM VIỆC THEO THÁNG (ngày nghỉ/lễ)
// + BẢNG CHẤM CÔNG THEO THÁNG (HC/TC) trong modal Xuất Nhân Sự (tab Nhân Sự).
// Quy tắc: đi làm vào ngày nghỉ/lễ → TOÀN BỘ giờ làm (theo cửa sổ ca chuẩn của
// bộ phận, đã trừ nghỉ trưa) được tính vào TC; không làm → 'NL' (nghỉ/lễ riêng)
// hoặc '-' (nghỉ định kỳ theo thứ, mặc định Chủ nhật).
'use strict';

// ─── Stubs môi trường (giống export-hr-qc.test.mjs) ────────────────
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
    focus(){}, click(){}, animate(){ return { cancel(){} }; }
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

let passed = 0, failed = 0;
function check(name, cond) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.error('FAIL ' + name); }
}

// ─── IMPORT MODULES (sau khi stub xong) ───────────────────────────
const { state, STORAGE_KEY_HR_CALENDAR } = await import('../js/state.js');
const hr = await import('../js/hr.js');
const cloud = await import('../js/cloud.js');
const xlsxMod = await import('../js/export-xlsx.js');

state.currentUser = { username: 'admin', role: 'admin', editTabs: ['hr'], allowAdvanced: true };

// ─── XLSX GHÉP ĐỂ BẮT FILE ────────────────────────────────────────
let writtenFiles = [];
let lastSheetAoa = null;
let lastSheetName = '';
global.XLSX = {
  utils: {
    book_new: () => ({ sheets: [] }),
    aoa_to_sheet: (aoa) => ({ aoa }),
    encode_cell: ({ r, c }) => String.fromCharCode(65 + c) + (r + 1),
    book_append_sheet: (wb, ws, name) => { wb.sheets.push({ name, aoa: ws.aoa }); lastSheetAoa = ws.aoa; lastSheetName = name; }
  },
  writeFile: (wb, filename) => { writtenFiles.push({ filename, wb }); },
  write: () => new ArrayBuffer(8)
};

const ev = { preventDefault(){} };
function setVal(id, v) { const el = document.getElementById(id); el.value = v; return el; }

// ─── DỮ LIỆU GIẢ ──────────────────────────────────────────────
// Tháng 09/2026: 01/09 = Thứ Ba → Chủ nhật = 06, 13, 20, 27.
// Ca mặc định Xưởng 2 = hành chính (07:00–17:30, nghỉ trưa 11:30–13:00 → 9h HC).
state.hrEmployees = [
  { id: 'e1', code: 'NV01', name: 'Hà Thị Bích',    department: 'Xưởng 2', title: 'TT', position: 'Tổ trưởng', status: 'active', skills: [] },
  { id: 'e2', code: 'NV02', name: 'Phạm Thị Quyên', department: 'Xưởng 2', title: 'CN', position: 'Công nhân', status: 'active', skills: [] }
];
state.hrWorkCalendar = { '2026-09': { weekdaysOff: [0], restDays: ['2026-09-02'] } };
state.hrAssignments = [
  // e1 ngày thường 03/09 (T4): 07:00–19:00 -> HC 9h + TC 1h30
  { id: 'a1', date: '2026-09-03', department: 'Xưởng 2', positionId: '', employeeId: 'e1', start: '07:00', end: '19:00', shiftIdx: 0 },
  // e1 Chủ nhật 06/09: đi làm đủ ca -> toàn bộ giờ thành TC (9h theo cửa sổ ca)
  { id: 'a2', date: '2026-09-06', department: 'Xưởng 2', positionId: '', employeeId: 'e1', start: '07:00', end: '19:00', shiftIdx: 0 },
  // e2 ngày lễ 02/09: đi làm đủ ngày -> toàn bộ giờ thành TC (9h)
  { id: 'a3', date: '2026-09-02', department: 'Xưởng 2', positionId: '', employeeId: 'e2', start: '07:00', end: '17:30', shiftIdx: 0 }
];

// ─── A. LỊCH LÀM VIỆC THEO THÁNG ──────────────────────────────
check('LỊCH: Chủ nhật 06/09 là ngày nghỉ theo thứ', hr.hrDayKindOf('2026-09-06') === 'off');
check('LỊCH: 02/09 là ngày nghỉ/lễ riêng', hr.hrDayKindOf('2026-09-02') === 'holiday');
check('LỊCH: 03/09 là ngày làm việc', hr.hrDayKindOf('2026-09-03') === 'work');
check('LỊCH: tháng chưa cài lịch -> CN vẫn nghỉ mặc định', hr.hrDayKindOf('2025-01-05') === 'off');
check('LỊCH: hrIsRestDay phủ cả nghỉ theo thứ & lễ', hr.hrIsRestDay('2026-09-06') && hr.hrIsRestDay('2026-09-02') && !hr.hrIsRestDay('2026-09-03'));

// ─── B. TÁCH GIỜ HC/TC CÓ XÉT LỊCH ────────────────────────────
const r1 = hr.hrSplitHoursHCDate('Xưởng 2', '2026-09-03', '07:00', '19:00', 0);
check('SPLIT: ngày thường 07:00–19:00 -> HC 540, TC 90', r1.hc === 540 && r1.tc === 90);
const r2 = hr.hrSplitHoursHCDate('Xưởng 2', '2026-09-06', '07:00', '19:00', 0);
check('SPLIT: Chủ nhật đi làm -> HC 0, toàn bộ TC 630', r2.hc === 0 && r2.tc === 630);
const r3 = hr.hrSplitHoursHCDate('Xưởng 2', '2026-09-02', '07:00', '17:30', 0);
check('SPLIT: ngày lễ đi làm đủ ngày -> HC 0, TC 540', r3.hc === 0 && r3.tc === 540);
check('OT: giờ tăng ca thực tế ngày CN = 630 phút', hr.overtimeActualMin({ employeeId: 'e1', date: '2026-09-06' }) === 630);
check('OT: giờ tăng ca thực tế ngày lễ = 540 phút', hr.overtimeActualMin({ employeeId: 'e2', date: '2026-09-02' }) === 540);

// ─── C. MODAL LỊCH (draft + render grid) ──────────────────────
hr.hrCalSetMonth('2026-09');
let gridHtml = document.getElementById('hr-calendar-grid').innerHTML;
check('LỊCH: grid đủ 30 ngày', gridHtml.includes('data-cal-day="2026-09-02"') && gridHtml.includes('data-cal-day="2026-09-30"'));
check('LỊCH: ô 02/09 tô nghỉ/lễ riêng', gridHtml.includes('hr-cal-holiday'));
hr.hrCalToggleDay('2026-09-02');
check('LỊCH: bấm ô lễ -> bỏ đánh dấu', !document.getElementById('hr-calendar-grid').innerHTML.includes('hr-cal-holiday'));
hr.hrCalToggleDay('2026-09-05');
check('LỊCH: bấm ngày thường -> thành nghỉ/lễ', document.getElementById('hr-calendar-grid').innerHTML.includes('hr-cal-holiday'));
hr.hrCalToggleDay('2026-09-05'); // trả lại như cũ (draft)
hr.hrCalToggleDay('2026-09-02'); // trả lại lễ 02/09 (draft)
check('LỊCH: nút nghỉ theo thứ hiện đủ 7 thứ', document.getElementById('hr-calendar-weekdays').innerHTML.includes('data-cal-wd="0"') && document.getElementById('hr-calendar-weekdays').innerHTML.includes('data-cal-wd="6"'));

// Lưu lịch tháng 10 qua form submit
hr.hrCalSetMonth('2026-10');
hr.hrCalToggleDay('2026-10-01');
hr.handleHrCalendarSubmit(ev);
check('LỊCH: submit lưu tháng 10 vào state', state.hrWorkCalendar['2026-10'].restDays.includes('2026-10-01'));
check('LỊCH: submit ghi localStorage (bamboo_tracker_hr_calendar_v1)',
  !!JSON.parse(storeBacking.get(STORAGE_KEY_HR_CALENDAR) || '{}')['2026-10']);

// ─── D. BẢNG CHẤM CÔNG THEO THÁNG (XUẤT EXCEL) ────────────────
setVal('export-hr-card', 'hr-timesheet'); setVal('export-hr-dept', 'Xưởng 2'); setVal('export-hr-month', '2026-09');
xlsxMod.syncHrXlsxCardUI();
check('TS: chọn Bảng Chấm Công Tháng -> hiện ô Tháng, ẩn ô Ngày',
  document.getElementById('export-hr-month-row').style.display === '' &&
  document.getElementById('export-hr-date-row').style.display === 'none');
const d = xlsxMod.buildHrXlsxExportData();
check('TS: dựng được dữ liệu xuất', !!d && Array.isArray(d.aoa));
check('TS: tiêu đề "BẢNG CHẤM CÔNG BỘ PHẬN XƯỞNG 2"', d.aoa[0][0] === 'BẢNG CHẤM CÔNG BỘ PHẬN XƯỞNG 2');
check('TS: dòng "Tháng 9 năm 2026"', d.aoa[1][0] === 'Tháng 9 năm 2026');
check('TS: ghi chú Khối/xưởng', d.aoa[3].includes('Khối/xưởng : Xưởng 2'));
check('TS: header có Họ tên / Chức vụ / Công', d.aoa[6][0] === 'Họ tên' && d.aoa[6][1] === 'Chức vụ' && d.aoa[6][2] === 'Công');
check('TS: dòng thứ có CN', d.aoa[7].includes('CN'));
check('TS: cột tổng có "Ngày Công"', d.aoa[5].includes('Ngày Công'));

const rHc = d.aoa.find(r => r[0] === 'Hà Thị Bích');
const rTc = d.aoa[d.aoa.indexOf(rHc) + 1];
check('TS: mỗi nhân viên 2 dòng HC/TC', !!rHc && rHc[2] === 'HC' && rTc[2] === 'TC');
check('TS: chức vụ lấy từ hồ sơ (TT)', rHc[1] === 'TT');
check('TS: HC ngày 03 = 9', rHc[5] === 9);
check('TS: TC ngày 03 = 1.5', rTc[5] === 1.5);
check('TS: CN 06 đi làm -> HC trống, TC 10.5', (rHc[8] === '' || rHc[8] === undefined) && rTc[8] === 10.5);
check('TS: ngày lễ 02 không làm -> "NL"', rHc[4] === 'NL');

const r2Hc = d.aoa.find(r => r[0] === 'Phạm Thị Quyên');
const r2Tc = d.aoa[d.aoa.indexOf(r2Hc) + 1];
check('TS: ngày lễ 02 đi làm -> HC trống, TC 9', (r2Hc[4] === '' || r2Hc[4] === undefined) && r2Tc[4] === 9);
check('TS: CN 06 không làm -> HC "-", TC trống', r2Hc[8] === '-' && (r2Tc[8] === '' || r2Tc[8] === undefined));
check('TS: Ngày Công e1 = 2 (03 + 06)', rHc[33] === 2);
check('TS: Giờ HC e1 = 9', rHc[34] === 9);
check('TS: Giờ TC e1 = 12', rHc[35] === 12);

const rTot = d.aoa.find(r => r[0] === 'TỔNG CỘNG');
check('TS: có dòng TỔNG CỘNG', !!rTot);
check('TS: tổng Giờ TC = 21 (12 + 9)', rTot[35] === 21);
check('TS: fills tô cột Chủ nhật (xanh) & lễ (vàng)', d.fills['5,8'] === 'DDEBF7' && d.fills['5,4'] === 'FFF2CC');
check('TS: fills tô vùng dữ liệu cột nghỉ', d.fills['8,8'] === 'DDEBF7' && d.fills['8,4'] === 'FFF2CC');
check('TS: định dạng số 1 chữ số lẻ (9.0)', d.zCells['8,5'] === '0.0');
check('TS: gộp ô tên 2 dòng', d.merges.some(m => m.s.r === 8 && m.s.c === 0 && m.e.r === 9 && m.e.c === 0));

writtenFiles = [];
xlsxMod.handleHrXlsxExportSubmit(ev);
check('TS: xuất được file NhanSu_ChamCongThang_2026-09_*', /NhanSu_ChamCongThang_2026-09_/.test(writtenFiles[0]?.filename || ''));
check('TS: sheet "Chấm Công Tháng"', lastSheetName === 'Chấm Công Tháng');

// ─── D2. TẮT NGHỊ ĐỊNH KỲ / NGÀY LÀM BÙ THEO TỪNG NGÀY ───────
// Chu kỳ bấm ô lịch: nghỉ theo thứ → LÀM BÙ → (bấm nữa) nghỉ theo thứ
hr.hrCalSetMonth('2026-09');
hr.hrCalToggleDay('2026-09-06');   // Chủ nhật đang nghỉ theo thứ -> làm bù
check('BÙ: bấm ô Chủ nhật -> thành ngày làm bù (xanh lá)',
  document.getElementById('hr-calendar-grid').innerHTML.includes('hr-cal-workday'));
hr.hrCalToggleDay('2026-09-06');   // bấm lần nữa -> trả lại nghỉ theo thứ
check('BÙ: bấm lần nữa -> trả lại nghỉ theo thứ',
  document.getElementById('hr-calendar-grid').innerHTML.includes('hr-cal-off') &&
  !document.getElementById('hr-calendar-grid').innerHTML.includes('hr-cal-workday'));
hr.hrCalToggleDay('2026-09-06');   // làm bù 06/09 rồi LƯU
hr.handleHrCalendarSubmit(ev);
check('BÙ: lưu workDays vào state', Array.isArray(state.hrWorkCalendar['2026-09'].workDays) &&
  state.hrWorkCalendar['2026-09'].workDays.includes('2026-09-06'));
check('BÙ: Chủ nhật 06/09 làm bù -> là ngày làm việc', hr.hrDayKindOf('2026-09-06') === 'work' && !hr.hrIsRestDay('2026-09-06'));
check('BÙ: Chủ nhật khác (13/09) vẫn nghỉ theo thứ', hr.hrDayKindOf('2026-09-13') === 'off');

// Xuất lại bảng chấm công — ngày làm bù tính giờ như ngày làm việc bình thường
setVal('export-hr-card', 'hr-timesheet'); setVal('export-hr-dept', 'Xưởng 2'); setVal('export-hr-month', '2026-09');
const d2 = xlsxMod.buildHrXlsxExportData();
const rHc2 = d2.aoa.find(r => r[0] === 'Hà Thị Bích');
const rTc2 = d2.aoa[d2.aoa.indexOf(rHc2) + 1];
check('BÙ: bảng chấm công — CN 06 làm bù -> HC 9 + TC 1.5 (không còn TC 10.5)', rHc2[8] === 9 && rTc2[8] === 1.5);
check('BÙ: cột làm bù không còn tô màu nghỉ', d2.fills['5,8'] === undefined);
check('BÙ: Chủ nhật 13/09 (không làm bù) vẫn tô màu nghỉ', d2.fills['5,15'] === 'DDEBF7');

// TẮT HẲN nghỉ định kỳ Chủ nhật của tháng 12 (bấm tắt nút CN)
hr.hrCalSetMonth('2026-12');
hr.hrCalToggleWeekday(0);
hr.handleHrCalendarSubmit(ev);
check('TẮT CN: weekdaysOff lưu rỗng', Array.isArray(state.hrWorkCalendar['2026-12'].weekdaysOff) &&
  state.hrWorkCalendar['2026-12'].weekdaysOff.length === 0);
check('TẮT CN: Chủ nhật 06/12 thành ngày làm việc', hr.hrDayKindOf('2026-12-06') === 'work' && !hr.hrIsRestDay('2026-12-06'));

// ─── E. ĐỒNG BỘ MÂY ───────────────────────────────────────────
const snap = cloud.collectCloudSnapshot();
check('Cloud: snapshot chứa hrWorkCalendar', !!snap.hrWorkCalendar && Array.isArray(snap.hrWorkCalendar['2026-09'].restDays));
check('Cloud: cloudCore có khóa hrWorkCalendar', cloud.cloudCore(snap).includes('"hrWorkCalendar"'));
cloud.applyFireSnapshot({ hrWorkCalendar: { '2026-11': { weekdaysOff: [0], restDays: ['2026-11-20'] } } });
check('Cloud: applyFireSnapshot nhận lịch từ mây', hr.hrDayKindOf('2026-11-20') === 'holiday');
check('Cloud: dữ liệu mây lưu localStorage', !!JSON.parse(storeBacking.get(STORAGE_KEY_HR_CALENDAR) || '{}')['2026-11']);

// ─── KẾT LUẬN ────────────────────────────────────────────────
console.log('───────────────────────────');
console.log(`HR-TIMESHEET: ${passed} PASS, ${failed} FAIL`);
if (failed > 0) process.exit(1);
