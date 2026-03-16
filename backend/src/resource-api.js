/**
 * 数字人资源管理 API
 * 
 * Phase 1: 资源上传、存储、检索API
 * 
 * 版本: 1.0.0
 */

import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';
import { RESOURCE_TYPES, RESOURCE_FORMATS, RESOURCE_METADATA } from './resource-registry.js';
import { resourceRegistry } from './resource-registry.js';
import { resourceLoader } from './resource-loader.js';

const router = express.Router();

// ============ 静态资源配置 ============

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'resources');

// 确保上传目录存在
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// 配置 multer 存储
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const type = req.body.type || 'image';
    const typeDir = path.join(UPLOAD_DIR, type);
    if (!fs.existsSync(typeDir)) {
      fs.mkdirSync(typeDir, { recursive: true });
    }
    cb(null, typeDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `${randomUUID()}${ext}`;
    cb(null, uniqueName);
  }
});

// 文件过滤器
const fileFilter = (req, file, cb) => {
  const type = req.body.type || 'image';
  const allowedFormats = RESOURCE_FORMATS[type] || [];
  const ext = path.extname(file.originalname).toLowerCase().slice(1);
  
  if (allowedFormats.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`不支持的文件格式: ${ext}. 支持格式: ${allowedFormats.join(', ')}`), false);
  }
};

const upload = multer({ 
  storage,
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB
  }
});

// ============ API 路由 ============

/**
 * GET /api/resources
 * 获取资源列表
 */
router.get('/', (req, res) => {
  try {
    const { type, format, name, tags, page = 1, limit = 20 } = req.query;
    
    let resources;
    if (type || format || name || tags) {
      resources = resourceRegistry.search({
        type,
        format,
        name,
        tags: tags ? tags.split(',') : null
      });
    } else {
      resources = resourceRegistry.getAll();
    }
    
    // 分页
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedResources = resources.slice(startIndex, endIndex);
    
    res.json({
      success: true,
      data: paginatedResources,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: resources.length,
        totalPages: Math.ceil(resources.length / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/resources/:id
 * 获取单个资源
 */
router.get('/:id', (req, res) => {
  try {
    const resource = resourceRegistry.get(req.params.id);
    
    if (!resource) {
      return res.status(404).json({ success: false, error: '资源不存在' });
    }
    
    res.json({ success: true, data: resource });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/resources/types
 * 获取支持的资源类型
 */
router.get('/meta/types', (req, res) => {
  try {
    res.json({
      success: true,
      data: Object.entries(RESOURCE_METADATA).map(([type, meta]) => ({
        type,
        name: meta.name,
        extensions: meta.extensions,
        maxSize: meta.maxSize,
        description: meta.description
      }))
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/resources
 * 注册新资源
 */
router.post('/', (req, res) => {
  try {
    const { id, name, type, url, format, size, metadata, tags } = req.body;
    
    // 验证必填字段
    if (!name || !type || !url) {
      return res.status(400).json({ 
        success: false, 
        error: '缺少必填字段: name, type, url' 
      });
    }
    
    // 验证资源类型
    if (!RESOURCE_TYPES[type]) {
      return res.status(400).json({ 
        success: false, 
        error: `无效的资源类型: ${type}` 
      });
    }
    
    // 自动检测格式
    const detectedFormat = format || path.extname(url).slice(1).toLowerCase();
    
    // 注册资源
    const resource = resourceRegistry.register({
      id: id || randomUUID(),
      name,
      type,
      url,
      format: detectedFormat,
      size: size || 0,
      metadata: metadata || {},
      tags: tags || []
    });
    
    res.status(201).json({ success: true, data: resource });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/resources/upload
 * 上传资源文件
 */
router.post('/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: '没有上传文件' });
    }
    
    const { type = 'image', name, metadata, tags } = req.body;
    
    // 确定资源类型
    let resourceType = type;
    if (!RESOURCE_TYPES[resourceType]) {
      // 根据文件扩展名自动检测
      const ext = path.extname(req.file.filename).slice(1).toLowerCase();
      for (const [t, formats] of Object.entries(RESOURCE_FORMATS)) {
        if (formats.includes(ext)) {
          resourceType = t;
          break;
        }
      }
    }
    
    // 构建资源URL
    const url = `/uploads/resources/${resourceType}/${req.file.filename}`;
    
    // 注册资源
    const resource = resourceRegistry.register({
      id: randomUUID(),
      name: name || req.file.originalname,
      type: resourceType,
      url,
      format: path.extname(req.file.originalname).slice(1).toLowerCase(),
      size: req.file.size,
      metadata: {
        ...metadata,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype
      },
      tags: tags ? tags.split(',') : []
    });
    
    res.status(201).json({ 
      success: true, 
      data: resource,
      file: {
        filename: req.file.filename,
        size: req.file.size,
        path: url
      }
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/resources/:id
 * 更新资源
 */
router.put('/:id', (req, res) => {
  try {
    const resource = resourceRegistry.get(req.params.id);
    
    if (!resource) {
      return res.status(404).json({ success: false, error: '资源不存在' });
    }
    
    const { name, metadata, tags, status } = req.body;
    
    // 更新资源
    if (name) resource.name = name;
    if (metadata) resource.metadata = { ...resource.metadata, ...metadata };
    if (tags) resource.tags = tags;
    if (status) resource.status = status;
    
    resource.updatedAt = Date.now();
    
    res.json({ success: true, data: resource });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/resources/:id
 * 删除资源
 */
router.delete('/:id', (req, res) => {
  try {
    const resource = resourceRegistry.get(req.params.id);
    
    if (!resource) {
      return res.status(404).json({ success: false, error: '资源不存在' });
    }
    
    // 如果是本地文件，删除文件
    if (resource.url && resource.url.startsWith('/uploads/')) {
      const filePath = path.join(process.cwd(), 'public', resource.url);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    
    // 从注册表移除
    resourceRegistry.unregister(req.params.id);
    
    res.json({ success: true, message: '资源已删除' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/resources/:id/load
 * 加载资源
 */
router.post('/:id/load', async (req, res) => {
  try {
    const resource = resourceRegistry.get(req.params.id);
    
    if (!resource) {
      return res.status(404).json({ success: false, error: '资源不存在' });
    }
    
    const data = await resourceLoader.load(resource, req.body.options || {});
    
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/resources/stats
 * 获取资源统计信息
 */
router.get('/stats', (req, res) => {
  try {
    const stats = resourceRegistry.getStats();
    const cacheStatus = resourceLoader.getCacheStatus();
    
    res.json({
      success: true,
      data: {
        registry: stats,
        loader: cacheStatus
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/resources/cache/clear
 * 清除资源缓存
 */
router.post('/cache/clear', (req, res) => {
  try {
    const { key } = req.body;
    resourceLoader.clearCache(key);
    res.json({ success: true, message: '缓存已清除' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 错误处理中间件
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    return res.status(400).json({ success: false, error: error.message });
  }
  if (error) {
    return res.status(400).json({ success: false, error: error.message });
  }
  next();
});

export default router;
