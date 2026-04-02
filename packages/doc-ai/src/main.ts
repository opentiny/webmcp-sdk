import { createApp } from 'vue'
import router from './router'
import App from './App.vue'
import './style.css'
import { setNavigator, initializeBuiltinMcpServer } from '@opentiny/next-sdk'
import { isNavigationFailure } from 'vue-router'

const app = createApp(App)

app.use(router)
app.mount('#app')

// 注册导航器，供 page-tool-bridge 在工具调用时自动跳转到对应路由
// router.push 失败时返回 NavigationFailure，需检查并抛出错误以正确反馈给工具调用方
setNavigator(async (route) => {
  const failure = await router.push(route)
  if (isNavigationFailure(failure)) {
    throw new Error('页面跳转失败')
  }
})

initializeBuiltinMcpServer()
