import { createApp } from 'vue'
import router from './router'
import App from './App.vue'
import './style.css'
import {
  enableInspectAssist,
  initializeBuiltinWebMCP,
  registerPageAgentTool,
} from '@opentiny/next-sdk'

initializeBuiltinWebMCP()
// 单页应用工具注册一次即可
registerPageAgentTool()
// 开发态启用元素检视，生产环境不自动展示检视浮钮
if (import.meta.env.DEV) {
  enableInspectAssist({ brandLabel: 'Inspect' })
}

const app = createApp(App)

app.use(router)
app.mount('#app')
