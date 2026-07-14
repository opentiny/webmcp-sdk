import TinyRemoter from './components/TinyRobotChat.vue'
import '@opentiny/tiny-robot/dist/style.css'
export * from './types/type'
export * from './types/model-config'
export { default as useModel } from './composable/useModel'

TinyRemoter.install = function (Vue: any) {
  Vue.component('tiny-remoter', TinyRemoter)
}

export { TinyRemoter }
