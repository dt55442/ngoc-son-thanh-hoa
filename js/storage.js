// ═══════════════════════════════════════════════════════════
// js/storage.js — tách từ app.js (refactor ES-modules phase 1)
// ═══════════════════════════════════════════════════════════
import { saveUsers } from './auth.js';
import { captureAutoBackup } from './autobackup.js';
import { firePushSync, initLucide } from './cloud.js';
import { saveCustomCharts } from './export-xlsx.js';
import { logDataChange, syncHistorySnapshots } from './history.js';
import { renderAll } from './main.js';
import { allPhotoIds, putPhotoBlob } from './photo-store.js';
import { STORAGE_KEY_DATA, STORAGE_KEY_MATERIALS, STORAGE_KEY_QC_FINAL, STORAGE_KEY_QC_FINAL_RATE, STORAGE_KEY_QC_KILN_HUMIDITY, STORAGE_KEY_QC_KILN_THRESHOLD, STORAGE_KEY_SUPPLIERS, STORAGE_KEY_X2_BAO_THO_RATE, STORAGE_KEY_X2_BAO_TINH_RATE, STORAGE_KEY_X2_BULLIG_RATE, STORAGE_KEY_X2_SAY_RATE, STORAGE_KEY_X2_SAY_TIMES, STORAGE_KEY_X2_SAY_INCIDENT, STORAGE_KEY_X2_STAGE_INCIDENT, STORAGE_KEY_X2_EP_VAN_RATE, STORAGE_KEY_X2_BO_ONG_RATE, STORAGE_KEY_X2_CAP_RATE, STORAGE_KEY_X2_BOLUONG_RATE, STORAGE_KEY_X2_CHON_NAN_RATE, STORAGE_KEY_X2_LOT_LOCATIONS, STORAGE_KEY_X2_BAO_THANH_OUT_SIZES, STORAGE_KEY_KHO_NOTES, STORAGE_KEY_XUONG2_BAO_THO, STORAGE_KEY_XUONG2_BAO_TINH, STORAGE_KEY_XUONG2_BULLIG, STORAGE_KEY_XUONG2_BO_ONG, STORAGE_KEY_XUONG2_CHON_NAN, STORAGE_KEY_XUONG2_CUTS, STORAGE_KEY_XUONG2_BOLUONG, STORAGE_KEY_XUONG1_CAT_ONG, STORAGE_KEY_XUONG1_SAY_SINH, STORAGE_KEY_XUONG1_BOC, STORAGE_KEY_XUONG1_LOC_ONG, STORAGE_KEY_XUONG1_CAT_MAT, STORAGE_KEY_XUONG1_BO, STORAGE_KEY_XUONG1_PHOI_SAY, STORAGE_KEY_XUONG1_LOC_THANH, STORAGE_KEY_X1_RATES, state } from './state.js';
import { trackDeleted } from './tombstone.js';
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
    // Ghi lịch sử sửa đổi (tóm tắt ai đã thêm/sửa/xóa lô nan nào)
    logDataChange(['batches']);
    // Đồng thời ghi vào file nếu đã kết nối thư mục dữ liệu
    if (state.fileStorage.connected) {
      writeDataToFile();
    }
    firePushSync(); // đồng bộ lên mây nếu online
  }

  // ─── DỌN DỮ LIỆU CŨ: LÔ STAGE 'bao_tinh' (cấu trúc Kanban cũ) ──
  // Cột Kanban "4. Bào Tinh" đã bị XÓA khỏi bảng "Than Hóa + Sấy" (chỉ còn
  // Sấy 1 / Sấy 2 / Kho); số liệu bào tinh nay nằm ở THẺ Bào Tinh riêng
  // (state.xuong2BaoTinhRecords). Lô stage 'bao_tinh' còn sót trong
  // state.batches (236 lô dữ liệu cũ) từng làm KPI/số liệu tổng lệch và
  // nhầm lẫn với dữ liệu hiện tại → xóa HẲN. Hàm chạy:
  //   · LÚC BOOT (main.js — sau mọi load*(), ngay trước initHistory), và
  //   · SAU KHI NẠP FILE JSON / PHỤC HỒI backup (những đường có thể đưa lô cũ
  //     quay về máy giữa phiên — handleImportJSON / loadDataFromLocalFile).
  // Chuỗi an toàn bên trong (chỉ khi CÓ lô cũ; không có thì thoát ngay, không
  // backup không ghi đè gì):
  //   1) Chụp 1 bản cất BẮT BUỘC (force) TRƯỚC khi xóa — phục hồi được qua menu ⋮
  //   2) Ghi tombstone (trackDeleted) — chặn mây/máy khác đẩy ngược lô cũ về
  //   3) Lọc khỏi state.batches + saveData() (ghi localStorage + đẩy mây lần sau)
  // Dữ liệu trong file backup cũ (backups/, bamboo_data.json) KHÔNG bị đụng —
  // nếu nạp lại, lần purge kế tiếp tự dọn lại.
  function purgeLegacyBaoTinhBatches() {
    const legacy = (state.batches || []).filter(b => b && b.stage === 'bao_tinh');
    if (!legacy.length) return 0;
    try { captureAutoBackup('Trước khi dọn lô Bào Tinh dữ liệu cũ (stage bao_tinh)', true); } catch (e) { /* lỗi chụp không chặn việc dọn */ }
    trackDeleted('batches', legacy.map(b => b.id)); // dấu vết xóa → chặn hồi sinh từ mây/file
    state.batches = state.batches.filter(b => !b || b.stage !== 'bao_tinh');
    saveData();
    const msg = `Đã dọn ${legacy.length} lô nan Bào Tinh dữ liệu cũ (đã cất bản backup trước khi xóa).`;
    try { showToast(msg, 'info'); } catch (e) { /* môi trường test không có toast */ }
    console.info('[DỌN DỮ LIỆU] ' + msg);
    return legacy.length;
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
    syncHistorySnapshots(); // gộp hàng loạt (không phải thao tác sửa) → đặt lại nền so sánh
    return merged;
  }

  // ─── GỘP NHẬT KÝ CẮT/CHỌN XƯỞNG 2 (từ file bamboo_data.json / backup) ──
  // Dấu thời gian so sánh bản ghi (ưu tiên updatedAt); bản chỉ có ở một phía giữ lại.
  function xuong2RecStamp(r) {
    return String((r && (r.updatedAt || r.createdAt)) || '');
  }

  function mergeXuong2Records(localArr, incomingArr) {
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
      if (!cur || xuong2RecStamp(r) >= xuong2RecStamp(cur)) map.set(r.id, r);
    }
    return [...noId, ...map.values()];
  }

  // Khôi phục xuong2CutRecords từ nguồn ngoài: luôn GỘP thay vì ghi đè,
  // rồi lưu lại localStorage + file (nếu đang kết nối).
  function restoreXuong2Cuts(incomingArr) {
    const before = JSON.stringify(state.xuong2CutRecords || []);
    const merged = mergeXuong2Records(state.xuong2CutRecords, incomingArr);
    state.xuong2CutRecords = merged;
    try { localStorage.setItem(STORAGE_KEY_XUONG2_CUTS, JSON.stringify(merged)); } catch (err) {}
    if (JSON.stringify(merged) !== before && state.fileStorage.connected) {
      writeDataToFile(); // nâng cấp file lên bản gộp mới nhất
    }
    syncHistorySnapshots(); // gộp hàng loạt → đặt lại nền so sánh lịch sử
    return merged;
  }

  // Khôi phục xuong2BoluongRecords từ nguồn ngoài: luôn GỘP thay vì ghi đè,
  // rồi lưu lại localStorage + file (nếu đang kết nối).
  function restoreXuong2Boluong(incomingArr) {
    const before = JSON.stringify(state.xuong2BoluongRecords || []);
    const merged = mergeXuong2Records(state.xuong2BoluongRecords, incomingArr);
    state.xuong2BoluongRecords = merged;
    try { localStorage.setItem(STORAGE_KEY_XUONG2_BOLUONG, JSON.stringify(merged)); } catch (err) {}
    if (JSON.stringify(merged) !== before && state.fileStorage.connected) {
      writeDataToFile(); // nâng cấp file lên bản gộp mới nhất
    }
    syncHistorySnapshots(); // gộp hàng loạt → đặt lại nền so sánh lịch sử
    return merged;
  }

  // ── XƯỞNG 1: khôi phục nhật ký 3 công đoạn (GỘP, không ghi đè) ──
  function restoreX1Records(key, stateKey, incomingArr) {
    const before = JSON.stringify(state[stateKey] || []);
    const merged = mergeXuong2Records(state[stateKey], incomingArr);
    state[stateKey] = merged;
    try { localStorage.setItem(key, JSON.stringify(merged)); } catch (err) {}
    if (JSON.stringify(merged) !== before && state.fileStorage.connected) {
      writeDataToFile();
    }
    syncHistorySnapshots();
    return merged;
  }
  function restoreXuong1CatOng(incomingArr) {
    return restoreX1Records(STORAGE_KEY_XUONG1_CAT_ONG, 'xuong1CatOngRecords', incomingArr);
  }
  function restoreXuong1SaySinh(incomingArr) {
    return restoreX1Records(STORAGE_KEY_XUONG1_SAY_SINH, 'xuong1SaySinhRecords', incomingArr);
  }
  function restoreXuong1Boc(incomingArr) {
    return restoreX1Records(STORAGE_KEY_XUONG1_BOC, 'xuong1BocRecords', incomingArr);
  }
  function restoreXuong1LocOng(incomingArr) {
    return restoreX1Records(STORAGE_KEY_XUONG1_LOC_ONG, 'xuong1LocOngRecords', incomingArr);
  }
  function restoreXuong1CatMat(incomingArr) {
    return restoreX1Records(STORAGE_KEY_XUONG1_CAT_MAT, 'xuong1CatMatRecords', incomingArr);
  }
  function restoreXuong1Bo(incomingArr) {
    return restoreX1Records(STORAGE_KEY_XUONG1_BO, 'xuong1BoRecords', incomingArr);
  }
  function restoreXuong1PhoiSay(incomingArr) {
    return restoreX1Records(STORAGE_KEY_XUONG1_PHOI_SAY, 'xuong1PhoiSayRecords', incomingArr);
  }
  function restoreXuong1LocThanh(incomingArr) {
    return restoreX1Records(STORAGE_KEY_XUONG1_LOC_THANH, 'xuong1LocThanhRecords', incomingArr);
  }
  // Khôi phục ĐỊNH MỨC XƯỞNG 1 ({ catOng|saySinh|boc: { 'YYYY-MM': kg/h } })
  function restoreX1Rates(incomingObj) {
    const before = JSON.stringify(state.x1Rates || {});
    const merged = {};
    ['catOng', 'saySinh', 'boc', 'locOng', 'catMat', 'bo', 'phoiSay', 'locThanh'].forEach(k => { merged[k] = {}; });
    [incomingObj, state.x1Rates].forEach(src => {
      if (!src || typeof src !== 'object') return;
      ['catOng', 'saySinh', 'boc', 'locOng', 'catMat', 'bo', 'phoiSay', 'locThanh'].forEach(k => {
        if (src[k] && typeof src[k] === 'object') Object.assign(merged[k], src[k]);
      });
    });
    state.x1Rates = merged;
    try { localStorage.setItem(STORAGE_KEY_X1_RATES, JSON.stringify(merged)); } catch (err) {}
    if (JSON.stringify(merged) !== before && state.fileStorage.connected) writeDataToFile();
    syncHistorySnapshots();
    return merged;
  }

  // Khôi phục ĐỊNH MỨC CÔNG SUẤT BỐC LUỒNG theo tháng ({ 'YYYY-MM': kg/h }) —
  // gộp theo khóa tháng (bản máy có sẵn ưu tiên hơn bản trống).
  function restoreX2BoluongRates(incoming) {
    const src = (incoming && typeof incoming === 'object') ? incoming : {};
    const cur = (state.x2BoluongRates && typeof state.x2BoluongRates === 'object') ? state.x2BoluongRates : {};
    let changed = false;
    for (const k of Object.keys(src)) {
      if (!(k in cur) || cur[k] == null) { cur[k] = src[k]; changed = true; }
    }
    if (changed) {
      state.x2BoluongRates = cur;
      try { localStorage.setItem(STORAGE_KEY_X2_BOLUONG_RATE, JSON.stringify(cur)); } catch (err) {}
    }
    return cur;
  }

  // ─── GỘP BẢNG THÔNG TIN NHÀ CUNG (từ file bamboo_data.json / backup) ──
  // Dấu thời gian so sánh bản ghi (ưu tiên updatedAt); bản chỉ có ở một phía giữ lại.
  function supplierRecStamp(r) {
    return String((r && (r.updatedAt || r.createdAt)) || '');
  }

  function mergeSuppliers(localArr, incomingArr) {
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
      if (!cur || supplierRecStamp(r) >= supplierRecStamp(cur)) map.set(r.id, r);
    }
    return [...noId, ...map.values()];
  }

  // Khôi phục suppliers từ nguồn ngoài: luôn GỘP thay vì ghi đè,
  // rồi lưu lại localStorage + file (nếu đang kết nối).
  function restoreSuppliers(incomingArr) {
    const before = JSON.stringify(state.suppliers || []);
    const merged = mergeSuppliers(state.suppliers, incomingArr);
    state.suppliers = merged;
    try { localStorage.setItem(STORAGE_KEY_SUPPLIERS, JSON.stringify(merged)); } catch (err) {}
    if (JSON.stringify(merged) !== before && state.fileStorage.connected) {
      writeDataToFile(); // nâng cấp file lên bản gộp mới nhất
    }
    syncHistorySnapshots(); // gộp hàng loạt → đặt lại nền so sánh lịch sử
    return merged;
  }

  // Khôi phục ĐỊNH MỨC CÔNG SUẤT CẮT theo tháng ({ 'YYYY-MM': kg/h }) từ nguồn
  // ngoài: gộp theo khóa tháng (bản máy có sẵn ưu tiên hơn bản trống).
  function restoreX2CapRates(incoming) {
    const src = (incoming && typeof incoming === 'object') ? incoming : {};
    const cur = (state.x2CapRates && typeof state.x2CapRates === 'object') ? state.x2CapRates : {};
    let changed = false;
    for (const k of Object.keys(src)) {
      if (!(k in cur) || cur[k] == null) { cur[k] = src[k]; changed = true; }
    }
    if (changed) {
      state.x2CapRates = cur;
      try { localStorage.setItem(STORAGE_KEY_X2_CAP_RATE, JSON.stringify(cur)); } catch (err) {}
    }
    return cur;
  }

  // ─── GỘP NHẬT KÝ BỔ ỐNG XƯỞNG 2 (từ file bamboo_data.json / backup / mây) ──
  // Cùng quy tắc với lượt cắt/chọn: bản chỉ có ở một phía vẫn giữ; trùng id →
  // bản có dấu thời gian mới hơn thắng (dùng lại mergeXuong2Records).
  function restoreXuong2BoOng(incomingArr) {
    const before = JSON.stringify(state.xuong2BoOngRecords || []);
    const merged = mergeXuong2Records(state.xuong2BoOngRecords, incomingArr);
    state.xuong2BoOngRecords = merged;
    try { localStorage.setItem(STORAGE_KEY_XUONG2_BO_ONG, JSON.stringify(merged)); } catch (err) {}
    if (JSON.stringify(merged) !== before && state.fileStorage.connected) {
      writeDataToFile(); // nâng cấp file lên bản gộp mới nhất
    }
    syncHistorySnapshots(); // gộp hàng loạt → đặt lại nền so sánh lịch sử
    return merged;
  }

  // Khôi phục ĐỊNH MỨC CÔNG SUẤT BỔ ỐNG theo tháng ({ 'YYYY-MM': kg/h }).
  function restoreX2BoOngRates(incoming) {
    const src = (incoming && typeof incoming === 'object') ? incoming : {};
    const cur = (state.x2BoOngRates && typeof state.x2BoOngRates === 'object') ? state.x2BoOngRates : {};
    let changed = false;
    for (const k of Object.keys(src)) {
      if (!(k in cur) || cur[k] == null) { cur[k] = src[k]; changed = true; }
    }
    if (changed) {
      state.x2BoOngRates = cur;
      try { localStorage.setItem(STORAGE_KEY_X2_BO_ONG_RATE, JSON.stringify(cur)); } catch (err) {}
    }
    return cur;
  }

  // ─── GỘP NHẬT KÝ CHẠY MÁY BÀO THÔ XƯỞNG 2 (file / backup / mây) ──
  function restoreXuong2BaoTho(incomingArr) {
    const before = JSON.stringify(state.xuong2BaoThoRecords || []);
    const merged = mergeXuong2Records(state.xuong2BaoThoRecords, incomingArr);
    state.xuong2BaoThoRecords = merged;
    try { localStorage.setItem(STORAGE_KEY_XUONG2_BAO_THO, JSON.stringify(merged)); } catch (err) {}
    if (JSON.stringify(merged) !== before && state.fileStorage.connected) {
      writeDataToFile(); // nâng cấp file lên bản gộp mới nhất
    }
    syncHistorySnapshots(); // gộp hàng loạt → đặt lại nền so sánh lịch sử
    return merged;
  }

  // Khôi phục ĐỊNH MỨC CÔNG SUẤT BÀO THÔ theo tháng ({ 'YYYY-MM': thanh/giờ }).
  function restoreX2BaoThoRates(incoming) {
    const src = (incoming && typeof incoming === 'object') ? incoming : {};
    const cur = (state.x2BaoThoRates && typeof state.x2BaoThoRates === 'object') ? state.x2BaoThoRates : {};
    let changed = false;
    for (const k of Object.keys(src)) {
      if (!(k in cur) || cur[k] == null) { cur[k] = src[k]; changed = true; }
    }
    if (changed) {
      state.x2BaoThoRates = cur;
      try { localStorage.setItem(STORAGE_KEY_X2_BAO_THO_RATE, JSON.stringify(cur)); } catch (err) {}
    }
    return cur;
  }

  // ─── GỘP NHẬT KÝ CHỌN NAN THÔ XƯỞNG 2 (file / backup / mây) ──
  function restoreXuong2ChonNan(incomingArr) {
    const before = JSON.stringify(state.xuong2ChonNanThoRecords || []);
    const merged = mergeXuong2Records(state.xuong2ChonNanThoRecords, incomingArr);
    state.xuong2ChonNanThoRecords = merged;
    try { localStorage.setItem(STORAGE_KEY_XUONG2_CHON_NAN, JSON.stringify(merged)); } catch (err) {}
    if (JSON.stringify(merged) !== before && state.fileStorage.connected) {
      writeDataToFile(); // nâng cấp file lên bản gộp mới nhất
    }
    syncHistorySnapshots(); // gộp hàng loạt → đặt lại nền so sánh lịch sử
    return merged;
  }

  // Khôi phục ĐỊNH MỨC CÔNG SUẤT CHỌN NAN theo tháng ({ 'YYYY-MM': thanh/giờ }).
  function restoreX2ChonNanRates(incoming) {
    const src = (incoming && typeof incoming === 'object') ? incoming : {};
    const cur = (state.x2ChonNanRates && typeof state.x2ChonNanRates === 'object') ? state.x2ChonNanRates : {};
    let changed = false;
    for (const k of Object.keys(src)) {
      if (!(k in cur) || cur[k] == null) { cur[k] = src[k]; changed = true; }
    }
    if (changed) {
      state.x2ChonNanRates = cur;
      try { localStorage.setItem(STORAGE_KEY_X2_CHON_NAN_RATE, JSON.stringify(cur)); } catch (err) {}
    }
    return cur;
  }

  // ─── GỘP ĐỘ ẨM LÒ SẤY (file / backup) — QC nhập hàng ngày ──
  // Gộp theo id (`kh-<ngày>-<lò>`): bản có updatedAt MỚI HƠN thắng; bản chỉ có
  // ở 1 phía vẫn giữ lại — không mất số đo của máy nào.
  function restoreQcKilnReadings(incomingArr) {
    const incoming = Array.isArray(incomingArr) ? incomingArr.filter(r => r && r.id) : [];
    if (!incoming.length) return state.qcKilnReadings || [];
    const stamp = s => String((s && (s.updatedAt || s.createdAt)) || '');
    const map = new Map((state.qcKilnReadings || []).filter(r => r && r.id).map(r => [r.id, r]));
    let changed = false;
    incoming.forEach(r => {
      const cur = map.get(r.id);
      if (!cur || stamp(r) >= stamp(cur)) { map.set(r.id, r); changed = true; }
    });
    const merged = [...map.values()];
    if (changed) {
      state.qcKilnReadings = merged;
      try { localStorage.setItem(STORAGE_KEY_QC_KILN_HUMIDITY, JSON.stringify(merged)); } catch (err) {}
    }
    return merged;
  }
  // Khôi phục NGƯỠNG độ ẩm đạt ({ say1, say2 }) — GỘP, không đè số đã đặt trên máy.
  function restoreQcKilnThresholds(incoming) {
    const src = (incoming && typeof incoming === 'object' && !Array.isArray(incoming)) ? incoming : {};
    const cur = (state.qcKilnThresholds && typeof state.qcKilnThresholds === 'object') ? state.qcKilnThresholds : {};
    let changed = false;
    for (const k of Object.keys(src)) {
      if (!(k in cur) || cur[k] == null) { cur[k] = src[k]; changed = true; }
    }
    if (changed) {
      state.qcKilnThresholds = cur;
      try { localStorage.setItem(STORAGE_KEY_QC_KILN_THRESHOLD, JSON.stringify(cur)); } catch (err) {}
    }
    return cur;
  }

  // ─── GỘP KIỂM SAU SẢN XUẤT (file / backup) — thẻ qc-final-card ──
  // Gộp theo id: bản có updatedAt MỚI HƠN thắng; bản chỉ có ở 1 phía vẫn giữ
  // lại — không mất lượt kiểm của máy nào.
  function restoreQcFinal(incomingArr) {
    const incoming = Array.isArray(incomingArr) ? incomingArr.filter(r => r && r.id) : [];
    if (!incoming.length) return state.qcFinalRecords || [];
    const stamp = s => String((s && (s.updatedAt || s.createdAt)) || '');
    const map = new Map((state.qcFinalRecords || []).filter(r => r && r.id).map(r => [r.id, r]));
    let changed = false;
    incoming.forEach(r => {
      const cur = map.get(r.id);
      if (!cur || stamp(r) >= stamp(cur)) { map.set(r.id, r); changed = true; }
    });
    const merged = [...map.values()];
    if (changed) {
      state.qcFinalRecords = merged;
      try { localStorage.setItem(STORAGE_KEY_QC_FINAL, JSON.stringify(merged)); } catch (err) {}
    }
    return merged;
  }
  // Gộp ĐỊNH MỨC kiểm theo tháng ({ 'YYYY-MM': tấm/h }) — không đè số đã đặt
  function restoreQcFinalRates(incoming) {
    const src = (incoming && typeof incoming === 'object' && !Array.isArray(incoming)) ? incoming : {};
    const cur = (state.qcFinalRates && typeof state.qcFinalRates === 'object') ? state.qcFinalRates : {};
    let changed = false;
    for (const k of Object.keys(src)) {
      if (!(k in cur) || cur[k] == null) { cur[k] = src[k]; changed = true; }
    }
    if (changed) {
      state.qcFinalRates = cur;
      try { localStorage.setItem(STORAGE_KEY_QC_FINAL_RATE, JSON.stringify(cur)); } catch (err) {}
    }
    return cur;
  }

  // ─── GỘP NHẬT KÝ BULLIG XƯỞNG 2 (file / backup / mây) ──
  function restoreXuong2Bullig(incomingArr) {
    const before = JSON.stringify(state.xuong2BulligRecords || []);
    const merged = mergeXuong2Records(state.xuong2BulligRecords, incomingArr);
    state.xuong2BulligRecords = merged;
    try { localStorage.setItem(STORAGE_KEY_XUONG2_BULLIG, JSON.stringify(merged)); } catch (err) {}
    if (JSON.stringify(merged) !== before && state.fileStorage.connected) {
      writeDataToFile(); // nâng cấp file lên bản gộp mới nhất
    }
    syncHistorySnapshots();
    return merged;
  }

  // Khôi phục ĐỊNH MỨC CÔNG SUẤT BULLIG theo tháng + công đoạn ({ gc: {...}, ct: {...} }).
  function restoreX2BulligRates(incoming) {
    const src = (incoming && typeof incoming === 'object') ? incoming : {};
    const cur = (state.x2BulligRates && typeof state.x2BulligRates === 'object') ? state.x2BulligRates : { gc: {}, ct: {} };
    let changed = false;
    ['gc', 'ct'].forEach(k => {
      const g = (src[k] && typeof src[k] === 'object') ? src[k] : {};
      cur[k] = cur[k] || {};
      for (const m of Object.keys(g)) {
        if (!(m in cur[k]) || cur[k][m] == null) { cur[k][m] = g[m]; changed = true; }
      }
    });
    if (changed) {
      state.x2BulligRates = cur;
      try { localStorage.setItem(STORAGE_KEY_X2_BULLIG_RATE, JSON.stringify(cur)); } catch (err) {}
    }
    return cur;
  }

  // Khôi phục ĐỊNH MỨC THỜI GIAN THAN HÓA theo tháng + công đoạn sấy
  // ({ s1: {...}, s2: {...} }) — GỘP, không đè số đã đặt trên máy này.
  function restoreX2SayRates(incoming) {
    const src = (incoming && typeof incoming === 'object') ? incoming : {};
    const cur = (state.x2SayRates && typeof state.x2SayRates === 'object') ? state.x2SayRates : { s1: {}, s2: {} };
    let changed = false;
    ['s1', 's2'].forEach(k => {
      const g = (src[k] && typeof src[k] === 'object') ? src[k] : {};
      cur[k] = cur[k] || {};
      for (const m of Object.keys(g)) {
        if (!(m in cur[k]) || cur[k][m] == null) { cur[k][m] = g[m]; changed = true; }
      }
    });
    if (changed) {
      state.x2SayRates = cur;
      try { localStorage.setItem(STORAGE_KEY_X2_SAY_RATE, JSON.stringify(cur)); } catch (err) {}
    }
    return cur;
  }

  // Khôi phục SỐ LẦN THAN HÓA THẬT theo NHÓM (ngày + công đoạn sấy) — dạng
  // { 'YYYY-MM-DD|say1': n }: GỘP, KHÔNG đè số đã nhập trên máy này.
  function restoreX2SayTimes(incoming) {
    const src = (incoming && typeof incoming === 'object' && !Array.isArray(incoming)) ? incoming : {};
    const cur = (state.x2SayTimes && typeof state.x2SayTimes === 'object') ? state.x2SayTimes : {};
    let changed = false;
    Object.keys(src).forEach(k => {
      const v = Number(src[k]);
      if (!/^\d{4}-\d{2}-\d{2}\|(say1|say2)$/.test(k)) return;
      if (!Number.isFinite(v) || v <= 0) return;
      if (cur[k] == null) { cur[k] = Math.round(v); changed = true; }
    });
    if (changed) {
      state.x2SayTimes = cur;
      try { localStorage.setItem(STORAGE_KEY_X2_SAY_TIMES, JSON.stringify(cur)); } catch (err) {}
    }
    return cur;
  }

  // Khôi phục GIỜ SỰ CỐ CHO PHÉP theo NGÀY ({ 'YYYY-MM-DD': giờ }): GỘP, không đè.
  function restoreX2SayIncidents(incoming) {
    const src = (incoming && typeof incoming === 'object' && !Array.isArray(incoming)) ? incoming : {};
    const cur = (state.x2SayIncidents && typeof state.x2SayIncidents === 'object') ? state.x2SayIncidents : {};
    let changed = false;
    Object.keys(src).forEach(k => {
      const v = Number(src[k]);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(k)) return;
      if (!Number.isFinite(v) || v <= 0) return;
      if (cur[k] == null) { cur[k] = v; changed = true; }
    });
    if (changed) {
      state.x2SayIncidents = cur;
      try { localStorage.setItem(STORAGE_KEY_X2_SAY_INCIDENT, JSON.stringify(cur)); } catch (err) {}
    }
    return cur;
  }

  // Khôi phục GIỜ SỰ CỐ CHO PHÉP theo (THẺ CÔNG ĐOẠN, NGÀY)
  // ({ '<cardId>|<YYYY-MM-DD>': giờ }): GỘP, không đè.
  function restoreX2StageIncidents(incoming) {
    const src = (incoming && typeof incoming === 'object' && !Array.isArray(incoming)) ? incoming : {};
    const cur = (state.x2StageIncidents && typeof state.x2StageIncidents === 'object') ? state.x2StageIncidents : {};
    let changed = false;
    Object.keys(src).forEach(k => {
      const v = Number(src[k]);
      if (!/^[a-z]+\|\d{4}-\d{2}-\d{2}$/.test(k)) return;
      if (!Number.isFinite(v) || v <= 0) return;
      if (cur[k] == null) { cur[k] = v; changed = true; }
    });
    if (changed) {
      state.x2StageIncidents = cur;
      try { localStorage.setItem(STORAGE_KEY_X2_STAGE_INCIDENT, JSON.stringify(cur)); } catch (err) {}
    }
    return cur;
  }

  // ─── GỘP NHẬT KÝ BÀO TINH XƯỞNG 2 (file / backup / mây) ──
  function restoreXuong2BaoTinh(incomingArr) {
    const before = JSON.stringify(state.xuong2BaoTinhRecords || []);
    const merged = mergeXuong2Records(state.xuong2BaoTinhRecords, incomingArr);
    state.xuong2BaoTinhRecords = merged;
    try { localStorage.setItem(STORAGE_KEY_XUONG2_BAO_TINH, JSON.stringify(merged)); } catch (err) {}
    if (JSON.stringify(merged) !== before && state.fileStorage.connected) {
      writeDataToFile(); // nâng cấp file lên bản gộp mới nhất
    }
    syncHistorySnapshots(); // gộp hàng loạt → đặt lại nền so sánh lịch sử
    return merged;
  }

  // Khôi phục ĐỊNH MỨC CÔNG SUẤT BÀO TINH theo tháng ({ 'YYYY-MM': thanh/giờ }).
  function restoreX2BaoTinhRates(incoming) {
    const src = (incoming && typeof incoming === 'object') ? incoming : {};
    const cur = (state.x2BaoTinhRates && typeof state.x2BaoTinhRates === 'object') ? state.x2BaoTinhRates : {};
    let changed = false;
    for (const k of Object.keys(src)) {
      if (!(k in cur) || cur[k] == null) { cur[k] = src[k]; changed = true; }
    }
    if (changed) {
      state.x2BaoTinhRates = cur;
      try { localStorage.setItem(STORAGE_KEY_X2_BAO_TINH_RATE, JSON.stringify(cur)); } catch (err) {}
    }
    return cur;
  }

  // Khôi phục ĐỊNH MỨC CÔNG SUẤT ÉP VÁN theo tháng ({ 'YYYY-MM': m³/giờ }).
  function restoreX2EpVanRates(incoming) {
    const src = (incoming && typeof incoming === 'object') ? incoming : {};
    const cur = (state.x2EpVanRates && typeof state.x2EpVanRates === 'object') ? state.x2EpVanRates : {};
    let changed = false;
    for (const k of Object.keys(src)) {
      if (!(k in cur) || cur[k] == null) { cur[k] = src[k]; changed = true; }
    }
    if (changed) {
      state.x2EpVanRates = cur;
      try { localStorage.setItem(STORAGE_KEY_X2_EP_VAN_RATE, JSON.stringify(cur)); } catch (err) {}
    }
    return cur;
  }

  // Khôi phục DANH SÁCH VỊ TRÍ SẤY khai báo thêm (mảng chuỗi) từ file/backup.
  // Luôn GỘP (không ghi đè) để không mất vị trí đã khai báo trên máy này.
  // ─── GỘP PHIẾU KHO (xuất / tiêu hủy / tái chế) từ file / backup / mây ──
  // Dấu thời gian so sánh bản ghi (ưu tiên updatedAt); bản chỉ có ở một phía giữ lại.
  function restoreKhoNotes(incomingArr) {
    const before = JSON.stringify(state.khoNotes || []);
    const merged = mergeXuong2Records(state.khoNotes, incomingArr);
    state.khoNotes = merged;
    try { localStorage.setItem(STORAGE_KEY_KHO_NOTES, JSON.stringify(merged)); } catch (err) {}
    if (JSON.stringify(merged) !== before && state.fileStorage.connected) {
      writeDataToFile(); // nâng cấp file lên bản gộp mới nhất
    }
    syncHistorySnapshots(); // gộp hàng loạt → đặt lại nền so sánh lịch sử
    return merged;
  }
  function restoreX2LotLocations(incoming) {
    const src = Array.isArray(incoming) ? incoming : [];
    const cur = Array.isArray(state.x2LotLocations) ? state.x2LotLocations : [];
    const seen = new Set(cur.map(v => String(v || '').trim().toLowerCase()));
    let changed = false;
    src.forEach(v => {
      const name = String(v || '').trim();
      if (!name || seen.has(name.toLowerCase())) return;
      seen.add(name.toLowerCase());
      cur.push(name);
      changed = true;
    });
    if (changed) {
      state.x2LotLocations = cur;
      try { localStorage.setItem(STORAGE_KEY_X2_LOT_LOCATIONS, JSON.stringify(cur)); } catch (err) {}
    }
    return cur;
  }
  // CỠ ĐẦU RA của "Bào thanh" khai báo THÊM (thẻ Bào Tinh) — GỘP, không mất cỡ nào
  function restoreX2BaoThanhOutSizes(incoming) {
    const src = Array.isArray(incoming) ? incoming : [];
    const cur = Array.isArray(state.x2BaoThanhOutSizes) ? state.x2BaoThanhOutSizes : [];
    const seen = new Set(cur.map(v => String(v || '').trim().toLowerCase()));
    let changed = false;
    src.forEach(v => {
      const name = String(v || '').trim();
      if (!name || seen.has(name.toLowerCase())) return;
      seen.add(name.toLowerCase());
      cur.push(name);
      changed = true;
    });
    if (changed) {
      state.x2BaoThanhOutSizes = cur;
      try { localStorage.setItem(STORAGE_KEY_X2_BAO_THANH_OUT_SIZES, JSON.stringify(cur)); } catch (err) {}
    }
    return cur;
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
        statusEl.innerHTML = `<i data-lucide="smartphone" style="width:12px;height:12px;"></i> Mobile: Dùng Lưu/Nạp File`;
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
      showToast('Trên điện thoại: dùng "Sao Lưu / Phục Hồi (JSON)" hoặc nút đồng bộ đám mây trong menu ⋮!', 'info');
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
        if (loaded.xuong2CutRecords && Array.isArray(loaded.xuong2CutRecords)) {
          restoreXuong2Cuts(loaded.xuong2CutRecords); // GỘP — không ghi đè mất bản mới hơn
        }
        if (loaded.suppliers && Array.isArray(loaded.suppliers)) {
          restoreSuppliers(loaded.suppliers); // GỘP — không ghi đè mất bản mới hơn
        }
        if (loaded.x2CapRates) {
          restoreX2CapRates(loaded.x2CapRates); // GỘP theo tháng — không đè số đã đặt
        }
        if (loaded.xuong2BoluongRecords && Array.isArray(loaded.xuong2BoluongRecords)) {
          restoreXuong2Boluong(loaded.xuong2BoluongRecords); // GỘP — không ghi đè mất bản mới hơn
        }
        if (loaded.xuong1CatOngRecords && Array.isArray(loaded.xuong1CatOngRecords)) restoreXuong1CatOng(loaded.xuong1CatOngRecords);
        if (loaded.xuong1SaySinhRecords && Array.isArray(loaded.xuong1SaySinhRecords)) restoreXuong1SaySinh(loaded.xuong1SaySinhRecords);
        if (loaded.xuong1BocRecords && Array.isArray(loaded.xuong1BocRecords)) restoreXuong1Boc(loaded.xuong1BocRecords);
        if (loaded.xuong1LocOngRecords && Array.isArray(loaded.xuong1LocOngRecords)) restoreXuong1LocOng(loaded.xuong1LocOngRecords);
        if (loaded.xuong1CatMatRecords && Array.isArray(loaded.xuong1CatMatRecords)) restoreXuong1CatMat(loaded.xuong1CatMatRecords);
        if (loaded.xuong1BoRecords && Array.isArray(loaded.xuong1BoRecords)) restoreXuong1Bo(loaded.xuong1BoRecords);
        if (loaded.xuong1PhoiSayRecords && Array.isArray(loaded.xuong1PhoiSayRecords)) restoreXuong1PhoiSay(loaded.xuong1PhoiSayRecords);
        if (loaded.xuong1LocThanhRecords && Array.isArray(loaded.xuong1LocThanhRecords)) restoreXuong1LocThanh(loaded.xuong1LocThanhRecords);
        if (loaded.x1Rates) restoreX1Rates(loaded.x1Rates);
        if (loaded.x2BoluongRates) {
          restoreX2BoluongRates(loaded.x2BoluongRates); // GỘP theo tháng — không đè số đã đặt
        }
        if (loaded.xuong2BoOngRecords && Array.isArray(loaded.xuong2BoOngRecords)) {
          restoreXuong2BoOng(loaded.xuong2BoOngRecords); // GỘP — không ghi đè mất bản mới hơn
        }
        if (loaded.x2BoOngRates) {
          restoreX2BoOngRates(loaded.x2BoOngRates); // GỘP theo tháng — không đè số đã đặt
        }
        if (loaded.xuong2BaoThoRecords && Array.isArray(loaded.xuong2BaoThoRecords)) {
          restoreXuong2BaoTho(loaded.xuong2BaoThoRecords); // GỘP — không ghi đè mất bản mới hơn
        }
        if (loaded.x2BaoThoRates) {
          restoreX2BaoThoRates(loaded.x2BaoThoRates); // GỘP theo tháng — không đè số đã đặt
        }
        if (loaded.xuong2ChonNanThoRecords && Array.isArray(loaded.xuong2ChonNanThoRecords)) {
          restoreXuong2ChonNan(loaded.xuong2ChonNanThoRecords); // GỘP — không ghi đè mất bản mới hơn
        }
        if (loaded.x2ChonNanRates) {
          restoreX2ChonNanRates(loaded.x2ChonNanRates); // GỘP theo tháng — không đè số đã đặt
        if (loaded.xuong2BulligRecords && Array.isArray(loaded.xuong2BulligRecords)) {
          restoreXuong2Bullig(loaded.xuong2BulligRecords); // GỘP — không mất lượt Bullig mới hơn
        }
        if (loaded.x2BulligRates) {
          restoreX2BulligRates(loaded.x2BulligRates); // GỘP theo tháng + công đoạn
        }
        if (loaded.x2SayRates) {
          restoreX2SayRates(loaded.x2SayRates); // ĐỊNH MỨC thời gian than hóa (phút/m³) — gộp theo tháng
        if (loaded.x2SayTimes) {
          restoreX2SayTimes(loaded.x2SayTimes); // SỐ LẦN than hóa thật theo ngày + công đoạn — gộp, không đè
        if (loaded.x2SayIncidents) {
          restoreX2SayIncidents(loaded.x2SayIncidents); // GIỜ SỰ CỐ CHO PHÉP theo ngày — gộp, không đè
        if (loaded.x2StageIncidents) {
          restoreX2StageIncidents(loaded.x2StageIncidents); // GIỜ SỰ CỐ theo (thẻ công đoạn, ngày) — gộp, không đè
        }
        }

        }

        }


        }
        if (Array.isArray(loaded.x2LotLocations)) {
          restoreX2LotLocations(loaded.x2LotLocations); // GỘP — không mất vị trí sấy đã khai báo
        }
        if (Array.isArray(loaded.x2BaoThanhOutSizes)) {
          restoreX2BaoThanhOutSizes(loaded.x2BaoThanhOutSizes); // GỘP — không mất cỡ đầu ra Bào thanh
        }
        if (Array.isArray(loaded.xuong2BaoTinhRecords)) {
          restoreXuong2BaoTinh(loaded.xuong2BaoTinhRecords); // GỘP — không mất lượt bào tinh mới hơn
        }
        if (loaded.x2BaoTinhRates) {
          restoreX2BaoTinhRates(loaded.x2BaoTinhRates); // GỘP theo tháng — không đè số đã đặt
        }
        if (loaded.x2EpVanRates) {
          restoreX2EpVanRates(loaded.x2EpVanRates); // Định mức ép ván (m³/h) — gộp theo tháng
        }
        if (Array.isArray(loaded.khoNotes)) {
          restoreKhoNotes(loaded.khoNotes); // PHIẾU KHO — gộp, không mất phiếu mới hơn file
        }
        if (Array.isArray(loaded.qcKilnReadings)) {
          restoreQcKilnReadings(loaded.qcKilnReadings); // GỘP — không mất số đo độ ẩm mới hơn file
        }
        if (loaded.qcKilnThresholds) {
          restoreQcKilnThresholds(loaded.qcKilnThresholds); // GỘP — không đè ngưỡng đã đặt
        }
        if (Array.isArray(loaded.qcFinalRecords)) {
          restoreQcFinal(loaded.qcFinalRecords); // KIỂM SAU SẢN XUẤT — gộp, không mất lượt kiểm mới hơn file
        }
        if (loaded.qcFinalRates) {
          restoreQcFinalRates(loaded.qcFinalRates); // ĐỊNH MỨC kiểm theo tháng — gộp, không đè số đã đặt
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
        if (loaded.xuong2CutRecords && Array.isArray(loaded.xuong2CutRecords)) {
          restoreXuong2Cuts(loaded.xuong2CutRecords); // GỘP — không ghi đè mất bản mới hơn
        }
        if (loaded.suppliers && Array.isArray(loaded.suppliers)) {
          restoreSuppliers(loaded.suppliers); // GỘP — không ghi đè mất bản mới hơn
        }
        if (loaded.x2CapRates) {
          restoreX2CapRates(loaded.x2CapRates); // GỘP theo tháng — không đè số đã đặt
        }
        if (loaded.xuong2BoluongRecords && Array.isArray(loaded.xuong2BoluongRecords)) {
          restoreXuong2Boluong(loaded.xuong2BoluongRecords); // GỘP — không ghi đè mất bản mới hơn
        }
        if (loaded.xuong1CatOngRecords && Array.isArray(loaded.xuong1CatOngRecords)) restoreXuong1CatOng(loaded.xuong1CatOngRecords);
        if (loaded.xuong1SaySinhRecords && Array.isArray(loaded.xuong1SaySinhRecords)) restoreXuong1SaySinh(loaded.xuong1SaySinhRecords);
        if (loaded.xuong1BocRecords && Array.isArray(loaded.xuong1BocRecords)) restoreXuong1Boc(loaded.xuong1BocRecords);
        if (loaded.xuong1LocOngRecords && Array.isArray(loaded.xuong1LocOngRecords)) restoreXuong1LocOng(loaded.xuong1LocOngRecords);
        if (loaded.xuong1CatMatRecords && Array.isArray(loaded.xuong1CatMatRecords)) restoreXuong1CatMat(loaded.xuong1CatMatRecords);
        if (loaded.xuong1BoRecords && Array.isArray(loaded.xuong1BoRecords)) restoreXuong1Bo(loaded.xuong1BoRecords);
        if (loaded.xuong1PhoiSayRecords && Array.isArray(loaded.xuong1PhoiSayRecords)) restoreXuong1PhoiSay(loaded.xuong1PhoiSayRecords);
        if (loaded.xuong1LocThanhRecords && Array.isArray(loaded.xuong1LocThanhRecords)) restoreXuong1LocThanh(loaded.xuong1LocThanhRecords);
        if (loaded.x1Rates) restoreX1Rates(loaded.x1Rates);
        if (loaded.x2BoluongRates) {
          restoreX2BoluongRates(loaded.x2BoluongRates); // GỘP theo tháng — không đè số đã đặt
        }
        if (loaded.xuong2BoOngRecords && Array.isArray(loaded.xuong2BoOngRecords)) {
          restoreXuong2BoOng(loaded.xuong2BoOngRecords); // GỘP — không ghi đè mất bản mới hơn
        }
        if (loaded.x2BoOngRates) {
          restoreX2BoOngRates(loaded.x2BoOngRates); // GỘP theo tháng — không đè số đã đặt
        }
        if (loaded.xuong2BaoThoRecords && Array.isArray(loaded.xuong2BaoThoRecords)) {
          restoreXuong2BaoTho(loaded.xuong2BaoThoRecords); // GỘP — không ghi đè mất bản mới hơn
        }
        if (loaded.x2BaoThoRates) {
          restoreX2BaoThoRates(loaded.x2BaoThoRates); // GỘP theo tháng — không đè số đã đặt
        }
        if (loaded.xuong2ChonNanThoRecords && Array.isArray(loaded.xuong2ChonNanThoRecords)) {
          restoreXuong2ChonNan(loaded.xuong2ChonNanThoRecords); // GỘP — không ghi đè mất bản mới hơn
        }
        if (loaded.x2ChonNanRates) {
          restoreX2ChonNanRates(loaded.x2ChonNanRates); // GỘP theo tháng — không đè số đã đặt
        if (loaded.xuong2BulligRecords && Array.isArray(loaded.xuong2BulligRecords)) {
          restoreXuong2Bullig(loaded.xuong2BulligRecords); // GỘP — không mất lượt Bullig mới hơn
        }
        if (loaded.x2BulligRates) {
          restoreX2BulligRates(loaded.x2BulligRates); // GỘP theo tháng + công đoạn
        }
        if (loaded.x2SayRates) {
          restoreX2SayRates(loaded.x2SayRates); // ĐỊNH MỨC thời gian than hóa (phút/m³) — gộp theo tháng
        if (loaded.x2SayTimes) {
          restoreX2SayTimes(loaded.x2SayTimes); // SỐ LẦN than hóa thật theo ngày + công đoạn — gộp, không đè
        if (loaded.x2SayIncidents) {
          restoreX2SayIncidents(loaded.x2SayIncidents); // GIỜ SỰ CỐ CHO PHÉP theo ngày — gộp, không đè
        if (loaded.x2StageIncidents) {
          restoreX2StageIncidents(loaded.x2StageIncidents); // GIỜ SỰ CỐ theo (thẻ công đoạn, ngày) — gộp, không đè
        }
        }

        }

        }


        }
        if (Array.isArray(loaded.x2LotLocations)) {
          restoreX2LotLocations(loaded.x2LotLocations); // GỘP — không mất vị trí sấy đã khai báo
        }
        if (Array.isArray(loaded.x2BaoThanhOutSizes)) {
          restoreX2BaoThanhOutSizes(loaded.x2BaoThanhOutSizes); // GỘP — không mất cỡ đầu ra Bào thanh
        }
        if (Array.isArray(loaded.xuong2BaoTinhRecords)) {
          restoreXuong2BaoTinh(loaded.xuong2BaoTinhRecords); // GỘP — không mất lượt bào tinh mới hơn
        }
        if (loaded.x2BaoTinhRates) {
          restoreX2BaoTinhRates(loaded.x2BaoTinhRates); // GỘP theo tháng — không đè số đã đặt
        }
        if (loaded.x2EpVanRates) {
          restoreX2EpVanRates(loaded.x2EpVanRates); // Định mức ép ván (m³/h) — gộp theo tháng
        }
        if (Array.isArray(loaded.khoNotes)) {
          restoreKhoNotes(loaded.khoNotes); // PHIẾU KHO — gộp, không mất phiếu mới hơn file
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
      // ── AUTO BACKUP LỚP 3 (js/autobackup.js mô tả tổng thể) ──
      // Copy bản bamboo_data.json ĐANG CÓ sang backups/ TRƯỚC khi ghi đè
      // (giữ 10 bản gần nhất) — phòng khi nội dung mới bị hỏng/xóa nhầm.
      await backupDataFileToFolder();
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
        materialRecords: state.materialRecords || [],
        xuong2CutRecords: state.xuong2CutRecords || [],
        xuong2BoluongRecords: state.xuong2BoluongRecords || [],
        xuong1CatOngRecords: state.xuong1CatOngRecords || [],
        xuong1SaySinhRecords: state.xuong1SaySinhRecords || [],
        xuong1BocRecords: state.xuong1BocRecords || [],
        xuong1LocOngRecords: state.xuong1LocOngRecords || [],
        xuong1CatMatRecords: state.xuong1CatMatRecords || [],
        xuong1BoRecords: state.xuong1BoRecords || [],
        xuong1PhoiSayRecords: state.xuong1PhoiSayRecords || [],
        xuong1LocThanhRecords: state.xuong1LocThanhRecords || [],
        x1Rates: state.x1Rates || {},
        xuong2BoOngRecords: state.xuong2BoOngRecords || [],
        xuong2BaoThoRecords: state.xuong2BaoThoRecords || [],
        xuong2ChonNanThoRecords: state.xuong2ChonNanThoRecords || [],
        xuong2BulligRecords: state.xuong2BulligRecords || [],
        suppliers: state.suppliers || [],
        x2CapRates: state.x2CapRates || {},
        x2BoluongRates: state.x2BoluongRates || {},
        x2BoOngRates: state.x2BoOngRates || {},
        x2BaoThoRates: state.x2BaoThoRates || {},
        x2ChonNanRates: state.x2ChonNanRates || {},
        x2BulligRates: state.x2BulligRates || { gc: {}, ct: {} },
        x2SayRates: state.x2SayRates || { s1: {}, s2: {} },
        x2SayTimes: state.x2SayTimes || {},
        x2SayIncidents: state.x2SayIncidents || {},
      x2StageIncidents: state.x2StageIncidents || {},



        xuong2BaoTinhRecords: state.xuong2BaoTinhRecords || [],
        x2BaoTinhRates: state.x2BaoTinhRates || {},
        x2EpVanRates: state.x2EpVanRates || {},
        x2LotLocations: state.x2LotLocations || [],
        x2BaoThanhOutSizes: state.x2BaoThanhOutSizes || [],   // Cỡ đầu ra Bào thanh (thẻ Bào Tinh)
        qcFinalRecords: state.qcFinalRecords || [],   // KIỂM SAU SẢN XUẤT (tab QC)
        qcFinalRates: state.qcFinalRates || {},       // Định mức kiểm theo tháng (tấm/h)
        khoNotes: state.khoNotes || []
      };
      await writable.write(JSON.stringify(allData, null, 2));
      await writable.close();
      state.fileStorage.fileHandle = fileHandle;
    } catch (e) {
      showToast('Lỗi ghi file dữ liệu: ' + e.message, 'error');
    }
  }


  // ─── AUTO BACKUP FILE (LỚP 3 — thư mục dữ liệu) ───────────────
  // Trước mỗi lần ghi đè bamboo_data.json, copy bản cũ sang backups/
  // bamboo_data_<ngày-giờ>.json (giữ 10 bản gần nhất). Throttle 10 phút/lần
  // để không phình thư mục khi nhập liệu dồn dập — bản chính vẫn ghi mỗi lần lưu.
  const FILE_BACKUP_DIR = 'backups';
  const FILE_BACKUP_KEEP = 10;
  const FILE_BACKUP_GAP_KEY = 'bamboo_tracker_filebackup_gap_v1'; // mốc thời gian lần copy gần nhất
  const FILE_BACKUP_GAP_MS = 10 * 60 * 1000;
  let fileBackupBusy = false;
  async function backupDataFileToFolder() {
    if (!state.fileStorage.dirHandle || fileBackupBusy) return;
    fileBackupBusy = true;
    try {
      const last = Number(localStorage.getItem(FILE_BACKUP_GAP_KEY) || 0);
      if (Date.now() - last < FILE_BACKUP_GAP_MS) return; // vừa copy gần đây → bỏ qua
      // Đọc nội dung file hiện tại (chưa có file → không có gì để cất)
      let text = '';
      try {
        const fh = await state.fileStorage.dirHandle.getFileHandle(DATA_FILE_NAME);
        const f = await fh.getFile();
        text = await f.text();
      } catch (e) { return; }
      if (!text || text.length < 20) return;
      const dir = await state.fileStorage.dirHandle.getDirectoryHandle(FILE_BACKUP_DIR, { create: true });
      const d = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      const stamp = d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '-' + pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds());
      const fh = await dir.getFileHandle('bamboo_data_' + stamp + '.json', { create: true });
      const w = await fh.createWritable();
      await w.write(text);
      await w.close();
      localStorage.setItem(FILE_BACKUP_GAP_KEY, String(Date.now()));
      // Dọn bản cũ: giữ 10 bản mới nhất (tên có dấu thời gian → sắp tên là đủ)
      const names = [];
      for await (const [name] of dir.entries()) {
        if (/^bamboo_data_\d{8}-\d{6}\.json$/.test(name)) names.push(name);
      }
      names.sort();
      while (names.length > FILE_BACKUP_KEEP) {
        try { await dir.removeEntry(names.shift()); } catch (e) {}
      }
      console.log('[AUTOBACKUP] Đã cất bản file cũ vào ' + FILE_BACKUP_DIR + '/bamboo_data_' + stamp + '.json');
    } catch (e) {
      console.warn('[AUTOBACKUP] Lỗi copy file backup (không ảnh hưởng ghi dữ liệu chính)', e);
    } finally { fileBackupBusy = false; }
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
      materialRecords: state.materialRecords || [],
      xuong2CutRecords: state.xuong2CutRecords || [],
      xuong2BoluongRecords: state.xuong2BoluongRecords || [],
      xuong1CatOngRecords: state.xuong1CatOngRecords || [],
      xuong1SaySinhRecords: state.xuong1SaySinhRecords || [],
      xuong1BocRecords: state.xuong1BocRecords || [],
      xuong1LocOngRecords: state.xuong1LocOngRecords || [],
      xuong1CatMatRecords: state.xuong1CatMatRecords || [],
      xuong1BoRecords: state.xuong1BoRecords || [],
      xuong1PhoiSayRecords: state.xuong1PhoiSayRecords || [],
      xuong1LocThanhRecords: state.xuong1LocThanhRecords || [],
      x1Rates: state.x1Rates || {},
      xuong2BoOngRecords: state.xuong2BoOngRecords || [],
      xuong2BaoThoRecords: state.xuong2BaoThoRecords || [],
      xuong2ChonNanThoRecords: state.xuong2ChonNanThoRecords || [],
      xuong2BulligRecords: state.xuong2BulligRecords || [],
      suppliers: state.suppliers || [],
      x2CapRates: state.x2CapRates || {},
      x2BoluongRates: state.x2BoluongRates || {},
      x2BoOngRates: state.x2BoOngRates || {},
      x2BaoThoRates: state.x2BaoThoRates || {},
      x2ChonNanRates: state.x2ChonNanRates || {},
      x2BulligRates: state.x2BulligRates || { gc: {}, ct: {} },
      x2SayRates: state.x2SayRates || { s1: {}, s2: {} },
      x2SayTimes: state.x2SayTimes || {},
      x2SayIncidents: state.x2SayIncidents || {},
        x2StageIncidents: state.x2StageIncidents || {},



      xuong2BaoTinhRecords: state.xuong2BaoTinhRecords || [],
      x2BaoTinhRates: state.x2BaoTinhRates || {},
      x2EpVanRates: state.x2EpVanRates || {},
      x2LotLocations: state.x2LotLocations || [],
      x2BaoThanhOutSizes: state.x2BaoThanhOutSizes || [],   // Cỡ đầu ra Bào thanh (thẻ Bào Tinh)
      qcKilnReadings: state.qcKilnReadings || [],
      qcKilnThresholds: state.qcKilnThresholds || {},
      qcFinalRecords: state.qcFinalRecords || [],   // KIỂM SAU SẢN XUẤT (tab QC)
      qcFinalRates: state.qcFinalRates || {}        // Định mức kiểm theo tháng (tấm/h)
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

        if (imported && Array.isArray(imported.xuong2CutRecords)) {
          restoreXuong2Cuts(imported.xuong2CutRecords); // GỘP — không xóa lượt cắt/chọn mới hơn backup
        }

        if (imported && Array.isArray(imported.suppliers)) {
          restoreSuppliers(imported.suppliers); // GỘP — không xóa nhà cung cấp mới hơn backup
        }

        if (imported && imported.x2CapRates) {
          restoreX2CapRates(imported.x2CapRates); // GỘP theo tháng — không đè số đã đặt
        }


        if (imported && Array.isArray(imported.xuong2BoluongRecords)) {
          restoreXuong2Boluong(imported.xuong2BoluongRecords); // GỘP — không xóa lượt bốc luồng mới hơn backup
        }

        if (imported && Array.isArray(imported.xuong1CatOngRecords)) restoreXuong1CatOng(imported.xuong1CatOngRecords);
        if (imported && Array.isArray(imported.xuong1SaySinhRecords)) restoreXuong1SaySinh(imported.xuong1SaySinhRecords);
        if (imported && Array.isArray(imported.xuong1BocRecords)) restoreXuong1Boc(imported.xuong1BocRecords);
        if (imported && Array.isArray(imported.xuong1LocOngRecords)) restoreXuong1LocOng(imported.xuong1LocOngRecords);
        if (imported && Array.isArray(imported.xuong1CatMatRecords)) restoreXuong1CatMat(imported.xuong1CatMatRecords);
        if (imported && Array.isArray(imported.xuong1BoRecords)) restoreXuong1Bo(imported.xuong1BoRecords);
        if (imported && Array.isArray(imported.xuong1PhoiSayRecords)) restoreXuong1PhoiSay(imported.xuong1PhoiSayRecords);
        if (imported && Array.isArray(imported.xuong1LocThanhRecords)) restoreXuong1LocThanh(imported.xuong1LocThanhRecords);
        if (imported && imported.x1Rates) restoreX1Rates(imported.x1Rates);

        if (imported && imported.x2BoluongRates) {
          restoreX2BoluongRates(imported.x2BoluongRates); // GỘP theo tháng — không đè số đã đặt
        }

        if (imported && Array.isArray(imported.xuong2BoOngRecords)) {
          restoreXuong2BoOng(imported.xuong2BoOngRecords); // GỘP — không xóa lượt bổ ống mới hơn backup
        }

        if (imported && imported.x2BoOngRates) {
          restoreX2BoOngRates(imported.x2BoOngRates); // GỘP theo tháng — không đè số đã đặt
        }

        if (imported && Array.isArray(imported.xuong2BaoThoRecords)) {
          restoreXuong2BaoTho(imported.xuong2BaoThoRecords); // GỘP — không xóa lượt chạy máy mới hơn backup
        }

        if (imported && imported.x2BaoThoRates) {
          restoreX2BaoThoRates(imported.x2BaoThoRates); // GỘP theo tháng — không đè số đã đặt
        }

        if (imported && Array.isArray(imported.xuong2ChonNanThoRecords)) {
          restoreXuong2ChonNan(imported.xuong2ChonNanThoRecords); // GỘP — không xóa lượt chọn nan mới hơn backup
        }

        if (imported && imported.x2ChonNanRates) {
        if (imported && Array.isArray(imported.xuong2BulligRecords)) {
          restoreXuong2Bullig(imported.xuong2BulligRecords); // GỘP — không xóa lượt Bullig mới hơn backup
        }
        if (imported && imported.x2BulligRates) {
          restoreX2BulligRates(imported.x2BulligRates); // GỘP theo tháng + công đoạn
        }
        if (imported && imported.x2SayRates) {
          restoreX2SayRates(imported.x2SayRates); // ĐỊNH MỨC thời gian than hóa (phút/m³) — gộp theo tháng
        if (imported && imported.x2SayTimes) {
          restoreX2SayTimes(imported.x2SayTimes); // SỐ LẦN than hóa thật theo ngày + công đoạn — gộp, không đè
        if (imported && imported.x2SayIncidents) {
          restoreX2SayIncidents(imported.x2SayIncidents); // GIỜ SỰ CỐ CHO PHÉP theo ngày — gộp, không đè
        if (imported && imported.x2StageIncidents) {
          restoreX2StageIncidents(imported.x2StageIncidents); // GIỜ SỰ CỐ theo (thẻ công đoạn, ngày) — gộp, không đè
        }
        }

        }

        }

          restoreX2ChonNanRates(imported.x2ChonNanRates); // GỘP theo tháng — không đè số đã đặt
        }

        if (imported && Array.isArray(imported.x2LotLocations)) {
          restoreX2LotLocations(imported.x2LotLocations); // GỘP — không mất vị trí đã khai báo
        }
        if (Array.isArray(imported.x2BaoThanhOutSizes)) {
          restoreX2BaoThanhOutSizes(imported.x2BaoThanhOutSizes); // GỘP — không mất cỡ đầu ra Bào thanh
        }

        if (Array.isArray(imported.qcKilnReadings)) {
          restoreQcKilnReadings(imported.qcKilnReadings); // GỘP — không mất số đo độ ẩm mới hơn backup
        }
        if (imported.qcKilnThresholds) {
          restoreQcKilnThresholds(imported.qcKilnThresholds); // GỘP — không đè ngưỡng đã đặt
        }
        if (Array.isArray(imported.qcFinalRecords)) {
          restoreQcFinal(imported.qcFinalRecords); // KIỂM SAU SẢN XUẤT — gộp, không mất lượt kiểm mới hơn backup
        }
        if (imported.qcFinalRates) {
          restoreQcFinalRates(imported.qcFinalRates); // ĐỊNH MỨC kiểm theo tháng — gộp, không đè số đã đặt
        }

        if (imported && Array.isArray(imported.xuong2BaoTinhRecords)) {
          restoreXuong2BaoTinh(imported.xuong2BaoTinhRecords); // GỘP — không xóa lượt bào tinh mới hơn backup
        }

        if (imported && imported.x2BaoTinhRates) {
          restoreX2BaoTinhRates(imported.x2BaoTinhRates); // GỘP theo tháng — không đè số đã đặt
        }
        if (imported && imported.x2EpVanRates) {
          restoreX2EpVanRates(imported.x2EpVanRates); // Định mức ép ván (m³/h)
        }
        if (imported && Array.isArray(imported.khoNotes)) {
          restoreKhoNotes(imported.khoNotes); // PHIẾU KHO — gộp, không mất phiếu mới hơn backup
        }

        // DỌN DỮ LIỆU CŨ: file dữ liệu cũ có thể chứa lô stage 'bao_tinh' — xóa ngay
        // (bên trong đã chụp backup force + tombstone + saveData)
        purgeLegacyBaoTinhBatches();

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
          state.batches = imported;
          // DỌN DỮ LIỆU CŨ: file JSON cũ có thể chứa lô stage 'bao_tinh' — xóa ngay
          // (bên trong đã chụp backup force + tombstone + saveData)
          purgeLegacyBaoTinhBatches();
          saveData(); renderAll();
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
  purgeLegacyBaoTinhBatches,
  readDataFromFile,
  readPhotoFile,
  removeDirHandleFromIDB,
  restoreMaterialRecords,
  restoreQcKilnReadings,
  restoreQcKilnThresholds,
  restoreQcFinal,
  restoreQcFinalRates,
  restoreX2BaoThoRates,
  restoreX2BoOngRates,
  restoreX2ChonNanRates,
  restoreX2LotLocations,
  restoreX2BaoThanhOutSizes,
  restoreXuong2BaoTho,
  restoreXuong2Boluong,
  restoreXuong1CatOng,
  restoreXuong1SaySinh,
  restoreXuong1Boc,
  restoreXuong1LocOng,
  restoreXuong1CatMat,
  restoreXuong1Bo,
  restoreXuong1PhoiSay,
  restoreXuong1LocThanh,
  restoreX1Rates,
  restoreX2BoluongRates,
  restoreXuong2BoOng,
  restoreXuong2ChonNan,
  restoreXuong2Bullig,
  restoreX2BulligRates,
  restoreX2SayRates,
  restoreX2SayTimes,
  restoreX2SayIncidents,
  restoreX2StageIncidents,
  restoreXuong2BaoTinh,
  restoreX2BaoTinhRates,
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
