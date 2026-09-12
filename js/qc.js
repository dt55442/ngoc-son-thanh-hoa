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
    renderQcSearch(); // giữ kết quả tìm kiếm theo từ khóa đang gõ
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
    initLucide();
    showToast(`Đã tạo ${picked.length} dòng xuất (tổng ${totalQty.toLocaleString('vi-VN')} tấm) — Tuần ${weekNum}/${yearVal}!`, 'success');
  }

  // ─── TÌM KIẾM LỊCH SỬ XUẤT HÀNG SẢN PHẨM ─────────────────────
  // Gộp các dòng xuất THEO TÊN sản phẩm: tổng số lượng + thể tích quy đổi.
  function qcStripForSearch(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/\s+/g, ' ').trim();
  }
  function renderQcSearch() {
    const box = document.getElementById('qc-search-results');
    if (!box) return;
    const qRaw = String(document.getElementById('qc-search-input')?.value || '').trim();
    const rows = state.qcExports || [];
    if (!rows.length) {
      box.innerHTML = `<div class="text-muted" style="padding:10px 16px; font-size:0.8rem;">Chưa có dòng xuất hàng nào.</div>`;
      return;
    }
    if (!qRaw) {
      box.innerHTML = `<div class="text-muted" style="padding:10px 16px; font-size:0.8rem;">Gõ tên sản phẩm (một phần cũng được) để xem tổng hợp lịch sử xuất hàng.</div>`;
      return;
    }
    const q = qcStripForSearch(qRaw);
    const groups = {};
    rows.forEach(r => {
      const name = qcRowName(r);
      const g = groups[qcStripForSearch(name)] || (groups[qcStripForSearch(name)] = { name, rows: [] });
      g.rows.push(r);
    });
    const totalOf = g => g.rows.reduce((s, r) => s + (Number(r.qty) || 0), 0);
    const matches = Object.values(groups).filter(g => qcStripForSearch(g.name).includes(q))
      .sort((a, b) => totalOf(b) - totalOf(a));
    if (!matches.length) {
      box.innerHTML = `<div class="text-muted" style="padding:12px 16px; font-size:0.82rem;">Không tìm thấy sản phẩm nào khớp "<strong>${escapeHTML(qRaw)}</strong>" trong lịch sử xuất hàng.</div>`;
      return;
    }
    box.innerHTML = matches.map(g => {
      const totalQty = totalOf(g);
      const totalVol = g.rows.reduce((s, r) => s + qcRowVolume(r), 0);
      const weeks = [...new Set(g.rows.map(r => `${r.week || '—'}/${r.year || qcCurrentYear()}`))].sort((a, b) => a.localeCompare(b, 'vi', { numeric: true }));
      const latest = [...g.rows].sort((a, b) => String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || '')))[0];
      return `<div class="qc-search-item">
        <div class="qc-search-head">
          <div class="qc-product-name">${escapeHTML(g.name)}</div>
          <span class="qc-search-chip" title="Số dòng xuất">${g.rows.length} dòng</span>
        </div>
        <div class="qc-search-stats">
          <span class="qc-search-stat" title="Tổng số lượng đã xuất"><i data-lucide="package"></i> Tổng SL: <strong>${totalQty.toLocaleString('vi-VN')}</strong> tấm</span>
          <span class="qc-search-stat" title="Tổng thể tích quy đổi"><i data-lucide="boxes"></i> Tổng thể tích: <strong>${totalVol > 0 ? totalVol.toLocaleString('vi-VN', { maximumFractionDigits: 4 }) + ' m³' : '—'}</strong></span>
          <span class="qc-search-stat" title="Tuần đã xuất"><i data-lucide="calendar-range"></i> ${weeks.length > 4 ? `${weeks.slice(0, 4).join(', ')} +${weeks.length - 4}` : weeks.join(', ')}</span>
          <span class="qc-search-stat" title="Lần xuất gần nhất"><i data-lucide="clock"></i> Gần nhất: ${latest?.week || '—'}/${latest?.year || qcCurrentYear()} — ${(Number(latest?.qty) || 0).toLocaleString('vi-VN')} tấm</span>
        </div>
        <details class="qc-search-detail">
          <summary>Xem ${g.rows.length} dòng chi tiết</summary>
          <table class="qc-search-mini-table">
            <thead><tr><th>Tuần</th><th class="text-right">Số Lượng</th><th class="text-right">Thể Tích</th><th>Ghi Chú</th></tr></thead>
            <tbody>${[...g.rows].sort((a, b) => (parseWeekNum(b.week) || 0) - (parseWeekNum(a.week) || 0)).map(r => `<tr>
              <td>${escapeHTML(r.week || '—')}/${r.year || qcCurrentYear()}</td>
              <td class="text-right">${(Number(r.qty) || 0).toLocaleString('vi-VN')}</td>
              <td class="text-right">${qcFmtVol(qcRowVolume(r))}</td>
              <td>${escapeHTML(r.note || '—')}</td>
            </tr>`).join('')}</tbody>
          </table>
        </details>
      </div>`;
    }).join('');
    initLucide();
  }

export {
  closeQcExportModal,
  deleteQcExport,
  handleQcExportSubmit,
  hideQcCustomName,
  loadQcExports,
  onQcProductChange,
  openQcExportModal,
  qcImpAddCustom,
  qcImpFooterInfo,
  qcImpLoadPlan,
  qcImpRemoveRow,
  qcRowVolume,
  renderQcImpRows,
  renderQcSearch,
  renderQcSummary,
  renderQcTable,
  renderQcView,
  saveQcExports,
  showQcCustomName,
  updateQcExportRow
};
