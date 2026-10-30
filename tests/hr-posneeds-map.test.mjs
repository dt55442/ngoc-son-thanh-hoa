// tests/hr-posneeds-map.test.mjs — SƠ ĐỒ BONG BÓNG NHÂN SỰ 3 CẤP (21/10/2026)
// Kiểm thử: chia nhu cầu theo ca · số liệu LIVE từ Bảng bố trí (đang bố trí /
// kỹ năng / dùng chung / trùng giờ / ngoài kỹ năng / dự bị) · ngày chưa có bố
// trí (no-data) · markup bong bóng → pill → chip · Bảng bố trí chia ca ·
// gộp bộ phận Lò Hơi → Cơ Điện · cấu trúc (index/events/CSS/cache).
'use strict';

// ─── Stubs môi trường (giống hr-posneeds.test.mjs) ───────────────
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
global.lucide = { createIcons(){} };
global.Chart = class { constructor(){} update(){} resize(){} destroy(){} };
Chart.register = () => {};
if (!global.URL.createObjectURL) global.URL.createObjectURL = () => 'blob:stub';
if (!global.URL.revokeObjectURL) global.URL.revokeObjectURL = () => {};

let pass = 0, fail = 0;
function check(name, cond) { if (cond) { pass++; console.log('PASS — ' + name); } else { fail++; console.log('FAIL — ' + name); } }

const fs = await import('fs');
const { state } = await import('../js/state.js');
const hr = await import('../js/hr.js');
state.currentUser = { username: 'admin', role: 'admin', editTabs: [], allowAdvanced: true };

const DAY = '2026-10-20';
const NO_DAY = '2026-10-21';
state.hrShifts = [
  { id: 'Xưởng 2', type: 'lamca', shifts: [
    { name: 'Ca ngày', start: '07:00', end: '19:00', brk: 1.5 },
    { name: 'Ca đêm',  start: '19:00', end: '07:00', brk: 1 }
  ] }
];
state.hrPositions = [
  { id: 'p1', name: 'Ép ván', department: 'Xưởng 2' },
  { id: 'p2', name: 'Cắt chọn', department: 'Xưởng 2' },
  { id: 'pq', name: 'Kiểm chất', department: 'QC' }
];
state.hrEmployees = [
  { id: 'e1', name: 'Nguyễn Văn A', department: 'Xưởng 2', status: 'active', skills: ['p1'] },
  { id: 'e2', name: 'Trần Thị B', department: 'Xưởng 2', status: 'active', skills: ['p1', 'p2'] },
  { id: 'e3', name: 'Lê Văn C', department: 'Xưởng 2', status: 'active', skills: ['p2'] },
  { id: 'e4', name: 'Phạm Văn D', department: 'QC', status: 'active', skills: ['p1'] },
  { id: 'e5', name: 'Võ Văn E', department: 'Xưởng 2', status: 'active', skills: [] },
  { id: 'e6', name: 'Đỗ Thị F', department: 'Xưởng 2', status: 'quit', skills: ['p1'] }
];
state.hrPositionNeeds = [
  { id: 'n1', department: 'Xưởng 2', position: 'Ép ván', positionId: 'p1', needQty: 3, haveQty: 9 },
  { id: 'n2', department: 'Xưởng 2', position: 'Cắt chọn', positionId: 'p2', needQty: 1, haveQty: 9 },
  { id: 'nq', department: 'QC', position: 'Kiểm chất', positionId: 'pq', needQty: 1, haveQty: 0 }
];
state.hrAssignments = [
  { id: 'a1', date: DAY, department: 'Xưởng 2', positionId: 'p1', employeeId: 'e1', shiftIdx: 0, start: '07:00', end: '19:00' },
  { id: 'a2', date: DAY, department: 'Xưởng 2', positionId: 'p2', employeeId: 'e1', shiftIdx: 0, start: '07:00', end: '10:00' },
  { id: 'a3', date: DAY, department: 'Xưởng 2', positionId: 'p1', employeeId: 'e2', shiftIdx: 1, start: '19:00', end: '' },
  { id: 'a4', date: DAY, department: 'Xưởng 2', positionId: 'p2', employeeId: 'e3', shiftIdx: 1, start: '19:00', end: '' }
];
state.hrBoardDate = DAY;
state.hrBoardDept = 'Xưởng 2';
hr.hrNeedWriteUi({ dept: '', date: DAY, onlyShort: false, showSkillLinks: false, q: '', openPos: null });

// ─── A. CHIA NHU CẦU NGÀY → TỪNG CA ────────────────────────────
check('CHIA CA: 2 ca · 4 → 2+2', hr.hrNeedSplitOf(4, 2, 'even').join('+') === '2+2');
check('CHIA CA: 2 ca · 3 → 2+1 (dư dồn ca đầu)', hr.hrNeedSplitOf(3, 2, 'even').join('+') === '2+1');
check('CHIA CA: 2 ca · 5 → 3+2', hr.hrNeedSplitOf(5, 2, 'even').join('+') === '3+2');
check('CHIA CA: 2 ca · 1 → 1+1 (mỗi ca tối thiểu 1)', hr.hrNeedSplitOf(1, 2, 'even').join('+') === '1+1');
check('CHIA CA: need 0 → 0+0 (không tự bịa 1)', hr.hrNeedSplitOf(0, 2, 'even').join('+') === '0+0');
check('CHIA CA: 1 ca → giữ nguyên', hr.hrNeedSplitOf(3, 1, 'even').join('+') === '3');
check('CHIA CA: chế độ "mỗi ca đủ N" → 3+3', hr.hrNeedSplitOf(3, 2, 'each').join('+') === '3+3');
check('CHIA CA: 3 ca · 4 → 2+1+1', hr.hrNeedSplitOf(4, 3, 'even').join('+') === '2+1+1');

// ─── B. SỐ LIỆU LIVE TỪ BẢNG BỐ TRÍ ────────────────────────────
const all = hr.hrNeedAllRows(DAY);
const ctx = all.ctx;
const r1 = all.rows.find(r => r.positionId === 'p1');
const r2 = all.rows.find(r => r.positionId === 'p2');
const rq = all.rows.find(r => r.positionId === 'pq');
check('LIVE: đọc được 4 lượt bố trí của ngày', ctx.assigns.length === 4 && ctx.hasData === true);
check('LIVE: Ép ván cần 3 → chia 2+1', r1.needPerShift.join('+') === '2+1' && r1.needTotal === 3);
check('LIVE: Ép ván có 1 người ca 1 + 1 người ca 2', r1.counts.join('+') === '1+1' && r1.assignedTotal === 2);
check('LIVE: Ép ván thiếu 1 (theo ca, KHÔNG theo unique)', r1.shortage === 1 && r1.status === 'short');
check('LIVE: Cắt chọn cần 1 → 1+1 = 2 suất', r2.needPerShift.join('+') === '1+1' && r2.needTotal === 2);
check('LIVE: Cắt chọn đủ 2 suất', r2.shortage === 0 && r2.covered === 2);
check('LIVE: QC chưa bố trí ai → thiếu 1', rq.shortage === 1 && rq.assignedTotal === 0);
check('KỸ NĂNG: Ép ván 3 người (bỏ NV đã nghỉ)', r1.skilled === 3 && r1.skilledSame === 2);
check('KỸ NĂNG: 1 người 2 kỹ năng KHÔNG bị đếm thành 2 người ở 1 vị trí', r1.skilled === 3 && r2.skilled === 2);
check('DỰ BỊ: Ép ván còn e4 (QC) chưa bố trí + rảnh', r1.reserveIds.join(',') === 'e4' && r1.reserveIdleIds.join(',') === 'e4');
check('DÙNG CHUNG: e1 làm 2 vị trí', ctx.shared.has('e1') && r1.sharedEmpIds.includes('e1') && r2.sharedEmpIds.includes('e1'));
check('TRÙNG GIỜ: a1 (07–19) và a2 (07–10) của e1 bị đánh dấu', ctx.conflict.has('a1') && ctx.conflict.has('a2') && r1.conflictIds.includes('e1'));
check('NGOÀI KỸ NĂNG: e1 (chỉ có kỹ năng Ép ván) làm Cắt chọn', r2.unskilledIds.join(',') === 'e1' && r1.unskilledIds.length === 0);
check('CHƯA KHAI KỸ NĂNG: không bị kết luận "ngoài kỹ năng"', !r1.unskilledIds.includes('e5'));

// ─── C. TỔNG HỢP + BONG BÓNG BỘ PHẬN ────────────────────────────
const t2 = hr.hrNeedTotalsOf(all.rows, 'Xưởng 2');
check('TỔNG Xưởng 2: cần 5 suất (3 + 1+1)', t2.need === 5);
check('TỔNG Xưởng 2: bố trí 4 · thiếu 1', t2.assigned === 4 && t2.shortage === 1);
check('TỔNG: 1 người dùng chung · 1 người ngoài kỹ năng', t2.shared === 1 && t2.unskilled === 1);
const tAll = hr.hrNeedTotalsOf(all.rows);
check('TỔNG toàn bộ: cần 6 · thiếu 2 (QC thiếu 1)', tAll.need === 6 && tAll.shortage === 2);
const sums = hr.hrNeedDeptSummaries(all.rows, ctx);
check('BONG BÓNG: đúng 5 bộ phận (Lò Hơi đã gộp)', sums.length === 5 && hr.HR_DEPARTMENTS.length === 5);
check('BONG BÓNG: Xưởng 2 = short, QC = short, Văn Phòng = empty', sums.find(s => s.dept === 'Xưởng 2').status === 'short' && sums.find(s => s.dept === 'QC').status === 'short' && sums.find(s => s.dept === 'Văn Phòng').status === 'empty');

// ─── D. MARKUP 3 CẤP + BẢNG BỐ TRÍ CHIA CA ─────────────────────
const ui0 = hr.hrNeedReadUi();
const bubHtml = hr.hnmBubblesHtml(all.rows, ctx, '');
check('MARKUP: 5 bong bóng bộ phận (data-hnm-dept)', (bubHtml.match(/data-hnm-dept=/g) || []).length === 5);
check('MARKUP: bong bóng có nước dâng --fill + tên bộ phận', bubHtml.includes('--fill:') && bubHtml.includes('Xưởng 2'));
const row1 = hr.hnmPosRowHtml(r1, ctx, ui0);
check('MARKUP: pill Ép ván có chip chia ca 2+1', row1.includes('hnm-pos-pill') && row1.includes('>2+1<'));
check('MARKUP: pill có ô sửa "Cần" + ô thiếu bấm được', row1.includes('data-hnm-need="n1"') && row1.includes('data-hnm-add="p1"'));
check('MARKUP: cấp 3 hiện chip người (e1) + badge dùng chung', row1.includes('data-hnm-person="e1"') && row1.includes('is-shared'));
const row2 = hr.hnmPosRowHtml(r2, ctx, ui0);
check('MARKUP: chip e1 ở Cắt chọn có cờ dùng chung + trùng giờ + ngoài kỹ năng', row2.includes('is-shared') && row2.includes('is-conflict') && row2.includes('is-unskilled'));
const sharedHtml = hr.hnmSharedColHtml(all.rows, ctx, 'Xưởng 2', ui0);
check('MARKUP: cột phải liệt kê "Người làm nhiều vị trí"', sharedHtml.includes('Người làm nhiều vị trí') && sharedHtml.includes('data-hnm-node-pos="p1"'));
const sharedSkill = hr.hnmSharedColHtml(all.rows, ctx, 'Xưởng 2', Object.assign({}, ui0, { showSkillLinks: true }));
check('MARKUP: bật "Đường kỹ năng" -> node dự bị e4 + data vị trí', sharedSkill.includes('is-reserve') && sharedSkill.includes('data-hnm-reserve-pos="p1"'));

hr.renderHrBoard();
const boardHtml = document.getElementById('hr-board').innerHTML;
check('BOARD: Ép ván "cần 3 → 2+1"', boardHtml.includes('cần 3 → 2+1'));
check('BOARD: Cắt chọn "cần 2 → 1+1"', boardHtml.includes('cần 2 → 1+1'));
check('BOARD: chỉ còn 1 ô trống (Ép ván ca 1 thiếu 1)', (boardHtml.match(/slot empty/g) || []).length === 1);
state.hrPositionNeeds.find(r => r.id === 'n1').needMode = 'each';
hr.renderHrBoard();
const boardEach = document.getElementById('hr-board').innerHTML;
check('BOARD: "mỗi ca đủ N" -> cần 6 → 3+3', boardEach.includes('cần 6 → 3+3'));
check('BOARD: mỗi ca đủ N -> 4 ô trống', (boardEach.match(/slot empty/g) || []).length === 4);
state.hrPositionNeeds.find(r => r.id === 'n1').needMode = 'even';

// ─── E. RENDER THẺ + NGÀY CHƯA CÓ BỐ TRÍ ──────────────────────
hr.renderHrNeedCard();
check('RENDER: 5 bong bóng trong #hnm-dept-bubbles', (document.getElementById('hnm-dept-bubbles').innerHTML.match(/data-hnm-dept=/g) || []).length === 5);
check('RENDER: KPI có "đang bố trí" + "còn thiếu"', document.getElementById('hnm-kpi').innerHTML.includes('đang bố trí') && document.getElementById('hnm-kpi').innerHTML.includes('còn thiếu'));
check('RENDER: chip tổng "cần 6 suất · đang bố trí 4 · còn thiếu 2"', document.getElementById('hr-posneed-count').textContent.includes('cần 6 suất') && document.getElementById('hr-posneed-count').textContent.includes('đang bố trí 4') && document.getElementById('hr-posneed-count').textContent.includes('còn thiếu 2'));
check('RENDER: bảng chi tiết có cột "Có Kỹ Năng" + "Dùng Chung"', document.getElementById('hr-posneed-body').innerHTML.includes('hnm-shared-tag'));
hr.hnmSelectDept('Xưởng 2');
check('RENDER: chọn bộ phận -> data-dept + 2 pill vị trí', document.getElementById('hr-need-map').dataset.dept === 'Xưởng 2' && (document.getElementById('hnm-pos-col').innerHTML.match(/hnm-pos-pill/g) || []).length === 2);
check('RENDER: chọn bộ phận -> chip tổng theo bộ phận (cần 5 suất)', document.getElementById('hr-posneed-count').textContent.includes('cần 5 suất'));
hr.hnmSetDate(NO_DAY);
const rowsNo = hr.hrNeedAllRows(NO_DAY).rows;
check('NO-DATA: ngày chưa bố trí -> mọi vị trí "no-data", thiếu = 0', rowsNo.every(r => r.status === 'no-data' && r.shortage === 0 && r.covered === 0));
check('NO-DATA: chip tổng ghi rõ chưa có dữ liệu bố trí', document.getElementById('hr-posneed-count').textContent.includes('chưa có dữ liệu bố trí'));
check('NO-DATA: không báo thiếu trong bảng (ô "—")', document.getElementById('hr-posneed-body').innerHTML.includes('>—</strong>'));
hr.hnmSetDate(DAY);
hr.hnmBack();

// ─── F. GỘP BỘ PHẬN "LÒ HƠI" → "CƠ ĐIỆN" ──────────────────────
state.hrEmployees.push({ id: 'm1', name: 'Lò Hơi A', department: 'Lò Hơi', status: 'active', skills: [] });
state.hrPositions.push({ id: 'mp', name: 'Đốt lò', department: 'Lò Hơi' });
state.hrPositionNeeds.push({ id: 'mn', department: 'Lò Hơi', position: 'Đốt lò', positionId: 'mp', needQty: 1 });
state.hrRecruitment = [{ id: 'mr', department: 'Lò Hơi', position: 'Đốt lò', needQty: 1 }];
state.hrAssignments.push({ id: 'ma', date: DAY, department: 'Lò Hơi', positionId: 'mp', employeeId: 'm1', shiftIdx: 0, start: '07:00', end: '' });
state.hrShifts.push({ id: 'Lò Hơi', type: 'hanhchinh', shifts: [{ name: 'Sáng', start: '07:00', end: '11:30' }] });
state.hrBoardDept = 'Lò Hơi';
const moved = hr.migrateHrDeptMerge();
check('GỘP BP: di trú 5 miền (nhân viên · vị trí · nhu cầu · tuyển · bố trí)', moved >= 5);
check('GỘP BP: employees -> Cơ Điện', state.hrEmployees.find(e => e.id === 'm1').department === 'Cơ Điện');
check('GỘP BP: positions -> Cơ Điện', state.hrPositions.find(p => p.id === 'mp').department === 'Cơ Điện');
check('GỘP BP: nhu cầu -> Cơ Điện', state.hrPositionNeeds.find(r => r.id === 'mn').department === 'Cơ Điện');
check('GỘP BP: tuyển dụng -> Cơ Điện', state.hrRecruitment[0].department === 'Cơ Điện');
check('GỘP BP: bố trí -> Cơ Điện', state.hrAssignments.find(a => a.id === 'ma').department === 'Cơ Điện');
check('GỘP BP: cấu hình ca "Lò Hơi" đổi id thành "Cơ Điện"', !!state.hrShifts.find(s => s.id === 'Cơ Điện') && !state.hrShifts.find(s => s.id === 'Lò Hơi'));
check('GỘP BP: bảng bố trí đang xem -> Cơ Điện', state.hrBoardDept === 'Cơ Điện');
check('GỘP BP: chạy lần 2 KHÔNG làm gì (idempotent)', hr.migrateHrDeptMerge() === 0);
// Có CẢ 2 cấu hình ca -> giữ Cơ Điện, bỏ Lò Hơi
state.hrShifts.push({ id: 'Lò Hơi', type: 'lamca', shifts: [{ name: 'Ca 1', start: '06:00', end: '18:00' }] });
state.hrEmployees.push({ id: 'm2', name: 'Lò Hơi B', department: 'Lò Hơi', status: 'active', skills: [] });
hr.migrateHrDeptMerge();
check('GỘP BP: có cả 2 cấu hình -> chỉ còn Cơ Điện', !state.hrShifts.find(s => s.id === 'Lò Hơi') && state.hrEmployees.find(e => e.id === 'm2').department === 'Cơ Điện');
check('ALIAS: "Lò Hơi" -> "Cơ Điện"', hr.hrDeptAliasOf('Lò Hơi') === 'Cơ Điện');
check('ALIAS: nhập Excel "lo hoi" -> "Cơ Điện"', hr.hrNormDept('lo hoi') === 'Cơ Điện');
check('ALIAS: "Xưởng 2" giữ nguyên', hr.hrDeptAliasOf('Xưởng 2') === 'Xưởng 2');
check('KHÔNG ĐỤNG: vị trí nhập nguyên liệu "lo-hoi" giữ nguyên', hr.hrDeptAliasOf('lo-hoi') === 'lo-hoi');
check('DANH MỤC: đúng 5 bộ phận, không còn Lò Hơi', hr.HR_DEPARTMENTS.length === 5 && !hr.HR_DEPARTMENTS.includes('Lò Hơi'));

// ─── G. CẤU TRÚC (index / events / main / CSS / cache) ─────────
const idx = fs.readFileSync('index.html', 'utf8');
const evSrc = fs.readFileSync('js/events.js', 'utf8');
const mainSrc = fs.readFileSync('js/main.js', 'utf8');
const cssSrc = fs.readFileSync('styles.css', 'utf8');
const swSrc = fs.readFileSync('sw.js', 'utf8');
const stateSrc = fs.readFileSync('js/state.js', 'utf8');
const expSrc = fs.readFileSync('js/export-xlsx.js', 'utf8');
check('CẤU TRÚC: index có đủ khối sơ đồ 3 cấp', ['hr-need-map', 'hnm-toolbar', 'hnm-kpi', 'hnm-dept-bubbles', 'hnm-focus', 'hnm-pos-col', 'hnm-shared-col', 'hnm-links', 'hnm-legend'].every(id => idx.includes(`id="${id}"`)));
check('CẤU TRÚC: đã bỏ select lọc bộ phận cũ', !idx.includes('hr-posneed-filter-dept'));
check('CẤU TRÚC: bảng chi tiết thu gọn + cột mới', idx.includes('hnm-table-box') && idx.includes('Có Kỹ Năng') && idx.includes('Đang Bố Trí'));
check('CẤU TRÚC: modal có chọn "Cách Chia Ca"', idx.includes('id="posneed-mode"') && idx.includes('Mỗi ca đủ N'));
check('WIRING: events uỷ nhiệm bong bóng / ô Cần / vẽ lại đường', evSrc.includes('data-hnm-dept') && evSrc.includes('data-hnm-need') && evSrc.includes('hnmDrawLinks'));
check('WIRING: main.js xuất hàm sơ đồ cho onclick', mainSrc.includes('hnmOpenAssign') && mainSrc.includes('hnmSelectDept'));
check('EXCEL: báo cáo có cột Cần Ca 1 / Ngoài Kỹ Năng / Dùng Chung', expSrc.includes('Cần Ca 1') && expSrc.includes('Ngoài Kỹ Năng') && expSrc.includes('Dùng Chung'));
check('CSS: khối .hnm-* ở cấp cao nhất (không lọt vào @media)', (() => {
  const i = cssSrc.indexOf('.hnm-pos {');
  if (i < 0) return false;
  let d = 0;
  for (let k = 0; k < i; k++) { if (cssSrc[k] === '{') d++; else if (cssSrc[k] === '}') d--; }
  return d === 0;
})());
check('CSS: ngoặc { } cân bằng + có keyframes', (cssSrc.match(/{/g) || []).length === (cssSrc.match(/}/g) || []).length && cssSrc.includes('@keyframes hnmFloat'));
check('CACHE: sw.js v318 khớp APP_VERSION', /nha-may-ngoc-son-v318/.test(swSrc) && /APP_VERSION = 'v318'/.test(stateSrc));

// ─── H. MỞ THẺ THẬT — CHỐNG LỖI "THẺ TRỐNG" (map thẻ ↔ phần vẽ) ─
check('THẺ: map có đúng id thật "hr-posneed-card" -> posneeds', hr.hrCardRenderParts('hr-posneed-card').includes('posneeds'));
check('THẺ: alias id cũ "hr-posneeds-card" vẫn chạy', hr.hrCardRenderParts('hr-posneeds-card').includes('posneeds'));
check('THẺ: id lạ -> vẽ ĐỦ phần (không trả rỗng)', hr.hrCardRenderParts('thẻ-không-tồn-tại').length >= 5);
check('THẺ: không có thẻ mở -> [] (giữ tối ưu chỉ vẽ bảng bố trí)', hr.hrCardRenderParts('').length === 0);
const cardIds = [...idx.matchAll(/data-hr-card="([^"]+)"/g)].map(m => m[1]);
check('THẺ: 12 thẻ launcher đều có phần vẽ (không thẻ nào trống)', cardIds.length === 12 && cardIds.every(id => hr.hrCardRenderParts(id).length > 0));
hr.hrOpenCard('hr-posneed-card');
check('MỞ THẺ: toolbar + KPI có nội dung', document.getElementById('hnm-toolbar').innerHTML.length > 100 && document.getElementById('hnm-kpi').innerHTML.includes('đang bố trí'));
check('MỞ THẺ: bong bóng bộ phận được vẽ', (document.getElementById('hnm-dept-bubbles').innerHTML.match(/data-hnm-dept=/g) || []).length === 5);
check('MỞ THẺ: bảng chi tiết có dòng dữ liệu', document.getElementById('hr-posneed-body').innerHTML.includes('hnm-status'));

console.log(`\nWYNIK: ${pass} pass, ${fail} fail`);
if (fail > 0) process.exit(1);


