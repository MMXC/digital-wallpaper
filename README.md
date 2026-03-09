# 🎭 Digital Wallpaper - 数字壁纸

> Slack AI Agent 数字人团队状态展示与虚拟办公场景

## 📺 效果预览

![Digital Wallpaper](preview.jpg)

数字人Avatar根据Slack频道消息实时更新状态和动作：
- 🎯 **动作**: speak, wave, nod, dance, think, idle
- 😊 **情感**: happy, sad, angry, neutral, excited, surprised
- 💬 **消息内容**: 直接显示Slack消息文本

---

## 🏗 架构

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────────┐
│  Slack 频道     │────▶│  Slack 中间件    │────▶│  Wallpaper Engine  │
│  (AI Agent)     │     │  (Node.js)       │     │  (Web Effect)       │
└─────────────────┘     └──────────────────┘     └─────────────────────┘
                              │ WebSocket                  │ HTTP
                              └────────────────────────────┘
```

- **Backend**: Slack Socket Mode 中间件，接收Slack消息并通过WebSocket转发
- **Frontend**: Wallpaper Engine Web Effect，渲染3D数字人Avatar

---

## 🚀 快速开始

### 方式一：一键启动（推荐）

```bash
# 克隆项目后，双击运行
start.bat
```

### 方式二：手动启动

```bash
# 1. 安装 Backend 依赖
cd backend
npm install

# 2. 安装 Frontend 依赖
cd ../wallpaper-frontend
npm install express ws three

# 3. 启动 Backend（终端1）
cd backend
npm start

# 4. 启动 Frontend（终端2）
cd ../wallpaper-frontend
node server.js

# 5. Wallpaper Engine 添加 web effect
# URL: http://localhost:18791
```

### 方式三：托盘版（高级）

支持Windows任务栏托盘图标、右键菜单、最小化到托盘

```bash
# 双击运行
start-tray.bat
```

---

## ⚙️ Slack 配置

### 1. 创建 Slack App

1. 访问 https://api.slack.com/apps
2. 点击 "Create New App" → "From scratch"
3. 填写 App 名称，选择工作区

### 2. 启用 Socket Mode

- 进入 "Socket Mode" 页面
- 开启 "Enable Socket Mode"
- 生成 App-level Token（以 `xapp-` 开头）

### 3. 订阅事件

进入 "Event Subscriptions" 页面：
- 开启 "Enable Events"
- 订阅 `message.channels`
- 添加 Bot User Events: `message.channels`

### 4. 添加权限

进入 "OAuth & Permissions" 页面：
- 添加 Bot Token Scopes:
  - `chat:write`
  - `channels:history`

### 5. 安装应用

进入 "Install App" 页面：
- 点击 "Install to Workspace"
- 复制 Bot User OAuth Token（以 `xoxb-` 开头）

### 6. 配置环境变量

复制 `backend/.env.example` 为 `backend/.env`：

```env
SLACK_SIGNING_SECRET=your_signing_secret
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_APP_TOKEN=xapp-your-app-token
```

---

## 🎮 使用方式

在Slack频道发送JSON契约：

```json
{
  "protocol": "avatar_action_v1",
  "agent": "Dev_A",
  "action": "speak",
  "text": "代码已提交",
  "emotion": "happy",
  "target": "PM_Bot"
}
```

### 支持的参数

| 参数 | 说明 | 可选值 |
|------|------|--------|
| `action` | 动作 | `speak`, `wave`, `nod`, `dance`, `think`, `idle` |
| `emotion` | 情感 | `happy`, `sad`, `angry`, `neutral`, `excited`, `surprised` |
| `text` | 显示的文本 | 任意字符串 |
| `target` | 目标用户 | 任意字符串 |

---

## 🎨 Wallpaper Engine 集成

### 方法一：直接添加 Web Effect

1. 打开 Wallpaper Engine
2. 右键 → "添加壁纸" → "创建空白项目"
3. 选择 "Web" 类型
4. 输入 URL: `http://localhost:18791`
5. 完成！

### 方法二：使用项目配置

1. 将 `wallpaper-frontend/project.json` 复制到你的壁纸项目目录
2. 在 Wallpaper Engine 中打开该目录
3. 选择 "Digital Wallpaper" 项目

### project.json 配置说明

```json
{
  "name": "Digital Wallpaper",
  "type": "web",
  "content": {
    "index": "index.html",
    "localhost": true,
    "port": 18791
  },
  "settings": {
    "name": "🎭 Digital Avatar",
    "description": "Slack AI Agent 数字人"
  }
}
```

---

## 🖥 Windows 托盘功能

启动 `start-tray.bat` 或在 `windows-tray` 目录运行：

```bash
cd windows-tray
npm install
npm start
```

### 功能特性

- ✅ 任务栏显示应用图标
- ✅ 最小化到系统托盘
- ✅ 右键托盘菜单：
  - 🌐 打开主界面
  - ⚙️ 设置 Slack Bot
  - ▶️ 启动/停止服务
  - 🔄 重启服务
  - ❌ 退出

---

## 📁 项目结构

```
digital-wallpaper/
├── backend/                    # Slack 中间件
│   ├── src/
│   │   └── index.js           # Slack Bolt + WebSocket
│   ├── .env.example           # 环境变量模板
│   └── package.json
│
├── wallpaper-frontend/        # Wallpaper Engine 前端
│   ├── server.js              # HTTP + WebSocket 服务
│   ├── project.json           # Wallpaper Engine 配置
│   ├── index.html             # 3D Avatar 渲染
│   └── package.json
│
├── windows-tray/              # Windows 托盘应用
│   ├── tray-app.js            # Electron 主程序
│   ├── settings.html          # 设置页面
│   ├── assets/                # 图标资源
│   └── package.json
│
├── start.bat                  # 一键启动（命令行版）
├── start-tray.bat             # 一键启动（托盘版）
└── README.md                  # 本文档
```

---

## 🔧 端口配置

| 服务 | 端口 | 说明 |
|------|------|------|
| Frontend HTTP | 18791 | Wallpaper Engine 访问 |
| Backend WebSocket | 18790 | 前后端通信 |

如需修改，编辑以下文件：
- `wallpaper-frontend/server.js`: `HTTP_PORT`
- `wallpaper-frontend/server.js`: `BACKEND_WS_URL`

---

## 🐛 常见问题

### Q: Wallpaper Engine 无法连接
A: 检查防火墙设置，确保 localhost:18791 可访问

### Q: Slack 消息未收到
A: 检查 .env 配置是否正确，Bot 是否已添加到频道

### Q: 3D 渲染不流畅
A: 降低 Wallpaper Engine 的帧率限制

---

## 📄 协议

MIT License - OpenClaw Team

---

## 🔗 相关链接

- [Slack API](https://api.slack.com/)
- [Wallpaper Engine](https://www.wallpaperengine.io/)
- [Three.js](https://threejs.org/)
- [Electron](https://www.electronjs.org/)
