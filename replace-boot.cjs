const fs = require('fs');
const content = fs.readFileSync('js/main.js', 'utf8');

// Find the old boot section (after my new constants)
const oldBootStart = 'document.addEventListener(\'DOMContentLoaded\', async () => {\n    let bootOk = false;\n    try {\n    await yieldBootFrame();\n    initLucide();\n    loadUsers();\n    loadSession();\n    initTheme();';
const startIdx = content.indexOf(oldBootStart);
console.log('Start found at:', startIdx);

// Find the end of the boot section - it ends with "hideTreLoading(bootOk);\n    }\n  });\n  // ─── VIEW SWITCHING"
const endMarker = 'hideTreLoading(bootOk);\n    }\n  });\n  // ─── VIEW SWITCHING';
const endIdx = content.indexOf(endMarker, startIdx);
console.log('End found at:', endIdx);

if (startIdx === -1 || endIdx === -1) {
    console.log('Could not find markers');
    process.exit(1);
}

// The end of the boot section includes "hideTreLoading(bootOk);\n    }\n  });"
const bootSectionEnd = endIdx + 'hideTreLoading(bootOk);\n    }\n  });'.length;
console.log('Boot section end:', bootSectionEnd);
console.log('Boot section length:', bootSectionEnd - startIdx);

// New boot section
const newBoot = `document.addEventListener('DOMContentLoaded', async () => {
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
      
      // Load modules cho tab mặc định (dashboard-view) trước
      await loadModulesForView(state.activeView || 'dashboard-view');
      
      // Chạy các nhóm load song song
      await runLoadGroups();
      
      // Dọn dữ liệu cũ (chạy TRƯỚC initHistory để snapshot nền sạch)
      purgeLegacyBaoTinhBatches();
      
      // Defer initHistory hoàn toàn - không block boot
      scheduleInitHistory();
      
      // Nhớ lại trạng thái thu gọn của các bảng dữ liệu
      restoreRateTableCollapse();
      setupEventListeners();
      
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
          // Lazy-load module cho tab editor
          await loadModulesForView(bootView);
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
  });`;

// Replace
const newContent = content.substring(0, startIdx) + newBoot + content.substring(bootSectionEnd);
fs.writeFileSync('js/main.js', newContent, 'utf8');
console.log('Replacement done!');
console.log('New content length:', newContent.length);