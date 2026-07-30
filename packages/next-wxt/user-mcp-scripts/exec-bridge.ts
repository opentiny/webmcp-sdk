/**
 * 用户 MCP 脚本 MAIN world 执行桥约定
 *
 * Chrome 在 world:'MAIN' 的 scripting.executeScript 回调内使用 new Function/eval
 * 会受页面 CSP 约束（京东等站无 unsafe-eval）。必须经 chrome-extension:// 加载的脚本执行源码。
 */

export const USER_MCP_EXEC_BRIDGE_NAME = '__NEXT_WXT_EXEC_USER_MCP_SCRIPT__'

export const USER_MCP_EXEC_BRIDGE_PATH = 'vendor/user-mcp-exec.js'

/**
 * 供单测断言：注入侧应调用桥，而不是在回调里 new Function
 */
export function buildBridgeInvokeSnippet(codeLiteral: string): string {
  return `window.${USER_MCP_EXEC_BRIDGE_NAME}(${JSON.stringify(codeLiteral)})`
}

export type BridgeExecResult = { ok: true } | { ok: false; error: string }
