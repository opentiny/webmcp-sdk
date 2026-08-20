import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setupLocalTools } from '../entrypoints/sidepanel/mcpServer'
import { useExtraTools } from '../entrypoints/sidepanel/extraTools'

vi.mock('../entrypoints/sidepanel/extraTools', () => ({
  useExtraTools: vi.fn()
}))
vi.mock('../entrypoints/sidepanel/utils/utils', () => ({
  getCurrentTabId: vi.fn().mockResolvedValue(1)
}))

// Mock wxt browser global
global.browser = {
  tabs: {
    get: vi.fn().mockResolvedValue({ url: 'http://example.com' }),
    onActivated: { addListener: vi.fn() },
    onUpdated: { addListener: vi.fn() }
  },
  runtime: {
    sendMessage: vi.fn().mockResolvedValue(undefined),
    onMessage: { addListener: vi.fn() }
  },
  scripting: {
    executeScript: vi.fn().mockResolvedValue([{ result: [] }])
  }
} as any

describe('setupLocalTools - registerTool lifecycle', () => {
  beforeEach(() => {
    delete (globalThis as any).modelContext
    if (typeof document !== 'undefined') {
      delete (document as any).modelContext
    }
  })

  it('复现：同名工具注册冲突及 AbortSignal 处理', () => {
    setupLocalTools()
    const ctx = (globalThis as any).modelContext
    
    // 1. 已中止 signal 不要注册
    const abortedController = new AbortController()
    abortedController.abort(new Error('Already aborted'))
    const toolA = { name: 'test-tool-a', execute: async () => {} }
    
    const promise = ctx.registerTool(toolA, { signal: abortedController.signal })
    await expect(promise).rejects.toThrow('Already aborted')
    expect(ctx._tools.has('test-tool-a')).toBe(false)
    
    // 2. 正常注册并在 abort 时删除
    const controller1 = new AbortController()
    ctx.registerTool(toolA, { signal: controller1.signal })
    expect(ctx._tools.has('test-tool-a')).toBe(true)
    
    // 3. 同名替换抛错
    const toolA_duplicate = { name: 'test-tool-a', execute: async () => {} }
    expect(() => ctx.registerTool(toolA_duplicate)).toThrow('Tool test-tool-a already exists')
    
    // 4. abort 监听器仅当 _tools.get(tool.name) === tool 时删除
    // 这里因为是同一个 tool，会直接删除
    controller1.abort()
    expect(ctx._tools.has('test-tool-a')).toBe(false)
    
    // 验证同名覆盖被保护（强制伪造替换后，再调旧的 abort 不应删除新的）
    const toolB1 = { name: 'test-tool-b' }
    const controllerB1 = new AbortController()
    ctx.registerTool(toolB1, { signal: controllerB1.signal })
    
    const toolB2 = { name: 'test-tool-b' }
    // 强制绕过，直接在 _tools 替换（模拟异常或其它方式插入的同名工具）
    ctx._tools.set('test-tool-b', toolB2)
    
    controllerB1.abort()
    // 新的 toolB2 应被保留，不被删除
    expect(ctx._tools.get('test-tool-b')).toBe(toolB2)
  })
})
