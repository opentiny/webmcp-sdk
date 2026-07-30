/**
 * 复现：在 https://www.jd.com/ 配置 @match=*://www.jd.com/* 的用户 MCP 脚本并保存后，
 * 页面仅出现 page-agent-tool，自定义 user_mcp_hello 未注册。
 *
 * 根因：background 在 MAIN world 的 scripting.executeScript 回调里直接 new Function(源码)，
 * 会受页面 CSP（无 unsafe-eval）拦截；而 runtime / page-agent 经 chrome-extension:// script 注入不受影响。
 *
 * 修复后：必须通过扩展脚本桥 __NEXT_WXT_EXEC_USER_MCP_SCRIPT__ 执行用户源码。
 */
import { describe, expect, it } from 'vitest'
import { matchUrl } from '../../user-mcp-scripts/match'
import {
  USER_MCP_EXEC_BRIDGE_NAME,
  buildBridgeInvokeSnippet
} from '../../user-mcp-scripts/exec-bridge'

describe('复现：京东 CSP 阻断 MAIN world new Function', () => {
  it('@match 能命中 https://www.jd.com/（排除匹配失败）', () => {
    expect(matchUrl('*://www.jd.com/*', 'https://www.jd.com/')).toBe(true)
    expect(matchUrl('*://www.jd.com/*', 'https://www.jd.com/index.html')).toBe(true)
  })

  it('注入路径须走扩展桥而非在 executeScript 回调内 new Function', () => {
    expect(USER_MCP_EXEC_BRIDGE_NAME).toBe('__NEXT_WXT_EXEC_USER_MCP_SCRIPT__')
    const snippet = buildBridgeInvokeSnippet('console.log(1)')
    expect(snippet).toContain(USER_MCP_EXEC_BRIDGE_NAME)
    expect(snippet).not.toMatch(/new\s+Function\s*\(/)
  })
})
