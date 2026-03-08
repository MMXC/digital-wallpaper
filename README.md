# Slack 数字人团队动态壁纸

> 项目代号：Slack-DigitalTeam-Wallpaper  
> 版本：v1.0  
> 状态：🚧 施工中

## 1. 产品概述

### 1.1 背景
用户已在 Slack 环境中部署了多智能体团队，通过特定频道输出协作信息。目前缺乏一种直观、沉浸式的可视化手段，将文本流转化为具象化的"数字人团队协作场景"。

### 1.2 目标
构建一个运行于 **Wallpaper Engine** 中的动态壁纸，通过本地中间件桥接 Slack 指定频道，实现：
1. **实时可视化**：将 Slack 频道内的 AI 代理消息转化为 3D 数字人的动作、语音和表情
2. **零配置网络**：利用 Slack Socket Mode，无需公网 IP，无需用户配置端口转发
3. **解耦架构**：Slack 代理只负责输出"契约 JSON"，壁纸只负责"演绎"，中间件负责"转发"

---

## 2. 系统架构

```
┌─────────────┐     契约JSON      ┌─────────────────┐    WebSocket     ┌────────────────────┐
│ Slack 频道  │ ───────────────▶ │  本地中间件      │ ───────────────▶  │  Wallpaper Engine  │
│ AI Agent    │                  │  Node.js Service │                  │  Web Wallpaper     │
└─────────────┘                  └─────────────────┘                  └────────────────────┘
```

### 核心组件
- **Slack App**：开启 Socket Mode，作为消息源
- **Local Gateway (Node.js)**：本地常驻进程，连接 Slack 并充当 WebSocket 服务端
- **Web Wallpaper (Three.js)**：作为 Wallpaper Engine 的内容，连接本地网关并渲染画面

---

## 3. 数据契约

AI 代理输出的消息需符合以下格式：

```json
{
  "protocol": "avatar_action_v1",
  "agent": "Dev_A",
  "action": "speak",
  "text": "代码已提交，等待 Review。",
  "emotion": "happy",
  "target": "PM_Bot"
}
```

| 字段 | 类型 | 必填 | 说明 |
| :--- | :--- | :--- | :--- |
| `protocol` | String | 是 | 固定值 `avatar_action_v1` |
| `agent` | String | 是 | 执行动作的代理名称 |
| `action` | String | 是 | 动作类型：`speak`, `idle`, `move` |
| `text` | String | 条件 | 说话内容，`action=speak` 时必填 |
| `emotion` | String | 否 | 表情：`happy`, `sad`, `angry`, `neutral` |
| `target` | String | 否 | 交互对象 |

---

## 4. 实施路线图

| 阶段 | 状态 | 任务 | 产出 |
| :--- | :---: | :--- | :--- |
| **Phase 1** | ⏳ | 环境搭建与契约定义 | Slack App 创建，获取 Token |
| **Phase 2** | ⏳ | 中间件开发 | 实现 `index.js`，完成 Slack -> WS |
| **Phase 3** | ⏳ | 前端场景搭建 | Three.js 空场景跑通 |
| **Phase 4** | ⏳ | 数字人集成 | VRM 模型加载，动作逻辑 |
| **Phase 5** | ⏳ | 打包与交付 | 编写启动脚本，发布 Release |

---

## 5. 技术栈

- **后端**：Node.js, @slack/bolt, ws
- **前端**：Three.js, @pixiv/three-vrm
- **部署**：Wallpaper Engine

---

## 6. 快速开始

```bash
# 克隆项目
git clone https://github.com/MMXC/digital-wallpaper.git
cd digital-wallpaper

# 安装后端依赖
cd backend
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 填入 Slack Token

# 启动服务
node src/index.js
```

详细文档见 [docs/](docs/) 目录。

---

*本项目由 AI 助手团队施工建造*
