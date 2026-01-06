import TinyRemoter from './components/tiny-robot-chat.vue'
import '@opentiny/tiny-robot/dist/style.css'
import { useNextAgent } from './composable/useNextAgent'
export * from './types/type'
export * from './types/model-config'
export * from './config/model-config'
export { default as useModel } from './composable/useModel'

// 导出统一存储管理模块
export { StorageManager, getStorageManager, createStorageManager, storage } from './utils/storage-manager'
export { StorageKeys, type StorageKey } from './utils/storage-keys'
export type { IStorageAdapter, StorageManagerConfig } from './utils/storage-manager'

TinyRemoter.install = function (Vue: any) {
  Vue.component('tiny-remoter', TinyRemoter)
}

export { TinyRemoter, useNextAgent }
