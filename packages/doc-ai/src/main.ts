import { createApp } from 'vue'
import router from './router'
import App from './App.vue'
import './style.css'
import { initializeBuiltinWebMCP, registerPageAgentTool } from '@opentiny/next-sdk'

initializeBuiltinWebMCP()
// 单页应用工具注册一次即可
registerPageAgentTool()

const app = createApp(App)

app.use(router)
app.mount('#app')
