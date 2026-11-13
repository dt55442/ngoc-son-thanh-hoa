// tests/hr-shift-schedule.test.mjs — CÀI ĐẶT CA THEO MỐC HIỆU LỰC (11/2026)
// Xử lý tình huống "lãnh đạo đổi giờ làm việc giữa kỳ":
//  • hrShiftCfg(dept, date) chọn cấu hình có hiệu lực tại ngày — quá khứ giữ
//    nguyên số liệu, hôm nay/tương lai dùng bản mới.
//  • hrShiftApplyVersion lưu bản cũ vào versions (mốc hiệu lực riêng).
//  • migrateShiftEffectiveDates di trú dữ liệu cũ (idempotent).
//  • Giờ nghỉ: mặc định GIỮA CA (số giờ) + tuỳ chọn GIỜ CỤ THỂ trên giao diện.
//  • handleShiftSubmit: đọc form (DOM stub) → validate → lưu theo mốc hiệu lực.
'use strict';

// ─── Stubs môi trường (giống hr-shift-break.test.mjs) ─────────────────
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
    getContext: () => ({ measureText: () => ({ width: 10 }), createLinearGradient: () => ({ addColorStop(){} }), drawImage(){} }),
    getBoundingClientRect: () => ({ top: 0, left: 0, right: 800, bottom: 600, width: 800, height: 600 }),
    reset(){}, focus(){}, click(){}
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
  addEventListener(){}, removeEventListener(){}
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
global.Chart = class { constructor(ctx, cfg) { this.ctx = ctx; this.config = cfg; } update(){} resize(){} destroy(){} };
Chart.register = () => {};

const fs = await import('fs');
const { state, STORAGE_KEY_HR_SHIFTS, STORAGE_KEY_HR_ASSIGN } = await import('../js/state.js');
const hr = await import('../js/hr.js');
let pass = 0, fail = 0;
const check = (name, ok) => { if (ok) { pass++; console.log('PASS —', name); } else { fail++; console.log('FAIL —', name); } };

state.currentUser = { username: 'admin', role: 'admin', fullname: 'Quản Trị', editTabs: [], allowAdvanced: true };
state.hrWorkCalendar = {};
state.hrEmployees = []; state.hrPositions = []; state.hrShifts = [];
state.hrAssignments = [{ id: 'asg-1', date: '2026-10-20', department: 'Xưởng 2', positionId: 'p1', shiftIdx: 0, employeeId: 'e1', start: '07:00', end: '' }];
state.hrAttendance = []; state.hrCheckins = []; state.hrLeaves = [];
state.hrOvertimes = []; state.hrCiAcks = []; state.hrPayRows = []; state.hrPayLocks = [];
state.hrRecruitment = []; state.hrPositionNeeds = [];

// ─── DOM giả cho form Cài Đặt Ca ─────────────────────────────────────
// rows = [[i, field, value], ...] · trả về hàm khôi phục
function patchShiftForm(type, rows) {
  const origQ = global.document.querySelector.bind(global.document);
  const origQA = global.document.querySelectorAll.bind(global.document);
  const fakeInputs = rows.map(([i, f, v]) => ({
    value: v,
    getAttribute: (name) => (name === 'data-shift-i' ? String(i) : name === 'data-shift-f' ? f : null)
  }));
  global.document.querySelector = (sel) => sel.includes('shift-type') ? { value: type } : origQ(sel);
  global.document.querySelectorAll = (sel) => sel.includes('data-shift-i') ? fakeInputs : origQA(sel);
  const boxEl = document.getElementById('shift-rows');
  boxEl.querySelectorAll = (sel) => sel.includes('data-shift-i') ? fakeInputs : [];
  document.getElementById('shift-dept').value = 'Xưởng 2';
  document.getElementById('shift-effective').value = '';
  return () => {
    global.document.querySelector = origQ;
    global.document.querySelectorAll = origQA;
  };
}
function submit(type, rows, eff) {
  const restore = patchShiftForm(type, rows);
  document.getElementById('shift-effective').value = eff || '';
  try { hr.handleShiftSubmit({ preventDefault() {} }); } finally { restore(); }
}
const H = (dept, s, e, idx, date) => hr.hrSplitHoursHC(dept, s, e, idx, date);
const eq = (r, hc, tc) => r.hc === hc && r.tc === tc;

// ═══ A. ĐỌC FORM (hrShiftRowsFromDom) ══════════════════════════════════
check('A1: Làm ca 2 dòng hợp lệ → 2 ca + mặc định nghỉ 1.5/1', (() => {
  const restore = patchShiftForm('lamca', [
    [0, 'name', 'Ca ngày'], [0, 'start', '07:00'], [0, 'end', '19:00'], [0, 'brk', ''], [0, 'brkMode', 'auto'], [0, 'brkStart', ''], [0, 'brkEnd', ''],
    [1, 'name', 'Ca đêm'], [1, 'start', '19:00'], [1, 'end', '07:00'], [1, 'brk', ''], [1, 'brkMode', 'auto'], [1, 'brkStart', ''], [1, 'brkEnd', '']
  ]);
  const r = hr.hrShiftRowsFromDom('lamca');
  restore();
  return r.error === '' && r.shifts.length === 2 && r.shifts[0].brk === 1.5 && r.shifts[1].brk === 1;
})());
check('A2: Giờ cụ thể → giữ brkStart/brkEnd + brk suy ra', (() => {
  const restore = patchShiftForm('lamca', [
    [0, 'name', 'Ca ngày'], [0, 'start', '07:00'], [0, 'end', '17:30'],
    [0, 'brk', '1.5'], [0, 'brkMode', 'exact'], [0, 'brkStart', '11:30'], [0, 'brkEnd', '13:00']
  ]);
  const r = hr.hrShiftRowsFromDom('lamca');
  restore();
  return r.error === '' && r.shifts.length === 1 && r.shifts[0].brkMode === 'exact' && r.shifts[0].brkStart === '11:30' && r.shifts[0].brkEnd === '13:00' && r.shifts[0].brk === 1.5;
})());
check('A3: giờ kết thúc TRÙNG giờ bắt đầu → báo lỗi rõ ràng', (() => {
  const restore = patchShiftForm('lamca', [[0, 'name', 'C'], [0, 'start', '07:00'], [0, 'end', '07:00'], [0, 'brk', '1.5'], [0, 'brkMode', 'auto'], [0, 'brkStart', ''], [0, 'brkEnd', '']]);
  const r = hr.hrShiftRowsFromDom('lamca');
  restore();
  return r.shifts.length === 0 && r.error.includes('phải khác giờ bắt đầu');
})());
check('A4: giờ không đúng HH:MM → báo lỗi', (() => {
  const restore = patchShiftForm('lamca', [[0, 'name', 'C'], [0, 'start', '7h00'], [0, 'end', '17:30'], [0, 'brk', '1'], [0, 'brkMode', 'auto'], [0, 'brkStart', ''], [0, 'brkEnd', '']]);
  const r = hr.hrShiftRowsFromDom('lamca');
  restore();
  return r.shifts.length === 0 && r.error.includes('HH:MM');
})());
check('A5: chọn Giờ cụ thể nhưng thiếu 1 mốc → báo lỗi', (() => {
  const restore = patchShiftForm('lamca', [[0, 'name', 'C'], [0, 'start', '07:00'], [0, 'end', '17:30'], [0, 'brk', '1.5'], [0, 'brkMode', 'exact'], [0, 'brkStart', '11:30'], [0, 'brkEnd', '']]);
  const r = hr.hrShiftRowsFromDom('lamca');
  restore();
  return r.shifts.length === 0 && r.error.includes('Giờ cụ thể');
})());
check('A6: giờ nghỉ cụ thể dài quá 3 giờ → báo lỗi', (() => {
  const restore = patchShiftForm('lamca', [[0, 'name', 'C'], [0, 'start', '07:00'], [0, 'end', '19:00'], [0, 'brk', '1.5'], [0, 'brkMode', 'exact'], [0, 'brkStart', '10:00'], [0, 'brkEnd', '14:30']]);
  const r = hr.hrShiftRowsFromDom('lamca');
  restore();
  return r.shifts.length === 0 && r.error.includes('3 giờ');
})());
check('A7: Hành chính → brk = 0, không cần ô nghỉ', (() => {
  const restore = patchShiftForm('hanhchinh', [
    [0, 'name', 'Sáng'], [0, 'start', '07:00'], [0, 'end', '11:30'],
    [1, 'name', 'Chiều'], [1, 'start', '13:00'], [1, 'end', '17:30']
  ]);
  const r = hr.hrShiftRowsFromDom('hanhchinh');
  restore();
  return r.error === '' && r.shifts.length === 2 && r.shifts[0].brk === 0 && r.shifts[0].start === '07:00';
})());

// A8: XEM TRƯỚC dùng cfg TẠM THỜI của dòng đang nhập (không tra state) — ca đêm 20:00–06:00 nghỉ 1h = 9h HC
check('A8: ca đêm 20:00–06:00 nghỉ 1h qua cfgIn = 9h HC · 0 TC (không phải tăng ca)', (() => {
  const cfg = { type: 'lamca', shifts: [{ name: 'Ca đêm', start: '20:00', end: '06:00', brk: 1 }] };
  const rng = hr.hrShiftRange(cfg, 0);
  const r = hr.hrSplitHoursHCMin('Xưởng 2', rng.startMin, rng.endMin, 0, null, cfg);
  return r.hc === 540 && r.tc === 0;
})());
check('A9: cfgIn ca ngày 07:00–17:00 nghỉ 1h30 = 8h30 HC (đúng form đang nhập)', (() => {
  const cfg = { type: 'lamca', shifts: [{ name: 'Ca ngày', start: '07:00', end: '17:00', brk: 1.5 }] };
  const rng = hr.hrShiftRange(cfg, 0);
  const r = hr.hrSplitHoursHCMin('Xưởng 2', rng.startMin, rng.endMin, 0, null, cfg);
  return r.hc === 510 && r.tc === 0;
})());
check('A10: cfgIn giờ nghỉ CỤ THỂ ca đêm (00:30–01:30) = 9h HC', (() => {
  const cfg = { type: 'lamca', shifts: [{ name: 'Ca đêm', start: '20:00', end: '06:00', brk: 1, brkMode: 'exact', brkStart: '00:30', brkEnd: '01:30' }] };
  const rng = hr.hrShiftRange(cfg, 0);
  const r = hr.hrSplitHoursHCMin('Xưởng 2', rng.startMin, rng.endMin, 0, null, cfg);
  return r.hc === 540 && r.tc === 0;
})());

// ═══ B. LƯU THEO MỐC HIỆU LỰC (handleShiftSubmit qua DOM giả) ═══
state.hrShifts = [{ id: 'Xưởng 2', type: 'lamca', shifts: [{ name: 'Ca ngày', start: '07:00', end: '19:00', brk: 1.5 }, { name: 'Ca đêm', start: '19:00', end: '07:00', brk: 1 }], effectiveFrom: '2026-10-01', versions: [] }];
storeBacking.clear();
submit('lamca', [
  [0, 'name', 'Ca ngày'], [0, 'start', '07:00'], [0, 'end', '17:30'], [0, 'brk', '1.5'], [0, 'brkMode', 'auto'], [0, 'brkStart', ''], [0, 'brkEnd', ''],
  [1, 'name', 'Ca đêm'], [1, 'start', '20:00'], [1, 'end', '06:00'], [1, 'brk', '1'], [1, 'brkMode', 'auto'], [1, 'brkStart', ''], [1, 'brkEnd', '']
], '2026-11-05');
const cfg2 = state.hrShifts.find(s => s.id === 'Xưởng 2');
check('B1: bản mới thành hiện hành + mốc 05/11', cfg2.shifts[0].end === '17:30' && cfg2.effectiveFrom === '2026-11-05');
check('B2: bản cũ (mốc 01/10) nằm trong versions', cfg2.versions.length === 1 && cfg2.versions[0].effectiveFrom === '2026-10-01' && cfg2.versions[0].shifts[0].end === '19:00');
check('B3: đã ghi localStorage key hrShifts (có versions)', (() => {
  const raw = storeBacking.get(STORAGE_KEY_HR_SHIFTS);
  return !!raw && raw.includes('versions') && raw.includes('2026-11-05');
})());
check('B4: bản ghi có mốc thời gian (updatedAt) để máy khác nhận đúng', !!cfg2.updatedAt);

// ═══ C. SAU KHI ĐỔI — QUÁ KHỨ GIỮ NGUYÊN, TỪ MỐC MỚI DÙNG GIỜ MỚI ═══
check('C1: ngày 04/11 → cấu hình CŨ (19:00)', hr.hrShiftCfg('Xưởng 2', '2026-11-04').shifts[0].end === '19:00');
check('C2: ngày 05/11 → cấu hình MỚI (17:30)', hr.hrShiftCfg('Xưởng 2', '2026-11-05').shifts[0].end === '17:30');
check('C3: hôm nay (không truyền date) → cấu hình MỚI', hr.hrShiftCfg('Xưởng 2').shifts[0].end === '17:30');
check('C4: tính giờ quá khứ (04/11, đủ ca) = 10h30 — KHÔNG bị tính lại', eq(H('Xưởng 2', '07:00', '', 0, '2026-11-04'), 630, 0));
check('C5: tính giờ từ mốc mới (05/11, đủ ca) = 9h', eq(H('Xưởng 2', '07:00', '', 0, '2026-11-05'), 540, 0));
check('C6: ca đêm mới (20:00–06:00) đủ ca = 10h HC (12h − 1h mặc định... 20:00–06:00 = 10h − 1h = 9h)', eq(H('Xưởng 2', '20:00', '', 1, '2026-11-05'), 540, 0));
check('C7: bố trí để trống giờ ra (hết ca) trước mốc → vẫn lấy giờ kết thúc CŨ', (() => {
  // Lượt bố trí ngày 20/10 (trước mốc 05/11), ca 0, end rỗng = hết ca
  const a = state.hrAssignments[0];
  const rng = hr.hrShiftRange(hr.hrShiftCfg('Xưởng 2', a.date), a.shiftIdx || 0);
  return rng.end === '19:00';
})());
// C8/C9/C10: hrSplitHoursHCDate (duong cham cong / xuong 2 / ep van) PHAI phan giai theo ngay
check('C8: hrSplitHoursHCDate 04/11 (truoc moc) = 10h30 — KHONG bi tinh lai', (() => {
  const r = hr.hrSplitHoursHCDate('Xưởng 2', '2026-11-04', '07:00', '', 0);
  return r.hc === 630 && r.tc === 0;
})());
check('C9: hrSplitHoursHCDate 05/11 (tu moc) = 9h — dung gio moi', (() => {
  const r = hr.hrSplitHoursHCDate('Xưởng 2', '2026-11-05', '07:00', '', 0);
  return r.hc === 540 && r.tc === 0;
})());
check('C10: khung ca doi theo ngay — 17:30-19:30: truoc moc (kt 19:00) = 1h30 HC + 30phut TC; tu moc (kt 17:30) = 0 HC + 2h TC', (() => {
  const truoc = hr.hrSplitHoursHCDate('Xưởng 2', '2026-11-04', '17:30', '19:30', 0);
  const sau = hr.hrSplitHoursHCDate('Xưởng 2', '2026-11-05', '17:30', '19:30', 0);
  return truoc.hc === 90 && truoc.tc === 30 && sau.hc === 0 && sau.tc === 120;
})());


// ═══ D. LƯU LẠI / GIỚI HẠN LỊCH SỬ ═══
submit('lamca', [
  [0, 'name', 'Ca ngày'], [0, 'start', '07:00'], [0, 'end', '17:30'], [0, 'brk', '1.5'], [0, 'brkMode', 'auto'], [0, 'brkStart', ''], [0, 'brkEnd', ''],
  [1, 'name', 'Ca đêm'], [1, 'start', '20:00'], [1, 'end', '06:00'], [1, 'brk', '1'], [1, 'brkMode', 'auto'], [1, 'brkStart', ''], [1, 'brkEnd', '']
], '2026-11-05');
const cfg3 = state.hrShifts.find(s => s.id === 'Xưởng 2');
check('D1: lưu lại cùng mốc → versions gộp trùng (2 bản: 01/10 + bản tạm 05/11), KHÔNG phình thêm', (() => {
  if (cfg3.versions.length !== 2) return false;
  submit('lamca', [
    [0, 'name', 'Ca ngày'], [0, 'start', '07:00'], [0, 'end', '17:30'], [0, 'brk', '1.5'], [0, 'brkMode', 'auto'], [0, 'brkStart', ''], [0, 'brkEnd', ''],
    [1, 'name', 'Ca đêm'], [1, 'start', '20:00'], [1, 'end', '06:00'], [1, 'brk', '1'], [1, 'brkMode', 'auto'], [1, 'brkStart', ''], [1, 'brkEnd', '']
  ], '2026-11-05');
  return state.hrShifts.find(x => x.id === 'Xưởng 2').versions.length === 2;
})());
check('D2: lịch sử tối đa 20 bản', (() => {
  for (let i = 1; i <= 25; i++) submit('lamca', [
    [0, 'name', 'C'], [0, 'start', '06:00'], [0, 'end', '16:00'], [0, 'brk', '1'], [0, 'brkMode', 'auto'], [0, 'brkStart', ''], [0, 'brkEnd', '']
  ], '2027-02-' + String(i).padStart(2, '0'));
  return state.hrShifts.find(s => s.id === 'Xưởng 2').versions.length === 20;
})());

// ═══ E. BỘ PHẬN CHƯA TỪNG CÀI → TẠO MỚI ═══
state.hrShifts = [];
submit('lamca', [
  [0, 'name', 'Ca ngày'], [0, 'start', '07:00'], [0, 'end', '17:30'], [0, 'brk', '1.5'], [0, 'brkMode', 'auto'], [0, 'brkStart', ''], [0, 'brkEnd', '']
], '2026-11-13');
const cfgNew = state.hrShifts.find(s => s.id === 'Xưởng 2');
check('E1: tạo mới bản ghi + mốc hiệu lực + versions rỗng', !!cfgNew && cfgNew.effectiveFrom === '2026-11-13' && Array.isArray(cfgNew.versions) && cfgNew.versions.length === 0);

// ═══ F. HÀNH CHÍNH QUA FORM ═══
state.hrShifts = [];
submit('hanhchinh', [
  [0, 'name', 'Sáng'], [0, 'start', '07:00'], [0, 'end', '11:30'],
  [1, 'name', 'Chiều'], [1, 'start', '13:00'], [1, 'end', '17:30']
], '2026-11-13');
const cfgHc = state.hrShifts.find(s => s.id === 'Xưởng 2');
check('F1: Hành chính lưu đủ 2 ca + brk 0', !!cfgHc && cfgHc.type === 'hanhchinh' && cfgHc.shifts.length === 2 && cfgHc.shifts[0].brk === 0);
check('F2: hành chính 07:00–17:30 = 9h HC (không đổi)', eq(H('Xưởng 2', '07:00', '17:30', 0), 540, 0));

// ═══ G. DI TRÚ ═══
state.hrShifts = [{ id: 'Xưởng 2', type: 'lamca', shifts: [{ name: 'Ca ngày', start: '07:00', end: '19:00', brk: '05:03' }] }];
const nMig = hr.migrateShiftEffectiveDates();
check('G1: di trú 1 bộ phận (dán mốc + dọn brk rác)', nMig === 1 && state.hrShifts[0].effectiveFrom === '2000-01-01' && state.hrShifts[0].shifts[0].brk === undefined);
check('G2: sau di trú vẫn tính đúng (mặc định 1h30)', eq(H('Xưởng 2', '07:00', '19:00', 0), 630, 0));
check('G3: idempotent — chạy lại không ghi', hr.migrateShiftEffectiveDates() === 0);

// ═══ H. CẤU TRÚC (index / events / css / history / cache) ═══
const idxSrc = fs.readFileSync('index.html', 'utf8');
const evSrc = fs.readFileSync('js/events.js', 'utf8');
const cssSrc = fs.readFileSync('styles.css', 'utf8');
const histSrc = fs.readFileSync('js/history.js', 'utf8');
const swSrc = fs.readFileSync('sw.js', 'utf8');
check('H1: index có ô mốc hiệu lực + lịch sử + chế độ nghỉ',
  idxSrc.includes('id="shift-effective"') && idxSrc.includes('id="shift-history"') && idxSrc.includes('id="shift-history-count"') && idxSrc.includes('shift-card'));
check('H2: events.js wire mốc hiệu lực + ô giờ nghỉ + xem trước',
  evSrc.includes("safeOn('shift-effective', 'change'") && evSrc.includes('hrSyncShiftBreakCells') && evSrc.includes('hrRefreshShiftPreviews'));
check('H3: CSS khối mới ở cấp cao nhất (depth = 0)', (() => {
  const depth = sel => { const i = cssSrc.indexOf(sel); if (i < 0) return -1; let d = 0; for (let k = 0; k < i; k++) { if (cssSrc[k] === '{') d++; else if (cssSrc[k] === '}') d--; } return d; };
  return depth('.shift-card {') === 0 && depth('.shift-history-box {') === 0;
})());
check('H4: history.js có vùng hrShifts (nhật ký đổi ca)', histSrc.includes('hrShifts:') && histSrc.includes('Cấu hình ca làm việc'));
check('H5: sw.js v408', /nha-may-ngoc-son-v408/.test(swSrc));
check('H6: parse/submit/version/migrate đã export',
  typeof hr.hrShiftRowsFromDom === 'function' && typeof hr.hrShiftApplyVersion === 'function' && typeof hr.migrateShiftEffectiveDates === 'function' && typeof hr.renderShiftHistory === 'function');

// ═══ I. SỬA NHẦM MỐC HIỆU LỰC: NÚT XOÁ BẢN LỊCH SỬ + NGÀY BẰNG CHỨNG ═══
state.hrShifts = [{ id: 'Xưởng 2', type: 'lamca', shifts: [{ name: 'C', start: '07:00', end: '17:00', brk: 1 }], effectiveFrom: '2026-11-12', versions: [
  { effectiveFrom: '2026-11-01', type: 'lamca', shifts: [{ name: 'C', start: '07:00', end: '19:00', brk: 1.5 }], at: '2026-11-13T02:00:00.000Z' },
  { effectiveFrom: '2000-01-01', type: 'lamca', shifts: [{ name: 'C', start: '07:00', end: '17:30', brk: 1.5 }] }
] }];
document.getElementById('shift-dept').value = 'Xưởng 2';
hr.renderShiftHistory(state.hrShifts[0]);
const histHtml = els.get('shift-history').innerHTML;
check('I1: mỗi bản lịch sử có nút xoá (data-shift-del)',
  histHtml.includes('data-shift-del="2026-11-01"') && histHtml.includes('data-shift-del="2000-01-01"'));
check('I2: hrVnDateLong viết ngày BẰNG CHỨNG (tránh nhầm dd/mm)',
  hr.hrVnDateLong('2026-11-01') === 'ngày 1 tháng 11 năm 2026' && hr.hrVnDateLong('2026-11-12') === 'ngày 12 tháng 11 năm 2026');
check('I3: ghi chú mốc hiệu lực ghi rõ ngày bằng chữ', (() => {
  document.getElementById('shift-effective').value = '2026-11-01';
  hr.hrRefreshShiftEffectiveNote();
  const h = els.get('shift-effective-note').innerHTML;
  return h.includes('01/11/2026') && h.includes('ngày 1 tháng 11 năm 2026') && h.includes('QUÁ KHỨ');
})());
check('I4: xoá bản nhầm (01/11) → ngày 05/11 quay về bản CŨ HƠN (2000), không còn dùng bản 01/11', (() => {
  hr.hrDeleteShiftVersion('2026-11-01');
  const cfg = state.hrShifts.find(x => x.id === 'Xưởng 2');
  return cfg.versions.length === 1 && cfg.versions[0].effectiveFrom === '2000-01-01'
    && hr.hrShiftCfg('Xưởng 2', '2026-11-05').shifts[0].end === '17:30';
})());
check('I5: events.js có ủy quyền nút xoá trong lịch sử',
  evSrc.includes('data-shift-del') && evSrc.includes('hrDeleteShiftVersion'));

console.log('\n=== CÀI ĐẶT CA THEO MỐC HIỆU LỰC: ' + pass + ' PASS / ' + fail + ' FAIL ===');
process.exit(fail ? 1 : 0);
