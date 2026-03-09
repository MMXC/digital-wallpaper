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

const { app, BrowserWindow, Tray, Menu, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const { spawn, exec } = require('child_process');

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

// ============ 创建主窗口 ============
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: '🎭 Digital Wallpaper - 数字壁纸',
    icon: CONFIG.trayIconPath,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    },
    show: false  // 启动时隐藏，等托盘创建后再显示
  });

  // 加载前端页面
  mainWindow.loadURL(CONFIG.frontendUrl);

  // 窗口准备好后显示
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    console.log('✅ 主窗口已显示');
  });

  // 最小化到托盘（而不是关闭）
  mainWindow.on('minimize', (event) => {
    event.preventDefault();
    mainWindow.hide();
    console.log('📥 已最小化到托盘');
  });

  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      console.log('📥 关闭按钮 - 最小化到托盘');
    }
  });

  // 打开外部链接
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

// ============ 创建系统托盘 ============
function createTray() {
  // 使用默认图标或自定义图标
  const iconPath = path.join(__dirname, 'assets', 'icon.ico');
  
  try {
    tray = new Tray(iconPath);
  } catch (e) {
    console.warn('⚠️ 托盘图标未找到，使用默认');
    // 创建一个简单的托盘（如果图标不存在）
    return;
  }

  tray.setToolTip('🎭 Digital Wallpaper - 数字壁纸');

  // 右键菜单
  const contextMenu = Menu.buildFromTemplate([
    {
      label: '🌐 打开主界面',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    { type: 'separator' },
    {
      label: '⚙️ 设置 Slack Bot',
      click: () => {
        openSettings();
      }
    },
    {
      label: '▶️ 启动服务',
      submenu: [
        {
          label: '启动 Backend',
          click: () => startBackend()
        },
        {
          label: '启动 Frontend',
          click: () => startFrontend()
        },
        { type: 'separator' },
        {
          label: '启动全部服务',
          click: () => startAllServices()
        }
      ]
    },
    {
      label: '⏹️ 停止服务',
      submenu: [
        {
          label: '停止 Backend',
          click: () => stopBackend()
        },
        {
          label: '停止 Frontend',
          click: () => stopFrontend()
        },
        { type: 'separator' },
        {
          label: '停止全部服务',
          click: () => stopAllServices()
        }
      ]
    },
    { type: 'separator' },
    {
      label: '🔄 重启服务',
      click: () => {
        stopAllServices();
        setTimeout(() => startAllServices(), 1000);
      }
    },
    { type: 'separator' },
    {
      label: '❌ 退出',
      click: () => {
        app.isQuitting = true;
        stopAllServices();
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);

  // 双击打开主窗口
  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  console.log('✅ 系统托盘已创建');
}

// ============ 服务管理 ============
function startBackend() {
  if (backendProcess) {
    console.log('⚠️ Backend 已在运行');
    return;
  }

  const backendPath = path.join(__dirname, '..', 'backend');
  backendProcess = spawn('npm', ['start'], {
    cwd: backendPath,
    shell: true,
    detached: false
  });

  backendProcess.stdout.on('data', (data) => {
    console.log(`[Backend] ${data}`);
  });

  backendProcess.stderr.on('data', (data) => {
    console.error(`[Backend Error] ${data}`);
  });

  backendProcess.on('close', (code) => {
    console.log(`[Backend] 进程退出，code: ${code}`);
    backendProcess = null;
  });

  console.log('✅ Backend 已启动');
}

function startFrontend() {
  if (frontendProcess) {
    console.log('⚠️ Frontend 已在运行');
    return;
  }

  const frontendPath = path.join(__dirname, '..', 'wallpaper-frontend');
  frontendProcess = spawn('npm', ['start'], {
    cwd: frontendPath,
    shell: true,
    detached: false
  });

  frontendProcess.stdout.on('data', (data) => {
    console.log(`[Frontend] ${data}`);
  });

  frontendProcess.stderr.on('data', (data) => {
    console.error(`[Frontend Error] ${data}`);
  });

  frontendProcess.on('close', (code) => {
    console.log(`[Frontend] 进程退出，code: ${code}`);
    frontendProcess = null;
  });

  console.log('✅ Frontend 已启动');
}

function startAllServices() {
  startBackend();
  setTimeout(() => startFrontend(), 1000);
}

function stopBackend() {
  if (backendProcess) {
    backendProcess.kill();
    backendProcess = null;
    console.log('⏹️ Backend 已停止');
  }
}

function stopFrontend() {
  if (frontendProcess) {
    frontendProcess.kill();
    frontendProcess = null;
    console.log('⏹️ Frontend 已停止');
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
    title: '⚙️ 设置 - Slack Bot 配置',
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
ipcMain.handle('get-config', () => {
  return CONFIG;
});

ipcMain.handle('start-backend', () => {
  startBackend();
  return { success: true };
});

ipcMain.handle('start-frontend', () => {
  startFrontend();
  return { success: true };
});

ipcMain.handle('stop-backend', () => {
  stopBackend();
  return { success: true };
});

ipcMain.handle('stop-frontend', () => {
  stopFrontend();
  return { success: true };
});

ipcMain.handle('open-folder', async (event, folderPath) => {
  shell.openPath(folderPath);
});

// ============ 应用生命周期 ============
app.whenReady().then(() => {
  console.log('='.repeat(50));
  console.log('🎭 Digital Wallpaper 启动中...');
  console.log('='.repeat(50));
  
  createWindow();
  createTray();
  
  // 启动时自动启动服务
  setTimeout(() => startAllServices(), 1500);
  
  console.log('✅ 应用初始化完成');
});

app.on('window-all-closed', () => {
  // 不退出，保持托盘运行
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

// 处理未捕获异常
process.on('uncaughtException', (error) => {
  console.error('❌ 未捕获异常:', error);
  dialog.showErrorBox('错误', `发生错误: ${error.message}`);
});
