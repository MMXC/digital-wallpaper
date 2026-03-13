const { app, BrowserWindow, screen, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');

// 保持窗口引用
let mainWindow = null;
let adminWindow = null;
let previewWindow = null;

// 点击穿透状态
let clickThroughEnabled = true;

// 当前配置
let currentConfig = {
  human: './assets/default-avatar.svg',
  background: '',
  effect: '',
  bubble: {
    sender: '虚拟主播',
    text: '你好！欢迎使用数字人壁纸。',
    color: '#ffffff'
  }
};

// 资源目录
const assetsDir = path.join(__dirname, 'assets');
const resourcesUrl = 'https://example.com/digital-human-resources'; // 预设资源链接

// 确保资源目录存在
function ensureAssetsDir() {
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }
}

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

// 创建管理后台窗口
function createAdminWindow() {
  if (adminWindow) {
    adminWindow.focus();
    return;
  }

  adminWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  adminWindow.loadFile('src/admin.html');
  adminWindow.setMenuBarVisible(false);

  adminWindow.on('closed', () => {
    adminWindow = null;
  });

  console.log('[Digital Human] 管理后台已打开');
}

// 创建 360° 预览窗口
function createPreviewWindow(imageSrc) {
  if (previewWindow) {
    previewWindow.focus();
    previewWindow.loadURL(`src/preview.html?src=${encodeURIComponent(imageSrc)}`);
    return;
  }

  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  previewWindow = new BrowserWindow({
    width: width,
    height: height,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  previewWindow.loadFile('src/preview.html', {
    query: { src: imageSrc }
  });

  previewWindow.setMenuBarVisible(false);

  previewWindow.on('closed', () => {
    previewWindow = null;
  });

  console.log('[Digital Human] 360° 预览窗口已打开:', imageSrc);
}

// 创建导出窗口
function createExportWindow() {
  const exportWindow = new BrowserWindow({
    width: 900,
    height: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  exportWindow.loadFile('src/export.html');
  exportWindow.setMenuBarVisible(false);

  console.log('[Digital Human] 导出页面已打开');
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

// 导入资源文件
async function importAsset(type, fileName, fileBuffer) {
  ensureAssetsDir();
  
  const targetDir = path.join(assetsDir, type);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  
  const ext = path.extname(fileName);
  const newName = `${type}_${Date.now()}${ext}`;
  const targetPath = path.join(targetDir, newName);
  
  fs.writeFileSync(targetPath, Buffer.from(fileBuffer));
  
  console.log(`[Digital Human] 资源已导入: ${targetPath}`);
  return `./assets/${type}/${newName}`;
}

// 下载预设资源
async function downloadResource(type) {
  const resourceMap = {
    'skypack': { name: '天空盒包', file: 'skypack.zip' },
    'human': { name: '数字人模型', file: 'humans.zip' },
    'effects': { name: '特效包', file: 'effects.zip' }
  };
  
  const resource = resourceMap[type];
  if (!resource) {
    console.log('[Digital Human] 未知资源类型:', type);
    return;
  }
  
  // 显示下载对话框
  const result = await dialog.showMessageBox({
    type: 'info',
    title: '资源下载',
    message: `即将下载 ${resource.name}`,
    detail: '预设资源将下载到本地 assets 目录。\n实际部署时请配置真实资源链接。',
    buttons: ['确定', '取消']
  });
  
  if (result.response === 0) {
    console.log('[Digital Human] 开始下载:', resource.name);
    // 这里可以添加实际的下载逻辑
    // 示例: shell.openExternal(resourcesUrl + '/' + resource.file);
  }
}

app.whenReady().then(() => {
  console.log('[Digital Human] 应用启动');
  ensureAssetsDir();
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

// IPC: 打开管理后台
ipcMain.on('open-admin', () => {
  createAdminWindow();
});

// IPC: 打开导出页面
ipcMain.on('open-export', () => {
  createExportWindow();
});

// IPC: 打开 360° 预览
ipcMain.on('open-360-preview', (event, imageSrc) => {
  createPreviewWindow(imageSrc || currentConfig.background);
});

// IPC: 关闭预览窗口
ipcMain.on('close-preview', () => {
  if (previewWindow) {
    previewWindow.close();
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

// IPC: 选择资产
ipcMain.on('select-asset', (event, { type, src }) => {
  console.log(`[Digital Human] 选择资产: ${type} -> ${src}`);
  currentConfig[type] = src;
  
  // 通知主窗口更新
  mainWindow?.webContents.send('asset-changed', { type, src });
});

// IPC: 导入资源
ipcMain.handle('import-asset', async (event, { type, fileName, data }) => {
  try {
    const resultPath = await importAsset(type, fileName, data);
    return { success: true, path: resultPath };
  } catch (error) {
    console.error('[Digital Human] 导入失败:', error);
    return { success: false, error: error.message };
  }
});

// IPC: 下载资源
ipcMain.on('download-resource', (event, type) => {
  downloadResource(type);
});

// IPC: 获取当前配置
ipcMain.handle('get-config', () => {
  return currentConfig;
});

// IPC: 更新配置
ipcMain.on('update-config', (event, config) => {
  currentConfig = { ...currentConfig, ...config };
  console.log('[Digital Human] 配置已更新:', currentConfig);
});

module.exports = { mainWindow };
