/**
 * webmcp-tools 全局类型声明
 * 用于在域名工具文件中访问通过 page-init.ts 注入的 WebMCP polyfill
 */

// 扩展 Navigator 接口
declare global {
  interface Navigator {
    /**
     * WebMCP polyfill 注入的服务端接口（工具提供方使用）
     * 用于注册/注销工具，对应 next-wxt 插件注入的 document.modelContext
     */
    modelContext: {
      registerTool: (tool: WebMcpToolDefinition) => void

      notifyToolsChanged: () => void
    }
    /**
     * WebMCP polyfill 注入的客户端查询接口（工具调用方使用）
     * 用于列举和调用已注册的工具
     */
    modelContext: {
      listTools: () => Promise<WebMcpToolDefinition[]>
      executeTool: (tool: any, argsJson: string) => Promise<unknown>
      registerToolsChangedCallback?: (cb: () => void) => void
    }
  }
}

/** WebMCP 工具定义 */
export interface WebMcpToolDefinition {
  /** 工具唯一标识，建议格式：{domain}_{action} */
  name: string
  /** 工具标题（人类可读） */
  title?: string
  /** 工具描述，供 AI 理解功能用途 */
  description: string
  /** JSON Schema 格式的输入参数定义 */
  inputSchema?: {
    type: 'object'
    properties: Record<string, {
      type: string
      description?: string
      enum?: string[]
    }>
    required?: string[]
  }
  /** 工具执行函数 */
  execute: (args: Record<string, unknown>) => Promise<WebMcpToolResult>
}

/** WebMCP 工具执行结果 */
export interface WebMcpToolResult {
  content: Array<{
    type: 'text' | 'image' | 'resource'
    text?: string
    data?: string
    mimeType?: string
  }>
}

// 确保此文件被视为模块
export {}
