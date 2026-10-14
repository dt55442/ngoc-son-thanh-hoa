---
name: sw-cache-bump
description: Tăng phiên bản cache PWA khi đổi index.html, styles.css, js, vendor. Dùng khi sửa giao diện, thêm file js mới, hoặc sau mọi thay đổi tĩnh.
---

# Kỹ Năng Tăng Cache Service Worker

## 1. Khi nào phải tăng CACHE_NAME trong sw.js
- Mỗi lần đổi `index.html`, `styles.css`, `js/`, `vendor/`.
- Nếu không tăng, PWA dùng cache cũ mãi.
- Hiện tại `nha-may-ngoc-son-v237`, mỗi lần đổi tăng tiếp v238, v239...

## 2. Checklist bắt buộc
1. Sửa `CACHE_NAME` trong `sw.js`.
2. Thêm file js mới vào `APP_SHELL` của `sw.js`.
3. Sửa số version trong regex ở 17 file test cấu trúc có kiểm tra `nha-may-ngoc-son-v<hien-tai>`: capacity, dashboard-pv-merge, kho, kiln, photo-sync, than-hoa, x2-ep-van, xuong2-bao-tinh, xuong2-boc-luong, planning-rates, qc-final, xuong1, loading, qc-press, xuong2-cat-van, xuong2-bao-van, xuong2-ho-tro.
4. Chạy `node tests/smoke.mjs` để chắc chắn SW nạp đúng bundle mới.
5. `sw.js` đăng ký với `updateViaCache:'none'` trong `js/cloud.js` để không dính HTTP-cache 24h.

## 3. Lỗi thường gặp
- Quên sửa test cấu trúc dẫn đến `npm test` báo đỏ dù app vẫn chạy.
- Thêm module mới như `js/qc-press.js`, `js/loading.js` mà quên cho vào APP_SHELL.
