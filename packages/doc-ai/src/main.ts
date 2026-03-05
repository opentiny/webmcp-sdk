import { createApp } from 'vue'
import router from './router'
import App from './App.vue'
import './style.css'
import { setNavigator } from '@opentiny/next-sdk'

const app = createApp(App)

app.use(router)
app.mount('#app')

// 注册导航器，供 createPageToolHandler 在工具调用时自动跳转到对应路由
setNavigator((route) => router.push(route))
