/**
 * 数字人资源加载器
 * 
 * Phase 1: 实现多类型资源的统一加载接口
 * 支持：图像、视频、3D模型、音频、动捕数据的异步加载
 * 
 * 版本: 1.0.0
 */

import { RESOURCE_TYPES, RESOURCE_FORMATS, resourceRegistry } from './resource-registry.js';

// ============ 加载状态 ============

export const LOADING_STATE = {
  PENDING: 'pending',
  LOADING: 'loading',
  SUCCESS: 'success',
  ERROR: 'error',
  CANCELLED: 'cancelled'
};

// ============ 资源加载器类 ============

class ResourceLoader {
  constructor() {
    this.cache = new Map();
    this.loaders = new Map();
    this.activeLoads = new Map();
    this.defaultOptions = {
      // 图像选项
      image: {
        crossOrigin: 'anonymous',
        cache: true
      },
      // 视频选项
      video: {
        crossOrigin: 'anonymous',
        muted: true,
        preload: 'auto',
        cache: true
      },
      // 3D模型选项
      model_3d: {
        cache: true,
        draco: true  // 是否使用Draco压缩
      },
      // 音频选项
      audio: {
        cache: true,
        preload: 'auto'
      },
      // 动捕数据选项
      motion_capture: {
        cache: true
      }
    };
    
    // 初始化内置加载器
    this._initLoaders();
  }

  /**
   * 初始化内置加载器
   */
  _initLoaders() {
    // 图像加载器
    this.loaders.set(RESOURCE_TYPES.IMAGE, this._loadImage.bind(this));
    // 视频加载器
    this.loaders.set(RESOURCE_TYPES.VIDEO, this._loadVideo.bind(this));
    // 3D模型加载器
    this.loaders.set(RESOURCE_TYPES.MODEL_3D, this._loadModel3D.bind(this));
    // 音频加载器
    this.loaders.set(RESOURCE_TYPES.AUDIO, this._loadAudio.bind(this));
    // 动捕数据加载器
    this.loaders.set(RESOURCE_TYPES.MOTION_CAPTURE, this._loadMotionCapture.bind(this));
  }

  /**
   * 加载资源
   * @param {string|Object} resourceIdOrObj 资源ID或资源对象
   * @param {Object} options 加载选项
   * @returns {Promise}
   */
  async load(resourceIdOrObj, options = {}) {
    let resource;
    
    // 判断是ID还是对象
    if (typeof resourceIdOrObj === 'string') {
      resource = resourceRegistry.get(resourceIdOrObj);
      if (!resource) {
        throw new Error(`Resource not found: ${resourceIdOrObj}`);
      }
    } else {
      resource = resourceIdOrObj;
    }
    
    const { id, type, url } = resource;
    const cacheKey = id || url;
    
    // 检查缓存
    if (this.cache.has(cacheKey) && options.cache !== false) {
      const cached = this.cache.get(cacheKey);
      if (cached.state === LOADING_STATE.SUCCESS) {
        return cached.data;
      }
    }
    
    // 检查是否正在加载
    if (this.activeLoads.has(cacheKey)) {
      return this.activeLoads.get(cacheKey);
    }
    
    // 获取对应类型的加载器
    const loader = this.loaders.get(type);
    if (!loader) {
      throw new Error(`No loader for resource type: ${type}`);
    }
    
    // 合并选项
    const mergedOptions = {
      ...this.defaultOptions[type],
      ...options
    };
    
    // 创建加载Promise
    const loadPromise = this._executeLoad(cacheKey, loader, resource, mergedOptions);
    this.activeLoads.set(cacheKey, loadPromise);
    
    try {
      const result = await loadPromise;
      return result;
    } finally {
      this.activeLoads.delete(cacheKey);
    }
  }

  /**
   * 执行加载
   * @private
   */
  async _executeLoad(cacheKey, loader, resource, options) {
    const loadContext = {
      resource,
      options,
      onProgress: null
    };
    
    try {
      // 更新状态为加载中
      if (resource.id) {
        resourceRegistry.updateStatus(resource.id, LOADING_STATE.LOADING);
      }
      
      // 调用具体的加载器
      const data = await loader(loadContext);
      
      // 缓存成功结果
      this.cache.set(cacheKey, {
        state: LOADING_STATE.SUCCESS,
        data,
        timestamp: Date.now()
      });
      
      // 更新注册表状态
      if (resource.id) {
        resourceRegistry.updateStatus(resource.id, LOADING_STATE.SUCCESS);
      }
      
      return data;
      
    } catch (error) {
      // 缓存失败结果
      this.cache.set(cacheKey, {
        state: LOADING_STATE.ERROR,
        error,
        timestamp: Date.now()
      });
      
      // 更新注册表状态
      if (resource.id) {
        resourceRegistry.updateStatus(resource.id, LOADING_STATE.ERROR);
      }
      
      throw error;
    }
  }

  /**
   * 图像加载器
   * @private
   */
  _loadImage(context) {
    return new Promise((resolve, reject) => {
      const { resource, options } = context;
      const img = new Image();
      
      img.crossOrigin = options.crossOrigin;
      
      img.onload = () => {
        resolve({
          element: img,
          width: img.width,
          height: img.height,
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
          type: RESOURCE_TYPES.IMAGE
        });
      };
      
      img.onerror = () => {
        reject(new Error(`Failed to load image: ${resource.url}`));
      };
      
      img.src = resource.url;
    });
  }

  /**
   * 视频加载器
   * @private
   */
  _loadVideo(context) {
    return new Promise((resolve, reject) => {
      const { resource, options } = context;
      const video = document.createElement('video');
      
      video.crossOrigin = options.crossOrigin;
      video.muted = options.muted !== undefined ? options.muted : true;
      video.preload = options.preload || 'auto';
      
      video.onloadedmetadata = () => {
        resolve({
          element: video,
          duration: video.duration,
          videoWidth: video.videoWidth,
          videoHeight: video.videoHeight,
          type: RESOURCE_TYPES.VIDEO
        });
      };
      
      video.onerror = () => {
        reject(new Error(`Failed to load video: ${resource.url}`));
      };
      
      video.src = resource.url;
      video.load();
    });
  }

  /**
   * 3D模型加载器
   * @private
   */
  _loadModel3D(context) {
    return new Promise((resolve, reject) => {
      const { resource, options } = context;
      const { url, format } = resource;
      
      // 根据格式选择加载方式
      const ext = format.toLowerCase();
      
      // 这里返回加载器配置，实际加载需要结合Three.js等3D库
      // 前端代码会根据此配置使用对应的loader
      resolve({
        url,
        format: ext,
        type: RESOURCE_TYPES.MODEL_3D,
        loaderConfig: this._getModelLoaderConfig(ext, options),
        // 预留接口，实际加载需要传入Three.js的loader
        load: (threeJSLoader) => {
          return new Promise((res, rej) => {
            threeJSLoader.load(
              url,
              (gltf) => res(gltf),
              (xhr) => {
                // 加载进度
                if (options.onProgress) {
                  options.onProgress(xhr.loaded / xhr.total);
                }
              },
              (error) => rej(error)
            );
          });
        }
      });
    });
  }

  /**
   * 获取3D模型加载器配置
   * @private
   */
  _getModelLoaderConfig(format, options) {
    const configs = {
      glb: { loader: 'GLTFLoader', draco: options.draco },
      gltf: { loader: 'GLTFLoader', draco: options.draco },
      fbx: { loader: 'FBXLoader' },
      usdz: { loader: 'USDZLoader' },
      vrm: { loader: 'VRMLoader' },
      obj: { loader: 'OBJLoader' }
    };
    return configs[format] || { loader: 'GLTFLoader' };
  }

  /**
   * 音频加载器
   * @private
   */
  _loadAudio(context) {
    return new Promise((resolve, reject) => {
      const { resource, options } = context;
      const audio = new Audio();
      
      audio.preload = options.preload || 'auto';
      
      audio.onloadedmetadata = () => {
        resolve({
          element: audio,
          duration: audio.duration,
          type: RESOURCE_TYPES.AUDIO
        });
      };
      
      audio.onerror = () => {
        reject(new Error(`Failed to load audio: ${resource.url}`));
      };
      
      audio.src = resource.url;
      audio.load();
    });
  }

  /**
   * 动捕数据加载器
   * @private
   */
  _loadMotionCapture(context) {
    return new Promise((resolve, reject) => {
      const { resource } = context;
      const { url, format } = resource;
      
      // 动捕数据通常需要fetch后解析
      fetch(url)
        .then(response => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.arrayBuffer();
        })
        .then(arrayBuffer => {
          resolve({
            data: arrayBuffer,
            format: format.toLowerCase(),
            type: RESOURCE_TYPES.MOTION_CAPTURE,
            // 解析接口，实际解析需要对应的解析器
            parse: (parser) => parser(arrayBuffer, format)
          });
        })
        .catch(error => {
          reject(new Error(`Failed to load motion capture: ${error.message}`));
        });
    });
  }

  /**
   * 批量加载资源
   * @param {Array} resources 资源列表
   * @param {Object} options 加载选项
   * @returns {Promise<Array>}
   */
  async loadBatch(resources, options = {}) {
    const results = await Promise.allSettled(
      resources.map(r => this.load(r, options))
    );
    
    return results.map((result, index) => ({
      resource: resources[index],
      success: result.status === 'fulfilled',
      data: result.status === 'fulfilled' ? result.value : null,
      error: result.status === 'rejected' ? result.reason : null
    }));
  }

  /**
   * 预加载资源
   * @param {Array} resources 资源列表
   * @param {Object} options 加载选项
   */
  async preload(resources, options = {}) {
    // 静默加载，忽略错误
    return this.loadBatch(resources, { ...options, silent: true })
      .then(results => {
        const successCount = results.filter(r => r.success).length;
        console.log(`Preloaded ${successCount}/${resources.length} resources`);
        return results;
      });
  }

  /**
   * 取消加载
   * @param {string} cacheKey 缓存键
   */
  cancel(cacheKey) {
    if (this.activeLoads.has(cacheKey)) {
      this.activeLoads.get(cacheKey).cancel();
      this.activeLoads.delete(cacheKey);
      this.cache.set(cacheKey, {
        state: LOADING_STATE.CANCELLED,
        timestamp: Date.now()
      });
    }
  }

  /**
   * 清除缓存
   * @param {string} key 可选，指定要清除的键
   */
  clearCache(key = null) {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }

  /**
   * 获取缓存状态
   * @returns {Object}
   */
  getCacheStatus() {
    const status = {
      size: this.cache.size,
      entries: []
    };
    
    this.cache.forEach((value, key) => {
      status.entries.push({
        key,
        state: value.state,
        timestamp: value.timestamp
      });
    });
    
    return status;
  }

  /**
   * 注册自定义加载器
   * @param {string} type 资源类型
   * @param {Function} loader 加载函数
   */
  registerLoader(type, loader) {
    this.loaders.set(type, loader);
  }
}

// ============ 导出单例 ============

export const resourceLoader = new ResourceLoader();

export default {
  LOADING_STATE,
  ResourceLoader,
  resourceLoader
};
