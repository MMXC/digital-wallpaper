/**
 * WebSocket 服务模块
 * 在后端建立 WebSocket 服务器，转发消息给前端
 */

import { WebSocketServer } from 'ws';

let wss = null;
let clients = new Set();
let messageCallback = null;

/**
 * 初始化 WebSocket 服务器
 */
export function initWebSocketServer(server) {
  wss = new WebSocketServer({ server });
  
  wss.on('connection', (ws, req) => {
    console.log('🔌 新 WebSocket 客户端连接');
    clients.add(ws);
    
    // 发送连接成功消息
    ws.send(JSON.stringify({
      type: 'connected',
      timestamp: new Date().toISOString()
    }));
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        handleClientMessage(ws, message);
      } catch (e) {
        console.error('❌ 消息解析失败:', e.message);
      }
    });
    
    ws.on('close', () => {
      console.log('🔌 WebSocket 客户端断开');
      clients.delete(ws);
    });
    
    ws.on('error', (error) => {
      console.error('❌ WebSocket 错误:', error.message);
      clients.delete(ws);
    });
  });
  
  console.log('✅ WebSocket 服务器已启动');
  return wss;
}

/**
 * 处理客户端消息
 */
function handleClientMessage(ws, message) {
  console.log('📨 收到客户端消息:', message.type);
  
  // 可以处理客户端的订阅请求等
  if (message.type === 'subscribe') {
    ws.send(JSON.stringify({
      type: 'subscribed',
      agents: message.agents || []
    }));
  }
}

/**
 * 广播消息给所有客户端
 */
export function broadcast(message) {
  const data = JSON.stringify({
    ...message,
    timestamp: new Date().toISOString()
  });
  
  let count = 0;
  clients.forEach((client) => {
    if (client.readyState === 1) { // WebSocket.OPEN
      client.send(data);
      count++;
    }
  });
  
  console.log(`📢 广播消息给 ${count} 个客户端`);
  return count;
}

/**
 * 发送消息给特定 Agent 的订阅者
 */
export function broadcastToAgent(agentId, message) {
  const data = JSON.stringify({
    type: 'agent_update',
    agent: agentId,
    ...message,
    timestamp: new Date().toISOString()
  });
  
  let count = 0;
  clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(data);
      count++;
    }
  });
  
  return count;
}

/**
 * 设置消息处理回调
 */
export function onMessage(callback) {
  messageCallback = callback;
}

/**
 * 获取连接数
 */
export function getClientCount() {
  return clients.size;
}

/**
 * 关闭所有连接
 */
export function closeAll() {
  clients.forEach((client) => {
    client.close();
  });
  clients.clear();
  
  if (wss) {
    wss.close();
    wss = null;
  }
  console.log('🔌 WebSocket 服务已关闭');
}

export { wss, clients };
