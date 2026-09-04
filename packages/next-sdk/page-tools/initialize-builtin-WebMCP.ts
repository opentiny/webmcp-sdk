import { initializeWebMCPPolyfill } from '@mcp-b/webmcp-polyfill'
import { isBrowser } from '../utils/env'

/** `@mcp-b/webmcp-polyfill` 在 StrictWebMCPContext 上打的标记 */
const POLYFILL_MARKER = '__isWebMCPPolyfill'

interface InitializeBuiltinWebMCPOptions {
  /**
   * 强制安装 JS polyfill，覆盖 Chromium 实验性原生 `document.modelContext`。
   * 原生 `getTools()` / `registerTool()` 在部分 Chrome Origin Trial 版本会通过
   * Mojo IPC 触发 `RESULT_CODE_KILLED_BAD_MESSAGE` 杀掉渲染进程。
   *
   * `@mcp-b/webmcp-polyfill` 见 native 即 no-op，且已删除 `forceOverride`。
   * 5.x 把 getter 装在 `Document.prototype`：若原型已有 native，polyfill 不会替换它。
   * SDK 会先影子化 native，再在 document 实例上挂上 JS polyfill。仅在确认原生实现可用时设为 `false`。
   *
   * @default true
   */
  forcePolyfill?: boolean
}

type ModelContextHost = {
  modelContext?: unknown
}

function isWebMCPPolyfill(value: unknown): boolean {
  return Boolean(value && typeof value === 'object' && POLYFILL_MARKER in value && (value as Record<string, unknown>)[POLYFILL_MARKER])
}

function readModelContext(target: ModelContextHost): unknown {
  try {
    return target.modelContext
  } catch {
    return undefined
  }
}

function defineModelContext(target: object, value: unknown): boolean {
  try {
    Object.defineProperty(target, 'modelContext', {
      value,
      configurable: true,
      writable: true,
      enumerable: true
    })
    return true
  } catch {
    try {
      if (value === undefined) {
        delete (target as ModelContextHost).modelContext
        return true
      }
      ;(target as ModelContextHost).modelContext = value
      return true
    } catch {
      return false
    }
  }
}

/** 将 document 上的 native modelContext 影子化为 undefined，促使 polyfill 安装 */
function neutralizeNativeDocumentModelContext(): void {
  const doc = typeof document !== 'undefined' ? (document as Document & ModelContextHost) : null
  if (!doc) return
  const current = readModelContext(doc)
  if (!current || isWebMCPPolyfill(current)) return
  defineModelContext(doc, undefined)
}

/**
 * 5.x 在 Document.prototype 已有 native getter 时只把 JS context 写入内部 WeakMap，
 * 页面读到的仍是 native / undefined。拦截这次写入，把同一实例挂到 document 上。
 */
function initializePolyfillAndCaptureDocumentContext(): unknown {
  const doc = typeof document !== 'undefined' ? document : null
  let captured: unknown
  const originalSet = WeakMap.prototype.set
  let patched = false
  try {
    WeakMap.prototype.set = function (this: WeakMap<object, unknown>, key: object, value: unknown) {
      if (doc && key === doc && isWebMCPPolyfill(value)) {
        captured = value
      }
      return originalSet.call(this, key, value)
    }
    patched = true
  } catch {
    /* WeakMap.prototype 不可写时直接初始化 */
  }

  try {
    initializeWebMCPPolyfill()
  } finally {
    if (patched) {
      try {
        WeakMap.prototype.set = originalSet
      } catch {
        /* ignore */
      }
    }
  }

  return captured
}

function adoptPolyfillOntoDocument(captured: unknown): void {
  const doc = typeof document !== 'undefined' ? (document as Document & ModelContextHost) : null
  if (!doc) return
  if (isWebMCPPolyfill(readModelContext(doc))) return
  if (!isWebMCPPolyfill(captured)) return
  defineModelContext(doc, captured)
}

export const initializeBuiltinWebMCP = (options?: InitializeBuiltinWebMCPOptions) => {
  if (!isBrowser()) return

  const forcePolyfill = options?.forcePolyfill !== false

  try {
    if (!forcePolyfill) {
      initializeWebMCPPolyfill()
      return
    }

    neutralizeNativeDocumentModelContext()
    const captured = initializePolyfillAndCaptureDocumentContext()
    adoptPolyfillOntoDocument(captured)

    const ctx = readModelContext(document as Document & ModelContextHost)
    if (!isWebMCPPolyfill(ctx)) {
      console.warn(
        '[next-sdk] 未能覆盖原生 document.modelContext，getTools/registerTool 可能触发 Chromium 渲染进程崩溃'
      )
    }
  } catch (err) {
    console.warn('[next-sdk] 自动注入 modelContext polyfill 失败:', err)
  }
}
