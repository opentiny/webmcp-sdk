import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { waitForRouteTools } from '../../page-tools/wait-for-route-tools'

type Tool = { name: string }

function createMockModelContext(initialTools: Tool[] = []) {
  let tools = [...initialTools]
  const listeners = new Set<() => void>()

  const ctx = {
    getTools: vi.fn(async () => [...tools]),
    addEventListener: vi.fn((type: string, listener: () => void) => {
      if (type === 'toolchange') listeners.add(listener)
    }),
    removeEventListener: vi.fn((type: string, listener: () => void) => {
      if (type === 'toolchange') listeners.delete(listener)
    }),
    setTools(next: Tool[]) {
      tools = [...next]
      listeners.forEach((l) => l())
    }
  }

  return ctx
}

const routeToolsMap = {
  '/finance': ['finance_summary_query'],
  '/orders': ['order_query', 'order_detail']
}

describe('waitForRouteTools', () => {
  let ctx: ReturnType<typeof createMockModelContext>

  beforeEach(() => {
    ctx = createMockModelContext()
    Object.defineProperty(document, 'modelContext', {
      configurable: true,
      writable: true,
      value: ctx
    })
  })

  afterEach(() => {
    delete (document as unknown as { modelContext?: unknown }).modelContext
  })

  it('期望工具已齐备时立即 resolve', async () => {
    ctx.setTools([{ name: 'finance_summary_query' }])
    await expect(
      waitForRouteTools('/finance/', routeToolsMap, { timeoutMs: 1000, pollMs: 50 })
    ).resolves.toBeUndefined()
  })

  it('map 无该 path 时立即返回', async () => {
    await expect(waitForRouteTools('/unknown', routeToolsMap, { timeoutMs: 100 })).resolves.toBeUndefined()
    expect(ctx.getTools).not.toHaveBeenCalled()
  })

  it('延迟 toolchange 后齐备则 resolve', async () => {
    const pending = waitForRouteTools('/finance', routeToolsMap, { timeoutMs: 2000, pollMs: 20 })
    setTimeout(() => {
      ctx.setTools([{ name: 'finance_summary_query' }])
    }, 30)
    await expect(pending).resolves.toBeUndefined()
  })

  it('getTools 瞬时失败后仍可由后续成功握手', async () => {
    let calls = 0
    ctx.getTools = vi.fn(async () => {
      calls += 1
      if (calls === 1) throw new Error('transient')
      return [{ name: 'order_query' }, { name: 'order_detail' }]
    })
    await expect(
      waitForRouteTools('/orders', routeToolsMap, { timeoutMs: 1000, pollMs: 20 })
    ).resolves.toBeUndefined()
  })

  it('超时未齐备则 reject，文案含工具名', async () => {
    await expect(
      waitForRouteTools('/finance', routeToolsMap, { timeoutMs: 80, pollMs: 20 })
    ).rejects.toThrow(/等待页面工具超时: finance_summary_query/)
  })

  it('modelContext 不可用时抛错', async () => {
    delete (document as unknown as { modelContext?: unknown }).modelContext
    await expect(waitForRouteTools('/finance', routeToolsMap)).rejects.toThrow(/modelContext\.getTools 不可用/)
  })
})
