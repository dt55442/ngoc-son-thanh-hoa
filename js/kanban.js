// ═══════════════════════════════════════════════════════════
// js/kanban.js — tách từ app.js (refactor ES-modules phase 1)
// ═══════════════════════════════════════════════════════════
import { deleteBatch, openTransferModal } from './batch-modals.js';
import { batchMatchesColumnFilter, getFilteredBatches, renderQuickStats } from './main.js';
import { STAGES, state } from './state.js';
import { escapeHTML, formatDateDDMMYY, getBatchStageHistory, getHistoryEntryDays, getStageDaysClass, getStageDaysLabel, showToast } from './utils.js';

  // ─── KANBAN BOARD ─────────────────────────────────────────────
  function renderKanbanBoard(batches) {
    const containers = {
      say1:     document.getElementById('cards-say1'),
      say2:     document.getElementById('cards-say2'),
      kho:      document.getElementById('cards-kho'),
      bao_tinh: document.getElementById('cards-bao-tinh')
    };
    const metrics = {
      say1:     { count: 0, vol: 0, qty: 0 },
      say2:     { count: 0, vol: 0, qty: 0 },
      kho:      { count: 0, vol: 0, qty: 0 },
      bao_tinh: { count: 0, vol: 0, qty: 0 }
    };

    Object.values(containers).forEach(el => { if (el) el.innerHTML = ''; });

    batches.forEach(batch => {
      const st = batch.stage;
      if (!metrics[st]) return;
      // Áp dụng bộ lọc riêng của cột công đoạn này
      if (!batchMatchesColumnFilter(batch, st)) return;
      metrics[st].count++;
      metrics[st].vol += (batch.volume || 0);
      metrics[st].qty += (batch.quantity || 0);
      if (containers[st]) containers[st].appendChild(createBambooCardElement(batch));
    });

    Object.keys(metrics).forEach(st => {
      const m = metrics[st];
      const key = st.replace('_', '-');
      const el = id => document.getElementById(id);
      if (el(`count-${key}`))  el(`count-${key}`).textContent  = m.count;
      if (el(`vol-${key}`))    el(`vol-${key}`).textContent    = `${m.vol.toFixed(3)} m³`;
      if (el(`qty-${key}`))    el(`qty-${key}`).textContent    = `${m.qty.toLocaleString('vi-VN')} thanh`;
      if (el(`badge-${key}`))  el(`badge-${key}`).textContent  = m.count;

      if (m.count === 0 && containers[st]) {
        containers[st].innerHTML = `<div class="empty-state"><i data-lucide="inbox"></i><p>Không có lô nan ở công đoạn này</p></div>`;
      }
    });

    // Cập nhật danh sách lựa chọn trong dropdown của từng cột
    renderColumnFilterOptions(batches);
    updateColumnFilterCounts();
  }

  // ─── BỘ LỌC TỪNG CỘT KANBAN ─────────────────────────────────
  // Điền các lựa chọn (Ngày / Vị trí / Kích thước / Số lượng) có trong mỗi cột
  function renderColumnFilterOptions(allBatches) {
    Object.keys(state.columnFilters).forEach(stage => {
      const stageBatches = allBatches.filter(b => b.stage === stage);
      const dates = [...new Set(stageBatches.map(b => b.date).filter(Boolean))].sort().reverse();
      const locations = [...new Set(stageBatches.map(b => b.location).filter(Boolean))].sort();
      const dims = [...new Set(stageBatches.map(b => `${b.length}×${b.width}×${b.thickness}`))].sort();
      const qtys = [...new Set(stageBatches.map(b => (b.quantity ?? '') !== '' ? String(b.quantity) : '').filter(Boolean))]
        .sort((a, b) => (Number(a) || 0) - (Number(b) || 0));

      const colFilter = state.columnFilters[stage];
      fillFilterOptions(`col-filter-dates-${stage}`, dates, 'date', colFilter.dates, stage);
      fillFilterOptions(`col-filter-locations-${stage}`, locations, 'location', colFilter.locations, stage);
      fillFilterOptions(`col-filter-dims-${stage}`, dims, 'dimension', colFilter.dimensions, stage);
      fillFilterOptions(`col-filter-qtys-${stage}`, qtys, 'quantity', colFilter.quantities, stage);
    });
  }

  // ─── TÌM KIẾM GỢI Ý TRONG BỘ LỌC CỘT ────────────────────────
  // Từ khóa tìm kiếm hiện tại của từng cột (chỉ là trạng thái UI, không lưu DB)
  const columnSearchQueries = { say1: '', say2: '', kho: '', bao_tinh: '' };

  // Bảng gập dấu tiếng Việt về chữ gốc (1 ký tự → 1 ký tự để giữ nguyên độ
  // dài chuỗi, từ đó map được vị trí khớp khi tô sáng gợi ý)
  const VIET_FOLD_MAP = {
    'à':'a','á':'a','ả':'a','ã':'a','ạ':'a','ă':'a','ằ':'a','ắ':'a','ẳ':'a','ẵ':'a','ặ':'a',
    'â':'a','ầ':'a','ấ':'a','ẩ':'a','ẫ':'a','ậ':'a',
    'è':'e','é':'e','ẻ':'e','ẽ':'e','ẹ':'e','ê':'e','ề':'e','ế':'e','ể':'e','ễ':'e','ệ':'e',
    'ì':'i','í':'i','ỉ':'i','ĩ':'i','ị':'i',
    'ò':'o','ó':'o','ỏ':'o','õ':'o','ọ':'o','ô':'o','ồ':'o','ố':'o','ổ':'o','ỗ':'o','ộ':'o',
    'ơ':'o','ờ':'o','ớ':'o','ở':'o','ỡ':'o','ợ':'o',
    'ù':'u','ú':'u','ủ':'u','ũ':'u','ụ':'u','ư':'u','ừ':'u','ứ':'u','ử':'u','ữ':'u','ự':'u',
    'ỳ':'y','ý':'y','ỷ':'y','ỹ':'y','ỵ':'y','đ':'d'
  };

  // Chuẩn hóa từ khóa / giá trị: thường hóa, "×" ↔ "x" (kích thước nan),
  // gập dấu tiếng Việt ("lò sấy" ↔ "lo say")
  function foldSearchText(s) {
    return String(s ?? '')
      .toLowerCase()
      .replace(/×/g, 'x')
      .replace(/[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/g, ch => VIET_FOLD_MAP[ch] || ch);
  }

  // Kiểm tra một lựa chọn có khớp từ khóa tìm kiếm không
  // (khớp trên cả giá trị thô lẫn nhãn hiển thị, ví dụ "2026-08-10" ↔ "10/08/26")
  function searchMatches(raw, display, query) {
    const q = foldSearchText(query).trim();
    if (!q) return true;
    return foldSearchText(display).includes(q) || foldSearchText(raw).includes(q);
  }

  // Tô sáng phần khớp từ khóa trong nhãn hiển thị gợi ý
  function highlightSearchMatch(display, query) {
    const label = String(display ?? '');
    const q = foldSearchText(query).trim();
    if (!q) return escapeHTML(label);
    const idx = foldSearchText(label).indexOf(q);
    if (idx === -1) return escapeHTML(label);
    return escapeHTML(label.slice(0, idx)) +
      `<mark class="col-search-hl">${escapeHTML(label.slice(idx, idx + q.length))}</mark>` +
      escapeHTML(label.slice(idx + q.length));
  }

  function fillFilterOptions(containerId, values, type, selectedValues, stage) {
    const container = document.getElementById(containerId);
    if (!container) return;
    if (!values || values.length === 0) {
      container.innerHTML = '<div style="font-size:0.75rem;color:var(--text-muted);padding:4px 0;">Không có dữ liệu</div>';
      return;
    }
    const query = columnSearchQueries[stage] || '';
    // Khi đang gõ từ khóa: chỉ giữ lại các gợi ý khớp để người dùng chọn nhanh
    const visible = query
      ? values.filter(v => {
          const display = type === 'date' ? formatDateDDMMYY(v) : String(v);
          return searchMatches(String(v), display, query);
        })
      : values;
    if (visible.length === 0) {
      container.innerHTML = `<div class="filter-no-result">Không có gợi ý khớp "${escapeHTML(query.trim())}"</div>`;
      return;
    }
    container.innerHTML = visible.map(v => {
      const display = type === 'date' ? formatDateDDMMYY(v) : String(v);
      const checked = selectedValues.includes(v) ? 'checked' : '';
      return `
        <label class="filter-option">
          <input type="checkbox" data-col-stage="${stage}" data-col-type="${type}" data-col-value="${escapeHTML(v)}" ${checked} onchange="app.onColumnFilterChange(this)">
          <span>${highlightSearchMatch(display, query)}</span>
        </label>`;
    }).join('');
  }

  // Tổng hợp các lô còn hiển thị trên toàn bộ Kanban sau khi áp dụng lọc từng cột
  function getKanbanVisibleBatches() {
    const source = getFilteredBatches();
    return source.filter(b => batchMatchesColumnFilter(b, b.stage));
  }

  // Khi người dùng tick/bỏ tick một lựa chọn lọc
  function onColumnFilterChange(checkbox) {
    const stage = checkbox.getAttribute('data-col-stage');
    const type  = checkbox.getAttribute('data-col-type');
    const value = checkbox.getAttribute('data-col-value');
    const colFilter = state.columnFilters[stage];
    if (!colFilter) return;
    const listKey = type === 'date' ? 'dates' : (type === 'location' ? 'locations' : (type === 'quantity' ? 'quantities' : 'dimensions'));
    const arr = colFilter[listKey] || [];
    const idx = arr.indexOf(value);
    if (checkbox.checked && idx === -1) arr.push(value);
    if (!checkbox.checked && idx !== -1) arr.splice(idx, 1);
    colFilter[listKey] = arr;
    updateColumnFilterCounts();
    const visible = getKanbanVisibleBatches();
    renderQuickStats(visible);
    renderKanbanBoard(visible);
  }

  // Hiển thị số lượng bộ lọc đang áp dụng trên nút của mỗi cột
  function updateColumnFilterCounts() {
    Object.keys(state.columnFilters).forEach(stage => {
      const colFilter = state.columnFilters[stage];
      const total = (colFilter.dates?.length || 0) + (colFilter.locations?.length || 0) + (colFilter.dimensions?.length || 0) + (colFilter.quantities?.length || 0);
      const countEl = document.getElementById(`col-filter-count-${stage}`);
      const btn = document.querySelector(`[data-stage-col="${stage}"] .column-filter-btn`);
      if (countEl) {
        countEl.textContent = total > 0 ? total : '';
        countEl.classList.toggle('show', total > 0);
      }
      if (btn) btn.classList.toggle('active', total > 0);
    });
  }

  // Reset ô tìm kiếm gợi ý của một cột (xóa từ khóa + giao diện input, không render lại)
  function resetColumnSearchUI(stage) {
    columnSearchQueries[stage] = '';
    const input = document.getElementById(`col-search-${stage}`);
    if (input) input.value = '';
    const clearBtn = document.getElementById(`col-search-clear-${stage}`);
    if (clearBtn) clearBtn.classList.add('hidden');
  }

  // Xóa từ khóa tìm kiếm của một cột và dựng lại toàn bộ danh sách gợi ý
  function clearColumnSearch(stage) {
    resetColumnSearchUI(stage);
    renderColumnFilterOptions(getFilteredBatches());
  }

  // Đóng tất cả dropdown lọc cột (kèm reset ô tìm kiếm gợi ý)
  function closeColumnFilters() {
    document.querySelectorAll('.column-filter-dropdown').forEach(d => d.classList.add('hidden'));
    Object.keys(columnSearchQueries).forEach(resetColumnSearchUI);
    renderColumnFilterOptions(getFilteredBatches());
  }

  // Đóng dropdown lọc của một cột (nút OK)
  function closeColumnFilter(stage) {
    const dropdown = document.getElementById(`col-filter-dropdown-${stage}`);
    if (dropdown) dropdown.classList.add('hidden');
    resetColumnSearchUI(stage);
    renderColumnFilterOptions(getFilteredBatches());
  }

  // Mở / đóng dropdown lọc của một cột
  function toggleColumnFilter(stage) {
    // Đóng tất cả dropdown khác
    closeColumnFilters();
    const dropdown = document.getElementById(`col-filter-dropdown-${stage}`);
    if (dropdown) dropdown.classList.toggle('hidden');
  }

  // ─── Ô TÌM KIẾM GỢI Ý CẠNH NÚT LỌC CỘT ─────────────────────
  // Focus vào ô tìm kiếm => tự động mở dropdown gợi ý của cột đó
  function onColumnSearchFocus(stage) {
    const dropdown = document.getElementById(`col-filter-dropdown-${stage}`);
    if (dropdown && dropdown.classList.contains('hidden')) {
      closeColumnFilters();
      dropdown.classList.remove('hidden');
    }
  }

  // Gõ vào ô tìm kiếm => lọc gợi ý theo từ khóa trên cả 4 nhóm:
  // Ngày (vd "08/26"), Vị trí (vd "LS1"), Kích thước nan (vd "x18"), Số lượng (vd "2016")
  function onColumnSearchInput(stage, value) {
    columnSearchQueries[stage] = String(value ?? '');
    const dropdown = document.getElementById(`col-filter-dropdown-${stage}`);
    if (dropdown) dropdown.classList.remove('hidden');
    const clearBtn = document.getElementById(`col-search-clear-${stage}`);
    if (clearBtn) clearBtn.classList.toggle('hidden', columnSearchQueries[stage] === '');
    renderColumnFilterOptions(getFilteredBatches());
  }

  // Bàn phím trong ô tìm kiếm: Esc = xóa từ khóa + đóng, Enter = chặn submit ngoài ý muốn
  function onColumnSearchKeydown(event, stage) {
    if (!event) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      clearColumnSearch(stage);
      closeColumnFilter(stage);
      if (event.target && typeof event.target.blur === 'function') event.target.blur();
    } else if (event.key === 'Enter') {
      event.preventDefault();
    }
  }

  // Xóa toàn bộ bộ lọc của một cột
  function clearColumnFilter(stage) {
    state.columnFilters[stage] = { dates: [], locations: [], dimensions: [], quantities: [] };
    const dropdown = document.getElementById(`col-filter-dropdown-${stage}`);
    if (dropdown) dropdown.classList.add('hidden');
    resetColumnSearchUI(stage);
    updateColumnFilterCounts();
    const visible = getKanbanVisibleBatches();
    renderQuickStats(visible);
    renderKanbanBoard(visible);
    showToast('Đã xóa bộ lọc cột!', 'info');
  }

  function createBambooCardElement(batch) {
    const card = document.createElement('div');
    card.className = 'bamboo-card';
    card.setAttribute('data-id', batch.id);
    if (state.multiTransferMode && state.multiSelectedIds.includes(batch.id)) {
      card.classList.add('selected');
    }

    const nextStage = STAGES[batch.stage]?.next;
    const nextName  = nextStage ? STAGES[nextStage].short : 'Hoàn thành';

    // Hiển thị badge ngày cho từng công đoạn đã đi qua (Bào Tinh không đếm ngày)
    const history = getBatchStageHistory(batch);
    const daysBadgesHtml = history
      .map((h, idx) => {
        if (h.stage === 'bao_tinh') return '';
        const days = getHistoryEntryDays(history, idx);
        const cls  = getStageDaysClass(h.stage, days);
        const label = getStageDaysLabel(h.date, history[idx + 1]?.date);
        return `<div class="stage-days-badge ${cls}">
          <i data-lucide="timer"></i> <span>${label} tại ${escapeHTML(STAGES[h.stage]?.short || h.stage)}</span>
        </div>`;
      })
      .join('');

    card.innerHTML = `
      <div class="batch-check" title="Đánh dấu chọn lô"><i data-lucide="check"></i></div>
      <div class="card-top">
        <div class="batch-code"><i data-lucide="box"></i> ${escapeHTML(batch.code)}</div>
        <span class="week-pill">${escapeHTML(batch.week)} (${formatDateDDMMYY(batch.date)})</span>
      </div>
      <div class="stage-days-list">${daysBadgesHtml}</div>
      <div class="card-dimensions">
        <span class="dim-spec">${batch.length} × ${batch.width} × ${batch.thickness} mm</span>
        <span class="card-volume">${(batch.volume || 0).toFixed(4)} m³</span>
      </div>
      <div class="card-quantities">
        <div class="qty-box">
          <span class="label">Số lượng</span>
          <span class="val">${(batch.quantity || 0).toLocaleString('vi-VN')} <small>thanh</small></span>
        </div>
        <div class="qty-box">
          <span class="label">Vị trí</span>
          <span class="val" style="font-size:0.82rem; color:#1e293b;">${escapeHTML(batch.location || 'Kho')}</span>
        </div>
      </div>
      <div class="card-tags">
        <span class="tag-badge tag-type-${batch.bambooType}">Loại ${escapeHTML(batch.bambooType)}</span>
        <span class="tag-badge tag-use-${batch.useFor}">${escapeHTML(batch.useFor)}</span>
        <span class="tag-badge tag-location"><i data-lucide="map-pin" style="width:10px;height:10px;"></i> ${escapeHTML(batch.location || 'Chưa xếp')}</span>
      </div>
      ${batch.notes ? `<div class="card-notes"><i data-lucide="info" style="width:12px;height:12px;display:inline;"></i> ${escapeHTML(batch.notes)}</div>` : ''}
      <div class="card-actions">
        <button class="btn btn-transfer btn-sm" onclick="app.openTransferModal('${batch.id}')">
          <i data-lucide="arrow-right-left"></i> Chuyển Công Đoạn ${nextStage ? `(${nextName})` : ''}
        </button>
        <div class="card-tools">
          <button class="btn btn-outline btn-icon btn-sm" onclick="app.openEditModal('${batch.id}')" title="Sửa thẻ"><i data-lucide="edit-3"></i></button>
          <button class="btn btn-outline btn-icon btn-sm" onclick="app.deleteBatch('${batch.id}')" title="Xóa thẻ" style="color:var(--danger);"><i data-lucide="trash-2"></i></button>
        </div>
      </div>`;
    return card;
  }

export {
  clearColumnFilter,
  clearColumnSearch,
  closeColumnFilter,
  closeColumnFilters,
  createBambooCardElement,
  fillFilterOptions,
  getKanbanVisibleBatches,
  onColumnFilterChange,
  onColumnSearchFocus,
  onColumnSearchInput,
  onColumnSearchKeydown,
  renderColumnFilterOptions,
  renderKanbanBoard,
  toggleColumnFilter,
  updateColumnFilterCounts
};
