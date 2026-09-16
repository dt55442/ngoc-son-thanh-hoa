// ═══════════════════════════════════════════════════════════
// js/batch-modals.js — tách từ app.js (refactor ES-modules phase 1)
// ═══════════════════════════════════════════════════════════
import { initLucide, requireEditPermission } from './cloud.js';
import { pushUndo } from './events.js';
import { getFilteredBatches, renderAll } from './main.js';
import { STAGES, state } from './state.js';
import { saveData } from './storage.js';
import { trackDeleted } from './tombstone.js';
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
  syncMtbStageDateUI,
  syncTransferStageDateUI,
  toggleBatchSelection,
  toggleMultiTransferMode,
  updateMultiBar
};
