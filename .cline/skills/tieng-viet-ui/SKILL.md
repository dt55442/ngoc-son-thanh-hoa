---
name: tieng-viet-ui
description: Quy ước tiếng Việt có dấu, nhãn UI, màu biểu đồ. Dùng khi viết code mới, nhãn nút, toast, log, commit, vẽ Chart.js.
---

# Kỹ Năng Tiếng Việt Và Giao Diện

## 1. Output bắt buộc tiếng Việt có dấu
- Mọi nội dung trả lời, comment code, nhãn UI, thông báo toast, log, commit message phải tiếng Việt đầy đủ dấu.
- Tuyệt đối không viết tiếng Việt không dấu, không lồng câu tiếng Anh vào output.
- Giữ style comment có mục `// ─── ... ───`.

## 2. Màu biểu đồ chuẩn
- Mỗi bộ dữ liệu một màu, không lặp: tím `#7c3aed`, xanh lá `#16a34a`, cam `#ea580c`, vàng hổ phách `#d97706`, hồng `#db2777`.
- KHÔNG chọn đồng thời xanh lá và xanh nước biển trong cùng một biểu đồ vì khó phân biệt khi in hoặc xem ngoài nắng.
- Kế Hoạch tím, Đã Ép xanh lá, Số Lượng Xuất cam.

## 3. Cột thân cây nguyên liệu
- Plugin `stemBars` trong `js/chart-stems.js`: Xưởng 2 cây tre, Xưởng 1 ống vầu nứa, Lò hơi khúc gỗ trơn.
- Dataset muốn vẽ hình phải gắn `stemShape` + `stemFilled` và tắt cột mặc định.
- Plugin phải đặt trước plugin vẽ nhãn để số liệu nằm trên hình.
- Dải highlight ngày hôm nay tô nền cam nhạt + 2 vạch nét đứt.

## 4. Giao diện điện thoại
- Chỉ thẻ cha giữ khung tre 14px, thẻ con bỏ khung.
- Màn hình nhỏ hơn 480px zoom 0.9, ô nhập 16px chống iOS tự phóng to, nút chạm tối thiểu 46px.
- Modal max-height theo dvh, footer dính đáy, khóa cuộn nền chỉ khi modal đang hiện thật.
