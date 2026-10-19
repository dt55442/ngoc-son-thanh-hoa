// tests/hr-import.test.mjs — Kiểm thử NẠP NHÂN VIÊN TỪ EXCEL (19/10/2026)
// Mục tiêu:
//   A. CHỐNG TREO: đọc sheet theo VÙNG DÙNG THẬT (không tin `!ref`), chặn trần cột/dòng.
//   B. SO KHỚP: Mã NV (chuẩn hóa) → Họ tên → SĐT; trùng tên mơ hồ thì KHÔNG tự sửa.
//   C. GỘP "chỉ điền, không xóa": ô trống trong file KHÔNG ghi đè dữ liệu đang có
//      (đây chính là "nạp BỔ SUNG thông tin còn thiếu"), và KHÔNG tạo thêm dòng mới.
'use strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');

// ─── Stubs môi trường (giống hr-cards.test.mjs) ──────────────────
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
global.Chart = class {
  constructor(ctx, cfg) { this.ctx = ctx; this.config = cfg; this.data = (cfg && cfg.data) || { labels: [], datasets: [] }; }
  update(){} resize(){} destroy(){} render(){} reset(){} getDatasetMeta(){ return { data: [] }; }
};
Chart.register = () => {};
if (!global.URL.createObjectURL) global.URL.createObjectURL = () => 'blob:stub';
if (!global.URL.revokeObjectURL) global.URL.revokeObjectURL = () => {};
global.XLSX = {
  utils: {
    book_new: () => ({ SheetNames: [] }), aoa_to_sheet: () => ({}), json_to_sheet: () => ({}),
    book_append_sheet(){}, encode_cell: () => 'A1',
    decode_range: () => ({ s: { r: 0, c: 0 }, e: { r: 0, c: 0 } }),
    sheet_to_json: () => []
  },
  writeFile(){}, write: () => new ArrayBuffer(8), read: () => ({ SheetNames: [], Sheets: {} })
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

const { state } = await import('../js/state.js');
const hr = await import('../js/hr.js');
state.currentUser = { username: 'admin', role: 'admin', editTabs: [], allowAdvanced: true };

// Ánh xạ tiêu đề → trường (giống bước tự nhận trong handleEmployeeImportFile)
function mapFromHeaders(headers) {
  const used = new Set();
  const m = {};
  headers.forEach((h, i) => {
    const k = hr.autoMapEmployeeField(h, used);
    m[i] = k;
    if (k) used.add(k);
  });
  return m;
}
const AOA = (headers, rows) => [headers, ...rows];
const reset = (list) => { state.hrEmployees = JSON.parse(JSON.stringify(list || [])); };

// ═══ A. CHỐNG TREO — VÙNG DÙNG THẬT + TRẦN CỘT/DÒNG ═══════════
// File thật hay khai báo `!ref` phình (VD A1:ZZ20000 dù chỉ 200 dòng dữ liệu).
// `sheet_to_json` đọc theo `!ref` ⇒ materialize hàng trăm nghìn ô → treo trang.
check('A1: hrCellAddrToRC("A1") = {r:0,c:0}',
  JSON.stringify(hr.hrCellAddrToRC('A1')) === JSON.stringify({ r: 0, c: 0 }));
check('A2: hrCellAddrToRC("AB12") = {r:11,c:27}',
  JSON.stringify(hr.hrCellAddrToRC('AB12')) === JSON.stringify({ r: 11, c: 27 }));
check('A3: hrCellAddrToRC("XFD1") cột cuối = 16383', hr.hrCellAddrToRC('XFD1').c === 16383);
check('A4: hrCellAddrToRC("!ref") = null', hr.hrCellAddrToRC('!ref') === null);

const wsWide = { '!ref': 'A1:ZZ20000' };
for (let r = 1; r <= 3; r++) {
  ['A', 'B', 'C'].forEach((col, ci) => { wsWide[col + r] = { t: 's', v: 'v' + r + ci }; });
}
wsWide['D5'] = { t: 'z' };            // ô chỉ có format, KHÔNG có giá trị
const usedWide = hr.hrSheetUsedRange(wsWide);
check('A5: bỏ qua `!ref` — dùng thật chỉ 3 cột × 3 dòng', usedWide.cols === 3 && usedWide.rows === 3);
check('A6: range kết thúc đúng ô cuối có dữ liệu (C3)',
  usedWide.range.e.r === 2 && usedWide.range.e.c === 2);
check('A7: ô format suông (không có .v) KHÔNG tính là có dữ liệu', usedWide.rows === 3);
check('A8: file bình thường không bị cờ vượt trần', usedWide.colsCapped === false && usedWide.rowsCapped === false);

const wsHuge = { '!ref': 'A1:XFD100000', A1: { v: 'Ten' }, B1: { v: 'Ma' }, XFD100000: { v: 'x' } };
const usedHuge = hr.hrSheetUsedRange(wsHuge);
check('A9: sheet tới cột XFD → báo vượt trần cột', usedHuge.colsCapped === true);
check('A10: range cột bị kẹp ở trần ' + hr.HR_IMPORT_MAX_COLS, usedHuge.range.e.c === hr.HR_IMPORT_MAX_COLS - 1);
check('A11: sheet 100.000 dòng → báo vượt trần dòng', usedHuge.rowsCapped === true);
check('A12: range dòng bị kẹp ở trần ' + hr.HR_IMPORT_MAX_ROWS, usedHuge.range.e.r === hr.HR_IMPORT_MAX_ROWS - 1);
check('A13: sheet rỗng → cols/rows = 0', hr.hrSheetUsedRange({ '!ref': 'A1:Z99' }).cols === 0);
check('A14: ws null không ném lỗi', hr.hrSheetUsedRange(null).cols === 0);

// Mã nguồn PHẢI truyền `range` + bỏ dòng trống (nếu không sẽ quay lại lỗi treo)
const hrSrc = fs.readFileSync(path.join(ROOT, 'js', 'hr.js'), 'utf8');
check('A15: sheet_to_json nhận `range: used.range`', /sheet_to_json\(ws,\s*\{[\s\S]{0,220}?range:\s*used\.range/.test(hrSrc));
check('A16: sheet_to_json có blankrows: false', /sheet_to_json\(ws,\s*\{[\s\S]{0,220}?blankrows:\s*false/.test(hrSrc));
check('A17: KHÔNG còn đọc sheet_to_json KHÔNG kèm range',
  !/sheet_to_json\(ws,\s*\{\s*header:\s*1,\s*raw:\s*true,\s*defval:\s*''\s*\}\)/.test(hrSrc));
check('A18: bảng ánh xạ cắt trần cột (headers.slice(0, HR_IMPORT_MAX_COLS))',
  hrSrc.includes('headers.slice(0, HR_IMPORT_MAX_COLS)'));
check('A19: hiện overlay chờ khi đọc file (showTreLoading + finally hideTreLoading)',
  /showTreLoading\('Đang đọc file Excel…'\)/.test(hrSrc) && /finally\s*\{\s*hideTreLoading\(treOk\);/.test(hrSrc));

// ═══ B. CHUẨN HÓA KHÓA SO KHỚP ════════════════════════════════
check('B1: mã "NV 001" ≡ "nv001"', hr.hrNormCode('NV 001') === 'NV1' && hr.hrNormCode('nv001') === 'NV1');
check('B2: Excel lưu số 1 ⇒ khóa "1" khớp với chuỗi "001"', hr.hrNormCode(1) === '1' && hr.hrNormCode('001') === '1');
check('B3: mã có gạch/ khoảng trắng "nv-001" vẫn khớp', hr.hrNormCode('nv-001') === 'NV1');
check('B4: tên bỏ dấu + gộp khoảng trắng + bỏ dấu chấm',
  hr.hrNormNameKey('Nguyễn  Văn A.') === hr.hrNormNameKey('nguyen van a'));
check('B5: 9 số cuối SĐT (bỏ +84 / dấu cách)', hr.hrDigits9('+84 912 345 678') === '912345678');
check('B6: giới tính lạ KHÔNG bị mặc định', hr.hrNormGenderStrict('Khác') === '' && hr.hrNormGenderStrict('Nữ') === 'Nữ');
check('B7: trạng thái lạ KHÔNG bị mặc định', hr.hrNormStatusStrict('Nghỉ thai sản') === '');
check('B8: trạng thái "Đã nghỉ việc" → quit', hr.hrNormStatusStrict('Đã nghỉ việc') === 'quit');

// ═══ C. CẬP NHẬT ĐÚNG NGƯỜI — KHÔNG tạo dòng mới ═════════════
// C1. Khớp MÃ NV (chuẩn hóa) → cập nhật, kể cả khi file ghi "nv 001" / số 1
reset([{ id: 'e1', code: 'NV001', name: 'Nguyễn Văn A', phone: '0901111111', department: 'Xưởng 1', status: 'active', skills: [] }]);
{
  const headers = ['Họ và Tên', 'Mã NV', 'SĐT'];
  const res = hr.importEmployeesFromSheet(
    AOA(headers, [['Nguyễn Văn A', 'nv 001', '0909999999']]), mapFromHeaders(headers), 'upsert');
  check('C1: khớp Mã NV (viết khác "nv 001") → cập nhật 1, thêm mới 0', res.updated === 1 && res.added === 0);
  check('C2: danh sách KHÔNG tăng thêm dòng', state.hrEmployees.length === 1);
  check('C3: SĐT được cập nhật theo file', state.hrEmployees[0].phone === '0909999999');
}

// C4. File KHÔNG có Mã NV → phải khớp theo HỌ TÊN (lỗi cũ: luôn thêm dòng mới)
reset([{ id: 'e1', code: 'NV001', name: 'Nguyễn Văn A', phone: '0901', department: 'Xưởng 1', status: 'active' }]);
{
  const headers = ['Họ và Tên', 'Bộ phận'];
  const res = hr.importEmployeesFromSheet(
    AOA(headers, [['Nguyễn  Văn A', 'Xưởng 2']]), mapFromHeaders(headers), 'upsert');
  check('C4: không có Mã NV → khớp theo Họ tên, KHÔNG thêm dòng mới',
    res.added === 0 && res.updated === 1 && state.hrEmployees.length === 1);
  check('C5: Bộ phận mới trong file được cập nhật', state.hrEmployees[0].department === 'Xưởng 2');
  check('C6: Mã NV cũ vẫn giữ nguyên (file không có cột mã)', state.hrEmployees[0].code === 'NV001');
}

// C7. Mã NV lưu dạng SỐ trong Excel vẫn khớp mã chuỗi (001 ↔ 1)
reset([{ id: 'e1', code: '001', name: 'Lê Văn C', department: 'Lò Hơi', status: 'active' }]);
{
  const headers = ['Họ và Tên', 'Mã NV', 'CCCD'];
  const res = hr.importEmployeesFromSheet(AOA(headers, [['Lê Văn C', 1, '012345678901']]), mapFromHeaders(headers), 'upsert');
  check('C7: mã "001" khớp số 1 của Excel → cập nhật, không tạo dòng',
    res.updated === 1 && res.added === 0 && state.hrEmployees.length === 1);
}

// ═══ D. LUẬT "CHỈ ĐIỀN, KHÔNG XÓA" (bổ sung thông tin còn thiếu) ═══
reset([{
  id: 'e1', code: 'NV001', name: 'Nguyễn Văn A', gender: 'Nam', birthDate: '1990-01-02',
  phone: '0901', idCard: '', address: 'Hà Nội', department: 'Xưởng 1', position: 'Ép ván',
  title: 'Tổ trưởng', joinDate: '2020-02-02', status: 'active', notes: 'ghi chú cũ',
  skills: [{ id: 'p1', name: 'Cắt chọn' }], createdAt: '2020-02-02T00:00:00.000Z'
}]);
{
  const headers = ['Họ và Tên', 'Mã NV', 'SĐT', 'Địa chỉ', 'Bộ phận', 'Trạng thái', 'Ghi chú', 'CCCD'];
  const res = hr.importEmployeesFromSheet(
    AOA(headers, [['Nguyễn Văn A', 'NV001', '', '', '', '', '', '012345678901']]), mapFromHeaders(headers), 'upsert');
  const e = state.hrEmployees[0];
  check('D1: ô TRỐNG không xóa SĐT đang có', e.phone === '0901');
  check('D2: ô TRỐNG không xóa Địa chỉ', e.address === 'Hà Nội');
  check('D3: ô TRỐNG không đổi Bộ phận thành "Văn Phòng"', e.department === 'Xưởng 1');
  check('D4: ô TRỐNG không đổi Trạng thái', e.status === 'active');
  check('D5: ô TRỐNG không xóa Ghi chú', e.notes === 'ghi chú cũ');
  check('D6: ô TRỐNG không đổi Giới tính/Ngày sinh/Ngày vào', e.gender === 'Nam' && e.birthDate === '1990-01-02' && e.joinDate === '2020-02-02');
  check('D7: ô CÓ dữ liệu (CCCD) được BỔ SUNG', e.idCard === '012345678901');
  check('D8: đếm đúng số ô được bổ sung = 1', res.filled === 1);
  check('D9: giữ nguyên id + createdAt + kỹ năng', e.id === 'e1' && e.createdAt === '2020-02-02T00:00:00.000Z' && e.skills.length === 1);
  check('D10: không tạo dòng mới', state.hrEmployees.length === 1 && res.added === 0);
}

// D11. Nhân viên ĐÃ NGHỈ: file trống cột Trạng thái không được "hồi sinh"
reset([{ id: 'e1', code: 'NV003', name: 'Lê Văn C', status: 'quit', quitDate: '2024-05-01', department: 'Lò Hơi' }]);
{
  const headers = ['Họ và Tên', 'Mã NV', 'SĐT'];
  hr.importEmployeesFromSheet(AOA(headers, [['Lê Văn C', 'NV003', '']]), mapFromHeaders(headers), 'upsert');
  check('D11: trạng thái quit được giữ (không bị đổi thành active)', state.hrEmployees[0].status === 'quit');
  check('D12: ngày nghỉ việc vẫn giữ', state.hrEmployees[0].quitDate === '2024-05-01');
}

// D13. File CÓ trạng thái nghỉ việc + ngày nghỉ → cập nhật đúng, khớp quitDate
reset([{ id: 'e1', code: 'NV002', name: 'Trần Thị B', status: 'active', quitDate: '' }]);
{
  const headers = ['Họ và Tên', 'Mã NV', 'Trạng thái', 'Ngày nghỉ việc'];
  hr.importEmployeesFromSheet(
    AOA(headers, [['Trần Thị B', 'NV002', 'Đã nghỉ việc', '01/06/2024']]), mapFromHeaders(headers), 'upsert');
  check('D13: trạng thái → quit + ngày nghỉ dd/MM/yyyy chuẩn hóa',
    state.hrEmployees[0].status === 'quit' && state.hrEmployees[0].quitDate === '2024-06-01');
}

// D14. Đang quit mà file ghi "Đang làm việc" → mở lại + xóa quitDate (giống form sửa)
reset([{ id: 'e1', code: 'NV004', name: 'Phạm Văn D', status: 'quit', quitDate: '2024-05-01' }]);
{
  const headers = ['Họ và Tên', 'Mã NV', 'Trạng thái'];
  hr.importEmployeesFromSheet(AOA(headers, [['Phạm Văn D', 'NV004', 'Đang làm việc']]), mapFromHeaders(headers), 'upsert');
  check('D14: chuyển lại Đang làm việc ⇒ xóa quitDate', state.hrEmployees[0].status === 'active' && state.hrEmployees[0].quitDate === '');
}

// ═══ E. KHÔNG SỬA NHẦM NGƯỜI (trùng tên) ═══════════════════════
// E1. 2 người trùng tên, dòng file không đủ dữ kiện phân biệt
reset([
  { id: 'a', code: 'NV001', name: 'Nguyễn Văn A', phone: '0901', status: 'active' },
  { id: 'b', code: 'NV002', name: 'Nguyễn Văn A', phone: '0902', status: 'active' }
]);
{
  const headers = ['Họ và Tên', 'SĐT'];
  const res = hr.importEmployeesFromSheet(AOA(headers, [['Nguyễn Văn A', '']]), mapFromHeaders(headers), 'upsert');
  check('E1: trùng tên mơ hồ → KHÔNG sửa ai (ambiguous 1)', res.ambiguous === 1 && res.updated === 0);
  check('E2: cũng KHÔNG thêm dòng mới', res.added === 0 && state.hrEmployees.length === 2);
  check('E3: dữ liệu 2 người không bị đụng', state.hrEmployees[0].phone === '0901' && state.hrEmployees[1].phone === '0902');
}

// E4. Trùng tên nhưng có SĐT → thu hẹp đúng người
reset([
  { id: 'a', code: 'NV001', name: 'Nguyễn Văn A', phone: '0901111111', status: 'active' },
  { id: 'b', code: 'NV002', name: 'Nguyễn Văn A', phone: '0902222222', status: 'active' }
]);
{
  const headers = ['Họ và Tên', 'SĐT', 'Chức vụ'];
  const res = hr.importEmployeesFromSheet(AOA(headers, [['Nguyễn Văn A', '0902 222 222', 'Tổ trưởng']]), mapFromHeaders(headers), 'upsert');
  check('E4: SĐT giúp chọn đúng người trong 2 người trùng tên', res.updated === 1 && res.ambiguous === 0);
  check('E5: chỉ người thứ 2 được cập nhật', state.hrEmployees[1].title === 'Tổ trưởng' && state.hrEmployees[0].title !== 'Tổ trưởng');
}

// E6. Trùng tên nhưng KHÁC Mã NV ⇒ coi là người khác, thêm mới + báo (không ghi đè)
reset([{ id: 'a', code: 'NV002', name: 'Trần Thị B', phone: '', status: 'active' }]);
{
  const headers = ['Họ và Tên', 'Mã NV'];
  const res = hr.importEmployeesFromSheet(AOA(headers, [['Trần Thị B', 'NV099']]), mapFromHeaders(headers), 'upsert');
  check('E6: trùng tên khác mã → thêm mới (không ghi đè người cũ)', res.added === 1 && res.nameConflicts === 1);
  check('E7: hồ sơ người cũ giữ nguyên mã NV002', state.hrEmployees[0].code === 'NV002' && state.hrEmployees.length === 2);
}

// ═══ F. CHẾ ĐỘ "THÊM MỚI TẤT CẢ" — ĐẾM TRÙNG + ID DUY NHẤT ════
reset([{ id: 'a', code: 'NV001', name: 'Nguyễn Văn A', status: 'active' }]);
{
  const headers = ['Họ và Tên', 'Mã NV'];
  const m = mapFromHeaders(headers);
  const aoa = AOA(headers, [['Nguyễn Văn A', 'NV001'], ['Người Mới', '']]);
  check('F1: hrCountImportMatches đếm 1 dòng trùng trước khi nạp', hr.hrCountImportMatches(aoa, m) === 1);
  const res = hr.importEmployeesFromSheet(aoa, m, 'add');
  check('F2: chế độ thêm mới vẫn thêm đủ 2 dòng + ĐẾM 1 nghi trùng', res.added === 2 && res.duplicates === 1);
  check('F3: 3 bản ghi với id KHÔNG trùng nhau',
    state.hrEmployees.length === 3 && new Set(state.hrEmployees.map(e => e.id)).size === 3);
  const added = state.hrEmployees.find(e => e.name === 'Người Mới');
  check('F4: dòng mới thiếu Mã NV được tự cấp mã kế tiếp (NV002)', !!added && added.code === 'NV002');
}

// F5. Nạp 2 lần cùng file ở chế độ "Cập nhật" → lần 2 KHÔNG đổi gì (idempotent)
reset([{ id: 'e1', code: 'NV001', name: 'Nguyễn Văn A', phone: '0901', department: 'Xưởng 1', status: 'active' }]);
{
  const headers = ['Họ và Tên', 'Mã NV', 'SĐT', 'Bộ phận'];
  const m = mapFromHeaders(headers);
  const aoa = AOA(headers, [['Nguyễn Văn A', 'NV001', '0901', 'Xưởng 1']]);
  hr.importEmployeesFromSheet(aoa, m, 'upsert');
  const res2 = hr.importEmployeesFromSheet(aoa, m, 'upsert');
  check('F5: nạp lại y hệt → 0 thêm, 0 sửa, 1 "không đổi"', res2.added === 0 && res2.updated === 0 && res2.unchanged === 1);
  check('F6: danh sách vẫn đúng 1 người', state.hrEmployees.length === 1);
}

// ═══ G. KHỐI KẾT QUẢ NẠP (modal giữ mở để đối chiếu) ══════════
hr.renderEmployeeImportResult({
  added: 2, updated: 3, filled: 1, unchanged: 4, skipped: 5,
  duplicates: 1, ambiguous: 2, nameConflicts: 0,
  addedNames: ['A'], updatedNames: ['B'], duplicateNames: ['C'], ambiguousNames: ['D'],
  conflictNames: []
}, 'DS.xlsx');
{
  const box = document.getElementById('emp-import-result');
  check('G1: hiện khối kết quả (hidden = false)', box.hidden === false);
  check('G2: có tiêu đề + tên file', box.innerHTML.includes('Kết quả nạp từ') && box.innerHTML.includes('DS.xlsx'));
  check('G3: hiện đủ 4 số chính (thêm mới/cập nhật/bổ sung/không đổi)',
    box.innerHTML.includes('Thêm mới') && box.innerHTML.includes('Cập nhật') &&
    box.innerHTML.includes('Bổ sung ô đang trống') && box.innerHTML.includes('Không đổi'));
  check('G4: cảnh báo nghi trùng + trùng tên KHÔNG tự sửa',
    box.innerHTML.includes('Nghi trùng') && box.innerHTML.includes('KHÔNG tự sửa'));
  check('G5: nhắc rõ ô trống không ghi đè', box.innerHTML.includes('KHÔNG ghi đè dữ liệu đang có'));
}

// ═══ H. CẤU TRÚC (index / styles / sw / state) ════════════════
const idxHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const cssSrc = fs.readFileSync(path.join(ROOT, 'styles.css'), 'utf8');
const swSrc = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
const stateSrc = fs.readFileSync(path.join(ROOT, 'js', 'state.js'), 'utf8');
check('H1: index.html có khối kết quả #emp-import-result', /id="emp-import-result"/.test(idxHtml));
check('H2: nhãn chế độ upsert ghi rõ "Mã NV / Họ tên"',
  /id="emp-import-mode-upsert"[^>]*>\s*Cập nhật nhân viên trùng \(Mã NV \/ Họ tên\)/.test(idxHtml));
check('H3: có ghi chú ô trống KHÔNG xóa dữ liệu', /ô trống <strong>KHÔNG<\/strong> xóa/.test(idxHtml));
check('H4: hr.js import overlay chờ từ loading.js', /from '\.\/loading\.js'/.test(hrSrc) && hrSrc.includes('showTreLoading'));
check('H5: styles.css có .emp-import-result + rule ẩn [hidden]',
  cssSrc.includes('.emp-import-result {') && cssSrc.includes('.emp-import-result[hidden]'));
check('H6: sw.js cache = APP_VERSION trong state.js (cùng phiên bản)',
  (swSrc.match(/nha-may-ngoc-son-(v\d+)/) || [])[1] === (stateSrc.match(/APP_VERSION = '(v\d+)'/) || [])[1]);

console.log(`\nKẾT QUẢ: ${pass} pass, ${fail} fail`);
if (fail > 0) process.exit(1);




