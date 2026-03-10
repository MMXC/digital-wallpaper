@echo off
chcp 65001 >nul
title Digital Wallpaper - Tray Mode

echo ============================================
echo   [=] Digital Wallpaper - Tray Mode
echo   (System tray, minimize, right-click menu)
echo ============================================
echo.

REM Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [X] Error: Node.js not found
    echo Please install Node.js: https://nodejs.org/
    pause
    exit /b 1
)

REM Check npm
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo [X] Error: npm not found
    pause
    exit /b 1
)

echo [=] Node.js version:
node --version
echo.

cd /d "%~dp0"

REM Check Electron dependencies
echo [*] Checking tray app dependencies...
if not exist "windows-tray\node_modules" (
    echo    First run, installing dependencies...
    cd /d "%~dp0windows-tray"
    call npm install
    if %errorlevel% neq 0 (
        echo [X] Dependency installation failed
        pause
        exit /b 1
    )
)

REM Check Backend dependencies
echo [*] Checking Backend dependencies...
if not exist "backend\node_modules" (
    cd /d "%~dp0backend"
    call npm install
)

REM Check Frontend dependencies  
echo [*] Checking Frontend dependencies...
if not exist "wallpaper-frontend\node_modules" (
    cd /d "%~dp0wallpaper-frontend"
    call npm install
)

cd /d "%~dp0"

echo.
echo ============================================
echo   [^] Launching Tray App
echo ============================================
echo.
echo [*] Features:
echo    - App icon in taskbar
echo    - Right-click tray icon for menu
echo    - Minimize to system tray
echo    - Start/Stop services
echo    - Configure Slack Bot
echo.

REM Launch tray app
cd /d "%~dp0windows-tray"
start "Digital Wallpaper" npx electron .

echo [=] Started! Tray icon should appear in taskbar
echo.
pause
