/**
 * 用户 MCP 脚本模块对外入口
 * 与 mcp-servers / skills / 市场 MCP 解耦
 */

export * from './types'
export * from './match'
export * from './resolve'
export * from './template'
export {
  USER_MCP_BIND_BRIDGE_NAME,
  USER_MCP_EXEC_BRIDGE_NAME,
  USER_MCP_EXEC_BRIDGE_PATH,
  buildBridgeInvokeSnippet,
  createUserMcpBridgeToken,
  type BridgeExecResult
} from './exec-bridge'
export {
  exportUserMcpScriptsZip,
  parseUserMcpScriptsZip,
  parseMetaModule,
  serializeMetaTs,
  folderNameForScript,
  hostHintFromMatch,
  type PackMeta,
  type PackedScriptEntry
} from './pack'
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
  importUserMcpScriptsZip,
  type UpsertResult
} from './storage'
