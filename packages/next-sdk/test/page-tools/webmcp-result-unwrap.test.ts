import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

if (typeof (globalThis as any).ShadowRoot === 'undefined') {
  ;(globalThis as any).ShadowRoot = (window as any).ShadowRoot ?? class ShadowRoot {}
}

vi.mock('../../page-tools/page-agent-mask/SimulatorMask', () => ({
  SimulatorMask: class SimulatorMask {
    shown = false
    show() {
      this.shown = true
    }
    hide() {
      this.shown = false
    }
    dispose() {}
    removeBorderElement() {}
    borderElement() {}
    setCursorPosition() {}
  }
}))

import { registerPageAgentTool } from '../../page-tools/page-agent-tool'
import { setupBuiltinProxy } from '../../utils/builtinProxy'
import { getBuiltinMcpTools } from '../../agent/utils/getBuiltinMcpTools'

describe('WebMCP 工具结果单层解包回归测试', () => {
  beforeEach(() => {
    document.body.innerHTML = '<main><button>立即购买</button></main>'
    delete window.__webmcpcli_toolConfig
    delete window.__webmcpcli_beforeGetBrowserState
  })

  afterEach(() => {
    window.__nextSdkPageAgentToolEventCleanup?.()
    if ((window as any).__pageAgentToolAbortController) {
      try {
        ;(window as any).__pageAgentToolAbortController.abort()
      } catch {
        // ignore
      }
      delete (window as any).__pageAgentToolAbortController
    }
  })

  it('复现：setupBuiltinProxy 调用 page-agent-tool 时因 polyfill 字符串化返回导致 content 被二次套壳 —— 前置注册 page-agent-tool；步骤发送 tools/call；期望响应 result.content[0].text 直接为单层快照 JSON', async () => {
    registerPageAgentTool()
    await new Promise((r) => setTimeout(r, 10))

    const sentMessages: any[] = []
    const fakeTransport = {
      start: vi.fn(),
      close: vi.fn(),
      send: vi.fn(async (msg: any) => {
        sentMessages.push(msg)
      }),
      onmessage: undefined as any
    }

    setupBuiltinProxy(fakeTransport as any)

    await fakeTransport.onmessage({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'page-agent-tool',
        arguments: { action: 'browserState', responseMode: 'full' }
      }
    })

    expect(sentMessages).toHaveLength(1)
    const rpcResult = sentMessages[0].result
    expect(Array.isArray(rpcResult.content)).toBe(true)
    const firstText = rpcResult.content[0].text
    const parsedOnce = JSON.parse(firstText)
    expect(parsedOnce).toHaveProperty('url')
    expect(parsedOnce).toHaveProperty('content')
    expect(Array.isArray(parsedOnce.content)).toBe(false)
  })

  it('复现：getBuiltinMcpTools 调用 page-agent-tool 时返回双层 MCP 外壳而非单层快照 JSON —— 前置注册 page-agent-tool；步骤通过 ai-sdk tool.execute 调用 browserState；期望返回单层快照 JSON 字符串', async () => {
    registerPageAgentTool()
    await new Promise((r) => setTimeout(r, 10))

    const toolSet = await getBuiltinMcpTools((document as any).modelContext)
    const pageTool = toolSet['page-agent-tool']
    expect(pageTool).toBeDefined()

    const output = await pageTool.execute!({ action: 'browserState', responseMode: 'full' }, {
      toolCallId: 'tc-1',
      messages: []
    } as any)

    expect(typeof output).toBe('string')
    const parsedOnce = JSON.parse(output as string)
    expect(parsedOnce).toHaveProperty('url')
    expect(parsedOnce).toHaveProperty('content')
    expect(typeof parsedOnce.content).toBe('string')
  })
})
