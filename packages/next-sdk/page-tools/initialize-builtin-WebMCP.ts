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
   * SDK 会先摘掉 document（含可配置原型）上的 native，再安装 JS polyfill。
   * 仅在确认原生实现可用时设为 `false`。
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

/** 供同包 registerPageAgentTool 判断是否已挂上 JS polyfill，避免调用 Chrome 146+ 原生 registerTool */
export function isBuiltinWebMCPPolyfill(value: unknown): boolean {
  return isWebMCPPolyfill(value)
}

function readModelContext(target: ModelContextHost): unknown {
  try {
    return target.modelContext
  } catch {
    return undefined
  }
}

function readDescriptorValue(desc: PropertyDescriptor, receiver: object): unknown {
  try {
    if (typeof desc.get === 'function') return desc.get.call(receiver)
    return desc.value
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

/**
 * 摘掉 host 上的 native `modelContext`：可配置的原型属性直接删除；
 * 否则实例影子化为 undefined，避免 polyfill `if (doc.modelContext) return` 提前退出，
 * 也避免 5.x 把 `navigator.modelContext` native 接回 document。
 */
function neutralizeNativeModelContextHost(target: object, prototype: object | null): void {
  const host = target as ModelContextHost
  if (isWebMCPPolyfill(readModelContext(host))) return

  if (prototype) {
    const protoDesc = Object.getOwnPropertyDescriptor(prototype, 'modelContext')
    if (protoDesc?.configurable) {
      const protoValue = readDescriptorValue(protoDesc, target)
      if (protoValue && !isWebMCPPolyfill(protoValue)) {
        Reflect.deleteProperty(prototype, 'modelContext')
      }
    }
  }

  const current = readModelContext(host)
  if (current && !isWebMCPPolyfill(current)) {
    defineModelContext(target, undefined)
  }
}

function neutralizeNativeDocumentModelContext(): void {
  const doc = typeof document !== 'undefined' ? (document as Document & ModelContextHost) : null
  if (!doc) return
  neutralizeNativeModelContextHost(doc, Document.prototype)
}

function neutralizeNativeNavigatorModelContext(): void {
  const nav = typeof navigator !== 'undefined' ? (navigator as Navigator & ModelContextHost) : null
  if (!nav) return
  const desc = Object.getOwnPropertyDescriptor(nav, 'modelContext')
  if (desc && 'value' in desc && desc.value && !isWebMCPPolyfill(desc.value)) {
    try {
      delete (nav as ModelContextHost).modelContext
    } catch {
      defineModelContext(nav, undefined)
    }
  }
  const proto = typeof Navigator !== 'undefined' ? Navigator.prototype : null
  if (proto) {
    const protoDesc = Object.getOwnPropertyDescriptor(proto, 'modelContext')
    if (protoDesc?.configurable && 'value' in protoDesc && protoDesc.value && !isWebMCPPolyfill(protoDesc.value)) {
      Reflect.deleteProperty(proto, 'modelContext')
    }
  }
}

/**
 * 初始化后让 `document.modelContext` 读到 JS polyfill。
 *
 * Chrome 146+ WebIDL 把 native getter 放在 `Document.prototype` 且通常不可配置：
 * 5.x 只会写入 WeakMap、不会替换原型 getter；删掉实例上的 undefined 影子后会重新暴露 native。
 * 此时把 navigator 上已装好的 polyfill 挂到 document 实例，盖住 native。
 * 挂不上则继续影子化 undefined，禁止走到会抛 DOMException / 杀进程的原生 registerTool。
 */
function attachPolyfillOntoDocument(): void {
  const doc = typeof document !== 'undefined' ? (document as Document & ModelContextHost) : null
  if (!doc) return
  if (isWebMCPPolyfill(readModelContext(doc))) return

  if (Object.prototype.hasOwnProperty.call(doc, 'modelContext')) {
    try {
      delete doc.modelContext
    } catch {
      /* ignore */
    }
  }

  if (isWebMCPPolyfill(readModelContext(doc))) return

  const nav = typeof navigator !== 'undefined' ? (navigator as Navigator & ModelContextHost) : null
  const navCtx = nav ? readModelContext(nav) : undefined
  if (isWebMCPPolyfill(navCtx)) {
    defineModelContext(doc, navCtx)
    return
  }

  const current = readModelContext(doc)
  if (current && !isWebMCPPolyfill(current)) {
    defineModelContext(doc, undefined)
  }
}

/**
 * `@mcp-b/webmcp-polyfill` 在 `window.originAgentCluster === false` 时对 registerTool/getTools
 * 抛出空消息 `SecurityError`。原生 WebMCP 需要 origin-keyed agent cluster；JS polyfill 只维护
 * 页内注册表，不依赖该隔离。Windows 企业策略（OriginAgentClusterDefaultEnabled=false）、
 * `Origin-Agent-Cluster: ?0` 或仍设置 `document.domain` 的站点会踩中，表现为
 * `[next-sdk] page-agent-tool 注册失败: SecurityError`。
 *
 * 仅包装 polyfill 实例方法：调用期间影子化该属性，不改页面真实隔离，也不包装 native。
 */
const ORIGIN_AGENT_CLUSTER_BYPASS = '__nextSdkOriginAgentClusterBypass'

type PolyfillToolContext = {
  registerTool?: (...args: unknown[]) => unknown
  getTools?: (...args: unknown[]) => unknown
  executeTool?: (...args: unknown[]) => unknown
}

function withOriginAgentClusterBypass<T>(fn: () => T): T {
  if (globalThis.originAgentCluster !== false) return fn()

  const host = globalThis as typeof globalThis & { originAgentCluster?: boolean }
  const previous = Object.getOwnPropertyDescriptor(host, 'originAgentCluster')
  try {
    Object.defineProperty(host, 'originAgentCluster', {
      configurable: true,
      enumerable: true,
      get: () => true
    })
  } catch {
    return fn()
  }

  try {
    return fn()
  } finally {
    try {
      if (previous) Object.defineProperty(host, 'originAgentCluster', previous)
      else Reflect.deleteProperty(host, 'originAgentCluster')
    } catch {
      /* ignore */
    }
  }
}

function wrapPolyfillToBypassOriginAgentCluster(ctx: unknown): void {
  if (!ctx || typeof ctx !== 'object' || ORIGIN_AGENT_CLUSTER_BYPASS in ctx) return

  const target = ctx as PolyfillToolContext & Record<string, unknown>
  Object.defineProperty(target, ORIGIN_AGENT_CLUSTER_BYPASS, {
    value: true,
    enumerable: false,
    configurable: true
  })

  for (const key of ['registerTool', 'getTools', 'executeTool'] as const) {
    const original = target[key]
    if (typeof original !== 'function') continue
    const bound = original.bind(target)
    target[key] = (...args: unknown[]) => withOriginAgentClusterBypass(() => bound(...args))
  }
}

function wrapInstalledPolyfillIfPresent(): void {
  const ctx = readModelContext(document as Document & ModelContextHost)
  if (isWebMCPPolyfill(ctx)) wrapPolyfillToBypassOriginAgentCluster(ctx)
}

export const initializeBuiltinWebMCP = (options?: InitializeBuiltinWebMCPOptions) => {
  if (!isBrowser()) return

  const forcePolyfill = options?.forcePolyfill !== false

  try {
    if (!forcePolyfill) {
      initializeWebMCPPolyfill()
      wrapInstalledPolyfillIfPresent()
      return
    }

    neutralizeNativeDocumentModelContext()
    neutralizeNativeNavigatorModelContext()
    initializeWebMCPPolyfill()
    attachPolyfillOntoDocument()

    const ctx = readModelContext(document as Document & ModelContextHost)
    if (!isWebMCPPolyfill(ctx)) {
      console.warn(
        '[next-sdk] 未能覆盖原生 document.modelContext，getTools/registerTool 可能触发 Chromium 渲染进程崩溃或 DOMException'
      )
    } else {
      wrapPolyfillToBypassOriginAgentCluster(ctx)
    }
  } catch (err) {
    console.warn('[next-sdk] 自动注入 modelContext polyfill 失败:', err)
  }
}
