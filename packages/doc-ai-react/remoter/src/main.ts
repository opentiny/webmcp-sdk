import { createApp } from 'vue'
import App from './App.vue'

// 创建并挂载 Vue 应用（仅包含 TinyRemoter），用于 iframe 内渲染
const app = createApp(App)
app.mount('#remoter-app')
