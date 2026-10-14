---
name: offline-sync
description: Đồng bộ offline-first Firebase, tombstone, chữ ký miền, delta theo miền. Dùng khi thêm state mới, thêm key localStorage, sửa cloud.js, storage.js, autobackup.js.
---

# Kỹ Năng Đồng Bộ Offline-First

## 1. Nguyên tắc 6 chỗ khi thêm state mới
1. `js/state.js`: STORAGE_KEY + field + export.
2. `js/storage.js`: restore + writeDataToFile + export/import JSON + auto-reconnect.
3. `js/cloud.js`: snapshot + cloudCore + mergeRemoteIntoLocal + persistAllLocal + applyFireSnapshot.
4. `js/history.js`: thêm vào DOMAINS đúng tab.
5. `js/main.js`: load lúc boot.
6. `js/tombstone.js`: trackDeleted khi xóa để đa máy không đẩy ngược.

## 2. Chữ ký miền __dh (Giai đoạn 1)
- Mỗi lần đẩy mây, doc `apps/main` đính kèm `__dh = { <mien>: <bam> }`.
- Gồm cả `deletedIds` nên lần xóa cũng đổi chữ ký.
- Cổng thoát nhanh ở đầu `handleRemoteSnapshot`: nếu `__dh` giống hệt local thì return ngay, không giải nén/gộp.
- Không áp dụng lần nạp đầu `firstLoad`.
- Vô hiệu cache băm `fbLocalHashes = null` mỗi khi dữ liệu cục bộ đổi.

## 3. Delta theo miền (Giai đoạn 2)
- Mục lục `apps/main = { __fmt:'delta-v1', __dh, deletedIds, updatedBy, updatedAt }`.
- Mỗi miền 1 doc `apps/main/d/<mien> = { h, data }` hoặc gzip nếu lớn.
- Chỉ ghi doc miền đổi, ghi mục lục 1 lần.
- Miền quá lớn >880KB thì fallback định dạng 1-doc cũ.
- `firestore.rules` match `apps/{doc}/{document=**}` đã phủ, không cần sửa.

## 4. Tường lửa định mức RATE_DOMAINS
- Hiện 14 miền: materialRates + qcFinalRates + 12 dict x2/x1.
- Khi `!canEditRate()` thì thay miền định mức bằng bản mây đang có trước khi đẩy.
- Cờ chờ đẩy `bamboo_tracker_cloud_pending_v1` chỉ đặt khi `canPushToCloud()`.

## 5. Auto backup 3 lớp
- Cục bộ tối đa 10 bản, bỏ trùng hash FNV-1a, chốt giảm đột biến 30%.
- Mây 1 bản/ngày giữ 14 ngày.
- Copy `bamboo_data.json` cũ sang `backups/`.
- Phục hồi luôn gộp khéo qua `mergeRemoteIntoLocal`.
