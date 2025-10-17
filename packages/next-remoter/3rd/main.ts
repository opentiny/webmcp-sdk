import { createApp } from 'vue'
import App from './App.vue'
import { setToastDefaultOptions } from 'vant'
// 引入 matechat
import 'vue-devui/style.css'
import '@devui-design/icons/icomoon/devui-icon.css'
import 'vue-devui/style.css'
import DevUI from 'vue-devui'
import MateChat from '@matechat/core'

setToastDefaultOptions({ duration: 1000 })

const app = createApp(App)
app.use(DevUI)
app.use(MateChat)
app.mount('#app')

import { ThemeServiceInit, infinityTheme } from 'devui-theme'

// 使用无限主题
ThemeServiceInit({ infinityTheme }, 'infinityTheme')
