import { Routes } from '@angular/router'

// 路由配置，对应 Vue 版本的 router/index.ts
export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home/home.component').then((m) => m.HomeComponent)
  },
  {
    path: 'comprehensive',
    loadComponent: () =>
      import('./pages/comprehensive/comprehensive.component').then((m) => m.ComprehensiveComponent)
  },
  {
    path: 'price-protection',
    loadComponent: () =>
      import('./pages/price-protection/price-protection.component').then((m) => m.PriceProtectionComponent)
  },
  {
    path: '**',
    redirectTo: ''
  }
]
