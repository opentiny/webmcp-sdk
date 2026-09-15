import { describe, it, expect, vi, afterEach } from 'vitest'
import { initializeBuiltinWebMCP } from '../../page-tools/initialize-builtin-WebMCP'

const POLYFILL_MARKER = '__isWebMCPPolyfill'

type ModelContextHost = {
  modelContext?: unknown
}

function installFakeNative(target: object, label: string) {
  const native = {
    getTools: vi.fn(async () => {
      throw new Error(`native ${label} getTools should not be called`)
    }),
    registerTool: vi.fn(),
    executeTool: vi.fn()
  }
  Object.defineProperty(target, 'modelContext', {
    value: native,
    configurable: true,
    writable: true,
    enumerable: true
  })
  return native
}

function restoreOriginAgentCluster(previous: PropertyDescriptor | undefined) {
  try {
    if (previous) Object.defineProperty(window, 'originAgentCluster', previous)
    else delete (window as { originAgentCluster?: boolean }).originAgentCluster
  } catch {
    /* ignore */
  }
}

afterEach(() => {
  // 清掉实例与原型属性，避免用例互相污染
  try {
    delete (document as Document & ModelContextHost).modelContext
  } catch {
    /* ignore */
  }
  try {
    delete (Document.prototype as ModelContextHost).modelContext
  } catch {
    /* ignore */
  }
  try {
    delete (navigator as Navigator & ModelContextHost).modelContext
  } catch {
    /* ignore */
  }
  try {
    delete (Navigator.prototype as ModelContextHost).modelContext
  } catch {
    /* ignore */
  }
})

describe('initializeBuiltinWebMCP forcePolyfill', () => {
  it('复现：Chrome 原生 document.modelContext.getTools 会杀渲染进程 —— 前置 document 上已有非 polyfill 的伪 native；步骤 initializeBuiltinWebMCP()；期望替换为 JS polyfill 且不调用原生 getTools', async () => {
    const native = installFakeNative(document, 'document')

    initializeBuiltinWebMCP()

    const ctx = (document as Document & ModelContextHost).modelContext as {
      [key: string]: unknown
      getTools?: () => Promise<unknown[]>
    }
    expect(ctx).toBeTruthy()
    expect(ctx[POLYFILL_MARKER]).toBe(true)
    expect(ctx).not.toBe(native)
    expect(native.getTools).not.toHaveBeenCalled()

    const tools = await ctx.getTools?.()
    expect(Array.isArray(tools)).toBe(true)
    expect(native.getTools).not.toHaveBeenCalled()
  })

  it('复现：需要验证原生 API 时关闭强制 polyfill —— 前置 document 上伪 native；步骤 initializeBuiltinWebMCP({ forcePolyfill: false })；期望保留该 native', () => {
    const native = installFakeNative(document, 'opt-out')

    initializeBuiltinWebMCP({ forcePolyfill: false })

    const ctx = (document as Document & ModelContextHost).modelContext
    expect(ctx).toBe(native)
    expect((ctx as Record<string, unknown>)[POLYFILL_MARKER]).toBeUndefined()
  })

  it('复现：originAgentCluster 为 false 时不得误包装 native —— 前置伪 native 且 originAgentCluster === false；步骤 initializeBuiltinWebMCP({ forcePolyfill: false })；期望仍是原 native registerTool', () => {
    const previous = Object.getOwnPropertyDescriptor(window, 'originAgentCluster')
    Object.defineProperty(window, 'originAgentCluster', {
      configurable: true,
      enumerable: true,
      get: () => false
    })
    const native = installFakeNative(document, 'native-oac')

    try {
      initializeBuiltinWebMCP({ forcePolyfill: false })
      const ctx = (document as Document & ModelContextHost).modelContext as { registerTool?: unknown }
      expect(ctx).toBe(native)
      expect(ctx.registerTool).toBe(native.registerTool)
    } finally {
      restoreOriginAgentCluster(previous)
    }
  })

  it('已是 polyfill 时再次初始化仍保留 marker，不拆掉 JS context 且不触发告警', () => {
    const warnSpy = vi.spyOn(console, 'warn')
    try {
      initializeBuiltinWebMCP()
      const first = (document as Document & ModelContextHost).modelContext
      expect((first as Record<string, unknown>)[POLYFILL_MARKER]).toBe(true)

      initializeBuiltinWebMCP()
      const second = (document as Document & ModelContextHost).modelContext
      expect(second).toBe(first)
      expect((second as Record<string, unknown>)[POLYFILL_MARKER]).toBe(true)

      const deprecationWarnings = warnSpy.mock.calls.filter(([msg]) =>
        typeof msg === 'string' && msg.includes('[WebMCPPolyfill] navigator.modelContext is deprecated')
      )
      expect(deprecationWarnings).toHaveLength(0)
    } finally {
      warnSpy.mockRestore()
    }
  })

  it('复现：Chromium 把 modelContext 放在 Document.prototype —— 前置原型 getter 返回伪 native；步骤默认初始化；期望实例上是 polyfill 且不调用原生 getTools', async () => {
    const native = {
      getTools: vi.fn(async () => {
        throw new Error('native prototype getTools should not be called')
      }),
      registerTool: vi.fn(),
      executeTool: vi.fn()
    }
    const previous = Object.getOwnPropertyDescriptor(Document.prototype, 'modelContext')
    Object.defineProperty(Document.prototype, 'modelContext', {
      configurable: true,
      enumerable: true,
      get() {
        return native
      }
    })
    try {
      delete (document as Document & ModelContextHost).modelContext
    } catch {
      /* ignore */
    }

    try {
      initializeBuiltinWebMCP()

      const ctx = (document as Document & ModelContextHost).modelContext as Record<string, unknown>
      expect(ctx).toBeTruthy()
      expect(ctx[POLYFILL_MARKER]).toBe(true)
      expect(ctx).not.toBe(native)
      expect(native.getTools).not.toHaveBeenCalled()
      const tools = await (ctx as { getTools: () => Promise<unknown[]> }).getTools()
      expect(Array.isArray(tools)).toBe(true)
    } finally {
      if (previous) {
        Object.defineProperty(Document.prototype, 'modelContext', previous)
      } else {
        delete (Document.prototype as ModelContextHost).modelContext
      }
    }
  })

  it('复现：navigator.modelContext getter 存在时初始化不触发自身告警且正常挂载 polyfill —— 前置 navigator 挂有带警告的兼容 getter；步骤 initializeBuiltinWebMCP()；期望无 deprecation warning 且 document.modelContext 正确安装', () => {
    const warnSpy = vi.spyOn(console, 'warn')
    delete (Document.prototype as ModelContextHost).modelContext
    delete (document as Document & ModelContextHost).modelContext

    Object.defineProperty(navigator, 'modelContext', {
      configurable: true,
      enumerable: true,
      get() {
        console.warn(
          '[WebMCPPolyfill] navigator.modelContext is deprecated. The May 27, 2026 WebMCP draft moved the modelContext getter from Navigator to Document — use document.modelContext instead. See https://github.com/webmachinelearning/webmcp/pull/184.'
        )
        return { [POLYFILL_MARKER]: true }
      }
    })

    try {
      initializeBuiltinWebMCP()

      const deprecationWarnings = warnSpy.mock.calls.filter(([msg]) =>
        typeof msg === 'string' && msg.includes('[WebMCPPolyfill] navigator.modelContext is deprecated')
      )
      expect(deprecationWarnings).toHaveLength(0)

      const docCtx = (document as Document & ModelContextHost).modelContext as Record<string, unknown>
      expect(docCtx).toBeTruthy()
      expect(docCtx[POLYFILL_MARKER]).toBe(true)
    } finally {
      warnSpy.mockRestore()
    }
  })

  it('复现：Windows originAgentCluster 为 false 时 registerTool 抛 SecurityError —— 前置 window.originAgentCluster === false（企业策略 OriginAgentClusterDefaultEnabled=false / Origin-Agent-Cluster:?0）；步骤 initializeBuiltinWebMCP 后 registerTool+getTools；期望不抛 SecurityError 且工具可被发现', async () => {
    const previous = Object.getOwnPropertyDescriptor(window, 'originAgentCluster')
    Object.defineProperty(window, 'originAgentCluster', {
      configurable: true,
      enumerable: true,
      get: () => false
    })

    try {
      initializeBuiltinWebMCP()

      const ctx = (document as Document & ModelContextHost).modelContext as {
        [key: string]: unknown
        registerTool: (tool: Record<string, unknown>) => Promise<unknown>
        getTools: () => Promise<Array<{ name: string }>>
      }
      expect(ctx[POLYFILL_MARKER]).toBe(true)

      const toolName = `probe-origin-agent-cluster-${Date.now()}`
      await expect(
        ctx.registerTool({
          name: toolName,
          description: 'probe originAgentCluster bypass',
          inputSchema: { type: 'object', properties: {} },
          execute: async () => ({ ok: true })
        })
      ).resolves.toBeUndefined()

      const tools = await ctx.getTools()
      expect(tools.some((tool) => tool.name === toolName)).toBe(true)
    } finally {
      restoreOriginAgentCluster(previous)
    }
  })

  it('复现：Chrome 146 不可删除的原型 native + originAgentCluster false 时注册抛 DOMException —— 前置 Document.prototype.modelContext 为删不掉的 native，且 navigator.modelContext 同为 native，window.originAgentCluster === false；步骤 initializeBuiltinWebMCP；期望 document.modelContext 为 JS polyfill，registerTool 成功且不调用原生', async () => {
    const native = {
      getTools: vi.fn(async () => {
        throw new Error('native getTools should not be called')
      }),
      registerTool: vi.fn(async () => {
        throw new DOMException('', 'SecurityError')
      }),
      executeTool: vi.fn()
    }
    const previousDoc = Object.getOwnPropertyDescriptor(Document.prototype, 'modelContext')
    const previousNav = Object.getOwnPropertyDescriptor(navigator, 'modelContext')
    const previousOac = Object.getOwnPropertyDescriptor(window, 'originAgentCluster')

    Object.defineProperty(Document.prototype, 'modelContext', {
      configurable: true,
      enumerable: true,
      get() {
        return native
      }
    })
    Object.defineProperty(navigator, 'modelContext', {
      configurable: true,
      writable: true,
      enumerable: true,
      value: native
    })
    Object.defineProperty(window, 'originAgentCluster', {
      configurable: true,
      enumerable: true,
      get: () => false
    })

    const origDelete = Reflect.deleteProperty.bind(Reflect)
    const deleteSpy = vi.spyOn(Reflect, 'deleteProperty').mockImplementation((target, key) => {
      if (target === Document.prototype && key === 'modelContext') return false
      return origDelete(target, key)
    })

    try {
      try {
        delete (document as Document & ModelContextHost).modelContext
      } catch {
        /* ignore */
      }

      initializeBuiltinWebMCP()

      const ctx = (document as Document & ModelContextHost).modelContext as {
        [key: string]: unknown
        registerTool: (tool: Record<string, unknown>) => Promise<unknown>
        getTools: () => Promise<Array<{ name: string }>>
      }
      expect(ctx).toBeTruthy()
      expect(ctx[POLYFILL_MARKER]).toBe(true)
      expect(ctx).not.toBe(native)

      const toolName = `probe-chrome146-${Date.now()}`
      await expect(
        ctx.registerTool({
          name: toolName,
          description: 'probe chrome 146 native override',
          inputSchema: { type: 'object', properties: {} },
          execute: async () => ({ ok: true })
        })
      ).resolves.toBeUndefined()

      const tools = await ctx.getTools()
      expect(tools.some((tool) => tool.name === toolName)).toBe(true)
      expect(native.registerTool).not.toHaveBeenCalled()
      expect(native.getTools).not.toHaveBeenCalled()
    } finally {
      deleteSpy.mockRestore()
      restoreOriginAgentCluster(previousOac)
      try {
        if (previousNav) Object.defineProperty(navigator, 'modelContext', previousNav)
        else delete (navigator as Navigator & ModelContextHost).modelContext
      } catch {
        /* ignore */
      }
      if (previousDoc) {
        Object.defineProperty(Document.prototype, 'modelContext', previousDoc)
      } else {
        origDelete(Document.prototype, 'modelContext')
      }
    }
  })

  it('复现：初始化失败时恢复被删除的 navigator 与原型 getter —— 前置 navigator 和 Navigator.prototype 挂有可配置 getter，初始化步骤抛错；步骤 initializeBuiltinWebMCP()；期望警告被捕获且两处描述符与初始化前完全一致', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const navGetter = () => ({ fake: 'nav' })
    const protoGetter = () => ({ fake: 'proto' })

    const prevNavDesc = Object.getOwnPropertyDescriptor(navigator, 'modelContext')
    const prevProtoDesc = Object.getOwnPropertyDescriptor(Navigator.prototype, 'modelContext')

    Object.defineProperty(navigator, 'modelContext', {
      configurable: true,
      enumerable: true,
      get: navGetter
    })
    Object.defineProperty(Navigator.prototype, 'modelContext', {
      configurable: true,
      enumerable: true,
      get: protoGetter
    })

    const origGetDesc = Object.getOwnPropertyDescriptor
    const spy = vi.spyOn(Object, 'getOwnPropertyDescriptor').mockImplementation((target, prop) => {
      if (target === Document.prototype && prop === 'modelContext') {
        throw new Error('mock initialization failure')
      }
      return origGetDesc(target, prop)
    })

    try {
      initializeBuiltinWebMCP()

      expect(
        warnSpy.mock.calls.some(([msg]) => String(msg).includes('自动注入 modelContext polyfill 失败'))
      ).toBe(true)

      const curNavDesc = Object.getOwnPropertyDescriptor(navigator, 'modelContext')
      const curProtoDesc = Object.getOwnPropertyDescriptor(Navigator.prototype, 'modelContext')

      expect(curNavDesc?.get).toBe(navGetter)
      expect(curNavDesc?.configurable).toBe(true)
      expect(curProtoDesc?.get).toBe(protoGetter)
      expect(curProtoDesc?.configurable).toBe(true)
    } finally {
      spy.mockRestore()
      warnSpy.mockRestore()
      if (prevNavDesc) Object.defineProperty(navigator, 'modelContext', prevNavDesc)
      else delete (navigator as Navigator & ModelContextHost).modelContext
      if (prevProtoDesc) Object.defineProperty(Navigator.prototype, 'modelContext', prevProtoDesc)
      else delete (Navigator.prototype as ModelContextHost).modelContext
    }
  })

  it('复现：document.modelContext 为抛出异常的 Proxy 时幂等检查不崩溃 —— 前置 document.modelContext 为 has trap 抛错的 Proxy；步骤 initializeBuiltinWebMCP()；期望正常捕获处理不抛向外部调用方', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const previousDoc = Object.getOwnPropertyDescriptor(document, 'modelContext')

    const buggyProxy = new Proxy({}, {
      has(_target, prop) {
        if (prop === POLYFILL_MARKER) {
          throw new Error('simulated proxy has trap failure')
        }
        return false
      }
    })

    Object.defineProperty(document, 'modelContext', {
      configurable: true,
      enumerable: true,
      value: buggyProxy
    })

    try {
      expect(() => {
        initializeBuiltinWebMCP()
      }).not.toThrow()
    } finally {
      warnSpy.mockRestore()
      if (previousDoc) Object.defineProperty(document, 'modelContext', previousDoc)
      else delete (document as Document & ModelContextHost).modelContext
    }
  })
})
