@echo off
title Nha May Ngoc Son Thanh Hoa - PWA Server
cd /d "%~dp0"

echo ==============================================
echo   NHA MAY NGOC SON THANH HOA - MAY CHU UNG DUNG
echo ==============================================
echo   Trang web:  http://localhost:8080
echo   Tat server: Ctrl+C hoac dong cua so nay
echo ==============================================
echo.
echo LUU Y: GIU MO cua so nay khi dang su dung ung dung,
echo        co the thu nho xuong thanh taskbar.
echo.
where node >nul 2>nul
if errorlevel 1 goto NO_NODE

echo Dang khoi dong server nhanh (Node.js)...
echo.
node server.cjs 8080
echo.
echo Server da dung. Neu loi "Cong 8080 dang duoc su dung" thi trang
echo dang mo tu truoc van dung binh thuong - khong can lam gi.
pause
exit /b

:NO_NODE
echo [CANH BAO] May chua cai Node.js - dung tam server PowerShell cham hon.
echo Khuyen nghi: cai dat Node.js ban LTS tu https://nodejs.org
echo.
powershell -ExecutionPolicy Bypass -File server.ps1 8080
pause
