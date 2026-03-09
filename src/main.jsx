/**
 * 数字人壁纸应用入口
 * 支持 Electron 和 浏览器环境
 */

import { StrictMode, useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// Electron 组件
import TitleBar from './components/electron/TitleBar.jsx';
import Settings from './components/electron/Settings.jsx';

// 检测是否在 Electron 环境中
const isElectron = typeof window !== 'undefined' && window.electronAPI;

// 主应用包装器
function Root() {
  const [showSettings, setShowSettings] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [slackStatus, setSlackStatus] = useState({ running: false });
  const [avatarAction, setAvatarAction] = useState(null);
  
  useEffect(() => {
    if (!isElectron) return;
    
    // 监听 WebSocket 状态
    window.electronAPI?.onWsStatus((data) => {
      setWsConnected(data.connected);
    });
    
    // 监听 Slack 状态
    window.electronAPI?.onSlackStatus((data) => {
      setSlackStatus(data);
    });
    
    // 监听 Avatar 动作
    window.electronAPI?.onAvatarAction((data) => {
      console.log('收到 Avatar 动作:', data);
      setAvatarAction(data);
      // 3秒后清除
      setTimeout(() => setAvatarAction(null), 3000);
    });
    
    // 监听打开设置
    window.electronAPI?.onOpenSettings(() => {
      setShowSettings(true);
    });
    
    return () => {
      window.electronAPI?.removeAllListeners('ws-status');
      window.electronAPI?.removeAllListeners('slack-status');
      window.electronAPI?.removeAllListeners('avatar-action');
      window.electronAPI?.removeAllListeners('open-settings');
    };
  }, []);
  
  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
      {/* Electron 标题栏 */}
      {isElectron && <TitleBar />}
      
      {/* 状态指示器 (Electron 模式) */}
      {isElectron && (
        <div style={styles.statusBar}>
          <div style={styles.statusItem}>
            <span style={{
              ...styles.statusDot,
              backgroundColor: wsConnected ? '#4ecca3' : '#e74c3c'
            }} />
            <span>WS {wsConnected ? '已连接' : '未连接'}</span>
          </div>
          <div style={styles.statusItem}>
            <span style={{
              ...styles.statusDot,
              backgroundColor: slackStatus.running ? '#4ecca3' : '#666'
            }} />
            <span>Slack {slackStatus.running ? '运行中' : '未启动'}</span>
          </div>
          <button 
            style={styles.settingsBtn}
            onClick={() => setShowSettings(true)}
          >
            ⚙️ 设置
          </button>
        </div>
      )}
      
      {/* Avatar 动作提示 */}
      {avatarAction && (
        <div style={styles.actionPopup}>
          <div style={styles.actionBadge}>
            🤖 {avatarAction.agent}: {avatarAction.action}
          </div>
          {avatarAction.text && (
            <div style={styles.actionText}>{avatarAction.text}</div>
          )}
        </div>
      )}
      
      {/* 主应用 */}
      <App />
      
      {/* 设置面板 */}
      {showSettings && (
        <Settings onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
}

const styles = {
  statusBar: {
    position: 'fixed',
    bottom: '16px',
    left: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '8px 16px',
    backgroundColor: 'rgba(15, 15, 26, 0.9)',
    borderRadius: '24px',
    zIndex: 100
  },
  statusItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    color: '#aaa',
    fontSize: '12px'
  },
  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%'
  },
  settingsBtn: {
    padding: '6px 12px',
    backgroundColor: '#4ecca3',
    border: 'none',
    borderRadius: '12px',
    color: '#000',
    fontSize: '12px',
    fontWeight: 'bold',
    cursor: 'pointer'
  },
  actionPopup: {
    position: 'fixed',
    top: '60px',
    right: '16px',
    zIndex: 200,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '8px'
  },
  actionBadge: {
    padding: '8px 16px',
    backgroundColor: 'rgba(78, 204, 163, 0.9)',
    borderRadius: '8px',
    color: '#000',
    fontSize: '14px',
    fontWeight: 'bold'
  },
  actionText: {
    padding: '6px 12px',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: '6px',
    color: '#000',
    fontSize: '12px'
  }
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Root />
  </StrictMode>
);
