/* 
  保护路由: 
    👉 第一次打开必须先完成“初始化（setup）
    否则只能进 /setup
    完成 setup ， 才能进主界面
*/
import { useEffect } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'

type SetupGuardProps = {
  setupComplete: boolean
}

// 接受参数：setupComplete
export default function SetupGuard({ setupComplete }: SetupGuardProps) {
  const navigate = useNavigate()
  const location = useLocation()

  // useEffect 做“拦截”
  useEffect(() => {
    if (!setupComplete && location.pathname !== '/setup') {
      // 👉 不符合条件 → 改 URL （强制到 /setup）
      navigate('/setup', { replace: true })
    }
  }, [location.pathname, navigate, setupComplete])

  // 👉 不渲染任何页面： 发现不合法 → 什么都不显示 → 直接跳转
  if (!setupComplete && location.pathname !== '/setup') return null
  // 显示对应 具体页面
  return <Outlet />
}

