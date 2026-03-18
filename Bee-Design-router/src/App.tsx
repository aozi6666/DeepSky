
import { Navigate, Route, Routes } from 'react-router-dom'
import Upload from './pages/Upload'
import ButtonPage from './pages/Button'
import MainLayout from './layouts/MainLayout'
import Setup from './pages/Setup'
import Agents from './pages/Agents'
import AgentDetail from './pages/AgentDetail'
import QueryDemo from './pages/QueryDemo'
import NotFound from './pages/NotFound'
import SetupGuard from './routes/SetupGuard'
 
function App() {
  const setupComplete = (() => {
    try {
      return localStorage.getItem('setupComplete') === 'true'
    } catch {
      return false
    }
  })()

  return (
    <>
     {/* 定义路径规则:路由表 */}
     <Routes>
      <Route path="/setup" element={<Setup />} />

      {/* ② 所有“主应用页面”都被保护： SetupGuard 守卫组件*/}
      <Route element={<SetupGuard setupComplete={setupComplete} />}>
        <Route element={<MainLayout />}>
          <Route index element={<Navigate to="/upload" replace />} />
          <Route path="/upload" element={<Upload />} />
          <Route path="/button" element={<ButtonPage />} />
          {/* Agent 带路由参数 */}
          <Route path="/agents" element={<Agents />} />
          <Route path="/agents/:id" element={<AgentDetail />} />

          <Route path="/query" element={<QueryDemo />} />
          {/* // 404兜底： * = 匹配所有 */}
          <Route path="*" element={<NotFound />} />
        </Route>
      </Route>
     </Routes>
    </>
  )
}

export default App
