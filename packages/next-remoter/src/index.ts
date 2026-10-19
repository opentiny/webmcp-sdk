import TinyRemoter from './components/TinyRobotChat.vue'
import '@opentiny/tiny-robot/dist/style.css'
import '@opentiny/tiny-robot-chat/dist/style.css'
export * from './types/type'
export * from './types/model-config'
export { default as useModel } from './composable/useModel'
export { useRemoterRuntime } from './composable/useRemoterRuntime'

const TinyRobotChat = TinyRemoter

TinyRemoter.install = function (Vue: any) {
  Vue.component('tiny-remoter', TinyRemoter)
  Vue.component('TinyRobotChat', TinyRemoter)
}

export { TinyRemoter, TinyRobotChat }
export default TinyRemoter
