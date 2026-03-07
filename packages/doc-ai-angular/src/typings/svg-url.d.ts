/**
 * Vite 风格 .svg?url 导入的类型声明。
 * next-sdk/remoter 中 createRemoter 使用此类导入，ng build 时 TypeScript 需要此声明才能通过。
 */
declare module '*.svg?url' {
  const url: string
  export default url
}
