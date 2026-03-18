import { useLocation, useNavigate } from 'react-router-dom'

export default function ButtonPage() {
  const navigate = useNavigate()
  const location = useLocation()
  return (
    <div style={{ textAlign: 'left' }}>
      <h1 style={{ marginTop: 0 }}>Button</h1>
      <p>
        这个页面用来验证：左侧用 <code>useNavigate()</code> 命令式跳转，同样会更新地址并渲染右侧内容。
      </p>

      <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
        <div>
          <div>当前路径</div>
          <code>{location.pathname}</code>
        </div>
        <div>
          <div>再跳转一次（页面内用 useNavigate）</div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 6 }}>
            <button type="button" onClick={() => navigate('/agents/42')}>
              去 /agents/42
            </button>
            <button type="button" onClick={() => navigate('/query?tab=b')}>
              去 /query?tab=b
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

