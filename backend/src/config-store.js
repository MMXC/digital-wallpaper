/**
 * 数字人壁纸 - 配置中心
 * 
 * 内存中的运行时配置
 */

// 当前激活的配置
export let currentConfig = {
  // 数字人
  avatars: [
    { id: 'taizi', name: '太子', role: '项目总控', status: 'idle', color: '#8b5cf6' },
    { id: 'zhongshu', name: '中书省', role: '规划决策', status: 'busy', color: '#3b82f6' },
    { id: 'shangshu', name: '尚书省', role: '执行派发', status: 'idle', color: '#10b981' }
  ],
  // 任务
  tasks: [
    { id: 1, title: '调研方案', agent: '中书省', status: 'in-progress', priority: 'high' },
    { id: 2, title: '开发实现', agent: '尚书省', status: 'pending', priority: 'medium' }
  ],
  // 天空盒
  environment: { preset: 'city', blur: 0 },
  // 背景
  background: { mode: 'environment' },
  // 特效
  effects: [],
  // UI
  ui: { taskBoard: { enabled: true, position: 'top-right', maxTasks: 6 } }
};

export function getConfig() {
  return currentConfig;
}

export function updateConfig(newConfig) {
  currentConfig = { ...currentConfig, ...newConfig };
  return currentConfig;
}

export function updateEnvironment(preset) {
  currentConfig.environment = { preset, blur: 0 };
  return currentConfig;
}

export function updateAvatars(avatars) {
  currentConfig.avatars = avatars;
  return currentConfig;
}

export function updateTasks(tasks) {
  currentConfig.tasks = tasks;
  return currentConfig;
}

export function addEffect(effect) {
  currentConfig.effects.push(effect);
  return currentConfig;
}

export function clearEffects() {
  currentConfig.effects = [];
  return currentConfig;
}

export default {
  getConfig,
  updateConfig,
  updateEnvironment,
  updateAvatars,
  updateTasks,
  addEffect,
  clearEffects
};
