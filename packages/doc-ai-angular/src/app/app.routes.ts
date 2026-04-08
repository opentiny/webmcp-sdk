import { Routes } from '@angular/router'

export const routes: Routes = [
  {
    path: 'home',
    loadComponent: () => import('./pages/home/home.component').then((m) => m.HomeComponent)
  },

  {
    path: 'comprehensive',
    redirectTo: '/inventory'
  },
  {
    path: 'inventory',
    loadComponent: () => import('./pages/inventory/inventory.component').then((m) => m.InventoryComponent)
  },
  {
    path: 'price-protection',
    loadComponent: () =>
      import('./pages/price-protection/price-protection.component').then((m) => m.PriceProtectionComponent)
  },
  {
    path: 'orders',
    loadComponent: () => import('./pages/orders/orders.component').then((m) => m.OrdersComponent)
  },
  {
    path: 'sales',
    loadComponent: () => import('./pages/sales/sales.component').then((m) => m.SalesComponent)
  },
  {
    path: 'finance',
    loadComponent: () => import('./pages/finance/finance.component').then((m) => m.FinanceComponent)
  },
  { path: '**', redirectTo: '/home' }
]
