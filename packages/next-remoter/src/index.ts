import TinyRemoter from './components/tiny-robot-chat.vue'
import '@opentiny/tiny-robot/dist/style.css'
import { useNextAgent } from './composable/useNextAgent'
export * from './types/type'
export * from './types/model-config'
export * from './config/model-config'
export { default as useModel } from './composable/useModel'

TinyRemoter.install = function (Vue: any) {
  Vue.component('tiny-remoter', TinyRemoter)
}

export { TinyRemoter, useNextAgent }
