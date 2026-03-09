/**
 * Wallpaper Engine 数字人前端 - 虚拟办公场景版
 * 
 * 架构: 静态文件服务 (来自 React 构建)
 * 端口: 18791
 */

import express from 'express';
import { createServer } from 'http';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const server = createServer(app);

const HTTP_PORT = 18791;

// ============ 静态文件服务 (虚拟办公场景) ============
app.use(express.static(join(__dirname, 'static')));

// ============ HTML 页面 ============
app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'static', 'index.html'));
});

// ============ 启动 ============
server.listen(HTTP_PORT, () => {
  console.log(`🎨 Wallpaper Engine 服务已启动: http://localhost:${HTTP_PORT}`);
  console.log(`📁 静态文件目录: ${join(__dirname, 'static')}`);
});
