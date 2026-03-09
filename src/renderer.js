// 渲染进程 - 数字人控制
class DigitalHumanController {
  constructor() {
    this.messageBubble = document.getElementById('message-bubble');
    this.messageText = document.getElementById('message-text');
    this.humanImage = document.getElementById('human-image');
    this.messageTimer = null;
    this.clickThroughEnabled = true;
    
    // 初始化
    this.init();
    this.initControlPanel();
  }
  
  init() {
    // 监听来自主进程的消息
    if (window.digitalHuman) {
      window.digitalHuman.onNewMessage((message) => {
        this.displayMessage(message);
      });
    }
    
    console.log('[Renderer] 数字人控制器已初始化');
  }
  
  // 初始化控制面板
  initControlPanel() {
    const btnClickThrough = document.getElementById('btn-click-through');
    const btnToggleHuman = document.getElementById('btn-toggle-human');
    
    // 点击穿透切换
    btnClickThrough.addEventListener('click', () => {
      this.clickThroughEnabled = !this.clickThroughEnabled;
      
      // 通过IPC通知主进程
      if (window.digitalHuman) {
        window.digitalHuman.setClickThrough(this.clickThroughEnabled);
      }
      
      // 更新按钮状态
      btnClickThrough.textContent = this.clickThroughEnabled ? '🖱 点击穿透: 开' : '🖱 点击穿透: 关';
      btnClickThrough.className = this.clickThroughEnabled ? 'active' : 'inactive';
    });
    
    // 数字人显示/隐藏切换
    btnToggleHuman.addEventListener('click', () => {
      const isVisible = this.humanImage.style.display !== 'none';
      this.humanImage.style.display = isVisible ? 'none' : 'block';
      btnToggleHuman.textContent = isVisible ? '👤 显示数字人' : '👤 隐藏数字人';
    });
  }
  
  // 显示消息气泡
  displayMessage(message) {
    // 清除之前的定时器
    if (this.messageTimer) {
      clearTimeout(this.messageTimer);
    }
    
    // 设置消息内容
    this.messageText.textContent = message.text || message.content || '';
    
    // 显示气泡
    this.messageBubble.style.display = 'block';
    
    // 触发数字人动画（可以替换为视频）
    this.triggerAnimation();
    
    // 5秒后自动隐藏
    this.messageTimer = setTimeout(() => {
      this.messageBubble.style.display = 'none';
    }, 5000);
  }
  
  // 触发数字人动画
  triggerAnimation() {
    // 简单的动画效果：缩放一下
    this.humanImage.style.transform = 'scale(1.05)';
    setTimeout(() => {
      this.humanImage.style.transform = 'scale(1)';
    }, 300);
    
    // TODO: 可以在这里替换为SadTalker生成的视频
  }
  
  // 切换到WebView模式（SadTalker等）
  enableWebView(url) {
    const webviewContainer = document.getElementById('webview-container');
    const humanImage = document.getElementById('human-image');
    
    humanImage.style.display = 'none';
    webviewContainer.style.display = 'block';
    
    const webview = document.getElementById('sadtalker-webview');
    webview.src = url;
  }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
  window.controller = new DigitalHumanController();
  
  // 测试：模拟收到消息
  // setTimeout(() => {
  //   window.controller.displayMessage({
  //     text: '测试消息：你好！我是你的数字人助手！'
  //   });
  // }, 2000);
});
