import { Link, useLocation, useParams } from 'react-router-dom'

export default function AgentDetail() {
  // 👉 useParams钩子：从 URL 里把“动态参数”拿出来
  const { id } = useParams()
  const location = useLocation()

  return (
    <div style={{ textAlign: 'left' }}>
      <h1 style={{ marginTop: 0 }}>Agent Detail</h1>
      <p>
        路由参数 <code>id</code>：
        <code style={{ marginLeft: 8 }}>{String(id)}</code>
      </p>
      <p style={{ marginTop: 8 }}>
        当前完整地址：<code>{location.pathname}</code>
      </p>
      <p style={{ marginTop: 12 }}>
        <Link to="/agents">返回 Agents 列表</Link>
      </p>
    </div>
  )
}

