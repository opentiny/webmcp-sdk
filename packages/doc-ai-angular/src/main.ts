import 'zone.js'
// 部分可注入类（如 _PlatformLocation）在开发/部分编译下需要 JIT，先加载 compiler 再引导
import '@angular/compiler'
import { bootstrapApplication } from '@angular/platform-browser'
import { AppComponent } from './app/app.component'
import { appConfig } from './app/app.config'
// 全局样式已在 angular.json 的 styles 中配置，此处不再重复 import

// 启动 Angular 应用
bootstrapApplication(AppComponent, appConfig).catch((err) => console.error(err))
