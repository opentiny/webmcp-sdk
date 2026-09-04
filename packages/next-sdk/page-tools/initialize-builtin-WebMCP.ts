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
   * SDK 会先影子化 native，再在实例上挂上 JS polyfill。仅在确认原生实现可用时设为 `false`。
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

/** 将 host 上的 native modelContext 影子化为 undefined，促使 polyfill 安装 */
function shadowModelContextIfNative(target: ModelContextHost | null | undefined): void {
  if (!target) return
  const current = readModelContext(target)
  if (!current || isWebMCPPolyfill(current)) return
  defineModelContext(target, undefined)
}

function neutralizeNativeModelContext(): void {
  const doc = typeof document !== 'undefined' ? (document as Document & ModelContextHost) : null
  const nav = typeof navigator !== 'undefined' ? (navigator as Navigator & ModelContextHost) : null
  // 必须同时处理两个挂载点：polyfill 在 document 为空但 navigator 有 native 时会把 native 写回 document
  shadowModelContextIfNative(doc)
  shadowModelContextIfNative(nav)
}

/**
 * 5.x 在 Document.prototype 已有 native getter 时只写入内部 WeakMap，JS 仍读到 native / undefined。
 * 此时 polyfill 会挂在 navigator.modelContext，再把它盖到 document 实例上。
 */
function adoptPolyfillOntoDocument(): void {
  const doc = typeof document !== 'undefined' ? (document as Document & ModelContextHost) : null
  const nav = typeof navigator !== 'undefined' ? (navigator as Navigator & ModelContextHost) : null
  if (!doc) return
  if (isWebMCPPolyfill(readModelContext(doc))) return
  const navCtx = nav ? readModelContext(nav) : undefined
  if (!isWebMCPPolyfill(navCtx)) return
  defineModelContext(doc, navCtx)
}

export const initializeBuiltinWebMCP = (options?: InitializeBuiltinWebMCPOptions) => {
  if (!isBrowser()) return

  const forcePolyfill = options?.forcePolyfill !== false

  try {
    if (forcePolyfill) {
      neutralizeNativeModelContext()
    }

    initializeWebMCPPolyfill()

    if (forcePolyfill) {
      adoptPolyfillOntoDocument()
      const ctx = readModelContext(document as Document & ModelContextHost)
      if (!isWebMCPPolyfill(ctx)) {
        console.warn(
          '[next-sdk] 未能覆盖原生 document.modelContext，getTools/registerTool 可能触发 Chromium 渲染进程崩溃'
        )
      }
    }
  } catch (err) {
    console.warn('[next-sdk] 自动注入 modelContext polyfill 失败:', err)
  }
}
