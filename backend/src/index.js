/**
 * 数字人壁纸 - Agent 状态 API 服务
 * 通过 Slack 消息获取 Agent 状态
 * 端口: 3001
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createServer } from 'http';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync, rmSync, promises as fs } from 'fs';

// 导入 Slack 和 WebSocket 模块
import { initSlackClient, onMessage, startPolling, stopPolling, simulateMessage, slackConfig } from './slack.js';
import { getProtocols, generateHelpText, getConfigSchema } from './protocols.js';
import { initWebSocketServer, broadcastToAgent, broadcast, getClientCount } from './websocket.js';
import configStore from './config-store.js';
import { checkForUpdates, getResources, CURRENT_VERSION, autoCheckUpdate, setBroadcast } from './updater.js';
// Phase 1: 资源管理模块
import resourceApi from './resource-api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());
app.use(express.static(join(dirname(fileURLToPath(import.meta.url)), '../public')));
app.use('/assets', express.static(join(dirname(fileURLToPath(import.meta.url)), '../../dist/assets')));
app.use('/uploads', express.static(join(dirname(fileURLToPath(import.meta.url)), '../public/uploads')));

// 管理页面
app.get('/admin', (req, res) => {
  res.sendFile(join(dirname(fileURLToPath(import.meta.url)), '../public/admin.html'));
});

// 前端首页
app.get('/', (req, res) => {
  const distPath = join(dirname(fileURLToPath(import.meta.url)), '../../dist/index.html');
  if (existsSync(distPath)) {
    res.sendFile(distPath);
  } else {
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>数字人壁纸 - 需要构建</title>
        <style>
          body { font-family: system-ui; max-width: 600px; margin: 50px auto; padding: 20px; background: #0f172a; color: #fff; }
          .box { background: #1e293b; padding: 30px; border-radius: 12px; text-align: center; }
          .btn { display: inline-block; background: #6366f1; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 20px; }
          code { background: #334155; padding: 2px 6px; border-radius: 4px; }
        </style>
      </head>
      <body>
        <div class="box">
          <h1>🎭 需要构建前端</h1>
          <p>请先运行以下命令构建前端：</p>
          <p><code>npm run build</code></p>
          <p>然后刷新此页面</p>
          <a href="/admin" class="btn">打开管理界面</a>
        </div>
      </body>
      </html>
    `);
  }
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
  const agents = (dynamicAgents && dynamicAgents.length > 0) ? dynamicAgents : (parseJsonEnv('AGENT_LIST') || null);
  const tasks = (dynamicTasks && dynamicTasks.length > 0) ? dynamicTasks : null;

  const config = {
    wsUrl: process.env.WS_URL || 'ws://localhost:3001',
    agents: agents,
    avatars: parseJsonEnv('AGENT_AVATARS') || {},
    names: parseJsonEnv('AGENT_NAMES') || {},
    tasks: tasks,
    environment: dynamicEnvironment || {
      preset: 'city'
    },
    avatar: dynamicAvatar,
    background: dynamicBackground || {
      mode: process.env.BACKGROUND_MODE || 'environment',
      preset: process.env.BACKGROUND_PRESET || 'city',
      color: process.env.BACKGROUND_COLOR || '#0f172a',
    },
    environment: configStore.getConfig().environment || { preset: 'city' },
    avatar: configStore.getConfig().avatar || null,
    effects: configStore.getConfig().effects || []
  };
  res.json(config);
});

// 配置更新 API（管理界面用）
app.put('/api/config/environment', (req, res) => {
  const { preset } = req.body;
  const config = configStore.updateEnvironment(preset);
  dynamicBackground = { preset: preset };
  broadcast({ type: 'environment_update', data: config.environment });
  res.json({ success: true, config });
});

app.put('/api/config/background', (req, res) => {
  const { mode, src } = req.body;
  configStore.updateConfig({ background: { mode, src } });
  dynamicBackground = { mode, src };
  broadcast({ type: 'background_update', data: { mode, src } });
  res.json({ success: true, background: { mode, src } });
});

app.put('/api/config/avatars', (req, res) => {
  const { avatars, avatar } = req.body;
  
  // 如果传的是单个 avatar（应用数字人图片）
  if (avatar) {
    configStore.updateConfig({ currentAvatar: avatar });
    dynamicAvatar = avatar;
    broadcast({ type: 'avatar_update', data: { avatar: avatar } });
    res.json({ success: true, avatar: avatar });
    return;
  }
  
  // 如果传的是整个 avatars 数组
  const config = configStore.updateAvatars(avatars);
  dynamicAvatar = avatars;
  broadcast({ type: 'avatars_update', data: config.avatars });
  res.json({ success: true, config });
});

app.put('/api/config/tasks', (req, res) => {
  const { tasks } = req.body;
  const config = configStore.updateTasks(tasks);
  broadcast({ type: 'tasks_update', data: config.tasks });
  res.json({ success: true, config });
});

app.post('/api/config/effect', (req, res) => {
  const { effect } = req.body;
  const config = configStore.addEffect(effect);
  broadcast({ type: 'effect_add', data: effect });
  res.json({ success: true, config });
});

app.delete('/api/config/effects', (req, res) => {
  const config = configStore.clearEffects();
  broadcast({ type: 'effects_clear', data: {} });
  res.json({ success: true, config });
});

// 获取/设置运行时配置（模拟环境变量）
app.get('/api/config/runtime', (req, res) => {
  res.json({
    agents: dynamicAgents || parseJsonEnv('AGENT_LIST'),
    avatars: parseJsonEnv('AGENT_AVATARS'),
    names: parseJsonEnv('AGENT_NAMES'),
    slackChannel: process.env.SLACK_CHANNEL_ID || '',
    wsUrl: process.env.WS_URL || 'ws://localhost:3001'
  });
});

app.put('/api/config/runtime', (req, res) => {
  const { agents, avatars, names, slackChannel } = req.body;
  
  if (agents) dynamicAgents = agents;
  if (avatars) process.env.AGENT_AVATARS = JSON.stringify(avatars);
  if (names) process.env.AGENT_NAMES = JSON.stringify(names);
  if (slackChannel) process.env.SLACK_CHANNEL_ID = slackChannel;
  
  // 广播更新
  broadcast({ type: 'config_update', data: { agents, avatars, names } });
  
  res.json({ success: true });
});

// 检查更新
app.get('/api/update/check', async (req, res) => {
  const result = await checkForUpdates();
  res.json(result);
});

// Phase 1: 资源管理 API
app.use('/api/resources', resourceApi);

// 获取资源列表 (旧版兼容性)
app.get('/api/resources', async (req, res) => {
  const resources = await getResources();
  res.json(resources);
});

// 获取当前版本
app.get('/api/version', (req, res) => {
  res.json({ version: CURRENT_VERSION });
});

// ============ 文件上传 ============
const uploadDir = join(dirname(fileURLToPath(import.meta.url)), '../public/uploads');
if (!existsSync(uploadDir)) {
  mkdirSync(uploadDir, { recursive: true });
}

// 配置 multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    cb(null, unique + '-' + file.originalname);
  }
});
const upload = multer({ 
  storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// 上传文件
app.post('/api/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: '没有文件' });
    return;
  }
  
  // 根据 folder 参数保存到对应目录
  const folder = req.query.folder || 'uploads';
  let targetFolder = folder;
  
  // 目录映射
  const folderMap = { human: 'human', bg: 'bg', effect: 'effect', uploads: 'uploads' };
  targetFolder = folderMap[targetFolder] || 'uploads';
  
  console.log('[上传] folder:', folder, '-> targetFolder:', targetFolder);
  let targetDir, targetUrl;
  
  if (targetFolder !== 'uploads') {
    targetDir = join(dirname(fileURLToPath(import.meta.url)), `../public/assets/${targetFolder}`);
    targetUrl = `/assets/${targetFolder}/${req.file.filename}`;
  } else {
    targetDir = join(dirname(fileURLToPath(import.meta.url)), `../public/uploads`);
    targetUrl = `/uploads/${req.file.filename}`;
  }
  
  // 确保目录存在
  if (!existsSync(targetDir)) {
    mkdirSync(targetDir, { recursive: true });
  }
  
  // 移动文件到目标目录（跨目录移动使用 copy + unlink）
  const sourcePath = req.file.path;
  const targetPath = join(targetDir, req.file.filename);
  try {
    await fs.copyFile(sourcePath, targetPath);
    await fs.unlink(sourcePath);
  } catch (e) {
    console.error('移动文件失败:', e);
    res.status(500).json({ error: '保存文件失败: ' + e.message });
    return;
  }
  
  const fileInfo = {
    filename: req.file.filename,
    originalName: req.file.originalname,
    size: req.file.size,
    mimetype: req.file.mimetype,
    url: targetUrl,
    uploadedAt: new Date().toISOString()
  };
  
  res.json({ success: true, file: fileInfo });
});

// 上传 Wall (.paper Engine 包zip)
app.post('/api/upload/wallpaper', upload.single('package'), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: '没有文件' });
    return;
  }
  
  // 解析 project.json
  let projectInfo = null;
  
  try {
    // 这里可以添加 zip 解析逻辑
    // 暂时返回基本信息
    projectInfo = {
      name: req.file.originalname.replace('.zip', ''),
      size: req.file.size
    };
  } catch (e) {
    console.error('解析失败:', e);
  }
  
  res.json({ 
    success: true, 
    file: {
      filename: req.file.filename,
      url: '/uploads/' + req.file.filename,
      project: projectInfo
    }
  });
});

// 获取已上传文件列表
app.get('/api/uploads', (req, res) => {
  try {
    const files = readdirSync(uploadDir).map(filename => {
      const filepath = join(uploadDir, filename);
      const stats = statSync(filepath);
      return {
        filename,
        size: stats.size,
        uploadedAt: stats.mtime.toISOString()
      };
    });
    res.json({ files });
  } catch (e) {
    res.json({ files: [] });
  }
});

// 删除上传文件
app.delete('/api/uploads/:filename', (req, res) => {
  const filepath = join(uploadDir, req.params.filename);
  if (existsSync(filepath)) {
    rmSync(filepath);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: '文件不存在' });
  }
});

// 导入单个模块（天空盒/特效/材质）
app.post('/api/import/module', upload.single('module'), (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: '没有文件' });
    return;
  }
  
  const { type } = req.body; // environment, effect, material, avatar
  const filename = req.file.filename;
  const moduleDir = join(dirname(fileURLToPath(import.meta.url)), '../../resources', type);
  
  // 创建模块目录
  if (!existsSync(moduleDir)) {
    mkdirSync(moduleDir, { recursive: true });
  }
  
  // 移动文件
  const destPath = join(moduleDir, filename);
  const srcPath = join(uploadDir, filename);
  
  try {
    // 如果是 zip，解压
    if (filename.endsWith('.zip')) {
      // TODO: 解压逻辑
      res.json({ success: true, message: '模块已上传，待处理', type, filename });
    } else {
      // 直接复制
      const fs = require('fs');
      fs.copyFileSync(srcPath, destPath);
      res.json({ success: true, type, filename, url: `/resources/${type}/${filename}` });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
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
let dynamicEnvironment = null;
let dynamicAvatar = null;

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
  
  // 设置广播函数并自动检查更新
  setBroadcast(broadcast);
  autoCheckUpdate();
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

// ============ 资源目录扫描 API ============
app.get('/api/assets/list', (req, res) => {
  const publicDir = join(dirname(fileURLToPath(import.meta.url)), '../public');
  const assetsDir = join(publicDir, 'assets');
  
  const scanDir = (dir, basePath = '') => {
    const result = [];
    if (!existsSync(dir)) return result;
    
    try {
      const files = readdirSync(dir);
      for (const file of files) {
        const fullPath = join(dir, file);
        const stat = statSync(fullPath);
        if (stat.isDirectory()) {
          result.push(...scanDir(fullPath, `${basePath}/${file}`));
        } else {
          const ext = file.toLowerCase().slice(file.lastIndexOf('.'));
          const validExts = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.mp4', '.webm'];
          if (validExts.includes(ext)) {
            result.push({
              name: file.replace(ext, ''),
              filename: file,
              path: `${basePath}/${file}`,
              src: `/assets${basePath}/${file}`,
              ext: ext,
              type: (basePath.replace('/assets/', '') || '/').replace(/^\//, '') || 'other'
            });
          }
        }
      }
    } catch (e) {
      console.error('扫描目录失败:', e);
    }
    return result;
  };
  
  const assets = scanDir(assetsDir);
  res.json({ assets });
});

app.post('/api/config/reload-preview', (req, res) => {
  broadcast({ type: 'preview_reload', data: {} });
  res.json({ success: true });
});

// 内置资源
app.get('/api/resources', (req, res) => {
  const builtIn = {
    environments: [
      { id: 'city', name: '城市', icon: '🏙️', desc: '现代城市景观' },
      { id: 'sunset', name: '日落', icon: '🌅', desc: '暖色调日落' },
      { id: 'night', name: '夜晚', icon: '🌃', desc: '城市夜景' },
      { id: 'forest', name: '森林', icon: '🌲', desc: '自然森林' },
      { id: 'dawn', name: '黎明', icon: '🌅', desc: '清晨日出' },
      { id: 'studio', name: '工作室', icon: '🎬', desc: '专业摄影棚' },
      { id: 'park', name: '公园', icon: '🌳', desc: '郊外公园' },
      { id: 'lobby', name: '大堂', icon: '🏨', desc: '酒店大堂' },
    ],
    effects: [
      { id: 'fireworks', name: '烟花', icon: '🎆', desc: '节日烟花效果' },
      { id: 'rain', name: '雨', icon: '🌧️', desc: '雨天雨滴效果' },
      { id: 'snow', name: '雪', icon: '❄️', desc: '飘雪效果' },
      { id: 'sunlight', name: '阳光', icon: '☀️', desc: '洒落的光线' },
      { id: 'stars', name: '星空', icon: '⭐', desc: '夜空星星' },
      { id: 'leaves', name: '落叶', icon: '🍂', desc: '飘落的树叶' },
    ],
    humans: [
      { id: 'assistant', name: '助手', icon: '🤖', desc: 'AI 助手形象' },
      { id: 'business', name: '商务', icon: '👔', desc: '商务人士' },
      { id: 'anime', name: '二次元', icon: '🎨', desc: '动漫风格' },
    ]
  };
  res.json({ builtIn });
});
