// tests/suppliers.test.mjs — Kiểm thử BẢNG THÔNG TIN NHÀ CUNG (tab Nguyên Liệu):
// khớp tên mềm ("Tế" ≡ "Nhà Tế"), tự tính Tổng KL / Số chuyến / Trung bình /
// Tỷ lệ đạt (10 chuyến cắt chọn gần nhất) / Số lần nhắc nhở, đánh giá 1–5 sao,
// CRUD modal (tên tự thêm tiền tố "Nhà"), chuẩn hóa tên dữ liệu cũ, render bảng.
'use strict';

// ─── Stubs môi trường (giống xuong2-cut.test.mjs) ────────────────
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
global.fetch = async () => ({ ok: false, status: 0, statusText: 'offline-stub', json: async () => ({}), text: async () => '' });

let pass = 0, fail = 0;
function check(label, cond) {
  if (cond) { pass++; console.log('PASS ' + label); }
  else { fail++; console.log('FAIL ' + label); }
}

const { state, STORAGE_KEY_SUPPLIERS } = await import('../js/state.js');
state.currentUser = { username: 'admin', role: 'admin', editTabs: [], allowAdvanced: true };

const sup = await import('../js/suppliers.js');

// ─── A. KHỚP TÊN NHÀ CUNG CẤP (mềm) ─────────────────────────────
check('KHỚP TÊN: "Nhà Tế" ≡ "Tế" (bỏ tiền tố "Nhà")', sup.supplierKey('Nhà Tế') === sup.supplierKey('Tế'));
check('KHỚP TÊN: không phân biệt hoa/thường + gọn khoảng trắng', sup.supplierKey('  NHÀ   Tế  ') === 'tế');
check('KHỚP TÊN: "Trung" khác "Tế"', sup.supplierKey('Trung') !== sup.supplierKey('Tế'));
check('TIỀN TỐ: needsNhaPrefix("Tế")=true, ("Nhà Tế")=false', sup.needsNhaPrefix('Tế') === true && sup.needsNhaPrefix('Nhà Tế') === false);
check('TIỀN TỐ: ensureNhaPrefix("Tế") = "Nhà Tế"', sup.ensureNhaPrefix('Tế') === 'Nhà Tế');
check('TIỀN TỐ: ensureNhaPrefix("Nhà Tế") giữ nguyên', sup.ensureNhaPrefix('Nhà Tế') === 'Nhà Tế');
check('TIỀN TỐ: ensureNhaPrefix("Hiệu Tam Lư") = "Nhà Hiệu Tam Lư"', sup.ensureNhaPrefix('Hiệu Tam Lư') === 'Nhà Hiệu Tam Lư');

// ─── B. DỮ LIỆU MẪU + TÍNH SỐ LIỆU ──────────────────────────────
// mat-a "Tế" (dữ liệu cũ chưa có tiền tố) + mat-b "Nhà Tế" → phải GỘP chung
state.materialRecords = [
  { id: 'mat-a', type: 'Luồng cây xô', supplier: 'Tế',      location: 'xuong-2', weight: 1000, date: '2026-09-10', createdAt: '2026-09-10T02:00:00.000Z' },
  { id: 'mat-b', type: 'Luồng ống',    supplier: 'Nhà Tế',  location: 'xuong-2', weight: 900,  date: '2026-09-11', createdAt: '2026-09-11T02:00:00.000Z' },
  { id: 'mat-c', type: 'Vầu',          supplier: 'Tế',      location: 'lo-hoi',  weight: 3000, date: '2026-09-12', createdAt: '2026-09-12T02:00:00.000Z' },
  { id: 'mat-d', type: 'Luồng cây xô', supplier: 'Trung',   location: 'xuong-2', weight: 800,  date: '2026-09-11', createdAt: '2026-09-11T03:00:00.000Z' }
];
state.xuong2CutRecords = [
  { id: 'cut-a', materialId: 'mat-a', supplier: 'Tế',     inputWeight: 1000, klOngLuong: 0, klCuiDot: 0, klCayLoai: 100, note: '', date: '2026-09-10', createdAt: '2026-09-10T05:00:00.000Z' },
  { id: 'cut-b', materialId: 'mat-b', supplier: 'Nhà Tế', inputWeight: 900,  klOngLuong: 0, klCuiDot: 0, klCayLoai: 90,  note: 'Cần cắt gọn hơn', date: '2026-09-11', createdAt: '2026-09-11T05:00:00.000Z' },
  { id: 'cut-c', materialId: 'mat-d', supplier: 'Trung',  inputWeight: 800,  klOngLuong: 0, klCuiDot: 0, klCayLoai: 80,  note: '', date: '2026-09-11', createdAt: '2026-09-11T06:00:00.000Z' }
];
const st = sup.supplierStatsOf('Nhà Tế');
check('SỐ LIỆU: Tổng KL đã nhập = 4.900 kg (gộp cả "Tế" chưa chuẩn hóa)', st.totalWeight === 4900);
check('SỐ LIỆU: Số chuyến nhập = 3 (cả Lò hơi)', st.tripCount === 3);
check('SỐ LIỆU: Trung bình = 4.900/3 kg/chuyến', Math.abs(st.avg - 4900 / 3) < 0.001);
check('SỐ LIỆU: 2 lượt cắt/chọn Xưởng 2', st.cutCount === 2);
check('TỶ LỆ ĐẠT: ((1000−100)/1000 + (900−90)/900)/2 = 90%', Math.abs(st.tyLe - 90) < 0.001);
check('NHẮC NHỞ: 1 lần (chỉ lượt có ghi chú)', st.nhac === 1);
check('NHẮC NHỞ: ghi chú được liệt kê kèm ngày', st.recentNotes.length === 1 && st.recentNotes[0].includes('Cần cắt gọn hơn'));
const stTrung = sup.supplierStatsOf('Trung');
check('SỐ LIỆU NCC KHÁC: Trung 1 chuyến, tỷ lệ đạt 90%', stTrung.tripCount === 1 && Math.abs(stTrung.tyLe - 90) < 0.001);
const stNgoai = sup.supplierStatsOf('Nhà Không Tồn Tại');
check('SỐ LIỆU NCC NGOÀI: 0 chuyến, tỷ lệ đạt null', stNgoai.tripCount === 0 && stNgoai.tyLe === null && stNgoai.totalWeight === 0);
check('LOẠI NL: Nhà Tế cung cấp 3 loại (gộp từ 3 lần nhập)', st.types.length === 3);
check('LOẠI NL: sắp theo tổng KL giảm dần (Vầu → Luồng cây xô → Luồng ống)',
  st.types[0].name === 'Vầu' && st.types[1].name === 'Luồng cây xô' && st.types[2].name === 'Luồng ống');
check('LOẠI NL: tổng KL + số chuyến từng loại đúng (Vầu 3.000 kg / 1 chuyến)',
  st.types[0].weight === 3000 && st.types[0].trips === 1);
check('LOẠI NL: NCC ngoài không có loại nào', stNgoai.types.length === 0);

// ─── C. TIÊU CHÍ ĐÁNH GIÁ 1–5 SAO ───────────────────────────────
const perfect = sup.computeSupplierRating({ totalWeight: 0, tripCount: 1, avg: 20000, cutCount: 1, recentCount: 1, tyLe: 96, nhac: 0, recentNotes: [] });
check('ĐIỂM: KL TB 20 tấn + tỷ lệ 96% + 0 nhắc → 5 sao', perfect.score === 5);
const bad = sup.computeSupplierRating({ totalWeight: 0, tripCount: 1, avg: 1000, cutCount: 1, recentCount: 1, tyLe: 70, nhac: 5, recentNotes: [] });
check('ĐIỂM: KL TB 1 tấn + tỷ lệ 70% + 5 nhắc → 1 sao', bad.score === 1);
const noCut = sup.computeSupplierRating({ totalWeight: 0, tripCount: 1, avg: 20000, cutCount: 0, recentCount: 0, tyLe: null, nhac: 0, recentNotes: [] });
check('ĐIỂM: chưa có lượt cắt/chọn → tỷ lệ đạt trung lập 3 → 4 sao', noCut.score === 4 && noCut.pRate === 3);
const rtTe = sup.computeSupplierRating(st);
check('ĐIỂM "Nhà Tế": TB 1.633kg(1) + 90%(4) + 1 nhắc(4) → 0,3+2+0,8 = 3 sao', rtTe.score === 3);

// ─── D. CRUD MODAL (tên tự thêm tiền tố "Nhà") ──────────────────
state.suppliers = [];
sup.loadSuppliers(); // localStorage rỗng → danh sách rỗng
check('NẠP: chưa có dữ liệu → danh sách rỗng', Array.isArray(state.suppliers) && state.suppliers.length === 0);
sup.openSupplierModal();
check('MODAL: mở được (overlay có class show)', document.getElementById('modal-supplier').classList.contains('show'));
document.getElementById('supplier-name').value = 'Tế'; // thiếu tiền tố
document.getElementById('supplier-code').value = 'NCC01';
sup.handleSupplierSubmit({ preventDefault(){} });
check('LƯU: 1 nhà cung cấp trong state', state.suppliers.length === 1);
check('LƯU: tên tự thêm tiền tố → "Nhà Tế"', state.suppliers[0].name === 'Nhà Tế');
check('LƯU: mã số NCC01', state.suppliers[0].code === 'NCC01');
check('LƯU: localStorage đã ghi danh sách', JSON.parse(localStorage.getItem(STORAGE_KEY_SUPPLIERS) || '[]').length === 1);
check('LƯU: modal đóng sau khi lưu', !document.getElementById('modal-supplier').classList.contains('show'));
// Trùng tên (không phân biệt hoa/thường, có/không "Nhà") → chặn
document.getElementById('supplier-name').value = 'nhà tế';
sup.handleSupplierSubmit({ preventDefault(){} });
check('TRÙNG TÊN: "nhà tế" không được thêm lần 2', state.suppliers.length === 1);
// Sửa
const rec = state.suppliers[0];
sup.openSupplierModal(rec.id);
check('SỬA: nạp tên vào ô nhập', document.getElementById('supplier-name').value === 'Nhà Tế');
check('SỬA: nạp mã số vào ô nhập', document.getElementById('supplier-code').value === 'NCC01');
document.getElementById('supplier-code').value = 'NCC-01';
sup.handleSupplierSubmit({ preventDefault(){} });
check('SỬA: mã số cập nhật', state.suppliers[0].code === 'NCC-01');
check('SỬA: có dấu thời gian updatedAt', !!state.suppliers[0].updatedAt);
// Xóa (+ tombstone)
sup.deleteSupplier(rec.id);
check('XÓA: danh sách về rỗng', state.suppliers.length === 0);
check('XÓA: localStorage cũng rỗng', JSON.parse(localStorage.getItem(STORAGE_KEY_SUPPLIERS) || '[]').length === 0);
check('XÓA: đã ghi tombstone (suppliers)', !!(state.deletedIds && state.deletedIds.suppliers && state.deletedIds.suppliers[rec.id]));

// ─── E. CHUẨN HÓA TÊN (thêm "Nhà" cho dữ liệu cũ) ───────────────
state.materialRecords[0].supplier = 'Tế';
state.materialRecords[1].supplier = 'Nhà Tế';
state.materialRecords[2].supplier = 'Tế';
state.materialRecords[3].supplier = 'Trung';
state.xuong2CutRecords[0].supplier = 'Tế';
state.xuong2CutRecords[1].supplier = 'Nhà Tế';
state.suppliers = [{ id: 'sup-x', name: 'Hiệu Tam Lư', code: 'NCC02', createdAt: '2026-09-01T00:00:00.000Z' }];
sup.normalizeSupplierNames();
check('CHUẨN HÓA: lần nhập NL "Tế" → "Nhà Tế"', state.materialRecords[0].supplier === 'Nhà Tế');
check('CHUẨN HÓA: lần nhập "Nhà Tế" giữ nguyên', state.materialRecords[1].supplier === 'Nhà Tế');
check('CHUẨN HÓA: lần nhập "Trung" → "Nhà Trung"', state.materialRecords[3].supplier === 'Nhà Trung');
check('CHUẨN HÓA: snapshot lượt cắt "Tế" → "Nhà Tế"', state.xuong2CutRecords[0].supplier === 'Nhà Tế');
check('CHUẨN HÓA: bảng NCC "Hiệu Tam Lư" → "Nhà Hiệu Tam Lư"', state.suppliers[0].name === 'Nhà Hiệu Tam Lư');
check('CHUẨN HÓA: bảng NCC đã lưu localStorage', JSON.parse(localStorage.getItem(STORAGE_KEY_SUPPLIERS) || '[]').length === 1);

// ─── F. RENDER BẢNG ─────────────────────────────────────────────
state.suppliers.push({ id: 'sup-te', name: 'Nhà Tế', code: 'NCC01', createdAt: '2026-09-15T00:00:00.000Z' });
sup.renderSuppliers();
const tbodyHtml = document.getElementById('supplier-table-body').innerHTML;
check('BẢNG: có dòng "Nhà Tế"', tbodyHtml.includes('Nhà Tế'));
check('BẢNG: có mã số NCC01', tbodyHtml.includes('NCC01'));
check('BẢNG: có sao đánh giá (sup-star)', tbodyHtml.includes('sup-star'));
check('BẢNG: có tổng KL "4.900" kg', tbodyHtml.includes('4.900'));
check('BẢNG: cột loại nguyên liệu hiện chip "Vầu" + "Luồng ống"', tbodyHtml.includes('sup-type-chip') && tbodyHtml.includes('Vầu') && tbodyHtml.includes('Luồng ống'));
check('BẢNG: tỷ lệ đạt "90,0%" hiển thị', tbodyHtml.includes('90,0'));
check('BẢNG: nhắc nhở "1 lần"', tbodyHtml.includes('1 lần'));
check('BẢNG: nút sửa/xóa có data-sup-edit / data-sup-delete', tbodyHtml.includes('data-sup-edit="sup-te"') && tbodyHtml.includes('data-sup-delete="sup-te"'));
const sumHtml = document.getElementById('sup-summary').innerHTML;
check('BẢNG: dòng tổng có số nhà cung cấp', sumHtml.includes('nhà cung cấp'));
const unkHtml = document.getElementById('sup-unknown').innerHTML;
check('CHIP: gợi ý khai báo nhanh "Nhà Trung" (chưa khai báo)', unkHtml.includes('Nhà Trung'));

// Nạp lại từ localStorage (vòng trọn saveSuppliers → loadSuppliers)
sup.saveSuppliers();
sup.loadSuppliers();
check('NẠP LẠI: localStorage → state đủ 2 nhà cung cấp', state.suppliers.length === 2);
check('NẠP LẠI: đúng tên đã chuẩn hóa', state.suppliers.some(s => s.name === 'Nhà Hiệu Tam Lư'));

console.log(`\nKẾT QUẢ: ${pass} pass, ${fail} fail`);
if (fail > 0) process.exit(1);
