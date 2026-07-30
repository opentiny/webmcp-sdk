/**
 * 复现：在 https://www.jd.com/ 配置 @match=*://www.jd.com/* 的用户 MCP 脚本并保存后，
 * 页面仅出现 page-agent-tool，自定义 user_mcp_hello 未注册。
 *
 * 根因：background 在 MAIN world 的 scripting.executeScript 回调里直接 new Function(源码)，
 * 会受页面 CSP（无 unsafe-eval）拦截；而 runtime / page-agent 经 chrome-extension:// script 注入不受影响。
 *
 * 修复后：必须通过扩展脚本桥；并用 capability token（闭包）而非可伪造的 OWNER 属性。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { matchUrl } from '../../user-mcp-scripts/match'
import {
  USER_MCP_BIND_BRIDGE_NAME,
  USER_MCP_EXEC_BRIDGE_NAME,
  buildBridgeInvokeSnippet,
  createUserMcpBridgeToken
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

import {
  injectUserMcpScriptsForTab,
  clearUserMcpBridgeToken
} from '../../entrypoints/background/inject-user-mcp-scripts'
import { USER_MCP_SCRIPTS_KEY } from '../../user-mcp-scripts'

describe('复现：京东 CSP 阻断 MAIN world new Function', () => {
  beforeEach(() => {
    memory.clear()
    executeScript.mockReset()
    clearUserMcpBridgeToken(42)
  })

  it('@match 能命中 https://www.jd.com/（排除匹配失败）', () => {
    expect(matchUrl('*://www.jd.com/*', 'https://www.jd.com/')).toBe(true)
    expect(matchUrl('*://www.jd.com/*', 'https://www.jd.com/index.html')).toBe(true)
  })

  it('注入路径须走扩展桥而非在 executeScript 回调内 new Function', () => {
    expect(USER_MCP_EXEC_BRIDGE_NAME).toBe('__NEXT_WXT_EXEC_USER_MCP_SCRIPT__')
    const snippet = buildBridgeInvokeSnippet('console.log(1)', 'tok')
    expect(snippet).toContain(USER_MCP_EXEC_BRIDGE_NAME)
    expect(snippet).toContain('tok')
    expect(snippet).not.toMatch(/new\s+Function\s*\(/)
  })

  it('injectUserMcpScriptsForTab：先 bind(token) 再经 MAIN world 调用 exec(code, token)', async () => {
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

    let boundToken = ''
    const bridgeFn = vi.fn((code: string, capability: string) => {
      if (capability !== boundToken) return { ok: false, error: 'unauthorized' }
      return { ok: true as const }
    })
    const bindFn = vi.fn((token: string) => {
      boundToken = token
      ;(globalThis as any).window[USER_MCP_EXEC_BRIDGE_NAME] = bridgeFn
      delete (globalThis as any).window[USER_MCP_BIND_BRIDGE_NAME]
      return { ok: true as const }
    })
    vi.stubGlobal('window', { [USER_MCP_BIND_BRIDGE_NAME]: bindFn })

    executeScript.mockImplementation(
      async (opts: { world?: string; args?: unknown[]; func?: (...a: any[]) => unknown }) => {
        expect(opts.world).toBe('MAIN')
        const body = String(opts.func)
        expect(body).not.toMatch(/new\s+Function\s*\(/)
        const result = opts.func!(...(opts.args as any[]))
        return [{ result }]
      }
    )

    const out = await injectUserMcpScriptsForTab(42, 'https://www.jd.com/')
    expect(out.injectedCount).toBe(1)
    expect(out.success).toBe(true)
    expect(bindFn).toHaveBeenCalledTimes(1)
    expect(boundToken.length).toBeGreaterThanOrEqual(32)
    expect(bridgeFn).toHaveBeenCalledWith('window.__user_mcp_hello = 1', boundToken)
    // bind + exec
    expect(executeScript).toHaveBeenCalledTimes(2)
  })

  it('伪造 OWNER 属性不能代替 capability：错误 token 被拒绝', async () => {
    memory.set(USER_MCP_SCRIPTS_KEY, {
      s1: {
        id: 's1',
        name: 'jd',
        matches: ['*://www.jd.com/*'],
        enabled: true,
        replacesBuiltIn: false,
        source: '1',
        updatedAt: 1
      }
    })

    const realToken = createUserMcpBridgeToken()
    const forged = Object.assign(
      vi.fn(() => ({ ok: true as const })),
      { __NEXT_WXT_OWNED__: true }
    )
    // 模拟：页面伪造了 exec，bind 已不在（或我们直接走第二次注入复用 token）
    // 先正常 bind
    const bindFn = vi.fn((token: string) => {
      expect(token).toBeTruthy()
      ;(globalThis as any).window[USER_MCP_EXEC_BRIDGE_NAME] = (code: string, cap: string) => {
        if (cap !== token) return { ok: false, error: 'unauthorized' }
        return { ok: true }
      }
      return { ok: true }
    })
    vi.stubGlobal('window', { [USER_MCP_BIND_BRIDGE_NAME]: bindFn })

    executeScript.mockImplementation(
      async (opts: { world?: string; args?: unknown[]; func?: (...a: any[]) => unknown }) => {
        const result = opts.func!(...(opts.args as any[]))
        return [{ result }]
      }
    )

    const ok = await injectUserMcpScriptsForTab(42, 'https://www.jd.com/')
    expect(ok.success).toBe(true)

    // 再次注入应复用 token；即使 window 上被换成伪造 OWNER 函数，
    // 调用仍带真实 token——此处替换为只认 realToken 的假函数应失败
    clearUserMcpBridgeToken(42)
    // 重新走 bind，但页面抢先装了带 OWNER 的假桥且 bind 被删——用 locked 场景
    vi.stubGlobal('window', {
      [USER_MCP_EXEC_BRIDGE_NAME]: forged
      // 无 bind
    })
    const fail = await injectUserMcpScriptsForTab(42, 'https://www.jd.com/')
    expect(fail.success).toBe(false)
    expect(fail.error).toMatch(/bind entry missing|locked|失败/)
    expect(forged).not.toHaveBeenCalled()
    void realToken
  })
})
