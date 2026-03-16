/**
 * 资源注册表单元测试
 * 
 * @description 测试 ResourceRegistry 类的各项功能
 * 
 * 版本: 1.0.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import resourceRegistryModule from '../src/resource-registry.js';

const { 
  RESOURCE_TYPES,
  RESOURCE_FORMATS,
  RESOURCE_METADATA,
  ResourceRegistry,
  resourceRegistry
} = resourceRegistryModule;

describe('ResourceRegistry 资源注册表', () => {
  let registry;

  beforeEach(() => {
    registry = new ResourceRegistry();
  });

  describe('RESOURCE_TYPES 常量', () => {
    it('应该包含所有定义的资源类型', () => {
      expect(RESOURCE_TYPES.IMAGE).toBe('image');
      expect(RESOURCE_TYPES.VIDEO).toBe('video');
      expect(RESOURCE_TYPES.MODEL_3D).toBe('model_3d');
      expect(RESOURCE_TYPES.AUDIO).toBe('audio');
      expect(RESOURCE_TYPES.MOTION_CAPTURE).toBe('motion_capture');
    });
  });

  describe('RESOURCE_FORMATS 资源格式', () => {
    it('IMAGE 类型应该支持正确的格式', () => {
      expect(RESOURCE_FORMATS[RESOURCE_TYPES.IMAGE]).toContain('png');
      expect(RESOURCE_FORMATS[RESOURCE_TYPES.IMAGE]).toContain('jpg');
      expect(RESOURCE_FORMATS[RESOURCE_TYPES.IMAGE]).toContain('webp');
    });

    it('VIDEO 类型应该支持正确的格式', () => {
      expect(RESOURCE_FORMATS[RESOURCE_TYPES.VIDEO]).toContain('mp4');
      expect(RESOURCE_FORMATS[RESOURCE_TYPES.VIDEO]).toContain('webm');
    });

    it('MODEL_3D 类型应该支持 glb 和 gltf', () => {
      expect(RESOURCE_FORMATS[RESOURCE_TYPES.MODEL_3D]).toContain('glb');
      expect(RESOURCE_FORMATS[RESOURCE_TYPES.MODEL_3D]).toContain('gltf');
    });
  });

  describe('RESOURCE_METADATA 资源元数据', () => {
    it('每个资源类型应该有元数据定义', () => {
      expect(RESOURCE_METADATA[RESOURCE_TYPES.IMAGE]).toBeDefined();
      expect(RESOURCE_METADATA[RESOURCE_TYPES.VIDEO]).toBeDefined();
      expect(RESOURCE_METADATA[RESOURCE_TYPES.MODEL_3D]).toBeDefined();
      expect(RESOURCE_METADATA[RESOURCE_TYPES.AUDIO]).toBeDefined();
      expect(RESOURCE_METADATA[RESOURCE_TYPES.MOTION_CAPTURE]).toBeDefined();
    });

    it('IMAGE 类型应该有正确的最大文件大小', () => {
      expect(RESOURCE_METADATA[RESOURCE_TYPES.IMAGE].maxSize).toBe(10 * 1024 * 1024);
    });

    it('VIDEO 类型应该有正确的最大文件大小', () => {
      expect(RESOURCE_METADATA[RESOURCE_TYPES.VIDEO].maxSize).toBe(100 * 1024 * 1024);
    });
  });

  describe('register() 注册资源', () => {
    it('应该成功注册一个有效的图像资源', () => {
      const resource = {
        id: 'test-image-1',
        name: '测试图像',
        type: RESOURCE_TYPES.IMAGE,
        url: '/resources/test.png',
        format: 'png',
        size: 1024 * 1024 // 1MB
      };

      const result = registry.register(resource);

      expect(result.id).toBe('test-image-1');
      expect(result.status).toBe('ready');
      expect(result.registeredAt).toBeDefined();
    });

    it('应该抛出无效资源类型错误', () => {
      const resource = {
        id: 'test-invalid',
        name: '无效资源',
        type: 'invalid_type',
        url: '/resources/test.png',
        format: 'png',
        size: 1024
      };

      expect(() => registry.register(resource)).toThrow('Invalid resource type');
    });

    it('应该抛出无效格式错误', () => {
      const resource = {
        id: 'test-invalid-format',
        name: '无效格式',
        type: RESOURCE_TYPES.IMAGE,
        url: '/resources/test.txt',
        format: 'txt',
        size: 1024
      };

      expect(() => registry.register(resource)).toThrow('Invalid format');
    });

    it('应该抛出文件大小超出限制错误', () => {
      const resource = {
        id: 'test-oversize',
        name: '超大文件',
        type: RESOURCE_TYPES.IMAGE,
        url: '/resources/huge.png',
        format: 'png',
        size: 20 * 1024 * 1024 // 20MB, 超过10MB限制
      };

      expect(() => registry.register(resource)).toThrow('exceeds maximum allowed');
    });

    it('注册时应该触发监听器', () => {
      const callback = vi.fn();
      registry.subscribe(callback);

      registry.register({
        id: 'test-listener',
        name: '监听测试',
        type: RESOURCE_TYPES.IMAGE,
        url: '/resources/test.png',
        format: 'png',
        size: 1024
      });

      expect(callback).toHaveBeenCalledWith('register', expect.any(Object));
    });
  });

  describe('unregister() 注销资源', () => {
    it('应该成功注销已存在的资源', () => {
      registry.register({
        id: 'test-unregister',
        name: '待注销',
        type: RESOURCE_TYPES.IMAGE,
        url: '/resources/test.png',
        format: 'png',
        size: 1024
      });

      registry.unregister('test-unregister');

      expect(registry.get('test-unregister')).toBeNull();
    });

    it('注销不存在资源时应该不报错', () => {
      expect(() => registry.unregister('non-existent')).not.toThrow();
    });
  });

  describe('get() 获取资源', () => {
    it('应该返回已注册的资源', () => {
      registry.register({
        id: 'test-get',
        name: '获取测试',
        type: RESOURCE_TYPES.VIDEO,
        url: '/resources/test.mp4',
        format: 'mp4',
        size: 1024 * 1024
      });

      const result = registry.get('test-get');

      expect(result).toBeDefined();
      expect(result.id).toBe('test-get');
      expect(result.name).toBe('获取测试');
    });

    it('查询不存在资源应该返回 null', () => {
      expect(registry.get('non-existent')).toBeNull();
    });
  });

  describe('getAll() 获取所有资源', () => {
    it('应该返回所有已注册资源', () => {
      registry.register({
        id: 'test-all-1',
        name: '资源1',
        type: RESOURCE_TYPES.IMAGE,
        url: '/resources/1.png',
        format: 'png',
        size: 1024
      });
      registry.register({
        id: 'test-all-2',
        name: '资源2',
        type: RESOURCE_TYPES.VIDEO,
        url: '/resources/2.mp4',
        format: 'mp4',
        size: 1024
      });

      const results = registry.getAll();

      expect(results).toHaveLength(2);
    });

    it('应该支持按类型过滤', () => {
      registry.register({
        id: 'test-filter-1',
        name: '图像资源',
        type: RESOURCE_TYPES.IMAGE,
        url: '/resources/img.png',
        format: 'png',
        size: 1024
      });
      registry.register({
        id: 'test-filter-2',
        name: '视频资源',
        type: RESOURCE_TYPES.VIDEO,
        url: '/resources/vid.mp4',
        format: 'mp4',
        size: 1024
      });

      const images = registry.getAll(RESOURCE_TYPES.IMAGE);

      expect(images).toHaveLength(1);
      expect(images[0].type).toBe(RESOURCE_TYPES.IMAGE);
    });
  });

  describe('getByType() 按类型查询', () => {
    it('应该返回指定类型的所有资源', () => {
      registry.register({
        id: 'type-test-1',
        name: '3D模型1',
        type: RESOURCE_TYPES.MODEL_3D,
        url: '/resources/model1.glb',
        format: 'glb',
        size: 1024
      });
      registry.register({
        id: 'type-test-2',
        name: '3D模型2',
        type: RESOURCE_TYPES.MODEL_3D,
        url: '/resources/model2.glb',
        format: 'glb',
        size: 1024
      });

      const models = registry.getByType(RESOURCE_TYPES.MODEL_3D);

      expect(models).toHaveLength(2);
    });
  });

  describe('search() 搜索资源', () => {
    beforeEach(() => {
      registry.register({
        id: 'search-1',
        name: '测试图像A',
        type: RESOURCE_TYPES.IMAGE,
        url: '/resources/search1.png',
        format: 'png',
        size: 1024,
        tags: ['avatar', 'portrait']
      });
      registry.register({
        id: 'search-2',
        name: '测试视频B',
        type: RESOURCE_TYPES.VIDEO,
        url: '/resources/search2.mp4',
        format: 'mp4',
        size: 1024,
        tags: ['demo']
      });
    });

    it('应该支持按类型搜索', () => {
      const results = registry.search({ type: RESOURCE_TYPES.IMAGE });
      expect(results).toHaveLength(1);
      expect(results[0].type).toBe(RESOURCE_TYPES.IMAGE);
    });

    it('应该支持按格式搜索', () => {
      const results = registry.search({ format: 'png' });
      expect(results).toHaveLength(1);
    });

    it('应该支持按名称模糊搜索', () => {
      const results = registry.search({ name: '测试' });
      expect(results).toHaveLength(2);
    });

    it('应该支持按标签搜索', () => {
      const results = registry.search({ tags: ['avatar'] });
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('search-1');
    });
  });

  describe('updateStatus() 更新状态', () => {
    it('应该成功更新资源状态', () => {
      registry.register({
        id: 'status-test',
        name: '状态测试',
        type: RESOURCE_TYPES.AUDIO,
        url: '/resources/audio.mp3',
        format: 'mp3',
        size: 1024
      });

      registry.updateStatus('status-test', 'loading');

      const resource = registry.get('status-test');
      expect(resource.status).toBe('loading');
      expect(resource.updatedAt).toBeDefined();
    });

    it('更新不存在资源状态时应该不报错', () => {
      expect(() => registry.updateStatus('non-existent', 'loading')).not.toThrow();
    });
  });

  describe('clear() 清空注册表', () => {
    it('应该清空所有资源', () => {
      registry.register({
        id: 'clear-1',
        name: '清除1',
        type: RESOURCE_TYPES.IMAGE,
        url: '/resources/1.png',
        format: 'png',
        size: 1024
      });
      registry.register({
        id: 'clear-2',
        name: '清除2',
        type: RESOURCE_TYPES.IMAGE,
        url: '/resources/2.png',
        format: 'png',
        size: 1024
      });

      registry.clear();

      expect(registry.getAll()).toHaveLength(0);
    });
  });

  describe('getStats() 统计信息', () => {
    it('应该返回正确的统计信息', () => {
      registry.register({
        id: 'stats-1',
        name: '统计图像',
        type: RESOURCE_TYPES.IMAGE,
        url: '/resources/img.png',
        format: 'png',
        size: 1024
      });
      registry.register({
        id: 'stats-2',
        name: '统计视频',
        type: RESOURCE_TYPES.VIDEO,
        url: '/resources/vid.mp4',
        format: 'mp4',
        size: 1024
      });

      const stats = registry.getStats();

      expect(stats.total).toBe(2);
      expect(stats.byType[RESOURCE_TYPES.IMAGE]).toBe(1);
      expect(stats.byType[RESOURCE_TYPES.VIDEO]).toBe(1);
    });
  });

  describe('subscribe() 订阅机制', () => {
    it('应该支持订阅和取消订阅', () => {
      const callback = vi.fn();
      const unsubscribe = registry.subscribe(callback);

      registry.register({
        id: 'sub-test',
        name: '订阅测试',
        type: RESOURCE_TYPES.IMAGE,
        url: '/resources/test.png',
        format: 'png',
        size: 1024
      });

      expect(callback).toHaveBeenCalled();

      unsubscribe();

      registry.register({
        id: 'sub-test-2',
        name: '订阅测试2',
        type: RESOURCE_TYPES.IMAGE,
        url: '/resources/test2.png',
        format: 'png',
        size: 1024
      });

      expect(callback).toHaveBeenCalledTimes(1);
    });
  });
});

describe('resourceRegistry 单例', () => {
  it('应该导出单例实例', () => {
    expect(resourceRegistry).toBeDefined();
    expect(resourceRegistry instanceof ResourceRegistry).toBe(true);
  });
});
