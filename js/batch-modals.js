// ═══════════════════════════════════════════════════════════
// js/batch-modals.js — tách từ app.js (refactor ES-modules phase 1)
// ═══════════════════════════════════════════════════════════
import { initLucide, requireEditPermission } from './cloud.js';
import { pushUndo } from './events.js';
import { getFilteredBatches, renderAll } from './main.js';
import { STAGES, STORAGE_KEY_X2_LOT_LOCATIONS, state } from './state.js';
import { saveData } from './storage.js';
import { trackDeleted } from './tombstone.js';
import { calculateVolume, escapeHTML, formatDateDDMMYY, generateBatchCodeYYMMDD, getISOWeekString, showToast, validateBatchInput } from './utils.js';
import { getBaoTinhConversion } from './planning.js';

  // ─── BATCH FORM MODAL ─────────────────────────────────────────
  function openBatchFormModal(batchId = null) {
    if (!requireEditPermission()) return;
    const modal   = document.getElementById('modal-batch-form');
    const form    = document.getElementById('batch-form');
    const titleEl = document.getElementById('modal-form-title');
    if (!modal || !form) return;
    form.reset();

    if (batchId) {
      const batch = state.batches.find(b => b.id === batchId);
      if (!batch) return;
      titleEl.innerHTML = `<i data-lucide="edit-3"></i> Chỉnh Sửa Thẻ Nan Tre (${escapeHTML(batch.code)})`;
      document.getElementById('form-batch-id').value    = batch.id;
      document.getElementById('form-code').value        = batch.code;
      document.getElementById('form-stage').value       = batch.stage;
      document.getElementById('form-date').value        = batch.date;
      document.getElementById('form-week').value        = batch.week;
      document.getElementById('form-length').value      = batch.length;
      document.getElementById('form-width').value       = batch.width;
      document.getElementById('form-thickness').value   = batch.thickness;
      document.getElementById('form-quantity').value    = batch.quantity;
      document.getElementById('form-bamboo-type').value = batch.bambooType || 'A';
      document.getElementById('form-use-for').value     = batch.useFor || 'Ván';
      document.getElementById('form-location').value    = batch.location || '';
      document.getElementById('form-notes').value       = batch.notes || '';
      // Ngày vào công đoạn THỰC TẾ (Sấy 2 / Kho / Bào Tinh): chỉ hiện theo công
      // đoạn hiện tại — cho sửa ngày thật khác với ngày hệ thống ghi nhận việc chuyển
      const stageDateFields = [
        { stage: 'say2',     group: 'form-say2-date-group',    input: 'form-say2-date' },
        { stage: 'kho',      group: 'form-kho-date-group',     input: 'form-kho-date' },
        { stage: 'bao_tinh', group: 'form-baotinh-date-group', input: 'form-baotinh-date' }
      ];
      stageDateFields.forEach(({ stage, group, input }) => {
        const g = document.getElementById(group);
        const i = document.getElementById(input);
        if (!g || !i) return;
        const show = batch.stage === stage;
        g.style.display = show ? '' : 'none';
        if (!show) { i.value = ''; return; }
        if (stage === 'bao_tinh') {
          i.value = batch.baoTinhDate || getBaoTinhConversion(batch).date || '';
        } else {
          const overrideKey = stage === 'say2' ? 'say2Date' : 'khoDate';
          const hist = (batch.stageHistory || []).filter(h => h && h.stage === stage && h.date);
          i.value = batch[overrideKey] || (hist.length ? hist[hist.length - 1].date : '') || '';
        }
      });
      const volDisp = document.getElementById('form-calculated-vol');
      if (volDisp) volDisp.textContent = `${calculateVolume(batch.length, batch.width, batch.thickness, batch.quantity).toFixed(4)} m³`;
    } else {
      if (titleEl) titleEl.innerHTML = `<i data-lucide="plus-circle"></i> Thêm Lô Nan Tre Mới`;
      document.getElementById('form-batch-id').value = '';
      const today = new Date().toISOString().split('T')[0];
      document.getElementById('form-date').value  = today;
      document.getElementById('form-week').value  = getISOWeekString(today);
      document.getElementById('form-code').value  = generateBatchCodeYYMMDD(today);
      const volDisp = document.getElementById('form-calculated-vol');
      if (volDisp) volDisp.textContent = '0.0000 m³';
      // Ẩn sạch các ô ngày thực tế (lô mới chưa qua công đoạn nào khác)
      ['form-say2-date-group', 'form-kho-date-group', 'form-baotinh-date-group'].forEach(id => {
        const g = document.getElementById(id);
        if (g) g.style.display = 'none';
      });
      ['form-say2-date', 'form-kho-date', 'form-baotinh-date'].forEach(id => {
        const i = document.getElementById(id);
        if (i) i.value = '';
      });
    }

    modal.classList.add('show');
    initLucide();
  }

  function closeBatchFormModal() {
    document.getElementById('modal-batch-form')?.classList.remove('show');
  }

  function handleBatchFormSubmit(e) {
    e.preventDefault();
    // Kiểm tra dữ liệu trước khi lưu - nếu sai sẽ báo lỗi và return, không lưu
    if (!validateBatchInput()) return;

    const batchId   = document.getElementById('form-batch-id').value;
    const length    = parseFloat(document.getElementById('form-length').value)    || 0;
    const width     = parseFloat(document.getElementById('form-width').value)     || 0;
    const thickness = parseFloat(document.getElementById('form-thickness').value) || 0;
    const quantity  = parseInt(document.getElementById('form-quantity').value)    || 0;
    const volume    = calculateVolume(length, width, thickness, quantity);

    const nowISO  = new Date().toISOString();
    const stageVal = document.getElementById('form-stage').value;
    const dateVal  = document.getElementById('form-date').value;
    // Ngày vào công đoạn THỰC TẾ (chỉ áp dụng cho công đoạn hiện tại của lô) — có thể
    // khác ngày hệ thống ghi nhận; dùng cho thống kê tuần & xuất Excel theo công đoạn
    const stageDateInputId = { say2: 'form-say2-date', kho: 'form-kho-date', bao_tinh: 'form-baotinh-date' }[stageVal];
    const stageDateEl = stageDateInputId ? document.getElementById(stageDateInputId) : null;
    const stageDateVal = (stageDateEl && stageDateEl.value) ? stageDateEl.value : '';

    const batchData = {
      id:          batchId || `batch-${Date.now()}`,
      code:        document.getElementById('form-code').value.trim(),
      stage:       stageVal,
      date:        dateVal,
      week:        document.getElementById('form-week').value.trim(),
      length, width, thickness, quantity, volume,
      bambooType:  document.getElementById('form-bamboo-type').value,
      useFor:      document.getElementById('form-use-for').value,
      location:    document.getElementById('form-location').value.trim(),
      notes:       document.getElementById('form-notes').value.trim(),
      stageHistory: [{ stage: stageVal, date: dateVal }],
      updatedAt:   nowISO
    };
    // Ghi NGÀY VÀO CÔNG ĐOẠN THỰC TẾ (được ưu tiên hơn mốc tự động trong stageHistory)
    if (stageDateVal) {
      if (stageVal === 'bao_tinh')      batchData.baoTinhDate = stageDateVal;
      else if (stageVal === 'say2')     batchData.say2Date    = stageDateVal;
      else if (stageVal === 'kho')      batchData.khoDate     = stageDateVal;
    }

    if (batchId) {
      pushUndo(`Sửa lô ${batchData.code}`);
      const idx = state.batches.findIndex(b => b.id === batchId);
      if (idx !== -1) {
        // Giữ lịch sử công đoạn cũ nếu có
        const old = state.batches[idx];
        batchData.stageHistory = (old.stageHistory && old.stageHistory.length > 0)
          ? old.stageHistory
          : [{ stage: old.stage, date: old.date }];
        // Đồng bộ mốc cuối của công đoạn hiện tại trong lịch sử theo ngày thực tế
        if (stageDateVal) {
          const entries = batchData.stageHistory.filter(h => h && h.stage === stageVal);
          if (entries.length) entries[entries.length - 1].date = stageDateVal;
          else batchData.stageHistory.push({ stage: stageVal, date: stageDateVal });
        }
        state.batches[idx] = batchData;
        showToast('Đã cập nhật thẻ nan tre thành công!', 'success');
      }
    } else {
      pushUndo(`Tạo lô ${batchData.code}`);
      state.batches.unshift(batchData);
      showToast('Đã tạo thẻ nan tre mới thành công!', 'success');
    }
    saveData(); closeBatchFormModal(); renderAll();
  }

  function deleteBatch(batchId) {
    if (!requireEditPermission()) return;
    const batch = state.batches.find(b => b.id === batchId);
    if (!batch) return;
    if (confirm(`Bạn có chắc chắn muốn xóa lô nan "${batch.code}"?`)) {
      pushUndo(`Xóa lô ${batch.code}`);
      trackDeleted('batches', batchId); // dấu vết xóa: chặn máy khác đẩy ngược lô này lên mây
      state.batches = state.batches.filter(b => b.id !== batchId);
      saveData(); renderAll();
      showToast(`Đã xóa lô nan ${batch.code}`, 'info');
    }
  }

  // ═══════════════════════════════════════════════════════════
  // THÊM LÔ SẤY MỚI (thay cơ chế "Thêm Lô Nan" cho Than Hóa + Sấy)
  // ═══════════════════════════════════════════════════════════
  // • Công đoạn SẤY 1 → nguồn là THẺ NAN của công đoạn CHỌN NAN THÔ
  //   (state.xuong2ChonNanThoRecords): mỗi thẻ = 1 cỡ nan "Dài × Rộng × Dày ·
  //   Phân loại · Số lượng" (VD 1250×18×7 · A1 · 500). Bỏ qua nan "Loại hẳn".
  // • Công đoạn SẤY 2 → nguồn là LÔ ĐANG Ở KHO (chuyển Kho → Sấy 2).
  // • NGUỒN chọn bằng NÚT "Chọn Lô Nan" → mở danh sách THẺ (checkbox) và CHỌN
  //   ĐƯỢC NHIỀU nguồn cùng lúc — mỗi nguồn tạo 1 lô riêng, SỐ LƯỢNG lấy NGUYÊN
  //   theo nguồn (thẻ nan = phần còn lại; lô ở Kho = cả lô). ĐÃ BỎ ô nhập số
  //   lượng để số liệu luôn khớp với thẻ Chọn Nan Thô.
  // • VỊ TRÍ = nút chọn → hiện danh sách LS1..LS15 + nút "Thêm" khai báo vị trí
  //   khác (lưu state.x2LotLocations để dùng lại + đồng bộ mây).
  // • Ngày = ngày VÀO công đoạn (badge đếm ngày tính từ mốc này).
  // ─────────────────────────────────────────────────────────────

  // ─── VỊ TRÍ SẤY (LS1..LS15 + vị trí người dùng khai báo thêm) ──
  const X2_LOT_LOC_BASE = Array.from({ length: 15 }, (_, i) => `LS${i + 1}`);
  function x2LotLocations() {
    const extra = (state.x2LotLocations || []).map(v => String(v || '').trim()).filter(Boolean);
    const seen = new Set();
    return [...X2_LOT_LOC_BASE, ...extra].filter(l => {
      const key = l.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
  function saveX2LotLocations() {
    try {
      localStorage.setItem(STORAGE_KEY_X2_LOT_LOCATIONS, JSON.stringify(state.x2LotLocations || []));
    } catch (err) {
      showToast('Không lưu được vào bộ nhớ máy (bộ nhớ đầy?).', 'error');
    }
  }
  function loadX2LotLocations() {
    const raw = localStorage.getItem(STORAGE_KEY_X2_LOT_LOCATIONS);
    if (!raw) { state.x2LotLocations = []; return; }
    try {
      const obj = JSON.parse(raw);
      state.x2LotLocations = Array.isArray(obj) ? obj.map(v => String(v || '').trim()).filter(Boolean) : [];
    } catch (e) { state.x2LotLocations = []; }
  }

  // Nhãn loại nan của thẻ chọn nan (A / A1 / B / Loại hẳn)
  function nanClassLabelOf(cls) {
    return ({ A: 'A', A1: 'A1', B: 'B', reject: 'Loại hẳn' })[cls] || 'A';
  }
  // Nhãn 1 thẻ nan của công đoạn Chọn Nan Thô: "1250×18×7 · A1 · 500"
  function nanCardLabel(rec) {
    const d = Array.isArray(rec.dims) ? rec.dims : [];
    const size = `${d[0] || '?'}×${d[1] || '?'}×${d[2] || '?'}`;
    return `${size} · ${nanClassLabelOf(rec.cls)} · ${(Number(rec.quantity) || 0).toLocaleString('vi-VN')}`;
  }
  // Số thanh ĐÃ dùng của 1 thẻ chọn nan (đã tạo lô sấy từ thẻ đó)
  function nanCardUsedOf(chonNanId, excludeBatchId) {
    return (state.batches || [])
      .filter(b => b && b.sourceChonNanId === chonNanId && b.id !== excludeBatchId)
      .reduce((s, b) => s + (Number(b.quantity) || 0), 0);
  }
  // Số thanh CÒN LẠI của 1 thẻ chọn nan (chưa tạo lô sấy)
  function nanCardRemainingOf(rec) {
    return Math.max(0, (Number(rec.quantity) || 0) - nanCardUsedOf(rec.id));
  }
  // Thẻ nan SẤY 1 khả dụng: chưa dùng hết + KHÔNG phải "Loại hẳn"
  function availableSay1Cards() {
    return (state.xuong2ChonNanThoRecords || [])
      .filter(r => r && r.cls !== 'reject' && nanCardRemainingOf(r) > 0)
      .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  }
  // Lô KHO khả dụng cho Sấy 2
  function availableKhoLots() {
    return (state.batches || []).filter(b => b && b.stage === 'kho');
  }
  // Nhãn 1 lô trong danh sách nguồn: "K11 · 260910-01 · 1250×80×12 · A · 5.000 thanh"
  function batchSourceLabel(b) {
    const dims = `${b.length || '?'}×${b.width || '?'}×${b.thickness || '?'}`;
    return `${b.location || '—'} · ${b.code || '—'} · ${dims} · ${b.bambooType || '—'} · ${(Number(b.quantity) || 0).toLocaleString('vi-VN')} thanh`;
  }

  // ─── MODAL "THÊM LÔ SẤY MỚI" — mở/đóng/đổi nguồn/lưu ─────────
  // Nguồn đang chọn (mảng id — CHỌN ĐƯỢC NHIỀU nguồn cùng lúc) + vị trí đang chọn
  let alPicked = [];
  let alLocation = '';

  function alStageOf() { return (document.getElementById('al-stage') || {}).value || 'say1'; }
  function alPickedIds() { return alPicked.slice(); }
  // Danh sách nguồn khả dụng của công đoạn đang chọn
  function alCandidatesOf(stage) {
    return stage === 'say2' ? availableKhoLots() : availableSay1Cards();
  }
  function alAvailableSources() { return alCandidatesOf(alStageOf()); }
  // Nhãn 1 nguồn trong danh sách chọn nhiều
  function alSourceLabelOf(it, stage) {
    return stage === 'say2' ? batchSourceLabel(it) : nanCardLabel(it);
  }
  // Đóng 2 danh sách mở rộng (nguồn + vị trí)
  function alClosePanels() {
    const src = document.getElementById('al-source-panel');
    if (src) src.hidden = true;
    const loc = document.getElementById('al-location-panel');
    if (loc) loc.hidden = true;
    const row = document.getElementById('al-location-new-row');
    if (row) row.hidden = true;
  }

  // Vẽ danh sách THẺ nguồn (bấm 1 thẻ = chọn/bỏ chọn; chọn nhiều thẻ được)
  function renderAlSourceList() {
    const stage   = alStageOf();
    const listEl  = document.getElementById('al-source-list');
    const textEl  = document.getElementById('al-source-btn-text');
    const countEl = document.getElementById('al-picked-count');
    const hidden  = document.getElementById('al-source');
    if (textEl) textEl.textContent = stage === 'say2' ? 'Chọn Lô Ở Kho' : 'Chọn Lô Nan';
    if (hidden) hidden.value = alPicked.join(',');
    if (countEl) {
      countEl.textContent = alPicked.length ? `${alPicked.length} đã chọn` : 'Chưa chọn';
      countEl.classList.toggle('has-pick', alPicked.length > 0);
    }
    if (!listEl) return;
    const items = alCandidatesOf(stage);
    if (!items.length) {
      listEl.innerHTML = `<div class="al-empty">${stage === 'say2'
        ? '— Không có lô nào ở Kho (chuyển lô vào Kho trước) —'
        : '— Không có thẻ nan nào chờ sấy (ghi lượt ở thẻ Chọn Nan Thô trước) —'}</div>`;
      return;
    }
    listEl.innerHTML = items.map(it => {
      const id  = String(it.id);
      const on  = alPicked.includes(id);
      const sub = stage === 'say2' ? '' : `còn ${nanCardRemainingOf(it).toLocaleString('vi-VN')} thanh`;
      return `<button type="button" class="al-card${on ? ' picked' : ''}" data-al-pick="${escapeHTML(id)}" aria-pressed="${on ? 'true' : 'false'}">
        <span class="al-card-check"><i data-lucide="${on ? 'check-square' : 'square'}"></i></span>
        <span class="al-card-body">
          <span class="al-card-main">${escapeHTML(alSourceLabelOf(it, stage))}</span>
          ${sub ? `<span class="al-card-sub">${escapeHTML(sub)}</span>` : ''}
        </span>
      </button>`;
    }).join('');
    initLucide();
  }

  // Chọn / bỏ chọn 1 nguồn
  function alTogglePick(id) {
    const key = String(id || '');
    if (!key) return alPicked.slice();
    alPicked = alPicked.includes(key) ? alPicked.filter(x => x !== key) : [...alPicked, key];
    renderAlSourceList();
    syncAddLotSource();
    return alPicked.slice();
  }
  // Chọn TẤT CẢ nguồn khả dụng / bỏ chọn hết
  function alPickAll() {
    alPicked = alCandidatesOf(alStageOf()).map(it => String(it.id));
    renderAlSourceList();
    syncAddLotSource();
    return alPicked.slice();
  }
  function alClearPicks() {
    alPicked = [];
    renderAlSourceList();
    syncAddLotSource();
    return [];
  }
  // Bấm 1 thẻ trong danh sách nguồn (uỷ nhiệm sự kiện click)
  function alOnSourceListClick(e) {
    const btn = (e && e.target && typeof e.target.closest === 'function') ? e.target.closest('[data-al-pick]') : null;
    if (!btn) return;
    alTogglePick(btn.getAttribute('data-al-pick'));
  }
  // Ẩn/hiện danh sách chọn nguồn (nút "Chọn Lô Nan")
  function alToggleSourcePanel() {
    const panel = document.getElementById('al-source-panel');
    const btn   = document.getElementById('al-source-btn');
    if (!panel) return false;
    panel.hidden = !panel.hidden;
    if (btn) btn.setAttribute('aria-expanded', panel.hidden ? 'false' : 'true');
    if (!panel.hidden) {
      renderAlSourceList();
      // Điện thoại: modal tự cuộn tới nút để thấy ngay danh sách thẻ vừa mở
      if (btn && typeof btn.scrollIntoView === 'function') {
        try { btn.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (e) { /* bỏ qua */ }
      }
    }
    return !panel.hidden;
  }

  // ─── VỊ TRÍ: nút chọn → chips LS1..LS15 + nút "Thêm" ──
  function renderAlLocationBtn() {
    const btn = document.getElementById('al-location-btn');
    if (!btn) return;
    btn.innerHTML = `<i data-lucide="map-pin"></i> ${alLocation ? escapeHTML(alLocation) : 'Chọn Vị Trí'}`;
    initLucide();
  }
  function renderAlLocationChips() {
    const box = document.getElementById('al-location-chips');
    if (!box) return;
    box.innerHTML = x2LotLocations().map(l => {
      const custom = isCustomLotLocation(l);   // vị trí người dùng khai báo → xóa được
      const used   = lotLocationsUsing(l);
      const chip = `<button type="button" class="al-loc-chip${l === alLocation ? ' picked' : ''}" data-al-loc="${escapeHTML(l)}"${used ? ` title="Đang có ${used} lô nan ở vị trí này"` : ''}>${escapeHTML(l)}</button>`;
      const del = custom
        ? `<button type="button" class="al-loc-del" data-al-loc-del="${escapeHTML(l)}" title="Xóa vị trí ${escapeHTML(l)} khỏi danh sách đã khai báo" aria-label="Xóa vị trí ${escapeHTML(l)}"><i data-lucide="x"></i></button>`
        : '';
      return `<span class="al-loc-item${custom ? ' custom' : ''}">${chip}${del}</span>`;
    }).join('');
    initLucide();
  }
  // Vị trí MẶC ĐỊNH (LS1..LS15) KHÔNG xóa được — chỉ xóa vị trí người dùng khai báo
  function isCustomLotLocation(name) {
    const key = String(name || '').trim().toLowerCase();
    if (!key) return false;
    return (state.x2LotLocations || []).some(l => String(l || '').trim().toLowerCase() === key);
  }
  // Số lô nan đang mang vị trí này (cảnh báo khi xóa — các lô KHÔNG bị xóa)
  function lotLocationsUsing(name) {
    const key = String(name || '').trim().toLowerCase();
    if (!key) return 0;
    return (state.batches || []).filter(b => b && String(b.location || '').trim().toLowerCase() === key).length;
  }
  function alLocations() { return x2LotLocations(); }
  // Chọn 1 vị trí (từ chip) → ghi vào ô ẩn + đổi nhãn nút rồi đóng danh sách
  function alSetLocation(name) {
    alLocation = String(name || '').trim();
    const input = document.getElementById('al-location');
    if (input) input.value = alLocation;
    renderAlLocationBtn();
    renderAlLocationChips();
    const panel = document.getElementById('al-location-panel');
    if (panel) panel.hidden = true;
    return alLocation;
  }
  function alCurrentLocation() {
    return alLocation || String((document.getElementById('al-location') || {}).value || '').trim();
  }
  function alToggleLocationPanel() {
    const panel = document.getElementById('al-location-panel');
    const btn   = document.getElementById('al-location-btn');
    if (!panel) return false;
    panel.hidden = !panel.hidden;
    if (btn) btn.setAttribute('aria-expanded', panel.hidden ? 'false' : 'true');
    if (!panel.hidden) renderAlLocationChips();
    return !panel.hidden;
  }
  // Bấm chip vị trí (uỷ nhiệm sự kiện click): nút × = XÓA vị trí đã khai báo, chip = CHỌN
  function alOnLocationChipClick(e) {
    const t = e && e.target;
    if (!t || typeof t.closest !== 'function') return;
    const delBtn = t.closest('[data-al-loc-del]');
    if (delBtn) { handleAlDeleteLocation(delBtn.getAttribute('data-al-loc-del')); return; }
    const chip = t.closest('[data-al-loc]');
    if (!chip) return;
    alSetLocation(chip.getAttribute('data-al-loc'));
  }
  // XÓA vị trí ĐÃ KHAI BÁO khỏi danh sách chọn (LS1..LS15 là mặc định → không xóa được).
  // Lô nan đang mang vị trí này KHÔNG bị xóa — chỉ không còn trong danh sách chọn.
  function handleAlDeleteLocation(name) {
    const target = String(name || '').trim();
    if (!target) return false;
    if (!isCustomLotLocation(target)) {
      showToast(`"${target}" là vị trí mặc định (LS1..LS15) — không xóa được!`, 'info');
      return false;
    }
    const used = lotLocationsUsing(target);
    const msg = `Xóa vị trí "${target}" khỏi danh sách đã khai báo?` +
      (used ? `\n• Đang có ${used} lô nan mang vị trí này (các lô KHÔNG bị xóa, chỉ không còn trong danh sách chọn).` : '');
    if (typeof confirm === 'function' && !confirm(msg)) return false;
    const key = target.toLowerCase();
    state.x2LotLocations = (state.x2LotLocations || [])
      .filter(l => String(l || '').trim().toLowerCase() !== key);
    saveX2LotLocations();
    if (alLocation.toLowerCase() === key) {   // đang chọn đúng vị trí bị xóa → bỏ chọn, phải chọn lại
      alLocation = '';
      const input = document.getElementById('al-location');
      if (input) input.value = '';
    }
    renderAlLocationBtn();
    renderAlLocationChips();
    showToast(`Đã xóa vị trí "${target}" khỏi danh sách khai báo.`, 'success');
    return true;
  }
  // Nút "Thêm": hiện ô nhập tên vị trí mới
  function alShowNewLocationRow() {
    const row = document.getElementById('al-location-new-row');
    if (!row) return false;
    row.hidden = false;
    const input = document.getElementById('al-location-new');
    if (input && typeof input.focus === 'function') input.focus();
    return true;
  }
  // Nút "Lưu" ô Thêm vị trí: khai báo vị trí mới (trùng thì chọn lại, không tạo bản sao)
  function handleAlAddLocation() {
    const input = document.getElementById('al-location-new');
    const name  = ((input || {}).value || '').trim();
    if (!name) { showToast('Chưa nhập tên vị trí mới!', 'error'); return ''; }
    const existed = x2LotLocations().some(l => l.toLowerCase() === name.toLowerCase());
    if (!existed) {
      state.x2LotLocations = [...(state.x2LotLocations || []), name];
      saveX2LotLocations();
    }
    if (input) input.value = '';
    const row = document.getElementById('al-location-new-row');
    if (row) row.hidden = true;
    renderAlLocationChips();
    alSetLocation(name);
    showToast(existed ? `Vị trí "${name}" đã có — đã chọn lại` : `Đã thêm vị trí "${name}"`, 'success');
    return name;
  }

  function openAddLotModal() {
    if (!requireEditPermission()) return;
    const modal = document.getElementById('modal-add-lot');
    const form  = document.getElementById('add-lot-form');
    if (!modal || !form) return;
    form.reset();
    alPicked = [];
    alLocation = '';
    const today = new Date().toISOString().split('T')[0];
    const dEl = document.getElementById('al-date');
    if (dEl) dEl.value = today;
    const stageEl = document.getElementById('al-stage');
    if (stageEl) stageEl.value = 'say1';
    syncAddLotUI();
    modal.classList.add('show');
    initLucide();
  }

  function closeAddLotModal() {
    document.getElementById('modal-add-lot')?.classList.remove('show');
    alClosePanels();
  }

  // Đổi Công đoạn → nạp danh sách NGUỒN tương ứng (bỏ chọn nguồn của công đoạn cũ)
  function syncAddLotUI() {
    alPicked = [];
    alClosePanels();
    const input = document.getElementById('al-location');
    if (input) input.value = alLocation;
    renderAlLocationBtn();
    renderAlLocationChips();
    renderAlSourceList();
    syncAddLotSource();
  }

  // Chi tiết NGUỒN đang chọn (chọn nhiều → liệt kê từng nguồn) + số lượng sẽ tạo lô
  function syncAddLotSource() {
    const stage = alStageOf();
    const hintEl = document.getElementById('al-source-hint');
    const info = document.getElementById('al-source-info');
    if (hintEl) hintEl.textContent = stage === 'say2'
      ? 'Chọn 1 hoặc NHIỀU lô đang ở Kho → chuyển sang Sấy 2 (giữ nguyên kích thước/lượng của lô).'
      : 'Nguồn: công đoạn Chọn Nan Thô — mỗi thẻ là 1 cỡ nan (Dài × Rộng × Dày · Phân loại · Số lượng). Số lượng tạo lô = phần CÒN LẠI của thẻ.';
    if (!info) return;
    const picked = alCandidatesOf(stage).filter(it => alPicked.includes(String(it.id)));
    if (!picked.length) {
      info.innerHTML = '<span class="al-warn">Chưa chọn nguồn nào — bấm nút "Chọn Lô Nan" để chọn thẻ/lô nguồn (chọn được NHIỀU nguồn cùng lúc).</span>';
      return;
    }
    info.innerHTML = picked.map(it => {
      if (stage === 'say2') {
        return `<span><span class="al-k">Lô:</span><strong>${escapeHTML(it.code || '—')}</strong>
          <span class="al-k">· ${escapeHTML(it.location || '—')} · ${it.length} × ${it.width} × ${it.thickness} mm · ${escapeHTML(it.bambooType || '—')} · ${(Number(it.quantity) || 0).toLocaleString('vi-VN')} thanh · ${(Number(it.volume) || 0).toFixed(4)} m³</span></span>`;
      }
      const d = Array.isArray(it.dims) ? it.dims : [];
      return `<span><span class="al-k">Thẻ:</span><strong>${d[0] || '?'} × ${d[1] || '?'} × ${d[2] || '?'} mm</strong>
        <span class="al-k">· ${escapeHTML(nanClassLabelOf(it.cls))} · tạo lô ${nanCardRemainingOf(it).toLocaleString('vi-VN')} thanh · ${it.external ? 'nan nhập ngoài công đoạn' : 'từ lô bào thô'}</span></span>`;
    }).join('');
  }

  // Lưu form "Thêm Lô Sấy Mới" — tạo lô cho TẤT CẢ nguồn đã chọn (chọn nhiều)
  function handleAddLotSubmit(e) {
    e.preventDefault();
    if (!requireEditPermission()) return;
    const stage = alStageOf();
    const dateVal = (document.getElementById('al-date') || {}).value || '';
    const location = alCurrentLocation();
    const notes = ((document.getElementById('al-notes') || {}).value || '').trim();
    if (!dateVal) { showToast('Vui lòng chọn Ngày!', 'error'); return; }
    if (!location) { showToast('Vui lòng chọn Vị Trí!', 'error'); return; }
    if (!alPicked.length) { showToast('Chưa chọn nguồn nào — bấm nút "Chọn Lô Nan" để chọn thẻ/lô nguồn!', 'error'); return; }
    const nowISO = new Date().toISOString();

    if (stage === 'say2') {
      // ── Sấy 2: CHUYỂN các lô đang ở Kho sang Sấy 2 (không tạo lô mới) ──
      const lots = alPicked.map(id => (state.batches || []).find(x => x.id === id)).filter(Boolean);
      if (!lots.length) { showToast('Không tìm thấy lô nguồn!', 'error'); return; }
      pushUndo(`Chuyển ${lots.length} lô sang Sấy 2`);
      lots.forEach(b => {
        if (!b.stageHistory || !b.stageHistory.length) b.stageHistory = [{ stage: b.stage, date: b.date }];
        b.stage = 'say2';
        b.say2Date = dateVal;                        // ngày vào Sấy 2 thực tế (badge đếm ngày)
        b.stageHistory.push({ stage: 'say2', date: dateVal });
        b.location = location;
        if (notes) b.notes = notes;
        b.updatedAt = nowISO;
      });
      alPicked = [];
      saveData(); closeAddLotModal(); renderAll();
      showToast(`Đã chuyển ${lots.length} lô vào Sấy 2 — vị trí ${location} (ngày ${formatDateDDMMYY(dateVal)})!`, 'success');
      return;
    }

    // ── Sấy 1: TẠO LÔ MỚI cho TỪNG THẺ NAN đã chọn (số lượng = phần CÒN LẠI) ──
    const recs = alPicked.map(id => (state.xuong2ChonNanThoRecords || []).find(x => x.id === id)).filter(Boolean);
    if (!recs.length) { showToast('Không tìm thấy thẻ nan nguồn!', 'error'); return; }
    if (!state.batches) state.batches = [];
    pushUndo(recs.length > 1 ? `Tạo ${recs.length} lô Sấy 1 từ thẻ nan` : `Tạo lô Sấy 1 từ thẻ nan ${nanCardLabel(recs[0])}`);
    const created = [];
    let skipped = 0, totalQty = 0;
    recs.forEach(rec => {
      const quantity = nanCardRemainingOf(rec);   // lấy NGUYÊN phần còn lại của thẻ nan
      const dims = Array.isArray(rec.dims) ? rec.dims : [];
      const length = Number(dims[0]) || 0, width = Number(dims[1]) || 0, thickness = Number(dims[2]) || 0;
      if (quantity <= 0 || !(length > 0 && width > 0 && thickness > 0)) { skipped++; return; }
      const batchData = {
        id: `batch-${Date.now()}-${created.length}`,
        code: generateBatchCodeYYMMDD(dateVal),
        stage: 'say1',
        date: dateVal,                               // ngày vào Sấy 1 (badge đếm ngày)
        week: getISOWeekString(dateVal),
        length, width, thickness, quantity,
        volume: calculateVolume(length, width, thickness, quantity),
        bambooType: nanClassLabelOf(rec.cls),        // A / A1 / B lấy từ phân loại của thẻ nan
        useFor: 'Ván',
        location,
        notes,
        sourceChonNanId: rec.id,                     // link thẻ nan (để trừ phần còn lại)
        sourceChonNanLabel: nanCardLabel(rec),
        stageHistory: [{ stage: 'say1', date: dateVal }],
        updatedAt: nowISO
      };
      state.batches.unshift(batchData);
      created.push(batchData);
      totalQty += quantity;
    });
    if (!created.length) {
      showToast('Không tạo được lô nào — thẻ nan đã dùng hết hoặc thiếu kích thước!', 'error');
      return;
    }
    alPicked = [];
    saveData(); closeAddLotModal(); renderAll();
    showToast(`Đã tạo ${created.length} lô ở Sấy 1 — vị trí ${location} (${totalQty.toLocaleString('vi-VN')} thanh)` +
      (skipped ? ` · bỏ qua ${skipped} thẻ không hợp lệ` : '') + '!', 'success');
  }

  // ═══════════════════════════════════════════════════════════
  // CHUYỂN KHO (Than Hóa + Sấy): Sấy 1 / Sấy 2 → Kho, hoặc THÊM MỚI vào Kho
  // ═══════════════════════════════════════════════════════════
  // • Chọn công đoạn (say1 / say2) → hiện danh sách VỊ TRÍ đang có lô ở công đoạn
  //   đó (nhãn = tên vị trí · số lô · tổng số lượng). Chọn 1 VỊ TRÍ là chuyển
  //   TẤT CẢ lô nan trong vị trí đó cùng lúc vào Kho (không chọn từng lô nữa).
  // • Ngày = ngày vào Kho (badge đếm ngày cột Kho) · Vị trí mới ở Kho NHẬP TAY
  //   (gợi ý sẵn các vị trí đang có ở Kho; để trống = giữ nguyên vị trí cũ).
  // • Chọn "Thêm mới" → tạo lô MỚI ở thẳng Kho với: Ngày · Vị trí · Kích thước ·
  //   Số lượng · Loại nan · Dùng cho.
  // ─────────────────────────────────────────────────────────────
  // Danh sách VỊ TRÍ đang có lô ở 1 công đoạn: [{ location, count, qty }]
  function khoPositionsAt(stage) {
    const map = new Map();
    (state.batches || []).forEach(b => {
      if (!b || b.stage !== stage) return;
      const loc = String(b.location || '').trim() || '—';
      const cur = map.get(loc) || { location: loc, count: 0, qty: 0 };
      cur.count += 1;
      cur.qty += Number(b.quantity) || 0;
      map.set(loc, cur);
    });
    return [...map.values()].sort((a, b) => a.location.localeCompare(b.location, 'vi'));
  }
  // TẤT CẢ lô đang ở 1 vị trí của 1 công đoạn (chuyển cùng lúc)
  function batchesAtPosition(stage, location) {
    const loc = String(location || '').trim();
    return (state.batches || []).filter(b =>
      b && b.stage === stage && (String(b.location || '').trim() || '—') === loc);
  }
  // Vị trí đang có lô ở Kho (gợi ý cho ô nhập tay "Vị trí mới ở Kho")
  function khoLocationsInUse() {
    return [...new Set((state.batches || [])
      .filter(b => b && b.stage === 'kho' && String(b.location || '').trim())
      .map(b => String(b.location).trim()))].sort((a, b) => a.localeCompare(b, 'vi'));
  }
  function openTransferKhoModal() {
    if (!requireEditPermission()) return;
    const modal = document.getElementById('modal-transfer-kho');
    const form  = document.getElementById('transfer-kho-form');
    if (!modal || !form) return;
    form.reset();
    const today = new Date().toISOString().split('T')[0];
    const dEl = document.getElementById('ck-date');
    if (dEl) dEl.value = today;
    const sEl = document.getElementById('ck-stage');
    if (sEl) sEl.value = 'say1';
    syncTransferKhoUI();
    modal.classList.add('show');
    initLucide();
  }

  function closeTransferKhoModal() {
    document.getElementById('modal-transfer-kho')?.classList.remove('show');
  }

  // Đổi Công đoạn → nạp danh sách VỊ TRÍ đang có lô + gợi ý vị trí Kho; hoặc hiện form THÊM MỚI
  function syncTransferKhoUI() {
    const stage = (document.getElementById('ck-stage') || {}).value || 'say1';
    const isNew = stage === 'new';
    const setDisp = (id, show) => { const el = document.getElementById(id); if (el) el.style.display = show ? '' : 'none'; };

    setDisp('ck-lot-group', !isNew);
    setDisp('ck-pos-info-group', !isNew);
    setDisp('ck-new-loc-group', !isNew);
    ['ck-new-group', 'ck-new-qty-group', 'ck-new-dims-group', 'ck-new-type-group',
     'ck-new-use-group', 'ck-new-vol-group'].forEach(id => setDisp(id, isNew));

    if (!isNew) {
      // Danh sách VỊ TRÍ đang có lô ở công đoạn đã chọn (chọn 1 vị trí = chuyển CẢ vị trí)
      const groups = khoPositionsAt(stage);
      const lotEl = document.getElementById('ck-lot');
      if (lotEl) {
        lotEl.innerHTML = groups.length
          ? groups.map(g => `<option value="${escapeHTML(g.location)}">${escapeHTML(g.location)} — ${g.count} lô · ${g.qty.toLocaleString('vi-VN')} thanh</option>`).join('')
          : `<option value="">— Không có vị trí nào có lô ở ${(STAGES[stage] && STAGES[stage].name) || stage} —</option>`;
      }
      // Gợi ý vị trí Kho đang có cho ô NHẬP TAY "Vị trí mới ở Kho"
      const dl = document.getElementById('ck-new-loc-list');
      if (dl) {
        dl.innerHTML = khoLocationsInUse()
          .map(l => `<option value="${escapeHTML(l)}"></option>`).join('');
      }
      updateCkPosInfo();
    } else {
      updateCkNewVolume();
    }
  }

  // Tóm tắt vị trí đang chọn: bao nhiêu lô · tổng số lượng · tổng thể tích
  function updateCkPosInfo() {
    const el = document.getElementById('ck-pos-info');
    if (!el) return;
    const stage = (document.getElementById('ck-stage') || {}).value || 'say1';
    const pos = (document.getElementById('ck-lot') || {}).value || '';
    const lots = pos ? batchesAtPosition(stage, pos) : [];
    if (!lots.length) {
      el.innerHTML = '<span class="al-warn">Chưa có vị trí/lô khả dụng để chuyển.</span>';
      return;
    }
    const qty = lots.reduce((s, b) => s + (Number(b.quantity) || 0), 0);
    const vol = lots.reduce((s, b) => s + (Number(b.volume) || 0), 0);
    el.innerHTML = `<span><span class="al-k">Vị trí:</span><strong>${escapeHTML(pos)}</strong></span>
      <span><span class="al-k">Số lô sẽ chuyển:</span><strong>${lots.length} lô</strong></span>
      <span><span class="al-k">Tổng số lượng:</span><strong>${qty.toLocaleString('vi-VN')} thanh</strong></span>
      <span><span class="al-k">Tổng thể tích:</span><strong>${vol.toFixed(4)} m³</strong></span>
      <span class="al-k">Tất cả lô nan trong vị trí này CÙNG chuyển vào Kho.</span>`;
  }

  // Thể tích quy đổi của lô THÊM MỚI vào Kho
  function updateCkNewVolume() {
    const el = document.getElementById('ck-new-vol');
    if (!el) return;
    const v = calculateVolume(
      (document.getElementById('ck-new-length') || {}).value,
      (document.getElementById('ck-new-width') || {}).value,
      (document.getElementById('ck-new-thickness') || {}).value,
      (document.getElementById('ck-new-qty') || {}).value
    );
    el.textContent = `${v.toFixed(4)} m³`;
  }

  // Lưu form "Chuyển Kho"
  function handleTransferKhoSubmit(e) {
    e.preventDefault();
    if (!requireEditPermission()) return;
    const stage = (document.getElementById('ck-stage') || {}).value || 'say1';
    const dateVal = (document.getElementById('ck-date') || {}).value || '';
    const notes = ((document.getElementById('ck-notes') || {}).value || '').trim();
    if (!dateVal) { showToast('Vui lòng chọn Ngày!', 'error'); return; }

    // ── THÊM MỚI: tạo lô vào thẳng Kho ──
    if (stage === 'new') {
      const location   = ((document.getElementById('ck-new-loc-new') || {}).value || '').trim();
      const length     = parseFloat((document.getElementById('ck-new-length') || {}).value) || 0;
      const width      = parseFloat((document.getElementById('ck-new-width') || {}).value) || 0;
      const thickness  = parseFloat((document.getElementById('ck-new-thickness') || {}).value) || 0;
      const quantity   = parseInt((document.getElementById('ck-new-qty') || {}).value, 10) || 0;
      const bambooType = (document.getElementById('ck-new-type') || {}).value || 'A';
      const useFor     = (document.getElementById('ck-new-use') || {}).value || 'Ván';
      if (!location) { showToast('Vui lòng nhập Vị Trí!', 'error'); return; }
      if (!(length > 0 && width > 0 && thickness > 0)) { showToast('Nhập đủ Dài × Rộng × Dày (mm)!', 'error'); return; }
      if (quantity <= 0) { showToast('Số lượng phải lớn hơn 0!', 'error'); return; }
      pushUndo('Thêm lô mới vào Kho');
      const batchData = {
        id: `batch-${Date.now()}`,
        code: generateBatchCodeYYMMDD(dateVal),
        stage: 'kho',
        date: dateVal,
        week: getISOWeekString(dateVal),
        length, width, thickness, quantity,
        volume: calculateVolume(length, width, thickness, quantity),
        bambooType, useFor, location, notes,
        khoDate: dateVal,                        // ngày vào kho thực tế (badge đếm ngày)
        stageHistory: [{ stage: 'kho', date: dateVal }],
        updatedAt: new Date().toISOString()
      };
      state.batches.unshift(batchData);
      saveData(); closeTransferKhoModal(); renderAll();
      showToast(`Đã thêm lô ${batchData.code} vào Kho (${quantity.toLocaleString('vi-VN')} thanh)!`, 'success');
      return;
    }

    // ── CHUYỂN TẤT CẢ LÔ Ở 1 VỊ TRÍ (Sấy 1 / Sấy 2) → Kho ──
    const pos = (document.getElementById('ck-lot') || {}).value || '';
    const lots = pos ? batchesAtPosition(stage, pos) : [];
    if (!lots.length) { showToast('Chưa chọn được vị trí nào có lô để chuyển!', 'error'); return; }
    const newLoc = ((document.getElementById('ck-new-loc') || {}).value || '').trim();
    const stageName = (STAGES[stage] && STAGES[stage].name) || stage;
    if (lots.length > 1 && typeof confirm === 'function') {
      const msg = `Chuyển TẤT CẢ ${lots.length} lô ở vị trí "${pos}" (${stageName}) vào Kho?` +
        (newLoc ? `\n• Vị trí mới ở Kho: "${newLoc}"` : '');
      if (!confirm(msg)) return;
    }
    pushUndo(`Chuyển ${lots.length} lô ở vị trí ${pos} vào Kho`);
    const nowISO = new Date().toISOString();
    lots.forEach(b => {
      if (!b.stageHistory || !b.stageHistory.length) b.stageHistory = [{ stage: b.stage, date: b.date }];
      b.stage = 'kho';
      b.khoDate = dateVal;                         // ngày vào kho thực tế
      b.stageHistory.push({ stage: 'kho', date: dateVal });
      if (newLoc) b.location = newLoc;             // để trống = giữ nguyên vị trí cũ
      if (notes) b.notes = notes;
      b.updatedAt = nowISO;
    });
    saveData(); closeTransferKhoModal(); renderAll();
    showToast(`Đã chuyển ${lots.length} lô ở vị trí ${pos} vào Kho (ngày ${formatDateDDMMYY(dateVal)})!`, 'success');
  }

  // ─── TRANSFER MODAL ───────────────────────────────────────────
  function openTransferModal(batchId) {
    if (!requireEditPermission()) return;
    const batch = state.batches.find(b => b.id === batchId);
    if (!batch) return;
    const modal = document.getElementById('modal-transfer');

    document.getElementById('transfer-batch-id').value         = batch.id;
    document.getElementById('transfer-batch-title').textContent = `LÔ NAN TRE: ${batch.code}`;
    document.getElementById('transfer-preview-dim').textContent = `${batch.length} × ${batch.width} × ${batch.thickness} mm`;
    document.getElementById('transfer-preview-qty').textContent = `${batch.quantity.toLocaleString('vi-VN')} thanh`;
    document.getElementById('transfer-preview-vol').textContent = `${batch.volume.toFixed(4)} m³`;
    document.getElementById('transfer-from-tag').textContent    = STAGES[batch.stage]?.name || batch.stage;

    const nextStage = STAGES[batch.stage]?.next || 'bao_tinh';
    document.getElementById('transfer-target-stage').value = nextStage;

    // Điền sẵn vị trí & ghi chú hiện tại (người dùng có thể sửa)
    const locEl = document.getElementById('transfer-new-location');
    if (locEl) locEl.value = batch.location || '';
    const notesEl = document.getElementById('transfer-new-notes');
    if (notesEl) notesEl.value = batch.notes || '';

    // Ngày vào công đoạn thực tế: mặc định hôm nay, hiện khi đích là Sấy 2 / Kho / Bào Tinh
    const stDateEl = document.getElementById('transfer-stage-date');
    if (stDateEl) stDateEl.value = new Date().toISOString().split('T')[0];
    syncTransferStageDateUI(nextStage);

    modal.classList.add('show');
    initLucide();
  }

  function closeTransferModal() {
    document.getElementById('modal-transfer')?.classList.remove('show');
  }

  // Hiện/ẩn + đổi nhãn ô "Ngày Vào Công Đoạn (Thực Tế)" theo công đoạn đích
  // (Sấy 2 / Kho / Bào Tinh có mốc ngày riêng; Sấy 1 = ngày tạo lô nên không cần)
  function syncTransferStageDateUI(stage) {
    const group = document.getElementById('transfer-stage-date-group');
    const label = document.getElementById('transfer-stage-date-label');
    if (group) group.style.display = (stage && stage !== 'say1') ? '' : 'none';
    if (label && stage) label.textContent = `Ngày Vào ${STAGES[stage]?.short || 'Công Đoạn'} (Thực Tế)`;
  }

  // Hiện/ẩn + đổi chú thích ô ngày thực tế dùng chung của thanh chuyển nhiều lô
  function syncMtbStageDateUI(stage) {
    const el = document.getElementById('mtb-stage-date');
    if (!el) return;
    el.style.display = (stage && stage !== 'say1') ? '' : 'none';
    el.title = stage
      ? `Ngày vào ${STAGES[stage]?.short || stage} thực tế — áp dụng cho mọi lô được chuyển. Mặc định hôm nay, sửa lại nếu ngày thực tế khác ngày nhập hệ thống.`
      : 'Ngày vào công đoạn thực tế';
  }

  function handleTransferSubmit(e) {
    e.preventDefault();
    const batchId     = document.getElementById('transfer-batch-id').value;
    const targetStage = document.getElementById('transfer-target-stage').value;
    const batchIdx = state.batches.findIndex(b => b.id === batchId);
    if (batchIdx === -1) return;
    const src = state.batches[batchIdx];

    if (src.stage === targetStage) { showToast('Công đoạn đích phải khác công đoạn hiện tại!', 'error'); return; }

    // Đọc Vị Trí Mới & Ghi Chú Mới người dùng nhập trong modal
    // (modal điền sẵn giá trị hiện tại; xóa trắng = xóa thông tin cũ trên thẻ)
    const locEl   = document.getElementById('transfer-new-location');
    const notesEl = document.getElementById('transfer-new-notes');
    const newLocation = locEl ? locEl.value.trim() : (src.location || '');
    const newNotes    = notesEl ? notesEl.value.trim() : (src.notes || '');

    const nowISO   = new Date().toISOString();
    const todayStr = new Date().toISOString().split('T')[0];
    // Ngày vào công đoạn thực tế (khi đích là Sấy 2 / Kho / Bào Tinh) — có thể sớm
    // hơn ngày nhập hệ thống; để trống thì lấy hôm nay
    const stDateEl = document.getElementById('transfer-stage-date');
    const stageEffectiveDate = (stDateEl && stDateEl.value) ? stDateEl.value : todayStr;

    // Chuyển TOÀN BỘ lô sang công đoạn mới (giữ nguyên kích thước & số lượng)
    pushUndo(`Chuyển lô ${src.code} sang ${STAGES[targetStage].name}`);

    // Đảm bảo stageHistory tồn tại (giữ nguyên mốc ngày vào công đoạn hiện tại)
    if (!src.stageHistory || src.stageHistory.length === 0) {
      src.stageHistory = [{ stage: src.stage, date: src.date }];
    }

    src.stage     = targetStage;
    src.location  = newLocation; // GHI ĐÈ vị trí mới lên thông tin cũ
    src.notes     = newNotes;    // GHI ĐÈ ghi chú mới lên thông tin cũ
    src.updatedAt = nowISO;
    src.stageHistory.push({ stage: targetStage, date: stageEffectiveDate });
    // Ngày vào công đoạn thực tế (ưu tiên khi thống kê & xuất Excel theo công đoạn)
    if (targetStage === 'bao_tinh')      src.baoTinhDate = stageEffectiveDate;
    else if (targetStage === 'say2')     src.say2Date    = stageEffectiveDate;
    else if (targetStage === 'kho')      src.khoDate     = stageEffectiveDate;

    showToast(`Đã chuyển toàn bộ lô ${src.code} (${src.quantity.toLocaleString('vi-VN')} thanh) sang ${STAGES[targetStage].name}`, 'success');

    saveData(); closeTransferModal(); renderAll();
  }

  // ─── CHUYỂN NHIỀU LÔ CÙNG LÚC (CHỌN BẰNG CHECKBOX) ───────────
  function toggleMultiTransferMode() {
    if (!requireEditPermission()) return;
    if (state.multiTransferMode) { exitMultiTransferMode(); return; }
    state.multiTransferMode = true;
    state.multiSelectedIds  = [];
    document.body.classList.add('multi-select');
    updateMultiBar();
    renderAll();
    showToast('Chế độ chọn nhiều lô: bấm vào các thẻ lô để đánh dấu', 'info');
  }

  function exitMultiTransferMode() {
    state.multiTransferMode = false;
    state.multiSelectedIds  = [];
    // Xóa ô Vị Trí/Ghi Chú dùng chung để lần sau không áp dụng nhầm giá trị cũ
    const locEl   = document.getElementById('mtb-new-location');
    if (locEl) locEl.value = '';
    const notesEl = document.getElementById('mtb-new-notes');
    if (notesEl) notesEl.value = '';
    document.body.classList.remove('multi-select');
    updateMultiBar();
    renderAll();
  }

  function toggleBatchSelection(batchId) {
    if (!state.multiTransferMode) return;
    const idx = state.multiSelectedIds.indexOf(batchId);
    if (idx === -1) state.multiSelectedIds.push(batchId);
    else state.multiSelectedIds.splice(idx, 1);
    // Cập nhật giao diện thẻ ngay lập tức (không cần re-render)
    const card = document.querySelector(`.bamboo-card[data-id="${batchId}"]`);
    if (card) card.classList.toggle('selected', idx === -1);
    updateMultiBar();
  }

  function selectAllMulti() {
    if (!state.multiTransferMode) return;
    state.multiSelectedIds = getFilteredBatches().map(b => b.id);
    document.querySelectorAll('.bamboo-card').forEach(card => {
      card.classList.toggle('selected', state.multiSelectedIds.includes(card.getAttribute('data-id')));
    });
    updateMultiBar();
  }

  function clearMultiSelection() {
    state.multiSelectedIds = [];
    document.querySelectorAll('.bamboo-card.selected').forEach(c => c.classList.remove('selected'));
    updateMultiBar();
  }

  function updateMultiBar() {
    const bar   = document.getElementById('multi-transfer-bar');
    const count = document.getElementById('mtb-count');
    const btn   = document.getElementById('btn-multi-transfer');
    if (!bar || !count || !btn) return;
    if (state.multiTransferMode) {
      bar.classList.add('show');
      count.textContent = state.multiSelectedIds.length.toLocaleString('vi-VN');
      btn.classList.add('active');
      btn.innerHTML = '<i data-lucide="x-circle"></i> Thoát chọn lô';
    } else {
      bar.classList.remove('show');
      btn.classList.remove('active');
      btn.innerHTML = '<i data-lucide="list-checks"></i> Chọn nhiều lô để chuyển';
    }
    initLucide();
  }

  async function confirmMultiTransfer() {
    if (!state.multiTransferMode) return;
    if (state.multiSelectedIds.length === 0) { showToast('Chưa đánh dấu lô nào!', 'error'); return; }
    const targetStage = document.getElementById('mtb-target-stage')?.value;
    if (!targetStage) { showToast('Vui lòng chọn công đoạn đến!', 'error'); return; }

    // Vị Trí & Ghi Chú dùng chung (nếu nhập) sẽ GHI ĐÈ lên mọi lô được chuyển.
    // Để trống = giữ nguyên vị trí/ghi chú hiện có của từng lô.
    const locEl     = document.getElementById('mtb-new-location');
    const notesEl   = document.getElementById('mtb-new-notes');
    const newLocation = locEl ? locEl.value.trim() : '';
    const newNotes    = notesEl ? notesEl.value.trim() : '';

    // Xử lý: bỏ qua các lô đang ở đúng công đoạn đích
    const toMove = [];
    let skipped  = 0;
    state.multiSelectedIds.forEach(id => {
      const b = state.batches.find(x => x.id === id);
      if (!b) return;
      if (b.stage === targetStage) skipped++;
      else toMove.push(b);
    });

    if (toMove.length === 0) {
      showToast(`Không có lô nào cần chuyển (${skipped} lô đã ở ${STAGES[targetStage].name})`, 'info');
      return;
    }
    let confirmMsg = `Chuyển TOÀN BỘ ${toMove.length} lô đã chọn sang ${STAGES[targetStage].name}?`;
    if (newLocation) confirmMsg += `\n• Vị Trí mới: "${newLocation}" (áp dụng cho mọi lô)`;
    if (newNotes)    confirmMsg += `\n• Ghi Chú mới: "${newNotes}" (áp dụng cho mọi lô)`;
    if (!confirm(confirmMsg)) return;

    pushUndo(`Chuyển ${toMove.length} lô sang ${STAGES[targetStage].name}`);
    const nowISO   = new Date().toISOString();
    const todayStr = new Date().toISOString().split('T')[0];
    // Ngày vào công đoạn thực tế dùng chung (khi đích là Sấy 2 / Kho / Bào Tinh) — trống = hôm nay
    const stDateEl  = document.getElementById('mtb-stage-date');
    const stageDateVal = (stDateEl && stDateEl.value) ? stDateEl.value : todayStr;

    toMove.forEach(b => {
      if (!b.stageHistory || b.stageHistory.length === 0) {
        b.stageHistory = [{ stage: b.stage, date: b.date }];
      }
      if (newLocation !== '') b.location = newLocation; // GHI ĐÈ vị trí dùng chung
      if (newNotes    !== '') b.notes    = newNotes;    // GHI ĐÈ ghi chú dùng chung
      b.stage     = targetStage;
      b.updatedAt = nowISO;
      b.stageHistory.push({ stage: targetStage, date: stageDateVal });
      // Ngày vào công đoạn thực tế (ưu tiên khi thống kê & xuất Excel theo công đoạn)
      if (targetStage === 'bao_tinh')      b.baoTinhDate = stageDateVal;
      else if (targetStage === 'say2')     b.say2Date    = stageDateVal;
      else if (targetStage === 'kho')      b.khoDate     = stageDateVal;
    });

    // Xóa ô nhập để lần sau không vô tình áp dụng lại giá trị cũ
    if (locEl) locEl.value = '';
    if (notesEl) notesEl.value = '';
    if (stDateEl) stDateEl.value = new Date().toISOString().split('T')[0];

    saveData();
    exitMultiTransferMode();
    showToast(`Đã chuyển ${toMove.length} lô sang ${STAGES[targetStage].name}` +
      (skipped ? ` (bỏ qua ${skipped} lô trùng công đoạn)` : ''), 'success');
  }

export {
  alAvailableSources,
  alClearPicks,
  alCurrentLocation,
  alLocations,
  alOnLocationChipClick,
  alOnSourceListClick,
  alPickAll,
  alPickedIds,
  alSetLocation,
  alShowNewLocationRow,
  alToggleLocationPanel,
  alTogglePick,
  alToggleSourcePanel,
  availableKhoLots,
  availableSay1Cards,
  batchesAtPosition,
  clearMultiSelection,
  closeAddLotModal,
  closeBatchFormModal,
  closeTransferKhoModal,
  closeTransferModal,
  confirmMultiTransfer,
  deleteBatch,
  exitMultiTransferMode,
  handleAddLotSubmit,
  handleAlAddLocation,
  handleAlDeleteLocation,
  handleBatchFormSubmit,
  handleTransferKhoSubmit,
  handleTransferSubmit,
  khoLocationsInUse,
  khoPositionsAt,
  loadX2LotLocations,
  nanCardRemainingOf,
  openAddLotModal,
  openBatchFormModal,
  openTransferKhoModal,
  openTransferModal,
  saveX2LotLocations,
  selectAllMulti,
  syncAddLotSource,
  syncAddLotUI,
  syncMtbStageDateUI,
  syncTransferKhoUI,
  syncTransferStageDateUI,
  toggleBatchSelection,
  toggleMultiTransferMode,
  updateCkNewVolume,
  updateCkPosInfo,
  updateMultiBar,
  x2LotLocations
};
