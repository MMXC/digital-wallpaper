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
  backendWsUrl: 'ws://localhost:18790',
  logFilePath: path.join(__dirname, '..', 'logs', 'app.log')
};

// 确保日志目录存在
const logDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// 日志记录函数
let logStream = null;
function getLogStream() {
  if (!logStream) {
    logStream = fs.createWriteStream(CONFIG.logFilePath, { flags: 'a' });
  }
  return logStream;
}

function writeLog(type, msg) {
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] [${type}] ${msg}\n`;
  getLogStream().write(logLine);
  console.log(`[${type}] ${msg}`);
}

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
      label: 'View Logs',
      click: () => {
        const logPath = CONFIG.logFilePath;
        if (fs.existsSync(logPath)) {
          shell.openPath(logPath);
        } else {
          dialog.showMessageBox({
            type: 'info',
            title: 'Logs',
            message: 'No logs yet'
          });
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
    {
      label: '清理端口',
      click: () => {
        cleanupPort(3001);
        cleanupPort(18791);
        dialog.showMessageBox({
          type: 'info',
          title: '清理完成',
          message: '已清理 3001 和 18791 端口'
        });
      }
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
function cleanupPort(port) {
  if (process.platform === 'win32') {
    exec(`netstat -ano | findstr :${port}`, (err, stdout) => {
      if (stdout) {
        const lines = stdout.trim().split('\n');
        lines.forEach(line => {
          const match = line.match(/\s+(\d+)\s*$/);
          if (match) {
            exec(`taskkill /pid ${match[1]} /T /F`, () => {});
          }
        });
      }
    });
  }
}

function startBackend() {
  // 不在启动前自动清理，避免误杀其他进程
  // 用户可通过托盘菜单手动清理
  
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
    const msg = data.toString().trim();
    console.log('[Backend] ' + msg);
    writeLog('Backend', msg);
  });

  backendProcess.stderr.on('data', (data) => {
    const msg = data.toString().trim();
    console.error('[Backend Error] ' + msg);
    writeLog('Backend-Error', msg);
  });

  backendProcess.on('close', (code) => {
    console.log('[Backend] exited: ' + code);
    writeLog('Backend', `Exited with code: ${code}`);
    backendProcess = null;
  });

  console.log('Backend started');
  writeLog('System', 'Backend started');
}

function startFrontend() {
  // 不在启动前自动清理，避免误杀其他进程
  
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
    const msg = data.toString().trim();
    console.log('[Frontend] ' + msg);
    writeLog('Frontend', msg);
  });

  frontendProcess.stderr.on('data', (data) => {
    const msg = data.toString().trim();
    console.error('[Frontend Error] ' + msg);
    writeLog('Frontend-Error', msg);
  });

  frontendProcess.on('close', (code) => {
    console.log('[Frontend] exited: ' + code);
    writeLog('Frontend', `Exited with code: ${code}`);
    frontendProcess = null;
  });

  console.log('Frontend started');
  writeLog('System', 'Frontend started');
}

function startAllServices() {
  startBackend();
  setTimeout(() => startFrontend(), 1000);
}

function stopBackend() {
  if (backendProcess) {
    const pid = backendProcess.pid;
    backendProcess.kill();
    backendProcess = null;
    
    // Windows: 使用 taskkill 终止进程树，确保端口释放
    if (process.platform === 'win32') {
      // 先尝试杀死进程树
      exec(`taskkill /pid ${pid} /T /F`, (err) => {
        if (err) {
          console.log('taskkill error:', err.message);
          // fallback: 查找并杀死占用端口的 node 进程 (后端实际用 3001)
          exec('netstat -ano | findstr :3001', (err2, stdout) => {
            if (stdout) {
              const match = stdout.match(/\s+(\d+)\s*$/);
              if (match) {
                exec(`taskkill /pid ${match[1]} /F`, () => {});
              }
            }
          });
        }
      });
    }
    
    console.log('Backend stopped');
    cleanupPort(3001);
  }
}

function stopFrontend() {
  if (frontendProcess) {
    const pid = frontendProcess.pid;
    frontendProcess.kill();
    frontendProcess = null;
    
    // Windows: 使用 taskkill 终止进程树，确保端口释放
    if (process.platform === 'win32') {
      exec(`taskkill /pid ${pid} /T /F`, (err) => {
        if (err) {
          console.log('taskkill error:', err.message);
          // fallback: 查找并杀死占用端口的 node 进程 (前端用 18791)
          exec('netstat -ano | findstr :18791', (err2, stdout) => {
            if (stdout) {
              const match = stdout.match(/\s+(\d+)\s*$/);
              if (match) {
                exec(`taskkill /pid ${match[1]} /F`, () => {});
              }
            }
          });
        }
      });
    }
    
    console.log('Frontend stopped');
    cleanupPort(18791);
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
  writeLog('System', 'Digital Wallpaper starting...');
  console.log('Digital Wallpaper starting...');
  try {
    createWindow();
    console.log('Window created');
  } catch (e) {
    console.error('Window create error:', e);
    writeLog('Error', 'Window create: ' + e.message);
  }
  try {
    createTray();
    console.log('Tray creation attempted');
    writeLog('System', 'Tray created');
  } catch (e) {
    console.error('Tray create error:', e);
    writeLog('Error', 'Tray create: ' + e.message);
  }
  setTimeout(() => startAllServices(), 1500);
  console.log('Ready');
  writeLog('System', 'Ready');
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
  // 退出时清理占用端口
  cleanupPort(3001);
  cleanupPort(18791);
});

process.on('uncaughtException', (error) => {
  console.error('Error:', error);
  dialog.showErrorBox('Error', error.message);
});
