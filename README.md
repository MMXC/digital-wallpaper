# Digital Human Wallpaper

Windows桌面数字人壁纸 - 原型

## 技术栈

- **Electron 28** - 透明置顶窗口
- **WebView2** - 嵌入SadTalker/D-ID数字人
- **Python** - Slack/飞书消息监听 + edge-tts

## 项目结构

```
digital-human-wallpaper/
├── package.json           # Electron配置
├── src/
│   ├── main.js            # 主进程 - 透明窗口
│   ├── preload.js         # 预加载 - 安全IPC
│   ├── index.html         # 数字人界面
│   ├── renderer.js        # 渲染进程 - 消息处理
│   └── assets/
│       └── default-avatar.png
└── backend/
    └── service.py         # 消息监听 + TTS服务
```

## 快速开始

### 1. 安装依赖

```bash
# Electron依赖
cd digital-human-wallpaper
npm install

# Python依赖
pip install slack-sdk edge-tts
```

### 2. 配置环境变量

```bash
# Slack Bot Token
export SLACK_BOT_TOKEN="xoxb-your-token"
# Slack App Token (Socket Mode)
export SLACK_APP_TOKEN="xapp-your-token"
```

### 3. 启动

```bash
# 启动桌面应用
npm start

# 启动后端服务（另一个终端）
python backend/service.py
```

## 阶段成果

### Phase 1 ✅ 完成
- [x] Electron透明置顶窗口
- [x] 消息气泡UI
- [x] 基础IPC通信
- [x] 项目结构搭建

### Phase 2 计划
- [ ] Slack消息监听集成
- [ ] edge-tts语音合成
- [ ] WebView2嵌入SadTalker

### Phase 3 计划
- [ ] 音频驱动数字人视频生成
- [ ] 多消息聚合播报

## 注意事项

1. **运行环境**: 需要Windows 10/11
2. **WebView2**: 需要安装Edge WebView2 Runtime
3. **SadTalker**: 需要NVIDIA GPU (6GB+ VRAM)
