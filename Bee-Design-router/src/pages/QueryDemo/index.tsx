import { useMemo } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'

export default function QueryDemo() {
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()

  const tabFromHook = searchParams.get('tab') ?? ''
  const rawSearch = location.search

  const tabFromLocation = useMemo(() => {
    const sp = new URLSearchParams(location.search)
    return sp.get('tab') ?? ''
  }, [location.search])

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
        <button type="button" onClick={() => setSearchParams({ tab: 'a' })}>
          tab=a
        </button>
        <button type="button" onClick={() => setSearchParams({ tab: 'b' })}>
          tab=b
        </button>
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

