# 数字壁纸 - Avatar Action Gateway

**PRD 架构:**
```
Slack频道(AI Agent) → 本地中间件(Node.js) → Wallpaper Engine(Web)
```

## 目录结构

```
digital-wallpaper/
├── backend/               # Slack 中间件
│   ├── src/
│   │   └── index.js       # Slack Bolt + WebSocket 转发
│   ├── package.json
│   └── .env.example       # 环境变量模板
│
└── wallpaper-frontend/   # Wallpaper Engine 前端
    ├── server.js         # HTTP + WebSocket 客户端
    ├── public/           # 静态资源
    └── package.json
```

## 启动步骤

### 1. 安装依赖

```bash
# Slack 中间件
cd backend
npm install

# Wallpaper Engine 前端
cd ../wallpaper-frontend
npm install express ws three
```

### 2. 配置 Slack

1. 访问 https://api.slack.com/apps 创建新 App
2. **Socket Mode**: 启用
3. **Event Subscriptions**: 订阅 `message.channels`
4. **Bot Token Scopes**: `chat:write`, `channels:history`
5. 安装到工作区

复制 `.env.example` 为 `.env` 并填入凭证:
```
SLACK_SIGNING_SECRET=xxx
SLACK_BOT_TOKEN=xoxb-xxx
SLACK_APP_TOKEN=xapp-xxx
```

### 3. 启动服务

```bash
# 终端1: 启动 Slack 中间件
cd backend
npm start

# 终端2: 启动 Wallpaper 前端
cd wallpaper-frontend
node server.js
```

### 4. 配置 Wallpaper Engine

添加 web effect，URL: `http://localhost:18791`

## 使用方式

在 Slack 频道发送 JSON 契约:

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

支持的 action: `speak`, `wave`, `nod`, `dance`, `think`, `idle`
支持的 emotion: `happy`, `sad`, `angry`, `neutral`, `excited`, `surprised`
