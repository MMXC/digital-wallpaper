/**
 * 数字人壁纸 - 配置中心
 * 
 * 支持文件持久化
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONFIG_FILE = path.join(__dirname, '../config.json');

// 默认配置
const defaultConfig = {
  avatars: [
    { id: 'taizi', name: '太子', role: '项目总控', status: 'idle', color: '#8b5cf6' },
    { id: 'zhongshu', name: '中书省', role: '规划决策', status: 'busy', color: '#3b82f6' },
    { id: 'shangshu', name: '尚书省', role: '执行派发', status: 'idle', color: '#10b981' }
  ],
  tasks: [
    { id: 1, title: '调研方案', agent: '中书省', status: 'in-progress', priority: 'high' },
    { id: 2, title: '开发实现', agent: '尚书省', status: 'pending', priority: 'medium' }
  ],
  environment: { preset: 'city', blur: 0 },
  background: { mode: 'environment' },
  effects: [],
  ui: { taskBoard: { enabled: true, position: 'top-right', maxTasks: 6 } }
};

// 加载配置
function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, 'utf8');
      const saved = JSON.parse(data);
      console.log('✅ 配置已从文件加载:', CONFIG_FILE);
      return { ...defaultConfig, ...saved };
    }
  } catch (e) {
    console.log('⚠️ 加载配置失败，使用默认:', e.message);
  }
  return { ...defaultConfig };
}

// 保存配置
function saveConfig(config) {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
    console.log('✅ 配置已保存到文件:', CONFIG_FILE);
  } catch (e) {
    console.log('⚠️ 保存配置失败:', e.message);
  }
}

// 当前激活的配置
export let currentConfig = loadConfig();

export function getConfig() {
  return currentConfig;
}

export function updateConfig(newConfig) {
  currentConfig = { ...currentConfig, ...newConfig };
  saveConfig(currentConfig);
  return currentConfig;
}

export function updateEnvironment(preset) {
  currentConfig.environment = { preset, blur: 0 };
  saveConfig(currentConfig);
  return currentConfig;
}

export function updateAvatars(avatars) {
  currentConfig.avatars = avatars;
  saveConfig(currentConfig);
  return currentConfig;
}

export function updateTasks(tasks) {
  currentConfig.tasks = tasks;
  saveConfig(currentConfig);
  return currentConfig;
}

export function addEffect(effect) {
  currentConfig.effects.push(effect);
  saveConfig(currentConfig);
  return currentConfig;
}

export function clearEffects() {
  currentConfig.effects = [];
  saveConfig(currentConfig);
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
