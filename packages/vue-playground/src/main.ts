import { createApp } from 'vue'
import App from './App.vue'
// 引入 matechat
import 'vue-devui/style.css'
import '@devui-design/icons/icomoon/devui-icon.css'
import 'vue-devui/style.css'
import DevUI from 'vue-devui'
import MateChat from '@matechat/core'
import { ThemeServiceInit, infinityTheme } from 'devui-theme'
ThemeServiceInit({ infinityTheme }, 'infinityTheme')

// 引入 TD chat
import TDesignChat from '@tdesign-vue-next/chat' // 引入chat组件
import TDesign from 'tdesign-vue-next'
import 'tdesign-vue-next/es/style/index.css' // 引入少量全局样式变量

const app = createApp(App)
app.use(DevUI)
app.use(MateChat)
app.use(TDesign)
app.use(TDesignChat)
app.mount('#app')
