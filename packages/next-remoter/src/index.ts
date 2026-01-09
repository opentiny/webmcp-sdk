import TinyRemoter from './components/TinyRobotChat.vue'
import '@opentiny/tiny-robot/dist/style.css'
import { useNextAgent } from './composable/useNextAgent'
export * from './types/type'
export * from './types/model-config'
export { default as useModel } from './composable/useModel'

// 注意：存储管理模块已迁移到 next-wxt，remoter 组件不再提供存储功能
// Note: Storage management module has been migrated to next-wxt, remoter component no longer provides storage functionality

TinyRemoter.install = function (Vue: any) {
  Vue.component('tiny-remoter', TinyRemoter)
}

export { TinyRemoter, useNextAgent }
