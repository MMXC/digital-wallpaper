/**
 * 数字人壁纸 - 契约协议插件系统
 */

import { CONFIG_SCHEMA, CONTRACT_ACTIONS } from './config-schema.js';

/**
 * 获取所有支持的协议
 */
export function getProtocols() {
  return Object.entries(CONTRACT_ACTIONS).map(([action, info]) => ({
    action,
    name: info.name,
    description: info.description,
    schema: info.params
  }));
}

/**
 * 获取完整配置schema
 */
export function getConfigSchema() {
  return CONFIG_SCHEMA;
}

/**
 * 生成帮助文本
 */
export function generateHelpText() {
  const lines = [
    '📜 *数字人壁纸 - 契约协议*',
    '',
    '🎯 *支持的命令：*',
    ''
  ];
  
  for (const [action, info] of Object.entries(CONTRACT_ACTIONS)) {
    lines.push(`*${action}*`);
    lines.push(`  名称: ${info.name}`);
    lines.push(`  说明: ${info.description}`);
    lines.push('');
  }
  
  lines.push('---');
  lines.push('📝 *配置项说明：*');
  lines.push('');
  lines.push('*avatars* - 数字人列表');
  lines.push('*tasks* - 任务列表');
  lines.push('*environment* - 天空盒');
  lines.push('*background* - 背景');
  lines.push('*animations* - 动画');
  lines.push('*lighting* - 灯光');
  lines.push('*camera* - 相机/镜头');
  lines.push('*materials* - 材质');
  lines.push('*effects* - 特效');
  lines.push('*ui* - 界面配置');
  
  lines.push('');
  lines.push('---');
  lines.push('📝 *使用示例：*');
  lines.push('');
  
  lines.push('*更新数字人：*');
  lines.push('```json');
  lines.push(JSON.stringify({
    action: 'agent_list_update',
    data: { avatars: [{ id: 'taizi', name: '太子', status: 'idle' }] }
  }, null, 2));
  lines.push('```');
  
  lines.push('');
  lines.push('*更新天空盒：*');
  lines.push('```json');
  lines.push(JSON.stringify({
    action: 'environment_update',
    data: { environment: { preset: 'sunset' } }
  }, null, 2));
  lines.push('```');
  
  lines.push('');
  lines.push('*相机动画：*');
  lines.push('```json');
  lines.push(JSON.stringify({
    action: 'camera_update',
    data: { camera: { position: { x: 5, y: 10, z: 5 }, target: { x: 0, y: 0, z: 0 } }
  }, null, 2));
  lines.push('```');
  
  lines.push('');
  lines.push('💡 完整文档: GET http://localhost:3001/api/protocols');
  
  return lines.join('\n');
}

export default { getProtocols, getConfigSchema, generateHelpText };
