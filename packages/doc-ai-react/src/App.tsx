import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { setNavigator } from '@opentiny/next-sdk'
import HomePage from './components/HomePage'
import ComprehensivePage from './components/ComprehensivePage'
import PriceProtectionPage from './components/PriceProtectionPage'
import './App.css'

function App() {
  const navigate = useNavigate()

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/comprehensive" element={<ComprehensivePage />} />
        <Route path="/price-protection" element={<PriceProtectionPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
