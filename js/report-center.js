// ═══════════════════════════════════════════════════════════════
// js/report-center.js — TRUNG TÂM XUẤT EXCEL (1 modal dùng chung)
//   Luồng: chọn TAB → chọn BÁO CÁO → bộ lọc tự sinh → Xem Trước / Xuất .xlsx
//   • Thay cho 6 modal xuất riêng rẽ trước đây.
//   • Mọi số liệu lấy từ hàm hiển thị của từng thẻ (khớp màn hình) và đi qua
//     engine chuẩn hoá của js/export-xlsx.js (ô số = number, TỔNG CỘNG,
//     AutoFilter, ngày giờ theo giờ máy VN).
//   • File .xlsx KHÔNG kèm viền/màu (giới hạn SheetJS CE) — bản In/PDF mới có.
// ═══════════════════════════════════════════════════════════════
import { initLucide } from './cloud.js';
import { state } from './state.js';
import { escapeHTML, formatDateDDMMYY, showToast } from './utils.js';
import { HR_DEPARTMENTS, CI_ANOMALY_LABEL, ciRowsForRange, payLockOf, payLockScan } from './hr.js';
import {
  buildHrXlsxExportData, buildMaterialsExportData, buildPlanningExportData, buildPressExportData,
  buildQcXlsxExportData, buildX2ExportData, exportDataToXlsx, exportMultiSheetToXlsx,
  nowStampVn, openExportPreview, standardizeReportData
} from './export-xlsx.js';
import { REPORT_GROUPS, defaultReportId, groupOfReport, reportById, reportsOfGroup } from './report-specs.js';
import { qcFinalDisplay } from './qc-final.js';
import { qcPressDisplay } from './qc-press.js';
import { computeSupplierRating, supplierStatsOf } from './suppliers.js';
import { rateNanUse, rateUnit, rateCoreProduct } from './planning.js';
import { x2MassBalanceData, x2CostingData } from './x2-phu-pham.js';
import { incidentDisplay } from './x2-incidents.js';

const RC_UI_KEY = 'bamboo_tracker_report_ui_v1'; // THUẦN UI THEO MÁY (không mây/backup)

let rcReportId = '';
let rcValues = {
  periodMode: 'all', periodKey: '',
  year: 'all', week: 'all', product: 'all', worker: 'all',
  dept: 'all', month: '', date: '',
  matLoc: 'all', matType: 'all', matSup: 'all',
  qcProduct: 'all', qcfKind: 'all', verdict: 'all'
};

const pad2 = n => String(n).padStart(2, '0');
function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function isoWeekKey(dateStr) {
  const s = String(dateStr || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return '';
  const d = new Date(`${s}T00:00:00`);
  if (isNaN(d.getTime())) return '';
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dow = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - dow);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const wk = Math.ceil((((t - yearStart) / 86400000) + 1) / 7);
  return `${t.getUTCFullYear()}-W${pad2(wk)}`;
}
function isoWeekMondayISO(key) {
  const m = /^(\d{4})-W(\d{1,2})$/.exec(String(key || ''));
  if (!m) return '';
  const y = Number(m[1]), w = Math.min(53, Math.max(1, Number(m[2])));
  const jan4 = new Date(Date.UTC(y, 0, 4));
  const dow = jan4.getUTCDay() || 7;
  jan4.setUTCDate(jan4.getUTCDate() - dow + 1 + (w - 1) * 7);
  return jan4.toISOString().slice(0, 10);
}
function shiftISO(dateStr, days) {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + Number(days || 0));
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function periodRange(mode, key) {
  if (!mode || mode === 'all') return { from: '', to: '' };
  if (mode === 'day') {
    return /^\d{4}-\d{2}-\d{2}$/.test(key) ? { from: key, to: key } : { from: '', to: '' };
  }
  if (mode === 'week') {
    const mon = isoWeekMondayISO(key);
    return mon ? { from: mon, to: shiftISO(mon, 6) } : { from: '', to: '' };
  }
  if (mode === 'month') {
    if (!/^\d{4}-\d{2}$/.test(key)) return { from: '', to: '' };
    const [y, m] = key.split('-').map(Number);
    const last = new Date(y, m, 0).getDate();
    return { from: `${key}-01`, to: `${key}-${pad2(last)}` };
  }
  if (mode === 'year') {
    return /^\d{4}$/.test(key) ? { from: `${key}-01-01`, to: `${key}-12-31` } : { from: '', to: '' };
  }
  return { from: '', to: '' };
}
function periodLabel(mode, key) {
  if (!mode || mode === 'all') return 'Tất cả thời gian';
  const r = periodRange(mode, key);
  if (!r.from) return 'Tất cả thời gian';
  if (mode === 'day') return `Ngày ${formatDateDDMMYY(r.from)}`;
  if (mode === 'week') return `${key} (${formatDateDDMMYY(r.from)} – ${formatDateDDMMYY(r.to)})`;
  if (mode === 'month') return `Tháng ${key.slice(5)}/${key.slice(0, 4)}`;
  if (mode === 'year') return `Năm ${key}`;
  return 'Tất cả thời gian';
}

// ─── DANH SÁCH LỰA CHỌN CHO BỘ LỌC (đọc sống từ state) ─────────
function rcYears() {
  const set = new Set(['' + new Date().getFullYear()]);
  (state.planningItems || []).forEach(p => { if (p.year) set.add(String(p.year)); });
  (state.pressRecords || []).forEach(r => { if (r.date) set.add(String(r.date).slice(0, 4)); });
  (state.materialRecords || []).forEach(r => { if (r.date) set.add(String(r.date).slice(0, 4)); });
  (state.qcExports || []).forEach(r => { if (r.year) set.add(String(r.year)); });
  return [...set].filter(Boolean).sort((a, b) => Number(a) - Number(b));
}
function rcWeeks() {
  const set = new Set();
  (state.pressRecords || []).forEach(r => { if (r.week) set.add(String(r.week)); });
  (state.planningItems || []).forEach(p => { if (p.week) set.add(String(p.week)); });
  return [...set].sort((a, b) => String(a).localeCompare(String(b), 'vi', { numeric: true }));
}
function rcProducts() {
  return (state.materialRates || []).map(r => ({ v: r.id, l: rateCoreProduct(r) || r.product || r.id }));
}
function rcWorkers() {
  const set = new Set();
  (state.pressRecords || []).forEach(r => {
    String(r.worker || '').split(',').map(s => s.trim()).filter(Boolean).forEach(n => set.add(n));
  });
  return [...set].sort((a, b) => a.localeCompare(b, 'vi'));
}
function rcMatTypes() {
  return [...new Set((state.materialRecords || []).map(r => String(r.type || '').trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'vi'));
}
function rcMatSuppliers() {
  return [...new Set((state.materialRecords || []).map(r => String(r.supplier || '').trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'vi'));
}
function rcQcProducts() {
  const map = new Map();
  (state.qcExports || []).forEach(r => {
    const key = r.productId || `__name__:${r.name || ''}`;
    if (!map.has(key)) {
      const rate = (state.materialRates || []).find(x => x.id === r.productId);
      map.set(key, (rate && rate.product) || r.name || key);
    }
  });
  return [...map.entries()].map(([v, l]) => ({ v, l }));
}
function rcOptList(list, cur, allLabel) {
  return `<option value="all">${escapeHTML(allLabel)}</option>` + list.map(o => {
    const v = typeof o === 'string' ? o : o.v;
    const l = typeof o === 'string' ? o : o.l;
    return `<option value="${escapeHTML(v)}"${String(cur) === String(v) ? ' selected' : ''}>${escapeHTML(l)}</option>`;
  }).join('');
}
function defaultPeriodKeyOf(mode) {
  if (mode === 'week') return isoWeekKey(todayISO());
  if (mode === 'month') return todayISO().slice(0, 7);
  if (mode === 'year') return todayISO().slice(0, 4);
  return todayISO();
}
function rcPeriodModeKey() {
  return rcValues.periodMode && rcValues.periodMode !== 'all'
    ? (rcValues.periodKey || defaultPeriodKeyOf(rcValues.periodMode))
    : '';
}


function periodFieldHtml() {
  const mode = rcValues.periodMode || 'all';
  const key = rcPeriodModeKey();
  const inputType = mode === 'month' ? 'month' : mode === 'year' ? 'number' : 'date';
  const input = mode === 'all' ? '' : `
    <div class="rc-period-nav">
      <button type="button" class="rc-nav-btn" data-rc-shift="-1" title="Kỳ trước">‹</button>
      <input id="rc-f-period-key" type="${inputType}" value="${escapeHTML(key)}"
        ${mode === 'year' ? 'min="2000" max="2100" step="1"' : ''} aria-label="Giá trị kỳ">
      <button type="button" class="rc-nav-btn" data-rc-shift="1" title="Kỳ sau">›</button>
    </div>`;
  return `<div class="form-group rc-filter">
    <label for="rc-f-period-mode">Kỳ</label>
    <div class="rc-period-row">
      <select id="rc-f-period-mode">
        <option value="all"${mode === 'all' ? ' selected' : ''}>Tất cả thời gian</option>
        <option value="day"${mode === 'day' ? ' selected' : ''}>Theo ngày</option>
        <option value="week"${mode === 'week' ? ' selected' : ''}>Theo tuần</option>
        <option value="month"${mode === 'month' ? ' selected' : ''}>Theo tháng</option>
        <option value="year"${mode === 'year' ? ' selected' : ''}>Theo năm</option>
      </select>
      ${input}
    </div>
    <p class="rc-period-label">${escapeHTML(periodLabel(mode, key))}</p>
  </div>`;
}
function filterFieldHtml(k) {
  const v = rcValues;
  if (k === 'period') return periodFieldHtml();
  if (k === 'year') {
    return `<div class="form-group rc-filter"><label for="rc-f-year">Năm</label>
      <select id="rc-f-year">${rcOptList(rcYears(), v.year, 'Tất cả các năm')}</select></div>`;
  }
  if (k === 'week') {
    return `<div class="form-group rc-filter"><label for="rc-f-week">Tuần</label>
      <select id="rc-f-week">${rcOptList(rcWeeks(), v.week, 'Tất cả các tuần')}</select></div>`;
  }
  if (k === 'product' || k === 'planProduct') {
    return `<div class="form-group rc-filter"><label for="rc-f-product">Sản phẩm</label>
      <select id="rc-f-product">${rcOptList(rcProducts(), v.product, 'Tất cả sản phẩm')}</select></div>`;
  }
  if (k === 'worker') {
    return `<div class="form-group rc-filter"><label for="rc-f-worker">Công nhân</label>
      <select id="rc-f-worker">${rcOptList(rcWorkers(), v.worker, 'Tất cả công nhân')}</select></div>`;
  }
  if (k === 'dept') {
    return `<div class="form-group rc-filter"><label for="rc-f-dept">Bộ phận</label>
      <select id="rc-f-dept">${rcOptList(HR_DEPARTMENTS, v.dept, 'Tất cả bộ phận')}</select></div>`;
  }
  if (k === 'month') {
    return `<div class="form-group rc-filter"><label for="rc-f-month">Tháng</label>
      <input id="rc-f-month" type="month" value="${escapeHTML(v.month || todayISO().slice(0, 7))}"></div>`;
  }
  if (k === 'date') {
    return `<div class="form-group rc-filter"><label for="rc-f-date">Ngày</label>
      <input id="rc-f-date" type="date" value="${escapeHTML(v.date || todayISO())}"></div>`;
  }
  if (k === 'matLoc') {
    return `<div class="form-group rc-filter"><label for="rc-f-matLoc">Vị trí nhập</label>
      <select id="rc-f-matLoc">${rcOptList([{ v: 'lo-hoi', l: 'Lò hơi' }, { v: 'xuong-1', l: 'Xưởng 1' }, { v: 'xuong-2', l: 'Xưởng 2' }], v.matLoc, 'Tất cả vị trí')}</select></div>`;
  }
  if (k === 'matType') {
    return `<div class="form-group rc-filter"><label for="rc-f-matType">Loại nguyên liệu</label>
      <select id="rc-f-matType">${rcOptList(rcMatTypes(), v.matType, 'Tất cả loại')}</select></div>`;
  }
  if (k === 'matSup') {
    return `<div class="form-group rc-filter"><label for="rc-f-matSup">Nhà cung cấp</label>
      <select id="rc-f-matSup">${rcOptList(rcMatSuppliers(), v.matSup, 'Tất cả NCC')}</select></div>`;
  }
  if (k === 'qcProduct') {
    return `<div class="form-group rc-filter"><label for="rc-f-qcProduct">Thành phẩm</label>
      <select id="rc-f-qcProduct">${rcOptList(rcQcProducts(), v.qcProduct, 'Tất cả thành phẩm')}</select></div>`;
  }
  if (k === 'qcfKind') {
    return `<div class="form-group rc-filter"><label for="rc-f-qcfKind">Loại kiểm</label>
      <select id="rc-f-qcfKind">${rcOptList([{ v: 'van', l: 'Kiểm Ván (tấm)' }, { v: 'thanh', l: 'Kiểm Thanh (thanh)' }], v.qcfKind, 'Tất cả loại kiểm')}</select></div>`;
  }
  if (k === 'verdict') {
    return `<div class="form-group rc-filter"><label for="rc-f-verdict">Kết quả QC</label>
      <select id="rc-f-verdict">${rcOptList([{ v: 'pass', l: 'PASS' }, { v: 'fail', l: 'Fail' }, { v: 'unchecked', l: 'Chưa kiểm' }], v.verdict, 'Tất cả')}</select></div>`;
  }
  return '';
}
function filtersHtml(spec) {
  if (!spec.filters || !spec.filters.length) {
    return '<p class="rc-note">Báo cáo này xuất toàn bộ dữ liệu (không có bộ lọc).</p>';
  }
  return `<div class="rc-filter-grid">${spec.filters.map(filterFieldHtml).join('')}</div>`;
}


// ─── NHỚ LỰA CHỌN THEO MÁY (thuần UI — KHÔNG mây/backup) ───────
function loadReportUi() {
  try {
    const raw = localStorage.getItem(RC_UI_KEY);
    if (!raw) return;
    const ui = JSON.parse(raw) || {};
    if (ui.lastReport && reportById(ui.lastReport)) rcReportId = ui.lastReport;
    if (ui.values && typeof ui.values === 'object') rcValues = Object.assign(rcValues, ui.values);
  } catch (e) { /* dữ liệu lỗi → dùng mặc định */ }
}
function saveReportUi() {
  try {
    localStorage.setItem(RC_UI_KEY, JSON.stringify({ lastReport: rcReportId, values: rcValues }));
  } catch (e) { /* localStorage đầy/bị chặn → bỏ qua */ }
}

// ─── MỞ / ĐÓNG / VẼ MODAL ───────────────────────────────────────
function openReportCenter(reportId) {
  loadReportUi();
  const wanted = reportById(reportId) ? reportId
    : (reportById(rcReportId) ? rcReportId : defaultReportId());
  rcReportId = wanted;
  renderReportCenter();
  const overlay = document.getElementById('modal-report-center');
  if (overlay) overlay.classList.add('show');
  initLucide();
  saveReportUi();
}
function closeReportCenter() {
  const overlay = document.getElementById('modal-report-center');
  if (overlay) overlay.classList.remove('show');
  saveReportUi();
}
function renderReportCenter() {
  const spec = reportById(rcReportId) || reportById(defaultReportId());
  rcReportId = spec.id;
  const gid = spec.group;
  const tabsEl = document.getElementById('report-center-tabs');
  if (tabsEl) {
    tabsEl.innerHTML = REPORT_GROUPS.map(g => {
      const n = reportsOfGroup(g.id).length;
      return `<button type="button" class="rc-tab${g.id === gid ? ' is-on' : ''}" data-rc-group="${g.id}"
        title="${escapeHTML(g.label)} — ${n} báo cáo">${escapeHTML(g.short)}</button>`;
    }).join('');
  }
  const listEl = document.getElementById('report-center-list');
  if (listEl) {
    listEl.innerHTML = reportsOfGroup(gid).map(r =>
      `<button type="button" class="rc-chip${r.id === rcReportId ? ' is-on' : ''}" data-rc-report="${r.id}">
        ${escapeHTML(r.label)}</button>`).join('');
  }
  const fEl = document.getElementById('report-center-filters');
  if (fEl) fEl.innerHTML = filtersHtml(spec);
  const hint = document.getElementById('report-center-hint');
  if (hint) {
    hint.textContent = 'File .xlsx có AutoFilter + dòng TỔNG CỘNG (số tính được). '
      + 'Thư viện miễn phí KHÔNG ghi được viền/màu — cần bản có khung để in/ký thì bấm "Xem Trước" rồi "In / Lưu PDF".';
  }
  const sub = document.getElementById('report-center-subtitle');
  if (sub) sub.textContent = `${spec.label} · ${groupOfReport(spec.id)?.label || ''}`;
  initLucide();
}
function syncReportValuesFromDom() {
  const val = id => {
    const el = document.getElementById(id);
    return el ? el.value : null;
  };
  const mode = val('rc-f-period-mode');
  if (mode != null) {
    if (mode !== rcValues.periodMode) {
      rcValues.periodMode = mode;
      rcValues.periodKey = mode === 'all' ? '' : defaultPeriodKeyOf(mode);
    }
  }
  const pkey = val('rc-f-period-key');
  if (pkey != null) rcValues.periodKey = pkey;
  ['year', 'week', 'product', 'worker', 'dept', 'month', 'date', 'matLoc', 'matType', 'matSup', 'qcProduct', 'qcfKind', 'verdict']
    .forEach(k => { const v = val('rc-f-' + k); if (v != null) rcValues[k] = v; });
}
function shiftReportPeriod(delta) {
  const mode = rcValues.periodMode || 'all';
  if (mode === 'all') return;
  let key = rcValues.periodKey || defaultPeriodKeyOf(mode);
  if (mode === 'day') key = shiftISO(key, delta);
  else if (mode === 'week') {
    const mon = isoWeekMondayISO(key) || shiftISO(todayISO(), -7);
    key = isoWeekKey(shiftISO(mon, delta * 7));
  } else if (mode === 'month') {
    const [y, m] = (key || todayISO().slice(0, 7)).split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    key = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
  } else if (mode === 'year') {
    key = String(Number(key || new Date().getFullYear()) + delta);
  }
  rcValues.periodKey = key;
  saveReportUi();
  renderReportCenter();
}


// ─── DỰNG DỮ LIỆU CÁC BÁO CÁO "TỰ VIẾT" (kind) ─────────────────
function rcFrame(title, filterLabel, header, rows, meta) {
  const aoa = [[title], [`Ngày xuất: ${nowStampVn()}`], [filterLabel], [], header, ...rows];
  const nCol = Math.max(1, header.length);
  const merges = [0, 1, 2].map(r => ({ s: { r, c: 0 }, e: { r, c: nCol - 1 } }));
  return standardizeReportData({
    title,
    countLabel: `${rows.length} dòng`,
    aoa, merges,
    cols: header.map((h, i) => ({ wch: i === 0 ? 6 : Math.max(10, Math.min(30, String(h).length + 6)) })),
    rowH: 20,
    sheetName: String(meta.sheet || title).slice(0, 28),
    filename: `${meta.file || 'BaoCao'}_${todayISO()}.xlsx`
  });
}

function buildPlanRatesReport(spec) {
  const rates = [...(state.materialRates || [])];
  if (!rates.length) { showToast('Chưa có định mức nguyên vật liệu nào!', 'error'); return null; }
  const header = ['Stt', 'Sản Phẩm', 'Sử Dụng Nan', 'ĐVT', 'Mã SP', 'Tên Đầy Đủ', 'Loại Ép',
    'Loại Nan 1', 'Số Lượng Nan 1', 'Loại Nan 2', 'Số Lượng Nan 2', 'Loại Nan 3', 'Số Lượng Nan 3',
    'Keo (kg)', 'Phụ Gia (kg)', 'Hiệu Suất (%)'];
  const rows = rates.map((r, i) => [
    i + 1, rateCoreProduct(r) || r.product || '', rateNanUse(r), rateUnit(r),
    r.productCode || '', r.fullName || '', r.pressType || '',
    r.nan1 || '', Number(r.nan1Qty) || 0, r.nan2 || '', Number(r.nan2Qty) || 0,
    r.nan3 || '', Number(r.nan3Qty) || 0,
    Number(r.glue) || 0, Number(r.additive) || 0, r.efficiency == null ? '' : Number(r.efficiency)
  ]);
  return rcFrame('ĐỊNH MỨC NGUYÊN VẬT LIỆU', 'Toàn bộ định mức đang dùng', header, rows,
    { sheet: 'Định Mức NVL', file: spec.code });
}

function buildPlanHistoryReport(spec) {
  const { from, to } = currentPeriodRange();
  const groups = new Map();
  (state.planningItems || []).forEach(p => {
    const wk = String(p.week || '');
    const mon = isoWeekMondayISO(wk);
    if (from && (!mon || mon < from)) return;
    if (to && (!mon || mon > to)) return;
    const key = `${p.year || ''}|${wk}`;
    const g = groups.get(key) || { year: p.year || '', week: wk, mon: mon || '', count: 0, qty: 0, vol: 0, products: [] };
    g.count += 1;
    g.qty += Number(p.qty) || 0;
    g.vol += planningItemVolumeOf(p);
    const rate = (state.materialRates || []).find(r => r.id === p.productId);
    const nm = (rate && rate.product) || p.productName || p.productId || '';
    if (nm && !g.products.includes(nm)) g.products.push(nm);
    groups.set(key, g);
  });
  const list = [...groups.values()].sort((a, b) =>
    String(a.mon || `${a.year}`).localeCompare(String(b.mon || `${b.year}`)) ||
    String(a.week).localeCompare(String(b.week), 'vi', { numeric: true }));
  if (!list.length) { showToast('Không có kế hoạch nào trong kỳ đã chọn!', 'error'); return null; }
  const header = ['Stt', 'Tuần', 'Năm', 'Ngày Bắt Đầu Tuần', 'Số Sản Phẩm', 'Tổng Số Lượng', 'Tổng Thể Tích (m³)', 'Sản Phẩm'];
  const rows = list.map((g, i) => [
    i + 1, g.week, g.year, g.mon ? formatDateDDMMYY(g.mon) : '',
    g.count, g.qty, Math.round(g.vol * 10000) / 10000, g.products.join(', ')
  ]);
  return rcFrame('SỔ KẾ HOẠCH SẢN XUẤT THEO TUẦN',
    `Kỳ: ${periodLabel(rcValues.periodMode, rcValues.periodKey)}`, header, rows,
    { sheet: 'Sổ Kế Hoạch Tuần', file: spec.code });
}
function planningItemVolumeOf(p) {
  const rate = (state.materialRates || []).find(r => r.id === p.productId);
  const nums = String((rate && rate.product) || '').replace(/×/g, 'x').match(/\d+(?:[.,]\d+)?/g) || [];
  if (nums.length < 3) return 0;
  const dims = nums.slice(0, 3).map(x => Number(String(x).replace(',', '.')) || 0);
  const vol1 = (dims[0] * dims[1] * dims[2]) / 1e9;
  return vol1 * (Number(p.qty) || 0);
}
function currentPeriodRange() {
  return periodRange(rcValues.periodMode || 'all', rcValues.periodKey || '');
}




function buildSuppliersReport(spec) {
  const list = [...(state.suppliers || [])];
  if (!list.length) { showToast('Chưa khai báo nhà cung cấp nào!', 'error'); return null; }
  const header = ['Stt', 'Tên Nhà Cung', 'Mã Số', 'Tổng KL (kg)', 'Số Chuyến', 'Trung Bình (kg/chuyến)',
    'Tỷ Lệ Đạt (%)', 'Số Lần Nhắc Nhở', 'Đánh Giá (sao)', 'Loại Nguyên Liệu', 'Ghi Chú'];
  const rows = list.map((s, i) => {
    const st = supplierStatsOf(s.name || '');
    const rating = computeSupplierRating(st);
    const typesTxt = (st.types || []).map(t => `${t.name} (${Math.round(t.weight)}kg)`).join(' · ');
    return [i + 1, s.name || '', s.code || '', st.totalWeight, st.tripCount, st.avg,
      st.tyLe == null ? '' : Math.round(st.tyLe * 10) / 10, st.nhac, rating.score, typesTxt, s.note || ''];
  });
  return rcFrame('BẢNG THÔNG TIN NHÀ CUNG', 'Toàn bộ nhà cung cấp', header, rows,
    { sheet: 'Nhà Cung Cấp', file: spec.code });
}

function buildQcFinalReport(spec) {
  const { from, to } = currentPeriodRange();
  const kind = rcValues.qcfKind || 'all';
  const list = (state.qcFinalRecords || []).map(r => qcFinalDisplay(r))
    .filter(d => (!from || d.date >= from) && (!to || d.date <= to) && (kind === 'all' || d.kind === kind));
  if (!list.length) { showToast('Không có lượt kiểm nào trong kỳ đã chọn!', 'error'); return null; }
  list.sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const header = ['Stt', 'Ngày', 'Vị Trí', 'Loại Kiểm', 'Sản Phẩm / Cỡ', 'Đầu Vào Kiểm',
    'Đạt', 'Ngoại Lệ', 'Loại (lỗi)', 'Tổng Kiểm', 'Tổng Đạt', 'Tỉ Lệ Lỗi (%)',
    'Người Kiểm', 'Giờ HC', 'Giờ TC', 'Công Suất', 'Định Mức', 'Hiệu Suất (%)'];
  const rows = list.map((d, i) => [
    i + 1, formatDateDDMMYY(d.date), d.workshopLabel, d.kindLabel,
    d.productName || d.sizeKey || '', d.inputQty, d.qtyOk, d.qtyExcept, d.qtyReject,
    d.qtyChecked, d.qtyPass, d.errPct == null ? '' : Math.round(d.errPct * 10) / 10,
    d.workerNames || '', d.workHoursHC == null ? '' : d.workHoursHC,
    d.workHoursTC == null ? '' : d.workHoursTC,
    d.cap == null ? '' : Math.round(d.cap * 10) / 10,
    d.rate == null ? '' : d.rate, d.eff == null ? '' : Math.round(d.eff * 10) / 10
  ]);
  const kindLabel = kind === 'all' ? 'Tất cả loại kiểm' : (kind === 'thanh' ? 'Kiểm Thanh' : 'Kiểm Ván');
  return rcFrame('QC — KIỂM SAU SẢN XUẤT',
    `Kỳ: ${periodLabel(rcValues.periodMode, rcValues.periodKey)} · ${kindLabel}`, header, rows,
    { sheet: 'Kiểm Sau SX', file: spec.code });
}

function buildQcPressReport(spec) {
  const { from, to } = currentPeriodRange();
  const verdict = rcValues.verdict || 'all';
  const list = (state.pressRecords || []).map(r => qcPressDisplay(r))
    .filter(d => (!from || d.date >= from) && (!to || d.date <= to))
    .filter(d => verdict === 'all' || (verdict === 'unchecked' ? !d.verdict : d.verdict === verdict));
  if (!list.length) { showToast('Không có lượt ép nào trong kỳ đã chọn!', 'error'); return null; }
  list.sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const header = ['Stt', 'Ngày', 'Tên Ván / Thanh', 'Số Lượng', 'Lực Ép Ngang (MPa)', 'Lực Ép Đứng (MPa)',
    'Nhiệt Độ (°C)', 'Thời Gian Ép (phút)', 'Tên Keo', 'Keo (g)', 'Phụ Gia', 'Phụ Gia (g)',
    'Tỷ Lệ Keo - Phụ Gia', 'Độ Phủ (g/đơn vị)', 'Kết Quả QC'];
  const rows = list.map((d, i) => [
    i + 1, formatDateDDMMYY(d.date), d.name || '', d.qty || 0, d.forceHText || d.forceH || '', d.forceVText || d.forceV || '',
    d.tempC || '', d.pressMin || '', d.glueName || '', d.glueG || 0,
    d.additiveName || '', d.additiveG || 0, d.mixText || '',
    d.coverage == null ? '' : Math.round(d.coverage * 100) / 100,
    d.verdict === 'pass' ? 'PASS' : d.verdict === 'fail' ? 'Fail' : 'Chưa kiểm'
  ]);
  const vLabel = verdict === 'all' ? 'Tất cả' : verdict === 'pass' ? 'PASS' : verdict === 'fail' ? 'Fail' : 'Chưa kiểm';
  return rcFrame('QC — NHẬT KÝ THEO DÕI ÉP VÁN',
    `Kỳ: ${periodLabel(rcValues.periodMode, rcValues.periodKey)} · Kết quả: ${vLabel}`, header, rows,
    { sheet: 'Nhật Ký Ép Ván', file: spec.code });
}
// ─── BÁO CÁO SỰ CỐ SẢN XUẤT (tab Công Đoạn SX — js/x2-incidents.js) ──
// Cột Số giờ là SỐ → tự cộng dòng TỔNG CỘNG. Phiếu ĐÃ DUYỆT chính là giờ sự cố
// đang trừ vào công suất/hiệu suất của công đoạn tương ứng.
function buildIncidentsReport(spec) {
  const { from, to } = currentPeriodRange();
  const list = (state.x2IncidentReports || []).map(incidentDisplay)
    .filter(d => (!from || d.date >= from) && (!to || d.date <= to))
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
  if (!list.length) { showToast('Không có phiếu sự cố nào trong kỳ đã chọn!', 'error'); return null; }
  const header = ['Stt', 'Ngày', 'Công đoạn', 'Ca', 'Giờ bắt đầu', 'Giờ kết thúc', 'Số giờ',
    'Loại sự cố', 'Mô tả / Nguyên nhân', 'Biện pháp xử lý', 'Người báo',
    'Trạng thái', 'Người duyệt', 'Thời điểm duyệt', 'Lý do từ chối', 'Ghi chú'];
  const rows = list.map((d, i) => [
    i + 1, formatDateDDMMYY(d.date), d.stageLabel, d.shiftLabel,
    d.startTime || '', d.endTime || '', d.hours,
    d.causeLabel, d.description || '', d.fixAction || '', d.reporterName || '',
    d.statusLabel, d.approvedBy || '', d.approvedAt || '', d.rejectReason || '', d.note || ''
  ]);
  const ap = list.filter(d => d.status === 'da_duyet');
  const pe = list.filter(d => d.status === 'cho_duyet');
  const apH = Math.round(ap.reduce((s, d) => s + d.hours, 0) * 100) / 100;
  const peH = Math.round(pe.reduce((s, d) => s + d.hours, 0) * 100) / 100;
  return rcFrame('BÁO CÁO SỰ CỐ SẢN XUẤT',
    `Kỳ: ${periodLabel(rcValues.periodMode, rcValues.periodKey)}`
    + ` · ${list.length} phiếu · Đã duyệt ${apH}h (${ap.length} phiếu)`
    + ` · Chờ duyệt ${peH}h (${pe.length} phiếu)`,
    header, rows, { sheet: 'Sự Cố SX', file: spec.code });
}
// ─── CHỌN BÁO CÁO ĐỂ DỰNG DỮ LIỆU ──────────────────────────────
function buildReportData() {
  const spec = reportById(rcReportId);
  if (!spec) return null;
  const f = rcValues;
  const { from, to } = currentPeriodRange();
  if (spec.source) {
    // Ép Ván: dùng form xuất chuyên sâu (lọc theo Năm/Tuần) thay vì nguồn X2 thường
    if (spec.source === 'epvan') {
      const y = f.periodMode === 'year' ? f.periodKey : 'all';
      const w = f.periodMode === 'week' ? f.periodKey : 'all';
      return buildPressExportData({ year: y, week: w, product: 'all', worker: 'all', from, to });
    }
    return buildX2ExportData(spec.source, { from, to });
  }
  if (spec.builder === 'planning') {
    return buildPlanningExportData({ year: f.year, week: f.week, product: f.product });
  }
  if (spec.builder === 'materials') {
    return buildMaterialsExportData({ location: f.matLoc, type: f.matType, supplier: f.matSup, from, to });
  }
  if (spec.builder === 'qc') {
    return buildQcXlsxExportData({ year: f.year, week: f.week, product: f.qcProduct });
  }
  if (spec.builder === 'hr') {
    return buildHrXlsxExportData({ card: spec.id, dept: f.dept, month: f.month, date: f.date });
  }
  if (spec.kind === 'planRates') return buildPlanRatesReport(spec);
  if (spec.kind === 'planHistory') return buildPlanHistoryReport(spec);
  if (spec.kind === 'suppliers') return buildSuppliersReport(spec);
  if (spec.kind === 'qcFinal') return buildQcFinalReport(spec);
  if (spec.kind === 'qcPress') return buildQcPressReport(spec);
  if (spec.kind === 'massBalance') return buildMassBalanceReport(spec);
  if (spec.kind === 'costing') return buildCostingReport(spec);
  if (spec.kind === 'incidents') return buildIncidentsReport(spec);
  if (spec.kind === 'ciCompare') return buildCiCompareReport(spec);
  if (spec.kind === 'payLock') return buildPayLockReport(spec);
  if (spec.kind === 'paySummary') return buildPaySummaryReport(spec);
  if (spec.kind === 'paySlip') return buildPaySlipReport(spec);
  return null;
}

// ─── ĐỐI CHIẾU BỐ TRÍ ↔ MÁY CHẤM CÔNG (báo cáo Nhân Sự) ─────────
// Số liệu lấy từ engine js/hr.js (ciRowsForRange) → khớp đúng màn hình thẻ
// "Giờ Máy Chấm Công — Đối Chiếu": cùng quy tắc chấm sớm 30' / TC khối 30'.
function buildCiCompareReport(spec) {
  const { from, to } = currentPeriodRange();
  const rows = ciRowsForRange(from || '', to || '', { dept: rcValues.dept || 'all', includeLeave: true });
  if (!rows.length) { showToast('Không có dữ liệu đối chiếu trong kỳ!', 'error'); return null; }
  const h = m => (m == null ? '' : Math.round((m / 60) * 100) / 100);
  const header = ['Stt', 'Bộ Phận', 'Mã NV', 'Họ Tên', 'Ngày', 'Bố Trí (giờ)', 'Giờ Máy (vào–ra)',
    'HC Máy (h)', 'TC Máy (h)', 'Đi Muộn (phút)', 'Về Sớm (phút)', 'TC Đơn (h)', 'Lệch TC (h)',
    'Đơn Từ (nghỉ · tăng ca)', 'Kết Luận', '⚠ Bất Thường', 'Đã Xác Nhận'];
  const body = rows.map((r, i) => {
    const planTxt = r.plan.hasPlan
      ? r.plan.assignments.map(a => `${hrPosText(a.positionId)} ${a.start}${a.end ? '–' + a.end : '→hết ca'}`).join('; ')
      : '';
    const otTxt = [
      r.leave ? r.leave.label : '',
      r.ot.approvedMin ? `TC đơn ${h(r.ot.approvedMin)}h` : '',
      r.ot.pending.length ? 'Đơn TC chờ duyệt' : ''
    ].filter(Boolean).join(' · ');
    return [
      i + 1, r.dept || '', r.empCode || '', r.employeeName, r.date, planTxt, r.timeText || '',
      h(r.actual.hc), h(r.actual.tc), r.actual.lateMin || 0, r.actual.earlyOutMin || 0,
      r.ot.approvedMin ? h(r.ot.approvedMin) : '',
      (r.ot.approvedMin || r.actual.tc) ? h(r.otDelta) : '',
      otTxt,
      (CI_VERDICT_LABEL[r.verdict] || r.verdict),
      (r.anomalies || []).map(k => CI_ANOMALY_LABEL[k] || k).join(' · '),
      r.ack ? ('Đã xác nhận' + (r.ack.by ? ' — ' + r.ack.by : '')) : ''
    ];
  });
  return rcFrame('ĐỐI CHIẾU BỐ TRÍ ↔ MÁY CHẤM CÔNG',
    `Kỳ: ${from || '…'} → ${to || '…'} · ${rows.length} dòng · quy tắc: chấm sớm < 30' tính từ giờ bắt đầu ca · tăng ca sau hết ca làm tròn XUỐNG 30 phút`,
    header, body, { sheet: 'Đối Chiếu CC', file: spec.code });
}
// ─── CHỐT CÔNG / PHIẾU CÔNG (20/10/2026) ──────────────────────────
function rcPayMonthOf() {
  if (rcValues.periodMode === 'month' && /^\d{4}-\d{2}$/.test(rcValues.periodKey || '')) return rcValues.periodKey;
  if (/^\d{4}-\d{2}$/.test(rcValues.month || '')) return rcValues.month;
  return todayISO().slice(0, 7);
}
function rcMonthText(m) { return `Tháng ${String(m).slice(5, 7)}/${String(m).slice(0, 4)}`; }
function rcPaySource() {
  const month = rcPayMonthOf();
  const lock = payLockOf(month);
  const scan = payLockScan(month);
  const useLock = !!(lock && Array.isArray(lock.rows) && lock.rows.length && (lock.status === 'da_chot' || lock.status === 'cho_duyet'));
  return {
    month, lock,
    rows: useLock ? lock.rows.slice() : scan.rows,
    totals: (useLock && Array.isArray(lock.totals) && lock.totals.length) ? lock.totals : scan.totals,
    fromLock: useLock
  };
}
function rcPayLockStateText(lock) {
  if (!lock) return 'CHƯA CHỐT';
  if (lock.status === 'da_chot') return `ĐÃ CHỐT bởi ${lock.approvedByName || '—'}${lock.approvedAt ? ' lúc ' + String(lock.approvedAt).slice(0, 16).replace('T', ' ') : ''}`;
  if (lock.status === 'cho_duyet') return `CHỜ DUYỆT · trình bởi ${lock.preparedByName || '—'}`;
  return 'ĐÃ MỞ KHÓA — cần chốt lại';
}
function buildPayLockReport(spec) {
  const { month, lock, rows, fromLock } = rcPaySource();
  if (!rows.length) { showToast('Chưa có dữ liệu công trong kỳ!', 'error'); return null; }
  const h = m => Math.round(((Number(m) || 0) / 60) * 100) / 100;
  const ATT = { work: 'Đi làm', leave: 'Nghỉ có phép', absent: 'Vắng' };
  const header = ['Stt', 'Bộ Phận', 'Mã NV', 'Họ Tên', 'Ngày', 'HC (h)', 'TC (h)',
    'TC Đơn (h)', 'TC Ghi Nhận (h)', 'TC Hủy (h)', 'Chấm Tay', 'Ghi Chú'];
  const sorted = rows.slice().sort((a, b) => String(a.dept).localeCompare(String(b.dept), 'vi')
    || String(a.employeeName).localeCompare(String(b.employeeName), 'vi') || String(a.date).localeCompare(String(b.date)));
  const body = sorted.map((r, i) => [
    i + 1, r.dept || '', r.empCode || '', r.employeeName, r.date,
    h(r.hc), h(r.tc), h(r.otApprovedMin), h(r.otAcceptedMin), h(r.otRejectedMin),
    ATT[r.attStatus] || '', r.note || ''
  ]);
  const sub = `${rcMonthText(month)} · ${rows.length} dòng · ${fromLock ? 'SỐ CỦA BẢN ĐÃ LƯU' : 'SỐ HIỆN TẠI (chưa chốt)'}`
    + ` · ${rcPayLockStateText(lock)}` + (lock && lock.hash ? ` · băm ${String(lock.hash).slice(0, 12)}` : '');
  return rcFrame('BẢNG CHỐT CÔNG THEO THÁNG', sub, header, body, { sheet: 'ChotCong', file: spec.code });
}
function buildPaySummaryReport(spec) {
  const { month, lock, totals, fromLock } = rcPaySource();
  if (!totals.length) { showToast('Chưa có dữ liệu công trong kỳ!', 'error'); return null; }
  const h = m => Math.round(((Number(m) || 0) / 60) * 100) / 100;
  const signed = new Set(((lock && lock.paperSigned) || []).map(x => x && x.employeeId));
  const header = ['Stt', 'Bộ Phận', 'Mã NV', 'Họ Tên', 'Ngày Công', 'Giờ HC (h)', 'Giờ TC (h)',
    'TC Ghi Nhận (h)', 'TC Hủy (h)', 'Phiếu Giấy', 'Trạng Thái Kỳ'];
  const body = totals.slice().sort((a, b) => String(a.dept).localeCompare(String(b.dept), 'vi')
    || String(a.employeeName).localeCompare(String(b.employeeName), 'vi'))
    .map((t, i) => [i + 1, t.dept || '', t.empCode || '', t.employeeName, t.days,
      h(t.hcMin), h(t.tcMin), h(t.otMin), h(t.otRejectedMin || 0),
      signed.has(t.employeeId) ? 'Đã thu' : 'Chưa thu', lock ? (lock.status === 'da_chot' ? 'Đã chốt' : 'Chờ duyệt') : 'Chưa chốt']);
  const sub = `${rcMonthText(month)} · ${totals.length} nhân viên · ${fromLock ? 'SỐ CỦA BẢN ĐÃ LƯU' : 'SỐ HIỆN TẠI (chưa chốt)'}`
    + ` · ${rcPayLockStateText(lock)}`;
  return rcFrame('TỔNG HỢP CÔNG THEO NHÂN VIÊN', sub, header, body, { sheet: 'TongHopCong', file: spec.code });
}
function buildPaySlipReport(spec) {
  const { month, lock, rows } = rcPaySource();
  if (!rows.length) { showToast('Chưa có dữ liệu công trong kỳ!', 'error'); return null; }
  const h = m => Math.round(((Number(m) || 0) / 60) * 100) / 100;
  const header = ['Bộ Phận', 'Mã NV', 'Họ Tên', 'Ngày', 'Thứ', 'Giờ HC (h)', 'Giờ TC (h)', 'TC Ghi Nhận (h)', 'Ghi Chú'];
  const DOW = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  const dowOf = d => { try { return DOW[new Date(d + 'T00:00:00').getDay()] || ''; } catch (e) { return ''; } };
  const body = rows.slice().sort((a, b) => String(a.employeeName).localeCompare(String(b.employeeName), 'vi')
    || String(a.date).localeCompare(String(b.date)))
    .map(r => [r.dept || '', r.empCode || '', r.employeeName, r.date, dowOf(r.date),
      h(r.hc), h(r.tc), h(r.otAcceptedMin), (r.otRejectedMin ? `Hủy TC ${h(r.otRejectedMin)}h` : (r.note || ''))]);
  const sub = `${rcMonthText(month)} · ${rows.length} dòng · ${rcPayLockStateText(lock)}`
    + ` · quy tắc: vào làm tròn LÊN 30' · ra làm tròn XUỐNG 30' · nghỉ giữa ca · ngày nghỉ = TC`
    + (lock && lock.disputeUntil ? ` · hạn khiếu nại ${lock.disputeUntil}` : '');
  return rcFrame('PHIẾU CÔNG CÁ NHÂN (IN KÝ)', sub, header, body, { sheet: 'PhieuCong', file: spec.code });
}
// Nhãn kết luận (khai báo tại chỗ để report-center không phải import thêm)
const CI_VERDICT_LABEL = {
  ok: 'Khớp', late: 'Đi muộn', early: 'Về sớm', no_out: 'Thiếu giờ ra',
  no_in: 'Thiếu giờ vào', night_out: 'Giờ ra ca đêm hôm trước',
  no_punch: 'Không quẹt máy', no_plan: 'Máy có quẹt, chưa bố trí',
  leave_ok: 'Nghỉ có phép', leave_punch: 'Nghỉ có phép nhưng có quẹt máy',
  leave_hours: 'Nghỉ theo giờ — lệch giờ làm', absent_punch: 'Chấm tay "Vắng"',
  unmarked: 'Chưa chấm tay'
};
function hrPosText(pid) {
  const p = (state.hrPositions || []).find(x => x.id === pid);
  return p ? p.name : 'Vị trí';
}

// ─── BÁO CÁO CÂN ĐỐI KHỐI LƯỢNG (Giai đoạn 3 — thẻ Phụ Phẩm) ───
function buildMassBalanceReport(spec) {
  const { from, to } = currentPeriodRange();
  const b = x2MassBalanceData(from, to);
  const header = ['Stt', 'Chặng', 'Vào (kg)', 'Ra (kg)', 'Hao hụt (kg)', 'Ghi chú'];
  const rows = [
    [1, 'Nhập bãi — Luồng cây', b.intakeCay, '', '', 'phiếu cân mới trong kỳ'],
    [2, 'Nhập bãi — Luồng ống', b.intakeOng, '', '', 'phiếu cân mới trong kỳ'],
    [3, 'Bốc Luồng', b.boc.in, b.boc.out, b.boc.loss, 'Ra = KL lên xe · Hao hụt = ngọn + mất nước (ước tính)'],
    [4, 'Cắt xe luồng cây', b.cart.in, b.cart.dat + b.cart.loi + b.cart.mat, b.cart.loss,
      `Đạt ${b.cart.dat} · Lỗi ${b.cart.loi} · Mắt ${b.cart.mat}`],
    [5, 'Cắt luồng ống', b.ong.in, b.ong.dat + b.ong.loi, b.ong.loss, `Đạt ${b.ong.dat} · Lỗi ${b.ong.loi}`],
    [6, 'Bổ Ống', b.bo.in, b.bo.dat, b.bo.loi, 'Ra = ống bổ đạt · Hao hụt = ống loại'],
    [7, 'Tỷ lệ Cắt xe — ống đạt (%)', b.yields.cart.ongDat == null ? '' : Math.round(b.yields.cart.ongDat * 10) / 10, '', '', `ĐM ${(b.yields.cart.target || {}).ongDat}%`],
    [8, 'Tỷ lệ Cắt xe — mắt luồng (%)', b.yields.cart.mat == null ? '' : Math.round(b.yields.cart.mat * 10) / 10, '', '', `ĐM ${(b.yields.cart.target || {}).mat}%`],
    [9, 'Tỷ lệ Cắt ống — ống lỗi (%)', b.yields.ong.ongLoi == null ? '' : Math.round(b.yields.ong.ongLoi * 10) / 10, '', '', `ĐM ${(b.yields.ong.target || {}).ongLoi}%`]
  ];
  return rcFrame('CÂN ĐỐI KHỐI LƯỢNG XƯỞNG 2',
    `Kỳ: ${from || '…'} → ${to || '…'} · số kg là số ĐO/ƯỚC TÍNH trong kỳ`,
    header, rows, { sheet: 'Cân Đối KL', file: spec.code });
}

// ─── BÁO CÁO GIÁ THÀNH 1 KG ỐNG ĐẠT (Giai đoạn 3) ──────────────
function buildCostingReport(spec) {
  const { from, to } = currentPeriodRange();
  const c = x2CostingData(from, to);
  const header = ['Stt', 'Chỉ Tiêu', 'Giá Trị', 'Đơn Vị', 'Ghi Chú'];
  const rows = [
    [1, 'Tiền nguyên liệu đã dùng', c.materialCost, 'đ', 'Σ kg lấy từ phiếu cân × đơn giá phiếu'],
    [2, 'Doanh thu phụ phẩm', c.revenue, 'đ', 'phần đã bán trong kỳ (kg cân thực)'],
    [3, 'Giảm trừ nhà cung cấp', c.credit, 'đ', 'ống lỗi trả lại × đơn giá bình quân NCC'],
    [4, 'Chi phí thực', c.netCost, 'đ', 'tiền nguyên liệu − doanh thu phụ phẩm − giảm trừ NCC'],
    [5, 'Ống đạt sản xuất', c.ongDat, 'kg', 'Σ KL ống đạt của các lượt Cắt Chọn'],
    [6, 'Giá thành 1 kg ống đạt', c.costPerKg == null ? '' : c.costPerKg, 'đ/kg', 'chi phí thực ÷ kg ống đạt'],
    [7, 'KL nguyên liệu CHƯA có đơn giá', c.kgNoPrice, 'kg', 'cần nhập đơn giá ở tab Nguyên Liệu để giá thành đúng']
  ];
  return rcFrame('GIÁ THÀNH 1 KG ỐNG ĐẠT',
    `Kỳ: ${from || '…'} → ${to || '…'} · (tiền NL − doanh thu phụ phẩm − giảm trừ NCC) ÷ kg ống đạt · chưa gồm nhân công / điện / khấu hao`,
    header, rows, { sheet: 'Giá Thành', file: spec.code });
}

// Nguồn dữ liệu của từng báo cáo — dùng để "Xuất cả nhóm" bỏ qua báo cáo rỗng
// (tránh bắn nhiều toast "không có dữ liệu" liên tiếp).
const RC_SOURCE_STATE = {
  batch: 'batches', boluong: 'xuong2BoluongRecords', cut: 'xuong2CutRecords',
  boong: 'xuong2BoOngRecords', baotho: 'xuong2BaoThoRecords', chonnan: 'xuong2ChonNanThoRecords',
  baotinh: 'xuong2BaoTinhRecords', bullig: 'xuong2BulligRecords', catvan: 'xuong2CatVanRecords',
  baovan: 'xuong2BaoVanRecords', hotro: 'xuong2HoTroRecords', kho: 'khoNotes', epvan: 'pressRecords',
  phupham: 'x2PhuPhamRecords',
  x1catong: 'xuong1CatOngRecords', x1saysinh: 'xuong1SaySinhRecords', x1boc: 'xuong1BocRecords',
  x1locong: 'xuong1LocOngRecords', x1catmat: 'xuong1CatMatRecords', x1bo: 'xuong1BoRecords',
  x1phoisay: 'xuong1PhoiSayRecords', x1locthanh: 'xuong1LocThanhRecords'
};
function reportHasData(spec) {
  if (!spec) return false;
  // PHỤ PHẨM: báo cáo có cả phần NHẬP tự suy ra (từ Bốc/Cắt) nên phải kiểm cả 2 nguồn
  if (spec.source === 'phupham') {
    return (state.x2PhuPhamRecords || []).length > 0 ||
      (state.xuong2BoluongRecords || []).length > 0 ||
      (state.xuong2CutRecords || []).length > 0;
  }
  if (spec.source) return ((state[RC_SOURCE_STATE[spec.source]] || []).length > 0);
  if (spec.builder === 'planning') return (state.planningItems || []).length > 0;
  if (spec.builder === 'materials') return (state.materialRecords || []).length > 0;
  if (spec.builder === 'qc') return (state.qcExports || []).length > 0;
  if (spec.builder === 'hr') return (state.hrEmployees || []).length > 0;
  if (spec.kind === 'planRates') return (state.materialRates || []).length > 0;
  if (spec.kind === 'planHistory') return (state.planningItems || []).length > 0;
  if (spec.kind === 'suppliers') return (state.suppliers || []).length > 0;
  if (spec.kind === 'qcFinal') return (state.qcFinalRecords || []).length > 0;
  if (spec.kind === 'qcPress') return (state.pressRecords || []).length > 0;
  if (spec.kind === 'incidents') return (state.x2IncidentReports || []).length > 0;
  if (spec.kind === 'ciCompare') return (state.hrCheckins || []).length > 0 || (state.hrAssignments || []).length > 0;
  if (spec.kind === 'payLock' || spec.kind === 'paySummary' || spec.kind === 'paySlip') {
    return (state.hrCheckins || []).length > 0 || (state.hrAssignments || []).length > 0;
  }
  if (spec.kind === 'massBalance') {
    const { from, to } = currentPeriodRange();
    const b = x2MassBalanceData(from, to);
    return (b.cart.in + b.ong.in + b.boc.in + b.bo.in) > 0;
  }
  if (spec.kind === 'costing') {
    const { from, to } = currentPeriodRange();
    const c = x2CostingData(from, to);
    return c.ongDat > 0;
  }
  return false;
}

// ─── NÚT: XUẤT / XEM TRƯỚC / XUẤT CẢ NHÓM ──────────────────────
function handleReportSubmit(e) {
  if (e && typeof e.preventDefault === 'function') e.preventDefault();
  syncReportValuesFromDom();
  saveReportUi();
  const d = buildReportData();
  if (!d) return;
  exportDataToXlsx(d);
  closeReportCenter();
  if (d.warning) showToast(d.warning, 'error');
  showToast(`Đã xuất ${d.countLabel} ra file ${d.filename}!`, 'success');
}
function openReportPreview() {
  syncReportValuesFromDom();
  saveReportUi();
  if (!reportById(rcReportId)) return;
  openExportPreview('modal-report-center', buildReportData);
}
function exportReportGroup() {
  syncReportValuesFromDom();
  saveReportUi();
  const spec = reportById(rcReportId);
  if (!spec) return;
  const list = reportsOfGroup(spec.group).filter(reportHasData);
  if (!list.length) { showToast('Nhóm này chưa có báo cáo nào có dữ liệu!', 'error'); return; }
  const keep = rcReportId;
  const items = [];
  list.forEach(r => {
    rcReportId = r.id;
    const d = buildReportData();
    if (d) items.push(Object.assign({}, d, { sheetName: r.label }));
  });
  rcReportId = keep;
  if (!items.length) { showToast('Không có dữ liệu để xuất!', 'error'); return; }
  exportMultiSheetToXlsx(items, `BaoCao_${spec.group.toUpperCase()}_${todayISO()}.xlsx`);
  showToast(`Đã xuất ${items.length} báo cáo (${items.length} sheet) ra 1 file Excel!`, 'success');
  closeReportCenter();
}

// ─── SỰ KIỆN UỶ NHIỆM TRONG MODAL ──────────────────────────────
function onReportCenterClick(e) {
  const t = e && e.target;
  if (!t || typeof t.closest !== 'function') return;
  const g = t.closest('[data-rc-group]');
  if (g) {
    const first = reportsOfGroup(g.dataset.rcGroup)[0];
    if (first) { rcReportId = first.id; saveReportUi(); renderReportCenter(); }
    return;
  }
  const r = t.closest('[data-rc-report]');
  if (r) {
    if (reportById(r.dataset.rcReport)) { rcReportId = r.dataset.rcReport; saveReportUi(); renderReportCenter(); }
    return;
  }
  const shift = t.closest('[data-rc-shift]');
  if (shift) {
    syncReportValuesFromDom();
    shiftReportPeriod(Number(shift.dataset.rcShift) || 1);
  }
}
function onReportFilterChange(e) {
  const t = e && e.target;
  if (!t || !t.id) return;
  if (!/^rc-f-/.test(t.id)) return;
  syncReportValuesFromDom();
  saveReportUi();
  // Đổi KIỂU KỲ → vẽ lại ô giá trị kỳ + nhãn
  if (t.id === 'rc-f-period-mode') renderReportCenter();
  else {
    const label = document.getElementById('rc-period-live');
    if (label) label.textContent = periodLabel(rcValues.periodMode, rcValues.periodKey);
    const p = document.querySelector('.rc-period-label');
    if (p) p.textContent = periodLabel(rcValues.periodMode, rcValues.periodKey);
  }
}



export {
  RC_UI_KEY,
  rcValues,
  openReportCenter,
  closeReportCenter,
  renderReportCenter,
  handleReportSubmit,
  openReportPreview,
  exportReportGroup,
  onReportCenterClick,
  onReportFilterChange,
  buildReportData,
  syncReportValuesFromDom,
  shiftReportPeriod,
  reportHasData,
  periodRange,
  periodLabel,
  isoWeekKey
};


