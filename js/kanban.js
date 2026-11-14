// ═══════════════════════════════════════════════════════════
// js/kanban.js — tách từ app.js (refactor ES-modules phase 1)
// ═══════════════════════════════════════════════════════════
import { deleteBatch } from './batch-modals.js';
import { batchMatchesColumnFilter, getFilteredBatches, markKanbanPainted } from './main.js';
import { STAGES, STORAGE_KEY_KANBAN_DENSITY, state } from './state.js';
import { canEditTab } from './permissions.js';
import { escapeHTML, formatDateDDMMYY, getBatchStageHistory, getHistoryEntryDays, getStageDaysClass, getStageDaysLabel, showToast, khoLotRemainingOf, khoOutRoundCountOf, khoStockSummary, khoVisibilityMap } from './utils.js';

  // ─── CHẾ ĐỘ XEM KANBAN: THẺ GỌN ⇄ BẢNG DÀY ĐẶC (11/2026) ────
  // Cột đông lô (VD Kho 97 + ẩn 194) xem thẻ lớn rất khó quét mắt → thêm chế
  // độ "Bảng" mỗi cột 1 bảng dày đặc (Mã · KT · SL · m³ · Vị trí · Ngày).
  // Trạng thái thuần UI theo MÁY (bamboo_tracker_kanban_density_v1) — KHÔNG
  // đồng bộ mây/backup, giống STORAGE_KEY_PV_CHART_MODE.
  function kanbanDensityOf() {
    return state.kanbanDensity === 'table' ? 'table' : 'cards';
  }
  function loadKanbanDensity() {
    try {
      const v = localStorage.getItem(STORAGE_KEY_KANBAN_DENSITY);
      state.kanbanDensity = v === 'table' ? 'table' : 'cards';
    } catch (e) { /* localStorage có thể bị chặn — giữ mặc định 'cards' */ }
    syncKanbanDensityBtn();
    return state.kanbanDensity;
  }
  function saveKanbanDensity() {
    try { localStorage.setItem(STORAGE_KEY_KANBAN_DENSITY, kanbanDensityOf()); } catch (e) { /* bỏ qua */ }
  }
  // Cập nhật nhãn/nút công tắc trên thanh công cụ Kanban (id giữ nguyên khi vẽ lại)
  function syncKanbanDensityBtn() {
    const btn = document.getElementById('btn-kanban-density');
    if (!btn) return;
    const isTable = kanbanDensityOf() === 'table';
    const lbl = btn.querySelector('.kb-density-label');
    if (lbl) lbl.textContent = isTable ? 'Bảng' : 'Thẻ';
    btn.title = isTable
      ? 'Đang xem dạng BẢNG dày đặc — bấm để chuyển về THẺ LÔ gọn 2 dòng'
      : 'Đang xem dạng THẺ LÔ gọn 2 dòng — bấm để chuyển sang BẢNG dày đặc (hợp cột đông lô)';
    btn.classList.toggle('active', isTable);
    btn.setAttribute('aria-pressed', isTable ? 'true' : 'false');
  }
  // Đổi chế độ xem + vẽ lại bảng Kanban (nút #btn-kanban-density trên thanh công cụ)
  function toggleKanbanDensity() {
    state.kanbanDensity = kanbanDensityOf() === 'table' ? 'cards' : 'table';
    saveKanbanDensity();
    syncKanbanDensityBtn();
    renderKanbanBoard(getFilteredBatches());
    showToast(kanbanDensityOf() === 'table' ? 'Đã chuyển sang chế độ BẢNG dày đặc.' : 'Đã chuyển về chế độ THẺ LÔ.', 'info');
  }


  // ─── KANBAN BOARD ─────────────────────────────────────────────
  function renderKanbanBoard(batches) {
    const containers = {
      say1:     document.getElementById('cards-say1'),
      say2:     document.getElementById('cards-say2'),
      kho:      document.getElementById('cards-kho')
    };
    const metrics = {
      say1:     { count: 0, vol: 0, qty: 0 },
      say2:     { count: 0, vol: 0, qty: 0 },
      kho:      { count: 0, vol: 0, qty: 0 }
    };

    Object.values(containers).forEach(el => { if (el) el.innerHTML = ''; });

    // KHO NAN: tồn THỰC = (số lần nhập kho × số lượng) − phiếu xuất ĐÃ DUYỆT
    // (js/utils.js). Lô đã xuất hết (tồn 0) ẨN mặc định — tránh tưởng 1 lô ra/vào
    // kho nhiều lần là nhiều lô; công tắc "Hiện lô đã xuất hết" ở thẻ Kho Nan.
    const khoVis = khoVisibilityMap();
    const khoSum = khoStockSummary();
    // Chế độ xem: 'cards' = thẻ lô gọn 2 dòng | 'table' = bảng dày đặc mỗi cột
    const tableMode = kanbanDensityOf() === 'table';
    const rowsByStage = { say1: [], say2: [], kho: [] };

    batches.forEach(batch => {
      const st = batch.stage;
      if (!metrics[st]) return;
      // Áp dụng bộ lọc riêng của cột công đoạn này
      if (!batchMatchesColumnFilter(batch, st)) return;
      if (st === 'kho' && khoVis.hide.has(batch.id)) return; // lô đã xuất hết → ẨN
      metrics[st].count++;
      if (st === 'kho') {
        const rem = khoVis.remain.get(batch.id) || 0;
        metrics[st].qty += rem;
        metrics[st].vol += (Number(batch.quantity) || 0)
          ? (batch.volume || 0) * (rem / (Number(batch.quantity) || 0))
          : 0;
      } else {
        metrics[st].vol += (batch.volume || 0);
        metrics[st].qty += (batch.quantity || 0);
      }
      rowsByStage[st].push(batch);
    });

    Object.keys(metrics).forEach(st => {
      const m = metrics[st];
      const key = st.replace('_', '-');
      const el = id => document.getElementById(id);
      if (el(`count-${key}`))  el(`count-${key}`).textContent  = m.count;
      if (el(`vol-${key}`))    el(`vol-${key}`).textContent    = `${m.vol.toFixed(3)} m³`;
      if (el(`qty-${key}`)) {
        // Cột Kho: hiện TỒN THỰC + số lô đã xuất hết (ẩn/đang hiện theo công tắc)
        if (st === 'kho' && khoSum) {
          const hiddenTxt = state.khoShowUsed
            ? `${khoSum.usedUpLots} lô đã xuất hết (đang hiện)`
            : `ẩn ${khoSum.usedUpLots} lô đã xuất hết`;
          el(`qty-${key}`).textContent = `${Math.round(khoSum.remainingThanh).toLocaleString('vi-VN')} thanh (còn) · ${hiddenTxt}`;
        } else {
          el(`qty-${key}`).textContent = `${m.qty.toLocaleString('vi-VN')} thanh`;
        }
      }
      if (el(`badge-${key}`))  el(`badge-${key}`).textContent  = m.count;

      if (m.count === 0 && containers[st]) {
        containers[st].innerHTML = `<div class="empty-state"><i data-lucide="inbox"></i><p>Không có lô nan ở công đoạn này</p></div>`;
      }
    });

    // Vẽ nội dung từng cột: THẺ LÔ gọn 2 dòng (mặc định) hoặc BẢNG dày đặc
    Object.keys(containers).forEach(st => {
      const el = containers[st];
      if (!el || !metrics[st] || metrics[st].count === 0) return;
      if (tableMode) {
        el.appendChild(kbTableElement(st, rowsByStage[st], khoVis));
      } else {
        rowsByStage[st].forEach(b => el.appendChild(createBambooCardElement(b)));
      }
    });
    if (tableMode) syncKanbanDensityBtn();

    // Cập nhật danh sách lựa chọn trong dropdown của từng cột
    renderColumnFilterOptions(batches);
    updateColumnFilterCounts();
    // Báo main.js: bảng đã vẽ xong → tắt cờ "cần vẽ lại" (switchView chỉ phá
    // + dựng lại hàng trăm thẻ lô khi THẬT SỰ có dữ liệu đổi — xem kanbanNeedsPaint)
    markKanbanPainted();
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
  const columnSearchQueries = { say1: '', say2: '', kho: '' };

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
    renderKanbanBoard(visible);
    showToast('Đã xóa bộ lọc cột!', 'info');
  }

  function createBambooCardElement(batch) {
    const card = document.createElement('div');
    // Viền TRÁI màu công đoạn (cam Sấy 1 / vàng Sấy 2 / xanh Kho) — thay khung
    // tre 26px từng thẻ lô (chỉ thẻ CHA "Than Hóa + Sấy" giữ khung tre).
    const stCls = batch.stage === 'say1' ? 'st-say1' : batch.stage === 'say2' ? 'st-say2' : 'st-kho';
    card.className = 'bamboo-card kanban-card-modern kb-compact ' + stCls;
    card.setAttribute('data-id', batch.id);
    if (batch.notes) card.title = batch.notes; // ghi chú lô xem nhanh bằng tooltip

    // Ô TÍCH CHỌN khi bật chế độ "Xóa Nhiều" (Admin) — ẩn bằng CSS khi chưa bật
    // chế độ; trạng thái checked lấy theo state.kanbanPicked để giữ nguyên sau
    // mỗi lần vẽ lại bảng (xóa loạt / lọc cột / chuyển tab quay lại).
    const isPicked = (state.kanbanPicked || []).includes(String(batch.id));
    const pickHtml = `
      <label class="kb-pick" title="Tích chọn lô này để xóa cùng loạt">
        <input type="checkbox" class="kb-pick-box" data-pick-id="${escapeHTML(String(batch.id))}"${isPicked ? ' checked' : ''}>
        <span>Chọn</span>
      </label>`;
    // Chip "LẦN THAN HÓA" (CHỈ ĐỌC) — lần vào công đoạn SẤY gần nhất của lô, lấy
    // qua window.app.x2SayChargeLabel (logic ở js/xuong2.js); lô cũ không có mã
    // mẻ hoặc chưa qua sấy → không hiện chip.
    const thLabel = (typeof window !== 'undefined' && window.app && typeof window.app.x2SayChargeLabel === 'function') ? window.app.x2SayChargeLabel(batch) : '';
    const thChip = thLabel ? `<span class="tag-badge tag-say-charge" title="Lần than hóa mà lô này đã qua — S1 = Sấy 1, S2 = Sấy 2 · mã mẻ gắn lúc bấm Lưu của form Thêm Lô Sấy Mới"><i data-lucide="flame" style="width:10px;height:10px;"></i> ${escapeHTML(thLabel)}</span>` : '';
        // Chip "ĐÃ BÀO X/Y THANH" (CHỈ ĐỌC) — số thanh lô đã ghi ở các lượt Bào Tinh;
        // lô ĐÃ BÀO HẾT sẽ KHÔNG hiện ở ô "Chọn Thanh" của thẻ Bào Tinh → chip giúp đối chiếu.
        // Lấy qua window.app.x2BaoTinhUsedLabel (logic js/xuong2.js) — tránh vòng import.
        const btLabel = (typeof window !== 'undefined' && window.app && typeof window.app.x2BaoTinhUsedLabel === 'function') ? window.app.x2BaoTinhUsedLabel(batch) : '';
        const btChip = btLabel ? `<span class="tag-badge tag-baotinh-used" title="Số thanh lô này đã ghi ở các lượt Bào Tinh — xem thẻ Bào Tinh"><i data-lucide="sparkles" style="width:10px;height:10px;"></i> ${escapeHTML(btLabel)}</span>` : '';
        // Chip "TÓP XỬ LÝ LẠI" — lô vào Kho dạng Tóp qua form Chuyển Kho (2 cột check):
        // VẪN nằm ở cột Kho nhưng mang cờ batch.topRework chờ xử lý tiếp.
        const topChip = (batch.stage === 'kho' && batch.topRework)
          ? `<span class="tag-badge tag-top-rework" title="Lô vào Kho dạng TÓP — cần xử lý lại trước khi dùng (chọn ở form Chuyển Kho)"><i data-lucide="alert-triangle" style="width:10px;height:10px;"></i> Tóp xử lý lại</span>` : '';
        // Chip "TRẠNG THÁI SẤY" — lô ở Kho gán khi thêm thủ công / nạp Excel:
        // S1 = đã qua Sấy 1 (cần sấy tiếp ở Sấy 2), S2 = đã qua Sấy 2 (ra sản xuất),
        // null/chưa sấy = lô mới nhập trực tiếp vào Kho (chưa biết)
        const dryStageLabelMap = { say1: 'Sấy 1', say2: 'Sấy 2', 'chua-say': 'Chưa sấy' };
        const dryStageClsMap = { say1: 'dry-say1', say2: 'dry-say2', 'chua-say': 'dry-chua' };
        const dryStageVal = batch.dryStage || 'chua-say';
        const dryChip = batch.stage === 'kho' && batch.dryStage
          ? `<span class="tag-badge ${dryStageClsMap[dryStageVal]}" title="Trạng thái sấy: ${dryStageLabelMap[dryStageVal]}"><i data-lucide="thermometer" style="width:10px;height:10px;"></i> ${dryStageLabelMap[dryStageVal]}</span>` : '';

    // Badge đếm ngày CÔNG ĐOẠN HIỆN TẠI (gọn 1 chip) — lịch sử đầy đủ các lần
    // qua công đoạn để trong tooltip khi rê chuột.
    const history = getBatchStageHistory(batch);
    const histTitle = history
      .map((h, idx) => {
        if (h.stage === 'bao_tinh') return '';
        const days = getHistoryEntryDays(history, idx);
        return `${STAGES[h.stage]?.short || h.stage}: ${days} ngày (từ ${formatDateDDMMYY(h.date)})`;
      })
      .filter(Boolean)
      .join('\n');
    let daysBadgeHtml = '';
    const lastIdx = history.length - 1;
    if (lastIdx >= 0 && history[lastIdx].stage !== 'bao_tinh') {
      const days = getHistoryEntryDays(history, lastIdx);
      const cls  = getStageDaysClass(history[lastIdx].stage, days);
      const label = getStageDaysLabel(history[lastIdx].date, undefined);
      daysBadgeHtml = `<span class="stage-days-badge kb-day ${cls}" title="${escapeHTML(histTitle || 'Lịch sử công đoạn của lô')}"><i data-lucide="timer"></i> ${label} tại ${escapeHTML(STAGES[history[lastIdx].stage]?.short || history[lastIdx].stage)}</span>`;
    }

    // Dòng TỒN KHO (chỉ lô ở cột Kho) — tồn THỰC = (số lần nhập kho × số lượng)
    // − phiếu xuất ĐÃ DUYỆT (js/utils.js); kèm số lần ra/vào kho.
    const khoRemainHtml = batch.stage === 'kho' ? `<span class="kho-card-remain" title="Tồn kho THỰC = (số lần nhập kho × số lượng) − phiếu xuất ĐÃ DUYỆT (js/utils.js)">Tồn <strong>${khoLotRemainingOf(batch).toLocaleString('vi-VN')}</strong>/${(batch.quantity || 0).toLocaleString('vi-VN')}${khoOutRoundCountOf(batch) ? ` · <span class="kho-round-badge" title="Số lần lô RA khỏi kho (Sấy 2) rồi NHẬP lại — không phải nhiều lô">ra/vào ${khoOutRoundCountOf(batch)} lần</span>` : ''}</span>` : '';

    // THẺ GỌN 2 DÒNG:
    //   Dòng 1 = Mã lô · chip Loại · chip Dùng cho · chip TH/Đã bào/Tóp · badge ngày · tuần (ngày)
    //   Dòng 2 = KT mm · SL thanh · m³ · vị trí · (tồn kho) · nút sửa/xóa (hover)
    card.innerHTML = `
      ${pickHtml}
      <div class="kb-row1">
        <span class="batch-code-modern kb-code"><i data-lucide="box"></i> ${escapeHTML(batch.code)}</span>
        <span class="tag-badge tag-type-${batch.bambooType} stage-chip" title="Phân loại nan">Loại ${escapeHTML(batch.bambooType)}</span>
        <span class="tag-badge tag-use-${batch.useFor} stage-chip" title="Dùng cho">${escapeHTML(batch.useFor)}</span>
        ${thChip}${btChip}${topChip}${dryChip}
        ${daysBadgeHtml}
        <span class="week-pill kb-week" title="Tuần kế hoạch · ngày tạo lô">${escapeHTML(batch.week)} · ${formatDateDDMMYY(batch.date)}</span>
      </div>
      <div class="kb-row2">
        <span class="kb-dim" title="Kích thước nan (Dài × Rộng × Dày mm)">${batch.length}×${batch.width}×${batch.thickness}</span>
        <span class="kb-qty"><b class="qty-num">${(batch.quantity || 0).toLocaleString('vi-VN')}</b> thanh</span>
        <span class="kb-vol" title="Thể tích quy đổi">${(batch.volume || 0).toFixed(4)} m³</span>
        <span class="kb-loc" title="Vị trí xếp trong công đoạn"><i data-lucide="map-pin"></i> ${escapeHTML(batch.location || 'Kho')}</span>
        ${khoRemainHtml}
        <span class="card-actions card-actions-modern" data-perm="x2">
          <span class="card-tools">
            <button class="btn btn-outline btn-icon btn-sm" onclick="app.openEditModal('${batch.id}')" title="Sửa thẻ"><i data-lucide="edit-3"></i></button>
            <button class="btn btn-outline btn-icon btn-sm" onclick="app.deleteBatch('${batch.id}')" title="Xóa thẻ" style="color:var(--danger);"><i data-lucide="trash-2"></i></button>
          </span>
        </span>
      </div>`;
    return card;
  }

  // ─── CHẾ ĐỘ "BẢNG" — bảng dày đặc cho CỘT ĐÔNG LÔ (11/2026) ──
  // Mỗi cột Kanban 1 bảng: Mã · KT · SL · m³ · Vị trí · Ngày · chips; bấm hàng
  // = sửa thẻ (như nút bút chì của thẻ lô). Vẫn đi qua đủ bộ lọc cột + ẩn lô
  // Kho đã xuất hết (khoVisibilityMap) nên số liệu LUÔN khớp chế độ thẻ.
  function kbTableElement(stage, rows, khoVis) {
    const wrap = document.createElement('div');
    wrap.className = 'kb-table-wrap';
    const canEdit = canEditTab('x2');
    const showKhoCol = stage === 'kho';
    const head = `<thead><tr>
        <th>Mã lô</th>
        <th class="ta-r">KT (mm)</th>
        <th class="ta-r">SL</th>
        <th class="ta-r">m³</th>
        <th>Vị trí</th>
        <th>Ngày</th>
        <th>Loại</th>
        <th>Dùng cho</th>
        <th>Trạng thái sấy</th>
        <th>Ghi chú</th>
        ${showKhoCol ? '<th class="ta-r">Tồn</th>' : ''}
        ${canEdit ? '<th class="ta-c">TT</th>' : ''}
      </tr></thead>`;
    const body = rows.map(b => {
      const thLabel = (typeof window !== 'undefined' && window.app && typeof window.app.x2SayChargeLabel === 'function') ? window.app.x2SayChargeLabel(b) : '';
      const chips = [
        thLabel ? `🔥 ${thLabel}` : '',
        b.topRework ? '♻️ Tóp xử lý lại' : ''
      ].filter(Boolean).join(' · ');
      const remain = showKhoCol ? (khoVis.remain.get(b.id) || 0) : null;
      const idAttr = escapeHTML(String(b.id));
      return `<tr data-id="${idAttr}"${b.notes ? ` title="${escapeHTML(b.notes)}"` : ''}${canEdit ? ` onclick="app.openEditModal('${idAttr}')"` : ''}>
        <td class="kb-t-code">${escapeHTML(b.code)}</td>
        <td class="ta-r kb-t-dim">${b.length}×${b.width}×${b.thickness}</td>
        <td class="ta-r kb-t-qty">${(b.quantity || 0).toLocaleString('vi-VN')}</td>
        <td class="ta-r kb-t-vol">${(b.volume || 0).toFixed(4)}</td>
        <td class="kb-t-loc">${escapeHTML(b.location || 'Kho')}</td>
        <td class="kb-t-date">${formatDateDDMMYY(b.date)}</td>
        <td class="kb-t-type">${escapeHTML(b.bambooType)}</td>
        <td class="kb-t-use">${escapeHTML(b.useFor)}</td>
        <td class="kb-t-dry">${b.dryStage ? (b.dryStage === 'say1' ? 'S1' : b.dryStage === 'say2' ? 'S2' : '—') : '—'}</td>
        <td class="kb-t-chips">${chips ? escapeHTML(chips) : '<span class="kb-t-none">—</span>'}</td>
        ${showKhoCol ? `<td class="ta-r kb-t-remain">${(remain || 0).toLocaleString('vi-VN')}</td>` : ''}
        ${canEdit ? `<td class="ta-c kb-t-act" data-perm="x2">
            <button class="btn btn-outline btn-icon btn-sm" onclick="event.stopPropagation();app.openEditModal('${idAttr}')" title="Sửa thẻ"><i data-lucide="edit-3"></i></button>
            <button class="btn btn-outline btn-icon btn-sm" onclick="event.stopPropagation();app.deleteBatch('${idAttr}')" title="Xóa thẻ" style="color:var(--danger);"><i data-lucide="trash-2"></i></button>
          </td>` : ''}
      </tr>`;
    }).join('');
    wrap.innerHTML = `<table class="kb-table kb-table-${stage}">${head}<tbody>${body}</tbody></table>`;
    return wrap;
  }

export {
  clearColumnFilter,
  clearColumnSearch,
  closeColumnFilter,
  closeColumnFilters,
  createBambooCardElement,
  fillFilterOptions,
  getKanbanVisibleBatches,
  kanbanDensityOf,
  kbTableElement,
  loadKanbanDensity,
  onColumnFilterChange,
  onColumnSearchFocus,
  onColumnSearchInput,
  onColumnSearchKeydown,
  renderColumnFilterOptions,
  renderKanbanBoard,
  saveKanbanDensity,
  syncKanbanDensityBtn,
  toggleColumnFilter,
  toggleKanbanDensity,
  updateColumnFilterCounts
};
