import { createApp } from 'vue'
import router from './router'
import App from './App.vue'
import './style.css'
import { setNavigator, initializeBuiltinWebMCP } from '@opentiny/next-sdk'
import { isNavigationFailure, NavigationFailureType } from 'vue-router'

// 注册导航器，供 page-tool-bridge 在工具调用时自动跳转到对应路由
// router.push 失败时返回 NavigationFailure，需检查并抛出错误以正确反馈给工具调用方
setNavigator(async (route) => {
  const failure = await router.push(route)
  if (failure) {
    // 忽略重复跳转错误，这种情况代表已处于目标页面，返回 true 跳过握手同步逻辑
    if (isNavigationFailure(failure, NavigationFailureType.duplicated)) {
      console.log('重复跳转')
      return true
    }
    throw new Error(`页面跳转失败: ${(failure as any).message}`)
  }
})

initializeBuiltinWebMCP()

const app = createApp(App)

app.use(router)
app.mount('#app')
