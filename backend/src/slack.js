/**
 * Slack 消息监听模块
 * 从 Slack 频道获取消息并解析 JSON 契约
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
    // 清理文本：移除代码块标记
    let cleanText = text
      .replace(/```json?\n?/g, '')
      .replace(/```/g, '')
      .trim();
    
    // 查找 JSON 块
    const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
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
          
          // 关键词过滤：包含关键词 OR 包含 action 的 JSON 契约
          if (config.filterKeywords && config.filterKeywords.length > 0) {
            const text = msg.text || '';
            const hasKeyword = config.filterKeywords.some(kw => text.includes(kw));
            const hasActionJson = text.includes('"action"');
            if (!hasKeyword && !hasActionJson) return false;
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
