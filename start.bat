@echo off
chcp 65001 >nul
title Digital Wallpaper - 一键启动

echo ============================================
echo   🎭 Digital Wallpaper 一键启动脚本
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

echo ✅ Node.js 已安装
echo.

REM 检查目录
cd /d "%~dp0"
if not exist "backend" (
    echo ❌ 错误: 未找到 backend 目录
    pause
    exit /b 1
)

if not exist "wallpaper-frontend" (
    echo ❌ 错误: 未找到 wallpaper-frontend 目录
    pause
    exit /b 1
)

echo 📦 安装依赖 & 构建...
echo.

REM 安装 backend 依赖
echo [1/3] 安装 Backend 依赖...
cd /d "%~dp0backend"
call npm install
if %errorlevel% neq 0 (
    echo ❌ Backend 依赖安装失败
    pause
    exit /b 1
)
echo ✅ Backend 依赖安装完成
echo.

REM 构建前端
echo [2/3] 构建 Frontend...
cd /d "%~dp0"
call npm run build
if %errorlevel% neq 0 (
    echo ❌ Frontend 构建失败
    pause
    exit /b 1
)
echo ✅ Frontend 构建完成
echo.

REM 提交构建结果（仅首次或更新时）
echo [3/3] 检查更新...
cd /d "%~dp0"
git add wallpaper-frontend/static/
git diff --cached --quiet
if %errorlevel% neq 0 (
    echo 📦 发现静态文件更新，正在提交...
    git commit -m "chore: 更新前端静态文件" || echo 已提交或无需更新
)
cd /d "%~dp0backend"
if not exist ".env" (
    echo ⚠️ 未找到 .env 配置文件
    echo 正在创建默认配置...
    copy /Y ".env.example" ".env"
    echo.
    echo ❗ 请编辑 backend/.env 文件，填入你的 Slack 凭证！
    echo.
    notepad .env
)

echo.
echo ============================================
echo   🚀 启动服务
echo ============================================
echo.

REM 启动 Backend
echo [1] 启动 Slack 中间件 (Backend)...
start "Digital Wallpaper - Backend" cmd /k "cd /d %~dp0backend && npm start"

REM 等待一下
timeout /t 2 /nobreak >nul

REM 启动 Frontend
echo [2] 启动 Wallpaper 前端 (Frontend)...
start "Digital Wallpaper - Frontend" cmd /k "cd /d %~dp0wallpaper-frontend && npm start"

echo.
echo ============================================
echo   ✅ 启动完成！
echo ============================================
echo.
echo 📋 下一步操作:
echo.
echo 1. 打开 Wallpaper Engine
echo 2. 添加新的 web 壁纸
echo 3. 输入 URL: http://localhost:18791
echo.
echo 📖 详细文档请查看 README.md
echo.

REM 打开浏览器
echo 🌐 正在打开配置页面...
start http://localhost:18791

pause
