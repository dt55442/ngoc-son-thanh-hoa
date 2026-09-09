// ═══════════════════════════════════════════════════════════
// js/batch-modals.js — tách từ app.js (refactor ES-modules phase 1)
// ═══════════════════════════════════════════════════════════
import { initLucide, requireEditPermission } from './cloud.js';
import { pushUndo } from './events.js';
import { getFilteredBatches, renderAll } from './main.js';
import { STAGES, state } from './state.js';
import { saveData } from './storage.js';
import { calculateVolume, escapeHTML, generateBatchCodeYYMMDD, getISOWeekString, showToast, validateBatchInput } from './utils.js';
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
      // Ngày Vào Bào Tinh thực tế: chỉ hiện khi lô đang ở Bào Tinh — cho sửa ngày
      // bào tinh khác với ngày hệ thống ghi nhận việc chuyển
      const btGroupEd = document.getElementById('form-baotinh-date-group');
      const btInputEd = document.getElementById('form-baotinh-date');
      if (btGroupEd && btInputEd) {
        const isBt = batch.stage === 'bao_tinh';
        btGroupEd.style.display = isBt ? '' : 'none';
        btInputEd.value = isBt ? (batch.baoTinhDate || getBaoTinhConversion(batch).date || '') : '';
      }
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
      const btGroupNew = document.getElementById('form-baotinh-date-group');
      const btInputNew = document.getElementById('form-baotinh-date');
      if (btGroupNew && btInputNew) { btGroupNew.style.display = 'none'; btInputNew.value = today; }
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
    // Ngày Vào Bào Tinh thực tế (chỉ áp dụng khi công đoạn là Bào Tinh) — có thể khác
    // ngày hệ thống ghi nhận; dùng cho thống kê tuần bào tinh & hiệu suất chuyển đổi
    const btDateEl  = document.getElementById('form-baotinh-date');
    const btDateVal = (stageVal === 'bao_tinh' && btDateEl && btDateEl.value) ? btDateEl.value : '';

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
    // Ghi NGÀY BÀO TINH THỰC TẾ (được ưu tiên hơn mốc tự động trong stageHistory)
    if (btDateVal) batchData.baoTinhDate = btDateVal;

    if (batchId) {
      pushUndo(`Sửa lô ${batchData.code}`);
      const idx = state.batches.findIndex(b => b.id === batchId);
      if (idx !== -1) {
        // Giữ lịch sử công đoạn cũ nếu có
        const old = state.batches[idx];
        batchData.stageHistory = (old.stageHistory && old.stageHistory.length > 0)
          ? old.stageHistory
          : [{ stage: old.stage, date: old.date }];
        // Đồng bộ mốc 'bao_tinh' cuối trong lịch sử theo ngày thực tế (lô đang ở Bào Tinh)
        if (batchData.baoTinhDate) {
          const btEntries = batchData.stageHistory.filter(h => h && h.stage === 'bao_tinh');
          if (btEntries.length) btEntries[btEntries.length - 1].date = batchData.baoTinhDate;
          else batchData.stageHistory.push({ stage: 'bao_tinh', date: batchData.baoTinhDate });
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
      state.batches = state.batches.filter(b => b.id !== batchId);
      saveData(); renderAll();
      showToast(`Đã xóa lô nan ${batch.code}`, 'info');
    }
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

    // Ngày Vào Bào Tinh thực tế: mặc định hôm nay, chỉ hiện khi đích là Bào Tinh
    const btDateEl = document.getElementById('transfer-baotinh-date');
    if (btDateEl) btDateEl.value = new Date().toISOString().split('T')[0];
    const btGroupEl = document.getElementById('transfer-baotinh-date-group');
    if (btGroupEl) btGroupEl.style.display = (nextStage === 'bao_tinh') ? '' : 'none';

    modal.classList.add('show');
    initLucide();
  }

  function closeTransferModal() {
    document.getElementById('modal-transfer')?.classList.remove('show');
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
    // Ngày Vào Bào Tinh thực tế (khi đích là Bào Tinh) — có thể sớm hơn ngày nhập hệ thống
    const btDateEl = document.getElementById('transfer-baotinh-date');
    const btEffectiveDate = (targetStage === 'bao_tinh' && btDateEl && btDateEl.value)
      ? btDateEl.value
      : todayStr;

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
    src.stageHistory.push({ stage: targetStage, date: (targetStage === 'bao_tinh' ? btEffectiveDate : todayStr) });
    if (targetStage === 'bao_tinh') src.baoTinhDate = btEffectiveDate; // ngày bào tinh thực tế (ưu tiên khi thống kê)

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
    // Ngày Vào Bào Tinh thực tế dùng chung (khi đích là Bào Tinh) — trống = hôm nay
    const btDateEl = document.getElementById('mtb-baotinh-date');
    const btDateVal = (targetStage === 'bao_tinh' && btDateEl && btDateEl.value) ? btDateEl.value : todayStr;

    toMove.forEach(b => {
      if (!b.stageHistory || b.stageHistory.length === 0) {
        b.stageHistory = [{ stage: b.stage, date: b.date }];
      }
      if (newLocation !== '') b.location = newLocation; // GHI ĐÈ vị trí dùng chung
      if (newNotes    !== '') b.notes    = newNotes;    // GHI ĐÈ ghi chú dùng chung
      b.stage     = targetStage;
      b.updatedAt = nowISO;
      const effDate = (targetStage === 'bao_tinh') ? btDateVal : todayStr;
      b.stageHistory.push({ stage: targetStage, date: effDate });
      if (targetStage === 'bao_tinh') b.baoTinhDate = effDate; // ngày bào tinh thực tế
    });

    // Xóa ô nhập để lần sau không vô tình áp dụng lại giá trị cũ
    if (locEl) locEl.value = '';
    if (notesEl) notesEl.value = '';
    if (btDateEl) btDateEl.value = new Date().toISOString().split('T')[0];

    saveData();
    exitMultiTransferMode();
    showToast(`Đã chuyển ${toMove.length} lô sang ${STAGES[targetStage].name}` +
      (skipped ? ` (bỏ qua ${skipped} lô trùng công đoạn)` : ''), 'success');
  }

export {
  clearMultiSelection,
  closeBatchFormModal,
  closeTransferModal,
  confirmMultiTransfer,
  deleteBatch,
  exitMultiTransferMode,
  handleBatchFormSubmit,
  handleTransferSubmit,
  openBatchFormModal,
  openTransferModal,
  selectAllMulti,
  toggleBatchSelection,
  toggleMultiTransferMode,
  updateMultiBar
};
