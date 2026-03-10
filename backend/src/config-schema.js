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

  // ============ 数字人(Avatar)配置 ============
  avatars: {
    type: 'array',
    description: '数字人列表',
    items: {
      type: 'object',
      properties: {
        id: { type: 'string', description: '唯一标识' },
        name: { type: 'string', description: '显示名称' },
        role: { type: 'string', description: '角色/职能' },
        status: { type: 'string', enum: ['idle', 'busy', 'blocked'], description: '状态' },
        color: { type: 'string', description: '主题色(hex)' },
        avatar: { type: 'string', description: '头像URL' },
        model: { type: 'string', description: '3D模型类型' },
        position: { type: 'object', description: '位置', properties: { x: 'number', y: 'number', z: 'number' } },
        scale: { type: 'number', description: '缩放比例' },
        rotation: { type: 'number', description: '旋转角度' },
        animation: { type: 'string', description: '当前动画' },
        emotion: { type: 'string', description: '当前表情' },
        currentTask: { type: 'string', description: '当前任务' },
        description: { type: 'string', description: '描述' }
      },
      required: ['id', 'name']
    }
  },

  // ============ 任务配置 ============
  tasks: {
    type: 'array',
    description: '任务看板列表',
    items: {
      type: 'object',
      properties: {
        id: { type: 'number', description: '任务ID' },
        title: { type: 'string', description: '任务标题' },
        agent: { type: 'string', description: '负责Agent名称' },
        status: { type: 'string', enum: ['completed', 'in-progress', 'pending'] },
        priority: { type: 'string', enum: ['high', 'medium', 'low'] },
        description: { type: 'string', description: '任务描述' },
        dueDate: { type: 'string', description: '截止日期' },
        progress: { type: 'number', description: '进度(0-100)' }
      },
      required: ['id', 'title', 'agent']
    }
  },

  // ============ 天空盒(Environment)配置 ============
  environment: {
    type: 'object',
    description: '3D环境/天空盒配置',
    properties: {
      preset: { 
        type: 'string', 
        enum: ['city', 'studio', 'park', 'dawn', 'night', 'sunset', 'forest', 'lobby', 'apartment', 'parking', 'footballfield', 'graffiti', 'warehouse', 'hangar', 'sh', 'berlin', 'florida', 'london', 'peppermint', 'poison', 'osiris', 'washingtonDC', 'Paris'],
        description: '天空盒预设' 
      },
      blur: { type: 'number', description: '模糊度(0-1)', default: 0 },
      background: { type: 'boolean', description: '是否显示为背景', default: true },
      intensity: { type: 'number', description: '环境光强度', default: 1 }
    },
    example: { preset: 'city', blur: 0 }
  },

  // ============ 背景配置 ============
  background: {
    type: 'object',
    description: '背景配置(会覆盖environment)',
    properties: {
      mode: { 
        type: 'string', 
        enum: ['environment', 'static', 'video', 'transparent'],
        description: '背景模式' 
      },
      // 静态背景
      static: {
        type: 'object',
        properties: {
          color: { type: 'string', description: '背景色(hex)', example: '#0f172a' },
          image: { type: 'string', description: '背景图URL' },
          imageOpacity: { type: 'number', description: '图片透明度(0-1)' },
          gradient: { type: 'object', description: '渐变', properties: { start: 'string', end: 'string', direction: 'string' } }
        }
      },
      // 视频背景
      video: {
        type: 'object',
        properties: {
          url: { type: 'string', description: '视频URL' },
          loop: { type: 'boolean', default: true },
          muted: { type: 'boolean', default: true },
          opacity: { type: 'number', description: '透明度(0-1)' }
        }
      }
    },
    example: { mode: 'environment', environment: { preset: 'city' } }
  },

  // ============ 动画配置 ============
  animations: {
    type: 'object',
    description: '全局动画配置',
    properties: {
      enabled: { type: 'boolean', description: '是否启用' },
      speed: { type: 'number', description: '动画速度(0.5-2)' },
      transitions: { type: 'object', description: '过渡动画', properties: {
        duration: { type: 'number', description: '过渡时长(ms)' },
        easing: { type: 'string', description: '缓动函数' }
      }}
    }
  },

  // ============ 光效配置 ============
  lighting: {
    type: 'object',
    description: '灯光配置',
    properties: {
      ambient: { type: 'object', properties: { color: 'string', intensity: 'number' } },
      directional: { type: 'object', properties: { color: 'string', intensity: 'number', position: 'object' } },
      point: { type: 'array', description: '点光源列表', items: { properties: { color: 'string', intensity: 'number', position: 'object' } } },
      spot: { type: 'array', description: '聚光灯列表' }
    },
    example: { ambient: { color: '#ffffff', intensity: 0.5 }, directional: { color: '#ffffff', intensity: 1 } }
  },

  // ============ 镜头/相机配置 ============
  camera: {
    type: 'object',
    description: '相机/镜头配置',
    properties: {
      position: { type: 'object', properties: { x: 'number', y: 'number', z: 'number' }, description: '相机位置' },
      target: { type: 'object', properties: { x: 'number', y: 'number', z: 'number' }, description: '观察目标' },
      fov: { type: 'number', description: '视野角度' },
      near: { type: 'number', description: '近裁剪面' },
      far: { type: 'number', description: '远裁剪面' },
      animation: { type: 'string', description: '相机动画: flyTo/focusOn/pan' },
      animationTarget: { type: 'object', description: '动画目标' },
      duration: { type: 'number', description: '动画时长(ms)' }
    },
    example: { position: { x: 0, y: 6, z: 10 }, fov: 50 }
  },

  // ============ 材质配置 ============
  materials: {
    type: 'object',
    description: '全局材质配置',
    properties: {
      floor: { type: 'object', properties: { 
        color: 'string', 
        metalness: 'number', 
        roughness: 'number',
        opacity: 'number'
      }},
      grid: { type: 'object', properties: { 
        color: 'string', 
        cellSize: 'number',
        sectionSize: 'number'
      }},
      fog: { type: 'object', properties: {
        enabled: 'boolean',
        color: 'string',
        near: 'number',
        far: 'number'
      }}
    }
  },

  // ============ 特效配置 ============
  effects: {
    type: 'array',
    description: '全局特效列表',
    items: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['confetti', 'rain', 'snow', 'fireworks', 'sparkle', 'glow', 'particle'] },
        duration: { type: 'number', description: '持续时间(ms)' },
        intensity: { type: 'number', description: '强度(0-1)' },
        color: { type: 'string', description: '特效颜色' },
        position: { type: 'object', description: '发射位置' }
      }
    }
  },

  // ============ UI配置 ============
  ui: {
    type: 'object',
    description: '界面配置',
    properties: {
      taskBoard: {
        type: 'object',
        properties: {
          enabled: { type: 'boolean' },
          position: { type: 'string', enum: ['top-right', 'top-left', 'bottom-right', 'bottom-left'] },
          maxTasks: { type: 'number' },
          opacity: { type: 'number' }
        }
      },
      statsPanel: {
        type: 'object',
        properties: {
          enabled: { type: 'boolean' },
          position: { type: 'string' }
        }
      },
      title: { type: 'object', properties: { text: 'string', style: 'object' } }
    },
    example: { taskBoard: { enabled: true, position: 'top-right', maxTasks: 6 } }
  }
};

// ============ 契约动作 ============

export const CONTRACT_ACTIONS = {
  // 更新Agent列表
  agent_list_update: {
    name: '更新数字人列表',
    params: { avatars: CONFIG_SCHEMA.avatars },
    description: '更新显示的数字人及其状态'
  },

  // 更新任务列表
  task_list_update: {
    name: '更新任务列表',
    params: { tasks: CONFIG_SCHEMA.tasks },
    description: '更新任务看板显示的任务'
  },

  // 更新天空盒
  environment_update: {
    name: '更新天空盒',
    params: { environment: CONFIG_SCHEMA.environment },
    description: '切换3D天空盒预设'
  },

  // 更新背景
  background_update: {
    name: '更新背景',
    params: { background: CONFIG_SCHEMA.background },
    description: '切换背景(会覆盖天空盒)'
  },

  // 更新动画
  animation_update: {
    name: '更新动画配置',
    params: { animations: CONFIG_SCHEMA.animations },
    description: '修改全局动画设置'
  },

  // 更新灯光
  lighting_update: {
    name: '更新灯光',
    params: { lighting: CONFIG_SCHEMA.lighting },
    description: '修改场景灯光'
  },

  // 更新相机
  camera_update: {
    name: '更新相机',
    params: { camera: CONFIG_SCHEMA.camera },
    description: '控制相机位置和动画'
  },

  // 更新材质
  material_update: {
    name: '更新材质',
    params: { materials: CONFIG_SCHEMA.materials },
    description: '修改地面/网格/雾效材质'
  },

  // 更新特效
  effect_update: {
    name: '播放特效',
    params: { effects: CONFIG_SCHEMA.effects },
    description: '触发全局特效动画'
  },

  // 更新UI
  ui_update: {
    name: '更新UI配置',
    params: { ui: CONFIG_SCHEMA.ui },
    description: '修改界面显示配置'
  },

  // Avatar动作
  avatar_action: {
    name: '数字人动作',
    params: { agent: 'string', action: 'string', emotion: 'string' },
    description: '让指定数字人执行动作或表情'
  }
};

export default { CONFIG_SCHEMA, CONTRACT_ACTIONS };
