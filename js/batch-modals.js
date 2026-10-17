// ═══════════════════════════════════════════════════════════
// js/batch-modals.js — tách từ app.js (refactor ES-modules phase 1)
// ═══════════════════════════════════════════════════════════
import { initLucide, requireEditPermission } from './cloud.js';
import { pushUndo } from './events.js';
import { renderAll } from './main.js';
import { STAGES, STORAGE_KEY_X2_LOT_LOCATIONS, STORAGE_KEY_XUONG2_CHON_NAN, state } from './state.js';
import { saveData } from './storage.js';
import { trackDeleted } from './tombstone.js';
import { calculateVolume, escapeHTML, formatDateDDMMYY, generateBatchCodeYYMMDD, getBatchStageHistory, getHistoryEntryDays, getISOWeekString, khoApprovedXuatNotes, khoLotRemainingOf, showToast, validateBatchInput } from './utils.js';
import { addKhoReworkAutoNote, addKhoSay2AutoNote, alShiftIdxValue, saveKhoNotes, sayBuildCharges, sayShiftMapOf, syncAlShiftField } from './xuong2.js'; // Ô chọn LẦN THAN HÓA + Ô CA + PHIẾU XUẤT TỰ ĐỘNG

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
        { stage: 'kho', group: 'form-kho-date-group', input: 'form-kho-date' }
      ];
      // Entry 'bao_tinh' ĐÃ GỠ — công đoạn Bào Tinh không còn trên Kanban; option
      // "4. Bào Tinh" đã xóa khỏi form nên lô không thể đặt về stage này nữa.
      stageDateFields.forEach(({ stage, group, input }) => {
        const g = document.getElementById(group);
        const i = document.getElementById(input);
        if (!g || !i) return;
        const show = batch.stage === stage;
        g.style.display = show ? '' : 'none';
        if (!show) { i.value = ''; return; }
        const overrideKey = stage === 'say2' ? 'say2Date' : 'khoDate';
        const hist = (batch.stageHistory || []).filter(h => h && h.stage === stage && h.date);
        i.value = batch[overrideKey] || (hist.length ? hist[hist.length - 1].date : '') || '';
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
      ['form-say2-date-group', 'form-kho-date-group'].forEach(id => {
        const g = document.getElementById(id);
        if (g) g.style.display = 'none';
      });
      ['form-say2-date', 'form-kho-date'].forEach(id => {
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

  // ─── ③ LÔ NÀY ĐÃ BỊ LẤY THÀNH Ở CÔNG ĐOẠN SAU? ────────────────────
  // Quét theo ID lô trong các lượt Bào Tinh (kind 'tinh') + Gia công Bullig
  // (kind 'gc') + PHIẾU XUẤT KHO ĐÃ DUYỆT. Bản cũ chỉ có batchId, bản mới có
  // sources[].batchId. TỰ CHỨA — không import js/xuong2.js (tránh vòng lặp).
  function batchHasDownstreamUse(batchId) {
    const id = String(batchId || '');
    if (!id) return false;
    const hitRec = r => {
      if (!r) return false;
      if (Array.isArray(r.sources) && r.sources.length)
        return r.sources.some(s => s && String(s.batchId || '') === id);
      return String(r.batchId || '') === id;
    };
    if ((state.xuong2BaoTinhRecords || []).some(r => r && r.kind === 'tinh' && hitRec(r))) return true;
    if ((state.xuong2BulligRecords || []).some(r => r && r.kind === 'gc' && hitRec(r))) return true;
    // Phiếu xuất kho ĐÃ DUYỆT đã gắn lô này (số này đã thật sự trừ tồn kho)
    try {
      if ((khoApprovedXuatNotes() || []).some(n =>
        n && Array.isArray(n.lots) && n.lots.some(l => l && String(l.batchId || '') === id))) return true;
    } catch (err) { /* sổ kho có lỗi thì bỏ qua — không chặn người dùng sửa lô */ }
    return false;
  }

  // ─── ② ĐỒNG BỘ NGƯỢC LOẠI NAN → THẺ CHỌN NAN THÔ ──────────────────
  // Lô Sấy 1 tạo từ thẻ Chọn Nan Thô (batch.sourceChonNanId) vốn chép sẵn
  // phân loại lúc tạo (handleAddLotSubmit). Đổi "Loại Nan" ở form sửa → cập
  // nhật luôn cls trên THẺ NGUỒN (HỎI TRƯỚC vì 2 bên là bản ghi độc lập) +
  // làm mới nhãn snapshot sourceChonNanLabel.
  function syncSourceChonNanClass(oldBatch, newBatch) {
    // Lô gộp (chế độ Bảng) có NHIỀU thẻ nguồn trong sources[] — đổi Loại Nan
    // phải hỏi và cập nhật cho TẤT CẢ thẻ nguồn, không chỉ 1 thẻ.
    const ids = [];
    if (oldBatch && oldBatch.sourceChonNanId) ids.push(String(oldBatch.sourceChonNanId));
    if (oldBatch && Array.isArray(oldBatch.sources)) {
      oldBatch.sources.forEach(src => { if (src && src.chonNanId) ids.push(String(src.chonNanId)); });
    }
    const recIds = [...new Set(ids)];
    if (!recIds.length) return;
    const newCls = String((newBatch && newBatch.bambooType) || '').trim();
    const oldCls = String((oldBatch && oldBatch.bambooType) || '').trim();
    if (!newCls || newCls === oldCls) return;
    const recs = recIds.map(id => (state.xuong2ChonNanThoRecords || [])
      .find(r => r && String(r.id) === String(id))).filter(Boolean);
    if (!recs.length) return;
    const who = recs.length === 1
      ? `thẻ Chọn Nan Thô "${nanCardLabel(recs[0])}"`
      : `${recs.length} thẻ Chọn Nan Thô nguồn`;
    if (!confirm(
      `Lô này tạo từ ${who}.\n\n` +
      `Cập nhật luôn PHÂN LOẠI trên ${recs.length === 1 ? 'THẺ NGUỒN' : 'CÁC THẺ NGUỒN'} thành "${newCls}" không?\n` +
      'Bấm "Hủy" nếu chỉ muốn đổi Loại ở lô này (thẻ nguồn giữ nguyên).')) return;
    recs.forEach(rec => { rec.cls = newCls; });
    try {
      localStorage.setItem(STORAGE_KEY_XUONG2_CHON_NAN, JSON.stringify(state.xuong2ChonNanThoRecords || []));
    } catch (err) { /* lỗi ghi bộ nhớ máy — không chặn thao tác sửa lô */ }
    // Làm mới nhãn snapshot + phân loại trong sources[] (nếu là lô gộp)
    newBatch.sourceChonNanLabel = recs.length === 1
      ? nanCardLabel(recs[0])
      : `Nhóm ${recs.length} thẻ Chọn Nan Thô`;
    if (Array.isArray(newBatch.sources)) {
      newBatch.sources.forEach(src => { if (src) src.cls = newCls; });
    }
  }

  // Lô GỘP (chế độ Bảng): sửa Số lượng → chia lại sources[] theo TỶ LỆ để
  // tổng phần lấy từ các thẻ nguồn LUÔN khớp số lượng lô mới (không để tồn sai).
  function scaleBatchSourcesToQty(sources, newQty) {
    const list = (Array.isArray(sources) ? sources : [])
      .filter(s => s && Number(s.qty) > 0);
    const target = Math.max(0, Math.floor(Number(newQty) || 0));
    if (!list.length || target <= 0) return list;
    const sum = list.reduce((a, x) => a + (Number(x.qty) || 0), 0);
    if (!(sum > 0)) return list;
    let left = target;
    const out = [];
    list.forEach((s, i) => {
      const q = (i === list.length - 1)
        ? left
        : Math.min(left, Math.round((Number(s.qty) || 0) * target / sum));
      if (q > 0) { out.push(Object.assign({}, s, { qty: q })); left -= q; }
    });
    return out;
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
    const stageDateInputId = { say2: 'form-say2-date', kho: 'form-kho-date' }[stageVal];
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
    // — nhánh 'bao_tinh' ĐÃ GỠ (công đoạn Bào Tinh không còn trên Kanban)
    if (stageDateVal) {
      if (stageVal === 'say2') batchData.say2Date = stageDateVal;
      else if (stageVal === 'kho') batchData.khoDate = stageDateVal;
    }

    if (batchId) {
      const idx = state.batches.findIndex(b => b.id === batchId);
      const old = idx !== -1 ? state.batches[idx] : null;
      // ── ③ CẢNH BÁO: lô ĐÃ bị lấy thanh ở công đoạn sau (Bào Tinh / Gia công
      // Bullig / phiếu xuất kho ĐÃ DUYỆT) mà đổi kích thước hoặc số lượng → dòng
      // lịch sử đã ghi vẫn giữ snapshot lúc nhập, KHÔNG tự đổi theo.
      if (old) {
        const dimsChanged = Number(old.length) !== length || Number(old.width) !== width
          || Number(old.thickness) !== thickness || Number(old.quantity) !== quantity;
        if (dimsChanged && batchHasDownstreamUse(batchId) && !confirm(
          `LÔ "${batchData.code}" ĐÃ QUA CÔNG ĐOẠN SAU (đã có lượt Bào Tinh / Gia công Bullig lấy thanh, hoặc phiếu xuất kho ĐÃ DUYỆT gắn lô này).\n\n` +
          'Số DÀI / RỘNG / DÀY / SỐ LƯỢNG bạn vừa đổi chỉ áp cho lô từ nay — dòng lịch sử đã ghi vẫn giữ kích thước & số lượng tại thời điểm nhập (bản chụp), nên CÁC CÔNG ĐOẠN LIÊN QUAN SẼ KHÔNG TỰ ĐỔI THEO.\n\n' +
          'Vẫn lưu thay đổi?')) {
          return;   // Hủy → không lưu, không đẩy thêm 1 bước undo thừa
        }
      }
      pushUndo(`Sửa lô ${batchData.code}`);
      if (idx !== -1) {
        // Giữ lịch sử công đoạn cũ nếu có
        batchData.stageHistory = (old.stageHistory && old.stageHistory.length > 0)
          ? old.stageHistory
          : [{ stage: old.stage, date: old.date }];
        // Đồng bộ mốc cuối của công đoạn hiện tại trong lịch sử theo ngày thực tế
        if (stageDateVal) {
          const entries = batchData.stageHistory.filter(h => h && h.stage === stageVal);
          if (entries.length) entries[entries.length - 1].date = stageDateVal;
          else batchData.stageHistory.push({ stage: stageVal, date: stageDateVal });
        }
        // ── ② ĐỒNG BỘ NGƯỢC Loại Nan về thẻ Chọn Nan Thô (hỏi xác nhận) ──
        syncSourceChonNanClass(old, batchData);
        // ── ②b LÔ GỘP: giữ sources[] và cập nhật kích thước/phân loại; nếu đổi
        // Số lượng thì chia lại tỷ lệ để tổng nguồn khớp số lượng mới. ──
        if (old && Array.isArray(old.sources) && old.sources.length) {
          const scaled = Number(old.quantity) !== quantity
            ? scaleBatchSourcesToQty(old.sources, quantity)
            : old.sources;
          batchData.sources = scaled.map(src => Object.assign({}, src, {
            dims: [length, width, thickness],
            cls: batchData.bambooType
          }));
          batchData.sourceChonNanId = '';   // lô gộp nhiều nguồn → dùng sources[]
          batchData.sourceChonNanLabel = 'Nhóm ' + length + '×' + width + '×' + thickness +
            ' · ' + batchData.bambooType + ' · ' + batchData.sources.length + ' thẻ';
        }
        // ── ① HỢP NHẤT với bản cũ: giữ nguyên mọi trường liên kết NGOÀI form
        // (mã mẻ than hóa sayCharges · link sourceChonNanId/sourceChonNanLabel ·
        // say2Date/khoDate của công đoạn khác …) — trước đây object mới làm
        // MẤT sạch các trường đó ⇒ chip "Lần than hóa" biến mất và liên kết với
        // thẻ Chọn Nan Thô bị đứt. ──
        state.batches[idx] = Object.assign({}, old, batchData);
        // PHIẾU XUẤT TỰ ĐỘNG: sửa thẻ đổi công đoạn Kho → Sấy 2 (17/10/2026) —
        // nếu thiếu phiếu này, lần quay lại Kho tồn sẽ bị nhân đôi.
        if (old && old.stage === 'kho' && stageVal === 'say2') {
          addKhoSay2AutoNote(old, Number(old.quantity) || quantity, dateVal || stageDateVal || old.date, 'move');
          saveKhoNotes();
        }
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
      deleteBatches([batchId]);
    }
  }

  // ═══════════════════════════════════════════════════════════
  // XÓA LÔ — GỘP 1 LƯỢT (dùng chung cho xóa 1 lô & XÓA NHIỀU LÔ)
  // ═══════════════════════════════════════════════════════════
  // Mọi việc gói vào MỘT lượt: 1 undo · 1 tombstone (mảng id) · 1 saveData ·
  // 1 renderAll · 1 toast. Trước đây xóa N lô là N chuỗi đầy đủ (N lần vẽ lại
  // toàn bộ Kanban + N lần hẹn đẩy mây) → nguyên nhân chính gây độ trễ cao khi
  // xóa từng lô liên tục.
  function deleteBatches(ids) {
    if (!requireEditPermission()) return 0;
    const list = (Array.isArray(ids) ? ids : [ids]).map(v => String(v || '')).filter(Boolean);
    if (!list.length) return 0;
    const targets = state.batches.filter(b => list.includes(String(b.id)));
    if (!targets.length) return 0;
    const names = targets.map(b => b.code || b.id);
    pushUndo(names.length === 1
      ? `Xóa lô ${names[0]}`
      : `Xóa ${names.length} lô: ${names.slice(0, 3).join(', ')}${names.length > 3 ? '…' : ''}`);
    trackDeleted('batches', list); // dấu vết xóa: chặn máy khác đẩy ngược lô này lên mây
    const picked = new Set(list);
    state.batches = state.batches.filter(b => !picked.has(String(b.id)));
    saveData(); renderAll();
    showToast(names.length === 1 ? `Đã xóa lô nan ${names[0]}` : `Đã xóa ${names.length} lô nan`, 'info');
    return names.length;
  }

  // ─── CHẾ ĐỘ XÓA NHIỀU LÔ (Admin) ────────────────────────────────
  // Nút "Xóa Nhiều" trên thanh công cụ thẻ Than Hóa + Sấy → bật chế độ TÍCH
  // CHỌN các thẻ lô (checkbox trên từng thẻ) → bấm "Xóa Đã Chọn" trên thanh nổi.
  // CHỈ Quản Trị (Admin) được dùng — vai trò khác bấm sẽ bị chặn kèm thông báo.
  function isAdminUser() {
    return !!(state.currentUser && state.currentUser.role === 'admin');
  }
  // Đồng bộ thanh nổi "Đã chọn N lô": đếm + chặn nút xóa khi chưa chọn gì
  function syncKanbanPickBar() {
    if (typeof document === 'undefined' || !document.getElementById) return;
    const bar = document.getElementById('kb-pick-bar');
    if (!bar) return;
    const n = (state.kanbanPicked || []).length;
    const cnt = document.getElementById('kb-pick-count');
    if (cnt) cnt.textContent = String(n);
    const btn = document.getElementById('kb-pick-del');
    if (btn) btn.disabled = n === 0;
    // Nhóm nút XÓA NHIỀU ngay trên thanh công cụ (hiện khi đang bật chế độ chọn)
    const cntInline = document.getElementById('kb-pick-inline-count');
    if (cntInline) cntInline.textContent = String(n);
    const btnInline = document.getElementById('kb-pick-inline-del');
    if (btnInline) btnInline.disabled = n === 0;
  }
  // Bật/tắt chế độ chọn nhiều lô (bấm lần nữa = thoát)
  function toggleKanbanPickMode() {
    if (state.kanbanPickMode) { exitKanbanPickMode(); return; }
    if (!isAdminUser()) { showToast('Xóa nhiều lô chỉ dành cho Quản Trị (Admin).', 'error'); return; }
    if (!requireEditPermission()) return;
    state.kanbanPickMode = true;
    state.kanbanPicked = [];
    if (typeof document !== 'undefined' && document.body && document.body.classList) {
      document.body.classList.add('kanban-pick-mode');
    }
    syncKanbanPickBar();
    renderAll(); // vẽ lại Kanban để hiện ô tích chọn trên từng thẻ
    showToast('Đã bật chế độ xóa nhiều lô — tích chọn các thẻ rồi bấm "Xóa Đã Chọn".', 'info');
  }
  // Thoát chế độ chọn (gỡ tích + tắt thanh nổi). reRender=false khi đang chuyển tab
  function exitKanbanPickMode(reRender = true) {
    if (!state.kanbanPickMode) return;
    state.kanbanPickMode = false;
    state.kanbanPicked = [];
    if (typeof document !== 'undefined' && document.body && document.body.classList) {
      document.body.classList.remove('kanban-pick-mode');
    }
    syncKanbanPickBar();
    if (reRender) renderAll();
  }
  // Tích / bỏ tích 1 lô (từ ô checkbox trên thẻ — uỷ nhiệm sự kiện change)
  function onKanbanPickChange(batchId, checked) {
    const id = String(batchId || '');
    if (!id) return;
    const cur = new Set(state.kanbanPicked || []);
    if (checked) cur.add(id); else cur.delete(id);
    state.kanbanPicked = [...cur];
    syncKanbanPickBar();
  }
  // CHỌN TẤT CẢ các lô đang HIỆN trên bảng (đã qua bộ lọc cột — lấy theo DOM)
  function kanbanSelectAll() {
    if (!state.kanbanPickMode) return;
    const picked = new Set(state.kanbanPicked || []);
    if (typeof document !== 'undefined' && document.querySelectorAll) {
      document.querySelectorAll('.kb-pick-box').forEach(cb => {
        const id = cb && cb.getAttribute ? cb.getAttribute('data-pick-id') : null;
        if (!id) return;
        picked.add(String(id));
        if ('checked' in cb) cb.checked = true;
      });
    }
    state.kanbanPicked = [...picked];
    syncKanbanPickBar();
  }
  // Xóa CÁC LÔ ĐÃ CHỌN (confirm 1 lần cho cả loạt — hoàn tác được bằng 1 bấm)
  function deletePickedBatches() {
    if (!state.kanbanPickMode) return;
    if (!isAdminUser()) { showToast('Xóa nhiều lô chỉ dành cho Quản Trị (Admin).', 'error'); return; }
    const ids = (state.kanbanPicked || []).slice();
    if (!ids.length) { showToast('Chưa chọn lô nào để xóa!', 'info'); return; }
    if (typeof confirm === 'function' &&
        !confirm(`Xóa ${ids.length} lô nan đã chọn? (Có thể bấm Hoàn Tác ngay sau khi xóa)`)) return;
    state.kanbanPicked = [];          // gỡ khỏi danh sách chọn TRƯỚC khi vẽ lại
    deleteBatches(ids);               // tự saveData + renderAll + toast
    syncKanbanPickBar();
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

  // ── TÌM NHANH trong danh sách THẺ NGUỒN (Thêm Lô Sấy Mới) ────────
  // Bỏ dấu + thường hóa để gõ "van"/"van 1250" cũng khớp "Ván"
  function alNorm(s) {
    return String(s || '').toLowerCase().normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd')
      .replace(/×/g, 'x');   // gõ "1250x18x7" khớp "1250×18×7"
  }
  // Số NGÀY đã ở từng công đoạn của 1 lô: { say1, say2, kho }
  function alStageDaysOf(batch) {
    const out = { say1: 0, say2: 0, kho: 0 };
    if (!batch) return out;
    const hist = getBatchStageHistory(batch);
    hist.forEach((h, idx) => {
      if (!h || !(h.stage in out)) return;
      out[h.stage] += getHistoryEntryDays(hist, idx) || 0;
    });
    return out;
  }
  // 2 DÒNG hiển thị 1 thẻ nguồn:
  //   • Sấy 1 (thẻ nan Chọn Nan Thô) — 16/10/2026:
  //       Dòng 1 = Kích thước · Phân loại · NGÀY CHỌN NAN (biết thẻ của ngày nào)
  //       Dòng 2 = chip TỒN màu "còn X/Y thanh" + chip "đã dùng Z" (nếu đã tạo lô) +
  //                chip Dùng cho + badge nguồn (luồng NL / Ngoài · NCC)
  //   • Sấy 2 (lô ở Kho): Dòng 1 = Vị trí · Kích thước · Loại · Số lượng;
  //       Dòng 2 = Dùng cho · badge đếm ngày S1/S2/K — mỗi badge 1 màu
  // sub = chuỗi thuần (dùng tìm kiếm) · subHtml = HTML có badge màu
  function alCardLines(it, stage) {
    const isLot = stage === 'say2';
    const dims = isLot
      ? `${it.length || '?'}×${it.width || '?'}×${it.thickness || '?'}`
      : (Array.isArray(it.dims) ? `${it.dims[0] || '?'}×${it.dims[1] || '?'}×${it.dims[2] || '?'}` : '?');
    const cls = isLot ? (it.bambooType || '—') : nanClassLabelOf(it.cls);
    // Sấy 2 (lô ở Kho): in TỒN CÒN THỰC — cùng sổ với thẻ Kho. Lô nguyên
    // (còn = gốc) giữ chữ cũ "X thanh" cho gọn; lô đã xuất 1 phần in rõ
    // "còn X/Y thanh" để không nhầm với số gốc.
    const lotRem = isLot ? (Math.round(khoLotRemainingOf(it)) || 0) : 0;
    const lotTotal = isLot ? (Number(it.quantity) || 0) : 0;
    // Sấy 1 (thẻ nan): TỔNG của thẻ (số nhập ở Chọn Nan Thô) · ĐÃ DÙNG (đã tạo lô
    // Sấy 1) · CÒN LẠI (tối đa lấy cho lô mới — có thể lấy 1 PHẦN để chia nhiều lô)
    const nanTotal = isLot ? 0 : (Number(it.quantity) || 0);
    const nanUsed = isLot ? 0 : nanCardUsedOf(it.id);
    const nanRem = isLot ? 0 : Math.max(0, nanTotal - nanUsed);
    const qtyLbl = isLot
      ? (lotRem === lotTotal
        ? `${lotTotal.toLocaleString('vi-VN')} thanh`
        : `còn ${lotRem.toLocaleString('vi-VN')}/${lotTotal.toLocaleString('vi-VN')} thanh`)
      : `còn ${nanRem.toLocaleString('vi-VN')}/${nanTotal.toLocaleString('vi-VN')} thanh`;
    const nanDate = isLot ? '' : formatDateDDMMYY(it.date);
    const main = isLot
      ? `${it.location || '—'} · ${dims} · ${cls} · ${qtyLbl}`
      : `${dims} · ${cls} · Chọn nan ${nanDate}`;
    // Thẻ nan Chọn Nan Thô không mang sẵn Dùng cho → hiện giá trị đang chọn ở form
    const useForLbl = it.useFor || (isLot ? '—' : alUseFor());
    const extra = [];
    if (isLot) {
      const d = alStageDaysOf(it);
      extra.push(
        `<span class="al-day-badge day-s1" title="Số ngày đã ở Sấy 1">S1-${d.say1} ngày</span>`,
        `<span class="al-day-badge day-s2" title="Số ngày đã ở Sấy 2">S2-${d.say2} ngày</span>`,
        `<span class="al-day-badge day-k" title="Số ngày đã ở Kho">K-${d.kho} ngày</span>`
      );
    } else {
      // Chip TỒN (màu) + chip ĐÃ DÙNG (chỉ hiện khi đã tạo lô Sấy 1 từ thẻ này)
      extra.push(`<span class="al-stock-chip" title="Tồn còn lại / Tổng của thẻ nan (Tổng = số nhập ở thẻ Chọn Nan Thô)">còn ${nanRem.toLocaleString('vi-VN')}/${nanTotal.toLocaleString('vi-VN')} thanh</span>`);
      if (nanUsed > 0) {
        extra.push(`<span class="al-used-chip" title="Đã tạo lô Sấy 1 từ thẻ nan này">đã dùng ${nanUsed.toLocaleString('vi-VN')}</span>`);
      }
      if (it.external) {
        extra.push(`<span class="al-day-badge day-ext" title="Nan mua ngoài công đoạn">Ngoài${it.supplier ? ' · ' + escapeHTML(it.supplier) : ''}</span>`);
      } else if (it.materialType) {
        extra.push(`<span class="al-day-badge day-luuong" title="Luồng nguyên liệu">${escapeHTML(it.materialType)}</span>`);
      }
    }
    const subHtml = `<span class="al-use-tag use-${alNorm(useForLbl).replace(/[^a-z]/g, '') || 'khac'}">${escapeHTML(useForLbl)}</span> ` + extra.join(' ');
    const sub = (isLot ? '' : `Chọn nan ${nanDate} · `) +
      `Dùng cho ${useForLbl} · ${extra.map(e => e.replace(/<[^>]*>/g, '')).join(' · ')}`;
    return { main, sub, subHtml };
  }
  // Thẻ nguồn có khớp từ khóa tìm nhanh không (tìm trong mọi thông tin hiển thị)
  function alSourceMatches(it, stage, query) {
    const q = alNorm(query).trim();
    if (!q) return true;
    const lines = alCardLines(it, stage);
    return alNorm(`${lines.main} ${lines.sub} ${it.code || ''}`).includes(q);
  }
  let alSourceQuery = '';
  function alSetSourceQuery(v) {
    alSourceQuery = String(v || '');
    renderAlSourceList();
  }
  function alClearSourceQuery() {
    alSourceQuery = '';
    alSourceQtyQuery = '';
    const el = document.getElementById('al-source-search');
    if (el) el.value = '';
    const qtyEl = document.getElementById('al-source-qty-search');
    if (qtyEl) qtyEl.value = '';
  }
  // ── Ô TÌM THEO SỐ LƯỢNG (04/10/2026) ──────────────────────────
  // Tách RIÊNG khỏi ô tìm nhanh; 2 ô lọc KẾT HỢP (điều kiện VÀ): thẻ chỉ
  // hiện ra khi khớp CẢ HAI. Ô này CHỈ so SỐ LƯỢNG — không so vị trí/mã/kích thước/loại.
  let alSourceQtyQuery = '';
  // Chuẩn hóa chuỗi SỐ: bỏ dấu phân cách nghìn (gõ 1000 khớp 1.000) + khoảng trắng
  function alQtyNorm(s) {
    return String(s == null ? '' : s).split('.').join('').split(' ').join('');
  }
  // Các SỐ LƯỢNG của 1 thẻ nguồn (CHỈ số lượng):
  //   • Sấy 2 (lô ở Kho) = TỒN CÒN THỰC (số in trên thẻ) — cùng sổ với thẻ Kho
  //     (khoLotRemainingOf: số lần nhập × số lượng − phiếu xuất ĐÃ DUYỆT).
  //     Lô đã xuất hết (tồn 0) không có số nào → ô tìm số tự ẩn.
  //   • Sấy 1 (thẻ Chọn Nan Thô) = phần CÒN LẠI in trên thẻ + số lượng gốc của thẻ
  function alSourceQtyValues(it, stage) {
    const vals = [];
    if (stage === 'say2') {
      vals.push(Math.round(khoLotRemainingOf(it)) || 0);
    } else {
      vals.push(nanCardRemainingOf(it));
      vals.push(Number(it && it.quantity) || 0);
    }
    return vals.filter((v, i, arr) => v > 0 && arr.indexOf(v) === i);
  }
  // Thẻ nguồn có khớp ô tìm theo SỐ LƯỢNG không — CHỈ so số lượng, dạng CHỨA;
  // chuỗi rỗng / không có chữ số → không lọc (hiện mọi thẻ)
  function alSourceQtyMatches(it, stage, qtyQuery) {
    const q = alQtyNorm(qtyQuery).split('').filter(ch => ch >= '0' && ch <= '9').join('');
    if (!q) return true;
    return alSourceQtyValues(it, stage).some(v => String(v).includes(q));
  }
  function alSetSourceQtyQuery(v) {
    alSourceQtyQuery = String(v || '');
    renderAlSourceList();
  }
  // Số thanh ĐÃ dùng của 1 thẻ chọn nan (đã tạo lô sấy từ thẻ đó)
  function nanCardUsedOf(chonNanId, excludeBatchId) {
    const key = String(chonNanId);
    return (state.batches || []).reduce((sum, b) => {
      if (!b || b.id === excludeBatchId) return sum;
      // LÔ GỘP (chế độ Bảng): nguồn nằm trong b.sources[] — cộng ĐÚNG phần đã lấy
      // từ thẻ này. Lô cũ (1 thẻ) vẫn dùng sourceChonNanId + quantity.
      if (Array.isArray(b.sources) && b.sources.length) {
        return sum + b.sources.reduce((s, src) => s +
          (String((src && src.chonNanId) || '') === key ? (Number(src.qty) || 0) : 0), 0);
      }
      return sum + (String(b.sourceChonNanId || '') === key ? (Number(b.quantity) || 0) : 0);
    }, 0);
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
  // Lô KHO khả dụng cho Sấy 2 — cùng sổ với thẻ Kho: CHỈ lô CÒN HÀNG
  // (khoLotRemainingOf > 0). Lô đã xuất hết không hiện ở cả 2 nơi nên gõ cùng
  // 1 số tồn không còn lệch 2 so 1.
  function availableKhoLots() {
    return (state.batches || []).filter(b => b && b.stage === 'kho' && khoLotRemainingOf(b) > 0);
  }

  // ─── MODAL "THÊM LÔ SẤY MỚI" — mở/đóng/đổi nguồn/lưu ─────────
  // Nguồn đang chọn (mảng id — CHỌN ĐƯỢC NHIỀU nguồn cùng lúc) + vị trí đang chọn
  let alPicked = [];
  let alLocation = '';
  // ─── SỐ LƯỢNG TẠO LÔ đang nhập cho TỪNG THẺ NAN (Sấy 1) — 16/10/2026 ──
  // id thẻ nan → số thanh sẽ tạo lô. Mặc định = phần CÒN LẠI của thẻ; 1 lô sấy có
  // thể lấy 1 PHẦN (chia 1 thẻ thành nhiều lô — VD tổng 5.000 thanh chia 3 lô).
  const alCardQty = {};
  // Số lượng hợp lệ đang nhập cho 1 thẻ nan (mặc định = tồn; CHẶN vượt tồn)
  function alCardQtyOf(id) {
    const rec = (state.xuong2ChonNanThoRecords || []).find(x => String(x.id || '') === String(id));
    if (!rec) return 0;
    const cap = nanCardRemainingOf(rec);
    const v = Math.floor(Number(alCardQty[String(id)]));
    if (v > 0) return Math.min(v, cap);
    // Chế độ BẢNG: thẻ KHÔNG có trong alCardQty = chưa lấy (0) — không mặc định
    // lấy hết như chế độ Thẻ (bấm thẻ = mặc định phần còn lại).
    if (alEntryModeOf() === 'grid') return 0;
    return cap;
  }
  // Ô NHẬP SỐ LƯỢNG của 1 thẻ nan trong "Thông Tin Lấy Từ Nguồn" (uỷ nhiệm input)
  // — clamp về phần còn lại; KHÔNG vẽ lại khối info (giữ con trỏ ô nhập), chỉ cập
  // nhật thể tích của dòng + 2 dòng tóm tắt/chân form.
  function alOnCardQtyInput(e) {
    const t = e && e.target;
    const id = (t && typeof t.getAttribute === 'function') ? t.getAttribute('data-al-qty') : '';
    if (!id) return 0;
    const rec = (state.xuong2ChonNanThoRecords || []).find(x => String(x.id || '') === String(id));
    if (!rec) return 0;
    const cap = nanCardRemainingOf(rec);
    let v = Math.floor(Number(String(t.value == null ? '' : t.value).replace(/[^\d]/g, '')) || 0);
    if (v > cap) { v = cap; t.value = String(v); }     // chặn vượt tồn (tự điều về tối đa)
    if (v > 0) alCardQty[String(id)] = v; else delete alCardQty[String(id)];
    // Cập nhật THỂ TÍCH của đúng dòng đó (không vẽ lại khối → không mất con trỏ)
    if (typeof t.closest === 'function') {
      const row = t.closest('[data-al-qty-row]');
      const volEl = row && typeof row.querySelector === 'function' ? row.querySelector('[data-al-vol]') : null;
      if (volEl) {
        const dims = Array.isArray(rec.dims) ? rec.dims : [];
        volEl.textContent = calculateVolume(dims[0] || 0, dims[1] || 0, dims[2] || 0, v).toFixed(4);
      }
    }
    alRefreshSummary();
    return v;
  }

  function alStageOf() { return (document.getElementById('al-stage') || {}).value || 'say1'; }
  function alUseFor() {
    const v = (document.getElementById('al-use-for') || {}).value;
    return v === 'Bullig' ? 'Bullig' : 'Ván';
  }
  function alPickedIds() { return alPicked.slice(); }
  // Danh sách nguồn khả dụng của công đoạn đang chọn
  function alCandidatesOf(stage) {
    return stage === 'say2' ? availableKhoLots() : availableSay1Cards();
  }
  function alAvailableSources() { return alCandidatesOf(alStageOf()); }

  // ═══ CÁCH NHẬP NGUỒN: THẺ NGUỒN ⇄ BẢNG NHẬP NHANH (17/10/2026) ═══
  // • Bảng nhập nhanh CHỈ dùng cho Sấy 1. Sấy 2 chuyển NGUYÊN lô; Thanh Hóa Lại
  //   chỉ đốt 1 lô Tóp → hai trường hợp đó giữ nguyên danh sách thẻ.
  // • ĐỔI QUY TẮC 17/10/2026 (người dùng chủ động chọn): gộp dòng theo
  //   CỠ + PHÂN LOẠI của các ngày đang chọn; SL lấy nhập 1 lần cho cả nhóm và
  //   hệ thống TỰ CHIA theo thẻ CŨ NHẤT trước (date asc → createdAt asc).
  //   ⚠ Cách này có thể che báo cáo khống → luôn hiện nút ▸ xem chia cho thẻ/
  //   ngày nào + cảnh báo thẻ quá AL_GRID_STALE_DAYS ngày.
  // • Cột Ngày chọn nan / Thể tích / nguồn vật tư ẨN; ngày + nguồn chỉ hiện
  //   trong khối ▸ (hoặc tooltip) khi người dùng cần kiểm tra.
  // • Ô TRỐNG = KHÔNG LẤY.
  const AL_ENTRY_MODE_KEY = 'bamboo_tracker_al_entry_mode_v1';
  const AL_GRID_STALE_DAYS = 3;
  let alEntryMode = 'grid';
  let alEntryModeLoaded = false;
  // Danh sách NGÀY CHỌN NAN đang bật — chọn được NHIỀU ngày (VD 14/10 còn tồn +
  // 15/10 hôm nay). Rỗng = hiện tất cả ngày.
  let alGridDates = [];
  let alGridSearchQ = '';
  let alGridSortMode = 'size';       // size | sizeAsc | class
  let alGridGroupQty = {};           // groupKey → tổng SL lấy của nhóm (cộng các dòng)
  let alGridGroupLines = {};         // groupKey → [SL lô 1, SL lô 2, …] — mỗi dòng = 1 lô mới
  let alGridExpand = new Set();      // các nhóm đang mở khối ▸ chi tiết chia
  function alGridDateKeyOf(it) {
    return String((it && it.date) || '').trim() || '—';
  }
  function alGridDateOn(date) {
    const d = String(date || '').trim() || '—';
    return alGridDates.includes(d);
  }
  function alGridToggleDate(date) {
    const d = String(date || '').trim() || '—';
    alGridDates = alGridDates.includes(d) ? alGridDates.filter(x => x !== d) : [...alGridDates, d];
    return alGridDates.slice();
  }
  function alGridClearDates() { alGridDates = []; return alGridDates.slice(); }
  // ── GỘP NHÓM THEO CỠ + PHÂN LOẠI (17/10/2026) ──────────────────
  function alGridClassOrder(cls) { return ({ A: 0, A1: 1, B: 2 })[cls] ?? 9; }
  function alGridGroupKeyOf(it) {
    const d = alGridDimsOf(it);
    // Dùng ĐÚNG 3 số đo làm khóa (không dùng sizeKey) để 2 bản ghi cùng cỡ nhưng
    // sizeKey gõ khác kiểu (x / ×) vẫn gộp chung 1 nhóm.
    return `${d[0]}×${d[1]}×${d[2]}|${String((it && it.cls) || 'A')}`;
  }
  // Toàn bộ nhóm của CÁC NGÀY ĐANG CHỌN (KHÔNG phụ thuộc ô tìm kiếm) — dùng cho
  // cả vẽ bảng lẫn chia số lượng, để nhóm đang bị lọc vẫn giữ đúng số đã nhập.
  // Cắt phần nguồn (đã chia FEFO cho cả nhóm) thành từng LÔ theo các dòng.
  // Thẻ CŨ NHẤT được cấp liên tiếp: lô 1 lấy trước, lô 2 lấy tiếp phần còn lại…
  function alGridSliceSources(split, lineQtys) {
    const cards = (split || []).filter(c => c && Number(c.alloc) > 0);
    const lines = (lineQtys || []).map(q => Math.max(0, Math.floor(Number(q) || 0)));
    let ci = 0, usedInCard = 0;
    return lines.map(qty => {
      let left = qty;
      const sources = [];
      while (left > 0 && ci < cards.length) {
        const card = cards[ci];
        const cap = Number(card.alloc) || 0;
        const avail = Math.max(0, cap - usedInCard);
        if (avail <= 0) { ci++; usedInCard = 0; continue; }
        const take = Math.min(avail, left);
        if (take > 0) {
          sources.push(Object.assign({}, card, { alloc: take }));
          left -= take;
          usedInCard += take;
        }
        if (usedInCard >= cap) { ci++; usedInCard = 0; }
      }
      return { qty, sources };
    });
  }

  function alGridAllGroupList() {
    const map = new Map();
    (state.xuong2ChonNanThoRecords || []).forEach(it => {
      if (!it || it.cls === 'reject') return;
      const date = alGridDateKeyOf(it);
      if (alGridDates.length && !alGridDates.includes(date)) return;
      const dims = alGridDimsOf(it);
      if (!(dims[0] > 0 && dims[1] > 0 && dims[2] > 0)) return;
      const key = alGridGroupKeyOf(it);
      if (!map.has(key)) {
        map.set(key, {
          key, dims,
          dimsText: `${dims[0]}×${dims[1]}×${dims[2]}`,
          clsRaw: String(it.cls || 'A'),
          cls: nanClassLabelOf(it.cls),
          cards: []
        });
      }
      const g = map.get(key);
      const id = String(it.id);
      const total = Number(it.quantity) || 0;
      const used = nanCardUsedOf(id);
      const remaining = Math.max(0, total - used);
      let alloc = 0;
      if (Object.prototype.hasOwnProperty.call(alCardQty, id)) alloc = Math.floor(Number(alCardQty[id])) || 0;
      else if (alPicked.includes(id)) alloc = remaining;   // chọn từ chế độ Thẻ
      alloc = Math.max(0, Math.min(alloc, remaining));
      g.cards.push({
        it, id, date,
        dateText: alGridDateText(it.date),
        total, used, remaining, alloc,
        createdAt: String(it.createdAt || ''),
        srcText: [it.materialType, it.supplier].filter(Boolean).join(' · ') || '—'
      });
    });
    const groups = [...map.values()].map(g => {
      g.cards.sort((a, b) => String(a.date).localeCompare(String(b.date)) ||
        String(a.createdAt).localeCompare(String(b.createdAt)) || String(a.id).localeCompare(String(b.id)));
      g.total = g.cards.reduce((s, c) => s + c.total, 0);
      g.used = g.cards.reduce((s, c) => s + c.used, 0);
      g.remaining = g.cards.reduce((s, c) => s + c.remaining, 0);
      g.liveCards = g.cards.filter(c => c.remaining > 0).length;
      g.split = g.cards.filter(c => c.alloc > 0);
      g.qty = g.split.reduce((s, c) => s + c.alloc, 0);
      g.vol = g.split.reduce((s, c) => s + calculateVolume(g.dims[0], g.dims[1], g.dims[2], c.alloc), 0);
      g.stale = g.split.map(c => ({ date: c.date, days: alGridStaleOf(c) })).filter(x => x.days != null);
      g.dates = [...new Set(g.cards.map(c => c.date))];
      // Số dòng đang nhập của nhóm: ưu tiên alGridGroupLines; nếu chưa có thì
      // coi cả nhóm là 1 dòng (tương thích chế độ Thẻ / dữ liệu cũ).
      let lineQtys = Array.isArray(alGridGroupLines[g.key]) && alGridGroupLines[g.key].length
        ? alGridGroupLines[g.key].map(q => Math.max(0, Math.floor(Number(q) || 0)))
        : (g.qty > 0 ? [g.qty] : []);
      const lineSum = lineQtys.reduce((s, q) => s + q, 0);
      if (lineSum !== g.qty) lineQtys = g.qty > 0 ? [g.qty] : [];
      g.lines = alGridSliceSources(g.split, lineQtys);
      g.lotCount = g.lines.filter(l => l.qty > 0).length;
      g.lineCount = g.lines.length;
      return g;
    });
    return groups;
  }
  // Chia 1 nhóm theo thẻ CŨ NHẤT trước (date asc → createdAt asc → id)
  function alGridAllocCards(group, qty) {
    let left = Math.max(0, Math.floor(Number(qty) || 0));
    const alloc = {};
    (group.cards || []).forEach(c => {
      if (left <= 0) return;
      const take = Math.min(c.remaining, left);
      if (take > 0) { alloc[c.id] = take; left -= take; }
    });
    return { alloc, allocated: Math.max(0, Math.floor(Number(qty) || 0)) - left };
  }
  // Số ngày kể từ NGÀY CHỌN NAN đến NGÀY thanh hóa đang chọn (cảnh báo thẻ cũ)
  function alGridTodayDate() {
    const v = String((document.getElementById('al-date') || {}).value || '').trim();
    return v || new Date().toISOString().split('T')[0];
  }
  function alGridDaysOld(dateStr) {
    const a = String(dateStr || '').slice(0, 10);
    const b = String(alGridTodayDate()).slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(a) || !/^\d{4}-\d{2}-\d{2}$/.test(b)) return null;
    const da = Date.parse(a + 'T00:00:00');
    const db = Date.parse(b + 'T00:00:00');
    if (!Number.isFinite(da) || !Number.isFinite(db)) return null;
    return Math.floor((db - da) / 86400000);
  }
  function alGridStaleOf(card) {
    const d = alGridDaysOld(card && card.date);
    return (d != null && d > AL_GRID_STALE_DAYS) ? d : null;
  }

  function loadAlEntryMode() {
    if (alEntryModeLoaded) return alEntryMode;
    alEntryModeLoaded = true;
    try {
      const v = localStorage.getItem(AL_ENTRY_MODE_KEY);
      if (v === 'grid' || v === 'cards') alEntryMode = v;
    } catch (err) { /* trình duyệt chặn localStorage → dùng mặc định */ }
    return alEntryMode;
  }
  function saveAlEntryMode() {
    try { localStorage.setItem(AL_ENTRY_MODE_KEY, alEntryMode); } catch (err) { /* bỏ qua */ }
  }
  // Chế độ đang áp dụng thực tế (bảng chỉ cho Sấy 1, không áp Thanh Hóa Lại/Sấy 2)
  function alEntryModeOf() {
    if (alReworkOn()) return 'cards';
    if (alStageOf() !== 'say1') return 'cards';
    loadAlEntryMode();
    return alEntryMode === 'grid' ? 'grid' : 'cards';
  }
  // (Chuyển thẻ → bảng: dùng alGridDeriveGroupQtyFromPicks — gộp số theo nhóm,
  //  KHÔNG tự chia lại để giữ đúng thẻ người dùng đã chọn tay.)
  function setAlEntryMode(mode) {
    alEntryMode = (mode === 'cards') ? 'cards' : 'grid';
    alEntryModeLoaded = true;
    saveAlEntryMode();
    if (alEntryMode === 'grid') alGridDeriveGroupQtyFromPicks();
    syncAlEntryModeUi();
    // Chuyển về THẺ: vẽ lại danh sách thẻ để hiện đúng các thẻ đang chọn / số
    // lượng vừa gõ ở bảng (danh sách đã vẽ trước đó nên có thể đã cũ)
    if (alEntryMode === 'cards' && alEntryModeOf() === 'cards') {
      renderAlSourceList();
      syncAddLotSource();
      alRefreshSummary();
    }
    return alEntryMode;
  }
  // Đồng bộ giao diện theo chế độ: bật/tắt bảng + nút, ẩn nút/danh sách thẻ khi ở bảng
  function syncAlEntryModeUi() {
    const mode = alEntryModeOf();
    const form = document.getElementById('add-lot-form');
    if (form && form.classList) form.classList.toggle('al-mode-grid', mode === 'grid');
    const wrap = document.getElementById('al-grid-wrap');
    if (wrap) wrap.hidden = (mode !== 'grid');
    const gridBtn = (typeof document.querySelector === 'function')
      ? document.querySelector('#al-entry-mode [data-al-entry="grid"]') : null;
    if (gridBtn) gridBtn.disabled = (alStageOf() !== 'say1') || alReworkOn();
    if (typeof document.querySelectorAll === 'function') {
      document.querySelectorAll('#al-entry-mode [data-al-entry]').forEach(btn => {
        const on = btn.getAttribute('data-al-entry') === mode;
        if (btn.classList) btn.classList.toggle('active', on);
        btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
    }
    if (mode === 'grid') renderAlGrid();
    return mode;
  }
  function alOnEntryModeClick(e) {
    const t = e && e.target;
    const btn = (t && typeof t.closest === 'function') ? t.closest('[data-al-entry]') : null;
    if (!btn) return false;
    const mode = btn.getAttribute('data-al-entry');
    if (mode === 'grid' && ((alStageOf() !== 'say1') || alReworkOn())) {
      showToast('Bảng nhập nhanh chỉ dùng cho Sấy 1 (Sấy 2 chuyển nguyên lô; Thanh Hóa Lại chỉ đốt 1 lô Tóp).', 'info');
      return false;
    }
    setAlEntryMode(mode);
    return true;
  }
  // Gom thẻ nguồn theo NGÀY CHỌN NAN → chip lọc nhanh (người nhập biết đang xử lý
  // lô nan của ngày nào; hệ thống KHÔNG tự chọn giúp)
  function alGridDateBuckets() {
    const map = new Map();
    alCandidatesOf('say1').forEach(it => {
      const date = String(it.date || '').trim() || '—';
      const cur = map.get(date) || { date, count: 0, thanh: 0 };
      cur.count += 1;
      cur.thanh += nanCardRemainingOf(it);
      map.set(date, cur);
    });
    return [...map.values()].sort((a, b) => String(b.date).localeCompare(String(a.date)));
  }
  function alGridDimsOf(it) {
    const d = (it && Array.isArray(it.dims)) ? it.dims : [];
    return [Number(d[0]) || 0, Number(d[1]) || 0, Number(d[2]) || 0];
  }
  function alGridDateText(date) {
    const d = String(date || '').trim();
    if (!d || d === '—') return 'Không rõ ngày';
    return formatDateDDMMYY(d) || d;
  }
  // Các DÒNG của bảng = NHÓM theo Cỡ + Phân loại (17/10/2026).
  // Nhóm đã dùng hết (Còn lại = 0) ẩn khỏi bảng; nhóm còn tồn cộng cả thẻ đã
  // dùng hết vào Tồn báo cáo/Đã dùng để số liệu đầy đủ.
  function alGridDimsCmp(a, b) {
    return (b.dims[0] - a.dims[0]) || (b.dims[1] - a.dims[1]) || (b.dims[2] - a.dims[2]);
  }
  function alGridRows() {
    const q = alNorm(alGridSearchQ).trim();
    let groups = alGridAllGroupList();
    if (q) groups = groups.filter(g => g.cards.some(c => alSourceMatches(c.it, 'say1', q)));
    groups = groups.filter(g => g.remaining > 0);
    groups.sort((a, b) => {
      if (alGridSortMode === 'sizeAsc') {
        return (-alGridDimsCmp(a, b)) || (alGridClassOrder(a.clsRaw) - alGridClassOrder(b.clsRaw));
      }
      if (alGridSortMode === 'class') {
        return (alGridClassOrder(a.clsRaw) - alGridClassOrder(b.clsRaw)) || alGridDimsCmp(a, b);
      }
      return alGridDimsCmp(a, b) || (alGridClassOrder(a.clsRaw) - alGridClassOrder(b.clsRaw));
    });
    return groups;
  }
  // Tổng SL LÔ MỚI (theo NHÓM) — đọc từ alCardQty/alPicked để khớp lúc Lưu.
  function alRefreshGridFoot() {
    const foot = document.getElementById('al-grid-foot');
    const groups = alGridAllGroupList().filter(g => g.qty > 0);
    const lots = groups.reduce((n, g) => n + (g.lines || []).filter(l => l && l.qty > 0).length, 0);
    const qty = groups.reduce((s, g) => s + g.qty, 0);
    const vol = groups.reduce((s, g) => s + g.vol, 0);
    if (foot) {
      foot.textContent = groups.length
        ? `SL lô mới: ${lots} lô · ${groups.length} nhóm · ${qty.toLocaleString('vi-VN')} thanh · ${vol.toFixed(4)} m³`
        : 'Chưa nhập số lượng — gõ vào ô SL lô mới (ô trống = KHÔNG lấy)';
    }
    const countEl = document.getElementById('al-picked-count');
    if (countEl) {
      countEl.textContent = groups.length ? `${lots} lô · ${groups.length} nhóm` : 'Chưa chọn';
      countEl.classList.toggle('has-pick', groups.length > 0);
    }
    return { count: groups.length, lots, qty, vol };
  }
  // Khối ▸ chi tiết chia: ngày + nguồn + tồn/đã dùng/còn/lấy của TỪNG thẻ.
  // Chỉ hiện khi người dùng bấm ▸ — mặc định ẩn để bảng gọn trên điện thoại.
  function alGridSplitHtml(g) {
    if (!g) return '';
    const items = (g.cards || []).map(c => {
      const stale = alGridStaleOf(c);
      const took = c.alloc > 0;
      return `<div class="al-grid-split-item${took ? ' is-take' : ''}${stale != null ? ' is-stale' : ''}">
        <span class="al-grid-split-date">${escapeHTML(c.dateText)}${stale != null ? ` · <b>⚠ ${stale} ngày</b>` : ''}</span>
        <span class="al-grid-split-src">${escapeHTML(c.srcText)}</span>
        <span class="al-grid-split-nums">Tồn ${c.total.toLocaleString('vi-VN')} · Đã dùng ${c.used.toLocaleString('vi-VN')} · Còn ${c.remaining.toLocaleString('vi-VN')} · <b>Lấy ${c.alloc.toLocaleString('vi-VN')}</b></span>
      </div>`;
    }).join('');
    const lineItems = (g.lines || []).map((l, i) => ({ l, i }))
      .filter(x => x.l && x.l.qty > 0)
      .map(({ l, i }) => {
        const srcTxt = (l.sources || []).map(c => `${c.dateText}: ${(Number(c.alloc) || 0).toLocaleString('vi-VN')}`).join(' + ') || '—';
        return `<div class="al-grid-split-line"><b>Lô ${i + 1}</b> · ${l.qty.toLocaleString('vi-VN')} thanh → ${escapeHTML(srcTxt)}</div>`;
      }).join('');
    return `<div class="al-grid-split-lines">${lineItems}</div><div class="al-grid-split-list">${items || '<div class="al-grid-split-empty">— Không có thẻ —</div>'}</div>`;
  }
  function renderAlGrid() {
    if (alEntryModeOf() !== 'grid') return false;
    const rows = alGridRows();
    const datesEl = document.getElementById('al-grid-dates');
    const sumEl = document.getElementById('al-grid-dates-sum');
    if (sumEl) {
      sumEl.textContent = (alGridDates.length
        ? `Đang chọn ${alGridDates.length} ngày: ${alGridDates.map(d => alGridDateText(d)).join(' + ')}`
        : 'Tất cả ngày') + ` · ${rows.length} nhóm`;
    }
    if (datesEl) {
      const buckets = alGridDateBuckets();
      const allOn = alGridDates.length === 0;
      const all = `<button type="button" class="al-grid-date${allOn ? ' active' : ''}" data-al-grid-date="" aria-pressed="${allOn ? 'true' : 'false'}" title="Bỏ chọn mọi ngày — hiện tất cả thẻ còn tồn">Tất cả ngày</button>`;
      // Giữ vị trí CUỘN NGANG của dải chip (điện thoại) sau khi vẽ lại
      const prevScroll = Number(datesEl.scrollLeft) || 0;
      datesEl.innerHTML = all + buckets.map(b => {
        const on = alGridDateOn(b.date);
        return `<button type="button" class="al-grid-date${on ? ' active' : ''}" data-al-grid-date="${escapeHTML(b.date)}" aria-pressed="${on ? 'true' : 'false'}" title="Bấm để ${on ? 'BỎ CHỌN' : 'CHỌN'} ngày ${escapeHTML(alGridDateText(b.date))} — chọn được NHIỀU ngày, mỗi ngày ${b.count} thẻ · còn ${b.thanh.toLocaleString('vi-VN')} thanh">${on ? '✓ ' : ''}${escapeHTML(alGridDateText(b.date))} · ${b.count} thẻ</button>`;
      }).join('');
      if (prevScroll) datesEl.scrollLeft = prevScroll;
    }
    const body = document.getElementById('al-grid-body');
    if (!body) return false;
    if (!rows.length) {
      body.innerHTML = '<tr><td colspan="6" class="al-grid-empty">— Không có nhóm nào còn tồn khớp bộ lọc (kiểm tra ngày / ô tìm) —</td></tr>';
      alRefreshGridFoot();
      return true;
    }
    body.innerHTML = rows.map(g => {
      const key = escapeHTML(g.key);
      const staleTxt = g.stale.length
        ? `<span class="al-grid-warn" title="Thẻ được chia tự động đã quá ${AL_GRID_STALE_DAYS} ngày: ${g.stale.map(s => `${escapeHTML(alGridDateText(s.date))} (${s.days} ngày)`).join(' · ')}">⚠ ${g.stale.length} thẻ cũ</span>`
        : '';
      const splitTxt = g.split.length
        ? g.split.map(c => `${c.dateText}: ${c.alloc.toLocaleString('vi-VN')}`).join(' + ')
        : 'chưa nhập';
      const lines = (Array.isArray(g.lines) && g.lines.length) ? g.lines : [{ qty: 0, sources: [] }];
      const linesHtml = lines.map((ln, li) => {
        const last = li === lines.length - 1;
        const lineSplitTxt = (ln.sources && ln.sources.length)
          ? ln.sources.map(c => `${c.dateText}: ${c.alloc.toLocaleString('vi-VN')}`).join(' + ')
          : 'chưa chia';
        const lineTitle = `Lô ${li + 1}/${lines.length} của nhóm ${g.dimsText} · ${g.cls}. Chia thẻ CŨ NHẤT trước: ${lineSplitTxt}. Ô trống = không tạo lô.`;
        return `<div class="al-grid-line" data-al-grid-line="${key}" data-al-grid-line-idx="${li}">
          <input type="number" class="al-grid-qty" data-al-grid-line-qty="${key}" data-line-idx="${li}" min="0" max="${g.remaining}" step="1" inputmode="numeric"
            value="${ln.qty > 0 ? ln.qty : ''}" placeholder="${li === 0 ? `Tối đa ${g.remaining.toLocaleString('vi-VN')}` : 'SL lô mới'}"
            title="${escapeHTML(lineTitle)}">
          <span class="al-grid-mini">
            <button type="button" class="al-grid-btn" tabindex="-1" data-al-grid-line-all="${key}" data-line-idx="${li}" title="Lấy hết phần còn lại cho lô này">Hết</button>
            <button type="button" class="al-grid-btn" tabindex="-1" data-al-grid-line-clear="${key}" data-line-idx="${li}" title="Xóa lô này">Xóa</button>
            <button type="button" class="al-grid-btn al-grid-add-btn" tabindex="0" data-al-grid-add-line="${key}" data-line-idx="${li}" title="Thêm lô mới cùng cỡ + phân loại">+</button>
            ${last ? `<button type="button" class="al-grid-btn al-grid-expand-btn" tabindex="-1" data-al-grid-expand="${key}" title="Xem chia theo từng lô/thẻ (cũ nhất trước)">▸</button>` : ''}
          </span>
        </div>`;
      }).join('');
      const lotChip = g.lineCount > 1
        ? `<span class="al-grid-lots" title="Nhóm đang có ${g.lineCount} dòng lô — bấm + để thêm lô mới">${g.lineCount} lô</span>`
        : '';
      return `<tr data-al-grid-group="${key}" class="${g.qty > 0 ? 'picked' : ''}">
      <td data-col="size" data-label="Cỡ (mm)"><strong>${escapeHTML(g.dimsText)}</strong>${lotChip}${staleTxt}</td>
      <td data-col="cls" data-label="Phân loại"><span class="al-grid-cls">${escapeHTML(g.cls)}</span></td>
      <td data-col="total" data-label="Tồn báo cáo">${g.total.toLocaleString('vi-VN')}</td>
      <td data-col="used" data-label="Đã dùng">${g.used.toLocaleString('vi-VN')}</td>
      <td data-col="remain" data-label="Còn lại"><strong>${g.remaining.toLocaleString('vi-VN')}</strong></td>
      <td data-col="qty" data-label="SL lô mới">
        <div class="al-grid-lines">${linesHtml}</div>
      </td>
    </tr>${alGridExpand.has(g.key) ? `<tr class="al-grid-split-row" data-al-grid-split-row="${key}"><td colspan="6">${alGridSplitHtml(g)}</td></tr>` : ''}`;
    }).join('');
    alRefreshGridFoot();
    return true;
  }
  // Cập nhật chip cảnh báo ⚠ thẻ cũ NGAY khi gõ SL (không cần vẽ lại bảng)
  function alGridUpdateRowWarn(row, group) {
    if (!row || typeof row.querySelector !== 'function' || !group) return;
    const sizeCell = row.querySelector('[data-col="size"]');
    if (!sizeCell) return;
    let warn = (typeof sizeCell.querySelector === 'function') ? sizeCell.querySelector('.al-grid-warn') : null;
    if (!group.stale.length) {
      if (warn && typeof warn.remove === 'function') warn.remove();
      return;
    }
    const title = `Thẻ được chia tự động đã quá ${AL_GRID_STALE_DAYS} ngày: ${group.stale.map(s => `${alGridDateText(s.date)} (${s.days} ngày)`).join(' · ')}`;
    if (!warn) {
      warn = (typeof document.createElement === 'function') ? document.createElement('span') : null;
      if (!warn) return;
      warn.className = 'al-grid-warn';
      if (typeof sizeCell.appendChild === 'function') sizeCell.appendChild(warn);
    }
    warn.textContent = `⚠ ${group.stale.length} thẻ cũ`;
    if (typeof warn.setAttribute === 'function') warn.setAttribute('title', title);
  }
  // Áp toàn bộ dòng của 1 nhóm: chuẩn hoá số, chia lại thẻ FEFO cho TỔNG nhóm,
  // cập nhật alCardQty/alPicked + dòng cảnh báo/khối ▸ (không vẽ lại cả bảng).
  function alGridApplyGroupLines(groupKey, inputEl) {
    const key = String(groupKey || '');
    const group = alGridAllGroupList().find(g => g.key === key);
    if (!group) {
      delete alGridGroupLines[key];
      delete alGridGroupQty[key];
      return 0;
    }
    let lines = Array.isArray(alGridGroupLines[key]) && alGridGroupLines[key].length
      ? alGridGroupLines[key].map(q => Math.max(0, Math.floor(Number(q) || 0)))
      : [0];
    let left = group.remaining;
    lines = lines.map(q => {
      const v = Math.min(q, left);
      left -= v;
      return v;
    });
    alGridGroupLines[key] = lines;
    const total = lines.reduce((s, q) => s + q, 0);
    const ids = new Set(group.cards.map(c => c.id));
    alPicked = alPicked.filter(id => !ids.has(id));
    ids.forEach(id => { delete alCardQty[id]; });
    if (total > 0) {
      const { alloc } = alGridAllocCards(group, total);
      Object.keys(alloc).forEach(id => {
        const take = alloc[id];
        if (!(take > 0)) return;
        alCardQty[id] = take;
        if (!alPicked.includes(id)) alPicked.push(id);
      });
      alGridGroupQty[key] = total;
    } else {
      delete alGridGroupQty[key];
    }
    const row = (inputEl && typeof inputEl.closest === 'function')
      ? inputEl.closest('[data-al-grid-group]') : null;
    if (row && row.classList) row.classList.toggle('picked', total > 0);
    const after = alGridAllGroupList().find(g => g.key === key);
    if (after) alGridUpdateRowWarn(row, after);
    if (row && alGridExpand.has(key) && row.nextElementSibling &&
        typeof row.nextElementSibling.getAttribute === 'function' &&
        row.nextElementSibling.getAttribute('data-al-grid-split-row') === key) {
      row.nextElementSibling.innerHTML = `<td colspan="6">${alGridSplitHtml(after)}</td>`;
    }
    alRefreshGridFoot();
    alRefreshSummary();
    return total;
  }
  // Đặt SL cho NHÓM = 1 dòng (giữ tương thích chế độ Thẻ / test cũ)
  function alGridSetGroupQty(groupKey, value, inputEl) {
    const key = String(groupKey || '');
    const group = alGridAllGroupList().find(g => g.key === key);
    if (!group) return 0;
    let want = Math.floor(Number(String(value == null ? '' : value).replace(/[^\d]/g, '')) || 0);
    if (want > group.remaining) {
      want = group.remaining;
      if (inputEl && inputEl.value !== undefined) inputEl.value = String(want);
      showToast(`Nhóm ${group.dimsText} · ${group.cls} chỉ còn ${group.remaining.toLocaleString('vi-VN')} thanh — đã điều về tối đa!`, 'info');
    }
    alGridGroupLines[key] = [want];
    alGridApplyGroupLines(key, inputEl);
    return want;
  }
  function alGridLineIdxOf(el) {
    const v = (el && typeof el.getAttribute === 'function') ? el.getAttribute('data-line-idx') : '';
    const i = parseInt(v, 10);
    return Number.isFinite(i) && i >= 0 ? i : null;
  }
  function alGridEnsureLines(group) {
    if (!group) return [];
    if (!Array.isArray(alGridGroupLines[group.key]) || !alGridGroupLines[group.key].length) {
      alGridGroupLines[group.key] = [group.qty > 0 ? group.qty : 0];
    }
    return alGridGroupLines[group.key].slice();
  }
  // Thêm 1 DÒNG LÔ MỚI (mặc định SL 0) ngay sau dòng afterIdx
  function alGridAddGroupLine(groupKey, afterIdx) {
    const key = String(groupKey || '');
    const group = alGridAllGroupList().find(g => g.key === key);
    if (!group) return -1;
    const lines = alGridEnsureLines(group);
    const at = (afterIdx == null || !Number.isFinite(Number(afterIdx)))
      ? lines.length - 1
      : Math.max(-1, Math.min(Number(afterIdx), lines.length - 1));
    lines.splice(at + 1, 0, 0);
    alGridGroupLines[key] = lines;
    alGridApplyGroupLines(key);
    renderAlGrid();
    alGridFocusLine(key, at + 1);
    return at + 1;
  }
  function alGridSetLineQty(groupKey, idx, value, inputEl) {
    const key = String(groupKey || '');
    const group = alGridAllGroupList().find(g => g.key === key);
    if (!group) return 0;
    const lines = alGridEnsureLines(group);
    const i = Number(idx);
    if (!Number.isInteger(i) || i < 0 || i >= lines.length) return 0;
    let want = Math.floor(Number(String(value == null ? '' : value).replace(/[^\d]/g, '')) || 0);
    const other = lines.reduce((s, q, j) => s + (j === i ? 0 : q), 0);
    const cap = Math.max(0, group.remaining - other);
    if (want > cap) {
      want = cap;
      if (inputEl && inputEl.value !== undefined) inputEl.value = String(want);
      showToast(`Lô ${i + 1} của nhóm ${group.dimsText} · ${group.cls} chỉ còn tối đa ${cap.toLocaleString('vi-VN')} thanh — đã điều về tối đa!`, 'info');
    }
    lines[i] = want;
    alGridGroupLines[key] = lines;
    alGridApplyGroupLines(key, inputEl);
    return want;
  }
  function alGridFillLine(groupKey, idx) {
    const key = String(groupKey || '');
    const group = alGridAllGroupList().find(g => g.key === key);
    if (!group) return 0;
    const lines = alGridEnsureLines(group);
    const i = Number(idx);
    if (!Number.isInteger(i) || i < 0 || i >= lines.length) return 0;
    const other = lines.reduce((s, q, j) => s + (j === i ? 0 : q), 0);
    const cap = Math.max(0, group.remaining - other);
    lines[i] = cap;
    alGridGroupLines[key] = lines;
    alGridApplyGroupLines(key);
    renderAlGrid();
    alGridFocusLine(key, i);
    return cap;
  }
  function alGridRemoveGroupLine(groupKey, idx) {
    const key = String(groupKey || '');
    const group = alGridAllGroupList().find(g => g.key === key);
    if (!group) return false;
    const lines = alGridEnsureLines(group);
    const i = Number(idx);
    if (!Number.isInteger(i) || i < 0 || i >= lines.length) return false;
    if (lines.length <= 1) lines[0] = 0;
    else lines.splice(i, 1);
    alGridGroupLines[key] = lines;
    alGridApplyGroupLines(key);
    renderAlGrid();
    return true;
  }
  function alGridFocusLine(groupKey, idx) {
    if (typeof document === 'undefined' || typeof document.querySelectorAll !== 'function') return;
    const key = String(groupKey);
    const inputs = document.querySelectorAll('#al-grid-body input[data-al-grid-line-qty]');
    for (let i = 0; i < inputs.length; i++) {
      const el = inputs[i];
      if (!el || typeof el.getAttribute !== 'function') continue;
      if (String(el.getAttribute('data-al-grid-line-qty')) === key &&
          Number(el.getAttribute('data-line-idx')) === Number(idx)) {
        if (typeof el.focus === 'function') el.focus();
        if (typeof el.select === 'function') el.select();
        return;
      }
    }
  }

  // Chuyển từ chế độ THẺ sang BẢNG: cộng số đang có theo nhóm, KHÔNG tự chia lại
  // (giữ đúng các thẻ người dùng đã chọn tay); lần sửa nhóm kế tiếp mới chia FEFO.
  function alGridDeriveGroupQtyFromPicks() {
    alGridGroupQty = {};
    alGridGroupLines = {};
    // Thẻ chọn tay chưa có alCardQty → điền mặc định = phần còn lại
    alPicked.forEach(id => {
      const key = String(id);
      const rec = (state.xuong2ChonNanThoRecords || []).find(x => String(x.id || '') === key);
      if (!rec) return;
      // Nếu đang lọc ngày mà thẻ chọn tay thuộc ngày khác → BỔ SUNG ngày đó vào
      // bộ lọc để thẻ hiện trong bảng (không để thẻ bị ẩn mà vẫn được Lưu).
      if (alGridDates.length) {
        const d = alGridDateKeyOf(rec);
        if (d && !alGridDates.includes(d)) alGridDates.push(d);
      }
      if (Object.prototype.hasOwnProperty.call(alCardQty, key)) return;
      const cap = nanCardRemainingOf(rec);
      if (cap > 0) alCardQty[key] = cap;
    });
    const groups = alGridAllGroupList();
    groups.forEach(g => {
      const q = g.cards.reduce((s, c) => {
        const v = Math.max(0, Math.min(Number(alCardQty[c.id]) || 0, c.remaining));
        return s + v;
      }, 0);
      if (q > 0) { alGridGroupQty[g.key] = q; alGridGroupLines[g.key] = [q]; }
    });
    return alGridGroupQty;
  }
  function alOnGridQtyInput(e) {
    const t = e && e.target;
    if (!t || typeof t.getAttribute !== 'function') return 0;
    const lineKey = t.getAttribute('data-al-grid-line-qty');
    if (lineKey) {
      const idx = alGridLineIdxOf(t);
      if (idx == null) return 0;
      return alGridSetLineQty(lineKey, idx, t.value, t);
    }
    const key = t.getAttribute('data-al-grid-group-qty');
    if (!key) return 0;
    return alGridSetGroupQty(key, t.value, t);
  }
  function alOnGridClick(e) {
    const t = e && e.target;
    if (!t || typeof t.closest !== 'function') return false;
    // Thêm 1 DÒNG LÔ MỚI ngay dưới dòng vừa bấm
    const addLine = t.closest('[data-al-grid-add-line]');
    if (addLine) {
      alGridAddGroupLine(addLine.getAttribute('data-al-grid-add-line'), alGridLineIdxOf(addLine));
      return true;
    }
    // Hết / Xóa theo TỪNG LÔ
    const lineAll = t.closest('[data-al-grid-line-all]');
    if (lineAll) {
      alGridFillLine(lineAll.getAttribute('data-al-grid-line-all'), alGridLineIdxOf(lineAll));
      return true;
    }
    const lineClear = t.closest('[data-al-grid-line-clear]');
    if (lineClear) {
      alGridRemoveGroupLine(lineClear.getAttribute('data-al-grid-line-clear'), alGridLineIdxOf(lineClear));
      return true;
    }
    const allBtn = t.closest('[data-al-grid-group-all]');
    if (allBtn) {
      const key = allBtn.getAttribute('data-al-grid-group-all');
      const group = alGridAllGroupList().find(g => g.key === key);
      if (group) alGridSetGroupQty(key, group.remaining);
      renderAlGrid();
      return true;
    }
    const clearBtn = t.closest('[data-al-grid-group-clear]');
    if (clearBtn) {
      alGridSetGroupQty(clearBtn.getAttribute('data-al-grid-group-clear'), 0);
      renderAlGrid();
      return true;
    }
    const exp = t.closest('[data-al-grid-expand]');
    if (exp) {
      const key = exp.getAttribute('data-al-grid-expand');
      if (alGridExpand.has(key)) alGridExpand.delete(key); else alGridExpand.add(key);
      renderAlGrid();
      return true;
    }
    return false;
  }
  // Đổi ngày/bỏ ngày → chia lại toàn bộ DÒNG LÔ từ alGridGroupLines (FEFO) và điều số
  // vượt tồn về tối đa; giữ nguyên số dòng của từng nhóm. Không đụng ô tìm kiếm (nhóm bị ẩn vẫn giữ số).
  function alGridRebuildAllocations() {
    const groups = alGridAllGroupList();
    const byKey = new Map(groups.map(g => [g.key, g]));
    const nextPicked = [];
    const nextQty = {};
    const nextLines = {};
    let clamped = 0;
    const keys = new Set([...Object.keys(alGridGroupLines), ...Object.keys(alGridGroupQty)]);
    keys.forEach(key => {
      const group = byKey.get(key);
      if (!group) { clamped++; return; }
      let lines = Array.isArray(alGridGroupLines[key]) && alGridGroupLines[key].length
        ? alGridGroupLines[key].map(q => Math.max(0, Math.floor(Number(q) || 0)))
        : [Math.max(0, Math.floor(Number(alGridGroupQty[key]) || 0))];
      const before = lines.reduce((s, q) => s + q, 0);
      let left = group.remaining;
      lines = lines.map(q => {
        const v = Math.min(q, left);
        left -= v;
        return v;
      });
      const total = lines.reduce((s, q) => s + q, 0);
      if (total < before) clamped++;
      if (total <= 0) return;
      nextLines[key] = lines;
      const { alloc } = alGridAllocCards(group, total);
      Object.keys(alloc).forEach(id => {
        const take = alloc[id];
        if (!(take > 0)) return;
        nextQty[id] = take;
        if (!nextPicked.includes(id)) nextPicked.push(id);
      });
    });
    alGridGroupLines = nextLines;
    alGridGroupQty = {};
    Object.keys(nextLines).forEach(key => {
      const total = nextLines[key].reduce((s, q) => s + q, 0);
      if (total > 0) alGridGroupQty[key] = total;
    });
    alPicked = nextPicked;
    Object.keys(alCardQty).forEach(k => { delete alCardQty[k]; });
    Object.keys(nextQty).forEach(id => { alCardQty[id] = nextQty[id]; });
    if (clamped) showToast('Đã điều số lượng một số lô theo tồn của các ngày đang chọn.', 'info');
    alRefreshSummary();
    return clamped;
  }
  function alGridToggleHelp() {
    const box = document.getElementById('al-grid-help');
    if (!box) return false;
    box.hidden = !box.hidden;
    const btn = document.getElementById('al-grid-help-btn');
    if (btn) btn.setAttribute('aria-expanded', box.hidden ? 'false' : 'true');
    return !box.hidden;
  }
  function alGridCloseHelp() {
    const box = document.getElementById('al-grid-help');
    if (box) box.hidden = true;
    const btn = document.getElementById('al-grid-help-btn');
    if (btn) btn.setAttribute('aria-expanded', 'false');
    return false;
  }
  function alOnGridDateClick(e) {
    const t = e && e.target;
    const btn = (t && typeof t.closest === 'function') ? t.closest('[data-al-grid-date]') : null;
    if (!btn) return false;
    const val = String(btn.getAttribute('data-al-grid-date') || '').trim();
    // '' = "Tất cả ngày" → bỏ chọn hết; ngược lại BẬT/TẮT đúng ngày đó
    // (chọn được NHIỀU ngày: 14/10 còn tồn + 15/10 hôm nay).
    if (!val) alGridClearDates(); else alGridToggleDate(val);
    alGridRebuildAllocations();   // đổi ngày → chia lại nhóm theo ngày mới
    renderAlGrid();
    return true;
  }
  function alSetGridSearch(v) {
    alGridSearchQ = String(v == null ? '' : v);
    renderAlGrid();
    return alGridSearchQ;
  }
  function alSetGridSort(v) {
    alGridSortMode = (v === 'sizeAsc' || v === 'class') ? v : 'size';
    renderAlGrid();
    return alGridSortMode;
  }
  // Xóa bộ lọc riêng của bảng (đổi công đoạn / mở form mới)
  function alResetGridFilters() {
    alGridDates = [];
    alGridSearchQ = '';
    alGridSortMode = 'size';
    alGridGroupQty = {};
    alGridGroupLines = {};
    alGridExpand.clear();
    const s = document.getElementById('al-grid-search');
    if (s) s.value = '';
    const so = document.getElementById('al-grid-sort');
    if (so) so.value = 'size';
    alGridCloseHelp();
  }
  // Enter trong ô SL = XUỐNG Ô KẾ TIẾP (KHÔNG submit form tạo lô sớm);
  // Enter ở ô tìm = không submit. Tab tự nhiên đã nhảy sang ô SL dòng sau
  // (nút Hết/Xóa có tabindex="-1" nên không chặn đường Tab).
  function alOnGridKeydown(e) {
    const t = e && e.target;
    if (!t || e.key !== 'Enter') return false;
    // Nút Hết/Xóa/▸: để Enter kích hoạt nút như bình thường (không chặn)
    if (String(t.tagName || '').toUpperCase() === 'BUTTON') return false;
    // Enter trong ô của TỪNG LÔ → xuống ô lô kế tiếp (cùng nhóm hoặc nhóm sau)
    const lineKey = (typeof t.getAttribute === 'function') ? t.getAttribute('data-al-grid-line-qty') : '';
    if (lineKey) {
      if (e.preventDefault) e.preventDefault();
      if (typeof document.querySelectorAll !== 'function') return true;
      const inputs = document.querySelectorAll('#al-grid-body input[data-al-grid-line-qty]');
      let pos = -1;
      for (let i = 0; i < inputs.length; i++) { if (inputs[i] === t) { pos = i; break; } }
      const next = pos >= 0 ? inputs[pos + 1] : null;
      if (next && typeof next.focus === 'function') {
        next.focus();
        if (typeof next.select === 'function') next.select();
      } else if (typeof t.blur === 'function') {
        t.blur();
      }
      return true;
    }
    const key = (typeof t.getAttribute === 'function') ? t.getAttribute('data-al-grid-group-qty') : '';
    if (!key) {
      // Ô tìm kiếm / ô khác trong bảng: chặn submit ngoài ý muốn
      if (e.preventDefault) e.preventDefault();
      return true;
    }
    if (e.preventDefault) e.preventDefault();
    const rows = alGridRows();
    const idx = rows.findIndex(r => r.key === String(key));
    const next = idx >= 0 ? rows[idx + 1] : null;
    if (next && typeof document.querySelector === 'function') {
      const el = document.querySelector(`[data-al-grid-group-qty="${next.key}"]`);
      if (el && typeof el.focus === 'function') {
        el.focus();
        if (typeof el.select === 'function') el.select();
      }
    } else if (typeof t.blur === 'function') {
      t.blur();
    }
    return true;
  }
  function alGridQueryOf() {
    return { dates: alGridDates.slice(), date: alGridDates[0] || '', q: alGridSearchQ, sort: alGridSortMode };
  }

  // ═══ THAN HÓA LẠI (15/10/2026) — nguồn = lô TÓP đang ở Kho ═══
  // Ô tích #al-rework: danh sách nguồn chuyển sang lô TÓP (cờ topRework của form
  // Chuyển Kho) kèm Tồn/Tổng; nhập SỐ LƯỢNG lấy ra đốt lại (1 lần = 1 lô Tóp).
  // Tồn TÓP = tồn thực theo phiếu kho − phần topUsed ĐÃ ĐỐT LẠI (đọc sống).
  const alTopQty = {};   // id lô Tóp → số thanh đốt lại đang nhập
  function alReworkOn() { return !!(document.getElementById('al-rework') || {}).checked; }
  // Lô TÓP = lô ở Kho mang cờ topRework
  function alTopLots() { return (state.batches || []).filter(b => b && b.stage === 'kho' && b.topRework); }
  // Tồn còn lại của lô Tóp (tối đa số thanh được lấy ra đốt lại)
  // • Dữ liệu MỚI (17/10/2026): mỗi lần đốt lại đã tự sinh PHIẾU XUẤT (autoRework) nên
  //   tồn kho đã trừ phần đó — KHÔNG trừ topUsed lần nữa.
  // • Dữ liệu CŨ (chưa có phiếu tự động): vẫn trừ topUsed như trước để không bị phồng.
  function alTopRemainingOf(b) {
    if (!b) return 0;
    const used = Number(b.topUsed) || 0;
    const hasAuto = (state.khoNotes || []).some(n => n && n.type === 'xuat' && n.autoRework
      && (Array.isArray(n.lots) ? n.lots : []).some(l => l && String(l.batchId || '') === String(b.id)));
    return Math.max(0, Math.floor((Number(khoLotRemainingOf(b)) || 0) - (hasAuto ? 0 : used)));
  }
  // Số lượng đốt lại hợp lệ đang nhập cho 1 lô (mặc định = tồn; CHẶN vượt tồn)
  function alReworkQtyOf(id) {
    const b = (state.batches || []).find(x => String(x.id || '') === String(id));
    if (!b) return 0;
    const cap = alTopRemainingOf(b);
    const v = Math.floor(Number(alTopQty[String(id)]));
    return v > 0 ? Math.min(v, cap) : cap;
  }
  // Lô TÓP duy nhất đang chọn (Than Hóa Lại = mỗi lần chỉ chọn 1 lô)
  function alTopPicked() {
    const id = alPicked[0];
    if (id == null || id === '') return null;
    return (state.batches || []).find(x => String(x.id || '') === String(id)) || null;
  }
  // Đồng bộ ô NHẬP SỐ LƯỢNG ĐỐT LẠI (ẩn khi chưa bật/tích chọn; placeholder = tồn)
  function alSyncReworkQtyField() {
    const g = document.getElementById('al-rework-qty-group');
    const inp = document.getElementById('al-rework-qty');
    if (!g) return false;
    const on = alReworkOn();
    g.hidden = !on;
    if (!on || !inp) { if (inp) inp.value = ''; return false; }
    const b = alTopPicked();
    if (!b) { inp.value = ''; inp.max = '1'; inp.placeholder = 'Chọn 1 lô Tóp trước'; return false; }
    const cap = alTopRemainingOf(b);
    inp.max = String(Math.max(1, cap));
    inp.placeholder = `Tối đa ${cap.toLocaleString('vi-VN')} thanh (tồn lô)`;
    if (document.activeElement !== inp) inp.value = String(alReworkQtyOf(b.id) || '');
    return true;
  }
  // Ô NHẬP SỐ LƯỢNG đốt lại — clamp về tồn lô khi nhập vượt
  function alOnReworkQtyInput() {
    const inp = document.getElementById('al-rework-qty');
    const b = alTopPicked();
    if (!inp || !b) return 0;
    const cap = alTopRemainingOf(b);
    let v = Math.floor(Number(String(inp.value == null ? '' : inp.value).replace(/[^\d]/g, '')) || 0);
    if (v > cap) { v = cap; inp.value = String(v); }   // chặn vượt tồn (tự điều về tối đa)
    if (v > 0) alTopQty[String(b.id)] = v; else delete alTopQty[String(b.id)];
    syncAddLotSource();
    alRefreshSummary();
    return v;
  }
  // Bật/tắt ô TÍCH THAN HÓA LẠI → đổi nguồn + hiện ô nhập số lượng
  function alSetRework(on) {
    const cb = document.getElementById('al-rework');
    if (cb) cb.checked = !!on;
    syncAddLotUI();   // reset chọn + vẽ lại danh sách theo chế độ mới
    return !!on;
  }
  // Danh sách nguồn ở chế độ THAN HÓA LẠI: lô TÓP + Tồn/Tổng (1 cột, dễ bấm)
  function renderAlTopList(listEl) {
    listEl.classList.add('is-top');
    const stage = alStageOf();
    const items = alTopLots().filter(it =>
      alSourceMatches(it, stage, alSourceQuery) &&
      alSourceQtyMatches(it, stage, alSourceQtyQuery));
    if (!items.length) {
      listEl.innerHTML = '<div class="al-empty">— Không có lô TÓP nào đang ở Kho — (chuyển lô Tóp vào Kho ở form Chuyển Kho trước)</div>';
      return;
    }
    listEl.innerHTML = items.map(it => {
      const id = String(it.id);
      const on = alPicked.includes(id);
      const cap = alTopRemainingOf(it);
      const lines = alCardLines(it, 'say2');
      const main = `${it.location || '—'} · ${it.length}×${it.width}×${it.thickness} · ${it.bambooType || '—'} · Tồn ${cap.toLocaleString('vi-VN')} / ${(Number(it.quantity) || 0).toLocaleString('vi-VN')} thanh`;
      return `<button type="button" class="al-card${on ? ' picked' : ''}" data-al-pick="${escapeHTML(id)}" aria-pressed="${on ? 'true' : 'false'}" title="Lô TÓP ở Kho — Tồn ${cap.toLocaleString('vi-VN')} thanh. Bấm để chọn đốt lại">
        <span class="al-card-body">
          <span class="al-card-main">${escapeHTML(main)}</span>
          <span class="al-card-sub"><span class="al-use-tag use-khac" title="Lô TÓP — chờ xử lý lại">♻️ Tóp</span> ${lines.subHtml}</span>
        </span>
      </button>`;
    }).join('');
  }
  // ─── BOTTOM-SHEET CỦA FORM "THÊM LÔ SẤY MỚI" (15/10/2026) ─────
  // Màn chính chỉ có dòng TÓM TẮT; bấm dòng ②/③ → mở TẤM TRƯỢT từ dưới lên
  //   .al-sheet  → khung phủ (scrim + card trượt)
  //   .al-sheet-card → tấm trắng chứa ô nhập
  // Đóng bằng nút "Xong" (data-al-sheet-close) hoặc chạm NỀN MỜ (.al-sheet-scrim).
  // Danh sách dài (thẻ nguồn) nằm TRONG tấm trượt ⇒ KHÔNG đẩy/che khối khác.
  const AL_SHEETS = { src: 'al-sheet-src', loc: 'al-sheet-loc' };
  function alOpenSheet(name) {
    const id = AL_SHEETS[String(name || '')];
    if (!id) return false;
    // Đóng các tấm còn lại (mỗi lúc chỉ 1 tấm mở — không chồng nhau)
    Object.keys(AL_SHEETS).forEach(k => {
      const el = document.getElementById(AL_SHEETS[k]);
      if (el) el.hidden = (k !== name);
    });
    const sheet = document.getElementById(id);
    if (!sheet) return false;
    sheet.hidden = false;
    // Dòng tóm tắt tương ứng: đánh dấu đang mở
    document.querySelectorAll('#add-lot-form .al-sum-row').forEach(b => {
      const on = b.getAttribute('data-al-sheet') === String(name);
      b.classList.toggle('is-open', on);
      b.setAttribute('aria-expanded', on ? 'true' : 'false');
    });
    if (name === 'src') {
      renderAlSourceList();
      // Mở tấm nguồn → hiện luôn danh sách (bỏ 1 bước bấm)
      const panel = document.getElementById('al-source-panel');
      if (panel) panel.hidden = false;
      alPositionSourcePanel();
      syncAlEntryModeUi();   // bảng nhập nhanh: vẽ lại theo dữ liệu mới nhất
    }
    if (name === 'loc') {
      // Mở tấm Vị trí → LUÔN hiện panel chips (alToggleSourcePanel có thể đã ẩn nó)
      const locPanel = document.getElementById('al-location-panel');
      if (locPanel) locPanel.hidden = false;
      renderAlLocationChips();
      renderAlLocationBtn();
    }
    initLucide();
    return true;
  }
  function alCloseSheet() {
    Object.keys(AL_SHEETS).forEach(k => {
      const el = document.getElementById(AL_SHEETS[k]);
      if (el) el.hidden = true;
    });
    // Đóng luôn dropdown nguồn nổi (nếu đang mở) để lần sau mở lại sạch
    const panel = document.getElementById('al-source-panel');
    if (panel) panel.hidden = true;
    document.querySelectorAll('#add-lot-form .al-sum-row').forEach(b => {
      b.classList.remove('is-open');
      b.setAttribute('aria-expanded', 'false');
    });
    return true;
  }
  function alOnSheetClick(e) {
    const t = e && e.target;
    if (!t || typeof t.closest !== 'function') return false;
    // Bấm nền mờ / nút Xong → đóng tấm
    if (t.closest('[data-al-sheet-close]')) { alCloseSheet(); return true; }
    // Bấm 1 dòng tóm tắt → mở tấm tương ứng
    const row = t.closest('[data-al-sheet]');
    if (row) { alOpenSheet(row.getAttribute('data-al-sheet')); return true; }
    return false;
  }
  // Cập nhật 2 DÒNG TÓM TẮT + CHÂN FORM DÍNH (số nguồn/thanh + vị trí)
  function alRefreshSummary() {
    const srcEl = document.getElementById('al-sum-src');
    const locEl = document.getElementById('al-sum-loc');
    const footEl = document.getElementById('al-foot-sum');
    const n = alPicked.length;
    let qty = 0;
    if (n) {
      const picked = alCandidatesOf(alStageOf()).filter(it => alPicked.includes(String(it.id)));
      qty = picked.reduce((s, it) => {
        // Sấy 2: tồn thực của lô ở Kho · Sấy 1: SỐ LƯỢNG đang nhập cho từng thẻ nan
        // (mặc định = phần còn lại, có thể nhập nhỏ hơn để chia nhiều lô)
        const q = (alStageOf() === 'say2')
          ? (Math.round(khoLotRemainingOf(it)) || 0)
          : alCardQtyOf(it.id);
        return s + q;
      }, 0);
    }
    const srcTxt = n
      ? `${n} ${alEntryModeOf() === 'grid' ? 'thẻ' : 'nguồn'} · ${qty.toLocaleString('vi-VN')} thanh`
      : (alReworkOn() ? 'Chế độ Than Hóa Lại — chưa chọn lô Tóp' : 'Chưa chọn nguồn');
    const locTxt = alLocation || 'Chưa chọn vị trí';
    if (srcEl) srcEl.textContent = srcTxt;
    if (locEl) locEl.textContent = locTxt;
    if (footEl) footEl.textContent = `${srcTxt} · ${locTxt}`;
    return true;
  }

  // Đóng 2 danh sách mở rộng (nguồn + vị trí)
  function alClosePanels() {
    const src = document.getElementById('al-source-panel');
    if (src) src.hidden = true;
    const loc = document.getElementById('al-location-panel');
    // Panel inline (thêm class .al-loc-inline) — KHÔNG ẩn, thậm chí TỰ MỞ lại
    // (chips hiện trực tiếp trên form — không cần bấm nút Chọn Vị Trí).
    if (loc) {
      if (loc.classList.contains('al-loc-inline')) loc.hidden = false;
      else loc.hidden = true;
    }
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
    if (textEl) textEl.textContent = alReworkOn() ? 'Chọn Lô Tóp Ở Kho'
      : (stage === 'say2' ? 'Chọn Lô Ở Kho' : 'Chọn Lô Nan');
    if (hidden) hidden.value = alPicked.join(',');
    if (countEl) {
      countEl.textContent = alPicked.length ? `${alPicked.length} đã chọn` : 'Chưa chọn';
      countEl.classList.toggle('has-pick', alPicked.length > 0);
    }
    if (!listEl) return;
    // ── CHẾ ĐỘ THAN HÓA LẠI: nguồn = lô TÓP ở Kho (Tồn/Tổng) ──
    if (alReworkOn()) { renderAlTopList(listEl); initLucide(); alPositionSourcePanel(); return; }
    listEl.classList.remove('is-top');
    const items = alCandidatesOf(stage);
    if (!items.length) {
      listEl.innerHTML = `<div class="al-empty">${stage === 'say2'
        ? '— Không có lô nào còn hàng ở Kho (lô đã xuất hết không hiện ở đây — kiểm tra thẻ Kho Nan) —'
        : '— Không có thẻ nan nào chờ sấy (ghi lượt ở thẻ Chọn Nan Thô trước) —'}</div>`;
      alPositionSourcePanel();
      return;
    }
    // 2 Ô TÌM KẾT HỢP (điều kiện VÀ): ô tìm nhanh (vị trí/mã/kích thước/loại/…) 
    // + ô tìm THEO SỐ LƯỢNG — thẻ phải khớp CẢ HAI mới được hiển thị
    const visible = items.filter(it =>
      alSourceMatches(it, stage, alSourceQuery) &&
      alSourceQtyMatches(it, stage, alSourceQtyQuery));
    if (!visible.length) {
      const keys = [alSourceQuery.trim(), alSourceQtyQuery.trim()].filter(Boolean).join(' · ');
      listEl.innerHTML = `<div class="al-empty">Không có thẻ/lô nào khớp "${escapeHTML(keys)}"</div>`;
      alPositionSourcePanel();
      return;
    }
    listEl.innerHTML = visible.map(it => {
      const id  = String(it.id);
      const on  = alPicked.includes(id);
      const lines = alCardLines(it, stage);
      return `<button type="button" class="al-card${on ? ' picked' : ''}" data-al-pick="${escapeHTML(id)}" aria-pressed="${on ? 'true' : 'false'}" title="${escapeHTML(lines.sub)}">
        <span class="al-card-body">
          <span class="al-card-main">${escapeHTML(lines.main)}</span>
          <span class="al-card-sub">${lines.subHtml}</span>
        </span>
      </button>`;
    }).join('');
    initLucide();
    alPositionSourcePanel();
  }

  // Chọn / bỏ chọn 1 nguồn
  function alTogglePick(id) {
    const key = String(id || '');
    if (!key) return alPicked.slice();
    if (alReworkOn()) {
      // THAN HÓA LẠI: mỗi lần chỉ chọn 1 lô Tóp — bấm thẻ đang chọn = bỏ chọn
      alPicked = alPicked.includes(key) ? [] : [key];
      renderAlSourceList();
      syncAddLotSource();
      alRefreshSummary();
      return alPicked.slice();
    }
    alPicked = alPicked.includes(key) ? alPicked.filter(x => x !== key) : [...alPicked, key];
    if (!alPicked.includes(key)) delete alCardQty[key];   // bỏ chọn → quên số lượng đã nhập của thẻ
    renderAlSourceList();
    if (alEntryModeOf() === 'grid') renderAlGrid();
    syncAddLotSource();
    alRefreshSummary();
    return alPicked.slice();
  }
  // Chọn TẤT CẢ nguồn khả dụng / bỏ chọn hết
  function alPickAll() {
    if (alReworkOn()) {
      // THAN HÓA LẠI: chỉ chọn được 1 lô → lấy lô Tóp đầu tiên
      const tops = alTopLots();
      alPicked = tops.length ? [String(tops[0].id)] : [];
      renderAlSourceList();
      syncAddLotSource();
      return alPicked.slice();
    }
    alPicked = alCandidatesOf(alStageOf()).map(it => String(it.id));
    if (alEntryModeOf() === 'grid') alGridDeriveGroupQtyFromPicks();
    renderAlSourceList();
    if (alEntryModeOf() === 'grid') renderAlGrid();
    syncAddLotSource();
    return alPicked.slice();
  }
  function alClearPicks() {
    alPicked = [];
    alGridGroupQty = {};
    alGridGroupLines = {};
    Object.keys(alCardQty).forEach(k => { delete alCardQty[k]; });   // quên số lượng đã nhập
    renderAlSourceList();
    if (alEntryModeOf() === 'grid') renderAlGrid();
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
      // 2 khối chọn SONG SONG (Nguồn ⇄ Vị Trí): mở khối này thì đóng khối kia
      // để form luôn gọn — không đẩy modal cao thêm thành phải cuộn dọc
      const locPanel = document.getElementById('al-location-panel');
      if (locPanel && !locPanel.hidden) locPanel.hidden = true;
      renderAlSourceList();
      alPositionSourcePanel();
      // Điện thoại: modal tự cuộn tới nút để thấy ngay danh sách thẻ vừa mở
      if (btn && typeof btn.scrollIntoView === 'function') {
        try { btn.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (e) { /* bỏ qua */ }
      }
    }
    return !panel.hidden;
  }

  // ─── DROPDOWN NỔI CỦA DANH SÁCH NGUỒN (04/10/2026) ─────────────
  // Danh sách nguồn KHÔNG nằm trong luồng form: thả nổi TOÀN BỀ RỘNG
  // MÀN HÌNH ĐANG XEM (CSS #al-source-panel position:fixed left/right 8px),
  // cao tối đa 5 DÒNG THẺ (đo thật — quá thì danh sách tự cuộn), mở DƯỚI
  // nút chọn; hết chỗ phía dưới thì mở NGƯỢC LÊN (kẹp trong khung nhìn).
  const AL_DROP_MAX_ROWS = 5;   // tối đa 5 dòng thẻ
  const AL_DROP_ROW_GAP  = 6;   // khe hở giữa các dòng (.al-card-list gap)
  const AL_DROP_PAD      = 8;   // lề an toàn quanh mép màn hình
  // Đo 1 dòng thẻ → max-height = 5 dòng + 4 khe (danh sách tự cuộn khi quá)
  function alApplySourceListRowCap(listEl) {
    if (!listEl || !listEl.style) return;
    let rowH = 0;
    try {
      const cards = (typeof listEl.querySelectorAll === 'function') ? listEl.querySelectorAll('.al-card') : [];
      Array.prototype.forEach.call(cards || [], (c) => {
        const h = Number(c && c.offsetHeight) || 0;
        if (h > rowH) rowH = h;
      });
    } catch (e) { /* môi trường test Node không có layout → giữ max-height của CSS */ }
    listEl.style.maxHeight = rowH
      ? (AL_DROP_MAX_ROWS * rowH + (AL_DROP_MAX_ROWS - 1) * AL_DROP_ROW_GAP) + 'px'
      : '';
  }
  // Neo dropdown nổi (gọi sau MỖI lần vẽ danh sách + khi cuộn / đổi cỡ màn hình)
  function alPositionSourcePanel() {
    const panel = document.getElementById('al-source-panel');
    if (!panel || panel.hidden || !panel.style) return false;
    // BOTTOM-SHEET: panel nằm TRONG tấm trượt → hiển thị INLINE (CSS ghi đè),
    // không cần neo toạ độ theo nút; danh sách cuộn trong .al-sheet-body.
    if (typeof panel.closest === 'function' && panel.closest('.al-sheet')) {
      alApplySourceListRowCap(document.getElementById('al-source-list'));
      return true;
    }
    alApplySourceListRowCap(document.getElementById('al-source-list'));
    const btn = document.getElementById('al-source-btn');
    const doc = document.documentElement;
    const vw = Number(doc && doc.clientWidth) || 0;
    const vh = Number(doc && doc.clientHeight) || 0;
    if (!vw || !vh || !btn || typeof btn.getBoundingClientRect !== 'function') return false;
    const r = btn.getBoundingClientRect();
    if (!r || typeof r.bottom !== 'number') return false;
    const h = Number(panel.offsetHeight) || 0;
    let top = r.bottom + 6;                       // mở ngay DƯỚI nút chọn
    if (h && top + h > vh - AL_DROP_PAD) {        // hết chỗ dưới → mở ngược lên
      const up = r.top - 6 - h;
      top = up >= AL_DROP_PAD ? up : Math.max(AL_DROP_PAD, vh - AL_DROP_PAD - h);
    }
    panel.style.top = Math.round(top) + 'px';
    return true;
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
  // Chọn 1 vị trí (từ chip) → ghi vào ô ẩn + đổi nhãn nút.
  // CHỈ đóng panel khi nó đang ở chế độ dropdown (hidden từ đầu).
  // Panel inline (hiện trực tiếp, thêm class .al-loc-inline) KHÔNG đóng —
  // form Thêm Lô Sấy Mới mới gọn 1 tầng chip.
  function alSetLocation(name) {
    alLocation = String(name || '').trim();
    const input = document.getElementById('al-location');
    if (input) input.value = alLocation;
    renderAlLocationBtn();
    renderAlLocationChips();
    const panel = document.getElementById('al-location-panel');
    if (panel && !panel.classList.contains('al-loc-inline')) panel.hidden = true;
    alRefreshSummary();   // dòng tóm tắt ③ + chân form dính
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
    if (!panel.hidden) {
      // mở Vị Trí thì đóng khối chọn Nguồn — cùng lúc chỉ 1 danh sách mở (form gọn)
      const srcPanel = document.getElementById('al-source-panel');
      if (srcPanel && !srcPanel.hidden) {
        srcPanel.hidden = true;
        const srcBtn = document.getElementById('al-source-btn');
        if (srcBtn) srcBtn.setAttribute('aria-expanded', 'false');
      }
      renderAlLocationChips();
    }
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

  function openAddLotModal(preset) {
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
    // preset = { stage, location } (tùy chọn) — dùng khi mở từ BẢNG ĐIỀU KHIỂN
    // LÒ SẤY (js/kiln.js): công đoạn + vị trí đã điền sẵn; không truyền = như cũ
    if (stageEl) stageEl.value = (preset && preset.stage === 'say2') ? 'say2' : 'say1';
    const useForEl = document.getElementById('al-use-for');
    if (useForEl) useForEl.value = 'Ván';   // mặc định Ván cho lô mới
    syncAddLotUI();
    if (preset && preset.location) alSetLocation(String(preset.location).trim());
    modal.classList.add('show');
    initLucide();
  }

  function closeAddLotModal() {
    document.getElementById('modal-add-lot')?.classList.remove('show');
    alCloseSheet();     // đóng tấm trượt (nếu đang mở) — lần sau mở form lại sạch
    alClosePanels();
  }

  // Đổi Công đoạn → nạp danh sách NGUỒN tương ứng (bỏ chọn nguồn của công đoạn cũ)
  function syncAddLotUI() {
    alPicked = [];
    alClearSourceQuery();
    alResetGridFilters();          // bộ lọc riêng của BẢNG NHẬP NHANH (ngày/tìm)
    alClosePanels();
    // Reset trạng thái THAN HÓA LẠI (ô nhập số lượng theo lại chọn mới)
    Object.keys(alTopQty).forEach(k => { delete alTopQty[k]; });
    // Reset SỐ LƯỢNG đã nhập cho từng thẻ nan (Sấy 1) — mặc định lại = phần còn lại
    Object.keys(alCardQty).forEach(k => { delete alCardQty[k]; });
    const input = document.getElementById('al-location');
    if (input) input.value = alLocation;
    renderAlLocationBtn();
    renderAlLocationChips();
    renderAlSourceList();
    renderAlChargeOptions();      // Ô LẦN THAN HÓA theo đúng (Ngày + Công đoạn)
    syncAlShiftField();           // Ô CA (Giai đoạn 2): hiện khi Xưởng 2 để "Làm ca" + gợi ý ca
    syncAddLotSource();
    alRefreshSummary();           // 2 dòng tóm tắt + chân form dính
    syncAlEntryModeUi();          // CÁCH NHẬP (thẻ ⇄ bảng): bảng chỉ bật cho Sấy 1
  }

  // ── Ô CHỌN LẦN THAN HÓA (15/10/2026) — gộp lô vào LẦN ĐÃ CÓ ──
  // Chỉ CHỌN ĐƯỢC các lần có MÃ MẺ (từ lượt Lưu) của đúng (Ngày + Công đoạn);
  // lần điền tay/gộp cũ hiện MỜ + disabled (ghép bằng ô "Số lần TH" ở bảng thống kê).
  function renderAlChargeOptions() {
    const sel = document.getElementById('al-charge');
    if (!sel) return false;
    const stage = alStageOf();
    const dateVal = (document.getElementById('al-date') || {}).value || '';
    const prev = sel.value;
    let html = '<option value="">✨ Lần mới (tự sinh)</option>';
    if (dateVal) {
      let charges = [];
      try { charges = sayBuildCharges(dateVal, stage) || []; } catch (err) { charges = []; }
      const stageKey = stage === 'say2' ? 'say2' : 'say1';
      charges.forEach((c, i) => {
        const vol = (Number(c.vol) || 0).toFixed(3);
        const marks = (c.lots || []).map(l => {
          const b = (state.batches || []).find(x => String(x.id || '') === String(l.id));
          return b && b.sayCharges ? (Number(b.sayCharges[stageKey]) || 0) : 0;
        });
        const mark = marks.length && marks.every(m => m > 0 && m === marks[0]) ? marks[0] : 0;
        if (mark) html += `<option value="${mark}">Lần ${i + 1} · ${vol} m³ · theo lượt lưu</option>`;
        else html += `<option value="" disabled>Lần ${i + 1} · ${vol} m³ · gộp tay (không chọn)</option>`;
      });
    }
    sel.innerHTML = html;
    // Giữ lựa chọn cũ CHỈ khi lần đó vẫn còn trong danh sách; không có → về "Lần mới"
    if (prev && html.includes(`value="${prev}"`)) sel.value = prev;
    else sel.value = '';
    syncAlShiftField();           // Ô CA: gợi ý ca theo ngày + công đoạn đang chọn
    return true;
  }
  // Mã mẻ của lần đang chọn ở ô #al-charge (0 = "Lần mới (tự sinh)")
  function alChargeMarkOf() {
    const v = Number(String((document.getElementById('al-charge') || {}).value || '').trim());
    return Number.isFinite(v) && v > 0 ? v : 0;
  }

  // Chi tiết NGUỒN đang chọn (chọn nhiều → liệt kê từng nguồn) + số lượng sẽ tạo lô
  function syncAddLotSource() {
    const stage = alStageOf();
    const hintEl = document.getElementById('al-source-hint');
    const info = document.getElementById('al-source-info');
    if (hintEl) hintEl.textContent = alReworkOn()
      ? 'Chế độ THAN HÓA LẠI — chọn 1 lô Tóp ở Kho, nhập số lượng lấy ra đốt lại (tối đa tồn lô).'
      : (stage === 'say2'
        ? 'Chọn 1 hoặc NHIỀU lô đang ở Kho → chuyển sang Sấy 2 (áp dụng Dùng Cho đã chọn cho mọi lô).'
        : 'Nguồn: công đoạn Chọn Nan Thô — mỗi thẻ là 1 cỡ nan của 1 ngày chọn (Kích thước · Phân loại · Ngày chọn · Tồn/Tổng). Chọn thẻ rồi NHẬP SỐ LƯỢNG tạo lô (mặc định = phần còn lại — nhập nhỏ hơn để chia thành nhiều lô sấy).');
    if (!info) return;
    // ── CHẾ ĐỘ THAN HÓA LẠI: hiện lô Tóp + Tồn + số lượng đốt lại ──
    if (alReworkOn()) {
      const b = alTopPicked();
      if (!b) {
        info.innerHTML = '<span class="al-warn">Chưa chọn lô Tóp — bấm 1 thẻ lô Tóp trong danh sách (mỗi lần đốt lại chọn 1 lô).</span>';
        alSyncReworkQtyField();
        return;
      }
      const cap = alTopRemainingOf(b);
      const take = alReworkQtyOf(b.id);
      const dateVal = (document.getElementById('al-date') || {}).value || '';
      info.innerHTML = `<span><span class="al-k">Lô Tóp:</span><strong>${escapeHTML(b.code || '—')}</strong>
        <span class="al-k">· ${escapeHTML(b.location || '—')} · ${b.length} × ${b.width} × ${b.thickness} mm · ${escapeHTML(b.bambooType || '—')} · Tồn ${cap.toLocaleString('vi-VN')} / ${(Number(b.quantity) || 0).toLocaleString('vi-VN')} thanh</span></span>
        <span><span class="al-k">Đốt lại:</span><strong>${take.toLocaleString('vi-VN')} thanh</strong>
        <span class="al-k">→ ${stage === 'say2' ? 'Sấy 2' : 'Sấy 1'} · ${escapeHTML(dateVal)}</span></span>`;
      alSyncReworkQtyField();
      return;
    }
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
      // SẤY 1 — mỗi thẻ nan 1 DÒNG có Ô NHẬP SỐ LƯỢNG TẠO LÔ (mặc định = tồn còn
      // lại; nhập nhỏ hơn để chia 1 thẻ thành nhiều lô sấy — 16/10/2026)
      const d = Array.isArray(it.dims) ? it.dims : [];
      const total = Number(it.quantity) || 0;
      const used = nanCardUsedOf(it.id);
      const cap = nanCardRemainingOf(it);
      const qty = alCardQtyOf(it.id);
      const vol = calculateVolume(d[0] || 0, d[1] || 0, d[2] || 0, qty);
      return `<span class="al-qty-row" data-al-qty-row="${escapeHTML(it.id)}">
        <span class="al-qty-head"><span class="al-k">Thẻ:</span><strong>${d[0] || '?'} × ${d[1] || '?'} × ${d[2] || '?'} mm</strong>
        <span class="al-k">· ${escapeHTML(nanClassLabelOf(it.cls))} · Chọn nan ${formatDateDDMMYY(it.date)} · Tồn ${cap.toLocaleString('vi-VN')}/${total.toLocaleString('vi-VN')}${used > 0 ? ` (đã dùng ${used.toLocaleString('vi-VN')})` : ''}${it.external ? ' · nan nhập ngoài công đoạn' : ' · từ lô bào thô'}</span></span>
        <span class="al-qty-line"><span class="al-k">Tạo lô:</span>
        <input type="number" class="al-qty-input" data-al-qty="${escapeHTML(it.id)}" min="1" max="${Math.max(1, cap)}" step="1" inputmode="numeric"
          value="${qty > 0 ? qty : ''}" placeholder="Tối đa ${cap.toLocaleString('vi-VN')}"
          title="Số thanh tạo lô Sấy 1 — mặc định = phần CÒN LẠI của thẻ (${cap.toLocaleString('vi-VN')} thanh); nhập nhỏ hơn để chia thành nhiều lô sấy.">
        <span class="al-k">thanh · <span data-al-vol>${vol.toFixed(4)}</span> m³</span></span>
      </span>`;
    }).join('');
  }

  // Lưu form "Thêm Lô Sấy Mới" — tạo lô cho TẤT CẢ nguồn đã chọn (chọn nhiều).
  // MỖI LƯỢT bấm "Lưu" = 1 LẦN than hóa: gắn MÃ MẺ (sayCharges.<công đoạn> = mốc
  // thời gian lưu) lên MỌI lô của lượt lưu — bảng thống kê than hóa chia lần theo
  // mã mẻ này (xem SAY_NO_AUTO_FROM trong js/xuong2.js).
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
    // MÃ MẺ: nếu chọn 1 LẦN THAN HÓA ĐÃ CÓ ở ô #al-charge → tái dùng mã mẻ đó
    // (lô mới gộp vào lần cũ trên bảng thống kê + chip Kanban); không chọn = lượt
    // lưu mới (1 lượt bấm Lưu = 1 lần than hóa — như cũ).
    const chargeAt = alChargeMarkOf() || Date.now();
    // Ô CA (Giai đoạn 2): ca của LẦN than hóa này — null = chưa rõ ca (vẫn lưu được)
    const shiftIdx = alShiftIdxValue();

    // ── THAN HÓA LẠI → SẤY 1: nguồn = lô TÓP ở Kho, tạo lô MỚI ──
    if (stage === 'say1' && alReworkOn()) {
      const src = alTopPicked();
      if (!src || src.stage !== 'kho' || !src.topRework) {
        showToast('Chưa chọn lô TÓP ở Kho để than hóa lại!', 'error'); return;
      }
      const rem = alTopRemainingOf(src);
      const take = alReworkQtyOf(src.id);
      if (!(take > 0) || take > rem) {
        showToast(`Số lượng đốt lại phải từ 1 đến ${rem.toLocaleString('vi-VN')} thanh (tồn lô Tóp)!`, 'error');
        return;
      }
      pushUndo('Thêm lô sấy (than hóa lại)');
      const L = Number(src.length) || 0, W = Number(src.width) || 0, T = Number(src.thickness) || 0;
      const rwData = {
        id: `batch-${Date.now()}-rw`,
        code: generateBatchCodeYYMMDD(dateVal),
        stage: 'say1',
        date: dateVal,                               // ngày vào Sấy 1 (badge đếm ngày)
        week: getISOWeekString(dateVal),
        length: L, width: W, thickness: T,
        quantity: take,
        volume: calculateVolume(L, W, T, take),
        bambooType: src.bambooType || '—',
        useFor: alUseFor(),
        sayCharges: { say1: chargeAt },               // MÃ MẺ: lần mới hoặc lần đã chọn
        sayShift: sayShiftMapOf(null, 'say1', shiftIdx), // CA của lần (Giai đoạn 2)
        location, notes,
        rework: true,                                // lô sinh từ THAN HÓA LẠI
        sourceTopBatchId: String(src.id),            // link lô Tóp nguồn (tồn giảm đọc sống)
        stageHistory: [{ stage: 'say1', date: dateVal }],
        updatedAt: nowISO
      };
      state.batches.unshift(rwData);
      // PHIẾU XUẤT TỰ ĐỘNG: Tóp đốt lại → Sấy 1 (phần lấy ra RỜI nhóm ⇒ mục đích 'khac')
      addKhoReworkAutoNote(src, take, dateVal, 'Sấy 1');
      src.topUsed = (Number(src.topUsed) || 0) + take; // lưu để hiển thị; tồn đã trừ qua phiếu
      src.updatedAt = nowISO;
      alPicked = [];
      saveKhoNotes();
      saveData(); closeAddLotModal(); renderAll();
      showToast(`Đã than hóa lại ${take.toLocaleString('vi-VN')} thanh → Sấy 1 (nguồn: lô Tóp ${src.code || '—'} — còn ${(rem - take).toLocaleString('vi-VN')} thanh)!`, 'success');
      return;
    }

    // ── THAN HÓA LẠI → SẤY 2: hết phần còn lại = CHUYỂN NGUYÊN lô · 1 phần = TÁCH ──
    if (stage === 'say2' && alReworkOn()) {
      const src = alTopPicked();
      if (!src || src.stage !== 'kho' || !src.topRework) {
        showToast('Chưa chọn lô TÓP ở Kho để than hóa lại!', 'error'); return;
      }
      const rem = alTopRemainingOf(src);
      const take = alReworkQtyOf(src.id);
      if (!(take > 0) || take > rem) {
        showToast(`Số lượng đốt lại phải từ 1 đến ${rem.toLocaleString('vi-VN')} thanh (tồn lô Tóp)!`, 'error');
        return;
      }
      const useForVal = alUseFor();
      if (take >= rem) {
        // Nhập hết phần còn lại → chuyển NGUYÊN lô sang Sấy 2 + hết cờ Tóp
        pushUndo('Than hóa lại lô Tóp → Sấy 2');
        if (!src.stageHistory || !src.stageHistory.length) src.stageHistory = [{ stage: src.stage, date: src.date }];
        // PHIẾU XUẤT TỰ ĐỘNG: lô RỜI Kho sang Sấy 2 (nguyên lô) — số lượng = SỐ LƯỢNG CHUẨN
        addKhoSay2AutoNote(src, Number(src.quantity) || 0, dateVal, 'move');
        src.stage = 'say2';
        src.say2Date = dateVal;                       // ngày vào Sấy 2 (badge đếm ngày)
        src.stageHistory.push({ stage: 'say2', date: dateVal });
        src.location = location;
        src.useFor = useForVal;
        if (notes) src.notes = notes;
        src.sayCharges = Object.assign({}, src.sayCharges, { say2: chargeAt });
        src.sayShift = sayShiftMapOf(src.sayShift, 'say2', shiftIdx);   // CA của lần (Giai đoạn 2)
        delete src.topRework;                         // hết cờ Tóp — đã rời Kho
        delete src.topUsed;
        src.updatedAt = nowISO;
        alPicked = [];
        saveKhoNotes();                               // lưu phiếu xuất Sấy 2 tự động
        saveData(); closeAddLotModal(); renderAll();
        showToast(`Lô Tóp ${src.code || '—'} (${rem.toLocaleString('vi-VN')} thanh) → Sấy 2 — đã hết cờ Tóp!`, 'success');
        return;
      }
      // Nhập 1 PHẦN → tách: nguồn ở lại Kho (tăng topUsed) + lô mới mang phần lấy đi
      pushUndo('Than hóa lại 1 phần lô Tóp → Sấy 2');
      const L = Number(src.length) || 0, W = Number(src.width) || 0, T = Number(src.thickness) || 0;
      const clone = {
        id: `batch-${Date.now()}-rw`,
        code: generateBatchCodeYYMMDD(dateVal),
        stage: 'say2',
        date: src.date,                               // giữ ngày gốc của nguồn
        say2Date: dateVal,
        week: getISOWeekString(dateVal),
        length: L, width: W, thickness: T,
        quantity: take,
        volume: calculateVolume(L, W, T, take),
        bambooType: src.bambooType || '—',
        useFor: useForVal,
        sayCharges: Object.assign({}, src.sayCharges, { say2: chargeAt }),
        sayShift: sayShiftMapOf(src.sayShift, 'say2', shiftIdx),  // CA của lần (Giai đoạn 2)
        location, notes,
        rework: true,
        sourceTopBatchId: String(src.id),
        stageHistory: [
          { stage: 'say2', date: dateVal }   // lô TÁCH sinh ra tại Sấy 2 (không phải lô đã ở Kho)
        ],
        createdAt: nowISO, updatedAt: nowISO
      };
      state.batches.unshift(clone);
      src.topUsed = (Number(src.topUsed) || 0) + take;
      // PHIẾU XUẤT TỰ ĐỘNG: Tóp đốt lại 1 PHẦN → Sấy 2 (phần tách RỜI nhóm ⇒ 'khac')
      addKhoReworkAutoNote(src, take, dateVal, 'Sấy 2');
      src.updatedAt = nowISO;
      alPicked = [];
      saveKhoNotes();
      saveData(); closeAddLotModal(); renderAll();
      showToast(`Đã tách ${take.toLocaleString('vi-VN')} thanh Tóp → Sấy 2 (nguồn ${src.code || '—'} còn ${(rem - take).toLocaleString('vi-VN')} thanh ở Kho)!`, 'success');
      return;
    }

    if (stage === 'say2') {
      // ── Sấy 2: CHUYỂN các lô đang ở Kho sang Sấy 2 (không tạo lô mới) ──
      const lots = alPicked.map(id => (state.batches || []).find(x => x.id === id)).filter(Boolean);
      if (!lots.length) { showToast('Không tìm thấy lô nguồn!', 'error'); return; }
      pushUndo(`Chuyển ${lots.length} lô sang Sấy 2`);
      const useForVal = alUseFor();
      lots.forEach(b => {
        if (!b.stageHistory || !b.stageHistory.length) b.stageHistory = [{ stage: b.stage, date: b.date }];
        // PHIẾU XUẤT TỰ ĐỘNG: mỗi lô RỜI Kho sang Sấy 2 → 1 phiếu 'say2' (SL chuẩn của lô)
        addKhoSay2AutoNote(b, Number(b.quantity) || 0, dateVal, 'move');
        b.stage = 'say2';
        b.say2Date = dateVal;                        // ngày vào Sấy 2 thực tế (badge đếm ngày)
        b.stageHistory.push({ stage: 'say2', date: dateVal });
        b.location = location;
        b.useFor = useForVal;                        // Dùng cho (Ván / Bullig) chọn ở form
        delete b.topRework;                          // lô RỜI Kho → hết cờ TÓP xử lý lại
        // MÃ MẺ Sấy 2: lượt Lưu này = 1 lần than hóa (giữ mã mẻ Sấy 1 cũ nếu có)
        b.sayCharges = Object.assign({}, b.sayCharges, { say2: chargeAt });
        b.sayShift = sayShiftMapOf(b.sayShift, 'say2', shiftIdx);   // CA của lần (Giai đoạn 2)
        if (notes) b.notes = notes;
        b.updatedAt = nowISO;
      });
      alPicked = [];
      saveKhoNotes();                               // lưu các phiếu xuất Sấy 2 tự động
      saveData(); closeAddLotModal(); renderAll();
      showToast(`Đã chuyển ${lots.length} lô vào Sấy 2 — vị trí ${location} (ngày ${formatDateDDMMYY(dateVal)})!`, 'success');
      return;
    }

    // ── Sấy 1: TẠO LÔ MỚI ─────────────────────────────────────────────
    // • CHẾ ĐỘ BẢNG: MỖI DÒNG (Cỡ + Phân loại) = 1 LÔ, quantity = ĐÚNG SL của dòng.
    //   Các thẻ nguồn chỉ được TRỪ TỒN qua batch.sources[] (FEFO), cắt liên tiếp
    //   cho từng lô — KHÔNG tách/gộp lô theo từng thẻ.
    // • CHẾ ĐỘ THẺ: giữ nguyên 1 thẻ nan = 1 lô.
    if (alEntryModeOf() === 'grid') {
      const groups = alGridAllGroupList().filter(g => g && g.qty > 0 && Array.isArray(g.split) && g.split.length);
      if (!groups.length) { showToast('Chưa nhập số lượng cho nhóm nào!', 'error'); return; }
      if (!state.batches) state.batches = [];
      const created = [];
      let skipped = 0, totalQty = 0;
      const plannedLots = groups.reduce((n, g) => {
        const ls = (Array.isArray(g.lines) && g.lines.length)
          ? g.lines.filter(l => l && l.qty > 0)
          : (g.qty > 0 ? [{ qty: g.qty, sources: g.split }] : []);
        return n + ls.length;
      }, 0);
      pushUndo(plannedLots > 1
        ? `Tạo ${plannedLots} lô Sấy 1 (${groups.length} nhóm)`
        : `Tạo lô Sấy 1 ${groups[0].dimsText} · ${groups[0].cls}`);
      groups.forEach((g, gi) => {
        const dims = Array.isArray(g.dims) ? g.dims : [];
        const length = Number(dims[0]) || 0, width = Number(dims[1]) || 0, thickness = Number(dims[2]) || 0;
        if (!(length > 0 && width > 0 && thickness > 0)) { skipped++; return; }
        // MỖI DÒNG = 1 LÔ MỚI; nguồn của dòng đã được cắt FEFO liên tiếp.
        const lines = (Array.isArray(g.lines) && g.lines.length)
          ? g.lines
          : (g.qty > 0 ? [{ qty: g.qty, sources: g.split }] : []);
        if (!lines.some(l => l && l.qty > 0)) { skipped++; return; }
        lines.forEach((line, li) => {
          if (!line || !(line.qty > 0)) return;
          const sources = (line.sources || []).map(c => ({
            chonNanId: String(c.id),
            qty: Math.max(0, Math.min(Math.floor(Number(c.alloc) || 0), Number(c.total) || 0)),
            date: c.date || '',
            cls: g.clsRaw,
            dims: [length, width, thickness],
            label: c.srcText || ''
          })).filter(src => src.qty > 0);
          const srcSum = sources.reduce((s, x) => s + x.qty, 0);
          if (!(srcSum > 0)) return;
          const batchData = {
            id: `batch-${Date.now()}-${gi}-${li}`,
            code: generateBatchCodeYYMMDD(dateVal),
            stage: 'say1',
            date: dateVal,                               // ngày vào Sấy 1 (badge đếm ngày)
            week: getISOWeekString(dateVal),
            length, width, thickness, quantity: srcSum,
            volume: calculateVolume(length, width, thickness, srcSum),
            bambooType: g.cls,                           // A / A1 / B của NHÓM
            useFor: alUseFor(),                          // Dùng cho (Ván / Bullig) chọn ở form
            sayCharges: { say1: chargeAt },              // MÃ MẺ: lượt Lưu này = 1 lần than hóa
            sayShift: sayShiftMapOf(null, 'say1', shiftIdx), // CA của lần (Giai đoạn 2)
            location,
            notes,
            sourceChonNanId: '',                         // lô gộp nhiều nguồn → dùng sources[]
            sourceChonNanLabel: `Nhóm ${g.dimsText} · ${g.cls} · Lô ${li + 1}/${lines.length} · ${sources.length} thẻ`,
            sources,                                     // [{ chonNanId, qty, date, cls, dims, label }]
            stageHistory: [{ stage: 'say1', date: dateVal }],
            updatedAt: nowISO
          };
          state.batches.unshift(batchData);
          created.push(batchData);
          totalQty += srcSum;
        });
      });
      if (!created.length) {
        showToast('Không tạo được lô nào — kiểm tra số lượng và tồn nguồn!', 'error');
        return;
      }
      alPicked = [];
      alGridGroupQty = {};
      alGridGroupLines = {};
      saveData(); closeAddLotModal(); renderAll();
      showToast(`Đã tạo ${created.length} lô ở Sấy 1 — vị trí ${location} (${totalQty.toLocaleString('vi-VN')} thanh)` +
        (skipped ? ` · bỏ qua ${skipped} nhóm không hợp lệ` : '') + '!', 'success');
      return;
    }
    // ── CHẾ ĐỘ THẺ: 1 thẻ nan = 1 lô (giữ nguyên) ──────────────────────
    const recs = alPicked.map(id => (state.xuong2ChonNanThoRecords || []).find(x => x.id === id)).filter(Boolean);
    if (!recs.length) { showToast('Không tìm thấy thẻ nan nguồn!', 'error'); return; }
    if (!state.batches) state.batches = [];
    pushUndo(recs.length > 1 ? `Tạo ${recs.length} lô Sấy 1 từ thẻ nan` : `Tạo lô Sấy 1 từ thẻ nan ${nanCardLabel(recs[0])}`);
    const created = [];
    let skipped = 0, totalQty = 0;
    recs.forEach(rec => {
      const quantity = alCardQtyOf(rec.id);   // SỐ LƯỢNG đang nhập (mặc định = phần còn lại; có thể lấy 1 phần)
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
        useFor: alUseFor(),                          // Dùng cho (Ván / Bullig) chọn ở form
        sayCharges: { say1: chargeAt },              // MÃ MẺ: lượt Lưu này = 1 lần than hóa
        sayShift: sayShiftMapOf(null, 'say1', shiftIdx), // CA của lần (Giai đoạn 2)
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
  function openTransferKhoModal(preset) {
    if (!requireEditPermission()) return;
    const modal = document.getElementById('modal-transfer-kho');
    const form  = document.getElementById('transfer-kho-form');
    if (!modal || !form) return;
    form.reset();
    const today = new Date().toISOString().split('T')[0];
    const dEl = document.getElementById('ck-date');
    if (dEl) dEl.value = today;
    const sEl = document.getElementById('ck-stage');
    // preset 'new' = mở thẳng chế độ NHẬP KHO THỦ CÔNG (tạo lô mới ở thẳng Kho)
    // — dùng cho nút "Nhập Kho" trên cột Kho / thẻ Kho Nan
    if (sEl) sEl.value = (preset === 'new') ? 'new' : 'say1';
    ckPicks = {};                    // mỗi lần mở: mặc định tất cả lô = Chuyển Kho
    syncTransferKhoUI();             // nạp khối ①②③④ (trong đó có render 4 khối)
    modal.classList.add('show');
    initLucide();
  }

  function closeTransferKhoModal() {
    document.getElementById('modal-transfer-kho')?.classList.remove('show');
  }

  // ═══ UI 4 KHỐI TRỰC QUAN (14/10/2026): KHÔNG STEPPER · KHÔNG DROPDOWN NỔI ═══
  // Form hiện thẳng 4 khối: ① Công đoạn (3 nút chọn) · ② Vị trí & Thẻ nan (chip
  // vị trí + danh sách thẻ 2 cột check — TRONG LUỒNG, không nổi) · ③ Ngày ·
  // ④ Vị trí mới ở Kho (không bắt buộc) + dòng ghi chú nhỏ.
  // ckPicks = { <batchId>: 'kho' | 'top' | 'none' } — tick trên thẻ nan;
  // lô CHƯA tick = mặc định 'kho' (chưa mở dropdown vẫn chuyển hết như cũ);
  // 'top' = TÓP XỬ LÝ LẠI: lô VẪN vào Kho + gắn cờ batch.topRework = true;
  // 'none' = bỏ qua lô này.
  let ckPicks = {};

  const CK_STAGE_LABELS = {
    say1: '1. Sấy 1 → Kho',
    say2: '2. Sấy 2 → Kho',
    new:  '➕ Nhập kho thủ công'
  };

  // Nhóm lựa chọn của 1 lô: 'kho' (mặc định) | 'top' | 'none'
  function ckPickOf(id) {
    const v = ckPicks[String(id)];
    return (v === 'top' || v === 'none') ? v : 'kho';
  }
  // Đặt / đổi / bỏ tick 1 lô — 2 cột LOẠI TRỪ nhau (tick cột này thì cột kia tự bỏ)
  function ckSetPick(id, kind) {
    ckPicks[String(id)] = (kind === 'top' || kind === 'none') ? kind : 'kho';
    renderCkLotPanel();
    updateCkPosInfo();
    return ckPickOf(id);
  }
  // Tick hàng loạt theo nút "Tất cả Kho / Tất cả Tóp / Bỏ chọn" — trả về SỐ LÔ đổi tick
  function ckBulkPick(kind) {
    const stage = (document.getElementById('ck-stage') || {}).value || 'say1';
    const pos = (document.getElementById('ck-lot') || {}).value || '';
    const lots = pos ? batchesAtPosition(stage, pos) : [];
    lots.forEach(b => { ckPicks[b.id] = (kind === 'top' || kind === 'none') ? kind : 'kho'; });
    renderCkLotPanel();
    updateCkPosInfo();
    return lots.length;
  }
  // Thống kê 2 nhóm của vị trí đang chọn
  function ckPickStats() {
    const stage = (document.getElementById('ck-stage') || {}).value || 'say1';
    const pos = (document.getElementById('ck-lot') || {}).value || '';
    const lots = pos ? batchesAtPosition(stage, pos) : [];
    const out = { khoN: 0, khoQty: 0, topN: 0, topQty: 0, noneN: 0, noneQty: 0, total: lots.length, vol: 0 };
    lots.forEach(b => {
      const k = ckPickOf(b.id);
      const q = Number(b.quantity) || 0;
      out.vol += Number(b.volume) || 0;
      if (k === 'top') { out.topN++; out.topQty += q; }
      else if (k === 'none') { out.noneN++; out.noneQty += q; }
      else { out.khoN++; out.khoQty += q; }
    });
    return out;
  }

  // ── KHỐI ①: 3 NÚT CHỌN CÔNG ĐOẠN (hiệu chỉnh active theo select ẩn) ──
  function renderCkStageSeg() {
    const seg = document.getElementById('ck-stage-seg');
    if (!seg || typeof seg.querySelectorAll !== 'function') return;
    const cur = (document.getElementById('ck-stage') || {}).value || 'say1';
    const btns = seg.querySelectorAll('[data-ck-stage-btn]');
    for (let i = 0; i < btns.length; i++) {
      const on = btns[i].getAttribute('data-ck-stage-btn') === cur;
      btns[i].classList.toggle('is-on', !!on);
      btns[i].setAttribute('aria-pressed', on ? 'true' : 'false');
    }
  }
  // Bấm 1 trong 3 nút khối ① → cập nhật select ẩn + đồng bộ toàn form
  function ckOnStageSegPick(v) {
    const sel = document.getElementById('ck-stage');
    if (!sel) return false;
    if (sel.value === v) return false;         // bấm lại đúng nút đang chọn → không làm gì
    sel.value = v;
    ckPicks = {};                              // đổi công đoạn → danh sách vị trí đổi → bỏ tick cũ
    syncTransferKhoUI();
    return true;
  }

  // ── KHỐI ②: CHIP VỊ TRÍ (bấm trực tiếp — chỉ hiện vị trí đang có lô) ──
  function renderCkLocChips() {
    const box = document.getElementById('ck-loc-chips');
    if (!box) return;
    const stage = (document.getElementById('ck-stage') || {}).value || 'say1';
    const cur = (document.getElementById('ck-lot') || {}).value || '';
    const groups = stage === 'new' ? [] : khoPositionsAt(stage);
    if (!groups.length) {
      box.innerHTML = '<span class="ck-loc-empty">— Chưa có vị trí nào có lô ở công đoạn này —</span>';
      return;
    }
    box.innerHTML = groups.map(g =>
      `<button type="button" class="ck-loc-chip${g.location === cur ? ' is-on' : ''}" data-ck-loc="${escapeHTML(g.location)}" title="Chọn vị trí ${escapeHTML(g.location)} — ${g.count} lô · ${g.qty.toLocaleString('vi-VN')} thanh">
        <strong>${escapeHTML(g.location)}</strong><small>${g.count} lô · ${g.qty.toLocaleString('vi-VN')}</small>
      </button>`
    ).join('');
  }
  // Bấm chip vị trí → cập nhật select ẩn + hiện danh sách thẻ nan (2 cột check)
  function ckOnLocChipClick(loc) {
    const sel = document.getElementById('ck-lot');
    if (!sel) return false;
    sel.value = loc;
    ckPicks = {};                              // vị trí mới → về mặc định: tất cả Chuyển Kho
    renderCkLocChips();
    updateCkPosInfo();
    renderCkLotPanel(true);                    // hiện danh sách thẻ nan ngay dưới khối ②
    return true;
  }

  // ── DROPDOWN NỔI: DANH SÁCH THẺ NAN + 2 CỘT CHECK (Chuyển Kho / Tóp xử lý lại) ──
  function renderCkLotPanel(openPanel) {
    const panel = document.getElementById('ck-lot-panel');
    const list = document.getElementById('ck-lot-list');
    const title = document.getElementById('ck-lot-panel-title');
    if (!panel || !list) return false;
    const stage = (document.getElementById('ck-stage') || {}).value || 'say1';
    const pos = (document.getElementById('ck-lot') || {}).value || '';
    // Chỉ nhánh Sấy 1 / Sấy 2 mới có thẻ nan (mode 'new' = nhập tay → ẩn panel)
    if (stage === 'new' || !pos) { panel.hidden = true; return false; }
    const lots = batchesAtPosition(stage, pos);
    if (title) title.textContent = `Thẻ nan tại ${pos} — ${lots.length} lô`;
    if (!lots.length) {
      list.innerHTML = '<div class="ck-menu-empty">— Vị trí này không còn lô nào —</div>';
    } else {
      list.innerHTML = lots.map(b => {
        const pick = ckPickOf(b.id);
        const lines = alCardLines(b, 'say2');   // lô → 2 dòng chuẩn (Vị trí · KT · Loại · SL / chip Dùng cho + badge ngày)
        return `<div class="ck-row${pick === 'top' ? ' pick-top' : pick === 'none' ? ' pick-none' : ' pick-kho'}" data-ck-row="${escapeHTML(String(b.id))}">
          <button type="button" class="al-card ck-row-card" data-ck-pick-card="${escapeHTML(String(b.id))}" title="Bấm để xoay vòng: Chuyển Kho → Tóp xử lý lại → Bỏ chọn">
            <span class="al-card-body">
              <span class="al-card-main">${escapeHTML(lines.main)}</span>
              <span class="al-card-sub">${lines.subHtml}</span>
            </span>
          </button>
          <label class="ck-check" title="LÔ NÀY VÀO KHO bình thường">
            <input type="checkbox" data-ck-check="${escapeHTML(String(b.id))}" data-ck-kind="kho"${pick === 'kho' ? ' checked' : ''}>
          </label>
          <label class="ck-check ck-check-top" title="LÔ NÀY VÀO KHO + gắn cờ TÓP — chờ xử lý lại">
            <input type="checkbox" data-ck-check="${escapeHTML(String(b.id))}" data-ck-kind="top"${pick === 'top' ? ' checked' : ''}>
          </label>
        </div>`;
      }).join('');
    }
    const body = document.getElementById('ck-lot-panel-body');
    if (typeof openPanel === 'boolean') {
      panel.hidden = !openPanel;
      if (openPanel && body) body.hidden = false;   // chọn vị trí mới → danh sách MỞ lại
    }
    const sum = document.getElementById('ck-lot-panel-sum');
    if (sum) {
      const s = ckPickStats();
      sum.innerHTML = `<strong>${s.khoN}</strong> lô chuyển Kho · <strong>${s.topN}</strong> lô Tóp xử lý lại` +
        (s.noneN ? ` · <span class="ck-sum-none">${s.noneN} lô bỏ chọn</span>` : '');
    }
    ckSyncLotToggle();
    initLucide();
    return true;
  }
  // ── THU GÓM / HIỆN LẠI danh sách thẻ nan ở khối ② (sau khi chọn xong cho gọn) ──
  // Ẩn vùng cột check + danh sách; TIÊU ĐỀ · nút Tất cả… · DÒNG TÓM TẮT vẫn hiện
  function ckToggleLotList() {
    const body = document.getElementById('ck-lot-panel-body');
    if (!body) return false;
    body.hidden = !body.hidden;
    ckSyncLotToggle();
    return !body.hidden;
  }
  // Nhãn nút thu gọn theo trạng thái + số liệu đã chọn
  function ckSyncLotToggle() {
    const btn = document.getElementById('ck-lot-toggle');
    const body = document.getElementById('ck-lot-panel-body');
    if (!btn) return;
    const open = body ? !body.hidden : true;
    if (open) {
      btn.textContent = 'Thu gọn ▲';
    } else {
      const s = ckPickStats();
      btn.textContent = `Hiện lại · ${s.total} lô (${s.khoN} Kho / ${s.topN} Tóp) ▼`;
    }
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  // Bấm vào dropdown thẻ nan: tick 2 cột LOẠI TRỪ nhau · bấm thẻ = xoay vòng · nút "Tất cả…" · đóng
  function ckOnLotPanelClick(e) {
    const t = e && e.target;
    if (!t || typeof t.closest !== 'function') return;
    const allBtn = t.closest('[data-ck-all]');
    if (allBtn) { ckBulkPick(allBtn.getAttribute('data-ck-all')); return; }
    const box = t.closest('input[data-ck-check]');
    if (box) {
      const id = box.getAttribute('data-ck-check');
      const kind = box.getAttribute('data-ck-kind');
      if (box.checked) ckSetPick(id, kind);                                // tick cột này → cột kia tự bỏ
      else ckSetPick(id, ckPickOf(id) === kind ? 'none' : ckPickOf(id));   // bỏ tick đang bật → không chuyển lô này
      return;
    }
    const card = t.closest('[data-ck-pick-card]');                         // bấm thẻ = xoay vòng
    if (card) {
      const id = card.getAttribute('data-ck-pick-card');
      const cur = ckPickOf(id);
      ckSetPick(id, cur === 'kho' ? 'top' : cur === 'top' ? 'none' : 'kho');
    }
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

    // Khối ①: đánh dấu nút công đoạn đang chọn · Khối ②: chip vị trí
    renderCkStageSeg();
    renderCkLocChips();

    if (!isNew) {
      // Danh sách VỊ TRÍ đang có lô ở công đoạn đã chọn (select ẩn — người dùng
      // chọn qua CHIP #ck-loc-chips trong khối ②)
      const groups = khoPositionsAt(stage);
      const lotEl = document.getElementById('ck-lot');
      if (lotEl) {
        // Giữ lựa chọn nếu vị trí vẫn còn lô; nếu không → về rỗng (chưa chọn)
        const prev = lotEl.value;
        lotEl.innerHTML = groups.length
          ? groups.map(g => `<option value="${escapeHTML(g.location)}">${escapeHTML(g.location)} — ${g.count} lô · ${g.qty.toLocaleString('vi-VN')} thanh</option>`).join('')
          : `<option value="">— Không có vị trí nào có lô ở ${(STAGES[stage] && STAGES[stage].name) || stage} —</option>`;
        if (prev && groups.some(g => g.location === prev)) lotEl.value = prev;
      }
      renderCkLocChips();            // chip vẽ lại sau khi nạp options (chip active đúng)
      // Gợi ý vị trí Kho đang có cho ô NHẬP TAY "Vị trí mới ở Kho"
      const dl = document.getElementById('ck-new-loc-list');
      if (dl) {
        dl.innerHTML = khoLocationsInUse()
          .map(l => `<option value="${escapeHTML(l)}"></option>`).join('');
      }
      updateCkPosInfo();
      // Mở form / đổi công đoạn → vùng thẻ nan MỞ lại (không kẹt trạng thái thu gọn cũ)
      const ckBody = document.getElementById('ck-lot-panel-body');
      if (ckBody) ckBody.hidden = false;
      renderCkLotPanel();            // danh sách thẻ nan trong khối ② (ẩn nếu chưa chọn vị trí)
    } else {
      updateCkNewVolume();
      const panel = document.getElementById('ck-lot-panel');
      if (panel) panel.hidden = true;
    }
  }

  // Tóm tắt lựa chọn: 2 NHÓM (Chuyển Kho / Tóp xử lý lại) + số bỏ chọn + tổng
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
    const s = ckPickStats();
    const groups = [];
    if (s.khoN) groups.push(`<span class="ck-info-kho"><span class="al-k">Chuyển Kho:</span> <strong>${s.khoN} lô · ${s.khoQty.toLocaleString('vi-VN')} thanh</strong></span>`);
    if (s.topN) groups.push(`<span class="ck-info-top"><span class="al-k">Tóp xử lý lại:</span> <strong>${s.topN} lô · ${s.topQty.toLocaleString('vi-VN')} thanh</strong></span>`);
    if (s.noneN) groups.push(`<span class="ck-info-none"><span class="al-k">Bỏ chọn:</span> <strong>${s.noneN} lô · ${s.noneQty.toLocaleString('vi-VN')} thanh</strong></span>`);
    el.innerHTML = `<span><span class="al-k">Vị trí:</span><strong>${escapeHTML(pos)}</strong></span>
      ${groups.join('')}
      <span><span class="al-k">Tổng vị trí:</span><strong>${lots.length} lô · ${s.khoQty + s.topQty + s.noneQty > 0 ? (s.khoQty + s.topQty + s.noneQty).toLocaleString('vi-VN') : 0} thanh · ${s.vol.toFixed(4)} m³</strong></span>`;
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

    // ── CHUYỂN TỪNG THẺ ĐÃ TICK (Sấy 1 / Sấy 2) → Kho ──
    // 2 nhóm theo dropdown thẻ nan: 'kho' = vào Kho bình thường · 'top' = TÓP XỬ LÝ
    // LẠI (VẪN vào Kho + gắn cờ batch.topRework = true — chốt với người dùng) ·
    // 'none' = bỏ qua lô này. Lô CHƯA tick = mặc định 'kho' (ckPickOf) nên người
    // dùng không mở dropdown vẫn chuyển hết cả vị trí như hành vi cũ.
    const pos = (document.getElementById('ck-lot') || {}).value || '';
    const newLoc = ((document.getElementById('ck-new-loc') || {}).value || '').trim();
    const lots = pos ? batchesAtPosition(stage, pos) : [];
    if (!lots.length) { showToast('Chưa có lô nan nào ở vị trí này để chuyển vào Kho!', 'error'); return; }
    const selKho = lots.filter(b => ckPickOf(b.id) === 'kho');
    const selTop = lots.filter(b => ckPickOf(b.id) === 'top');
    const moved = selKho.length + selTop.length;
    if (!moved) {
      showToast('Chưa chọn lô nào — tick ít nhất 1 thẻ nan (Chuyển Kho hoặc Tóp xử lý lại)!', 'error');
      return;
    }
    if (moved > 1 && typeof confirm === 'function') {
      const stageName = (STAGES[stage] && STAGES[stage].name) || stage;
      const msg = `Chuyển ${moved} lô ở vị trí "${pos}" (${stageName}) vào Kho?` +
        `\n• Chuyển Kho: ${selKho.length} lô` +
        (selTop.length ? `\n• Tóp xử lý lại: ${selTop.length} lô (vào Kho, mang cờ chờ xử lý)` : '') +
        (newLoc ? `\n• Vị trí mới ở Kho: "${newLoc}"` : '');
      if (!confirm(msg)) return;
    }
    pushUndo(`Chuyển ${moved} lô ở vị trí ${pos} vào Kho`);
    const nowISO = new Date().toISOString();
    lots.forEach(b => {
      if (ckPickOf(b.id) === 'none') return;      // bỏ chọn → lô ở lại công đoạn cũ
      if (!b.stageHistory || !b.stageHistory.length) b.stageHistory = [{ stage: b.stage, date: b.date }];
      b.stage = 'kho';
      b.khoDate = dateVal;                        // ngày vào kho thực tế
      b.stageHistory.push({ stage: 'kho', date: dateVal });
      if (newLoc) b.location = newLoc;            // để trống = giữ nguyên vị trí cũ
      if (notes) b.notes = notes;
      b.topRework = (ckPickOf(b.id) === 'top');   // cờ TÓP — lô vẫn vào Kho, chờ xử lý lại
      b.updatedAt = nowISO;
    });
    saveData(); renderAll(); closeTransferKhoModal();
    showToast(`Đã chuyển ${moved} lô ở vị trí ${pos} vào Kho` +
      (selTop.length ? ` (trong đó ${selTop.length} lô Tóp xử lý lại)` : '') +
      ` — ngày ${formatDateDDMMYY(dateVal)}!`, 'success');
  }

  // Chuyển NHANH TẤT CẢ lô nan ở 1 VỊ TRÍ (1 lò sấy) vào Kho — dùng CHUNG cho
  // modal "Chuyển Kho" (form trên) và BẢNG ĐIỀU KHIỂN LÒ SẤY (js/kiln.js: icon
  // kho trên thẻ lò + kéo thả thẻ lò vào ô Kho).
  // Trả về SỐ LÔ đã chuyển (0 = không chuyển: không có lô / người dùng hủy).
  function quickTransferLotsToKho(stage, location, dateVal, newLoc = '', notes = '') {
    const pos = String(location || '').trim();
    const lots = pos ? batchesAtPosition(stage, pos) : [];
    if (!lots.length) { showToast('Chưa có lô nan nào ở vị trí này để chuyển vào Kho!', 'error'); return 0; }
    const stageName = (STAGES[stage] && STAGES[stage].name) || stage;
    if (lots.length > 1 && typeof confirm === 'function') {
      const msg = `Chuyển TẤT CẢ ${lots.length} lô ở vị trí "${pos}" (${stageName}) vào Kho?` +
        (newLoc ? `\n• Vị trí mới ở Kho: "${newLoc}"` : '');
      if (!confirm(msg)) return 0;
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
    saveData(); renderAll();
    showToast(`Đã chuyển ${lots.length} lô ở vị trí ${pos} vào Kho (ngày ${formatDateDDMMYY(dateVal)})!`, 'success');
    return lots.length;
  }

export {
  alAvailableSources,
  alClearPicks,
  alCurrentLocation,
  alLocations,
  alOnLocationChipClick,
  alOnSourceListClick,
  alOnReworkQtyInput,
  alPickAll,
  alChargeMarkOf,
  alReworkOn,
  alReworkQtyOf,
  alSetRework,
  alSyncReworkQtyField,
  alTopLots,
  alTopRemainingOf,
  renderAlChargeOptions,
  renderAlTopList,
  alPickedIds,
  alPositionSourcePanel,
  alSetLocation,
  alSetSourceQuery,
  alSetSourceQtyQuery,
  alShowNewLocationRow,
  alOpenSheet,
  alCloseSheet,
  alOnSheetClick,
  alRefreshSummary,
  alToggleLocationPanel,
  alTogglePick,
  alToggleSourcePanel,
  alCardQtyOf,
  alOnCardQtyInput,
  alEntryModeOf,
  setAlEntryMode,
  syncAlEntryModeUi,
  alOnEntryModeClick,
  alGridDateBuckets,
  alGridAllGroupList,
  alGridRows,
  alGridSplitHtml,
  renderAlGrid,
  alRefreshGridFoot,
  alGridSetGroupQty,
  alGridAddGroupLine,
  alGridSetLineQty,
  alGridFillLine,
  alGridRemoveGroupLine,
  alGridApplyGroupLines,
  alGridSliceSources,
  alGridDeriveGroupQtyFromPicks,
  alGridRebuildAllocations,
  alGridToggleHelp,
  alGridCloseHelp,
  alGridStaleOf,
  alGridDaysOld,
  alOnGridQtyInput,
  alOnGridClick,
  alOnGridDateClick,
  alOnGridKeydown,
  alSetGridSearch,
  alSetGridSort,
  alResetGridFilters,
  alGridQueryOf,
  alGridDateText,
  availableKhoLots,
  availableSay1Cards,
  batchesAtPosition,
  closeAddLotModal,
  closeBatchFormModal,
  closeTransferKhoModal,
  ckBulkPick,
  ckOnLocChipClick,
  ckOnLotPanelClick,
  ckOnStageSegPick,
  ckPickOf,
  ckPickStats,
  ckSetPick,
  renderCkLocChips,
  renderCkLotPanel,
  renderCkStageSeg,
  ckToggleLotList,
  deleteBatch,
  deleteBatches,
  deletePickedBatches,
  exitKanbanPickMode,
  kanbanSelectAll,
  onKanbanPickChange,
  syncKanbanPickBar,
  toggleKanbanPickMode,
  handleAddLotSubmit,
  handleAlAddLocation,
  handleAlDeleteLocation,
  handleBatchFormSubmit,
  handleTransferKhoSubmit,
  quickTransferLotsToKho,
  khoLocationsInUse,
  khoPositionsAt,
  loadX2LotLocations,
  nanCardRemainingOf,
  openAddLotModal,
  openBatchFormModal,
  openTransferKhoModal,
  saveX2LotLocations,
  syncAddLotSource,
  syncAddLotUI,
  syncTransferKhoUI,
  updateCkNewVolume,
  updateCkPosInfo,
  x2LotLocations
};
