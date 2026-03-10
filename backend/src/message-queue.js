/**
 * 数字人壁纸 - 消息队列管理
 * 
 * 管理接收到的Slack消息
 */

let messageHistory = [];
let maxHistory = 100;  // 默认保留100条

export function addMessage(msg) {
  messageHistory.unshift({
    ...msg,
    timestamp: new Date().toISOString()
  });
  
  // 限制历史数量
  if (messageHistory.length > maxHistory) {
    messageHistory = messageHistory.slice(0, maxHistory);
  }
}

export function getHistory(limit = 50) {
  return messageHistory.slice(0, limit);
}

export function clearHistory() {
  messageHistory = [];
}

export function setMaxHistory(max) {
  maxHistory = max;
  if (messageHistory.length > maxHistory) {
    messageHistory = messageHistory.slice(0, maxHistory);
  }
}

export function getStats() {
  const now = Date.now();
  const lastHour = messageHistory.filter(m => 
    new Date(m.timestamp).getTime() > now - 3600000
  ).length;
  
  return {
    total: messageHistory.length,
    lastHour,
    max: maxHistory
  };
}

export default {
  addMessage,
  getHistory,
  clearHistory,
  setMaxHistory,
  getStats
};
