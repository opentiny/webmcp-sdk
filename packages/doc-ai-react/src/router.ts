import { createBrowserRouter } from 'react-router-dom'

// 第二步：配置路由  确保每个有页面工具的页面都有对应路由，并与 navigate_to_page 的目标路径保持一致
export const router = createBrowserRouter([
  {
    path: '/',
    lazy: () => import('./components/HomePage')
  },
  {
    path: '/comprehensive',
    redirect: '/inventory'
  },
  {
    path: '/inventory',
    lazy: () => import('./components/InventoryPage')
  },
  {
    path: '/price-protection',
    lazy: () => import('./components/PriceProtectionPage')
  },
  {
    path: '/orders',
    lazy: () => import('./components/OrdersPage')
  },
  {
    path: '/sales',
    lazy: () => import('./components/SalesPage')
  },
  {
    path: '/finance',
    lazy: () => import('./components/FinancePage')
  },
  {
    path: '*',
    lazy: () => import('./components/NotFoundPage')
  }
])
