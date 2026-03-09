#!/usr/bin/env python3
"""
Agent 状态数据获取服务
读取 tasks_source.json 获取任务状态，聚合各 Agent 的实时状态
"""
import json
import os
from datetime import datetime
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import threading

# 数据文件路径
DATA_DIR = os.path.dirname(os.path.abspath(__file__)) + "/../workspace-zhongshu/data"
TASKS_FILE = os.path.join(DATA_DIR, "tasks_source.json")
LIVE_STATUS_FILE = os.path.join(DATA_DIR, "live_status.json")

# 默认 Agent 列表
DEFAULT_AGENTS = [
    {"id": "zhongshu", "name": "中书省", "role": "规划决策"},
    {"id": "menxia", "name": "门下省", "role": "审核审议"},
    {"id": "shangshusheng", "name": "尚书省", "role": "执行派发"},
    {"id": "bingbu", "name": "兵部", "role": "战斗部署"},
    {"id": "gongbu", "name": "工部", "role": "工程建设"},
    {"id": "libu", "name": "吏部", "role": "人事管理"},
    {"id": "hubu", "name": "户部", "role": "财政税收"},
    {"id": "bingbu2", "name": "刑部", "role": "司法审断"},
    {"id": "xingbu", "name": "礼部", "role": "外交礼仪"},
]


def load_tasks():
    """加载任务数据"""
    try:
        if os.path.exists(TASKS_FILE):
            with open(TASKS_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
    except Exception as e:
        print(f"加载任务失败: {e}")
    return []


def get_agent_status(agent_id, tasks):
    """获取单个 Agent 的状态"""
    # 查找该 Agent 的当前任务
    agent_tasks = [t for t in tasks if t.get("assignedTo") == agent_id or t.get("state") == agent_id]
    
    # 计算状态
    in_progress = [t for t in agent_tasks if t.get("status") == "in-progress"]
    blocked = [t for t in agent_tasks if t.get("status") == "blocked"]
    done = [t for t in agent_tasks if t.get("status") == "done"]
    
    if blocked:
        status = "blocked"
        current_task = blocked[0].get("title", "阻塞任务")
    elif in_progress:
        status = "busy"
        current_task = in_progress[0].get("title", "进行中任务")
    elif agent_tasks:
        status = "idle"
        current_task = agent_tasks[0].get("title", "待处理")
    else:
        status = "idle"
        current_task = "待命中"
    
    # 计算负载 (0-1)
    load = min(1.0, len(in_progress) * 0.5 + len(blocked) * 0.3)
    
    return {
        "id": agent_id,
        "status": status,
        "currentTask": current_task,
        "load": load,
        "inProgressCount": len(in_progress),
        "blockedCount": len(blocked),
        "doneCount": len(done),
        "lastHeartbeat": datetime.now().isoformat()
    }


def aggregate_status():
    """聚合所有 Agent 状态"""
    tasks = load_tasks()
    
    # 如果没有任务数据，使用默认 Agent 列表并设置空闲状态
    if not tasks:
        agents = DEFAULT_AGENTS
    else:
        # 从任务中提取 Agent
        agent_ids = set()
        for task in tasks:
            if task.get("assignedTo"):
                agent_ids.add(task["assignedTo"])
            if task.get("state"):
                agent_ids.add(task["state"])
        agents = [{"id": aid, "name": aid, "role": ""} for aid in agent_ids]
        if not agents:
            agents = DEFAULT_AGENTS
    
    agent_statuses = []
    for agent in agents:
        status = get_agent_status(agent["id"], tasks)
        status["name"] = agent["name"]
        status["role"] = agent["role"]
        agent_statuses.append(status)
    
    return {
        "generatedAt": datetime.now().isoformat(),
        "agents": agent_statuses,
        "totalAgents": len(agent_statuses),
        "idleCount": len([s for s in agent_statuses if s["status"] == "idle"]),
        "busyCount": len([s for s in agent_statuses if s["status"] == "busy"]),
        "blockedCount": len([s for s in agent_statuses if s["status"] == "blocked"]),
    }


class AgentStatusHandler(BaseHTTPRequestHandler):
    """HTTP 请求处理器"""
    
    def do_GET(self):
        parsed = urlparse(self.path)
        
        if parsed.path == "/api/status":
            # 返回聚合状态
            status = aggregate_status()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps(status, ensure_ascii=False).encode())
        elif parsed.path == "/api/agents":
            # 返回 Agent 列表
            status = aggregate_status()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps(status["agents"], ensure_ascii=False).encode())
        else:
            self.send_response(404)
            self.end_headers()
    
    def log_message(self, format, *args):
        print(f"[{datetime.now().strftime('%H:%M:%S')}] {format % args}")


def run_server(port=3001):
    """运行服务"""
    server = HTTPServer(("0.0.0.0", port), AgentStatusHandler)
    print(f"🤖 Agent 状态服务已启动: http://localhost:{port}/api/status")
    print(f"   Agent 列表: http://localhost:{port}/api/agents")
    server.serve_forever()


if __name__ == "__main__":
    run_server()
