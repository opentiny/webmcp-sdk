import { createBrowserRouter } from 'react-router-dom'

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
