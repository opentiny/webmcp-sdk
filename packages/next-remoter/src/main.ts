import { createApp } from 'vue'
import App from './App.vue'
// tiny-robot 对话框
import '@opentiny/tiny-robot/dist/style.css'
import { setToastDefaultOptions } from 'vant'

export function entry(support: string) {
  setToastDefaultOptions({ duration: 2000 })
  const app = createApp(App, { support })
  app.mount('#app')
}

entry('office')
