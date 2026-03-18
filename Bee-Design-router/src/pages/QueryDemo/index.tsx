/*
  参数查询：?tab=a
  URL实例：#/settings?tab=general&page=2
    - 路径：#/settings （决定页面）
    - 查询参数：?tab=general&page=2 （附加信息：显示什么状态）
  
    步骤：
    1. 先用 useSearchParams() 钩子 -> 拿 ?tab=1 
    2. setSearchParams({ tab: 'b' }) -> 改 拿到 ?tab=2 的值
    NOTE:
      - useParams()钩子 -> 拿 路径 参数 /agents/42
      - useSearchParams() 钩子 -> 拿 查询参数   ?tab=general&page=2     
*/
import { useMemo } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'

export default function QueryDemo() {
  // 三种方式读参数👇
  // 1. 最底层：location.search
  const location = useLocation()
  const rawSearch = location.search  // 字符串："?tab=a&page=2"

  // 2. 手动解析（原生）
  // URLSearchParams：浏览器原生 API
  const tabFromLocation = useMemo(() => {
    // "?tab=a&page=2"  解析出 tab = "a"
    const sp = new URLSearchParams(location.search)
    return sp.get('tab') ?? ''
  }, [location.search])

  // 3 .（现代）React Router 方式（推荐）
  const [searchParams, setSearchParams] = useSearchParams()
  const tabFromHook = searchParams.get('tab') ?? '';  // tab = "a"

  return (
    <div style={{ textAlign: 'left' }}>
      <h1 style={{ marginTop: 0 }}>Query Demo</h1>
      <p>演示查询参数：<code>?tab=xx</code></p>

      <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
        <div>
          <div>location.search</div>
          <code>{rawSearch || '(empty)'}</code>
        </div>
        <div>
          <div>useSearchParams().get("tab")</div>
          <code>{tabFromHook || '(empty)'}</code>
        </div>
        <div>
          <div>new URLSearchParams(location.search).get("tab")</div>
          <code>{tabFromLocation || '(empty)'}</code>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
       {/* “写”查询参数 */}
        {/* 点击后 URL 变 ?tab=a */}
        <button type="button" onClick={() => setSearchParams({ tab: 'a' })}>
          tab=a
        </button>
        <button type="button" onClick={() => setSearchParams({ tab: 'b' })}>
          tab=b
        </button>
        {/*点击后 URL 变 ?tab=a&page=2 */}
        <button type="button" onClick={() => setSearchParams({ tab: 'a', page: '2' })}>
          tab=a&page=2
        </button>
        <button type="button" onClick={() => setSearchParams({})}>
          清空
        </button>
      </div>

      <div style={{ marginTop: 16 }}>
        <div>配合路由参数一起用：</div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 6 }}>
          <Link to="/agents/42">去 /agents/42</Link>
          <Link to="/upload">回到 /upload</Link>
        </div>
      </div>
    </div>
  )
}

