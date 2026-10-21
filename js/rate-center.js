// ═══════════════════════════════════════════════════════════
// js/rate-center.js — BẢNG ĐỊNH MỨC TỔNG HỢP + PHÊ DUYỆT
// ───────────────────────────────────────────────────────────
// Nút "Định Mức" trên thanh tiêu đề tab Công Đoạn SX (cạnh "Lịch Sử") mở
// MỘT bảng duy nhất gồm TẤT CẢ công đoạn của XƯỞNG đang xem:
//   • Xưởng 2 — 14 công đoạn (Bốc Luồng · Cắt Chọn · Bổ Ống · Bào Thô ·
//     Chọn Nan Thô · Than Hóa + Sấy · Bào Tinh · Ép Ván · Bullig ×2 ·
//     Cắt Ván ×2 · Bào Ván ×2)
//   • Xưởng 1 — 8 công đoạn (Cắt Ống · Sấy Sinh · Bốc · Lọc Ống · Cắt Mắt ·
//     Bổ · Phơi Sấy · Lọc Thanh/Bó Xô)
//
// Mỗi DÒNG = 1 THÁNG, mỗi CỘT = 1 chỉ số định mức → nhập cả tháng trong 1 lượt.
// Định mức lưu là CÓ HIỆU LỰC NGAY (Hiệu suất tính như hiện nay); PHÊ DUYỆT là
// xác nhận chính thức + lưu vết:
//   • NHẬP số  : CHỈ Quản Trị (giữ quy tắc 34 — cổng cloud.requireRatePermission)
//   • DUYỆT    : Quản Trị + Ban Quản Lý (permissions.canApproveRate)
//   • Người xem / Người chỉnh sửa: CHỈ ĐỌC số + "Duyệt bởi ..."
//
// Dữ liệu phê duyệt: state.rateApprovals (key bamboo_tracker_rate_approvals_v1)
// — mỗi bản ghi 1 (xưởng, tháng) + `values` = ẢNH CHỤP số lúc trình/duyệt nên
// tự phát hiện "Cần duyệt lại" khi ai đó sửa định mức sau khi đã duyệt (kể cả
// sửa bằng popup định mức cũ của từng thẻ).
//
// QUY ƯỚC GHI: ô để trống → ghi 0, TUYỆT ĐỐI KHÔNG xoá khoá dict (quy tắc 80:
// khoá bị xoá không được đẩy lên mây nên sẽ bị hồi sinh ở nhịp syncNow kế tiếp).
// Riêng Than Hóa + Sấy: ô trống ghi MẶC ĐỊNH (S1 105' · S2 50' · 2 m³) để khớp
// cách js/xuong2.js loadX2SayRates() chuẩn hoá dữ liệu khi nạp lại.
// ═══════════════════════════════════════════════════════════
import { firePushSync, initLucide, requireRatePermission } from './cloud.js';
import { logDataChange } from './history.js';
import { canApproveRate, canEditRate } from './permissions.js';
import {
  STORAGE_KEY_RATE_APPROVALS,
  STORAGE_KEY_X1_RATES,
  STORAGE_KEY_X2_BAO_THO_RATE,
  STORAGE_KEY_X2_BAO_TINH_RATE,
  STORAGE_KEY_X2_BAO_VAN_RATE,
  STORAGE_KEY_X2_BO_ONG_RATE,
  STORAGE_KEY_X2_BOLUONG_RATE,
  STORAGE_KEY_X2_BULLIG_RATE,
  STORAGE_KEY_X2_CAP_RATE,
  STORAGE_KEY_X2_CAT_VAN_RATE,
  STORAGE_KEY_X2_CHON_NAN_RATE,
  STORAGE_KEY_X2_EP_VAN_RATE,
  STORAGE_KEY_X2_SAY_RATE,
  state
} from './state.js';
import { escapeHTML, showToast } from './utils.js';

// Mặc định 1 lần than hóa — PHẢI khớp SAY_RATE_DEFAULT của js/xuong2.js
// (không import được vì hằng số đó không export; đổi bên kia thì đổi cả đây).
const RC_SAY_DEFAULT = {
  s1: { van: 105, bullig: 105, m3: 2 },
  s2: { van: 50, bullig: 50, m3: 2 }
};

const RC_NO_VALUE = '—';

function rcNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
function rcFmt(v) {
  const n = Number(v);
  if (!Number.isFinite(n) || n === 0) return RC_NO_VALUE;
  return n.toLocaleString('vi-VN', { maximumFractionDigits: 2 });
}
function rcMonthLabel(m) {
  const s = String(m || '');
  return /^\d{4}-\d{2}$/.test(s) ? `Tháng ${Number(s.slice(5))}/${s.slice(0, 4)}` : s;
}
function rcTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const p = n => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
function rcUserName(u) {
  if (!u) return 'Người dùng';
  return u.displayName || u.fullName || u.name || u.email || 'Người dùng';
}
function rcUserKey(u) { return (u && (u.email || u.username || u.id)) || ''; }
function rcStateName(ws) { return ws === 'x1' ? 'Xưởng 1' : 'Xưởng 2'; }

// ─── SỔ LƯU TRỮ: mỗi dict định mức ↔ localStorage key + tên state (history) ──
const RC_STORES = {
  [STORAGE_KEY_X2_BOLUONG_RATE]: { stateKey: 'x2BoluongRates', get: () => state.x2BoluongRates },
  [STORAGE_KEY_X2_CAP_RATE]: { stateKey: 'x2CapRates', get: () => state.x2CapRates },
  [STORAGE_KEY_X2_BO_ONG_RATE]: { stateKey: 'x2BoOngRates', get: () => state.x2BoOngRates },
  [STORAGE_KEY_X2_BAO_THO_RATE]: { stateKey: 'x2BaoThoRates', get: () => state.x2BaoThoRates },
  [STORAGE_KEY_X2_CHON_NAN_RATE]: { stateKey: 'x2ChonNanRates', get: () => state.x2ChonNanRates },
  [STORAGE_KEY_X2_SAY_RATE]: { stateKey: 'x2SayRates', get: () => state.x2SayRates },
  [STORAGE_KEY_X2_BAO_TINH_RATE]: { stateKey: 'x2BaoTinhRates', get: () => state.x2BaoTinhRates },
  [STORAGE_KEY_X2_EP_VAN_RATE]: { stateKey: 'x2EpVanRates', get: () => state.x2EpVanRates },
  [STORAGE_KEY_X2_BULLIG_RATE]: { stateKey: 'x2BulligRates', get: () => state.x2BulligRates },
  [STORAGE_KEY_X2_CAT_VAN_RATE]: { stateKey: 'x2CatVanRates', get: () => state.x2CatVanRates },
  [STORAGE_KEY_X2_BAO_VAN_RATE]: { stateKey: 'x2BaoVanRates', get: () => state.x2BaoVanRates },
  [STORAGE_KEY_X1_RATES]: { stateKey: 'x1Rates', get: () => state.x1Rates }
};

// ─── ĐỊNH NGHĨA 1 CỘT ĐỊNH MỨC ───────────────────────────────
// read(m)      = số ĐANG LƯU (0 = chưa khai) — dùng cho ảnh chụp phê duyệt
// effective(m) = số HIỂN THỊ (Than Hóa + Sấy: có mặc định khi chưa khai)
// write(m, v)  = ghi vào state (ô trống → 0 / mặc định)
function rcSimple(key, group, sub, storeKey) {
  const getDict = () => (RC_STORES[storeKey] ? RC_STORES[storeKey].get() : null) || {};
  return {
    key, group, sub, storeKey,
    read: m => rcNum(getDict()[m]),
    effective: m => rcNum(getDict()[m]),
    write: (m, v) => { const d = getDict(); if (d) d[m] = v > 0 ? v : 0; }
  };
}
// ─── ĐỊNH MỨC TÍNH THEO SỐ XE/GIỜ (Bốc Luồng · Cắt Chọn — 21/10/2026) ──
// Số CŨ khai theo kg/h (1800–3000) được QUY ĐỔI ÷ KL/xe mặc định (600 kg) khi
// ĐỌC (2000 kg/h → 3,333 xe/h) nên HIỆU SUẤT LỊCH SỬ KHÔNG ĐỔI; lần "Lưu &
// trình" kế tiếp ghi số xe/h vào dict. Chỉ quy đổi giá trị > RC_XE_LEGACY_MAX
// để KHÔNG chia 2 lần. ⚠ Giữ ĐỒNG BỘ với js/xuong2.js (xeRateOf).
const RC_XE_LEGACY_MAX = 100;
const RC_KG_PER_CART = 600;
function rcXeRate(v) {
  const n = rcNum(v);
  if (!(n > 0)) return 0;
  if (n > RC_XE_LEGACY_MAX) return Math.round((n / RC_KG_PER_CART) * 1000) / 1000;
  return n;
}
function rcXe(key, group, storeKey) {
  const getDict = () => (RC_STORES[storeKey] ? RC_STORES[storeKey].get() : null) || {};
  return {
    key, group, sub: 'xe/h', storeKey,
    read: m => rcXeRate(getDict()[m]),
    effective: m => rcXeRate(getDict()[m]),
    write: (m, v) => { const d = getDict(); if (d) d[m] = v > 0 ? v : 0; }
  };
}
function rcNested(key, group, sub, storeKey, subKey) {
  const getParent = () => (RC_STORES[storeKey] ? RC_STORES[storeKey].get() : null) || {};
  return {
    key, group, sub, storeKey,
    read: m => rcNum(((getParent() || {})[subKey] || {})[m]),
    effective: m => rcNum(((getParent() || {})[subKey] || {})[m]),
    write: (m, v) => {
      const p = getParent();
      if (!p) return;
      p[subKey] = p[subKey] || {};
      p[subKey][m] = v > 0 ? v : 0;
    }
  };
}
// Định mức Xưởng 1: state.x1Rates[<khối>][tháng] = kg/h
function rcX1(key, label, khoi) {
  const getDict = () => ((state.x1Rates || {})[khoi]) || {};
  return {
    key, group: label, sub: 'kg/h', storeKey: STORAGE_KEY_X1_RATES,
    read: m => rcNum(getDict()[m]),
    effective: m => rcNum(getDict()[m]),
    write: (m, v) => {
      state.x1Rates = state.x1Rates || {};
      state.x1Rates[khoi] = state.x1Rates[khoi] || {};
      state.x1Rates[khoi][m] = v > 0 ? v : 0;
    }
  };
}
// Than Hóa + Sấy: state.x2SayRates[grp][tháng] = { van:{phut}, bullig:{phut}, m3 }
// Đọc được cả bản cũ (số thuần = phút · { phut, m3 }) như xuong2.js.
function rcSay(key, sub, grp, field) {
  const def = RC_SAY_DEFAULT[grp][field];
  const getMonth = m => (((state.x2SayRates || {})[grp]) || {})[m];
  const read = (m) => {
    const o = getMonth(m);
    if (!o) return 0;
    if (typeof o === 'number') return field === 'm3' ? 0 : rcNum(o);
    if (field === 'm3') return rcNum(o.m3);
    const per = o[field];
    if (per && typeof per === 'object') return rcNum(per.phut);
    return rcNum(o.phut); // bản cũ dùng chung 2 loại
  };
  return {
    key, group: 'Than Hóa + Sấy', sub, storeKey: STORAGE_KEY_X2_SAY_RATE,
    read,
    effective: m => read(m) > 0 ? read(m) : def,
    write: (m, v) => {
      state.x2SayRates = state.x2SayRates || { s1: {}, s2: {} };
      state.x2SayRates[grp] = state.x2SayRates[grp] || {};
      const base = state.x2SayRates[grp][m];
      const o = (base && typeof base === 'object')
        ? base
        : {
          van: { phut: RC_SAY_DEFAULT[grp].van },
          bullig: { phut: RC_SAY_DEFAULT[grp].bullig },
          m3: RC_SAY_DEFAULT[grp].m3
        };
      const val = v > 0 ? v : def;
      if (field === 'm3') o.m3 = val;
      else {
        o[field] = (o[field] && typeof o[field] === 'object') ? o[field] : { phut: def };
        o[field].phut = val;
      }
      if (!o.van) o.van = { phut: RC_SAY_DEFAULT[grp].van };
      if (!o.bullig) o.bullig = { phut: RC_SAY_DEFAULT[grp].bullig };
      if (!(rcNum(o.m3) > 0)) o.m3 = RC_SAY_DEFAULT[grp].m3;
      state.x2SayRates[grp][m] = o;
    }
  };
}

const X2_FIELDS = [
  rcXe('boluong', 'Bốc Luồng', STORAGE_KEY_X2_BOLUONG_RATE),
  rcXe('cut', 'Cắt Chọn', STORAGE_KEY_X2_CAP_RATE),
  rcSimple('boong', 'Bổ Ống', 'kg/h', STORAGE_KEY_X2_BO_ONG_RATE),
  rcSimple('baotho', 'Chạy Máy Bào Thô', 'thanh/h', STORAGE_KEY_X2_BAO_THO_RATE),
  rcSimple('chonnan', 'Chọn Nan Thô', 'thanh/h', STORAGE_KEY_X2_CHON_NAN_RATE),
  rcSay('say.s1.van', 'Sấy 1 · Ván (phút/lần)', 's1', 'van'),
  rcSay('say.s1.bullig', 'Sấy 1 · Bullig (phút/lần)', 's1', 'bullig'),
  rcSay('say.s2.van', 'Sấy 2 · Ván (phút/lần)', 's2', 'van'),
  rcSay('say.s2.bullig', 'Sấy 2 · Bullig (phút/lần)', 's2', 'bullig'),
  rcSay('say.s1.m3', 'Sấy 1 · m³/lần (lô cũ)', 's1', 'm3'),
  rcSay('say.s2.m3', 'Sấy 2 · m³/lần (lô cũ)', 's2', 'm3'),
  rcSimple('baotinh', 'Bào Tinh', 'thanh/h', STORAGE_KEY_X2_BAO_TINH_RATE),
  rcSimple('epvan', 'Ép Ván', 'm³/h', STORAGE_KEY_X2_EP_VAN_RATE),
  rcNested('bullig.gc', 'Bullig', 'Gia công (thanh/h)', STORAGE_KEY_X2_BULLIG_RATE, 'gc'),
  rcNested('bullig.ct', 'Bullig', 'Chọn thanh (thanh/h)', STORAGE_KEY_X2_BULLIG_RATE, 'ct'),
  rcNested('catvan.cat', 'Cắt Ván', 'Cắt ván (tấm/h)', STORAGE_KEY_X2_CAT_VAN_RATE, 'cat'),
  rcNested('catvan.xe', 'Cắt Ván', 'Xẻ thanh (thanh/h)', STORAGE_KEY_X2_CAT_VAN_RATE, 'xe'),
  rcNested('baovan.bao', 'Bào Ván', 'Bào (tấm/h)', STORAGE_KEY_X2_BAO_VAN_RATE, 'bao'),
  rcNested('baovan.cha', 'Bào Ván', 'Chà thùng (tấm/h)', STORAGE_KEY_X2_BAO_VAN_RATE, 'cha')
];

const X1_FIELDS = [
  rcX1('x1.catOng', 'Cắt Ống', 'catOng'),
  rcX1('x1.saySinh', 'Sấy Sinh', 'saySinh'),
  rcX1('x1.boc', 'Bốc', 'boc'),
  rcX1('x1.locOng', 'Lọc Ống', 'locOng'),
  rcX1('x1.catMat', 'Cắt Mắt', 'catMat'),
  rcX1('x1.bo', 'Bổ', 'bo'),
  rcX1('x1.phoiSay', 'Phơi Sấy', 'phoiSay'),
  rcX1('x1.locThanh', 'Lọc Thanh/Bó Xô', 'locThanh')
];

// Mảng bản ghi dùng để gom THÁNG có dữ liệu sản xuất của xưởng (dựng danh sách dòng)
const X2_RECORD_KEYS = [
  'xuong2BoluongRecords', 'xuong2CutRecords', 'xuong2BoOngRecords',
  'xuong2BaoThoRecords', 'xuong2ChonNanThoRecords', 'xuong2BaoTinhRecords',
  'pressRecords', 'xuong2BulligRecords', 'xuong2CatVanRecords',
  'xuong2BaoVanRecords', 'batches'
];
const X1_RECORD_KEYS = [
  'xuong1CatOngRecords', 'xuong1SaySinhRecords', 'xuong1BocRecords',
  'xuong1LocOngRecords', 'xuong1CatMatRecords', 'xuong1BoRecords',
  'xuong1PhoiSayRecords', 'xuong1LocThanhRecords'
];

const RC_WORKSHOPS = {
  x2: { id: 'x2', label: 'Xưởng 2', icon: 'factory', fields: X2_FIELDS, recordKeys: X2_RECORD_KEYS },
  x1: { id: 'x1', label: 'Xưởng 1', icon: 'warehouse', fields: X1_FIELDS, recordKeys: X1_RECORD_KEYS }
};

// Trạng thái UI theo PHIÊN (mở lại modal luôn theo xưởng đang xem ở tab)
let rcWs = 'x2';
let rcExtraMonths = new Set();

// ─── THÁNG / GIÁ TRỊ / TRẠNG THÁI PHÊ DUYỆT ──────────────────
function rcDictMonths(obj) {
  const out = new Set();
  Object.keys(obj || {}).forEach(k => {
    if (/^\d{4}-\d{2}$/.test(k)) { out.add(k); return; }
    const v = obj[k];
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      Object.keys(v).forEach(m => { if (/^\d{4}-\d{2}$/.test(m)) out.add(m); });
    }
  });
  return out;
}

// Danh sách tháng của xưởng: tháng đã có định mức + tháng có dữ liệu sản xuất
// + tháng hiện tại + tháng admin tự thêm trong phiên → mới nhất trước.
function rcMonthsOf(ws) {
  const def = RC_WORKSHOPS[ws] || RC_WORKSHOPS.x2;
  const months = new Set();
  const seen = new Set();
  def.fields.forEach(f => {
    if (seen.has(f.storeKey)) return;
    seen.add(f.storeKey);
    const store = RC_STORES[f.storeKey];
    if (store) rcDictMonths(store.get() || {}).forEach(m => months.add(m));
  });
  def.recordKeys.forEach(k => {
    (state[k] || []).forEach(r => {
      if (!r) return;
      const m = String(r.date || '').slice(0, 7);
      if (/^\d{4}-\d{2}$/.test(m)) months.add(m);
    });
  });
  months.add(new Date().toISOString().slice(0, 7));
  rcExtraMonths.forEach(m => months.add(m));
  return [...months].filter(m => /^\d{4}-\d{2}$/.test(m)).sort((a, b) => b.localeCompare(a));
}

// Ảnh chụp số định mức của 1 (xưởng, tháng) — CHỈ các chỉ số > 0
function rcMonthValues(ws, month) {
  const def = RC_WORKSHOPS[ws] || RC_WORKSHOPS.x2;
  const out = {};
  def.fields.forEach(f => {
    const v = rcNum(f.read(month));
    if (v > 0) out[f.key] = v;
  });
  return out;
}

function rcApprovalOf(ws, month) {
  return (state.rateApprovals || []).find(r => r && r.ws === ws && r.month === month) || null;
}

function rcSameValues(a, b) {
  const ka = Object.keys(a || {}).sort();
  const kb = Object.keys(b || {}).sort();
  if (ka.length !== kb.length) return false;
  return ka.every((k, i) => k === kb[i] && rcNum((a || {})[k]) === rcNum((b || {})[k]));
}

// code: none | unapproved | pending | approved | changed
// stale: bản ghi có nhưng số hiện tại đã khác ảnh chụp (không được duyệt)
function rcApprovalState(ws, month) {
  const def = RC_WORKSHOPS[ws] || RC_WORKSHOPS.x2;
  const rec = rcApprovalOf(ws, month);
  const values = rcMonthValues(ws, month);
  const hasVals = Object.keys(values).length > 0;
  if (!rec) return { code: hasVals ? 'unapproved' : 'none', rec: null, values, stale: false, def };
  const same = rcSameValues(rec.values || {}, values);
  if (rec.status === 'da_duyet') {
    return { code: same ? 'approved' : 'changed', rec, values, stale: !same, def };
  }
  return { code: 'pending', rec, values, stale: !same, def };
}

// Số tháng đang chờ duyệt / cần duyệt lại (badge trên nút "Định Mức")
function rcPendingCount() {
  let n = 0;
  ['x2', 'x1'].forEach(ws => {
    rcMonthsOf(ws).forEach(m => {
      const st = rcApprovalState(ws, m);
      if (st.code === 'pending' || st.code === 'changed') n++;
    });
  });
  return n;
}

function updateRatePendingBadge() {
  const el = document.getElementById('btn-rate-pending');
  if (!el) return;
  const n = rcPendingCount();
  el.textContent = String(n);
  el.hidden = n === 0;
  el.title = n ? `${n} tháng định mức đang chờ duyệt / cần duyệt lại` : '';
}

// ─── NẠP / LƯU BẢN GHI PHÊ DUYỆT ─────────────────────────────
function rcCleanRecord(r) {
  if (!r || typeof r !== 'object') return null;
  const ws = r.ws === 'x1' || r.ws === 'x2' ? r.ws : '';
  const month = String(r.month || '');
  if (!ws || !/^\d{4}-\d{2}$/.test(month)) return null;
  return {
    id: String(r.id || `rc-${ws}-${month}`),
    ws,
    month,
    status: r.status === 'da_duyet' ? 'da_duyet' : 'cho_duyet',
    values: (r.values && typeof r.values === 'object' && !Array.isArray(r.values)) ? r.values : {},
    submittedBy: r.submittedBy || '',
    submittedByName: r.submittedByName || '',
    submittedAt: r.submittedAt || '',
    approvedBy: r.approvedBy || '',
    approvedByName: r.approvedByName || '',
    approvedAt: r.approvedAt || '',
    createdAt: r.createdAt || '',
    updatedAt: r.updatedAt || r.approvedAt || r.submittedAt || r.createdAt || ''
  };
}

function rcDedupe(list) {
  const map = new Map();
  (Array.isArray(list) ? list : []).forEach(r => {
    const rec = rcCleanRecord(r);
    if (!rec) return;
    const cur = map.get(rec.id);
    if (!cur || String(rec.updatedAt) > String(cur.updatedAt)) map.set(rec.id, rec);
  });
  return [...map.values()];
}

function loadRateApprovals() {
  const raw = (typeof localStorage !== 'undefined') ? localStorage.getItem(STORAGE_KEY_RATE_APPROVALS) : null;
  if (!raw) { state.rateApprovals = Array.isArray(state.rateApprovals) ? state.rateApprovals : []; return state.rateApprovals; }
  try {
    state.rateApprovals = rcDedupe(JSON.parse(raw));
  } catch (e) {
    state.rateApprovals = Array.isArray(state.rateApprovals) ? state.rateApprovals : [];
  }
  return state.rateApprovals;
}

function saveRateApprovals() {
  state.rateApprovals = rcDedupe(state.rateApprovals || []);
  try { localStorage.setItem(STORAGE_KEY_RATE_APPROVALS, JSON.stringify(state.rateApprovals)); } catch (e) {}
  // Ghi file dữ liệu (nếu đang kết nối thư mục) — import động để tránh vòng phụ thuộc
  if (state.fileStorage && state.fileStorage.connected) {
    import('./storage.js').then(m => m && m.writeDataToFile && m.writeDataToFile()).catch(() => {});
  }
  firePushSync();
  updateRatePendingBadge();
}

// Lưu các dict định mức vừa sửa xuống localStorage (chỉ những sổ có trong bảng)
function rcPersistStores(fields) {
  const seen = new Set();
  (fields || []).forEach(f => {
    if (seen.has(f.storeKey)) return;
    seen.add(f.storeKey);
    const store = RC_STORES[f.storeKey];
    if (!store) return;
    try { localStorage.setItem(f.storeKey, JSON.stringify(store.get() || {})); } catch (e) {}
  });
  if (state.fileStorage && state.fileStorage.connected) {
    import('./storage.js').then(m => m && m.writeDataToFile && m.writeDataToFile()).catch(() => {});
  }
  firePushSync();
}

// Vẽ lại các thẻ công đoạn (chip ĐM + Hiệu suất) sau khi đổi định mức
function rcRefreshBoard() {
  import('./main.js').then(m => m && m.renderAll && m.renderAll()).catch(() => {});
}

// ─── GIAO DIỆN BẢNG ──────────────────────────────────────────
function rcStatusHtml(st) {
  if (st.code === 'approved') return '<span class="rc-status is-ok">✅ Đã duyệt</span>';
  if (st.code === 'changed') return '<span class="rc-status is-changed">⚠ Cần duyệt lại</span>';
  if (st.code === 'pending') return st.stale
    ? '<span class="rc-status is-warn">⚠ Số đã đổi — cần lưu lại</span>'
    : '<span class="rc-status is-wait">⏳ Chờ duyệt</span>';
  if (st.code === 'unapproved') return '<span class="rc-status is-none">Chưa trình duyệt</span>';
  return '<span class="rc-status is-none">Chưa khai</span>';
}

function rcApproverHtml(st) {
  const rec = st.rec;
  if (!rec) return '<span class="rc-muted">—</span>';
  const submit = rec.submittedByName
    ? `<div class="rc-approver-sub">Trình: ${escapeHTML(rec.submittedByName)}${rec.submittedAt ? ' · ' + escapeHTML(rcTime(rec.submittedAt)) : ''}</div>`
    : '';
  if (rec.status === 'da_duyet') {
    const who = rec.approvedByName || rec.approvedBy || '—';
    const warn = st.code === 'changed' ? '<div class="rc-approver-warn">Số đã thay đổi sau khi duyệt</div>' : '';
    return `<div class="rc-approver"><b>Duyệt bởi ${escapeHTML(who)}</b>`
      + `<div class="rc-approver-sub">${escapeHTML(rcTime(rec.approvedAt))}</div>${warn}${submit}</div>`;
  }
  return `<div class="rc-approver"><span class="rc-muted">Chờ duyệt</span>${submit}</div>`;
}

function rcHeadHtml(fields) {
  let h1 = '', h2 = '';
  let i = 0;
  while (i < fields.length) {
    const g = fields[i].group;
    let span = 1;
    while (i + span < fields.length && fields[i + span].group === g) span++;
    h1 += `<th colspan="${span}" class="rc-th-group">${escapeHTML(g)}</th>`;
    i += span;
  }
  fields.forEach(f => { h2 += `<th class="rc-th-sub">${escapeHTML(f.sub)}</th>`; });
  return '<tr><th rowspan="2" class="rc-th-month">Tháng</th>' + h1
    + '<th rowspan="2" class="rc-th-side">Trạng thái</th>'
    + '<th rowspan="2" class="rc-th-side">Duyệt bởi</th>'
    + '<th rowspan="2" class="rc-th-side">Thao tác</th></tr>'
    + '<tr>' + h2 + '</tr>';
}

function rcRowHtml(ws, month, fields, canEdit, canApprove) {
  const st = rcApprovalState(ws, month);
  const cells = fields.map(f => {
    const raw = rcNum(f.read(month));
    if (!canEdit) {
      // Người xem thấy SỐ HIỆU LỰC (Than Hóa + Sấy chưa khai → mặc định)
      return `<td class="rc-td rc-ro">${escapeHTML(rcFmt(rcNum(f.effective(month))))}</td>`;
    }
    const val = raw > 0 ? String(raw) : '';
    const def = rcNum(f.effective(month));
    const isDef = !(raw > 0) && def > 0;
    return `<td class="rc-td"><input type="number" class="rc-input${isDef ? ' is-default' : ''}"`
      + ` min="0" step="any" inputmode="decimal" data-rc-field="${escapeHTML(f.key)}"`
      + ` value="${escapeHTML(val)}"${isDef ? ` placeholder="${escapeHTML(String(def))}"` : ''}`
      + ` title="${escapeHTML(f.group + (f.sub ? ' · ' + f.sub : ''))}"></td>`;
  }).join('');
  const acts = [];
  if (canEdit) {
    acts.push(`<button type="button" class="btn btn-primary btn-sm rc-btn" data-rc-save="${escapeHTML(month)}" title="Lưu định mức tháng này và TRÌNH DUYỆT"><i data-lucide="save"></i> Lưu &amp; trình</button>`);
  }
  if (canApprove && st.code === 'pending' && !st.stale) {
    acts.push(`<button type="button" class="btn btn-success btn-sm rc-btn" data-rc-approve="${escapeHTML(month)}" title="Duyệt định mức tháng này"><i data-lucide="check"></i> Duyệt</button>`);
  }
  if (canEdit && st.rec && st.rec.status === 'da_duyet') {
    acts.push(`<button type="button" class="btn btn-outline btn-sm rc-btn" data-rc-revoke="${escapeHTML(month)}" title="Bỏ duyệt — đưa tháng về chờ duyệt">Bỏ duyệt</button>`);
  }
  return `<tr data-rc-month="${escapeHTML(month)}" class="rc-row rc-row-${st.code}">`
    + `<td class="rc-td rc-month">${escapeHTML(rcMonthLabel(month))}</td>${cells}`
    + `<td class="rc-td">${rcStatusHtml(st)}</td>`
    + `<td class="rc-td rc-approver-cell">${rcApproverHtml(st)}</td>`
    + `<td class="rc-td rc-actions">${acts.join('') || '<span class="rc-muted">—</span>'}</td></tr>`;
}

function renderRateCenter() {
  const body = document.getElementById('rc-body');
  if (!body) return;
  const ws = (rcWs === 'x1' || rcWs === 'x2') ? rcWs : 'x2';
  const def = RC_WORKSHOPS[ws];
  const canEdit = canEditRate();
  const canApprove = canApproveRate();
  const months = rcMonthsOf(ws);
  const wsBtn = (id) => `<button type="button" class="rc-ws-btn${id === ws ? ' is-on' : ''}" data-rc-ws="${id}" role="tab" aria-selected="${id === ws}"><i data-lucide="${RC_WORKSHOPS[id].icon}"></i> ${RC_WORKSHOPS[id].label}</button>`;
  const intro = canEdit
    ? 'Nhập định mức của CẢ THÁNG trong 1 dòng rồi bấm <b>Lưu &amp; trình</b>. Ô trống = chưa đặt (riêng Than Hóa + Sấy = dùng mặc định). Định mức lưu có hiệu lực ngay; phê duyệt là xác nhận chính thức.'
    : (canApprove
      ? 'Bạn là Ban lãnh đạo: xem số và bấm <b>Duyệt</b> cho tháng đang chờ duyệt. Ô số chỉ Quản Trị được sửa.'
      : 'Bạn đang ở chế độ CHỈ XEM: thấy số định mức của mọi công đoạn và thông tin “Duyệt bởi …”.');
  body.innerHTML = `<div class="rc-intro">${intro}</div>`
    + '<div class="rc-toolbar">'
    + `<div class="rc-ws-switch" role="tablist" aria-label="Chọn xưởng">${wsBtn('x2')}${wsBtn('x1')}</div>`
    + (canEdit
      ? '<div class="rc-add-month"><label for="rc-new-month">Thêm tháng</label><input type="month" id="rc-new-month">'
        + '<button type="button" class="btn btn-outline btn-sm" id="btn-rc-add-month"><i data-lucide="plus"></i> Thêm</button></div>'
      : '')
    + '</div>'
    + '<div class="rc-table-wrap table-scroll"><table class="rc-table">'
    + `<thead>${rcHeadHtml(def.fields)}</thead>`
    + `<tbody>${months.map(m => rcRowHtml(ws, m, def.fields, canEdit, canApprove)).join('')}</tbody>`
    + '</table></div>'
    + '<p class="rc-note">Cột <b>Than Hóa + Sấy</b> ghi <b>phút/lần</b> (riêng Ván / Bullig); m³/lần chỉ dùng tự gộp LÔ CŨ trước 28/09/2026.</p>';
  try { initLucide(); } catch (e) { /* không chặn render */ }
}

// ─── MỞ / ĐÓNG — CÔNG TẮC XƯỞNG — THÊM THÁNG ──────────────────
function openRateCenter(ws) {
  rcWs = (ws === 'x1' || ws === 'x2') ? ws : (state.stageWs === 'x1' ? 'x1' : 'x2');
  rcExtraMonths = new Set();
  renderRateCenter();
  const m = document.getElementById('modal-rate-center');
  if (m) m.classList.add('show');
  try { initLucide(); } catch (e) {}
  return true;
}
function closeRateCenter() {
  const m = document.getElementById('modal-rate-center');
  if (m) m.classList.remove('show');
  return true;
}
function setRateCenterWs(ws) {
  const next = ws === 'x1' ? 'x1' : 'x2';
  if (next === rcWs) return false;
  rcWs = next;
  renderRateCenter();
  return true;
}
function rateCenterWs() { return rcWs; }
function rcAddMonth() {
  const el = document.getElementById('rc-new-month');
  const m = String((el && el.value) || '').trim();
  if (!/^\d{4}-\d{2}$/.test(m)) { showToast('Chưa chọn tháng cần thêm!', 'error'); return false; }
  rcExtraMonths.add(m);
  renderRateCenter();
  return true;
}

// ─── LƯU & TRÌNH DUYỆT ───────────────────────────────────────
function rcSaveMonth(ws, month) {
  if (!requireRatePermission()) return false; // CHỈ admin nhập định mức (quy tắc 34)
  const def = RC_WORKSHOPS[ws] || RC_WORKSHOPS.x2;
  const m = String(month || '').trim();
  if (!/^\d{4}-\d{2}$/.test(m)) { showToast('Tháng không hợp lệ!', 'error'); return false; }
  const row = document.querySelector(`#rc-body tr[data-rc-month="${m}"]`);
  if (!row) { showToast('Không tìm thấy dòng tháng để lưu!', 'error'); return false; }
  const values = {};
  for (const f of def.fields) {
    const el = row.querySelector(`[data-rc-field="${f.key}"]`);
    const raw = el ? String(el.value == null ? '' : el.value).trim().replace(',', '.') : '';
    const v = raw === '' ? 0 : Number(raw);
    if (!Number.isFinite(v) || v < 0) {
      showToast(`Định mức "${f.group}${f.sub ? ' · ' + f.sub : ''}" phải là số ≥ 0!`, 'error');
      return false;
    }
    values[f.key] = v;
  }
  def.fields.forEach(f => f.write(m, values[f.key]));
  rcPersistStores(def.fields);

  // Bản ghi phê duyệt: ảnh chụp số VỪA LƯU (để so phát hiện "cần duyệt lại")
  const now = new Date().toISOString();
  const u = state.currentUser || {};
  let rec = rcApprovalOf(ws, m);
  if (!rec) {
    rec = { id: `rc-${ws}-${m}`, ws, month: m, createdAt: now };
    state.rateApprovals = state.rateApprovals || [];
    state.rateApprovals.push(rec);
  }
  rec.status = 'cho_duyet';
  rec.values = rcMonthValues(ws, m);
  rec.submittedBy = rcUserKey(u);
  rec.submittedByName = rcUserName(u);
  rec.submittedAt = now;
  rec.approvedBy = ''; rec.approvedByName = ''; rec.approvedAt = '';
  rec.updatedAt = now;
  saveRateApprovals();

  const stateKeys = ['rateApprovals'];
  const seen = new Set();
  def.fields.forEach(f => {
    const s = RC_STORES[f.storeKey];
    if (s && !seen.has(s.stateKey)) { seen.add(s.stateKey); stateKeys.push(s.stateKey); }
  });
  logDataChange(stateKeys);
  showToast(`Đã lưu & trình duyệt định mức ${rcStateName(ws)} — ${rcMonthLabel(m)}: chờ Ban lãnh đạo duyệt!`, 'success');
  renderRateCenter();
  rcRefreshBoard();
  return true;
}

// ─── DUYỆT / BỎ DUYỆT ────────────────────────────────────────
function rcApproveMonth(ws, month) {
  if (!canApproveRate()) { showToast('Chỉ Quản Trị / Ban Quản Lý duyệt được định mức!', 'error'); return false; }
  const m = String(month || '');
  const st = rcApprovalState(ws, m);
  if (!st.rec || st.code !== 'pending') {
    showToast('Tháng này chưa được trình duyệt (hoặc đã duyệt) — không có gì để duyệt.', 'error');
    return false;
  }
  if (st.stale) {
    showToast('Số định mức đã thay đổi sau khi trình — cần Quản Trị lưu lại trước khi duyệt.', 'error');
    return false;
  }
  const now = new Date().toISOString();
  const u = state.currentUser || {};
  st.rec.status = 'da_duyet';
  st.rec.values = st.values;
  st.rec.approvedBy = rcUserKey(u);
  st.rec.approvedByName = rcUserName(u);
  st.rec.approvedAt = now;
  st.rec.updatedAt = now;
  saveRateApprovals();
  logDataChange(['rateApprovals']);
  showToast(`Đã duyệt định mức ${rcStateName(ws)} — ${rcMonthLabel(m)} (${rcUserName(u)}).`, 'success');
  renderRateCenter();
  return true;
}

function rcRevokeApproval(ws, month) {
  if (!requireRatePermission()) return false;
  const m = String(month || '');
  const rec = rcApprovalOf(ws, m);
  if (!rec || rec.status !== 'da_duyet') { showToast('Tháng này chưa được duyệt.', 'error'); return false; }
  if (typeof confirm === 'function' && !confirm(`Bỏ duyệt định mức ${rcStateName(ws)} — ${rcMonthLabel(m)}? Tháng sẽ trở về "Chờ duyệt".`)) return false;
  rec.status = 'cho_duyet';
  rec.approvedBy = ''; rec.approvedByName = ''; rec.approvedAt = '';
  rec.updatedAt = new Date().toISOString();
  saveRateApprovals();
  logDataChange(['rateApprovals']);
  showToast('Đã bỏ duyệt — tháng trở về Chờ duyệt.', 'info');
  renderRateCenter();
  return true;
}

// ─── UỶ NHIỆM CLICK TRONG MODAL ──────────────────────────────
function onRateCenterClick(e) {
  const t = e && e.target;
  if (!t || !t.closest) return false;
  const wsBtn = t.closest('[data-rc-ws]');
  if (wsBtn) { setRateCenterWs(wsBtn.getAttribute('data-rc-ws')); return true; }
  if (t.closest('#btn-rc-add-month')) { rcAddMonth(); return true; }
  const save = t.closest('[data-rc-save]');
  if (save) { rcSaveMonth(rcWs, save.getAttribute('data-rc-save')); return true; }
  const ap = t.closest('[data-rc-approve]');
  if (ap) { rcApproveMonth(rcWs, ap.getAttribute('data-rc-approve')); return true; }
  const rv = t.closest('[data-rc-revoke]');
  if (rv) { rcRevokeApproval(rcWs, rv.getAttribute('data-rc-revoke')); return true; }
  return false;
}

export {
  RC_WORKSHOPS,
  RC_SAY_DEFAULT,
  loadRateApprovals,
  saveRateApprovals,
  rcMonthsOf,
  rcMonthValues,
  rcApprovalOf,
  rcApprovalState,
  rcSameValues,
  rcPendingCount,
  updateRatePendingBadge,
  openRateCenter,
  closeRateCenter,
  setRateCenterWs,
  rateCenterWs,
  renderRateCenter,
  rcAddMonth,
  rcSaveMonth,
  rcApproveMonth,
  rcRevokeApproval,
  onRateCenterClick,
  // Đơn vị định mức xe/h (Bốc Luồng · Cắt Chọn) — dùng cho kiểm thử
  RC_XE_LEGACY_MAX,
  rcXeRate
};






