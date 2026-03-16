# 数字人资源管理 API 文档

> Phase 1 - 多资源类型支持
> 版本: 1.0.0
> 项目: JJC-20260316-002

---

## 概述

本 API 提供数字人资源的上传、存储、检索与加载功能。支持五种资源类型：

| 类型 | 说明 | 最大尺寸 |
|------|------|----------|
| `image` | 2D数字人图像资源 | 10MB |
| `video` | 数字人视频资源 | 100MB |
| `model_3d` | 3D数字人模型 | 50MB |
| `audio` | 数字人语音资源 | 20MB |
| `motion_capture` | 动作捕捉数据 | 30MB |

---

## 基础信息

- **Base URL**: `/api/resources`
- **Content-Type**: `application/json`
- **文件上传**: `multipart/form-data`

---

## 资源类型

### GET /api/resources/meta/types

获取支持的资源类型列表。

**响应示例:**

```json
{
  "success": true,
  "data": [
    {
      "type": "image",
      "name": "图像",
      "extensions": ["png", "jpg", "jpeg", "webp", "svg", "gif"],
      "maxSize": 10485760,
      "description": "2D数字人图像资源，用于头像、静态展示"
    },
    {
      "type": "video",
      "name": "视频",
      "extensions": ["mp4", "webm", "mov", "avi"],
      "maxSize": 104857600,
      "description": "数字人视频资源，用于播报、宣传场景"
    }
    // ...
  ]
}
```

---

## 资源管理

### 获取资源列表

#### GET /api/resources

获取所有注册的资源，支持分页和过滤。

**查询参数:**

| 参数 | 类型 | 说明 |
|------|------|------|
| `type` | string | 按资源类型过滤 |
| `format` | string | 按文件格式过滤 |
| `name` | string | 按名称搜索 |
| `tags` | string | 按标签过滤（逗号分隔） |
| `page` | number | 页码（默认: 1） |
| `limit` | number | 每页数量（默认: 20） |

**响应示例:**

```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "数字人形象A",
      "type": "image",
      "url": "/uploads/resources/image/xxx.png",
      "format": "png",
      "size": 1024000,
      "status": "ready",
      "tags": ["avatar", "female"],
      "registeredAt": 1709999999999
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 15,
    "totalPages": 1
  }
}
```

---

### 获取单个资源

#### GET /api/resources/:id

根据 ID 获取资源详情。

**路径参数:**

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | string | 资源唯一标识 |

**响应示例:**

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "数字人形象A",
    "type": "image",
    "url": "/uploads/resources/image/xxx.png",
    "format": "png",
    "size": 1024000,
    "metadata": {
      "originalName": "avatar.png",
      "mimeType": "image/png"
    },
    "tags": ["avatar"],
    "status": "ready",
    "registeredAt": 1709999999999
  }
}
```

**错误响应 (404):**

```json
{
  "success": false,
  "error": "资源不存在"
}
```

---

### 注册新资源

#### POST /api/resources

注册一个已存在的资源URL到注册表。

**请求体:**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | string | ✅ | 资源名称 |
| `type` | string | ✅ | 资源类型 |
| `url` | string | ✅ | 资源URL地址 |
| `id` | string | - | 自定义资源ID（默认自动生成） |
| `format` | string | - | 文件格式（自动检测） |
| `size` | number | - | 文件大小（字节） |
| `metadata` | object | - | 额外元数据 |
| `tags` | string[] | - | 资源标签 |

**请求示例:**

```json
{
  "name": "产品介绍视频",
  "type": "video",
  "url": "https://cdn.example.com/video/product.mp4",
  "format": "mp4",
  "size": 50000000,
  "metadata": {
    "duration": 120,
    "resolution": "1920x1080"
  },
  "tags": ["product", "marketing"]
}
```

**响应示例:**

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "产品介绍视频",
    "type": "video",
    "url": "https://cdn.example.com/video/product.mp4",
    "format": "mp4",
    "size": 50000000,
    "status": "ready",
    "registeredAt": 1709999999999
  }
}
```

---

### 上传资源文件

#### POST /api/resources/upload

上传并注册新资源文件。

**请求表单:**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `file` | file | ✅ | 要上传的文件 |
| `type` | string | - | 资源类型（自动检测） |
| `name` | string | - | 资源名称（默认用原文件名） |
| `metadata` | string | - | JSON 格式的元数据 |
| `tags` | string | - | 逗号分隔的标签 |

**响应示例:**

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "avatar.png",
    "type": "image",
    "url": "/uploads/resources/image/550e8400.png",
    "format": "png",
    "size": 1024000,
    "status": "ready",
    "registeredAt": 1709999999999
  },
  "file": {
    "filename": "550e8400.png",
    "size": 1024000,
    "path": "/uploads/resources/image/550e8400.png"
  }
}
```

**错误响应:**

```json
{
  "success": false,
  "error": "不支持的文件格式: xyz. 支持格式: png, jpg, jpeg, webp, svg, gif"
}
```

---

### 更新资源

#### PUT /api/resources/:id

更新资源的元信息。

**路径参数:**

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | string | 资源唯一标识 |

**请求体:**

| 字段 | 类型 | 说明 |
|------|------|------|
| `name` | string | 资源名称 |
| `metadata` | object | 额外元数据（合并更新） |
| `tags` | string[] | 资源标签 |
| `status` | string | 资源状态 |

**请求示例:**

```json
{
  "name": "新版数字人形象",
  "metadata": {
    "author": "张三",
    "version": "2.0"
  },
  "tags": ["avatar", "v2"]
}
```

**响应示例:**

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "新版数字人形象",
    "type": "image",
    "metadata": {
      "originalName": "avatar.png",
      "author": "张三",
      "version": "2.0"
    },
    "tags": ["avatar", "v2"],
    "updatedAt": 1709999999999
  }
}
```

---

### 删除资源

#### DELETE /api/resources/:id

删除指定资源，同时删除对应的物理文件。

**路径参数:**

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | string | 资源唯一标识 |

**响应示例:**

```json
{
  "success": true,
  "message": "资源已删除"
}
```

**错误响应 (404):**

```json
{
  "success": false,
  "error": "资源不存在"
}
```

---

## 资源加载

### 加载资源

#### POST /api/resources/:id/load

加载指定资源到内存。

**路径参数:**

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | string | 资源唯一标识 |

**请求体:**

```json
{
  "options": {
    "cache": true,
    "crossOrigin": "anonymous"
  }
}
```

**响应示例 (图像):**

```json
{
  "success": true,
  "data": {
    "element": "<Image element>",
    "width": 512,
    "height": 512,
    "naturalWidth": 1024,
    "naturalHeight": 1024,
    "type": "image"
  }
}
```

**响应示例 (视频):**

```json
{
  "success": true,
  "data": {
    "element": "<Video element>",
    "duration": 120.5,
    "videoWidth": 1920,
    "videoHeight": 1080,
    "type": "video"
  }
}
```

**响应示例 (3D模型):**

```json
{
  "success": true,
  "data": {
    "url": "/models/avatar.glb",
    "format": "glb",
    "type": "model_3d",
    "loaderConfig": {
      "loader": "GLTFLoader",
      "draco": true
    }
  }
}
```

---

## 统计信息

### 获取统计信息

#### GET /api/resources/stats

获取资源注册表和加载器的统计信息。

**响应示例:**

```json
{
  "success": true,
  "data": {
    "registry": {
      "total": 15,
      "byType": {
        "image": 8,
        "video": 3,
        "model_3d": 2,
        "audio": 1,
        "motion_capture": 1
      }
    },
    "loader": {
      "size": 5,
      "entries": [
        {
          "key": "resource-id-1",
          "state": "success",
          "timestamp": 1709999999999
        }
      ]
    }
  }
}
```

---

## 缓存管理

### 清除缓存

#### POST /api/resources/cache/clear

清除资源加载器的缓存。

**请求体:**

| 字段 | 类型 | 说明 |
|------|------|------|
| `key` | string | 可选，指定要清除的缓存键 |

**响应示例:**

```json
{
  "success": true,
  "message": "缓存已清除"
}
```

---

## 错误处理

所有 API 遵循统一的错误响应格式：

```json
{
  "success": false,
  "error": "错误描述信息"
}
```

**常见 HTTP 状态码:**

| 状态码 | 说明 |
|--------|------|
| 200 | 成功 |
| 201 | 创建成功 |
| 400 | 请求参数错误 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

---

## 资源状态

| 状态 | 说明 |
|------|------|
| `pending` | 待处理 |
| `loading` | 加载中 |
| `ready` | 就绪 |
| `success` | 加载成功 |
| `error` | 加载失败 |
| `cancelled` | 已取消 |

---

## 使用示例

### JavaScript (浏览器)

```javascript
// 注册资源
const response = await fetch('/api/resources', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: '我的数字人',
    type: 'model_3d',
    url: '/models/digital-human.glb'
  })
});
const { data } = await response.json();

// 加载资源
const loadResponse = await fetch(`/api/resources/${data.id}/load`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ options: { cache: true } })
});
const { data: loadedData } = await loadResponse.json();
```

### cURL

```bash
# 获取资源列表
curl -X GET "http://localhost:3000/api/resources?type=image&limit=10"

# 上传文件
curl -X POST -F "file=@/path/to/avatar.png" \
     -F "type=image" \
     -F "name=数字人头像" \
     http://localhost:3000/api/resources/upload

# 删除资源
curl -X DELETE http://localhost:3000/api/resources/550e8400-e29b-41d4-a716-446655440000
```

---

*文档生成时间: 2026-03-16*
*礼部 · 尚书省出品*
