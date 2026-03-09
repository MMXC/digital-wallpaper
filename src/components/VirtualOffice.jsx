import { Canvas } from '@react-three/fiber'
import { OrbitControls, Text, Html, Float } from '@react-three/drei'
import { useState, useEffect } from 'react'

// Agent 头像组件
function AgentAvatar({ agent, position, onClick }) {
  const colors = {
    idle: '#4ade80',    // 绿色
    busy: '#facc15',    // 黄色
    blocked: '#f87171', // 红色
  }
  
  const color = colors[agent.status] || colors.idle
  
  return (
    <group position={position} onClick={onClick}>
      {/* 头像 - 使用球体代替 */}
      <mesh>
        <sphereGeometry args={[0.4, 32, 32]} />
        <meshStandardMaterial color={color} />
      </mesh>
      
      {/* 状态光环 */}
      <mesh>
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.2} />
      </mesh>
      
      {/* 名字标签 */}
      <Float speed={2} rotationIntensity={0} floatIntensity={0.5}>
        <Html position={[0, 0.8, 0]} center>
          <div style={{
            background: 'rgba(0,0,0,0.7)',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '12px',
            whiteSpace: 'nowrap',
            textAlign: 'center',
          }}>
            <div style={{ fontWeight: 'bold' }}>{agent.name}</div>
            <div style={{ fontSize: '10px', opacity: 0.8 }}>{agent.role}</div>
          </div>
        </Html>
      </Float>
      
      {/* 状态标签 */}
      <Html position={[0, -0.7, 0]} center>
        <div style={{
          background: color,
          color: '#000',
          padding: '2px 6px',
          borderRadius: '8px',
          fontSize: '10px',
          fontWeight: 'bold',
        }}>
          {agent.status === 'idle' ? '🟢 待命中' : 
           agent.status === 'busy' ? '🟡 工作中' : '🔴 阻塞'}
        </div>
      </Html>
    </group>
  )
}

// 地板组件
function Floor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
      <planeGeometry args={[20, 20]} />
      <meshStandardMaterial color="#374151" />
    </mesh>
  )
}

// 桌子组件
function Desk({ position }) {
  return (
    <group position={position}>
      {/* 桌面 */}
      <mesh position={[0, 0.3, 0]} castShadow>
        <boxGeometry args={[1.5, 0.1, 0.8]} />
        <meshStandardMaterial color="#92400e" />
      </mesh>
      {/* 桌腿 */}
      {[[-0.6, 0, -0.3], [0.6, 0, -0.3], [-0.6, 0, 0.3], [0.6, 0, 0.3]].map((pos, i) => (
        <mesh key={i} position={[pos[0], -0.1, pos[2]]} castShadow>
          <boxGeometry args={[0.1, 0.5, 0.1]} />
          <meshStandardMaterial color="#451a03" />
        </mesh>
      ))}
    </group>
  )
}

// 办公室场景
function OfficeScene({ agents, onAgentClick }) {
  // 计算 Agent 位置 - 环形布局
  const radius = 3
  const angleStep = (2 * Math.PI) / Math.max(agents.length, 1)
  
  return (
    <>
      {/* 灯光 */}
      <ambientLight intensity={0.5} />
      <pointLight position={[0, 5, 0]} intensity={1} castShadow />
      <directionalLight position={[5, 5, 5]} intensity={0.5} />
      
      {/* 地板 */}
      <Floor />
      
      {/* 房间墙壁（简单示意） */}
      <mesh position={[0, 2, -5]}>
        <planeGeometry args={[20, 5]} />
        <meshStandardMaterial color="#1f2937" />
      </mesh>
      
      {/* 办公桌 */}
      {[0, 1, 2, 3].map(i => (
        <Desk key={i} position={[0, 0, -2 + i * 1.5]} />
      ))}
      
      {/* Agent 头像 */}
      {agents.map((agent, index) => {
        const angle = index * angleStep - Math.PI / 2
        const x = Math.cos(angle) * radius
        const z = Math.sin(angle) * radius
        return (
          <AgentAvatar
            key={agent.id}
            agent={agent}
            position={[x, 0.5, z]}
            onClick={() => onAgentClick(agent)}
          />
        )
      })}
      
      {/* 相机控制 */}
      <OrbitControls 
        enablePan={true} 
        enableZoom={true} 
        minDistance={3}
        maxDistance={15}
        target={[0, 0, 0]}
      />
    </>
  )
}

// 主组件
export default function VirtualOffice() {
  const [agents, setAgents] = useState([])
  const [selectedAgent, setSelectedAgent] = useState(null)
  const [loading, setLoading] = useState(true)
  
  // 获取 Agent 状态
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch('http://localhost:3001/api/agents')
        const data = await res.json()
        setAgents(data)
      } catch (err) {
        console.error('获取状态失败:', err)
        // 使用默认数据
        setAgents([
          { id: 'zhongshu', name: '中书省', role: '规划决策', status: 'idle', currentTask: '待命中' },
          { id: 'menxia', name: '门下省', role: '审核审议', status: 'busy', currentTask: '审批中' },
          { id: 'shangshusheng', name: '尚书省', role: '执行派发', status: 'idle', currentTask: '待命中' },
          { id: 'bingbu', name: '兵部', role: '战斗部署', status: 'idle', currentTask: '待命中' },
        ])
      } finally {
        setLoading(false)
      }
    }
    
    fetchStatus()
    // 轮询更新
    const interval = setInterval(fetchStatus, 5000)
    return () => clearInterval(interval)
  }, [])
  
  return (
    <div style={{ width: '100%', height: '100vh', background: '#111827' }}>
      {/* 3D 场景 */}
      <Canvas shadows camera={{ position: [0, 5, 8], fov: 50 }}>
        <OfficeScene agents={agents} onAgentClick={setSelectedAgent} />
      </Canvas>
      
      {/* 控制面板 */}
      <div style={{
        position: 'absolute',
        top: '16px',
        right: '16px',
        background: 'rgba(0,0,0,0.8)',
        borderRadius: '8px',
        padding: '16px',
        color: 'white',
        minWidth: '200px',
      }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '16px' }}>📊 团队状态</h3>
        <div style={{ display: 'flex', gap: '12px', fontSize: '12px' }}>
          <span>🟢 {agents.filter(a => a.status === 'idle').length}</span>
          <span>🟡 {agents.filter(a => a.status === 'busy').length}</span>
          <span>🔴 {agents.filter(a => a.status === 'blocked').length}</span>
        </div>
      </div>
      
      {/* Agent 详情弹窗 */}
      {selectedAgent && (
        <div style={{
          position: 'absolute',
          bottom: '16px',
          left: '16px',
          background: 'rgba(0,0,0,0.9)',
          borderRadius: '8px',
          padding: '16px',
          color: 'white',
          minWidth: '250px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0 }}>{selectedAgent.name}</h3>
            <button onClick={() => setSelectedAgent(null)} style={{
              background: 'none',
              border: 'none',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '18px',
            }}>×</button>
          </div>
          <p style={{ margin: '8px 0', fontSize: '14px', opacity: 0.8 }}>{selectedAgent.role}</p>
          <div style={{ fontSize: '12px', marginTop: '12px' }}>
            <div>状态: <span style={{
              color: selectedAgent.status === 'idle' ? '#4ade80' : 
                     selectedAgent.status === 'busy' ? '#facc15' : '#f87171'
            }}>{selectedAgent.status}</span></div>
            <div>当前任务: {selectedAgent.currentTask || '无'}</div>
            {selectedAgent.load !== undefined && (
              <div>负载: {Math.round(selectedAgent.load * 100)}%</div>
            )}
          </div>
        </div>
      )}
      
      {/* 加载状态 */}
      {loading && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: 'white',
        }}>
          加载中...
        </div>
      )}
    </div>
  )
}
