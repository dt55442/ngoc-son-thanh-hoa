// tests/export-stage.test.mjs — Kiểm thử XUẤT "NHẬT KÝ THAN HÓA" (tab Công Đoạn)
// theo từng công đoạn (Sấy 1 / Sấy 2 / Kho / Bào Tinh / Tất Cả):
//  • mỗi công đoạn đều xuất được file đúng tên (kèm nhãn công đoạn)
//  • dữ liệu lô lệch chuẩn (thể tích dạng chữ, thiếu kích thước/số lượng) KHÔNG làm
//    hỏng file — lô lỗi bị bỏ qua và có cảnh báo
//  • công đoạn không có lô → không tạo file + modal giữ lại để sửa bộ lọc
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

state.currentUser = { username: 'admin', role: 'admin', editTabs: ['kanban'], allowAdvanced: true };

// ─── XLSX GHÉP ĐỂ BẮT FILE ────────────────────────────────────────
let writtenFiles = [];
let lastSheetAoa = null;
let lastSheetName = '';
let lastSheetMerges = null;
global.XLSX = {
  utils: {
    book_new: () => ({ sheets: [] }),
    aoa_to_sheet: (aoa) => ({ aoa }),
    book_append_sheet: (wb, ws, name) => { wb.sheets.push({ name, aoa: ws.aoa }); lastSheetAoa = ws.aoa; lastSheetName = name; lastSheetMerges = ws['!merges'] || null; }
  },
  writeFile: (wb, filename) => { writtenFiles.push({ filename, wb }); },
  write: () => new ArrayBuffer(8)
};

const ev = { preventDefault(){} };
function setVal(id, v) { const el = document.getElementById(id); el.value = v; return el; }
function modalShown(id) { return document.getElementById(id).classList._s.has('show'); }

// ─── DỮ LIỆU GIẢ: 4 công đoạn + vài lô dữ liệu lệch chuẩn ────────
state.batches = [
  { id: 'b1', code: '260901-01', stage: 'say1',    date: '2026-09-01', week: 'Tuần 36', length: 1250, width: 20, thickness: 15, quantity: 1000, volume: 0.375,  bambooType: 'A',  useFor: 'Ván',    location: 'LS1', notes: '' },
  { id: 'b2', code: '260902-02', stage: 'say2',    date: '2026-09-02', week: 'Tuần 36', length: 1250, width: 20, thickness: 15, quantity: 500,  volume: 0.1875, bambooType: 'A1', useFor: 'Ván',    location: 'LS2', notes: '' },
  { id: 'b3', code: '260903-03', stage: 'kho',     date: '2026-09-03', week: 'Tuần 36', length: 1250, width: 20, thickness: 15, quantity: 800,  volume: 0.3,    bambooType: 'B',  useFor: 'Bullig', location: 'K11', notes: '' },
  { id: 'b4', code: '260904-04', stage: 'bao_tinh', date: '2026-09-04', week: 'Tuần 36', length: 950,  width: 15, thickness: 6,  quantity: 300,  volume: 0.0256, bambooType: 'A',  useFor: 'Ván',    location: 'Bào 01', notes: '' },
  // Lô dữ liệu lệch chuẩn: thể tích dạng CHỮ (trước đây làm .toFixed() nổ TypeError)
  { id: 'b5', code: '260905-05', stage: 'say2',    date: '2026-09-05', week: 'Tuần 36', length: 1250, width: 20, thickness: 15, quantity: 200,  volume: '0.075', bambooType: 'A', useFor: 'Ván', location: 'LS2', notes: '' },
  // Lô thiếu kích thước + thiếu số lượng (không được làm crash file xuất)
  { id: 'b6', code: '260906-06', stage: 'bao_tinh', date: '2026-09-06', week: 'Tuần 36', quantity: null, volume: 0, bambooType: 'B', useFor: 'Bullig', location: 'Bào 02', notes: '' }
];

// ═══════════════════════════════════════════════════════════
// 1) XUẤT ĐƯỢC CHO TỪNG CÔNG ĐOẠN
// ═══════════════════════════════════════════════════════════
const EXPECT = {
  all:      { label: null,       rows: 6, title: 'NHẬT KÝ THAN HÓA', sheet: 'Nhật Ký Than Hóa' },   // 6 lô, đủ mọi công đoạn
  say1:     { label: 'Sấy_1',    rows: 1, title: 'NHẬT KÝ SẤY 1',    sheet: 'Nhật Ký Sấy 1' },
  say2:     { label: 'Sấy_2',    rows: 2, title: 'NHẬT KÝ SẤY 2',    sheet: 'Nhật Ký Sấy 2' },
  kho:      { label: 'Kho',      rows: 1, title: 'NHẬT KÝ KHO',      sheet: 'Nhật Ký Kho' },
  bao_tinh: { label: 'Bào_Tinh', rows: 2, title: 'NHẬT KÝ BÀO TINH', sheet: 'Nhật Ký Bào Tinh' }
};
const hasMerge = (r, c0, c1) => !!(lastSheetMerges || []).some(m => m.s.r === r && m.s.c === c0 && m.e.c === c1);
for (const [st, exp] of Object.entries(EXPECT)) {
  writtenFiles = [];
  setVal('export-stage-select', st);
  setVal('export-date-from', '');
  setVal('export-date-to', '');
  setVal('export-location-select', 'all');
  let threw = null;
  try { xlsxMod.handleCustomExportSubmit(ev); } catch (err) { threw = err; }
  check(`CD[${st}]: xuất không nổ lỗi`, threw === null);
  check(`CD[${st}]: tạo được 1 file`, writtenFiles.length === 1);
  if (!writtenFiles.length) continue;
  const f = writtenFiles[0].filename;
  check(`CD[${st}]: tên file ${exp.label ? 'có nhãn ' + exp.label : 'gọn'}`,
    exp.label ? f.includes(`NhatKy_ThanHoa_${exp.label}_`) : f.startsWith('NhatKy_ThanHoa_'));
  const dataRows = lastSheetAoa.filter((row, i) => i >= 6 && row[0] !== '' && row[1] !== 'TỔNG CỘNG' && row[0] !== 'NGƯỜI ĐỀ NGHỊ');
  check(`CD[${st}]: đúng ${exp.rows} dòng dữ liệu (được ${dataRows.length})`, dataRows.length === exp.rows);
  check(`CD[${st}]: modal đã đóng sau khi xuất`, !modalShown('modal-custom-export'));
  // Tiêu đề = NHẬT KÝ + TÊN CÔNG ĐOẠN + tên sheet theo công đoạn
  check(`CD[${st}]: tiêu đề ô A1 là "${exp.title}"`, lastSheetAoa[0][0] === exp.title);
  check(`CD[${st}]: tên sheet là "${exp.sheet}"`, lastSheetName === exp.sheet);
  // Gộp ô A3:B3 (nhãn người đề nghị) và A4:B4 (nhãn công đoạn)
  check(`CD[${st}]: có gộp A3:B3 và A4:B4`, hasMerge(2, 0, 1) && hasMerge(3, 0, 1));
  check(`CD[${st}]: nhãn tại A3/A4, giá trị sang C3/C4`,
    lastSheetAoa[2][0] === 'Họ và tên người đề nghị:' && lastSheetAoa[2][1] === '' &&
    lastSheetAoa[3][0] === 'Công đoạn:' && lastSheetAoa[3][2] === (st === 'all' ? 'Tất Cả' : EXPECT[st].sheet.replace('Nhật Ký ', '')));
}

// ═══════════════════════════════════════════════════════════
// 2) DỮ LIỆU LỆCH CHUẨN KHÔNG LÀM HỎNG FILE
// ═══════════════════════════════════════════════════════════
writtenFiles = [];
setVal('export-stage-select', 'say2');
xlsxMod.handleCustomExportSubmit(ev);
check('Lệch chuẩn: file Sấy 2 vẫn tạo được', writtenFiles.length === 1);
// Dòng lô volume dạng chữ "0.075" vẫn được tính và viết đúng 4 số lẻ
const volRow = lastSheetAoa.find(row => row[4] === '260905-05');
check('Lệch chuẩn: lô volume dạng chữ xuất đúng "0.0750 m³"', !!volRow && volRow[5] === '0.0750 m³');
// Lô thiếu kích thước ở Bào Tinh: hiển thị "—" thay vì "undefined"
writtenFiles = [];
setVal('export-stage-select', 'bao_tinh');
xlsxMod.handleCustomExportSubmit(ev);
check('Lệch chuẩn: file Bào Tinh vẫn tạo được', writtenFiles.length === 1);
check('Lệch chuẩn: lô thiếu kích thước hiển thị "—" thay vì "undefined"', !!lastSheetAoa.find(row => row[1] === '—'));

// ═══════════════════════════════════════════════════════════
// 2b) GỘP Ô A3:B3 / A4:B4 — GIÁ TRỊ ĐIỀN VÀO Ô RỘNG BÊN CẠNH
// ═══════════════════════════════════════════════════════════
writtenFiles = [];
setVal('export-stage-select', 'say1');
setVal('export-requester', 'Nguyễn Văn A');
setVal('export-department', 'Phân Xưởng Sấy');
setVal('export-date-from', '');
setVal('export-date-to', '');
xlsxMod.handleCustomExportSubmit(ev);
check('Gộp ô: có merge A3:B3 và A4:B4', hasMerge(2, 0, 1) && hasMerge(3, 0, 1));
check('Gộp ô: nhãn A3 "Họ và tên..." + giá trị C3 "Nguyễn Văn A"',
  lastSheetAoa[2][0] === 'Họ và tên người đề nghị:' && lastSheetAoa[2][1] === '' && lastSheetAoa[2][2] === 'Nguyễn Văn A');
check('Gộp ô: "Bộ phận:" tại F3 + giá trị G3', lastSheetAoa[2][5] === 'Bộ phận:' && lastSheetAoa[2][6] === 'Phân Xưởng Sấy');

// ═══════════════════════════════════════════════════════════
// 3) CÔNG ĐOẠN KHÔNG CÓ LÔ → KHÔNG TẠO FILE + GIỮ MODAL ĐỂ SỬA
// ═══════════════════════════════════════════════════════════
state.batches = state.batches.filter(b => b.stage !== 'kho');
writtenFiles = [];
document.getElementById('modal-custom-export').classList.add('show');
setVal('export-stage-select', 'kho');
xlsxMod.handleCustomExportSubmit(ev);
check('Không có lô: không tạo file', writtenFiles.length === 0);
check('Không có lô: modal còn mở để sửa bộ lọc', modalShown('modal-custom-export'));

// ═══════════════════════════════════════════════════════════
// 4) LỌC THEO NGÀY VÀO CÔNG ĐOẠN (THỰC TẾ) — KHÔNG PHẢI NGÀY TẠO LÔ
// ═══════════════════════════════════════════════════════════
// Tái hiện đúng tình huống thực tế: lô tạo ngày 08/09, vào Bào Tinh thật là 09/10.
// Lọc xuất file "từ 2026-10-01" theo công đoạn Bào Tinh PHẢI thấy lô (trước đây
// lọc theo ngày tạo nên báo không có lô).
const { getBatchStageEntryDate, isoToDmy, dmyToIso } = await import('../js/utils.js');
state.batches = [
  { id: 'bt1', code: '260908-11', stage: 'bao_tinh', date: '2026-09-08', week: 'Tuần 37',
    length: 1250, width: 22, thickness: 10, quantity: 1344, volume: 0.371, bambooType: 'A',
    useFor: 'Ván', location: 'LS13', notes: '',
    baoTinhDate: '2026-10-09',
    stageHistory: [ { stage: 'say1', date: '2026-09-08' }, { stage: 'bao_tinh', date: '2026-10-09' } ] },
  { id: 'bt2', code: '260901-01', stage: 'bao_tinh', date: '2026-09-01', week: 'Tuần 36',
    length: 1250, width: 20, thickness: 15, quantity: 100, volume: 0.0375, bambooType: 'A',
    useFor: 'Ván', location: 'LS13', notes: '',
    stageHistory: [ { stage: 'say1', date: '2026-09-01' }, { stage: 'bao_tinh', date: '2026-09-05' } ] },
  { id: 'bt3', code: '260902-02', stage: 'say2', date: '2026-09-02', week: 'Tuần 36',
    length: 1250, width: 20, thickness: 15, quantity: 50, volume: 0.019, bambooType: 'A1',
    useFor: 'Ván', location: 'LS2', notes: '',
    say2Date: '2026-09-20',
    stageHistory: [ { stage: 'say1', date: '2026-09-02' }, { stage: 'say2', date: '2026-09-20' } ] }
];

check('Ngày vào CD: Bào Tinh ưu tiên baoTinhDate', getBatchStageEntryDate(state.batches[0], 'bao_tinh') === '2026-10-09');
check('Ngày vào CD: Bào Tinh không override → mốc cuối stageHistory', getBatchStageEntryDate(state.batches[1], 'bao_tinh') === '2026-09-05');
check('Ngày vào CD: Sấy 2 ưu tiên say2Date', getBatchStageEntryDate(state.batches[2], 'say2') === '2026-09-20');
check('Ngày vào CD: Sấy 1 = ngày tạo lô', getBatchStageEntryDate(state.batches[0], 'say1') === '2026-09-08');

// Chuyển đổi dd/mm/yyyy <-> yyyy-mm-dd
check('Định dạng: ISO → dd/mm/yyyy', isoToDmy('2026-10-09') === '09/10/2026' && isoToDmy('') === '');
check('Định dạng: dd/mm/yyyy → ISO (nhận 1 chữ số)', dmyToIso('9/10/2026') === '2026-10-09');
check('Định dạng: từ chối ngày không hợp lệ (31/02/2026, 13/13/2026, rác)',
  dmyToIso('31/02/2026') === '' && dmyToIso('13/13/2026') === '' && dmyToIso('abc') === '');

// Xuất Bào Tinh lọc "từ 2026-10-01": chỉ còn lô vào bào tinh tháng 10
writtenFiles = [];
setVal('export-stage-select', 'bao_tinh');
setVal('export-date-from', '2026-10-01');
setVal('export-date-to', '');
setVal('export-location-select', 'all');
xlsxMod.handleCustomExportSubmit(ev);
check('Ngày CD: lọc từ 2026-10-01 vẫn thấy lô vào bào tinh 09/10', writtenFiles.length === 1);
const octRow = lastSheetAoa.find(row => row[4] === '260908-11');
check('Ngày CD: cột Thời gian hiển thị ngày vào bào tinh 09/10/26', !!octRow && octRow[6] === '09/10/26');

// Xuất Bào Tinh lọc "đến 2026-09-30": chỉ còn lô vào bào tinh tháng 9
writtenFiles = [];
setVal('export-date-from', '');
setVal('export-date-to', '2026-09-30');
xlsxMod.handleCustomExportSubmit(ev);
check('Ngày CD: lọc đến 2026-09-30 thấy lô vào bào tinh 05/09', writtenFiles.length === 1);
check('Ngày CD: loại lô vào bào tinh 09/10 (ngoài khoảng)', !lastSheetAoa.find(row => row[4] === '260908-11'));

// Xuất Sấy 2: dùng ngày thực tế say2Date (20/09) chứ không phải ngày tạo (02/09)
writtenFiles = [];
setVal('export-stage-select', 'say2');
setVal('export-date-from', '2026-09-15');
setVal('export-date-to', '');
xlsxMod.handleCustomExportSubmit(ev);
check('Ngày CD: Sấy 2 lọc từ 15/09 vẫn thấy lô (ngày thực tế 20/09)', writtenFiles.length === 1);
const say2Row = lastSheetAoa.find(row => row[4] === '260902-02');
check('Ngày CD: cột Thời gian hiển thị 20/09/26 (ngày vào Sấy 2)', !!say2Row && say2Row[6] === '20/09/26');

// ─── KẾT LUẬN ────────────────────────────────────────────────
console.log('───────────────────────────');
console.log(`EXPORT-STAGE: ${passed} PASS, ${failed} FAIL`);
if (failed > 0) process.exit(1);
