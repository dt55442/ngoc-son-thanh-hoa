// ═══════════════════════════════════════════════════════════
// js/press.js — tách từ app.js (refactor ES-modules phase 1)
// ═══════════════════════════════════════════════════════════
import { firePushSync, initLucide, requireEditPermission } from './cloud.js';
import { collapseChartCard } from './dashboard.js';
import { attRecordOf, attStatusOf, approvedLeaveOn, hrEmpByName, hrPositionsNamesOf, hrPosName, hrWorkersForPress } from './hr.js';
import { getUniqueNanTypes, getWeekNumber, getYearFromWeek, renderPlanningView, getMaxProductionForProduct, toggleRateTableCollapse, getActualPressedByWeek, getBaoTinhConvertedByWeek, getBaoTinhStockByConversionYear } from './planning.js';
import { STORAGE_KEY_PRESS_NOTES, STORAGE_KEY_PRESS_RECORDS, state } from './state.js';
import { attachChartPanDrag, escapeHTML, getISOWeekString, showToast, uiChartWinSize } from './utils.js';

  // =============================================================
  // SẢN LƯỢNG ÉP VÁN (PRESS VIEW)
  // =============================================================
  // Chuyển đổi bản ghi cũ (mảng lines gộp) sang cấu trúc mới (sticks + vanTho tách riêng).
  // Đồng thời XÓA trường "worker" nhập tay cũ — công nhân ép giờ LẤY TỰ ĐỘNG
  // từ phân vị "Ép" theo ngày ở tab Nhân Sự (không còn lưu trong lượt ép).
  function migratePressRecord(r) {
    if (!r) return r;
    if ((!r.sticks || !r.sticks.length) && (!r.vanTho || !r.vanTho.length) && Array.isArray(r.lines)) {
      r.sticks = r.lines.filter(l => l.nanKey).map(l => ({ nanKey: l.nanKey, sticks: l.sticks || 0 }));
      r.vanTho = r.lines.filter(l => l.vtDim || l.vtQty).map(l => ({ vtDim: l.vtDim, vtQty: l.vtQty || 0, ratio: l.ratio || 0 }));
    }
    if (!r.sticks) r.sticks = [];
    if (!r.vanTho) r.vanTho = [];
    if (r.worker !== undefined) delete r.worker; // dọn dữ liệu công nhân ép nhập tay cũ
    return r;
  }

  function loadPressRecords() {
    const raw = localStorage.getItem(STORAGE_KEY_PRESS_RECORDS);
    if (raw) {
      try { state.pressRecords = JSON.parse(raw).map(migratePressRecord); }
      catch (e) { state.pressRecords = []; }
    } else {
      state.pressRecords = [];
      savePressRecords();
    }
  }

  function savePressRecords() {
    localStorage.setItem(STORAGE_KEY_PRESS_RECORDS, JSON.stringify(state.pressRecords));
    firePushSync();
  }

  // ── GHI CHÚ GIẢI TRÌNH THEO NGÀY (sản lượng không đáp ứng) ──
  // Mỗi bản ghi: { id, date: 'YYYY-MM-DD', text, createdAt, updatedAt }
  function loadPressNotes() {
    const raw = localStorage.getItem(STORAGE_KEY_PRESS_NOTES);
    if (raw) {
      try { state.pressNotes = JSON.parse(raw); }
      catch (e) { state.pressNotes = []; }
    } else {
      state.pressNotes = [];
    }
  }

  function savePressNotes() {
    localStorage.setItem(STORAGE_KEY_PRESS_NOTES, JSON.stringify(state.pressNotes || []));
    firePushSync();
  }

  // Map ngày -> nội dung ghi chú (dùng cho biểu đồ & bảng)
  function getPressNotesByDate() {
    const map = new Map();
    (state.pressNotes || []).forEach(n => { if (n.date && n.text) map.set(n.date, n.text); });
    return map;
  }

  // Năm từ chuỗi ngày 'YYYY-MM-DD'
  function getDateYear(dateStr) {
    const y = parseInt(String(dateStr || '').split('-')[0]);
    return isNaN(y) ? new Date().getFullYear() : y;
  }

  // Định dạng ngày hiển thị DD/MM
  function fmtDateDM(dateStr) {
    const parts = String(dateStr || '').split('-');
    if (parts.length !== 3) return String(dateStr || '');
    return `${parts[2]}/${parts[1]}`;
  }

  // Đọc chuỗi kích thước '1200×240×18' (nhận cả x, *) -> {l,w,t} hoặc null
  function parseDimString(str) {
    if (!str) return null;
    const norm = String(str).trim().toLowerCase().replace(/[x*]/g, '×');
    const parts = norm.split('×').map(s => parseFloat(s.trim()));
    if (parts.length !== 3 || parts.some(p => isNaN(p) || p <= 0)) return null;
    return { l: parts[0], w: parts[1], t: parts[2] };
  }

  // Thể tích (m³) của một số tấm ván theo chuỗi kích thước mm
  function dimVolume(dimStr, qty) {
    const d = parseDimString(dimStr);
    if (!d) return 0;
    return ((d.l * d.w * d.t) / 1000000000) * (parseFloat(qty) || 0);
  }

  // Tồn thanh thô ở công đoạn Bào Tinh theo loại nan (key 'l×w×t')
  function getBaoTinhStockByNanKey() {
    const stock = {};
    state.batches.forEach(b => {
      if (b.stage !== 'bao_tinh') return;
      const key = `${b.length}×${b.width}×${b.thickness}`;
      stock[key] = (stock[key] || 0) + (b.quantity || 0);
    });
    return stock;
  }

  // Tổng số thành phẩm ĐÃ ÉP cho một kế hoạch (cùng năm + cùng tuần + cùng sản phẩm)
  function getPressedQtyForPlan(yearNum, weekNum, productId) {
    return state.pressRecords.reduce((sum, r) => {
      const ry = r.year || getDateYear(r.date);
      if (ry !== parseInt(yearNum)) return sum;
      if (getWeekNumber(r.week) !== parseInt(weekNum)) return sum;
      if (r.productId !== productId) return sum;
      return sum + (parseFloat(r.finishedQty) || 0);
    }, 0);
  }

  // Danh sách sản phẩm (thành phẩm) theo kế hoạch của một tuần trong năm
  function getPressProductsForWeek(yearNum, weekNum) {
    return state.planningItems
      .filter(p => {
        const py = p.year || getYearFromWeek(p.week);
        return py === parseInt(yearNum) && getWeekNumber(p.week) === parseInt(weekNum);
      })
      .map(p => {
        const rate = state.materialRates.find(r => r.id === p.productId);
        return { planId: p.id, productId: p.productId, name: rate ? rate.product : 'Sản phẩm đã xóa', planQty: p.qty || 0 };
      });
  }

  // Kích thước thành phẩm suy ra trực tiếp từ tên sản phẩm (VD: 'Ván 1200x382x12' -> '1200×382×12')
  function computeFpDimFromProduct(productId) {
    const rate = state.materialRates.find(r => r.id === productId);
    if (!rate) return '';
    const m = String(rate.product || '').match(/(\d+(?:[.,]\d+)?)\s*[x×*]\s*(\d+(?:[.,]\d+)?)\s*[x×*]\s*(\d+(?:[.,]\d+)?)/i);
    if (!m) return '';
    const nums = m.slice(1, 4).map(s => parseFloat(String(s).replace(',', '.')));
    if (nums.some(n => isNaN(n) || n <= 0)) return '';
    return nums.join('×');
  }

  // Xây HTML cho một dòng ĐẦU VÀO (thanh thô từ Bào Tinh HOẶC ván thô đã ép
  // trước đó) — ô loại là ô nhập tự do kèm danh sách gợi ý (datalist):
  // gõ kí tự sẽ lọc danh sách và cho chọn nhanh loại đã có.
  function buildPressStickHTML(idx, stick = {}) {
    return `
      <div class="press-line-row" data-stick-idx="${idx}">
        <div class="press-line-head">
          <span class="press-line-no"><i data-lucide="layers" style="width:11px;height:11px;"></i> Đầu vào #${idx + 1}</span>
          <button type="button" class="press-line-remove" onclick="app.removePressStick(this)" title="Bỏ loại này"><i data-lucide="x"></i></button>
        </div>
        <div class="press-line-grid">
          <label class="pl-field"><span>Loại thanh / ván thô</span>
            <input type="text" class="ps-nan" list="press-input-type-list" placeholder="VD: 1200×38×16, A1 hoặc 1220×2440×9" value="${escapeHTML(stick.nanKey || '')}">
          </label>
          <label class="pl-field"><span>Số lượng</span>
            <input type="number" class="ps-sticks" min="0" step="1" inputmode="numeric" placeholder="VD: 4800" value="${stick.sticks || ''}">
          </label>
        </div>
      </div>`;
  }

  // Xây HTML cho một dòng VÁN THÔ tạo ra (kích thước + số lượng + tỷ lệ)
  function buildPressLineHTML(idx, line = {}) {
    return `
      <div class="press-line-row" data-line-idx="${idx}">
        <div class="press-line-head">
          <span class="press-line-no"><i data-lucide="box" style="width:11px;height:11px;"></i> Ván thô #${idx + 1}</span>
          <button type="button" class="press-line-remove" onclick="app.removePressLine(this)" title="Bỏ loại này"><i data-lucide="x"></i></button>
        </div>
        <div class="press-line-grid">
          <label class="pl-field"><span>Kích thước ván thô (mm)</span>
            <input type="text" class="pl-vtdim" placeholder="VD: 1220×2440×9" value="${escapeHTML(line.vtDim || '')}">
          </label>
          <label class="pl-field"><span>Số lượng ván thô</span>
            <input type="number" class="pl-vtqty" min="0" step="1" inputmode="numeric" placeholder="VD: 30" value="${line.vtQty || ''}">
          </label>
        </div>
      </div>`;
  }

  // Thêm một loại thanh thô vào modal (tối đa 3)
  function addPressStick(stick = {}) {
    const container = document.getElementById('press-sticks');
    if (!container) return;
    if (container.querySelectorAll('.press-line-row').length >= 3) {
      showToast('Tối đa 3 loại thanh thô cho mỗi lượt ép!', 'error');
      return;
    }
    container.insertAdjacentHTML('beforeend', buildPressStickHTML(container.querySelectorAll('.press-line-row').length, stick));
    updatePressRemoveButtons();
    initLucide();
  }

  // Xóa một dòng thanh thô
  function removePressStick(btn) {
    const row = btn.closest('.press-line-row');
    if (row) row.remove();
    document.querySelectorAll('#press-sticks .press-line-row').forEach((r, i) => {
      const noEl = r.querySelector('.press-line-no');
      if (noEl) noEl.innerHTML = `<i data-lucide="layers" style="width:11px;height:11px;"></i> Đầu vào #${i + 1}`;
    });
    updatePressRemoveButtons();
    initLucide();
  }

  // Thêm một loại ván thô vào modal (tối đa 3)
  function addPressLine(line = {}) {
    const container = document.getElementById('press-lines');
    if (!container) return;
    if (container.querySelectorAll('.press-line-row').length >= 3) {
      showToast('Tối đa 3 loại ván thô cho mỗi lượt ép!', 'error');
      return;
    }
    container.insertAdjacentHTML('beforeend', buildPressLineHTML(container.querySelectorAll('.press-line-row').length, line));
    updatePressRemoveButtons();
    initLucide();
    recalcPressQuantities();
  }

  // Xóa một dòng ván thô
  function removePressLine(btn) {
    const row = btn.closest('.press-line-row');
    if (row) row.remove();
    document.querySelectorAll('#press-lines .press-line-row').forEach((r, i) => {
      const noEl = r.querySelector('.press-line-no');
      if (noEl) noEl.innerHTML = `<i data-lucide="box" style="width:11px;height:11px;"></i> Ván thô #${i + 1}`;
    });
    updatePressRemoveButtons();
    initLucide();
    recalcPressQuantities();
  }

  // Ẩn nút xóa khi mỗi danh sách chỉ còn 1 dòng
  function updatePressRemoveButtons() {
    ['#press-sticks', '#press-lines'].forEach(sel => {
      const rows = document.querySelectorAll(sel + ' .press-line-row');
      rows.forEach(r => {
        const btn = r.querySelector('.press-line-remove');
        if (btn) btn.style.display = rows.length <= 1 ? 'none' : '';
      });
    });
  }

  // Đọc dữ liệu các dòng VÁN THÔ từ modal (chuẩn hóa kích thước "x"/"*" → "×")
  function collectPressLines() {
    const lines = [];
    document.querySelectorAll('#press-lines .press-line-row').forEach(row => {
      lines.push({
        vtDim: normalizeStickKey(row.querySelector('.pl-vtdim')?.value),
        vtQty: parseFloat(row.querySelector('.pl-vtqty')?.value) || 0
      });
    });
    return lines;
  }

  // Đọc dữ liệu các dòng ĐẦU VÀO từ modal (thanh thô hoặc ván thô đã ép trước đó)
  function collectPressSticks() {
    const arr = [];
    document.querySelectorAll('#press-sticks .press-line-row').forEach(row => {
      arr.push({
        nanKey: normalizeStickKey(row.querySelector('.ps-nan')?.value),
        sticks: parseFloat(row.querySelector('.ps-sticks')?.value) || 0
      });
    });
    return arr;
  }

  // Điền dropdown thành phẩm theo kế hoạch của tuần của ngày đang chọn
  function refreshPressProductSelect(keepId = '') {
    const sel = document.getElementById('press-product');
    if (!sel) return;
    const dateVal = document.getElementById('press-date')?.value;
    if (!dateVal) {
      sel.innerHTML = '<option value="">-- Chọn ngày để xem sản phẩm --</option>';
      return;
    }
    const yearNum = getDateYear(dateVal);
    const weekNum = getWeekNumber(getISOWeekString(dateVal));
    const products = getPressProductsForWeek(yearNum, weekNum);
    if (products.length === 0) {
      sel.innerHTML = `<option value="">-- Tuần ${weekNum}/${yearNum} chưa có kế hoạch --</option>`;
      return;
    }
    sel.innerHTML = '<option value="">-- Chọn thành phẩm --</option>' +
      products.map(p => `<option value="${p.productId}" data-plan-qty="${p.planQty}" ${p.productId === keepId ? 'selected' : ''}>${escapeHTML(p.name)} (KH: ${p.planQty.toLocaleString('vi-VN')} tấm)</option>`).join('');
  }

  // Tính số lượng thành phẩm từ các dòng "Ván Thô Tạo Ra" theo THỂ TÍCH:
  //   SL = floor( tổng thể tích ván thô đã ép ÷ thể tích 1 thành phẩm )
  // (Trường "tỷ lệ" đã bỏ — quy đổi hoàn toàn theo kích thước hai bên;
  //  các dòng kích thước không hợp lệ được bỏ qua, không làm hỏng cả phép tính.)
  function computeFinishedQtyFromLines(lines, fpDimStr) {
    const fp = parseDimString(fpDimStr);
    if (!fp) return 0;
    const active = (lines || []).filter(l => (parseFloat(l.vtQty) || 0) > 0);
    if (active.length === 0) return 0;
    // Tính trong miền mm³ nguyên để tránh sai số thập phân (chia hết phải ra đúng số nguyên)
    const vtVolMm3 = active.reduce((sum, l) => {
      const d = parseDimString(l.vtDim);
      return d ? sum + d.l * d.w * d.t * (parseFloat(l.vtQty) || 0) : sum;
    }, 0);
    const fpVolMm3 = fp.l * fp.w * fp.t;
    if (vtVolMm3 <= 0 || fpVolMm3 <= 0) return 0;
    return Math.floor(vtVolMm3 / fpVolMm3 + 1e-9);
  }

  // Form nhập liệu DUY NHẤT cho lượt ép — không phân loại:
  // - "Ván Thô Tạo Ra" không nhập  → thể tích ván thô = 0
  // - Thành Phẩm không chọn        → thể tích thành phẩm = 0
  // - SL thành phẩm tự chọn nguồn tính: ưu tiên "Ván Thô Tạo Ra" (nếu có nhập
  //   số lượng), không thì tính từ ván thô ĐÃ ÉP TRƯỚC ĐÓ ở phần đầu vào.

  // Chuẩn hóa key đầu vào: nếu là kích thước (l×w×t) thì đồng nhất dấu '×',
  // nếu là mã thường (VD: A1) thì giữ nguyên
  function normalizeStickKey(str) {
    const raw = String(str || '').trim();
    if (!raw) return '';
    const norm = raw.toLowerCase().replace(/[x*]/g, '×');
    return parseDimString(norm) ? norm : raw;
  }

  // Điền danh sách gợi ý cho ô "Loại" của dòng đầu vào (gõ kí tự để lọc):
  // các loại thanh (Bào Tinh / định mức, kèm tồn BT) + các VÁN THÔ ĐÃ ÉP
  // TRƯỚC ĐÓ (tổng hợp từ các lượt ép, kèm tổng số tấm đã ép).
  function populatePressInputTypeList() {
    const dl = document.getElementById('press-input-type-list');
    if (!dl) return;
    const items = new Map(); // value -> mô tả
    const btStock = getBaoTinhStockByNanKey();
    getUniqueNanTypes().forEach(n => {
      if (!items.has(n.key)) {
        const stock = btStock[n.key] || 0;
        items.set(n.key, `thanh · tồn BT: ${stock.toLocaleString('vi-VN')}`);
      }
    });
    const vtTotals = {};
    state.pressRecords.forEach(r => (r.vanTho || []).forEach(l => {
      const k = normalizeStickKey(l.vtDim);
      if (k) vtTotals[k] = (vtTotals[k] || 0) + (parseFloat(l.vtQty) || 0);
    }));
    Object.keys(vtTotals).sort().forEach(k => {
      if (!items.has(k)) items.set(k, `ván thô đã ép · ${vtTotals[k].toLocaleString('vi-VN')} tấm`);
    });
    // Các loại thanh đã từng dùng ở các lượt ép trước (kể cả mã riêng như A1)
    state.pressRecords.forEach(r => (r.sticks || []).forEach(s => {
      const k = normalizeStickKey(s.nanKey);
      if (k && !items.has(k) && !vtTotals[k]) items.set(k, 'thanh · đã dùng ở lượt ép trước');
    }));
    dl.innerHTML = [...items.entries()].map(([v, label]) =>
      `<option value="${escapeHTML(v)}">${escapeHTML(label)}</option>`).join('');
  }

  // SL thành phẩm từ các dòng ĐẦU VÀO (khi không nhập "Ván Thô Tạo Ra"):
  // chỉ các dòng là KÍCH THƯỚC ván thô (l×w×t) — tức ván thô đã ép trước đó —
  // mới dùng để tính, quy đổi theo thể tích.
  function computeFinishedQtyFromInputs(sticks, fpDimStr) {
    const lines = (sticks || [])
      .filter(s => s.nanKey && s.sticks > 0 && parseDimString(s.nanKey))
      .map(s => ({ vtDim: s.nanKey, vtQty: s.sticks }));
    return computeFinishedQtyFromLines(lines, fpDimStr);
  }

  // Cập nhật số lượng thành phẩm + gợi ý keo/phụ gia khi nhập dòng thành phần:
  // - Có ván thô (tạo ra, hoặc ván thô đã ép ở phần đầu vào) → tự tính SL
  // - Không có ván thô → KHÔNG đụng vào ô SL (người dùng tự nhập)
  // - Người dùng đã sửa tay SL (data-manual) → giữ nguyên số đã nhập
  function recalcPressQuantities() {
    const qtyInput = document.getElementById('press-fp-qty');
    if (!qtyInput) return;
    const productId = document.getElementById('press-product')?.value || '';
    const manual = (qtyInput.value || '').trim() !== '' && qtyInput.getAttribute('data-manual') === '1';
    if (productId) {
      const fpDim = computeFpDimFromProduct(productId);
      const lines = collectPressLines();
      const hasActiveVT = lines.some(l => (parseFloat(l.vtQty) || 0) > 0);
      const finishedQty = hasActiveVT
        ? computeFinishedQtyFromLines(lines, fpDim)
        : computeFinishedQtyFromInputs(collectPressSticks(), fpDim);
      if (finishedQty > 0) { if (!manual) qtyInput.value = finishedQty; }
      else if (!manual) qtyInput.value = '';
    }
    suggestPressMaterialFields(false);
  }

  // Gợi ý keo/phụ gia theo định mức x số lượng thành phẩm
  // (Kích thước thành phẩm lấy trực tiếp từ tên sản phẩm, không cần nhập.
  //  KHỐI "SẢN LƯỢNG TỐI ĐA" ĐÃ BỊ LOẠI BỎ — nó quét toàn bộ kế hoạch +
  //  lượt ép theo TỪNG keystroke, làm chậm tốc độ nhập dữ liệu.)
  function suggestPressMaterialFields(force = false) {
    const productId = document.getElementById('press-product')?.value;
    const glueInput = document.getElementById('press-glue');
    const additiveInput = document.getElementById('press-additive');
    if (!productId) return;
    const rate = state.materialRates.find(r => r.id === productId);
    if (!rate) return;

    const qty = parseFloat(document.getElementById('press-fp-qty')?.value) || 0;
    [[glueInput, rate.glue], [additiveInput, rate.additive]].forEach(([inp, perUnit]) => {
      if (!inp) return;
      const manual = inp.getAttribute('data-manual') === '1';
      if (force || !manual) inp.value = ((perUnit || 0) * qty).toFixed(2);
    });
  }

  // Ngày hôm nay theo định dạng YYYY-MM-DD (giờ địa phương)
  function todayLocalISO() {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
  }

  // Mở modal thêm/sửa lượt ép ván
  function openPressModal(recordId = null) {
    if (!requireEditPermission()) return;
    const modal = document.getElementById('modal-press-record');
    if (!modal) return;
    if (state.materialRates.length === 0) {
      showToast('Vui lòng thêm định mức & kế hoạch sản xuất trước khi ghi nhận lượt ép!', 'error');
      return;
    }
    const form = document.getElementById('press-record-form');
    form.reset();
    ['press-glue', 'press-additive', 'press-fp-qty'].forEach(id => {
      document.getElementById(id)?.removeAttribute('data-manual');
    });
    document.getElementById('press-sticks').innerHTML = '';
    document.getElementById('press-lines').innerHTML = '';
    document.getElementById('press-id').value = recordId || '';

    // Gợi ý loại đầu vào (thanh thô + VÁN THÔ ĐÃ ÉP TRƯỚC ĐÓ) — công nhân ép
    // giờ lấy TỰ ĐỘNG theo phân vị (preview ở ô "Công Nhân Ép")
    populatePressInputTypeList();

    const titleEl = document.getElementById('press-modal-title');
    if (recordId) {
      const rec = state.pressRecords.find(r => r.id === recordId);
      if (!rec) return;
      if (titleEl) titleEl.innerHTML = '<i data-lucide="edit-3"></i> Sửa Lượt Ép Ván';
      document.getElementById('press-date').value = rec.date || '';
      const weekHint = document.getElementById('press-week-hint');
      if (weekHint) weekHint.textContent = rec.week || '';
      (rec.sticks && rec.sticks.length ? rec.sticks : [{}]).forEach(s => addPressStick(s));
      (rec.vanTho && rec.vanTho.length ? rec.vanTho : [{}]).forEach(l => addPressLine(l));
      refreshPressProductSelect(rec.productId);
      document.getElementById('press-fp-qty').value = rec.finishedQty || '';
      document.getElementById('press-glue').value = rec.glue ?? '';
      document.getElementById('press-additive').value = rec.additive ?? '';
      ['press-glue', 'press-additive'].forEach(id => {
        document.getElementById(id)?.setAttribute('data-manual', '1');
      });
    } else {
      if (titleEl) titleEl.innerHTML = '<i data-lucide="factory"></i> Thêm Lượt Ép Ván';
      document.getElementById('press-date').value = todayLocalISO();
      const weekHint = document.getElementById('press-week-hint');
      if (weekHint) weekHint.textContent = getISOWeekString(todayLocalISO());
      addPressStick();
      addPressLine();
      refreshPressProductSelect();
    }
    suggestPressMaterialFields(false);
    refreshPressWorkersPreview();

    modal.classList.add('show');
    initLucide();
  }

  function closePressModal() {
    document.getElementById('modal-press-record')?.classList.remove('show');
  }

  // Lưu lượt ép ván (thêm mới hoặc cập nhật) — 1 form nhập liệu duy nhất:
  // - Không nhập "Ván Thô Tạo Ra" → thể tích ván thô = 0
  // - Không chọn Thành Phẩm       → thể tích thành phẩm = 0
  function handlePressRecordSubmit(e) {
    e.preventDefault();
    const recordId = document.getElementById('press-id').value;
    const dateVal = document.getElementById('press-date').value;
    const productId = document.getElementById('press-product').value || '';
    const glue = parseFloat(document.getElementById('press-glue').value) || 0;
    const additive = parseFloat(document.getElementById('press-additive').value) || 0;
    const sticks = collectPressSticks().filter(s => s.nanKey || s.sticks > 0);
    const lines = collectPressLines().filter(l => l.vtDim || l.vtQty > 0);

    if (!dateVal) { showToast('Vui lòng chọn ngày ép!', 'error'); return; }
    // Công nhân ép KHÔNG còn nhập tay — suy ra tự động từ phân vị "Ép" theo
    // ngày ép (tab Nhân Sự); chưa có dữ liệu thì lượt ép để trống công nhân.
    if (sticks.length === 0) { showToast('Cần ít nhất 1 dòng đầu vào (chọn loại thanh thô/ván thô + số lượng)!', 'error'); return; }
    for (let i = 0; i < sticks.length; i++) {
      const s = sticks[i];
      if (!s.nanKey) { showToast(`Dòng đầu vào #${i + 1}: chưa chọn loại!`, 'error'); return; }
      if (s.sticks <= 0) { showToast(`Dòng đầu vào #${i + 1}: số lượng phải lớn hơn 0!`, 'error'); return; }
    }
    if (lines.length === 0 && !productId) {
      showToast('Cần nhập Ván Thô Tạo Ra hoặc chọn Thành Phẩm (một trong hai — phần không nhập sẽ có thể tích 0)!', 'error'); return;
    }
    if (lines.length > 0) {
      // Ván thô ép ở các thời điểm khác nhau: mỗi lượt chỉ được nhập số lượng cho ĐÚNG 1 loại
      const activeLines = lines.filter(l => l.vtQty > 0);
      if (activeLines.length > 1) { showToast('Mỗi lượt ép chỉ được nhập số lượng cho 1 loại ván thô — các loại còn lại phải để số lượng 0 (ván thô ép ở các thời điểm khác nhau)!', 'error'); return; }
      for (let i = 0; i < lines.length; i++) {
        const l = lines[i];
        if (!parseDimString(l.vtDim)) { showToast(`Dòng ván thô #${i + 1}: kích thước ván thô không hợp lệ (VD: 1220×2440×9)!`, 'error'); return; }
        if (l.ratio <= 0) { showToast(`Dòng ván thô #${i + 1}: tỷ lệ phải lớn hơn 0!`, 'error'); return; }
      }
    }

    // ── Thành Phẩm (tuỳ chọn — không chọn thì thể tích thành phẩm = 0) ──
    let fpDim = '';
    let finishedQty = 0;
    if (productId) {
      fpDim = computeFpDimFromProduct(productId); // suy ra từ tên sản phẩm (VD: Ván 1200×382×12)
      if (!parseDimString(fpDim)) { showToast('Tên sản phẩm trong định mức phải chứa kích thước (VD: Ván 1200x382x12) để tính thể tích!', 'error'); return; }
      // SL thành phẩm: lấy số đang có trong ô (tự tính từ ván thô, hoặc người dùng tự nhập)
      finishedQty = parseFloat(document.getElementById('press-fp-qty').value) || 0;
      if (finishedQty <= 0) {
        // Chưa có số → thử tự tính từ ván thô (tạo ra, hoặc ván thô đã ép ở đầu vào)
        const hasActiveVT = lines.some(l => l.vtQty > 0);
        finishedQty = hasActiveVT
          ? computeFinishedQtyFromLines(lines, fpDim)
          : computeFinishedQtyFromInputs(sticks, fpDim);
      }
      if (finishedQty <= 0) { showToast('Số lượng thành phẩm = 0 — nhập ván thô hoặc tự nhập Số Lượng Thành Phẩm!', 'error'); return; }
    }

    const recordData = {
      id: recordId || `press-${Date.now()}`,
      date: dateVal,
      week: getISOWeekString(dateVal),
      year: getDateYear(dateVal),
      sticks,
      vanTho: lines,
      productId,
      productName: productId ? ((state.materialRates.find(r => r.id === productId) || {}).product || '') : '',
      fpDim,
      finishedQty,
      glue, additive,
      updatedAt: new Date().toISOString()
    };

    if (recordId) {
      const idx = state.pressRecords.findIndex(r => r.id === recordId);
      if (idx !== -1) {
        recordData.createdAt = state.pressRecords[idx].createdAt;
        state.pressRecords[idx] = recordData;
      }
    } else {
      recordData.createdAt = new Date().toISOString();
      state.pressRecords.push(recordData);
    }

    savePressRecords();
    closePressModal();
    renderPressView();
    renderPlanningView(); // cập nhật số "Đã ép" trên thẻ kế hoạch
    showToast(recordId ? 'Đã cập nhật lượt ép!' : 'Đã ghi nhận lượt ép ván!', 'success');
  }

  function deletePressRecord(recordId) {
    if (!requireEditPermission()) return;
    const rec = state.pressRecords.find(r => r.id === recordId);
    if (!rec) return;
    if (!confirm(`Xóa lượt ép ngày ${rec.date} (${rec.finishedQty} tấm)?`)) return;
    state.pressRecords = state.pressRecords.filter(r => r.id !== recordId);
    savePressRecords();
    renderPressView();
    renderPlanningView();
    showToast('Đã xóa lượt ép', 'info');
  }

  // ─── BẢNG: BÀO TINH ↔ ĐÃ ÉP — HIỆU SUẤT CHUYỂN ĐỔI THEO TUẦN ──
  // Cân đối đầu ra công đoạn Bào Tinh với lượng thanh đạt dùng ép thực tế:
  //   Đã bào tinh (tuần) = số thanh chuyển vào Bào Tinh theo lịch sử chuyển công đoạn
  //   Đã ép (tuần)       = số thanh đạt dùng cho lượt ép thực tế (sticks) trong tuần
  //   Còn lại (lũy kế)   = Σ Đã bào tinh − Σ Đã ép = thanh đạt chưa sử dụng + thanh lỗi chưa ghi nhận
  //   Hiệu suất          = Σ Đã ép ÷ Σ Đã bào tinh (lũy kế, %)
  // Dữ liệu thuần (dùng cho cả render bảng & kiểm thử)
  function computeBaoTinhEfficiencyByWeek(yearNum) {
    const year = parseInt(yearNum);
    const convByWeek = getBaoTinhConvertedByWeek(year);
    const pressedByWeek = getActualPressedByWeek(year);
    const sumVals = (o) => Object.values(o || {}).reduce((a, v) => a + (Number(v) || 0), 0);

    const weekSet = new Set();
    Object.keys(convByWeek).forEach(w => weekSet.add(Number(w)));
    Object.keys(pressedByWeek).forEach(w => weekSet.add(Number(w)));

    let cumConv = 0, cumPressed = 0;
    const rows = [...weekSet].sort((a, b) => a - b).map(w => {
      const conv = sumVals(convByWeek[w]);
      const pressed = sumVals(pressedByWeek[w]);
      cumConv += conv; cumPressed += pressed;
      return {
        week: w,
        conv, pressed,
        cumConv, cumPressed,
        remaining: cumConv - cumPressed,
        effPct: cumConv > 0 ? Math.round((cumPressed / cumConv) * 1000) / 10 : null
      };
    });

    // Tồn Bào Tinh hiện tại (thanh đạt chờ ép) quy về năm chuyển đổi + ước tính thanh lỗi:
    //   Thanh lỗi ≈ Σ Đã bào tinh − Σ Đã ép − Tồn Bào Tinh hiện tại (kẹp ≥ 0)
    const stockByYear = getBaoTinhStockByConversionYear();
    const currentBtStock = stockByYear[year] || 0;
    const estDefect = Math.max(0, cumConv - cumPressed - currentBtStock);
    return { rows, totalConv: cumConv, totalPressed: cumPressed, currentBtStock, estDefect };
  }

  // Render bảng theo dõi hiệu suất chuyển đổi Bào Tinh + bộ lọc năm (tab Ép Ván)
  function renderBaoTinhEffTable() {
    const body = document.getElementById('baotinh-eff-body');
    const foot = document.getElementById('baotinh-eff-foot');
    const yearSel = document.getElementById('bt-year-filter');
    if (!body || !foot || !yearSel) return;

    // Điền năm: năm hiện tại + các năm có lô chuyển bào tinh / lượt ép
    const years = new Set([new Date().getFullYear()]);
    Object.keys(getBaoTinhStockByConversionYear()).forEach(y => years.add(Number(y)));
    state.pressRecords.forEach(r => years.add(Number(r.year || getDateYear(r.date))));
    const yearList = [...years].filter(y => !isNaN(y)).sort((a, b) => b - a);
    if (state.btEffYear == null || !yearList.includes(Number(state.btEffYear))) {
      state.btEffYear = yearList.includes(new Date().getFullYear()) ? new Date().getFullYear() : yearList[0];
    }
    yearSel.innerHTML = yearList
      .map(y => `<option value="${y}"${Number(state.btEffYear) === y ? ' selected' : ''}>Năm ${y}</option>`).join('');

    const data = computeBaoTinhEfficiencyByWeek(state.btEffYear);
    const fmt = (v) => (Number(v) || 0).toLocaleString('vi-VN');
    if (!data.rows.length) {
      body.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-muted); padding:14px;">Chưa có dữ liệu bào tinh / lượt ép trong năm ${state.btEffYear}</td></tr>`;
      foot.innerHTML = '';
      initLucide();
      return;
    }
    body.innerHTML = data.rows.map(r => `
      <tr>
        <td><strong>Tuần ${r.week}</strong></td>
        <td>${fmt(r.conv)}</td>
        <td>${fmt(r.pressed)}</td>
        <td title="Σ Đã bào tinh − Σ Đã ép = thanh đạt chưa sử dụng + thanh lỗi chưa ghi nhận">${fmt(r.remaining)}</td>
        <td style="${r.effPct != null && r.effPct < 80 ? 'color:#dc2626; font-weight:600;' : ''}">${r.effPct != null ? r.effPct.toLocaleString('vi-VN') + '%' : '—'}</td>
      </tr>`).join('');
    foot.innerHTML = `
      <tr>
        <td style="font-weight:700;">TỔNG CỘNG (lũy kế)</td>
        <td style="font-weight:700;">${fmt(data.totalConv)}</td>
        <td style="font-weight:700;">${fmt(data.totalPressed)}</td>
        <td style="font-weight:700;" title="Đã bào tinh − Đã ép. Trong đó: Tồn Bào Tinh hiện tại (đạt chờ ép) = ${fmt(data.currentBtStock)} thanh → ước tính thanh lỗi = ${fmt(data.estDefect)} thanh">${fmt(data.totalConv - data.totalPressed)}</td>
        <td style="font-weight:700;">${data.totalConv > 0 ? (Math.round(data.totalPressed / data.totalConv * 1000) / 10).toLocaleString('vi-VN') + '%' : '—'}</td>
      </tr>`;
    initLucide();
  }

  // Render toàn bộ view Sản Lượng Ép Ván
  function renderPressView() {
    populatePressYearFilter();
    populatePressWeekFilter();
    renderPressChart();
    renderPressTable();
    renderBaoTinhEffTable();
    initLucide();
  }

  // Điền bộ lọc năm cho biểu đồ & bảng lượt ép
  function populatePressYearFilter() {
    const select = document.getElementById('press-year-filter');
    if (!select) return;
    const years = new Set(state.pressRecords.map(r => r.year || getDateYear(r.date)));
    years.add(new Date().getFullYear());
    const sorted = Array.from(years).sort((a, b) => a - b);
    const cur = state.pressYearFilter;
    if (cur === 'all' || !sorted.includes(parseInt(cur))) {
      state.pressYearFilter = String(sorted[sorted.length - 1]);
    }
    select.innerHTML = '<option value="all" ' + (state.pressYearFilter === 'all' ? 'selected' : '') + '>Tất cả</option>' +
      sorted.map(y => `<option value="${y}" ${String(y) === String(state.pressYearFilter) ? 'selected' : ''}>Năm ${y}</option>`).join('');
  }

  // Số tuần của một lượt ép (ưu tiên trường week dạng "Tuần X", fallback suy từ ngày)
  function pressRecordWeek(r) {
    const w = getWeekNumber(r.week);
    return w > 0 ? w : getWeekNumber(getISOWeekString(r.date));
  }

  // Điền bộ lọc tuần (danh sách tuần có lượt ép thuộc năm đang chọn)
  function populatePressWeekFilter() {
    const select = document.getElementById('press-week-filter');
    if (!select) return;
    let recs = state.pressRecords;
    if (state.pressYearFilter !== 'all') {
      recs = recs.filter(r => String(r.year || getDateYear(r.date)) === String(state.pressYearFilter));
    }
    const weeks = Array.from(new Set(recs.map(pressRecordWeek).filter(w => w > 0))).sort((a, b) => a - b);
    // Nếu tuần đang chọn không còn hợp lệ với năm mới thì trả về "Tất cả"
    if (state.pressWeekFilter !== 'all' && !weeks.includes(parseInt(state.pressWeekFilter))) {
      state.pressWeekFilter = 'all';
    }
    select.innerHTML = '<option value="all" ' + (state.pressWeekFilter === 'all' ? 'selected' : '') + '>Tất cả</option>' +
      weeks.map(w => `<option value="${w}" ${String(w) === String(state.pressWeekFilter) ? 'selected' : ''}>Tuần ${w}</option>`).join('');
  }

  // Plugin vẽ lên biểu đồ ngày:
  //   • đơn vị "m³" trên đỉnh trục Y
  //   • tổng thể tích trên đỉnh cột ép (cột trái)
  //   • dấu "!" vàng cho ngày có ghi chú giải trình (+ lưu hit-area để
  //     bắt hover/chạm và mở form sửa ghi chú khi bấm)
  let pressNoteMarkerHits = [];
  const fmtVolShort = (v) => String(+(+v).toFixed(2));

  // Vẽ hình chữ nhật bo góc (hỗ trợ trình duyệt không có ctx.roundRect)
  function roundedRectPath(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    if (ctx.roundRect) { ctx.roundRect(x, y, w, h, rr); return; }
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  // Tách văn bản ghi chú thành nhiều dòng vừa khung vẽ (canvas không tự wrap),
  // tối đa maxLines dòng; nếu còn dư thì thêm dấu "…" vào dòng cuối.
  function wrapNoteText(ctx, text, maxWidth, maxLines) {
    const words = String(text).split(/\s+/).filter(Boolean);
    const lines = [];
    let cur = '';
    for (let i = 0; i < words.length; i++) {
      const cand = cur ? cur + ' ' + words[i] : words[i];
      if (!cur || ctx.measureText(cand).width <= maxWidth) {
        cur = cand;
      } else {
        lines.push(cur);
        cur = words[i];
        if (lines.length >= maxLines) break;
      }
    }
    if (cur && lines.length < maxLines) lines.push(cur);
    const shownWords = lines.join(' ').split(/\s+/).filter(Boolean).length;
    if (shownWords < words.length && lines.length) {
      let last = lines[lines.length - 1];
      while (last && ctx.measureText(last + '…').width > maxWidth) last = last.slice(0, -1);
      lines[lines.length - 1] = last.replace(/[\s,.:;]+$/, '') + '…';
    }
    return lines;
  }

  const pressNoteMarkerPlugin = {
    id: 'pressNoteMarkers',
    afterDatasetsDraw(chart) {
      pressNoteMarkerHits = [];
      const cfg = (chart.options.plugins && chart.options.plugins.pressNoteMarkers) || {};
      const dts = cfg.dates || [];
      const epTotals = cfg.epTotals || [];
      const fpValues = cfg.fpValues || [];
      const notesByDate = cfg.notesByDate || new Map();
      if (!dts.length) return;
      const xs = chart.scales.x;
      const ys = chart.scales.y;
      if (!xs || !ys || !chart.chartArea) return;
      const ctx = chart.ctx;
      const top = chart.chartArea.top;
      const epMeta = chart.getDatasetMeta(0); // cột ép xếp chồng 3 loại
      const fpMeta = chart.getDatasetMeta(3); // cột thành phẩm

      // Đơn vị "m³" nằm trên cùng của trục Y (không lặp lại ở từng vạch)
      ctx.save();
      ctx.fillStyle = '#64748b';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      ctx.fillText('m³', chart.chartArea.left - 6, top - 4);
      ctx.restore();

      // Lượt 1: dấu "!" vàng cho các ngày có ghi chú giải trình
      const markerByDate = {};
      dts.forEach((d, i) => {
        const text = notesByDate.get(d);
        if (!text) return;
        const epVal = epTotals[i] || 0;
        const fpVal = fpValues[i] || 0;
        const useFp = fpVal > epVal;
        const meta = useFp ? fpMeta : epMeta;
        const bar = meta && meta.data ? meta.data[i] : null;
        const x = bar ? bar.x : xs.getPixelForValue(i);
        let y = ys.getPixelForValue(useFp ? fpVal : epVal) - 14;
        if (y < top + 12) y = top + 12;
        markerByDate[d] = { x, y, onEp: !useFp };
        pressNoteMarkerHits.push({ x, y, r: 12, date: d, text });
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, 8, 0, Math.PI * 2);
        ctx.fillStyle = '#f59e0b';
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('!', x, y + 0.5);
        ctx.restore();
      });

      // Lượt 2: tổng thể tích trên đỉnh cột ép bên trái (né dấu "!" nếu có)
      dts.forEach((d, i) => {
        const epVal = epTotals[i] || 0;
        if (epVal <= 0) return;
        const epBar = epMeta && epMeta.data ? epMeta.data[i] : null;
        if (!epBar) return;
        let y = ys.getPixelForValue(epVal) - 4;
        const m = markerByDate[d];
        if (m && m.onEp && m.y - 10 < y) y = m.y - 10;
        ctx.save();
        ctx.fillStyle = '#334155';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(fmtVolShort(epVal), epBar.x, y);
        ctx.restore();
      });

      // Lượt 3: nội dung đầy đủ của TẤT CẢ ghi chú (khi bật nút "Hiện Ghi Chú")
      if (!cfg.showText) return;
      const noteFont = '10px sans-serif';
      const maxTextW = 150;
      const maxLines = 4;
      const lineH = 12;
      const padX = 6, padY = 4;
      dts.forEach((d, i) => {
        const text = notesByDate.get(d);
        if (!text) return;
        const m = markerByDate[d];
        if (!m) return;
        ctx.save();
        ctx.font = noteFont;
        const lines = wrapNoteText(ctx, text, maxTextW, maxLines);
        if (!lines.length) { ctx.restore(); return; }
        const boxW = Math.min(maxTextW, Math.max(...lines.map(l => ctx.measureText(l).width))) + padX * 2;
        const boxH = lines.length * lineH + padY * 2 - 2;
        let bx = m.x - boxW / 2;
        const minX = chart.chartArea.left + 2;
        const maxX = chart.chartArea.right - boxW - 2;
        if (bx < minX) bx = minX;
        if (bx > maxX) bx = maxX;
        let by = m.y - 12 - boxH; // đặt phía trên dấu "!"
        if (by < top + 2) by = top + 2;
        roundedRectPath(ctx, bx, by, boxW, boxH, 5);
        ctx.fillStyle = 'rgba(255, 251, 235, 0.96)';
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = '#f59e0b';
        ctx.stroke();
        ctx.fillStyle = '#92400e';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        lines.forEach((ln, li) => ctx.fillText(ln, bx + padX, by + padY + li * lineH));
        ctx.restore();
        // Bấm vào nội dung ghi chú cũng mở form sửa (thêm vùng bấm hình chữ nhật)
        pressNoteMarkerHits.push({ rect: { x: bx, y: by, w: boxW, h: boxH }, date: d, text });
      });
    }
  };

  // Tìm dấu "!" vàng / nhãn ghi chú tại vị trí con trỏ (evt của Chart.js v4 có sẵn tọa độ x/y)
  function findPressNoteMarkerHit(evt) {
    if (!evt || !pressNoteMarkerHits.length) return null;
    const x = (evt.x != null) ? evt.x : (evt.native ? evt.native.offsetX : null);
    const y = (evt.y != null) ? evt.y : (evt.native ? evt.native.offsetY : null);
    if (x == null || y == null) return null;
    return pressNoteMarkerHits.find(m => {
      if (m.rect) { // vùng nhãn nội dung ghi chú (hình chữ nhật)
        return x >= m.rect.x && x <= m.rect.x + m.rect.w && y >= m.rect.y && y <= m.rect.y + m.rect.h;
      }
      return Math.hypot(x - m.x, y - m.y) <= m.r;
    }) || null;
  }

  // ── Cửa sổ hiển thị của biểu đồ ép ván ──
  // Chỉ vẽ tối đa 14 cột (≈2 tuần) trên máy tính / 7 cột (≈1 tuần) trên điện thoại;
  // vuốt trái/phải (chuột hoặc cảm ứng) trên biểu đồ để xem thêm các ngày khác.
  function pressWinSize() {
    return uiChartWinSize(); // 14 cột máy tính / 7 cột điện thoại (dùng chung utils)
  }
  function pressChartFilteredRecords() {
    let records = state.pressRecords.filter(r => r.date);
    if (state.pressYearFilter !== 'all') {
      records = records.filter(r => String(r.year || getDateYear(r.date)) === String(state.pressYearFilter));
    }
    if (state.pressWeekFilter !== 'all') {
      records = records.filter(r => pressRecordWeek(r) === parseInt(state.pressWeekFilter));
    }
    return records;
  }
  // Cửa sổ hiện tại: { start (cột đầu), size (số cột), total (tổng ngày có dữ liệu) }
  // Mặc định neo CUỐI (hiện các tuần mới nhất); start được kẹp vào [0, total − size].
  function pressChartWindow(total) {
    const size = Math.max(1, Math.min(pressWinSize(), Math.max(total, 1)));
    const raw = state.pressChartWinStart;
    let start = (raw == null) ? NaN : Number(raw); // null/undefined → mặc định neo cuối
    if (!Number.isFinite(start) || start < 0) start = Math.max(0, total - size);
    start = Math.min(Math.max(start, 0), Math.max(0, total - size));
    return { start, size, total };
  }

  // ── Vuốt trái/phải trên biểu đồ (chuột/cảm ứng) → dịch cửa sổ hiển thị ──
  // Dùng chung attachChartPanDrag (utils.js) — cùng cơ chế với biểu đồ Nguyên liệu.
  let pressChartPan = null;
  function pressChartFilteredDates() {
    return [...new Set(pressChartFilteredRecords().map(r => r.date))].sort();
  }
  function attachPressChartDrag() {
    const canvas = document.getElementById('press-chart');
    if (!canvas) return;
    if (!pressChartPan) {
      const total = () => pressChartFilteredDates().length;
      pressChartPan = attachChartPanDrag(canvas, {
        canDrag: () => total() > pressChartWindow(total()).size,
        getStart: () => pressChartWindow(total()).start,
        setStart: (v) => { state.pressChartWinStart = v; },
        clamp: (v) => {
          const t = total();
          return Math.min(Math.max(v, 0), Math.max(0, t - pressChartWindow(t).size));
        },
        span: () => pressChartWindow(total()).size,
        onShift: () => renderPressChart()
      });
    }
    return pressChartPan;
  }

  // ── Dải màu tuần trên trục X: các ngày cùng tuần chung 1 dải, xen kẽ màu theo
  // tuần, tên "Tuần X" căn giữa trong dải (vẽ trong vùng chừa dưới trục X) ──
  const pressWeekBandPlugin = {
    id: 'pressWeekBands',
    afterDraw(chart, args, opts) {
      const groups = opts && opts.groups;
      const xScale = chart.scales && chart.scales.x;
      const area = chart.chartArea;
      if (!groups || !groups.length || !xScale || !area) return;
      const count = groups[groups.length - 1].i1 + 1;
      const half = count > 1 ? Math.abs(xScale.getPixelForValue(1) - xScale.getPixelForValue(0)) / 2 : area.width / 2;
      const H = 20;
      const y1 = chart.height - 4;
      const y0 = y1 - H;
      const colors = [
        { fill: 'rgba(14,165,233,0.16)', text: '#0369a1' },
        { fill: 'rgba(139,92,246,0.16)', text: '#6d28d9' }
      ];
      const ctx = chart.ctx;
      ctx.save();
      groups.forEach((g, gi) => {
        const c = colors[gi % 2];
        const x0 = Math.max(area.left, xScale.getPixelForValue(g.i0) - half + 1);
        const x1 = Math.min(area.right, xScale.getPixelForValue(g.i1) + half - 1);
        if (x1 - x0 < 2) return;
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') ctx.roundRect(x0, y0, x1 - x0, H, 5);
        else ctx.rect(x0, y0, x1 - x0, H);
        ctx.fillStyle = c.fill;
        ctx.fill();
        ctx.fillStyle = c.text;
        ctx.font = '600 11px system-ui, -apple-system, "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`Tuần ${g.week}`, (x0 + x1) / 2, y0 + H / 2);
      });
      ctx.restore();
    }
  };

  // Biểu đồ: thể tích ván thô & thành phẩm tương đương mỗi ngày, nhóm theo tuần
  function renderPressChart() {
    const canvas = document.getElementById('press-chart');
    if (!canvas || !window.Chart) return;
    attachPressChartDrag(); // vuốt trái/phải để xem thêm các ngày (gắn 1 lần)
    // Đồng bộ nhãn nút "Hiện Ghi Chú" với trạng thái đang lưu
    updatePressNotesToggleButton();
    if (state.pressChartInstance) { state.pressChartInstance.destroy(); state.pressChartInstance = null; }

    const records = pressChartFilteredRecords();
    const allDates = pressChartFilteredDates();
    const win = pressChartWindow(allDates.length);
    const dates = allDates.slice(win.start, win.start + win.size); // chỉ vẽ cửa sổ hiện tại
    const inWindow = new Set(dates);

    // Gom thể tích theo ngày (TỔNG của các loại ván thô/thành phẩm trong ngày)
    // Phân loại từng lượt ép trong ngày thành 3 loại thể tích ép:
    //   Loại 1 — ép ra CẢ ván thô & thành phẩm (thể tích = ván thô tạo ra)
    //   Loại 2 — chỉ ép ván thô, chưa ép thành phẩm (thể tích = ván thô tạo ra)
    //   Loại 3 — chỉ ép thành phẩm từ ván thô đã ép trước (thể tích = ván thô đầu vào)
    const byDay = {}; // date -> { t1, t2, t3, fp }
    records.forEach(r => {
      if (!inWindow.has(r.date)) return; // ngày ngoài cửa sổ hiển thị
      if (!byDay[r.date]) byDay[r.date] = { t1: 0, t2: 0, t3: 0, fp: 0 };
      const d = byDay[r.date];
      const vt = (r.vanTho || []).reduce((s, l) => s + dimVolume(l.vtDim, l.vtQty), 0);
      const fp = dimVolume(r.fpDim, r.finishedQty);
      const inputVt = (r.sticks || []).reduce((s, x) => s + dimVolume(x.nanKey, x.sticks), 0);
      if (vt > 0 && fp > 0) d.t1 += vt;
      else if (vt > 0) d.t2 += vt;
      else if (fp > 0) d.t3 += inputVt;
      d.fp += fp;
    });

    if (dates.length === 0) {
      const ctx = canvas.getContext('2d');
      state.pressChartInstance = new Chart(ctx, {
        type: 'bar',
        data: { labels: [], datasets: [] },
        options: { responsive: true, maintainAspectRatio: false }
      });
      return;
    }

    // Nhãn trục X: ngày (dd/mm) — tên tuần hiển thị trong DẢI MÀU dưới trục (plugin)
    const labels = dates.map(d => fmtDateDM(d));

    // Nhóm ngày theo tuần → dải màu xen kẽ dưới trục X, tên "Tuần X" căn giữa
    const weekGroups = [];
    dates.forEach((d, i) => {
      const wk = getWeekNumber(getISOWeekString(d));
      const last = weekGroups[weekGroups.length - 1];
      if (last && last.week === wk) last.i1 = i;
      else weekGroups.push({ week: wk, i0: i, i1: i });
    });

    const notesByDate = getPressNotesByDate();
    const ctx = canvas.getContext('2d');
    state.pressChartInstance = new Chart(ctx, {
      type: 'bar',
      plugins: [pressNoteMarkerPlugin, pressWeekBandPlugin],
      data: {
        labels,
        datasets: [
          { label: 'Có thể chuyển TP ngay', data: dates.map(d => +(byDay[d].t1).toFixed(4)), backgroundColor: '#0ea5e9', stack: 'ep', borderRadius: 4 },
          { label: 'Chỉ BTP', data: dates.map(d => +(byDay[d].t2).toFixed(4)), backgroundColor: '#94a3b8', stack: 'ep', borderRadius: 4 },
          { label: 'BTP sang TP', data: dates.map(d => +(byDay[d].t3).toFixed(4)), backgroundColor: '#8b5cf6', stack: 'ep', borderRadius: 4 },
          { label: 'Thành phẩm tương đương (m³)', data: dates.map(d => +(byDay[d].fp).toFixed(4)), backgroundColor: '#15803d', stack: 'fp', borderRadius: 4 }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        // Chừa dải dưới trục X cho dải màu tuần (plugin pressWeekBands)
        layout: { padding: { bottom: 28 } },
        // Bấm/chạm vào CỘT → highlight các dòng cùng ngày trong bảng lượt ép;
        // bấm/chạm vào dấu "!" vàng → mở form sửa ghi chú giải trình ngày đó
        onClick: (evt, elements) => {
          if (pressChartPan && pressChartPan.consumeMoved()) return; // vừa vuốt xong → không phải click
          const markerHit = findPressNoteMarkerHit(evt);
          if (markerHit) {
            hidePressNotePopover();
            openPressNoteModal(markerHit.date); // tự thoát toàn màn hình nếu đang bật
            return;
          }
          if (!elements || !elements.length) return;
          const date = dates[elements[0].index];
          if (date) highlightPressTableRowsByDate(date);
        },
        onHover: (evt, elements) => {
          if (pressChartPan && (pressChartPan.dragging() || pressChartPan.consumeMoved())) { hidePressNotePopover(); return; } // đang/vừa vuốt
          const target = evt && evt.native ? evt.native.target : null;
          const markerHit = findPressNoteMarkerHit(evt);
          if (target) target.style.cursor = markerHit ? 'help' : ((elements && elements.length) ? 'pointer' : 'default');
          if (markerHit && evt.native) {
            showPressNotePopover(markerHit.text, evt.native.clientX, evt.native.clientY, markerHit.date, null);
          } else if (!markerHit) {
            hidePressNotePopover();
          }
        },
        plugins: {
          pressNoteMarkers: {
            dates,
            epTotals: dates.map(d => +(byDay[d].t1 + byDay[d].t2 + byDay[d].t3).toFixed(4)),
            fpValues: dates.map(d => +(byDay[d].fp).toFixed(4)),
            notesByDate,
            showText: !!state.pressNotesExpanded // nút "Hiện Ghi Chú" đang bật → vẽ nội dung tất cả ghi chú
          },
          pressWeekBands: { groups: weekGroups }, // dải màu tuần dưới trục X
          legend: { display: true, position: 'top', labels: { font: { size: 11 }, boxWidth: 12 } },
          tooltip: {
            callbacks: {
              title: items => {
                if (!items.length) return '';
                const d = dates[items[0].dataIndex];
                return `Tuần ${getWeekNumber(getISOWeekString(d))} • ${fmtDateDM(d)}`;
              },
              label: c => ` ${c.dataset.label}: ${Number(c.parsed.y).toFixed(4)} m³`
            }
          }
        },
        scales: {
          x: { beginAtZero: true, stacked: true, ticks: { font: { size: 10 } } },
          y: { beginAtZero: true, stacked: true, ticks: { font: { size: 10 }, callback: (v) => Number(v).toFixed(1) } }
        }
      }
    });
  }

  // Bật/tắt hiển thị NỘI DUNG của tất cả ghi chú giải trình ngay trên biểu đồ
  // (nút "Hiện Ghi Chú" dưới biểu đồ ép ván)
  function togglePressNotesExpanded() {
    state.pressNotesExpanded = !state.pressNotesExpanded;
    updatePressNotesToggleButton();
    hidePressNotePopover();
    renderPressChart();
  }

  // Đồng bộ nhãn / màu / chú thích của nút "Hiện Ghi Chú" theo trạng thái
  function updatePressNotesToggleButton() {
    const btn = document.getElementById('btn-toggle-press-notes');
    if (!btn) return;
    const on = !!state.pressNotesExpanded;
    const label = document.getElementById('btn-toggle-press-notes-label');
    if (label) label.textContent = on ? 'Ẩn Ghi Chú' : 'Hiện Ghi Chú';
    btn.classList.toggle('notes-on', on);
    btn.title = on
      ? 'Ẩn nội dung tất cả ghi chú giải trình trên biểu đồ'
      : 'Hiện nội dung tất cả ghi chú giải trình ngay trên biểu đồ';
  }

  // Bấm/chạm vào CỘT trong biểu đồ "Thể Tích Ván Ép Theo Ngày" → highlight các
  // dòng cùng ngày trong bảng lượt ép bên dưới và cuộn khung nhìn tới vùng đó.
  function highlightPressTableRowsByDate(date) {
    if (!date) return;
    // Thoát chế độ biểu đồ toàn màn hình (nếu đang bật) để thấy bảng bên dưới
    const canvas = document.getElementById('press-chart');
    const card = canvas && canvas.closest ? canvas.closest('.press-chart-card') : null;
    if (card && card.classList.contains('chart-expanded')) collapseChartCard(card);
    // Bảng đang thu gọn → mở rộng trước
    const tableCard = document.getElementById('press-table-card');
    if (tableCard && tableCard.classList.contains('rate-table-collapsed')) {
      toggleRateTableCollapse('press-table-card');
    }
    const tbody = document.getElementById('press-table-body');
    if (!tbody || !tbody.querySelectorAll) return;
    let first = null;
    tbody.querySelectorAll('tr').forEach(tr => {
      const match = tr.dataset && tr.dataset.date === date;
      tr.classList.toggle('press-row-highlight', match);
      if (match && !first) first = tr;
    });
    if (first && first.scrollIntoView) {
      first.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
      // Nhấp nháy để dễ định vị (bấm lại cùng cột vẫn chạy hiệu ứng)
      first.classList.remove('press-row-flash');
      void first.offsetWidth;
      first.classList.add('press-row-flash');
    }
  }

  // Bảng danh sách lượt ép
  function renderPressTable() {
    const tbody = document.getElementById('press-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    const notesByDate = getPressNotesByDate();

    let records = [...state.pressRecords];
    if (state.pressYearFilter !== 'all') {
      records = records.filter(r => String(r.year || getDateYear(r.date)) === String(state.pressYearFilter));
    }
    if (state.pressWeekFilter !== 'all') {
      records = records.filter(r => pressRecordWeek(r) === parseInt(state.pressWeekFilter));
    }
    records.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    if (records.length === 0) {
      tbody.innerHTML = `<tr><td colspan="10" class="text-center" style="padding:30px;color:var(--text-muted);">
        <i data-lucide="factory" style="width:28px;height:28px;margin-bottom:8px;"></i>
        <p>Chưa có lượt ép nào. Bấm "Thêm Lượt Ép" để ghi nhận sản lượng ép ván.</p></td></tr>`;
      initLucide();
      return;
    }

    records.forEach(r => {
      const vanThoList = r.vanTho || [];
      const sticksList = r.sticks || [];
      const noteText = notesByDate.get(r.date) || '';
      const noteBadge = noteText
        ? ` <span class="press-note-badge" data-note="${escapeHTML(noteText)}" data-date="${escapeHTML(r.date)}" title="Ghi chú giải trình">!</span>`
        : '';
      const vtDesc = vanThoList.map(l =>
        `${escapeHTML(l.vtDim)} ×${(l.vtQty || 0).toLocaleString('vi-VN')}`).join('<br>');
      const stickDesc = sticksList.map(s =>
        `${escapeHTML(s.nanKey)} ×${(s.sticks || 0).toLocaleString('vi-VN')}`).join('<br>');
      const vtQtyTotal = vanThoList.reduce((a, l) => a + (l.vtQty || 0), 0);
      // Cột "Công Nhân Ép" — LẤY TỰ ĐỘNG từ phân vị "Ép" theo ngày lượt ép
      // (tab Nhân Sự). Hiện tối đa 3 tên + chip đếm + nút Chi tiết; chưa có
      // dữ liệu phân vị thì để trống (hiện "—").
      const autoWorkers = hrWorkersForPress(r.date);
      const workerShort = autoWorkers.slice(0, 3).map(w => escapeHTML(w.name)).join(', ')
        + (autoWorkers.length > 3 ? ` <strong style="color:var(--primary);">+${autoWorkers.length - 3}</strong>` : '');
      const workerCell = autoWorkers.length
        ? `<span title="${escapeHTML(autoWorkers.map(w => w.name).join(', '))}">${workerShort}</span>` +
          ` <span class="hr-chip ok" style="margin:1px 2px;">${autoWorkers.length} người</span>` +
          ` <button class="btn btn-outline btn-icon btn-sm" onclick="app.pressWorkersDetail('${r.id}')" title="Xem chi tiết công nhân ép — đối chiếu chấm công & phân vị"><i data-lucide="users"></i></button>`
        : `<span class="text-muted" title="Chưa có ai được phân vị Ép ngày này ở tab Nhân Sự (Chấm Công & Phân Vị Theo Ngày)">—</span>`;
      // Lượt ép CHƯA ép thành phẩm (không có thành phẩm) → hiển thị "—"
      const productCell = r.productId
        ? `<span class="rate-product-name">${escapeHTML(r.productName || 'Đã xóa')}</span>`
        : '<span class="text-muted">— (chưa ép TP)</span>';
      const fpCell = (r.finishedQty || 0) > 0
        ? `<strong style="color:var(--primary);">${(r.finishedQty || 0).toLocaleString('vi-VN')}</strong> tấm`
        : '<span class="text-muted">—</span>';
      const tr = document.createElement('tr');
      tr.dataset.date = r.date || ''; // phục vụ highlight từ biểu đồ khi bấm vào cột
      tr.innerHTML = `
        <td><strong>${fmtDateDM(r.date)}</strong>${noteBadge}<br><span class="text-muted">T${getWeekNumber(r.week)}</span></td>
        <td>${productCell}</td>
        <td>${vtDesc}</td>
        <td>${stickDesc}</td>
        <td>${vtQtyTotal.toLocaleString('vi-VN')}</td>
        <td>${fpCell}</td>
        <td>${(r.glue || 0).toFixed(2)}</td>
        <td>${(r.additive || 0).toFixed(2)}</td>
        <td>${workerCell}</td>
        <td class="text-right">
          <div style="display:flex;justify-content:flex-end;gap:4px;">
            <button class="btn btn-outline btn-icon btn-sm" onclick="app.editPressRecord('${r.id}')" title="Sửa"><i data-lucide="edit-3"></i></button>
            <button class="btn btn-outline btn-icon btn-sm" onclick="app.deletePressRecord('${r.id}')" title="Xóa" style="color:var(--danger);"><i data-lucide="trash-2"></i></button>
          </div>
        </td>`;
      tbody.appendChild(tr);
    });
    initLucide();
  }

  // ── CÔNG NHÂN ÉP: suy ra TỰ ĐỘNG từ phân vị "Ép" theo ngày (tab Nhân Sự) ──
  // Không còn nhập tay: cột trong bảng, preview trong form và modal chi tiết
  // đều đọc từ hrWorkersForPress(ngày lượt ép) — người ĐI LÀM & được phân vị Ép.
  // Modal chi tiết: từng công nhân kèm bộ phận, ghi chú chấm công và các vị trí
  // được phân trong ngày. Cột "Giờ Ép" từng người sẽ bổ sung ở giai đoạn sau.
  function openPressWorkersModal(recordId) {
    const r = (state.pressRecords || []).find(x => x.id === recordId);
    if (!r) return;
    const modal = document.getElementById('modal-press-workers');
    if (!modal) return;
    const titleEl = document.getElementById('press-workers-modal-title');
    const dateLabel = fmtDateDM(r.date);
    const summaryEl = document.getElementById('press-workers-summary');
    const tbody = document.getElementById('press-workers-body');
    if (!tbody) return;

    // Danh sách công nhân: ƯU TIÊN tên đã lưu trên lượt ép (kể cả trước khi có
    // chấm công — theo quy trình mới: chưa có dữ liệu Nhân Sự thì để trống nên
    // lượt ép cũ có thể vẫn giữ tên tay). Nếu lượt ép KHÔNG lưu tên (quy trình
    // mới) → suy ra từ phân vị "Ép" theo ngày ở tab Nhân Sự.
    // Mỗi tên được đối chiếu: hồ sơ Nhân Sự + chấm công + phân vị + đơn nghỉ duyệt.
    const savedNames = String(r.worker || '').split(',').map(s => s.trim()).filter(Boolean);
    const names = savedNames.length ? savedNames : hrWorkersForPress(r.date).map(w => w.name);
    if (titleEl) titleEl.innerHTML = `<i data-lucide="users"></i> Công Nhân Ép — Lượt ${dateLabel} (${names.length} người)`;

    if (!names.length) {
      if (summaryEl) summaryEl.innerHTML = `<span class="hr-stat-chip"><i data-lucide="info"></i> Chưa có ai được phân vị Ép ngày <strong>${dateLabel}</strong> — cập nhật ở tab Nhân Sự.</span>`;
      tbody.innerHTML = `<tr><td colspan="6" class="text-center" style="padding:22px;color:var(--text-muted);">
        <i data-lucide="user-x" style="width:24px;height:24px;margin-bottom:6px;"></i>
        <p>Chưa có phân vị Ép trong ngày này — vào tab Nhân Sự, bảng "Chấm Công &amp; Phân Vị Theo Ngày" để phân.</p></td></tr>`;
      modal.classList.add('show');
      initLucide();
      return;
    }

    const rows = names.map(rawName => {
      const emp = hrEmpByName(rawName);
      const status = emp ? attStatusOf(emp.id, r.date) : '';
      const positions = emp ? hrPositionsNamesOf(emp.id, r.date) : [];
      const leave = emp ? approvedLeaveOn(emp.id, r.date) : null;
      return { name: rawName, emp, status, positions, leave, isPress: positions.some(n => /ép/i.test(n)) };
    });
    const matched = rows.filter(x => x.emp).length;
    const pressCount = rows.filter(x => x.isPress).length;

    const statusCell = (x) => {
      if (!x.emp) return '<span class="hr-chip warn">Chưa có hồ sơ</span>';
      if (x.leave || x.status === 'leave') return '<span class="hr-chip warn">Nghỉ có phép</span>';
      if (x.status === 'work') return '<span class="hr-chip ok">Đi làm ✓</span>';
      if (x.status === 'absent') return '<span class="hr-chip bad">Vắng</span>';
      return '<span class="text-muted">— Chưa chấm —</span>';
    };

    tbody.innerHTML = rows.map((x, i) => {
      const posCell = (x.positions || []).length
        ? x.positions.map(n => `<span class="hr-chip ${/ép/i.test(n) ? 'ok' : ''}" style="${/ép/i.test(n) ? '' : 'background:var(--bg-subtle);color:var(--text-main);'}">${escapeHTML(n)}</span>`).join(' ')
        : '<span class="text-muted">—</span>';
      const note = (x.emp && (attRecordOf(x.emp.id, r.date) || {}).note) || '';
      return `<tr>
        <td>${i + 1}</td>
        <td><strong>${escapeHTML(x.name)}</strong>${x.emp && x.leave ? ' <span class="hr-chip warn" title="Có đơn nghỉ đã duyệt trong ngày này">Nghỉ có phép</span>' : ''}</td>
        <td class="hr-emp-code">${x.emp ? escapeHTML(x.emp.code || '—') : '<span class="text-muted">Chưa có hồ sơ</span>'}</td>
        <td>${x.emp ? escapeHTML(x.emp.department || '—') : '—'}</td>
        <td>${statusCell(x)}${note ? `<div class="text-muted" style="font-size:0.75rem;" title="${escapeHTML(note)}">${escapeHTML(note)}</div>` : ''}</td>
        <td>${posCell}</td>
      </tr>`;
    }).join('');

    if (summaryEl) {
      summaryEl.innerHTML =
        `<span class="hr-stat-chip"><i data-lucide="users"></i> Công nhân: <strong>${rows.length}</strong></span>` +
        `<span class="hr-stat-chip"><i data-lucide="user-check"></i> Khớp hồ sơ Nhân Sự: <strong>${matched}</strong></span>` +
        `<span class="hr-stat-chip"><i data-lucide="check-circle-2"></i> Được phân vị Ép: <strong>${pressCount}</strong></span>`;
    }
    modal.classList.add('show');
    initLucide();
  }

  function closePressWorkersModal() {
    document.getElementById('modal-press-workers')?.classList.remove('show');
  }

  // Ô xem trước trong FORM lượt ép: danh sách công nhân tự động theo Ngày Ép
  function refreshPressWorkersPreview() {
    const box = document.getElementById('press-workers-auto');
    if (!box) return;
    const dateVal = document.getElementById('press-date')?.value;
    if (!dateVal) {
      box.innerHTML = 'Chọn <strong>Ngày Ép</strong> để xem danh sách công nhân tự động.';
      box.classList.add('muted');
      return;
    }
    const workers = hrWorkersForPress(dateVal);
    if (!workers.length) {
      box.innerHTML = `Chưa có ai được phân vị Ép ngày <strong>${fmtDateDM(dateVal)}</strong> — công nhân ép để trống. Cập nhật ở tab Nhân Sự (Chấm Công &amp; Phân Vị Theo Ngày).`;
      box.classList.add('muted');
      return;
    }
    box.classList.remove('muted');
    box.innerHTML = `<strong>${workers.length} người:</strong> ${workers.map(w => escapeHTML(w.name)).join(', ')}`;
  }

  // ── POPOVER hiển thị nội dung ghi chú (dùng chung cho biểu đồ & bảng) ──
  let notePopoverSource = null;
  function ensureNotePopoverEl() {
    let el = document.getElementById('press-note-popover');
    if (!el) {
      el = document.createElement('div');
      el.id = 'press-note-popover';
      el.innerHTML = '<div class="press-note-popover-text"></div>' +
        '<button type="button" class="press-note-popover-edit"><i data-lucide="edit-3"></i> Sửa ghi chú</button>';
      document.body.appendChild(el);
      initLucide();
    }
    return el;
  }

  function showPressNotePopover(text, clientX, clientY, date, sourceEl) {
    if (!text) return;
    const el = ensureNotePopoverEl();
    // Bấm lại đúng biểu tượng đang mở → ẩn (toggle cho cảm ứng)
    if (sourceEl && notePopoverSource === sourceEl && el.style.display === 'block') {
      hidePressNotePopover();
      return;
    }
    notePopoverSource = sourceEl || null;
    const textEl = el.querySelector('.press-note-popover-text');
    if (textEl) textEl.textContent = text;
    const editBtn = el.querySelector('.press-note-popover-edit');
    if (editBtn) {
      editBtn.style.display = (date && requireEditPermission()) ? 'inline-flex' : 'none';
      editBtn.dataset.date = date || '';
    }
    el.style.display = 'block';
    // Đo kích thước & kẹp trong khung nhìn
    const rect = el.getBoundingClientRect();
    let left = clientX + 12;
    let top = clientY + 14;
    if (Number.isFinite(window.innerWidth) && left + rect.width > window.innerWidth - 8) {
      left = Math.max(8, clientX - rect.width - 12);
    }
    if (Number.isFinite(window.innerHeight) && top + rect.height > window.innerHeight - 8) {
      top = Math.max(8, clientY - rect.height - 14);
    }
    el.style.left = left + 'px';
    el.style.top = top + 'px';
  }

  function hidePressNotePopover() {
    const el = document.getElementById('press-note-popover');
    if (el) el.style.display = 'none';
    notePopoverSource = null;
  }

  // ── MODAL: tạo/sửa/xóa ghi chú giải trình ──
  function openPressNoteModal(date) {
    if (!requireEditPermission()) return;
    // Thoát chế độ toàn màn hình của biểu đồ (nếu đang bật) để form ghi chú
    // hiển thị đúng trên điện thoại (fullscreen chỉ render nội dung thẻ biểu đồ)
    const pressCanvas = document.getElementById('press-chart');
    const chartCard = pressCanvas && pressCanvas.closest ? pressCanvas.closest('.press-chart-card') : null;
    if (chartCard && chartCard.classList.contains('chart-expanded')) collapseChartCard(chartCard);
    const modal = document.getElementById('modal-press-note');
    if (!modal) return;
    const form = document.getElementById('press-note-form');
    if (form) form.reset();
    hidePressNotePopover();
    const note = date ? (state.pressNotes || []).find(n => n.date === date) : null;
    document.getElementById('press-note-id').value = note ? note.id : '';
    document.getElementById('press-note-date').value = note ? note.date : (date || todayLocalISO());
    document.getElementById('press-note-text').value = note ? note.text : '';
    const delBtn = document.getElementById('btn-delete-press-note');
    if (delBtn) delBtn.style.display = note ? '' : 'none';
    const titleEl = document.getElementById('press-note-modal-title');
    if (titleEl) {
      titleEl.innerHTML = `<i data-lucide="sticky-note"></i> ${note ? 'Sửa Ghi Chú Giải Trình' : 'Thêm Ghi Chú Giải Trình'}`;
    }
    modal.classList.add('show');
    initLucide();
  }

  function closePressNoteModal() {
    document.getElementById('modal-press-note')?.classList.remove('show');
  }

  function handlePressNoteSubmit(e) {
    e.preventDefault();
    if (!requireEditPermission()) return;
    const id = document.getElementById('press-note-id').value;
    const date = document.getElementById('press-note-date').value;
    const text = document.getElementById('press-note-text').value.trim();
    if (!date) { showToast('Vui lòng chọn ngày!', 'error'); return; }
    if (!text) { showToast('Vui lòng nhập nội dung giải trình!', 'error'); return; }
    state.pressNotes = state.pressNotes || [];
    // 1 ngày 1 ghi chú — nếu ngày đã có ghi chú khác thì cập nhật nội dung bản ghi đó
    const dup = state.pressNotes.find(n => n.date === date && n.id !== id);
    const nowIso = new Date().toISOString();
    if (dup) {
      dup.text = text;
      dup.updatedAt = nowIso;
      showToast(`Ngày ${fmtDateDM(date)} đã có ghi chú — đã cập nhật nội dung.`, 'info');
    } else if (id) {
      const idx = state.pressNotes.findIndex(n => n.id === id);
      if (idx !== -1) {
        state.pressNotes[idx] = { ...state.pressNotes[idx], date, text, updatedAt: nowIso };
      } else {
        state.pressNotes.push({ id, date, text, createdAt: nowIso, updatedAt: nowIso });
      }
    } else {
      state.pressNotes.push({ id: `pnote-${Date.now()}`, date, text, createdAt: nowIso, updatedAt: nowIso });
    }
    savePressNotes();
    closePressNoteModal();
    renderPressView();
    showToast('Đã lưu ghi chú giải trình!', 'success');
  }

  function handlePressNoteDelete() {
    if (!requireEditPermission()) return;
    const id = document.getElementById('press-note-id').value;
    const note = (state.pressNotes || []).find(n => n.id === id);
    if (!note) return;
    if (!confirm(`Xóa ghi chú giải trình ngày ${fmtDateDM(note.date)}?`)) return;
    state.pressNotes = state.pressNotes.filter(n => n.id !== id);
    savePressNotes();
    closePressNoteModal();
    renderPressView();
    showToast('Đã xóa ghi chú giải trình', 'info');
  }

  // ─── BIỂU ĐỒ TĨNH: KẾ HOẠCH vs ĐÃ ÉP (Dashboard) ─────────────
  // Gộp 2 nguồn dữ liệu (planningItems + pressRecords) — thứ mà biểu
  // đồ tùy chỉnh không làm được. Chiều cao cột LUÔN theo m³ (quy đổi
  // theo kích thước đọc từ tên sản phẩm, VD: 'Ván 1200x382x12'); nút
  // Tấm/m³ chỉ đổi SỐ HIỂN THỊ trên cột & tooltip, giữ nguyên tỷ lệ cột.
  function getProductDimsStr(productId) {
    const rate = state.materialRates.find(r => r.id === productId);
    if (!rate) return '';
    const m = String(rate.product || '').match(/(\d+(?:[.,]\d+)?)\s*[x×*]\s*(\d+(?:[.,]\d+)?)\s*[x×*]\s*(\d+(?:[.,]\d+)?)/i);
    return m ? `${m[1]}x${m[2]}x${m[3]}` : '';
  }

  function renderPlanVsPressChart() {
    const canvas = document.getElementById('plan-vs-press-chart');
    if (!canvas || !window.Chart) return;
    if (state.planVsPressInstance) { state.planVsPressInstance.destroy(); state.planVsPressInstance = null; }

    // Mặc định lần đầu mở trang: năm & tuần hiện tại
    const curWeekNum = getWeekNumber(getISOWeekString(todayLocalISO()));
    const curYearStr = String(getDateYear(todayLocalISO()));
    if (state.planVsPressWeek === 'current' || !state.planVsPressWeek) state.planVsPressWeek = curWeekNum;
    if (state.planVsPressYear === 'current' || !state.planVsPressYear) state.planVsPressYear = curYearStr;
    const wkNum = Number(state.planVsPressWeek);
    if (state.planVsPressWeek !== 'all' && (!Number.isFinite(wkNum) || wkNum < 1 || wkNum > 53)) state.planVsPressWeek = curWeekNum;

    // Điền bộ lọc năm (năm hiện tại + năm gộp từ cả 2 nguồn dữ liệu)
    const years = new Set([curYearStr]);
    (state.planningItems || []).forEach(p => { if (p.year) years.add(String(p.year)); });
    (state.pressRecords || []).forEach(r => { years.add(String(r.year || getDateYear(r.date))); });
    const yearList = [...years].filter(Boolean).sort((a, b) => Number(b) - Number(a));
    if (!['all', ...yearList].includes(String(state.planVsPressYear))) state.planVsPressYear = curYearStr;
    const yearSel = document.getElementById('pv-year-filter');
    if (yearSel) {
      yearSel.innerHTML = '<option value="all">Tất Cả</option>' +
        yearList.map(y => `<option value="${y}"${String(state.planVsPressYear) === y ? ' selected' : ''}>${y}</option>`).join('');
    }
    const yOn = y => state.planVsPressYear === 'all' || String(y) === String(state.planVsPressYear);

    // Điền ô chọn tuần (Tất Cả + Tuần 1..53)
    const wkSel = document.getElementById('pv-week-filter');
    if (wkSel) {
      wkSel.innerHTML = '<option value="all">Tất Cả</option>' +
        Array.from({ length: 53 }, (_, i) => i + 1)
          .map(w => `<option value="${w}"${String(state.planVsPressWeek) === String(w) ? ' selected' : ''}>Tuần ${w}</option>`).join('');
    }
    const wkOn = w => state.planVsPressWeek === 'all' || Number(w) === Number(state.planVsPressWeek);

    // Gộp số liệu theo sản phẩm (lọc năm + tuần)
    const planQty = {}, pressQty = {}, pressVol = {};
    (state.planningItems || []).forEach(p => {
      if (!p.productId || !yOn(p.year) || !wkOn(getWeekNumber(p.week))) return;
      planQty[p.productId] = (planQty[p.productId] || 0) + (Number(p.qty) || 0);
    });
    (state.pressRecords || []).forEach(r => {
      if (!r.productId || !yOn(r.year || getDateYear(r.date)) || !wkOn(pressRecordWeek(r))) return;
      const q = Number(r.finishedQty) || 0;
      pressQty[r.productId] = (pressQty[r.productId] || 0) + q;
      pressVol[r.productId] = (pressVol[r.productId] || 0) + dimVolume(r.fpDim || getProductDimsStr(r.productId), q);
    });

    // SỐ LƯỢNG XUẤT (tab QC — Bảng Xuất Hàng): gộp theo mã hàng với cùng
    // bộ lọc năm/tuần. Dòng "ngoài danh sách" (không có productId) được thử
    // khớp theo TÊN với định mức; không khớp mã nào thì bỏ qua (biểu đồ
    // hiển thị theo mã hàng kế hoạch).
    const exportQty = {};
    (state.qcExports || []).forEach(q => {
      if (!q || !yOn(q.year) || !wkOn(getWeekNumber(q.week))) return;
      let pid = q.productId || null;
      if (!pid) {
        const nm = String(q.name || '').trim().toLowerCase();
        if (!nm) return;
        const rate = state.materialRates.find(r => String(r.product || '').trim().toLowerCase() === nm);
        if (!rate) return;
        pid = rate.id;
      }
      exportQty[pid] = (exportQty[pid] || 0) + (Number(q.qty) || 0);
    });

    const ids = [...new Set([...Object.keys(planQty), ...Object.keys(pressQty), ...Object.keys(exportQty)])];
    // Sắp xếp: sản phẩm có tổng số lượng (kế hoạch + ép + xuất) lớn nhất đứng trước
    ids.sort((a, b) => ((planQty[b] || 0) + (pressQty[b] || 0) + (exportQty[b] || 0)) - ((planQty[a] || 0) + (pressQty[a] || 0) + (exportQty[a] || 0)));
    const labelOf = id => (state.materialRates.find(r => r.id === id) || {}).product || 'Sản phẩm đã xóa';

    // Đơn vị HIỂN THỊ số liệu: 'vol' (m³, mặc định) hoặc 'qty' (tấm).
    // Chiều cao cột LUÔN tính theo m³ — bấm nút chuyển chỉ thay số trên
    // cột/tooltip, giữ nguyên tỷ lệ; khi xem "tấm" thì ẩn trục Y (vạch chia
    // theo m³ sẽ gây hiểu nhầm với số tấm).
    const isVol = state.planVsPressUnit === 'vol';
    const unitVol = id => dimVolume(getProductDimsStr(id), 1);
    const planVolData   = ids.map(id => (planQty[id] || 0) * unitVol(id));
    const pressVolData  = ids.map(id => pressVol[id] || 0);
    const exportVolData = ids.map(id => (exportQty[id] || 0) * unitVol(id));
    const planQtyData   = ids.map(id => planQty[id] || 0);
    const pressQtyData  = ids.map(id => pressQty[id] || 0);
    const exportQtyData = ids.map(id => exportQty[id] || 0);
    const fmtVol = v => String(+Number(v).toFixed(3));
    const fmtQty = v => Math.round(Number(v)).toLocaleString('vi-VN');
    const valOf  = (dIdx, i) => (dIdx === 0
      ? (isVol ? planVolData[i] : planQtyData[i])
      : dIdx === 1
      ? (isVol ? pressVolData[i] : pressQtyData[i])
      : (isVol ? exportVolData[i] : exportQtyData[i]));
    const fmtVal = v => (isVol ? fmtVol(v) : fmtQty(v));
    const fmtTick = v => String(Number(Number(v).toFixed(2)));

    // Plugin vẽ số THỰC TẾ lên đỉnh TỪNG cột (cả 3 dataset: Kế Hoạch / Đã Ép / Số Lượng Xuất)
    const valueLabelPlugin = {
      id: 'pvValueLabels',
      afterDatasetsDraw(chart) {
        const { ctx } = chart;
        chart.data.datasets.forEach((ds, dIdx) => {
          (chart.getDatasetMeta(dIdx).data || []).forEach((bar, i) => {
            const val = valOf(dIdx, i);
            if (!val) return;
            ctx.save();
            ctx.font = 'bold 10px sans-serif';
            ctx.fillStyle = ds.borderColor || '#334155';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            ctx.fillText(fmtVal(val), bar.x, bar.y - 3);
            ctx.restore();
          });
        });
      }
    };

    state.planVsPressInstance = new Chart(canvas.getContext('2d'), {
      type: 'bar',
      plugins: [valueLabelPlugin],
      data: {
        labels: ids.map(labelOf),
        datasets: [
          { label: 'Kế Hoạch',       data: planVolData,   backgroundColor: 'rgba(124, 58, 237, 0.78)', borderColor: '#7c3aed', borderWidth: 1, borderRadius: 4 },
          { label: 'Đã Ép',          data: pressVolData,  backgroundColor: 'rgba(22, 163, 74, 0.78)',  borderColor: '#16a34a', borderWidth: 1, borderRadius: 4 },
          { label: 'Số Lượng Xuất',  data: exportVolData, backgroundColor: 'rgba(37, 99, 235, 0.78)',  borderColor: '#2563eb', borderWidth: 1, borderRadius: 4 }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          // Tắt plugin nhãn toàn cục (bambooDataLabels) cho biểu đồ này —
          // đã có pvValueLabels vẽ số theo đơn vị hiển thị, tránh vẽ đè đôi
          bambooDataLabels: false,
          legend: { display: true, position: 'top', labels: { font: { size: 11 }, boxWidth: 12 } },
          tooltip: {
            callbacks: {
              label: c => {
                const i = c.dataIndex;
                const qty = c.datasetIndex === 0 ? planQtyData[i]
                  : c.datasetIndex === 1 ? pressQtyData[i]
                  : exportQtyData[i];
                const vol = c.datasetIndex === 0 ? planVolData[i]
                  : c.datasetIndex === 1 ? pressVolData[i]
                  : exportVolData[i];
                return ` ${c.dataset.label}: ${isVol ? `${fmtVol(vol)} m³` : fmtQty(qty)}`;
              }
            }
          }
        },
        scales: {
          x: { ticks: { font: { size: 10 } } },
          // Xem "tấm": chiều cao cột theo m³ → ẩn trục Y để tránh hiểu nhầm
          y: { display: isVol, beginAtZero: true, ticks: { font: { size: 10 }, callback: v => fmtTick(v) } }
        }
      }
    });
  }

  // Chuyển đổi đơn vị hiển thị của biểu đồ Kế Hoạch vs Đã Ép
  function setPlanVsPressUnit(unit) {
    state.planVsPressUnit = unit === 'vol' ? 'vol' : 'qty';
    const q = document.getElementById('pv-unit-qty');
    const v = document.getElementById('pv-unit-vol');
    if (q) q.classList.toggle('active', state.planVsPressUnit === 'qty');
    if (v) v.classList.toggle('active', state.planVsPressUnit === 'vol');
    renderPlanVsPressChart();
  }

  // ─── BIỂU ĐỒ TĨNH: KHẢ NĂNG ĐÁP ỨNG KẾ HOẠCH (Dashboard) ─────
  // So sánh "Có thể ép" (tồn ván thô khả dụng đến tuần chọn — cùng cơ chế
  // "Có thể ép" ở tab Kế Hoạch qua getMaxProductionForProduct) với số Kế hoạch.
  // 1 cột / mã thành phẩm: đủ 100% → cột xanh đầy; thiếu → lấp đúng % và màu vàng.
  // Trả { cap, reason }: cap = số ép tối đa (null = không tính được),
  // reason = nhân tố giới hạn (bottleneck) — tooltip ghép thành "Thiếu ...".
  function planCapacityReason(productId, yearNum, weekNum) {
    const rate = state.materialRates.find(r => r.id === productId);
    if (!rate) return { cap: null, reason: 'Sản phẩm chưa có định mức nguyên vật liệu để tính khả năng ép' };
    const mp = getMaxProductionForProduct(yearNum, productId, weekNum);
    if (!mp || !Number.isFinite(mp.maxProduction)) {
      return { cap: null, reason: 'Sản phẩm chưa có định mức nguyên vật liệu để tính khả năng ép' };
    }
    const b = mp.bottleneck || {};
    const fmtN = v => Number(v || 0).toLocaleString('vi-VN');
    const reason = `thanh ${b.nanKey || '?'} — còn ${fmtN(b.available)} thanh, định mức ${fmtN(b.rate)}/tấm`;
    return { cap: mp.maxProduction, reason };
  }

  // Danh sách tuần (số ISO) có mục kế hoạch của 1 năm — dùng cho cửa sổ hiển thị & thanh trượt
  function planCapacityWeeks(yearNum) {
    const set = new Set();
    (state.planningItems || []).forEach(p => {
      if (String(p.year) !== String(yearNum) || !p.productId) return;
      const w = getWeekNumber(p.week);
      if (w > 0) set.add(w);
    });
    return [...set].sort((a, b) => a - b);
  }
  // Số tuần trong 1 cửa sổ hiển thị: màn hình rộng (≥900px) = 2 tuần, điện thoại = 1 tuần
  function planCapacityWinSize() {
    return (window.matchMedia && window.matchMedia('(min-width: 900px)').matches) ? 2 : 1;
  }
  // % đáp ứng = Có thể ép / Kế hoạch — kẹp trần 100%; không tính được (cap null) = 0
  function planCapacityPct(cap, plan) {
    if (cap == null || !Number.isFinite(cap) || !(Number(plan) > 0)) return 0;
    return Math.min(100, Math.round((cap / plan) * 1000) / 10);
  }

  function renderPlanCapacityChart() {
    const canvas = document.getElementById('plan-capacity-chart');
    if (!canvas || !window.Chart) return;
    if (state.planCapacityInstance) { state.planCapacityInstance.destroy(); state.planCapacityInstance = null; }

    // Bộ lọc RIÊNG của biểu đồ này (tách khỏi Kế Hoạch vs Đã Ép phía trên)
    const curYearStr = String(getDateYear(todayLocalISO()));
    if (!state.planCapYear || state.planCapYear === 'current') state.planCapYear = curYearStr;
    const yearNum = Number(state.planCapYear);

    // Điền ô chọn năm riêng của biểu đồ (năm hiện tại + các năm có kế hoạch)
    const capYearSel = document.getElementById('pv-cap-year-filter');
    if (capYearSel) {
      const capYears = new Set([curYearStr]);
      (state.planningItems || []).forEach(p => { if (p.year) capYears.add(String(p.year)); });
      const capYearList = [...capYears].filter(Boolean).sort((a, b) => Number(b) - Number(a));
      capYearSel.innerHTML = capYearList
        .map(y => `<option value="${y}"${String(y) === String(state.planCapYear) ? ' selected' : ''}>${y}</option>`).join('');
    }

    // Danh sách tuần có kế hoạch của năm + cửa sổ hiển thị (2 tuần trên màn rộng)
    const weeks = planCapacityWeeks(yearNum);
    const sliderEl = document.getElementById('pv-cap-slider');
    const winLabel = document.getElementById('pv-cap-window-label');
    if (!weeks.length) {
      if (sliderEl) { sliderEl.disabled = true; sliderEl.max = 0; sliderEl.value = 0; }
      if (winLabel) winLabel.textContent = `Không có kế hoạch năm ${yearNum}`;
      return;
    }
    const winSize = Math.min(planCapacityWinSize(), weeks.length);
    const maxStart = Math.max(0, weeks.length - winSize);
    let startIdx = (state.planCapStartIdx == null) ? null : Number(state.planCapStartIdx);
    if (startIdx == null || !Number.isFinite(startIdx)) {
      startIdx = weeks.indexOf(getWeekNumber(getISOWeekString(todayLocalISO()))); // mặc định: tuần hiện tại
    }
    if (!Number.isFinite(startIdx) || startIdx < 0) startIdx = 0;
    startIdx = Math.min(startIdx, maxStart);
    state.planCapStartIdx = startIdx;
    const winWeeks = weeks.slice(startIdx, startIdx + winSize);
    if (sliderEl) { sliderEl.disabled = maxStart === 0; sliderEl.max = maxStart; sliderEl.value = startIdx; }
    if (winLabel) winLabel.textContent = `Tuần ${winWeeks.join(' – ')} • ${startIdx + 1}–${Math.min(startIdx + winSize, weeks.length)}/${weeks.length} tuần`;

    const labelOf = id => (state.materialRates.find(r => r.id === id) || {}).product || 'Sản phẩm đã xóa';
    const fmtQty = v => Math.round(Number(v) || 0).toLocaleString('vi-VN');
    // Mỗi tuần = 1 nhóm cột; cột quy về % đáp ứng nên CAO BẰNG NHAU (tổng đúng 100%)
    const labels = [], planArr = [], capArr = [], pctArr = [], reasonArr = [], weekArr = [];
    const groups = [];
    winWeeks.forEach(w => {
      const planQty = {};
      (state.planningItems || []).forEach(p => {
        if (String(p.year) !== String(yearNum) || getWeekNumber(p.week) !== w || !p.productId) return;
        planQty[p.productId] = (planQty[p.productId] || 0) + (Number(p.qty) || 0);
      });
      const ids = Object.keys(planQty).filter(id => planQty[id] > 0).sort((a, b) => planQty[b] - planQty[a]);
      const startCol = labels.length;
      ids.forEach(id => {
        const plan = planQty[id];
        const info = planCapacityReason(id, yearNum, w);
        const cap = (info.cap == null || !Number.isFinite(info.cap)) ? null : info.cap;
        const pct = planCapacityPct(cap, plan);
        labels.push(labelOf(id));
        planArr.push(plan); capArr.push(cap); pctArr.push(pct); reasonArr.push(info.reason); weekArr.push(w);
      });
      groups.push({ week: w, start: startCol, end: labels.length - 1 });
    });
    if (!labels.length) {
      if (winLabel) winLabel.textContent = 'Không có kế hoạch trong các tuần này';
      return;
    }

    // ── Cấu hình Chart: cột xếp tầng TRÊN TRỤC % 0–100% ──
    // Mọi cột CAO BẰNG NHAU (đúng 100% — đáp ứng là tỉ lệ):
    //  - đủ 100%   -> lấp đầy màu XANH
    //  - dưới 100% -> lấp đến % "Có thể ép" màu VÀNG, phần trên xám rỗng
    //  - không tính được (thiếu định mức/BOM) -> cột xám rỗng toàn bộ
    // Tooltip vẫn hiện số TẤM thật (kế hoạch / có thể ép).
    const fillData  = labels.map((_, i) => (capArr[i] == null ? 0 : pctArr[i]));
    const shortData = labels.map((_, i) => 100 - fillData[i]);
    const fillColors = labels.map((_, i) =>
      capArr[i] == null ? 'rgba(148, 163, 184, 0.35)' :
      (capArr[i] >= planArr[i] ? 'rgba(22, 163, 74, 0.85)' : 'rgba(234, 179, 8, 0.85)')
    );
    const fillBorders = labels.map((_, i) =>
      capArr[i] == null ? '#94a3b8' : (capArr[i] >= planArr[i] ? '#15803d' : '#ca8a04')
    );
    const showBands = true; // luôn vẽ thẻ tuần — mỗi tuần 1 thẻ màu riêng

    // Plugin 1: vẽ THẺ TUẦN — mỗi tuần 1 thẻ màu riêng (nền tint + viền nổi,
    // bo góc), tên tuần đồng màu phía trên; ranh giới tuần = khe hở giữa 2 thẻ
    const BAND_CARDS = [
      { fill: 'rgba(99, 102, 241, 0.14)', border: 'rgba(99, 102, 241, 0.60)', label: '#4338ca' }, // chàm
      { fill: 'rgba(16, 185, 129, 0.13)', border: 'rgba(5, 150, 105, 0.60)',  label: '#047857' }, // lục
      { fill: 'rgba(245, 158, 11, 0.16)', border: 'rgba(217, 119, 6, 0.60)',  label: '#b45309' }, // hổ phách
      { fill: 'rgba(236, 72, 153, 0.12)', border: 'rgba(219, 39, 119, 0.55)', label: '#be185d' }, // hồng
      { fill: 'rgba(14, 165, 233, 0.13)', border: 'rgba(2, 132, 199, 0.60)',  label: '#0369a1' }  // xanh da trời
    ];
    const CARD_GAP = 3;     // khe hở giữa 2 thẻ tuần (tạo ranh giới rõ)
    const CARD_RADIUS = 10; // độ bo góc thẻ
    const capRoundRect = (ctx, x, y, w, h, r) => {
      const rr = Math.min(r, w / 2, h / 2);
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') { ctx.roundRect(x, y, w, h, rr); return; }
      ctx.moveTo(x + rr, y);
      ctx.arcTo(x + w, y, x + w, y + h, rr);
      ctx.arcTo(x + w, y + h, x, y + h, rr);
      ctx.arcTo(x, y + h, x, y, rr);
      ctx.arcTo(x, y, x + w, y, rr);
      ctx.closePath();
    };
    const capBandPlugin = {
      id: 'capWeekBands',
      beforeDraw(chart) {
        if (!showBands) return;
        const area = chart.chartArea;
        if (!area) return;
        const ctx = chart.ctx;
        const total = labels.length || 1;
        ctx.save();
        groups.forEach((g, gi) => {
          const cx1 = area.left + area.width * (g.start / total) + CARD_GAP;
          const cx2 = area.left + area.width * ((g.end + 1) / total) - CARD_GAP;
          const card = BAND_CARDS[gi % BAND_CARDS.length];
          capRoundRect(ctx, cx1, area.top, Math.max(8, cx2 - cx1), area.bottom - area.top, CARD_RADIUS);
          ctx.fillStyle = card.fill;
          ctx.fill();
          ctx.strokeStyle = card.border;
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.font = 'bold 11px sans-serif';
          ctx.fillStyle = card.label;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          ctx.fillText(`Tuần ${g.week}`, (cx1 + cx2) / 2, area.top - 18); // nằm trong padding top
        });
        ctx.restore();
      }
    };

    // Plugin 2: vẽ % đáp ứng ngay trong phần lấp của cột (không dùng plugin toàn cục
    // bambooDataLabels vì cột gồm 2 tầng — % nằm ở tầng dưới mới đúng ý nghĩa)
    const capPctPlugin = {
      id: 'capPctLabels',
      afterDatasetsDraw(chart) {
        const meta0 = chart.getDatasetMeta(0);
        (meta0.data || []).forEach((bar, i) => {
          if (capArr[i] == null || !fillData[i]) return;
          const segH = Math.abs(bar.base - bar.y);
          if (segH < 13) return; // quá thấp không đủ chỗ vẽ chữ
          const ctx = chart.ctx;
          ctx.save();
          ctx.font = 'bold 10px sans-serif';
          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`${pctArr[i]}%`, bar.x, (bar.base + bar.y) / 2);
          ctx.restore();
        });
      }
    };

    state.planCapacityInstance = new Chart(canvas.getContext('2d'), {
      type: 'bar',
      plugins: [capBandPlugin, capPctPlugin],
      data: {
        labels, // nhãn sản phẩm theo nhóm tuần (đã gom từ các tuần trong cửa sổ)
        datasets: [
          { // Tầng dưới: phần ĐÁP ỨNG được (xanh = đủ, vàng = thiếu)
            label: 'Đáp ứng được',
            data: fillData,
            backgroundColor: fillColors,
            borderColor: fillBorders,
            borderWidth: 1,
            stack: 'cap',
            borderRadius: { topLeft: 4, topRight: 4, bottomLeft: 0, bottomRight: 0 }
          },
          { // Tầng trên: phần CÒN THIÊU so với kế hoạch (xám rỗng)
            label: 'Còn thiếu',
            data: shortData,
            backgroundColor: capArr.map(c => (c == null ? 'rgba(148, 163, 184, 0.18)' : 'rgba(203, 213, 225, 0.35)')),
            borderColor: 'rgba(148, 163, 184, 0.6)',
            borderWidth: 1,
            stack: 'cap',
            borderRadius: { topLeft: 4, topRight: 4, bottomLeft: 0, bottomRight: 0 }
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: { top: 18 } }, // chừa chỗ cho tên tuần (mỗi tuần 1 mảng màu)
        plugins: {
          bambooDataLabels: false, // tắt plugin toàn cục — biểu đồ tự vẽ % ở tầng lấp
          legend: { display: false }, // màu đã giải thích ở dòng gợi ý trên thẻ
          tooltip: {
            callbacks: {
              beforeLabel: c => (showBands ? `Tuần ${weekArr[c.dataIndex]}` : ''),
              label: c => {
                const i = c.dataIndex;
                if (c.datasetIndex === 0) {
                  const capTxt = capArr[i] == null
                    ? 'không tính được'
                    : `${fmtQty(capArr[i])} (${pctArr[i]}%)`;
                  return ` Có thể ép: ${capTxt}`;
                }
                return ` Kế hoạch: ${fmtQty(planArr[i])}`;
              },
              afterLabel: c => {
                const i = c.dataIndex;
                if (capArr[i] == null) return `⚠ ${reasonArr[i]}`;
                if (capArr[i] < planArr[i]) return `⚠ Thiếu ${reasonArr[i]}`;
                return '✔ Đủ khả năng đáp ứng 100%';
              }
            }
          }
        },
        scales: {
          x: {
            stacked: true,
            ticks: { font: { size: 10 }, maxRotation: 45, minRotation: 0 }
          },
          y: {
            stacked: true,
            min: 0,
            max: 110, // cột 100% dừng đúng vạch 100, chừa ~10% khoảng thở trên khung
            ticks: { callback: v => (v > 100 ? '' : `${v}%`), font: { size: 10 }, stepSize: 25 },
            title: { display: true, text: 'Khả năng đáp ứng (%)', font: { size: 10 } }
          }
        }
      }
    });

    if (window.lucide) lucide.createIcons();
  }

  // Số tuần ISO của 1 năm (ngày 28/12 luôn thuộc tuần cuối cùng của năm)
  function weeksInISOYear(year) {
    const w = getWeekNumber(getISOWeekString(`${year}-12-28`));
    return w > 0 ? w : 52;
  }

  // Lùi/tiến 1 tuần cho biểu đồ Kế Hoạch vs Đã Ép (dir: -1 = tuần trước, 1 = tuần sau)
  function shiftPlanVsPressWeek(dir) {
    const w = Number(state.planVsPressWeek);
    if (!w || state.planVsPressWeek === 'all') return; // đang "Tất Cả" thì không điều hướng
    const curYearStr = String(getDateYear(todayLocalISO()));
    const yNum = state.planVsPressYear === 'all' ? Number(curYearStr) : Number(state.planVsPressYear);
    const maxWk = weeksInISOYear(yNum || Number(curYearStr));
    let nw = w + dir;
    if (nw > maxWk) nw = 1;     // tuần cuối -> quay về tuần 1
    if (nw < 1) nw = maxWk;     // tuần 1 -> lùi về tuần cuối
    state.planVsPressWeek = nw;
    renderPlanVsPressChart();
  }

  // Lùi/tiến cửa sổ tuần của biểu đồ Khả Năng Đáp Ứng (bộ lọc RIÊNG + hiệu ứng trượt)
  function shiftPlanCapacityWindow(dir) {
    const curYearStr = String(getDateYear(todayLocalISO()));
    const yearNum = (!state.planCapYear || state.planCapYear === 'current') ? Number(curYearStr) : Number(state.planCapYear);
    const weeks = planCapacityWeeks(yearNum);
    if (!weeks.length) return;
    const winSize = Math.min(planCapacityWinSize(), weeks.length);
    const maxStart = Math.max(0, weeks.length - winSize);
    let startIdx = (state.planCapStartIdx == null) ? null : Number(state.planCapStartIdx);
    if (startIdx == null || !Number.isFinite(startIdx) || startIdx < 0) {
      const curIdx = weeks.indexOf(getWeekNumber(getISOWeekString(todayLocalISO())));
      startIdx = Math.min(curIdx < 0 ? 0 : curIdx, maxStart); // mặc định: tuần hiện tại
    }
    const next = Math.max(0, Math.min(maxStart, startIdx + dir));
    if (next === startIdx) return; // đã ở biên — không trượt
    state.planCapStartIdx = next;
    // Hiệu ứng trượt: đánh dấu hướng vào khung biểu đồ rồi vẽ lại
    const box = document.querySelector('#plan-capacity-card .press-chart-box');
    if (box && box.classList) {
      box.classList.remove('pv-cap-in-left', 'pv-cap-in-right');
      void box.offsetWidth; // ép reflow để animation chạy lại từ đầu
      box.classList.add(dir > 0 ? 'pv-cap-in-right' : 'pv-cap-in-left');
    }
    renderPlanCapacityChart();
  }

export {
  addPressLine,
  addPressStick,
  closePressWorkersModal,
  dimVolume,
  buildPressLineHTML,
  buildPressStickHTML,
  closePressModal,
  closePressNoteModal,
  collectPressLines,
  collectPressSticks,
  computeBaoTinhEfficiencyByWeek,
  computeFinishedQtyFromLines,
  computeFpDimFromProduct,
  deletePressRecord,
  fmtDateDM,
  getBaoTinhStockByNanKey,
  getDateYear,
  getPressProductsForWeek,
  getPressedQtyForPlan,
  handlePressRecordSubmit,
  handlePressNoteDelete,
  handlePressNoteSubmit,
  hidePressNotePopover,
  highlightPressTableRowsByDate,
  loadPressRecords,
  loadPressNotes,
  migratePressRecord,
  openPressModal,
  openPressNoteModal,
  openPressWorkersModal,
  parseDimString,
  populatePressInputTypeList,
  populatePressWeekFilter,
  populatePressYearFilter,
  pressChartWindow,
  pressRecordWeek,
  pressWinSize,
  recalcPressQuantities,
  refreshPressProductSelect,
  refreshPressWorkersPreview,
  removePressLine,
  removePressStick,
  planCapacityReason,
  planCapacityPct,
  planCapacityWeeks,
  planCapacityWinSize,
  renderBaoTinhEffTable,
  renderPlanVsPressChart,
  renderPlanCapacityChart,
  shiftPlanCapacityWindow,
  renderPressChart,
  renderPressTable,
  showPressNotePopover,
  setPlanVsPressUnit,
  shiftPlanVsPressWeek,
  renderPressView,
  savePressRecords,
  suggestPressMaterialFields,
  togglePressNotesExpanded,
  todayLocalISO,
  updatePressRemoveButtons
};
