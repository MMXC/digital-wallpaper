@echo off
chcp 65001 >nul

cd /d "%~dp0"

REM 创建日志目录
if not exist "logs" mkdir logs

REM 日志文件
set LOG_FILE=%~dp0logs\start-tray.log

REM Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [%date% %time%] [X] Error: Node.js not found >> "%LOG_FILE%"
    exit /b 1
)

REM Check npm
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo [%date% %time%] [X] Error: npm not found >> "%LOG_FILE%"
    exit /b 1
)

REM Check dependencies
if not exist "windows-tray\node_modules" (
    echo [%date% %time%] [*] Installing tray dependencies... >> "%LOG_FILE%"
    cd /d "%~dp0windows-tray"
    call npm install >> "%LOG_FILE%" 2>&1
)

if not exist "backend\node_modules" (
    echo [%date% %time%] [*] Installing backend dependencies... >> "%LOG_FILE%"
    cd /d "%~dp0backend"
    call npm install >> "%LOG_FILE%" 2>&1
)

if not exist "wallpaper-frontend\node_modules" (
    echo [%date% %time%] [*] Installing frontend dependencies... >> "%LOG_FILE%"
    cd /d "%~dp0wallpaper-frontend"
    call npm install >> "%LOG_FILE%" 2>&1
)

cd /d "%~dp0"

echo [%date% %time%] [*] Launching Tray App >> "%LOG_FILE%"

REM Launch tray app (minimized, no window)
cd /d "%~dp0windows-tray"
start "" npx electron . --disable-gpu --no-sandbox

echo [%date% %time%] [=] Started >> "%LOG_FILE%"
