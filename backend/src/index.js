/**
 * 数字人壁纸 - Agent 状态 API 服务
 * 通过 Slack 消息获取 Agent 状态
 * 端口: 3001
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createServer } from 'http';

// 导入 Slack 和 WebSocket 模块
import { initSlackClient, onMessage, startPolling, stopPolling, simulateMessage, slackConfig } from './slack.js';
import { getProtocols, generateHelpText, getConfigSchema } from './protocols.js';
import { initWebSocketServer, broadcastToAgent, broadcast, getClientCount } from './websocket.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());
app.use(express.static(join(dirname(fileURLToPath(import.meta.url)), '../public')));

// 管理页面
app.get('/admin', (req, res) => {
  res.sendFile(join(dirname(fileURLToPath(import.meta.url)), '../public/admin.html'));
});

// ============ OpenClaw 状态获取 ============

// ============ Agent 配置（不再直连 OpenClaw）============

// 从环境变量获取 Agent 列表
function getConfiguredAgents() {
  // 优先使用动态 Agent 列表（从 Slack 消息获取）
  if (dynamicAgents && Array.isArray(dynamicAgents) && dynamicAgents.length > 0) {
    return dynamicAgents;
  }

  if (process.env.AGENT_LIST) {
    try {
      let jsonStr = process.env.AGENT_LIST
        .replace(/^["']|["']$/g, '')
        .replace(/[\r\n]+/g, '')
        .replace(/\\"/g, '"')
        .trim();
      return JSON.parse(jsonStr);
    } catch (e) {
      console.error('AGENT_LIST 解析失败:', e.message);
      return null;
    }
  }
  return null;
}

// 安全解析 JSON 环境变量
function parseJsonEnv(key) {
  if (!process.env[key]) return null;
  try {
    let jsonStr = process.env[key]
      .replace(/^["']|["']$/g, '')
      .replace(/[\r\n]+/g, '')
      .replace(/\\"/g, '"')
      .trim();
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error(`${key} 解析失败:`, e.message);
    return null;
  }
}

// ============ API 路由 ============

// 获取所有 Agent 状态
app.get('/api/agents', async (req, res) => {
  try {
    console.log('📡 收到 Agent 状态请求');

    // 从环境变量获取配置
    const configuredAgents = getConfiguredAgents();

    let agents;
    if (configuredAgents && Array.isArray(configuredAgents) && configuredAgents.length > 0) {
      agents = configuredAgents;
      console.log(`✅ 使用配置的 Agent 列表 (${agents.length} 个)`);
    } else {
      // 使用默认虚拟办公场景 Agent
      agents = [
        { id: 'taizi', name: '太子', role: '项目总控', status: 'idle', currentTask: '监控全局', color: '#8b5cf6' },
        { id: 'zhongshu', name: '中书省', role: '规划决策', status: 'idle', currentTask: '待命中', color: '#3b82f6' },
        { id: 'menxia', name: '门下省', role: '审核审议', status: 'busy', currentTask: '审批中', color: '#10b981' },
        { id: 'shangshu', name: '尚书省', role: '执行派发', status: 'idle', currentTask: '待命中', color: '#f59e0b' },
        { id: 'bingbu', name: '兵部', role: '战斗部署', status: 'blocked', currentTask: '等待资源', color: '#ef4444' },
        { id: 'gongbu', name: '工部', role: '工程建设', status: 'idle', currentTask: '待命中', color: '#6366f1' },
        { id: 'hubu', name: '户部', role: '财政资源', status: 'busy', currentTask: '核算中', color: '#14b8a6' },
        { id: 'libu', name: '礼部', role: '外交礼仪', status: 'idle', currentTask: '待命中', color: '#f97316' },
        { id: 'xingbu', name: '刑部', role: '司法审判', status: 'idle', currentTask: '待命中', color: '#84cc16' },
      ];
      console.log('📋 使用默认虚拟办公场景 Agent');
    }

    res.json(agents);
  } catch (error) {
    console.error('❌ 获取 Agent 状态失败:', error);
    res.status(500).json({ error: '获取状态失败' });
  }
});

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'digital-wallpaper-api',
    wsClients: getClientCount()
  });
});

// 契约协议说明
app.get('/api/protocols', (req, res) => {
  res.json({
    name: '数字人壁纸契约协议',
    version: '1.0.0',
    protocols: getProtocols()
  });
});

app.get('/api/protocols/help', (req, res) => {
  res.type('text/plain').send(generateHelpText());
});

// 消息队列API
import { getHistory, clearHistory, setMaxHistory, getStats } from './message-queue.js';

app.get('/api/messages', (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  const messages = getHistory(limit);
  const stats = getStats();
  res.json({ messages, stats });
});

app.delete('/api/messages', (req, res) => {
  clearHistory();
  res.json({ success: true });
});

app.put('/api/messages/max', (req, res) => {
  const max = parseInt(req.body.max) || 100;
  setMaxHistory(max);
  res.json({ success: true, max });
});

// Slack 状态
app.get('/api/slack/status', (req, res) => {
  res.json({
    configured: !!slackConfig.token,
    channel: slackConfig.channelId,
    tokenPrefix: slackConfig.token ? slackConfig.token.substring(0, 7) + '...' : '未配置'
  });
});

// 前端配置（Agent列表、头像、名称等）
app.get('/api/config', (req, res) => {
  // 优先使用动态数据，否则用环境变量
  const agents = (dynamicAgents && dynamicAgents.length > 0) ? dynamicAgents : (parseJsonEnv('AGENT_LIST') || null);
  const tasks = (dynamicTasks && dynamicTasks.length > 0) ? dynamicTasks : null;

  const config = {
    // WebSocket 地址
    wsUrl: process.env.WS_URL || 'ws://localhost:3001',

    // Agent 列表（优先动态）
    agents: agents,

    // Agent 头像映射
    avatars: parseJsonEnv('AGENT_AVATARS') || {},

    // Agent 名称映射
    names: parseJsonEnv('AGENT_NAMES') || {},

    // 任务列表（优先动态）
    tasks: tasks,

    // 背景配置（优先动态）
    background: dynamicBackground || {
      mode: process.env.BACKGROUND_MODE || 'environment',
      preset: process.env.BACKGROUND_PRESET || 'city',
      color: process.env.BACKGROUND_COLOR || '#0f172a',
    }
  };
  res.json(config);
});

// 模拟消息（测试用）
app.post('/api/slack/simulate', (req, res) => {
  const { agent, action, data } = req.body;

  if (!agent || !action) {
    res.status(400).json({ error: '缺少必需参数: agent, action' });
    return;
  }

  simulateMessage({ agent, action, data: data || {} });
  res.json({ success: true, message: '模拟消息已发送' });
});

// ============ 启动 ============

// 创建 HTTP 服务器
const server = createServer(app);

// 初始化 WebSocket 服务器
initWebSocketServer(server);

// 动态 Agent 列表存储
let dynamicAgents = null;

// 动态任务列表
let dynamicTasks = [
  { id: 1, title: '调研技术方案', agent: '中书省', status: 'completed', priority: 'high' },
  { id: 2, title: '原型开发', agent: '尚书省', status: 'in-progress', priority: 'high' },
  { id: 3, title: '测试验证', agent: '门下省', status: 'pending', priority: 'medium' },
  { id: 4, title: '文档整理', agent: '礼部', status: 'pending', priority: 'low' },
];

// 动态背景配置
let dynamicBackground = null;

// 契约处理函数
const handleContract = (contract, msg) => {
  console.log('📨 收到 Slack 契约:', contract.action);

  switch (contract.action) {
    case 'agent_list_update':
      if (contract.data && contract.data.agents) {
        dynamicAgents = contract.data.agents;
        console.log(`✅ Agent 列表已更新: ${dynamicAgents.length} 个`);
        broadcast({ type: 'agent_update', agents: dynamicAgents });
      }
      break;

    case 'task_list_update':
      // 更新任务列表
      if (contract.data && contract.data.tasks) {
        dynamicTasks = contract.data.tasks;
        console.log(`✅ 任务列表已更新: ${dynamicTasks.length} 个`);
        broadcast({ type: 'task_update', tasks: dynamicTasks });
      }
      break;

    case 'status_update':
      if (contract.agent) {
        broadcastToAgent(contract.agent, { action: 'status_update', data: contract.data });
      }
      break;
    case 'task_update':
      broadcastToAgent(contract.agent, { action: 'task_update', data: contract.data });
      break;
    case 'broadcast':
      broadcast({ type: 'broadcast', data: contract.data });
      break;
    case 'avatar_action':
      if (contract.agent) {
        broadcastToAgent(contract.agent, { action: 'avatar_action', data: contract.data });
      }
      break;
    case 'background_update':
      if (contract.data) {
        dynamicBackground = contract.data;
        console.log(`✅ 背景更新: ${contract.data.preset || contract.data.mode}`);
      }
      broadcast({ type: 'background_update', data: contract.data });
      break;
    case 'effect_update':
      broadcast({ type: 'effect_update', data: contract.data });
      break;
  }
};

// 前端配置（Agent列表、头像、名称等）

// 初始化 Slack 客户端并设置消息处理
initSlackClient(process.env.SLACK_BOT_TOKEN);
onMessage((contract, msg) => {
  handleContract(contract, msg);
});

// 启动 Slack 轮询（如果配置了 token）
if (slackConfig.token) {
  startPolling();
} else {
  console.log('ℹ️ 未配置 Slack Token，跳过消息监听');
}

// 启动服务器
server.listen(PORT, () => {
  console.log(`🏛️ 数字人壁纸 API 服务已启动: http://localhost:${PORT}`);
  console.log(`📋 API 端点: http://localhost:${PORT}/api/agents`);
  console.log(`🔌 WebSocket 端点: ws://localhost:${PORT}`);
});

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('📡 收到 SIGTERM，正在关闭...');
  stopPolling();
  server.close(() => {
    console.log('✅ 服务已关闭');
    process.exit(0);
  });
});

export default app;
