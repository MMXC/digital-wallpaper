/**
 * 资源加载器单元测试
 * 
 * @description 测试 ResourceLoader 类的各项功能
 * 
 * 版本: 1.0.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import resourceLoaderModule from '../src/resource-loader.js';
import resourceRegistryModule from '../src/resource-registry.js';

const { ResourceLoader, LOADING_STATE } = resourceLoaderModule;
const { resourceRegistry, RESOURCE_TYPES } = resourceRegistryModule;

describe('ResourceLoader 资源加载器', () => {
  let loader;

  beforeEach(() => {
    loader = new ResourceLoader();
    if (resourceRegistry && resourceRegistry.clear) {
      resourceRegistry.clear();
    }
  });

  describe('LOADING_STATE 常量', () => {
    it('应该包含所有加载状态', () => {
      expect(LOADING_STATE.PENDING).toBe('pending');
      expect(LOADING_STATE.LOADING).toBe('loading');
      expect(LOADING_STATE.SUCCESS).toBe('success');
      expect(LOADING_STATE.ERROR).toBe('error');
      expect(LOADING_STATE.CANCELLED).toBe('cancelled');
    });
  });

  describe('constructor() 构造函数', () => {
    it('应该正确初始化默认选项', () => {
      expect(loader.defaultOptions.image).toBeDefined();
      expect(loader.defaultOptions.video).toBeDefined();
      expect(loader.defaultOptions.model_3d).toBeDefined();
      expect(loader.defaultOptions.audio).toBeDefined();
      expect(loader.defaultOptions.motion_capture).toBeDefined();
    });

    it('image 选项应该有正确的默认配置', () => {
      expect(loader.defaultOptions.image.crossOrigin).toBe('anonymous');
      expect(loader.defaultOptions.image.cache).toBe(true);
    });

    it('video 选项应该有正确的默认配置', () => {
      expect(loader.defaultOptions.video.muted).toBe(true);
      expect(loader.defaultOptions.video.preload).toBe('auto');
    });
  });

  describe('_initLoaders() 初始化加载器', () => {
    it('应该为每种资源类型注册加载器', () => {
      expect(loader.loaders.has(RESOURCE_TYPES.IMAGE)).toBe(true);
      expect(loader.loaders.has(RESOURCE_TYPES.VIDEO)).toBe(true);
      expect(loader.loaders.has(RESOURCE_TYPES.MODEL_3D)).toBe(true);
      expect(loader.loaders.has(RESOURCE_TYPES.AUDIO)).toBe(true);
      expect(loader.loaders.has(RESOURCE_TYPES.MOTION_CAPTURE)).toBe(true);
    });
  });

  describe('load() 加载资源', () => {
    it('加载不存在的资源应该抛出错误', async () => {
      await expect(loader.load('non-existent-id')).rejects.toThrow('Resource not found');
    });
  });

  describe('cancel() 取消加载', () => {
    it('取消不存在的加载应该不报错', () => {
      expect(() => loader.cancel('non-existent')).not.toThrow();
    });
  });

  describe('cache 缓存机制', () => {
    it('cache Map 应该初始化为空', () => {
      expect(loader.cache.size).toBe(0);
    });

    it('activeLoads Map 应该初始化为空', () => {
      expect(loader.activeLoads.size).toBe(0);
    });
  });

  describe('loaders Map 加载器映射', () => {
    it('loaders Map 应该初始化包含所有类型', () => {
      expect(loader.loaders.size).toBe(5);
    });
  });
});

describe('ResourceLoader 集成场景测试', () => {
  let loader;

  beforeEach(() => {
    loader = new ResourceLoader();
    if (resourceRegistry && resourceRegistry.clear) {
      resourceRegistry.clear();
    }
  });

  it('注册资源后应该可以查询', () => {
    resourceRegistry.register({
      id: 'integration-1',
      name: '集成测试资源',
      type: RESOURCE_TYPES.MODEL_3D,
      url: '/resources/model.glb',
      format: 'glb',
      size: 1024
    });

    const resource = resourceRegistry.get('integration-1');
    expect(resource).toBeDefined();
    expect(resource.type).toBe(RESOURCE_TYPES.MODEL_3D);
  });

  it('注册多种资源类型后统计应该正确', () => {
    resourceRegistry.register({
      id: 'int-img',
      name: '图像',
      type: RESOURCE_TYPES.IMAGE,
      url: '/img.png',
      format: 'png',
      size: 1024
    });
    resourceRegistry.register({
      id: 'int-video',
      name: '视频',
      type: RESOURCE_TYPES.VIDEO,
      url: '/video.mp4',
      format: 'mp4',
      size: 1024
    });
    resourceRegistry.register({
      id: 'int-model',
      name: '模型',
      type: RESOURCE_TYPES.MODEL_3D,
      url: '/model.glb',
      format: 'glb',
      size: 1024
    });

    const stats = resourceRegistry.getStats();
    expect(stats.total).toBe(3);
    expect(stats.byType[RESOURCE_TYPES.IMAGE]).toBe(1);
    expect(stats.byType[RESOURCE_TYPES.VIDEO]).toBe(1);
    expect(stats.byType[RESOURCE_TYPES.MODEL_3D]).toBe(1);
  });
});
