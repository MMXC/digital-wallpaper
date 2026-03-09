const { app, BrowserWindow, screen, ipcMain } = require('electron');
const path = require('path');

// 保持窗口引用
let mainWindow = null;

// 点击穿透状态
let clickThroughEnabled = true;

// 创建透明置顶窗口
function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  mainWindow = new BrowserWindow({
    width: width,
    height: height,
    x: 0,
    y: 0,
    frame: false,           // 无边框
    transparent: true,     // 透明背景
    alwaysOnTop: true,     // 置顶
    skipTaskbar: true,      // 不显示在任务栏
    resizable: false,       // 禁止调整大小
    hasShadow: false,       // 无阴影
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      // WebView2 配置
      webviewTag: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // 加载数字人页面
  mainWindow.loadFile('src/index.html');

  // 调试用：打开开发者工具
  // mainWindow.webContents.openDevTools();

  // 默认启用点击穿透，让鼠标事件穿透到下层应用
  if (clickThroughEnabled) {
    mainWindow.setIgnoreMouseEvents(true, { forward: true });
    console.log('[Digital Human] 点击穿透已启用');
  }

  console.log('[Digital Human] 透明窗口已创建');
}

// 切换点击穿透模式
function setClickThrough(enabled) {
  clickThroughEnabled = enabled;
  if (mainWindow) {
    mainWindow.setIgnoreMouseEvents(enabled, { forward: true });
    console.log(`[Digital Human] 点击穿透已${enabled ? '启用' : '禁用'}`);
  }
}

// 设置窗口为桌面背景（方法1：API方式）
function setAsDesktop() {
  if (process.platform !== 'win32') {
    console.log('[Digital Human] 仅支持Windows');
    return;
  }
  
  // Windows API 调用需要通过原生模块
  // 这里仅记录日志
  console.log('[Digital Human] 桌面模式需要管理员权限');
}

app.whenReady().then(() => {
  console.log('[Digital Human] 应用启动');
  createWindow();
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC: 接收消息用于数字人播报
ipcMain.on('display-message', (event, message) => {
  console.log('[Digital Human] 收到消息:', message);
  // 转发给渲染进程
  mainWindow?.webContents.send('new-message', message);
});

// IPC: 语音控制
ipcMain.on('speak-text', (event, text) => {
  console.log('[Digital Human] TTS播报:', text);
  // 这里可以调用edge-tts
});

// IPC: 切换点击穿透模式
ipcMain.on('set-click-through', (event, enabled) => {
  setClickThrough(enabled);
});

// IPC: 获取当前点击穿透状态
ipcMain.handle('get-click-through', () => {
  return clickThroughEnabled;
});

module.exports = { mainWindow };
