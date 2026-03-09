const { contextBridge, ipcRenderer } = require('electron');

// 暴露安全的API给渲染进程
contextBridge.exposeInMainWorld('digitalHuman', {
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
  
  // 获取平台信息
  platform: process.platform
});
