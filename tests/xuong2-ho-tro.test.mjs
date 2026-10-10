// tests/xuong2-ho-tro.test.mjs — Kiểm thử THẺ "HỖ TRỢ + CÔNG ĐOẠN LẺ" (tab Công Đoạn, Xưởng 2):
// thẻ CHỈ CÓ 2 VÙNG (① nhập liệu · ② bảng lịch sử theo ngày) — công việc PHÁT SINH nên
// KHÔNG thanh tồn / thống kê / định mức (KHÔNG công suất · KHÔNG hiệu suất).
//   • form: Ngày · Nội dung công việc (điền tay) · Người thực hiện (CHỌN TỪNG NGƯỜI —
//     CHỈ người đang bố trí vị trí "Hỗ Trợ + Công Đoạn Lẻ" (Xưởng 2) trong Bảng bố trí
//     theo ngày ở tab Nhân Sự — 1 việc chọn NHIỀU người) · Mô tả (điền tay)
//   • GIỜ LÀM từng công việc = tổng khung giờ của ĐÚNG những người được chọn (tách HC/TC);
//     đọc SỐNG khi bố trí còn, mất bố trí → SNAPSHOT lưu lúc ghi.
//   • lưu/sửa/xóa (tombstone) + nối state/storage/cloud/history/main/events/export + sw v232.
'use strict';
import fs from 'node:fs';

// ─── Stubs môi trường (giống xuong2-boc-luong.test.mjs) ────────────────
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
global.fetch = async () => ({ ok: false, status: 0, statusText: 'offline-stub', json: async () => ({}), text: async () => '' });
global.Image = class { set src(_) {} addEventListener(){} };
global.ResizeObserver = class { observe(){} unobserve(){} disconnect(){} };

let pass = 0, fail = 0;
function check(label, cond) {
  if (cond) { pass++; console.log('PASS ' + label); }
  else { fail++; console.log('FAIL ' + label); }
}

const { state, STORAGE_KEY_XUONG2_HO_TRO } = await import('../js/state.js');
state.currentUser = { username: 'admin', role: 'admin', editTabs: [], allowAdvanced: true };
state.activeView = 'kanban-view';

// ─── Dữ liệu Nhân Sự mẫu — Bảng bố trí theo ngày (tab Nhân Sự) ─────────
state.hrEmployees = [
  { id: 'empA', name: 'Nguyễn Văn A', quitDate: '' },
  { id: 'empB', name: 'Nguyễn Văn B', quitDate: '' },
  { id: 'empC', name: 'Trần Văn C', quitDate: '' }
];
state.hrPositions = [
  { id: 'pht',  name: 'Hỗ Trợ + Công Đoạn Lẻ', department: 'Xưởng 2' },
  { id: 'pcat', name: 'Cắt Chọn', department: 'Xưởng 2' },
  { id: 'pbl',  name: 'Bốc Luồng', department: 'Xưởng 2' },
  { id: 'pqc',  name: 'Kiểm chất', department: 'QC' }
];
state.hrAssignments = [
  { id: 'asg-1', date: '2026-09-10', department: 'Xưởng 2', positionId: 'pht',  employeeId: 'empA', start: '07:00', end: '12:00' },
  { id: 'asg-2', date: '2026-09-10', department: 'Xưởng 2', positionId: 'pht',  employeeId: 'empB', start: '13:00', end: '19:00' },
  { id: 'asg-3', date: '2026-09-10', department: 'QC',       positionId: 'pqc',  employeeId: 'empC', start: '07:30', end: '16:30' },
  { id: 'asg-4', date: '2026-09-11', department: 'Xưởng 2', positionId: 'pht',  employeeId: 'empA', start: '07:00', end: '17:30' },
  // Người ở vị trí CẮT CHỌN cùng ngày → PHẢI BỊ LOẠI khỏi ô chọn Hỗ trợ
  { id: 'asg-5', date: '2026-09-10', department: 'Xưởng 2', positionId: 'pcat', employeeId: 'empC', start: '08:00', end: '17:00' }
];
state.xuong2HoTroRecords = [];
state.x2HoTroEditId = null;

const hr = await import('../js/hr.js');
const x2 = await import('../js/xuong2.js');
const fmtGio = v => (Number(v) || 0).toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtRatio = v => (Number(v) || 0).toLocaleString('vi-VN', { maximumFractionDigits: 1 });

// ─── A. THẺ LAUNCHER + MỞ/ĐÓNG POP-UP ────────────────────────────────
x2.renderXuong2Cards();
check('A1: chưa ghi việc nào → chip mini card = "Chưa ghi"',
  document.getElementById('x2-mini-count-ho-tro').textContent === 'Chưa ghi');
check('A2: KHÔNG còn cờ soon (đã bật chức năng)',
  !x2.X2_CARD_DEFS['x2-ho-tro-card'].soon);
check('A3: x2OpenCard trả về true lần đầu', x2.x2OpenCard('x2-ho-tro-card') === true);
check('A4: pop-up bật (overlay show)',
  document.getElementById('x2-detail-overlay').classList.contains('show'));
check('A5: bấm lại → false (đóng)',
  x2.x2OpenCard('x2-ho-tro-card') === false &&
  !document.getElementById('x2-detail-overlay').classList.contains('show'));
x2.x2OpenCard('x2-ho-tro-card');

// ─── B. Ô CHỌN NGƯỜI = CHỈ BỐ TRÍ VỊ TRÍ "HỖ TRỢ + CÔNG ĐOẠN LẺ" ─────
const dateEl = document.getElementById('x2-ht-date');
dateEl.value = '2026-09-10';
x2.fillXuong2HoTroWorkers([]);
const sel = document.getElementById('x2-ht-workers');
check('B1: ngày 10/09 có 5 lượt bố trí nhưng CHỈ 2 lượt vị trí "Hỗ Trợ + Công Đoạn Lẻ" lọt vào danh sách',
  (state.hrAssignments || []).length === 5 &&
  (sel.innerHTML.match(/<option/g) || []).length === 2);
check('B2: option ghi tên · vị trí Hỗ Trợ + Công Đoạn Lẻ · bộ phận · khung giờ',
  sel.innerHTML.includes('Nguyễn Văn A — Hỗ Trợ + Công Đoạn Lẻ (Xưởng 2)') &&
  sel.innerHTML.includes('07:00–12:00') &&
  sel.innerHTML.includes('07:30–16:30') === false); // Trần Văn C (QC — Kiểm chất) KHÔNG lọt
check('B2b: KHÔNG liệt kê người ở vị trí khác (Cắt Chọn) hay bộ phận khác (QC)',
  !sel.innerHTML.includes('Cắt Chọn') && !sel.innerHTML.includes('Kiểm chất') &&
  !sel.innerHTML.includes('Trần Văn C'));
check('B2c: isHoTraPos khớp mềm (bỏ dấu/hoa thường) — "Hỗ trợ", "ho tro + cong doan le"…',
  x2.isHoTroPos('Hỗ Trợ + Công Đoạn Lẻ') && x2.isHoTroPos('HỖ TRỢ') &&
  x2.isHoTroPos('ho tro') && !x2.isHoTroPos('Cắt Chọn') && !x2.isHoTroPos('Kiểm chất'));
check('B3: chưa chọn người → ô tự tính "Chưa chọn người thực hiện"',
  document.getElementById('x2-ht-calc').innerHTML.includes('Chưa chọn người thực hiện'));
check('B4: chọn người → ô tự tính hiện N người + giờ HC/TC',
  (() => {
    sel.options = [{ value: 'asg-1', selected: true, disabled: false }, { value: 'asg-2', selected: true, disabled: false }];
    x2.updateXuong2HoTroCalc();
    const t = document.getElementById('x2-ht-calc').innerHTML;
    return t.includes('2 người') && t.includes('h HC') && t.includes('Nguyễn Văn A, Nguyễn Văn B');
  })());
check('B5: ngày không có ai ở vị trí Hỗ Trợ → placeholder dẫn sang tab Nhân Sự',
  (() => {
    dateEl.value = '2026-09-25';
    x2.fillXuong2HoTroWorkers([]);
    return document.getElementById('x2-ht-workers').innerHTML.includes('chưa có ai ở vị trí');
  })());
dateEl.value = '2026-09-10';
x2.fillXuong2HoTroWorkers([]);
check('B6: nút Chọn tất cả / Bỏ chọn hoạt động',
  (() => {
    sel.options = [
      { value: 'asg-1', selected: false, disabled: false },
      { value: 'asg-2', selected: false, disabled: false }
    ];
    x2.hoTroPickAll();
    const allOn = sel.options.filter(o => o.selected).length === 2;
    x2.hoTroPickNone();
    return allOn && sel.options.filter(o => o.selected).length === 0;
  })());

// ─── C. CHẶN LƯU KHI THIẾU TRƯỜNG ─────────────────────────────────────
const workEl = document.getElementById('x2-ht-work');
const descEl = document.getElementById('x2-ht-desc');
sel.options = [];
dateEl.value = '';
workEl.value = 'Xóa rác khuôn';
x2.handleXuong2HoTroSubmit({ preventDefault(){} });
check('C1: thiếu Ngày → không ghi', (state.xuong2HoTroRecords || []).length === 0);
dateEl.value = '2026-09-10';
workEl.value = '';
x2.handleXuong2HoTroSubmit({ preventDefault(){} });
check('C2: thiếu Nội Dung Công Việc → không ghi', (state.xuong2HoTroRecords || []).length === 0);
workEl.value = 'Xóa rác khuôn';
sel.options = [];
x2.handleXuong2HoTroSubmit({ preventDefault(){} });
check('C3: thiếu Người Thực Hiện → không ghi', (state.xuong2HoTroRecords || []).length === 0);

// ─── D. LƯU 1 VIỆC = NHIỀU NGƯỜI ──────────────────────────────────────
sel.options = [
  { value: 'asg-1', selected: true, disabled: false },
  { value: 'asg-2', selected: true, disabled: false }
];
descEl.value = 'Dọn dẹp khu vực máy ép';
x2.handleXuong2HoTroSubmit({ preventDefault(){} });
const list = state.xuong2HoTroRecords || [];
check('D1: đã ghi 1 công việc + localStorage đã ghi',
  list.length === 1 &&
  JSON.parse(localStorage.getItem(STORAGE_KEY_XUONG2_HO_TRO) || '[]').length === 1);
const rec = list[0];
check('D2: bản ghi đủ trường Ngày · Nội dung · Mô tả · tuần',
  rec.date === '2026-09-10' && rec.workName === 'Xóa rác khuôn' &&
  rec.desc === 'Dọn dẹp khu vực máy ép' && String(rec.week || '').startsWith('2026-W'));
check('D3: 1 việc = NHIỀU NGƯỜI (asgIds 2 lượt bố trí + snapshot tên)',
  Array.isArray(rec.asgIds) && rec.asgIds.length === 2 &&
  rec.worker === 'Nguyễn Văn A, Nguyễn Văn B');
check('D4: giờ HC/TC snapshot = HC + TC (07:00–12:00 + 13:00–19:00, CẢ 2 > 0)',
  rec.workHoursHC > 0 && rec.workHoursTC > 0 &&
  Math.abs(rec.workHours - (rec.workHoursHC + rec.workHoursTC)) < 1e-9);
check('D5: snapshot asgSnap giữ khung giờ từng người (phòng mất bố trí)',
  Array.isArray(rec.asgSnap) && rec.asgSnap.length === 2 &&
  rec.asgSnap[0].start === '07:00' && rec.asgSnap[1].start === '13:00');
check('D6: form reset về ghi mới (x2HoTroEditId = null)',
  state.x2HoTroEditId === null);

// ─── E. BẢNG LỊCH SỬ — THẺ NGÀY (KHÔNG công suất / hiệu suất) ────────
check('E1: đếm "1 công việc" ở thanh tiêu đề bảng',
  document.getElementById('x2-ht-table-count').textContent === '1 công việc');
const dayHtml = document.getElementById('x2-ht-day-cards').innerHTML;
check('E2: thẻ ngày có nhãn Ngày · Người thực hiện · Giờ làm + số việc',
  dayHtml.includes('10/09/26') && dayHtml.includes('Nguyễn Văn A') &&
  dayHtml.includes('Giờ làm:') && dayHtml.includes('1 công việc'));
check('E3: KHÔNG có Công suất / Hiệu suất (việc phát sinh — đúng yêu cầu)',
  !dayHtml.includes('Công suất') && !dayHtml.includes('Hiệu suất'));
check('E4: bảng dòng đủ cột Ngày · Nội dung · Người · Mô tả · Giờ HC · Giờ TC',
  dayHtml.includes('Nội Dung Công Việc') && dayHtml.includes('Người Thực Hiện') &&
  dayHtml.includes('Mô Tả') && dayHtml.includes('Giờ HC (h)') && dayHtml.includes('Giờ TC (h)'));
check('E5: dòng công việc hiện đúng nội dung + mô tả + giờ',
  dayHtml.includes('Xóa rác khuôn') && dayHtml.includes('Dọn dẹp khu vực máy ép') &&
  dayHtml.includes(fmtGio(rec.workHoursHC)));
check('E6: chip mini card = "1 việc"', document.getElementById('x2-mini-count-ho-tro').textContent === '1 việc');

// ─── F. GIỜ ĐỌC SỐNG TỪ BẢNG BỐ TRÍ (sửa bố trí → bảng tự đổi) ───────
// Kỳ vọng = tổng CẢ 2 lượt bố trí của việc (asg-1 07:00–12:00 + asg-2 13:00–19:00)
const hcA1Old = hr.hrSplitHoursHCDate('Xưởng 2', '2026-09-10', '07:00', '12:00', 0).hc;
const hcA2 = hr.hrSplitHoursHCDate('Xưởng 2', '2026-09-10', '13:00', '19:00', 0).hc;
const expHcOld = (hcA1Old + hcA2) / 60;
const liveNew = (hr.hrSplitHoursHCDate('Xưởng 2', '2026-09-10', '07:00', '16:00', 0).hc + hcA2) / 60;
state.hrAssignments[0].end = '16:00';
x2.renderXuong2HoTroTable();
check('F1: đổi giờ bố trí (12:00 → 16:00) → bảng đọc SỐNG, giờ HC đổi theo',
  liveNew > expHcOld &&
  document.getElementById('x2-ht-day-cards').innerHTML.includes(fmtGio(liveNew)));
check('F2: snapshot GIỮ NGUYÊN giờ lúc ghi (không bị sửa theo bố trí)',
  Math.abs(rec.workHoursHC - expHcOld) < 1e-9 &&
  Math.abs(rec.workHours - (rec.workHoursHC + rec.workHoursTC)) < 1e-9);

// ─── G. MẤT BỐ TRÍ → VẪN HIỂN THỊ TÊN + GIỜ TỪ SNAPSHOT ─────────────
const backupAsg = state.hrAssignments;
state.hrAssignments = [];
x2.renderXuong2HoTroTable();
const snapHtml = document.getElementById('x2-ht-day-cards').innerHTML;
check('G1: mất Bảng bố trí → vẫn hiện người từ snapshot',
  snapHtml.includes('Nguyễn Văn A') && snapHtml.includes('Nguyễn Văn B'));
check('G2: vẫn hiện giờ HC từ snapshot', snapHtml.includes(fmtGio(rec.workHoursHC)));
state.hrAssignments = backupAsg;
x2.renderXuong2HoTroTable();

// ─── H. ĐẦU THẺ NGÀY KHÔNG CỘP TRÙNG GIỜ (2 việc cùng 1 người) ───────
(state.xuong2HoTroRecords || []).push({
  id: 'x2ht-test-dup', date: '2026-09-10', week: '2026-W37',
  workName: 'Kiểm tra PCCC', desc: '', asgIds: ['asg-1'],
  asgSnap: rec.asgSnap.slice(0, 1), worker: 'Nguyễn Văn A', workTime: '07:00–16:00',
  workHours: rec.workHoursHC, workHoursHC: rec.workHoursHC, workHoursTC: 0,
  createdAt: '2026-09-10T08:00:00.000Z'
});
x2.renderXuong2HoTroTable();
const dupHtml = document.getElementById('x2-ht-day-cards').innerHTML;
// Giờ đầu thẻ ngày = CẢ 2 lượt bố trí (asg-1 đã sửa → 07:00–16:00 + asg-2 13:00–19:00),
// gộp theo lượt bố trí nên 2 việc cùng người chỉ tính 1 LẦN.
const expDayHc = fmtRatio((hr.hrSplitHoursHCDate('Xưởng 2', '2026-09-10', '07:00', '16:00', 0).hc + hcA2) / 60);
const expDayTc = fmtRatio((hr.hrSplitHoursHCDate('Xưởng 2', '2026-09-10', '07:00', '16:00', 0).tc +
  hr.hrSplitHoursHCDate('Xưởng 2', '2026-09-10', '13:00', '19:00', 0).tc) / 60);
check('H1: 2 việc cùng ngày cùng người → giờ đầu thẻ = 1 LẦN (không cộng trùng)',
  dupHtml.includes(`Giờ làm: <span class="x2-hours-hc">${expDayHc}h HC</span><span class="x2-hours-tc">${expDayTc}h TC</span>`));
check('H2: đầu thẻ ghi "2 công việc"', dupHtml.includes('2 công việc'));
check('H3: chip mini = "2 việc"',
  (() => { x2.renderXuong2Cards(); return document.getElementById('x2-mini-count-ho-tro').textContent === '2 việc'; })());

// ─── I. SỬA CÔNG VIỆC (nạp lại form + banner) ─────────────────────────
x2.editXuong2HoTro(rec.id);
check('I1: vào chế độ sửa + banner hiện + form nạp đúng',
  state.x2HoTroEditId === rec.id &&
  document.getElementById('x2-ht-edit-banner').style.display === '' &&
  workEl.value === 'Xóa rác khuôn' && descEl.value === 'Dọn dẹp khu vực máy ép');
check('I2: chọn lại ĐÚNG 2 người của lượt đang sửa',
  sel.options.filter(o => o.selected).length === 2);
descEl.value = 'Dọn dẹp + lau chùi máy ép';
x2.handleXuong2HoTroSubmit({ preventDefault(){} });
check('I3: lưu SỬA → cập nhật mô tả, vẫn 2 việc, về ghi mới',
  rec.desc === 'Dọn dẹp + lau chùi máy ép' &&
  (state.xuong2HoTroRecords || []).length === 2 &&
  state.x2HoTroEditId === null);

// ─── J. XÓA (tombstone) ───────────────────────────────────────────────
x2.deleteXuong2HoTro('x2ht-test-dup');
check('J1: đã xóa 1 việc (còn 1) + ghi tombstone',
  (state.xuong2HoTroRecords || []).length === 1 &&
  !!(state.deletedIds && state.deletedIds.xuong2HoTroRecords && state.deletedIds.xuong2HoTroRecords['x2ht-test-dup']));
x2.deleteXuong2HoTro(rec.id);
check('J2: xóa hết → chip "Chưa ghi" + rỗng + localStorage rỗng',
  (state.xuong2HoTroRecords || []).length === 0 &&
  JSON.parse(localStorage.getItem(STORAGE_KEY_XUONG2_HO_TRO) || '[]').length === 0 &&
  document.getElementById('x2-mini-count-ho-tro').textContent === 'Chưa ghi');

// ─── K. NỐI 6 CHỖ + CẤU TRÚC ─────────────────────────────────────────
const jsState = fs.readFileSync('js/state.js', 'utf8');
const jsStorage = fs.readFileSync('js/storage.js', 'utf8');
const jsCloud = fs.readFileSync('js/cloud.js', 'utf8');
const jsHist = fs.readFileSync('js/history.js', 'utf8');
const jsMain = fs.readFileSync('js/main.js', 'utf8');
const jsEvents = fs.readFileSync('js/events.js', 'utf8');
const jsXlsx = fs.readFileSync('js/export-xlsx.js', 'utf8');
const idxHtml = fs.readFileSync('index.html', 'utf8');
const cssCss = fs.readFileSync('styles.css', 'utf8');
const swJs = fs.readFileSync('sw.js', 'utf8');

check('K1 (state): key + state fields + export',
  jsState.includes('bamboo_tracker_xuong2_ho_tro_v1') &&
  jsState.includes('xuong2HoTroRecords: []') && jsState.includes('x2HoTroEditId: null'));
check('K2 (storage): restore + 2 đường nạp file + 2 snapshot + import + export',
  jsStorage.includes('function restoreXuong2HoTro') &&
  (jsStorage.match(/restoreXuong2HoTro\(/g) || []).length >= 4 &&
  (jsStorage.match(/xuong2HoTroRecords: state/g) || []).length >= 2);
check('K3 (cloud): snapshot + core + merge + persistAllLocal + applyFireSnapshot',
  jsCloud.includes('xuong2HoTroRecords: state.xuong2HoTroRecords') &&
  jsCloud.includes('xuong2HoTroRecords: obj.xuong2HoTroRecords') &&
  jsCloud.includes('remote.xuong2HoTroRecords') &&
  jsCloud.includes('STORAGE_KEY_XUONG2_HO_TRO') &&
  jsCloud.includes('data.xuong2HoTroRecords'));
check('K4 (history): vùng dữ liệu tab kanban', jsHist.includes('xuong2HoTroRecords'));
check('K5 (main): nạp lúc boot', jsMain.includes('loadXuong2HoTro()'));
check('K6 (events): wire submit + hủy + đổi ngày + chọn người + thu gọn + sửa/xóa ủy quyền',
  jsEvents.includes("safeOn('x2-ht-form', 'submit'") &&
  jsEvents.includes("safeOn('btn-cancel-x2-ht'") &&
  jsEvents.includes("safeOn('x2-ht-date', 'change'") &&
  jsEvents.includes("safeOn('x2-ht-workers', 'change'") &&
  jsEvents.includes("safeOn('btn-x2-ht-pick-all'") &&
  jsEvents.includes("safeOn('btn-toggle-x2ht-table'") &&
  jsEvents.includes("closest('[data-x2-ht-edit]')") &&
  jsEvents.includes("closest('[data-x2-ht-delete]')"));
check('K7 (index.html): form đủ 4 trường + vùng lịch sử + nút thu gọn',
  idxHtml.includes('id="x2-ht-form"') && idxHtml.includes('id="x2-ht-date"') &&
  idxHtml.includes('id="x2-ht-work"') && idxHtml.includes('id="x2-ht-workers"') &&
  idxHtml.includes('id="x2-ht-desc"') && idxHtml.includes('id="x2-ht-day-cards"') &&
  idxHtml.includes('id="btn-toggle-x2ht-table"'));
check('K8 (index.html): đã gỡ placeholder ".x2-soon-note" của thẻ Hỗ trợ',
  !idxHtml.includes('Chức năng đang được bổ sung') && !idxHtml.includes('id="x2-ho-tro-card"') === false &&
  idxHtml.slice(idxHtml.indexOf('id="x2-ho-tro-card"'), idxHtml.indexOf('id="x1-cat-ong-card"')).includes('x2-zone'));
check('K9 (styles.css): khối CSS riêng (.x2-ht-worker-tools + #x2-ht-workers + .x2-ht-calc)',
  cssCss.includes('.x2-ht-worker-tools') && cssCss.includes('#x2-ht-workers') &&
  cssCss.includes('.x2-ht-calc'));
check('K10 (export-xlsx): nguồn "hotro" + nhánh cột Ngày/Nội dung/Người/Mô tả/Giờ',
  jsXlsx.includes("id: 'hotro'") && jsXlsx.includes('state.xuong2HoTroRecords') &&
  jsXlsx.includes("source === 'hotro'"));
check('K11 (sw.js): đã tăng CACHE_NAME v233', /nha-may-ngoc-son-v233/.test(swJs));
check('K12 (index.html): gợi ý ô người nêu rõ CHỈ vị trí "Hỗ Trợ + Công Đoạn Lẻ" (Xưởng 2)',
  idxHtml.includes('Chỉ hiện người đang bố trí vị trí <b>"Hỗ Trợ + Công Đoạn Lẻ"</b>'));

console.log(`\nKẾT QUẢ: ${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);

