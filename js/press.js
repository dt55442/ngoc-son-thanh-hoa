// ═══════════════════════════════════════════════════════════
// js/press.js — tách từ app.js (refactor ES-modules phase 1)
// ═══════════════════════════════════════════════════════════
import { firePushSync, initLucide, requireEditPermission } from './cloud.js';
import { getProductBom, getUniqueNanTypes, getWeekNumber, getYearFromWeek, renderPlanningView, getMaxProductionForProduct } from './planning.js';
import { STORAGE_KEY_PRESS_RECORDS, state } from './state.js';
import { escapeHTML, getISOWeekString, showToast } from './utils.js';

  // =============================================================
  // SẢN LƯỢNG ÉP VÁN (PRESS VIEW)
  // =============================================================
  // Chuyển đổi bản ghi cũ (mảng lines gộp) sang cấu trúc mới (sticks + vanTho tách riêng)
  function migratePressRecord(r) {
    if (!r) return r;
    if ((!r.sticks || !r.sticks.length) && (!r.vanTho || !r.vanTho.length) && Array.isArray(r.lines)) {
      r.sticks = r.lines.filter(l => l.nanKey).map(l => ({ nanKey: l.nanKey, sticks: l.sticks || 0 }));
      r.vanTho = r.lines.filter(l => l.vtDim || l.vtQty).map(l => ({ vtDim: l.vtDim, vtQty: l.vtQty || 0, ratio: l.ratio || 0 }));
    }
    if (!r.sticks) r.sticks = [];
    if (!r.vanTho) r.vanTho = [];
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

  // Xây HTML cho một dòng THANH THÔ (loại nan từ Bào Tinh + số lượng thanh)
  function buildPressStickHTML(idx, stick = {}) {
    const btStock = getBaoTinhStockByNanKey();
    const nanOptions = getUniqueNanTypes().map(n => {
      const stock = btStock[n.key] || 0;
      const stockHint = stock > 0 ? ` (tồn BT: ${stock.toLocaleString('vi-VN')})` : ' (tồn BT: 0)';
      return `<option value="${escapeHTML(n.key)}" ${n.key === stick.nanKey ? 'selected' : ''}>${escapeHTML(n.label)}${stockHint}</option>`;
    }).join('');
    return `
      <div class="press-line-row" data-stick-idx="${idx}">
        <div class="press-line-head">
          <span class="press-line-no"><i data-lucide="layers" style="width:11px;height:11px;"></i> Thanh thô #${idx + 1}</span>
          <button type="button" class="press-line-remove" onclick="app.removePressStick(this)" title="Bỏ loại này"><i data-lucide="x"></i></button>
        </div>
        <div class="press-line-grid">
          <label class="pl-field"><span>Loại nan</span>
            <select class="ps-nan">
              <option value="">-- Chọn loại nan --</option>
              ${nanOptions}
            </select>
          </label>
          <label class="pl-field"><span>Số lượng thanh</span>
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
          <label class="pl-field"><span>Tỷ lệ (ván thô : 1 thành phẩm)</span>
            <input type="number" class="pl-ratio" min="0.000001" step="any" inputmode="decimal" placeholder="VD: 3" value="${line.ratio || ''}">
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
      if (noEl) noEl.innerHTML = `<i data-lucide="layers" style="width:11px;height:11px;"></i> Thanh thô #${i + 1}`;
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

  // Đọc dữ liệu các dòng VÁN THÔ từ modal
  function collectPressLines() {
    const lines = [];
    document.querySelectorAll('#press-lines .press-line-row').forEach(row => {
      lines.push({
        vtDim: row.querySelector('.pl-vtdim')?.value.trim() || '',
        vtQty: parseFloat(row.querySelector('.pl-vtqty')?.value) || 0,
        ratio: parseFloat(row.querySelector('.pl-ratio')?.value) || 0
      });
    });
    return lines;
  }

  // Đọc dữ liệu các dòng THANH THÔ từ modal
  function collectPressSticks() {
    const arr = [];
    document.querySelectorAll('#press-sticks .press-line-row').forEach(row => {
      arr.push({
        nanKey: row.querySelector('.ps-nan')?.value.trim() || '',
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

  // Tính số lượng thành phẩm từ các dòng "Ván Thô Tạo Ra".
  // ƯU TIÊN 1 — thành phẩm chỉ tạo từ 1 loại ván thô (định mức BOM phụ có đúng 1 dòng,
  // hoặc không có BOM mà modal chỉ khai 1 dòng): quan hệ 1-1 theo tỷ lệ khai báo
  //   SL thành phẩm = SL ván thô đã ép ÷ tỷ lệ   (tỷ lệ = ván thô : 1 thành phẩm)
  //   → tỷ lệ 1 (mặc định) thì SL thành phẩm = SL ván thô đã ép (96 thô → 96 TP).
  // ƯU TIÊN 2 — ghép nhiều loại ván thô: mỗi lượt ép chỉ ĐƯỢC nhập số lượng cho đúng
  // 1 loại (các loại còn lại = 0, chỉ khai báo tỷ lệ — ván thô ép ở các thời điểm khác nhau):
  //   SL thành phẩm = floor( số ván thô × thể tích ván thô ÷ thể tích thành phẩm )
  // Fallback tương thích (nhiều loại cùng có số lượng, hoặc chưa xác định được
  // kích thước thành phẩm): trung bình các (số ván thô ÷ tỷ lệ), làm tròn xuống.
  function computeFinishedQtyFromLines(lines, fpDimStr, productId) {
    const all = (lines || []);
    const active = all.filter(l => l.vtQty > 0);
    const fp = parseDimString(fpDimStr);

    // ƯU TIÊN 1: thành phẩm đơn loại ván thô → 1-1 theo tỷ lệ
    let bomLineCount = -1;
    if (productId) {
      const bom = getProductBom(productId);
      bomLineCount = (bom && Array.isArray(bom.lines)) ? bom.lines.length : 0;
    }
    const singleTypeProduct = bomLineCount === 1 || (bomLineCount === 0 && all.length === 1);
    if (singleTypeProduct && active.length === 1) {
      const ratio = active[0].ratio > 0 ? active[0].ratio : 1;
      return Math.floor(((parseFloat(active[0].vtQty) || 0) / ratio) + 1e-9);
    }

    // ƯU TIÊN 2: ghép nhiều loại — đúng 1 loại có số lượng + biết kích thước thành phẩm
    if (active.length === 1 && fp) {
      const l = active[0];
      const d = parseDimString(l.vtDim);
      if (!d) return 0;
      // Tính trong miền mm³ nguyên để tránh sai số thập phân (chia hết phải ra đúng số nguyên)
      const vtVolMm3 = d.l * d.w * d.t * (parseFloat(l.vtQty) || 0);
      const fpVolMm3 = fp.l * fp.w * fp.t;
      if (vtVolMm3 > 0 && fpVolMm3 > 0) return Math.floor(vtVolMm3 / fpVolMm3 + 1e-9);
      return 0;
    }

    // Fallback: trung bình (số ván thô ÷ tỷ lệ) — dữ liệu cũ / chưa có KL thành phẩm
    const parts = [];
    active.forEach(l => {
      if (l.ratio > 0) parts.push(l.vtQty / l.ratio);
    });
    if (parts.length === 0) return 0;
    return Math.floor(parts.reduce((a, b) => a + b, 0) / parts.length);
  }

  // Cập nhật số lượng thành phẩm + gợi ý keo/phụ gia khi nhập dòng thành phần
  // (Thành phẩm đơn loại ván thô → SL = SL thô đã ép ÷ tỷ lệ; ghép nhiều loại →
  // tính theo THỂ TÍCH — xem computeFinishedQtyFromLines)
  function recalcPressQuantities() {
    const qtyInput = document.getElementById('press-fp-qty');
    if (!qtyInput) return;
    const productId = document.getElementById('press-product')?.value;
    const fpDim = computeFpDimFromProduct(productId);
    const finishedQty = computeFinishedQtyFromLines(collectPressLines(), fpDim, productId);
    qtyInput.value = finishedQty > 0 ? finishedQty : '';
    suggestPressMaterialFields(false);
  }

  // Gợi ý keo/phụ gia theo định mức x số lượng thành phẩm
  // (Kích thước thành phẩm lấy trực tiếp từ tên sản phẩm, không cần nhập)
  // Đồng thời hiển thị sản lượng tối đa từ ván thô có sẵn
  function suggestPressMaterialFields(force = false) {
    const productId = document.getElementById('press-product')?.value;
    const glueInput = document.getElementById('press-glue');
    const additiveInput = document.getElementById('press-additive');
    if (!productId) { hidePressCapacityInfo(); return; }
    const rate = state.materialRates.find(r => r.id === productId);
    if (!rate) { hidePressCapacityInfo(); return; }

    const qty = parseFloat(document.getElementById('press-fp-qty')?.value) || 0;
    [[glueInput, rate.glue], [additiveInput, rate.additive]].forEach(([inp, perUnit]) => {
      if (!inp) return;
      const manual = inp.getAttribute('data-manual') === '1';
      if (force || !manual) inp.value = ((perUnit || 0) * qty).toFixed(2);
    });

    // ─── Sản lượng tối đa từ ván thô có sẵn ────────────────────
    // Ưu tiên định mức ván thô (BOM phụ): tồn = Σ "Ván Thô Tạo Ra" từ các lượt ép
    // đến tuần của ngày ép (ván thô có thể ép ở các thời điểm khác nhau).
    // Không có BOM phụ → suy từ định mức nan: Tồn thực tế + Σ Dự kiến − Σ Cần tuần trước.
    const dateVal  = document.getElementById('press-date')?.value;
    const yearNum  = getDateYear(dateVal);
    const weekNum  = getWeekNumber(getISOWeekString(dateVal));
    const maxProd  = getMaxProductionForProduct(yearNum, productId, weekNum);
    const capEl    = document.getElementById('press-capacity-info');
    if (!capEl) return;

    if (maxProd && maxProd.maxProduction > 0) {
      const bt     = maxProd.bottleneck;
      const btKey  = bt.vtDim || bt.nanKey;
      const btUnit = bt.vtDim ? 'tấm' : 'thanh';
      const btRate = (bt.ratio !== undefined ? bt.ratio : bt.rate) || 0;
      const srcLbl = maxProd.source === 'bom' ? 'theo định mức ván thô' : 'theo định mức nan';
      capEl.innerHTML = `<i data-lucide="layers" style="width:12px;height:12px;"></i> ` +
        `<strong>Sản lượng tối đa:</strong> ${maxProd.maxProduction.toLocaleString('vi-VN')} tấm ` +
        `<span style="color:var(--text-muted);">(${srcLbl} — chặn bởi ${escapeHTML(String(btKey))} ×${btRate} — còn ${bt.available.toLocaleString('vi-VN')} ${btUnit})</span>`;
    } else {
      capEl.innerHTML = `<i data-lucide="layers" style="width:12px;height:12px;color:#94a3b8;"></i> ` +
        `<span style="color:var(--text-muted);">Chưa có ván thô phù hợp để sản xuất sản phẩm này</span>`;
    }
    initLucide();
  }

  // Ẩn khối thông tin sản lượng khi chưa chọn sản phẩm
  function hidePressCapacityInfo() {
    const capEl = document.getElementById('press-capacity-info');
    if (capEl) capEl.innerHTML = '';
  }

  // Tự điền các dòng "Ván Thô Tạo Ra" theo ĐỊNH MỨC VÁN THÔ (BOM phụ) của thành phẩm:
  // kích thước + tỷ lệ lấy từ BOM, số lượng để trống cho người dùng nhập thực tế.
  // Gọi khi người dùng đổi thành phẩm trong modal lượt ép (events.js).
  // Thành phẩm chưa có BOM → giữ nguyên các dòng hiện có.
  function applyBomToPressLines() {
    const productId = document.getElementById('press-product')?.value;
    const container = document.getElementById('press-lines');
    if (!productId || !container) return;
    const bom = getProductBom(productId);
    if (!bom || !(bom.lines || []).length) return;
    container.innerHTML = '';
    bom.lines.forEach(l => addPressLine({ vtDim: l.vtDim, ratio: l.ratio }));
    recalcPressQuantities();
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
    ['press-glue', 'press-additive'].forEach(id => {
      document.getElementById(id)?.removeAttribute('data-manual');
    });
    document.getElementById('press-sticks').innerHTML = '';
    document.getElementById('press-lines').innerHTML = '';
    document.getElementById('press-id').value = recordId || '';

    // Gợi ý tên công nhân đã nhập trước đó
    const workerList = document.getElementById('press-worker-list');
    if (workerList) {
      const names = [...new Set(state.pressRecords.map(r => r.worker).filter(Boolean))];
      workerList.innerHTML = names.map(n => `<option value="${escapeHTML(n)}"></option>`).join('');
    }

    const titleEl = document.getElementById('press-modal-title');
    if (recordId) {
      const rec = state.pressRecords.find(r => r.id === recordId);
      if (!rec) return;
      if (titleEl) titleEl.innerHTML = '<i data-lucide="edit-3"></i> Sửa Lượt Ép Ván';
      document.getElementById('press-date').value = rec.date || '';
      document.getElementById('press-week').value = rec.week || '';
      (rec.sticks && rec.sticks.length ? rec.sticks : [{}]).forEach(s => addPressStick(s));
      (rec.vanTho && rec.vanTho.length ? rec.vanTho : [{}]).forEach(l => addPressLine(l));
      refreshPressProductSelect(rec.productId);
      document.getElementById('press-fp-qty').value = rec.finishedQty || '';
      document.getElementById('press-glue').value = rec.glue ?? '';
      document.getElementById('press-additive').value = rec.additive ?? '';
      document.getElementById('press-worker').value = rec.worker || '';
      ['press-glue', 'press-additive'].forEach(id => {
        document.getElementById(id)?.setAttribute('data-manual', '1');
      });
    } else {
      if (titleEl) titleEl.innerHTML = '<i data-lucide="factory"></i> Thêm Lượt Ép Ván';
      document.getElementById('press-date').value = todayLocalISO();
      document.getElementById('press-week').value = getISOWeekString(todayLocalISO());
      addPressStick();
      addPressLine();
      refreshPressProductSelect();
    }
    suggestPressMaterialFields(false);

    modal.classList.add('show');
    initLucide();
  }

  function closePressModal() {
    document.getElementById('modal-press-record')?.classList.remove('show');
  }

  // Lưu lượt ép ván (thêm mới hoặc cập nhật)
  function handlePressRecordSubmit(e) {
    e.preventDefault();
    const recordId = document.getElementById('press-id').value;
    const dateVal = document.getElementById('press-date').value;
    const productId = document.getElementById('press-product').value;
    const glue = parseFloat(document.getElementById('press-glue').value) || 0;
    const additive = parseFloat(document.getElementById('press-additive').value) || 0;
    const worker = document.getElementById('press-worker').value.trim();
    const sticks = collectPressSticks().filter(s => s.nanKey || s.sticks > 0);
    const lines = collectPressLines().filter(l => l.vtDim || l.vtQty > 0);

    if (!dateVal) { showToast('Vui lòng chọn ngày ép!', 'error'); return; }
    if (sticks.length === 0) { showToast('Cần ít nhất 1 loại thanh thô (chọn loại nan + số lượng thanh)!', 'error'); return; }
    for (let i = 0; i < sticks.length; i++) {
      const s = sticks[i];
      if (!s.nanKey) { showToast(`Dòng thanh thô #${i + 1}: chưa chọn loại nan!`, 'error'); return; }
      if (s.sticks <= 0) { showToast(`Dòng thanh thô #${i + 1}: số lượng thanh phải lớn hơn 0!`, 'error'); return; }
    }
    if (lines.length === 0) { showToast('Cần ít nhất 1 loại ván thô (nhập kích thước + số lượng ván thô)!', 'error'); return; }
    // Ván thô ép ở các thời điểm khác nhau: mỗi lượt chỉ được nhập số lượng cho ĐÚNG 1 loại
    const activeLines = lines.filter(l => l.vtQty > 0);
    if (activeLines.length === 0) { showToast('Cần nhập số lượng cho đúng 1 loại ván thô (các loại còn lại để số lượng 0)!', 'error'); return; }
    if (activeLines.length > 1) { showToast('Mỗi lượt ép chỉ được nhập số lượng cho 1 loại ván thô — các loại còn lại phải để số lượng 0 (ván thô ép ở các thời điểm khác nhau)!', 'error'); return; }
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (!parseDimString(l.vtDim)) { showToast(`Dòng ván thô #${i + 1}: kích thước ván thô không hợp lệ (VD: 1220×2440×9)!`, 'error'); return; }
      if (l.ratio <= 0) { showToast(`Dòng ván thô #${i + 1}: tỷ lệ phải lớn hơn 0!`, 'error'); return; }
    }
    if (!productId) { showToast('Vui lòng chọn thành phẩm theo kế hoạch cùng tuần!', 'error'); return; }
    const fpDim = computeFpDimFromProduct(productId); // suy ra từ tên sản phẩm (VD: Ván 1200×382×12)
    if (!parseDimString(fpDim)) { showToast('Tên sản phẩm trong định mức phải chứa kích thước (VD: Ván 1200x382x12) để tính thể tích!', 'error'); return; }
    // SL thành phẩm: đơn loại ván thô → SL thô ÷ tỷ lệ; ghép nhiều loại → theo thể tích — số nguyên
    const finishedQty = computeFinishedQtyFromLines(lines, fpDim, productId);
    if (finishedQty <= 0) { showToast('Số lượng thành phẩm tính ra 0 — kiểm tra số lượng ván thô & tỷ lệ (hoặc tăng số lượng ván thô)!', 'error'); return; }
    if (!worker) { showToast('Vui lòng nhập tên công nhân ép!', 'error'); return; }

    const recordData = {
      id: recordId || `press-${Date.now()}`,
      date: dateVal,
      week: getISOWeekString(dateVal),
      year: getDateYear(dateVal),
      sticks,
      vanTho: lines,
      productId,
      productName: (state.materialRates.find(r => r.id === productId) || {}).product || '',
      fpDim,
      finishedQty,
      glue, additive, worker,
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

  // Render toàn bộ view Sản Lượng Ép Ván
  function renderPressView() {
    populatePressYearFilter();
    populatePressWeekFilter();
    renderPressChart();
    renderPressTable();
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

  // Biểu đồ: thể tích ván thô & thành phẩm mỗi ngày, nhóm theo tuần (label 2 dòng)
  function renderPressChart() {
    const canvas = document.getElementById('press-chart');
    if (!canvas || !window.Chart) return;
    if (state.pressChartInstance) { state.pressChartInstance.destroy(); state.pressChartInstance = null; }

    // Lọc theo năm
    let records = state.pressRecords.filter(r => r.date);
    if (state.pressYearFilter !== 'all') {
      records = records.filter(r => String(r.year || getDateYear(r.date)) === String(state.pressYearFilter));
    }
    if (state.pressWeekFilter !== 'all') {
      records = records.filter(r => pressRecordWeek(r) === parseInt(state.pressWeekFilter));
    }

    // Gom thể tích theo ngày (TỔNG của các loại ván thô/thành phẩm trong ngày)
    const byDay = {}; // date -> { vt, fp }
    records.forEach(r => {
      if (!byDay[r.date]) byDay[r.date] = { vt: 0, fp: 0 };
      (r.vanTho || []).forEach(l => { byDay[r.date].vt += dimVolume(l.vtDim, l.vtQty); });
      byDay[r.date].fp += dimVolume(r.fpDim, r.finishedQty);
    });

    const dates = Object.keys(byDay).sort();
    if (dates.length === 0) {
      const ctx = canvas.getContext('2d');
      state.pressChartInstance = new Chart(ctx, {
        type: 'bar',
        data: { labels: [], datasets: [] },
        options: { responsive: true, maintainAspectRatio: false }
      });
      return;
    }

    // Nhãn nhóm tuần: ngày đầu tuần có dòng "Tuần X", các ngày sau dòng rỗng
    const labels = [];
    let prevWeek = null;
    dates.forEach(d => {
      const wk = getWeekNumber(getISOWeekString(d));
      const isWeekStart = wk !== prevWeek;
      prevWeek = wk;
      labels.push(isWeekStart ? [`Tuần ${wk}`, fmtDateDM(d)] : ['', fmtDateDM(d)]);
    });

    const VT_COLOR = '#94a3b8';
    const FP_COLOR = '#15803d';
    const ctx = canvas.getContext('2d');
    state.pressChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'Ván thô (m³)', data: dates.map(d => +byDay[d].vt.toFixed(4)), backgroundColor: VT_COLOR, borderRadius: 4 },
          { label: 'Thành phẩm (m³)', data: dates.map(d => +byDay[d].fp.toFixed(4)), backgroundColor: FP_COLOR, borderRadius: 4 }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
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
          x: { beginAtZero: true, ticks: { font: { size: 10 } } },
          y: { beginAtZero: true, ticks: { font: { size: 10 }, callback: v => v + ' m³' } }
        }
      }
    });
  }

  // Bảng danh sách lượt ép
  function renderPressTable() {
    const tbody = document.getElementById('press-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

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
      const vtDesc = vanThoList.map(l =>
        `${escapeHTML(l.vtDim)} ×${(l.vtQty || 0).toLocaleString('vi-VN')}`).join('<br>');
      const stickDesc = sticksList.map(s =>
        `${escapeHTML(s.nanKey)} ×${(s.sticks || 0).toLocaleString('vi-VN')}`).join('<br>');
      const vtQtyTotal = vanThoList.reduce((a, l) => a + (l.vtQty || 0), 0);
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${fmtDateDM(r.date)}</strong><br><span class="text-muted">T${getWeekNumber(r.week)}</span></td>
        <td><span class="rate-product-name">${escapeHTML(r.productName || 'Đã xóa')}</span></td>
        <td>${vtDesc}</td>
        <td>${stickDesc}</td>
        <td>${vtQtyTotal.toLocaleString('vi-VN')}</td>
        <td><strong style="color:var(--primary);">${(r.finishedQty || 0).toLocaleString('vi-VN')}</strong> tấm</td>
        <td>${(r.glue || 0).toFixed(2)}</td>
        <td>${(r.additive || 0).toFixed(2)}</td>
        <td>${escapeHTML(r.worker)}</td>
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

    const ids = [...new Set([...Object.keys(planQty), ...Object.keys(pressQty)])];
    // Sắp xếp: sản phẩm có tổng số lượng lớn nhất đứng trước
    ids.sort((a, b) => ((planQty[b] || 0) + (pressQty[b] || 0)) - ((planQty[a] || 0) + (pressQty[a] || 0)));
    const labelOf = id => (state.materialRates.find(r => r.id === id) || {}).product || 'Sản phẩm đã xóa';

    // Đơn vị HIỂN THỊ số liệu: 'vol' (m³, mặc định) hoặc 'qty' (tấm).
    // Chiều cao cột LUÔN tính theo m³ — bấm nút chuyển chỉ thay số trên
    // cột/tooltip, giữ nguyên tỷ lệ; khi xem "tấm" thì ẩn trục Y (vạch chia
    // theo m³ sẽ gây hiểu nhầm với số tấm).
    const isVol = state.planVsPressUnit === 'vol';
    const unitVol = id => dimVolume(getProductDimsStr(id), 1);
    const planVolData  = ids.map(id => (planQty[id] || 0) * unitVol(id));
    const pressVolData = ids.map(id => pressVol[id] || 0);
    const planQtyData  = ids.map(id => planQty[id] || 0);
    const pressQtyData = ids.map(id => pressQty[id] || 0);
    const fmtVol = v => String(+Number(v).toFixed(3));
    const fmtQty = v => Math.round(Number(v)).toLocaleString('vi-VN');
    const valOf  = (dIdx, i) => (dIdx === 0
      ? (isVol ? planVolData[i] : planQtyData[i])
      : (isVol ? pressVolData[i] : pressQtyData[i]));
    const fmtVal = v => (isVol ? fmtVol(v) : fmtQty(v));
    const fmtTick = v => String(Number(Number(v).toFixed(2)));

    // Plugin vẽ số THỰC TẾ lên đỉnh TỪNG cột (cả 2 dataset)
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
          { label: 'Kế Hoạch', data: planVolData, backgroundColor: 'rgba(124, 58, 237, 0.78)', borderColor: '#7c3aed', borderWidth: 1, borderRadius: 4 },
          { label: 'Đã Ép',    data: pressVolData, backgroundColor: 'rgba(22, 163, 74, 0.78)', borderColor: '#16a34a', borderWidth: 1, borderRadius: 4 }
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
                const qty = c.datasetIndex === 0 ? planQtyData[i] : pressQtyData[i];
                const vol = c.datasetIndex === 0 ? planVolData[i] : pressVolData[i];
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
    if (!rate) return { cap: null, reason: 'Sản phẩm chưa có định mức / BOM ván thô để tính khả năng ép' };
    const mp = getMaxProductionForProduct(yearNum, productId, weekNum);
    if (!mp || !Number.isFinite(mp.maxProduction)) {
      return { cap: null, reason: 'Sản phẩm chưa có định mức / BOM ván thô để tính khả năng ép' };
    }
    const b = mp.bottleneck || {};
    const fmtN = v => Number(v || 0).toLocaleString('vi-VN');
    const reason = mp.source === 'bom'
      ? `ván thô ${b.vtDim || '?'} — tồn ${fmtN(b.available)}, tỷ lệ 1:${fmtN(b.ratio)}`
      : `thanh ${b.nanKey || '?'} — còn ${fmtN(b.available)} thanh, định mức ${fmtN(b.rate)}/tấm`;
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
  dimVolume,
  applyBomToPressLines,
  buildPressLineHTML,
  buildPressStickHTML,
  closePressModal,
  collectPressLines,
  collectPressSticks,
  computeFinishedQtyFromLines,
  computeFpDimFromProduct,
  deletePressRecord,
  fmtDateDM,
  getBaoTinhStockByNanKey,
  getDateYear,
  getPressProductsForWeek,
  getPressedQtyForPlan,
  handlePressRecordSubmit,
  hidePressCapacityInfo,
  loadPressRecords,
  migratePressRecord,
  openPressModal,
  parseDimString,
  populatePressWeekFilter,
  populatePressYearFilter,
  pressRecordWeek,
  recalcPressQuantities,
  refreshPressProductSelect,
  removePressLine,
  removePressStick,
  planCapacityReason,
  planCapacityPct,
  planCapacityWeeks,
  planCapacityWinSize,
  renderPlanVsPressChart,
  renderPlanCapacityChart,
  shiftPlanCapacityWindow,
  renderPressChart,
  renderPressTable,
  setPlanVsPressUnit,
  shiftPlanVsPressWeek,
  renderPressView,
  savePressRecords,
  suggestPressMaterialFields,
  todayLocalISO,
  updatePressRemoveButtons
};
