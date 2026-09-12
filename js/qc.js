// ═══════════════════════════════════════════════════════════
// js/qc.js — Tab QC — MODULE THẺ (launcher) + BẢNG XUẤT HÀNG
// Cấu trúc giống tab Nhân Sự: lưới thẻ nhỏ (Xuất Hàng / Kiểm Đầu Vào /
// Kiểm Sau Sản Xuất); bấm thẻ mở bảng chi tiết dạng pop-up.
// Module Xuất Hàng = bảng xuất theo tuần với ĐẦY ĐỦ nút chức năng ngay
// trong thẻ: thêm dòng, tìm kiếm, lọc Năm + Tuần (chips), xóa lọc, KPI.
//   - Khi chọn bộ lọc / gõ tìm kiếm → bảng CHỈ hiển thị kết quả khớp.
//   - Tuần (đầu vào) đã nhập là KHÓA — hiển thị badge chỉ đọc, không sửa.
//   - Tên hàng lấy từ thành phẩm trong Kế Hoạch Sản Xuất.
// Dữ liệu state.qcExports: [{ id, productId, name, week 'Tuần 34', year, qty, note, createdAt, updatedAt }]
// Lưu localStorage + đồng bộ mây (firePushSync); là nguồn dữ liệu
// cột "Số Lượng Xuất" trong biểu đồ Kế Hoạch vs Đã Ép (press.js).
// ═══════════════════════════════════════════════════════════
import { firePushSync, initLucide, requireEditPermission } from './cloud.js';
import { logDataChange } from './history.js';
import { canEditTab } from './permissions.js';
import { restoreRateTableCollapse } from './planning.js';
import { computeFpDimFromProduct, dimVolume } from './press.js';
import { STORAGE_KEY_QC_EXPORTS, state } from './state.js';
import { escapeHTML, getISOWeekString, showToast } from './utils.js';

  // ─── HELPERS ──────────────────────────────────────────────────
  // Lấy số tuần từ chuỗi "Tuần 34" -> 34
  function parseWeekNum(weekLabel) {
    const m = String(weekLabel || '').match(/Tuần\s*(\d+)/i);
    return m ? parseInt(m[1], 10) : 0;
  }

  function qcTodayISO() {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[0];
  }

  function qcCurrentWeekNum() { return parseWeekNum(getISOWeekString(qcTodayISO())); }
  function qcCurrentYear() { return new Date().getFullYear(); }

  // Thể tích quy đổi của 1 dòng xuất (m³) = thể tích 1 thành phẩm × số lượng.
  // Kích thước thành phẩm suy từ tên định mức (VD: 'Ván 1200x382x9' → 1200×382×9).
  // Dòng ngoài danh sách (không có mã) hoặc chưa có số lượng → 0 (hiển thị "—").
  function qcRowVolume(row) {
    const qty = Number(row.qty) || 0;
    if (!qty || !row.productId) return 0;
    const rate = state.materialRates.find(r => r.id === row.productId);
    if (!rate) return 0;
    const dim = computeFpDimFromProduct(rate.id);
    return dim ? dimVolume(dim, qty) : 0;
  }

  // Định dạng thể tích hiển thị trên bảng
  function qcFmtVol(v) {
    return v > 0 ? `${v.toLocaleString('vi-VN', { maximumFractionDigits: 4 })} m³` : '—';
  }

  // Danh sách năm có thể chọn (năm hiện tại + năm trong kế hoạch + năm đã xuất)
  function qcYearList() {
    const years = new Set([String(qcCurrentYear())]);
    (state.planningItems || []).forEach(p => { if (p.year) years.add(String(p.year)); });
    (state.qcExports || []).forEach(q => { if (q.year) years.add(String(q.year)); });
    return [...years].filter(Boolean).sort((a, b) => Number(a) - Number(b));
  }

  // Danh sách thành phẩm trong Kế Hoạch Sản Xuất (distinct theo mã sản phẩm).
  // Chưa có kế hoạch nào -> dùng toàn bộ danh mục định mức (các thành phẩm đã khai báo).
  function qcPlanProducts() {
    const ids = [...new Set((state.planningItems || []).map(p => p.productId).filter(Boolean))];
    const list = ids
      .map(id => state.materialRates.find(r => r.id === id))
      .filter(Boolean)
      .map(r => ({ id: r.id, name: r.product }));
    if (!list.length) {
      (state.materialRates || []).forEach(r => list.push({ id: r.id, name: r.product }));
    }
    return list;
  }

  // Tên hiển thị của 1 dòng xuất (ưu tiên tra định mức theo productId)
  function qcRowName(row) {
    if (row.productId) {
      const rate = state.materialRates.find(r => r.id === row.productId);
      if (rate) return rate.product;
    }
    return row.name || '—';
  }

  // ─── LOAD / SAVE ─────────────────────────────────────────────
  function loadQcExports() {
    const raw = localStorage.getItem(STORAGE_KEY_QC_EXPORTS);
    if (raw) {
      try { state.qcExports = JSON.parse(raw) || []; }
      catch (e) { state.qcExports = []; }
    } else {
      state.qcExports = [];
    }
    // Chuẩn hóa dữ liệu cũ thiếu năm/tuần
    (state.qcExports || []).forEach(q => {
      if (!q.year) q.year = qcCurrentYear();
      if (!q.week) q.week = '';
    });
  }

  function saveQcExports() {
    localStorage.setItem(STORAGE_KEY_QC_EXPORTS, JSON.stringify(state.qcExports || []));
    logDataChange(['qcExports']);
    firePushSync();
  }

  // ─── RENDER ──────────────────────────────────────────────────
  function renderQcView() {
    restoreRateTableCollapse(); // nhớ trạng thái thu gọn bảng xuất hàng
    renderQcSummary();
    renderQcTable();
    renderQcSearch(); // dải kết quả lọc theo từ khóa / bộ lọc đang chọn
    updateQcCardGrid(); // đếm số liệu trên các thẻ launcher
    syncQcMiniActive(); // highlight thẻ đang mở
    initLucide();
  }

  // ─── BỘ LỌC HỢP NHẤT (dùng chung cho bảng + KPI + dải kết quả) ─
  // state.qcSumYear  : 'all' = tất cả các năm, hoặc '2026'...
  // state.qcSumWeeks : danh sách tuần đã chọn — RỖNG = tất cả các tuần
  // state.qcSearchQ  : từ khóa tìm kiếm theo tên sản phẩm ('' = không lọc)
  function qcNormSumState() {
    if (state.qcSumYear == null || (state.qcSumYear !== 'all' && !qcYearList().includes(String(state.qcSumYear)))) {
      state.qcSumYear = 'all';
    }
    if (!Array.isArray(state.qcSumWeeks)) state.qcSumWeeks = [];
    if (state.qcSearchQ == null) state.qcSearchQ = '';
  }

  // Đang bật bộ lọc nào đó không (năm cụ thể / chips tuần / từ khóa)?
  function isQcFilterActive() {
    qcNormSumState();
    return state.qcSumYear !== 'all'
      || (state.qcSumWeeks || []).length > 0
      || String(state.qcSearchQ || '').trim() !== '';
  }

  // Danh sách dòng ĐANG HIỂN THỊ = dữ liệu lọc qua năm + tuần + từ khóa.
  // Khi không chọn gì → toàn bộ dòng xuất (mọi năm, mọi tuần).
  function qcFilteredRows() {
    qcNormSumState();
    const yearStr = String(state.qcSumYear);
    const weeks = state.qcSumWeeks || [];
    const q = qcStripForSearch(state.qcSearchQ || '');
    return (state.qcExports || []).filter(r =>
      (yearStr === 'all' || String(r.year ?? '') === yearStr) &&
      (weeks.length === 0 || weeks.includes(parseWeekNum(r.week))) &&
      (!q || qcStripForSearch(qcRowName(r)).includes(q))
    );
  }

  // ─── THẺ TỔNG HỢP XUẤT HÀNG (trong thẻ Xuất Hàng: lọc Năm + chips Tuần) ──
  function renderQcSummary() {
    qcNormSumState();
    const yearStr = String(state.qcSumYear);

    const yearSel = document.getElementById('qc-sum-year');
    if (yearSel) {
      const opts = [`<option value="all"${yearStr === 'all' ? ' selected' : ''}>Tất cả các năm</option>`];
      qcYearList().forEach(y => opts.push(`<option value="${y}"${y === yearStr ? ' selected' : ''}>Năm ${y}</option>`));
      yearSel.innerHTML = opts.join('');
    }

    // Chip tuần: các tuần CÓ dữ liệu trong phạm vi năm đang chọn (sắp tăng) + chip "Tất cả"
    const rowsOfYear = yearStr === 'all'
      ? (state.qcExports || [])
      : (state.qcExports || []).filter(r => String(r.year) === yearStr);
    const weeks = [...new Set(rowsOfYear.map(r => parseWeekNum(r.week)).filter(Boolean))].sort((a, b) => a - b);
    const chipsEl = document.getElementById('qc-sum-weeks');
    if (chipsEl) {
      const allActive = state.qcSumWeeks.length === 0;
      chipsEl.innerHTML =
        `<button type="button" class="qc-sum-chip${allActive ? ' active' : ''}" data-qc-sum-all title="Hiện tất cả các tuần"><i data-lucide="list"></i> Tất cả</button>` +
        weeks.map(w => `<button type="button" class="qc-sum-chip${state.qcSumWeeks.includes(w) ? ' active' : ''}" data-qc-sum-week="${w}">Tuần ${w}</button>`).join('');
    }

    // KPI: tính trên đúng tập kết quả đang lọc (năm + tuần + từ khóa)
    const rows = qcFilteredRows();
    const totalQty = rows.reduce((a, r) => a + (Number(r.qty) || 0), 0);
    const totalVol = rows.reduce((a, r) => a + qcRowVolume(r), 0);
    const qtyEl = document.getElementById('qc-sum-qty');
    const volEl = document.getElementById('qc-sum-vol');
    const cntEl = document.getElementById('qc-sum-count');
    if (qtyEl) qtyEl.textContent = totalQty.toLocaleString('vi-VN');
    if (volEl) volEl.textContent = totalVol.toLocaleString('vi-VN', { maximumFractionDigits: 3 });
    if (cntEl) cntEl.textContent = String(rows.length);
    initLucide();
  }

  // ─── BẢNG XUẤT HÀNG (chỉ hiển thị kết quả khớp bộ lọc/tìm kiếm) ────
  function renderQcTable() {
    const tbody = document.getElementById('qc-table-body');
    if (!tbody) return;
    const canEdit = canEditTab('qc');
    const dis = canEdit ? '' : 'disabled';
    const rows = qcFilteredRows(); // CHỈ dòng khớp bộ lọc / từ khóa
    const allCount = (state.qcExports || []).length;

    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:28px 12px; color:var(--text-muted); font-size:0.85rem;">
        ${allCount
          ? 'Không có dòng nào khớp bộ lọc / từ khóa — bấm <strong>Xóa Lọc</strong> để hiện tất cả.'
          : 'Chưa có dòng xuất hàng nào — bấm <strong>+ Thêm Dòng Xuất</strong> để bắt đầu.'}
      </td></tr>`;
    } else {
      tbody.innerHTML = rows.map(row => {
        const weekNum = parseWeekNum(row.week);
        const isCustom = !row.productId;
        return `
          <tr>
            <td>
              <div class="qc-product-name">${escapeHTML(qcRowName(row))}</div>
              ${isCustom ? '<span class="qc-custom-badge" title="Thành phẩm thêm ngoài danh sách kế hoạch">ngoài kế hoạch</span>' : ''}
            </td>
            <td style="width:110px;">
              <span class="qc-week-badge" title="Tuần xuất đã nhập đầu vào — không cần sửa">${weekNum ? `Tuần ${weekNum}` : '—'}</span>
              <div style="font-size:0.68rem; color:var(--text-muted); margin-top:2px;">${row.year || qcCurrentYear()}</div>
            </td>
            <td style="width:120px;">
              <input type="number" min="0" step="1" class="qc-row-input qc-row-qty" data-qc-id="${row.id}" data-qc-field="qty" value="${Number(row.qty) || ''}" placeholder="0" ${dis}>
            </td>
            <td class="text-right" style="width:130px;" data-qc-vol="${row.id}">${qcFmtVol(qcRowVolume(row))}</td>
            <td>
              <input type="text" class="qc-row-input qc-row-note" data-qc-id="${row.id}" data-qc-field="note" value="${escapeHTML(row.note || '')}" placeholder="Ghi chú..." ${dis}>
            </td>
            <td class="text-right" style="width:70px;">
              <button type="button" class="qc-row-delete" data-qc-delete="${row.id}" title="Xóa dòng xuất hàng" ${dis}><i data-lucide="trash-2"></i></button>
            </td>
          </tr>`;
      }).join('');
    }

    // Dòng TỔNG CỘNG đặt TRÊN CÙNG bảng — tính trên đúng tập đang lọc
    const totalQty = rows.reduce((a, r) => a + (Number(r.qty) || 0), 0);
    const totalVol = rows.reduce((a, r) => a + qcRowVolume(r), 0);
    const filtered = isQcFilterActive();
    const totalBody = document.getElementById('qc-table-total');
    if (totalBody) {
      totalBody.innerHTML = `<tr class="qc-total-row">
        <td colspan="2"><i data-lucide="sigma" style="width:13px;height:13px;"></i> <strong>${filtered ? 'Tổng cộng (bộ lọc)' : 'Tổng cộng (tất cả)'}</strong> — ${rows.length}/${allCount} dòng</td>
        <td class="text-right"><strong>${totalQty.toLocaleString('vi-VN')}</strong></td>
        <td class="text-right"><strong>${qcFmtVol(totalVol)}</strong></td>
        <td colspan="2"></td>
      </tr>`;
    }
    // Nhãn đếm kết quả ngay trên toolbar
    const cnt = document.getElementById('qc-filter-count');
    if (cnt) {
      cnt.textContent = filtered ? `Hiện ${rows.length}/${allCount} dòng` : `${allCount} dòng`;
    }
  }

  // Cập nhật dòng Tổng (trên đầu bảng) + ô thể tích mà không vẽ lại bảng (giữ focus)
  // — tính trên đúng tập dòng đang lọc.
  function refreshQcTotal() {
    const rows = qcFilteredRows();
    const totalQty = rows.reduce((a, r) => a + (Number(r.qty) || 0), 0);
    const totalVol = rows.reduce((a, r) => a + qcRowVolume(r), 0);
    const totalBody = document.getElementById('qc-table-total');
    if (!totalBody) return;
    const strongs = totalBody.querySelectorAll('.qc-total-row td strong');
    if (strongs[1]) strongs[1].textContent = totalQty.toLocaleString('vi-VN');
    if (strongs[2]) strongs[2].textContent = qcFmtVol(totalVol);
    // Cập nhật ô thể tích quy đổi của từng dòng hiển thị
    rows.forEach(r => {
      const cell = document.querySelector(`td[data-qc-vol="${r.id}"]`);
      if (cell) cell.textContent = qcFmtVol(qcRowVolume(r));
    });
    renderQcSummary(); // KPI thẻ tổng hợp thay theo
  }

  // ─── SỬA TRỰC TIẾP TRÊN BẢNG ────────────────────────────────
  function updateQcExportRow(id, field, value) {
    const row = (state.qcExports || []).find(q => q.id === id);
    if (!row) return;
    if (field === 'week') {
      const n = parseInt(value, 10);
      row.week = n > 0 ? `Tuần ${n}` : '';
    } else if (field === 'qty') {
      row.qty = Math.max(0, parseInt(value, 10) || 0);
    } else if (field === 'note') {
      row.note = String(value || '').trim();
    } else {
      return;
    }
    row.updatedAt = new Date().toISOString();
    saveQcExports();
    if (field === 'week') renderQcTable(); // dòng có thể ra/vào bộ lọc → vẽ lại bảng
    else refreshQcTotal(); // chỉ cập nhật tổng + ô thể tích (giữ focus khi đang gõ)
    renderQcSearch(); // dải kết quả lọc thay theo
  }

  function deleteQcExport(id) {
    if (!requireEditPermission()) return;
    const row = (state.qcExports || []).find(q => q.id === id);
    if (!row) return;
    if (!confirm(`Xóa dòng xuất hàng "${qcRowName(row)}" (${row.week || 'chưa chọn tuần'})?`)) return;
    state.qcExports = state.qcExports.filter(q => q.id !== id);
    saveQcExports();
    renderQcTable();
    renderQcSummary();
    renderQcSearch();
    updateQcCardGrid();
    initLucide();
    showToast('Đã xóa dòng xuất hàng', 'info');
  }

  // ─── MODAL TẠO DÒNG XUẤT HÀNG THEO TUẦN ──────────────────────
  // Quy trình mới: chọn Tuần xuất → tự nạp TOÀN BỘ thành phẩm theo kế hoạch
  // tuần đó (checkbox tick sẵn, SỐ LƯỢNG để TRỐNG điền tay số thực tế).
  // Mỗi dòng có nút bỏ dòng (không xuất trong tuần). Có nút thêm thành phẩm
  // ngoài kế hoạch. Submit tạo các dòng đã tick có số lượng > 0.
  let qcImpCustomIdx = 0; // đếm số TP ngoài kế hoạch đã thêm trong 1 lần mở
  // Danh sách dòng đang soạn trong modal ({ key, productId, name, planQty, plan, qty, checked })
  let qcImpRows = [];

  // Thành phẩm theo KẾ HOẠCH của năm + tuần (distinct theo mã, giữ thứ tự plan)
  function qcPlanProductsFor(yearVal, weekNum) {
    const ids = [...new Set((state.planningItems || [])
      .filter(p => String(p.year || qcCurrentYear()) === String(yearVal))
      .filter(p => parseWeekNum(p.week) === Number(weekNum))
      .map(p => p.productId).filter(Boolean))];
    return ids.map(id => {
      const rate = state.materialRates.find(r => r.id === id);
      if (!rate) return null;
      const planQty = (state.planningItems || [])
        .filter(p => p.productId === id && parseWeekNum(p.week) === Number(weekNum) && String(p.year) === String(yearVal))
        .reduce((a, p) => a + (Number(p.qty) || 0), 0);
      return { id: rate.id, name: rate.product, planQty };
    }).filter(Boolean);
  }

  function qcImpPlanInfo() {
    const yearVal = document.getElementById('qc-imp-year')?.value || '';
    const weekNum = parseInt(document.getElementById('qc-imp-week')?.value, 10) || 0;
    const plan = qcPlanProductsFor(yearVal, weekNum);
    const txt = document.getElementById('qc-imp-plan-text');
    if (txt) {
      txt.innerHTML = plan.length
        ? `Kế hoạch tuần <strong>${weekNum}</strong> năm <strong>${yearVal}</strong>: <strong>${plan.length}</strong> thành phẩm (tổng KH <strong>${plan.reduce((a, p) => a + p.planQty, 0).toLocaleString('vi-VN')}</strong> tấm). Bỏ tick / bấm nút xóa dòng KHÔNG xuất, điền tay số lượng thực tế.`
        : `Kế hoạch tuần <strong>${weekNum}</strong> năm <strong>${yearVal}</strong>: <strong>không có</strong> thành phẩm nào. Dùng "Nạp Kế Hoạch Tuần Này" hoặc "Thêm Sản Phẩm Ngoài Kế Hoạch".`;
    }
    return plan;
  }

  // Vẽ lại danh sách dòng trong modal (giữ số lượng người dùng đã điền qua qcImpRows)
  function renderQcImpRows() {
    const box = document.getElementById('qc-imp-products');
    if (!box) return;
    if (!qcImpRows.length) {
      box.innerHTML = `<div class="qc-imp-empty">Chưa có dòng nào — bấm <strong>Nạp Kế Hoạch Tuần Này</strong> hoặc <strong>Thêm Sản Phẩm Ngoài Kế Hoạch</strong>.</div>`;
    } else {
      box.innerHTML = qcImpRows.map(r => {
        const planBadge = r.plan
          ? `<span class="qc-imp-plan-badge" title="Số lượng kế hoạch tuần này">KH: ${(r.planQty || 0).toLocaleString('vi-VN')}</span>`
          : `<span class="qc-custom-badge">ngoài kế hoạch</span>`;
        return `<div class="qc-imp-row" data-qc-imp-key="${r.key}">
          <label class="qc-imp-check-label"><input type="checkbox" class="qc-imp-check" data-qc-imp-check="${r.key}"${r.checked === false ? '' : ' checked'} title="Tick để tạo dòng xuất"></label>
          <div class="qc-imp-name-cell">
            <div class="qc-product-name">${escapeHTML(r.name)}</div>
            ${planBadge}
          </div>
          <input type="number" min="0" step="1" class="qc-imp-qty qc-row-qty" data-qc-imp-qty="${r.key}" value="${(Number(r.qty) || 0) > 0 ? Number(r.qty) : ''}" placeholder="Số lượng thực tế" title="Điền số lượng xuất thực tế (để trống = bỏ qua dòng này)">
          <button type="button" class="qc-row-delete" data-qc-imp-remove="${r.key}" title="Bỏ dòng này (không xuất trong tuần)"><i data-lucide="trash-2"></i></button>
        </div>`;
      }).join('');
    }
    qcImpFooterInfo();
    initLucide();
  }

  // Dòng thông tin dưới cùng: sẽ tạo bao nhiêu dòng / tổng tấm
  function qcImpFooterInfo() {
    const info = document.getElementById('qc-imp-footer-info');
    if (!info) return;
    const picked = qcImpRows.filter(r => r.checked !== false && (Number(r.qty) || 0) > 0);
    info.innerHTML = picked.length
      ? `<i data-lucide="info"></i> Sẽ tạo <strong>${picked.length}</strong> dòng xuất — tổng <strong>${picked.reduce((a, r) => a + (Number(r.qty) || 0), 0).toLocaleString('vi-VN')}</strong> tấm (dòng tick nhưng chưa điền số lượng sẽ BỎ QUA).`
      : `<i data-lucide="info"></i> Chưa điền số lượng nào — dòng tick mà số lượng trống sẽ bị bỏ qua.`;
    initLucide();
  }

  // Nạp danh sách theo kế hoạch (giữ số lượng đã điền cho dòng cùng mã)
  // keepQty=true: giữ lại số lượng đã điền tay cho các mã còn tồn tại
  // Xóa 1 dòng khỏi danh sách đang soạn (dùng cho nút bỏ dòng — tránh gán
  // trực tiếp binding import ở events.js vì ES-module import là read-only)
  function qcImpRemoveRow(key) {
    qcImpRows = qcImpRows.filter(r => r.key !== key);
    renderQcImpRows();
  }

  // events.js ủy quyền tick / điền số lượng từ danh sách soạn (qcImpRows là
  // trạng thái riêng của module — phải cập nhật qua các hàm này, không tham
  // chiếu trực tiếp được vì ES-module import là read-only)
  function qcImpSetChecked(key, checked) {
    const row = qcImpRows.find(r => r.key === key);
    if (row) { row.checked = checked !== false; qcImpFooterInfo(); }
  }
  function qcImpSetQty(key, value) {
    const row = qcImpRows.find(r => r.key === key);
    if (row) { row.qty = Math.max(0, parseInt(value, 10) || 0); qcImpFooterInfo(); }
  }

  function qcImpLoadPlan(keepQty = true) {
    const yearVal = document.getElementById('qc-imp-year')?.value || '';
    const weekNum = parseInt(document.getElementById('qc-imp-week')?.value, 10) || 0;
    if (!yearVal || !weekNum) { showToast('Vui lòng chọn Năm và Tuần Xuất trước!', 'error'); return; }
    const prevQty = {};
    if (keepQty) qcImpRows.forEach(r => { if ((Number(r.qty) || 0) > 0) prevQty[r.productId || r.name] = Number(r.qty); });
    const plan = qcImpPlanInfo();
    const planRows = plan.map(p => ({
      key: `p-${p.id}`, productId: p.id, name: p.name, planQty: p.planQty, plan: true,
      qty: keepQty ? (prevQty[p.id] || 0) : 0, checked: true
    }));
    const customs = qcImpRows.filter(r => !r.plan); // dòng ngoài kế hoạch giữ nguyên
    qcImpRows = [...planRows, ...customs];
    renderQcImpRows();
  }

  // Thêm thành phẩm ngoài kế hoạch (từ ô nhập tên)
  function qcImpAddCustom() {
    const input = document.getElementById('qc-custom-name');
    const name = String(input?.value || '').trim();
    if (!name) { showToast('Vui lòng nhập tên thành phẩm!', 'error'); input?.focus(); return; }
    if (qcImpRows.some(r => (r.name || '').toLowerCase() === name.toLowerCase())) {
      showToast('Thành phẩm này đã có trong danh sách!', 'error'); return;
    }
    qcImpCustomIdx++;
    qcImpRows.push({ key: `c-${Date.now()}-${qcImpCustomIdx}`, productId: null, name, planQty: 0, plan: false, qty: 0, checked: true });
    if (input) input.value = '';
    const group = document.getElementById('qc-custom-name-group');
    if (group) group.style.display = 'none';
    renderQcImpRows();
    showToast(`Đã thêm "${name}" vào danh sách soạn!`, 'success');
  }

  function openQcExportModal() {
    if (!requireEditPermission()) return;
    const modal = document.getElementById('modal-qc-export');
    if (!modal) return;
    const form = document.getElementById('qc-export-form');
    if (form) form.reset();
    qcImpCustomIdx = 0;
    qcImpRows = [];

    // Năm + tuần: mặc định là hiện tại
    const yearSel = document.getElementById('qc-imp-year');
    if (yearSel) {
      yearSel.innerHTML = qcYearList()
        .map(y => `<option value="${y}"${Number(y) === qcCurrentYear() ? ' selected' : ''}>Năm ${y}</option>`).join('');
    }
    const weekSel = document.getElementById('qc-imp-week');
    if (weekSel) {
      const curW = qcCurrentWeekNum();
      weekSel.innerHTML = Array.from({ length: 53 }, (_, i) => i + 1)
        .map(w => `<option value="${w}"${w === curW ? ' selected' : ''}>Tuần ${w}</option>`).join('');
    }
    const noteEl = document.getElementById('qc-imp-note');
    if (noteEl) noteEl.value = '';
    hideQcCustomName();

    qcImpLoadPlan(false); // nạp kế hoạch tuần hiện tại ngay khi mở modal
    modal.classList.add('show');
    initLucide();
  }

  function closeQcExportModal() {
    document.getElementById('modal-qc-export')?.classList.remove('show');
  }

  function showQcCustomName() {
    const group = document.getElementById('qc-custom-name-group');
    if (group) group.style.display = '';
    const input = document.getElementById('qc-custom-name');
    if (input) { input.required = false; input.focus(); }
  }

  function hideQcCustomName() {
    const group = document.getElementById('qc-custom-name-group');
    if (group) group.style.display = 'none';
    const input = document.getElementById('qc-custom-name');
    if (input) { input.required = false; input.value = ''; }
  }

  // (Giữ tương thích tên cũ — select chọn TP đơn lẻ đã thay bằng danh sách tuần)
  function onQcProductChange() { showQcCustomName(); }

  // Tạo các dòng xuất từ danh sách đã soạn (tick + số lượng > 0)
  function handleQcExportSubmit(e) {
    e.preventDefault();
    const yearVal = parseInt(document.getElementById('qc-imp-year')?.value, 10) || 0;
    const weekNum = parseInt(document.getElementById('qc-imp-week')?.value, 10) || 0;
    const note = String(document.getElementById('qc-imp-note')?.value || '').trim();
    if (!yearVal) { showToast('Năm xuất hàng không được để trống!', 'error'); return; }
    if (!weekNum) { showToast('Vui lòng chọn tuần xuất hàng!', 'error'); return; }

    const picked = qcImpRows.filter(r => r.checked !== false && (Number(r.qty) || 0) > 0);
    if (!picked.length) {
      showToast('Chưa có dòng nào có số lượng — điền số lượng thực tế cho các dòng cần xuất!', 'error');
      return;
    }

    const now = new Date().toISOString();
    (state.qcExports = state.qcExports || []).push(...picked.map(r => ({
      id: `qc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      productId: r.productId || null,
      name: r.name,
      week: `Tuần ${weekNum}`,
      year: yearVal,
      qty: Number(r.qty) || 0,
      note,
      createdAt: now,
      updatedAt: now
    })));

    const totalQty = picked.reduce((a, r) => a + (Number(r.qty) || 0), 0);
    saveQcExports();
    closeQcExportModal();
    renderQcTable();
    renderQcSummary();
    renderQcSearch();
    updateQcCardGrid();
    initLucide();
    showToast(`Đã tạo ${picked.length} dòng xuất (tổng ${totalQty.toLocaleString('vi-VN')} tấm) — Tuần ${weekNum}/${yearVal}!`, 'success');
  }

  // ─── TÌM KIẾM / DẢI KẾT QUẢ LỌC ─────────────────────────────
  // Chuẩn hóa chuỗi tìm kiếm: bỏ dấu tiếng Việt + lowercase (không phân biệt dấu).
  function qcStripForSearch(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/\s+/g, ' ').trim();
  }
  // Dải thông tin kết quả lọc: hiện khi đang lọc năm/tuần hoặc gõ từ khóa —
  // tổng hợp số dòng / số lượng / thể tích của ĐÚNG tập kết quả đang hiển thị.
  function renderQcSearch() {
    const box = document.getElementById('qc-filter-info');
    if (!box) return;
    qcNormSumState();
    const qRaw = String(state.qcSearchQ || '').trim();
    const rows = qcFilteredRows();
    const allCount = (state.qcExports || []).length;
    if (!isQcFilterActive()) {
      box.style.display = 'none';
      box.innerHTML = '';
      return;
    }
    const totalQty = rows.reduce((a, r) => a + (Number(r.qty) || 0), 0);
    const totalVol = rows.reduce((a, r) => a + qcRowVolume(r), 0);
    const parts = [];
    if (state.qcSumYear !== 'all') parts.push(`Năm <strong>${escapeHTML(state.qcSumYear)}</strong>`);
    if ((state.qcSumWeeks || []).length) {
      const ws = [...state.qcSumWeeks].sort((a, b) => a - b).map(w => `Tuần ${w}`).join(', ');
      parts.push(`Tuần <strong>${ws}</strong>`);
    }
    if (qRaw) parts.push(`khớp "<strong>${escapeHTML(qRaw)}</strong>"`);
    box.style.display = '';
    box.innerHTML = `<i data-lucide="filter"></i> Kết quả lọc ${parts.join(' · ')}: <strong>${rows.length}/${allCount}</strong> dòng · tổng <strong>${totalQty.toLocaleString('vi-VN')}</strong> tấm · ${qcFmtVol(totalVol)}`;
    initLucide();
  }

  // ─── THẺ NÔI — LAUNCHER BẢNG QC (giống tab Nhân Sự) ─────────────
  // Mỗi bảng QC là một thẻ nhỏ (qc-mini-card) trong lưới; bấm thẻ → bảng
  // chi tiết nổi lên trong pop-up (qc-detail-overlay), bấm lại → thu về.
  const QC_CARD_DEFS = {
    'qc-export-card': { el: 'qc-mini-count-export', count: () => {
      const rows = state.qcExports || [];
      const qty = rows.reduce((a, r) => a + (Number(r.qty) || 0), 0);
      return rows.length ? `${rows.length} dòng · ${qty.toLocaleString('vi-VN')} tấm` : 'Chưa có';
    } },
    'qc-incoming-card': { el: 'qc-mini-count-incoming', count: () => 'Sắp có' },
    'qc-final-card':    { el: 'qc-mini-count-final',    count: () => 'Sắp có' }
  };

  // Cập nhật số đếm trên các thẻ — gọi từ renderQcView sau khi có dữ liệu.
  function updateQcCardGrid() {
    Object.keys(QC_CARD_DEFS).forEach(cardId => {
      try {
        const el = document.getElementById(QC_CARD_DEFS[cardId].el);
        if (el) el.textContent = String(QC_CARD_DEFS[cardId].count());
      } catch (e) { /* không chặn render tab QC */ }
    });
  }

  // Đồng bộ highlight thẻ với bảng đang mở (thẻ mở = không qc-card-hidden).
  function syncQcMiniActive() {
    let openId = null;
    Object.keys(QC_CARD_DEFS).forEach(cardId => {
      const c = document.getElementById(cardId);
      if (c && !c.classList.contains('qc-card-hidden') && !c.classList.contains('rate-table-collapsed')) openId = cardId;
    });
    document.querySelectorAll('.qc-mini-card').forEach(t => {
      const act = t.getAttribute('data-qc-card') === openId;
      t.classList.toggle('qc-mini-active', act);
      t.setAttribute('aria-expanded', act ? 'true' : 'false');
    });
  }

  // Bảng chi tiết QC nổi lên dạng POP-UP (giống tab Nhân Sự): bấm thẻ →
  // DOM node của bảng (giữ nguyên bảng + sự kiện) được chuyển vào modal
  // overlay; bấm lại cùng thẻ / nút Đóng / bấm nền mờ → đóng, trả bảng về
  // stack gốc (accordion: chỉ 1 bảng mở tại một thời điểm).
  let openQcDetailCard = null;
  // Đặt đỉnh pop-up ngay dưới header — header không bị che / làm mờ
  function qcPositionDetailOverlay() {
    const overlay = document.getElementById('qc-detail-overlay');
    if (!overlay) return;
    const header = document.querySelector('.app-header');
    if (header && typeof header.getBoundingClientRect === 'function') {
      const bottom = header.getBoundingClientRect().bottom;
      if (bottom > 0) overlay.style.top = Math.round(bottom) + 'px';
    }
  }
  function qcOpenCard(cardId) {
    const card = document.getElementById(cardId);
    if (!card) return false;
    // Bấm lại thẻ đang mở → đóng popup (thu về dạng thu gọn)
    if (openQcDetailCard === card) { qcCloseOpenCard(); return false; }
    // Đóng bảng đang mở (nếu có) trước khi mở bảng mới (accordion)
    if (openQcDetailCard) qcCloseOpenCard();
    // Mở bảng: bỏ ẩn + chuyển DOM node vào trong modal overlay
    card.classList.remove('qc-card-hidden');
    card.classList.remove('rate-table-collapsed');
    const content = document.getElementById('qc-detail-content');
    if (content) content.appendChild(card);
    openQcDetailCard = card;
    const h4 = card.querySelector && card.querySelector('.planning-card-header h4');
    const titleText = (h4 && typeof h4.textContent === 'string') ? h4.textContent.trim() : '';
    const titleEl = document.getElementById('qc-detail-title');
    if (titleEl) titleEl.textContent = titleText || 'Chi Tiết QC';
    const overlay = document.getElementById('qc-detail-overlay');
    if (overlay) {
      overlay.classList.add('show');
      overlay.setAttribute('aria-hidden', 'false');
      qcPositionDetailOverlay();
      if (typeof overlay.focus === 'function') overlay.focus({ preventScroll: true });
    }
    syncQcMiniActive();
    initLucide();
    return true;
  }
  function qcCloseOpenCard() {
    const overlay = document.getElementById('qc-detail-overlay');
    if (!openQcDetailCard) {
      if (overlay) { overlay.classList.remove('show'); overlay.setAttribute('aria-hidden', 'true'); }
      return;
    }
    const card = openQcDetailCard;
    const stack = document.getElementById('qc-details-stack');
    if (stack) stack.appendChild(card); else document.getElementById('qc-view')?.appendChild(card);
    card.classList.add('qc-card-hidden');
    openQcDetailCard = null;
    if (overlay) { overlay.classList.remove('show'); overlay.setAttribute('aria-hidden', 'true'); }
    syncQcMiniActive();
    initLucide();
  }

export {
  QC_CARD_DEFS,
  closeQcExportModal,
  deleteQcExport,
  handleQcExportSubmit,
  hideQcCustomName,
  isQcFilterActive,
  loadQcExports,
  onQcProductChange,
  openQcExportModal,
  qcCloseOpenCard,
  qcFilteredRows,
  qcImpAddCustom,
  qcImpFooterInfo,
  qcImpLoadPlan,
  qcImpRemoveRow,
  qcImpSetChecked,
  qcImpSetQty,
  qcOpenCard,
  qcPositionDetailOverlay,
  qcRowVolume,
  renderQcImpRows,
  renderQcSearch,
  renderQcSummary,
  renderQcTable,
  renderQcView,
  saveQcExports,
  showQcCustomName,
  syncQcMiniActive,
  updateQcCardGrid,
  updateQcExportRow
};
