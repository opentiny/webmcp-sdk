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

  it('复现：只摘掉 document.modelContext 时 polyfill 会把 navigator 上的 native 接回 document —— 前置仅 navigator 有伪 native；步骤初始化；期望 document 上是 polyfill 而非该 native', () => {
    try {
      delete (document as Document & ModelContextHost).modelContext
    } catch {
      /* ignore */
    }
    const native = installFakeNative(navigator, 'navigator')

    initializeBuiltinWebMCP()

    const docCtx = (document as Document & ModelContextHost).modelContext as Record<string, unknown>
    const navCtx = (navigator as Navigator & ModelContextHost).modelContext as Record<string, unknown>
    expect(docCtx).toBeTruthy()
    expect(docCtx[POLYFILL_MARKER]).toBe(true)
    expect(docCtx).not.toBe(native)
    expect(navCtx).not.toBe(native)
    expect(native.getTools).not.toHaveBeenCalled()
  })

  it('复现：需要验证原生 API 时关闭强制 polyfill —— 前置 document 上伪 native；步骤 initializeBuiltinWebMCP({ forcePolyfill: false })；期望保留该 native', () => {
    const native = installFakeNative(document, 'opt-out')

    initializeBuiltinWebMCP({ forcePolyfill: false })

    const ctx = (document as Document & ModelContextHost).modelContext
    expect(ctx).toBe(native)
    expect((ctx as Record<string, unknown>)[POLYFILL_MARKER]).toBeUndefined()
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
})
