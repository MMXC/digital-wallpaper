/**
 * Digital Wallpaper - Windows 系统托盘应用
 * 
 * 功能：
 * - Windows 任务栏托盘图标
 * - 右键菜单：设置Slack Bot、启动/停止、退出
 * - 最小化到托盘
 * - 启动时自动运行后端服务
 * 
 * 使用方法：
 *   cd windows-tray
 *   npm install
 *   npm start
 */

const { app, BrowserWindow, Tray, Menu, ipcMain, dialog, shell, nativeImage } = require('electron');
const path = require('path');
const { spawn, exec } = require('child_process');
const fs = require('fs');

// 全局变量
let mainWindow = null;
let tray = null;
let backendProcess = null;
let frontendProcess = null;

// 配置
const CONFIG = {
  trayIconPath: path.join(__dirname, 'assets', 'icon.ico'),
  frontendPort: 18791,
  backendPort: 18790,
  frontendUrl: 'http://localhost:18791',
  backendWsUrl: 'ws://localhost:18790'
};

// 创建默认托盘图标 - 16x16 紫色方块
function createDefaultIcon() {
  // 创建一个简单的 16x16 紫色图标
  const size = 16;
  const canvas = Buffer.alloc(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    canvas[i * 4] = 128;     // R
    canvas[i * 4 + 1] = 0;   // G  
    canvas[i * 4 + 2] = 128; // B
    canvas[i * 4 + 3] = 255; // A
  }
  return nativeImage.createFromBuffer(canvas, { width: size, height: size });
}

// ============ 创建主窗口 (Admin 管理界面) ============
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    title: 'Digital Wallpaper - Admin',
    icon: CONFIG.trayIconPath,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    },
    show: true
  });

  // 加载 backend 的 admin 页面
  const adminUrl = 'http://localhost:3001/admin';
  
  // 等待 backend 准备好
  const checkBackend = () => {
    const http = require('http');
    const req = http.get(adminUrl, (res) => {
      if (res.statusCode === 200) {
        mainWindow.loadURL(adminUrl);
        console.log('Admin page loaded');
      } else {
        setTimeout(checkBackend, 1000);
      }
    });
    req.on('error', () => {
      setTimeout(checkBackend, 1000);
    });
  };
  
  // 延迟检查，让 backend 有时间启动
  setTimeout(checkBackend, 3000);
  console.log('Waiting for backend...');

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    console.log('Main window ready');
  });

  mainWindow.on('minimize', (event) => {
    event.preventDefault();
    mainWindow.hide();
  });

  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

// ============ 创建系统托盘 ============
function createTray() {
  let trayIcon;
  const iconPath = path.join(__dirname, 'assets', 'icon.ico');
  
  try {
    if (fs.existsSync(iconPath)) {
      trayIcon = nativeImage.createFromPath(iconPath);
      console.log('Loaded custom tray icon');
    } else {
      console.log('Using default tray icon');
      trayIcon = createDefaultIcon();
    }
  } catch (e) {
    console.warn('Icon load failed, using default:', e.message);
    trayIcon = createDefaultIcon();
  }

  tray = new Tray(trayIcon);
  tray.setToolTip('Digital Wallpaper - 数字壁纸');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Settings',
      click: () => openSettings()
    },
    { type: 'separator' },
    {
      label: 'Start All',
      click: () => startAllServices()
    },
    {
      label: 'Stop All',
      click: () => stopAllServices()
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.isQuitting = true;
        stopAllServices();
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);

  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  console.log('Tray created');
}

// ============ 服务管理 ============
function startBackend() {
  if (backendProcess) {
    console.log('Backend already running');
    return;
  }

  const backendPath = path.join(__dirname, '..', 'backend');
  backendProcess = spawn('npm', ['start'], {
    cwd: backendPath,
    shell: true,
    detached: false,
    stdio: 'pipe'
  });

  backendProcess.stdout.on('data', (data) => {
    console.log('[Backend] ' + data);
  });

  backendProcess.stderr.on('data', (data) => {
    console.error('[Backend Error] ' + data);
  });

  backendProcess.on('close', (code) => {
    console.log('[Backend] exited: ' + code);
    backendProcess = null;
  });

  console.log('Backend started');
}

function startFrontend() {
  if (frontendProcess) {
    console.log('Frontend already running');
    return;
  }

  const frontendPath = path.join(__dirname, '..', 'wallpaper-frontend');
  frontendProcess = spawn('npm', ['start'], {
    cwd: frontendPath,
    shell: true,
    detached: false,
    stdio: 'pipe'
  });

  frontendProcess.stdout.on('data', (data) => {
    console.log('[Frontend] ' + data);
  });

  frontendProcess.stderr.on('data', (data) => {
    console.error('[Frontend Error] ' + data);
  });

  frontendProcess.on('close', (code) => {
    console.log('[Frontend] exited: ' + code);
    frontendProcess = null;
  });

  console.log('Frontend started');
}

function startAllServices() {
  startBackend();
  setTimeout(() => startFrontend(), 1000);
}

function stopBackend() {
  if (backendProcess) {
    backendProcess.kill();
    backendProcess = null;
    console.log('Backend stopped');
  }
}

function stopFrontend() {
  if (frontendProcess) {
    frontendProcess.kill();
    frontendProcess = null;
    console.log('Frontend stopped');
  }
}

function stopAllServices() {
  stopBackend();
  stopFrontend();
}

// ============ 设置窗口 ============
function openSettings() {
  const settingsWindow = new BrowserWindow({
    width: 600,
    height: 500,
    title: 'Settings',
    parent: mainWindow,
    modal: true,
    resizable: false,
    webPreferences: {
      nodeIntegration: true
    }
  });

  settingsWindow.loadFile(path.join(__dirname, 'settings.html'));
  settingsWindow.setMenu(null);
}

// ============ IPC 通信 ============
ipcMain.handle('get-config', () => CONFIG);
ipcMain.handle('start-backend', () => { startBackend(); return { success: true }; });
ipcMain.handle('start-frontend', () => { startFrontend(); return { success: true }; });
ipcMain.handle('stop-backend', () => { stopBackend(); return { success: true }; });
ipcMain.handle('stop-frontend', () => { stopFrontend(); return { success: true }; });
ipcMain.handle('open-folder', async (event, folderPath) => shell.openPath(folderPath));

// ============ 应用生命周期 ============
app.whenReady().then(() => {
  console.log('Digital Wallpaper starting...');
  try {
    createWindow();
    console.log('Window created');
  } catch (e) {
    console.error('Window create error:', e);
  }
  try {
    createTray();
    console.log('Tray creation attempted');
  } catch (e) {
    console.error('Tray create error:', e);
  }
  setTimeout(() => startAllServices(), 1500);
  console.log('Ready');
});

app.on('window-all-closed', () => {
  // 不退出
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('before-quit', () => {
  app.isQuitting = true;
  stopAllServices();
});

process.on('uncaughtException', (error) => {
  console.error('Error:', error);
  dialog.showErrorBox('Error', error.message);
});
