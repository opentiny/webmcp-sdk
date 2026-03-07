import 'zone.js'
import { bootstrapApplication } from '@angular/platform-browser'
import { AppComponent } from './app/app.component'
import { appConfig } from './app/app.config'
import './styles.scss'

// 启动 Angular 应用
bootstrapApplication(AppComponent, appConfig).catch((err) => console.error(err))
