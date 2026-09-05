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

  // Trạng thái chọn của toolbar điền nhanh tuần (giữ nguyên giữa các lần render)
  let qcQuickYear = '';
  let qcQuickWeek = '';

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
    renderQcQuickToolbar();
    renderQcTable();
    initLucide();
  }

  // Toolbar điền nhanh tuần cho cả danh sách
  function renderQcQuickToolbar() {
    const yearSel = document.getElementById('qc-quick-year');
    if (yearSel) {
      const years = qcYearList();
      if (!qcQuickYear || !years.includes(String(qcQuickYear))) qcQuickYear = String(qcCurrentYear());
      yearSel.innerHTML = years.map(y => `<option value="${y}"${String(qcQuickYear) === y ? ' selected' : ''}>Năm ${y}</option>`).join('');
    }
    const weekSel = document.getElementById('qc-quick-week');
    if (weekSel) {
      if (!qcQuickWeek) qcQuickWeek = qcCurrentWeekNum();
      weekSel.innerHTML = Array.from({ length: 53 }, (_, i) => i + 1)
        .map(w => `<option value="${w}"${Number(qcQuickWeek) === w ? ' selected' : ''}>Tuần ${w}</option>`).join('');
    }
  }

  function renderQcTable() {
    const tbody = document.getElementById('qc-table-body');
    if (!tbody) return;
    const canEdit = canEditTab('qc');
    const dis = canEdit ? '' : 'disabled';
    const rows = state.qcExports || [];

    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:28px 12px; color:var(--text-muted); font-size:0.85rem;">
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
            <td>
              <input type="text" class="qc-row-input qc-row-note" data-qc-id="${row.id}" data-qc-field="note" value="${escapeHTML(row.note || '')}" placeholder="Ghi chú..." ${dis}>
            </td>
            <td class="text-right" style="width:70px;">
              <button type="button" class="qc-row-delete" data-qc-delete="${row.id}" title="Xóa dòng xuất hàng" ${dis}><i data-lucide="trash-2"></i></button>
            </td>
          </tr>`;
      }).join('');
    }

    // Dòng tổng cộng
    const total = rows.reduce((a, r) => a + (Number(r.qty) || 0), 0);
    const tfoot = document.getElementById('qc-table-foot');
    if (tfoot) {
      tfoot.innerHTML = `<tr class="qc-total-row">
        <td colspan="2"><i data-lucide="sigma" style="width:13px;height:13px;"></i> Tổng số lượng xuất</td>
        <td class="text-right"><strong>${total.toLocaleString('vi-VN')}</strong></td>
        <td colspan="2"></td>
      </tr>`;
    }
  }

  // Cập nhật dòng tổng mà không vẽ lại bảng (giữ focus khi đang gõ)
  function refreshQcTotal() {
    const total = (state.qcExports || []).reduce((a, r) => a + (Number(r.qty) || 0), 0);
    const footCell = document.querySelector('#qc-table-foot .qc-total-row td strong');
    if (footCell) footCell.textContent = total.toLocaleString('vi-VN');
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
    refreshQcTotal();
  }

  function deleteQcExport(id) {
    if (!requireEditPermission()) return;
    const row = (state.qcExports || []).find(q => q.id === id);
    if (!row) return;
    if (!confirm(`Xóa dòng xuất hàng "${qcRowName(row)}" (${row.week || 'chưa chọn tuần'})?`)) return;
    state.qcExports = state.qcExports.filter(q => q.id !== id);
    saveQcExports();
    renderQcTable();
    initLucide();
    showToast('Đã xóa dòng xuất hàng', 'info');
  }

  // Điền nhanh: áp dụng năm + tuần đang chọn cho TOÀN BỘ danh sách
  function applyQcWeekToAll() {
    if (!requireEditPermission()) return;
    const rows = state.qcExports || [];
    if (!rows.length) { showToast('Chưa có dòng nào để điền tuần!', 'error'); return; }
    const weekSel = document.getElementById('qc-quick-week');
    const yearSel = document.getElementById('qc-quick-year');
    const weekNum = parseInt(weekSel?.value, 10) || 0;
    const yearNum = parseInt(yearSel?.value, 10) || qcCurrentYear();
    if (!weekNum) { showToast('Vui lòng chọn tuần cần điền!', 'error'); return; }
    rows.forEach(r => { r.week = `Tuần ${weekNum}`; r.year = yearNum; r.updatedAt = new Date().toISOString(); });
    saveQcExports();
    renderQcTable();
    initLucide();
    showToast(`Đã điền Tuần ${weekNum} (Năm ${yearNum}) cho ${rows.length} dòng!`, 'success');
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
    initLucide();
    showToast('Đã thêm dòng xuất hàng!', 'success');
  }

export {
  applyQcWeekToAll,
  closeQcExportModal,
  deleteQcExport,
  handleQcExportSubmit,
  loadQcExports,
  onQcProductChange,
  openQcExportModal,
  renderQcTable,
  renderQcView,
  saveQcExports,
  updateQcExportRow
};
