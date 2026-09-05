// ═══════════════════════════════════════════════════════════
// js/events.js — tách từ app.js (refactor ES-modules phase 1)
// ═══════════════════════════════════════════════════════════
import { checkAuthAndRender, closeUserPermsModal, closeUsersMgrModal, handleAddUserSubmit, handleRegisterSubmit, handleUserPermsSubmit, openUsersMgrModal, saveSession, toggleRegisterForm } from './auth.js';
import { clearMultiSelection, closeBatchFormModal, closeTransferModal, confirmMultiTransfer, exitMultiTransferMode, handleBatchFormSubmit, handleTransferSubmit, openBatchFormModal, selectAllMulti, toggleBatchSelection, toggleMultiTransferMode } from './batch-modals.js';
import { applyImportedShareToken, applyRoleToUI, closeShareModal, copyShareTokenToClipboard, isFirebaseOnline, openShareModal, pullCloudToLocal, requireEditPermission, uploadLocalDataToCloud } from './cloud.js';
import { closeChartBuilderModal, handleChartBuilderSubmit, openChartBuilderModal, populateBuilderOptions, updateChartBuilderPreview } from './dashboard.js';
import { closeCustomExportModal, closeMaterialsExportModal, closePlanningExportModal, closePressExportModal, handleCustomExportSubmit, handleMaterialsExportSubmit, handlePlanningExportSubmit, handlePressExportSubmit, openCustomExportModal, openMaterialsExportModal, openPlanningExportModal, openPressExportModal } from './export-xlsx.js';
import { closeColumnFilters } from './kanban.js';
import { filterMobileKanbanColumns, renderAll, switchView } from './main.js';
import { addBomLine, closeMaterialRateModal, closePlanningEditModal, closePlanningItemModal, closeProductBomModal, dimUseKey, getUniqueNanTypes, handleMaterialRateSubmit, handlePlanningEditSubmit, handlePlanningItemSubmit, handleProductBomSubmit, openMaterialRateModal, openPlanningItemModal, openProductBomModal, renderPlanningMatrix, savePlanningForecast, savePlanningStock, toggleRateTableCollapse } from './planning.js';
import { addPressLine, addPressStick, applyBomToPressLines, closePressModal, handlePressRecordSubmit, openPressModal, populatePressWeekFilter, recalcPressQuantities, refreshPressProductSelect, renderPlanCapacityChart, renderPlanVsPressChart, renderPressChart, renderPressTable, setPlanVsPressUnit, shiftPlanCapacityWindow, shiftPlanVsPressWeek, suggestPressMaterialFields } from './press.js';
import { addMaterialPlanWeek, closeMaterialModal, closeMaterialPhotoModal, deleteMaterial, handleMaterialImageSelect, handleMaterialPlanInput, handleMaterialSubmit, materialPhotoNav, MATERIAL_TYPE_SUGGESTIONS, openMaterialModal, openMaterialPhotoModal, removeMaterialPlanWeek, renderMaterialImagePreviews, renderMaterialPlanChart, renderMaterialPlanTable, renderMaterialView, shiftMaterialPlanChartWeek, updateMaterialWeight } from './materials.js';
import { applyQcWeekToAll, closeQcExportModal, deleteQcExport, handleQcExportSubmit, onQcProductChange, openQcExportModal, updateQcExportRow } from './qc.js';
import { state } from './state.js';
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

    // Mobile Stage Tabs
    document.querySelectorAll('.stage-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.stage-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        state.activeMobileStage = tab.getAttribute('data-stage');
        filterMobileKanbanColumns();
      });
    });

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
        checkAuthAndRender();
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
    safeOn('btn-add-batch', 'click', () => openBatchFormModal());
    safeOn('mobile-add-btn', 'click', () => openBatchFormModal());

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

    // Transfer Modal
    safeOn('btn-close-transfer',  'click', closeTransferModal);
    safeOn('btn-cancel-transfer', 'click', closeTransferModal);
    safeOn('transfer-form',       'submit', handleTransferSubmit);

    // ── Chọn nhiều lô để chuyển cùng lúc ──
    safeOn('btn-multi-transfer',  'click', toggleMultiTransferMode);
    safeOn('btn-mtb-cancel',      'click', exitMultiTransferMode);
    safeOn('btn-mtb-clear',       'click', clearMultiSelection);
    safeOn('btn-mtb-select-all',  'click', selectAllMulti);
    safeOn('btn-mtb-confirm',     'click', confirmMultiTransfer);
    // Bấm vào thẻ lô khi đang ở chế độ chọn nhiều => bật/tắt đánh dấu
    document.addEventListener('click', (e) => {
      if (!state.multiTransferMode) return;
      const card = e.target.closest('.bamboo-card');
      if (!card) return;
      if (e.target.closest('.card-actions')) return; // vẫn cho bấm nút trên thẻ nếu hiện
      const id = card.getAttribute('data-id');
      if (id) toggleBatchSelection(id);
    });

    // User Manager
    safeOn('btn-open-users-mgr', 'click', openUsersMgrModal);
    safeOn('btn-close-users',    'click', closeUsersMgrModal);
    safeOn('btn-cancel-users',   'click', closeUsersMgrModal);
    safeOn('add-user-form',      'submit', handleAddUserSubmit);

    // Share & Sync
    safeOn('btn-dropdown-share',    'click', openShareModal);
    safeOn('btn-upload-cloud',      'click', uploadLocalDataToCloud);
    safeOn('btn-pull-cloud',        'click', pullCloudToLocal);
    safeOn('btn-close-share',       'click', closeShareModal);
    safeOn('btn-cancel-share',      'click', closeShareModal);
    safeOn('btn-copy-token',        'click', copyShareTokenToClipboard);
    safeOn('btn-apply-token-sync',  'click', applyImportedShareToken);

    // Custom XLSX Export
    safeOn('btn-open-export-modal',  'click', openCustomExportModal);
    safeOn('btn-dropdown-export',    'click', openCustomExportModal);
    safeOn('btn-close-export-modal', 'click', closeCustomExportModal);
    safeOn('btn-cancel-export',      'click', closeCustomExportModal);
    safeOn('custom-export-form',     'submit', handleCustomExportSubmit);

    // Xuất Excel riêng từng tab: Kế Hoạch / Ép Ván / Nguyên Liệu
    safeOn('btn-open-export-planning',   'click', openPlanningExportModal);
    safeOn('btn-close-export-planning',  'click', closePlanningExportModal);
    safeOn('btn-cancel-export-planning', 'click', closePlanningExportModal);
    safeOn('planning-export-form',       'submit', handlePlanningExportSubmit);
    safeOn('btn-open-export-press',      'click', openPressExportModal);
    safeOn('btn-close-export-press',     'click', closePressExportModal);
    safeOn('btn-cancel-export-press',    'click', closePressExportModal);
    safeOn('press-export-form',          'submit', handlePressExportSubmit);
    safeOn('btn-open-export-materials',   'click', openMaterialsExportModal);
    safeOn('btn-close-export-materials',  'click', closeMaterialsExportModal);
    safeOn('btn-cancel-export-materials', 'click', closeMaterialsExportModal);
    safeOn('materials-export-form',       'submit', handleMaterialsExportSubmit);

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
    safeOn('file-load-local', 'change', loadDataFromLocalFile);

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
    safeOn('file-import-json', 'change', handleImportJSON);

    // ── KẾ HOẠCH SẢN XUẤT (PLANNING VIEW) ──
    safeOn('btn-add-material-rate', 'click', () => openMaterialRateModal());
    safeOn('btn-close-material-rate', 'click', closeMaterialRateModal);
    safeOn('btn-cancel-material-rate', 'click', closeMaterialRateModal);
    safeOn('material-rate-form', 'submit', handleMaterialRateSubmit);

    // ── Định mức ván thô → thành phẩm (BOM phụ) ──
    safeOn('btn-add-product-bom', 'click', () => openProductBomModal());
    safeOn('btn-close-product-bom', 'click', closeProductBomModal);
    safeOn('btn-cancel-product-bom', 'click', closeProductBomModal);
    safeOn('product-bom-form', 'submit', handleProductBomSubmit);
    safeOn('btn-add-bom-line', 'click', () => addBomLine());
    // Thu gọn / mở rộng bảng định mức (bảng chính & bảng phụ ván thô)
    safeOn('btn-toggle-rate-main', 'click', () => toggleRateTableCollapse('rate-main-card'));
    safeOn('btn-toggle-rate-bom', 'click', () => toggleRateTableCollapse('rate-bom-card'));

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

    // ── Biểu đồ tĩnh Kế Hoạch vs Đã Ép (Dashboard) ──
    safeOn('pv-year-filter', 'change', (e) => {
      state.planVsPressYear = e.target.value;
      renderPlanVsPressChart();
    });
    safeOn('pv-unit-qty', 'click', () => setPlanVsPressUnit('qty'));
    safeOn('pv-unit-vol', 'click', () => setPlanVsPressUnit('vol'));
    // Điều hướng theo tuần của biểu đồ
    safeOn('pv-week-filter', 'change', (e) => {
      state.planVsPressWeek = e.target.value === 'all' ? 'all' : Number(e.target.value);
      renderPlanVsPressChart();
    });
    safeOn('pv-week-prev', 'click', () => shiftPlanVsPressWeek(-1));
    safeOn('pv-week-next', 'click', () => shiftPlanVsPressWeek(1));

    // ── Biểu đồ Khả Năng Đáp Ứng — bộ lọc RIÊNG (năm + cửa sổ tuần, tách khỏi biểu đồ trên) ──
    safeOn('pv-cap-year-filter', 'change', (e) => {
      state.planCapYear = e.target.value;
      state.planCapStartIdx = null; // đổi năm -> về mặc định (tuần hiện tại)
      renderPlanCapacityChart();
    });
    safeOn('pv-cap-prev', 'click', () => shiftPlanCapacityWindow(-1));
    safeOn('pv-cap-next', 'click', () => shiftPlanCapacityWindow(1));
    // Thanh trượt: kéo là vẽ lại ngay (input) — mượt và cảm nhận trực quan
    safeOn('pv-cap-slider', 'input', (e) => {
      const v = Number(e.target.value);
      if (!Number.isFinite(v) || v < 0) return;
      state.planCapStartIdx = v;
      renderPlanCapacityChart();
    });

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

    // ── Sản lượng ép ván ──
    safeOn('btn-add-press', 'click', () => openPressModal());
    safeOn('btn-close-press-modal', 'click', closePressModal);
    safeOn('btn-cancel-press', 'click', closePressModal);
    safeOn('press-record-form', 'submit', handlePressRecordSubmit);
    safeOn('btn-add-press-line', 'click', () => addPressLine());
    safeOn('btn-add-press-stick', 'click', () => addPressStick());
    // Đổi ngày ép: cập nhật tuần tự động + danh sách thành phẩm cùng tuần
    safeOn('press-date', 'change', () => {
      const dateVal = document.getElementById('press-date')?.value;
      const weekEl = document.getElementById('press-week');
      if (weekEl) weekEl.value = dateVal ? getISOWeekString(dateVal) : '';
      refreshPressProductSelect();
      recalcPressQuantities();
    });
    // Đổi thành phẩm: tự điền Ván Thô theo định mức ván thô (nếu có) +
    // gợi ý kích thước TP + keo/phụ gia theo định mức
    safeOn('press-product', 'change', () => {
      applyBomToPressLines();
      suggestPressMaterialFields(true);
      recalcPressQuantities();
    });
    // Người dùng sửa tay keo/phụ gia -> đánh dấu không tự gợi ý nữa
    ['press-glue', 'press-additive'].forEach(fid => {
      safeOn(fid, 'input', (e) => { e.target.setAttribute('data-manual', '1'); });
    });
    // Nhập liệu trên các dòng thành phần -> tính lại số lượng thành phẩm
    document.addEventListener('input', (e) => {
      if (e.target && e.target.closest && e.target.closest('#press-lines')) {
        recalcPressQuantities();
      }
    });
    // Bộ lọc năm của biểu đồ
    safeOn('press-year-filter', 'change', (e) => {
      state.pressYearFilter = e.target.value;
      populatePressWeekFilter(); // danh sách tuần phụ thuộc năm đang chọn
      renderPressChart();
      renderPressTable();
    });
    // Bộ lọc tuần của biểu đồ & bảng lượt ép
    safeOn('press-week-filter', 'change', (e) => {
      state.pressWeekFilter = e.target.value;
      renderPressChart();
      renderPressTable();
    });
    // Thu gọn / mở rộng bảng danh sách lượt ép
    safeOn('btn-toggle-press-table', 'click', () => toggleRateTableCollapse('press-table-card'));

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

    // ── QC — Bảng Xuất Hàng ──
    safeOn('btn-add-qc-export', 'click', openQcExportModal);
    safeOn('btn-close-qc-export', 'click', closeQcExportModal);
    safeOn('btn-cancel-qc-export', 'click', closeQcExportModal);
    safeOn('qc-export-form', 'submit', handleQcExportSubmit);
    safeOn('qc-product', 'change', onQcProductChange);
    safeOn('btn-qc-apply-week-all', 'click', applyQcWeekToAll);
    // Thu gọn / mở rộng bảng xuất hàng
    safeOn('btn-toggle-qc-table', 'click', () => toggleRateTableCollapse('qc-table-card'));
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

    // ── Biểu đồ Kế hoạch vs Thực tế nguyên liệu theo ngày ──
    safeOn('mpc-week-filter', 'change', (e) => {
      state.materialPlanChartWeek = e.target.value;
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
    // Gợi ý loại nguyên liệu (datalist)
    const matDl = document.getElementById('material-type-suggestions');
    if (matDl) matDl.innerHTML = MATERIAL_TYPE_SUGGESTIONS.map(t => `<option value="${escapeHTML(t)}">`).join('');
    // Gợi ý nhà cung cấp: lấy từ các lần nhập trước
    const supDl = document.getElementById('material-supplier-suggestions');
    if (supDl) {
      const sups = [...new Set((state.materialRecords || []).map(r => (r.supplier || '').trim()).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b, 'vi'));
      supDl.innerHTML = sups.map(s => `<option value="${escapeHTML(s)}">`).join('');
    }
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
  }

export {
  pushUndo,
  setupEventListeners,
  undoLastAction,
  updateUndoButton
};
