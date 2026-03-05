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
      name: 'Comprehensive',
      component: () => import('../views/comprehensive/index.vue')
    },
    {
      path: '/price-protection',
      name: 'PriceProtection',
      component: () => import('../views/price-protection/index.vue')
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'NotFound',
      component: () => import('../views/404/NotFound.vue')
    }
  ]
})

export default router
