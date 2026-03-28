import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<div>Dashboard — coming soon</div>} />
        <Route path="/login" element={<div>Login — coming soon</div>} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
