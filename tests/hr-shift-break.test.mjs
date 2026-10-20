// tests/hr-shift-break.test.mjs — GIỜ NGHỈ CỦA CA (chế độ "Làm ca") + LỖI GIỜ ĐÃ SỬA
// Quy tắc chốt với người dùng 16/10/2026 (phương án B — xem .clinerules quy tắc 58/59):
//  • Cài Đặt Ca có ô "Nghỉ (giờ)" cho TỪNG CA (chỉ chế độ Làm ca).
//  • Giờ nghỉ bị TRỪ VÀO CUỐI CA: giờ làm hiệu dụng = [vào → ra − nghỉ].
//  • Phần nghỉ KHÔNG tính vào HC lẫn TC (giống nghỉ trưa hành chính).
//  • GIỜ RA TRỐNG = làm đến HẾT CA (bỏ hẳn hack "+ 480" từng khiến ca đêm = 8h).
//  • HÀNH CHÍNH giữ nguyên 100% (07:00–17:30 → 9h HC; làm đến 19:00 → 9h HC + 1h30 TC).
'use strict';

// ─── Stubs môi trường (giống hr-board.test.mjs) ─────────────────
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
let pass = 0, fail = 0;
function check(name, cond) { if (cond) { pass++; console.log('PASS — ' + name); } else { fail++; console.log('FAIL — ' + name); } }

const { state } = await import('../js/state.js');
const hr = await import('../js/hr.js');
state.currentUser = { username: 'admin', role: 'admin', editTabs: [], allowAdvanced: true };
state.hrWorkCalendar = {};
state.hrShifts = [];
state.hrAssignments = [];
state.hrEmployees = []; state.hrPositions = [];

const H = (dept, s, e, idx) => hr.hrSplitHoursHC(dept, s, e, idx);
const eq = (r, hc, tc) => r.hc === hc && r.tc === tc;
const CA12 = { id: 'Xưởng 2', type: 'lamca', shifts: [
  { name: 'Ca ngày', start: '07:00', end: '19:00', brk: 1.5 },
  { name: 'Ca đêm',  start: '19:00', end: '07:00', brk: 1 }
] };
const CA_CU = { id: 'Xưởng 2', type: 'lamca', shifts: [   // cấu hình CŨ: chưa khai nghỉ
  { name: 'Ca ngày', start: '07:00', end: '19:00' },
  { name: 'Ca đêm',  start: '19:00', end: '07:00' }
] };


// ═══ A. HÀNH CHÍNH KHÔNG ĐỔI (hồi quy) ═══════════════════════════════════
check('A1: HC 07:00 → hết ca = 9h HC (nghỉ trưa tự loại)', eq(H('Xưởng 2', '07:00', '', 0), 540, 0));
check('A2: HC 07:00–17:30 = 9h HC', eq(H('Xưởng 2', '07:00', '17:30', 0), 540, 0));
check('A3: HC 07:00–19:00 = 9h HC + 1h30 TC (làm thêm)', eq(H('Xưởng 2', '07:00', '19:00', 0), 540, 90));
check('A4: HC 12:00–12:30 (đúng nghỉ trưa) = 0 HC · 0 TC', eq(H('Xưởng 2', '12:00', '12:30', 0), 0, 0));
check('A5: HC 08:00–11:30 = 3h30 HC', eq(H('Xưởng 2', '08:00', '11:30', 0), 210, 0));

// ═══ B. LÀM CA 12H — NGHỈ TRỪ VÀO CUỐI CA ════════════════════════════════
state.hrShifts = [CA12];
check('B1: Ca ngày 07:00 → hết ca = 10h30 HC (12h − 1h30 nghỉ) · 0 TC',
  eq(H('Xưởng 2', '07:00', '', 0), 630, 0));
check('B2: Ca ngày 07:00–19:00 = 10h30 HC · 0 TC (KHÔNG còn 12h)', eq(H('Xưởng 2', '07:00', '19:00', 0), 630, 0));
check('B3: Ca ngày làm thêm 07:00–20:30 = 10h30 HC + 1h30 TC', eq(H('Xưởng 2', '07:00', '20:30', 0), 630, 90));
check('B4: Ca ngày vào trễ 09:00–19:00 = 8h30 HC · 0 TC', eq(H('Xưởng 2', '09:00', '19:00', 0), 510, 0));
check('B5: Ca đêm 19:00 → hết ca = 11h HC (12h − 1h nghỉ) · 0 TC — KHÔNG còn 8h',
  eq(H('Xưởng 2', '19:00', '', 1), 660, 0));
check('B6: Ca đêm 19:00–07:00 (vắt qua nửa đêm) = 11h HC · 0 TC', eq(H('Xưởng 2', '19:00', '07:00', 1), 660, 0));
check('B7: Ca đêm làm thêm 19:00–08:00 = 11h HC + 1h TC', eq(H('Xưởng 2', '19:00', '08:00', 1), 660, 60));
check('B8: Ca đêm ra sớm 19:00–23:00 = 4h HC · 0 TC (chưa tới giờ nghỉ)', eq(H('Xưởng 2', '19:00', '23:00', 1), 240, 0));
check('B9: bản ghi CŨ của ca đêm (end 01:00) = 6h HC · 0 TC (không đổi)', eq(H('Xưởng 2', '19:00', '01:00', 1), 360, 0));

// ═══ C. CA 10 GIỜ → NGHỈ 1H = 9H (đúng ví dụ người dùng) ═════════════════
state.hrShifts = [{ id: 'Xưởng 2', type: 'lamca', shifts: [
  { name: 'Ca ngày', start: '07:00', end: '17:00', brk: 1 },
  { name: 'Ca đêm',  start: '19:00', end: '05:00', brk: 1 }
] }];
check('C1: Ca 10h 07:00 → hết ca = 9h HC (10h − 1h nghỉ) · 0 TC', eq(H('Xưởng 2', '07:00', '', 0), 540, 0));
check('C2: Ca 10h để TRỐNG giờ ra (ca đêm 19:00) = 9h HC · 0 TC — không còn đoán 8h',
  eq(H('Xưởng 2', '19:00', '', 1), 540, 0));

// ═══ D. NGHỈ = 0 → KHÔNG TRỪ (người dùng chủ động tắt) ═══════════════════
state.hrShifts = [{ id: 'Xưởng 2', type: 'lamca', shifts: [
  { name: 'Ca ngày', start: '07:00', end: '19:00', brk: 0 }
] }];
check('D1: Ca ngày khai nghỉ 0 → làm đủ ca = 12h HC · 0 TC', eq(H('Xưởng 2', '07:00', '19:00', 0), 720, 0));

// ═══ E. MIGRATE CẤU HÌNH CŨ (chưa có ô nghỉ) ══════════════════════════════
check('E1: ca 1 chưa khai nghỉ → mặc định 1h30', hr.hrShiftBrkH(CA_CU, 0) === 1.5);
check('E2: ca 2 chưa khai nghỉ → mặc định 1h', hr.hrShiftBrkH(CA_CU, 1) === 1);
check('E3: Hành chính luôn 0 (nghỉ trưa tự loại giữa 2 buổi)',
  hr.hrShiftBrkH({ type: 'hanhchinh', shifts: [{ name: 'Sáng', start: '07:00', end: '11:30' }] }, 0) === 0);
check('E4: nghỉ khai bằng CHUỖI "2" vẫn đọc đúng (form trả string)', hr.hrShiftBrkH({ type: 'lamca', shifts: [{ brk: '2' }] }, 0) === 2);
check('E5: nghỉ để TRỐNG "" → rơi về mặc định', hr.hrShiftBrkH({ type: 'lamca', shifts: [{ brk: '' }] }, 0) === 1.5);
state.hrShifts = [CA_CU];
check('E6: cấu hình CŨ → áp mặc định (Ca ngày 10h30 · Ca đêm 11h)',
  eq(H('Xưởng 2', '07:00', '19:00', 0), 630, 0) && eq(H('Xưởng 2', '19:00', '07:00', 1), 660, 0));

// ═══ F. MỐC PHÚT ĐÃ CHUẨN HOÁ (hrShiftRange) ═════════════════════════════
state.hrShifts = [CA12];
const rNgay = hr.hrShiftRange(CA12, 0), rDem = hr.hrShiftRange(CA12, 1);
check('F1: Ca ngày → startMin 420 · endMin 1140 · brkH 1.5', rNgay.startMin === 420 && rNgay.endMin === 1140 && rNgay.brkH === 1.5);
check('F2: Ca đêm → endMin VẮT QUA NỬA ĐÊM (1860) · brkH 1', rDem.startMin === 1140 && rDem.endMin === 1860 && rDem.brkH === 1);
const rHanh = hr.hrShiftRange(hr.hrShiftCfg('Bộ phận chưa cài'), 0);
check('F3: Hành chính → 07:00–17:30 (420–1050) · brkH 0', rHanh.startMin === 420 && rHanh.endMin === 1050 && rHanh.brkH === 0 && rHanh.label === 'Hành chính');

// ═══ G. NGÀY NGHỈ/LỄ ĐI LÀM → TOÀN BỘ GIỜ SANG TC (giữ nguyên) ═══════════
state.hrWorkCalendar = { '2026-10': { restDays: ['2026-10-05'] } };
const rLe = hr.hrSplitHoursHCDate('Xưởng 2', '2026-10-05', '07:00', '19:00', 0);
check('G1: ngày lễ đi làm (Làm ca) → HC 0 · TC 10h30', rLe.hc === 0 && rLe.tc === 630);
state.hrWorkCalendar = {};
const rThuong = hr.hrSplitHoursHCDate('Xưởng 2', '2026-10-06', '07:00', '19:00', 0);
check('G2: ngày thường → HC 10h30 · TC 0', rThuong.hc === 630 && rThuong.tc === 0);

// ═══ H. CÀI ĐẶT CA — Ô "NGHỈ (GIỜ)" ══════════════════════════════════════
hr.renderShiftRows({ type: 'lamca', shifts: [
  { name: 'Ca ngày', start: '07:00', end: '19:00' },
  { name: 'Ca đêm',  start: '19:00', end: '07:00' }
] });
const shiftHtml = els.get('shift-rows').innerHTML;
check('H1: chế độ Làm ca → mỗi ca có 1 ô nhập nghỉ (2 ca = 2 ô)',
  (shiftHtml.match(/data-shift-f="brk"/g) || []).length === 2);
check('H2: hàng tiêu đề ghi "Nghỉ (giờ)"', shiftHtml.includes('Nghỉ (giờ)') && shiftHtml.includes('shift-row-head'));
check('H3: ô nghỉ nạp ĐÚNG mặc định (ca 1 = 1.5 · ca 2 = 1)',
  shiftHtml.includes('data-shift-f="brk" value="1.5"') && shiftHtml.includes('data-shift-f="brk" value="1"'));
check('H4: chú thích nói rõ trừ vào CUỐI CA + mặc định', shiftHtml.includes('CUỐI CA') && shiftHtml.includes('mặc định ca 1 nghỉ 1h30'));
hr.renderShiftRows({ type: 'hanhchinh', shifts: [
  { name: 'Sáng', start: '07:00', end: '11:30' }, { name: 'Chiều', start: '13:00', end: '17:30' }
] });
const shiftHcHtml = els.get('shift-rows').innerHTML;
check('H5: Hành chính → KHÔNG có ô nghỉ, chỉ ghi chú "nghỉ trưa"',
  !shiftHcHtml.includes('data-shift-f="brk"') && shiftHcHtml.includes('shift-row-na'));

// ═══ I. CẤU TRÚC (js / index / styles / sw) ══════════════════════════════
const hrSrc = fs.readFileSync('js/hr.js', 'utf8');
const idxSrc = fs.readFileSync('index.html', 'utf8');
const cssSrc = fs.readFileSync('styles.css', 'utf8');
const swSrc = fs.readFileSync('sw.js', 'utf8');
check('I1: ĐÃ BỎ HẲN hack "+ 480" (nguyên nhân ca đêm ra 8h)', !hrSrc.includes('+ 480'));
check('I2: hr.js có hrShiftBrkH + mốc endMin + quy ước ghi rõ',
  hrSrc.includes('function hrShiftBrkH') && hrSrc.includes('endMin') && hrSrc.includes('TRỪ VÀO CUỐI CA'));
check('I3: hrShiftBrkH + hrShiftRange + renderShiftRows đã export',
  typeof hr.hrShiftBrkH === 'function' && typeof hr.hrShiftRange === 'function' && typeof hr.renderShiftRows === 'function');
check('I4: index.html modal Cài Đặt Ca ghi rõ "giờ nghỉ"', idxSrc.includes('Thời Gian Ca (tên ca / bắt đầu / kết thúc / giờ nghỉ)'));
check('I5: styles.css có bảng 4 cột ca (.shift-row / -head / -na)',
  cssSrc.includes('.shift-row-head, .shift-row') && cssSrc.includes('.shift-row-na'));
check('I6: sw.js đã bump cache v265', /nha-may-ngoc-son-v289/.test(swSrc));

console.log(`\n=== GIỜ NGHỈ CỦA CA (LÀM CA): ${pass} PASS / ${fail} FAIL ===`);
process.exit(fail ? 1 : 0);


