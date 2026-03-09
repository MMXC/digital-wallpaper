@echo off
chcp 65001 >nul
title Digital Wallpaper - 托盘版启动

echo ============================================
echo   🎭 Digital Wallpaper 托盘版启动
echo   (支持系统托盘、最小化、右键菜单)
echo ============================================
echo.

REM 检查 Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ 错误: 未找到 Node.js
    echo 请先安装 Node.js: https://nodejs.org/
    pause
    exit /b 1
)

REM 检查 npm
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ 错误: 未找到 npm
    pause
    exit /b 1
)

echo ✅ Node.js 版本:
node --version
echo.

cd /d "%~dp0"

REM 检查 Electron 依赖
echo 📦 检查托盘应用依赖...
if not exist "windows-tray\node_modules" (
    echo    首次运行，正在安装依赖...
    cd /d "%~dp0windows-tray"
    call npm install
    if %errorlevel% neq 0 (
        echo ❌ 依赖安装失败
        pause
        exit /b 1
    )
)

REM 检查 Backend 依赖
echo 📦 检查 Backend 依赖...
if not exist "backend\node_modules" (
    cd /d "%~dp0backend"
    call npm install
)

REM 检查 Frontend 依赖  
echo 📦 检查 Frontend 依赖...
if not exist "wallpaper-frontend\node_modules" (
    cd /d "%~dp0wallpaper-frontend"
    call npm install
)

cd /d "%~dp0"

echo.
echo ============================================
echo   🚀 启动托盘应用
echo ============================================
echo.
echo 📋 功能说明:
echo    - 任务栏显示应用图标
echo    - 右键托盘图标显示菜单
echo    - 最小化到系统托盘
echo    - 启动/停止服务
echo    - 设置 Slack Bot
echo.

REM 启动托盘应用
cd /d "%~dp0windows-tray"
start "Digital Wallpaper" node tray-app.js

echo ✅ 已启动！托盘图标应该出现在任务栏
echo.
pause
