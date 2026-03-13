const { contextBridge, ipcRenderer } = require('electron');

// 暴露安全的API给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // ===== 窗口管理 =====
  // 打开管理后台
  openAdmin: () => ipcRenderer.send('open-admin'),
  
  // 打开导出页面
  openExport: () => ipcRenderer.send('open-export'),
  
  // 打开 360° 预览
  open360Preview: (imageSrc) => ipcRenderer.send('open-360-preview', imageSrc),
  
  // 关闭预览窗口
  closePreview: () => ipcRenderer.send('close-preview'),
  
  // ===== 资产管理 =====
  // 选择资产
  selectAsset: (type, src) => ipcRenderer.send('select-asset', { type, src }),
  
  // 导入资源
  importAsset: async (type, fileName) => {
    // 这里可以添加文件读取逻辑
    return { success: true };
  },
  
  // 下载资源
  downloadResource: (type) => ipcRenderer.send('download-resource', type),
  
  // ===== 配置管理 =====
  // 获取当前配置
  getConfig: async () => await ipcRenderer.invoke('get-config'),
  
  // 更新配置
  updateConfig: (config) => ipcRenderer.send('update-config', config),
  
  // ===== 数字人控制 =====
  // 接收新消息
  onNewMessage: (callback) => {
    ipcRenderer.on('new-message', (event, message) => callback(message));
  },
  
  // 发送消息显示请求
  displayMessage: (message) => {
    ipcRenderer.send('display-message', message);
  },
  
  // 语音播报
  speak: (text) => {
    ipcRenderer.send('speak-text', text);
  },
  
  // ===== 点击穿透 =====
  // 设置点击穿透
  setClickThrough: (enabled) => {
    ipcRenderer.send('set-click-through', enabled);
  },
  
  // 获取点击穿透状态
  getClickThrough: async () => {
    return await ipcRenderer.invoke('get-click-through');
  },
  
  // ===== 资产变更通知 =====
  // 监听资产变化
  onAssetChanged: (callback) => {
    ipcRenderer.on('asset-changed', (event, data) => callback(data));
  },
  
  // ===== 平台信息 =====
  platform: process.platform
});

// 同时保持向后兼容
contextBridge.exposeInMainWorld('digitalHuman', {
  onNewMessage: (callback) => {
    ipcRenderer.on('new-message', (event, message) => callback(message));
  },
  displayMessage: (message) => {
    ipcRenderer.send('display-message', message);
  },
  speak: (text) => {
    ipcRenderer.send('speak-text', text);
  },
  setClickThrough: (enabled) => {
    ipcRenderer.send('set-click-through', enabled);
  },
  getClickThrough: async () => {
    return await ipcRenderer.invoke('get-click-through');
  },
  platform: process.platform
});
