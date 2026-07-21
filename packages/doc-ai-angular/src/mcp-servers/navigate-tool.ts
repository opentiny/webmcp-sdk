/**
 * 可复制模版：自配路由跳转工具（Angular + @angular/router）
 *
 * 用法：
 * 1. 按模块维护 routeToolsMap（path → 该页工具名，工具名全局唯一）
 * 2. initializeBuiltinWebMCP() 之后调用 registerNavigateToPageTool(router)
 * 3. 各业务页 ngOnInit 内 registerTool，工具名与 map 对齐；ngOnDestroy abort
 */
import type { Router } from '@angular/router'

/** 路由 → 该页必须就绪的工具名（按模块命名，全局唯一） */
export const routeToolsMap: Record<string, string[]> = {
  '/orders': ['order_query', 'order_detail'],
  '/finance': ['finance_summary_query'],
  '/inventory': ['add_inventory'],
  '/sales': ['sales_record_query'],
  '/price-protection': [
    'price-protection-query',
    'price-protection-review',
    'price-protection-detail',
    'add_price_protection'
  ]
}

function normalizePath(path: string): string {
  return path.replace(/\/+$/, '') || '/'
}

/**
 * 等待目标页工具全部出现在 modelContext.getTools() 中。
 * 主信号：toolchange；兜底：短轮询 + 超时。
 */
export async function waitForRouteTools(
  expectedToolNames: string[],
  options?: { timeoutMs?: number; pollMs?: number }
): Promise<void> {
  const timeoutMs = options?.timeoutMs ?? 5000
  const pollMs = options?.pollMs ?? 100
  const ctx = (document as any).modelContext
  if (!ctx?.getTools) throw new Error('modelContext.getTools 不可用，请先 initializeBuiltinWebMCP()')

  if (expectedToolNames.length === 0) return

  const listNames = async () =>
    ((await ctx.getTools()) as Array<{ name: string }>).map((t) => t.name)

  const ready = (names: string[]) => expectedToolNames.every((n) => names.includes(n))

  if (ready(await listNames())) return

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
      reject(new Error(`等待页面工具超时: ${expectedToolNames.join(', ')}`))
    }, timeoutMs)
  })
}

/** 注册 navigate_to_page，供大模型主动跳转并握手等待页面工具就绪 */
export function registerNavigateToPageTool(router: Router): void {
  const modelContext = (document as any).modelContext || (navigator as any).modelContext
  if (!modelContext?.registerTool) {
    throw new Error('modelContext 不可用，请先 initializeBuiltinWebMCP()')
  }

  modelContext.registerTool({
    name: 'navigate_to_page',
    title: '页面跳转',
    description:
      '当需要的工具在当前页面不可用时，使用此工具跳转到特定页面。例如：查询订单跳转到 "/orders"，查询财务跳转到 "/finance"。',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: '目标页面路由，例如 "/orders"、"/inventory"、"/finance"'
        }
      },
      required: ['path']
    },
    execute: async ({ path }: { path: string }) => {
      const normalized = normalizePath(path)
      const expected = routeToolsMap[normalized]
      const hasMap = Array.isArray(expected)

      const navigated = await router.navigateByUrl(normalized)
      if (!navigated) {
        throw new Error(`页面跳转失败：导航至 "${normalized}" 被取消或拦截`)
      }

      await waitForRouteTools(hasMap ? expected : [], { timeoutMs: 5000, pollMs: 100 })

      const hint = hasMap
        ? '页面工具已就绪，请继续下一步操作。'
        : '该路由未配置工具清单（routeToolsMap），仅完成路由跳转。'
      return {
        content: [{ type: 'text', text: `已跳转至页面：${normalized}。${hint}` }]
      }
    }
  })
}
