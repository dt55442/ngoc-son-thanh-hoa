// ═══════════════════════════════════════════════════════════
// js/qc.js — Tab QC — BẢNG XUẤT HÀNG
// Ghi nhận hàng xuất theo tuần:
//   - Tên hàng: lấy từ danh sách thành phẩm trong Kế Hoạch Sản Xuất
//     (có nút "thêm thành phẩm ngoài danh sách" khi nhập dòng mới).
//   - Tuần: chọn nhanh áp dụng cho CẢ DANH SÁCH (toolbar) hoặc từng dòng.
//   - Số lượng xuất & Ghi chú: sửa trực tiếp trên bảng.
// Dữ liệu state.qcExports: [{ id, productId, name, week 'Tuần 34', year, qty, note, createdAt, updatedAt }]
// Lưu localStorage + đồng bộ mây (firePushSync); là nguồn dữ liệu
// cột "Số Lượng Xuất" trong biểu đồ Kế Hoạch vs Đã Ép (press.js).
// ═══════════════════════════════════════════════════════════
import { firePushSync, initLucide, requireEditPermission } from './cloud.js';
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
    firePushSync();
  }

  // ─── RENDER ──────────────────────────────────────────────────
  function renderQcView() {
    restoreRateTableCollapse(); // nhớ trạng thái thu gọn bảng xuất hàng
    renderQcSummary();
    renderQcTable();
    initLucide();
  }

  // ─── THẺ TỔNG HỢP XUẤT HÀNG (lọc Năm + chọn 1/nhiều Tuần) ────
  // state.qcSumYear  : năm đang xem (mặc định năm hiện tại)
  // state.qcSumWeeks : danh sách tuần đã chọn — RỖNG = tất cả các tuần
  function renderQcSummary() {
    if (state.qcSumYear == null || !qcYearList().includes(String(state.qcSumYear))) {
      state.qcSumYear = String(qcCurrentYear());
    }
    if (!Array.isArray(state.qcSumWeeks)) state.qcSumWeeks = [];
    const yearStr = String(state.qcSumYear);

    const yearSel = document.getElementById('qc-sum-year');
    if (yearSel) {
      yearSel.innerHTML = qcYearList()
        .map(y => `<option value="${y}"${y === yearStr ? ' selected' : ''}>Năm ${y}</option>`).join('');
    }

    // Chip tuần: các tuần CÓ dữ liệu trong năm đang chọn (sắp tăng) + chip "Tất cả"
    const rowsOfYear = (state.qcExports || []).filter(r => String(r.year) === yearStr);
    const weeks = [...new Set(rowsOfYear.map(r => parseWeekNum(r.week)).filter(Boolean))].sort((a, b) => a - b);
    const chipsEl = document.getElementById('qc-sum-weeks');
    if (chipsEl) {
      const allActive = state.qcSumWeeks.length === 0;
      chipsEl.innerHTML =
        `<button type="button" class="qc-sum-chip${allActive ? ' active' : ''}" data-qc-sum-all title="Hiện tất cả các tuần"><i data-lucide="list"></i> Tất cả</button>` +
        weeks.map(w => `<button type="button" class="qc-sum-chip${state.qcSumWeeks.includes(w) ? ' active' : ''}" data-qc-sum-week="${w}">Tuần ${w}</button>`).join('');
    }

    // KPI: lọc theo năm + các tuần đã chọn (không chọn tuần nào = tất cả)
    const rows = rowsOfYear.filter(r => state.qcSumWeeks.length === 0 || state.qcSumWeeks.includes(parseWeekNum(r.week)));
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

  // ─── RENDER ──────────────────────────────────────────────────
  function renderQcTable() {
    const tbody = document.getElementById('qc-table-body');
    if (!tbody) return;
    const canEdit = canEditTab('qc');
    const dis = canEdit ? '' : 'disabled';
    const rows = state.qcExports || [];

    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:28px 12px; color:var(--text-muted); font-size:0.85rem;">
        Chưa có dòng xuất hàng nào — bấm <strong>+ Thêm Dòng Xuất</strong> để bắt đầu.
      </td></tr>`;
    } else {
      tbody.innerHTML = rows.map(row => {
        const weekNum = parseWeekNum(row.week);
        const weekOpts = Array.from({ length: 53 }, (_, i) => i + 1)
          .map(w => `<option value="${w}"${w === weekNum ? ' selected' : ''}>Tuần ${w}</option>`).join('');
        const isCustom = !row.productId;
        return `
          <tr>
            <td>
              <div class="qc-product-name">${escapeHTML(qcRowName(row))}</div>
              ${isCustom ? '<span class="qc-custom-badge" title="Thành phẩm thêm ngoài danh sách kế hoạch">ngoài kế hoạch</span>' : ''}
            </td>
            <td style="width:110px;">
              <select class="qc-row-input qc-row-week" data-qc-id="${row.id}" data-qc-field="week" ${dis} title="Năm ${row.year || qcCurrentYear()} — chọn tuần xuất">
                <option value="">--</option>
                ${weekOpts}
              </select>
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

    // Dòng TỔNG CỘNG đặt TRÊN CÙNG bảng (toàn bộ dòng — tổng hợp theo bộ lọc xem thẻ phía trên)
    const totalQty = rows.reduce((a, r) => a + (Number(r.qty) || 0), 0);
    const totalVol = rows.reduce((a, r) => a + qcRowVolume(r), 0);
    const totalBody = document.getElementById('qc-table-total');
    if (totalBody) {
      totalBody.innerHTML = `<tr class="qc-total-row">
        <td colspan="2"><i data-lucide="sigma" style="width:13px;height:13px;"></i> <strong>Tổng cộng (tất cả)</strong> — ${rows.length} dòng</td>
        <td class="text-right"><strong>${totalQty.toLocaleString('vi-VN')}</strong></td>
        <td class="text-right"><strong>${qcFmtVol(totalVol)}</strong></td>
        <td colspan="2"></td>
      </tr>`;
    }
  }

  // Cập nhật dòng Tổng (trên đầu bảng) + ô thể tích mà không vẽ lại bảng (giữ focus)
  function refreshQcTotal() {
    const rows = state.qcExports || [];
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
    renderQcSummary(); // KPI thẻ tổng hợp thay theo
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
    initLucide();
    showToast('Đã xóa dòng xuất hàng', 'info');
  }

  // ─── MODAL THÊM DÒNG XUẤT HÀNG ───────────────────────────────
  function openQcExportModal() {
    if (!requireEditPermission()) return;
    const modal = document.getElementById('modal-qc-export');
    if (!modal) return;
    const form = document.getElementById('qc-export-form');
    if (form) form.reset();

    // Select thành phẩm: danh sách từ Kế Hoạch Sản Xuất + lựa chọn thêm ngoài danh sách
    const productSel = document.getElementById('qc-product');
    if (productSel) {
      const products = qcPlanProducts();
      productSel.innerHTML = '<option value="">-- Chọn thành phẩm (theo Kế hoạch sản xuất) --</option>' +
        products.map(p => `<option value="${escapeHTML(p.id)}">${escapeHTML(p.name)}</option>`).join('') +
        '<option value="__custom__">＋ Thêm thành phẩm ngoài danh sách…</option>';
    }
    hideQcCustomName();

    // Năm + tuần: mặc định là hiện tại
    const yearSel = document.getElementById('qc-year');
    if (yearSel) {
      yearSel.innerHTML = qcYearList()
        .map(y => `<option value="${y}"${Number(y) === qcCurrentYear() ? ' selected' : ''}>Năm ${y}</option>`).join('');
    }
    const weekSel = document.getElementById('qc-week');
    if (weekSel) {
      const curW = qcCurrentWeekNum();
      weekSel.innerHTML = '<option value="">-- Chọn tuần --</option>' +
        Array.from({ length: 53 }, (_, i) => i + 1)
          .map(w => `<option value="${w}"${w === curW ? ' selected' : ''}>Tuần ${w}</option>`).join('');
    }

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
    if (input) input.required = true;
  }

  function hideQcCustomName() {
    const group = document.getElementById('qc-custom-name-group');
    if (group) group.style.display = 'none';
    const input = document.getElementById('qc-custom-name');
    if (input) { input.required = false; input.value = ''; }
  }

  // Chọn "ngoài danh sách" -> hiện ô nhập tên thành phẩm mới
  function onQcProductChange() {
    const sel = document.getElementById('qc-product');
    if (!sel) return;
    if (sel.value === '__custom__') showQcCustomName();
    else hideQcCustomName();
  }

  function handleQcExportSubmit(e) {
    e.preventDefault();
    const productSel = document.getElementById('qc-product');
    const customInput = document.getElementById('qc-custom-name');
    const yearVal = parseInt(document.getElementById('qc-year')?.value, 10) || 0;
    const weekNum = parseInt(document.getElementById('qc-week')?.value, 10) || 0;
    const qty = parseInt(document.getElementById('qc-qty')?.value, 10) || 0;
    const note = String(document.getElementById('qc-note')?.value || '').trim();

    let productId = null, name = '';
    if (productSel && productSel.value === '__custom__') {
      name = String(customInput?.value || '').trim();
      if (!name) { showToast('Vui lòng nhập tên thành phẩm!', 'error'); return; }
    } else {
      productId = productSel?.value || '';
      if (!productId) { showToast('Vui lòng chọn thành phẩm (hoặc thêm thành phẩm ngoài danh sách)!', 'error'); return; }
      const rate = state.materialRates.find(r => r.id === productId);
      name = rate ? rate.product : 'Sản phẩm đã xóa';
    }
    if (!yearVal) { showToast('Năm xuất hàng không được để trống!', 'error'); return; }
    if (!weekNum) { showToast('Vui lòng chọn tuần xuất hàng!', 'error'); return; }
    if (qty <= 0) { showToast('Số lượng xuất phải lớn hơn 0!', 'error'); return; }

    (state.qcExports = state.qcExports || []).push({
      id: `qc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      productId: productId || null,
      name,
      week: `Tuần ${weekNum}`,
      year: yearVal,
      qty,
      note,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    saveQcExports();
    closeQcExportModal();
    renderQcTable();
    renderQcSummary();
    initLucide();
    showToast('Đã thêm dòng xuất hàng!', 'success');
  }

export {
  closeQcExportModal,
  deleteQcExport,
  handleQcExportSubmit,
  loadQcExports,
  onQcProductChange,
  openQcExportModal,
  qcRowVolume,
  renderQcSummary,
  renderQcTable,
  renderQcView,
  saveQcExports,
  updateQcExportRow
};
