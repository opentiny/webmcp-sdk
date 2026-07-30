/**
 * MCP Servers 全局类型声明
 * 域名工具脚本运行在 MAIN world，经 document.modelContext 注册工具
 */

declare global {
  interface Window {
    /** runtime.js 暴露的 API（registerPageAgentTool 等） */
    WebMCP?: {
      registerPageAgentTool?: (options?: Record<string, any>) => void
      isConsoleCloudHost?: (hostname: string) => boolean
      consoleCloudPageAgentToolOptions?: Record<string, any>
      [key: string]: any
    }
    /**
     * 用户 MCP 脚本执行桥（vendor/user-mcp-exec.js）
     * 在扩展脚本上下文执行源码，绕过页面 CSP 对 eval 的限制
     */
    __NEXT_WXT_EXEC_USER_MCP_SCRIPT__?: (
      code: string
    ) => { ok: true } | { ok: false; error: string }
  }

  interface Document {
    /** 浏览器内置 / polyfill WebMCP */
    modelContext?: {
      registerTool: (def: {
        name: string
        title?: string
        description?: string
        inputSchema?: object
        execute: (args: any) => Promise<any>
      }) => void
      [key: string]: any
    }
  }
}

export {}
