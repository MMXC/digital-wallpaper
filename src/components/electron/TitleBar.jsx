/**
 * 标题栏组件 - Electron 专用
 * 用于无边框窗口的自定义标题栏
 */

import { useState } from 'react';

export default function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false);
  
  const handleMinimize = () => {
    window.electronAPI?.minimize();
  };
  
  const handleMaximize = () => {
    window.electronAPI?.maximize();
    setIsMaximized(!isMaximized);
  };
  
  const handleClose = () => {
    window.electronAPI?.close();
  };
  
  return (
    <div style={styles.titleBar}>
      <div style={styles.dragRegion}>
        <span style={styles.title}>数字人壁纸</span>
      </div>
      <div style={styles.controls}>
        <button 
          style={styles.btn} 
          onClick={handleMinimize}
          title="最小化"
        >
          ─
        </button>
        <button 
          style={styles.btn} 
          onClick={handleMaximize}
          title={isMaximized ? "还原" : "最大化"}
        >
          {isMaximized ? '❐' : '□'}
        </button>
        <button 
          style={{...styles.btn, ...styles.closeBtn}} 
          onClick={handleClose}
          title="关闭"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

const styles = {
  titleBar: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    height: '36px',
    backgroundColor: '#0f0f1a',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 9999,
    WebkitAppRegion: 'drag',
    userSelect: 'none'
  },
  dragRegion: {
    flex: 1,
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    paddingLeft: '16px'
  },
  title: {
    color: '#888',
    fontSize: '13px',
    fontWeight: '500'
  },
  controls: {
    display: 'flex',
    height: '100%',
    WebkitAppRegion: 'no-drag'
  },
  btn: {
    width: '46px',
    height: '100%',
    border: 'none',
    background: 'transparent',
    color: '#888',
    fontSize: '12px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.15s'
  },
  closeBtn: {
    // backgroundColor: '#e74c3c'
  }
};

// 添加 hover 效果
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    .title-bar-btn:hover { background-color: #333 !important; }
    .title-bar-close:hover { background-color: #e74c3c !important; color: white !important; }
  `;
  document.head.appendChild(style);
}
