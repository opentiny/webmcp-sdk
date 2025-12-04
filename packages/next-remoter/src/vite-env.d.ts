/// <reference types="vite/client" />

/**
 * Vite 环境类型声明
 * 用于支持 Vite 的特殊导入语法
 */

declare module '*.md?raw' {
  const content: string
  export default content
}

declare module '*.md' {
  const content: string
  export default content
}

// 支持相对路径导入
declare module './prompt/*.md?raw' {
  const content: string
  export default content
}

