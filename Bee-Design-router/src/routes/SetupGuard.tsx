import { useEffect } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'

type SetupGuardProps = {
  setupComplete: boolean
}

export default function SetupGuard({ setupComplete }: SetupGuardProps) {
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (!setupComplete && location.pathname !== '/setup') {
      navigate('/setup', { replace: true })
    }
  }, [location.pathname, navigate, setupComplete])

  if (!setupComplete && location.pathname !== '/setup') return null
  return <Outlet />
}

