/**
 * Slack 消息契约协议
 * 
 * 支持的命令格式:
 * 
 * 1. agent_list_update - 更新 Agent 列表
 * {"action": "agent_list_update", "data": {"agents": [...]}}
 * 
 * 2. task_list_update - 更新任务面板
 * {"action": "task_list_update", "data": {"tasks": [{"id":1,"title":"任务","agent":"尚书省","status":"in-progress","priority":"high"}]}}
 * 
 * 3. status_update - 更新单个 Agent 状态
 * {"action": "status_update", "agent": "taizi", "data": {"status": "busy", "currentTask": "处理中"}}
 * 
 * 4. broadcast - 广播消息给所有 Agent
 * {"action": "broadcast", "data": {"message": "hello"}}
 * 
 * 5. avatar_action - Avatar 动作/表情
 * {"action": "avatar_action", "agent": "taizi", "data": {"action": "dance", "emotion": "happy"}}
 * 
 * 6. background_update - 更新背景
 * {"action": "background_update", "data": {"mode": "environment", "preset": "city"}}
 * {"action": "background_update", "data": {"mode": "static", "color": "#000000"}}
 * {"action": "background_update", "data": {"mode": "video", "url": "https://..."}}
 * 
 * 7. effect_update - 特效
 * {"action": "effect_update", "data": {"effect": "confetti", "duration": 3000}}
 */

import 'dotenv/config';
import { WebClient } from '@slack/web-api';

// Slack 客户端
let slackClient = null;

// 配置
const config = {
  token: process.env.SLACK_BOT_TOKEN || '',
  channelId: process.env.SLACK_CHANNEL_ID || 'C081L0VCKL4',
  pollingInterval: 3000,
  listenUsers: process.env.SLACK_LISTEN_USERS ? process.env.SLACK_LISTEN_USERS.split(',') : null,
  ignoreBots: true,
  filterKeywords: null,  // 处理所有包含 action 的 JSON
};

let pollingTimer = null;
let lastTimestamp = null;
let messageCallback = null;

/**
 * 初始化 Slack 客户端
 */
export function initSlackClient(token) {
  if (token) {
    config.token = token;
  }
  
  if (!config.token) {
    console.warn('⚠️ Slack Bot Token 未配置，使用模拟模式');
    return false;
  }
  
  slackClient = new WebClient(config.token);
  console.log('✅ Slack 客户端已初始化');
  return true;
}

/**
 * 设置消息回调
 */
export function onMessage(callback) {
  messageCallback = callback;
}

/**
 * 解析 JSON 契约
 */
function parseContract(text) {
  // 尝试解析 JSON
  try {
    // 清理文本：移除代码块标记和其他markdown
    let cleanText = text
      .replace(/```json?\n?/g, '')
      .replace(/```/g, '')
      .replace(/\*\*[^*]+\*\*/g, '')  // 移除 **bold**
      .replace(/\*[^*]+\*/g, '')       // 移除 *italic*
      .trim();
    
    // 查找 JSON 对象（从 { 到 }）
    const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      console.log('🔍 解析到的JSON:', jsonMatch[0].substring(0, 100));
      const data = JSON.parse(jsonMatch[0]);
      
      // 验证必需字段
      if (data.action) {
        return {
          valid: true,
          agent: data.agent || null,
          action: data.action,
          data: data.data || {},
          raw: text
        };
      }
    }
  } catch (e) {
    // 静默处理解析错误
  }
  
  return { valid: false };
}

/**
 * 获取频道历史消息
 */
async function fetchMessages() {
  if (!slackClient) {
    return [];
  }
  
  try {
    const result = await slackClient.conversations.history({
      channel: config.channelId,
      limit: 10,
      oldest: lastTimestamp || undefined
    });
    
    if (result.ok && result.messages) {
      // 更新 lastTimestamp
      if (result.messages.length > 0) {
        lastTimestamp = result.messages[0].ts;
      }
      
      // 返回消息（过滤）
      return result.messages
        .filter(msg => {
          // 排除机器人消息
          if (config.ignoreBots && (msg.bot_id || msg.subtype === 'bot_message')) {
            console.log('🤖 跳过机器人消息');
            return false;
          }
          
          // 过滤指定用户
          if (config.listenUsers && config.listenUsers.length > 0) {
            const userId = msg.user;
            if (!userId || !config.listenUsers.includes(userId)) return false;
          }
          
          console.log('📩 消息内容:', msg.text?.substring(0, 100));
          
          return true;
        })
        .reverse(); // 从旧到新
    }
  } catch (error) {
    console.error('❌ 获取 Slack 消息失败:', error.message);
  }
  
  return [];
}

/**
 * 处理消息
 */
async function processMessages() {
  const messages = await fetchMessages();
  
  for (const msg of messages) {
    if (msg.text && messageCallback) {
      // 尝试解析 JSON 契约
      const contract = parseContract(msg.text);
      
      if (contract.valid) {
        console.log('📨 收到有效契约:', contract.action);
        messageCallback(contract, msg);
      }
    }
  }
}

/**
 * 开始轮询
 */
export function startPolling(interval) {
  if (pollingTimer) {
    clearInterval(pollingTimer);
  }
  
  const pollInterval = interval || config.pollingInterval;
  pollingTimer = setInterval(processMessages, pollInterval);
  console.log(`🔄 Slack 消息轮询已启动 (间隔: ${pollInterval}ms)`);
}

/**
 * 停止轮询
 */
export function stopPolling() {
  if (pollingTimer) {
    clearInterval(pollingTimer);
    pollingTimer = null;
    console.log('⏹️ Slack 消息轮询已停止');
  }
}

/**
 * 发送测试消息（模拟）
 */
export function simulateMessage(contract) {
  if (messageCallback) {
    messageCallback(contract, { text: 'simulated' });
  }
}

// 导出配置
export { config as slackConfig };
