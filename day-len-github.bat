@echo off
title Day app theo doi nan len GitHub
REM ============================================================
REM  DAY CODE LEN GITHUB PAGES
REM  - Lan dau: sua REPO_URL ben duoi thanh link repo cua ban,
REM    roi chay file nay. Se co cua so dang nhap GitHub -> nhan
REM    "Sign in with your browser".
REM  - Cac lan sau: chi can double-click file nay de cap nhat web.
REM ============================================================

REM >>> Link repo cua ban (da dien san - neu doi ten repo thi sua dong duoi) <<<
set REPO_URL=https://github.com/dt55442/ngoc-son-thanh-hoa.git

cd /d "%~dp0"

echo.
echo === 1/4 Kiem tra git trong thu muc du an ===
if not exist .git (
    echo    Chua co git - khoi tao moi...
    git init
    git branch -M main
) else (
    echo    Git da san sang.
)
git remote get-url origin >nul 2>&1
if errorlevel 1 (
    git remote add origin "%REPO_URL%"
)

echo.
echo === 2/4 Gom tat ca thay doi ===
git add -A

echo.
echo === 3/4 Ghi chu cap nhat ===
git commit -m "Cap nhat app %date% %time%"
if errorlevel 1 (
    echo    Khong co thay doi nao moi de day len.
)

echo.
echo === 4/4 Day len GitHub (sau ~1 phut web tu dong cap nhat) ===
git push -u origin main
if errorlevel 1 (
    echo.
    echo [LOI] Push that bai!
    echo - Kiem tra da tao repo tren github.com chua?
    echo - Kiem tra REPO_URL o dau file nay da dung chua?
    echo - Neu bao "remote origin already exists": chay
    echo   git remote set-url origin "%REPO_URL%"
)

echo.
echo === HOAN TAT ===
echo Web truc tuyen tai: https://dt55442.github.io/ngoc-son-thanh-hoa/
pause