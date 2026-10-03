@echo off
chcp 65001 >nul
title Đẩy app theo dõi nan lên GitHub
REM ============================================================
REM  ĐẨY CODE LÊN GITHUB PAGES
REM  - Lần đầu: sửa REPO_URL bên dưới thành link repo của bạn,
REM    rồi chạy file này -> có cửa sổ đăng nhập GitHub -> bấm
REM    "Sign in with your browser".
REM  - Các lần sau: chỉ cần double-click file này để cập nhật web.
REM  - Thông báo đã SỬA ĐỂ TRUNG THỰC: chỉ nói "không có thay đổi"
REM    khi THẬT SỰ không có gì; nếu git lỗi sẽ in LỖI THẬT.
REM ============================================================

REM >>> Link repo của bạn (đã điền sẵn - nếu đổi tên repo thì sửa dòng dưới) <<<
set REPO_URL=https://github.com/dt55442/ngoc-son-thanh-hoa.git
set ERR=0

cd /d "%~dp0"

echo.
echo === 1/5 Kiểm tra git trong thư mục dự án ===
if not exist .git (
    echo    Chưa có git - khởi tạo mới...
    git init
    git branch -M main
) else (
    echo    Git đã sẵn sàng.
)
git remote get-url origin >nul 2>&1
if errorlevel 1 (
    git remote add origin "%REPO_URL%"
)

echo.
echo === 2/5 Kiểm tra có thay đổi không ===
set COUNT=0
for /f "delims=" %%A in ('git status --porcelain 2^>nul') do set /a COUNT+=1
if %COUNT%==0 goto :khongthaydoi
echo    Có %COUNT% đường dẫn thay đổi đang chờ đẩy.

echo.
echo === 3/5 Gom tất cả thay đổi (git add -A) ===
git add -A
if errorlevel 1 goto :loiadd
echo    Đã gom xong.

echo.
echo === 4/5 Ghi chú cập nhật (commit) ===
git diff --cached --quiet >nul 2>&1
if not errorlevel 1 goto :khongthaydoi
git commit -m "Cập nhật app %date% %time%"
if errorlevel 1 goto :loicommit
git log -1 --oneline

echo.
echo === 5/5 Đẩy lên GitHub (sau ~1 phút web tự động cập nhật) ===
git push -u origin main
if errorlevel 1 goto :loipush
echo    Đẩy THÀNH CÔNG - chờ ~1 phút rồi tải lại trang web.

goto :ketqua

:khongthaydoi
echo.
echo    Không có thay đổi nào mới để đẩy lên.
goto :ketqua

:loiadd
echo.
echo    [LỖI] git add -A THẤT BẠI - xem thông báo lỗi NGAY PHÍA TRÊN.
echo    Nguyên nhân thường gặp: tồn tại file rác tên "nul" / "con" /
echo    "aux" (do chạy lệnh ghi "> nul" trong Git Bash nên Windows
echo    tạo ra file tên nul - git coi là tên file không hợp lệ).
echo    Cách xử lý: mở Git Bash trong thư mục này rồi chạy:
echo        rm -f nul
echo    Sau đó double-click lại file bat này.
set ERR=1
goto :ketqua

:loicommit
echo.
echo    [LỖI] COMMIT THẤT BẠI - xem thông báo lỗi NGAY PHÍA TRÊN.
set ERR=1
goto :ketqua

:loipush
echo.
echo    [LỖI] PUSH THẤT BẠI!
echo    - Kiểm tra đã tạo repo trên github.com chưa?
echo    - Kiểm tra REPO_URL ở đầu file này đã đúng chưa?
echo    - Nếu báo "remote origin already exists": chạy
echo      git remote set-url origin "%REPO_URL%"
set ERR=1
goto :ketqua

:ketqua
echo.
echo === KẾT QUẢ ===
git status -sb 2>nul
echo    Commit mới nhất:
git log -1 --oneline 2>nul
echo.
echo Web trực tuyến tại: https://dt55442.github.io/ngoc-son-thanh-hoa/
pause
exit /b %ERR%
