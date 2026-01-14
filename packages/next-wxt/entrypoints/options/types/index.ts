/**
 * Options 页面相关类型定义
 */

/**
 * AI 专家配置项
 */
export interface ExpertConfigItem {
  /** 专家ID（仅英文字母） */
  name: string
  /** 专家名称 */
  label: string
  /** 提示词 */
  prompts: string
  /** 描述 */
  description?: string
  /** 关联的域名列表 */
  requireDomains?: string[]
  /** 关联的工具列表 */
  tools?: string[]
}

/**
 * 动态 MCP 工具配置
 */
export interface DynamicMcpTool {
  /** 唯一标识 */
  id: string
  /** 工具名称 */
  name: string
  /** 匹配的域名（如 'excalidraw.com'） */
  domain: string
  /** URL 匹配模式（可选，支持通配符，如 '/canvas/*'） */
  urlPattern?: string
  /** 工具代码（遵循 MCP Server 规范） */
  code: string
  /** 是否启用 */
  enabled: boolean
  /** 工具描述 */
  description?: string
  /** 创建时间戳 */
  createdAt: number
  /** 更新时间戳 */
  updatedAt: number
}

/**
 * Storage 键名常量
 */
export const STORAGE_KEYS = {
  /** AI 专家配置列表 */
  EXPERT_CONFIGS: 'local:ai-extension-configs',
  /** 动态 MCP 工具列表 */
  DYNAMIC_MCP_TOOLS: 'local:dynamic-mcp-tools'
} as const
