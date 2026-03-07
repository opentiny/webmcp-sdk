/// <reference types="vite/client" />

// 让 TypeScript 识别 .vue 文件导入，类型由 @vitejs/plugin-vue 在运行时处理
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent
  export default component
}
