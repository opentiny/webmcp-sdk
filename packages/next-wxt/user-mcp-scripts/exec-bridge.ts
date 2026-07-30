/**
 * 用户 MCP 脚本 MAIN world 执行桥约定
 *
 * Chrome 在 world:'MAIN' 的 scripting.executeScript 回调内使用 new Function/eval
 * 会受页面 CSP 约束。必须经 chrome-extension:// 加载的脚本执行源码，
 * 且仅调用带所有权标记的桥，避免页面伪造 window 全局劫持源码。
 */

export const USER_MCP_EXEC_BRIDGE_NAME = '__NEXT_WXT_EXEC_USER_MCP_SCRIPT__'

/** 桥函数上的所有权标记字段名（与 vendor/user-mcp-exec.js 一致） */
export const USER_MCP_EXEC_BRIDGE_OWNER = '__NEXT_WXT_OWNED__'

export const USER_MCP_EXEC_BRIDGE_PATH = 'vendor/user-mcp-exec.js'

/**
 * 供单测断言：注入侧应调用已校验所有权的桥，而不是在回调里 new Function
 */
export function buildBridgeInvokeSnippet(codeLiteral: string): string {
  return `window.${USER_MCP_EXEC_BRIDGE_NAME}(${JSON.stringify(codeLiteral)})`
}

export type BridgeExecResult = { ok: true } | { ok: false; error: string }
