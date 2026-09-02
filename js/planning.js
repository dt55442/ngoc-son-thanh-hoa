// ═══════════════════════════════════════════════════════════
// js/planning.js — tách từ app.js (refactor ES-modules phase 1)
// ═══════════════════════════════════════════════════════════
import { firePushSync, initLucide, requireEditPermission } from './cloud.js';
import { getDateYear, getPressedQtyForPlan, pressRecordWeek } from './press.js';
import { STORAGE_KEY_MATERIAL_RATES, STORAGE_KEY_PLANNING_FORECAST, STORAGE_KEY_PLANNING_ITEMS, STORAGE_KEY_PLANNING_STOCK, STORAGE_KEY_PRODUCT_BOMS, state } from './state.js';
import { escapeHTML, getBatchStageHistory, getISOWeekString, showToast } from './utils.js';

  // =============================================================
  // KẾ HOẠCH SẢN XUẤT (PLANNING VIEW)
  // =============================================================
  function loadMaterialRates() {
    const raw = localStorage.getItem(STORAGE_KEY_MATERIAL_RATES);
    if (raw) {
      try { state.materialRates = JSON.parse(raw); }
      catch (e) { state.materialRates = []; }
    } else {
      state.materialRates = [];
      saveMaterialRates();
    }
  }

  function saveMaterialRates() {
    localStorage.setItem(STORAGE_KEY_MATERIAL_RATES, JSON.stringify(state.materialRates));
    firePushSync();
  }

  // ── ĐỊNH MỨC VÁN THÔ (BOM phụ) ──────────────────────────────
  // Mỗi bản ghi: { id, productId, lines: [{ vtDim: '1200×260×18', ratio: 1 }] }
  // productId trỏ tới định mức sản phẩm (materialRates.id) trong Kế hoạch sản xuất.
  function loadProductBoms() {
    const raw = localStorage.getItem(STORAGE_KEY_PRODUCT_BOMS);
    if (raw) {
      try { state.productBoms = JSON.parse(raw); }
      catch (e) { state.productBoms = []; }
    } else {
      state.productBoms = [];
    }
  }

  function saveProductBoms() {
    localStorage.setItem(STORAGE_KEY_PRODUCT_BOMS, JSON.stringify(state.productBoms));
    firePushSync();
  }

  // Lấy định mức ván thô của một sản phẩm (theo productId) | null
  function getProductBom(productId) {
    return state.productBoms.find(b => b.productId === productId) || null;
  }

  function loadPlanningItems() {
    const raw = localStorage.getItem(STORAGE_KEY_PLANNING_ITEMS);
    if (raw) {
      try { state.planningItems = JSON.parse(raw); }
      catch (e) { state.planningItems = []; }
    } else {
      state.planningItems = [];
      savePlanningItems();
    }
  }

  function savePlanningItems() {
    localStorage.setItem(STORAGE_KEY_PLANNING_ITEMS, JSON.stringify(state.planningItems));
    firePushSync();
  }

  function loadPlanningForecast() {
    const raw = localStorage.getItem(STORAGE_KEY_PLANNING_FORECAST);
    if (raw) {
      try { state.planningForecast = JSON.parse(raw); }
      catch (e) { state.planningForecast = {}; }
    } else {
      state.planningForecast = {};
    }
  }

  function savePlanningForecast() {
    localStorage.setItem(STORAGE_KEY_PLANNING_FORECAST, JSON.stringify(state.planningForecast));
    firePushSync();
  }

  function loadPlanningStock() {
    const raw = localStorage.getItem(STORAGE_KEY_PLANNING_STOCK);
    if (raw) {
      try { state.planningStock = JSON.parse(raw); }
      catch (e) { state.planningStock = {}; }
    } else {
      state.planningStock = {};
    }
  }

  function savePlanningStock() {
    localStorage.setItem(STORAGE_KEY_PLANNING_STOCK, JSON.stringify(state.planningStock));
    firePushSync();
  }

  // Lấy số tuần từ chuỗi "Tuần 34" -> 34
  function getWeekNumber(weekLabel) {
    if (!weekLabel) return 0;
    const m = String(weekLabel).match(/Tuần\s*(\d+)/i);
    return m ? parseInt(m[1]) : 0;
  }

  // Xác định năm của một kế hoạch dựa trên tuần (tra từ lô có cùng tuần)
  // Ưu tiên năm hiện tại để tránh lỗi khi lô nan từ năm trước có cùng tuần
  function getYearFromWeek(weekLabel) {
    const weekNum = getWeekNumber(weekLabel);
    if (!weekNum) return new Date().getFullYear();
    const currentYear = new Date().getFullYear();
    const batch = state.batches.find(b => b.week === weekLabel && b.date);
    if (batch && batch.date) {
      const y = parseInt(String(batch.date).split('-')[0]);
      if (!isNaN(y) && y === currentYear) return y;
    }
    return currentYear;
  }

  // Danh sách các năm có dữ liệu (từ lô nan và kế hoạch)
  function getAvailablePlanningYears() {
    const years = new Set();
    state.batches.forEach(b => {
      if (b.date) {
        const y = parseInt(String(b.date).split('-')[0]);
        if (!isNaN(y)) years.add(y);
      }
    });
    state.planningItems.forEach(p => {
      const y = p.year || getYearFromWeek(p.week);
      years.add(y);
    });
    return Array.from(years).sort((a, b) => a - b);
  }

  // Điền bộ lọc năm cho bảng kế hoạch tổng hợp
  function populatePlanningYearFilter() {
    const select = document.getElementById('planning-year-filter');
    if (!select) return;
    const years = getAvailablePlanningYears();
    if (years.length === 0) {
      select.innerHTML = `<option value="${new Date().getFullYear()}">Năm ${new Date().getFullYear()}</option>`;
      state.planningYearFilter = String(new Date().getFullYear());
      return;
    }
    const cur = state.planningYearFilter;
    if (cur === 'all' || !years.includes(parseInt(cur))) {
      const nowYear = new Date().getFullYear();
      state.planningYearFilter = years.includes(nowYear) ? String(nowYear) : String(years[years.length - 1]);
    }
    select.innerHTML = years.map(y => `<option value="${y}" ${String(y) === String(state.planningYearFilter) ? 'selected' : ''}>Năm ${y}</option>`).join('');
  }

  // Tính nhu cầu vật tư theo từng tuần cho một năm
  function computePlanningWeekNeeds(year) {
    const weekNeeds = {}; // weekNum -> { nanKey: qty, glue, additive }
    const yearNum = parseInt(year);
    state.planningItems.forEach(item => {
      const itemYear = item.year || getYearFromWeek(item.week);
      if (itemYear !== yearNum) return;
      const weekNum = getWeekNumber(item.week);
      if (!weekNum) return;
      const needs = calculatePlanningNeeds(item);
      if (!needs) return;
      if (!weekNeeds[weekNum]) weekNeeds[weekNum] = { glue: 0, additive: 0 };
      const useForSpr = needs.useFor || '';
      [['nan1', needs.nan1], ['nan2', needs.nan2], ['nan3', needs.nan3]].forEach(([field, nan]) => {
        if (!nan) return;
        const k = dimUseKey(nan.key, useForSpr);
        weekNeeds[weekNum][k] = (weekNeeds[weekNum][k] || 0) + nan.qty;
      });
      weekNeeds[weekNum].glue += needs.glue;
      weekNeeds[weekNum].additive += needs.additive;
    });
    return weekNeeds;
  }

  // Số lượng Sấy 1 theo từng tuần (cho nút Giả Định)
  function getSay1WeeklyQuantities(year) {
    const weekly = {}; // weekNum -> { nanKey: qty }
    state.batches.forEach(b => {
      if (b.stage !== 'say1') return;
      if (!b.date) return;
      const batchYear = parseInt(String(b.date).split('-')[0]);
      if (batchYear !== parseInt(year)) return;
      const weekNum = getWeekNumber(b.week);
      if (!weekNum) return;
      const key = dimUseKey(`${b.length}×${b.width}×${b.thickness}`, b.useFor);
      if (!weekly[weekNum]) weekly[weekNum] = {};
      weekly[weekNum][key] = (weekly[weekNum][key] || 0) + (b.quantity || 0);
    });
    return weekly;
  }

  // Giả định Dự kiến cho MỘT tuần cụ thể
  // = trung bình Sấy 1 của tối đa 10 tuần gần nhất có dữ liệu TRƯỚC tuần đó
  function forecastAssumeWeek(weekNum) {
    if (!requireEditPermission()) return;
    const year = state.planningYearFilter;
    if (!year) { showToast('Vui lòng chọn năm để giả định!', 'error'); return; }
    const say1ByWeek = getSay1WeeklyQuantities(year);
    const nanTypes = getUniqueNanTypes();
    const weeksWithData = Object.keys(say1ByWeek).map(Number).sort((a, b) => a - b);

    if (weeksWithData.length === 0) {
      showToast('Chưa có dữ liệu Sấy 1 cho năm này để giả định!', 'error');
      return;
    }

    const week = parseInt(weekNum);
    const prevWeeks = weeksWithData.filter(w => w < week).slice(-10);
    if (prevWeeks.length === 0) {
      showToast(`Tuần ${week}: Không có dữ liệu Sấy 1 của các tuần trước!`, 'error');
      return;
    }

    let filled = 0;
    getNanDisplayRows().forEach(row => {
      let sum = 0, count = 0;
      prevWeeks.forEach(w => {
        if (say1ByWeek[w] && say1ByWeek[w][row.ucKey]) {
          sum += say1ByWeek[w][row.ucKey];
          count++;
        }
      });
      if (count === 0) return;
      const avg = Math.round(sum / count);
      if (!state.planningForecast[year]) state.planningForecast[year] = {};
      if (!state.planningForecast[year][String(week)]) state.planningForecast[year][String(week)] = {};
      state.planningForecast[year][String(week)][row.ucKey] = avg;
      filled++;
    });

    savePlanningForecast();
    renderPlanningMatrix();
    showToast(`Đã giả định Dự kiến Tuần ${week} cho ${filled} loại nan (trung bình ${prevWeeks.length} tuần trước)!`, 'success');
  }

  // Xóa toàn bộ số Dự kiến đã giả định của MỘT tuần cụ thể
  function forecastClearWeek(weekNum) {
    if (!requireEditPermission()) return;
    const year = state.planningYearFilter;
    if (!year) { showToast('Vui lòng chọn năm!', 'error'); return; }
    const week = String(parseInt(weekNum));

    if (state.planningForecast[year] && state.planningForecast[year][week]) {
      const count = Object.keys(state.planningForecast[year][week]).length;
      delete state.planningForecast[year][week];
      savePlanningForecast();
      renderPlanningMatrix();
      showToast(`Đã xóa ${count} số dự kiến của Tuần ${weekNum}!`, 'success');
    } else {
      showToast(`Tuần ${weekNum} chưa có số dự kiến nào!`, 'info');
    }
  }

  // Thể tích quy đổi 1 thanh nan (m³)
  function getUnitVolume(nanType) {
    return (nanType.length * nanType.width * nanType.thickness) / 1000000000;
  }

  // Render danh sách kế hoạch sản phẩm (gom nhóm theo tuần, hiển thị dạng thẻ/cột trực quan)
  function renderPlanningListSection(year) {
    const container = document.getElementById('planning-list-section');
    if (!container) return;
    const yearNum = parseInt(year);
    const items = state.planningItems.filter(p => {
      const py = p.year || getYearFromWeek(p.week);
      return py === yearNum;
    });
    if (items.length === 0) {
      container.innerHTML = `<h5><i data-lucide="list"></i> Kế Hoạch Sản Xuất Năm ${year}: Chưa có</h5>`;
      initLucide();
      return;
    }

    // Gom nhóm theo tuần
    const weekGroups = {};
    items.forEach(item => {
      const weekNum = getWeekNumber(item.week);
      if (!weekGroups[weekNum]) weekGroups[weekNum] = [];
      weekGroups[weekNum].push(item);
    });

    // Sắp xếp tuần tăng dần
    const sortedWeeks = Object.keys(weekGroups).map(Number).sort((a, b) => a - b);

    // Tính tổng số tấm cho mỗi tuần
    const weekTotals = {};
    sortedWeeks.forEach(w => {
      weekTotals[w] = weekGroups[w].reduce((sum, item) => sum + (item.qty || 0), 0);
    });

    // Tổng toàn năm
    const totalQty = items.reduce((sum, item) => sum + (item.qty || 0), 0);

    container.innerHTML = `
      <div class="planning-list-header">
        <h5><i data-lucide="list"></i> Kế Hoạch Sản Xuất Năm ${year}</h5>
        <span class="planning-list-total"><i data-lucide="layers" style="width:12px;height:12px;"></i> Tổng: <strong>${totalQty.toLocaleString('vi-VN')} tấm</strong> (${items.length} kế hoạch)</span>
      </div>
      <div class="planning-week-grid">
        ${sortedWeeks.map(weekNum => {
          const weekItems = weekGroups[weekNum];
          const weekTotal = weekTotals[weekNum];
          return `
            <div class="planning-week-card">
              <div class="planning-week-card-header">
                <span class="planning-week-badge"><i data-lucide="calendar" style="width:12px;height:12px;"></i> Tuần ${weekNum}</span>
                <span class="planning-week-card-actions">
                  <button class="plan-week-btn" onclick="app.duplicatePlanningGroup(${weekNum}, ${yearNum})" title="Nhân bản thẻ kế hoạch"><i data-lucide="copy"></i></button>
                  <button class="plan-week-btn" onclick="app.editPlanningGroup(${weekNum}, ${yearNum})" title="Sửa tuần & số lượng ván"><i data-lucide="pencil"></i></button>
                  <span class="planning-week-total">${weekTotal.toLocaleString('vi-VN')} tấm</span>
                </span>
              </div>
              <div class="planning-week-items">
                ${weekItems.map(item => {
                  const rate = state.materialRates.find(r => r.id === item.productId);
                  const name = rate ? rate.product : 'Sản phẩm đã xóa';
                  const nanInfo = rate ? getRateNanSummary(rate) : '';
                  const pressedQty = getPressedQtyForPlan(yearNum, weekNum, item.productId);
                  const doneCls = pressedQty >= (item.qty || 0) ? 'done' : '';
                  // Sản lượng tối đa có thể ép từ ván thô lũy kế tuần 1 → tuần kế hoạch
                  const maxProd = getMaxProductionForProduct(yearNum, item.productId, weekNum);
                  const maxProdHtml = maxProd ? `<span class="plan-item-capacity" title="Sản lượng tối đa từ ván thô KHẢ DỤNG đến tuần ${weekNum} (Tồn thực tế + Σ Dự kiến − Σ Cần các tuần trước, đồng bộ ma trận). Bottleneck: ${escapeHTML(maxProd.bottleneck.nanKey)} ×${maxProd.bottleneck.rate} — còn ${maxProd.bottleneck.available.toLocaleString('vi-VN')} thanh"><i data-lucide="layers" style="width:10px;height:10px;"></i> Có thể ép: <strong>${maxProd.maxProduction.toLocaleString('vi-VN')}</strong></span>` : '';
                  return `
                    <div class="planning-week-item">
                      <div class="planning-week-item-info">
                        <span class="planning-week-item-name">${escapeHTML(name)}</span>
                        ${nanInfo ? `<span class="planning-week-item-nan">${nanInfo}</span>` : ''}
                        <span class="plan-item-progress ${doneCls}" title="Đã ép / Kế hoạch"><i data-lucide="factory" style="width:10px;height:10px;"></i> ${pressedQty.toLocaleString('vi-VN')}/${(item.qty || 0).toLocaleString('vi-VN')}</span>
                        ${maxProdHtml}
                      </div>
                      <div class="planning-week-item-qty">
                        <strong>${item.qty.toLocaleString('vi-VN')}</strong> tấm
                      </div>
                      <button class="plan-item-delete" onclick="app.deletePlanningItem('${item.id}')" title="Xóa kế hoạch"><i data-lucide="x"></i></button>
                    </div>`;
                }).join('')}
              </div>
            </div>`;
        }).join('')}
      </div>`;
    initLucide();
  }

  // Tạo chuỗi tóm tắt loại nan cho một định mức (VD: "1200×20×12 ×16, 1200×20×8 ×8")
  function getRateNanSummary(rate) {
    if (!rate) return '';
    const parts = [];
    if (rate.nan1) parts.push(`${rate.nan1} ×${formatNanQty(rate.nan1Qty)}`);
    if (rate.nan2) parts.push(`${rate.nan2} ×${formatNanQty(rate.nan2Qty)}`);
    if (rate.nan3) parts.push(`${rate.nan3} ×${formatNanQty(rate.nan3Qty)}`);
    return parts.join(', ');
  }

// ---------------------------------------------------------------
  // Phân tách tồn kho & nhu cầu theo MỤC ĐÍCH (Ván / Bullig)
  // ---------------------------------------------------------------
  // Sản phẩm "Ván 1200x382x12" chỉ dùng loại nan có mục đích "Ván",
  // sản phẩm "Bullig 304x14x7" chỉ dùng thanh nan mục đích "Bullig".
  // Mỗi lô nan mang trường useFor ('Ván' | 'Bullig') để phân biệt → trước
  // đây phần tính toán gộp chung theo kích thước, gây trộn tồn Ván và Bullig.
  // Khóa composite: <kach-thuoc>@<mục-đích>, VD: 1250×18×7@Ván.
  // (Không mục đích thì giữ nguyên khóa kích thước để tương thích dữ liệu cũ)

  // Suy mục đích từ tên sản phẩm / định mức
  function getUseForFromName(name) {
    const s = String(name || '').toLowerCase();
    if (s.includes('bullig') || s.includes('bullgi')) return 'Bullig';
    if (s.includes('ván')) return 'Ván';
    return '';
  }

  function useSuffix(useFor) { return useFor ? '@' + useFor : ''; }

  // Khóa composite (kích thước + mục đích)
  function dimUseKey(dimKey, useFor) { return dimKey + useSuffix(useFor); }

  // Danh sách hàng nan hiển thị trong bảng kế hoạch: mỗi (kích thước, mục đích) là 1 hàng
  function getNanDisplayRows() {
    const dims = getUniqueNanTypes();
    const byDim = {};
    const addPurpose = (dim, p) => { (byDim[dim] = byDim[dim] || new Set()).add(p); };

    state.batches.forEach(b => addPurpose(`${b.length}×${b.width}×${b.thickness}`, b.useFor || ''));
    state.materialRates.forEach(rate => {
      const p = getUseForFromName(rate.product);
      [rate.nan1, rate.nan2, rate.nan3].forEach(nk => {
        if (!nk) return;
        addPurpose(String(nk).replace(/x/gi, '×'), p);
      });
    });

    const order = { 'Ván': 0, 'Bullig': 1, '': 2 };
    const rows = [];
    dims.forEach(dim => {
      const set = byDim[dim.key] && byDim[dim.key].size ? Array.from(byDim[dim.key]) : [''];
      set.sort((a, b) => (order[a] ?? 9) - (order[b] ?? 9));
      set.forEach(p => {
        rows.push({
          dimKey: dim.key, ucKey: dimUseKey(dim.key, p), useFor: p,
          label: p ? `${dim.label} (${p})` : dim.label,
          length: dim.length, width: dim.width, thickness: dim.thickness
        });
      });
    });
    return rows;
  }

  // Đọc số Dự kiến của một hàng (composite) từ dữ liệu đã lưu; fallback dữ liệu cũ theo kích thước
  function getForecastVal(yearNum, weekKey, row) {
    const fc = state.planningForecast[yearNum]?.[weekKey];
    if (!fc) return 0;
    if (fc[row.ucKey] !== undefined) return fc[row.ucKey] || 0;
    if (row.useFor === '' && fc[row.dimKey] !== undefined) return fc[row.dimKey] || 0;
    return 0;
  }

  // Render bảng kế hoạch tổng hợp theo tuần (BẢNG KẾ HOẠCH MỚI)
  // Trục X: Tuần 1..52, mỗi tuần gồm 4 khối chính: Tổng tồn, Dự kiến, Cần, Đáp ứng;
  //         trong mỗi khối là 2 cột con theo mục đích: Ván | Bullig
  // Trục Y: Loại nan + Keo + Phụ gia
  // ─── Trợ giúp hiển thị gọn trên điện thoại ──────────────────────
  // Desktop: số đầy đủ kiểu vi-VN. Phone (<768px): rút gọn để vừa 8 cột/tuần;
  // giá trị đầy đủ luôn nằm trong thuộc tính title của ô.
  function isPhoneLayout() {
    try { return window.matchMedia && window.matchMedia('(max-width: 768px)').matches; }
    catch (e) { return false; }
  }
  function fmtShortVal(v) {
    if (v == null || isNaN(v)) return '';
    if (!isPhoneLayout()) return v.toLocaleString('vi-VN');
    const a = Math.abs(v);
    if (a >= 1000000) return (v / 1000000).toLocaleString('vi-VN', { maximumFractionDigits: 2 }) + 'M';
    if (a >= 10000) return (v / 1000).toLocaleString('vi-VN', { maximumFractionDigits: 1 }) + 'k';
    return v.toLocaleString('vi-VN'); // <=9.999 giữ nguyên cho chính xác
  }

  function renderPlanningMatrix() {
    const thead = document.getElementById('planning-matrix-head');
    const tbody = document.getElementById('planning-matrix-body');
    const tfoot = document.getElementById('planning-matrix-foot');
    if (!thead || !tbody || !tfoot) return;

    // Đảm bảo bộ lọc năm được đồng bộ
    populatePlanningYearFilter();
    const year = state.planningYearFilter;
    const yearNum = parseInt(year) || new Date().getFullYear();
    const nanTypes = getUniqueNanTypes();
    const nanRows = getNanDisplayRows(); // danh sách (kích thước nan, mục đích)
    const weekNeeds = computePlanningWeekNeeds(yearNum);
    const inventoryByWeek = getNanInventoryByWeek(yearNum); // Tồn thực tế theo từng tuần (thời gian thực)

    // Bố cục / tuần: 4 KHỐI CHÍNH (Tổng tồn, Dự kiến, Cần, Đáp ứng); trong mỗi khối
    // là 2 cột con theo MỤC ĐÍCH: Ván | Bullig.
    const purposeList = ['Ván', 'Bullig'];
    const rowByUc = {};
    nanRows.forEach(r => { rowByUc[r.ucKey] = r; });
    const rowForCell = (dimKey, purpose) => {
      const ucKey = dimUseKey(dimKey, purpose);
      return rowByUc[ucKey] || { dimKey, ucKey, useFor: purpose, label: dimKey, length: 0, width: 0, thickness: 0 };
    };
    const gridCells = [];
    nanTypes.forEach(dim => purposeList.forEach(p => gridCells.push(rowForCell(dim.key, p))));
    // Mỗi hàng tương ứng 1 KÍCH THƯỚC nan; trong mỗi tuần hiển thị 2 cột dọc Ván | Bullig
    const gridDims = nanTypes;

    // ---------- HEADER (3 dòng: Tuần → Mục đích → 4 cột con) ----------
    const curWeek = getCurrentISOWeeks();
    // Dòng 1: nhãn tuần, mỗi tuần có 2 nhóm mục đích × 4 cột = 8 cột
    const groupHeader = `<th class="mat-week-col" rowspan="3">Loại Nan</th>` +
      Array.from({ length: 52 }, (_, i) => {
        const w = i + 1;
        const hasForecast = state.planningForecast[yearNum]?.[String(w)] && Object.keys(state.planningForecast[yearNum][String(w)]).length > 0;
        const warningIcon = hasForecast ? '<span style="color:#f59e0b; margin-left:4px;" title="Đã có số giả định"><i data-lucide="wand-2" style="width:10px;height:10px;"></i></span>' : '';
        const isCurrent = w === curWeek;
        return `<th id="mat-week-${w}" class="mat-type-col${isCurrent ? ' current-week' : ''}" colspan="8">${isCurrent ? '▼ ' : ''}Tuần ${w}${warningIcon}</th>`;
      }).join('');

    // Hàng 2: 4 KHỐI CHÍNH: TỔNG TỒN | DỰ KIẾN | CẦN | ĐÁP ỨNG (mỗi khối chứa 2 cột con Ván/Bullig).
    // Nút Giả Định + Xóa đặt trong khối DỰ KIẾN vì cả hai đều tác động lên số Dự kiến.
    // Nhãn có 2 lớp: .hl-full (desktop) / .hl-short (điện thoại) để co giãn theo màn hình.
    const metricHeader = Array.from({ length: 52 }, (_, i) => {
      const w = i + 1;
      const curCls = w === curWeek ? ' class="current-week"' : '';
      return `<th${curCls} colspan="2"><span style="font-size:0.68rem;font-weight:700;"><span class="hl-full">TỔNG TỒN</span><span class="hl-short">TỒN</span></span></th>` +
        `<th${curCls} colspan="2" style="padding:2px 3px;">
          <div style="display:flex; flex-direction:column; gap:2px; align-items:center;">
            <span style="font-size:0.68rem;font-weight:700;"><span class="hl-full">DỰ KIẾN</span><span class="hl-short">DK</span></span>
            <div style="display:flex; gap:3px;">
              <button class="btn btn-forecast-week" title="Giả định Dự kiến cho Tuần ${w}" onclick="app.forecastAssumeWeek(${w})" style="white-space:nowrap;">
                <i data-lucide="wand-2" style="width:10px;height:10px;"></i><span class="btn-lbl">Giả Định</span>
              </button>
              <button class="btn btn-forecast-clear-week" title="Xóa số giả định cho Tuần ${w}" onclick="app.forecastClearWeek(${w})" style="white-space:nowrap;">
                <i data-lucide="trash-2" style="width:10px;height:10px;"></i><span class="btn-lbl">Xóa</span>
              </button>
            </div>
          </div>
        </th>` +
        `<th${curCls} colspan="2"><span style="font-size:0.68rem;font-weight:700;"><span class="hl-full">CẦN</span><span class="hl-short">CN</span></span></th>` +
        `<th${curCls} colspan="2"><span style="font-size:0.68rem;font-weight:700;"><span class="hl-full">ĐÁP ỨNG</span><span class="hl-short">ĐA</span></span></th>`;
    }).join('');

    // Hàng 3: cột con Ván | Bullig lặp lại cho từng khối chính (điện thoại rút còn V/B)
    const subHeader = Array.from({ length: 52 }, (_, i) => {
      const w = i + 1;
      const curCls = w === curWeek ? ' class="current-week"' : '';
      const pair =
        `<th${curCls}><span style="font-size:0.65rem;font-weight:600;color:#4338ca;"><span class="hp-full">Ván</span><span class="hp-short">V</span></span></th>` +
        `<th${curCls}><span style="font-size:0.65rem;font-weight:600;color:#0f766e;"><span class="hp-full">Bullig</span><span class="hp-short">B</span></span></th>`;
      return pair.repeat(4);
    }).join('');

    thead.innerHTML = `<tr>${groupHeader}</tr><tr>${metricHeader}</tr><tr>${subHeader}</tr>`;

    // ---------- BODY ----------
    // Tính tồn kho lũy kế theo từng tuần (thời gian thực)
    // Công thức: Tổng tồn tuần (n+1) = Tổng tồn tuần (n) - Cần tuần (n) + Dự kiến tuần (n+1)
    // Tuần 1: Tổng tồn = tổng tồn kho thực tế cả năm + Dự kiến tuần 1
    const cumulativeInventory = {};
    gridCells.forEach(c => { cumulativeInventory[c.ucKey] = 0; });

    // Khởi tạo tồn kho ban đầu = tổng tồn kho thực tế của tất cả các tuần trong năm
    for (const c of gridCells) {
      cumulativeInventory[c.ucKey] = Object.keys(inventoryByWeek).reduce(
        (s, weekNum) => s + (inventoryByWeek[weekNum]?.[c.ucKey] || 0), 0);
    }

    // Pre-compute dữ liệu từng tuần để dùng cho cả body và footer
    const weekData = {}; // week -> { nan: { key: { ton, dk, can } }, glue, additive }

    // Tồn keo & phụ gia lũy kế (kế thừa qua các tuần)
    // Công thức: Tồn tuần (n) = Tồn tuần (n-1) - Cần tuần (n-1) + Nhập tay tuần (n)
    // Tuần 1: Tồn = Nhập tay tuần 1
    let cumulativeGlueStock = 0;
    let cumulativeAdditiveStock = 0;

    for (let week = 1; week <= 52; week++) {
      const weekKey = String(week);
      const needs = weekNeeds[week] || { glue: 0, additive: 0 };
      weekData[week] = { nan: {}, glue: needs.glue, additive: needs.additive };

      // Lấy số tồn nhập tay cho tuần này (nếu có)
      const stockWeek = state.planningStock[yearNum]?.[weekKey] || {};
      const glueInput = parseFloat(stockWeek.glue) || 0;
      const additiveInput = parseFloat(stockWeek.additive) || 0;

      // Tồn keo/phụ gia tuần hiện tại = tồn lũy kế + nhập tay tuần này
      const glueTon = cumulativeGlueStock + glueInput;
      const additiveTon = cumulativeAdditiveStock + additiveInput;
      weekData[week].glueTon = glueTon;
      weekData[week].additiveTon = additiveTon;
      weekData[week].glueInput = glueInput;
      weekData[week].additiveInput = additiveInput;

      // Trừ lượng "Cần" của tuần hiện tại để tính tồn cho tuần tiếp theo
      cumulativeGlueStock = glueTon - needs.glue;
      cumulativeAdditiveStock = additiveTon - needs.additive;

      gridCells.forEach(c => {
        const dkVal = getForecastVal(yearNum, weekKey, c);
        const cellNeeds = needs[c.ucKey] || 0;
        // Tổng tồn tuần hiện tại = tồn kho lũy kế + Dự kiến tuần hiện tại
        const tonVal = cumulativeInventory[c.ucKey] + dkVal;
        weekData[week].nan[c.ucKey] = { ton: tonVal, dk: dkVal, can: cellNeeds };
        // Trừ lượng "Cần" của tuần hiện tại để tính tồn cho tuần tiếp theo
        cumulativeInventory[c.ucKey] -= cellNeeds;
      });
    }

    const rows = [];

    // Hàng cho từng KÍCH THƯỚC nan (Trục Y); mỗi tuần xuất 8 ô theo 4 khối chính,
    // mỗi khối 2 cột con Ván | Bullig: [Tồn][Dự kiến][Cần][Đáp ứng]
    gridDims.forEach((dim, dimIdx) => {
      let tr = `<tr>`;
      tr += `<td class="mat-week-cell">${escapeHTML(dim.label)}</td>`;

      for (let week = 1; week <= 52; week++) {
        const weekKey = String(week);
        // Chuẩn bị dữ liệu 2 mục đích trước để xuất theo đúng thứ tự cột (metric-major)
        const cellInfo = purposeList.map(purpose => {
          const c = rowForCell(dim.key, purpose);
          const data = weekData[week].nan[c.ucKey];
          // Đáp ứng: % so với nhu cầu
          let dapUngClass = 'mat-cell-dap-ung';
          let dapUngText = '—';
          if (data.can > 0) {
            const pct = Math.min(100, Math.round((data.ton / data.can) * 100));
            dapUngText = pct + '%';
            if (pct >= 100) dapUngClass += ' ok';
            else if (pct >= 50) dapUngClass += ' warn';
            else dapUngClass += ' danger';
          }
          return { purpose, data, dapUngClass, dapUngText };
        });

        // Khối TỔNG TỒN (Ván | Bullig) - điện thoại hiển thị số rút gọn (title giữ giá trị đủ)
        cellInfo.forEach(ci => {
          const fullTon = ci.data.ton.toLocaleString('vi-VN');
          tr += `<td class="mat-cell-ton" title="${escapeHTML(fullTon)}">${fmtShortVal(ci.data.ton)}</td>`;
        });
        // Khối DỰ KIẾN (Ván | Bullig) - ô nhập tay
        cellInfo.forEach(ci => {
          const inputVal = ci.data.dk ? ci.data.dk : '';
          tr += `<td class="mat-input-cell plan-fc-cell"><input type="number" min="0" id="plan-fc-${yearNum}-${weekKey}-${dimIdx}-${ci.purpose}" value="${inputVal}" placeholder="0" title="Dự kiến tuần ${week}: ${escapeHTML(dim.label)} (${ci.purpose})"></td>`;
        });
        // Khối CẦN (Ván | Bullig)
        cellInfo.forEach(ci => {
          if (ci.data.can > 0) {
            const fullCan = ci.data.can.toLocaleString('vi-VN');
            tr += `<td title="${escapeHTML(fullCan)}">${fmtShortVal(ci.data.can)}</td>`;
          } else {
            tr += '<td>—</td>';
          }
        });
        // Khối ĐÁP ỨNG (Ván | Bullig)
        cellInfo.forEach(ci => {
          tr += `<td class="${ci.dapUngClass}">${ci.dapUngText}</td>`;
        });
      }

      tr += '</tr>';
      rows.push(tr);
    });

    // Hàng Keo (Trục Y) - có ô nhập tay số tồn, tồn kế thừa qua các tuần
    let keoRow = `<tr><td class="mat-week-cell">Keo (kg)</td>`;
    for (let week = 1; week <= 52; week++) {
      const weekKey = String(week);
      const data = weekData[week];
      const glueTon = data.glueTon;
      const glueInput = data.glueInput;
      const glueCan = data.glue;
      const inputVal = glueInput ? glueInput : '';
      keoRow += `<td colspan="2" class="mat-cell-ton">${glueTon > 0 ? glueTon.toFixed(2) : '—'}</td>`;
      keoRow += `<td colspan="2" class="mat-input-cell plan-stock-cell"><input type="number" min="0" step="0.01" id="plan-stock-glue-${yearNum}-${weekKey}" value="${inputVal}" placeholder="0" title="Nhập tay số tồn keo tuần ${week} (kg). Tồn kế thừa qua các tuần sau."></td>`;
      keoRow += `<td colspan="2" class="mat-cell-center">${glueCan > 0 ? glueCan.toFixed(2) : '—'}</td>`;
      keoRow += `<td colspan="2" class="mat-cell-dap-ung">${glueCan > 0 ? (glueTon >= glueCan ? 'Đủ' : 'Thiếu') : '—'}</td>`;
    }
    keoRow += '</tr>';
    rows.push(keoRow);

    // Hàng Phụ gia (Trục Y) - có ô nhập tay số tồn, tồn kế thừa qua các tuần
    let additiveRow = `<tr><td class="mat-week-cell">Phụ Gia (kg)</td>`;
    for (let week = 1; week <= 52; week++) {
      const weekKey = String(week);
      const data = weekData[week];
      const additiveTon = data.additiveTon;
      const additiveInput = data.additiveInput;
      const additiveCan = data.additive;
      const inputVal = additiveInput ? additiveInput : '';
      additiveRow += `<td colspan="2" class="mat-cell-ton">${additiveTon > 0 ? additiveTon.toFixed(2) : '—'}</td>`;
      additiveRow += `<td colspan="2" class="mat-input-cell plan-stock-cell"><input type="number" min="0" step="0.01" id="plan-stock-additive-${yearNum}-${weekKey}" value="${inputVal}" placeholder="0" title="Nhập tay số tồn phụ gia tuần ${week} (kg). Tồn kế thừa qua các tuần sau."></td>`;
      additiveRow += `<td colspan="2" class="mat-cell-center">${additiveCan > 0 ? additiveCan.toFixed(2) : '—'}</td>`;
      additiveRow += `<td colspan="2" class="mat-cell-dap-ung">${additiveCan > 0 ? (additiveTon >= additiveCan ? 'Đủ' : 'Thiếu') : '—'}</td>`;
    }
    additiveRow += '</tr>';
    rows.push(additiveRow);

    tbody.innerHTML = rows.join('');

    // ---------- FOOT: Tổng thể tích theo từng tuần (keo & phụ gia không tính) ----------
    let footRow = '<tr><td class="mat-week-cell">TỔNG THỂ TÍCH (m³)</td>';
    for (let week = 1; week <= 52; week++) {
      let tonVol = 0, dkVol = 0, canVol = 0;
      gridCells.forEach(c => {
        const unitVol = getUnitVolume(c);
        const data = weekData[week].nan[c.ucKey];
        tonVol += data.ton * unitVol;
        dkVol += data.dk * unitVol;
        canVol += data.can * unitVol;
      });
      footRow += `<td colspan="2">${tonVol.toFixed(2)}</td><td colspan="2">${dkVol.toFixed(2)}</td><td colspan="2">${canVol.toFixed(2)}</td><td colspan="2" class="mat-cell-dap-ung">•</td>`;
    }
    footRow += '</tr>';
    tfoot.innerHTML = footRow;

    // Danh sách kế hoạch sản phẩm theo năm
    renderPlanningListSection(yearNum);

    // Chỉ trượt ngang tới TUẦN HIỆN TẠI khi vừa mở tab / reset trang.
    // Khi chỉnh sửa trong tab (nhập Dự kiến, tồn keo/phụ gia, Giả định/Xóa tuần,
    // đổi năm...) sẽ KHÔNG tự động trượt để giữ nguyên vị trí cuộn của người dùng.
    if (state.planningPendingScroll) {
      state.planningPendingScroll = false;
      requestAnimationFrame(() => scrollMatrixToCurrentWeek());
    }

    initLucide();
  }

  // Cuộn ngang bảng Kế Hoạch Tổng Hợp tới cột TUẦN HIỆN TẠI
  function scrollMatrixToCurrentWeek() {
    try {
      const weekNum = Math.min(Math.max(getCurrentISOWeeks(), 1), 52);
      const th = document.getElementById('mat-week-' + weekNum);
      if (!th) return;
      // Vùng chứa có thanh cuộn ngang chính là .table-responsive bao quanh bảng
      const container = th.closest('.table-responsive');
      if (!container) return;
      const thRect = th.getBoundingClientRect();
      const cRect  = container.getBoundingClientRect();
      // Đặt đầu tuần hiện tại cách mép trái vùng nhìn thấy một khoảng nhỏ
      const targetLeft = container.scrollLeft + (thRect.left - cRect.left) - 24;
      if (Math.abs(targetLeft - container.scrollLeft) < 4) return; // đã ở đúng vị trí
      container.scrollTo({ left: Math.max(0, targetLeft), behavior: 'smooth' });
    } catch (e) { console.warn('[Matrix] Lỗi cuộn tới tuần hiện tại', e); }
  }

  // Chuyển đổi giá trị nhập vào thành số thập phân
  // Hỗ trợ: số nguyên (16), số thập phân (0.5), phân số (1/6)
  function parseFractionValue(value) {
    if (!value) return 0;
    const str = String(value).trim();
    if (!str) return 0;
    // Kiểm tra dạng phân số a/b
    const fracMatch = str.match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/);
    if (fracMatch) {
      const num = parseFloat(fracMatch[1]);
      const den = parseFloat(fracMatch[2]);
      if (den === 0) return 0;
      return num / den;
    }
    // Số thường
    const num = parseFloat(str);
    return isNaN(num) ? 0 : num;
  }

  // Định dạng hiển thị số thanh (giữ nguyên phân số nếu nhập phân số)
  function formatNanQty(value) {
    if (!value) return '0';
    const num = parseFloat(value);
    if (isNaN(num)) return String(value);
    // Nếu là số nguyên
    if (Number.isInteger(num)) return String(num);
    // Nếu là phân số đơn giản (1/6, 1/4, 1/3, 1/2...)
    const commonFractions = {
      0.125: '1/8',
      0.16666666666666666: '1/6',
      0.2: '1/5',
      0.25: '1/4',
      0.3333333333333333: '1/3',
      0.5: '1/2',
      0.6666666666666666: '2/3',
      0.75: '3/4',
      0.8333333333333334: '5/6'
    };
    // Làm tròn để so khớp
    const rounded = Math.round(num * 1000000) / 1000000;
    if (commonFractions[rounded] !== undefined) return commonFractions[rounded];
    // Số thập phân khác
    return String(Math.round(num * 10000) / 10000);
  }

  // Lấy danh sách các loại nan duy nhất từ dữ liệu lô nan
  // Tự động thêm loại nan mới khi có trong lô nan (Sấy 1, Sấy 2, Kho, Bào Tinh)
  // hoặc khi được tham chiếu trong định mức nguyên vật liệu
  // Hỗ trợ cả ký tự phân cách "×" và "x" (VD: 1200x382x12 hoặc 1200×382×12)
  function getUniqueNanTypes() {
    const types = new Map();
    state.batches.forEach(b => {
      const key = `${b.length}×${b.width}×${b.thickness}`;
      if (!types.has(key)) {
        types.set(key, {
          key,
          length: b.length,
          width: b.width,
          thickness: b.thickness,
          label: `${b.length}×${b.width}×${b.thickness} mm`
        });
      }
    });
    // Tự động thêm các loại nan từ định mức (kể cả chưa có trong lô nan)
    state.materialRates.forEach(rate => {
      [rate.nan1, rate.nan2, rate.nan3].forEach(nanKey => {
        if (!nanKey) return;
        // Chuẩn hóa key: thay "x" bằng "×" để đồng nhất với key từ lô nan
        const normalizedKey = String(nanKey).replace(/x/gi, '×');
        if (types.has(normalizedKey)) return;
        const parts = normalizedKey.split('×').map(parseFloat);
        if (parts.length === 3 && parts.every(p => !isNaN(p))) {
          types.set(normalizedKey, {
            key: normalizedKey,
            length: parts[0],
            width: parts[1],
            thickness: parts[2],
            label: `${normalizedKey} mm`
          });
        }
      });
    });
    return Array.from(types.values()).sort((a, b) => {
      if (a.length !== b.length) return a.length - b.length;
      if (a.width !== b.width) return a.width - b.width;
      return a.thickness - b.thickness;
    });
  }

  // Tính tồn kho nan theo từng tuần (thời gian thực)
  // Chỉ tính các lô ở Sấy 1, Sấy 2, Kho (chưa bào tinh) theo tuần nhập
  // Lô Bào Tinh: CHỈ tính số lượng trong TUẦN CHUYỂN ĐỔI (tuần vào Bào Tinh),
  // sang tuần sau không còn tính số lượng này nữa (đã chuyển sang công đoạn khác)
  // Nếu dữ liệu chỉ có tuần 33, 34 thì các tuần 1-32 sẽ có tồn = 0
  function getNanInventoryByWeek(year) {
    const inventoryByWeek = {}; // weekNum -> { nanKey: qty }
    const yearNum = parseInt(year);
    state.batches.forEach(b => {
      if (!b.date) return;

      // Xác định ngày & tuần để tính tồn cho lô này
      let effectiveDate = b.date;
      let effectiveWeek = b.week;

      if (b.stage === 'bao_tinh') {
        // Lô Bào Tinh: chỉ tính trong tuần chuyển đổi (tuần vào Bào Tinh)
        // Tìm mốc stageHistory có stage = 'bao_tinh' để lấy ngày chuyển đổi
        const history = getBatchStageHistory(b);
        const baoEntry = history.find(h => h.stage === 'bao_tinh');
        if (baoEntry && baoEntry.date) {
          effectiveDate = baoEntry.date;
          effectiveWeek = getISOWeekString(baoEntry.date);
        }
        // Nếu không có stageHistory thì dùng ngày hiện tại của lô
      }

      const batchYear = parseInt(String(effectiveDate).split('-')[0]);
      if (batchYear !== yearNum) return;
      const weekNum = getWeekNumber(effectiveWeek);
      if (!weekNum) return;
      const key = dimUseKey(`${b.length}×${b.width}×${b.thickness}`, b.useFor);
      if (!inventoryByWeek[weekNum]) inventoryByWeek[weekNum] = {};
      inventoryByWeek[weekNum][key] = (inventoryByWeek[weekNum][key] || 0) + (b.quantity || 0);
    });
    return inventoryByWeek;
  }

  // Điền danh sách loại nan vào các select trong modal định mức
  function populateNanSelects() {
    const nanTypes = getUniqueNanTypes();
    const options = nanTypes.map(n => `<option value="${n.key}">${n.label}</option>`).join('');
    ['mat-rate-nan1', 'mat-rate-nan2', 'mat-rate-nan3'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = `<option value="">-- Chọn loại nan --</option>${options}`;
    });
  }

  // Điền danh sách sản phẩm (loại ván) vào modal kế hoạch dưới dạng thẻ trực quan
  function populatePlanningProductSelect() {
    const container = document.getElementById('plan-product-selector');
    const hiddenInput = document.getElementById('plan-item-product');
    if (!container || !hiddenInput) return;

    if (state.materialRates.length === 0) {
      container.innerHTML = `<div class="plan-product-empty">
        <i data-lucide="package-open" style="width:28px;height:28px;color:var(--text-muted);"></i>
        <p>Chưa có định mức sản phẩm. Vui lòng thêm định mức trước.</p>
      </div>`;
      initLucide();
      return;
    }

    container.innerHTML = state.materialRates.map(r => {
      const nan1Qty = formatNanQty(r.nan1Qty);
      const nan2Qty = r.nan2 ? formatNanQty(r.nan2Qty) : null;
      const nan3Qty = r.nan3 ? formatNanQty(r.nan3Qty) : null;

      const nanChips = [];
      if (r.nan1) nanChips.push(`<span class="plan-product-nan-chip"><i data-lucide="ruler" style="width:10px;height:10px;"></i> ${escapeHTML(r.nan1)} × ${nan1Qty}</span>`);
      if (r.nan2) nanChips.push(`<span class="plan-product-nan-chip"><i data-lucide="ruler" style="width:10px;height:10px;"></i> ${escapeHTML(r.nan2)} × ${nan2Qty}</span>`);
      if (r.nan3) nanChips.push(`<span class="plan-product-nan-chip"><i data-lucide="ruler" style="width:10px;height:10px;"></i> ${escapeHTML(r.nan3)} × ${nan3Qty}</span>`);

      return `<div class="plan-product-card" data-product-id="${escapeHTML(r.id)}" onclick="app.selectPlanningProduct('${escapeHTML(r.id)}')">
        <div class="plan-product-card-header">
          <span class="plan-product-name">${escapeHTML(r.product)}</span>
          <span class="plan-product-check"><i data-lucide="check-circle-2" style="width:16px;height:16px;"></i></span>
        </div>
        <div class="plan-product-nan-list">${nanChips.join('')}</div>
        <div class="plan-product-meta">
          <span class="plan-product-meta-item"><i data-lucide="droplets" style="width:10px;height:10px;"></i> Keo: ${r.glue} kg</span>
          <span class="plan-product-meta-item"><i data-lucide="flask-conical" style="width:10px;height:10px;"></i> Phụ gia: ${r.additive} kg</span>
          <span class="plan-product-meta-item"><i data-lucide="gauge" style="width:10px;height:10px;"></i> Hiệu suất: ${r.efficiency}%</span>
        </div>
      </div>`;
    }).join('');

    // Reset selection
    hiddenInput.value = '';
    initLucide();
  }

  // Chọn sản phẩm (loại ván) từ thẻ trực quan
  function selectPlanningProduct(productId) {
    const hiddenInput = document.getElementById('plan-item-product');
    if (!hiddenInput) return;
    hiddenInput.value = productId;
    // Cập nhật trạng thái active cho các thẻ
    document.querySelectorAll('.plan-product-card').forEach(card => {
      const isActive = card.dataset.productId === productId;
      card.classList.toggle('active', isActive);
    });
  }

  // Lấy số tuần ISO hiện tại của năm hiện tại (VD: Tuần 34)
  function getCurrentISOWeeks() {
    const now = new Date();
    // Tính tuần ISO cho ngày hiện tại
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const yearStart = new Date(d.getFullYear(), 0, 1);
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  }

  // Điền danh sách năm và tuần vào modal thêm kế hoạch
  // Gợi ý mặc định: Năm hiện tại, Tuần hiện tại (thời điểm hiện tại)
  function populatePlanningItemYearWeekDefaults() {
    // Năm
    const yearSelect = document.getElementById('plan-item-year');
    if (yearSelect) {
      const years = getAvailablePlanningYears();
      const currentYear = new Date().getFullYear();
      if (!years.includes(currentYear)) years.push(currentYear);
      years.sort((a, b) => a - b);
      // Ưu tiên năm hiện tại lên đầu nếu có, nếu không chọn năm gần nhất
      const defaultYear = currentYear;
      yearSelect.innerHTML = '<option value="">-- Chọn năm --</option>' +
        years.map(y => `<option value="${y}" ${y === defaultYear ? 'selected' : ''}>Năm ${y}</option>`).join('');
    }

    // Tuần
    const weekSelect = document.getElementById('plan-item-week');
    if (weekSelect) {
      const currentWeek = getCurrentISOWeeks();
      weekSelect.innerHTML = '<option value="">-- Chọn tuần --</option>' +
        Array.from({ length: 52 }, (_, i) => i + 1)
          .map(w => `<option value="${w}" ${w === currentWeek ? 'selected' : ''}>Tuần ${w}</option>`)
          .join('');
    }
  }

  // Render toàn bộ view Kế Hoạch Sản Xuất
  function renderPlanningView() {
    restoreRateTableCollapse();
    renderMaterialRatesTable();
    renderProductBomTable();
    populatePlanningProductSelect();
    populatePlanningYearFilter();
    renderPlanningMatrix();
    initLucide();
  }

  // Render bảng định mức
  function renderMaterialRatesTable() {
    const tbody = document.getElementById('material-rate-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (state.materialRates.length === 0) {
      tbody.innerHTML = `<tr><td colspan="12" class="text-center" style="padding:30px;color:var(--text-muted);">
        <i data-lucide="book-open" style="width:28px;height:28px;margin-bottom:8px;"></i>
        <p>Chưa có định mức nào. Hãy thêm định mức nguyên vật liệu cho từng loại sản phẩm.</p></td></tr>`;
      return;
    }

    const yr = parseInt(state.planningYearFilter) || new Date().getFullYear();
    state.materialRates.forEach(rate => {
      const tr = document.createElement('tr');
      const nan1QtyDisplay = formatNanQty(rate.nan1Qty);
      const nan2QtyDisplay = formatNanQty(rate.nan2Qty);
      const nan3QtyDisplay = formatNanQty(rate.nan3Qty);
      const nan1 = rate.nan1 ? `<div class="rate-nan-info"><strong>${escapeHTML(rate.nan1)}</strong><br>${nan1QtyDisplay} thanh</div>` : '<span class="text-muted">-</span>';
      const nan2 = rate.nan2 ? `<div class="rate-nan-info"><strong>${escapeHTML(rate.nan2)}</strong><br>${nan2QtyDisplay} thanh</div>` : '<span class="text-muted">-</span>';
      const nan3 = rate.nan3 ? `<div class="rate-nan-info"><strong>${escapeHTML(rate.nan3)}</strong><br>${nan3QtyDisplay} thanh</div>` : '<span class="text-muted">-</span>';
      // Sản lượng quy đổi từ tồn VÁN THÔ đã ép (nếu sản phẩm có định mức ván thô)
      const bomMp = getProductBom(rate.id) ? getMaxProductionForProduct(yr, rate.id, null) : null;
      const bomCapacityCell = (bomMp && bomMp.maxProduction > 0)
        ? `<span class="bom-capacity" title="Quy đổi từ tổng Ván Thô Tạo Ra trong các lượt ép (định mức ván thô)">${bomMp.maxProduction.toLocaleString('vi-VN')} tấm</span>`
        : '<span class="text-muted">-</span>';

      tr.innerHTML = `
        <td><span class="rate-product-name">${escapeHTML(rate.product)}</span></td>
        <td>${nan1}</td>
        <td>${nan1QtyDisplay || '-'}</td>
        <td>${nan2}</td>
        <td>${nan2QtyDisplay || '-'}</td>
        <td>${nan3}</td>
        <td>${nan3QtyDisplay || '-'}</td>
        <td>${rate.glue} kg</td>
        <td>${rate.additive} kg</td>
        <td>${rate.efficiency}%</td>
        <td>${bomCapacityCell}</td>
        <td class="text-right">
          <div style="display:flex;justify-content:flex-end;gap:4px;">
            <button class="btn btn-outline btn-icon btn-sm" onclick="app.editMaterialRate('${rate.id}')" title="Sửa"><i data-lucide="edit-3"></i></button>
            <button class="btn btn-outline btn-icon btn-sm" onclick="app.deleteMaterialRate('${rate.id}')" title="Xóa" style="color:var(--danger);"><i data-lucide="trash-2"></i></button>
          </div>
        </td>`;
      tbody.appendChild(tr);
    });
    initLucide();
  }

  // ── Thu gọn / mở rộng bảng định mức (bảng chính & bảng phụ ván thô) ──
  const RATE_COLLAPSE_KEY = 'bamboo_tracker_rate_collapse_v1';
  function saveRateCollapseState() {
    try {
      localStorage.setItem(RATE_COLLAPSE_KEY, JSON.stringify({
        'rate-main-card': document.getElementById('rate-main-card')?.classList.contains('rate-table-collapsed') || false,
        'rate-bom-card':  document.getElementById('rate-bom-card')?.classList.contains('rate-table-collapsed') || false
      }));
    } catch (e) {}
  }
  function toggleRateTableCollapse(cardId) {
    const card = document.getElementById(cardId);
    if (!card) return;
    card.classList.toggle('rate-table-collapsed');
    saveRateCollapseState();
    initLucide();
  }
  function restoreRateTableCollapse() {
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(RATE_COLLAPSE_KEY)); } catch (e) {}
    if (!saved) return;
    if (saved['rate-main-card']) document.getElementById('rate-main-card')?.classList.add('rate-table-collapsed');
    if (saved['rate-bom-card'])  document.getElementById('rate-bom-card')?.classList.add('rate-table-collapsed');
  }

  // Render bảng ĐỊNH MỨC VÁN THÔ → THÀNH PHẨM (bảng phụ 2) kèm cột sản lượng quy đổi.
  // Sản lượng = min(floor(tồn vt_i ÷ tỷ lệ i)) với tồn vt = tổng "Ván Thô Tạo Ra" các lượt ép.
  function renderProductBomTable() {
    const tbody = document.getElementById('product-bom-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (state.productBoms.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center" style="padding:30px;color:var(--text-muted);">
        <i data-lucide="layers" style="width:28px;height:28px;margin-bottom:8px;"></i>
        <p>Chưa có định mức ván thô nào. Thêm để quy đổi tồn ván thô ra số thành phẩm.</p></td></tr>`;
      return;
    }

    const yr = parseInt(state.planningYearFilter) || new Date().getFullYear();
    state.productBoms.forEach(bom => {
      const rate = state.materialRates.find(r => r.id === bom.productId);
      const tr = document.createElement('tr');
      const formula = (bom.lines || []).map(l => `${escapeHTML(l.vtDim)} ×${l.ratio}`).join(' &nbsp;+&nbsp; ') || '-';
      const mp = getMaxProductionForProduct(yr, bom.productId, null);
      const capacityCell = (mp && mp.maxProduction > 0)
        ? `<span class="bom-capacity" title="Tổng tồn ván thô đã ép (lượt ép ván) quy đổi theo công thức">${mp.maxProduction.toLocaleString('vi-VN')} tấm</span>`
        : '<span class="text-muted">0 tấm</span>';

      tr.innerHTML = `
        <td><span class="rate-product-name">${rate ? escapeHTML(rate.product) : '<em>Sản phẩm đã xóa</em>'}</span></td>
        <td>${formula}</td>
        <td>${(bom.lines || []).length}/3</td>
        <td>${capacityCell}</td>
        <td class="text-right">
          <div style="display:flex;justify-content:flex-end;gap:4px;">
            <button class="btn btn-outline btn-icon btn-sm" onclick="app.editProductBom('${bom.id}')" title="Sửa"><i data-lucide="edit-3"></i></button>
            <button class="btn btn-outline btn-icon btn-sm" onclick="app.deleteProductBom('${bom.id}')" title="Xóa" style="color:var(--danger);"><i data-lucide="trash-2"></i></button>
          </div>
        </td>`;
      tbody.appendChild(tr);
    });
    initLucide();
  }

  // Tính nhu cầu nguyên liệu cho một kế hoạch
  // "Cần" = số tấm ván x định mức / hiệu suất
  function calculatePlanningNeeds(planItem) {
    const rate = state.materialRates.find(r => r.id === planItem.productId);
    if (!rate) return null;
    const qty = planItem.qty || 0;
    const efficiency = (rate.efficiency || 70) / 100;

    // Chuẩn hóa key nan: thay "x" bằng "×" để khớp với key trong bảng kế hoạch
    const normalizeKey = (k) => k ? String(k).replace(/x/gi, '×') : null;

    // Nhu cầu nan: số nan cần cho 1 tấm x số tấm ván / hiệu suất
    // Hỗ trợ số thanh phân số (VD: 1/6 = 1 thanh làm được 6 sản phẩm)
    const nan1Rate = parseFractionValue(rate.nan1Qty);
    const nan2Rate = parseFractionValue(rate.nan2Qty);
    const nan3Rate = parseFractionValue(rate.nan3Qty);

    const needs = {
      useFor: getUseForFromName(rate.product),
      nan1: rate.nan1 ? { key: normalizeKey(rate.nan1), qty: Math.ceil(nan1Rate * qty / efficiency) } : null,
      nan2: rate.nan2 ? { key: normalizeKey(rate.nan2), qty: Math.ceil(nan2Rate * qty / efficiency) } : null,
      nan3: rate.nan3 ? { key: normalizeKey(rate.nan3), qty: Math.ceil(nan3Rate * qty / efficiency) } : null,
      glue: (rate.glue || 0) * qty,
      additive: (rate.additive || 0) * qty
    };
    return needs;
  }

  // ═══════════════════════════════════════════════════════════
  // TÍNH SẢN LƯỢNG (NGƯỢC CỦA calculatePlanningNeeds)
  // ═══════════════════════════════════════════════════════════
  // "Sản lượng" = số lượng Ván Thành Phẩm TỐI ĐA có thể sản xuất từ
  // số ván thô (Ván Thô) hiện có trong kho, dựa trên công thức (BOM/định mức).
  //
  // Nguyên tắc: với mỗi loại ván thô i:
  //   SP_i = floor(available_i × efficiency / rate_i)
  // Sản lượng = min(SP_i) — giới hạn bởi nhân tố kém nhất (bottleneck).
  //
  // Đây là phép tính NGHỊCH ĐẢO của calculatePlanningNeeds:
  //   • calculatePlanningNeeds : qty (sản phẩm)  →  raw material cần (ván thô)
  //   • calculateMaxProduction : available (ván thô) →  max qty (sản phẩm có thể ép)
  //
  // Tham số:
  //  - rate      : materialRate (BOM) chứa nan1/nan2/nan3 + nan1Qty/nan2Qty/nan3Qty
  //  - inventory : { [dimUseKey]: quantity } — tồn kho ván thô
  // Trả về: { maxProduction, components[], bottleneck, efficiency, useFor } | null
  function calculateMaxProductionFromInventory(rate, inventory) {
    if (!rate || !inventory) return null;
    const efficiency   = (rate.efficiency || 70) / 100;
    const useForSpr    = getUseForFromName(rate.product);
    const normalizeKey = (k) => k ? String(k).replace(/x/gi, '×') : null;

    const components = [];
    [['nan1', rate.nan1, rate.nan1Qty], ['nan2', rate.nan2, rate.nan2Qty], ['nan3', rate.nan3, rate.nan3Qty]]
      .forEach(([field, nanKey, nanQty]) => {
        if (!nanKey) return;
        const rateValue   = parseFractionValue(nanQty);
        if (!rateValue || rateValue <= 0) return;
        const normKey     = normalizeKey(nanKey);
        const invKey      = dimUseKey(normKey, useForSpr);
        const available   = Math.max(0, inventory[invKey] || 0);
        const maxProducts = Math.floor(available * efficiency / rateValue);
        components.push({ field, nanKey: normKey, available, rate: rateValue, maxProducts });
      });

    if (components.length === 0) return null;
    const maxProduction = Math.min(...components.map(c => c.maxProducts));
    const bottleneck = components.reduce((min, c) =>
      c.maxProducts < min.maxProducts ? c : min, components[0]);

    return { maxProduction, components, useFor: useForSpr, bottleneck, efficiency };
  }

  // Tính số thành phẩm tối đa theo ĐỊNH MỨC VÁN THÔ (BOM phụ):
  //   SP_i = floor(tồn_i ÷ tỷ lệ_i)   ;   Sản lượng = min(SP_i)
  // Tồn_i: tổng "Ván Thô Tạo Ra" đã ghi nhận ở các lượt ép (pressRecords.vanTho)
  // đến tuần upToWeek — phản ánh ván thô được ép ở các ngày/thời điểm khác nhau.
  // Kết quả: { maxProduction, components, bottleneck, source: 'bom' } | null
  function calculateMaxProductionFromBom(bom, vanThoStock) {
    if (!bom || !(bom.lines || []).length || !vanThoStock) return null;
    const norm = (k) => String(k || '').trim().toLowerCase().replace(/[x*]/g, '×');
    const stock = {};
    Object.keys(vanThoStock).forEach(k => { stock[norm(k)] = vanThoStock[k] || 0; });

    const components = [];
    bom.lines.forEach((l, idx) => {
      const vtDim = norm(l.vtDim);
      const ratio = parseFloat(l.ratio);
      if (!vtDim || !ratio || ratio <= 0) return;
      const available = Math.max(0, stock[vtDim] || 0);
      components.push({
        field: `vt${idx + 1}`,
        vtDim,
        available,
        ratio,
        maxProducts: Math.floor(available / ratio)
      });
    });

    if (components.length === 0) return null;
    const maxProduction = Math.min(...components.map(c => c.maxProducts));
    const bottleneck = components.reduce((min, c) =>
      c.maxProducts < min.maxProducts ? c : min, components[0]);
    return { maxProduction, components, bottleneck, source: 'bom' };
  }

  // Tồn kho VÁN THÔ (lũy kế đến tuần upToWeek) gom từ các lượt ép ván:
  // mỗi lượt ép có "Ván Thô Tạo Ra" [{ vtDim, vtQty, ratio }] — tổng vtQty theo vtDim.
  // Kết quả: { '1200×260×18': 123, ... }
  function getVanThoStockByWeek(yearNum, upToWeek) {
    const year = parseInt(yearNum);
    const stock = {};
    const norm = (k) => String(k || '').trim().toLowerCase().replace(/[x*]/g, '×');
    const maxWeek = (upToWeek && upToWeek > 0) ? Math.min(Math.floor(upToWeek), 53) : 53;
    state.pressRecords.forEach(r => {
      if ((r.year || getDateYear(r.date)) !== year) return;
      const w = pressRecordWeek(r);
      if (!w || w > maxWeek) return;
      (r.vanTho || []).forEach(l => {
        const k = norm(l.vtDim);
        if (k) stock[k] = (stock[k] || 0) + (parseFloat(l.vtQty) || 0);
      });
    });
    return stock;
  }

  // Tổng hợp tồn kho ván thô KHẢ DỤNG đến tuần upToWeek — ĐỒNG BỘ với công thức
  // trượt của bảng ma trận kế hoạch (xem renderPlanningView):
  //   Tồn hiển thị tuần W = Lũy kế(W) + Dự kiến(W)
  //   Lũy kế(W + 1)       = Tồn hiển thị(W) − Cần(W)
  //   Lũy kế tuần 1       = tổng tồn kho thực tế cả năm (các lô đang tồn hiện tại)
  // ⇒ Kết quả cho tuần W = Tồn thực tế + Σ Dự kiến(1..W) − Σ Cần(1..W−1)
  //   (tuần W không tự trừ Cần(W) — Cần(W) chính là thứ cần đánh giá khả năng đáp ứng)
  // Phản ánh "ván thô có thể được sản xuất ở các ngày/thời điểm khác nhau trước
  // khi đưa vào ghép" → tồn lũy kế cộng dồn Dự kiến nhiều tuần, trừ Cần các tuần trước.
  // upToWeek = null/0 → tính cho tuần 52 (toàn năm).
  function getCumulativeInventoryByWeek(yearNum, upToWeek) {
    const year = parseInt(yearNum);
    const inventoryByWeek = getNanInventoryByWeek(year);
    const weekNeeds = computePlanningWeekNeeds(year);
    const isNanKey = (k) => k !== 'glue' && k !== 'additive';

    // Gom toàn bộ khóa composite (kích thước@mục đích) từ 3 nguồn: lô thực tế + Dự kiến + Cần
    const keys = new Set();
    Object.values(inventoryByWeek).forEach(wk => Object.keys(wk).forEach(k => keys.add(k)));
    for (let w = 1; w <= 52; w++) {
      const fc = state.planningForecast[year]?.[String(w)] || {};
      Object.keys(fc).forEach(k => keys.add(k));
      const needs = weekNeeds[w] || {};
      Object.keys(needs).forEach(k => { if (isNanKey(k)) keys.add(k); });
    }

    // Tồn ban đầu = tổng tồn kho thực tế CẢ NĂM (các lô đang tồn kho hiện tại)
    const cumulative = {};
    keys.forEach(k => {
      cumulative[k] = Object.keys(inventoryByWeek).reduce((s, w) => s + (inventoryByWeek[w]?.[k] || 0), 0);
    });

    // Trượt tuần 1 → upToWeek: + Dự kiến tuần w ; − Cần các tuần TRƯỚC tuần đích
    const maxWeek = (upToWeek && upToWeek > 0) ? Math.min(Math.floor(upToWeek), 52) : 52;
    for (let w = 1; w <= maxWeek; w++) {
      const fc = state.planningForecast[year]?.[String(w)] || {};
      keys.forEach(k => { cumulative[k] += parseFloat(fc[k]) || 0; });
      if (w < maxWeek) {
        const needs = weekNeeds[w] || {};
        keys.forEach(k => { cumulative[k] -= parseFloat(needs[k]) || 0; });
      }
    }
    return cumulative;
  }

  // Lấy sản lượng tối đa có thể sản xuất của một sản phẩm (theo productId)
  // tại một tuần. ƯU TIÊN ĐỊNH MỨC VÁN THÔ (BOM phụ) — tồn từ các lượt ép;
  // sản phẩm chưa có BOM phụ → suy từ định mức nan:
  //   Tồn khả dụng = Tồn thực tế + Σ Dự kiến(1..W) − Σ Cần(1..W−1).
  // weekNum = null → tính đến cuối năm.
  function getMaxProductionForProduct(yearNum, productId, weekNum) {
    const rate = state.materialRates.find(r => r.id === productId);
    if (!rate) return null;

    // 1) BOM phụ: quy đổi trực tiếp từ tồn "Ván Thô Tạo Ra"
    const bom = getProductBom(productId);
    if (bom) {
      const vanThoStock = getVanThoStockByWeek(yearNum, weekNum);
      const fromBom = calculateMaxProductionFromBom(bom, vanThoStock);
      if (fromBom) return fromBom;
    }

    // 2) Fallback: định mức nan (cơ chế cũ, giữ tương thích dữ liệu)
    const inventory = getCumulativeInventoryByWeek(yearNum, weekNum);
    const fromNan = calculateMaxProductionFromInventory(rate, inventory);
    return fromNan ? { ...fromNan, source: 'nan' } : fromNan;
  }

  // Tính sản lượng tối đa cho TẤT CẢ sản phẩm trong một năm/tuần
  // → { [productId]: { maxProduction, components[], bottleneck, ... } }
  function computeMaxProductionByProduct(yearNum, weekNum) {
    const result = {};
    state.materialRates.forEach(rate => {
      const mp = getMaxProductionForProduct(yearNum, rate.id, weekNum);
      if (mp) result[rate.id] = mp;
    });
    return result;
  }

  // ═══ MODAL: ĐỊNH MỨC VÁN THÔ → THÀNH PHẨM (BOM PHỤ) ═══
  function populateBomProductSelect() {
    const sel = document.getElementById('bom-product');
    if (!sel) return;
    const opts = state.materialRates.map(r => `<option value="${r.id}">${escapeHTML(r.product)}</option>`).join('');
    sel.innerHTML = '<option value="">-- Chọn thành phẩm (theo Kế hoạch sản xuất) --</option>' + opts;
  }

  // Gợi ý kích thước ván thô đã từng nhập ở các lượt ép
  function populateBomDimList() {
    const dl = document.getElementById('bom-dim-list');
    if (!dl) return;
    const dims = new Set();
    state.pressRecords.forEach(r => (r.vanTho || []).forEach(l => {
      if (l.vtDim) dims.add(String(l.vtDim).trim().toLowerCase().replace(/[x*]/g, '×'));
    }));
    dl.innerHTML = [...dims].sort().map(d => `<option value="${escapeHTML(d)}"></option>`).join('');
  }

  function buildBomLineHTML(idx, line = {}) {
    return `
      <div class="press-line-row" data-line-idx="${idx}">
        <div class="press-line-fields">
          <input type="text" class="bl-vtdim" list="bom-dim-list" placeholder="Kích thước ván thô (VD: 1200×260×18)" value="${escapeHTML(line.vtDim || '')}" style="flex:2;">
          <input type="number" class="bl-ratio" min="0" step="any" placeholder="Tỷ lệ (VD: 2)" title="Số tấm ván thô này cần để ghép 1 tấm thành phẩm" value="${line.ratio || ''}" style="flex:1;">
          <button type="button" class="press-line-remove" onclick="app.removeBomLine(this)" title="Bỏ loại ván thô này"><i data-lucide="trash-2"></i></button>
        </div>
      </div>`;
  }

  function addBomLine(line = {}) {
    const container = document.getElementById('bom-lines');
    if (!container) return;
    const count = container.querySelectorAll('.press-line-row').length;
    if (count >= 3) { showToast('Tối đa 3 loại ván thô cho một thành phẩm!', 'error'); return; }
    container.insertAdjacentHTML('beforeend', buildBomLineHTML(count, line));
    initLucide();
  }

  function removeBomLine(btn) {
    const container = document.getElementById('bom-lines');
    if (!container) return;
    const rows = container.querySelectorAll('.press-line-row');
    if (rows.length <= 1) { container.innerHTML = ''; addBomLine(); return; }
    btn.closest('.press-line-row')?.remove();
  }

  function collectBomLines() {
    const lines = [];
    document.querySelectorAll('#bom-lines .press-line-row').forEach(row => {
      lines.push({
        vtDim: row.querySelector('.bl-vtdim')?.value.trim() || '',
        ratio: parseFloat(row.querySelector('.bl-ratio')?.value) || 0
      });
    });
    return lines;
  }

  // Chuẩn hóa khóa kích thước: '1200x260X18' -> '1200×260×18'
  function normalizeDimKey(k) {
    return String(k || '').trim().toLowerCase().replace(/[x*]/g, '×');
  }

  // Mở modal thêm/sửa định mức
  function openProductBomModal(bomId = null) {
    if (!requireEditPermission()) return;
    const modal = document.getElementById('modal-product-bom');
    const form = document.getElementById('product-bom-form');
    const titleEl = document.getElementById('bom-modal-title');
    if (!modal || !form) return;

    form.reset();
    populateBomProductSelect();
    populateBomDimList();
    document.getElementById('bom-lines').innerHTML = '';
    document.getElementById('bom-id').value = '';

    if (bomId) {
      const bom = state.productBoms.find(b => b.id === bomId);
      if (!bom) return;
      const rate = state.materialRates.find(r => r.id === bom.productId);
      if (titleEl) titleEl.innerHTML = `<i data-lucide="edit-3"></i> Sửa Định Mức Ván Thô: ${rate ? escapeHTML(rate.product) : '?'}`;
      document.getElementById('bom-id').value = bom.id;
      const sel = document.getElementById('bom-product');
      if (sel && ![...sel.options].some(o => o.value === bom.productId)) {
        sel.insertAdjacentHTML('beforeend', `<option value="${bom.productId}">(Sản phẩm đã xóa)</option>`);
      }
      sel.value = bom.productId;
      (bom.lines && bom.lines.length ? bom.lines : [{}]).forEach(l => addBomLine(l));
    } else {
      if (titleEl) titleEl.innerHTML = `<i data-lucide="layers"></i> Thêm Định Mức Ván Thô`;
      addBomLine();
      addBomLine();
    }

    modal.classList.add('show');
    initLucide();
  }

  function closeProductBomModal() {
    document.getElementById('modal-product-bom')?.classList.remove('show');
  }

  function handleProductBomSubmit(e) {
    e.preventDefault();
    if (!requireEditPermission()) return;
    const bomId = document.getElementById('bom-id').value;
    const productId = document.getElementById('bom-product').value;
    const lines = collectBomLines().filter(l => l.vtDim || l.ratio > 0);

    if (!productId) { showToast('Vui lòng chọn thành phẩm!', 'error'); return; }
    const rate = state.materialRates.find(r => r.id === productId);
    if (!rate) { showToast('Thành phẩm không tồn tại trong định mức kế hoạch!', 'error'); return; }
    if (lines.length === 0) { showToast('Cần ít nhất 1 loại ván thô (kích thước + tỷ lệ)!', 'error'); return; }
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (!normalizeDimKey(l.vtDim)) { showToast(`Dòng ván thô #${i + 1}: thiếu kích thước (VD: 1200×260×18)!`, 'error'); return; }
      if (!(l.ratio > 0)) { showToast(`Dòng ván thô #${i + 1}: tỷ lệ phải lớn hơn 0!`, 'error'); return; }
    }
    const dims = lines.map(l => normalizeDimKey(l.vtDim));
    if (new Set(dims).size !== dims.length) { showToast('Không được nhập trùng kích thước ván thô!', 'error'); return; }
    // Mỗi thành phẩm chỉ có MỘT định mức ván thô
    const dup = state.productBoms.find(b => b.productId === productId && b.id !== bomId);
    if (dup) { showToast(`Sản phẩm "${rate.product}" đã có định mức ván thô! Hãy sửa định mức hiện có.`, 'error'); return; }

    const bomData = {
      id: bomId || `bom-${Date.now()}`,
      productId,
      lines: lines.map(l => ({ vtDim: normalizeDimKey(l.vtDim), ratio: l.ratio })),
      createdAt: new Date().toISOString()
    };

    if (bomId) {
      const idx = state.productBoms.findIndex(b => b.id === bomId);
      if (idx !== -1) state.productBoms[idx] = bomData;
      showToast('Đã cập nhật định mức ván thô!', 'success');
    } else {
      state.productBoms.push(bomData);
      showToast('Đã thêm định mức ván thô!', 'success');
    }

    saveProductBoms();
    closeProductBomModal();
    renderPlanningView();
  }

  function deleteProductBom(bomId) {
    if (!requireEditPermission()) return;
    const bom = state.productBoms.find(b => b.id === bomId);
    if (!bom) return;
    const rate = state.materialRates.find(r => r.id === bom.productId);
    if (confirm(`Xóa định mức ván thô của "${rate ? rate.product : bom.productId}"?`)) {
      state.productBoms = state.productBoms.filter(b => b.id !== bomId);
      saveProductBoms();
      renderPlanningView();
      showToast('Đã xóa định mức ván thô', 'info');
    }
  }

  function openMaterialRateModal(rateId = null) {
    if (!requireEditPermission()) return;
    const modal = document.getElementById('modal-material-rate');
    const form = document.getElementById('material-rate-form');
    const titleEl = document.getElementById('material-rate-modal-title');
    if (!modal || !form) return;

    form.reset();
    populateNanSelects();

    if (rateId) {
      const rate = state.materialRates.find(r => r.id === rateId);
      if (!rate) return;
      if (titleEl) titleEl.innerHTML = `<i data-lucide="edit-3"></i> Sửa Định Mức: ${escapeHTML(rate.product)}`;
      document.getElementById('mat-rate-id').value = rate.id;
      document.getElementById('mat-rate-product').value = rate.product;
      document.getElementById('mat-rate-nan1').value = rate.nan1 || '';
      document.getElementById('mat-rate-nan1-qty').value = formatNanQty(rate.nan1Qty);
      document.getElementById('mat-rate-nan2').value = rate.nan2 || '';
      document.getElementById('mat-rate-nan2-qty').value = formatNanQty(rate.nan2Qty);
      document.getElementById('mat-rate-nan3').value = rate.nan3 || '';
      document.getElementById('mat-rate-nan3-qty').value = formatNanQty(rate.nan3Qty);
      document.getElementById('mat-rate-glue').value = rate.glue;
      document.getElementById('mat-rate-additive').value = rate.additive;
      document.getElementById('mat-rate-efficiency').value = rate.efficiency;
    } else {
      if (titleEl) titleEl.innerHTML = `<i data-lucide="book-open"></i> Thêm Định Mức Mới`;
      document.getElementById('mat-rate-id').value = '';
      document.getElementById('mat-rate-efficiency').value = 70;
    }

    modal.classList.add('show');
    initLucide();
  }

  function closeMaterialRateModal() {
    document.getElementById('modal-material-rate')?.classList.remove('show');
  }

  function handleMaterialRateSubmit(e) {
    e.preventDefault();
    const rateId = document.getElementById('mat-rate-id').value;
    const product = document.getElementById('mat-rate-product').value.trim();
    const nan1 = document.getElementById('mat-rate-nan1').value;
    const nan1Qty = parseFractionValue(document.getElementById('mat-rate-nan1-qty').value);
    const nan2 = document.getElementById('mat-rate-nan2').value;
    const nan2Qty = parseFractionValue(document.getElementById('mat-rate-nan2-qty').value);
    const nan3 = document.getElementById('mat-rate-nan3').value;
    const nan3Qty = parseFractionValue(document.getElementById('mat-rate-nan3-qty').value);
    const glue = parseFloat(document.getElementById('mat-rate-glue').value) || 0;
    const additive = parseFloat(document.getElementById('mat-rate-additive').value) || 0;
    const efficiency = parseInt(document.getElementById('mat-rate-efficiency').value) || 70;

    if (!product) { showToast('Tên sản phẩm không được để trống!', 'error'); return; }
    if (!nan1 || nan1Qty <= 0) { showToast('Phải chọn ít nhất 1 loại nan và số lượng!', 'error'); return; }
    if (glue < 0 || additive < 0) { showToast('Keo và phụ gia không được âm!', 'error'); return; }
    if (efficiency < 1 || efficiency > 100) { showToast('Hiệu suất phải từ 1-100%!', 'error'); return; }

    const rateData = {
      id: rateId || `rate-${Date.now()}`,
      product,
      nan1, nan1Qty,
      nan2: nan2 || null, nan2Qty: nan2 ? nan2Qty : 0,
      nan3: nan3 || null, nan3Qty: nan3 ? nan3Qty : 0,
      glue, additive, efficiency,
      createdAt: new Date().toISOString()
    };

    if (rateId) {
      const idx = state.materialRates.findIndex(r => r.id === rateId);
      if (idx !== -1) state.materialRates[idx] = rateData;
      showToast('Đã cập nhật định mức thành công!', 'success');
    } else {
      state.materialRates.push(rateData);
      showToast('Đã thêm định mức mới thành công!', 'success');
    }

    saveMaterialRates();
    closeMaterialRateModal();
    renderPlanningView();
  }

  function deleteMaterialRate(rateId) {
    if (!requireEditPermission()) return;
    const rate = state.materialRates.find(r => r.id === rateId);
    if (!rate) return;
    if (confirm(`Bạn có chắc muốn xóa định mức "${rate.product}"?`)) {
      state.materialRates = state.materialRates.filter(r => r.id !== rateId);
      saveMaterialRates();
      renderPlanningView();
      showToast('Đã xóa định mức', 'info');
    }
  }

  // Mở modal thêm kế hoạch
  function openPlanningItemModal() {
    if (!requireEditPermission()) return;
    const modal = document.getElementById('modal-planning-item');
    if (!modal) return;
    if (state.materialRates.length === 0) {
      showToast('Vui lòng thêm định mức trước khi tạo kế hoạch!', 'error');
      return;
    }
    document.getElementById('planning-item-form').reset();
    populatePlanningProductSelect();
    // Mặc định: Năm hiện tại, Tuần hiện tại
    populatePlanningItemYearWeekDefaults();
    modal.classList.add('show');
    initLucide();
  }

  function closePlanningItemModal() {
    document.getElementById('modal-planning-item')?.classList.remove('show');
  }

  function handlePlanningItemSubmit(e) {
    e.preventDefault();
    const yearVal = document.getElementById('plan-item-year').value;
    const weekNum = document.getElementById('plan-item-week').value;
    const productId = document.getElementById('plan-item-product').value;
    const qty = parseInt(document.getElementById('plan-item-qty').value) || 0;

    if (!yearVal) { showToast('Năm sản xuất không được để trống!', 'error'); return; }
    if (!weekNum) { showToast('Tuần sản xuất không được để trống!', 'error'); return; }
    if (!productId) { showToast('Vui lòng chọn sản phẩm!', 'error'); return; }
    if (qty <= 0) { showToast('Số lượng phải lớn hơn 0!', 'error'); return; }

    const weekLabel = `Tuần ${weekNum}`;

    state.planningItems.push({
      id: `plan-${Date.now()}`,
      week: weekLabel,
      year: parseInt(yearVal),
      productId,
      qty,
      createdAt: new Date().toISOString()
    });

    savePlanningItems();
    closePlanningItemModal();
    renderPlanningView();
    showToast('Đã thêm kế hoạch sản xuất!', 'success');
  }

  function deletePlanningItem(itemId) {
    if (!requireEditPermission()) return;
    const item = state.planningItems.find(p => p.id === itemId);
    if (!item) return;
    if (confirm('Bạn có chắc muốn xóa kế hoạch này?')) {
      state.planningItems = state.planningItems.filter(p => p.id !== itemId);
      savePlanningItems();
      renderPlanningView();
      showToast('Đã xóa kế hoạch', 'info');
    }
  }

  // Lấy các kế hoạch thuộc một tuần (theo năm) để nhân bản/sửa cả thẻ
  function getPlanningItemsOfWeek(weekNum, yearNum) {
    return state.planningItems.filter(p => {
      const py = p.year || getYearFromWeek(p.week);
      return py === parseInt(yearNum) && getWeekNumber(p.week) === parseInt(weekNum);
    });
  }

  // Điền năm & tuần cho modal nhân bản/sửa thẻ
  function populatePlanningEditYearWeek(year, weekNum) {
    const yearSelect = document.getElementById('plan-edit-year');
    if (yearSelect) {
      const years = getAvailablePlanningYears();
      const currentYear = new Date().getFullYear();
      if (!years.includes(currentYear)) years.push(currentYear);
      years.sort((a, b) => a - b);
      yearSelect.innerHTML = '<option value="">-- Chọn năm --</option>' +
        years.map(y => `<option value="${y}" ${String(y) === String(year) ? 'selected' : ''}>Năm ${y}</option>`).join('');
    }
    const weekSelect = document.getElementById('plan-edit-week');
    if (weekSelect) {
      weekSelect.innerHTML = '<option value="">-- Chọn tuần --</option>' +
        Array.from({ length: 52 }, (_, i) => i + 1)
          .map(w => `<option value="${w}" ${String(w) === String(weekNum) ? 'selected' : ''}>Tuần ${w}</option>`)
          .join('');
    }
  }

  // Xây danh sách sản phẩm + số lượng trong modal (mỗi hàng một sản phẩm)
  function buildPlanningEditItems(rows) {
    const container = document.getElementById('plan-edit-items');
    if (!container) return;
    container.innerHTML = rows.map((r, i) => `
      <div class="plan-edit-item-row">
        <span class="plan-edit-item-name">${escapeHTML(r.name)}</span>
        <label class="plan-edit-qty-label"><span>Số ván (tấm)</span>
          <input type="number" class="plan-edit-qty" data-index="${i}" min="1" step="1" value="${r.qty}">
        </label>
      </div>`).join('');
  }

  // Mở modal nhân bản / sửa thẻ kế hoạch
  function openPlanningEditModal(mode, itemIds, year, weekNum) {
    const modal = document.getElementById('modal-planning-edit');
    if (!modal) return;
    if (state.materialRates.length === 0) {
      showToast('Vui lòng thêm định mức trước khi thao tác với kế hoạch!', 'error');
      return;
    }
    document.getElementById('plan-edit-mode').value = mode;
    document.getElementById('plan-edit-id').value = itemIds.join(',');

    const items = state.planningItems.filter(p => itemIds.includes(p.id));
    const rows = items.map(p => {
      const rate = state.materialRates.find(r => r.id === p.productId);
      return { name: rate ? rate.product : 'Sản phẩm đã xóa', qty: p.qty || 0 };
    });
    buildPlanningEditItems(rows);
    populatePlanningEditYearWeek(year, weekNum);

    const title = document.getElementById('plan-edit-title');
    const saveBtn = document.getElementById('btn-save-plan-edit');
    if (mode === 'dup') {
      title.innerHTML = '<i data-lucide="copy"></i> Nhân Bản Thẻ Kế Hoạch';
      saveBtn.innerHTML = '<i data-lucide="copy"></i> Nhân Bản';
    } else {
      title.innerHTML = '<i data-lucide="edit-3"></i> Sửa Thẻ Kế Hoạch';
      saveBtn.innerHTML = '<i data-lucide="check"></i> Lưu Thay Đổi';
    }
    modal.classList.add('show');
    initLucide();
  }

  // Nhân bản thẻ kế hoạch: tạo bản sao, mặc định chuyển sang tuần kế tiếp để nằm ngay cạnh thẻ gốc
  function duplicatePlanningGroup(weekNum, yearNum) {
    if (!requireEditPermission()) return;
    const items = getPlanningItemsOfWeek(weekNum, yearNum);
    if (items.length === 0) return;
    const nextWeek = Math.min(parseInt(weekNum) + 1, 52);
    openPlanningEditModal('dup', items.map(p => p.id), yearNum, nextWeek);
  }

  // Sửa thẻ kế hoạch: đổi tên tuần & số lượng ván của cả nhóm
  function editPlanningGroup(weekNum, yearNum) {
    if (!requireEditPermission()) return;
    const items = getPlanningItemsOfWeek(weekNum, yearNum);
    if (items.length === 0) return;
    openPlanningEditModal('edit', items.map(p => p.id), yearNum, weekNum);
  }

  function closePlanningEditModal() {
    document.getElementById('modal-planning-edit')?.classList.remove('show');
  }

  function handlePlanningEditSubmit(e) {
    e.preventDefault();
    const mode = document.getElementById('plan-edit-mode').value;
    const yearVal = document.getElementById('plan-edit-year').value;
    const weekNum = document.getElementById('plan-edit-week').value;
    const ids = (document.getElementById('plan-edit-id').value || '').split(',').filter(Boolean);

    if (!yearVal) { showToast('Vui lòng chọn năm sản xuất!', 'error'); return; }
    if (!weekNum) { showToast('Vui lòng chọn tuần sản xuất!', 'error'); return; }

    const qtys = Array.from(document.querySelectorAll('#plan-edit-items .plan-edit-qty'))
      .map(inp => parseInt(inp.value) || 0);
    if (qtys.length === 0) { showToast('Không có sản phẩm nào trong thẻ!', 'error'); return; }
    if (qtys.some(q => q <= 0)) { showToast('Số lượng ván phải lớn hơn 0!', 'error'); return; }

    const weekLabel = `Tuần ${weekNum}`;
    const yearNum = parseInt(yearVal);
    const targetItems = state.planningItems.filter(p => ids.includes(p.id));

    if (mode === 'dup') {
      targetItems.forEach((src, i) => {
        state.planningItems.push({
          id: `plan-${Date.now()}-${i}`,
          week: weekLabel,
          year: yearNum,
          productId: src.productId,
          qty: qtys[i] !== undefined ? qtys[i] : (src.qty || 0),
          createdAt: new Date().toISOString(),
          duplicatedFrom: src.id
        });
      });
      showToast('Đã nhân bản thẻ kế hoạch!', 'success');
    } else {
      targetItems.forEach((item, i) => {
        item.week = weekLabel;
        item.year = yearNum;
        if (qtys[i] !== undefined) item.qty = qtys[i];
      });
      showToast('Đã cập nhật thẻ kế hoạch!', 'success');
    }

    savePlanningItems();
    closePlanningEditModal();
    renderPlanningView();
  }

export {
  addBomLine,
  buildPlanningEditItems,
  calculateMaxProductionFromBom,
  calculateMaxProductionFromInventory,
  calculatePlanningNeeds,
  closeMaterialRateModal,
  closePlanningEditModal,
  closePlanningItemModal,
  closeProductBomModal,
  computeMaxProductionByProduct,
  computePlanningWeekNeeds,
  deleteMaterialRate,
  deletePlanningItem,
  deleteProductBom,
  dimUseKey,
  duplicatePlanningGroup,
  editPlanningGroup,
  forecastAssumeWeek,
  forecastClearWeek,
  formatNanQty,
  getAvailablePlanningYears,
  getCumulativeInventoryByWeek,
  getCurrentISOWeeks,
  getMaxProductionForProduct,
  getForecastVal,
  getNanDisplayRows,
  getNanInventoryByWeek,
  getProductBom,
  getPlanningItemsOfWeek,
  getRateNanSummary,
  getSay1WeeklyQuantities,
  getUniqueNanTypes,
  getUnitVolume,
  getUseForFromName,
  getVanThoStockByWeek,
  getWeekNumber,
  getYearFromWeek,
  handleMaterialRateSubmit,
  handlePlanningEditSubmit,
  handlePlanningItemSubmit,
  handleProductBomSubmit,
  loadMaterialRates,
  loadPlanningForecast,
  loadPlanningItems,
  loadPlanningStock,
  loadProductBoms,
  openMaterialRateModal,
  openPlanningEditModal,
  openPlanningItemModal,
  openProductBomModal,
  parseFractionValue,
  populateBomProductSelect,
  populateNanSelects,
  populatePlanningEditYearWeek,
  populatePlanningItemYearWeekDefaults,
  populatePlanningProductSelect,
  populatePlanningYearFilter,
  removeBomLine,
  renderMaterialRatesTable,
  renderPlanningListSection,
  renderPlanningMatrix,
  renderPlanningView,
  renderProductBomTable,
  restoreRateTableCollapse,
  saveMaterialRates,
  savePlanningForecast,
  savePlanningItems,
  savePlanningStock,
  saveProductBoms,
  scrollMatrixToCurrentWeek,
  selectPlanningProduct,
  toggleRateTableCollapse,
  useSuffix
};
