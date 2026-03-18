import { Link, useLocation } from 'react-router-dom'

export default function NotFound() {
  const location = useLocation()
  return (
    <div style={{ textAlign: 'left' }}>
      <h1 style={{ marginTop: 0 }}>404</h1>
      <p>
        未找到页面：<code>{location.pathname}</code>
      </p>
      <p style={{ marginTop: 12 }}>
        <Link to="/upload">回到 Upload</Link>
      </p>
    </div>
  )
}

