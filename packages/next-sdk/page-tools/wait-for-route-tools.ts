/**
 * 等待指定路由对应的页面工具全部出现在 document.modelContext.getTools() 中。
 * 主信号：toolchange；兜底：短轮询 + 超时。
 * 业务侧自行 registerTool / 导航；本 helper 只负责握手判断。
 */

export type RouteToolsMap = Record<string, string[]>

export type WaitForRouteToolsOptions = {
  /**
   * 等待超时时间（毫秒）。超过后仍未齐备则 reject。
   * @default 5000
   */
  timeoutMs?: number
  /**
   * 轮询间隔（毫秒）：除监听 `toolchange` 外，每隔该间隔主动调用一次 `getTools()` 复查。
   * 用于兜底漏发/晚发的 `toolchange`，或工具已就绪但未触发事件的竞态。
   * @default 100
   */
  pollMs?: number
}

type ModelContextLike = {
  getTools?: () => Promise<Array<{ name: string }>> | Array<{ name: string }>
  addEventListener?: (type: 'toolchange', listener: () => void) => void
  removeEventListener?: (type: 'toolchange', listener: () => void) => void
}

function getModelContext(): ModelContextLike | null {
  if (typeof document === 'undefined') return null
  return (document as unknown as { modelContext?: ModelContextLike }).modelContext ?? null
}

function normalizePath(path: string): string {
  return path.replace(/\/+$/, '') || '/'
}

/**
 * 判断路由 path 在 routeToolsMap 中声明的工具是否已全部加载完成。
 * - map 无该 path（或工具列表为空）时立即返回
 * - 超时未齐备则 reject
 */
export async function waitForRouteTools(
  path: string,
  routeToolsMap: RouteToolsMap,
  options?: WaitForRouteToolsOptions
): Promise<void> {
  const timeoutMs = options?.timeoutMs ?? 5000
  const pollMs = options?.pollMs ?? 100
  const normalized = normalizePath(path)
  const expectedToolNames = routeToolsMap[normalized]
  const expected = Array.isArray(expectedToolNames) ? expectedToolNames : []

  if (expected.length === 0) return

  const ctx = getModelContext()
  if (!ctx?.getTools) {
    throw new Error('modelContext.getTools 不可用，请先 initializeBuiltinWebMCP()')
  }

  const listNames = async () =>
    ((await ctx.getTools!()) as Array<{ name: string }>).map((t) => t.name)

  const ready = (names: string[]) => expected.every((n) => names.includes(n))

  await new Promise<void>((resolve, reject) => {
    let settled = false
    const cleanup = () => {
      if (settled) return
      settled = true
      clearInterval(poll)
      clearTimeout(timer)
      ctx.removeEventListener?.('toolchange', onChange)
    }
    const check = async () => {
      try {
        if (ready(await listNames())) {
          cleanup()
          resolve()
        }
      } catch {
        // getTools 瞬时失败时继续等待，由超时兜底
      }
    }
    const onChange = () => void check()
    ctx.addEventListener?.('toolchange', onChange)
    const poll = setInterval(() => void check(), pollMs)
    const timer = setTimeout(() => {
      cleanup()
      reject(new Error(`等待页面工具超时: ${expected.join(', ')}`))
    }, timeoutMs)

    void check()
  })
}
