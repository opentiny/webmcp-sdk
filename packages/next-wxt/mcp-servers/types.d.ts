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

/**
 * 子模块配置接口
 * 用于定义网站的子路由模块
 */
export interface ModuleConfig {
  /** 子模块对应的完整 URL 路由 */
  url: string
  /** 工具文件入口（相对于 meta.ts 所在目录的相对路径） */
  entry: string
}

/**
 * MCP 服务器元信息配置接口
 * 定义一个网站的 MCP 服务器配置
 */
export interface MetaConfig {
  /** 网站域名或唯一标识 */
  name: string
  /** MCP 服务器类型 */
  type: McpServerType
  /** 网站主 URL */
  url: string
  /** 是否始终启用（用于某些全局服务） */
  isAlwaysEnabled?: boolean
  /** 子模块配置，key 为模块名称，value 为模块配置 */
  modules?: Record<string, ModuleConfig>
  /** 版本号 */
  version: string
}

/**
 * 模块信息（内部使用）
 * 用于维护工具名称到模块的映射关系
 */
export interface ModuleInfo {
  /** 模块名称 */
  moduleName: string
  /** 模块对应的 URL */
  moduleUrl: string
  /** 所属域名 */
  domain: string
}

// 确保此文件被视为模块
export {}
