/**
 * 数字人壁纸 - 契约协议插件系统
 * 
 * 支持的契约类型和格式说明
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
  lines.push('📝 *使用示例：*');
  lines.push('');
  
  // 示例
  lines.push('*更新任务：*');
  lines.push('```json');
  lines.push(JSON.stringify({
    action: 'task_list_update',
    data: {
      tasks: [
        { id: 1, title: '新任务', agent: '尚书省', status: 'in-progress', priority: 'high' }
      ]
    }
  }, null, 2));
  lines.push('```');
  
  lines.push('');
  lines.push('*更新背景：*');
  lines.push('```json');
  lines.push(JSON.stringify({
    action: 'background_update',
    data: { mode: 'environment', environment: { preset: 'sunset' } }
  }, null, 2));
  lines.push('```');
  
  lines.push('');
  lines.push('💡 *提示：* 完整API文档: GET http://localhost:3001/api/protocols');
  
  return lines.join('\n');
}

export default { getProtocols, generateHelpText };
