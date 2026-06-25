// 扩展 Window 接口以包含自定义属性
interface Window {
  /** 标记当前页面是否为 NEXTAGENT 页面 */
  __IS_NEXTAGENT_PAGE__?: boolean
}

// 扩展 Document 接口以包含 modelContext
interface Document {
  /** MCP 模型上下文 */
  modelContext?: any
}
