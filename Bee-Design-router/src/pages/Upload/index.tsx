
import { Link, useLocation } from 'react-router-dom'

export default function Upload() {
    const location = useLocation()
    return (
        <div style={{ textAlign: 'left' }}>
            <h1 style={{ marginTop: 0 }}>Upload</h1>
            <p>这个页面用来验证：左侧用 <code>NavLink</code> 点击跳转时，右侧 <code>Outlet</code> 会渲染对应路由。</p>

            <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
                <div>
                    <div>当前路径</div>
                    <code>{location.pathname}</code>
                </div>
                <div>
                    <div>继续学习</div>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 6 }}>
                        <Link to="/agents">动态参数 /agents/:id</Link>
                        <Link to="/query?tab=a">查询参数 ?tab=xx</Link>
                    </div>
                </div>
            </div>
        </div>
    )
}
