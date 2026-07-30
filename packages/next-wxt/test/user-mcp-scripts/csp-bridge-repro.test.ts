/**
 * 复现：在 https://www.jd.com/ 配置 @match=*://www.jd.com/* 的用户 MCP 脚本并保存后，
 * 页面仅出现 page-agent-tool，自定义 user_mcp_hello 未注册。
 *
 * 根因：background 在 MAIN world 的 scripting.executeScript 回调里直接 new Function(源码)，
 * 会受页面 CSP（无 unsafe-eval）拦截；而 runtime / page-agent 经 chrome-extension:// script 注入不受影响。
 *
 * 修复后：必须通过扩展脚本桥 __NEXT_WXT_EXEC_USER_MCP_SCRIPT__ 执行用户源码。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { matchUrl } from '../../user-mcp-scripts/match'
import {
  USER_MCP_EXEC_BRIDGE_NAME,
  USER_MCP_EXEC_BRIDGE_OWNER,
  buildBridgeInvokeSnippet
} from '../../user-mcp-scripts/exec-bridge'

const memory = new Map<string, unknown>()
const executeScript = vi.fn()

vi.mock('@wxt-dev/storage', () => ({
  storage: {
    getItem: async (key: string) => memory.get(key),
    setItem: async (key: string, value: unknown) => {
      memory.set(key, value)
    }
  }
}))

vi.stubGlobal('browser', {
  scripting: { executeScript }
})

import { injectUserMcpScriptsForTab } from '../../entrypoints/background/inject-user-mcp-scripts'
import { USER_MCP_SCRIPTS_KEY } from '../../user-mcp-scripts'

describe('复现：京东 CSP 阻断 MAIN world new Function', () => {
  beforeEach(() => {
    memory.clear()
    executeScript.mockReset()
  })

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

  it('injectUserMcpScriptsForTab 经 MAIN world 调用带所有权标记的桥', async () => {
    memory.set(USER_MCP_SCRIPTS_KEY, {
      s1: {
        id: 's1',
        name: 'jd',
        description: '',
        matches: ['*://www.jd.com/*'],
        enabled: true,
        replacesBuiltIn: false,
        source: 'window.__user_mcp_hello = 1',
        createdAt: 1,
        updatedAt: 1
      }
    })

    const bridgeFn = Object.assign(vi.fn(() => ({ ok: true as const })), {
      [USER_MCP_EXEC_BRIDGE_OWNER]: true
    })
    vi.stubGlobal('window', { [USER_MCP_EXEC_BRIDGE_NAME]: bridgeFn })

    executeScript.mockImplementation(
      async (opts: { world?: string; args?: unknown[]; func?: (...a: any[]) => unknown }) => {
        expect(opts.world).toBe('MAIN')
        expect(opts.args?.[1]).toBe(USER_MCP_EXEC_BRIDGE_NAME)
        expect(opts.args?.[2]).toBe(USER_MCP_EXEC_BRIDGE_OWNER)
        const body = String(opts.func)
        expect(body).not.toMatch(/new\s+Function\s*\(/)
        expect(body).toContain('run')
        const result = opts.func!(...(opts.args as [string, string, string]))
        return [{ result }]
      }
    )

    const out = await injectUserMcpScriptsForTab(42, 'https://www.jd.com/')
    expect(out.injectedCount).toBe(1)
    expect(out.success).toBe(true)
    expect(bridgeFn).toHaveBeenCalledWith('window.__user_mcp_hello = 1')
    expect(executeScript).toHaveBeenCalledTimes(1)
  })
})
