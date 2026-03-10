/**
 * 数字人壁纸 - 前端配置契约定义
 * 
 * 这个文件定义了前端支持的所有配置项
 * 其他系统可以通过 /api/config 获取这些配置
 * 
 * 配置文件版本: 1.0.0
 */

// ============ 配置契约 ============

export const CONFIG_SCHEMA = {
  // Agent 配置
  agents: {
    type: 'array',
    items: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Agent唯一标识' },
        name: { type: 'string', description: '显示名称' },
        role: { type: 'string', description: '角色/职能' },
        status: { type: 'string', enum: ['idle', 'busy', 'blocked'], description: '状态' },
        color: { type: 'string', description: '主题色(hex)' },
        avatar: { type: 'string', description: '头像URL' },
        currentTask: { type: 'string', description: '当前任务' }
      },
      required: ['id', 'name']
    },
    example: [
      { id: 'taizi', name: '太子', role: '项目总控', status: 'idle', color: '#8B5CF6' }
    ]
  },

  // 任务配置
  tasks: {
    type: 'array',
    items: {
      type: 'object',
      properties: {
        id: { type: 'number', description: '任务ID' },
        title: { type: 'string', description: '任务标题' },
        agent: { type: 'string', description: '负责Agent名称' },
        status: { type: 'string', enum: ['completed', 'in-progress', 'pending'] },
        priority: { type: 'string', enum: ['high', 'medium', 'low'] },
        description: { type: 'string', description: '任务描述' },
        dueDate: { type: 'string', description: '截止日期' }
      },
      required: ['id', 'title', 'agent']
    },
    example: [
      { id: 1, title: '调研方案', agent: '中书省', status: 'in-progress', priority: 'high' }
    ]
  },

  // 背景配置
  background: {
    type: 'object',
    properties: {
      mode: { 
        type: 'string', 
        enum: ['environment', 'static', 'video'],
        description: '背景模式' 
      },
      environment: {
        type: 'object',
        properties: {
          preset: { 
            type: 'string', 
            enum: ['city', 'studio', 'park', 'dawn', 'night', 'sunset', 'forest', 'lobby', ' apartment', 'parking', 'footballfield'],
            description: '天空盒预设' 
          },
          blur: { type: 'number', description: '模糊度(0-1)' }
        }
      },
      static: {
        type: 'object',
        properties: {
          color: { type: 'string', description: '背景色(hex)' },
          image: { type: 'string', description: '背景图URL' }
        }
      },
      video: {
        type: 'object',
        properties: {
          url: { type: 'string', description: '视频URL' },
          loop: { type: 'boolean', description: '是否循环' },
          muted: { type: 'boolean', description: '是否静音' }
        }
      }
    },
    example: { mode: 'environment', environment: { preset: 'city' } }
  },

  // 特效配置
  effects: {
    type: 'array',
    items: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['confetti', 'rain', 'snow', 'fireworks', 'sparkle'] },
        duration: { type: 'number', description: '持续时间(ms)' },
        intensity: { type: 'number', description: '强度(0-1)' }
      }
    }
  },

  // UI配置
  ui: {
    type: 'object',
    properties: {
      taskBoard: {
        type: 'object',
        properties: {
          enabled: { type: 'boolean' },
          position: { type: 'string', enum: ['top-right', 'top-left', 'bottom-right', 'bottom-left'] },
          maxTasks: { type: 'number' }
        }
      },
      statsPanel: {
        type: 'object',
        properties: {
          enabled: { type: 'boolean' },
          position: { type: 'string' }
        }
      }
    },
    example: { taskBoard: { enabled: true, position: 'top-right', maxTasks: 6 } }
  }
};

// ============ 契约协议 ============

export const CONTRACT_ACTIONS = {
  // 更新Agent列表
  agent_list_update: {
    name: '更新Agent列表',
    params: { agents: CONFIG_SCHEMA.agents },
    description: '更新显示的Agent及其状态'
  },

  // 更新任务列表
  task_list_update: {
    name: '更新任务列表',
    params: { tasks: CONFIG_SCHEMA.tasks },
    description: '更新任务看板显示的任务'
  },

  // 更新背景
  background_update: {
    name: '更新背景',
    params: { background: CONFIG_SCHEMA.background },
    description: '切换3D场景背景'
  },

  // 更新UI配置
  ui_update: {
    name: '更新UI配置',
    params: { ui: CONFIG_SCHEMA.ui },
    description: '修改界面显示配置'
  },

  // 播放特效
  effect_update: {
    name: '播放特效',
    params: { effect: CONFIG_SCHEMA.effects },
    description: '触发全局特效动画'
  },

  // Avatar动作
  avatar_action: {
    name: 'Avatar动作',
    params: { agent: 'string', action: 'string', emotion: 'string' },
    description: '让指定Agent执行动作或表情'
  }
};

export default { CONFIG_SCHEMA, CONTRACT_ACTIONS };
