/**
 * 数字人壁纸 - 契约协议插件系统
 * 
 * 支持的契约类型和格式说明
 */

export const CONTRACT_PROTOCOLS = {
  // ============ Agent 管理 ============
  agent_list_update: {
    name: '更新Agent列表',
    description: '更新显示的Agent列表和状态',
    example: {
      action: 'agent_list_update',
      data: {
        agents: [
          { id: 'taizi', name: '太子', status: 'idle', color: '#8B5CF6' },
          { id: 'zhongshu', name: '中书省', status: 'busy', color: '#3B82F6' }
        ]
      }
    },
    fields: {
      action: '固定为 agent_list_update',
      'data.agents': 'Agent数组，每个Agent包含 id/name/status/color',
      'data.agents[].id': 'Agent唯一标识',
      'data.agents[].name': '显示名称',
      'data.agents[].status': '状态: idle/busy/blocked',
      'data.agents[].color': '颜色值(hex)'
    }
  },

  // ============ 任务看板 ============
  task_list_update: {
    name: '更新任务列表',
    description: '更新任务看板显示的任务',
    example: {
      action: 'task_list_update',
      data: {
        tasks: [
          { id: 1, title: '调研方案', agent: '中书省', status: 'completed', priority: 'high' }
        ]
      }
    },
    fields: {
      action: '固定为 task_list_update',
      'data.tasks': '任务数组',
      'data.tasks[].id': '任务ID',
      'data.tasks[].title': '任务标题',
      'data.tasks[].agent': '负责Agent名称',
      'data.tasks[].status': '状态: completed/in-progress/pending',
      'data.tasks[].priority': '优先级: high/medium/low'
    }
  },

  // ============ 背景管理 ============
  background_update: {
    name: '更新背景',
    description: '切换3D场景背景',
    example: {
      action: 'background_update',
      data: { mode: 'environment', preset: 'sunset' }
    },
    fields: {
      action: '固定为 background_update',
      'data.mode': '模式: environment/static/video',
      'data.preset': 'environment模式: city/studio/park/dawn/night/sunset',
      'data.color': 'static模式: 颜色值',
      'data.url': 'video模式: 视频URL'
    }
  },

  // ============ Avatar 动作 ============
  avatar_action: {
    name: 'Avatar动作',
    description: '让指定Agent执行动作或表情',
    example: {
      action: 'avatar_action',
      agent: 'taizi',
      data: { action: 'wave', emotion: 'happy' }
    },
    fields: {
      action: '固定为 avatar_action',
      agent: '目标Agent的id',
      'data.action': '动作: wave/dance/greet/jump/spin',
      'data.emotion': '表情: happy/sad/surprised/angry'
    }
  },

  // ============ 特效 ============
  effect_update: {
    name: '特效',
    description: '播放全局特效动画',
    example: {
      action: 'effect_update',
      data: { effect: 'confetti', duration: 3000 }
    },
    fields: {
      action: '固定为 effect_update',
      'data.effect': '特效: confetti/rain/snow/fireworks',
      'data.duration': '持续时间(毫秒)'
    }
  },

  // ============ 广播消息 ============
  broadcast: {
    name: '广播消息',
    description: '向所有客户端推送消息',
    example: {
      action: 'broadcast',
      data: { message: '大家好！' }
    },
    fields: {
      action: '固定为 broadcast',
      'data.message': '消息内容'
    }
  }
};

/**
 * 获取所有支持的协议
 */
export function getProtocols() {
  return Object.entries(CONTRACT_PROTOCOLS).map(([key, value]) => ({
    action: key,
    name: value.name,
    description: value.description,
    example: JSON.stringify(value.example, null, 2),
    fields: value.fields
  }));
}

/**
 * 生成帮助文本
 */
export function generateHelpText() {
  const lines = ['📜 *数字人壁纸 - 契约协议*', '', '支持的命令：'];
  
  for (const [key, protocol] of Object.entries(CONTRACT_PROTOCOLS)) {
    lines.push('', `*${protocol.name}*`, `\`${key}\``, protocol.description);
  }
  
  lines.push('', '---', '使用示例：');
  for (const protocol of Object.values(CONTRACT_PROTOCOLS)) {
    lines.push('```json', JSON.stringify(protocol.example, null, 2), '```');
  }
  
  return lines.join('\n');
}
