// 扩展 Window 接口以包含自定义属性
interface Window {
  /** 标记当前页面是否为 NEXTAGENT 页面 */
  __IS_NEXTAGENT_PAGE__?: boolean
}

// Vite raw 导入类型声明
declare module '*.md?raw' {
  const content: string
  export default content
}

declare module '*?raw' {
  const content: string
  export default content
}
