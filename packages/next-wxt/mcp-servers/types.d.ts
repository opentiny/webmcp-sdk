/**
 * MCP Servers 全局类型声明
 * 用于在 IIFE 格式的 mcp-server 中访问通过 vendor/next-sdk.js 注入的全局变量
 */

// 扩展 Window 接口
declare global {
  interface Window {
    /**
     * Next SDK 全局命名空间
     * 包含 WebMcpServer、ContentScriptServerTransport、z 等核心导出
     */
    NextSDK: {
      WebMcpServer: any
      ContentScriptServerTransport: any
      z: any
    }
  }
}

export type McpServerType = 'pageMcpServer' | 'contentScriptMcpServer'

// 确保此文件被视为模块
export {}
