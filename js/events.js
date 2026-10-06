// ═══════════════════════════════════════════════════════════
// js/events.js — tách từ app.js (refactor ES-modules phase 1)
// ═══════════════════════════════════════════════════════════
import { checkAuthAndRender, closeUserEditModal, closeUserPermsModal, closeUsersMgrModal, handleAddUserSubmit, handleRegisterSubmit, handleUserEditSubmit, handleUserPermsSubmit, openUsersMgrModal, saveSession, toggleRegisterForm } from './auth.js';
import { alOnLocationChipClick, alOnSourceListClick, alPickAll, alPositionSourcePanel, alSetSourceQuery, alSetSourceQtyQuery, alShowNewLocationRow, alToggleLocationPanel, alToggleSourcePanel, closeAddLotModal, closeBatchFormModal, closeTransferKhoModal, deletePickedBatches, exitKanbanPickMode, handleAddLotSubmit, handleAlAddLocation, handleBatchFormSubmit, handleTransferKhoSubmit, kanbanSelectAll, onKanbanPickChange, openAddLotModal, openBatchFormModal, openTransferKhoModal, syncAddLotUI, syncTransferKhoUI, toggleKanbanPickMode, updateCkNewVolume, updateCkPosInfo } from './batch-modals.js';
import { applyRoleToUI, isFirebaseOnline, pullCloudToLocal, requireEditPermission, uploadLocalDataToCloud } from './cloud.js';
import { photoSyncKick, photoSyncNow } from './photo-sync.js'; // KÊNH ẢNH THUMB (đẩy dần, js/photo-sync.js)
import { untrackDeleted } from './tombstone.js';
import { closeChartBuilderModal, handleChartBuilderSubmit, openChartBuilderModal, populateBuilderOptions, updateChartBuilderPreview } from './dashboard.js';
import { closeCustomExportModal, closeExportPreviewModal, closeHrXlsxExportModal, closeMaterialsExportModal, closePlanningExportModal, closePressExportModal, closeQcXlsxExportModal, closeX2ExportModal, deleteExportPreviewRow, exportPreviewToXlsx, handleCustomExportSubmit, handleHrXlsxExportSubmit, handleMaterialsExportSubmit, handlePlanningExportSubmit, handlePressExportSubmit, handleQcXlsxExportSubmit, handleX2ExportSubmit, noteExportPreviewEdit, openCustomExportModal, openCustomExportPreview, openHrXlsxExportModal, openHrXlsxExportPreview, openMaterialsExportModal, openMaterialsExportPreview, openPlanningExportModal, openPlanningExportPreview, openPressExportModal, openPressExportPreview, openQcXlsxExportModal, openQcXlsxExportPreview, openX2ExportModal, printExportPreview, refreshExportPreview, setExportPreviewColWidth, syncHrXlsxCardUI } from './export-xlsx.js';
import { closeHistoryModal, openHistoryModal, setHistoryDomainFilter, setHistoryTabFilter, setHistoryUserFilter, clearHistory } from './history.js';
import { closeAiAssistant, copyAiResult, openAiAssistant, aiSaveKey, aiToggleKey, aiSetModel, runAiAnalysis, initAiFabDrag, aiFabDragConsumed, aiQuickAsk, aiHideBubble, aiSetAutoGreet } from './ai.js';
import { closeColumnFilters } from './kanban.js';
import { renderAll, setActiveMobileStage, switchView } from './main.js';
import { closeMaterialRateModal, closeMatrixTraceModal, closePlanningEditModal, closePlanningItemModal, dimUseKey, getUniqueNanTypes, handleMaterialRateSubmit, handlePlanningEditSubmit, handlePlanningItemSubmit, openMaterialRateModal, openMatrixTraceModal, openPlanningItemModal, planHistOnHideDone, planHistOnMonth, planHistOnQuarter, planHistOnRowClick, planHistOnSearch, renderPlanningMatrix, savePlanningForecast, savePlanningStock, toggleRateTableCollapse } from './planning.js';
import { addPressLine, addPressStick, closePressModal, closePressNoteModal, closePressWorkersModal, handlePressNoteDelete, handlePressNoteSubmit, handlePressRecordSubmit, hidePressNotePopover, handleX2EpVanRateSave, openPressModal, openPressNoteModal, openPressWorkersModal, populatePressWeekFilter, recalcPressQuantities, refreshPressProductSelect, refreshPressWorkersPreview, renderPlanCapacityChart, renderPlanVsPressChart, renderPressChart, renderX2EpVanDayCards, renderX2EpVanRateBar, showPressNotePopover, setPlanVsPressSpan, setPlanVsPressTotal, setPlanVsPressUnit, setPvChartMode, shiftPlanCapacityWindow, shiftPlanVsPressWeek, suggestPressMaterialFields, shiftPressWeekFilter, switchX2EpVanFrame, togglePlanVsPressMode, togglePressNotesExpanded } from './press.js';
import { addMaterialPlanWeek, closeMaterialModal, closeMaterialPhotoModal, deleteMaterial, handleMaterialImageSelect, handleMaterialPlanInput, handleMaterialSubmit, materialPhotoNav, openMaterialModal, openMaterialPhotoModal, refreshMaterialTypeSuggestions, removeMaterialPlanWeek, renderMaterialImagePreviews, renderMaterialPlanChart, renderMaterialPlanTable, renderMaterialView, shiftMaterialPlanChartWeek, updateMaterialWeight } from './materials.js';
import { baoTinhClearPicks, baoTinhPickAll, renderX2BaoTinhList, addBaoThanhOutSize, baoTinhInputPool, setBaoThanhInput, setBaoThanhOut, toggleBaoThanhInputPicker, toggleBaoThanhOutPicker, renderBaoThanhInputList, renderX2BaoThanhForm, openX2BaoTinhRateModal, closeX2BaoTinhRateModal, renderX2BaoTinhRateModal, handleX2BaoTinhRateAddMonth, handleX2BaoTinhRateRowSave, handleX2BaoTinhRateRowReset, setX2BaoTinhFilterMode, shiftX2BaoTinhFilter, deleteXuong2BaoTho, deleteXuong2BoOng, deleteXuong2ChonNan, deleteXuong2Bullig, deleteXuong2Cut, deleteXuong2Boluong, deleteXuong2BaoTinh, editXuong2BaoTho, editXuong2BoOng, editXuong2ChonNan, onChonNanInlineEdit, nanSay1UseOf, editXuong2Bullig, editXuong2Cut, editXuong2Boluong, editXuong2BaoTinh, handleX2BaoThoRateSave, handleX2BoOngRateSave, handleX2BulligRateSave, handleX2CapRateSave, handleX2BoluongRateSave, handleX2ChonNanRateSave, handleXuong2BaoThoSubmit, handleXuong2BaoTinhSubmit, handleXuong2BoOngSubmit, handleXuong2BulligSubmit, handleXuong2ChonNanSubmit, handleXuong2CutSubmit, handleXuong2BoluongSubmit, onBaoTinhListClick, onBaoTinhGroupInput, onBaoTinhGroupClick, onBulligListClick, renderX2BaoThoCalc, renderX2BaoTinhCalc, renderX2BaoTinhGroups, renderX2BaoThoRateBar, renderX2BoOngRateBar, renderX2BoluongRateBar, renderX2BulligCalc, renderX2BulligRateBar, renderX2BulligLotList, renderX2ChonNanCalc, renderX2ChonNanRateBar, resetXuong2BaoThoForm, resetXuong2BaoTinhForm, resetXuong2BoOngForm, resetXuong2BulligForm, resetXuong2ChonNanForm, resetXuong2CutForm, resetXuong2BoluongForm, syncX2BulligKindRows, syncX2ChonNanExternalFields, toggleX2BaoThoTable, toggleX2BaoTinhTable, toggleX2BoOngTable, toggleX2BulligTable, toggleX2ChonNanTable, toggleX2CutTable, toggleX2BoluongTable, toggleX2KanbanBoard, onSayTimesChange, onSayIncidentChange, onStageIncidentChange, closeX2SayRateModal, handleX2SayRateAddMonth, handleX2SayRateM3Save, handleX2SayRateRowReset, handleX2SayRateRowSave, openX2SayRateModal, renderX2SayRateModal, syncX2SayRateM3Inputs, updateXuong2BaoThoLinked, baoThoLotSelectAll, baoThoLotSelectNone, X2_RATE_POPUPS, openX2RatePopup, closeX2RatePopup, updateXuong2BaoTinhLinked, updateXuong2BoOngLinked, updateXuong2ChonNanLinked, updateXuong2CutLinked, updateXuong2BoluongLinked, x2BaoTinhTogglePicker, x2FloatHideAll, x2FloatMaybeClose, x2FloatRepositionAll, x2CloseOpenCard, x2OpenCard, x2OpenCardExportSource, x2OpenCardHistoryDomain, x2PositionDetailOverlay, switchX2SayFrame, setStageWs, toggleStageWs, handleX1CatOngSubmit, handleX1SaySinhSubmit, handleX1BocSubmit, editX1CatOng, editX1SaySinh, editX1Boc, deleteX1CatOng, deleteX1SaySinh, deleteX1Boc, resetX1CatOngForm, resetX1SaySinhForm, resetX1BocForm, x1CatOngSyncLinked, x1SaySinhSyncLinked, x1BocSyncLinked, x1CatOngCalc, x1SaySinhCalc, x1BocCalc, openX1RatePopup, closeX1RatePopup, renderX1RatePopup, handleX1RateSave, handleX1RateReset,
  X1_CHAIN_SPECS, x1ChainSpec, handleX1ChainSubmit, editX1Chain, deleteX1Chain, resetX1ChainForm, x1ChainSyncLinked, x1ChainCalc } from './xuong2.js';
import { handleKhoNoteSubmit, resetX2KhoNoteForm, setKhoNoteType, setKhoPeriodMode, khoSetShowUsed, khoToggleLotsPanel, khoOnLotsPanelClick, khoOnLotsQtyInput, khoSetLotsQuery, khoOnPendingClick, khoOnWipClick, khoApprovePicked, khoPickAllPending, toggleX2KhoTable, toggleX2KhoStockTable, renderX2KhoCalc, fillX2KhoSizeSuggestions, renderX2KhoLedger, khoBackfillFromLegacy } from './xuong2.js'; // THẺ KHO NAN — phiếu kho + sổ nhập/xuất
import { closeKilnMenus, handleKilnThresholdSave, kilnTileDragStart, onKilnBoardClick, onKilnKhoDragLeave, onKilnKhoDragOver, onKilnKhoDrop, onKilnMatrixClick, saveKilnHumidityForm } from './kiln.js'; // Bảng điều khiển lò sấy + Ma trận độ ẩm lò sấy
import { closeSupplierModal, deleteSupplier, handleSupplierSubmit, normalizeSupplierNames, openSupplierModal } from './suppliers.js';
// Bảng TỔNG HỢP CÔNG SUẤT & HIỆU SUẤT (thẻ #capacity-card — đầu tab Tổng Quan)
import { printCapacityReport, selectCapacityStage, setCapacityMode, setCapacityMonth, setCapacityView, setCapacityWeek, shiftCapacityWeek, toggleCapacityCollapse, toggleCapacityStageDays, toggleCapacityWeekOpen, toggleCapacityWorkshop } from './capacity.js';
import { closeQcExportModal, deleteQcExport, handleQcExportSubmit, hideQcCustomName, onQcProductChange, openQcExportModal, qcCloseOpenCard, qcImpAddCustom, qcImpFooterInfo, qcImpLoadPlan, qcImpRemoveRow, qcImpSetChecked, qcImpSetQty, qcOpenCard, qcPositionDetailOverlay, renderQcImpRows, renderQcSearch, renderQcSummary, renderQcTable, showQcCustomName, updateQcCardGrid, updateQcExportRow } from './qc.js';
import { closeQcFinalRateModal, handleQcFinalRateAddMonth, handleQcFinalSubmit, onQcFinalListClick, onQcFinalRateRowClick, onQcFinalTableClick, openQcFinalRateModal, positionQcFinalPicker, qcFinalMaybeClosePicker, qcFinalOnDateChange, renderQcFinalProductList, resetQcFinalForm, setQcFinalPickerOpen, setQcFinalSearchQ, syncQcFinalKindFields, syncQcFinalWorkshopFields, toggleQcFinalPicker } from './qc-final.js'; // THẺ KIỂM SAU SẢN XUẤT (tab QC — js/qc-final.js)
import { applyAllCheckins, closeEmployeeImportModal, closeEmployeeModal, closeCheckinImportModal, closeLeaveModal, closePositionModal, closeRecruitmentModal, closePositionNeedModal, collectEmployeeSkills, deleteCheckin, deleteCheckinsAll, doCheckinImport, doEmployeeImport, handleCheckinImportFile, handleEmployeeImportFile, handleEmployeeSubmit, handleLeaveEmployeeKeydown, handleLeaveSubmit, handleOvertimeSubmit, openOvertimeModal, closeOvertimeModal, openHrCalendarModal, closeHrCalendarModal, hrCalSetMonth, hrCalToggleDay, hrCalToggleWeekday, handleHrCalendarSubmit, syncEmployeeQuitDateRow, renderOvertimeEmployeeSuggestions, pickOvertimeEmployee, handleOvertimeEmployeeKeydown, hideOvertimeEmployeeSuggestions, handlePositionSubmit, handleRecruitmentSubmit, handlePositionNeedSubmit, openPositionNeedModal, deletePositionNeed, renderPositionNeedsTable, syncPositionNeedsFromEmployees, renderHrBoard, hrBoardSetDate, hrBoardShiftDay, hrBoardGoToday, hrBoardSetDept, hrBoardOpenAssign, closeBoardAssignModal, handleBoardAssignSubmit, hrBoardRemoveAssign, renderBoardAssignSuggestions, pickBoardAssignEmployee, openShiftModal, closeShiftModal, handleShiftSubmit, setShiftTypePreset, hideLeaveEmployeeSuggestions, hrAttGoToday, hrAttSetDate, hrAttSetMonth, hrAttShiftDay, hrOpenCard, hrCloseOpenCard, hrPositionDetailOverlay, openCheckinImportModal, openEmployeeImportModal, openEmployeeModal, openLeaveModal, openPositionModal, openRecruitmentModal, pickLeaveEmployee, syncLeaveDurationUI, renderEmployeeSkillsBox, renderHrAttendanceCard, renderHrAttendanceStats, renderHrEmployeesTable, renderHrRecruitmentTable, renderLeaveEmployeeSuggestions, renderHrView, setAttendanceNote, setAttendanceStatus, syncHrMiniActive, syncSkillsFromAssignments, toggleAttendancePosition } from './hr.js';
import { state } from './state.js';
import { getFxLow, setFxLow, applyThemeForUser } from './theme.js';
import { captureAutoBackup, closeAutoBackupModal, closeCloudBackupModal, openAutoBackupModal, openCloudBackupModal, renderCloudBackupList } from './autobackup.js';
import { closeSaveLocalModal, disconnectDataFolder, exportToJSON, handleImportJSON, loadDataFromLocalFile, openSaveLocalModal, saveData, saveDataToLocalFile, selectDataFolder } from './storage.js';
import { generateBatchCodeYYMMDD, getISOWeekString, escapeHTML, showToast } from './utils.js';

  // ─── UNDO / HOÀN TÁC ──────────────────────────────────────────
  function pushUndo(label) {
    state.undoStack.push({
      label,
      batches: JSON.parse(JSON.stringify(state.batches)),
      timestamp: Date.now()
    });
    // Giới hạn tối đa 30 bước undo
    if (state.undoStack.length > 30) state.undoStack.shift();
    updateUndoButton();
  }

  function undoLastAction() {
    if (!requireEditPermission()) return;
    const last = state.undoStack.pop();
    if (!last) {
      showToast('Không có thao tác nào để hoàn tác!', 'info');
      return;
    }
    state.batches = last.batches;
    // Hoàn tác có thể khôi phục lại lô đã xóa -> gỡ tombstone của các id đang sống lại,
    // nếu không lần đẩy mây sau sẽ mang theo dấu vết xóa che mất lô vừa được phục hồi
    untrackDeleted('batches', (state.batches || []).map(b => b.id));
    saveData();
    renderAll();
    updateUndoButton();
    showToast(`Đã hoàn tác: ${last.label}`, 'success');
  }

  function updateUndoButton() {
    const btn = document.getElementById('btn-undo');
    if (btn) {
      btn.disabled = state.undoStack.length === 0;
      btn.title = state.undoStack.length > 0
        ? `Hoàn tác (${state.undoStack[state.undoStack.length - 1].label})`
        : 'Không có thao tác để hoàn tác';
    }
  }

  // ─── EVENT LISTENERS ──────────────────────────────────────────
  function setupEventListeners() {
    // Helper: safe addEventListener
    function safeOn(id, event, handler) {
      const el = document.getElementById(id);
      if (el) el.addEventListener(event, handler);
    }

    // Navigation
    document.querySelectorAll('.nav-btn, .mobile-nav-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-target');
        if (target) switchView(target);
      });
    });

    // Mobile Stage Tabs — chọn công đoạn xem trên điện thoại/máy tính bảng
    document.querySelectorAll('.stage-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        setActiveMobileStage(tab.getAttribute('data-stage'));
      });
    });

    // ─── VUỐT NGANG CHUYỂN CÔNG ĐOẠN TRÊN BẢNG KANBAN (điện thoại) ───
    // Vuốt sang trái -> công đoạn kế tiếp (Sấy 1 → Sấy 2 → Kho; cột Bào Tinh ĐÃ XÓA)
    // Vuốt sang phải -> công đoạn trước
    const kanbanBoard = document.querySelector('.kanban-board');
    if (kanbanBoard) {
      const STAGE_ORDER = ['say1', 'say2', 'kho'];
      let touchStartX = 0, touchStartY = 0, isTracking = false;
      kanbanBoard.addEventListener('touchstart', (e) => {
        if (!e.touches || e.touches.length !== 1) { isTracking = false; return; }
        isTracking = true;
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
      }, { passive: true });
      kanbanBoard.addEventListener('touchend', (e) => {
        if (!isTracking) return;
        isTracking = false;
        const touch = e.changedTouches && e.changedTouches[0];
        if (!touch) return;
        const dx = touch.clientX - touchStartX;
        const dy = touch.clientY - touchStartY;
        // Chỉ nhận cú vuốt ngang rõ ràng, không nhầm với cuộn dọc
        if (Math.abs(dx) < 56 || Math.abs(dx) < Math.abs(dy) * 1.4) return;
        const curIdx = STAGE_ORDER.indexOf(state.activeMobileStage);
        if (curIdx === -1) return; // đang ở chế độ "Tất cả" (xem dọc) -> không vuốt
        const nextIdx = curIdx + (dx < 0 ? 1 : -1);
        if (nextIdx < 0 || nextIdx >= STAGE_ORDER.length) return;
        closeColumnFilters();
        setActiveMobileStage(STAGE_ORDER[nextIdx], dx < 0 ? 1 : -1);
      }, { passive: true });
    }

    // Dropdown Menu
    const moreBtn = document.getElementById('btn-more-menu');
    const dropdown = document.getElementById('header-dropdown');
    if (moreBtn && dropdown) {
      moreBtn.addEventListener('click', (e) => { e.stopPropagation(); dropdown.classList.toggle('show'); });
      document.addEventListener('click', () => dropdown.classList.remove('show'));
    }

    // Đóng dropdown lọc cột khi bấm vào vị trí trống bất kỳ bên ngoài dropdown
    // (ô tìm kiếm gợi ý cạnh nút Lọc Cột cũng được tính là vùng của bộ lọc)
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.column-filter-dropdown') && !e.target.closest('.column-filter-btn') && !e.target.closest('.column-search-wrap')) {
        closeColumnFilters();
      }
    });

    // Login
    safeOn('btn-open-login', 'click', () => {
      document.getElementById('modal-login')?.classList.add('show');
    });
    safeOn('btn-toggle-register', 'click', toggleRegisterForm);
    safeOn('btn-back-login', 'click', () => toggleRegisterForm(false));
    safeOn('register-form', 'submit', handleRegisterSubmit);
    safeOn('login-form', 'submit', (e) => {
      e.preventDefault();
      const userVal = document.getElementById('login-username').value.trim();
      const passVal = document.getElementById('login-password').value.trim();

      // ONLINE: nếu nhập email (chứa '@') => dùng Firebase Auth
      if (isFirebaseOnline() && userVal.includes('@')) {
        window.firebase.auth().signInWithEmailAndPassword(userVal, passVal)
          .catch((err) => {
            let msg = err && err.message ? err.message : 'Đăng nhập thất bại';
            if (err && err.code === 'auth/user-not-found') msg = 'Tài khoản Firebase chưa được tạo, hoặc email sai.';
            if (err && err.code === 'auth/wrong-password') msg = 'Mật khẩu không đúng.';
            if (err && err.code === 'auth/invalid-credential') msg = 'Email hoặc mật khẩu không đúng.';
            showToast(msg, 'error');
          });
        return;
      }

      // OFFLINE (hoặc nhập tên đăng nhập): kiểm tra trong users cục bộ
      const user = state.users.find(u => u.username.toLowerCase() === userVal.toLowerCase() && u.password === passVal);
      if (user) {
        state.currentUser = user;
        saveSession();
        applyRoleToUI(user.role); // phân quyền đã dồn về js/permissions.js
        applyThemeForUser(user.username); // áp giao diện người này đã chọn (nếu có)
        checkAuthAndRender();
        photoSyncKick(); // vừa có quyền → đẩy nốt ảnh đang chờ ở kênh ảnh
        showToast(`Xin chào ${user.fullname || user.username}!`, 'success');
      } else {
        showToast('Tên đăng nhập hoặc mật khẩu không chính xác!', 'error');
      }
    });

    safeOn('btn-logout', 'click', () => {
      // Nếu online: đăng xuất khỏi Firebase (authState sẽ trả về null -> về màn hình đăng nhập)
      if (isFirebaseOnline()) {
        window.firebase.auth().signOut().catch(() => {});
      } else {
        state.currentUser = null;
        saveSession();
        applyRoleToUI(null);
        checkAuthAndRender();
      }
      showToast('Đã đăng xuất khỏi hệ thống', 'info');
    });

    // ── Đăng ký tài khoản (online) ──
    // Add Batch
    safeOn('btn-add-batch', 'click', () => openAddLotModal());
    // ── CHUYỂN KHO (Than Hóa + Sấy): Sấy 1 / Sấy 2 → Kho hoặc thêm mới vào Kho ──
    safeOn('btn-transfer-kho', 'click', () => openTransferKhoModal());
    // ── XÓA NHIỀU LÔ (CHỈ Admin): bật chế độ tích chọn trên thẻ + thanh nổi đếm ──
    safeOn('btn-multi-delete', 'click', () => {
      toggleKanbanPickMode();
      // Đang bật chế độ chọn → đảm bảo người dùng THẤY thẻ lô để tích: chuyển về
      // khung "Bảng Dữ Liệu" + mở lại bảng Kanban nếu đang thu gọn.
      if (state.kanbanPickMode) {
        const hoaCard = document.getElementById('x2-than-hoa-card');
        if (hoaCard && hoaCard.classList && hoaCard.classList.contains('kanban-board-collapsed')) toggleX2KanbanBoard();
        switchX2SayFrame('data');
      }
    });
    safeOn('kb-pick-del',    'click', () => deletePickedBatches());
    safeOn('kb-pick-all',    'click', () => kanbanSelectAll());
    safeOn('kb-pick-cancel', 'click', () => exitKanbanPickMode());
    // Nút thực thi XÓA NHIỀU ngay trên thanh công cụ (thanh nổi đáy màn hình vẫn giữ)
    safeOn('kb-pick-inline-del', 'click', () => deletePickedBatches());
    safeOn('kb-pick-inline-cancel', 'click', () => exitKanbanPickMode());
    // Ô tích chọn trên thẻ lô là NỘI DUNG ĐỘNG (vẽ lại mỗi lần render) → uỷ nhiệm
    // sự kiện change qua document, bắt mọi ô .kb-pick-box ở mọi thời điểm
    document.addEventListener('change', (e) => {
      const box = e.target && e.target.closest ? e.target.closest('.kb-pick-box') : null;
      if (!box) return;
      onKanbanPickChange(box.getAttribute('data-pick-id'), !!box.checked);
    });
    safeOn('btn-close-transfer-kho', 'click', closeTransferKhoModal);
    safeOn('btn-cancel-transfer-kho', 'click', closeTransferKhoModal);
    safeOn('transfer-kho-form', 'submit', handleTransferKhoSubmit);
    safeOn('ck-stage', 'change', syncTransferKhoUI);
    ['ck-new-length', 'ck-new-width', 'ck-new-thickness', 'ck-new-qty'].forEach(id => {
      safeOn(id, 'input', updateCkNewVolume);
    });
    // ── THÊM LÔ SẤY MỚI: nguồn Sấy 1 = thẻ nan Chọn Nan Thô · Sấy 2 = lô ở Kho ──
    safeOn('btn-close-add-lot', 'click', closeAddLotModal);
    safeOn('btn-cancel-add-lot', 'click', closeAddLotModal);
    safeOn('add-lot-form', 'submit', handleAddLotSubmit);
    safeOn('al-stage', 'change', syncAddLotUI);
    // Nguồn: nút "Chọn Lô Nan" mở danh sách THẺ (chọn được NHIỀU nguồn cùng lúc)
    safeOn('al-source-btn', 'click', alToggleSourcePanel);
    safeOn('al-source-list', 'click', alOnSourceListClick);
    safeOn('al-source-search', 'input', (e) => alSetSourceQuery(e.target.value));
    // Ô TÌM THEO SỐ LƯỢNG (tách riêng): CHỈ khớp số lượng — lọc KẾT HỢP với ô tìm nhanh
    safeOn('al-source-qty-search', 'input', (e) => alSetSourceQtyQuery(e.target.value));
    // Đổi Dùng Cho → vẽ lại danh sách (thẻ nan Chọn Nan Thô hiện "theo form (….)")
    safeOn('al-use-for', 'change', () => alSetSourceQuery((document.getElementById('al-source-search') || {}).value || ''));
    safeOn('al-pick-all', 'click', alPickAll);
    // DROPDOWN NỔI danh sách nguồn: neo lại khi CUỘN bất kỳ vùng nào / đổi cỡ màn hình
    window.addEventListener('scroll', () => alPositionSourcePanel(), true);
    window.addEventListener('resize', () => alPositionSourcePanel());
    // Vị trí: nút chọn → chips LS1..LS15 + nút "Thêm" (khai báo vị trí mới)
    safeOn('al-location-btn', 'click', alToggleLocationPanel);
    safeOn('al-location-chips', 'click', alOnLocationChipClick);
    safeOn('al-location-add', 'click', alShowNewLocationRow);
    safeOn('al-location-new-save', 'click', handleAlAddLocation);
    // Enter trong ô nhập vị trí mới = LƯU vị trí (không submit cả form)
    safeOn('al-location-new', 'keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); handleAlAddLocation(); }
    });
    // Chuyển Kho: đổi VỊ TRÍ đang chọn → cập nhật ô tóm tắt vị trí
    safeOn('ck-lot', 'change', updateCkPosInfo);
    // ĐIỆN THOẠI: chạm ra ngoài danh sách mở rộng (nguồn / vị trí) → tự đóng
    // (thao tác 1 tay; chạm vào nút hoặc trong danh sách thì KHÔNG đóng)
    document.addEventListener('click', (e) => {
      const t = e.target;
      if (!t || typeof t.closest !== 'function') return;
      // Bấm chọn thẻ nguồn / xóa chip làm danh sách VẼ LẠI → phần tử vừa chạm đã
      // rời DOM (closest không còn thấy khung chứa) ⇒ bỏ qua để danh sách ở lại
      if (typeof document.contains === 'function' && !document.contains(t)) return;
      if (!t.closest('#al-source-panel') && !t.closest('#al-source-btn')) {
        const p = document.getElementById('al-source-panel');
        if (p) p.hidden = true;
      }
      if (!t.closest('#al-location-panel') && !t.closest('#al-location-btn')) {
        const p = document.getElementById('al-location-panel');
        if (p) p.hidden = true;
      }
      // Dropdown NỔI của Xưởng 2 (Bào Tinh 3 danh sách · Bullig danh sách lô):
      // chạm ra ngoài → ĐÓNG + trả node về lại chỗ cũ trong form
      x2FloatMaybeClose(e);
    });

    // Undo / Hoàn tác khi nhập sai
    safeOn('btn-undo', 'click', undoLastAction);
    // Phím tắt Ctrl+Z để hoàn tác
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' &&
          !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) {
        e.preventDefault();
        undoLastAction();
      }
    });

    // Batch Form
    safeOn('form-date', 'change', (e) => {
      const dateVal = e.target.value;
      if (dateVal) {
        const weekEl = document.getElementById('form-week');
        if (weekEl) weekEl.value = getISOWeekString(dateVal);
        const batchIdEl = document.getElementById('form-batch-id');
        if (batchIdEl && !batchIdEl.value) {
          const codeEl = document.getElementById('form-code');
          if (codeEl) codeEl.value = generateBatchCodeYYMMDD(dateVal);
        }
      }
    });

    safeOn('btn-regen-code', 'click', () => {
      const dateVal = document.getElementById('form-date')?.value;
      const codeEl = document.getElementById('form-code');
      if (codeEl) codeEl.value = generateBatchCodeYYMMDD(dateVal);
      showToast('Đã tạo mã YYMMDD mới!', 'info');
    });

    safeOn('btn-close-form',  'click', closeBatchFormModal);
    safeOn('btn-cancel-form', 'click', closeBatchFormModal);
    safeOn('batch-form',      'submit', handleBatchFormSubmit);

    // ── Ngày vào công đoạn thực tế: hiện theo công đoạn được chọn (Sấy 2 / Kho / Bào Tinh) ──
    safeOn('form-stage',            'change', () => {
      const stage = document.getElementById('form-stage')?.value;
      // Form thêm/sửa thẻ: mỗi công đoạn có ô ngày thực tế riêng của nó
      const map = { say2: 'form-say2-date-group', kho: 'form-kho-date-group', bao_tinh: 'form-baotinh-date-group' };
      ['form-say2-date-group', 'form-kho-date-group', 'form-baotinh-date-group'].forEach(id => {
        const g = document.getElementById(id);
        if (!g) return;
        g.style.display = (map[stage] === id) ? '' : 'none';
        if (map[stage] === id) {
          // Điền sẵn hôm nay nếu ô còn trống (ngày thực tế khác thì sửa lại)
          const inp = document.getElementById(id.replace('-group', ''));
          if (inp && !inp.value) inp.value = new Date().toISOString().split('T')[0];
        }
      });
    });
    // User Manager
    safeOn('btn-open-users-mgr', 'click', openUsersMgrModal);
    safeOn('btn-close-users',    'click', closeUsersMgrModal);
    safeOn('btn-cancel-users',   'click', closeUsersMgrModal);
    safeOn('add-user-form',      'submit', handleAddUserSubmit);
    // Sửa người dùng (Admin)
    safeOn('btn-close-user-edit', 'click', closeUserEditModal);
    safeOn('btn-cancel-user-edit', 'click', closeUserEditModal);
    safeOn('user-edit-form',      'submit', handleUserEditSubmit);

    // Đồng bộ đám mây (Firebase) — thao tác THỦ CÔNG qua 2 nút trong menu ⋮, KHÔNG tự hỏi/nhắc nhở
    safeOn('btn-upload-cloud',      'click', uploadLocalDataToCloud);
    safeOn('btn-pull-cloud',        'click', pullCloudToLocal);
    // KÊNH ẢNH THUMB — đẩy thủ công ngay các ảnh đang chờ (js/photo-sync.js)
    safeOn('btn-sync-photos',       'click', photoSyncNow);

    // Auto backup — phục hồi bản cất trên máy / trên mây (js/autobackup.js, chỉ Admin)
    safeOn('btn-open-autobackup',     'click', openAutoBackupModal);
    safeOn('btn-close-autobackup',    'click', closeAutoBackupModal);
    safeOn('btn-cancel-autobackup',   'click', closeAutoBackupModal);
    safeOn('btn-open-cloud-backup',   'click', openCloudBackupModal);
    safeOn('btn-close-cloud-backup',  'click', closeCloudBackupModal);
    safeOn('btn-cancel-cloud-backup', 'click', closeCloudBackupModal);
    safeOn('btn-reload-cloudbackups', 'click', renderCloudBackupList);

    // Custom XLSX Export (nút "Xuất Excel" riêng của tab Công Đoạn)
    safeOn('btn-open-export-modal',  'click', openCustomExportModal);
    safeOn('btn-close-export-modal', 'click', closeCustomExportModal);
    safeOn('btn-cancel-export',      'click', closeCustomExportModal);
    safeOn('custom-export-form',     'submit', handleCustomExportSubmit);

    // Xuất Excel riêng từng tab: Kế Hoạch / Ép Ván / Nguyên Liệu
    safeOn('btn-open-export-planning',   'click', openPlanningExportModal);
    safeOn('btn-close-export-planning',  'click', closePlanningExportModal);
    safeOn('btn-cancel-export-planning', 'click', closePlanningExportModal);
    safeOn('planning-export-form',       'submit', handlePlanningExportSubmit);
    // ── 2 NÚT DÙNG CHUNG trong pop-up thẻ Xưởng 2 (Lịch Sử + Xuất Dữ Liệu) ──
    safeOn('btn-history-x2',             'click', () => openHistoryModal('kanban', x2OpenCardHistoryDomain()));
    safeOn('btn-export-x2',              'click', () => openX2ExportModal(x2OpenCardExportSource())); // xuất theo THẺ đang mở
    safeOn('x2-export-form',             'submit', handleX2ExportSubmit);
    safeOn('btn-close-export-x2',        'click', closeX2ExportModal);
    safeOn('btn-cancel-export-x2',       'click', closeX2ExportModal);
    safeOn('btn-close-export-press',     'click', closePressExportModal);
    safeOn('btn-cancel-export-press',    'click', closePressExportModal);
    safeOn('press-export-form',          'submit', handlePressExportSubmit);
    safeOn('btn-open-export-materials',   'click', openMaterialsExportModal);
    safeOn('btn-close-export-materials',  'click', closeMaterialsExportModal);
    safeOn('btn-cancel-export-materials', 'click', closeMaterialsExportModal);
    safeOn('materials-export-form',       'submit', handleMaterialsExportSubmit);
    // Xuất Excel tab QC — Bảng Xuất Hàng
    safeOn('btn-open-export-qc',   'click', openQcXlsxExportModal);
    safeOn('btn-close-export-qc',  'click', closeQcXlsxExportModal);
    safeOn('btn-cancel-export-qc', 'click', closeQcXlsxExportModal);
    safeOn('qc-xlsx-export-form',  'submit', handleQcXlsxExportSubmit);
    safeOn('btn-preview-qc',       'click', openQcXlsxExportPreview);
    // Xuất Excel tab Nhân Sự — chọn theo thẻ nhanh (mini card)
    safeOn('btn-open-export-hr',   'click', openHrXlsxExportModal);
    safeOn('btn-close-export-hr',  'click', closeHrXlsxExportModal);
    safeOn('btn-cancel-export-hr', 'click', closeHrXlsxExportModal);
    safeOn('hr-xlsx-export-form',  'submit', handleHrXlsxExportSubmit);
    safeOn('btn-preview-hr',       'click', openHrXlsxExportPreview);
    safeOn('export-hr-card',       'change', syncHrXlsxCardUI);

    // ── Lịch làm việc theo tháng (ngày nghỉ/lễ — modal Lịch Tháng) ──
    safeOn('btn-hr-calendar',          'click', openHrCalendarModal);
    safeOn('btn-close-hr-calendar',    'click', closeHrCalendarModal);
    safeOn('btn-cancel-hr-calendar',   'click', closeHrCalendarModal);
    safeOn('hr-calendar-form',         'submit', handleHrCalendarSubmit);
    safeOn('hr-calendar-month',        'change', (e) => hrCalSetMonth(e.target.value));
    // Lưới lịch + nút thứ render động → event delegation (click bật/tắt)
    const hrCalBox = document.getElementById('hr-calendar-grid');
    if (hrCalBox) {
      hrCalBox.addEventListener('click', (e) => {
        const cell = e.target && e.target.closest ? e.target.closest('[data-cal-day]') : null;
        if (cell) hrCalToggleDay(cell.getAttribute('data-cal-day'));
      });
    }
    const hrCalWdBox = document.getElementById('hr-calendar-weekdays');
    if (hrCalWdBox) {
      hrCalWdBox.addEventListener('click', (e) => {
        const wd = e.target && e.target.closest ? e.target.closest('[data-cal-wd]') : null;
        if (wd) hrCalToggleWeekday(parseInt(wd.getAttribute('data-cal-wd'), 10));
      });
    }

    // ── Trợ lý AI (Google Gemini miễn phí) — nút nổi KÉO ĐƯỢC góc màn hình ──
    initAiFabDrag(); // gắn giữ + rê để di chuyển nút (chỉ gắn 1 lần, nhớ vị trí cục bộ)
    safeOn('btn-open-ai', 'click', (e) => {
      if (aiFabDragConsumed()) return; // vừa kéo nút xong — cú click sinh ra từ kéo → bỏ qua
      openAiAssistant();
    });
    safeOn('btn-close-ai', 'click', closeAiAssistant);
    safeOn('btn-ai-run', 'click', runAiAnalysis);
    // Ô hỏi AI tự do: Ctrl+Enter (hoặc Cmd+Enter) cũng chạy phân tích
    safeOn('ai-question', 'keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (typeof e.preventDefault === 'function') e.preventDefault();
        runAiAnalysis();
      }
    });
    // Chip hỏi nhanh theo tab/nội dung — bấm là điền câu hỏi và chạy luôn
    const aiChipsBox = document.getElementById('ai-quick-chips');
    if (aiChipsBox) aiChipsBox.addEventListener('click', (e) => {
      const chip = e.target && e.target.closest ? e.target.closest('[data-ai-q]') : null;
      if (chip) aiQuickAsk(chip.getAttribute('data-ai-q'));
    });
    // Bong bóng gợi ý tự động "Nan Bot": bấm vào nội dung mở modal AI, nút ✕ chỉ đóng
    safeOn('btn-ai-bubble-close', 'click', aiHideBubble);
    safeOn('ai-fab-bubble', 'click', (e) => {
      if (e.target && e.target.closest && e.target.closest('#btn-ai-bubble-close')) return;
      openAiAssistant();
    });
    // Công tắc gợi ý tự động trong modal (lưu localStorage từng máy)
    safeOn('ai-autogreet-toggle', 'change', (e) => aiSetAutoGreet(e.target.checked));

    // ── GIAO DIỆN ĐÃ KHÓA CỨNG (một giao diện duy nhất — js/theme.js):
    // không còn chọn Sáng/Đêm Kính/Auto và đã xóa nút đổi nhanh ở header.
    // Menu ⋮ chỉ còn công tắc "Giảm Hiệu Ứng" (máy yếu).
    function syncThemeMenuUi() {
      const fx = document.getElementById('btn-fx-low');
      if (fx) fx.classList.toggle('theme-active', getFxLow());
    }
    safeOn('btn-fx-low', 'click', () => {
      setFxLow(!getFxLow());
      syncThemeMenuUi();
      showToast(getFxLow() ? 'Đã GIẢM hiệu ứng — máy yếu chạy mượt hơn.' : 'Đã bật lại đầy đủ hiệu ứng kính.', 'info');
    });
    syncThemeMenuUi();
    safeOn('btn-ai-copy', 'click', copyAiResult);
    safeOn('btn-ai-save-key', 'click', aiSaveKey);
    safeOn('btn-ai-key-toggle', 'click', aiToggleKey);
    safeOn('ai-model-select', 'change', (e) => aiSetModel(e.target.value));

    // ── Xem trước & chỉnh sửa báo cáo trước khi xuất/in ──
    safeOn('btn-preview-custom',    'click', openCustomExportPreview);
    safeOn('btn-preview-planning',  'click', openPlanningExportPreview);
    safeOn('btn-preview-press',    'click', openPressExportPreview);
    safeOn('btn-preview-materials','click', openMaterialsExportPreview);
    safeOn('btn-preview-refresh',   'click', refreshExportPreview);
    safeOn('btn-preview-export-xlsx', 'click', exportPreviewToXlsx);
    safeOn('btn-preview-print',     'click', printExportPreview);
    safeOn('btn-close-export-preview',  'click', closeExportPreviewModal);
    safeOn('btn-cancel-export-preview', 'click', closeExportPreviewModal);
    // Bảng xem trước render động → event delegation: nút ✕ (bỏ dòng) + sửa ô
    const exportPreviewBox = document.getElementById('export-preview-table-box');
    if (exportPreviewBox) {
      exportPreviewBox.addEventListener('click', (e) => {
        const delBtn = e.target && e.target.closest ? e.target.closest('[data-del-row]') : null;
        if (delBtn) deleteExportPreviewRow(parseInt(delBtn.getAttribute('data-del-row'), 10));
      });
      exportPreviewBox.addEventListener('input', (e) => {
        const td = e.target && e.target.closest ? e.target.closest('td[data-r][data-c]') : null;
        if (td) noteExportPreviewEdit(parseInt(td.dataset.r, 10), parseInt(td.dataset.c, 10), td.textContent);
      });
      // Kéo mép phải ô (băng qua mép cột) để đổi độ rộng cột — cập nhật mượt qua <col>
      let colDragInfo = null;
      exportPreviewBox.addEventListener('mousedown', (e) => {
        const td = e.target && e.target.closest ? e.target.closest('td[data-r][data-c]') : null;
        if (!td || td.colSpan !== 1) return;
        const rect = td.getBoundingClientRect ? td.getBoundingClientRect() : null;
        if (!rect || rect.width <= 0) return;
        if ((e.clientX - rect.left) >= rect.width - 6) {
          colDragInfo = { c: parseInt(td.dataset.c, 10), startX: e.clientX, startW: rect.width };
          e.preventDefault();
        }
      });
      document.addEventListener('mousemove', (e) => {
        if (!colDragInfo) return;
        setExportPreviewColWidth(colDragInfo.c, colDragInfo.startW + (e.clientX - colDragInfo.startX));
      });
      document.addEventListener('mouseup', () => { colDragInfo = null; });
    }

    // File Storage (Lưu dữ liệu vào file cùng thư mục)
    safeOn('btn-select-data-folder',      'click', selectDataFolder);
    safeOn('btn-disconnect-data-folder',  'click', disconnectDataFolder);
    // Ẩn nút chọn thư mục trên thiết bị không hỗ trợ File System Access API (Android/iOS)
    if (!window.showDirectoryPicker) {
      const btnSelect = document.getElementById('btn-select-data-folder');
      if (btnSelect) btnSelect.style.display = 'none';
    }

    // Lưu Dữ Liệu Cục Bộ
    safeOn('btn-save-local',        'click', openSaveLocalModal);
    safeOn('btn-close-save-local',  'click', closeSaveLocalModal);
    safeOn('btn-cancel-save-local', 'click', closeSaveLocalModal);
    safeOn('btn-save-local-file',   'click', saveDataToLocalFile);
    safeOn('btn-load-local-file',   'click', () => {
      const fi = document.getElementById('file-load-local');
      if (fi) fi.click();
    });
    // AUTO BACKUP (lớp 1): chụp bản cất TRƯỚC khi nạp file cục bộ đã lưu
    safeOn('file-load-local', 'change', (e) => {
      captureAutoBackup('Trước khi nạp file cục bộ (.json)', true);
      loadDataFromLocalFile(e);
    });

    // Custom Chart Builder Listeners
    safeOn('btn-open-chart-builder',   'click', () => openChartBuilderModal(null, { zone: 'basic' }));
    safeOn('btn-add-chart-advanced',   'click', () => openChartBuilderModal(null, { zone: 'advanced' }));
    safeOn('btn-close-chart-builder',  'click', closeChartBuilderModal);
    safeOn('btn-cancel-chart-builder', 'click', closeChartBuilderModal);
    safeOn('chart-builder-form',       'submit', handleChartBuilderSubmit);
    safeOn('btn-builder-refresh-preview', 'click', updateChartBuilderPreview);
    // Đổi nguồn dữ liệu trong Chart Builder: nạp lại tùy chọn nhóm/chỉ số
    safeOn('builder-source', 'change', (e) => {
      populateBuilderOptions(e.target.value);
      updateChartBuilderPreview();
    });
    // Preview cập nhật trực tiếp khi đổi các tùy chọn khác
    // (bộ lọc động do renderBuilderFilters tự gắn listener theo schema nguồn)
    ['builder-type', 'builder-group-by', 'builder-metric', 'builder-stack-by', 'builder-palette'].forEach(id => {
      safeOn(id, 'change', updateChartBuilderPreview);
    });
    // Modal cấu hình quyền chi tiết người dùng (Admin)
    safeOn('btn-close-user-perms', 'click', closeUserPermsModal);
    safeOn('btn-cancel-user-perms', 'click', closeUserPermsModal);
    safeOn('user-perms-form', 'submit', handleUserPermsSubmit);

    safeOn('builder-title', 'input', updateChartBuilderPreview);

    // JSON Backup
    safeOn('btn-export-json', 'click', exportToJSON);
    safeOn('btn-import-json', 'click', () => {
      const fi = document.getElementById('file-import-json');
      if (fi) fi.click();
    });
    // AUTO BACKUP (lớp 1): chụp bản cất TRƯỚC khi nạp file JSON ghi đè dữ liệu
    safeOn('file-import-json', 'change', (e) => {
      captureAutoBackup('Trước khi nạp file JSON', true);
      handleImportJSON(e);
    });

    // ── KẾ HOẠCH SẢN XUẤT (PLANNING VIEW) ──
    safeOn('btn-add-material-rate', 'click', () => openMaterialRateModal());
    safeOn('btn-close-material-rate', 'click', closeMaterialRateModal);
    safeOn('btn-cancel-material-rate', 'click', closeMaterialRateModal);
    safeOn('material-rate-form', 'submit', handleMaterialRateSubmit);

    // Thu gọn / mở rộng bảng định mức (bảng chính)
    safeOn('btn-toggle-rate-main', 'click', () => toggleRateTableCollapse('rate-main-card'));

    safeOn('btn-add-planning-item', 'click', openPlanningItemModal);
    safeOn('btn-close-planning-item', 'click', closePlanningItemModal);
    safeOn('btn-cancel-planning-item', 'click', closePlanningItemModal);
    safeOn('planning-item-form', 'submit', handlePlanningItemSubmit);
    safeOn('btn-close-plan-edit', 'click', closePlanningEditModal);
    safeOn('btn-cancel-plan-edit', 'click', closePlanningEditModal);
    safeOn('plan-edit-form', 'submit', handlePlanningEditSubmit);

    // Bộ lọc năm cho bảng kế hoạch tổng hợp
    safeOn('planning-year-filter', 'change', (e) => {
      state.planningYearFilter = e.target.value;
      renderPlanningMatrix();
    });

    // ── SỔ LỊCH SỬ BẢN GHI KẾ HOẠCH (bảng gọn 1 dòng/tuần) — UỶ NHIỆM ──
    // Thanh công cụ + thân bảng được dựng lại mỗi lần render nên gắn trực tiếp
    // sẽ mất sau lần render đầu → uỷ nhiệm trên document.
    document.addEventListener('input', (e) => {
      const id = e.target && e.target.id;
      if (id === 'plan-hist-search') planHistOnSearch(e);
    });
    document.addEventListener('change', (e) => {
      const id = e.target && e.target.id;
      if (id === 'plan-hist-month') planHistOnMonth(e.target.value);
      else if (id === 'plan-hist-hide-done') planHistOnHideDone(e.target.checked);
    });
    document.addEventListener('click', (e) => {
      const t = e.target;
      if (!t || !t.closest) return;
      // Nút QUÝ ở thanh công cụ
      const qBtn = t.closest('[data-plan-hist-q]');
      if (qBtn) { planHistOnQuarter(qBtn.getAttribute('data-plan-hist-q')); return; }
      // Bấm vào dòng tuần / nhãn Tuần / nút ⌄ → bung chi tiết
      if (t.closest('#planning-list-section')) planHistOnRowClick(e);
    });

    // ── Biểu đồ tĩnh Kế Hoạch vs Đã Ép (Dashboard) ──
    safeOn('pv-year-filter', 'change', (e) => {
      state.planVsPressYear = e.target.value;
      renderPlanVsPressChart();
    });
    safeOn('pv-unit-qty', 'click', () => setPlanVsPressUnit('qty'));
    safeOn('pv-unit-vol', 'click', () => setPlanVsPressUnit('vol'));
    // Khoảng hiển thị 1 tuần / 2 tuần (2 tuần = tổng tuần chọn + tuần kế tiếp)
    safeOn('pv-span-1', 'click', () => setPlanVsPressSpan(1));
    safeOn('pv-span-2', 'click', () => setPlanVsPressSpan(2));
    // Nút Total: bật/tắt tính tổng theo nhóm sản phẩm (Bullig / Ván)
    safeOn('pv-total-toggle', 'click', () => setPlanVsPressTotal(!state.planVsPressTotal));
    // Nút TÊN BIỂU ĐỒ (#pv-mode-toggle): chuyển 2 biểu đồ của THẺ GỘP —
    // Kế Hoạch vs Đã Ép ↔ Khả Năng Đáp Ứng Kế Hoạch (biểu đồ + tên + công cụ đổi cùng nhau)
    safeOn('pv-mode-toggle', 'click', () => togglePlanVsPressMode());
    // Điều hướng theo tuần của biểu đồ
    safeOn('pv-week-filter', 'change', (e) => {
      state.planVsPressWeek = e.target.value === 'all' ? 'all' : Number(e.target.value);
      renderPlanVsPressChart();
    });
    safeOn('pv-week-prev', 'click', () => shiftPlanVsPressWeek(-1));
    safeOn('pv-week-next', 'click', () => shiftPlanVsPressWeek(1));

    // ── Biểu đồ Khả Năng Đáp Ứng — bộ lọc RIÊNG (năm + điều hướng tuần, tách khỏi biểu đồ trên) ──
    safeOn('pv-cap-year-filter', 'change', (e) => {
      state.planCapYear = e.target.value;
      state.planCapStartIdx = null; // đổi năm -> về mặc định (tuần hiện tại)
      renderPlanCapacityChart();
    });
    // Mỗi lượt bấm ◀ / ▶ dịch cửa sổ hiển thị đúng 1 TUẦN (biểu đồ luôn hiện tối đa 2 tuần)
    safeOn('pv-cap-prev', 'click', () => shiftPlanCapacityWindow(-1));
    safeOn('pv-cap-next', 'click', () => shiftPlanCapacityWindow(1));

    // Cập nhật dự kiến khi người dùng sửa ô input
    // Dùng sự kiện 'change' (Enter hoặc nhấp chuột ra ngoài) để cho phép
    // nhập nhiều số liên tiếp mà không bị mất focus do re-render mỗi lần gõ
    document.addEventListener('change', (e) => {
      if (e.target && e.target.id && e.target.id.startsWith('plan-fc-')) {
        const parts = e.target.id.split('-'); // plan-fc-<year>-<week>-<dimIdx>-<purpose>
        if (parts.length >= 6) {
          const year = parts[2];
          const week = parts[3];
          const dimIdx = parseInt(parts[4]);
          const purpose = parts.slice(5).join('-');
          const nanTypes = getUniqueNanTypes();
          const dim = nanTypes[dimIdx];
          if (!dim) return;
          const val = parseFloat(e.target.value) || 0;
          const ucKey = dimUseKey(dim.key, purpose);
          if (!state.planningForecast[year]) state.planningForecast[year] = {};
          if (!state.planningForecast[year][week]) state.planningForecast[year][week] = {};
          state.planningForecast[year][week][ucKey] = val;
          savePlanningForecast();
          renderPlanningMatrix();
        }
      }
      // Cập nhật tồn keo/phụ gia nhập tay khi người dùng sửa ô input
      // Dùng sự kiện 'change' (Enter hoặc nhấp chuột ra ngoài) để cho phép
      // nhập nhiều số liên tiếp mà không bị mất focus do re-render mỗi lần gõ
      if (e.target && e.target.id && e.target.id.startsWith('plan-stock-')) {
        const parts = e.target.id.split('-'); // plan-stock-<type>-<year>-<week>
        if (parts.length >= 5) {
          const type = parts[2]; // 'glue' hoặc 'additive'
          const year = parts[3];
          const week = parts[4];
          const val = parseFloat(e.target.value) || 0;
          if (!state.planningStock[year]) state.planningStock[year] = {};
          if (!state.planningStock[year][week]) state.planningStock[year][week] = {};
          state.planningStock[year][week][type] = val;
          savePlanningStock();
          renderPlanningMatrix();
        }
      }
      // Kế hoạch nguyên liệu cần nhập (tab Nguyên liệu): ô số TB/ngày theo tuần + vị trí
      if (e.target && e.target.id && e.target.id.startsWith('mat-plan-')) {
        handleMaterialPlanInput(e.target);
      }
    });

    // ── Sản lượng ép ván (modal nhập — mở từ nút "Thêm Lượt Ép" khung Lượt Ép) ──
    safeOn('btn-close-press-modal', 'click', closePressModal);
    safeOn('btn-cancel-press', 'click', closePressModal);
    safeOn('press-record-form', 'submit', handlePressRecordSubmit);
    // ── Ghi chú giải trình (ngày sản lượng không đáp ứng) ──
    safeOn('btn-close-press-note', 'click', closePressNoteModal);
    safeOn('btn-cancel-press-note', 'click', closePressNoteModal);
    safeOn('press-note-form', 'submit', handlePressNoteSubmit);
    safeOn('btn-delete-press-note', 'click', handlePressNoteDelete);
    // Nút "Hiện Ghi Chú": hiện/ẩn nội dung TẤT CẢ ghi chú giải trình trên biểu đồ ép ván
    safeOn('btn-toggle-press-notes', 'click', togglePressNotesExpanded);
    // Di chuột/bấm vào biểu tượng "!" trong bảng → hiển thị nội dung giải trình
    document.addEventListener('mouseover', (e) => {
      const badge = e.target && e.target.closest ? e.target.closest('.press-note-badge') : null;
      if (badge) showPressNotePopover(badge.dataset.note, e.clientX, e.clientY, badge.dataset.date, badge);
    });
    document.addEventListener('mouseout', (e) => {
      if (e.target && e.target.closest && e.target.closest('.press-note-badge')) hidePressNotePopover();
    });
    document.addEventListener('click', (e) => {
      if (e.target && e.target.id === 'press-chart') return; // biểu đồ tự quản popover qua onClick
      const badge = e.target && e.target.closest ? e.target.closest('.press-note-badge') : null;
      if (badge) {
        showPressNotePopover(badge.dataset.note, e.clientX, e.clientY, badge.dataset.date, badge);
        return;
      }
      const editBtn = e.target && e.target.closest ? e.target.closest('.press-note-popover-edit') : null;
      if (editBtn) {
        hidePressNotePopover();
        openPressNoteModal(editBtn.dataset.date);
        return;
      }
      if (!e.target.closest || !e.target.closest('#press-note-popover')) hidePressNotePopover();
    });
    window.addEventListener('scroll', hidePressNotePopover, { passive: true, capture: true });
    safeOn('btn-add-press-line', 'click', () => addPressLine());
    safeOn('btn-add-press-stick', 'click', () => addPressStick());
    // Modal chi tiết công nhân ép (bảng lượt ép -> nút users)
    safeOn('btn-close-press-workers', 'click', closePressWorkersModal);
    // Đổi ngày ép: cập nhật tuần tự động (hint cạnh nhãn) + danh sách thành phẩm cùng tuần
    // + xem trước công nhân ép tự động (từ phân vị tab Nhân Sự)
    safeOn('press-date', 'change', () => {
      const dateVal = document.getElementById('press-date')?.value;
      const weekHint = document.getElementById('press-week-hint');
      if (weekHint) weekHint.textContent = dateVal ? getISOWeekString(dateVal) : '';
      refreshPressProductSelect();
      refreshPressWorkersPreview();
      recalcPressQuantities();
    });
    // Đổi thành phẩm: reset chế độ sửa tay SL + gợi ý keo/phụ gia theo định mức +
    // tính lại SL + cập nhật danh sách công nhân (Bullig → "Chọn thanh Bullig")
    safeOn('press-product', 'change', () => {
      document.getElementById('press-fp-qty')?.removeAttribute('data-manual');
      suggestPressMaterialFields(true);
      recalcPressQuantities();
      refreshPressWorkersPreview();
    });
    // Người dùng sửa tay keo/phụ gia -> đánh dấu không tự gợi ý nữa
    ['press-glue', 'press-additive'].forEach(fid => {
      safeOn(fid, 'input', (e) => { e.target.setAttribute('data-manual', '1'); });
    });
    // Số lượng thành phẩm có thể sửa tay — đánh dấu để tự tính không ghi đè
    safeOn('press-fp-qty', 'input', (e) => {
      e.target.setAttribute('data-manual', '1');
      suggestPressMaterialFields(false);
    });
    // Nhập liệu trên các dòng thành phần (ván thô tạo ra / đầu vào) -> tính lại số lượng thành phẩm
    document.addEventListener('input', (e) => {
      if (e.target && e.target.closest && (e.target.closest('#press-lines') || e.target.closest('#press-sticks'))) {
        recalcPressQuantities();
      }
    });
    // Bộ lọc năm của biểu đồ & thẻ ngày ép
    safeOn('press-year-filter', 'change', (e) => {
      state.pressYearFilter = e.target.value;
      state.pressChartWinStart = null; // đổi năm → về mặc định (các tuần mới nhất)
      populatePressWeekFilter(); // danh sách tuần phụ thuộc năm đang chọn
      renderPressChart();
      renderX2EpVanDayCards(); // khung "Lượt Ép" cũng theo bộ lọc năm
    });
    // Bộ lọc tuần của biểu đồ & thẻ ngày ép
    safeOn('press-week-filter', 'change', (e) => {
      state.pressWeekFilter = e.target.value;
      state.pressChartWinStart = null; // đổi tuần → về mặc định (các tuần mới nhất)
      renderPressChart();
      renderX2EpVanDayCards(); // khung "Lượt Ép" cũng theo bộ lọc tuần
    });
    // Mũi tên ‹ › cạnh ô Tuần: nhảy nhanh cả tuần (bao vòng)
    safeOn('press-week-prev', 'click', () => shiftPressWeekFilter(-1));
    safeOn('press-week-next', 'click', () => shiftPressWeekFilter(1));
    // ── Bấm vào ô TỔNG TỒN của ma trận kế hoạch → hộp thoại chi tiết tính toán ──
    safeOn('planning-matrix-body', 'click', (e) => {
      const cell = e.target.closest ? e.target.closest('td[data-trace]') : null;
      if (!cell) return;
      const parts = (cell.getAttribute('data-trace') || '').split('|');
      if (parts.length !== 3) return;
      openMatrixTraceModal(parts[0], parts[1], Number(parts[2]) || 1);
    });
    safeOn('btn-close-matrix-trace', 'click', closeMatrixTraceModal);
    // ── THẺ ÉP VÁN (launcher tab Công Đoạn): 2 KHUNG + định mức m³/h ──
    safeOn('x2-epv-tab-list', 'click', () => switchX2EpVanFrame('list'));
    safeOn('x2-epv-tab-chart', 'click', () => switchX2EpVanFrame('chart'));
    safeOn('btn-add-press-2', 'click', () => openPressModal());            // nút trong khung "Lượt Ép"
    safeOn('btn-add-press-note-2', 'click', () => openPressNoteModal());   // ghi chú giải trình (khung 1)
    safeOn('btn-x2-epv-rate-save', 'click', handleX2EpVanRateSave);
    safeOn('x2-epv-rate-month', 'change', renderX2EpVanRateBar);

    // ── Nhập nguyên liệu (Lò hơi / Xưởng 1 / Xưởng 2) ──
    safeOn('btn-add-material', 'click', () => openMaterialModal());
    safeOn('btn-refresh-materials', 'click', () => renderMaterialView());
    // Thu gọn / mở rộng nhật ký nhập nguyên liệu
    safeOn('btn-toggle-material-table', 'click', () => toggleRateTableCollapse('material-table-card'));
    // ── Kế hoạch nguyên liệu cần nhập (bảng phụ theo tuần) ──
    safeOn('material-plan-year', 'change', (e) => {
      state.materialPlanYear = e.target.value;
      renderMaterialPlanTable();
    });
    safeOn('btn-add-material-plan-week', 'click', () => addMaterialPlanWeek());
    // Thu gọn / mở rộng bảng kế hoạch nguyên liệu
    safeOn('btn-toggle-material-plan', 'click', () => toggleRateTableCollapse('material-plan-card'));
    // ── Thông Tin Nhà Cung (bảng phụ tab Nguyên Liệu) ──
    safeOn('btn-add-supplier', 'click', () => openSupplierModal());
    safeOn('btn-sup-normalize', 'click', normalizeSupplierNames);
    safeOn('btn-close-supplier', 'click', closeSupplierModal);
    safeOn('btn-cancel-supplier', 'click', closeSupplierModal);
    safeOn('supplier-form', 'submit', handleSupplierSubmit);
    safeOn('btn-toggle-supplier', 'click', () => toggleRateTableCollapse('supplier-card'));

    // ── QC — Module thẻ (launcher) + Bảng Xuất Hàng ──
    // Bấm thẻ launcher (grid) → mở bảng chi tiết dạng pop-up modal (nổi lên)
    document.querySelectorAll('.qc-mini-card').forEach(t => {
      t.addEventListener('click', () => qcOpenCard(t.getAttribute('data-qc-card')));
    });
    // Đóng bảng chi tiết pop-up: nút Đóng / bấm nền mờ / phím Esc
    safeOn('btn-close-qc-detail', 'click', qcCloseOpenCard);
    const qcOverlay = document.getElementById('qc-detail-overlay');
    if (qcOverlay) {
      qcOverlay.addEventListener('click', (e) => { if (e.target === qcOverlay) qcCloseOpenCard(); });
      qcOverlay.addEventListener('keydown', (e) => { if (e.key === 'Escape') qcCloseOpenCard(); });
    }
    // Esc toàn cục khi pop-up QC đang mở (dù con trỏ/focus đang ở trong bảng).
    // Ưu tiên đóng dropdown nổi "Đầu vào kiểm" (nếu đang mở) TRƯỚC khi đóng pop-up.
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape' || !document.getElementById('qc-detail-overlay')?.classList.contains('show')) return;
      const picker = document.getElementById('qcf-picker');
      if (picker && !picker.hidden) { setQcFinalPickerOpen(false); return; }
      qcCloseOpenCard();
    });
    // Đổi kích thước cửa sổ → đặt lại đỉnh pop-up đúng dưới header
    window.addEventListener('resize', () => {
      const ov = document.getElementById('qc-detail-overlay');
      if (ov && ov.classList.contains('show') && typeof qcPositionDetailOverlay === 'function') qcPositionDetailOverlay();
    });
    // ── Bộ lọc trong thẻ Xuất Hàng: chọn năm / tuần / từ khóa → bảng chỉ
    //    hiện kết quả khớp (áp dụng NGAY, không cần chuyển tab) ──
    safeOn('qc-sum-year', 'change', (e) => {
      state.qcSumYear = e.target.value;
      state.qcSumWeeks = []; // đổi năm → xem tất cả các tuần
      renderQcSummary();
      renderQcTable();
      renderQcSearch();
    });
    document.addEventListener('click', (e) => {
      const chip = e.target.closest ? e.target.closest('[data-qc-sum-week]') : null;
      if (chip) {
        const w = Number(chip.getAttribute('data-qc-sum-week'));
        const set = new Set(state.qcSumWeeks || []);
        if (set.has(w)) set.delete(w); else set.add(w);
        state.qcSumWeeks = [...set].sort((a, b) => a - b);
        renderQcSummary();
        renderQcTable();
        renderQcSearch();
        return;
      }
      if (e.target.closest && e.target.closest('[data-qc-sum-all]')) {
        state.qcSumWeeks = []; // bỏ chọn hết = tất cả các tuần
        renderQcSummary();
        renderQcTable();
        renderQcSearch();
      }
    });
    // Tìm kiếm trong bảng xuất: gõ là lọc ngay (chỉ hiện dòng khớp)
    safeOn('qc-search-input', 'input', (e) => {
      state.qcSearchQ = e.target.value;
      renderQcTable();
      renderQcSearch();
    });
    safeOn('btn-clear-qc-search', 'click', () => {
      state.qcSearchQ = '';
      const inp = document.getElementById('qc-search-input');
      if (inp) inp.value = '';
      renderQcTable();
      renderQcSearch();
    });
    // Xóa MỌI bộ lọc (năm + tuần + từ khóa) → hiện lại toàn bộ dòng
    safeOn('btn-clear-qc-filter', 'click', () => {
      state.qcSumYear = 'all';
      state.qcSumWeeks = [];
      state.qcSearchQ = '';
      const inp = document.getElementById('qc-search-input');
      if (inp) inp.value = '';
      renderQcSummary();
      renderQcTable();
      renderQcSearch();
    });
    safeOn('btn-add-qc-export', 'click', openQcExportModal);
    safeOn('btn-close-qc-export', 'click', closeQcExportModal);
    safeOn('btn-cancel-qc-export', 'click', closeQcExportModal);
    safeOn('qc-export-form', 'submit', handleQcExportSubmit);
    // ── THẺ "KIỂM SAU SẢN XUẤT" (qc-final-card — js/qc-final.js) ──
    // Form: Vị trí · Ngày · Đầu vào kiểm (picker thành phẩm Ép Ván cặp 2 tuần) ·
    // Đạt · Ngoại lệ · Loại. Đổi Vị trí → ẩn/hiện picker (X1 = "Sắp có");
    // đổi Ngày → danh sách thành phẩm của cặp 2 tuần mới.
    safeOn('qcf-form', 'submit', (e) => { handleQcFinalSubmit(e); updateQcCardGrid(); });
    safeOn('btn-qcf-reset', 'click', resetQcFinalForm);
    safeOn('qcf-kind', 'change', syncQcFinalKindFields); // đổi Loại kiểm → đơn vị ô số lượng + ẩn/hiện picker
    safeOn('qcf-workshop', 'change', syncQcFinalWorkshopFields);
    safeOn('qcf-date', 'change', qcFinalOnDateChange); // đổi ngày → danh sách thành phẩm cặp 2 tuần mới
    safeOn('qcf-picker-btn', 'click', toggleQcFinalPicker);
    safeOn('qcf-search', 'input', (e) => setQcFinalSearchQ(e.target.value));
    safeOn('qcf-product-list', 'click', (e) => { if (onQcFinalListClick(e)) updateQcCardGrid(); });
    safeOn('qcf-day-cards', 'click', (e) => { if (onQcFinalTableClick(e)) updateQcCardGrid(); });
    // ── POPUP ĐỊNH MỨC 2 LOẠI (Kiểm Thanh thanh/h · Kiểm Ván tấm/h) ──
    safeOn('btn-qcf-rate', 'click', openQcFinalRateModal);
    safeOn('btn-close-qcf-rate', 'click', closeQcFinalRateModal);
    safeOn('btn-qcf-rate-add-month', 'click', handleQcFinalRateAddMonth);
    safeOn('qcf-rate-rows', 'click', onQcFinalRateRowClick); // Lưu / Xóa từng hàng tháng
    // Bấm RA NGOÀI ô "Đầu vào kiểm" → tự đóng danh sách thành phẩm
    document.addEventListener('click', (e) => { qcFinalMaybeClosePicker(e); });
    // Dropdown nổi "Đầu vào kiểm" (portal ra body, position:fixed): neo lại đúng
    // chỗ nút khi CUỘN bất kỳ vùng nào (capture bắt cả cuộn trong .qc-detail-content)
    // và khi THAY ĐỔI CỠ màn hình.
    window.addEventListener('scroll', positionQcFinalPicker, true);
    window.addEventListener('resize', positionQcFinalPicker);

    // ── Modal tạo dòng theo tuần: đổi Năm/Tuần → nạp lại danh sách kế hoạch ──
    ['qc-imp-year', 'qc-imp-week'].forEach(fid => {
      safeOn(fid, 'change', () => qcImpLoadPlan(false));
    });
    safeOn('btn-qc-imp-refresh-plan', 'click', () => qcImpLoadPlan(true)); // giữ SL đã điền
    safeOn('btn-qc-imp-add-custom', 'click', () => {
      const group = document.getElementById('qc-custom-name-group');
      if (group && group.style.display === 'none') { showQcCustomName(); return; }
      qcImpAddCustom(); // lần 2: nhập tên rồi bấm để thêm vào danh sách
    });
    // Delegation trong danh sách soạn: tick / điền SL / bỏ dòng
    // (qcImpRows là trạng thái riêng của qc.js — cập nhật qua hàm xuất khẩu,
    //  không tham chiếu trực tiếp được vì ES-module import là read-only)
    document.addEventListener('change', (e) => {
      const el = e.target;
      if (!el || !el.dataset) return;
      if (el.dataset.qcImpCheck) qcImpSetChecked(el.dataset.qcImpCheck, el.checked);
      if (el.dataset.qcImpQty) qcImpSetQty(el.dataset.qcImpQty, el.value);
    });
    document.addEventListener('click', (e) => {
      const rm = e.target && e.target.closest && e.target.closest('[data-qc-imp-remove]');
      if (rm) {
        qcImpRemoveRow(rm.getAttribute('data-qc-imp-remove'));
      }
    });
    // Ô nhập tên TP ngoài kế hoạch: Enter trong ô = thêm vào danh sách
    safeOn('qc-custom-name', 'keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); qcImpAddCustom(); }
    });
    // Thu gọn / mở rộng bảng xuất hàng (trong thẻ Xuất Hàng)
    safeOn('btn-toggle-qc-table', 'click', () => toggleRateTableCollapse('qc-export-card'));
    // Sửa trực tiếp từng dòng (tuần / số lượng / ghi chú) — sự kiện 'change'
    document.addEventListener('change', (e) => {
      const el = e.target;
      if (el && el.dataset && el.dataset.qcId && el.dataset.qcField) {
        updateQcExportRow(el.dataset.qcId, el.dataset.qcField, el.value);
      }
    });
    // Xóa dòng xuất hàng (ủy quyền click trong tbody)
    document.addEventListener('click', (e) => {
      const delBtn = e.target.closest('[data-qc-delete]');
      if (delBtn) deleteQcExport(delBtn.getAttribute('data-qc-delete'));
    });

    // ── Tab Nhân Sự ──
    // Nhân viên
    safeOn('btn-add-employee', 'click', () => openEmployeeModal());
    safeOn('btn-close-employee', 'click', closeEmployeeModal);
    safeOn('btn-cancel-employee', 'click', closeEmployeeModal);
    safeOn('employee-form', 'submit', handleEmployeeSubmit);
    // Chọn trạng thái "Đã nghỉ việc" -> hiện ô Ngày Nghỉ Việc (ngày làm cuối)
    safeOn('employee-status', 'change', () => syncEmployeeQuitDateRow());
    // Nhập nhân viên từ Excel
    safeOn('btn-import-employees', 'click', openEmployeeImportModal);
    safeOn('btn-close-employee-import', 'click', closeEmployeeImportModal);
    safeOn('btn-cancel-employee-import', 'click', closeEmployeeImportModal);
    safeOn('employee-import-file', 'change', handleEmployeeImportFile);
    safeOn('btn-do-employee-import', 'click', doEmployeeImport);
    // Xin nghỉ phép
    safeOn('btn-add-leave', 'click', openLeaveModal);
    safeOn('btn-close-leave', 'click', closeLeaveModal);
    safeOn('btn-cancel-leave', 'click', closeLeaveModal);
    safeOn('leave-form', 'submit', handleLeaveSubmit);
    // Thời gian nghỉ: cả ngày / nửa ngày (0.5) / theo giờ — đổi chế độ hoặc
    // đổi "Từ ngày" → đồng bộ lại form (khóa "Đến ngày", hiện ô số giờ)
    safeOn('leave-duration', 'change', syncLeaveDurationUI);
    safeOn('leave-from', 'change', syncLeaveDurationUI);
    // ── Đăng ký tăng ca (mini card tương đồng "Xin Nghỉ Phép") ──
    safeOn('btn-add-overtime', 'click', openOvertimeModal);
    safeOn('btn-close-overtime', 'click', closeOvertimeModal);
    safeOn('btn-cancel-overtime', 'click', closeOvertimeModal);
    safeOn('ot-form', 'submit', handleOvertimeSubmit);
    const otEmpInput = document.getElementById('ot-employee');
    if (otEmpInput) {
      otEmpInput.addEventListener('input', renderOvertimeEmployeeSuggestions);
      otEmpInput.addEventListener('focus', renderOvertimeEmployeeSuggestions);
      otEmpInput.addEventListener('keydown', handleOvertimeEmployeeKeydown);
    }
    const otSuggestBox = document.getElementById('ot-employee-suggest');
    if (otSuggestBox) {
      // mousedown để chọn TRƯỚC khi input mất focus
      otSuggestBox.addEventListener('mousedown', (e) => {
        const item = e.target && e.target.closest ? e.target.closest('[data-emp-id]') : null;
        if (item) { e.preventDefault(); pickOvertimeEmployee(item.getAttribute('data-emp-id')); }
      });
    }
    // Bấm ra ngoài ô gợi ý tăng ca → đóng danh sách
    document.addEventListener('click', (e) => {
      if (!(e.target && e.target.closest && e.target.closest('.hr-combobox'))) hideOvertimeEmployeeSuggestions();
    });
    // Ô nhân viên: gõ tên → danh sách gợi ý → chọn (chuột hoặc bàn phím)
    const leaveEmpInput = document.getElementById('leave-employee');
    if (leaveEmpInput) {
      leaveEmpInput.addEventListener('input', renderLeaveEmployeeSuggestions);
      leaveEmpInput.addEventListener('focus', renderLeaveEmployeeSuggestions);
      leaveEmpInput.addEventListener('keydown', handleLeaveEmployeeKeydown);
    }
    const leaveSuggestBox = document.getElementById('leave-employee-suggest');
    if (leaveSuggestBox) {
      // mousedown để chọn TRƯỚC khi input mất focus
      leaveSuggestBox.addEventListener('mousedown', (e) => {
        const item = e.target && e.target.closest ? e.target.closest('[data-emp-id]') : null;
        if (item) { e.preventDefault(); pickLeaveEmployee(item.getAttribute('data-emp-id')); }
      });
    }
    // Bấm ra ngoài ô gợi ý → đóng danh sách
    document.addEventListener('click', (e) => {
      if (!(e.target && e.target.closest && e.target.closest('.hr-combobox'))) hideLeaveEmployeeSuggestions();
    });
    // Nhân sự cần — tuyển dụng
    safeOn('btn-add-recruitment', 'click', () => openRecruitmentModal());
    safeOn('btn-close-recruitment', 'click', closeRecruitmentModal);
    safeOn('btn-cancel-recruitment', 'click', closeRecruitmentModal);
    safeOn('recruitment-form', 'submit', handleRecruitmentSubmit);
    // Nhân sự cần tại các vị trí — bảng dữ liệu trung gian
    safeOn('btn-add-posneed', 'click', () => openPositionNeedModal());
    safeOn('btn-close-posneed', 'click', closePositionNeedModal);
    safeOn('btn-cancel-posneed', 'click', closePositionNeedModal);
    safeOn('position-need-form', 'submit', handlePositionNeedSubmit);
    safeOn('btn-sync-posneed', 'click', syncPositionNeedsFromEmployees);
    safeOn('hr-posneed-filter-dept', 'change', renderPositionNeedsTable);
    // ── Bảng bố trí vị trí theo ngày ──
    safeOn('btn-board-prev', 'click', () => hrBoardShiftDay(-1));
    safeOn('btn-board-next', 'click', () => hrBoardShiftDay(1));
    safeOn('btn-board-today', 'click', hrBoardGoToday);
    safeOn('hr-board-date', 'change', (e) => hrBoardSetDate(e.target.value));
    safeOn('btn-board-shifts', 'click', openShiftModal);
    safeOn('btn-close-board-assign', 'click', closeBoardAssignModal);
    safeOn('btn-cancel-board-assign', 'click', closeBoardAssignModal);
    safeOn('board-assign-form', 'submit', handleBoardAssignSubmit);
    safeOn('btn-close-shift', 'click', closeShiftModal);
    safeOn('btn-cancel-shift', 'click', closeShiftModal);
    safeOn('shift-form', 'submit', handleShiftSubmit);
    // Gợi ý nhân viên trong modal bố trí (gõ để tìm, ưu tiên kỹ năng)
    const boardSuggestInput = document.getElementById('board-assign-employee');
    const boardSuggestBox = document.getElementById('board-assign-suggest');
    if (boardSuggestInput && boardSuggestBox) {
      boardSuggestInput.addEventListener('input', () => renderBoardAssignSuggestions(boardSuggestInput.value));
      boardSuggestInput.addEventListener('focus', () => renderBoardAssignSuggestions(boardSuggestInput.value));
      boardSuggestBox.addEventListener('mousedown', (e) => {
        const item = e.target && e.target.closest ? e.target.closest('[data-emp-id]') : null;
        if (item) { e.preventDefault(); pickBoardAssignEmployee(item.getAttribute('data-emp-id')); }
      });
      document.addEventListener('click', (e) => {
        if (!(e.target && e.target.closest && e.target.closest('.hr-combobox')) && boardSuggestBox) boardSuggestBox.style.display = 'none';
      });
    }
    // Bấm tab bộ phận trên board (render động → delegate)
    const boardTabs = document.getElementById('hr-board-dept-tabs');
    if (boardTabs) {
      boardTabs.addEventListener('click', (e) => {
        const tab = e.target && e.target.closest ? e.target.closest('[data-board-dept]') : null;
        if (tab) hrBoardSetDept(tab.getAttribute('data-board-dept'));
      });
    }
    // Bộ lọc nhân viên — chỉ vẽ lại BẢNG NHÂN VIÊN (nhanh, không reset bộ lọc)
    safeOn('hr-emp-filter-dept', 'change', renderHrEmployeesTable);
    safeOn('hr-emp-filter-status', 'change', renderHrEmployeesTable);
    safeOn('hr-emp-search', 'input', renderHrEmployeesTable);
    safeOn('hr-recruit-filter-dept', 'change', renderHrRecruitmentTable);
    // Thu gọn / mở rộng các thẻ bảng Nhân Sự (obok lśni thẻ nôi)
    safeOn('btn-toggle-hr-emp', 'click', () => { toggleRateTableCollapse('hr-emp-card'); syncHrMiniActive(); });
    safeOn('btn-toggle-hr-leave', 'click', () => { toggleRateTableCollapse('hr-leave-card'); syncHrMiniActive(); });
    safeOn('btn-toggle-hr-ot', 'click', () => { toggleRateTableCollapse('hr-ot-card'); syncHrMiniActive(); });
    safeOn('btn-toggle-hr-stats', 'click', () => { toggleRateTableCollapse('hr-stats-card'); syncHrMiniActive(); });
    safeOn('btn-toggle-hr-recruit', 'click', () => { toggleRateTableCollapse('hr-recruit-card'); syncHrMiniActive(); });
    safeOn('btn-toggle-hr-posneed', 'click', () => { toggleRateTableCollapse('hr-posneed-card'); syncHrMiniActive(); });
    // Bấm thẻ launcher (grid 5/3/2) → mở bảng chi tiết dạng pop-up modal (nổi lên)
    document.querySelectorAll('.hr-mini-card').forEach(t => {
      t.addEventListener('click', () => hrOpenCard(t.getAttribute('data-hr-card')));
    });
    // Đóng bảng chi tiết pop-up: nút Đóng / bấm nền mờ / phím Esc
    safeOn('btn-close-hr-detail', 'click', hrCloseOpenCard);
    const overlay = document.getElementById('hr-detail-overlay');
    if (overlay) {
      overlay.addEventListener('click', (e) => { if (e.target === overlay) hrCloseOpenCard(); });
      overlay.addEventListener('keydown', (e) => { if (e.key === 'Escape') hrCloseOpenCard(); });
    }
        // Esc toàn cục khi modal đang mở (dù con trỏ/focus đang ở trong bảng)
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && document.getElementById('hr-detail-overlay') && document.getElementById('hr-detail-overlay').classList.contains('show')) hrCloseOpenCard();
    });
    // Đổi kích thước cửa sổ → đặt lại đỉnh pop-up đúng dưới header
    window.addEventListener('resize', () => {
      const ov = document.getElementById('hr-detail-overlay');
      if (ov && ov.classList.contains('show') && typeof hrPositionDetailOverlay === 'function') hrPositionDetailOverlay();
    });
    // ── Chấm công & phân vị theo ngày ──
    safeOn('btn-att-prev', 'click', () => hrAttShiftDay(-1));
    safeOn('btn-att-next', 'click', () => hrAttShiftDay(1));
    safeOn('btn-att-today', 'click', () => hrAttGoToday());
    safeOn('hr-att-date', 'change', (e) => hrAttSetDate(e.target.value));
    safeOn('hr-att-filter-dept', 'change', renderHrAttendanceCard);
    // Tìm nhanh nhân viên (tên / mã NV) trên bảng chấm công
    safeOn('hr-att-search', 'input', renderHrAttendanceCard);
    // Đổi Bộ Phận trong modal nhân viên -> lọc lại danh sách vị trí kỹ năng
    safeOn('employee-department', 'change', () => renderEmployeeSkillsBox(collectEmployeeSkills()));
    safeOn('btn-toggle-hr-att', 'click', () => { toggleRateTableCollapse('hr-att-card'); syncHrMiniActive(); });
    // Sửa trực tiếp từng dòng chấm công (đổi trạng thái / ghi chú) — sự kiện 'change'
    document.addEventListener('change', (e) => {
      const el = e.target;
      if (el && el.dataset && el.dataset.attEmp && el.dataset.attField === 'status') {
        setAttendanceStatus(el.dataset.attEmp, state.hrAttDate, el.value);
      }
      if (el && el.dataset && el.dataset.attEmp && el.dataset.attField === 'note') {
        setAttendanceNote(el.dataset.attEmp, state.hrAttDate, el.value);
      }
    });
    // Bấm chip vị trí để phân / bỏ phân vị trong ngày (ủy quyền click trong tbody)
    document.addEventListener('click', (e) => {
      const chip = e.target && e.target.closest ? e.target.closest('[data-att-pos]') : null;
      if (chip) toggleAttendancePosition(chip.getAttribute('data-att-emp'), state.hrAttDate, chip.getAttribute('data-att-pos'));
    });
    // ── Thống kê đi làm theo tháng ──
    safeOn('hr-att-month', 'change', (e) => hrAttSetMonth(e.target.value));
    // Bộ lọc bộ phận bảng thống kê đi làm (ID RIÊNG — hr-att-filter-dept là bộ lọc của card Chấm Công) — chỉ thu hẹp bảng
    safeOn('hr-attstats-filter-dept', 'change', renderHrAttendanceStats);
    safeOn('btn-toggle-hr-att-stats', 'click', () => { toggleRateTableCollapse('hr-att-stats-card'); syncHrMiniActive(); });
    // ── Vị trí làm việc & kỹ năng ──
    safeOn('btn-add-position', 'click', () => openPositionModal());
    safeOn('btn-sync-skills', 'click', syncSkillsFromAssignments);
    safeOn('btn-close-position', 'click', closePositionModal);
    safeOn('btn-cancel-position', 'click', closePositionModal);
    safeOn('position-form', 'submit', handlePositionSubmit);
    safeOn('btn-toggle-hr-pos', 'click', () => { toggleRateTableCollapse('hr-pos-card'); syncHrMiniActive(); });
    // ── Giờ máy chấm công (nạp Excel + đối chiếu) ──
    safeOn('btn-import-checkins', 'click', openCheckinImportModal);
    safeOn('btn-close-checkin-import', 'click', closeCheckinImportModal);
    safeOn('btn-cancel-checkin-import', 'click', closeCheckinImportModal);
    safeOn('checkin-import-file', 'change', handleCheckinImportFile);
    safeOn('btn-do-checkin-import', 'click', doCheckinImport);
    safeOn('btn-apply-all-checkins', 'click', applyAllCheckins);
    safeOn('btn-delete-checkins-all', 'click', deleteCheckinsAll);
    safeOn('btn-toggle-hr-ci', 'click', () => { toggleRateTableCollapse('hr-ci-card'); syncHrMiniActive(); });

    // ── Biểu đồ Kế hoạch vs Thực tế nguyên liệu theo ngày ──
    safeOn('mpc-week-filter', 'change', (e) => {
      state.materialPlanChartWeek = e.target.value;
      state.materialPlanChartWinStart = null; // đổi tuần → về đầu tuần
      renderMaterialPlanChart();
    });
    safeOn('mpc-week-prev', 'click', () => shiftMaterialPlanChartWeek(-1));
    safeOn('mpc-week-next', 'click', () => shiftMaterialPlanChartWeek(1));
    safeOn('btn-close-material', 'click', closeMaterialModal);
    safeOn('btn-cancel-material', 'click', closeMaterialModal);
    safeOn('material-form', 'submit', handleMaterialSubmit);
    // Trọng lượng tự động = đầu vào − đầu ra; Thành tiền = trọng lượng × đơn giá
    safeOn('material-input', 'input', updateMaterialWeight);
    safeOn('material-output', 'input', updateMaterialWeight);
    safeOn('material-unit-price', 'input', updateMaterialWeight);
    // Hình ảnh
    safeOn('material-images', 'change', handleMaterialImageSelect);
    // Lightbox
    safeOn('btn-close-material-photo', 'click', closeMaterialPhotoModal);
    safeOn('material-photo-prev', 'click', () => materialPhotoNav(-1));
    safeOn('material-photo-next', 'click', () => materialPhotoNav(1));
    // Gợi ý loại nguyên liệu: CHỈ các loại ĐÃ NHẬP trong nhật ký (bỏ gợi ý cứng)
    refreshMaterialTypeSuggestions();
    // Gợi ý nhà cung cấp: lấy từ các lần nhập trước
    const supDl = document.getElementById('material-supplier-suggestions');
    if (supDl) {
      const sups = [...new Set((state.materialRecords || []).map(r => (r.supplier || '').trim()).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b, 'vi'));
      supDl.innerHTML = sups.map(s => `<option value="${escapeHTML(s)}">`).join('');
    }

    // ── LỊCH SỬ SỬA ĐỔI (modal — chỉ Admin mới xem được) ──
    safeOn('btn-history-kanban',    'click', () => openHistoryModal('kanban', x2OpenCardHistoryDomain())); // mở đúng vùng của THẺ đang mở
    // ── THẺ TỔNG HỢP CÔNG SUẤT & HIỆU SUẤT (đầu tab Tổng Quan — js/capacity.js) ──
    // Nút tên = đổi Xưởng 2 ⇄ Xưởng 1 · Tuần⇄Tháng + ô chọn tháng = đổi KỲ xem ·
    // ‹ › = nhảy 1 kỳ (tự xổ tầng công đoạn) · In báo cáo (thông tin chung mọi
    // bộ phận) · nút Thu gọn · click ủy quyền: dòng kỳ → xổ công đoạn, dòng
    // công đoạn → xổ từng ngày, nút "Mở thẻ" → sang tab Công Đoạn + mở thẻ.
    safeOn('capacity-mode-toggle', 'click', toggleCapacityWorkshop);
    safeOn('cap-mode-week',        'click', () => setCapacityMode('week'));
    safeOn('cap-mode-month',       'click', () => setCapacityMode('month'));
    safeOn('cap-month',            'change', () => {
      const inp = document.getElementById('cap-month');
      if (inp) setCapacityMonth(inp.value);
    });
    safeOn('capacity-week-prev',   'click', () => shiftCapacityWeek(-1));
    safeOn('capacity-week-next',   'click', () => shiftCapacityWeek(1));
    safeOn('btn-cap-print',        'click', printCapacityReport);
    safeOn('btn-toggle-capacity',  'click', toggleCapacityCollapse);
    const capCard = document.getElementById('capacity-card');
    if (capCard) {
      capCard.addEventListener('click', (e) => {
        const t = e.target;
        // Nút chuyển CHẾ ĐỘ xem: "Biểu đồ" (trực quan) ⇄ "Bảng dữ liệu" (3 tầng)
        const viewBtn = t && t.closest ? t.closest('[data-cap-view]') : null;
        if (viewBtn) { setCapacityView(viewBtn.getAttribute('data-cap-view')); return; }
        const openBtn = t && t.closest ? t.closest('[data-cap-open-card]') : null;
        if (openBtn) {
          switchView('kanban-view'); // thẻ công đoạn nằm ở tab Công Đoạn — chuyển tab rồi mở pop-up
          x2OpenCard(openBtn.getAttribute('data-cap-open-card'));
          return;
        }
        // Chế độ "Biểu đồ": bấm 1 HÀNG thang xếp hạng hoặc 1 Ô bản đồ nhiệt
        // → chọn công đoạn (+ tuần) và vẽ biểu đồ 8 tuần của công đoạn đó
        const heatCell = t && t.closest ? t.closest('[data-cap-heat]') : null;
        if (heatCell) { selectCapacityStage(heatCell.getAttribute('data-cap-heat'), heatCell.getAttribute('data-cap-heat-week')); return; }
        const rankRow = t && t.closest ? t.closest('[data-cap-rank]') : null;
        if (rankRow) { selectCapacityStage(rankRow.getAttribute('data-cap-rank')); return; }
        // Tiêu đề CỘT tuần trên bản đồ nhiệt → chỉ đổi tuần đang xem
        const heatCol = t && t.closest ? t.closest('.cap-heat-col[data-cap-heat-week]') : null;
        if (heatCol) { setCapacityWeek(heatCol.getAttribute('data-cap-heat-week')); return; }
        const stageRow = t && t.closest ? t.closest('[data-cap-stage-row]') : null;
        if (stageRow) { toggleCapacityStageDays(stageRow.getAttribute('data-cap-stage-row')); return; }
        const weekRow = t && t.closest ? t.closest('[data-cap-week-row]') : null;
        if (weekRow) toggleCapacityWeekOpen(weekRow.getAttribute('data-cap-week-row'));
      });
    }

    safeOn('btn-history-planning',  'click', () => openHistoryModal('planning'));
    
    safeOn('btn-history-materials', 'click', () => openHistoryModal('materials'));
    safeOn('btn-history-qc',        'click', () => openHistoryModal('qc'));
    safeOn('btn-history-hr',        'click', () => openHistoryModal('hr'));
    safeOn('btn-history-dashboard', 'click', () => openHistoryModal('dashboard'));
    safeOn('btn-close-history',     'click', closeHistoryModal);
    safeOn('btn-cancel-history',    'click', closeHistoryModal);
    safeOn('history-tab-filter',    'change', (e) => setHistoryTabFilter(e.target.value));
    safeOn('history-user-filter',   'change', (e) => setHistoryUserFilter(e.target.value));
    safeOn('history-domain-filter', 'change', (e) => setHistoryDomainFilter(e.target.value));
    safeOn('btn-clear-history',     'click', clearHistory);

    // Click ủy quyền trong tab Nguyên Liệu: đổi tab vị trí, sửa/xóa bản ghi,
    // mở lightbox ảnh, xóa ảnh xem trước trong form
    document.addEventListener('click', (e) => {
      // Bộ lọc thời gian thẻ KPI: Tất Cả / Tuần này / Tháng này / Năm này
      const kpiBtn = e.target.closest('[data-mat-kpi-period]');
      if (kpiBtn) {
        state.materialKpiPeriod = kpiBtn.getAttribute('data-mat-kpi-period');
        renderMaterialView();
        return;
      }
      const locBtn = e.target.closest('[data-mat-loc]');
      if (locBtn) {
        state.materialActiveLoc = locBtn.getAttribute('data-mat-loc');
        renderMaterialView();
        return;
      }
      const editBtn = e.target.closest('[data-mat-edit]');
      if (editBtn) { openMaterialModal(editBtn.getAttribute('data-mat-edit')); return; }
      const delBtn = e.target.closest('[data-mat-delete]');
      if (delBtn) { deleteMaterial(delBtn.getAttribute('data-mat-delete')); return; }
      // Nhà cung cấp: sửa / xóa dòng trong bảng + chip "Khai báo nhanh" tên cũ
      const supEditBtn = e.target.closest('[data-sup-edit]');
      if (supEditBtn) { openSupplierModal(supEditBtn.getAttribute('data-sup-edit')); return; }
      const supDelBtn = e.target.closest('[data-sup-delete]');
      if (supDelBtn) { deleteSupplier(supDelBtn.getAttribute('data-sup-delete')); return; }
      const supQuickBtn = e.target.closest('[data-sup-quick]');
      if (supQuickBtn) { openSupplierModal(null, supQuickBtn.getAttribute('data-sup-quick')); return; }
      const photoEl = e.target.closest('[data-mat-photo]');
      if (photoEl) {
        openMaterialPhotoModal(photoEl.getAttribute('data-mat-photo'), parseInt(photoEl.getAttribute('data-mat-photo-idx'), 10) || 0);
        return;
      }
      const rmBtn = e.target.closest('[data-mat-remove-img]');
      if (rmBtn) {
        const idx = parseInt(rmBtn.getAttribute('data-mat-remove-img'), 10);
        if (!isNaN(idx) && Array.isArray(state.materialFormImages)) {
          state.materialFormImages.splice(idx, 1);
          renderMaterialImagePreviews();
        }
      }
    });

    // ── XƯỞNG 2 (tab Công Đoạn): thẻ launcher các vị trí công đoạn ──
    // Bấm thẻ mini → mở bảng chi tiết dạng pop-up nổi lên (giống thẻ Nhân Sự)
    document.querySelectorAll('.x2-mini-card').forEach(t => {
      t.addEventListener('click', () => x2OpenCard(t.getAttribute('data-x2-card')));
    });
    // Đóng pop-up: nút Đóng / bấm nền mờ / phím Esc
    const closeX2Detail = () => { x2CloseOpenCard(); };
    safeOn('btn-close-x2-detail', 'click', closeX2Detail);
    const x2Overlay = document.getElementById('x2-detail-overlay');
    // Thứ tự Esc (giống quy tắc của thẻ QC): ① popup ĐỊNH MỨC đang mở → đóng nó
    // ② dropdown nổi (Bào Tinh/Bullig) đang mở → đóng nó ③ mới đóng pop-up thẻ.
    const escX2Priority = () => {
      // ① Ưu tiên popup ĐỊNH MỨC XƯỞNG 1 (modal-x1-rate) nếu đang mở
      const x1Pop = document.getElementById('modal-x1-rate');
      if (x1Pop && x1Pop.classList.contains('show')) { closeX1RatePopup(); return true; }
      const openPop = Object.values(X2_RATE_POPUPS)
        .find(id => { const m = document.getElementById(id); return m && m.classList.contains('show'); });
      if (openPop) { closeX2RatePopup(openPop); return true; }
      const openFl = [
        ['x2-btinh-picker', 'x2-btinh-picker-btn'],
        ['x2-btinh-bt-in-picker', 'x2-btinh-bt-in-btn'],
        ['x2-btinh-bt-out-picker', 'x2-btinh-bt-out-btn'],
        ['x2-bl-gc-picker', 'x2-bl-gc-btn']
      ].find(([p]) => { const el = document.getElementById(p); return el && !el.hidden; });
      if (openFl) { x2FloatHideAll(); return true; }
      return false;
    };
    if (x2Overlay) {
      x2Overlay.addEventListener('click', (e) => { if (e.target === x2Overlay) closeX2Detail(); });
      x2Overlay.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !escX2Priority()) closeX2Detail(); });
    }
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      if (!document.getElementById('x2-detail-overlay')?.classList.contains('show')) return;
      if (!escX2Priority()) closeX2Detail();
    });
    // Đổi kích thước cửa sổ → đặt lại đỉnh pop-up đúng dưới header
    window.addEventListener('resize', () => {
      const ov = document.getElementById('x2-detail-overlay');
      if (ov && ov.classList.contains('show')) x2PositionDetailOverlay();
    });
    // Form cắt/chọn: đổi nguyên liệu → mặc định ngày theo lô; submit → lưu.
    // (Nút "Ghi Cắt/Chọn" ở header đã BỎ — form luôn hiển thị sẵn;
    //  Người cắt + Thời gian + Số giờ cắt TỰ ĐỘNG từ Bảng bố trí Nhân Sự)
    safeOn('btn-cancel-x2-cut', 'click', () => resetXuong2CutForm());
    safeOn('x2-cut-material', 'change', updateXuong2CutLinked);
    safeOn('x2-cut-form', 'submit', handleXuong2CutSubmit);
    // ── Vị trí BỐC LUỒNG (thẻ launcher Xưởng 2 — tab Công Đoạn) ──
    // Form: chọn lô "Luồng cây..." (lô đã bốc HẾT tự ẩn) + ngày bốc + khối lượng
    // thực tế → submit lưu (NGƯỜI BỐC + GIỜ BỐC tự động từ Bảng bố trí Nhân Sự)
    safeOn('btn-cancel-x2-blg', 'click', () => resetXuong2BoluongForm());
    safeOn('x2-blg-material', 'change', updateXuong2BoluongLinked);
    safeOn('x2-blg-form', 'submit', handleXuong2BoluongSubmit);
    // Bảng lịch sử (thẻ ngày): thu gọn / mở rộng + lưu Định mức công suất (kg/h)
    safeOn('btn-toggle-x2blg-table', 'click', toggleX2BoluongTable);
    safeOn('btn-x2-blg-rate-save', 'click', handleX2BoluongRateSave);
    safeOn('x2-blg-rate-month', 'change', renderX2BoluongRateBar); // đổi tháng → nạp định mức đã đặt
    // Bảng lịch sử (nhóm theo ngày): thu gọn / mở rộng + lưu Định mức công suất
    safeOn('btn-toggle-x2cut-table', 'click', toggleX2CutTable);
    safeOn('btn-x2-rate-save', 'click', handleX2CapRateSave);
    // ═══ XƯỞNG 1 — CÔNG TẮC CHUYỂN XƯỞNG + 3 THẺ CÔNG ĐOẠN ═══
    // Nút XƯỞNG 1 / XƯỞNG 2 ở đầu tab Công Đoạn SX
    safeOn('stage-ws-x2', 'click', () => setStageWs('x2'));
    safeOn('stage-ws-x1', 'click', () => setStageWs('x1'));
    // ── THẺ 1: CẮT ỐNG ──
    safeOn('x1-cat-ong-form', 'submit', handleX1CatOngSubmit);
    safeOn('btn-cancel-x1-cat-ong', 'click', () => resetX1CatOngForm());
    safeOn('x1-cat-ong-material', 'change', () => x1CatOngSyncLinked(true));
    // ── THẺ 2: SẤY SINH ──
    safeOn('x1-say-sinh-form', 'submit', handleX1SaySinhSubmit);
    safeOn('btn-cancel-x1-say-sinh', 'click', () => resetX1SaySinhForm());
    safeOn('x1-say-sinh-source', 'change', () => x1SaySinhSyncLinked(true));
    // ── THẺ 3: BỐC ──
    safeOn('x1-boc-form', 'submit', handleX1BocSubmit);
    safeOn('btn-cancel-x1-boc', 'click', () => resetX1BocForm());
    safeOn('x1-boc-source', 'change', () => x1BocSyncLinked(true));
    // Ô tự tính (đổi số → vẽ lại, KHÔNG tự điền đè số người dùng đang gõ)
    ['x1-cat-ong-kl-dat', 'x1-cat-ong-kl-loai'].forEach(id => safeOn(id, 'input', x1CatOngCalc));
    safeOn('x1-say-sinh-qty', 'input', x1SaySinhCalc);
    safeOn('x1-boc-qty', 'input', x1BocCalc);
    // ── POPUP ĐỊNH MỨC XƯỞNG 1 (1 popup cho 3 công đoạn) ──
    safeOn('btn-x1-cat-ong-rate', 'click', () => openX1RatePopup('catOng'));
    safeOn('btn-x1-say-sinh-rate', 'click', () => openX1RatePopup('saySinh'));
    safeOn('btn-x1-boc-rate', 'click', () => openX1RatePopup('boc'));
    safeOn('btn-close-x1-rate', 'click', closeX1RatePopup);
    safeOn('btn-x1-rate-save', 'click', handleX1RateSave);
    safeOn('btn-x1-rate-reset', 'click', handleX1RateReset);
    safeOn('x1-rate-kind', 'change', renderX1RatePopup);
    safeOn('x1-rate-month', 'change', renderX1RatePopup);

    // ── 5 CÔNG ĐOẠN ĐUÔI XƯỞNG 1 (khung SPEC dùng chung — Giai đoạn 2) ──
    // Lọc Ống ← Bốc · Cắt Mắt ← Lọc Ống · Bổ ← Cắt Mắt ·
    // Phơi Sấy ← Bổ · Lọc Thanh/Bó Xô ← Phơi Sấy
    X1_CHAIN_SPECS.forEach(sp => {
      const base = 'x1-' + sp.prefix;
      safeOn(base + '-form', 'submit', e => handleX1ChainSubmit(sp, e));
      safeOn('btn-cancel-' + base, 'click', () => resetX1ChainForm(sp));
      safeOn(base + '-src', 'change', () => x1ChainSyncLinked(sp, true));
      ['in', 'ok', 'loai'].forEach(part =>
        safeOn(base + '-' + part, 'input', () => x1ChainCalc(sp)));
      safeOn('btn-' + base + '-rate', 'click', () => openX1RatePopup(sp.rateKind));
    });
    // Bấm nền mờ của popup định mức Xưởng 1 → đóng
    const x1RateOv = document.getElementById('modal-x1-rate');
    if (x1RateOv) x1RateOv.addEventListener('click', (e) => { if (e.target === x1RateOv) closeX1RatePopup(); });
    // ── Vị trí BỔ ỐNG (thẻ launcher Xưởng 2 — tab Công Đoạn) ──
    // Form: đổi lô ống (điền sẵn phần còn lại vào ô KL ống bổ) / gõ số lượng bổ
    // hoặc KL ống loại → tự tính lại; submit → lưu.
    // (Người bổ + Thời gian bổ TỰ ĐỘNG từ Bảng bố trí Nhân Sự — không điền tay)
    safeOn('x2-bo-ong-cut', 'change', () => updateXuong2BoOngLinked(true));
    safeOn('x2-bo-ong-bo', 'input', () => updateXuong2BoOngLinked(false));
    safeOn('x2-bo-ong-loai', 'input', () => updateXuong2BoOngLinked(false));
    safeOn('x2-bo-ong-form', 'submit', handleXuong2BoOngSubmit);
    safeOn('btn-cancel-x2-bo-ong', 'click', () => resetXuong2BoOngForm());
    // Bảng lịch sử bổ ống: thu gọn / mở rộng + lưu Định mức công suất bổ ống
    safeOn('btn-toggle-x2ong-table', 'click', toggleX2BoOngTable);
    safeOn('btn-x2-ong-rate-save', 'click', handleX2BoOngRateSave);
    safeOn('x2-ong-rate-month', 'change', renderX2BoOngRateBar); // đổi tháng → nạp định mức đã đặt
    // ── Vị trí CHẠY MÁY BÀO THÔ (thẻ launcher Xưởng 2 — tab Công Đoạn) ──
    // Form: chọn lô đã bổ (theo lô) / nhập Dài-Rộng-Dày (nhiều giá trị cách dấu
    // phẩy) → tự tính tổ hợp + thể tích 1 thanh; submit → lưu.
    // (Người chạy máy + thời gian TỰ ĐỘNG từ Bảng bố trí Nhân Sự — không điền tay)
    // ── POPUP ĐỊNH MỨC CỦA 6 THẺ CÔNG ĐOẠN (nút nằm TRONG form nhập) ──
    Object.entries(X2_RATE_POPUPS).forEach(([btnId, popupId]) => {
      safeOn(btnId, 'click', () => openX2RatePopup(popupId));
      safeOn(`btn-close-${popupId.replace('modal-', '')}`, 'click', () => closeX2RatePopup(popupId));
      // Bấm nền mờ / phím Esc → đóng popup
      const m = document.getElementById(popupId);
      if (m) {
        m.addEventListener('click', (e) => { if (e.target === m) closeX2RatePopup(popupId); });
        m.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeX2RatePopup(popupId); });
      }
    });
    safeOn('x2-bao-tho-lot', 'change', updateXuong2BaoThoLinked);
    safeOn('btn-bt-lot-all', 'click', baoThoLotSelectAll);    // chọn NHIỀU lô: tất cả
    safeOn('btn-bt-lot-clear', 'click', baoThoLotSelectNone);  // bỏ chọn hết
    safeOn('x2-bao-tho-form', 'submit', handleXuong2BaoThoSubmit);
    safeOn('btn-cancel-x2-bao-tho', 'click', () => resetXuong2BaoThoForm());
    ['x2-bao-tho-dai', 'x2-bao-tho-rong', 'x2-bao-tho-day'].forEach(id => {
      safeOn(id, 'input', renderX2BaoThoCalc);
    });
    // Bảng lịch sử chạy máy: thu gọn / mở rộng + lưu Định mức công suất bào thô
    safeOn('btn-toggle-x2bt-table', 'click', toggleX2BaoThoTable);
    safeOn('btn-x2-bt-rate-save', 'click', handleX2BaoThoRateSave);
    safeOn('x2-bt-rate-month', 'change', renderX2BaoThoRateBar);
    // ── Vị trí CHỌN NAN THÔ (thẻ launcher Xưởng 2 — tab Công Đoạn) ──
    // Form: chọn lô đã bào thô (theo ngày bào thô) → nạp danh sách LOẠI NAN của lô;
    // chọn "Thêm loại mới" → hiện 3 ô Dài/Rộng/Dày (nhập ở ngoài công đoạn).
    // (Người chọn nan + thời gian TỰ ĐỘNG từ Bảng bố trí Nhân Sự — không điền tay)
    safeOn('x2-cn-baotho', 'change', updateXuong2ChonNanLinked);
    safeOn('x2-cn-size', 'change', renderX2ChonNanCalc);
    ['x2-cn-dai', 'x2-cn-rong', 'x2-cn-day', 'x2-cn-qty'].forEach(id => {
      safeOn(id, 'input', renderX2ChonNanCalc);
    });
    safeOn('x2-cn-form', 'submit', handleXuong2ChonNanSubmit);
    // SỬA NHANH 2 Ô NGAY TRONG THẺ NGÀY (Phân loại · Số lượng) — uỷ nhiệm change
    safeOn('x2-cn-day-cards', 'change', onChonNanInlineEdit);
    safeOn('btn-cancel-x2-cn', 'click', () => resetXuong2ChonNanForm());
    // Bảng lịch sử chọn nan: thu gọn / mở rộng + lưu Định mức công suất chọn nan
    safeOn('btn-toggle-x2cn-table', 'click', toggleX2ChonNanTable);
    safeOn('btn-x2-cn-rate-save', 'click', handleX2ChonNanRateSave);
    safeOn('x2-cn-rate-month', 'change', renderX2ChonNanRateBar);
    // ── Vị trí BULLIG (thẻ launcher Xưởng 2 — tab Công Đoạn) ──
    // Form: Ngày + Công đoạn nhỏ (Gia công / Chọn thanh); Gia công → nút mở danh sách
    // thẻ lô Bullig ở Kho (chọn được nhiều) + SL x/tổng + K.thước thành phẩm (gợi ý);
    // Chọn thanh → Loại thanh + SL đạt/lỗi (Tổng tự tính). Người làm/giờ TỰ ĐỘNG.
    safeOn('x2-bl-kind', 'change', () => { syncX2BulligKindRows(); renderX2BulligCalc(); });
    safeOn('x2-bl-gc-btn', 'click', () => {
      // Mở/đóng DANH SÁCH THẺ LÔ (cờ UI state.x2BulligLotOpen — vẽ lại thẻ không tự mở)
      state.x2BulligLotOpen = !state.x2BulligLotOpen;
      syncX2BulligKindRows();
      if (state.x2BulligLotOpen) {
        renderX2BulligLotList();
        const btn = document.getElementById('x2-bl-gc-btn');
        if (btn && btn.scrollIntoView) btn.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });
    safeOn('x2-bl-gc-search', 'input', renderX2BulligLotList);
    safeOn('x2-bl-gc-list', 'click', onBulligListClick);
    ['x2-bl-gc-qty', 'x2-bl-ct-ok', 'x2-bl-ct-err'].forEach(id => {
      safeOn(id, 'input', renderX2BulligCalc);
    });
    safeOn('x2-bl-ct-size', 'change', renderX2BulligCalc);
    safeOn('x2-bl-out', 'input', renderX2BulligCalc);
    safeOn('x2-bl-form', 'submit', handleXuong2BulligSubmit);
    safeOn('btn-cancel-x2-bl', 'click', () => resetXuong2BulligForm());
    safeOn('btn-toggle-x2bl-table', 'click', toggleX2BulligTable);
    safeOn('btn-x2-bl-rate-save', 'click', handleX2BulligRateSave);
    safeOn('x2-bl-rate-month', 'change', renderX2BulligRateBar);
    safeOn('x2-bl-rate-kind', 'change', renderX2BulligRateBar);
    // ── Vị trí BÀO TINH (thẻ launcher Xưởng 2 — tab Công Đoạn) ──
    // Form: Ngày bào + Loại bào (Bào tinh / Bào tinh hạ cấp / Bào thanh) + Chọn
    // thanh (đổi theo loại bào) + Kích thước sau bào + SL thanh đạt / lỗi.
    // (Người bào + thời gian TỰ ĐỘNG từ Bảng bố trí Nhân Sự — không điền tay)
    safeOn('x2-btinh-kind', 'change', updateXuong2BaoTinhLinked);
    // Chọn thanh: nút mở DANH SÁCH THẺ — bấm 1 thẻ = CHỌN, bấm lần nữa = BỎ CHỌN
    safeOn('x2-btinh-picker-btn', 'click', x2BaoTinhTogglePicker);
    // Dropdown NỔI: neo lại khi CUỘN bất kỳ vùng nào / đổi cỡ màn hình
    window.addEventListener('scroll', () => x2FloatRepositionAll(), true);
    window.addEventListener('resize', () => x2FloatRepositionAll());
    safeOn('x2-btinh-search', 'input', renderX2BaoTinhList);   // ô tìm nhanh lọc thẻ (CHỮ — bỏ dấu)
    // Ô TÌM THEO SỐ LƯỢNG (tách riêng): CHỈ khớp số lượng — lọc KẾT HỢP với ô tìm nhanh (VÀ)
    safeOn('x2-btinh-qty-search', 'input', renderX2BaoTinhList);
    safeOn('x2-btinh-list', 'click', onBaoTinhListClick);
    safeOn('x2-btinh-pick-all', 'click', baoTinhPickAll);
    safeOn('x2-btinh-pick-clear', 'click', baoTinhClearPicks);
    // Ô SL thanh ĐẠT trong bảng tổng hợp (tạo động) → cập nhật thanh lỗi tự tính + tổng kết
    safeOn('x2-btinh-groups', 'input', onBaoTinhGroupInput);
    safeOn('x2-btinh-groups', 'click', onBaoTinhGroupClick);
    // ── BÀO THANH: 4 trường (Chọn thanh đầu vào · Số lượng · Đầu ra · ĐẠT từ QC) ──
    // ① Danh sách nguồn (thanh BTP Ép Ván + thanh LỖI của chính Bào thanh) — không
    //    lọc theo tuần; bấm thẻ = chọn, thẻ cạn hàng thì làm mờ không chọn được
    safeOn('x2-btinh-bt-in-btn', 'click', toggleBaoThanhInputPicker);
    safeOn('x2-btinh-bt-in-list', 'click', (e) => {
      const btn = e && e.target && e.target.closest ? e.target.closest('[data-btinh-bt-in]') : null;
      if (!btn) return false;
      const id = btn.getAttribute('data-btinh-bt-in') || '';
      const item = baoTinhInputPool().find(x => String(x.id) === String(id));
      if (item && item.remaining <= 0) {   // hết hàng → làm mờ, không chọn được
        showToast(`Cỡ ${item.sizeKey} đã dùng hết — không còn thanh để bào.`, 'info');
        return true;
      }
      setBaoThanhInput(id);
      return true;
    });
    // ② Số lượng đem bào → cập nhật bảng tóm tắt + ô tổng kết
    safeOn('x2-btinh-bt-qty', 'input', () => { renderX2BaoTinhGroups(); renderX2BaoTinhCalc(); });
    // ③ Dropdown nổi CỠ ĐẦU RA + nút "Thêm kích thước"
    safeOn('x2-btinh-bt-out-btn', 'click', toggleBaoThanhOutPicker);
    safeOn('x2-btinh-bt-out-list', 'click', (e) => {
      const btn = e && e.target && e.target.closest ? e.target.closest('[data-btinh-bt-out]') : null;
      if (!btn) return false;
      setBaoThanhOut(btn.getAttribute('data-btinh-bt-out'));
      return true;
    });
    safeOn('x2-btinh-bt-out-add', 'click', addBaoThanhOutSize);
    // 2 Ô tìm CỦA THANH ĐẦU VÀO Bào thanh (ô chữ ∧ ô SỐ LƯỢNG — kết hợp VÀ) + đổi Ngày Bào
    // → nguồn đầu vào lọc lại (KHÔNG lọc theo tuần)
    safeOn('x2-btinh-bt-in-search', 'input', renderBaoThanhInputList);
    safeOn('x2-btinh-bt-in-qty-search', 'input', renderBaoThanhInputList);
    safeOn('x2-btinh-date', 'change', () => { renderX2BaoThanhForm(); renderX2BaoTinhList(); });
    safeOn('x2-btinh-form', 'submit', handleXuong2BaoTinhSubmit);
    safeOn('btn-cancel-x2-btinh', 'click', () => resetXuong2BaoTinhForm());
    // Bảng lịch sử bào tinh: thu gọn / mở rộng
    safeOn('btn-toggle-x2btinh-table', 'click', toggleX2BaoTinhTable);
    // ── ĐỊNH MỨC 3 CỘT (popup — nút nằm TRONG form nhập) ──
    safeOn('btn-x2-btinh-rate', 'click', openX2BaoTinhRateModal);
    safeOn('btn-close-x2-btinh-rate', 'click', closeX2BaoTinhRateModal);
    safeOn('btn-x2-btinh-rate-add-month', 'click', handleX2BaoTinhRateAddMonth);
    safeOn('x2-btinh-rate-rows', 'click', (e) => {
      if (!e || !e.target || typeof e.target.closest !== 'function') return false;
      const save = e.target.closest('[data-x2-btinh-rate-save]');
      if (save) { handleX2BaoTinhRateRowSave(save.getAttribute('data-x2-btinh-rate-save')); return true; }
      const reset = e.target.closest('[data-x2-btinh-rate-reset]');
      if (reset) { handleX2BaoTinhRateRowReset(reset.getAttribute('data-x2-btinh-rate-reset')); return true; }
      return false;
    });
    // ── BỘ LỌC KỲ (Tuần / Tháng / Năm) — dùng chung ô thống kê + bảng lịch sử ──
    safeOn('x2-btinh-period-bar', 'click', (e) => {
      if (!e || !e.target || typeof e.target.closest !== 'function') return false;
      const dir = e.target.closest('[data-x2-btinh-period-dir]');
      if (dir) { shiftX2BaoTinhFilter(dir.getAttribute('data-x2-btinh-period-dir')); return true; }
      const mode = e.target.closest('[data-x2-btinh-period]');
      if (mode) { setX2BaoTinhFilterMode(mode.getAttribute('data-x2-btinh-period')); return true; }
      return false;
    });
    // ── THẺ KHO NAN (launcher Xưởng 2 — tab Công Đoạn) ──
    // PHIẾU KHO: gạt Phiếu Xuất ⇄ Xử Lý Lỗi; gắn lô (danh sách thẻ, chọn nhiều,
    // mỗi lô sửa được số lượng); sổ theo kỳ Ngày/Tuần/Tháng; Ban lãnh đạo duyệt.
    safeOn('x2-kho-type-xuat', 'click', () => setKhoNoteType('xuat'));
    safeOn('x2-kho-type-scr', 'click', () => setKhoNoteType('xu_ly'));
    safeOn('x2-kho-note-form', 'submit', handleKhoNoteSubmit);
    safeOn('btn-kho-note-reset', 'click', () => resetX2KhoNoteForm(false));
    safeOn('x2-kho-purpose', 'change', renderX2KhoCalc);
    safeOn('x2-kho-purpose-note', 'input', renderX2KhoCalc);
    safeOn('x2-kho-source', 'change', () => { fillX2KhoSizeSuggestions(); renderX2KhoCalc(); });
    safeOn('x2-kho-method', 'change', renderX2KhoCalc);
    safeOn('x2-kho-size', 'input', renderX2KhoCalc);
    safeOn('x2-kho-qty', 'input', renderX2KhoCalc);
    safeOn('x2-kho-lots-btn', 'click', () => khoToggleLotsPanel());
    safeOn('x2-kho-lots-search', 'input', (e) => khoSetLotsQuery(e.target.value));
    safeOn('x2-kho-lots-list', 'click', khoOnLotsPanelClick);
    safeOn('x2-kho-lots-list', 'input', khoOnLotsQtyInput); // ô số lượng của từng lô đã chọn
    safeOn('x2-kho-pending-rows', 'click', khoOnPendingClick);
    safeOn('x2-kho-pick-all', 'click', khoPickAllPending);
    safeOn('x2-kho-approve-all', 'click', khoApprovePicked);
    safeOn('x2-kho-wip-bar', 'click', khoOnWipClick);
    safeOn('btn-toggle-x2kho-table', 'click', toggleX2KhoTable);
    safeOn('btn-toggle-x2kho-stock', 'click', toggleX2KhoStockTable);
    safeOn('x2-kho-period-day', 'click', () => setKhoPeriodMode('day'));
    safeOn('x2-kho-period-tuan', 'click', () => setKhoPeriodMode('tuan'));
    safeOn('x2-kho-period-thang', 'click', () => setKhoPeriodMode('thang'));
    safeOn('x2-kho-from', 'change', renderX2KhoLedger);
    safeOn('x2-kho-to', 'change', renderX2KhoLedger);
    safeOn('x2-kho-search', 'input', renderX2KhoLedger);
    safeOn('x2-kho-show-used', 'change', (e) => khoSetShowUsed(e.target.checked));
    safeOn('x2-kho-backfill-btn', 'click', khoBackfillFromLegacy);
    safeOn('btn-kho-add-manual', 'click', () => openTransferKhoModal('new')); // Nhập Kho thủ công trên cột Kho
    // ── Thẻ THAN HÓA + SẤY: định mức 1 lần than hóa + thu gọn bảng Kanban ──
    // (Số lần than hóa thật của nhóm + giờ sự cố cho phép của ngày: ô nhập trong
    // bảng thống kê → lưu khi rời ô)
    safeOn('x2-say-day-rows', 'change', onSayTimesChange);
    safeOn('x2-say-day-rows', 'change', onSayIncidentChange);
    // Giờ SỰ CỐ CHO PHÉP trên ĐẦU THẺ NGÀN của 7 thẻ Xưởng 2 (uỷ nhiệm document —
    // ô nằm trong bảng lịch sử của từng thẻ, đổi thẻ là phần tử khác)
    document.addEventListener('change', (e) => {
      const t = e && e.target;
      if (!t || typeof t.getAttribute !== 'function') return;
      if (t.getAttribute && t.getAttribute('data-x2-incident')) onStageIncidentChange(e);
    });
    // POPUP "Định mức" — bảng theo tháng 4 cột phút/lần (Ván/Bullig) + m³/lần lô cũ
    safeOn('btn-x2-say-rate', 'click', openX2SayRateModal);
    safeOn('btn-close-x2-say-rate', 'click', closeX2SayRateModal);
    safeOn('btn-x2sr-add-month', 'click', handleX2SayRateAddMonth);
    safeOn('btn-x2sr-m3-save', 'click', handleX2SayRateM3Save);
    safeOn('x2sr-m3-month', 'change', syncX2SayRateM3Inputs);
    // Uỷ nhiệm click trong bảng định mức: nút Lưu / Khôi phục của từng HÀNG tháng
    safeOn('x2-say-rate-rows', 'click', (e) => {
      const t = e.target;
      const saveBtn = t.closest ? t.closest('[data-x2sr-save]') : null;
      if (saveBtn) { handleX2SayRateRowSave(saveBtn.getAttribute('data-x2sr-save')); return; }
      const resetBtn = t.closest ? t.closest('[data-x2sr-reset]') : null;
      if (resetBtn) { handleX2SayRateRowReset(resetBtn.getAttribute('data-x2sr-reset')); return; }
    });
    safeOn('btn-toggle-kanban-board', 'click', toggleX2KanbanBoard);
    // ── BẢNG ĐIỀU KHIỂN LÒ SẤY (thẻ Than Hóa + Sấy — js/kiln.js) ──
    // 2 tab chuyển khung: Bảng Điều Khiển (mặc định) ↔ Bảng Dữ Liệu (Kanban cũ)
    safeOn('x2-say-tab-ctrl', 'click', () => switchX2SayFrame('ctrl'));
    safeOn('x2-say-tab-data', 'click', () => switchX2SayFrame('data'));
    // Bảng lò: chạm thẻ = menu Thêm · icon kho / nút Vào Kho = chuyển nhanh;
    // kéo thẻ lò thả vào ô KHO = chuyển nhanh (desktop). Bấm ra ngoài = đóng menu.
    safeOn('x2-kiln-board', 'click', onKilnBoardClick);
    safeOn('x2-kiln-board', 'dragstart', kilnTileDragStart);
    safeOn('x2-kiln-kho-drop', 'dragover', onKilnKhoDragOver);
    safeOn('x2-kiln-kho-drop', 'dragleave', onKilnKhoDragLeave);
    safeOn('x2-kiln-kho-drop', 'drop', onKilnKhoDrop);
    document.addEventListener('click', (e) => {
      if (!e.target.closest || !e.target.closest('.kiln-tile')) closeKilnMenus();
    });
    // ── THẺ "ĐỘ ẨM LÒ SẤY" (tab QC — ma trận ngày × lò, tối ưu điện thoại) ──
    safeOn('btn-kiln-hum-save', 'click', saveKilnHumidityForm);
    safeOn('btn-kiln-th-save', 'click', handleKilnThresholdSave);
    // Bấm ô QUÁ KHỨ trên ma trận → hộp thoại sửa nhanh (nhập số mới / xóa)
    safeOn('kiln-hum-matrix', 'click', onKilnMatrixClick);
    // Click ủy quyền trong bảng lịch sử cắt/chọn + bổ ống: sửa / xóa lượt
    document.addEventListener('click', (e) => {
      const cutEdit = e.target.closest && e.target.closest('[data-x2-cut-edit]');
      if (cutEdit) { editXuong2Cut(cutEdit.getAttribute('data-x2-cut-edit')); return; }
      const cutDel = e.target.closest && e.target.closest('[data-x2-cut-delete]');
      if (cutDel) { deleteXuong2Cut(cutDel.getAttribute('data-x2-cut-delete')); return; }
      // Click ủy quyền bảng lịch sử BỐC LUỒNG: sửa / xóa lượt
      const blgEdit = e.target.closest && e.target.closest('[data-x2-blg-edit]');
      if (blgEdit) { editXuong2Boluong(blgEdit.getAttribute('data-x2-blg-edit')); return; }
      const blgDel = e.target.closest && e.target.closest('[data-x2-blg-delete]');
      if (blgDel) { deleteXuong2Boluong(blgDel.getAttribute('data-x2-blg-delete')); return; }
      // ── Click ủy quyền 3 THẺ XƯỞNG 1: sửa / xóa lượt ──
      const x1COEdit = e.target.closest && e.target.closest('[data-x1-cat-ong-edit]');
      if (x1COEdit) { editX1CatOng(x1COEdit.getAttribute('data-x1-cat-ong-edit')); return; }
      const x1CODel = e.target.closest && e.target.closest('[data-x1-cat-ong-delete]');
      if (x1CODel) { deleteX1CatOng(x1CODel.getAttribute('data-x1-cat-ong-delete')); return; }
      const x1SSEdit = e.target.closest && e.target.closest('[data-x1-say-sinh-edit]');
      if (x1SSEdit) { editX1SaySinh(x1SSEdit.getAttribute('data-x1-say-sinh-edit')); return; }
      const x1SSDel = e.target.closest && e.target.closest('[data-x1-say-sinh-delete]');
      if (x1SSDel) { deleteX1SaySinh(x1SSDel.getAttribute('data-x1-say-sinh-delete')); return; }
      const x1BEEdit = e.target.closest && e.target.closest('[data-x1-boc-edit]');
      if (x1BEEdit) { editX1Boc(x1BEEdit.getAttribute('data-x1-boc-edit')); return; }
      const x1BEDel = e.target.closest && e.target.closest('[data-x1-boc-delete]');
      if (x1BEDel) { deleteX1Boc(x1BEDel.getAttribute('data-x1-boc-delete')); return; }
      // 5 công đoạn đuôi — thuộc tính DÙNG CHUNG: data-x1-edit/delete + data-x1-card
      const x1CE = e.target.closest && e.target.closest('[data-x1-edit]');
      if (x1CE) { const sp = x1ChainSpec(x1CE.getAttribute('data-x1-card')); if (sp) { editX1Chain(sp, x1CE.getAttribute('data-x1-edit')); return; } }
      const x1CD = e.target.closest && e.target.closest('[data-x1-delete]');
      if (x1CD) { const sp = x1ChainSpec(x1CD.getAttribute('data-x1-card')); if (sp) { deleteX1Chain(sp, x1CD.getAttribute('data-x1-delete')); return; } }
      // Chip tháng đã đặt định mức bốc luồng → nạp tháng + số kg/h vào ô nhập
      const blgRateChip = e.target.closest && e.target.closest('[data-x2-boluong-rate]');
      if (blgRateChip) {
        const m = blgRateChip.getAttribute('data-x2-boluong-rate');
        const selEl = document.getElementById('x2-blg-rate-month');
        if (selEl && m) { selEl.value = m; renderX2BoluongRateBar(); }
        return;
      }
      // Chip tháng đã đặt định mức → nạp tháng + số kg/h vào ô nhập để sửa lại
      const rateChip = e.target.closest && e.target.closest('[data-x2-ong-rate]');
      if (rateChip) {
        const m = rateChip.getAttribute('data-x2-ong-rate');
        const selEl = document.getElementById('x2-ong-rate-month');
        if (selEl && m) { selEl.value = m; renderX2BoOngRateBar(); }
        return;
      }
      const ongEdit = e.target.closest && e.target.closest('[data-x2-ong-edit]');
      if (ongEdit) { editXuong2BoOng(ongEdit.getAttribute('data-x2-ong-edit')); return; }
      const ongDel = e.target.closest && e.target.closest('[data-x2-ong-delete]');
      if (ongDel) { deleteXuong2BoOng(ongDel.getAttribute('data-x2-ong-delete')); return; }
      // Chip tháng đã đặt định mức bào thô → nạp tháng + số thanh/h vào ô nhập
      const btRateChip = e.target.closest && e.target.closest('[data-x2-bt-rate]');
      if (btRateChip) {
        const m = btRateChip.getAttribute('data-x2-bt-rate');
        const selEl = document.getElementById('x2-bt-rate-month');
        if (selEl && m) { selEl.value = m; renderX2BaoThoRateBar(); }
        return;
      }
      const btEdit = e.target.closest && e.target.closest('[data-x2-bt-edit]');
      if (btEdit) { editXuong2BaoTho(btEdit.getAttribute('data-x2-bt-edit')); return; }
      const btDel = e.target.closest && e.target.closest('[data-x2-bt-delete]');
      if (btDel) { deleteXuong2BaoTho(btDel.getAttribute('data-x2-bt-delete')); return; }
      // Chip tháng đã đặt định mức chọn nan → nạp tháng + số thanh/h vào ô nhập
      const cnRateChip = e.target.closest && e.target.closest('[data-x2-cn-rate]');
      if (cnRateChip) {
        const m = cnRateChip.getAttribute('data-x2-cn-rate');
        const selEl = document.getElementById('x2-cn-rate-month');
        if (selEl && m) { selEl.value = m; renderX2ChonNanRateBar(); }
        return;
      }
      const cnEdit = e.target.closest && e.target.closest('[data-x2-cn-edit]');
      if (cnEdit) { editXuong2ChonNan(cnEdit.getAttribute('data-x2-cn-edit')); return; }
      const cnDel = e.target.closest && e.target.closest('[data-x2-cn-delete]');
      if (cnDel) { deleteXuong2ChonNan(cnDel.getAttribute('data-x2-cn-delete')); return; }
      // Chip tháng đã đặt định mức Bullig → nạp tháng + công đoạn + số thanh/h vào ô nhập
      const blRateChip = e.target.closest && e.target.closest('[data-x2-bl-rate]');
      if (blRateChip) {
        const m = blRateChip.getAttribute('data-x2-bl-rate');
        const kind = blRateChip.getAttribute('data-x2-bl-rate-kind') || 'gc';
        const selEl = document.getElementById('x2-bl-rate-month');
        const kindEl = document.getElementById('x2-bl-rate-kind');
        if (kindEl) kindEl.value = kind;
        if (selEl && m) { selEl.value = m; renderX2BulligRateBar(); }
        return;
      }
      const blEdit = e.target.closest && e.target.closest('[data-x2-bl-edit]');
      if (blEdit) { editXuong2Bullig(blEdit.getAttribute('data-x2-bl-edit')); return; }
      const blDel = e.target.closest && e.target.closest('[data-x2-bl-delete]');
      if (blDel) { deleteXuong2Bullig(blDel.getAttribute('data-x2-bl-delete')); return; }
      // Chip tháng đã đặt định mức bào tinh → nạp tháng + số thanh/h vào ô nhập
      // Chip tháng ĐÃ ĐẶT ĐỊNH MỨC ÉP VÁN (m³/h) → nạp tháng vào ô nhập
      const epvRateChip = e.target.closest && e.target.closest('[data-x2-epv-rate]');
      if (epvRateChip) {
        const m = epvRateChip.getAttribute('data-x2-epv-rate');
        const selEl = document.getElementById('x2-epv-rate-month');
        if (selEl && m) { selEl.value = m; renderX2EpVanRateBar(); }
        return;
      }
      const btinhEdit = e.target.closest && e.target.closest('[data-x2-btinh-edit]');
      if (btinhEdit) { editXuong2BaoTinh(btinhEdit.getAttribute('data-x2-btinh-edit')); return; }
      const btinhDel = e.target.closest && e.target.closest('[data-x2-btinh-delete]');
      if (btinhDel) { deleteXuong2BaoTinh(btinhDel.getAttribute('data-x2-btinh-delete')); return; }
    });
  }

export {
  pushUndo,
  setupEventListeners,
  undoLastAction,
  updateUndoButton
};
