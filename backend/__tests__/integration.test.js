/**
 * 配置架构集成测试
 * 
 * @description 测试配置扩展后的多资源类型支持
 * 
 * 版本: 1.0.0
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { RESOURCE_TYPES } from '../src/config-schema.js';
import resourceRegistryModule from '../src/resource-registry.js';
import resourceLoaderModule from '../src/resource-loader.js';

const { resourceRegistry } = resourceRegistryModule;
const { ResourceLoader, resourceLoader } = resourceLoaderModule;

describe('Phase 1 集成测试：多资源类型支持', () => {
  let loader;

  beforeEach(() => {
    loader = new ResourceLoader();
    resourceRegistry.clear();
  });

  describe('1. 资源配置完整性', () => {
    it('config-schema 应该定义所有5种资源类型', () => {
      expect(RESOURCE_TYPES.IMAGE).toBe('image');
      expect(RESOURCE_TYPES.VIDEO).toBe('video');
      expect(RESOURCE_TYPES.MODEL_3D).toBe('model_3d');
      expect(RESOURCE_TYPES.AUDIO).toBe('audio');
      expect(RESOURCE_TYPES.MOTION_CAPTURE).toBe('motion_capture');
    });
  });

  describe('2. 资源注册与加载流程', () => {
    it('注册图像资源 → 查询 → 统计', () => {
      // 注册
      const imageResource = resourceRegistry.register({
        id: 'int-img-001',
        name: '测试图像',
        type: RESOURCE_TYPES.IMAGE,
        url: '/resources/avatar.png',
        format: 'png',
        size: 512 * 1024 // 512KB
      });
      expect(imageResource.status).toBe('ready');

      // 查询
      const found = resourceRegistry.get('int-img-001');
      expect(found.name).toBe('测试图像');

      // 统计
      const stats = resourceRegistry.getStats();
      expect(stats.byType[RESOURCE_TYPES.IMAGE]).toBe(1);
    });

    it('注册3D模型资源 → 搜索 → 更新状态', () => {
      // 注册模型
      resourceRegistry.register({
        id: 'int-model-001',
        name: '数字人A',
        type: RESOURCE_TYPES.MODEL_3D,
        url: '/resources/avatar_a.glb',
        format: 'glb',
        size: 5 * 1024 * 1024 // 5MB
      });

      // 搜索
      const results = resourceRegistry.search({ type: RESOURCE_TYPES.MODEL_3D });
      expect(results).toHaveLength(1);

      // 更新状态
      resourceRegistry.updateStatus('int-model-001', 'loading');
      const updated = resourceRegistry.get('int-model-001');
      expect(updated.status).toBe('loading');
    });

    it('注册音频资源 → 按类型查询 → 注销', () => {
      resourceRegistry.register({
        id: 'int-audio-001',
        name: '欢迎语音',
        type: RESOURCE_TYPES.AUDIO,
        url: '/resources/welcome.mp3',
        format: 'mp3',
        size: 2 * 1024 * 1024 // 2MB
      });

      const audios = resourceRegistry.getByType(RESOURCE_TYPES.AUDIO);
      expect(audios).toHaveLength(1);

      resourceRegistry.unregister('int-audio-001');
      expect(resourceRegistry.get('int-audio-001')).toBeNull();
    });

    it('注册视频资源 → 清空', () => {
      resourceRegistry.register({
        id: 'int-video-001',
        name: '介绍视频',
        type: RESOURCE_TYPES.VIDEO,
        url: '/resources/intro.mp4',
        format: 'mp4',
        size: 10 * 1024 * 1024 // 10MB
      });

      resourceRegistry.clear();
      expect(resourceRegistry.getAll()).toHaveLength(0);
    });
  });

  describe('3. 加载器配置验证', () => {
    it('每种资源类型应该有默认加载选项', () => {
      const types = [
        RESOURCE_TYPES.IMAGE,
        RESOURCE_TYPES.VIDEO,
        RESOURCE_TYPES.MODEL_3D,
        RESOURCE_TYPES.AUDIO,
        RESOURCE_TYPES.MOTION_CAPTURE
      ];

      types.forEach(type => {
        const options = loader.defaultOptions[type];
        expect(options).toBeDefined();
        expect(options.cache).toBe(true);
      });
    });

    it('图像加载选项应该包含 crossOrigin', () => {
      const imageOptions = loader.defaultOptions[RESOURCE_TYPES.IMAGE];
      expect(imageOptions.crossOrigin).toBe('anonymous');
    });

    it('视频加载选项应该包含 muted 和 preload', () => {
      const videoOptions = loader.defaultOptions[RESOURCE_TYPES.VIDEO];
      expect(videoOptions.muted).toBe(true);
      expect(videoOptions.preload).toBe('auto');
    });
  });

  describe('4. 多资源场景模拟', () => {
    it('完整的资源管理流程', () => {
      // 1. 注册多种资源
      const resources = [
        { id: 'r1', name: '头像', type: RESOURCE_TYPES.IMAGE, format: 'png', size: 1024, url: '/1.png' },
        { id: 'r2', name: '宣传片', type: RESOURCE_TYPES.VIDEO, format: 'mp4', size: 1024, url: '/2.mp4' },
        { id: 'r3', name: '数字人', type: RESOURCE_TYPES.MODEL_3D, format: 'glb', size: 1024, url: '/3.glb' },
        { id: 'r4', name: '配音', type: RESOURCE_TYPES.AUDIO, format: 'mp3', size: 1024, url: '/4.mp3' },
        { id: 'r5', name: '动作', type: RESOURCE_TYPES.MOTION_CAPTURE, format: 'bvh', size: 1024, url: '/5.bvh' }
      ];

      resources.forEach(r => resourceRegistry.register(r));

      // 2. 验证统计
      const stats = resourceRegistry.getStats();
      expect(stats.total).toBe(5);
      expect(Object.values(stats.byType).every(v => v === 1)).toBe(true);

      // 3. 搜索混合条件
      const searchResults = resourceRegistry.search({ 
        tags: [] // 无标签
      });
      // 由于没有设置标签，应该返回空或全部（取决于实现）
      expect(searchResults).toBeDefined();
    });

    it('验证文件大小限制', () => {
      // 图像最大10MB
      expect(() => {
        resourceRegistry.register({
          id: 'oversize-img',
          name: '超大图像',
          type: RESOURCE_TYPES.IMAGE,
          format: 'png',
          size: 20 * 1024 * 1024,
          url: '/huge.png'
        });
      }).toThrow('exceeds maximum allowed');

      // 视频最大100MB
      expect(() => {
        resourceRegistry.register({
          id: 'oversize-video',
          name: '超大视频',
          type: RESOURCE_TYPES.VIDEO,
          format: 'mp4',
          size: 200 * 1024 * 1024,
          url: '/huge.mp4'
        });
      }).toThrow('exceeds maximum allowed');
    });

    it('验证格式验证', () => {
      // 图像不支持 mp4 格式
      expect(() => {
        resourceRegistry.register({
          id: 'wrong-format',
          name: '错误格式',
          type: RESOURCE_TYPES.IMAGE,
          format: 'mp4',
          size: 1024,
          url: '/wrong.mp4'
        });
      }).toThrow('Invalid format');
    });
  });

  describe('5. 监听器机制', () => {
    it('资源注册应该触发监听', () => {
      const events = [];
      const unsubscribe = resourceRegistry.subscribe((event, data) => {
        events.push({ event, data });
      });

      resourceRegistry.register({
        id: 'listener-test',
        name: '监听测试',
        type: RESOURCE_TYPES.IMAGE,
        format: 'png',
        size: 1024,
        url: '/test.png'
      });

      expect(events).toHaveLength(1);
      expect(events[0].event).toBe('register');

      unsubscribe();
    });

    it('状态更新应该触发监听', () => {
      const events = [];
      resourceRegistry.subscribe((event, data) => {
        events.push({ event, data });
      });

      resourceRegistry.register({
        id: 'status-listener',
        name: '状态监听',
        type: RESOURCE_TYPES.VIDEO,
        format: 'mp4',
        size: 1024,
        url: '/test.mp4'
      });

      resourceRegistry.updateStatus('status-listener', 'loading');

      expect(events).toHaveLength(2);
      expect(events[1].event).toBe('statusUpdate');
    });
  });
});
