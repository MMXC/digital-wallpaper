"""
Slack/飞书消息监听服务 + TTS语音合成
用于驱动数字人壁纸
"""
import asyncio
import json
import os
import threading
from http.server import HTTPServer, BaseHTTPRequestHandler
from slack_sdk import WebClient
from slack_sdk.socket_mode import SocketModeClient
from slack_sdk.errors import SlackApiError
import edge_tts
import asyncio

# ========== 配置 ==========
SLACK_BOT_TOKEN = os.getenv("SLACK_BOT_TOKEN", "xoxb-your-token")
SLACK_APP_TOKEN = os.getenv("SLACK_APP_TOKEN", "xapp-your-token")
LISTEN_CHANNELS = ["C01.your.channel"]  # 要监听的频道

# ========== Slack 消息监听 ==========
class SlackListener:
    def __init__(self, on_message_callback):
        self.on_message = on_message_callback
        self.client = WebClient(token=SLACK_BOT_TOKEN)
        
    def start_socket_mode(self):
        """Socket Mode 监听（推荐）"""
        socket_client = SocketModeClient(
            app_token=SLACK_APP_TOKEN,
            web_client=self.client
        )
        
        # 绑定事件处理
        socket_client.socket_mode_request_listeners.append(self.handle_event)
        socket_client.connect()
        print("[Slack] Socket Mode 已连接")
        
    def handle_event(self, client, req):
        """处理Slack事件"""
        if req.type == "events_api":
            payload = req.payload
            event = payload.get("event", {})
            
            if event.get("type") == "message" and "bot_message" not in event:
                # 过滤机器人消息
                channel = event.get("channel")
                user = event.get("user")
                text = event.get("text")
                ts = event.get("ts")
                
                message = {
                    "channel": channel,
                    "user": user,
                    "text": text,
                    "ts": ts
                }
                
                print(f"[Slack] 收到消息: {text}")
                self.on_message(message)
                
    def start_polling(self):
        """备用：轮询方式"""
        print("[Slack] 启动轮询模式")
        while True:
            try:
                result = self.client.conversations_history(
                    channel=LISTEN_CHANNELS[0],
                    limit=1
                )
                messages = result.get("messages", [])
                if messages:
                    msg = messages[0]
                    if "bot_message" not in msg:
                        self.on_message(msg)
            except SlackApiError as e:
                print(f"[Slack] Error: {e}")
            
            asyncio.sleep(5)

# ========== TTS 语音合成 ==========
class TTSEngine:
    def __init__(self, voice="zh-CN-XiaoxiaoNeural"):
        self.voice = voice
        
    async def speak(self, text, output_file="temp.mp3"):
        """生成语音文件"""
        communicate = edge_tts.Communicate(text, self.voice)
        await communicate.save(output_file)
        return output_file
        
    async def list_voices(self):
        """列出可用声音"""
        voices = await edge_tts.list_voices()
        chinese_voices = [v for v in voices if v["Locale"].startswith("zh-")]
        return chinese_voices

# ========== 主程序 ==========
class DigitalHumanService:
    def __init__(self):
        self.tts = TTSEngine()
        self.slack = SlackListener(self.on_new_message)
        
    def on_new_message(self, message):
        """收到新消息的回调"""
        text = message.get("text", "")
        
        # 发送到桌面应用（通过HTTP或IPC）
        self.send_to_desktop(message)
        
        # 生成语音
        asyncio.run(self.tts.speak(text))
        
    def send_to_desktop(self, message):
        """发送到桌面应用"""
        # 可以通过HTTP请求发送到 Electron 应用
        # 或者写入共享文件
        pass
        
    def run(self):
        """启动服务"""
        print("[Service] 数字人服务启动")
        
        # 启动Slack监听
        try:
            self.slack.start_socket_mode()
        except Exception as e:
            print(f"[Service] Socket Mode 失败: {e}")
            print("[Service] 回退到轮询模式")
            threading.Thread(target=self.slack.start_polling, daemon=True).start()
        
        # 保持运行
        while True:
            asyncio.sleep(1)

if __name__ == "__main__":
    service = DigitalHumanService()
    service.run()
