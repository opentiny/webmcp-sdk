import { setNavigator } from '@opentiny/next-sdk'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { router } from './router.ts'

createRoot(document.getElementById('root')!).render(<App />)

// 第一步：在 main.ts 注册路由导航器
setNavigator(async (route) => {
  await router.navigate(route)
})
