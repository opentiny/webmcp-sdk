import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core'
import { provideRouter } from '@angular/router'
import { routes } from './app.routes'

// Angular 应用全局配置，对应 Vue 版本中 createApp + app.use(router)
export const appConfig: ApplicationConfig = {
  providers: [
    // 使用 Zone.js 的变更检测
    provideZoneChangeDetection({ eventCoalescing: true }),
    // 注册路由
    provideRouter(routes)
  ]
}
