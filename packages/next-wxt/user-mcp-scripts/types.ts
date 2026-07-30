/**
 * 用户 MCP 脚本类型与存储键
 * 与内置 mcp-servers、skills 存储完全独立
 */

export const USER_MCP_SCRIPTS_KEY = 'local:user-mcp-scripts'

export interface UserMcpScript {
  id: string
  name: string
  description?: string
  /** 油猴风格 @match 列表 */
  matches: string[]
  enabled: boolean
  /** true 且匹配当前 URL 时，跳过该页内置 mcp-servers 注入 */
  replacesBuiltIn: boolean
  /** 注入到 MAIN world 的 JS 源码 */
  source: string
  updatedAt: number
}

export type UserMcpScriptsStore = Record<string, UserMcpScript>

export type UserMcpScriptInput = Omit<UserMcpScript, 'id' | 'updatedAt'> & {
  id?: string
}
