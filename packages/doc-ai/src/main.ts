import { createApp } from 'vue'
import router from './router'
import App from './App.vue'
import './style.css'
import { registerPageAgentTool } from '@opentiny/next-sdk'
import { enableInspectAssist } from '@opentiny/next-sdk/dev'

// 单页应用工具注册一次即可
registerPageAgentTool({ removeMaskAfterToolCall: false })
// 开发态启用元素检视，生产环境不自动展示检视浮钮
if (import.meta.env.DEV) {
  enableInspectAssist({ brandLabel: 'Inspect' })
}

const app = createApp(App)

app.use(router)
app.mount('#app')
