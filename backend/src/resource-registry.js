/**
 * 数字人资源注册表
 * 
 * Phase 1: 实现多资源类型支持的基础框架
 * 支持：图像、视频、3D模型、音频、动捕数据
 * 
 * 版本: 1.0.0
 */

// ============ 资源类型定义 ============

export const RESOURCE_TYPES = {
  // 图像资源
  IMAGE: 'image',
  // 视频资源
  VIDEO: 'video',
  // 3D模型
  MODEL_3D: 'model_3d',
  // 音频资源
  AUDIO: 'audio',
  // 动捕数据
  MOTION_CAPTURE: 'motion_capture'
};

// ============ 资源格式定义 ============

export const RESOURCE_FORMATS = {
  [RESOURCE_TYPES.IMAGE]: ['png', 'jpg', 'jpeg', 'webp', 'svg', 'gif'],
  [RESOURCE_TYPES.VIDEO]: ['mp4', 'webm', 'mov', 'avi'],
  [RESOURCE_TYPES.MODEL_3D]: ['glb', 'gltf', 'fbx', 'usdz', 'vrm', 'obj'],
  [RESOURCE_TYPES.AUDIO]: ['wav', 'mp3', 'ogg', 'aac', 'flac'],
  [RESOURCE_TYPES.MOTION_CAPTURE]: ['bvh', 'fbx']
};

// ============ 资源类型元数据 ============

export const RESOURCE_METADATA = {
  [RESOURCE_TYPES.IMAGE]: {
    name: '图像',
    extensions: RESOURCE_FORMATS[RESOURCE_TYPES.IMAGE],
    mimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'image/gif'],
    maxSize: 10 * 1024 * 1024, // 10MB
    description: '2D数字人图像资源，用于头像、静态展示'
  },
  [RESOURCE_TYPES.VIDEO]: {
    name: '视频',
    extensions: RESOURCE_FORMATS[RESOURCE_TYPES.VIDEO],
    mimeTypes: ['video/mp4', 'video/webm', 'video/quicktime'],
    maxSize: 100 * 1024 * 1024, // 100MB
    description: '数字人视频资源，用于播报、宣传场景'
  },
  [RESOURCE_TYPES.MODEL_3D]: {
    name: '3D模型',
    extensions: RESOURCE_FORMATS[RESOURCE_TYPES.MODEL_3D],
    mimeTypes: ['model/gltf-binary', 'model/gltf+json', 'model/fbx', 'model/vrm'],
    maxSize: 50 * 1024 * 1024, // 50MB
    description: '3D数字人模型，用于虚拟主播、交互场景'
  },
  [RESOURCE_TYPES.AUDIO]: {
    name: '音频',
    extensions: RESOURCE_FORMATS[RESOURCE_TYPES.AUDIO],
    mimeTypes: ['audio/wav', 'audio/mpeg', 'audio/ogg', 'audio/aac'],
    maxSize: 20 * 1024 * 1024, // 20MB
    description: '数字人语音资源，用于语音交互、播报'
  },
  [RESOURCE_TYPES.MOTION_CAPTURE]: {
    name: '动捕数据',
    extensions: RESOURCE_FORMATS[RESOURCE_TYPES.MOTION_CAPTURE],
    mimeTypes: ['application/octet-stream'],
    maxSize: 30 * 1024 * 1024, // 30MB
    description: '动作捕捉数据，用于实时驱动数字人动画'
  }
};

// ============ 资源注册表类 ============

class ResourceRegistry {
  constructor() {
    this.resources = new Map();
    this.listeners = new Set();
  }

  /**
   * 注册资源
   * @param {Object} resource 资源对象
   * @param {string} resource.id 资源唯一标识
   * @param {string} resource.name 资源名称
   * @param {string} resource.type 资源类型
   * @param {string} resource.url 资源URL
   * @param {string} resource.format 资源格式
   * @param {number} resource.size 资源大小(bytes)
   * @param {Object} resource.metadata 额外元数据
   */
  register(resource) {
    const { id, type, format } = resource;
    
    // 验证资源类型 - 支持大小写不敏感
    const validType = Object.values(RESOURCE_TYPES).includes(type);
    if (!validType) {
      throw new Error(`Invalid resource type: ${type}`);
    }
    
    // 验证资源格式
    const validFormats = RESOURCE_FORMATS[type];
    if (!validFormats.includes(format.toLowerCase())) {
      throw new Error(`Invalid format ${format} for type ${type}`);
    }
    
    // 验证资源大小
    const maxSize = RESOURCE_METADATA[type].maxSize;
    if (resource.size > maxSize) {
      throw new Error(`Resource size exceeds maximum allowed: ${maxSize} bytes`);
    }
    
    const resourceEntry = {
      ...resource,
      registeredAt: Date.now(),
      status: 'ready'
    };
    
    this.resources.set(id, resourceEntry);
    this.notifyListeners('register', resourceEntry);
    
    return resourceEntry;
  }

  /**
   * 注销资源
   * @param {string} id 资源ID
   */
  unregister(id) {
    const resource = this.resources.get(id);
    if (resource) {
      this.resources.delete(id);
      this.notifyListeners('unregister', { id });
    }
  }

  /**
   * 获取资源
   * @param {string} id 资源ID
   * @returns {Object|null}
   */
  get(id) {
    return this.resources.get(id) || null;
  }

  /**
   * 获取所有资源
   * @param {string} type 资源类型过滤(可选)
   * @returns {Array}
   */
  getAll(type = null) {
    if (type) {
      return Array.from(this.resources.values()).filter(r => r.type === type);
    }
    return Array.from(this.resources.values());
  }

  /**
   * 按类型查询资源
   * @param {string} type 资源类型
   * @returns {Array}
   */
  getByType(type) {
    return this.getAll(type);
  }

  /**
   * 搜索资源
   * @param {Object} criteria 搜索条件
   * @returns {Array}
   */
  search(criteria) {
    let results = Array.from(this.resources.values());
    
    if (criteria.type) {
      results = results.filter(r => r.type === criteria.type);
    }
    if (criteria.format) {
      results = results.filter(r => r.format === criteria.format);
    }
    if (criteria.name) {
      const nameLower = criteria.name.toLowerCase();
      results = results.filter(r => r.name.toLowerCase().includes(nameLower));
    }
    if (criteria.tags) {
      results = results.filter(r => 
        criteria.tags.some(tag => r.tags && r.tags.includes(tag))
      );
    }
    
    return results;
  }

  /**
   * 更新资源状态
   * @param {string} id 资源ID
   * @param {string} status 新状态
   */
  updateStatus(id, status) {
    const resource = this.resources.get(id);
    if (resource) {
      resource.status = status;
      resource.updatedAt = Date.now();
      this.notifyListeners('statusUpdate', resource);
    }
  }

  /**
   * 订阅资源变化
   * @param {Function} callback 回调函数
   * @returns {Function} 取消订阅函数
   */
  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * 通知监听器
   * @param {string} event 事件类型
   * @param {Object} data 事件数据
   */
  notifyListeners(event, data) {
    this.listeners.forEach(callback => {
      try {
        callback(event, data);
      } catch (e) {
        console.error('Resource listener error:', e);
      }
    });
  }

  /**
   * 清空注册表
   */
  clear() {
    this.resources.clear();
    this.notifyListeners('clear', {});
  }

  /**
   * 获取注册表统计信息
   * @returns {Object}
   */
  getStats() {
    const stats = {
      total: this.resources.size,
      byType: {}
    };
    
    for (const type of Object.values(RESOURCE_TYPES)) {
      stats.byType[type] = Array.from(this.resources.values())
        .filter(r => r.type === type).length;
    }
    
    return stats;
  }
}

// ============ 导出单例 ============

export const resourceRegistry = new ResourceRegistry();

export default {
  RESOURCE_TYPES,
  RESOURCE_FORMATS,
  RESOURCE_METADATA,
  ResourceRegistry,
  resourceRegistry
};
