/**
 * 用户 MCP 脚本模块对外入口
 * 与 mcp-servers / skills / 市场 MCP 解耦
 */

export * from './types'
export * from './match'
export * from './resolve'
export * from './template'
export * from './exec-bridge'
export {
  getUserMcpScriptsStore,
  setUserMcpScriptsStore,
  listUserMcpScripts,
  upsertUserMcpScript,
  removeUserMcpScript,
  setUserMcpScriptEnabled,
  createUserMcpScriptFromTemplate,
  exportUserMcpScriptsJson,
  importUserMcpScriptsJson,
  type UpsertResult
} from './storage'
