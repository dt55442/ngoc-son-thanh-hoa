// tests/export-hr-qc.test.mjs — Kiểm thử XUẤT EXCEL tab QC (Bảng Xuất Hàng)
// và tab Nhân Sự (xuất theo thẻ nhanh / mini card).
// Bao phủ: modal bộ lọc + điền option, lọc năm/tuần/thành phẩm, dòng TỔNG CỘNG,
// thể tích quy đổi, 9 lựa chọn Nhân Sự, lọc bộ phận, chặn xuất khi không có dữ liệu.
'use strict';

// ─── Stubs môi trường (giống export-tabs.test.mjs) ────────────────
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
const { state } = await import('../js/state.js');
const xlsxMod = await import('../js/export-xlsx.js');

state.currentUser = { username: 'admin', role: 'admin', editTabs: ['qc', 'hr'], allowAdvanced: true };

// ─── XLSX GHÉP ĐỂ BẮT FILE ────────────────────────────────────────
let writtenFiles = [];
let lastSheetAoa = null;
let lastSheetName = '';
global.XLSX = {
  utils: {
    book_new: () => ({ sheets: [] }),
    aoa_to_sheet: (aoa) => ({ aoa }),
    book_append_sheet: (wb, ws, name) => { wb.sheets.push({ name, aoa: ws.aoa }); lastSheetAoa = ws.aoa; lastSheetName = name; }
  },
  writeFile: (wb, filename) => { writtenFiles.push({ filename, wb }); },
  write: () => new ArrayBuffer(8)
};

const ev = { preventDefault(){} };
function setVal(id, v) { const el = document.getElementById(id); el.value = v; return el; }
function modalShown(id) { return document.getElementById(id).classList._s.has('show'); }
const dataRowsOf = () => lastSheetAoa.filter((row, i) => i >= 3 && String(row[0]) !== '' && !/TỔNG CỘNG/i.test(String(row[1] || '')) && !/TỔNG CỘNG/i.test(String(row[0] || '')));

// ─── DỮ LIỆU GIẢ ──────────────────────────────────────────────
state.materialRates = [
  { id: 'rate-1', product: 'Ván 1200x382x9',  productCode: 'VS9' },
  { id: 'rate-2', product: 'Ván 1200x382x12', productCode: 'VS12' }
];
state.planningItems = [
  { year: 2026, week: 'Tuần 2', productId: 'rate-1', qty: 100 }
];

// ─── QC: BẢNG XUẤT HÀNG ───────────────────────────────────────
state.qcExports = [
  { id: 'q1', productId: 'rate-1', week: 'Tuần 33', year: 2026, qty: 10,  note: 'đơn A' },
  { id: 'q2', productId: 'rate-2', week: 'Tuần 34', year: 2026, qty: 5,   note: '' },
  { id: 'q3', productId: null,     name: 'Hàng mẫu khách B', week: 'Tuần 33', year: 2025, qty: 7, note: 'ngoài kế hoạch' }
];

xlsxMod.openQcXlsxExportModal();
check('QC: mở modal xuất', modalShown('modal-export-qc'));
check('QC: select năm có 2025 & 2026', document.getElementById('export-qc-year').innerHTML.includes('>2025<') && document.getElementById('export-qc-year').innerHTML.includes('>2026<'));
check('QC: select tuần gộp đúng Tuần 33/34', document.getElementById('export-qc-week').innerHTML.includes('>Tuần 33<') && document.getElementById('export-qc-week').innerHTML.includes('>Tuần 34<'));
check('QC: select thành phẩm có "Ván 1200x382x9" và hàng mẫu', document.getElementById('export-qc-product').innerHTML.includes('Ván 1200x382x9') && document.getElementById('export-qc-product').innerHTML.includes('Hàng mẫu khách B'));

// Xuất tất cả
writtenFiles = [];
setVal('export-qc-year', 'all'); setVal('export-qc-week', 'all'); setVal('export-qc-product', 'all');
xlsxMod.handleQcXlsxExportSubmit(ev);
check('QC: xuất được 1 file', writtenFiles.length === 1);
check('QC: tên file QC_XuatHang_*.xlsx', /QC_XuatHang_\d{4}-\d{2}-\d{2}\.xlsx$/.test(writtenFiles[0]?.filename || ''));
check('QC: sheet "QC Xuất Hàng"', lastSheetName === 'QC Xuất Hàng');
check('QC: đủ 3 dòng dữ liệu', dataRowsOf().length === 3);
const qcTotal = lastSheetAoa.find(r => r[1] === 'TỔNG CỘNG');
check('QC: tổng số lượng = 22', !!qcTotal && qcTotal[4] === 22);
check('QC: dòng có định mức có thể tích > 0', lastSheetAoa.some(r => r[1] === 'Ván 1200x382x9' && Number(r[5]) > 0));
check('QC: dòng ngoài kế hoạch thể tích = trống', lastSheetAoa.some(r => r[1] === 'Hàng mẫu khách B' && (r[5] === '' || r[5] === 0)));

// Lọc năm 2025 → chỉ 1 dòng hàng mẫu
writtenFiles = [];
setVal('export-qc-year', '2025'); setVal('export-qc-week', 'all'); setVal('export-qc-product', 'all');
xlsxMod.handleQcXlsxExportSubmit(ev);
check('QC: lọc năm 2025 còn 1 dòng', dataRowsOf().length === 1 && dataRowsOf()[0][1] === 'Hàng mẫu khách B');

// Lọc tuần 34 → chỉ 1 dòng
writtenFiles = [];
setVal('export-qc-year', 'all'); setVal('export-qc-week', '34'); setVal('export-qc-product', 'all');
xlsxMod.handleQcXlsxExportSubmit(ev);
check('QC: lọc tuần 34 còn 1 dòng (rate-2)', dataRowsOf().length === 1 && dataRowsOf()[0][1] === 'Ván 1200x382x12');

// Lọc kết hợp không có kết quả → không tạo file + giữ modal (mở lại modal trước khi thử)
xlsxMod.openQcXlsxExportModal();
writtenFiles = [];
setVal('export-qc-year', '2025'); setVal('export-qc-week', '34');
xlsxMod.handleQcXlsxExportSubmit(ev);
check('QC: lọc vô hiệu -> không tạo file', writtenFiles.length === 0);
check('QC: lọc vô hiệu -> modal còn mở (để sửa)', modalShown('modal-export-qc'));

// ─── NHÂN SỰ: XUẤT THEO THẺ NHANH ─────────────────────────────
state.hrEmployees = [
  { id: 'e1', code: 'NV01', name: 'Nguyễn Văn A',  gender: 'Nam',  department: 'Xưởng 1',   position: 'Công nhân', title: '',              joinDate: '2025-01-10', status: 'active', notes: '' },
  { id: 'e2', code: 'NV02', name: 'Trần Thị B',    gender: 'Nữ',   department: 'Văn Phòng', position: 'Kế toán',   title: 'Kế toán trưởng', joinDate: '2024-06-01', status: 'pause',  notes: 'tạm nghỉ' },
  { id: 'e3', code: 'NV03', name: 'Lê Văn C',      gender: 'Nam',  department: 'Xưởng 1',   position: 'Ép ván',    title: '',              joinDate: '2025-03-15', status: 'active', notes: '' }
];
state.hrPositions = [
  { id: 'p1', name: 'Ép ván',   department: 'Xưởng 1', note: '' },
  { id: 'p2', name: 'Bào tinh', department: 'Xưởng 2', note: 'ca 2' }
];
state.hrLeaves = [
  { id: 'l1', employeeId: 'e1', type: 'Ốm', from: '2026-09-10', to: '2026-09-12', days: 3, reason: 'ốm nặng', status: 'approved', approvedBy: 'Ban QL', createdAt: '2026-09-09T00:00:00Z' },
  { id: 'l2', employeeId: 'e3', type: 'Nghỉ phép', from: '2026-09-20', to: '2026-09-20', days: 1, reason: 'việc nhà', status: 'pending', createdAt: '2026-09-18T00:00:00Z' }
];
state.hrAttendance = [
  { employeeId: 'e1', date: '2026-09-15', status: 'work', positions: ['p1'] },
  { employeeId: 'e3', date: '2026-09-15', status: 'absent', positions: [] }
];
state.hrAssignments = [];
state.hrCheckins = [
  { id: 'c1', employeeId: 'e1', date: '2026-09-15', in: '07:02', out: '17:05', punches: 4 }
];
state.hrRecruitment = [
  { id: 'r1', department: 'Xưởng 2', position: 'Bào tinh', needQty: 4, hiredQty: 2, needDate: '2026-10-01', status: 'open', notes: 'ca 2' },
  { id: 'r2', department: 'QC',      position: 'Kiểm tra', needQty: 2, hiredQty: 2, needDate: '2026-09-01', status: 'done', notes: '' }
];
state.hrPositionNeeds = [
  { id: 'pn1', department: 'Xưởng 1', position: 'Ép ván',   needQty: 6, haveQty: 5, notes: '' },
  { id: 'pn2', department: 'Xưởng 2', position: 'Bào tinh', needQty: 4, haveQty: 2, notes: 'ưu tiên' }
];
state.hrAttDate = '2026-09-15';
state.hrAttMonth = '2026-09';

function exportHrCard(card, opts = {}) {
  writtenFiles = [];
  setVal('export-hr-card', card);
  setVal('export-hr-dept', opts.dept || 'all');
  if (opts.month !== undefined) setVal('export-hr-month', opts.month);
  if (opts.date !== undefined) setVal('export-hr-date', opts.date);
  xlsxMod.handleHrXlsxExportSubmit(ev);
}

// 1) Nhân Viên
exportHrCard('hr-emp');
check('HR[NV]: xuất được file NhanSu_NhanVien_*.xlsx', /NhanSu_NhanVien_\d{4}-\d{2}-\d{2}\.xlsx$/.test(writtenFiles[0]?.filename || ''));
check('HR[NV]: sheet "Nhân Viên"', lastSheetName === 'Nhân Viên');
check('HR[NV]: đủ 3 nhân viên', dataRowsOf().length === 3);
check('HR[NV]: trạng thái hiển thị tiếng Việt (Tạm nghỉ)', lastSheetAoa.some(r => r[2] === 'Trần Thị B' && r[10] === 'Tạm nghỉ'));
exportHrCard('hr-emp', { dept: 'Xưởng 1' });
check('HR[NV]: lọc bộ phận Xưởng 1 còn 2 người', dataRowsOf().length === 2);
check('HR[NV]: ghi chú bộ phận trên dòng phụ đề', String(lastSheetAoa[1][0]).includes('Xưởng 1'));

// 2) Chấm công theo ngày
exportHrCard('hr-att-day', { date: '2026-09-15' });
check('HR[CC]: xuất được file ChamCongNgay', /NhanSu_ChamCongNgay_/.test(writtenFiles[0]?.filename || ''));
check('HR[CC]: NV01 Đi làm + vị trí Ép ván', lastSheetAoa.some(r => r[1] === 'Nguyễn Văn A' && r[4] === 'Đi làm' && String(r[5]).includes('Ép ván')));
check('HR[CC]: NV03 Vắng (không phép)', lastSheetAoa.some(r => r[1] === 'Lê Văn C' && r[4] === 'Vắng (không phép)'));
check('HR[CC]: NV02 chưa chấm vẫn nằm trong danh sách', lastSheetAoa.some(r => r[1] === 'Trần Thị B' && r[4] === 'Chưa chấm'));

// 3) Thống kê đi làm theo tháng
exportHrCard('hr-att-stats', { month: '2026-09' });
check('HR[TKĐL]: xuất được file TK_DiLam', /NhanSu_TK_DiLam_/.test(writtenFiles[0]?.filename || ''));
check('HR[TKĐL]: có dòng NV01 với 1 ngày công', dataRowsOf().some(r => r[0] === 'Nguyễn Văn A' && r[3] === 1));
check('HR[TKĐL]: có dòng TỔNG CỘNG', lastSheetAoa.some(r => r[0] === 'TỔNG CỘNG'));

// 4) Vị trí & kỹ năng
exportHrCard('hr-pos');
check('HR[VT]: đủ 2 vị trí', dataRowsOf().length === 2);
check('HR[VT]: vị trí Ép ván có cột số NV kỹ năng', lastSheetAoa.some(r => r[1] === 'Ép ván' && r[3] === 0));

// 5) Giờ máy
exportHrCard('hr-ci');
check('HR[GM]: 1 bản ghi giờ máy', dataRowsOf().length === 1);
check('HR[GM]: giờ vào/ra + nhãn khớp "Đi làm"', lastSheetAoa.some(r => r[1] === 'Nguyễn Văn A' && r[4] === '07:02' && r[5] === '17:05' && String(r[7]).includes('Đi làm')));

// 6) Đơn nghỉ phép
exportHrCard('hr-leave');
check('HR[NP]: đủ 2 đơn', dataRowsOf().length === 2);
check('HR[NP]: đơn duyệt có "Đồng ý" + người duyệt', lastSheetAoa.some(r => r[1] === 'Nguyễn Văn A' && r[8] === 'Đồng ý' && r[9] === 'Ban QL'));
check('HR[NP]: đơn chờ có "Chờ duyệt"', lastSheetAoa.some(r => r[1] === 'Lê Văn C' && r[8] === 'Chờ duyệt'));

// 7) Thống kê nghỉ phép
exportHrCard('hr-leave-stats');
check('HR[TKNP]: chỉ NV có đơn ĐÃ DUYỆT (Nguyễn Văn A)', dataRowsOf().length === 1 && dataRowsOf()[0][1] === 'Nguyễn Văn A');
const leaveTotal = lastSheetAoa.find(r => r[1] === 'TỔNG CỘNG');
check('HR[TKNP]: tổng 1 lần / 3 ngày', !!leaveTotal && leaveTotal[3] === 1 && leaveTotal[4] === 3);

// 8) Tuyển dụng
exportHrCard('hr-recruit');
check('HR[TD]: đủ 2 nhu cầu', dataRowsOf().length === 2);
const recruitTotal = lastSheetAoa.find(r => r[0] === 'TỔNG CỘNG');
check('HR[TD]: tổng cần 6 / đã tuyển 4 / thiếu 2', !!recruitTotal && recruitTotal[2] === 6 && recruitTotal[3] === 4 && recruitTotal[4] === 2);

// 9) Nhân sự cần tại vị trí
exportHrCard('hr-posneed');
check('HR[NSC]: đủ 2 dòng', dataRowsOf().length === 2);
const posneedTotal = lastSheetAoa.find(r => r[0] === 'TỔNG CỘNG');
check('HR[NSC]: tổng cần 10 / có 7 / thiếu 3', !!posneedTotal && posneedTotal[2] === 10 && posneedTotal[3] === 7 && posneedTotal[4] === 3);

// Lọc bộ phận không có dữ liệu → không tạo file + giữ modal (mở lại modal trước khi thử)
xlsxMod.openHrXlsxExportModal();
writtenFiles = [];
setVal('export-hr-card', 'hr-emp'); setVal('export-hr-dept', 'Lò Hơi');
xlsxMod.handleHrXlsxExportSubmit(ev);
check('HR: lọc vô hiệu -> không tạo file', writtenFiles.length === 0);
check('HR: lọc vô hiệu -> modal còn mở', modalShown('modal-export-hr'));

// Đồng bộ hiển thị ô ngày/tháng theo thẻ
setVal('export-hr-card', 'hr-att-stats'); xlsxMod.syncHrXlsxCardUI();
check('HR: chọn TK Đi Làm -> hiện ô Tháng, ẩn ô Ngày', document.getElementById('export-hr-month-row').style.display === '' && document.getElementById('export-hr-date-row').style.display === 'none');
setVal('export-hr-card', 'hr-att-day'); xlsxMod.syncHrXlsxCardUI();
check('HR: chọn Chấm Công Ngày -> hiện ô Ngày, ẩn ô Tháng', document.getElementById('export-hr-date-row').style.display === '' && document.getElementById('export-hr-month-row').style.display === 'none');

// ─── KẾT LUẬN ────────────────────────────────────────────────
console.log('───────────────────────────');
console.log(`EXPORT-HR-QC: ${passed} PASS, ${failed} FAIL`);
if (failed > 0) process.exit(1);
