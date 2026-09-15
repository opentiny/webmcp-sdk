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
  // 清掉实例属性，避免用例互相污染；原型上若仍有 getter 则交回 polyfill / jsdom 默认
  try {
    delete (document as Document & ModelContextHost).modelContext
  } catch {
    /* ignore */
  }
  try {
    delete (navigator as Navigator & ModelContextHost).modelContext
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

  it('已是 polyfill 时再次初始化仍保留 marker，不拆掉 JS context', () => {
    initializeBuiltinWebMCP()
    const first = (document as Document & ModelContextHost).modelContext
    expect((first as Record<string, unknown>)[POLYFILL_MARKER]).toBe(true)

    initializeBuiltinWebMCP()
    const second = (document as Document & ModelContextHost).modelContext
    expect(second).toBe(first)
    expect((second as Record<string, unknown>)[POLYFILL_MARKER]).toBe(true)
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

  it('复现：Chromium 146 原型 native 删不掉时桥接 polyfill 触发 navigator.modelContext 废弃警告 —— 前置 Document.prototype.modelContext 不可删除；步骤 initializeBuiltinWebMCP；期望顺利覆盖且不向控制台打印 navigator.modelContext 废弃警告', async () => {
    const native = {
      getTools: vi.fn(),
      registerTool: vi.fn(),
      executeTool: vi.fn()
    }
    const previousDoc = Object.getOwnPropertyDescriptor(Document.prototype, 'modelContext')
    const previousNav = Object.getOwnPropertyDescriptor(navigator, 'modelContext')

    Object.defineProperty(Document.prototype, 'modelContext', {
      configurable: true,
      enumerable: true,
      get() {
        return native
      }
    })
    const origDelete = Reflect.deleteProperty.bind(Reflect)
    const deleteSpy = vi.spyOn(Reflect, 'deleteProperty').mockImplementation((target, key) => {
      if (target === Document.prototype && key === 'modelContext') return false
      return origDelete(target, key)
    })

    const warnSpy = vi.spyOn(console, 'warn')

    try {
      initializeBuiltinWebMCP()

      const ctx = (document as Document & ModelContextHost).modelContext as Record<string, unknown>
      expect(ctx).toBeTruthy()
      expect(ctx[POLYFILL_MARKER]).toBe(true)

      const deprecationWarnCalls = warnSpy.mock.calls.filter((args) =>
        typeof args[0] === 'string' && args[0].includes('[WebMCPPolyfill] navigator.modelContext is deprecated')
      )
      expect(deprecationWarnCalls).toHaveLength(0)
    } finally {
      warnSpy.mockRestore()
      deleteSpy.mockRestore()
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
})
