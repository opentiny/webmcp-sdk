import { createApp } from 'vue'
import App from './App.vue'
// tiny-robot 对话框
import '@opentiny/tiny-robot/dist/style.css'
import { setToastDefaultOptions } from 'vant'

setToastDefaultOptions({ duration: 2000 })
const app = createApp(App)
app.mount('#app')
