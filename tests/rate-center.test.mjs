// tests/rate-center.test.mjs — BẢNG ĐỊNH MỨC TỔNG HỢP + PHÊ DUYỆT (js/rate-center.js)
// 1. Registry: Xưởng 2 = 14 công đoạn (19 cột — Than Hóa + Sấy 6 cột),
//    Xưởng 1 = 8 công đoạn.
// 2. Tháng: gom từ định mức đã có + dữ liệu sản xuất + tháng hiện tại.
// 3. Lưu & trình: ghi đúng dict (kể cả say lồng), ô trống = 0 (KHÔNG xoá khoá),
//    say trống = mặc định, chặn số âm; tạo bản ghi chờ duyệt + ảnh chụp values.
// 4. Phê duyệt: Admin + Ban Quản Lý duyệt được; Editor/Người xem bị chặn.
//    Sửa định mức sau khi duyệt → "Cần duyệt lại" (so ảnh chụp), không duyệt được.
// 5. Người xem: chỉ đọc số + "Duyệt bởi ..." (không có input/nút Lưu).
// 6. Cấu trúc: nút cạnh Lịch Sử, modal, nối storage/cloud/history/main/sw v295.
'use strict';
import fs from 'node:fs';

// ─── Stubs môi trường (giống các test thẻ Xưởng 2) ──────────────
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
state.currentUser = { username: 'admin', role: 'admin', name: 'Quản Trị A', editTabs: [], allowAdvanced: true };
state.activeView = 'kanban-view';
state.batches = [];
const rc = await import('../js/rate-center.js');

// ─── DOM GIẢ: dòng tháng + ô nhập của bảng định mức ─────────────
let rowInputs = {};
global.document.querySelector = (sel) => {
  if (typeof sel === 'string' && sel.indexOf('#rc-body tr[data-rc-month=') === 0) {
    return {
      querySelector: (s) => {
        const m = /data-rc-field="([^"]+)"/.exec(String(s || ''));
        return m ? (rowInputs[m[1]] || null) : null;
      }
    };
  }
  return makeEl();
};
function setInputs(map) {
  rowInputs = {};
  Object.keys(map || {}).forEach(k => { rowInputs[k] = { value: String(map[k]) }; });
}
function baseMap(overrides) {
  const m = {};
  rc.RC_WORKSHOPS.x2.fields.forEach(f => { m[f.key] = ''; });
  return Object.assign(m, overrides || {});
}

// ─── A. REGISTRY: ĐỦ CÔNG ĐOẠN CỦA TỪNG XƯỞNG ──────────────────
const x2Groups = [...new Set(rc.RC_WORKSHOPS.x2.fields.map(f => f.group))];
const X2_DOUBLE = ['Bullig', 'Cắt Ván', 'Bào Ván'];
const x2StageUnits = rc.RC_WORKSHOPS.x2.fields.filter(f => X2_DOUBLE.includes(f.group)).length +
  new Set(rc.RC_WORKSHOPS.x2.fields.filter(f => !X2_DOUBLE.includes(f.group)).map(f => f.group)).size;
check('A1: đăng ký 2 xưởng (x2 · x1), mặc định mở theo xưởng đang xem',
  Object.keys(rc.RC_WORKSHOPS).length === 2 && rc.RC_WORKSHOPS.x1.label === 'Xưởng 1' && rc.RC_WORKSHOPS.x2.label === 'Xưởng 2');
check('A2: Xưởng 2 = 14 công đoạn · 11 nhóm cột · 19 cột (Than Hóa + Sấy tách 6 cột)',
  x2StageUnits === 14 && x2Groups.length === 11 && rc.RC_WORKSHOPS.x2.fields.length === 19);
check('A3: Than Hóa + Sấy có 6 cột (S1/S2 × Ván/Bullig phút + m³/lần lô cũ)',
  rc.RC_WORKSHOPS.x2.fields.filter(f => f.group === 'Than Hóa + Sấy').length === 6);
check('A4: Xưởng 1 = 8 công đoạn, CẢ 8 đơn vị kg/h',
  rc.RC_WORKSHOPS.x1.fields.length === 8 && rc.RC_WORKSHOPS.x1.fields.every(f => f.sub === 'kg/h'));
check('A5: có đủ 4 công đoạn 2 chỉ số (Bullig · Cắt Ván · Bào Ván) + Ép Ván (m³/h)',
  ['Bullig', 'Cắt Ván', 'Bào Ván'].every(g => rc.RC_WORKSHOPS.x2.fields.filter(f => f.group === g).length === 2) &&
  rc.RC_WORKSHOPS.x2.fields.some(f => f.group === 'Ép Ván' && f.sub === 'm³/h'));

// ─── B. DANH SÁCH THÁNG + GIÁ TRỊ ───────────────────────────────
// Định mức Bốc Luồng · Cắt Chọn nay là SỐ XE/GIỜ (21/10/2026)
state.x2CapRates = { '2026-09': 2.5 };
state.xuong2CutRecords = [{ id: 'c1', date: '2026-10-05' }];
const months2 = rc.rcMonthsOf('x2');
check('B1: gom tháng đã có định mức + tháng có dữ liệu sản xuất',
  months2.includes('2026-09') && months2.includes('2026-10'));
check('B2: sắp xếp mới nhất trước', months2.indexOf('2026-10') < months2.indexOf('2026-09'));
check('B3: hình chụp giá trị chỉ gồm chỉ số > 0',
  rc.rcMonthValues('x2', '2026-09').cut === 2.5 &&
  Object.keys(rc.rcMonthValues('x2', '2026-09')).length === 1);
check('B4: 2 cột Bốc Luồng · Cắt Chọn dùng đơn vị xe/h',
  ['boluong', 'cut'].every(k => rc.RC_WORKSHOPS.x2.fields.find(f => f.key === k).sub === 'xe/h'));
check('B5: số CŨ khai theo kg/h được quy đổi ÷ 600 (1500 → 2,5 xe/h), số xe/h giữ nguyên',
  rc.rcXeRate(1500) === 2.5 && rc.rcXeRate(2.5) === 2.5);

// ─── C. LƯU & TRÌNH DUYỆT ───────────────────────────────────────
setInputs(baseMap({
  cut: 2.6, boluong: 2, baotho: 900,
  'say.s1.van': 110, 'say.s1.bullig': 100, 'say.s2.van': 55,
  'say.s2.bullig': 50, 'say.s1.m3': 2.5, 'say.s2.m3': 2
}));
const okSave = rc.rcSaveMonth('x2', '2026-10');
check('C1: Admin lưu được — ghi đúng dict cắt/bốc (xe/h) + bào thô (thanh/h)',
  okSave === true && state.x2CapRates['2026-10'] === 2.6 &&
  state.x2BoluongRates['2026-10'] === 2 && state.x2BaoThoRates['2026-10'] === 900);
check('C2: Than Hóa + Sấy ghi đúng object lồng van/bullig/m3',
  state.x2SayRates.s1['2026-10'].van.phut === 110 &&
  state.x2SayRates.s1['2026-10'].bullig.phut === 100 &&
  state.x2SayRates.s2['2026-10'].van.phut === 55 &&
  state.x2SayRates.s1['2026-10'].m3 === 2.5);
check('C3: ô trống → ghi 0 và GIỮ khoá tháng (không xoá khoá — quy tắc 80)',
  state.x2BoOngRates['2026-10'] === 0 && Object.prototype.hasOwnProperty.call(state.x2BoOngRates, '2026-10'));
const rec1 = rc.rcApprovalOf('x2', '2026-10');
check('C4: tạo bản ghi CHỜ DUYỆT + ảnh chụp values + người trình',
  !!rec1 && rec1.status === 'cho_duyet' && rec1.values.cut === 2.6 &&
  rec1.values['say.s1.van'] === 110 && rec1.submittedByName === 'Quản Trị A');
check('C5: localStorage lưu bản ghi phê duyệt + dict định mức',
  String(localStorage.getItem('bamboo_tracker_rate_approvals_v1') || '').includes('rc-x2-2026-10') &&
  String(localStorage.getItem('bamboo_tracker_x2_capacity_rate_v1') || '').includes('2.6'));

// Số âm bị chặn, không ghi gì
setInputs(baseMap({ cut: '-5' }));
const okNeg = rc.rcSaveMonth('x2', '2026-10');
check('C6: chặn số âm — trả false và KHÔNG đổi định mức',
  okNeg === false && state.x2CapRates['2026-10'] === 2.6);

// Ô trống của Than Hóa + Sấy → ghi MẶC ĐỊNH (105/50/2)
setInputs(baseMap({ cut: 2.6 }));
rc.rcSaveMonth('x2', '2026-10');
check('C7: Than Hóa + Sấy để trống → mặc định S1 105 · S2 50 · 2 m³',
  state.x2SayRates.s1['2026-10'].van.phut === 105 &&
  state.x2SayRates.s2['2026-10'].van.phut === 50 &&
  state.x2SayRates.s1['2026-10'].m3 === 2);

// ─── D. PHÊ DUYỆT: QUYỀN + TỰ PHÁT HIỆN SỐ ĐÃ ĐỔI ──────────────
const recD = rc.rcApprovalOf('x2', '2026-10');
state.currentUser = { username: 'admin', role: 'admin', name: 'Quản Trị A', editTabs: [], allowAdvanced: true };
const okApprove = rc.rcApproveMonth('x2', '2026-10');
check('D1: Admin duyệt được — ghi người duyệt + thời điểm',
  okApprove === true && recD.status === 'da_duyet' &&
  recD.approvedByName === 'Quản Trị A' && !!recD.approvedAt);
check('D2: trạng thái chuyển "Đã duyệt"', rc.rcApprovalState('x2', '2026-10').code === 'approved');

// Sửa định mức trực tiếp (mô phỏng popup định mức cũ của thẻ) → phát hiện lệch
state.x2CapRates['2026-10'] = 2.7;
check('D3: số đổi sau khi duyệt → "Cần duyệt lại" (so ảnh chụp)',
  rc.rcApprovalState('x2', '2026-10').code === 'changed');
check('D4: KHÔNG duyệt lại được khi số đã đổi (phải lưu lại trước)',
  rc.rcApproveMonth('x2', '2026-10') === false);

// Admin lưu lại = trình duyệt lại với ảnh chụp mới
setInputs(baseMap({ cut: 2.7 }));
rc.rcSaveMonth('x2', '2026-10');
const recD5 = rc.rcApprovalOf('x2', '2026-10');
check('D5: lưu lại → Chờ duyệt + ảnh chụp mới + xoá người duyệt cũ',
  recD5.status === 'cho_duyet' && recD5.values.cut === 2.7 && recD5.approvedAt === '' && recD5.approvedByName === '');

// Ban Quản Lý (Ban lãnh đạo): duyệt được nhưng KHÔNG nhập định mức
state.currentUser = { username: 'ql1', role: 'manager', name: 'Ban QL B', editTabs: [], allowAdvanced: true };
check('D6: Ban Quản Lý duyệt được',
  rc.rcApproveMonth('x2', '2026-10') === true &&
  rc.rcApprovalOf('x2', '2026-10').approvedByName === 'Ban QL B');
setInputs(baseMap({ cut: 1900 }));
const okMgrSave = rc.rcSaveMonth('x2', '2026-10');
check('D7: Ban Quản Lý KHÔNG được nhập định mức (giữ quy tắc 34)',
  okMgrSave === false && state.x2CapRates['2026-10'] === 2.7);

state.currentUser = { username: 'ed1', role: 'editor', name: 'Editor C' };
check('D8: Người chỉnh sửa KHÔNG duyệt được', rc.rcApproveMonth('x2', '2026-10') === false);
state.currentUser = { username: 'v1', role: 'viewer', name: 'Người Xem D' };
check('D9: Người xem KHÔNG duyệt được + KHÔNG nhập được',
  rc.rcApproveMonth('x2', '2026-10') === false && rc.rcSaveMonth('x2', '2026-10') === false);

// ─── E. HIỂN THỊ THEO QUYỀN ─────────────────────────────────────
const body = document.getElementById('rc-body');
state.currentUser = { username: 'admin', role: 'admin', name: 'Quản Trị A', editTabs: [], allowAdvanced: true };
rc.renderRateCenter();
check('E1: Admin thấy ô nhập + nút "Lưu & trình"',
  body.innerHTML.includes('data-rc-field="cut"') && body.innerHTML.includes('Lưu &amp; trình'));

state.currentUser = { username: 'v1', role: 'viewer', name: 'Người Xem D' };
rc.renderRateCenter();
check('E2: Người xem chỉ đọc — KHÔNG có ô nhập / nút Lưu',
  !body.innerHTML.includes('<input') && !body.innerHTML.includes('data-rc-save'));
check('E3: Người xem thấy thông tin "Duyệt bởi …"',
  body.innerHTML.includes('Duyệt bởi Ban QL B'));

// Tháng đang CHỜ DUYỆT → Ban Quản Lý thấy nút Duyệt
state.rateApprovals.push({
  id: 'rc-x2-2026-08', ws: 'x2', month: '2026-08', status: 'cho_duyet',
  values: { cut: 2.5 }, submittedBy: 'admin@x', submittedByName: 'Quản Trị A',
  submittedAt: '2026-08-31T08:00:00.000Z', createdAt: '2026-08-31T08:00:00.000Z',
  updatedAt: '2026-08-31T08:00:00.000Z'
});
state.x2CapRates['2026-08'] = 2.5;
state.currentUser = { username: 'ql1', role: 'manager', name: 'Ban QL B', editTabs: [], allowAdvanced: true };
rc.renderRateCenter();
check('E4: Ban Quản Lý thấy nút Duyệt cho tháng CHỜ DUYỆT',
  body.innerHTML.includes('data-rc-approve="2026-08"'));
check('E5: Than Hóa + Sấy có ô mặc định (placeholder) khi chưa khai',
  (() => {
    state.x2SayRates = { s1: {}, s2: {} };
    state.currentUser = { username: 'admin', role: 'admin', name: 'Quản Trị A', editTabs: [], allowAdvanced: true };
    rc.renderRateCenter();
    return body.innerHTML.includes('placeholder="105"') && body.innerHTML.includes('placeholder="2"');
  })());

// ─── F. HUY HIỆU SỐ THÁNG CHỜ DUYỆT ────────────────────────────
rc.updateRatePendingBadge();
const badge = document.getElementById('btn-rate-pending');
const pendingN = rc.rcPendingCount();
check('F1: badge đếm đúng số tháng chờ duyệt / cần duyệt lại',
  badge.textContent === String(pendingN) && badge.hidden === (pendingN === 0) && pendingN >= 1);

// ─── G. NẠP / LƯU BẢN GHI (gộp trùng id, bản mới hơn thắng) ────
state.rateApprovals = [
  { id: 'rc-x1-2026-09', ws: 'x1', month: '2026-09', status: 'cho_duyet', values: {}, updatedAt: '2026-09-01T00:00:00.000Z' },
  { id: 'rc-x1-2026-09', ws: 'x1', month: '2026-09', status: 'da_duyet', values: {}, approvedByName: 'QL', updatedAt: '2026-09-02T00:00:00.000Z' }
];
rc.saveRateApprovals();
check('G1: lưu xuống localStorage — gộp trùng id còn 1 bản ghi',
  (() => {
    const arr = JSON.parse(localStorage.getItem('bamboo_tracker_rate_approvals_v1') || '[]');
    return arr.filter(r => r.id === 'rc-x1-2026-09').length === 1 &&
      arr.find(r => r.id === 'rc-x1-2026-09').status === 'da_duyet';
  })());
state.rateApprovals = [];
rc.loadRateApprovals();
check('G2: nạp lại từ localStorage — giữ bản mới hơn',
  state.rateApprovals.some(r => r.id === 'rc-x1-2026-09' && r.status === 'da_duyet'));

// ─── I. SO ẢNH CHỤP GIÁ TRỊ ─────────────────────────────────────
check('I1: cùng khoá/giá trị (khác thứ tự) → khớp',
  rc.rcSameValues({ a: 1, b: 2 }, { b: 2, a: 1 }) === true);
check('I2: lệch giá trị hoặc thiếu khoá → KHÔNG khớp',
  rc.rcSameValues({ a: 1 }, { a: 2 }) === false && rc.rcSameValues({ a: 1 }, {}) === false);

// ─── J. MỞ / CHUYỂN XƯỞNG / ĐÓNG ──────────────────────────────
state.currentUser = { username: 'admin', role: 'admin', name: 'Quản Trị A', editTabs: [], allowAdvanced: true };
rc.openRateCenter('x1');
check('J1: mở bảng theo Xưởng 1 → 8 công đoạn + modal hiện',
  body.innerHTML.includes('Lọc Thanh/Bó Xô') &&
  document.getElementById('modal-rate-center').classList.contains('show'));
check('J2: chuyển sang Xưởng 2 ngay trong modal', rc.setRateCenterWs('x2') === true &&
  body.innerHTML.includes('Ép Ván') && body.innerHTML.includes('Than Hóa + Sấy'));
check('J3: đóng modal', rc.closeRateCenter() === true &&
  !document.getElementById('modal-rate-center').classList.contains('show'));

// ─── H. CẤU TRÚC MÃ NGUỒN ───────────────────────────────────────
const readSrc = (p) => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const idx = readSrc('index.html');
const ev = readSrc('js/events.js');
const sw = readSrc('sw.js');
const stSrc = readSrc('js/state.js');
const stg = readSrc('js/storage.js');
const cl = readSrc('js/cloud.js');
const hist = readSrc('js/history.js');
const main = readSrc('js/main.js');
const css = readSrc('styles.css');
const pkg = readSrc('package.json');
check('H1: nút "Định Mức" đứng ngay TRƯỚC nút "Lịch Sử" trên thanh tiêu đề',
  idx.indexOf('id="btn-rate-center"') > 0 &&
  idx.indexOf('id="btn-rate-center"') < idx.indexOf('id="btn-history-kanban"'));
check('H2: index.html có đủ modal + id bắt buộc',
  ['modal-rate-center', 'btn-close-rate-center', 'rc-body', 'btn-rc-close', 'btn-rate-pending']
    .every(id => idx.includes(`id="${id}"`)));
check('H3: đã ẩn 19 nút định mức cũ trong các thẻ (giữ id cho tương thích)',
  (idx.match(/id="btn-(?:x2|x1)-[a-z-]+-rate" hidden/g) || []).length >= 19);
check('H4: events.js nối mở/đóng + uỷ nhiệm click trong #rc-body',
  ev.includes("safeOn('btn-rate-center'") && ev.includes("safeOn('rc-body'") &&
  ev.includes('onRateCenterClick') && ev.includes("safeOn('btn-rc-close'"));
check('H5: sw.js CACHE_NAME v295 + js/rate-center.js trong APP_SHELL',
  sw.includes('nha-may-ngoc-son-v301') && sw.includes("'./js/rate-center.js'"));
check('H6: state.js có key + mảng rateApprovals + APP_VERSION v301',
  stSrc.includes('bamboo_tracker_rate_approvals_v1') &&
  stSrc.includes('rateApprovals: []') && stSrc.includes("APP_VERSION = 'v301'"));
check('H7: storage.js nối restore + ghi vào 2 file snapshot',
  stg.includes('function restoreRateApprovals') &&
  (stg.match(/rateApprovals: state\.rateApprovals \|\| \[\]/g) || []).length >= 2);
check('H8: cloud.js nối snapshot / cloudCore / gộp mây / persist / applyFireSnapshot',
  ['rateApprovals: state.rateApprovals || []', 'rateApprovals: obj.rateApprovals || []',
    "clean('rateApprovals'", 'STORAGE_KEY_RATE_APPROVALS'].every(s => cl.includes(s)));
check('H9: rateApprovals KHÔNG nằm trong tường lửa RATE_DOMAINS (BQL phải đẩy được bản duyệt)',
  (() => {
    const start = cl.indexOf('const RATE_DOMAINS');
    const blk = cl.slice(start, cl.indexOf(']);', start));
    return start > 0 && !blk.includes("'rateApprovals'");
  })());
check('H10: history.js + main.js nối đủ (DOMAIN + load boot + badge renderAll)',
  hist.includes('rateApprovals:') && main.includes('loadRateApprovals') &&
  main.includes('updateRatePendingBadge'));
check('H11: styles.css có bảng + chip trạng thái + badge chờ duyệt',
  css.includes('.rc-table {') && css.includes('.rc-status.is-ok') &&
  css.includes('.rc-pending-chip') && css.includes('.rate-center-card'));
check('H12: package.json đã thêm tests/rate-center.test.mjs vào chuỗi npm test',
  pkg.includes('tests/rate-center.test.mjs'));

console.log(`\nKẾT QUẢ: ${pass} pass, ${fail} fail`);
if (fail > 0) process.exit(1);



