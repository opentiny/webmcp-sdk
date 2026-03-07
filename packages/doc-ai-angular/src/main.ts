import 'zone.js'
import { bootstrapApplication } from '@angular/platform-browser'
import { AppComponent } from './app/app.component'
import { appConfig } from './app/app.config'

// 标准 Angular 21 入口：不加载 @angular/compiler（application 构建为 AOT，加载 compiler 会导致构建卡住）
bootstrapApplication(AppComponent, appConfig).catch((err) => console.error(err))
