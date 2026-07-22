/**
 * 可复制模版：自配路由跳转工具（Vue + vue-router）
 *
 * 用法：
 * 1. 按模块维护 routeToolsMap（path → 该页工具名，工具名全局唯一）
 * 2. initializeBuiltinWebMCP() 之后调用 registerNavigateToPageTool(router)
 * 3. 各业务页 onMounted 内 registerTool，工具名与 map 对齐；onUnmounted abort
 * 4. 跳转后用 SDK waitForRouteTools(path, routeToolsMap) 握手
 */
import type { Router } from 'vue-router'
import { isNavigationFailure, NavigationFailureType, type NavigationFailure } from 'vue-router'
import { waitForRouteTools, type RouteToolsMap } from '@opentiny/next-sdk'

/** 路由 → 该页必须就绪的工具名（按模块命名，全局唯一） */
export const routeToolsMap: RouteToolsMap = {
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

/** 注册 navigate_to_page，供大模型主动跳转并握手等待页面工具就绪 */
export function registerNavigateToPageTool(router: Router): void {
  const modelContext = (
    document as unknown as { modelContext?: { registerTool?: (tool: Record<string, unknown>) => void } }
  ).modelContext
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
      const hasMap = Array.isArray(routeToolsMap[normalized])

      const failure = await router.push(normalized)
      if (failure) {
        if (isNavigationFailure(failure, NavigationFailureType.duplicated)) {
          // 已在目标页：仍做一次工具就绪检查
        } else {
          throw new Error(`页面跳转失败: ${(failure as NavigationFailure).message}`)
        }
      }

      await waitForRouteTools(normalized, routeToolsMap, { timeoutMs: 5000, pollMs: 100 })

      const hint = hasMap
        ? '页面工具已就绪，请继续下一步操作。'
        : '该路由未配置工具清单（routeToolsMap），仅完成路由跳转。'
      return {
        content: [{ type: 'text', text: `已跳转至页面：${normalized}。${hint}` }]
      }
    }
  })
}
