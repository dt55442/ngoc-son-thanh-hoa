// ═══════════════════════════════════════════════════════════
// js/storage.js — tách từ app.js (refactor ES-modules phase 1)
// ═══════════════════════════════════════════════════════════
import { saveUsers } from './auth.js';
import { firePushSync, initLucide } from './cloud.js';
import { saveCustomCharts } from './export-xlsx.js';
import { renderAll } from './main.js';
import { allPhotoIds, putPhotoBlob } from './photo-store.js';
import { STORAGE_KEY_DATA, STORAGE_KEY_MATERIALS, state } from './state.js';
import { escapeHTML, showToast } from './utils.js';

  // ─── DATA ─────────────────────────────────────────────────────
  function loadData() {
    const raw = localStorage.getItem(STORAGE_KEY_DATA);
    if (raw) {
      try { state.batches = JSON.parse(raw); }
      catch (e) { state.batches = []; } // dữ liệu lỗi -> rỗng, không tạo mẫu
    } else {
      state.batches = []; // không tự tạo dữ liệu mẫu
      saveData();
    }
  }

  function saveData() {
    localStorage.setItem(STORAGE_KEY_DATA, JSON.stringify(state.batches));
    // Đồng thời ghi vào file nếu đã kết nối thư mục dữ liệu
    if (state.fileStorage.connected) {
      writeDataToFile();
    }
    firePushSync(); // đồng bộ lên mây nếu online
  }

  // ─── GỘP BẢN GHI NGUYÊN LIỆU (CHỐNG MẤT ĐƠN GIÁ / ẢNH KHI TẢI LẠI TRANG) ──
  // Dấu thời gian so sánh bản ghi (ưu tiên updatedAt — được ghi mỗi lần sửa form)
  function materialRecStamp(r) {
    return String((r && (r.updatedAt || r.createdAt)) || '');
  }

  // Gộp 2 danh sách bản ghi nguyên liệu theo id:
  //   - Bản nào có dấu thời gian MỚI HƠN thì thắng.
  //   - Bằng nhau hoặc nguồn ngoài thiếu dấu thời gian → giữ bản máy đang có
  //     (file cũ chưa có đơn giá sẽ không còn đè mất bản đã nhập đơn giá).
  //   - Bản ghi chỉ tồn tại ở một phía vẫn được giữ lại (không bị xóa).
  function mergeMaterialRecords(localArr, incomingArr) {
    const local = Array.isArray(localArr) ? localArr : [];
    const incoming = Array.isArray(incomingArr) ? incomingArr : [];
    const map = new Map();
    const noId = [];
    for (const r of incoming) {
      if (r && r.id) map.set(r.id, r); // bản từ nguồn ngoài (file/mây/backup) làm nền
    }
    for (const r of local) {
      if (!r) continue;
      if (!r.id) { noId.push(r); continue; }
      const cur = map.get(r.id);
      if (!cur || materialRecStamp(r) >= materialRecStamp(cur)) map.set(r.id, r);
    }
    return [...noId, ...map.values()];
  }

  // Khôi phục materialRecords từ nguồn ngoài (file bamboo_data.json / backup):
  // luôn GỘP thay vì ghi đè, rồi lưu lại localStorage + file (nếu đang kết nối).
  function restoreMaterialRecords(incomingArr) {
    const before = JSON.stringify(state.materialRecords || []);
    const merged = mergeMaterialRecords(state.materialRecords, incomingArr);
    state.materialRecords = merged;
    try { localStorage.setItem(STORAGE_KEY_MATERIALS, JSON.stringify(merged)); } catch (err) {}
    if (JSON.stringify(merged) !== before && state.fileStorage.connected) {
      writeDataToFile(); // nâng cấp file lên bản gộp mới nhất để lần sau không "tua ngược"
    }
    return merged;
  }

  // ─── FILE STORAGE (LƯU DỮ LIỆU VÀO FILE CÙNG THƯ MỤC) ─────────
  // Sử dụng File System Access API để đọc/ghi file bamboo_data.json
  // trong thư mục người dùng chọn. Directory handle được lưu trong IndexedDB
  // để tự động kết nối lại khi mở ứng dụng.
  const FILE_STORAGE_DB_NAME = 'bamboo_tracker_file_storage';
  const FILE_STORAGE_DB_VERSION = 1;
  const FILE_STORAGE_STORE = 'handles';
  const DATA_FILE_NAME = 'bamboo_data.json';

  function openFileStorageDB() {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) { reject(new Error('IndexedDB không được hỗ trợ!')); return; }
      const req = indexedDB.open(FILE_STORAGE_DB_NAME, FILE_STORAGE_DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(FILE_STORAGE_STORE)) {
          db.createObjectStore(FILE_STORAGE_STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function saveDirHandleToIDB(dirHandle) {
    try {
      const db = await openFileStorageDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(FILE_STORAGE_STORE, 'readwrite');
        tx.objectStore(FILE_STORAGE_STORE).put(dirHandle, 'dataDir');
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => { db.close(); reject(tx.error); };
      });
    } catch (e) { /* IndexedDB không khả dụng - bỏ qua */ }
  }

  async function getDirHandleFromIDB() {
    try {
      const db = await openFileStorageDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(FILE_STORAGE_STORE, 'readonly');
        const req = tx.objectStore(FILE_STORAGE_STORE).get('dataDir');
        req.onsuccess = () => { db.close(); resolve(req.result || null); };
        req.onerror = () => { db.close(); reject(req.error); };
      });
    } catch (e) { return null; }
  }

  async function removeDirHandleFromIDB() {
    try {
      const db = await openFileStorageDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(FILE_STORAGE_STORE, 'readwrite');
        tx.objectStore(FILE_STORAGE_STORE).delete('dataDir');
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => { db.close(); reject(tx.error); };
      });
    } catch (e) { /* bỏ qua */ }
  }

  function updateFileStorageUI() {
    const statusEl = document.getElementById('file-storage-status');
    const disconnectBtn = document.getElementById('btn-disconnect-data-folder');
    const isMobile = !window.showDirectoryPicker;
    if (statusEl) {
      if (state.fileStorage.connected) {
        statusEl.classList.add('connected');
        statusEl.innerHTML = `<i data-lucide="hard-drive" style="width:12px;height:12px;"></i> File: ${escapeHTML(state.fileStorage.folderName)}`;
      } else if (isMobile) {
        statusEl.classList.remove('connected');
        statusEl.innerHTML = `<i data-lucide="smartphone" style="width:12px;height:12px;"></i> Mobile: Dùng Mã Đồng Bộ`;
      } else {
        statusEl.classList.remove('connected');
        statusEl.innerHTML = `<i data-lucide="hard-drive" style="width:12px;height:12px;"></i> File: Chưa kết nối`;
      }
    }
    if (disconnectBtn) {
      disconnectBtn.style.display = state.fileStorage.connected ? 'block' : 'none';
    }
    if (window.lucide) window.lucide.createIcons();
  }

  // Chọn thư mục dữ liệu (lưu file bamboo_data.json trong thư mục đó)
  async function selectDataFolder() {
    if (!window.showDirectoryPicker) {
      showToast('Trên điện thoại: dùng "Chia Sẻ & Đồng Bộ Dữ Liệu" hoặc "Lưu/Nạp File" để đồng bộ!', 'info');
      return;
    }
    try {
      const dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
      state.fileStorage.dirHandle = dirHandle;
      state.fileStorage.folderName = dirHandle.name;
      state.fileStorage.connected = true;

      // Lưu handle vào IndexedDB để tự động kết nối lại lần sau
      await saveDirHandleToIDB(dirHandle);

      // Đọc dữ liệu từ file nếu có
      const loaded = await readDataFromFile();
      if (loaded) {
        if (loaded.batches && Array.isArray(loaded.batches)) {
          state.batches = loaded.batches;
          saveData();
        }
        if (loaded.users && Array.isArray(loaded.users)) {
          state.users = loaded.users;
          saveUsers();
        }
        if (loaded.customCharts && Array.isArray(loaded.customCharts)) {
          state.customCharts = loaded.customCharts;
          saveCustomCharts();
        }
        if (loaded.materialRecords && Array.isArray(loaded.materialRecords)) {
          restoreMaterialRecords(loaded.materialRecords); // GỘP theo dấu thời gian — không ghi đè mất bản mới hơn
          syncMissingPhotos(); // nạp bù ảnh full thiếu từ thư mục materials-photos/
        }
        renderAll();
        showToast(`Đã kết nối thư mục "${dirHandle.name}" và nạp dữ liệu từ file!`, 'success');
      } else {
        // Chưa có file -> tạo file mới với dữ liệu hiện tại
        await writeDataToFile();
        showToast(`Đã kết nối thư mục "${dirHandle.name}". File dữ liệu sẽ được tạo!`, 'success');
      }
      updateFileStorageUI();
    } catch (err) {
      if (err.name === 'AbortError') return; // Người dùng hủy chọn thư mục
      showToast('Không thể kết nối thư mục: ' + err.message, 'error');
    }
  }

  // Tự động kết nối lại thư mục đã chọn trước đó
  async function autoReconnectDataFolder() {
    try {
      const dirHandle = await getDirHandleFromIDB();
      if (!dirHandle) return;
      // Kiểm tra quyền truy cập
      let permission = await dirHandle.queryPermission({ mode: 'readwrite' });
      if (permission === 'prompt') {
        permission = await dirHandle.requestPermission({ mode: 'readwrite' });
      }
      if (permission !== 'granted') return;

      state.fileStorage.dirHandle = dirHandle;
      state.fileStorage.folderName = dirHandle.name;
      state.fileStorage.connected = true;

      const loaded = await readDataFromFile();
      if (loaded) {
        if (loaded.batches && Array.isArray(loaded.batches)) {
          state.batches = loaded.batches;
          saveData();
        }
        if (loaded.users && Array.isArray(loaded.users)) {
          state.users = loaded.users;
          saveUsers();
        }
        if (loaded.customCharts && Array.isArray(loaded.customCharts)) {
          state.customCharts = loaded.customCharts;
          saveCustomCharts();
        }
        if (loaded.materialRecords && Array.isArray(loaded.materialRecords)) {
          restoreMaterialRecords(loaded.materialRecords); // GỘP theo dấu thời gian — không ghi đè mất bản mới hơn
          syncMissingPhotos(); // nạp bù ảnh full thiếu từ thư mục materials-photos/
        }
        renderAll();
      }
      updateFileStorageUI();
    } catch (e) {
      // Không thể tự động kết nối - bỏ qua
    }
  }

  // Đọc dữ liệu từ file bamboo_data.json trong thư mục đã chọn
  async function readDataFromFile() {
    if (!state.fileStorage.dirHandle) return null;
    try {
      let fileHandle;
      try {
        fileHandle = await state.fileStorage.dirHandle.getFileHandle(DATA_FILE_NAME);
      } catch (e) {
        return null; // File chưa tồn tại
      }
      const file = await fileHandle.getFile();
      const text = await file.text();
      if (!text) return null;
      return JSON.parse(text);
    } catch (e) {
      showToast('Lỗi đọc file dữ liệu: ' + e.message, 'error');
      return null;
    }
  }

  // Ghi toàn bộ dữ liệu vào file bamboo_data.json
  async function writeDataToFile() {
    if (!state.fileStorage.dirHandle) return;
    try {
      let fileHandle;
      try {
        fileHandle = await state.fileStorage.dirHandle.getFileHandle(DATA_FILE_NAME, { create: true });
      } catch (e) {
        fileHandle = await state.fileStorage.dirHandle.getFileHandle(DATA_FILE_NAME, { create: true });
      }
      const writable = await fileHandle.createWritable();
      const allData = {
        version: '1.0',
        savedAt: new Date().toISOString(),
        batches: state.batches,
        users: state.users,
        customCharts: state.customCharts,
        materialRecords: state.materialRecords || []
      };
      await writable.write(JSON.stringify(allData, null, 2));
      await writable.close();
      state.fileStorage.fileHandle = fileHandle;
    } catch (e) {
      showToast('Lỗi ghi file dữ liệu: ' + e.message, 'error');
    }
  }

  // Ngắt kết nối thư mục dữ liệu
  async function disconnectDataFolder() {
    state.fileStorage.dirHandle = null;
    state.fileStorage.fileHandle = null;
    state.fileStorage.connected = false;
    state.fileStorage.folderName = '';
    await removeDirHandleFromIDB();
    updateFileStorageUI();
    showToast('Đã ngắt kết nối thư mục dữ liệu', 'info');
  }

  // ─── LƯU DỮ LIỆU CỤC BỘ (LOCAL FILE) ─────────────────────────
  function openSaveLocalModal() {
    document.getElementById('modal-save-local')?.classList.add('show');
    initLucide();
  }

  function closeSaveLocalModal() {
    document.getElementById('modal-save-local')?.classList.remove('show');
  }

  function saveDataToLocalFile() {
    const allData = {
      version: '1.0',
      savedAt: new Date().toISOString(),
      batches: state.batches,
      users: state.users,
      customCharts: state.customCharts,
      materialRecords: state.materialRecords || []
    };

    const filename = `NhaMayNgocSon_Backup_${new Date().toISOString().split('T')[0]}.json`;
    const jsonStr  = JSON.stringify(allData, null, 2);
    downloadOrShareJSON(jsonStr, filename, 'Đã lưu dữ liệu cục bộ thành công!');

    closeSaveLocalModal();
  }

  function loadDataFromLocalFile(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = evt => {
      try {
        const imported = JSON.parse(evt.target.result);

        if (imported && Array.isArray(imported.batches)) {
          state.batches = imported.batches;
          saveData();
        }

        if (imported && Array.isArray(imported.users)) {
          state.users = imported.users;
          saveUsers();
        }

        if (imported && Array.isArray(imported.customCharts)) {
          state.customCharts = imported.customCharts;
          saveCustomCharts();
        }

        if (imported && Array.isArray(imported.materialRecords)) {
          restoreMaterialRecords(imported.materialRecords); // GỘP — không xóa các lần nhập mới hơn backup
        }

        renderAll();
        closeSaveLocalModal();
        showToast('Đã nạp dữ liệu cục bộ thành công!', 'success');
      } catch (err) {
        showToast('Lỗi khi nạp file: ' + err.message, 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  // ─── ẢNH NGUYÊN LIỆU DƯỚI DẠNG FILE (materials-photos/) ──────
  // Ảnh full (JPEG Blob) được lưu thành file thật cạnh bamboo_data.json:
  //   - Sao lưu lâu dài không phụ thuộc IndexedDB (dễ chép máy khác).
  //   - bamboo_data.json CHỈ chứa thumbnail nhỏ → không phình theo ảnh.
  const PHOTO_DIR_NAME = 'materials-photos';

  async function photoDirHandle() {
    if (!state.fileStorage.dirHandle) return null;
    try {
      return await state.fileStorage.dirHandle.getDirectoryHandle(PHOTO_DIR_NAME, { create: true });
    } catch (e) { return null; }
  }

  // Ghi 1 ảnh full ra file materials-photos/<id>.jpg
  async function writePhotoFile(photoId, blob) {
    const dir = await photoDirHandle();
    if (!dir || !blob) return;
    try {
      const fh = await dir.getFileHandle(photoId + '.jpg', { create: true });
      const writable = await fh.createWritable();
      await writable.write(blob);
      await writable.close();
    } catch (e) { /* im lặng — ảnh vẫn còn trong kho IndexedDB */ }
  }

  // Đọc ảnh full từ file (nạp bù vào kho khi máy thiếu)
  async function readPhotoFile(photoId) {
    const dir = await photoDirHandle();
    if (!dir) return null;
    try {
      const fh = await dir.getFileHandle(photoId + '.jpg');
      const file = await fh.getFile();
      return file.size > 0 ? file : null;
    } catch (e) { return null; }
  }

  // Xóa file ảnh khi xóa bản ghi (tránh rác tích tụ theo thời gian)
  async function deletePhotoFiles(photoIds) {
    const dir = await photoDirHandle();
    if (!dir) return;
    for (const id of (photoIds || [])) {
      try { await dir.removeEntry(id + '.jpg'); } catch (e) { /* chưa có file */ }
    }
  }

  // Nạp bù các ảnh full máy đang THIẾU từ thư mục materials-photos/ vào kho
  // (chạy sau khi gộp dữ liệu từ file — ví dụ dữ liệu đồng bộ từ máy khác)
  async function syncMissingPhotos() {
    if (!state.fileStorage.dirHandle) return;
    try {
      const have = await allPhotoIds();
      const missing = new Set();
      for (const rec of (state.materialRecords || [])) {
        for (const entry of (rec.images || [])) {
          const id = (entry && typeof entry === 'object' && entry.id) || null;
          if (id && !have.has(id)) missing.add(id);
        }
      }
      for (const id of missing) {
        const blob = await readPhotoFile(id);
        if (blob) await putPhotoBlob(blob, id);
      }
    } catch (e) { /* bỏ qua */ }
  }

  // ─── JSON BACKUP / RESTORE ────────────────────────────────────
  function exportToJSON() {
    const filename = `Backup_BambooTracker_${new Date().toISOString().split('T')[0]}.json`;
    const jsonStr  = JSON.stringify(state.batches, null, 2);
    downloadOrShareJSON(jsonStr, filename, 'Đã xuất tệp sao lưu JSON!');
  }

  // Hỗ trợ lưu/chia sẻ file JSON trên Android (Web Share API)
  // Trên Android: mở hộp thoại chia sẻ cho phép lưu vào Google Drive, Zalo, File Manager...
  // Trên Desktop: tải file trực tiếp như bình thường
  function downloadOrShareJSON(jsonStr, filename, successMessage) {
    // Kiểm tra Web Share API với file (hỗ trợ Android Chrome/Edge)
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobile && navigator.share && navigator.canShare) {
      const file = new File([jsonStr], filename, { type: 'application/json' });
      if (navigator.canShare({ files: [file] })) {
        navigator.share({
          files: [file],
          title: 'Nhà máy Ngọc Sơn Thanh Hóa - Sao lưu dữ liệu',
          text: 'Dữ liệu sao lưu từ ứng dụng Nhà máy Ngọc Sơn Thanh Hóa'
        }).then(() => {
          showToast(successMessage, 'success');
        }).catch((err) => {
          if (err.name === 'AbortError') return; // Người dùng hủy
          // Fallback: tải trực tiếp
          downloadJSONFallback(jsonStr, filename);
          showToast(successMessage, 'success');
        });
        return;
      }
    }
    // Fallback: tải trực tiếp
    downloadJSONFallback(jsonStr, filename);
    showToast(successMessage, 'success');
  }

  function downloadJSONFallback(jsonStr, filename) {
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href  = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function handleImportJSON(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      try {
        const imported = JSON.parse(evt.target.result);
        if (Array.isArray(imported)) {
          state.batches = imported; saveData(); renderAll();
          showToast('Khôi phục dữ liệu JSON thành công!', 'success');
        } else { showToast('Tệp JSON không hợp lệ!', 'error'); }
      } catch (err) { showToast('Lỗi khi nạp tệp: ' + err.message, 'error'); }
    };
    reader.readAsText(file);
  }

export {
  DATA_FILE_NAME,
  FILE_STORAGE_DB_NAME,
  FILE_STORAGE_DB_VERSION,
  FILE_STORAGE_STORE,
  autoReconnectDataFolder,
  closeSaveLocalModal,
  disconnectDataFolder,
  downloadJSONFallback,
  downloadOrShareJSON,
  exportToJSON,
  getDirHandleFromIDB,
  handleImportJSON,
  loadData,
  loadDataFromLocalFile,
  mergeMaterialRecords,
  openFileStorageDB,
  openSaveLocalModal,
  readDataFromFile,
  readPhotoFile,
  removeDirHandleFromIDB,
  restoreMaterialRecords,
  saveData,
  saveDataToLocalFile,
  saveDirHandleToIDB,
  selectDataFolder,
  syncMissingPhotos,
  updateFileStorageUI,
  writeDataToFile,
  writePhotoFile,
  deletePhotoFiles
};
