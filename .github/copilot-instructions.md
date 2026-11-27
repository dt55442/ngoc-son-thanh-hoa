# Quy tắc làm việc với project "web theo dõi nan"

## 1. Quy tắc đọc file lớn (BẮT BUỘC)

### 1.1. File CẤM đọc nguyên — không có ngoại lệ

| File | Kích thước | Lý do |
|---|---|---|
| `bamboo_data.json` | 3.5 MB | Dữ liệu, không phải code |
| `.clinerules` | 528 KB | Đã nạp tự động, không cần đọc |
| `tmp-*.txt` | 160-210 KB | File rác tạm |
| `tmp-out*.txt`, `tmp-final-test.txt` | lớn | File rác tạm |

Với các file này: **không** dùng `view`/`read` toàn bộ. Nếu cần dữ liệu, dùng `grep` để trích đúng phần.

### 1.2. File code > 100 KB — chặn mềm

Danh sách file lớn hiện tại:

| File | Kích thước |
|---|---|
| `js/xuong2.js` | 1.33 MB |
| `styles.css` | 760 KB |
| `index.html` | 625 KB |
| `js/hr.js` | 533 KB |
| `js/events.js` | 213 KB |
| `js/cloud.js` | 212 KB |
| `js/batch-modals.js` | 208 KB |
| `js/press.js` | 193 KB |
| `js/export-xlsx.js` | 181 KB |
| `js/capacity_test.js` | 181 KB |
| `js/capacity.js` | 171 KB |
| `js/xuong2.js` | 133 KB |
| `js/planning.js` | 122 KB |
| `js/storage.js` | 114 KB |
| `js/materials.js` | 106 KB |
| `js/qc-final.js` | 102 KB |

**Quy trình bắt buộc:**

1. Dùng `grep` tìm vị trí chính xác (tên hàm, class CSS, id, chuỗi text).
2. Dùng `view_range` đọc đúng đoạn cần (±50 dòng quanh vị trí tìm được).
3. Chỉ đọc thêm đoạn khác nếu thật sự cần.

**Ngoại lệ được phép đọc nguyên (phải ghi rõ lý do trong báo cáo):**

- Task yêu cầu refactor toàn file.
- Đã `grep` ≥ 5 lần mà chưa xác định được vị trí.
- User yêu cầu rõ ràng.

### 1.3. File < 100 KB

Đọc bình thường, không hạn chế.

## 2. Ngân sách lệnh

- Mỗi lượt: tối đa **25 tool call**.
- Cùng một lỗi thất bại **3 lần** → dừng, báo `[BLOCKED]` + lý do + 1 đề xuất.
- Không chạy lại lệnh đã chạy với tham số tương tự.

## 3. Output gọn

- Giới hạn output đọc ≤ 200 dòng mỗi lần.
- Không dump toàn bộ log, build output, hay file lớn vào context.
- Khi output quá lớn, chỉ trích phần liên quan.

## 4. Báo cáo ngắn

- Tối đa **12 dòng**.
- Nêu rõ: file đã đổi, lệnh đã chạy, kết quả, rủi ro còn lại.

## 5. Ngân sách token

- Nếu context ước tính > 60% → tóm tắt trạng thái, dừng, báo user.

## 6. Không tự mở rộng scope

- Chỉ sửa đúng phần được giao.
- Không refactor ngoài yêu cầu.
- Không xóa file rác trừ khi được yêu cầu.

## 7. Cấu trúc project

- `index.html` — trang chính (625 KB, chứa toàn bộ markup)
- `styles.css` — toàn bộ CSS (760 KB)
- `js/` — các module JS, nạp qua `js/module-loader.js`
- `tests/` — test `.mjs`, chạy bằng `node --test`
- `server.cjs` / `server.ps1` — server local (port 8080)
- `bamboo_data.json` — dữ liệu chính (3.5 MB)

## 8. Lưu ý khi sửa layout

- CSS nằm trong `styles.css` (760 KB) — **luôn** `grep` tên class trước.
- Markup nằm trong `index.html` (625 KB) — **luôn** `grep` id/class trước.
- Không sửa CSS toàn cục khi chỉ cần sửa 1 component.
