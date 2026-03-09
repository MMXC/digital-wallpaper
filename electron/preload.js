/**
 * 预加载脚本 - 安全桥接渲染进程和主进程
 */

const { contextBridge, ipcRenderer } = require('electron');

// 暴露给渲染进程的 API
contextBridge.exposeInMainWorld('electronAPI', {
  // 配置
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),
  
  // Slack 控制
  startSlack: () => ipcRenderer.invoke('start-slack'),
  stopSlack: () => ipcRenderer.invoke('stop-slack'),
  
  // 状态查询
  getStatus: () => ipcRenderer.invoke('get-status'),
  
  // 窗口控制
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  quit: () => ipcRenderer.send('window-quit'),
  
  // 事件监听
  onAvatarAction: (callback) => {
    ipcRenderer.on('avatar-action', (event, data) => callback(data));
  },
  
  onSlackStatus: (callback) => {
    ipcRenderer.on('slack-status', (event, data) => callback(data));
  },
  
  onWsStatus: (callback) => {
    ipcRenderer.on('ws-status', (event, data) => callback(data));
  },
  
  onOpenSettings: (callback) => {
    ipcRenderer.on('open-settings', () => callback());
  },
  
  // 移除监听
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  }
});

console.log('✅ Preload 脚本已加载');
