import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

function setSetupComplete(value: boolean) {
  localStorage.setItem('setupComplete', value ? 'true' : 'false')
}

export default function Setup() {
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const complete = localStorage.getItem('setupComplete') === 'true'
    if (complete) navigate('/upload', { replace: true })
  }, [navigate])

  return (
    <div style={{ textAlign: 'left' }}>
      <h1 style={{ marginTop: 0 }}>Setup</h1>
      <p>这是首次启动向导示例页。</p>
      <p style={{ marginTop: 12 }}>
        当前地址：<code>{location.pathname}</code>
      </p>

      <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => {
            setSetupComplete(true)
            navigate('/upload', { replace: true })
          }}
        >
          完成 setup 并进入 /upload
        </button>
        <button type="button" onClick={() => setSetupComplete(false)}>
          将 setupComplete 置为 false
        </button>
      </div>
    </div>
  )
}

