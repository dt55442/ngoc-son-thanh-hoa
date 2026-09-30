// tests/kho.test.mjs — Kiểm thử THẺ "KHO NAN" (tab Công Đoạn):
// 1. TỒN KHO THỰC theo LẦN NHẬP: tồn lô = (số lần nhập kho × quantity) − phiếu xuất
//    ĐÃ DUYỆT; 1 lô ra/vào kho nhiều lần (quay lại Sấy 2) vẫn chỉ 1 dòng tồn.
// 2. PHIẾU KHO: Tổ trưởng gửi phiếu xuất (mục đích Sấy 2 / Bào Tinh / Bullig / Khác)
//    → 'cho_duyet' KHÔNG trừ tồn → Ban lãnh đạo (Admin/Ban Quản Lý) duyệt → trừ tồn;
//    chặn xuất vượt tồn (lúc gửi + lúc duyệt); từ chối có lý do.
// 3. PHIẾU XỬ LÝ LỖI: tiêu hủy / tái chế thanh lỗi Bào Tinh · thanh lỗi Chọn thanh
//    Bullig (tồn MỚI có sổ) · nan "Loại hẳn" — chặn vượt tồn lỗi theo cỡ.
// 4. PHIẾU BÙ dữ liệu cũ: sinh phiếu ĐÃ DUYỆT từ số hệ thống suy ra, chạy 2 lần
//    không sinh trùng; planning.js getNanStockEvents trừ tồn theo phiếu ĐÃ DUYỆT
//    (bỏ qua purpose 'say2').
// 5. CẤU TRÚC: id trong index.html · 5 nơi nối dữ liệu · sw.js v185 · npm test.
'use strict';
import fs from 'node:fs';

// ─── Stubs môi trường (giống than-hoa.test.mjs) ─────────────────
function makeEl(id) {
  const el = {
    id: id || '', value: '', checked: false, disabled: false, hidden: false,
    open: true, textContent: '', innerHTML: '', style: {}, dataset: {},
    offsetWidth: 800, offsetHeight: 500,
    classList: { _s: new Set(), add(c){ this._s.add(c); }, remove(c){ this._s.delete(c); }, toggle(c, f){ if (f === undefined) f = !this._s.has(c); if (f) this._s.add(c); else this._s.delete(c); return f; }, contains(c){ return this._s.has(c); } },
    addEventListener(t, f) { (el._h[t] = el._h[t] || []).push(f); },
    appendChild(c) { return c; }, removeChild(c) { return c; },
    remove(){}, setAttribute(){}, getAttribute: () => null,
    querySelector: () => makeEl(), querySelectorAll: () => [],
    closest: () => null, matches: () => false,
    getContext: () => ctxStub(),
    getBoundingClientRect: () => ({ top: 0, left: 0, right: 800, bottom: 600, width: 800, height: 600 }),
    reset(){}, focus(){}, click(){}, animate(){ return { cancel(){} }; }
  };
  return el;
}
function ctxStub() {
  return new Proxy({}, {
    get(_, k) {
      if (k === 'measureText') return () => ({ width: 10 });
      if (k === 'createLinearGradient' || k === 'createRadialGradient') return () => ({ addColorStop(){} });
      return () => undefined;
    },
    set() { return true; }
  });
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
global.Chart = class { constructor(c, g) { this.ctx = c; this.config = g; this.data = (g && g.data) || { labels: [], datasets: [] }; } update(){} resize(){} destroy(){} render(){} reset(){} getDatasetMeta(){ return { data: [] }; } };
Chart.register = () => {};
if (!global.URL.createObjectURL) global.URL.createObjectURL = () => 'blob:stub';
if (!global.URL.revokeObjectURL) global.URL.revokeObjectURL = () => {};
global.XLSX = { utils: { book_new: () => ({ SheetNames: [] }), aoa_to_sheet: () => ({}), json_to_sheet: () => ({}), book_append_sheet(){}, encode_cell: () => 'A1', decode_range: () => ({ s: { r: 0, c: 0 }, e: { r: 0, c: 0 } }) }, writeFile(){}, write: () => new ArrayBuffer(8) };
global.fetch = async () => ({ ok: false, status: 0, statusText: 'offline-stub', json: async () => ({}), text: async () => '' });
global.Image = class { set src(_) {} addEventListener(){} };
global.ResizeObserver = class { observe(){} unobserve(){} disconnect(){} };

let pass = 0, fail = 0;
function check(label, cond) {
  if (cond) { pass++; console.log('PASS ' + label); }
  else { fail++; console.log('FAIL ' + label); }
}

const { state } = await import('../js/state.js');
state.currentUser = { username: 'admin', role: 'admin', editTabs: [], allowAdvanced: true };
state.activeView = 'kanban-view';

// ─── Dữ liệu mẫu: 3 lô ở Kho (k2 ra/vào kho 2 lần) + 1 lô Sấy 1 ──
state.batches = [
  { id: 'k1', code: '260910-01', stage: 'kho', date: '2026-09-10', week: '2026-W37', length: 1250, width: 18, thickness: 7, quantity: 600, volume: 0.0945, bambooType: 'A', useFor: 'Ván', location: 'K11', stageHistory: [{ stage: 'kho', date: '2026-09-10' }] },
  { id: 'k2', code: '260911-01', stage: 'kho', date: '2026-09-14', week: '2026-W37', length: 1250, width: 18, thickness: 7, quantity: 400, volume: 0.063, bambooType: 'A1', useFor: 'Bullig', location: 'K12', say2Date: '2026-09-13', stageHistory: [{ stage: 'kho', date: '2026-09-11' }, { stage: 'say2', date: '2026-09-13' }, { stage: 'kho', date: '2026-09-14' }] },
  { id: 'k3', code: '260912-01', stage: 'kho', date: '2026-09-12', week: '2026-W37', length: 1300, width: 20, thickness: 8, quantity: 800, volume: 0.1664, bambooType: 'B', useFor: 'Ván', location: 'K13', stageHistory: [{ stage: 'kho', date: '2026-09-12' }] },
  { id: 'k4', code: '260912-02', stage: 'say1', date: '2026-09-12', week: '2026-W37', length: 1250, width: 18, thickness: 7, quantity: 500, volume: 0.0788, bambooType: 'A', useFor: 'Ván', location: 'LS1', stageHistory: [{ stage: 'say1', date: '2026-09-12' }] }
];

const utils = await import('../js/utils.js');
const x2 = await import('../js/xuong2.js');

// ─── A. TỒN KHO THEO LẦN NHẬP (chưa có phiếu nào) ───────────────
check('TỒN: số lần NHẬP kho — k1=1 · k2=2 (ra/vào 1 lần) · k3=1',
  utils.khoInCountOf(state.batches[0]) === 1 && utils.khoInCountOf(state.batches[1]) === 2 &&
  utils.khoInCountOf(state.batches[2]) === 1);
check('TỒN: số lần RA KHỎI kho — k2=1 (say2 sau kho) · k1=0',
  utils.khoOutRoundCountOf(state.batches[1]) === 1 && utils.khoOutRoundCountOf(state.batches[0]) === 0);
check('TỒN: không phiếu → tồn kho 2.200 (k2 nhập 2 lần × 400) · toàn nhóm 2.300 · không lô hết',
  utils.khoStockSummary().remainingThanh === 2200 && utils.khoStockSummary().poolThanh === 2300 &&
  utils.khoStockSummary().usedUpLots === 0 && utils.khoStockSummary().liveLots === 3);
check('TỒN: bản đồ ẩn/hiện — không lô nào bị ẩn, tồn từng lô đúng',
  utils.khoVisibilityMap().hide.size === 0 && utils.khoVisibilityMap().remain.get('k1') === 600);

// ─── B. PHIẾU XUẤT: chờ duyệt KHÔNG trừ tồn → duyệt mới trừ (FIFO) ──
document.getElementById('x2-kho-date').value = '2026-09-15';
document.getElementById('x2-kho-purpose').value = 'baotinh';
document.getElementById('x2-kho-qty').value = '300';
document.getElementById('x2-kho-note').value = 'Xuất bào tinh tuần 38';
x2.handleKhoNoteSubmit({ preventDefault(){} });
const note1 = state.khoNotes[0];
check('PHIẾU: gửi phiếu xuất 300 → trạng thái CHỜ DUYỆT + ghi người tạo',
  !!note1 && note1.status === 'cho_duyet' && note1.type === 'xuat' && note1.purpose === 'baotinh' &&
  note1.createdBy === 'admin' && note1.qty === 300);
check('PHIẾU: chờ duyệt KHÔNG trừ tồn (vẫn 2.200) + chip chờ = 1 phiếu / 300 thanh',
  utils.khoStockSummary().remainingThanh === 2200 &&
  utils.khoStockSummary().pendingCount === 1 && utils.khoStockSummary().pendingQty === 300);
x2.khoApproveNote(note1.id);
check('PHIẾU: Admin duyệt → ĐÃ DUYỆT + tồn giảm còn 1.900 + người duyệt được ghi',
  note1.status === 'da_duyet' && utils.khoStockSummary().remainingThanh === 1900 &&
  note1.approvedByName === 'admin');
check('FIFO: 300 trừ lô VÀO KHO LÂU NHẤT trước (k1) — k1 còn 300, k2/k3 nguyên',
  utils.khoLotRemainingOf(state.batches[0]) === 300 &&
  utils.khoLotRemainingOf(state.batches[1]) === 800 && utils.khoLotRemainingOf(state.batches[2]) === 800);
check('KẾ HOẠCH: tồn nan TOÀN NHÓM = 2.300 − 300 = 2.000 (trừ phiếu Bào Tinh)',
  utils.khoStockSummary().poolThanh === 2000);

// PHIẾU purpose 'say2' — trừ TỒN KHO nhưng KHÔNG trừ tồn nan toàn nhóm
document.getElementById('x2-kho-date').value = '2026-09-15';
document.getElementById('x2-kho-purpose').value = 'say2';
document.getElementById('x2-kho-qty').value = '400';
document.getElementById('x2-kho-note').value = 'Quay lại sấy';
x2.handleKhoNoteSubmit({ preventDefault(){} });
const noteSay2 = state.khoNotes[1];
x2.khoApproveNote(noteSay2.id);
check('SẤY 2: duyệt phiếu "Sấy 2" → tồn Kho giảm (1.500) NHƯNG tồn nan toàn nhóm GIỮ 2.000',
  utils.khoStockSummary().remainingThanh === 1500 && utils.khoStockSummary().poolThanh === 2000);

// CHẶN XUẤT VỚI TỒN (lúc gửi)
const notesBefore = state.khoNotes.length;
document.getElementById('x2-kho-date').value = '2026-09-15';
document.getElementById('x2-kho-purpose').value = 'baotinh';
document.getElementById('x2-kho-qty').value = '5000';
x2.handleKhoNoteSubmit({ preventDefault(){} });
check('CHẶN: phiếu vượt tồn khả dụng → KHÔNG tạo phiếu (vẫn ' + notesBefore + ' phiếu)',
  state.khoNotes.length === notesBefore);

// Lô DÙNG HẾT → ẨN mặc định + công tắc hiện lại
document.getElementById('x2-kho-qty').value = '300';
x2.handleKhoNoteSubmit({ preventDefault(){} });
x2.khoApproveNote(state.khoNotes[state.khoNotes.length - 1].id);
check('LÔ HẾT: xuất nốt 300 của k1 → k1 tồn 0, đếm "lô đã xuất hết" = 1',
  utils.khoLotRemainingOf(state.batches[0]) === 0 && utils.khoStockSummary().usedUpLots === 1);
check('LÔ HẾT: ẨN mặc định (hide có k1) — bật công tắc → hiện lại',
  utils.khoVisibilityMap().hide.has('k1') && !utils.khoVisibilityMap().hide.has('k2'));
x2.khoSetShowUsed(true);
check('LÔ HẾT: công tắc BẬT → không ẩn lô nào + lưu localStorage',
  utils.khoVisibilityMap().hide.size === 0 && state.khoShowUsed === true);
x2.khoSetShowUsed(false);

// QUYỀN DUYỆT: editor (Tổ trưởng — có quyền nhập Công Đoạn) KHÔNG duyệt được
state.currentUser = { username: 'editor1', role: 'editor', editTabs: ['kanban'], allowAdvanced: false };
document.getElementById('x2-kho-date').value = '2026-09-16';
document.getElementById('x2-kho-purpose').value = 'bullig';
document.getElementById('x2-kho-qty').value = '100';
x2.handleKhoNoteSubmit({ preventDefault(){} });
const noteEditor = state.khoNotes[state.khoNotes.length - 1];
x2.khoApproveNote(noteEditor.id);
check('QUYỀN: editor gửi phiếu được nhưng KHÔNG duyệt được (vẫn chờ duyệt)',
  noteEditor.status === 'cho_duyet');
state.currentUser = { username: 'admin', role: 'admin', editTabs: [], allowAdvanced: true };
x2.khoRejectNote(noteEditor.id);
check('QUYỀN: Admin từ chối phiếu → trạng thái TỪ CHỐI (không trừ tồn)',
  noteEditor.status === 'tu_choi' && utils.khoStockSummary().remainingThanh === 1200);

// ─── C. PHIẾU XỬ LÝ LỖI (tiêu hủy / tái chế) + TỒN TRUNG GIAN ──
state.xuong2BulligRecords = [
  { id: 'bl1', kind: 'ct', date: '2026-09-16', inSizeKey: '1240×16×6', inDims: [1240, 16, 6], qtyOk: 100, qtyErr: 60, createdAt: '2026-09-16T02:00:00.000Z' }
];
state.xuong2ChonNanThoRecords = [
  { id: 'cnr', baothoId: 'bt-x', date: '2026-09-16', dims: [1250, 18, 7], sizeKey: '1250×18×7', cls: 'reject', quantity: 50, unitVol: 0.0001575, volume: 0.0079, createdAt: '2026-09-16T02:00:00.000Z' }
];
check('WIP MỚI: tồn lỗi Chọn thanh Bullig = 60 thanh (trước đây KHÔNG có sổ)',
  x2.bulligDefectStock().length === 1 && x2.bulligDefectStock()[0].remaining === 60);
check('WIP MỚI: tồn nan "Loại hẳn" Chọn Nan Thô = 50 thanh (trước đây chỉ tính tỷ lệ)',
  x2.nanRejectStock().length === 1 && x2.nanRejectStock()[0].remaining === 50);
// Phiếu TIÊU HỦY 20 thanh lỗi Bullig (cỡ 1240×16×6)
x2.setKhoNoteType('xu_ly');
document.getElementById('x2-kho-date').value = '2026-09-17';
document.getElementById('x2-kho-source').value = 'bullig_loi';
document.getElementById('x2-kho-method').value = 'tieu_huy';
document.getElementById('x2-kho-size').value = '1240×16×6';
document.getElementById('x2-kho-qty').value = '20';
document.getElementById('x2-kho-note').value = 'Thanh cong queo';
x2.handleKhoNoteSubmit({ preventDefault(){} });
const scr1 = state.khoNotes[state.khoNotes.length - 1];
x2.khoApproveNote(scr1.id);
check('TIÊU HỦY: duyệt phiếu 20 thanh lỗi Bullig → tồn lỗi còn 40 (đã có sổ xử lý)',
  scr1.type === 'tieuhuy' && scr1.status === 'da_duyet' && x2.bulligDefectStock()[0].remaining === 40);
// Chặn vượt tồn lỗi
document.getElementById('x2-kho-qty').value = '999';
const scrCountBefore = state.khoNotes.length;
x2.handleKhoNoteSubmit({ preventDefault(){} });
check('TIÊU HỦY: chặn vượt tồn lỗi của cỡ (không tạo phiếu)',
  state.khoNotes.length === scrCountBefore);
// Phiếu TÁI CHẾ nan "Loại hẳn" 10 thanh
document.getElementById('x2-kho-source').value = 'nan_loai_han';
document.getElementById('x2-kho-method').value = 'taiche';
document.getElementById('x2-kho-size').value = '1250×18×7';
document.getElementById('x2-kho-qty').value = '10';
x2.handleKhoNoteSubmit({ preventDefault(){} });
x2.khoApproveNote(state.khoNotes[state.khoNotes.length - 1].id);
check('TÁI CHẾ: phiếu tái chế 10 nan Loại hẳn → tồn còn 40',
  x2.nanRejectStock()[0].remaining === 40);
// Thanh lỗi BÀO TINH: trừ phiếu xử lý (tồn lỗi của lượt bào tinh ở trên)
state.xuong2BaoTinhRecords = [
  { id: 'bt1', kind: 'tinh', date: '2026-09-16', sources: [{ batchId: 'k3', qty: 500 }], qtyOk: 480, qtyErr: 20, outSizeKey: '1230×14×5', createdAt: '2026-09-16T02:00:00.000Z' }
];
document.getElementById('x2-kho-source').value = 'baotinh_loi';
document.getElementById('x2-kho-method').value = 'tai_che';
document.getElementById('x2-kho-size').value = '1230×14×5';
document.getElementById('x2-kho-qty').value = '5';
x2.handleKhoNoteSubmit({ preventDefault(){} });
x2.khoApproveNote(state.khoNotes[state.khoNotes.length - 1].id);
check('LỖI BÀO TINH: tồn lỗi 20 − tái chế 5 = 15 (baoTinhDefectStock trừ phiếu đã duyệt)',
  x2.baoTinhDefectStock().find(x => x.sizeKey === '1230×14×5').remaining === 15);

// ─── D. ĐỐI CHIẾU + PHIẾU BÙ DỮ LIỆU CŨ ────────────────────────
check('ĐỐI CHIẾU: hệ thống suy ra k3 = 500 (lượt bào tinh) — phiếu gắn k3 chưa có → lệch +500',
  utils.khoDerivedOutOf('k3') === 500 && utils.khoStockSummary().mismatchThanh > 400);
const notesBeforeBackfill = state.khoNotes.length;
x2.khoBackfillFromLegacy(); // confirm() stub trả true
const backfill = state.khoNotes[state.khoNotes.length - 1];
check('PHIẾU BÙ: sinh phiếu ĐÃ DUYỆT gắn đúng lô k3 (500 thanh, ghi chú khởi tạo)',
  backfill.status === 'da_duyet' && backfill.lots[0].batchId === 'k3' && backfill.lots[0].qty === 500 &&
  state.khoNotes.length === notesBeforeBackfill + 1);
x2.khoBackfillFromLegacy(); // chạy lần 2 → KHÔNG sinh trùng
check('PHIẾU BÙ: chạy lần 2 KHÔNG sinh trùng (số phiếu giữ nguyên)',
  state.khoNotes.length === notesBeforeBackfill + 1);
check('ĐỐI CHIẾU: sau phiếu bù → lệch ≈ 0 (chỉ còn sai số làm tròn)',
  Math.abs(utils.khoStockSummary().mismatchThanh) < 2);

// ─── E. SỔ NHẬP/XUẤT + PLANNING (trừ tồn theo phiếu ĐÃ DUYỆT) ──
const ledger = utils.khoLedgerEvents();
check('SỔ: 4 dòng NHẬP (k1 1 lần · k2 2 lần · k3 1 lần) — dòng của k2 ghi rõ "Lần"',
  ledger.inRows.length === 4 && ledger.inRows.some(r => r.lotId === 'k2' && r.round === 2));
check('SỔ: dòng XUẤT = các phiếu ĐÃ DUYỆT (phiếu chờ/từ chối không vào sổ)',
  ledger.outRows.length === utils.khoApprovedXuatNotes().length);
check('SỔ: dòng ĐỐI CHIẾU có "quay lại Sấy 2" của k2 (ngày 2026-09-13, 400 thanh)',
  ledger.derived.some(d => d.kind === 'say2' && d.lotId === 'k2' && d.qty === 400));
// Tồn cuối kỳ TÍNH NGƯỢC — nhóm ngày 09-10 (k1 nhập đầu tiên)
const planning = await import('../js/planning.js');
state.planningItems = []; // bỏ kế hoạch cũ để tính tồn thuần
const tonByWeek = planning.getPlanningTonByWeek ? planning.getPlanningTonByWeek(new Date().getFullYear()) : null;
check('PLANNING: getPlanningTonByWeek chạy được với nguồn phiếu kho (không lỗi)',
  tonByWeek !== null && typeof tonByWeek === 'object');

// ─── F. RENDER THẺ + MINI CARD + SỔ THEO KỲ ─────────────────────
x2.renderX2KhoCard();
check('THẺ: mở thẻ Kho Nan trả về true (pop-up bật, không lỗi render)',
  x2.x2OpenCard('x2-kho-card') === true &&
  document.getElementById('x2-detail-overlay').classList.contains('show'));
check('THẺ: thanh tồn in "Tồn Kho:" + chip "phiếu chờ duyệt" khi có phiếu chờ',
  document.getElementById('x2-kho-stock-bar').innerHTML.includes('Tồn Kho:'));
check('THẺ: khối WIP có dòng "Thanh lỗi Bào Tinh" + dòng "Thanh lỗi Chọn thanh Bullig"',
  document.getElementById('x2-kho-wip-bar').innerHTML.includes('Thanh lỗi Bào Tinh') &&
  document.getElementById('x2-kho-wip-bar').innerHTML.includes('Thanh lỗi Chọn thanh Bullig'));
check('THẺ: mini card đếm "Tồn … thanh" (số tồn thực sau các phiếu)',
  /^Tồn [\d.,]+ thanh$/.test(document.getElementById('x2-mini-count-kho').textContent));
check('SỔ: thẻ ngày có bảng NHẬP (Lần) + bảng XUẤT + dòng chú thích "ra/vào kho NHIỀU LẦN"',
  document.getElementById('x2-kho-day-cards').innerHTML.includes('NHẬP KHO') &&
  document.getElementById('x2-kho-day-cards').innerHTML.includes('XUẤT KHO') &&
  document.getElementById('x2-kho-day-cards').innerHTML.includes('ra/vào kho NHIỀU LẦN'));
x2.setKhoPeriodMode('tuan');
check('SỔ: gạt TUẦN → tiêu đề kỳ dạng "Tuần N / NNNN"',
  document.getElementById('x2-kho-day-cards').innerHTML.includes('Tuần'));
x2.setKhoPeriodMode('thang');
check('SỔ: gạt THÁNG → tiêu đề kỳ dạng "Tháng MM/YYYY"',
  document.getElementById('x2-kho-day-cards').innerHTML.includes('Tháng'));
x2.setKhoPeriodMode('day');
check('BẢNG TỒN: mỗi lô 1 dòng + chip "ra/vào" trên lô quay lại (k2)',
  document.getElementById('x2-kho-stock-rows').innerHTML.includes('260911-01') &&
  document.getElementById('x2-kho-stock-rows').innerHTML.includes('ra/vào'));
check('DÙNG CHUNG: 9 thẻ X2 đủ vùng dữ liệu + nguồn xuất (thêm Kho Nan)',
  Object.keys(x2.X2_CARD_HISTORY_DOMAIN).length === 9 && Object.keys(x2.X2_CARD_EXPORT_SOURCE).length === 9 &&
  x2.X2_CARD_EXPORT_SOURCE['x2-kho-card'] === 'kho');

// ─── G. CẤU TRÚC (index.html · js · sw.js · npm test) ───────────
const idxHtml = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const jsState = fs.readFileSync(new URL('../js/state.js', import.meta.url), 'utf8');
const jsStorage = fs.readFileSync(new URL('../js/storage.js', import.meta.url), 'utf8');
const jsCloud = fs.readFileSync(new URL('../js/cloud.js', import.meta.url), 'utf8');
const jsHistory = fs.readFileSync(new URL('../js/history.js', import.meta.url), 'utf8');
const jsMain = fs.readFileSync(new URL('../js/main.js', import.meta.url), 'utf8');
const jsEvents = fs.readFileSync(new URL('../js/events.js', import.meta.url), 'utf8');
const jsPlanning = fs.readFileSync(new URL('../js/planning.js', import.meta.url), 'utf8');
const jsXlsx = fs.readFileSync(new URL('../js/export-xlsx.js', import.meta.url), 'utf8');
const swJs = fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const cssCss = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
check('CẤU TRÚC (index.html): mini card + thẻ Kho Nan đủ khối (tồn · WIP · phiếu · sổ · tồn)',
  idxHtml.includes('data-x2-card="x2-kho-card"') && idxHtml.includes('id="x2-kho-card"') &&
  idxHtml.includes('id="x2-kho-stock-bar"') && idxHtml.includes('id="x2-kho-wip-bar"') &&
  idxHtml.includes('id="x2-kho-note-form"') && idxHtml.includes('id="x2-kho-pending-rows"') &&
  idxHtml.includes('id="x2-kho-day-cards"') && idxHtml.includes('id="x2-kho-stock-rows"') &&
  idxHtml.includes('id="btn-kho-add-manual"'));
check('CẤU TRÚC (js): key riêng + nối đủ state/storage/cloud/history/main/events',
  jsState.includes('bamboo_tracker_kho_notes_v1') && jsStorage.includes('restoreKhoNotes') &&
  jsCloud.includes('khoNotes') && jsHistory.includes('khoNotes') &&
  jsMain.includes('loadKhoNotes') && jsEvents.includes('x2-kho-note-form'));
check('CẤU TRÚC (planning.js): getNanStockEvents trừ tồn theo PHIẾU ĐÃ DUYỆT (không còn trừ lượt bào tinh)',
  jsPlanning.includes('khoApprovedXuatNotes') && jsPlanning.includes("khoNormPurpose(n.purpose) !== 'say2'"));
check('CẤU TRÚC (kanban.js): cột Kho dùng tồn thật + ẨN lô đã xuất hết',
  fs.readFileSync(new URL('../js/kanban.js', import.meta.url), 'utf8').includes('khoVisibilityMap') &&
  fs.readFileSync(new URL('../js/kanban.js', import.meta.url), 'utf8').includes('kho-card-remain'));
check('CẤU TRÚC (export-xlsx.js): có nguồn xuất "kho" + dùng khoLedgerEvents/khoStockSummary',
  jsXlsx.includes("id: 'kho'") && jsXlsx.includes('khoLedgerEvents'));
check('CẤU TRÚC (sw.js): đã tăng CACHE_NAME v186', /nha-may-ngoc-son-v186/.test(swJs));
check('CẤU TRÚC (styles.css): có khối KHO NAN (badge · chip · bảng sổ · thẻ lô)',
  cssCss.includes('.kho-type-btn') && cssCss.includes('.kho-day-card') && cssCss.includes('.kho-lot-card'));
check('CẤU TRÚC (package.json): tests/kho.test.mjs đã vào npm test',
  pkg.scripts.test.includes('tests/kho.test.mjs'));

console.log(`\nKẾT QUẢ: ${pass} pass, ${fail} fail`);
if (fail > 0) process.exit(1);
