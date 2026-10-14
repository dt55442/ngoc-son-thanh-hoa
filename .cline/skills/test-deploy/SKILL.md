---
name: test-deploy
description: Chạy kiểm thử Node thuần và đẩy GitHub Pages. Dùng sau mọi lần sửa code, khi test đỏ, khi deploy báo không có thay đổi.
---

# Kỹ Năng Kiểm Thử Và Triển Khai

## 1. Chạy kiểm thử
- Sau sửa code chạy `npm test` gồm 50 file Node thuần headless, không framework, không cần cài gì.
- Chạy lẻ `node tests/<ten>.mjs` khi sửa đúng 1 module.
- `tests/smoke.mjs` dựng stub DOM localStorage rồi import `js/main.js` và bắn DOMContentLoaded.
- Đo hiệu năng bằng harness Node tạm, KHÔNG cho file test perf vào chuỗi `npm test` vì dễ flaky.

## 2. Triển khai GitHub Pages
- Deploy bằng `day-len-github.bat` gồm git add -A, commit, push origin main, web tự cập nhật sau 1 phút.
- Bat dùng `chcp 65001` tiếng Việt có dấu, đếm `git status --porcelain`, chỉ in không có thay đổi khi thật sự không có gì.
- Nguyên nhân kinh điển đẩy thất bại âm thầm: file rác tên `nul`, `con`, `aux` do chạy `> nul` trong Git Bash gây invalid path. Xóa bằng `rm -f nul`.
- `.gitignore` đã loại `backups/`, đừng đưa bản cất tự động lên repo.

## 3. Chạy app本地
- `npm start` chạy node server.cjs cổng 8080 hoặc double-click `chay_app.bat`.
- Mở file trực tiếp chỉ để test nhanh vì Service Worker không chạy.
