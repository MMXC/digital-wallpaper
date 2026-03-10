/**
 * Slack 消息监听模块
 * 从 Slack 频道获取消息并解析 JSON 契约
 */

import { WebClient } from '@slack/web-api';

// Slack 客户端
let slackClient = null;

// 配置
// 确保 dotenv 已加载
import 'dotenv/config';

const config = {
  token: process.env.SLACK_BOT_TOKEN || '',
  channelId: process.env.SLACK_CHANNEL_ID || 'C081L0VCKL4', // 默认频道
  pollingInterval: 3000, // 3秒轮询
  
  // 监听配置
  listenUsers: process.env.SLACK_LISTEN_USERS ? process.env.SLACK_LISTEN_USERS.split(',') : null,  // 只监听指定用户，null=监听全部
  ignoreBots: true,  // 忽略机器人消息
  
  // 消息过滤：匹配关键词才处理
  filterKeywords: ['任务', 'agent', 'status', '状态'],  // null=处理所有消息
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
    // 查找 JSON 块
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || 
                     text.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      const jsonStr = jsonMatch[1] || jsonMatch[0];
      const data = JSON.parse(jsonStr);
      
      // 验证必需字段
      if (data.agent && data.action) {
        return {
          valid: true,
          agent: data.agent,
          action: data.action,
          data: data.data || {},
          raw: text
        };
      }
    }
  } catch (e) {
    console.log('JSON 解析失败:', e.message);
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
          if (config.ignoreBots && (msg.bot_id || msg.subtype === 'bot_message')) return false;
          
          // 过滤指定用户
          if (config.listenUsers && config.listenUsers.length > 0) {
            const userId = msg.user;
            if (!userId || !config.listenUsers.includes(userId)) return false;
          }
          
          // 关键词过滤
          if (config.filterKeywords && config.filterKeywords.length > 0) {
            const text = msg.text || '';
            if (!config.filterKeywords.some(kw => text.includes(kw))) return false;
          }
          
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
        console.log('📨 收到有效契约:', contract);
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
