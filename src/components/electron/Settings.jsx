/**
 * 设置面板组件 - Electron 专用
 */

import { useState, useEffect } from 'react';

export default function Settings({ onClose }) {
  const [config, setConfig] = useState({
    slackBotToken: '',
    slackAppToken: '',
    targetChannelId: '',
    autoStart: true
  });
  const [status, setStatus] = useState({
    slackRunning: false,
    wsPort: 18790,
    config: { hasBotToken: false, hasAppToken: false, hasChannelId: false }
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadData();
    
    // 监听 Slack 状态变化
    window.electronAPI?.onSlackStatus((data) => {
      setStatus(prev => ({ ...prev, slackRunning: data.running }));
    });
    
    // 监听打开设置事件
    window.electronAPI?.onOpenSettings(() => {
      loadData();
    });
    
    return () => {
      window.electronAPI?.removeAllListeners('slack-status');
      window.electronAPI?.removeAllListeners('open-settings');
    };
  }, []);

  async function loadData() {
    try {
      const [cfg, st] = await Promise.electronAPI?..all([
        windowgetConfig(),
        window.electronAPI?.getStatus()
      ]);
      if (cfg) setConfig(cfg);
      if (st) setStatus(st);
    } catch (e) {
      console.error('加载配置失败:', e);
    }
  }

  async function handleSave() {
    setSaving(true);
    setMessage('');
    
    try {
      const result = await window.electronAPI?.saveConfig(config);
      if (result) {
        setMessage('✅ 配置已保存');
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage('❌ 保存失败');
      }
    } catch (e) {
      setMessage('❌ 保存失败: ' + e.message);
    }
    
    setSaving(false);
  }

  async function toggleSlack() {
    try {
      if (status.slackRunning) {
        await window.electronAPI?.stopSlack();
      } else {
        await window.electronAPI?.startSlack();
      }
      // 刷新状态
      const st = await window.electronAPI?.getStatus();
      if (st) setStatus(st);
    } catch (e) {
      setMessage('❌ 操作失败: ' + e.message);
    }
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.panel}>
        <div style={styles.header}>
          <h2 style={styles.title}>⚙️ 设置</h2>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
        
        <div style={styles.content}>
          {/* Slack 配置 */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>🔗 Slack 配置</h3>
            
            <div style={styles.field}>
              <label style={styles.label}>Bot Token (xoxb-...)</label>
              <input
                type="password"
                style={styles.input}
                value={config.slackBotToken}
                onChange={(e) => setConfig({ ...config, slackBotToken: e.target.value })}
                placeholder="xoxb-xxxxxxxxxxxx-xxxxxxxxxxxx"
              />
            </div>
            
            <div style={styles.field}>
              <label style={styles.label}>App Token (xapp-...)</label>
              <input
                type="password"
                style={styles.input}
                value={config.slackAppToken}
                onChange={(e) => setConfig({ ...config, slackAppToken: e.target.value })}
                placeholder="xapp-xxxxxxxxxxxx-xxxxxxxxxxxx"
              />
            </div>
            
            <div style={styles.field}>
              <label style={styles.label}>目标频道 ID</label>
              <input
                type="text"
                style={styles.input}
                value={config.targetChannelId}
                onChange={(e) => setConfig({ ...config, targetChannelId: e.target.value })}
                placeholder="C0123456789"
              />
            </div>
          </div>
          
          {/* 运行状态 */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>📊 运行状态</h3>
            
            <div style={styles.statusRow}>
              <span>Slack 连接:</span>
              <span style={{
                ...styles.statusBadge,
                backgroundColor: status.slackRunning ? '#4ecca3' : '#666'
              }}>
                {status.slackRunning ? '已启动' : '未启动'}
              </span>
            </div>
            
            <div style={styles.statusRow}>
              <span>WebSocket 端口:</span>
              <span style={styles.statusValue}>{status.wsPort}</span>
            </div>
            
            <button
              style={{
                ...styles.button,
                backgroundColor: status.slackRunning ? '#e74c3c' : '#4ecca3'
              }}
              onClick={toggleSlack}
            >
              {status.slackRunning ? '⏹ 停止 Slack' : '▶ 启动 Slack'}
            </button>
          </div>
          
          {/* 自动启动 */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>🚀 启动选项</h3>
            
            <label style={styles.checkbox}>
              <input
                type="checkbox"
                checked={config.autoStart}
                onChange={(e) => setConfig({ ...config, autoStart: e.target.checked })}
              />
              <span>启动时自动连接 Slack</span>
            </label>
          </div>
          
          {message && (
            <div style={styles.message}>{message}</div>
          )}
          
          <div style={styles.actions}>
            <button
              style={{...styles.button, backgroundColor: '#4ecca3'}}
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? '保存中...' : '💾 保存配置'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  },
  panel: {
    backgroundColor: '#1a1a2e',
    borderRadius: '16px',
    width: '480px',
    maxHeight: '80vh',
    overflow: 'hidden',
    boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    borderBottom: '1px solid #333'
  },
  title: {
    margin: 0,
    color: '#fff',
    fontSize: '20px'
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#888',
    fontSize: '20px',
    cursor: 'pointer',
    padding: '4px'
  },
  content: {
    padding: '24px',
    overflowY: 'auto',
    maxHeight: 'calc(80vh - 80px)'
  },
  section: {
    marginBottom: '24px'
  },
  sectionTitle: {
    margin: '0 0 16px',
    color: '#4ecca3',
    fontSize: '16px'
  },
  field: {
    marginBottom: '16px'
  },
  label: {
    display: 'block',
    color: '#aaa',
    fontSize: '14px',
    marginBottom: '6px'
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid #333',
    backgroundColor: '#0f0f1a',
    color: '#fff',
    fontSize: '14px',
    boxSizing: 'border-box'
  },
  statusRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
    color: '#aaa',
    fontSize: '14px'
  },
  statusBadge: {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    color: '#fff'
  },
  statusValue: {
    color: '#fff',
    fontFamily: 'monospace'
  },
  button: {
    width: '100%',
    padding: '12px',
    borderRadius: '8px',
    border: 'none',
    color: '#fff',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    marginTop: '8px'
  },
  checkbox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: '#aaa',
    cursor: 'pointer'
  },
  message: {
    padding: '12px',
    borderRadius: '8px',
    backgroundColor: '#333',
    color: '#fff',
    marginBottom: '16px',
    fontSize: '14px'
  },
  actions: {
    marginTop: '24px'
  }
};
