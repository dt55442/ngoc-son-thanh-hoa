// ═══════════════════════════════════════════════════════════
// js/planning.js — tách từ app.js (refactor ES-modules phase 1)
// ═══════════════════════════════════════════════════════════
import { firePushSync, initLucide, requireEditPermission } from './cloud.js';
import { logDataChange } from './history.js';
import { getDateYear, getPressedQtyForPlan, pressRecordWeek } from './press.js';
import { STORAGE_KEY_MATERIAL_RATES, STORAGE_KEY_PLANNING_FORECAST, STORAGE_KEY_PLANNING_ITEMS, STORAGE_KEY_PLANNING_STOCK, state } from './state.js';
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
    logDataChange(['materialRates']);
    firePushSync();
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
    logDataChange(['planningItems']);
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
    logDataChange(['planningForecast']);
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
    logDataChange(['planningStock']);
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
                  // Sản lượng tối đa có thể ép từ THANH ĐẠT (đầu ra bào tinh) lũy kế tuần 1 → tuần kế hoạch
                  const maxProd = getMaxProductionForProduct(yearNum, item.productId, weekNum);
                  const maxProdHtml = maxProd ? `<span class="plan-item-capacity" title="Sản lượng tối đa từ thanh đạt KHẢ DỤNG đến tuần ${weekNum} (Σ Đã bào tinh + Σ Dự kiến − Σ Đã ép thực tế các tuần đã qua − Σ Cần từ tuần hiện tại, đồng bộ bảng Bào Tinh ↔ Đã Ép). Bottleneck: ${escapeHTML(maxProd.bottleneck.nanKey)} ×${maxProd.bottleneck.rate} — còn ${maxProd.bottleneck.available.toLocaleString('vi-VN')} thanh"><i data-lucide="layers" style="width:10px;height:10px;"></i> Có thể ép: <strong>${maxProd.maxProduction.toLocaleString('vi-VN')}</strong></span>` : '';
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

  // Pre-compute dữ liệu từng tuần của BẢNG KẾ HOẠCH TỔNG HỢP (dùng cho body + footer).
  // Trả về: weekData[week] = { nan: { ucKey: { ton, dk, can } }, glue, additive,
  //          glueTon, additiveTon, glueInput, additiveInput }
  // Tồn kho lũy kế theo tuần (thời gian thực):
  //   Tồn thực tế tuần W = các lô nan NHẬP VỀ trong tuần W — lô nhập tuần nào thì
  //   số lượng chỉ xuất hiện từ tuần đó trở đi (dữ liệu mới có từ tuần 34 thì
  //   các tuần 1-33 tồn = 0, KHÔNG đổ tồn cả năm về tuần 1 như bản cũ).
  //   Tuần 1: Tổng tồn = Tồn thực tế tuần 1 + Dự kiến tuần 1
  // Phép trượt tồn sang tuần sau (nếu tuần hiện tại là "n"):
  //   - Tuần ĐÃ QUÁ KHỨ (< n): Tổng tồn = tồn số thanh của tuần đó − số thanh
  //     ĐÃ CHUYỂN BÀO TINH (từ lịch sử chuyển công đoạn) — bào tinh là mốc nguyên
  //     liệu rời kho: trong quá trình bào tinh thanh lỗi bị loại, thanh đạt chuyển
  //     sang ép ván (theo dõi riêng ở bảng "Bào Tinh ↔ Đã Ép" tab Ép Ván).
  //   - Tuần HIỆN TẠI (n) TRỞ ĐI: Tổng tồn = tồn lũy kế − số thanh THEO KẾ HOẠCH
  //     ("Cần") vì chưa có lượng đã bào tinh là bao nhiêu.
  // Tồn keo & phụ gia lũy kế (kế thừa qua các tuần) — vẫn trừ Cần kế hoạch:
  //   Tồn tuần (n) = Tồn tuần (n-1) - Cần tuần (n-1) + Nhập tay tuần (n)
  function computePlanningWeekData(yearNum) {
    const year = parseInt(yearNum);
    const purposeList = ['Ván', 'Bullig'];
    const nanTypes = getUniqueNanTypes();
    const rowByUc = {};
    getNanDisplayRows().forEach(r => { rowByUc[r.ucKey] = r; });
    const gridCells = [];
    nanTypes.forEach(dim => purposeList.forEach(p => {
      const ucKey = dimUseKey(dim.key, p);
      gridCells.push(rowByUc[ucKey] || { dimKey: dim.key, ucKey, useFor: p, label: dim.key, length: 0, width: 0, thickness: 0 });
    }));

    const weekNeeds = computePlanningWeekNeeds(year);
    const inventoryByWeek = getNanInventoryByWeek(year);      // Tồn nguyên liệu theo tuần (mọi lô tính tại tuần nhập)
    const convertedByWeek = getBaoTinhConvertedByWeek(year);  // Số thanh ĐÃ CHUYỂN BÀO TINH theo tuần

    const cumulativeInventory = {};
    gridCells.forEach(c => { cumulativeInventory[c.ucKey] = 0; });
    const weekData = {}; // week -> { nan: { key: { ton, dk, can } }, glue, additive }
    // Sổ theo dõi từng ô tồn (tra cứu "số này từ đâu ra"): ledger[ucKey][week-1] =
    // { week, carryIn (lũy kế đầu tuần), import (nhập thực tế), dk (dự kiến),
    //   deduct + deductLabel (trượt: đã bào tinh / cần kế hoạch), ton (hiển thị) }
    // → dùng cho tooltip biểu thức & hộp thoại chi tiết khi bấm vào ô TỔNG TỒN.
    const ledger = {};
    gridCells.forEach(c => { ledger[c.ucKey] = []; });

    let cumulativeGlueStock = 0;
    let cumulativeAdditiveStock = 0;

    for (let week = 1; week <= 52; week++) {
      const weekKey = String(week);
      const needs = weekNeeds[week] || { glue: 0, additive: 0 };
      weekData[week] = { nan: {}, glue: needs.glue, additive: needs.additive };

      // Lấy số tồn nhập tay cho tuần này (nếu có)
      const stockWeek = state.planningStock[year]?.[weekKey] || {};
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

      const invWeek = inventoryByWeek[week] || {};
      const convWeek = convertedByWeek[week] || {};
      const weekIsPast = isPlanningWeekPast(year, week);
      gridCells.forEach(c => {
        const carryIn = cumulativeInventory[c.ucKey]; // lũy kế đầu tuần (chưa cộng nhập của tuần này)
        const dkVal = getForecastVal(year, weekKey, c);
        const cellNeeds = needs[c.ucKey] || 0;
        // Cộng dồn tồn kho thực tế của các lô nan nhập về trong tuần này
        cumulativeInventory[c.ucKey] += invWeek[c.ucKey] || 0;
        // Tổng tồn tuần hiện tại = tồn kho lũy kế + Dự kiến tuần hiện tại
        const tonVal = cumulativeInventory[c.ucKey] + dkVal;
        weekData[week].nan[c.ucKey] = { ton: tonVal, dk: dkVal, can: cellNeeds };
        // Trượt sang tuần sau (Dự kiến đã được cộng vào lũy kế):
        //  - Tuần đã qua: trừ số thanh ĐÃ CHUYỂN BÀO TINH của tuần đó (thanh lỗi bị
        //    loại ngay ở công đoạn bào tinh — nguyên liệu rời kho ở mốc này)
        //  - Tuần hiện tại trở đi: trừ số thanh THEO KẾ HOẠCH (Cần)
        const deduction = weekIsPast ? (convWeek[c.ucKey] || 0) : cellNeeds;
        cumulativeInventory[c.ucKey] = tonVal - deduction;
        // Ghi sổ theo dõi cho ô này
        ledger[c.ucKey].push({
          week,
          carryIn,
          import: invWeek[c.ucKey] || 0,
          dk: dkVal,
          deduct: deduction,
          deductLabel: weekIsPast ? 'đã bào tinh (thực tế)' : 'cần (kế hoạch)',
          ton: tonVal
        });
      });
    }
    weekData.ledger = ledger; // đính kèm sổ theo dõi (không trùng khóa tuần 1..52)
    return weekData;
  }

  // Dòng biểu thức "Tồn(W) = ..." từ sổ theo dõi — dùng cho tooltip & hộp thoại chi tiết:
  //   Tồn(W) = Tồn hiển thị(W−1) − trượt(W−1) + Nhập thực tế(W) + Dự kiến(W)
  function buildTonExpression(entry, prevEntry) {
    const f = (v) => (Math.round((Number(v) || 0) * 100) / 100).toLocaleString('vi-VN');
    const parts = [];
    if (prevEntry) {
      parts.push({ sign: '', text: `${f(prevEntry.ton)} tồn tuần ${prevEntry.week}` });
      if (prevEntry.deduct) parts.push({ sign: '−', text: `${f(prevEntry.deduct)} ${prevEntry.deductLabel} tuần ${prevEntry.week}` });
    }
    parts.push({ sign: prevEntry ? '+' : '', text: `${f(entry.import)} nhập mới tuần ${entry.week}` });
    if (entry.dk) parts.push({ sign: '+', text: `${f(entry.dk)} dự kiến tuần ${entry.week}` });
    return `${f(entry.ton)} = ` + parts.map((p, i) => (i === 0 ? p.text : ` ${p.sign} ${p.text}`)).join('');
  }

  // Hộp thoại chi tiết một ô TỔNG TỒN: biểu thức tính + chuỗi tích lũy từng tuần
  // (yearNum, ucKey "kích thước@mục đích", week) — đọc từ data-trace trên ô bảng.
  function openMatrixTraceModal(yearNum, ucKey, week) {
    const modal = document.getElementById('modal-matrix-trace');
    if (!modal) return;
    const year = parseInt(yearNum);
    const w = Math.min(Math.max(parseInt(week) || 1, 1), 52);
    const weekData = computePlanningWeekData(year); // tính lại để luôn khớp dữ liệu mới nhất
    const rows = (weekData.ledger || {})[ucKey] || [];
    const entry = rows[w - 1];
    if (!entry) return;
    const prevEntry = w > 1 ? rows[w - 2] : null;

    const rowInfo = getNanDisplayRows().find(r => r.ucKey === ucKey);
    const rowLabel = rowInfo ? rowInfo.label : ucKey;
    const f = (v) => (Math.round((Number(v) || 0) * 100) / 100).toLocaleString('vi-VN');

    const titleEl = document.getElementById('matrix-trace-title');
    const exprEl = document.getElementById('matrix-trace-expression');
    const bodyEl = document.getElementById('matrix-trace-body');
    if (titleEl) titleEl.innerHTML = `<i data-lucide="calculator"></i> Chi Tiết: ${escapeHTML(rowLabel)} — Tuần ${w} · Năm ${year}`;
    if (exprEl) {
      exprEl.innerHTML = `<strong>${escapeHTML(buildTonExpression(entry, prevEntry))}</strong>` +
        (prevEntry ? ` <span style="color:var(--text-muted);">(tồn tuần ${prevEntry.week} − ${prevEntry.deductLabel} tuần ${prevEntry.week} + nhập/dự kiến tuần ${w})</span>` : '');
    }
    if (bodyEl) {
      bodyEl.innerHTML = rows.slice(0, w).map(r => `
        <tr${r.week === w ? ' style="background:rgba(124,58,237,0.08);"' : ''}>
          <td><strong>Tuần ${r.week}</strong>${r.week === w ? ' ←' : ''}</td>
          <td>${r.import ? f(r.import) : '—'}</td>
          <td>${r.dk ? f(r.dk) : '—'}</td>
          <td>${r.deduct ? `− ${f(r.deduct)} <small style="color:var(--text-muted);">(${escapeHTML(r.deductLabel)})</small>` : '—'}</td>
          <td><strong>${f(r.ton)}</strong></td>
        </tr>`).join('');
    }
    modal.classList.add('show');
    initLucide();
  }

  function closeMatrixTraceModal() {
    document.getElementById('modal-matrix-trace')?.classList.remove('show');
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
    // Pre-compute dữ liệu từng tuần (tồn lũy kế, Dự kiến, Cần, keo, phụ gia) —
    // xem computePlanningWeekData() phía trên: tuần đã qua trượt tồn bằng SỐ THANH
    // ĐÃ ÉP THỰC TẾ (tab Ép Ván), tuần hiện tại trở đi trượt bằng số thanh KẾ HOẠCH (Cần).
    const weekData = computePlanningWeekData(yearNum);

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
          return { purpose, ucKey: c.ucKey, data, dapUngClass, dapUngText };
        });

        // Khối TỔNG TỒN (Ván | Bullig) — tooltip kèm BIỂU THỨC TÍNH, bấm vào ô mở
        // hộp thoại chi tiết chuỗi tích lũy từng tuần (xem openMatrixTraceModal)
        cellInfo.forEach(ci => {
          const fullTon = ci.data.ton.toLocaleString('vi-VN');
          const led = weekData.ledger ? weekData.ledger[ci.ucKey] : null;
          const entry = led ? led[week - 1] : null;
          const prevEntry = (led && week > 1) ? led[week - 2] : null;
          const expr = entry ? buildTonExpression(entry, prevEntry) : '';
          const title = expr
            ? `TỔNG TỒN: ${fullTon} thanh\n${expr}\n— Bấm vào ô để xem chi tiết từng tuần —`
            : `TỔNG TỒN: ${fullTon} thanh`;
          tr += `<td class="mat-cell-ton" data-trace="${yearNum}|${ci.ucKey}|${week}" title="${escapeHTML(title)}">${fmtShortVal(ci.data.ton)}</td>`;
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

  // Tính tồn kho THANH NGUYÊN LIỆU theo từng tuần (thời gian thực) — bao gồm cả lô
  // đã chuyển Bào Tinh (tính tại tuần NHẬP lô, vì trước khi chuyển nó vẫn là tồn kho).
  // Lượng thanh RỜI kho nguyên liệu được trừ ở TUẦN CHUYỂN BÀO TINH — xem
  // getBaoTinhConvertedByWeek() + phép trượt trong computePlanningWeekData():
  // bào tinh là mốc thanh lỗi bị loại khỏi tồn, thanh đạt chuyển sang ép ván.
  // Nếu dữ liệu chỉ có tuần 33, 34 thì các tuần 1-32 sẽ có tồn = 0
  function getNanInventoryByWeek(year) {
    const inventoryByWeek = {}; // weekNum -> { nanKey: qty }
    const yearNum = parseInt(year);
    state.batches.forEach(b => {
      if (!b.date) return;
      const batchYear = parseInt(String(b.date).split('-')[0]);
      if (batchYear !== yearNum) return;
      const weekNum = getWeekNumber(b.week);
      if (!weekNum) return;
      const key = dimUseKey(`${b.length}×${b.width}×${b.thickness}`, b.useFor);
      if (!inventoryByWeek[weekNum]) inventoryByWeek[weekNum] = {};
      inventoryByWeek[weekNum][key] = (inventoryByWeek[weekNum][key] || 0) + (b.quantity || 0);
    });
    return inventoryByWeek;
  }

  // Ngày & tuần CHUYỂN BÀO TINH của một lô:
  //   ƯU TIÊN 1 — "Ngày Bào Tinh thực tế" (b.baoTinhDate) do người dùng khai báo/sửa:
  //     người nhập có thể thao tác trên hệ thống chậm hơn thực tế nên ngày bấm chuyển
  //     tự động có thể không phải ngày bào tinh thật.
  //   ƯU TIÊN 2 — nhận diện tự động: mốc 'bao_tinh' CUỐI cùng trong stageHistory
  //     (lô có thể chuyển đi và chuyển lại).
  //   Fallback — lô nhập trực tiếp ở Bào Tinh không có lịch sử: dùng ngày/tuần của lô.
  function getBaoTinhConversion(b) {
    if (b.baoTinhDate) {
      const weekNum = getWeekNumber(getISOWeekString(b.baoTinhDate));
      if (weekNum) return { date: b.baoTinhDate, weekNum };
    }
    const history = getBatchStageHistory(b);
    const baoEntries = history.filter(h => h && h.stage === 'bao_tinh' && h.date);
    if (baoEntries.length) {
      const date = baoEntries[baoEntries.length - 1].date;
      return { date, weekNum: getWeekNumber(getISOWeekString(date)) };
    }
    return { date: b.date, weekNum: getWeekNumber(b.week) };
  }

  // Số thanh ĐÃ CHUYỂN BÀO TINH theo tuần (nguồn: lịch sử chuyển công đoạn của lô).
  // Trả về { [weekNum]: { [ucKey]: số thanh } } — đây là lượng thanh RỜI kho nguyên
  // liệu ở tuần đó: trong quá trình bào tinh thanh lỗi bị loại, phần thanh đạt dùng ép.
  function getBaoTinhConvertedByWeek(year) {
    const convertedByWeek = {}; // weekNum -> { ucKey: qty }
    const yearNum = parseInt(year);
    state.batches.forEach(b => {
      if (b.stage !== 'bao_tinh') return; // chỉ lô ĐANG ở Bào Tinh (đã rời kho nguyên liệu)
      if (!b.quantity) return;
      const conv = getBaoTinhConversion(b);
      if (!conv.date || !conv.weekNum) return;
      const batchYear = parseInt(String(conv.date).split('-')[0]);
      if (batchYear !== yearNum) return;
      const key = dimUseKey(`${b.length}×${b.width}×${b.thickness}`, b.useFor);
      if (!convertedByWeek[conv.weekNum]) convertedByWeek[conv.weekNum] = {};
      convertedByWeek[conv.weekNum][key] = (convertedByWeek[conv.weekNum][key] || 0) + (b.quantity || 0);
    });
    return convertedByWeek;
  }

  // Tồn Bào Tinh HIỆN TẠI (thanh đạt chờ ép) quy về NĂM CHUYỂN ĐỔI của từng lô —
  // dùng để tách "thanh đạt chưa sử dụng" khỏi "thanh lỗi ước tính" trong bảng hiệu suất.
  function getBaoTinhStockByConversionYear() {
    const byYear = {}; // year -> qty
    state.batches.forEach(b => {
      if (b.stage !== 'bao_tinh') return;
      const conv = getBaoTinhConversion(b);
      const y = conv.date ? parseInt(String(conv.date).split('-')[0]) : NaN;
      if (isNaN(y)) return;
      byYear[y] = (byYear[y] || 0) + (b.quantity || 0);
    });
    return byYear;
  }

  // ─── Số thanh ĐÃ ÉP THỰC TẾ theo tuần (nguồn: các lượt ép trong tab Ép Ván) ──
  // Trả về { [weekNum]: { [ucKey]: số thanh đã dùng } } với ucKey là khóa composite
  // "kích thước@mục đích" đồng bộ với bảng kế hoạch (dimUseKey).
  // Ánh xạ từng dòng đầu vào (sticks[].nanKey) của lượt ép:
  //  - nanKey là KÍCH THƯỚC (VD: 1250×18×7) → khóa trực tiếp; mục đích suy từ sản
  //    phẩm của lượt ép (getUseForFromName).
  //  - nanKey là MÃ RIÊNG (VD: A1) → suy kích thước theo thứ tự:
  //      (1) định mức của sản phẩm lượt ép nếu chỉ khai báo ĐÚNG 1 loại nan;
  //      (2) các lô nan cùng loại (bambooType) nếu cùng duy nhất 1 kích thước.
  //    Không suy được → bỏ qua dòng này (không trừ tồn).
  function getActualPressedByWeek(yearNum) {
    const pressedByWeek = {}; // weekNum -> { ucKey: qty }
    const year = parseInt(yearNum);
    // Chuỗi kích thước chuẩn (thay x/* bằng ×, viết thường) — trả null nếu không phải kích thước
    const asDimKey = (k) => {
      const norm = String(k || '').trim().toLowerCase().replace(/[x*]/g, '×');
      const parts = norm.split('×').map(parseFloat);
      return (parts.length === 3 && parts.every(p => !isNaN(p) && p > 0)) ? norm : null;
    };
    // Suy khóa composite từ MÃ loại thanh qua các lô nan (bambooType trùng mã)
    const batchDimByCode = (code) => {
      const ucKeys = new Set();
      state.batches.forEach(b => {
        if (String(b.bambooType || '').trim().toLowerCase() !== code) return;
        const dim = asDimKey(`${b.length}×${b.width}×${b.thickness}`);
        if (dim) ucKeys.add(dimUseKey(dim, b.useFor || ''));
      });
      return ucKeys.size === 1 ? [...ucKeys][0] : null;
    };
    state.pressRecords.forEach(r => {
      const ry = r.year || getDateYear(r.date);
      if (ry !== year) return;
      const weekNum = pressRecordWeek(r);
      if (!weekNum) return;
      const rate = state.materialRates.find(rt => rt.id === r.productId) || null;
      const useForSpr = rate ? getUseForFromName(rate.product) : '';
      // Định mức chỉ có 1 loại nan → mã riêng cũng quy về kích thước đó
      const rateDims = rate ? [rate.nan1, rate.nan2, rate.nan3].filter(Boolean).map(asDimKey).filter(Boolean) : [];
      const singleRateKey = rateDims.length === 1 ? dimUseKey(rateDims[0], useForSpr) : null;
      (r.sticks || []).forEach(s => {
        const qty = parseFloat(s.sticks) || 0;
        const rawKey = String(s.nanKey || '').trim();
        if (!qty || !rawKey) return;
        const dim = asDimKey(rawKey);
        const ucKey = dim
          ? dimUseKey(dim, useForSpr)
          : (singleRateKey || batchDimByCode(rawKey.toLowerCase()));
        if (!ucKey) return; // không suy được kích thước → bỏ qua
        if (!pressedByWeek[weekNum]) pressedByWeek[weekNum] = {};
        pressedByWeek[weekNum][ucKey] = (pressedByWeek[weekNum][ucKey] || 0) + qty;
      });
    });
    return pressedByWeek;
  }

  // Tuần (năm, tuần) đã qua chưa so với hiện tại — quyết định nguồn số liệu tiêu hao
  // khi trượt tồn sang tuần sau: tuần đã qua dùng số ĐÃ ÉP thực tế, còn lại dùng KẾ HOẠCH.
  function isPlanningWeekPast(yearNum, week) {
    const now = new Date();
    const y = parseInt(yearNum);
    if (y !== now.getFullYear()) return y < now.getFullYear();
    return parseInt(week) < getCurrentISOWeeks();
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
      tbody.innerHTML = `<tr><td colspan="14" class="text-center" style="padding:30px;color:var(--text-muted);">
        <i data-lucide="book-open" style="width:28px;height:28px;margin-bottom:8px;"></i>
        <p>Chưa có định mức nào. Hãy thêm định mức nguyên vật liệu cho từng loại sản phẩm.</p></td></tr>`;
      return;
    }

    state.materialRates.forEach(rate => {
      const tr = document.createElement('tr');
      const nan1QtyDisplay = formatNanQty(rate.nan1Qty);
      const nan2QtyDisplay = formatNanQty(rate.nan2Qty);
      const nan3QtyDisplay = formatNanQty(rate.nan3Qty);
      const nan1 = rate.nan1 ? `<div class="rate-nan-info"><strong>${escapeHTML(rate.nan1)}</strong><br>${nan1QtyDisplay} thanh</div>` : '<span class="text-muted">-</span>';
      const nan2 = rate.nan2 ? `<div class="rate-nan-info"><strong>${escapeHTML(rate.nan2)}</strong><br>${nan2QtyDisplay} thanh</div>` : '<span class="text-muted">-</span>';
      const nan3 = rate.nan3 ? `<div class="rate-nan-info"><strong>${escapeHTML(rate.nan3)}</strong><br>${nan3QtyDisplay} thanh</div>` : '<span class="text-muted">-</span>';

      tr.innerHTML = `
        <td><span class="rate-product-name">${escapeHTML(rate.product)}</span></td>
        <td>${rate.productCode ? escapeHTML(rate.productCode) : '—'}</td>
        <td>${rate.fullName ? escapeHTML(rate.fullName) : '—'}</td>
        <td>${rate.pressType ? escapeHTML(rate.pressType) : '—'}</td>
        <td>${nan1}</td>
        <td>${nan1QtyDisplay || '-'}</td>
        <td>${nan2}</td>
        <td>${nan2QtyDisplay || '-'}</td>
        <td>${nan3}</td>
        <td>${nan3QtyDisplay || '-'}</td>
        <td>${rate.glue} kg</td>
        <td>${rate.additive} kg</td>
        <td>${rate.efficiency}%</td>
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

  // ── Thu gọn / mở rộng bảng dữ liệu trong thẻ .planning-card ──
  // Áp dụng chung cho: 2 bảng định mức (Kế hoạch), danh sách lượt ép (Sản lượng ép),
  // nhật ký nhập nguyên liệu (Nguyên liệu). Trạng thái lưu localStorage, nhớ từng thẻ.
  const RATE_COLLAPSE_KEY = 'bamboo_tracker_rate_collapse_v1';
  const COLLAPSE_CARDS = ['rate-main-card', 'press-table-card', 'material-table-card', 'material-plan-card', 'qc-export-card'];
  function saveRateCollapseState() {
    try {
      const data = {};
      COLLAPSE_CARDS.forEach((id) => {
        data[id] = document.getElementById(id)?.classList.contains('rate-table-collapsed') || false;
      });
      localStorage.setItem(RATE_COLLAPSE_KEY, JSON.stringify(data));
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
    COLLAPSE_CARDS.forEach((id) => {
      if (saved[id]) document.getElementById(id)?.classList.add('rate-table-collapsed');
    });
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

  // Tổng hợp tồn kho THANH ĐẠT (đầu ra Bào Tinh) KHẢ DỤNG đến tuần upToWeek —
  // ĐỒNG BỘ với cột "Còn lại (lũy kế)" của bảng "Bào Tinh ↔ Đã Ép" (tab Ép Ván):
  //   Tồn thanh đạt tuần W = Σ ĐÃ BÀO TINH(1..W) + Σ Dự kiến(1..W)
  //                          − Σ ĐÃ ÉP thực tế(các tuần ĐÃ QUÁ KHỨ trước W)
  //                          − Σ Cần(các tuần từ HIỆN TẠI → W−1)
  //   (tuần W không tự trừ lượng tiêu hao của tuần W — đó chính là thứ cần đánh giá)
  // Tuần đã qua: đã có số liệu ÉP THỰC TẾ (tab Ép Ván) → trừ số đã ép.
  // Tuần hiện tại trở đi: chưa có số đã ép thực tế → trừ số thanh THEO KẾ HOẠCH (Cần).
  // upToWeek = null/0 → tính cho tuần 52 (toàn năm).
  function getCumulativeInventoryByWeek(yearNum, upToWeek) {
    const year = parseInt(yearNum);
    const convertedByWeek = getBaoTinhConvertedByWeek(year); // thanh đạt đầu ra bào tinh (theo tuần chuyển)
    const weekNeeds = computePlanningWeekNeeds(year);
    const pressedByWeek = getActualPressedByWeek(year);
    const isNanKey = (k) => k !== 'glue' && k !== 'additive';

    // Gom toàn bộ khóa composite (kích thước@mục đích) từ 3 nguồn: đã bào tinh + Dự kiến + Cần
    const keys = new Set();
    Object.values(convertedByWeek).forEach(wk => Object.keys(wk).forEach(k => keys.add(k)));
    for (let w = 1; w <= 52; w++) {
      const fc = state.planningForecast[year]?.[String(w)] || {};
      Object.keys(fc).forEach(k => keys.add(k));
      const needs = weekNeeds[w] || {};
      Object.keys(needs).forEach(k => { if (isNanKey(k)) keys.add(k); });
    }

    const maxWeek = (upToWeek && upToWeek > 0) ? Math.min(Math.floor(upToWeek), 52) : 52;

    // Trượt tuần 1 → upToWeek:
    //   + Số thanh ĐÃ BÀO TINH tuần w (thanh đạt xuất hiện đúng tuần chuyển bào tinh)
    //   + Dự kiến tuần w (cộng dồn vì Dự kiến đã về là còn nằm trong lũy kế)
    //   − Số thanh ĐÃ ÉP thực tế của các tuần ĐÃ QUÁ KHỨ trước tuần đích
    //   − Số thanh THEO KẾ HOẠCH (Cần) của các tuần từ HIỆN TẠI trở đi trước tuần đích
    const cumulative = {};
    keys.forEach(k => { cumulative[k] = 0; });
    for (let w = 1; w <= maxWeek; w++) {
      const fc = state.planningForecast[year]?.[String(w)] || {};
      const conv = convertedByWeek[w] || {};
      keys.forEach(k => {
        cumulative[k] += (conv[k] || 0) + (parseFloat(fc[k]) || 0);
      });
      if (w < maxWeek) {
        const weekIsPast = isPlanningWeekPast(year, w);
        const needs = weekNeeds[w] || {};
        const pressed = pressedByWeek[w] || {};
        keys.forEach(k => {
          cumulative[k] -= weekIsPast ? (pressed[k] || 0) : (parseFloat(needs[k]) || 0);
        });
      }
    }
    return cumulative;
  }

  // Lấy sản lượng tối đa có thể sản xuất của một sản phẩm (theo productId)
  // tại một tuần — suy từ ĐỊNH MỨC NAN trên TỒN THANH ĐẠT (đầu ra Bào Tinh):
  //   Tồn khả dụng = Σ ĐÃ BÀO TINH(1..W) + Σ Dự kiến(1..W)
  //                  − Σ ĐÃ ÉP thực tế(các tuần đã qua) − Σ Cần(từ tuần hiện tại → W−1).
  // weekNum = null → tính đến cuối năm.
  function getMaxProductionForProduct(yearNum, productId, weekNum) {
    const rate = state.materialRates.find(r => r.id === productId);
    if (!rate) return null;

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
      document.getElementById('mat-rate-code').value = rate.productCode || '';
      document.getElementById('mat-rate-fullname').value = rate.fullName || '';
      document.getElementById('mat-rate-press-type').value = rate.pressType || '';
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
    const productCode = document.getElementById('mat-rate-code').value.trim();
    const fullName = document.getElementById('mat-rate-fullname').value.trim();
    const pressType = document.getElementById('mat-rate-press-type').value.trim();
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
      // Thông tin bổ sung (không bắt buộc) — Tên sản phẩm vẫn là khóa chính
      productCode: productCode || null,
      fullName: fullName || null,
      pressType: pressType || null,
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
  buildPlanningEditItems,
  buildTonExpression,
  calculateMaxProductionFromInventory,
  calculatePlanningNeeds,
  closeMaterialRateModal,
  closeMatrixTraceModal,
  closePlanningEditModal,
  closePlanningItemModal,
  computeMaxProductionByProduct,
  computePlanningWeekData,
  computePlanningWeekNeeds,
  deleteMaterialRate,
  deletePlanningItem,
  dimUseKey,
  duplicatePlanningGroup,
  editPlanningGroup,
  forecastAssumeWeek,
  forecastClearWeek,
  formatNanQty,
  getActualPressedByWeek,
  getAvailablePlanningYears,
  getBaoTinhConversion,
  getBaoTinhConvertedByWeek,
  getBaoTinhStockByConversionYear,
  getCumulativeInventoryByWeek,
  getCurrentISOWeeks,
  getMaxProductionForProduct,
  getForecastVal,
  getNanDisplayRows,
  getNanInventoryByWeek,
  getPlanningItemsOfWeek,
  getRateNanSummary,
  getSay1WeeklyQuantities,
  getUniqueNanTypes,
  getUnitVolume,
  getUseForFromName,
  getWeekNumber,
  getYearFromWeek,
  handleMaterialRateSubmit,
  handlePlanningEditSubmit,
  handlePlanningItemSubmit,
  loadMaterialRates,
  loadPlanningForecast,
  loadPlanningItems,
  loadPlanningStock,
  openMaterialRateModal,
  openMatrixTraceModal,
  openPlanningEditModal,
  openPlanningItemModal,
  parseFractionValue,
  populateNanSelects,
  populatePlanningEditYearWeek,
  populatePlanningItemYearWeekDefaults,
  populatePlanningProductSelect,
  populatePlanningYearFilter,
  renderMaterialRatesTable,
  renderPlanningListSection,
  renderPlanningMatrix,
  renderPlanningView,
  restoreRateTableCollapse,
  saveMaterialRates,
  savePlanningForecast,
  savePlanningItems,
  savePlanningStock,
  scrollMatrixToCurrentWeek,
  selectPlanningProduct,
  toggleRateTableCollapse,
  useSuffix
};
