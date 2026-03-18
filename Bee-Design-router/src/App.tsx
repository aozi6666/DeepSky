
import { Navigate, Route, Routes } from 'react-router-dom'
import Upload from './pages/Upload'
import ButtonPage from './pages/Button'
import MainLayout from './layouts/MainLayout'
 
function App() {

  return (
    <>
     {/* 定义路径规则:路由表 */}
     <Routes>
      <Route element={<MainLayout />}>
        <Route index element={<Navigate to="/upload" replace />} />
        <Route path="/upload" element={<Upload />} />
        <Route path="/button" element={<ButtonPage />} />
      </Route>
     </Routes>
    </>
  )
}

export default App
