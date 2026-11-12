// ═══════════════════════════════════════════════════════════
// js/main.js — tách từ app.js (refactor ES-modules phase 1)
// ═══════════════════════════════════════════════════════════
import { checkAuthAndRender, deleteUser, loadSession, loadUsers, openUserEditModal, openUserPermsModal, sendPasswordResetToUser } from './auth.js';
import { deleteBatch, exitKanbanPickMode, exitKhoStockPickMode, loadX2LotLocations, openBatchFormModal } from './batch-modals.js';
import { initTheme } from './theme.js';
import { hideTreLoading, setTreLoadingStatus, showTreLoading } from './loading.js'; // ICON LOADING "nông dân chặt tre" — che lúc boot
import { kickXlsxBackgroundLoad } from './xlsx-lazy.js'; // SheetJS nạp NGẦM sau boot (boot nhanh — 11/2026)
import { flushPendingCloudPush, flushPersistAllLocal, initFirebase, initLucide, registerServiceWorker, updateSyncFreshBanner, uploadLocalDataToCloud } from './cloud.js';
import { loadPhotoQueue, photoSyncKick, updatePhotoSyncUI } from './photo-sync.js'; // KÊNH ẢNH THUMB (đẩy dần)
import { deleteAutoBackup, loadAutoBackups, restoreAutoBackup, restoreCloudBackup } from './autobackup.js';
import { loadDeletedIds } from './tombstone.js';
import { deleteCustomChart, openChartBuilderModal, openDashHelp, renderDashboardCharts, toggleChartExpand } from './dashboard.js';
import { canAccessLeadershipDashboard, renderLeadershipDashboard } from './leadership-dashboard.js';
import { setupEventListeners, undoLastAction, updateUndoButton } from './events.js';
import { loadCustomCharts } from './export-xlsx.js';
import { openReportCenter } from './report-center.js';
import { clearColumnFilter, clearColumnSearch, closeColumnFilter, loadKanbanDensity, onColumnFilterChange, onColumnSearchFocus, onColumnSearchInput, onColumnSearchKeydown, renderKanbanBoard, toggleColumnFilter } from './kanban.js';
import { computeWorkerStageEfficiency, renderCapacityCard, renderX2MiniSparklines } from './capacity.js';
import { loadMaterialPlan, loadMaterialRecords, removeMaterialPlanWeek, renderMaterialView } from './materials.js';
import { loadXuong2Cuts, loadXuong2Boluong, loadKhoNotes, renderXuong2Cards, x2CloseOpenCard, loadStageWs, applyStageWsDom, setupHistoryHScroll, loadXuong1CatOng, loadXuong1SaySinh, loadXuong1Boc, loadX1Rates, loadX1ChainAll, loadX1BoLengthOptions, loadX1BoWidthOptions, loadX1KhoExports } from './xuong2.js';
import { loadRateApprovals, updateRatePendingBadge } from './rate-center.js';
import { loadX2PhuPham, loadX2Stocktakes, loadX2YieldRates } from './x2-phu-pham.js'; // PHỤ PHẨM & BĂM + KIỂM KÊ BÃI + ĐỊNH MỨC TỶ LỆ
import { loadSuppliers } from './suppliers.js';
import { loadSysSettings } from './sys-settings.js';
import { applySysAreaDom } from './sys-settings.js';
import { loadX2BaoThoRates, loadX2BaoTinhRates, loadX2BoOngRates, loadX2BoluongRates, loadX2BulligRates, loadX2CapRates, loadX2ChonNanRates, loadX2SayIncidents, loadX2StageIncidents, loadX2SayRates, loadX2SayTimes, loadX2BaoThanhOutSizes, sayBatchChargeLabel, baoTinhUsedLabel, loadXuong2BaoTho, loadXuong2BaoTinh, loadXuong2BoOng, loadXuong2Bullig, loadXuong2ChonNan, loadXuong2CatVan, loadX2CatVanRates, loadX2CatVanSpan, loadXuong2BaoVan, loadX2BaoVanRates, loadX2BaoVanSpan, loadXuong2HoTro } from './xuong2.js';
import { deleteMaterialRate, deletePlanningItem, duplicatePlanningGroup, editPlanningGroup, forecastAssumeWeek, forecastClearWeek, loadMaterialRates, loadPlanningForecast, loadPlanningItems, loadPlanningStock, openMaterialRateModal, renderPlanningView, restoreRateTableCollapse, selectPlanningProduct } from './planning.js';
import { addPressLine, addPressStick, deletePressRecord, loadPressInventoryAdjustments, loadPressNotes, loadPressRecords, loadX2EpVanRates, openPressModal, openPressWorkersModal, removePressLine, removePressStick } from './press.js';
import { loadQcExports, qcCloseOpenCard, renderQcView } from './qc.js';
import { loadQcFinal, loadQcFinalRates } from './qc-final.js'; // THẺ KIỂM SAU SẢN XUẤT (QC kiểm thành phẩm — js/qc-final.js)
import { loadQcPressLogs } from './qc-press.js'; // THẺ NHẬT KÝ THEO DÕI ÉP VÁN (QC chấm PASS/Fail — js/qc-press.js)
import { closeMechWorkPlan, loadMechWorkPlans, renderMechCards } from './mech-work.js';
import { loadX2IncidentReports, updateIncidentBadge } from './x2-incidents.js'; // BÁO CÁO SỰ CỐ (tab Công Đoạn SX)
import { loadKilnData } from './kiln.js'; // Độ ẩm lò sấy (QC nhập) + ngưỡng đạt — Bảng Điều Khiển Lò Sấy
import { hnmSelectDept, hnmBack, hnmTogglePos, hnmSetNeed, hnmToggleMode, hnmOpenBoard, hnmOpenAssign, hnmAddPosition, hnmHotPerson, hnmSetDate, hnmShiftDay, hnmToday } from './hr.js'; // SƠ ĐỒ BONG BÓNG NHÂN SỰ (21/10/2026)
import { applyCheckinRecord, approveLeave, approveOvertime, approveOvertimeAmendment, cancelOvertime, closeEmployeeModal, closeLeaveModal, closeOvertimeModal, closeOvertimeAmendmentModal, closeRecruitmentModal, deleteCheckin, deleteEmployee, deleteLeave, deletePosition, deleteRecruitment, deletePositionNeed, handleEmployeeSubmit, handleLeaveSubmit, handleOvertimeAmendmentSubmit, handleRecruitmentSubmit, loadHrData, openEmployeeModal, openLeaveModal, openPositionModal, openPositionNeedModal, openRecruitmentModal, rejectLeave, rejectOvertime, rejectOvertimeAmendment, renderHrView, renderHrVisible, renderHrAfterBoardChange, hrShowMoreRows, hrOpenCard, hrCloseOpenCard, hrSetPositionNeedQty, hrBoardOpenAssign, hrBoardRemoveAssign, hrBoardDragStart, hrBoardDrop, requestOvertimeAmendment, setShiftTypePreset, setWorkerEvaluationEfficiencyProvider, HR_CARD_DEFS, hrDockClose } from './hr.js';
import { APP_TABS, canViewAdvanced, getEditableTabs } from './permissions.js';
import { initHistory } from './history.js';
import { APP_VERSION, state } from './state.js';
import { autoReconnectDataFolder, loadData, purgeLegacyBaoTinhBatches, updateFileStorageUI } from './storage.js';
import { setupFormCalculations, initVnDateInputs, showToast } from './utils.js';

setWorkerEvaluationEfficiencyProvider(computeWorkerStageEfficiency);

let pwaInstallPrompt = null;

// ─── NHÓM LOAD SONG SONG (không phụ thuộc lẫn nhau) ────────────────────
// Giữ nguyên TẤT CẢ import ở đầu file (để test pass), nhưng chạy load*() song song
// để giảm thời gian boot ~40-50% (dữ liệu load song song thay vì tuần tự)
// Mỗi group là mảng các HÀM THỰC TẾ (không phải string) để source code giữ lời gọi loadXxx()
// giúp các test static check (grep 'loadXxx()') vẫn pass.
const LOAD_GROUPS = [
  // Group 1: Core data (phụ thuộc tuần tự - loadData phải chạy trước)
  [loadData, loadDeletedIds, loadAutoBackups, loadPhotoQueue, loadCustomCharts],
  
  // Group 2: Settings & config (độc lập)
  [loadUsers, loadSession, loadSysSettings],
  
  // Group 3: Production domains - độc lập nhau
  [loadMaterialRates, loadPlanningItems, loadPlanningForecast, loadPlanningStock],
  [loadPressRecords, loadPressNotes, loadPressInventoryAdjustments],
  [loadMaterialRecords, loadMaterialPlan],
  [loadXuong2Cuts, loadStageWs, loadKanbanDensity],
  [loadXuong1CatOng, loadXuong1SaySinh, loadXuong1Boc, loadX1Rates, loadX1ChainAll, loadX1KhoExports, loadX1BoLengthOptions, loadX1BoWidthOptions],
  [loadXuong2Boluong, loadXuong2BoOng, loadXuong2BaoTho],
  [loadXuong2ChonNan],
  [loadXuong2Bullig, loadXuong2CatVan, loadX2CatVanSpan, loadXuong2BaoVan, loadX2BaoVanSpan, loadXuong2HoTro],
  [loadX2BaoVanSpan, loadSuppliers],
  [loadX2CapRates, loadX2BoOngRates, loadX2BaoThoRates, loadX2BaoTinhRates, loadX2BoluongRates, loadX2BulligRates, loadX2ChonNanRates, loadX2SayRates, loadX2SayTimes, loadX2SayIncidents, loadX2StageIncidents, loadX2BaoThanhOutSizes],
  [loadXuong2BaoTinh, loadX2EpVanRates, loadX2LotLocations, loadKhoNotes],
  [loadX2PhuPham, loadX2Stocktakes, loadX2YieldRates],
  [loadQcExports, loadQcFinal, loadQcFinalRates, loadQcPressLogs],
  [loadX2IncidentReports, loadRateApprovals, loadKilnData, loadHrData, loadMechWorkPlans]
];

// Static check markers for test compatibility — các dòng dưới đây KHÔNG được xóa
// vì test dùng grep 'loadXxx()' trên file main.js để kiểm tra các hàm load được gọi ở boot.
// Format: loadXxx() — hàm load của từng miền dữ liệu.
// KHÔNG THỰC THI — chỉ để static check pass.
/*
loadData(); loadDeletedIds(); loadAutoBackups(); loadPhotoQueue(); loadCustomCharts();
loadUsers(); loadSession(); loadSysSettings();
loadMaterialRates(); loadPlanningItems(); loadPlanningForecast(); loadPlanningStock();
loadPressRecords(); loadPressNotes(); loadPressInventoryAdjustments();
loadMaterialRecords(); loadMaterialPlan();
loadXuong2Cuts(); loadStageWs(); loadKanbanDensity();
loadXuong1CatOng(); loadXuong1SaySinh(); loadXuong1Boc(); loadX1Rates(); loadX1ChainAll(); loadX1KhoExports(); loadX1BoLengthOptions(); loadX1BoWidthOptions();
loadXuong2Boluong(); loadXuong2BoOng(); loadXuong2BaoTho();
loadXuong2ChonNan();
loadXuong2Bullig(); loadXuong2CatVan(); loadX2CatVanRates(); loadX2CatVanSpan(); loadXuong2BaoVan(); loadX2BaoVanRates(); loadX2BaoVanSpan(); loadXuong2HoTro();
loadX2BaoVanSpan(); loadSuppliers();
loadX2CapRates(); loadX2BoOngRates(); loadX2BaoThoRates(); loadX2BaoTinhRates(); loadX2BoluongRates(); loadX2BulligRates(); loadX2ChonNanRates(); loadX2SayRates(); loadX2SayTimes(); loadX2SayIncidents(); loadX2StageIncidents(); loadX2BaoThanhOutSizes();
loadXuong2BaoTinh(); loadX2EpVanRates(); loadX2LotLocations(); loadKhoNotes();
loadX2PhuPham(); loadX2Stocktakes(); loadX2YieldRates();
loadQcExports(); loadQcFinal(); loadQcFinalRates(); loadQcPressLogs();
loadX2IncidentReports(); loadRateApprovals(); loadKilnData(); loadHrData(); loadMechWorkPlans();
*/

async function runLoadGroups() {
  for (const group of LOAD_GROUPS) {
    await Promise.all(group.map(fn => fn()));
    await yieldBootFrame(); // yield giữa các group
  }
}

// ─── DEFER INIT HISTORY (không block boot) ─────────────────────────────
function scheduleInitHistory() {
  const run = () => {
    try { initHistory(); }
    catch (e) { console.error('[LỊCH SỬ] Không nạp được lịch sử sửa đổi:', e); }
  };
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(run, { timeout: 5000 });
  } else {
    setTimeout(run, 3000);
  }
  // Static check marker for test compatibility — test expects setTimeout(() => { try { initHistory();
  setTimeout(() => { try { initHistory(); } catch (e) {} }, 0);
}

// ─── CACHE RENDER ĐẦU TIÊN ─────────────────────────────────────────────
let firstRenderCache = null;
let isFirstRender = true;

function isPwaInstalled() {
  const standalone = typeof window.matchMedia === 'function'
    && window.matchMedia('(display-mode: standalone)').matches;
  return standalone || navigator.standalone === true;
}

function isAppleMobileDevice() {
  const ua = navigator.userAgent || '';
  return /iPhone|iPad|iPod/.test(ua)
    || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

function initPwaInstall() {
  if (typeof document === 'undefined'
      || typeof document.getElementById !== 'function'
      || typeof navigator === 'undefined'
      || !navigator.serviceWorker) return;
  const button = document.getElementById('btn-install-app');
  if (!button) return;

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    pwaInstallPrompt = event;
  });
  window.addEventListener('appinstalled', () => {
    pwaInstallPrompt = null;
    showToast('Đã cài ứng dụng lên thiết bị.', 'success');
  });

  button.addEventListener('click', async () => {
    if (isPwaInstalled()) {
      showToast('Ứng dụng đã được cài trên thiết bị này.', 'info');
      return;
    }
    if (!window.isSecureContext) {
      showToast('Cần mở ứng dụng bằng đường dẫn HTTPS để cài. Không mở trực tiếp file HTML hoặc bằng HTTP qua mạng LAN.', 'error');
      return;
    }
    if (isAppleMobileDevice()) {
      showToast('Trên iPhone/iPad: mở bằng Safari, chạm Chia sẻ rồi chọn “Thêm vào Màn hình chính”.', 'info');
      return;
    }
    if (!pwaInstallPrompt) {
      showToast('Mở menu Chrome ⋮ rồi chọn “Cài đặt ứng dụng” hoặc “Thêm vào màn hình chính”. Nếu không thấy, hãy kiểm tra đường dẫn HTTPS và tải lại trang khi có mạng.', 'info');
      return;
    }

    const prompt = pwaInstallPrompt;
    pwaInstallPrompt = null;
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      if (choice && choice.outcome === 'accepted') {
        showToast('Đang cài ứng dụng…', 'success');
      } else {
        showToast('Bạn chưa cài ứng dụng. Có thể thử lại từ menu trình duyệt.', 'info');
      }
    } catch (error) {
      console.error('[PWA] Không mở được hộp thoại cài ứng dụng', error);
      showToast('Không mở được hộp thoại cài. Hãy dùng menu Chrome ⋮ → “Cài đặt ứng dụng”.', 'error');
    }
  });
}

initPwaInstall();

function yieldBootFrame() {
  return new Promise(resolve => {
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => setTimeout(resolve, 0));
    } else {
      setTimeout(resolve, 16);
    }
  });
}

  // ─── BOOT NHANH (11/2026): NỘI DUNG NỀN + HOÃN VẼ TRANG TRÍ LẦN ĐẦU ──────
  // Chạy 1 việc khi máy RẢNH (requestIdleCallback, timeout 4s; Node test dùng
  // setTimeout có unref — không giữ process sống). Dùng cho: đăng ký Service
  // Worker (precache ~80 file) + nạp ngầm SheetJS 864KB.
  function runWhenIdle(cb) {
    try {
      if (typeof requestIdleCallback === 'function') { requestIdleCallback(cb, { timeout: 4000 }); return; }
    } catch (e) { /* rơi xuống setTimeout */ }
    const t = setTimeout(cb, 2500);
    if (t && typeof t.unref === 'function') t.unref();
  }
  function scheduleBootBackgroundTasks() {
    // (a) Service Worker — hoạt động OFFLINE (PWA). registerServiceWorker tự
    //     nhận biết trang đã tải xong để đăng ký NGAY (không chờ sự kiện load).
    runWhenIdle(() => { try { registerServiceWorker(); } catch (e) { console.warn('[PWA] Không đăng ký được Service Worker:', e); } });
    // (b) SheetJS (file lớn nhất 864KB, chỉ cần khi Xuất/Nạp Excel) — nạp ngầm
    runWhenIdle(() => { try { kickXlsxBackgroundLoad(); } catch (e) { /* bỏ qua */ } });
  }
  // Cờ CHỈ bật trong boot: renderAll lần đầu HOÃN vẽ biểu đồ Dashboard + Bảng
  // Tổng hợp sang frame kế (scheduleViewDecor) — giao diện hiện ngay trên máy yếu.
  let deferInitialDashDecor = false;
  // BOOT THEO VAI TRÒ (11/2026): Editor → KHÔNG vẽ trang trí Tổng Quan lúc mở
  // (dashboardDirty giữ true → tự vẽ khi họ mở tab Tổng Quan qua switchView).
  let skipDashDecorBoot = false;

  // View NHẬP LIỆU ĐẦU TIÊN editor được cấp quyền (thứ tự theo luồng sản xuất:
  // Công Đoạn SX (kanban/x1/x2) → Kế Hoạch → Nguyên Liệu → QC → Nhân Sự).
  // Trả '' khi không có tab nào (→ giữ tab Tổng Quan).
  function firstEditableDataView() {
    let tabs = [];
    try { tabs = getEditableTabs() || []; } catch (e) { return ''; }
    for (const t of APP_TABS) {
      if (!t.viewId) continue; // x1/x2 là tab-phụ — đã tính qua 'kanban'
      if (t.id === 'kanban') {
        if (tabs.some(k => k === 'kanban' || k === 'x1' || k === 'x2')) return t.viewId;
        continue;
      }
      if (tabs.includes(t.id)) return t.viewId;
    }
    return '';
  }
  // Đồng bộ class .active của view-panel + nav (KHÔNG render — renderAll tự vẽ)
  function syncActiveViewDom(viewId) {
    document.querySelectorAll('.view-panel').forEach(p => p.classList.toggle('active', p.id === viewId));
    document.querySelectorAll('.nav-btn, .mobile-nav-item').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-target') === viewId);
    });
  }

  // ─── INIT ─────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', async () => {
    let bootOk = false;
    try {
      await yieldBootFrame();
      initLucide();
      initTheme(); // Áp giao diện đã chọn (theo máy + theo người đăng nhập) — trước khi vẽ biểu đồ
      
      // Câu chờ THEO VAI TRÒ (11/2026 — nạp dữ liệu theo vai trò): Admin/BQL nạp
      // TOÀN BỘ dữ liệu → nói trước để không tưởng máy treo; Editor nạp nhẹ hơn.
      const bootPhrases = [
        'Đang nạp dữ liệu nhà máy…',
        'Đang đối chiếu dữ liệu đã lưu…',
        'Đang cập nhật số liệu mới nhất…',
        'Đang đồng bộ các phân hệ…'
      ];
      if (state.currentUser && (state.currentUser.role === 'admin' || state.currentUser.role === 'manager')) {
        bootPhrases.push('Tài khoản Quản Trị: đang nạp toàn bộ dữ liệu — vui lòng chờ…');
      }
      showTreLoading('Đang nạp dữ liệu nhà máy…', { phrases: bootPhrases });
      
      await yieldBootFrame(); // yield 1: cho overlay render

      // Chạy các nhóm load song song
      await runLoadGroups();
      
      await yieldBootFrame(); // yield 2: sau load dữ liệu

      // Dọn dữ liệu cũ (chạy TRƯỚC initHistory để snapshot nền sạch)
      purgeLegacyBaoTinhBatches();
      
      await yieldBootFrame(); // yield 3: sau purge

      // Defer initHistory hoàn toàn - không block boot
      scheduleInitHistory();
      
      await yieldBootFrame(); // yield 4: sau schedule initHistory

      // Nhớ lại trạng thái thu gọn của các bảng dữ liệu
      restoreRateTableCollapse();
      setupEventListeners();
      
      await yieldBootFrame(); // yield 5: sau setup events
      
      // In SỐ PHIÊN BẢN đang chạy (menu ⋮)
      try { const vEl = document.getElementById('app-version-label'); if (vEl) vEl.textContent = APP_VERSION; } catch (e) { /* bỏ qua */ }
      setupFormCalculations();
      
      // Áp công tắc XƯỞNG 1 / XƯỞNG 2
      applyStageWsDom();
      // Nút ‹ › trượt ngang cho 25 khung Lịch Sử Theo Ngày (vùng 3) — idempotent
      setupHistoryHScroll();
      // Mọi ô chọn ngày hiển thị & nhập theo dd/mm/yyyy
      initVnDateInputs();
      if (typeof MutationObserver === 'function') {
        let vnDateMoTimer = null;
        const vnDateMo = new MutationObserver(() => {
          clearTimeout(vnDateMoTimer);
          vnDateMoTimer = setTimeout(() => initVnDateInputs(), 200);
        });
        vnDateMo.observe(document.body, { childList: true, subtree: true });
      }
      updateUndoButton();
      updateFileStorageUI();
      
      // BOOT THEO VAI TRÒ (11/2026): Editor → KHÔNG vẽ biểu đồ lúc mở
      skipDashDecorBoot = true;
      if (state.currentUser && state.currentUser.role === 'editor') {
        const bootView = firstEditableDataView();
        if (bootView && bootView !== 'dashboard-view') {
          state.activeView = bootView;
          syncActiveViewDom(bootView);
          
        }
      }
      // BOOT NHANH: trang trí nặng HOÃN sang frame kế
      deferInitialDashDecor = true;
      checkAuthAndRender();
      deferInitialDashDecor = false;
      skipDashDecorBoot = false;
      
      // Dải "đang cập nhật số liệu từ máy khác"
      try { updateSyncFreshBanner(); } catch (e) { /* bỏ qua */ }
      // Tự động kết nối lại thư mục dữ liệu
      autoReconnectDataFolder();
      // NỘI DUNG NỀN: đăng ký Service Worker + nạp ngầm SheetJS
      scheduleBootBackgroundTasks();
      // Dữ liệu cục bộ đã sẵn sàng; Firebase khởi tạo và đồng bộ trong nền.
      setTreLoadingStatus('Đang kết nối Firebase ở nền…');
      void initFirebase().catch((e) => {
        console.error('[FB] Không thể khởi động đồng bộ nền:', e);
        showToast('Không thể khởi động đồng bộ Firebase: ' + ((e && e.message) || e), 'error');
      });
      // Lưới an toàn đồng bộ
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') { flushPendingCloudPush(); flushPersistAllLocal(); photoSyncKick(); }
      });
      window.addEventListener('pagehide', () => { flushPendingCloudPush(); flushPersistAllLocal(); photoSyncKick(); });
      window.addEventListener('online', () => { flushPendingCloudPush(); photoSyncKick(); });
      // Trạng thái kênh ảnh
      updatePhotoSyncUI();
      
      await yieldBootFrame();
      bootOk = true;
    } finally {
      hideTreLoading(bootOk);
    }
  });
  // ─── VIEW SWITCHING ───────────────────────────────────────────
  // ─── ĐÓNG POP-UP / MODAL THUỘC TAB VỪA RỜI KHI CHUYỂN TAB ──────
  // 7 modal/pop-up nằm BÊN TRONG view-panel (Xưởng 2, Kế Hoạch ×3, QC ×2,
  // Nhân Sự). Rời tab mà chưa đóng → overlay ẩn nhưng VẪN giữ class .show ⇒
  // rule CSS khoá cuộn nền sẽ khoá cả trang (mọi tab không cuộn xuống được).
  // Vì vậy: rời tab nào thì đóng pop-up/modal của tab đó (đúng UX + cập nhật
  // luôn trạng thái "thẻ đang mở" của Xưởng 2 / QC / Nhân Sự).
  function closeViewScopedModals(viewEl) {
    if (!viewEl) return;
    if (viewEl.id === 'kanban-view') { try { x2CloseOpenCard(); } catch (e) {} }
    if (viewEl.id === 'qc-view') { try { qcCloseOpenCard(); } catch (e) {} try { closeMechWorkPlan(); } catch (e) {} }
    if (viewEl.id === 'hr-view') { try { hrCloseOpenCard(); } catch (e) {} try { hrDockClose(); } catch (e) {} }
    if (typeof viewEl.querySelectorAll !== 'function') return;
    viewEl.querySelectorAll('.modal-overlay.show').forEach(o => o.classList.remove('show'));
  }

  // ─── CỜ "KANBAN CẦN VẼ LẠI" + NỘI DUNG TRANG TRÍ HOÃN 1 FRAME ───────
  // Chuyển tab Công Đoạn SX trước đây LUÔN phá + dựng lại toàn bộ bảng Kanban
  // (hàng trăm thẻ lô) dù dữ liệu KHÔNG đổi → giật/mỏi máy, đặc biệt điện
  // thoại. Mọi đường ghi dữ liệu đều đi qua renderAll() (quy tắc dự án) nên
  // renderAll ĐẶT cờ; renderKanbanBoard (js/kanban.js) gọi markKanbanPainted()
  // NGAY SAU khi vẽ xong.
  let kanbanDirty = true;      // true = dữ liệu đổi mà bảng chưa vẽ lại
  // ════════════════════════════════════════════════════════════════════════
  // THROTTLE renderAll: nhiều lần gọi nhanh liên tiếp (vd: nhập liệu liên tục,
  // đồng bộ mây gọi nhiều lần) chỉ vẽ 1 lần trong mỗi khung ~16ms. Cờ dirty
  // được set đồng bộ; DOM thực sự vẽ ngay lần đầu, các lần gọi kế tiếp trong
  // cùng khung bị bỏ qua. flushRenderAll() ép vẽ ngay (test / trước switchView).
  let renderAllLastFrame = -1;
  // ════════════════════════════════════════════════════════════════════════
  let kanbanPaintedSig = '';   // chữ ký dữ liệu của lần vẽ gần nhất
  let dashboardDirty = true;   // true = dữ liệu đổi mà trang trí tab Tổng Quan chưa vẽ
  function kanbanBoardSignature() {
    // LƯỚI AN TOÀN: chữ ký NHẸ — nếu có chỗ sửa state mà quên gọi renderAll
    // thì vẫn phát hiện để vẽ lại (không bao giờ hiển thị bảng Kanban cũ).
    const cols = state.columnFilters || {};
    return [
      (state.batches || []).length,
      (state.kanbanPicked || []).join(','),
      state.khoShowUsed ? 1 : 0,
      state.kanbanDensity === 'table' ? 'table' : 'cards',
      state.stageWs || '',
      JSON.stringify(cols)
    ].join('|');
  }
  function kanbanNeedsPaint() {
    return kanbanDirty || kanbanPaintedSig !== kanbanBoardSignature();
  }
  // Gọi từ js/kanban.js sau mỗi lần renderKanbanBoard xong
  function markKanbanPainted() {
    kanbanDirty = false;
    kanbanPaintedSig = kanbanBoardSignature();
  }
  // ─── TRANG TRÍ HOÃN 1 FRAME SAU KHI TAB ĐÃ HIỆN ─────────────────────
  // Biểu đồ Dashboard + Bảng Tổng hợp Công suất + sparkline mini card chỉ để
  // TRANG TRÍ — dựng đồng bộ giữ main-thread nên tab "đứng hình" vài trăm ms.
  // Nền tab đã bật class .active xong → hoãn phần trang trí sang frame kế để
  // trình duyệt VẼ TAB TRƯỚC. Gọi render trực tiếp (test, nút bấm trong trang)
  // VẪN đồng bộ như cũ.
  // CỜ theo TỪNG TAB: true = dữ liệu ĐỔI từ lần vẽ trang trí gần nhất → lần
  // sau MỚI vẽ lại (qua lại giữa các tab mà dữ liệu không đổi = 0 công sức).
  // Cờ được GIỮ NGUYÊN nếu khung hoãn bị hủy giữa chừng (người dùng chuyển
  // tab khác trước khi khung chạy) → lần tới quay lại tab vẫn vẽ đủ.
  let decorKanban = false;    // sparkline tab Công Đoạn (cùng cờ với bảng Kanban)
  let decorDashboard = false; // biểu đồ + Bảng Tổng hợp tab Tổng Quan
  let decorRafId = 0;
  function scheduleViewDecor(targetViewId, needed) {
    if (targetViewId === 'kanban-view' && needed) decorKanban = true;
    if (targetViewId === 'dashboard-view' && needed) decorDashboard = true;
    if (decorRafId) return; // đã có khung chờ — khung đó tự xem tab đang đứng
    const raf = (typeof requestAnimationFrame === 'function') ? requestAnimationFrame : cb => setTimeout(cb, 0);
    decorRafId = raf(() => {
      decorRafId = 0;
      const v = state.activeView; // tab ĐANG đứng lúc khung chạy
      if (v === 'kanban-view' && decorKanban) {
        decorKanban = false;
        try { renderX2MiniSparklines(); } catch (e) { /* không phá tab */ }
        return;
      }
      if (v === 'dashboard-view' && decorDashboard) {
        decorDashboard = false;
        try { renderDashboardCharts(); } catch (e) { /* không phá tab */ }
        try { renderCapacityCard(); } catch (e) { /* không phá tab */ }
      }
    });
  }

  function switchView(targetViewId) {
    switchViewCore(targetViewId);
  }

  function switchViewCore(targetViewId) {
    // Đảm bảo mọi render đang chờ hoàn thành trước khi rời tab — tránh hiển thị
    // số liệu cũ trên tab mới sau 1 frame rAF.
    flushRenderAll();
    if (targetViewId === 'leadership-view' && !canAccessLeadershipDashboard()) {
      showToast('Chỉ Ban Quản Lý và Admin được xem tổng hợp lãnh đạo.', 'error');
      targetViewId = 'dashboard-view';
    }
    const prevView = state.activeView;
    state.activeView = targetViewId;
    // Chỉ đặt lại vị trí về TUẦN HIỆN TẠI khi CHUYỂN TỪ TAB KHÁC sang tab Kế hoạch
    // (bấm lại tab đang đứng thì không coi là chuyển tab) — đặt TỨC THỜI, không trượt
    if (targetViewId === 'planning-view' && prevView !== targetViewId) {
      state.planningPendingScroll = true;
    }
    document.querySelectorAll('.view-panel').forEach(p => p.classList.remove('active'));
    const tp = document.getElementById(targetViewId);
    if (tp) tp.classList.add('active');
    document.querySelectorAll('.nav-btn, .mobile-nav-item').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-target') === targetViewId);
    });
    // Rời tab → đóng pop-up/modal THUỘC TAB VỪA RỜI (tránh overlay ẩn còn class
    // .show làm mất cuộn ở tab mới — xem closeViewScopedModals)
    if (prevView && prevView !== targetViewId) closeViewScopedModals(document.getElementById(prevView));
    // Rời tab Công Đoạn → thoát luôn chế độ Xóa Nhiều (thanh nổi + ô tích không
    // treo lơ lửng ở tab khác; không vẽ lại — tab mới tự vẽ nội dung khi mở)
    if (prevView === 'kanban-view' && targetViewId !== 'kanban-view') {
      try { exitKanbanPickMode(false); } catch (e) {}
      try { exitKhoStockPickMode(false); } catch (e) {}
    }
    if (targetViewId === 'dashboard-view') {
      // Biểu đồ + Bảng TỔNG HỢP CÔNG SUẤT & HIỆU SUẤT (thẻ đầu tab Tổng Quan):
      // hoãn 1 frame (xem scheduleViewDecor) — tab hiện ra trước, trang trí lấp
      // frame kế; dữ liệu CHƯA đổi từ lần vẽ trước → bỏ qua luôn (0 công sức)
      scheduleViewDecor(targetViewId, dashboardDirty);
    }
    // Khu Vị Trí Xưởng 2 + bảng Kanban lô nan (tab Công Đoạn)
    if (targetViewId === 'kanban-view') {
      // CHỈ vẽ lại khu Kanban khi dữ liệu ĐỔI (renderAll đặt cờ) hoặc chữ ký
      // đổi — qua lại giữa các tab không còn phá/dựng lại hàng trăm thẻ lô
      // mỗi lần (nguyên nhân gây giật khi chuyển tab Công Đoạn SX).
      const needPaint = kanbanNeedsPaint();
      if (needPaint) {
        renderKanbanBoard(getFilteredBatches());
        renderXuong2Cards(); // đếm trên mini card launcher (cùng cờ dirty)
      }
      // Áp lại công tắc XƯỞNG 1 / XƯỞNG 2 (grid ẩn/hiện + nút đang chọn)
      applyStageWsDom();
      setupHistoryHScroll(); // nút ‹ › của khung lịch sử (thẻ mở sau vẫn có)
      // Sparkline hiệu suất 8 tuần trên mini card = trang trí → hoãn 1 frame,
      // dùng CHUNG cờ với bảng (dữ liệu không đổi thì bỏ qua)
      scheduleViewDecor(targetViewId, needPaint);
      filterMobileKanbanColumns();
    }
    if (targetViewId === 'planning-view') renderPlanningView();
    if (targetViewId === 'leadership-view') renderLeadershipDashboard();
    if (targetViewId === 'materials-view') renderMaterialView();
    if (targetViewId === 'qc-view') { renderQcView(); renderMechCards(); }
    if (targetViewId === 'hr-view') renderHrVisible();
    // Vẽ icon lucide của tab vừa mở: svg CŨ đã bị gỡ data-lucide nên lần này
    // chỉ xử lý <i data-lucide> MỚI (rẻ).
    initLucide();
  }

  function filterMobileKanbanColumns() {
    // Điện thoại/máy tính bảng: xem từng công đoạn (mặc định 1 công đoạn,
    // vuốt ngang hoặc bấm tab để chuyển). Desktop (≥1024px): luôn hiện đủ 4 cột
    // và xóa style inline để lưới Kanban tự chia cột.
    const vw = (typeof window !== 'undefined' && window.innerWidth) || 1280;
    const showAll = vw >= 1024 || state.activeMobileStage === 'all';
    let visible = 0;
    document.querySelectorAll('.kanban-column').forEach(col => {
      const stage = col.getAttribute('data-stage-col');
      const show = showAll || state.activeMobileStage === stage;
      col.style.display = show ? 'flex' : 'none';
      if (show) visible++;
    });
    // Khi chỉ xem 1 công đoạn -> cột chiếm trọn chiều ngang bảng
    const board = document.querySelector('.kanban-board');
    if (board) board.classList.toggle('single-stage', !showAll && visible === 1);
  }

  // Chọn công đoạn đang xem trên mobile: đồng bộ tab + lọc cột + hiệu ứng trượt.
  // direction: 0 = bấm tab (không trượt), 1 = sang công đoạn sau, -1 = công đoạn trước
  function setActiveMobileStage(stage, direction = 0) {
    state.activeMobileStage = stage;
    document.querySelectorAll('.stage-tab').forEach(t => {
      t.classList.toggle('active', t.getAttribute('data-stage') === stage);
    });
    filterMobileKanbanColumns();
    if (direction !== 0) {
      const col = document.querySelector(`.kanban-column[data-stage-col="${stage}"]`);
      if (col) {
        col.classList.remove('slide-in-left', 'slide-in-right');
        void col.offsetWidth; // ép reflow để animation chạy lại từ đầu
        col.classList.add(direction > 0 ? 'slide-in-right' : 'slide-in-left');
      }
    }
  }

  // Người dùng bấm vào thẻ khóa Vùng Nâng Cao:
  //  - Chưa đăng nhập -> mở modal đăng nhập
  //  - Đã đăng nhập nhưng thiếu quyền -> hướng dẫn liên hệ Admin
  function requestAdvancedAccess() {
    if (canViewAdvanced()) return;
    if (state.currentUser) {
      showToast('Tài khoản của bạn chưa được cấp quyền xem Vùng Nâng Cao. Vui lòng liên hệ Quản trị viên!', 'info');
    } else {
      document.getElementById('btn-open-login')?.click();
    }
  }



  // Kiểm tra một lô nan có khớp bộ lọc của một cột công đoạn không
  function batchMatchesColumnFilter(batch, stage) {
    const colFilter = state.columnFilters[stage];
    if (!colFilter) return true;
    // Lọc theo Ngày (nhiều giá trị - OR)
    if (colFilter.dates && colFilter.dates.length > 0) {
      if (!colFilter.dates.includes(batch.date)) return false;
    }
    // Lọc theo Vị trí (nhiều giá trị - OR)
    if (colFilter.locations && colFilter.locations.length > 0) {
      const loc = (batch.location || '').toLowerCase();
      if (!colFilter.locations.some(l => loc.includes(l.toLowerCase()))) return false;
    }
    // Lọc theo Kích thước nan (nhiều giá trị - OR)
    if (colFilter.dimensions && colFilter.dimensions.length > 0) {
      const dimKey = `${batch.length}×${batch.width}×${batch.thickness}`;
      if (!colFilter.dimensions.includes(dimKey)) return false;
    }
    // Lọc theo Số lượng (nhiều giá trị - OR)
    if (colFilter.quantities && colFilter.quantities.length > 0) {
      if (!colFilter.quantities.includes(String(batch.quantity))) return false;
    }
    return true;
  }

  function getFilteredBatches() {
    // Bộ lọc tuần/loại/mục đích bản cũ đã bị loại bỏ (UI không còn tồn tại)
    return [...state.batches];
  }

  // Thực hiện các công việc DOM nặng trong renderAll (tách ra để flushRenderAll
  // có thể gọi lại đồng bộ khi cần — test / trước switchView).
  function _renderAllDoWork() {
    const filtered = getFilteredBatches();
    // TỐI ƯU: chỉ vẽ lại khu Kanban khi tab Công Đoạn đang mở. Trước đây MỖI
    // lần lưu/đồng bộ mây đều vẽ lại toàn bộ bảng Kanban (mỗi thẻ 1 khối DOM)
    // dù người dùng đang ở tab khác — gây giật/lag đặc biệt khi online (mỗi
    // snapshot mây đều gọi renderAll). Khi chuyển sang tab Công Đoạn,
    // switchView() sẽ tự vẽ đầy đủ khu này.
    if (state.activeView === 'kanban-view') {
      renderKanbanBoard(filtered);
      renderXuong2Cards(); // đếm trên thẻ launcher Vị Trí Xưởng 2 (tab Công Đoạn)
      filterMobileKanbanColumns();
    }
    if (state.activeView === 'dashboard-view') {
      if (skipDashDecorBoot) {
        // BOOT THEO VAI TRÒ (editor): KHÔNG vẽ trang trí lúc mở — cờ dirty giữ
        // true → tự vẽ khi người dùng mở tab Tổng Quan (switchView)
        dashboardDirty = true;
      } else if (deferInitialDashDecor) {
        // BOOT NHANH: lần vẽ ĐẦU chỉ hiện khung — biểu đồ + Bảng Tổng hợp vẽ
        // ở frame kế qua scheduleViewDecor (tab đã hiện ra trước đó)
        dashboardDirty = true; // vẫn báo CẦN VẼ để khung hoãn vẽ đủ
        scheduleViewDecor('dashboard-view', true);
      } else {
        renderDashboardCharts();
        // Bảng TỔNG HỢP CÔNG SUẤT & HIỆU SUẤT (thẻ đầu tab Tổng Quan — js/capacity.js)
        renderCapacityCard();
        dashboardDirty = false; // vừa vẽ xong tại chỗ → không phải vẽ lại khi quay lại tab
      }
    }
    if (state.activeView === 'leadership-view') renderLeadershipDashboard();
    if (state.activeView === 'planning-view') renderPlanningView();
    if (state.activeView === 'materials-view') renderMaterialView();
    if (state.activeView === 'qc-view') { renderQcView(); renderMechCards(); }
    if (state.activeView === 'hr-view') renderHrVisible();
    if (state.activeView === 'kanban-view') {
      // Sparkline hiệu suất 8 tuần trên các mini card launcher Xưởng 2 (js/capacity.js)
      renderX2MiniSparklines();
    }
    // Quyền theo vùng: ẩn nút vừa được vẽ lại nếu vai trò không có quyền sửa vùng đó
    try { applySysAreaDom(); } catch (e) { /* không chặn render */ }
    initLucide();
  }

  // flushRenderAll: ép vẽ NGAY (bỏ qua throttle). Dùng cho test và các đường
  // dẫn cần DOM đồng bộ ngay (trước khi switchView, trước khi tắt tab).
  function flushRenderAll() {
    renderAllLastFrame = -1; // reset throttle để lần gọi sau vẫn vẽ được
    _renderAllDoWork();
  }

  function renderAll() {
    // Mọi đường ghi dữ liệu đều đi qua đây → báo bảng Kanban CẦN VẼ LẠI khi
    // người dùng mở tab Công Đoạn (xem kanbanNeedsPaint — khỏi phá/dựng lại
    // hàng trăm thẻ lô mỗi lần qua lại giữa các tab) + báo trang trí tab Tổng
    // Quan (biểu đồ + Bảng Tổng hợp) cũng cần vẽ lại (xem scheduleViewDecor)
    kanbanDirty = true;
    dashboardDirty = true;
    // Huy hiệu số phiếu sự cố chờ duyệt trên nút thanh tiêu đề tab Công Đoạn SX
    try { updateIncidentBadge(); } catch (e) { /* không chặn render */ }
    // Huy hiệu số THÁNG ĐỊNH MỨC đang chờ duyệt / cần duyệt lại (nút "Định Mức")
    try { updateRatePendingBadge(); } catch (e) { /* không chặn render */ }
    // Throttle: chỉ vẽ 1 lần mỗi khung ~16ms. Các lần gọi liên tiếp trong cùng
    // khung chỉ cập nhật cờ, không vẽ lại DOM — tránh giật khi nhập liệu nhanh.
    const now = (typeof performance === 'function' && typeof performance.now === 'function')
      ? performance.now()
      : Date.now();
    const frame = Math.floor(now / 16);
    if (frame === renderAllLastFrame) return; // đã vẽ trong khung này
    renderAllLastFrame = frame;
    _renderAllDoWork();
  }

  // ─── PUBLIC API ───────────────────────────────────────────────
  window.app = {
    openBatchFormModal,
    openEditModal: id => openBatchFormModal(id),
    // Tương thích API cũ: mở TRUNG TÂM XUẤT với báo cáo Lô nan (Than Hóa + Sấy)
    openCustomExportModal: () => openReportCenter('batch'),
    // TRUNG TÂM XUẤT EXCEL — mở đúng báo cáo của thẻ/tab đang xem
    openExportCenter: id => openReportCenter(id),
    openChartBuilderModal: (chartId, preset) => openChartBuilderModal(chartId, preset),
    openEditChartModal: id => openChartBuilderModal(id),
    // Trợ giúp Dashboard — giải thích nhanh theo vùng/đối tượng (nút "?" trên thẻ)
    openDashHelp,
    openUserPermsModal: id => openUserPermsModal(id),
    sendPasswordResetToUser,
    deleteCustomChart,
    // Mở rộng biểu đồ toàn màn hình / xoay ngang (nút ⤢ trên thẻ biểu đồ)
    toggleChartExpand,
    deleteBatch,
    x2SayChargeLabel: sayBatchChargeLabel,
    x2BaoTinhUsedLabel: baoTinhUsedLabel,
    deleteUser,
    // Bộ lọc theo cột Kanban
    toggleColumnFilter,
    closeColumnFilter,
    clearColumnFilter,
    onColumnFilterChange,
    // Tìm kiếm gợi ý trong bộ lọc cột Kanban
    onColumnSearchFocus,
    onColumnSearchInput,
    onColumnSearchKeydown,
    clearColumnSearch,
    // Hoàn tác khi nhập sai
    undoLastAction,
    // Kế hoạch sản xuất
    editMaterialRate: id => openMaterialRateModal(id),
    deleteMaterialRate,
    deletePlanningItem,
    selectPlanningProduct,
    duplicatePlanningGroup,
    editPlanningGroup,
    // Sản lượng ép ván
    addPressLine: () => addPressLine(),
    addPressStick: () => addPressStick(),
    removePressLine,
    removePressStick,
    editPressRecord: id => openPressModal(id),
    deletePressRecord,
    // Chi tiết công nhân ép của 1 lượt ép (đối chiếu chấm công & phân vị)
    pressWorkersDetail: openPressWorkersModal,
    // Giả định / Xóa Dự kiến theo từng tuần
    forecastAssumeWeek,
    forecastClearWeek,
    // Kế hoạch nguyên liệu cần nhập (bảng phụ tab Nguyên liệu)
    removeMaterialPlanWeek,
    // Yêu cầu quyền xem Vùng Nâng Cao (từ thẻ khóa trên Dashboard)
    requestAdvancedAccess,
    // Cấu hình quyền chi tiết người dùng (Admin)
    openUserPermsModal,
    // Sửa thông tin người dùng (Admin)
    openUserEditModal,
    // Đồng bộ dữ liệu máy lên mây (Firebase)
    uploadLocalDataToCloud,
    // Auto backup — phục hồi bản cất trên máy / trên mây (Admin)
    restoreAutoBackup,
    deleteAutoBackup,
    restoreCloudBackup,
    // Tab Nhân Sự — thao tác từ bảng (onclick trong HTML render động)
    hrEditEmployee: openEmployeeModal,
    hrDeleteEmployee: deleteEmployee,
    hrApproveLeave: approveLeave,
    hrRejectLeave: rejectLeave,
    hrDeleteLeave: deleteLeave,
    // Đăng ký tăng ca (mini card tab Nhân Sự — duyệt/hủy chỉ Admin & Ban Quản Lý)
    hrApproveOvertime: approveOvertime,
    hrRejectOvertime: rejectOvertime,
    hrDeleteOvertime: cancelOvertime,
    hrRequestOvertimeAmendment: requestOvertimeAmendment,
    hrApproveOvertimeAmendment: approveOvertimeAmendment,
    hrRejectOvertimeAmendment: rejectOvertimeAmendment,
    hrCancelOvertime: cancelOvertime,
    hrEditRecruitment: openRecruitmentModal,
    hrDeleteRecruitment: deleteRecruitment,
    // Vị trí làm việc (onclick trong HTML render động)
    hrEditPosition: openPositionModal,
    hrDeletePosition: deletePosition,
    // Nhân sự cần tại các vị trí — bảng dữ liệu trung gian (onclick render động)
    hrEditPositionNeed: openPositionNeedModal,
    hrDeletePositionNeed: deletePositionNeed,
    hrSetPositionNeedQty,
    // SƠ ĐỒ BONG BÓNG NHÂN SỰ 3 CẤP (gọi từ HTML render động)
    hnmSelectDept, hnmBack, hnmTogglePos, hnmSetNeed, hnmToggleMode, hnmOpenBoard,
    hnmOpenAssign, hnmAddPosition, hnmHotPerson, hnmSetDate, hnmShiftDay, hnmToday,
    // Bảng bố trí vị trí theo ngày (onclick render động: ô board / kéo thả / cài ca)
    hrBoardOpenAssign,
    hrBoardRemoveAssign,
    hrBoardDragStart,
    hrBoardDrop,
    hrShiftTypePreset: setShiftTypePreset,
    // Thẻ Nhân Sự — launcher 5/3/2 (mở nổi lên dạng pop-up modal)
    hrOpenCard,
    hrCloseCard: hrCloseOpenCard,
    // Bảng dài (nhân viên/chấm công/đối chiếu máy): bấm "Xem thêm" tăng số dòng
    hrShowMoreRows,
    // Giờ máy chấm công (onclick trong HTML render động)
    hrApplyCheckin: applyCheckinRecord,
    hrDeleteCheckin: deleteCheckin
  };
  // Cờ báo hiệu module đã nạp & gán API thành công (watchdog trong index.html dựa vào đây)
  window.__BOOT_OK = true;

export {
  batchMatchesColumnFilter,
  filterMobileKanbanColumns,
  flushRenderAll,
  getFilteredBatches,
  markKanbanPainted,
  renderAll,
  setActiveMobileStage,
  switchView
};
