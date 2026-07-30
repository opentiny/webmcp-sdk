/**
 * 用户 MCP 脚本 MAIN world 执行桥约定
 *
 * Chrome 在 world:'MAIN' 的 scripting.executeScript 回调内使用 new Function/eval
 * 会受页面 CSP 约束。必须经 chrome-extension:// 加载的脚本执行源码。
 *
 * 所有权：使用 background 生成的 capability token（闭包校验），
 * 而非可被页面伪造的静态属性（如 __NEXT_WXT_OWNED__）。
 *
 * 注入顺序（硬约束）：
 * 1. content：vendor/runtime.js
 * 2. content：vendor/register-page-agent-tool.js
 * 3. content：vendor/user-mcp-exec.js（仅安装 bind 入口）
 * 4. background：bind(token) → exec(code, token)
 */

/** 一次性 bind 入口（user-mcp-exec.js 安装，bind 成功后删除） */
export const USER_MCP_BIND_BRIDGE_NAME = '__NEXT_WXT_BIND_USER_MCP_BRIDGE__'

/** 执行桥（bind 后安装，校验 capability） */
export const USER_MCP_EXEC_BRIDGE_NAME = '__NEXT_WXT_EXEC_USER_MCP_SCRIPT__'

export const USER_MCP_EXEC_BRIDGE_PATH = 'vendor/user-mcp-exec.js'

/**
 * 供单测断言：注入侧应调用桥而非在回调里 new Function
 */
export function buildBridgeInvokeSnippet(codeLiteral: string, tokenLiteral = '<token>'): string {
  return `window.${USER_MCP_EXEC_BRIDGE_NAME}(${JSON.stringify(codeLiteral)}, ${JSON.stringify(tokenLiteral)})`
}

export type BridgeExecResult =
  | { ok: true }
  | { ok: false; error: string; locked?: boolean }

export function createUserMcpBridgeToken(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  // 至少 32 字符，满足桥对 token 长度的校验
  const bytes = new Uint8Array(32)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes)
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = (Math.random() * 256) | 0
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}
