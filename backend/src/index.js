/**
 * Slack 中间件 - Avatar Action Gateway
 * 
 * 架构: Slack Socket Mode → 解析JSON契约 → WebSocket转发 → Wallpaper Engine
 * 端口: 18790 (WebSocket)
 */

import { App } from '@slack/bolt';
import { WebSocketServer } from 'ws';
import dotenv from 'dotenv';

dotenv.config();

// ============ 配置 ============
const PORT = 18790;
const WS_HOST = '127.0.0.1';

// Slack App 配置 (需要从 Slack API 获取)
const SLACK_SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET || '';
const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN || '';
const SLACK_APP_TOKEN = process.env.SLACK_APP_TOKEN || '';

// ============ WebSocket 服务端 (转发给壁纸) ============
const wss = new WebSocketServer({ host: WS_HOST, port: PORT });

console.log(`🎯 WebSocket服务端启动: ws://${WS_HOST}:${PORT}`);

wss.on('connection', (ws) => {
  console.log('✅ Wallpaper Engine 已连接');
  
  ws.on('close', () => {
    console.log('❌ Wallpaper Engine 断开连接');
  });
});

// 广播消息给所有连接的壁纸客户端
function broadcastToWallpaper(data) {
  wss.clients.forEach((client) => {
    if (client.readyState === 1) { // WebSocket.OPEN
      client.send(JSON.stringify(data));
      console.log('📤 已转发到壁纸:', data.action);
    }
  });
}

// ============ Slack Socket Mode App ============
const app = new App({
  signingSecret: SLACK_SIGNING_SECRET,
  token: SLACK_BOT_TOKEN,
  socketMode: true,
  appToken: SLACK_APP_TOKEN,
});

console.log('🔌 Slack Socket Mode 启动中...');

// ============ 消息处理 ============
/**
 * 解析 Slack 消息中的 JSON 契约
 * 支持格式:
 * {
 *   "protocol": "avatar_action_v1",
 *   "agent": "Dev_A",
 *   "action": "speak",
 *   "text": "代码已提交",
 *   "emotion": "happy",
 *   "target": "PM_Bot"
 * }
 */
function parseAvatarAction(messageText) {
  try {
    // 尝试提取 JSON (可能包含在代码块中)
    let jsonStr = messageText.trim();
    
    // 去除可能的 ```json 或 ``` 包裹
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.slice(7);
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.slice(3);
    }
    if (jsonStr.endsWith('```')) {
      jsonStr = jsonStr.slice(0, -3);
    }
    
    const parsed = JSON.parse(jsonStr.trim());
    
    // 验证协议版本
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

// 监听 Slack 消息
app.message(async ({ message, say }) => {
  // 忽略机器人消息
  if (message.subtype === 'bot_message') return;
  
  const text = message.text || '';
  console.log('📥 收到Slack消息:', text.substring(0, 100));
  
  // 解析 JSON 契约
  const avatarAction = parseAvatarAction(text);
  
  if (avatarAction) {
    console.log('✅ 解析到Avatar动作契约:', avatarAction);
    
    // 转发给 Wallpaper Engine
    broadcastToWallpaper(avatarAction);
    
    // 回复确认
    await say({
      text: `✅ 已转发动作给数字人: ${avatarAction.action} (${avatarAction.emotion})`,
      thread_ts: message.ts
    });
  } else {
    console.log('ℹ️ 消息不包含Avatar契约，跳过');
  }
});

// ============ 启动 ============
(async () => {
  try {
    await app.start();
    console.log('✅ Slack Bolt App 已启动 (Socket Mode)');
    console.log('📋 等待 Slack 消息...');
  } catch (error) {
    console.error('❌ 启动失败:', error);
    process.exit(1);
  }
})();

// ============ 健康检查 ============
process.on('SIGTERM', () => {
  console.log('🛑 收到SIGTERM，关闭服务...');
  wss.close();
  app.stop();
  process.exit(0);
});
