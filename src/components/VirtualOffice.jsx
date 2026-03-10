import { Canvas } from '@react-three/fiber'
import { OrbitControls, Text, Html, Float, useGLTF, Environment } from '@react-three/drei'
import { useState, useEffect, useRef } from 'react'

// ============ 背景配置 ============
const BACKGROUND_CONFIG = {
  mode: 'environment',  // 'static' | 'video' | 'environment'
  static: {
    color: '#0f172a',  // 默认深蓝色
    image: null,       // 可选：背景图URL
  },
  video: {
    url: null,         // 视频URL
  },
  environment: {
    preset: 'city',   // 'city' | 'studio' | 'park' | 'dawn' | 'night' | 'sunset' 等
  }
}

// ============ Agent 配置 ============
const AGENT_CONFIG = {
  // 自定义 Agent 列表（null = 自动从 OpenClaw 获取）
  customAgents: null,
  
  // Agent 头像映射（key 为 agent id 或 label）
  avatars: {
    // 'taizi': '/avatars/taizi.png',
  },
  
  // 默认头像
  defaultAvatar: null,
  
  // Agent 名称映射
  names: {
    // 'taizi': '太子',
  }
}

// ============ WebSocket 连接 Hook ============
function useWebSocket(onMessage) {
  const wsRef = useRef(null)
  const [connected, setConnected] = useState(false)
  
  useEffect(() => {
    const wsUrl = WS_CONFIG.url
    let ws = null
    let reconnectTimer = null
    
    const connect = () => {
      try {
        ws = new WebSocket(wsUrl)
        wsRef.current = ws
        
        ws.onopen = () => {
          console.log('🔌 WebSocket 已连接')
          setConnected(true)
        }
        
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            console.log('📨 收到 WebSocket 消息:', data)
            if (onMessage) onMessage(data)
          } catch (e) {
            console.error('消息解析失败:', e)
          }
        }
        
        ws.onclose = () => {
          console.log('🔌 WebSocket 已断开')
          setConnected(false)
          reconnectTimer = setTimeout(connect, 3000)
        }
        
        ws.onerror = (error) => {
          console.error('WebSocket 错误:', error)
        }
      } catch (e) {
        console.error('WebSocket 连接失败:', e)
      }
    }
    
    connect()
    
    return () => {
      if (ws) ws.close()
      if (reconnectTimer) clearTimeout(reconnectTimer)
    }
  }, [])
  
  return { connected, ws: wsRef.current }
}

// ============ 使用轮询或WebSocket获取更新 ============
function usePolling(onTaskUpdate) {
  const [agents, setAgents] = useState([])
  const [loading, setLoading] = useState(true)
  const [wsConnected, setWsConnected] = useState(false)
  
  // WebSocket 消息处理
  const handleWsMessage = useCallback((data) => {
    console.log('📨 WS收到消息:', data)
    if (data.type === 'connected') {
      console.log('✅ WebSocket 连接成功')
      return
    }
    if (data.type === 'agent_update' && data.agents) {
      console.log('📋 更新Agent列表:', data.agents)
      setAgents(data.agents)
    }
    if (data.type === 'task_update' && data.tasks) {
      console.log('📋 收到任务更新:', data.tasks)
      TASK_BOARD_CONFIG.tasks = data.tasks
      onTaskUpdate?.(data.tasks)
    }
  }, [onTaskUpdate])
  
  // 使用 WebSocket
  const { connected } = useWebSocket(handleWsMessage)
  
  useEffect(() => {
    setWsConnected(connected)
  }, [connected])
  
  // 也保留轮询作为备用
  const fetchUpdates = useCallback(async () => {
    try {
      const res = await fetch('http://localhost:3001/api/config')
      if (res.ok) {
        const config = await res.json()
        if (config.tasks && config.tasks.length > 0) {
          console.log('📋 轮询获取任务:', config.tasks)
          TASK_BOARD_CONFIG.tasks = config.tasks
          onTaskUpdate?.(config.tasks)
        }
        if (config.agents && !connected) {
          setAgents(config.agents)
        }
      }
    } catch (e) {
      console.log('轮询:', e.message)
    }
  }, [onTaskUpdate, connected])
  
  useEffect(() => {
    fetchUpdates()
    // 如果没连WS，每3秒轮询一次
    if (!connected) {
      const interval = setInterval(fetchUpdates, 3000)
      return () => clearInterval(interval)
    }
  }, [fetchUpdates, connected])
  
  return { agents, loading, wsConnected }
}

// ============ OpenClaw 状态获取 Hook ============
function useOpenClawStatus(onTaskUpdate) {
  const [agents, setAgents] = useState([])
  const [loading, setLoading] = useState(true)
  
  const handleWsMessage = (data) => {
    console.log('📨 WS收到消息:', data)
    if (data.type === 'connected') {
      console.log('✅ WebSocket 连接成功')
      return
    }
    
    if (data.type === 'agent_update' && data.agents) {
      console.log('📋 更新Agent列表:', data.agents)
      setAgents(data.agents)
    }
    
    if (data.type === 'task_update' && data.tasks) {
      console.log('📋 收到任务更新:', data.tasks)
      TASK_BOARD_CONFIG.tasks = data.tasks
      onTaskUpdate?.(data.tasks)
    }
  }
  
  // 使用轮询获取更新
  const { connected } = usePolling(handleWsMessage)
  
  // 从后端获取配置（优先）或本地 config.json
  useEffect(() => {
    // 优先尝试从后端获取，否则用本地 config.json
    fetch('http://localhost:3001/api/config', { signal: AbortSignal.timeout(1000) })
      .then(res => res.ok ? res.json() : Promise.reject())
      .catch(() => fetch('/config.json', { signal: AbortSignal.timeout(1000) }).then(res => res.ok ? res.json() : Promise.reject()))
      .then(config => {
        if (!config) return
        if (config.wsUrl) WS_CONFIG.url = config.wsUrl
        if (config.avatars) Object.assign(AGENT_CONFIG.avatars, config.avatars)
        if (config.names) Object.assign(AGENT_CONFIG.names, config.names)
        if (config.background) {
          if (config.background.mode) BACKGROUND_CONFIG.mode = config.background.mode
          if (config.background.preset) BACKGROUND_CONFIG.environment.preset = config.background.preset
          if (config.background.color) BACKGROUND_CONFIG.static.color = config.background.color
        }
        if (config.agents) AGENT_CONFIG.customAgents = config.agents
        if (config.tasks) TASK_BOARD_CONFIG.tasks = config.tasks
      })
      .catch(() => {})
  }, [])
  
  useEffect(() => {
    // 如果配置了自定义 Agent 列表，直接使用
    if (AGENT_CONFIG.customAgents && Array.isArray(AGENT_CONFIG.customAgents)) {
      setAgents(AGENT_CONFIG.customAgents)
      setLoading(false)
      return
    }
    
    // 默认虚拟办公场景的 Agent 列表
    const defaultAgents = [
      { id: 'taizi', name: '太子', role: '项目总控', status: 'idle', currentTask: '监控全局', color: '#8b5cf6' },
      { id: 'zhongshu', name: '中书省', role: '规划决策', status: 'idle', currentTask: '待命中', color: '#3b82f6' },
      { id: 'menxia', name: '门下省', role: '审核审议', status: 'busy', currentTask: '审批中', color: '#10b981' },
      { id: 'shangshu', name: '尚书省', role: '执行派发', status: 'idle', currentTask: '待命中', color: '#f59e0b' },
      { id: 'bingbu', name: '兵部', role: '战斗部署', status: 'blocked', currentTask: '等待资源', color: '#ef4444' },
      { id: 'gongbu', name: '工部', role: '工程建设', status: 'idle', currentTask: '待命中', color: '#6366f1' },
      { id: 'hubu', name: '户部', role: '财政资源', status: 'busy', currentTask: '核算中', color: '#14b8a6' },
      { id: 'libu', name: '礼部', role: '外交礼仪', status: 'idle', currentTask: '待命中', color: '#f97316' },
      { id: 'xingbu', name: '刑部', role: '司法审判', status: 'idle', currentTask: '待命中', color: '#84cc16' },
    ]
    
    const fetchStatus = async () => {
      try {
        // 尝试从本地 API 获取（如果后端服务运行）
        const res = await fetch('http://localhost:3001/api/agents', { 
          signal: AbortSignal.timeout(2000) 
        })
        if (res.ok) {
          const data = await res.json()
          setAgents(data)
        } else {
          // 使用默认数据 + 模拟实时更新
          setAgents(prev => {
            if (prev.length === 0) return defaultAgents
            // 模拟状态随机变化
            return prev.map(a => ({
              ...a,
              status: Math.random() > 0.8 ? (a.status === 'idle' ? 'busy' : 'idle') : a.status
            }))
          })
        }
      } catch (err) {
        // 使用默认数据
        setAgents(prev => {
          if (prev.length === 0) return defaultAgents
          // 模拟状态随机变化
          return prev.map(a => ({
            ...a,
            status: Math.random() > 0.9 ? 
              (a.status === 'idle' ? 'busy' : a.status === 'busy' ? 'blocked' : 'idle') : a.status
          }))
        })
      } finally {
        setLoading(false)
      }
    }
    
    fetchStatus()
    // 每5秒更新一次
    const interval = setInterval(fetchStatus, 5000)
    return () => clearInterval(interval)
  }, [])
  
  return { agents, loading, wsConnected: connected }
}

// ============ 3D 组件 ============

// 数字人 Agent 头像
function AgentAvatar({ agent, position, onClick, isSelected }) {
  const meshRef = useRef()
  const [hovered, setHovered] = useState(false)
  
  const statusColors = {
    idle: '#4ade80',     // 绿色 - 待命
    busy: '#facc15',     // 黄色 - 工作
    blocked: '#f87171',  // 红色 - 阻塞
  }
  
  const color = agent.color || statusColors[agent.status] || '#4ade80'
  const glowColor = statusColors[agent.status] || statusColors.idle
  
  // 获取自定义头像
  const avatarUrl = AGENT_CONFIG.avatars[agent.id] || AGENT_CONFIG.avatars[agent.label] || AGENT_CONFIG.defaultAvatar
  
  // 浮动动画
  const floatY = Math.sin(Date.now() / 1000 + position[0]) * 0.05
  
  return (
    <group 
      position={[position[0], position[1] + floatY, position[2]]}
      onClick={(e) => { e.stopPropagation(); onClick(agent) }}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      {/* 主体 - 圆柱形代表数字人 */}
      <mesh position={[0, 0, 0]} castShadow>
        <cylinderGeometry args={[0.3, 0.35, 0.8, 32]} />
        <meshStandardMaterial 
          color={color} 
          metalness={0.3}
          roughness={0.4}
        />
      </mesh>
      
      {/* 头部 - 球体 或 自定义头像 */}
      {avatarUrl ? (
        <Html position={[0, 0.55, 0]} center distanceFactor={3}>
          <img 
            src={avatarUrl} 
            alt={agent.label}
            style={{
              width: '50px',
              height: '50px',
              borderRadius: '50%',
              border: `3px solid ${color}`,
              objectFit: 'cover',
            }}
          />
        </Html>
      ) : (
        <mesh position={[0, 0.55, 0]} castShadow>
          <sphereGeometry args={[0.25, 32, 32]} />
          <meshStandardMaterial 
            color={color}
            metalness={0.5}
            roughness={0.3}
          />
        </mesh>
      )}
      
      {/* 状态光环 */}
      <mesh position={[0, 0.3, 0]}>
        <torusGeometry args={[0.5, 0.03, 16, 32]} />
        <meshBasicMaterial 
          color={glowColor} 
          transparent 
          opacity={hovered ? 0.8 : 0.4} 
        />
      </mesh>
      
      {/* 底部光晕 */}
      <mesh position={[0, -0.35, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.4, 32]} />
        <meshBasicMaterial 
          color={glowColor} 
          transparent 
          opacity={0.3} 
        />
      </mesh>
      
      {/* 名字标签 */}
      <Float speed={2} rotationIntensity={0} floatIntensity={0.3}>
        <Html position={[0, 1.1, 0]} center distanceFactor={10}>
          <div style={{
            background: hovered ? 'rgba(78, 204, 163, 0.95)' : 'rgba(0,0,0,0.85)',
            color: 'white',
            padding: '6px 12px',
            borderRadius: '8px',
            fontSize: '13px',
            whiteSpace: 'nowrap',
            textAlign: 'center',
            border: isSelected ? '2px solid #4ecca3' : '1px solid rgba(255,255,255,0.2)',
            transform: hovered ? 'scale(1.1)' : 'scale(1)',
            transition: 'all 0.2s ease',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          }}>
            <div style={{ fontWeight: 'bold', fontSize: '14px' }}>
              {AGENT_CONFIG.names[agent.id] || AGENT_CONFIG.names[agent.label] || agent.name || agent.label}
            </div>
            <div style={{ fontSize: '10px', opacity: 0.85, marginTop: '2px' }}>{agent.role}</div>
          </div>
        </Html>
      </Float>
      
      {/* 状态标签 */}
      <Html position={[0, -0.6, 0]} center distanceFactor={10}>
        <div style={{
          background: glowColor,
          color: '#000',
          padding: '3px 10px',
          borderRadius: '10px',
          fontSize: '11px',
          fontWeight: 'bold',
          whiteSpace: 'nowrap',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        }}>
          {agent.status === 'idle' ? '🟢 待命中' : 
           agent.status === 'busy' ? '🟡 工作中' : '🔴 阻塞中'}
        </div>
      </Html>
      
      {/* 连接线效果 */}
      {agent.status === 'busy' && (
        <mesh position={[0, 0.3, 0]} rotation={[0, 0, 0]}>
          <ringGeometry args={[0.6, 0.65, 32]} />
          <meshBasicMaterial color={glowColor} transparent opacity={0.3} side={2} />
        </mesh>
      )}
    </group>
  )
}

// 地板组件 - 网格地板
function GridFloor() {
  return (
    <group>
      {/* 主地板 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
      
      {/* 网格线 */}
      <gridHelper 
        args={[30, 30, '#334155', '#1e293b']} 
        position={[0, -0.49, 0]} 
      />
      
      {/* 中心圆形区域 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.48, 0]}>
        <circleGeometry args={[5, 64]} />
        <meshStandardMaterial color="#0f172a" transparent opacity={0.5} />
      </mesh>
      
      {/* 内圈 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.47, 0]}>
        <ringGeometry args={[4, 4.1, 64]} />
        <meshBasicMaterial color="#4ecca3" transparent opacity={0.3} />
      </mesh>
    </group>
  )
}

// 办公桌
function Desk({ position, index }) {
  return (
    <group position={position}>
      {/* 桌面 */}
      <mesh position={[0, 0.35, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.8, 0.08, 0.9]} />
        <meshStandardMaterial color="#78350f" roughness={0.6} />
      </mesh>
      
      {/* 桌腿 */}
      {[[-0.75, 0, -0.35], [0.75, 0, -0.35], [-0.75, 0, 0.35], [0.75, 0, 0.35]].map((pos, i) => (
        <mesh key={i} position={[pos[0], 0, pos[2]]} castShadow>
          <boxGeometry args={[0.08, 0.7, 0.08]} />
          <meshStandardMaterial color="#451a03" roughness={0.8} />
        </mesh>
      ))}
      
      {/* 桌上的显示器（简化） */}
      <mesh position={[0, 0.55, -0.1]} castShadow>
        <boxGeometry args={[0.6, 0.4, 0.05]} />
        <meshStandardMaterial color="#1e293b" metalness={0.5} />
      </mesh>
      
      {/* 显示器支架 */}
      <mesh position={[0, 0.4, -0.1]}>
        <boxGeometry args={[0.08, 0.2, 0.08]} />
        <meshStandardMaterial color="#334155" />
      </mesh>
    </group>
  )
}

// 会议室桌子
function MeetingTable({ position }) {
  return (
    <group position={position}>
      {/* 椭圆形桌面 */}
      <mesh position={[0, 0.4, 0]} rotation={[-Math.PI / 2, 0, 0]} castShadow>
        <circleGeometry args={[1.5, 32]} />
        <meshStandardMaterial color="#1e3a5f" roughness={0.3} metalness={0.2} />
      </mesh>
      
      {/* 桌腿 */}
      <mesh position={[0, 0.15, 0]}>
        <cylinderGeometry args={[0.1, 0.15, 0.3, 16]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>
      
      {/* 底座 */}
      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.4, 32]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>
    </group>
  )
}

// 装饰植物
function Plant({ position, scale = 1 }) {
  return (
    <group position={position} scale={scale}>
      {/* 花盆 */}
      <mesh position={[0, 0.15, 0]} castShadow>
        <cylinderGeometry args={[0.15, 0.12, 0.3, 16]} />
        <meshStandardMaterial color="#b45309" roughness={0.8} />
      </mesh>
      
      {/* 叶子 - 使用多个小球体 */}
      {[0, 60, 120, 180, 240, 300].map((angle, i) => (
        <mesh 
          key={i} 
          position={[
            Math.sin(angle * Math.PI / 180) * 0.1, 
            0.35 + i * 0.05, 
            Math.cos(angle * Math.PI / 180) * 0.1
          ]}
        >
          <sphereGeometry args={[0.08, 8, 8]} />
          <meshStandardMaterial color="#22c55e" />
        </mesh>
      ))}
    </group>
  )
}

// 墙壁组件
function Walls() {
  return (
    <group>
      {/* 后墙 */}
      <mesh position={[0, 2, -8]}>
        <planeGeometry args={[30, 6]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
      
      {/* 侧墙 - 左 */}
      <mesh position={[-10, 2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[20, 6]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>
      
      {/* 侧墙 - 右 */}
      <mesh position={[10, 2, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[20, 6]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>
    </group>
  )
}

// 灯光系统
function Lighting() {
  return (
    <>
      <ambientLight intensity={0.4} color="#e0f2fe" />
      <pointLight position={[0, 4, 0]} intensity={1} color="#fef3c7" castShadow />
      <pointLight position={[-5, 3, 3]} intensity={0.5} color="#bfdbfe" />
      <pointLight position={[5, 3, 3]} intensity={0.5} color="#bfdbfe" />
      <directionalLight 
        position={[5, 8, 5]} 
        intensity={0.3} 
        color="#ffffff"
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
    </>
  )
}

// 办公室场景
function OfficeScene({ agents, onAgentClick, selectedAgent }) {
  // 计算 Agent 位置 - 环形布局
  const radius = 4
  const angleStep = (2 * Math.PI) / Math.max(agents.length, 1)
  
  return (
    <>
      <Lighting />
      <GridFloor />
      <Walls />
      
      {/* 会议室桌子 */}
      <MeetingTable position={[0, 0, -3]} />
      
      {/* 办公桌 */}
      {[-4, 4].map((x, i) => (
        <Desk key={i} position={[x, 0, 2]} index={i} />
      ))}
      
      {/* 装饰植物 */}
      <Plant position={[-3, 0, -3]} scale={1.2} />
      <Plant position={[3, 0, -3]} scale={1} />
      <Plant position={[-5, 0, 0]} scale={0.8} />
      <Plant position={[5, 0, 0]} scale={0.9} />
      
      {/* Agent 头像 - 环形分布 */}
      {agents.map((agent, index) => {
        const angle = index * angleStep - Math.PI / 2
        const x = Math.cos(angle) * radius
        const z = Math.sin(angle) * radius
        return (
          <AgentAvatar
            key={agent.id}
            agent={agent}
            position={[x, 0, z]}
            onClick={onAgentClick}
            isSelected={selectedAgent?.id === agent.id}
          />
        )
      })}
      
      {/* 相机控制 */}
      <OrbitControls 
        enablePan={true} 
        enableZoom={true} 
        minDistance={3}
        maxDistance={20}
        target={[0, 0.5, 0]}
        maxPolarAngle={Math.PI / 2 - 0.1}
      />
    </>
  )
}

// ============ 任务看板配置 ============
const TASK_BOARD_CONFIG = {
  enabled: true,
  position: 'top-right',
  tasks: [],
  maxTasks: 6,  // 最多显示任务数
}

// ============ 圣旨展示组件 ============
function ImperialEdict({ task, onComplete }) {
  const [displayText, setDisplayText] = useState('')
  const [visible, setVisible] = useState(true)
  const fullText = `📜 奉天承运，皇帝诏曰：\n\n${task.title}\n\n负责：${task.agent}\n状态：${task.status === 'completed' ? '已完成' : task.status === 'in-progress' ? '进行中' : '待处理'}`
  
  useEffect(() => {
    let i = 0
    const timer = setInterval(() => {
      if (i < fullText.length) {
        setDisplayText(fullText.slice(0, i + 1))
        i++
      } else {
        clearInterval(timer)
        // 2秒后消失
        setTimeout(() => {
          setVisible(false)
          onComplete?.()
        }, 2000)
      }
    }, 50)
    return () => clearInterval(timer)
  }, [])
  
  if (!visible) return null
  
  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(0,0,0,0.7)',
      zIndex: 1000,
      animation: 'fadeIn 0.3s ease',
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #8B4513 0%, #D2691E 50%, #FFD700 100%)',
        border: '4px solid #FFD700',
        borderRadius: '8px',
        padding: '40px 60px',
        maxWidth: '600px',
        boxShadow: '0 0 60px rgba(255, 215, 0, 0.6), inset 0 0 30px rgba(139, 69, 19, 0.5)',
        animation: 'pulse 2s infinite',
      }}>
        <pre style={{
          fontFamily: '"KaiTi", "STKaiti", serif',
          fontSize: '24px',
          color: '#2C1810',
          whiteSpace: 'pre-wrap',
          textShadow: '1px 1px 2px rgba(0,0,0,0.3)',
          margin: 0,
        }}>{displayText}</pre>
        <div style={{ textAlign: 'center', marginTop: '20px', opacity: 0.6, fontSize: '14px' }}>
          {displayText.length < fullText.length ? '✍️ 宣读中...' : '📜 钦此'}
        </div>
      </div>
    </div>
  )
}

// ============ 任务看板组件 ============
function TaskBoard({ onTaskClick, selectedAgent, tasks = [], showEdict, onEdictComplete }) {
  const taskList = tasks.length > 0 ? tasks : TASK_BOARD_CONFIG.tasks
  
  // 监听新任务
  useEffect(() => {
    if (tasks.length > 0 && TASK_BOARD_CONFIG.tasks.length > 0) {
      const latestTask = tasks[0]
      const oldTasks = TASK_BOARD_CONFIG.tasks
      if (oldTasks.length === 0 || latestTask.id !== oldTasks[0].id) {
        // 新任务，显示圣旨
        setRecentTask(latestTask)
        setShowEdict(latestTask)
      }
    }
    TASK_BOARD_CONFIG.tasks = tasks
  }, [tasks])
  
  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return '#4ade80'
      case 'in-progress': return '#facc15'
      case 'pending': return '#6b7280'
      default: return '#6b7280'
    }
  }
  
  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'high': return '🔴'
      case 'medium': return '🟡'
      case 'low': return '🟢'
      default: return '⚪'
    }
  }
  
  return (
    <>
      {showEdict && (
        <ImperialEdict 
          task={showEdict} 
          onComplete={() => {
            setShowEdict(null)
            onEdictComplete?.()
          }} 
        />
      )}
      
      <div style={{
        position: 'absolute',
        top: '16px',
        right: '16px',
        width: '300px',
        maxHeight: '450px',
        background: 'linear-gradient(180deg, rgba(20, 30, 48, 0.95) 0%, rgba(36, 59, 85, 0.9) 100%)',
        border: '1px solid rgba(0, 255, 255, 0.3)',
        borderRadius: '16px',
        padding: '20px',
        color: 'white',
        fontFamily: 'system-ui, sans-serif',
        boxShadow: '0 0 40px rgba(0, 255, 255, 0.2), inset 0 1px 0 rgba(255,255,255,0.1), 0 8px 32px rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(10px)',
        overflow: 'hidden',
      }}>
        {/* 全息效果标题 */}
        <div style={{
          fontSize: '16px',
          fontWeight: 'bold',
          marginBottom: '16px',
          paddingBottom: '12px',
          borderBottom: '2px solid rgba(0, 255, 255, 0.4)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          textShadow: '0 0 10px rgba(0, 255, 255, 0.8)',
        }}>
          <span style={{ animation: 'pulse 2s infinite' }}>📋</span>
          <span style={{ color: '#00ffff' }}>任务指挥中心</span>
          <span style={{ marginLeft: 'auto', fontSize: '11px', opacity: 0.6, background: 'rgba(0,255,255,0.1)', padding: '2px 8px', borderRadius: '4px' }}>
            3D全息投影
          </span>
        </div>
        
        {/* 活跃任务指示器 */}
        <div style={{ marginBottom: '12px', display: 'flex', gap: '8px' }}>
          <div style={{ 
            flex: 1, 
            height: '4px', 
            background: taskList.filter(t => t.status === 'in-progress').length > 0 
              ? 'linear-gradient(90deg, #00ffff, #00ff00)' 
              : 'rgba(255,255,255,0.1)',
            borderRadius: '2px',
            boxShadow: taskList.filter(t => t.status === 'in-progress').length > 0 ? '0 0 10px #00ffff' : 'none',
          }} />
        </div>
        
        {/* 任务列表 */}
        <div style={{ overflow: 'auto', maxHeight: '340px' }}>
          {taskList.slice(0, TASK_BOARD_CONFIG.maxTasks).map((task, idx) => (
            <div
              key={task.id}
              onClick={() => onTaskClick(task)}
              style={{
                padding: '14px 16px',
                marginBottom: '10px',
                background: selectedAgent?.name === task.agent 
                  ? 'linear-gradient(135deg, rgba(0, 255, 255, 0.2), rgba(0, 255, 150, 0.15))' 
                  : 'linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))',
                border: `1px solid ${selectedAgent?.name === task.agent ? 'rgba(0, 255, 255, 0.6)' : 'rgba(255,255,255,0.1)'}`,
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                position: 'relative',
                overflow: 'hidden',
                animation: idx === 0 ? 'slideIn 0.3s ease' : undefined,
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 255, 255, 0.25), rgba(0, 255, 150, 0.2))'
                e.currentTarget.style.transform = 'translateX(4px)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = selectedAgent?.name === task.agent 
                  ? 'linear-gradient(135deg, rgba(0, 255, 255, 0.2), rgba(0, 255, 150, 0.15))'
                  : 'linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))'
                e.currentTarget.style.transform = 'translateX(0)'
              }}
            >
              {/* 光效 */}
              {task.status === 'in-progress' && (
                <div style={{
                  position: 'absolute',
                  top: 0, left: 0, right: 0,
                  height: '2px',
                  background: 'linear-gradient(90deg, transparent, #00ffff, transparent)',
                  animation: 'scan 2s linear infinite',
                }} />
              )}
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                <span style={{ fontSize: '14px' }}>{getPriorityIcon(task.priority)}</span>
                <span style={{ flex: 1, fontWeight: 600, fontSize: '14px', color: '#fff' }}>{task.title}</span>
                <span style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: getStatusColor(task.status),
                  boxShadow: `0 0 12px ${getStatusColor(task.status)}`,
                  animation: task.status === 'in-progress' ? 'blink 1s infinite' : 'none',
                }} />
              </div>
              <div style={{ fontSize: '12px', opacity: 0.7, display: 'flex', justifyContent: 'space-between', color: 'rgba(255,255,255,0.7)' }}>
                <span>👤 {task.agent}</span>
                <span style={{ 
                  color: task.status === 'completed' ? '#4ade80' : task.status === 'in-progress' ? '#00ffff' : 'rgba(255,255,255,0.5)',
                  textShadow: task.status === 'in-progress' ? '0 0 8px #00ffff' : 'none',
                }}>
                  {task.status === 'completed' ? '✅ 完成' : task.status === 'in-progress' ? '🔄 进行中' : '⏳ 待处理'}
                </span>
              </div>
            </div>
          ))}
        </div>
        
        {taskList.length > TASK_BOARD_CONFIG.maxTasks && (
          <div style={{ textAlign: 'center', padding: '8px', fontSize: '12px', opacity: 0.5 }}>
            还有 {taskList.length - TASK_BOARD_CONFIG.maxTasks} 个任务...
          </div>
        )}
      </div>
      
      <style>{`
        @keyframes scan {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </>
  )
}

// ============ 主组件 ============
export default function VirtualOffice() {
  const [selectedAgent, setSelectedAgent] = useState(null)
  const [cameraTarget, setCameraTarget] = useState(null)
  const [showEdict, setShowEdict] = useState(null)
  const canvasRef = useRef(null)
  
  // 处理新任务（触发圣旨动画）
  const handleNewTask = (tasks) => {
    if (tasks && tasks.length > 0) {
      const latestTask = tasks[0]
      // 检查是否是新任务
      const existingIds = TASK_BOARD_CONFIG.tasks.map(t => t.id)
      if (!existingIds.includes(latestTask.id) || TASK_BOARD_CONFIG.tasks.length === 0) {
        setShowEdict(latestTask)
      }
    }
  }
  
  const { agents, loading, wsConnected } = useOpenClawStatus(handleNewTask)
  
  // 处理任务点击：切换到对应的 Agent
  const handleTaskClick = (task) => {
    // 查找任务对应的 Agent
    const agent = agents.find(a => a.name === task.agent || a.id === task.agent)
    if (agent) {
      setSelectedAgent(agent)
      // 设置相机目标位置（会在 OrbitControls 中使用）
      setCameraTarget(agent.id)
      console.log('📷 视角切换到:', agent.name)
    }
  }
  
  // 计算统计数据
  const stats = {
    total: agents.length,
    idle: agents.filter(a => a.status === 'idle').length,
    busy: agents.filter(a => a.status === 'busy').length,
    blocked: agents.filter(a => a.status === 'blocked').length,
  }
  // 渲染背景
  const renderBackground = () => {
    const { mode, static: staticConfig, video: videoConfig, environment: envConfig } = BACKGROUND_CONFIG
    
    if (mode === 'static') {
      return staticConfig.image ? (
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundImage: `url(${staticConfig.image})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }} />
      ) : null
    }
    
    if (mode === 'video' && videoConfig.url) {
      return (
        <video
          autoPlay loop muted playsInline
          style={{
            position: 'absolute',
            top: 0, left: 0, width: '100%', height: '100%',
            objectFit: 'cover',
          }}
        >
          <source src={videoConfig.url} />
        </video>
      )
    }
    
    if (mode === 'environment') {
      return <Environment preset={envConfig.preset} background />
    }
    
    return null
  }
  
  return (
    <div style={{ width: '100%', height: '100vh', background: BACKGROUND_CONFIG.mode === 'static' ? BACKGROUND_CONFIG.static.color : '#000', overflow: 'hidden' }}>
      {renderBackground()}
      {/* 3D 场景 */}
      <Canvas 
        shadows 
        camera={{ position: [0, 6, 10], fov: 50 }}
        gl={{ antialias: true }}
      >
        <OfficeScene 
          agents={agents} 
          onAgentClick={setSelectedAgent} 
          selectedAgent={selectedAgent}
        />
      </Canvas>
      
      {/* 标题栏 */}
      <div style={{
        position: 'absolute',
        top: '16px',
        left: '16px',
        color: 'white',
        fontSize: '20px',
        fontWeight: 'bold',
        textShadow: '0 2px 4px rgba(0,0,0,0.5)',
      }}>
        🏛️ 虚拟办公室 - 实时状态监控
      </div>
      
      {/* 统计面板 */}
      <div style={{
        position: 'absolute',
        top: '16px',
        right: '16px',
        background: 'rgba(15, 23, 42, 0.9)',
        borderRadius: '12px',
        padding: '16px 20px',
        color: 'white',
        minWidth: '180px',
        border: '1px solid rgba(78, 204, 163, 0.3)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
      }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', opacity: 0.8 }}>📊 团队状态</h3>
        <div style={{ display: 'flex', gap: '16px', fontSize: '14px', fontWeight: 'bold' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', color: '#4ade80' }}>{stats.idle}</div>
            <div style={{ fontSize: '10px', opacity: 0.7 }}>🟢 待命</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', color: '#facc15' }}>{stats.busy}</div>
            <div style={{ fontSize: '10px', opacity: 0.7 }}>🟡 工作</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', color: '#f87171' }}>{stats.blocked}</div>
            <div style={{ fontSize: '10px', opacity: 0.7 }}>🔴 阻塞</div>
          </div>
        </div>
      </div>
      
      {/* 任务看板 */}
      {TASK_BOARD_CONFIG.enabled && (
        <TaskBoard 
          onTaskClick={handleTaskClick} 
          selectedAgent={selectedAgent}
          tasks={TASK_BOARD_CONFIG.tasks}
          showEdict={showEdict}
          onEdictComplete={() => setShowEdict(null)}
        />
      )}
      
      {/* Agent 详情弹窗 */}
      {selectedAgent && (
        <div style={{
          position: 'absolute',
          bottom: '16px',
          left: '16px',
          background: 'rgba(15, 23, 42, 0.95)',
          borderRadius: '12px',
          padding: '20px',
          color: 'white',
          minWidth: '280px',
          border: `2px solid ${selectedAgent.color || '#4ecca3'}`,
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px' }}>{selectedAgent.name}</h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', opacity: 0.7 }}>{selectedAgent.role}</p>
            </div>
            <button 
              onClick={() => setSelectedAgent(null)} 
              style={{
                background: 'none',
                border: 'none',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '20px',
                opacity: 0.7,
                padding: '0 4px',
              }}
            >
              ×
            </button>
          </div>
          
          <div style={{ marginTop: '16px', fontSize: '13px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span>状态:</span>
              <span style={{
                color: selectedAgent.status === 'idle' ? '#4ade80' : 
                       selectedAgent.status === 'busy' ? '#facc15' : '#f87171',
                fontWeight: 'bold',
              }}>
                {selectedAgent.status === 'idle' ? '🟢 待命中' : 
                 selectedAgent.status === 'busy' ? '🟡 工作中' : '🔴 阻塞中'}
              </span>
            </div>
            <div style={{ opacity: 0.8 }}>
              <div>当前任务: <strong>{selectedAgent.currentTask || '无'}</strong></div>
            </div>
          </div>
          
          {/* 状态进度条 */}
          <div style={{ marginTop: '12px' }}>
            <div style={{ 
              height: '6px', 
              background: 'rgba(255,255,255,0.1)', 
              borderRadius: '3px',
              overflow: 'hidden',
            }}>
              <div style={{
                width: selectedAgent.status === 'idle' ? '30%' : 
                       selectedAgent.status === 'busy' ? '70%' : '90%',
                height: '100%',
                background: selectedAgent.status === 'idle' ? '#4ade80' : 
                           selectedAgent.status === 'busy' ? '#facc15' : '#f87171',
                borderRadius: '3px',
                transition: 'width 0.3s ease',
              }} />
            </div>
          </div>
        </div>
      )}
      
      {/* 操作提示 */}
      <div style={{
        position: 'absolute',
        bottom: '16px',
        right: '16px',
        background: 'rgba(0,0,0,0.6)',
        borderRadius: '8px',
        padding: '10px 14px',
        color: 'rgba(255,255,255,0.6)',
        fontSize: '11px',
      }}>
        🖱️ 拖拽旋转 | 滚轮缩放 | 点击查看详情
      </div>
      
      {/* WebSocket 状态 */}
      <div style={{
        position: 'absolute',
        top: '10px',
        right: '10px',
        padding: '6px 12px',
        background: wsConnected ? 'rgba(16, 185, 129, 0.9)' : 'rgba(239, 68, 68, 0.9)',
        borderRadius: '20px',
        color: 'white',
        fontSize: '12px',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
      }}>
        <span style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: wsConnected ? '#4ade80' : '#f87171',
          animation: wsConnected ? 'pulse 2s infinite' : 'none',
        }} />
        {wsConnected ? '实时同步' : '本地模式'}
        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}</style>
      </div>
      
      {/* 加载状态 */}
      {loading && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: 'white',
          fontSize: '16px',
        }}>
          <div style={{ 
            width: '40px', 
            height: '40px', 
            border: '3px solid rgba(78, 204, 163, 0.3)',
            borderTopColor: '#4ecca3',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 12px',
          }} />
          加载中...
          <style>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}
    </div>
  )
}
