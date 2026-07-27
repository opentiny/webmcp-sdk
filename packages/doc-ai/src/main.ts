import { createApp } from 'vue'
import router from './router'
import App from './App.vue'
import './style.css'
import {
  initializeBuiltinWebMCP,
  registerPageAgentTool,
  enableInspectAssist,
} from '@opentiny/next-sdk'

initializeBuiltinWebMCP()
// 单页应用工具注册一次即可
registerPageAgentTool()
// 开发态：点选区域复制 Cursor 元素卡片，验证 Inspect Assist
enableInspectAssist({ brandLabel: 'Inspect' })

const app = createApp(App)

app.use(router)
app.mount('#app')
