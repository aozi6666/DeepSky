/* 
  ：id 不是数字，而是 string | undefined
  路由参数：
    - 1. 用户点击：（link / useNavigate）  -> 改 URL
    - 2. URL跳转： URL → /agents/2
    - 3. Router 匹配： 匹配 /agents/:id  -> 得到 id = 2
    - 4. 渲染页面： <AgentDetail />
    - 5. AgentDetail组件 通过 useParams()钩子 读取参数
    - 6. 展示 “动态参数” 
 */
import { Link, useLocation, useNavigate } from 'react-router-dom'

export default function Agents() {
  const location = useLocation()
  const navigate = useNavigate()

  //👉 模拟“3个 agent”
  const ids = ['1', '2', '42']
  return (
    <div style={{ textAlign: 'left' }}>
      <h1 style={{ marginTop: 0 }}>Agents</h1>
      <p>演示动态路由参数：<code>/agents/:id</code> + <code>useParams()</code></p>
      <p style={{ marginTop: 8 }}>
        当前路径：<code>{location.pathname}</code>
      </p>

      {/* 把 URL 变成 /agents/id 的形式 */}
      <ul style={{ marginTop: 12 }}>
        {ids.map((id) => (
          <li key={id}>
            {/* 路由跳转：✅ 方式1：Link（声明式）UI组件：天生导航（点击就跳转）👉 “自带当前页高亮能力” */}
            <Link to={`/agents/${id}`}>打开 Agent {id}</Link>
          </li>
        ))}
      </ul>

      <div style={{ marginTop: 12 }}>
        <div>同样也可以用命令式跳转：</div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 6 }}>
          {ids.map((id) => (
            <button key={id} type="button" onClick={() => navigate(`/agents/${id}`)}>
              navigate(`/agents/${id}`)
            </button>
          ))}
          {/* 单独再演示一个“写死路径字符串”的写法 */}
          <hr />
          <button
            key="manual-42"
            type="button"
            onClick={() => navigate('/agents/42')}
          >
            navigate('/agents/42')
          </button>
        </div>
      </div>
    </div>
  )
}

