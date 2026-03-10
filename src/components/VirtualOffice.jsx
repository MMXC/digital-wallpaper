import { Canvas } from '@react-three/fiber'
import { OrbitControls, Text, Html, Float, Environment } from '@react-three/drei'
import { useState, useEffect, useRef } from 'react'

// ============ 背景配置 ============
const BACKGROUND_CONFIG = {
  mode: 'environment',
  environment: { preset: 'city' }
}

// ============ 默认任务 ============
const DEFAULT_TASKS = [
  { id: 1, title: '调研技术方案', agent: '中书省', status: 'completed', priority: 'high' },
  { id: 2, title: '原型开发', agent: '尚书省', status: 'in-progress', priority: 'high' },
  { id: 3, title: '测试验证', agent: '门下省', status: 'pending', priority: 'medium' },
  { id: 4, title: '文档整理', agent: '礼部', status: 'pending', priority: 'low' },
]

// ============ 3D Agent 头像 ============
function AgentAvatar({ agent, position }) {
  const statusColors = { idle: '#4ade80', busy: '#facc15', blocked: '#f87171' }
  const color = agent.color || statusColors[agent.status] || '#4ade80'
  
  return (
    <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
      <group position={position}>
        {/* 头部 */}
        <mesh position={[0, 0.55, 0]} castShadow>
          <sphereGeometry args={[0.25, 32, 32]} />
          <meshStandardMaterial color={color} metalness={0.5} roughness={0.3} />
        </mesh>
        
        {/* 身体 */}
        <mesh position={[0, 0, 0]} castShadow>
          <cylinderGeometry args={[0.15, 0.2, 0.5, 16]} />
          <meshStandardMaterial color={color} metalness={0.3} roughness={0.5} />
        </mesh>
        
        {/* 名字标签 */}
        <Html position={[0, 1.1, 0]} center distanceFactor={10}>
          <div style={{
            background: 'rgba(15, 23, 42, 0.9)',
            padding: '4px 12px',
            borderRadius: '8px',
            color: 'white',
            fontSize: '12px',
            fontFamily: 'system-ui',
            border: `1px solid ${color}`,
            whiteSpace: 'nowrap',
          }}>
            <div style={{ fontWeight: 'bold' }}>{agent.name}</div>
            <div style={{ fontSize: '10px', opacity: 0.7 }}>{agent.role}</div>
          </div>
        </Html>
        
        {/* 状态标签 */}
        <Html position={[0, -0.6, 0]} center distanceFactor={10}>
          <div style={{
            background: color,
            padding: '2px 8px',
            borderRadius: '10px',
            fontSize: '10px',
            color: '#000',
            fontWeight: 'bold',
          }}>
            {agent.status === 'idle' ? '🟢 待命' : agent.status === 'busy' ? '🔴 工作' : '⭕ 阻塞'}
          </div>
        </Html>
      </group>
    </Float>
  )
}

// ============ 3D 场景 ============
function OfficeScene({ agents }) {
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
      <pointLight position={[-5, 5, -5]} intensity={0.5} color="#4ecca3" />
      
      {/* 地面 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
      
      {/* 网格 */}
      <gridHelper args={[20, 20, '#334155', '#1e293b']} position={[0, -0.49, 0]} />
      
      {/* Agent 排列 */}
      {agents.map((agent, i) => {
        const row = Math.floor(i / 3)
        const col = i % 3
        return <AgentAvatar key={agent.id} agent={agent} position={[col * 2 - 2, 0, row * 2 - 2]} />
      })}
      
      <Environment preset={BACKGROUND_CONFIG.environment.preset} background />
      <OrbitControls target={[0, 0.5, 0]} maxPolarAngle={Math.PI / 2 - 0.1} />
    </>
  )
}

// ============ 任务看板组件 ============
function TaskBoard({ tasks }) {
  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return '#4ade80'
      case 'in-progress': return '#facc15'
      default: return '#6b7280'
    }
  }
  
  return (
    <div style={{
      position: 'absolute',
      top: '16px',
      right: '16px',
      width: '300px',
      background: 'linear-gradient(180deg, rgba(20, 30, 48, 0.95), rgba(36, 59, 85, 0.9))',
      border: '1px solid rgba(0, 255, 255, 0.3)',
      borderRadius: '16px',
      padding: '20px',
      color: 'white',
      fontFamily: 'system-ui',
      boxShadow: '0 0 40px rgba(0, 255, 255, 0.2)',
    }}>
      <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px', borderBottom: '2px solid rgba(0, 255, 255, 0.4)', paddingBottom: '12px' }}>
        📋 任务指挥中心
      </div>
      {tasks.map(task => (
        <div key={task.id} style={{
          padding: '14px',
          marginBottom: '10px',
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span>{task.priority === 'high' ? '🔴' : task.priority === 'medium' ? '🟡' : '🟢'}</span>
            <span style={{ flex: 1, fontWeight: 600 }}>{task.title}</span>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: getStatusColor(task.status), boxShadow: `0 0 8px ${getStatusColor(task.status)}` }} />
          </div>
          <div style={{ fontSize: '12px', opacity: 0.7, display: 'flex', justifyContent: 'space-between' }}>
            <span>👤 {task.agent}</span>
            <span>{task.status === 'completed' ? '✅' : task.status === 'in-progress' ? '🔄' : '⏳'}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

// ============ 主组件 ============
export default function VirtualOffice() {
  const agents = [
    { id: 'taizi', name: '太子', role: '项目总控', status: 'idle', color: '#8b5cf6' },
    { id: 'zhongshu', name: '中书省', role: '规划决策', status: 'busy', color: '#3b82f6' },
    { id: 'menxia', name: '门下省', role: '审核审议', status: 'idle', color: '#10b981' },
    { id: 'shangshu', name: '尚书省', role: '执行派发', status: 'idle', color: '#f59e0b' },
  ]
  
  return (
    <div style={{ width: '100%', height: '100vh', background: '#000', overflow: 'hidden' }}>
      {/* 3D 场景 */}
      <Canvas shadows camera={{ position: [0, 6, 10], fov: 50 }}>
        <OfficeScene agents={agents} />
      </Canvas>
      
      {/* 标题 */}
      <div style={{ position: 'absolute', top: '16px', left: '16px', color: 'white', fontSize: '20px', fontWeight: 'bold', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
        🏛️ 虚拟办公室
      </div>
      
      {/* 统计 */}
      <div style={{ position: 'absolute', top: '16px', right: '340px', background: 'rgba(15, 23, 42, 0.9)', borderRadius: '12px', padding: '16px', color: 'white', minWidth: '120px' }}>
        <div style={{ fontSize: '14px', marginBottom: '8px' }}>📊 团队状态</div>
        <div style={{ display: 'flex', gap: '16px', fontSize: '14px' }}>
          <div style={{ textAlign: 'center' }}><div style={{ fontSize: '24px', color: '#4ade80' }}>3</div><div style={{ fontSize: '10px' }}>🟢</div></div>
          <div style={{ textAlign: 'center' }}><div style={{ fontSize: '24px', color: '#facc15' }}>1</div><div style={{ fontSize: '10px' }}>🔴</div></div>
        </div>
      </div>
      
      {/* 任务看板 */}
      <TaskBoard tasks={DEFAULT_TASKS} />
    </div>
  )
}
