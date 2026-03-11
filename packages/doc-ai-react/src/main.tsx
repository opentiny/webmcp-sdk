import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { setNavigator } from '@opentiny/next-sdk'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
