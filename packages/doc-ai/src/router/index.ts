import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'Home',
      component: () => import('../views/home/index.vue')
    },
    {
      path: '/comprehensive',
      redirect: '/inventory'
    },
    {
      path: '/inventory',
      name: 'Inventory',
      component: () => import('../views/inventory/index.vue')
    },
    {
      path: '/price-protection',
      name: 'PriceProtection',
      component: () => import('../views/price-protection/index.vue')
    },
    {
      path: '/orders',
      name: 'Orders',
      component: () => import('../views/orders/index.vue')
    },
    {
      path: '/sales',
      name: 'Sales',
      component: () => import('../views/sales/index.vue')
    },
    {
      path: '/finance',
      name: 'Finance',
      component: () => import('../views/finance/index.vue')
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'NotFound',
      component: () => import('../views/404/NotFound.vue')
    }
  ]
})

export default router
