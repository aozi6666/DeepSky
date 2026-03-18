import React from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'

const linkBaseStyle: React.CSSProperties = {
  display: 'block',
  padding: '10px 12px',
  borderRadius: 10,
  textDecoration: 'none',
  color: 'var(--text-h)',
}

export default function MainLayout() {
  //👉 useLocation：读当前状态
 // 👉 useNavigate：改状态
  const navigate = useNavigate()
  // 👉 获取“当前页面的路径信息”
  const location = useLocation()
  const isButtonActive = location.pathname === '/button'
  const isAgentsActive = location.pathname === '/agents' || location.pathname.startsWith('/agents/')
  const isQueryActive = location.pathname === '/query'

  return (
    <div
      style={{
        display: 'flex',
        flex: 1,
        minHeight: 0,
        borderTop: '1px solid var(--border)',
      }}
    > 
       {/* 左侧导航（NavLink 高亮当前路由） */}
      <aside
        style={{
          width: 240,
          flexShrink: 0,
          borderRight: '1px solid var(--border)',
          padding: 16,
          boxSizing: 'border-box',
          textAlign: 'left',
        }}
      >
        <div style={{ fontWeight: 600, marginBottom: 12, color: 'var(--text-h)' }}>
          导航
        </div>
        {/* 路由跳转：✅ 方式1：NavLink（声明式）UI组件：天生导航（点击就跳转）👉 “自带当前页高亮能力” */}
        <nav style={{ display: 'grid', gap: 8 }}>
          <NavLink
            to="/upload"
            style={({ isActive }) => ({
              ...linkBaseStyle,
              background: isActive ? 'var(--accent-bg)' : 'transparent',
              outline: isActive ? `1px solid var(--accent-border)` : '1px solid transparent',
            })}
          >
            Upload
          </NavLink>

          {/* 路由跳转：✅ 方式2：useNavigate（命令式）函数：手动调用跳转 */}
          <button
            type="button"
            onClick={() => navigate('/button')}
            style={{
              ...linkBaseStyle,
              textAlign: 'left',
              border: 0,
              cursor: 'pointer',
              font: 'inherit',
              background: isButtonActive ? 'var(--accent-bg)' : 'transparent',
              outline: isButtonActive
                ? `1px solid var(--accent-border)`
                : '1px solid transparent',
            }}
          >
            Button
          </button>

          <NavLink
            to="/agents"
            style={() => ({
              ...linkBaseStyle,
              background: isAgentsActive ? 'var(--accent-bg)' : 'transparent',
              outline: isAgentsActive ? `1px solid var(--accent-border)` : '1px solid transparent',
            })}
          >
            Agents（:id）
          </NavLink>

          <NavLink
            to="/query"
            style={() => ({
              ...linkBaseStyle,
              background: isQueryActive ? 'var(--accent-bg)' : 'transparent',
              outline: isQueryActive ? `1px solid var(--accent-border)` : '1px solid transparent',
            })}
          >
            Query（?tab=）
          </NavLink>
        </nav>
      </aside>

      <main style={{ flex: 1, minWidth: 0, padding: 24, boxSizing: 'border-box' }}>
      {/* 右侧用 Outlet 渲染子路由页面 */}
        <Outlet />
      </main>
    </div>
  )
}

