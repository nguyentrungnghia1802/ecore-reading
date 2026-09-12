@echo off
setlocal enabledelayedexpansion

:: Thiet lap tieu de cho cua so CMD
title Ecore Reading - Web Visualizer

:: Dam bao thu muc lam viec luon la thu muc chua file nay
cd /d "%~dp0"

echo ======================================================
echo          ECORE READING - DEVELOPMENT SERVER
echo ======================================================
echo.

:: 1. Kiem tra moi truong Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [LOI] Khong tim thay Node.js tren may tinh!
    echo Vui long cai dat Node.js tai: https://nodejs.org/
    echo Sau khi cai dat xong, vui long mo lai file nay.
    echo.
    pause
    exit /b 1
)

:: 2. Kiem tra thu muc node_modules (tu dong cai dat neu thieu)
if not exist "node_modules\" (
    echo [THONG BAO] Phat hien chua cai dat thu vien. Dang chay 'npm install'...
    echo Qua trinh nay co the mat vai phut, vui long doi...
    echo.
    call npm install
    if %errorlevel% neq 0 (
        echo [LOI] Cai dat thu vien that bai! Vui long kiem tra ket noi mang.
        echo.
        pause
        exit /b 1
    )
    echo [OK] Da cai dat xong thu vien.
    echo.
)

:: 3. Thiet lap mo bang Google Chrome
set BROWSER=chrome

echo [THONG BAO] Dang khoi dong may chu va mo tren Google Chrome...
echo [THONG BAO] Nhan Ctrl + C (hoac dong cua so nay) de tat may chu.
echo ======================================================
echo.

:: 4. Chay Vite dev server va tu dong mo Chrome
call npm run dev -- --open

:: Neu server dung
echo.
echo May chu da dung.
pause
