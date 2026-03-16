# 数字人多资源类型支持 - Phase 1 实现文档

## 概述

Phase 1 实现数字人资源管理的基础框架，支持多类型资源的统一管理和加载。

## 完成的功能

### 1. 资源注册表 (Resource Registry)

**文件**: `backend/src/resource-registry.js`

- **资源类型定义**: 支持5种资源类型
  - `image`: 图像资源 (PNG, JPG, WebP, SVG, GIF)
  - `video`: 视频资源 (MP4, WebM, MOV)
  - `model_3d`: 3D模型 (GLB, GLTF, FBX, USDZ, VRM)
  - `audio`: 音频资源 (WAV, MP3, OGG, AAC)
  - `motion_capture`: 动捕数据 (BVH, FBX)

- **核心功能**:
  - `register()`: 注册资源到注册表
  - `unregister()`: 注销资源
  - `get()`: 获取单个资源
  - `getAll()`: 获取所有资源
  - `getByType()`: 按类型查询
  - `search()`: 多条件搜索
  - `subscribe()`: 事件订阅

### 2. 资源加载器 (Resource Loader)

**文件**: `backend/src/resource-loader.js`

- **统一加载接口**: 支持所有资源类型的异步加载
- **缓存机制**: 内置资源缓存，避免重复加载
- **并发控制**: 可配置的最大并发数
- **批量加载**: 支持 `loadBatch()` 和 `preload()` 批量操作
- **自定义加载器**: 支持扩展注册自定义加载器

### 3. 配置扩展

**文件**: `backend/src/config-schema.js`

新增 `resources` 配置项：

```javascript
resources: {
  registry: {
    enabled: true,
    autoRegister: true,
    maxCacheSize: 100
  },
  loader: {
    image: { crossOrigin: 'anonymous', cache: true },
    video: { muted: true, preload: 'auto' },
    model_3d: { draco: true }
  },
  preload: { enabled: true, onDemand: true }
}
```

### 4. 资源管理 API

**文件**: `backend/src/resource-api.js`

| 方法 | 路径 | 描述 |
|-----|------|-----|
| GET | `/api/resources` | 获取资源列表 |
| GET | `/api/resources/:id` | 获取单个资源 |
| GET | `/api/resources/meta/types` | 获取支持的资源类型 |
| POST | `/api/resources` | 注册新资源 |
| POST | `/api/resources/upload` | 上传资源文件 |
| PUT | `/api/resources/:id` | 更新资源 |
| DELETE | `/api/resources/:id` | 删除资源 |
| POST | `/api/resources/:id/load` | 加载资源 |
| GET | `/api/resources/stats` | 获取统计信息 |
| POST | `/api/resources/cache/clear` | 清除缓存 |

## 使用示例

### 注册资源

```javascript
import { resourceRegistry, RESOURCE_TYPES } from './resource-registry.js';

const resource = resourceRegistry.register({
  id: 'avatar-001',
  name: '数字人模型',
  type: RESOURCE_TYPES.MODEL_3D,
  url: '/models/avatar.glb',
  format: 'glb',
  size: 1024000,
  metadata: { author: 'xxx' }
});
```

### 加载资源

```javascript
import { resourceLoader } from './resource-loader.js';

const data = await resourceLoader.load('avatar-001', {
  cache: true,
  onProgress: (progress) => console.log(progress)
});
```

### 批量预加载

```javascript
const resources = [
  { id: 'img-1', type: 'image', url: '/images/1.png' },
  { id: 'model-1', type: 'model_3d', url: '/models/1.glb' }
];

await resourceLoader.preload(resources);
```

## 目录结构

```
backend/src/
├── resource-registry.js   # 资源注册表
├── resource-loader.js     # 资源加载器
├── resource-api.js       # 资源管理API
└── config-schema.js      # 配置契约(已扩展)
```

## 后续计划

- Phase 2: 2D/2.5D数字人支持
- Phase 3: 3D数字人集成
- Phase 4: 多模态交互

---

*实现时间: 2026-03-16*
*执行部门: 工部*
