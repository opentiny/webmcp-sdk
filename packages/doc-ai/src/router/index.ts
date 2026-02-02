import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: '/product/list'
    },
    {
      path: '/product',
      component: () => import('../views/product/layout.vue'),
      children: [
        { path: 'list', name: 'ProductList', component: () => import('../views/product/list.vue') },
        { path: 'category', name: 'ProductCategory', component: () => import('../views/product/category.vue') },
        { path: 'status', name: 'ProductStatus', component: () => import('../views/product/status.vue') },
        { path: 'inventory', name: 'ProductInventory', component: () => import('../views/product/inventory.vue') }
      ]
    },
    {
      path: '/comprehensive',
      name: 'Comprehensive',
      component: () => import('../views/comprehensive/index.vue')
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'NotFound',
      component: () => import('../views/404/NotFound.vue')
    }
  ]
})

export default router
