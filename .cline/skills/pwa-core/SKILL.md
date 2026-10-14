---
name: pwa-core
description: Quy ước nền PWA Ngọc Sơn Thanh Hóa. Dùng khi sửa js/, index.html, styles.css, thêm state, render UI, phân quyền tab.
---

# Kỹ Năng Cốt Lõi PWA Ngọc Sơn Thanh Hóa

## 1. Stack bắt buộc
- Vanilla JS ES Modules — KHÔNG framework, KHÔNG build step, KHÔNG npm dependencies.
- `package.json` chỉ có `npm test` và `npm start`.
- Thư viện offline trong `vendor/`, nạp bằng `<script>` trong `index.html`: lucide, chart.umd, xlsx.full, firebase compat.
- Điểm vào `js/main.js`: boot DOMContentLoaded, `switchView`, `renderAll()`, xuất `window.app`.

## 2. Cấu trúc module js/
- `state.js`: state toàn cục + STORAGE_KEY `bamboo_tracker_*`.
- `storage.js`: loadData/saveData, backup/restore JSON.
- `auth.js`, `permissions.js`, `cloud.js`, `events.js`, `kanban.js`, `kiln.js`, `dashboard.js`, `planning.js`, `press.js`, `materials.js`, `hr.js`, `xuong2.js`, `capacity.js`, `ai.js`, `utils.js`.
- File lớn (>1000 dòng): grep trước, đọc đúng vùng cần, đừng đọc cả file.

## 3. Quy tắc ghi dữ liệu
- Luôn `saveData()` rồi `renderAll()`.
- Xóa lô phải `trackDeleted('batches', id)` TRƯỚC; phục hồi phải `untrackDeleted(...)`.
- Mọi state mới: đặt trong `state` + STORAGE_KEY riêng `bamboo_tracker_<ten>_v1` + hàm load/save + nạp lúc boot.

## 4. Phân quyền lúc render
- Gắn `data-perm="<tabId>"` lên nút/khối thao tác.
- Lúc render chỉ dùng `canEditTab()` im lặng.
- TUYỆT ĐỐI đừng gọi `requireEditPermission()` lúc render (chỉ dùng trong handler click).
- Định mức chỉ admin: `data-admin-only` + `requireRatePermission()`.

## 5. Ngày giờ và giao diện
- Ngày nhập/hiển thị `dd/mm/yyyy`, dùng `initVnDateInputs`.
- Giao diện khóa cứng Tre Sáng `body[data-theme="night"]`, không thêm bộ chọn giao diện.
- Modal trong view-panel phải dọn trong `closeViewScopedModals` khi `switchView`, tránh mất cuộn trang.
