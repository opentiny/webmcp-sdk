import TinyRemoter from './components/tiny-robot-chat.vue'
import '@opentiny/tiny-robot/dist/style.css'
export * from './types/type'

TinyRemoter.install = function (Vue: any) {
  Vue.component('tiny-remoter', TinyRemoter)
}

export { TinyRemoter }
