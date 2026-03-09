/**
 * 数字人壁纸 - Agent 状态 API 服务
 * 从 OpenClaw Gateway 获取 Agent 状态并提供给前端
 * 端口: 3001
 */

import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// ============ OpenClaw 状态获取 ============

// 运行 openclaw agents list 命令
function getOpenClawAgents() {
  return new Promise((resolve) => {
    const proc = spawn('openclaw', ['agents', 'list'], {
      shell: true,
      env: { ...process.env }
    });
    
    let output = '';
    let errorOutput = '';
    
    proc.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    proc.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    proc.on('close', (code) => {
      if (code !== 0) {
        console.error('OpenClaw CLI error:', errorOutput);
        resolve(null);
        return;
      }
      
      // 解析输出
      try {
        const agents = parseAgentsList(output);
        resolve(agents);
      } catch (e) {
        console.error('Parse error:', e);
        resolve(null);
      }
    });
    
    proc.on('error', (err) => {
      console.error('Spawn error:', err);
      resolve(null);
    });
  });
}

// 解析 openclaw agents list 输出
function parseAgentsList(output) {
  const agents = [];
  const lines = output.split('\n');
  
  let currentAgent = null;
  
  for (const line of lines) {
    // 检测 Agent 名称 (如 "taizi (default)")
    const nameMatch = line.match(/^-\s+(\w+)/);
    if (nameMatch) {
      if (currentAgent) {
        agents.push(currentAgent);
      }
      currentAgent = {
        id: nameMatch[1],
        name: nameMatch[1],
        status: 'idle',  // 默认状态
        currentTask: '待命中',
        color: getAgentColor(nameMatch[1]),
      };
      
      // 检查是否是 default
      if (line.includes('(default)')) {
        currentAgent.isDefault = true;
      }
    }
    
    // 检测 Identity
    if (currentAgent && line.includes('Identity:')) {
      const identityMatch = line.match(/Identity:\s+(.+)/);
      if (identityMatch) {
        currentAgent.identity = identityMatch[1].trim();
      }
    }
    
    // 检测 Workspace
    if (currentAgent && line.includes('Workspace:')) {
      const wsMatch = line.match(/Workspace:\s+(.+)/);
      if (wsMatch) {
        currentAgent.workspace = wsMatch[1].trim();
      }
    }
  }
  
  if (currentAgent) {
    agents.push(currentAgent);
  }
  
  return agents;
}

// 根据 Agent 名称获取颜色
function getAgentColor(agentId) {
  const colors = {
    'taizi': '#8b5cf6',     // 紫色
    'zhongshu': '#3b82f6',  // 蓝色
    'menxia': '#10b981',    // 绿色
    'shangshu': '#f59e0b',  // 橙色
    'bingbu': '#ef4444',    // 红色
    'gongbu': '#6366f1',    // 靛蓝
    'hubu': '#14b8a6',      // 青色
    'libu': '#f97316',      // 橙黄
    'xingbu': '#84cc16',    // 草绿
  };
  return colors[agentId] || '#6b7280';
}

// 根据 Agent 名称获取角色
function getAgentRole(agentId) {
  const roles = {
    'taizi': '项目总控',
    'zhongshu': '规划决策',
    'menxia': '审核审议',
    'shangshu': '执行派发',
    'bingbu': '战斗部署',
    'gongbu': '工程建设',
    'hubu': '财政资源',
    'libu': '外交礼仪',
    'xingbu': '司法审判',
  };
  return roles[agentId] || '未知职能';
}

// ============ 模拟状态更新 ============

// 模拟任务状态（实际应从 OpenClaw Gateway 获取）
function simulateTaskStatus(agents) {
  // 基于时间和随机因素更新状态
  const now = Date.now();
  
  return agents.map((agent, index) => {
    // 伪随机状态生成
    const seed = (now + index * 1000) % 10000;
    let status = 'idle';
    let currentTask = '待命中';
    
    if (seed < 2000) {
      status = 'idle';
      currentTask = '待命中';
    } else if (seed < 7000) {
      status = 'busy';
      const tasks = ['处理审批', '执行任务', '分析数据', '撰写报告', '协调资源'];
      currentTask = tasks[index % tasks.length];
    } else {
      status = 'blocked';
      currentTask = '等待资源';
    }
    
    return {
      ...agent,
      role: agent.role || getAgentRole(agent.id),
      status,
      currentTask,
      lastUpdate: new Date().toISOString(),
    };
  });
}

// ============ API 路由 ============

// 获取所有 Agent 状态
app.get('/api/agents', async (req, res) => {
  try {
    console.log('📡 收到 Agent 状态请求');
    
    const openClawAgents = await getOpenClawAgents();
    
    let agents;
    if (openClawAgents && openClawAgents.length > 0) {
      agents = simulateTaskStatus(openClawAgents);
      console.log(`✅ 从 OpenClaw 获取到 ${agents.length} 个 Agent`);
    } else {
      // 使用默认虚拟办公场景的 Agent
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
    service: 'digital-wallpaper-api'
  });
});

// ============ 启动 ============

app.listen(PORT, () => {
  console.log(`🏛️ 数字人壁纸 API 服务已启动: http://localhost:${PORT}`);
  console.log(`📋 API 端点: http://localhost:${PORT}/api/agents`);
});

export default app;
