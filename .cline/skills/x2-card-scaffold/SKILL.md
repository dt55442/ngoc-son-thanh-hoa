---
name: x2-card-scaffold
description: Dựng thẻ công đoạn Xưởng 1 Xưởng 2 mới theo mẫu Cắt Chọn. Dùng khi thêm thẻ, thêm vị trí, thêm công đoạn nhỏ, nối capacity và xuất Excel.
---

# Kỹ Năng Dựng Thẻ Công Đoạn X2 X1

## 1. Mẫu chuẩn mỗi vị trí
- 1 cặp launcher mini trong `index.html` và khối `.planning-card` ẩn trong `#x2-details-stack`.
- Gỡ `soon: true` ở `X2_CARD_DEFS` và thêm nhánh render trong `x2OpenCard`, `renderXuong2Cards`, `x2CardCountText`.
- Cấu trúc thẻ chuẩn: thanh tồn `.x2-stock-bar` → form gọn `.x2-form-row` + banner cam đang sửa → thống kê `material-stats` → bảng phụ định mức theo tháng `.x2-rate-bar` → bảng dữ liệu thẻ ngày `.x2-day-card`.
- Người làm và giờ làm tự động từ Bảng bố trí Nhân Sự qua `hrAssignmentsAt` + `sumPosHoursSplit`, luôn lưu snapshot.

## 2. Key lưu trữ riêng
- Dữ liệu `bamboo_tracker_xuong2_<vi-tri>_v1`, định mức `bamboo_tracker_x2_<vi-tri>_rate_v1`.
- Xưởng 1 dùng dict chung `state.x1Rates` key `bamboo_tracker_x1_rates_v1`.
- Nối đủ 6 chỗ như skill offline-sync.

## 3. Chuỗi liên kết tồn
- Tồn bằng phần chưa bị công đoạn sau tiêu thụ, `excludeId` trả lại phần lượt đang sửa.
- Nguồn hết thì tự ẩn khỏi ô chọn, chặn lưu khi vượt phần còn lại.
- Ví dụ: Bổ Ống bổ 1 phần lô, Bào Thô chọn nhiều lô, Chọn Nan Thô link 2 chiều `chonNanQtyOf`.

## 4. Nối capacity và xuất Excel
- Thêm dòng vào `CAP_STAGES` trong `js/capacity.js` + `CAP_INC_KEY` + sparkline `#x2-mini-spark-*`.
- Thêm nguồn vào `X2_EXPORT_SOURCES` trong `export-xlsx.js`.
- Thêm vào `X2_CARD_HISTORY_DOMAIN` + `X2_CARD_EXPORT_SOURCE` trong `xuong2.js`.
- Giờ sự cố dùng dict chung `state.x2StageIncidents` qua `stageIncidentInputHtml`.

## 5. Popup định mức và dropdown nổi
- Thanh `.x2-rate-bar` đã dời ra popup cấp trang trong `X2_RATE_POPUPS`, giữ nguyên mọi id.
- Dropdown chọn lô dùng portal nổi `x2FloatShow` làm con trực tiếp `#x2-detail-overlay`, neo inline absolute z-index 260.
