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

const app = createApp(App)
app.use(DevUI)
app.use(MateChat)
app.mount('#app')
