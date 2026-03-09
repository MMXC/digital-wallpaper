/**
 * Electron 主进程 - 数字人壁纸桌面应用
 * 
 * 功能:
 * - 窗口管理 (无边框/全屏)
 * - 系统托盘 + 右键菜单
 * - 内置 Slack 中间件 (Socket Mode)
 * - WebSocket 服务转发给渲染进程
 * - 设置界面 (GUI)
 */

import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, dialog, shell } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { WebSocketServer } from 'ws';
import { App } from '@slack/bolt';
import { WebClient } from '@slack/web-api';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============ 配置 ============
const CONFIG_FILE = path.join(app.getPath('userData'), 'config.json');
const WS_PORT = 18790;
let mainWindow = null;
let tray = null;
let wss = null;
let slackApp = null;
let slackClient = null;
let isSlackRunning = false;

// 默认配置
let config = {
  slackBotToken: '',
  slackAppToken: '',
  targetChannelId: '',
  autoStart: true
};

// ============ 工具函数 ============
function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
      config = { ...config, ...JSON.parse(data) };
      console.log('✅ 配置已加载');
    }
  } catch (e) {
    console.error('❌ 配置加载失败:', e);
  }
}

function saveConfig(newConfig) {
  config = { ...config, ...newConfig };
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
    console.log('✅ 配置已保存');
    return true;
  } catch (e) {
    console.error('❌ 配置保存失败:', e);
    return false;
  }
}

// ============ WebSocket 服务 ============
function startWebSocketServer() {
  if (wss) {
    wss.close();
  }
  
  wss = new WebSocketServer({ host: '127.0.0.1', port: WS_PORT });
  console.log(`🎯 WebSocket服务端启动: ws://127.0.0.1:${WS_PORT}`);
  
  wss.on('connection', (ws) => {
    console.log('✅ 渲染进程已连接');
    mainWindow?.webContents.send('ws-status', { connected: true });
    
    ws.on('close', () => {
      console.log('❌ 渲染进程断开连接');
      mainWindow?.webContents.send('ws-status', { connected: false });
    });
    
    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        console.log('📥 收到渲染进程消息:', msg);
      } catch (e) {}
    });
  });
  
  wss.on('error', (err) => {
    console.error('❌ WebSocket错误:', err);
  });
}

function broadcastToWallpaper(data) {
  if (!wss) return;
  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(JSON.stringify(data));
    }
  });
  // 同时发给渲染进程
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('avatar-action', data);
  }
}

// ============ Slack 中间件 ============
async function startSlackMiddleware() {
  if (!config.slackBotToken || !config.slackAppToken) {
    console.log('⚠️ Slack Token 未配置');
    return false;
  }
  
  if (isSlackRunning) {
    console.log('ℹ️ Slack 已运行');
    return true;
  }
  
  try {
    slackApp = new App({
      signingSecret: '', // Socket Mode 不需要
      token: config.slackBotToken,
      socketMode: true,
      appToken: config.slackAppToken,
    });
    
    slackClient = new WebClient(config.slackBotToken);
    
    // 解析 Avatar 动作契约
    function parseAvatarAction(messageText) {
      try {
        let jsonStr = messageText.trim();
        if (jsonStr.startsWith('```json')) {
          jsonStr = jsonStr.slice(7);
        } else if (jsonStr.startsWith('```')) {
          jsonStr = jsonStr.slice(3);
        }
        if (jsonStr.endsWith('```')) {
          jsonStr = jsonStr.slice(0, -3);
        }
        
        const parsed = JSON.parse(jsonStr.trim());
        if (parsed.protocol !== 'avatar_action_v1') {
          return null;
        }
        
        return {
          protocol: parsed.protocol,
          agent: parsed.agent || 'unknown',
          action: parsed.action || 'idle',
          text: parsed.text || '',
          emotion: parsed.emotion || 'neutral',
          target: parsed.target || '',
          timestamp: new Date().toISOString()
        };
      } catch (e) {
        return null;
      }
    }
    
    // 消息处理
    slackApp.message(async ({ message, say }) => {
      if (message.subtype === 'bot_message') return;
      
      const text = message.text || '';
      console.log('📥 收到Slack消息:', text.substring(0, 100));
      
      const avatarAction = parseAvatarAction(text);
      
      if (avatarAction) {
        console.log('✅ 解析到Avatar动作:', avatarAction);
        broadcastToWallpaper(avatarAction);
        
        await say({
          text: `✅ 已转发动作给数字人: ${avatarAction.action} (${avatarAction.emotion})`,
          thread_ts: message.ts
        });
      }
    });
    
    await slackApp.start();
    isSlackRunning = true;
    console.log('✅ Slack 中间件已启动');
    
    mainWindow?.webContents.send('slack-status', { running: true });
    return true;
  } catch (error) {
    console.error('❌ Slack 启动失败:', error);
    mainWindow?.webContents.send('slack-status', { running: false, error: error.message });
    return false;
  }
}

async function stopSlackMiddleware() {
  if (slackApp) {
    try {
      await slackApp.stop();
      slackApp = null;
      slackClient = null;
      isSlackRunning = false;
      console.log('✅ Slack 中间件已停止');
      mainWindow?.webContents.send('slack-status', { running: false });
      return true;
    } catch (e) {
      console.error('❌ 停止Slack失败:', e);
      return false;
    }
  }
  return true;
}

// ============ 窗口管理 ============
function createWindow() {
  const isDev = !app.isPackaged;
  
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    frame: false,
    transparent: false,
    backgroundColor: '#000000',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true
    },
    icon: path.join(__dirname, '../public/icon.png'),
    show: false
  });
  
  // 加载页面
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
  
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    console.log('✅ 窗口已显示');
  });
  
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
  
  // 最小化到托盘
  mainWindow.on('minimize', () => {
    // 可以选择最小化到托盘
  });
  
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      return false;
    }
    return true;
  });
}

// ============ 系统托盘 ============
function createTray() {
  // 创建托盘图标 (使用内建的图标)
  const iconPath = path.join(__dirname, '../public/icon.png');
  let trayIcon;
  
  if (fs.existsSync(iconPath)) {
    trayIcon = nativeImage.createFromPath(iconPath);
    trayIcon = trayIcon.resize({ width: 16, height: 16 });
  } else {
    // 创建一个简单的默认图标
    trayIcon = nativeImage.createEmpty();
  }
  
  tray = new Tray(trayIcon);
  
  updateTrayMenu();
  
  tray.setToolTip('数字人壁纸');
  
  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
      }
    }
  });
}

function updateTrayMenu() {
  const contextMenu = Menu.buildFromTemplate([
    {
      label: mainWindow?.isVisible() ? '隐藏窗口' : '显示窗口',
      click: () => {
        if (mainWindow) {
          if (mainWindow.isVisible()) {
            mainWindow.hide();
          } else {
            mainWindow.show();
          }
        }
        updateTrayMenu();
      }
    },
    { type: 'separator' },
    {
      label: isSlackRunning ? '⏹ 停止 Slack' : '▶ 启动 Slack',
      click: async () => {
        if (isSlackRunning) {
          await stopSlackMiddleware();
        } else {
          await startSlackMiddleware();
        }
        updateTrayMenu();
      }
    },
    {
      label: '⚙ 设置',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.webContents.send('open-settings');
        }
      }
    },
    { type: 'separator' },
    {
      label: '❌ 退出',
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);
  
  tray?.setContextMenu(contextMenu);
}

// ============ IPC 通信 ============
function setupIPC() {
  // 获取配置
  ipcMain.handle('get-config', () => {
    return config;
  });
  
  // 保存配置
  ipcMain.handle('save-config', (event, newConfig) => {
    const result = saveConfig(newConfig);
    if (result && newConfig.autoStart !== undefined) {
      updateTrayMenu();
    }
    return result;
  });
  
  // 启动 Slack
  ipcMain.handle('start-slack', async () => {
    const result = await startSlackMiddleware();
    updateTrayMenu();
    return result;
  });
  
  // 停止 Slack
  ipcMain.handle('stop-slack', async () => {
    const result = await stopSlackMiddleware();
    updateTrayMenu();
    return result;
  });
  
  // 获取状态
  ipcMain.handle('get-status', () => {
    return {
      slackRunning: isSlackRunning,
      wsPort: WS_PORT,
      config: {
        hasBotToken: !!config.slackBotToken,
        hasAppToken: !!config.slackAppToken,
        hasChannelId: !!config.targetChannelId
      }
    };
  });
  
  // 窗口控制
  ipcMain.on('window-minimize', () => mainWindow?.minimize());
  ipcMain.on('window-maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });
  ipcMain.on('window-close', () => mainWindow?.hide());
  ipcMain.on('window-quit', () => {
    app.isQuitting = true;
    app.quit();
  });
  
  // 检查更新
  ipcMain.handle('check-updates', async () => {
    // 可以添加自动更新逻辑
    return { hasUpdate: false };
  });
}

// ============ 应用生命周期 ============
app.whenReady().then(() => {
  console.log('🚀 数字人壁纸应用启动');
  
  loadConfig();
  startWebSocketServer();
  createWindow();
  createTray();
  setupIPC();
  
  // 自动启动 Slack（如果配置了）
  if (config.autoStart && config.slackBotToken && config.slackAppToken) {
    setTimeout(() => {
      startSlackMiddleware().then(() => updateTrayMenu());
    }, 2000);
  }
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // 不退出，最小化到托盘
  }
});

app.on('before-quit', async () => {
  app.isQuitting = true;
  if (slackApp) {
    await slackApp.stop();
  }
  if (wss) {
    wss.close();
  }
});
