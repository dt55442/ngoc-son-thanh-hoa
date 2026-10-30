// tests/hr-ci-period-chip.test.mjs — KỲ NGÀY/TUẦN/THÁNG + CHÍP LỌC + NHẢY DÒNG
// (21/10/2026): 2 yêu cầu của người dùng cho thẻ "Đối Chiếu Bố Trí ↔ Máy Chấm Công":
//  ① Chọn kỳ theo NGÀY / TUẦN (ISO: Thứ 2 → Chủ nhật) / THÁNG
//  ② Bấm CHÍP thông tin = lọc nhóm + nhảy tới dòng đầu tiên + TÔ SÁNG
'use strict';

// ─── Stubs môi trường (giống tests/hr-payroll-lock.test.mjs) ─────────────
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
const read = (p) => fs.readFileSync(new URL(p, import.meta.url), 'utf8');

const { state } = await import('../js/state.js');
const hr = await import('../js/hr.js');

const UI_KEY = 'bamboo_tracker_hr_ci_ui_v1';
const MONTH = '2026-10';
const D1 = '2026-10-05';   // Thứ 2 (tuần ISO 41)
const D2 = '2026-10-06';   // Thứ 3 — cùng tuần 41
const D3 = '2026-10-14';   // Thứ 4 — tuần 42
const DS = '2026-09-30';   // Thứ 4 — tuần 40 (vắt sang tháng 10)

function setUi(patch) {
  let cur = {};
  try { cur = JSON.parse(localStorage.getItem(UI_KEY)) || {}; } catch (e) { cur = {}; }
  localStorage.setItem(UI_KEY, JSON.stringify(Object.assign({}, cur, patch || {})));
}
function reset(over) {
  state.currentUser = { username: 'admin', role: 'admin', fullname: 'Quản Trị', editTabs: [], payApply: true, payLock: true };
  state.hrEmployees = [
    { id: 'e1', code: 'NV01', name: 'Nguyễn Văn A', department: 'Xưởng 2', status: 'active', skills: [] },
    { id: 'e2', code: 'NV02', name: 'Trần Thị B', department: 'Xưởng 2', status: 'active', skills: [] },
    { id: 'e3', code: 'NV03', name: 'Lê Văn C', department: 'Xưởng 2', status: 'active', skills: [] }
  ];
  state.hrPositions = [{ id: 'p1', name: 'Cắt chọn', department: 'Xưởng 2' }];
  state.hrShifts = [];
  state.hrAssignments = [];
  state.hrAttendance = [];
  state.hrCheckins = [];
  state.hrLeaves = [];
  state.hrOvertimes = [];
  state.hrCiAcks = [];
  state.hrPayRows = [];
  state.hrPayLocks = [];
  state.hrWorkCalendar = {};
  Object.assign(state, over || {});
  ['hr-ci-search'].forEach(id => { document.getElementById(id).value = ''; });
  document.getElementById('hr-ci-only-issues').checked = true;
  document.getElementById('hr-ci-show-leave').checked = false;
  document.getElementById('hr-ci-only-anomaly').checked = false;
  localStorage.setItem(UI_KEY, JSON.stringify({ mode: 'month', month: MONTH }));
}
function asg(emp, date) {
  return { id: `a-${emp}-${date}`, employeeId: emp, date, department: 'Xưởng 2', positionId: 'p1', shiftIdx: 0, start: '07:00', end: '' };
}
function ci(emp, date, inT, outT) {
  return { id: `ci-${emp}-${date}`, employeeId: emp, date, in: inT, out: outT, punchTimes: [inT, outT].filter(Boolean), punches: outT ? 2 : 1 };
}

// ═══════════════ A. TUẦN ISO (Thứ 2 → Chủ nhật) ═══════════════
check('A1. 05/10/2026 là Thứ 2', new Date(D1 + 'T00:00:00').getDay() === 1);
check('A2. Tuần ISO của 05/10/2026 = tuần 41', hr.ciIsoWeekOf(D1).year === 2026 && hr.ciIsoWeekOf(D1).week === 41);
check('A3. Khoá tuần dạng YYYY-Www', hr.ciIsoWeekKey(D1) === '2026-W41');
check('A4. Tuần 41: Thứ 2 05/10 → Chủ nhật 11/10',
  (() => { const r = hr.ciIsoWeekRange('2026-W41'); return r.from === '2026-10-05' && r.to === '2026-10-11'; })());
check('A5. Tuần VẮT 2 THÁNG: W40 = 28/09 → 04/10',
  (() => { const r = hr.ciIsoWeekRange('2026-W40'); return r.from === '2026-09-28' && r.to === '2026-10-04'; })());
check('A6. Năm có 53 tuần: W53/2026 = 28/12/2026 → 03/01/2027',
  (() => { const r = hr.ciIsoWeekRange('2026-W53'); return r.from === '2026-12-28' && r.to === '2027-01-03'; })());
check('A7. Tuần không hợp lệ → rỗng (không ném lỗi)',
  (() => { const r = hr.ciIsoWeekRange('abc'); return r.from === '' && r.to === ''; })());

// ═══════════════ B. KHOẢNG NGÀY THEO CHẾ ĐỘ ═══════════════
reset();
setUi({ mode: 'day', day: D2 });
check('B1. Chế độ NGÀY: from = to = ngày chọn',
  (() => { const r = hr.ciRangeOf(); return r.from === D2 && r.to === D2 && r.mode === 'day'; })());
check('B2. Nhãn chế độ Ngày = dd/mm/yyyy', hr.ciRangeOf().label.indexOf('06/10/2026') !== -1);
setUi({ mode: 'week', week: '2026-W41', day: D1 });
check('B3. Chế độ TUẦN: Thứ 2 → Chủ nhật',
  (() => { const r = hr.ciRangeOf(); return r.from === '2026-10-05' && r.to === '2026-10-11' && r.mode === 'week'; })());
check('B4. Nhãn tuần ghi số tuần + khoảng ngày',
  (() => { const l = hr.ciRangeOf().label; return l.indexOf('Tuần 41') === 0 && l.indexOf('05/10/2026') !== -1 && l.indexOf('11/10/2026') !== -1; })());
setUi({ mode: 'month', month: MONTH });
check('B5. Chế độ THÁNG: trọn tháng',
  (() => { const r = hr.ciRangeOf(); return r.from === '2026-10-01' && r.to === '2026-10-31' && r.mode === 'month'; })());
check('B6. Không lưu gì → mặc định THÁNG (không đổi hành vi cũ)',
  (() => { localStorage.removeItem(UI_KEY); const ui = hr.ciReadUi(); return ui.mode === 'month'; })());
check('B7. Kỳ tuần vắt 2 tháng → ciMonthsOfRange trả CẢ 2 tháng',
  (() => { const ms = [...hr.ciMonthsOfRange(hr.ciIsoWeekRange('2026-W40'))].sort();
    return ms.length === 2 && ms[0] === '2026-09' && ms[1] === '2026-10'; })());

// ═══════════════ C. ĐỔI CHẾ ĐỘ + ‹ › + HÔM NAY ═══════════════
reset();
setUi({ mode: 'day', day: D2, month: MONTH });
check('C1. Sang chế độ TUẦN giữ ngày đang xem làm mốc',
  (() => { hr.ciSetPeriodMode('week');
    const ui = hr.ciReadUi(); return ui.mode === 'week' && ui.week === '2026-W41'; })());
check('C2. Sang chế độ THÁNG lấy tháng của ngày đang xem',
  (() => { hr.ciSetPeriodMode('month'); const ui = hr.ciReadUi(); return ui.mode === 'month' && ui.month === MONTH; })());
check('C3. Chế độ không hợp lệ bị bỏ qua', hr.ciSetPeriodMode('year') === false);
setUi({ mode: 'day', day: D1 });
hr.ciShiftPeriod(1);
check('C4. ‹ › ở chế độ NGÀY: +1 ngày', hr.ciReadUi().day === '2026-10-06');
setUi({ mode: 'week', week: '2026-W41', day: D1 });
hr.ciShiftPeriod(1);
check('C5. ‹ › ở chế độ TUẦN: +7 ngày → tuần 42',
  (() => { const ui = hr.ciReadUi(); return ui.week === '2026-W42' && ui.day === '2026-10-12'; })());
setUi({ mode: 'month', month: MONTH });
hr.ciShiftPeriod(1);
check('C6. ‹ › ở chế độ THÁNG: sang tháng 11', hr.ciReadUi().month === '2026-11');
hr.ciShiftPeriod(-2);
check('C7. ‹ › lùi 2 tháng: về tháng 9', hr.ciReadUi().month === '2026-09');
hr.ciGoToday();
check('C8. Hôm Nay → chế độ NGÀY đúng hôm nay',
  (() => { const ui = hr.ciReadUi(); const t = new Date();
    const iso = `${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}-${String(t.getDate()).padStart(2,'0')}`;
    return ui.mode === 'day' && ui.day === iso; })());
setUi({ mode: 'week', week: '2026-W41', day: D1 });
hr.ciOnDayInput('2026-10-14');
check('C9. Đổi ô Ngày ở chế độ TUẦN → nhảy sang tuần chứa ngày đó',
  (() => { const ui = hr.ciReadUi(); return ui.week === '2026-W42' && ui.day === '2026-10-14'; })());
setUi({ mode: 'month', month: MONTH });
hr.ciOnDayInput('2026-09-30');
check('C10. Đổi ô Ngày ở chế độ THÁNG → cập nhật tháng theo ngày', hr.ciReadUi().month === '2026-09');

// ═══════════════ D. PHẠM VI "ÁP DỤNG / XÓA" THEO KỲ ĐANG XEM ═══════════════
function seed3() {
  reset({
    hrAssignments: [asg('e1', D1), asg('e2', D2), asg('e1', DS)],
    hrCheckins: [ci('e1', D1, '07:00', '17:30'), ci('e2', D2, '07:00', '17:30'), ci('e1', DS, '07:00', '17:30')]
  });
}
seed3();
setUi({ mode: 'month', month: MONTH });
check('D1. Chế độ THÁNG: kế hoạch áp dụng đếm 2 ngày của tháng 10', hr.ciBulkPlanOf('apply').count === 2);
setUi({ mode: 'day', day: D1 });
check('D2. Chế độ NGÀY: chỉ đếm đúng ngày 05/10',
  (() => { const p = hr.ciBulkPlanOf('apply'); return p.count === 1 && p.range.from === D1 && p.range.to === D1; })());
check('D3. Chế độ NGÀY: nhãn kỳ trong modal đúng ngày', hr.ciBulkPlanOf('apply').range.label.indexOf('05/10/2026') !== -1);
hr.applyAllCheckins('theo ngày');
check('D4. Áp dụng ở chế độ NGÀY chỉ chấm 1 ngày',
  state.hrAttendance.length === 1 && state.hrAttendance[0].date === D1);
seed3();
setUi({ mode: 'week', week: '2026-W41', day: D1 });
check('D5. Chế độ TUẦN: đếm 2 ngày trong tuần 41', hr.ciBulkPlanOf('apply').count === 2);
check('D6. Tuần 41 KHÔNG tính ngày 30/09 (tuần 40)',
  (() => { const p = hr.ciBulkPlanOf('delete'); return p.count === 2; })());
hr.deleteCheckinsAll('xóa tuần');
check('D7. Xóa ở chế độ TUẦN chỉ xóa 2 bản ghi trong tuần, giữ 30/09',
  state.hrCheckins.length === 1 && state.hrCheckins[0].date === DS);
reset({
  hrAssignments: [asg('e1', DS), asg('e2', '2026-10-02')],
  hrCheckins: [ci('e1', DS, '07:00', '17:30'), ci('e2', '2026-10-02', '07:00', '17:30')]
});
setUi({ mode: 'week', week: '2026-W40', day: DS });
check('D8. Tuần VẮT 2 THÁNG đếm đúng ngày 30/09 + 02/10', hr.ciBulkPlanOf('apply').count === 2);
state.hrPayLocks = [{ id: 'paylock-2026-09', month: '2026-09', status: 'da_chot', approvedByName: 'GĐ' }];
check('D9. Tuần vắt 2 tháng: tháng 9 đã chốt → CHẶN thao tác',
  hr.applyAllCheckins('x') === false && (state.hrAttendance || []).length === 0);
check('D10. Modal bulk cảnh báo đúng tháng bị khóa',
  (() => { hr.openCiBulkModal('apply');
    const w = document.getElementById('ci-bulk-warn');
    const ok = w.hidden === false && w.textContent.indexOf('09/2026') !== -1;
    hr.closeCiBulkModal();
    return ok; })());

// ═══════════════ E. CHÍP LỌC + NHẢY + TÔ SÁNG ═══════════════
function seedChips() {
  reset({
    hrAssignments: [asg('e1', D1), asg('e2', D1), asg('e3', D1)],
    hrCheckins: [ci('e1', D1, '07:30', '17:30'), ci('e2', D1, '07:00', '17:30')],
    hrAttendance: [
      { id: 'att-e1', employeeId: 'e1', date: D1, status: 'work' },
      { id: 'att-e2', employeeId: 'e2', date: D1, status: 'work' }
    ]
  });
  setUi({ mode: 'day', day: D1, onlyIssues: false });
  document.getElementById('hr-ci-only-issues').checked = false;
}
seedChips();
const rowsAll = hr.ciRowsForRange(D1, D1, { onlyIssues: false, onlyAnomaly: false });
const sumAll = hr.ciSummaryOf(rowsAll);
check('E1. Dữ liệu mẫu: 1 đi muộn + 1 khớp + 1 không quẹt máy',
  rowsAll.length === 3 && sumAll.late === 1 && sumAll.ok >= 1 && sumAll.noPunch === 1);
check('E2. Chíp sinh đủ data-ci-chip (Tổng + nhóm có số)',
  (() => { const html = hr.ciChipsHtml(sumAll, rowsAll.length, { chip: '' });
    return html.indexOf('data-ci-chip="all"') !== -1 && html.indexOf('data-ci-chip="late"') !== -1 &&
      html.indexOf('data-ci-chip="noPunch"') !== -1 && html.indexOf('is-active') !== -1; })());
hr.ciOnChipClick('late');
const uiLate = hr.ciReadUi();
const bodyLate = document.getElementById('hr-ci-body').innerHTML;
check('E3. Bấm chíp "Đi muộn" → lưu chip + tự bỏ tick cần xác nhận',
  uiLate.chip === 'late' && uiLate.onlyIssues === false);
check('E4. Bảng chỉ còn dòng đi muộn + TÔ SÁNG dòng đầu + có data-ci-row',
  bodyLate.indexOf('Nguyễn Văn A') !== -1 && bodyLate.indexOf('Trần Thị B') === -1 &&
  bodyLate.indexOf('ci-row-flash') !== -1 && bodyLate.indexOf('data-ci-row="e1|' + D1 + '"') !== -1);
check('E5. Chíp đang chọn có is-active + aria-pressed=true',
  (() => { const html = document.getElementById('hr-ci-chips').innerHTML;
    return /data-ci-chip="late"[^>]*aria-pressed="true"/.test(html) || /aria-pressed="true"[^>]*data-ci-chip="late"/.test(html); })());
check('E6. Dải chíp vẫn đếm theo KỲ (Tổng 3, không co lại theo lọc)',
  document.getElementById('hr-ci-chips').innerHTML.indexOf('Tổng: <strong>3</strong>') !== -1);
check('E7. Tiêu đề đếm ghi đang lọc nhóm nào',
  document.getElementById('hr-ci-count').textContent.indexOf('đang lọc: Đi muộn') !== -1);
hr.ciOnChipClick('late');
check('E8. Bấm lại chíp đang chọn → BỎ lọc + trả lại "chỉ dòng cần xác nhận"',
  (() => { const ui = hr.ciReadUi(); return ui.chip === '' && ui.onlyIssues === true; })());
hr.ciOnChipClick('noPunch');
check('E9. Chíp "Không quẹt máy" lọc đúng dòng có bố trí nhưng không quẹt',
  document.getElementById('hr-ci-body').innerHTML.indexOf('Lê Văn C') !== -1 &&
  document.getElementById('hr-ci-body').innerHTML.indexOf('Nguyễn Văn A') === -1);
hr.ciOnChipClick('all');
check('E10. Chíp "Tổng" = bỏ lọc chip', hr.ciReadUi().chip === '');
check('E11. ciChipCountOf + ciChipLabelOf đúng',
  hr.ciChipCountOf('late', sumAll) === 1 && hr.ciChipLabelOf('noPunch') === 'Không quẹt máy');
check('E12. Nhóm không có dòng → chíp ẩn (không hiện số 0)',
  hr.ciChipsHtml({ ok: 0, review: 0, bad: 0, late: 1, early: 0, noOut: 0, noIn: 0, nightOut: 0, noPunch: 0, noPlan: 0, leavePunch: 0, absent: 0, otDiff: 0 }, 3, { chip: '' }).indexOf('Về sớm') === -1);
check('E13. ciScrollToFirstRow không ném lỗi khi thiếu DOM thật', typeof hr.ciScrollToFirstRow() === 'boolean');
check('E14. Lọc chíp không có kết quả → thông báo đúng nhóm',
  (() => {
    reset({
      hrAssignments: [asg('e2', D3)],
      hrCheckins: [ci('e2', D3, '07:00', '17:30')],
      hrAttendance: [{ id: 'att-e2-d3', employeeId: 'e2', date: D3, status: 'work' }]
    });
    setUi({ mode: 'day', day: D3 });
    hr.ciOnChipClick('late');
    const html = document.getElementById('hr-ci-body').innerHTML;
    const ok = html.indexOf('Không có dòng nào thuộc nhóm') !== -1;
    hr.ciOnChipClick('all');
    return ok;
  })());

// ═══════════════ F. CẤU TRÚC + ĐIỀU HƯỚNG NGƯỢC ═══════════════
const idxHtml = read('../index.html');
const hrSrc = read('../js/hr.js');
const evSrc = read('../js/events.js');
const cssSrc = read('../styles.css');
const swSrc = read('../sw.js');
const stateSrc = read('../js/state.js');

check('F1. index có 3 nút chế độ + ô ngày + nút Hôm Nay + nhãn kỳ',
  (idxHtml.match(/data-ci-mode=/g) || []).length === 3 && idxHtml.includes('id="hr-ci-day"') &&
  idxHtml.includes('id="btn-ci-today"') && idxHtml.includes('id="hr-ci-period-label"'));
check('F2. Ô Ngày/Tháng mặc định ẩn (JS bật theo chế độ)',
  /id="hr-ci-day"[^>]*hidden/.test(idxHtml) && /id="hr-ci-month"[^>]*hidden/.test(idxHtml));
check('F3. events nối đủ chế độ + chíp + hôm nay + ‹ ›',
  evSrc.includes("safeOn('hr-ci-day', 'change'") && evSrc.includes("safeOn('btn-ci-today', 'click', ciGoToday)") &&
  evSrc.includes('ciShiftPeriod(-1)') && evSrc.includes('ciShiftPeriod(1)') &&
  evSrc.includes("closest('[data-ci-mode]')") && evSrc.includes("closest('[data-ci-chip]')"));
check('F4. events nối điều hướng ngược (ngày / tên NV / giờ máy)',
  evSrc.includes("closest('[data-ci-goto-day]')") && evSrc.includes("[data-ci-emp].ci-cell-link"));
check('F5. CSS có thanh chế độ + chíp active + hiệu ứng tô sáng',
  cssSrc.includes('.ci-period-btn') && cssSrc.includes('.ci-period-label') &&
  cssSrc.includes('.hr-stat-chip.ci-chip') && cssSrc.includes('@keyframes ciFlash') &&
  cssSrc.includes('tr.ci-row-flash > td'));
check('F6. CSS có link bấm được trong ô (Ngày / tên NV)', cssSrc.includes('.ci-cell-link'));
check('F7. Bảng vẫn 8 cột (không thêm cột gây tràn ngang)',
  (() => { const seg = idxHtml.slice(idxHtml.indexOf('id="hr-ci-table"'), idxHtml.indexOf('id="hr-ci-body"'));
    return (seg.match(/<th[\s>]/g) || []).length === 8; })());
check('F8. Dòng có data-ci-row + ô Ngày/Tên bấm được + giờ máy mở Xử lý',
  hrSrc.includes('data-ci-row="${escapeHTML(key)}"') &&
  hrSrc.includes('data-ci-goto-day=') && hrSrc.includes('data-ci-emp="${escapeHTML(r.employeeId)}"') &&
  hrSrc.includes('data-ci-open-pay="1"'));
check('F9. Chip là BUTTON (không còn span tĩnh) + có aria-pressed',
  hrSrc.includes('data-ci-chip="${d.key}"') && hrSrc.includes('aria-pressed='));
check('F10. Cache + APP_VERSION = v313',
  swSrc.includes("nha-may-ngoc-son-v318") && stateSrc.includes("'v318'"));
check('F11. Modal bulk ghi rõ KỲ (ngày/tuần/tháng) chứ không chỉ tháng',
  idxHtml.includes('KỲ đang xem') && hrSrc.includes('plan.range && plan.range.label'));

console.log(`\nCI-PERIOD-CHIP: ${passed} PASS, ${failed} FAIL`);
if (failed) process.exitCode = 1;
