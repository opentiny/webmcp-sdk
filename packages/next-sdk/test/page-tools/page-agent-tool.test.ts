import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// jsdom 无 WebGL2，避免 SimulatorMask → ai-motion 初始化刷 stderr
// show/hide 委托到模块级 spy，便于在句柄测试中断言 pageController.showMask/hideMask 是否触达 mask
const maskSpies = vi.hoisted(() => ({ show: vi.fn(), hide: vi.fn() }))
vi.mock('../../page-tools/page-agent-mask/SimulatorMask', () => ({
  SimulatorMask: class SimulatorMask {
    shown = false
    show(options?: { showCursor?: boolean }) {
      this.shown = true
      maskSpies.show(options)
    }
    hide() {
      this.shown = false
      maskSpies.hide()
    }
    dispose() {}
    removeBorderElement() {}
    borderElement() {}
    setCursorPosition() {}
  },
}))

import { registerPageAgentTool } from '../../page-tools/page-agent-tool'
import { PAGE_AGENT_CHAT_END_EVENT } from '../../page-tools/page-agent-tool-event'
import { getPageAgentToolConfig, setPageAgentToolConfig } from '../../page-tools/tool-config'
import { handleClipboard } from '../../page-tools/handlers/clipboard'

vi.mock('../../page-tools/handlers/clipboard', () => ({
  handleClipboard: vi.fn()
}))

function resetWindowGlobals() {
  delete window.__webmcpcli_toolConfig
  delete window.__webmcpcli_beforeGetBrowserState
  if ((window as any).__pageAgentToolAbortController) {
    ;(window as any).__pageAgentToolAbortController.abort()
    delete (window as any).__pageAgentToolAbortController
  }
  // 注意：initializeBuiltinWebMCP() 内部用模块级单例 flag 控制只初始化一次 document.modelContext，
  // 且没有对外暴露重置能力，因此这里不删除 document.modelContext，避免二次调用时因单例 flag
  // 仍为 true 而不会重新创建 modelContext，导致 registerTool 拿到 undefined
}

beforeEach(() => {
  resetWindowGlobals()
  maskSpies.show.mockClear()
  maskSpies.hide.mockClear()
})

afterEach(() => {
  window.__nextSdkPageAgentToolEventCleanup?.()
  resetWindowGlobals()
})

describe('registerPageAgentTool - 统一无障碍配置接入', () => {
  it('仅传 options.a11yConfig 时，与默认配置合并生效', () => {
    registerPageAgentTool({
      a11yConfig: { roles: [{ role: 'tab', selector: '.tab-item' }] },
    })
    const config = getPageAgentToolConfig().a11yConfig
    expect(config.roles.filter((r) => r.role === 'tab')).toEqual([{ role: 'tab', selector: '.tab-item' }])
    // 默认内置规则仍然存在（不会被覆盖丢失）
    expect(config.states.error?.length).toBeGreaterThan(0)
    expect(window.__webmcpcli_toolConfig?.a11yConfig).toBe(config)
  })

  it('不传 a11yConfig 时，使用默认配置初始化', () => {
    registerPageAgentTool()
    const config = getPageAgentToolConfig().a11yConfig
    // 默认配置现在包含 dialog/tooltip 等 role 规则
    expect(config.roles.length).toBeGreaterThan(0)
    expect(config.states.error?.length).toBeGreaterThan(0)
  })

  it('a11yConfig 中的 whitelist/exposedAttributes 与默认配置合并，互不覆盖', () => {
    registerPageAgentTool({
      a11yConfig: {
        whitelist: ['.new-whitelist'],
        exposedAttributes: ['data-config-attr'],
      },
    })
    const config = getPageAgentToolConfig().a11yConfig
    expect(config.whitelist).toContain('.new-whitelist')
    expect(config.exposedAttributes).toContain('data-config-attr')
  })

  it('重复调用 registerPageAgentTool 以 replace 模式重新初始化，不会无限累加旧配置', () => {
    registerPageAgentTool({ a11yConfig: { roles: [{ role: 'tab', selector: '.v1' }] } })
    registerPageAgentTool({ a11yConfig: { roles: [{ role: 'tab', selector: '.v2' }] } })
    const config = getPageAgentToolConfig().a11yConfig
    // replace 模式后默认 roles（dialog/tooltip）仍保留，用户 roles 被替换为最新
    expect(config.roles.filter((r) => r.role === 'tab')).toEqual([{ role: 'tab', selector: '.v2' }])
  })
})

describe('registerPageAgentTool - 顶层工具配置（PageAgentToolConfig）接入', () => {
  it('不传 enableHighlight 时默认关闭元素高亮', () => {
    registerPageAgentTool()
    expect(getPageAgentToolConfig().enableHighlight).toBe(false)
  })

  it('options.enableHighlight = true 时运行期配置同步生效', () => {
    registerPageAgentTool({ enableHighlight: true })
    expect(getPageAgentToolConfig().enableHighlight).toBe(true)
    expect(window.__webmcpcli_toolConfig?.enableHighlight).toBe(true)
  })

  it('注册后可通过 setPageAgentToolConfig 在运行期动态修改，无需重新 registerPageAgentTool', () => {
    registerPageAgentTool({ enableHighlight: true })
    setPageAgentToolConfig({ enableHighlight: false })
    expect(getPageAgentToolConfig().enableHighlight).toBe(false)
  })

  it('重复调用 registerPageAgentTool 以 replace 模式重新初始化顶层配置', () => {
    registerPageAgentTool({ enableHighlight: false })
    registerPageAgentTool({ enableHighlight: true })
    expect(getPageAgentToolConfig().enableHighlight).toBe(true)
  })

  it('a11yConfig 与顶层配置项互不影响，分别合并生效', () => {
    registerPageAgentTool({
      enableHighlight: false,
      a11yConfig: { roles: [{ role: 'tab', selector: '.tab-item' }] },
    })
    expect(getPageAgentToolConfig().enableHighlight).toBe(false)
    expect(getPageAgentToolConfig().a11yConfig.roles.filter((r) => r.role === 'tab')).toEqual([{ role: 'tab', selector: '.tab-item' }])
  })
})

describe('registerPageAgentTool - mask 显隐句柄', () => {
  it('返回值包含 showMask / hideMask 两个函数', () => {
    const handle = registerPageAgentTool()
    expect(typeof handle.showMask).toBe('function')
    expect(typeof handle.hideMask).toBe('function')
  })

  it('handle.showMask() 触发 SimulatorMask.show，handle.hideMask() 触发 SimulatorMask.hide', async () => {
    const handle = registerPageAgentTool()
    await handle.showMask()
    expect(maskSpies.show).toHaveBeenCalledTimes(1)
    expect(maskSpies.hide).not.toHaveBeenCalled()

    await handle.hideMask()
    expect(maskSpies.hide).toHaveBeenCalledTimes(1)
  })

  it('复现：准备中就显示鼠标 —— 前置 registerPageAgentTool；步骤 无参 handle.showMask()；期望内部 show({ showCursor: false }) 仅呼吸灯', async () => {
    const handle = registerPageAgentTool()
    await handle.showMask()
    expect(maskSpies.show).toHaveBeenCalledWith({ showCursor: false })
  })

  it('复现：宿主无法声明只要呼吸灯 —— 步骤 handle.showMask({ showCursor: true })；期望透传到 SimulatorMask.show', async () => {
    const handle = registerPageAgentTool()
    await handle.showMask({ showCursor: true })
    expect(maskSpies.show).toHaveBeenCalledWith({ showCursor: true })
  })

  it('handle.showMask() 在 cursorMode=never 时忽略显式 showCursor: true', async () => {
    const handle = registerPageAgentTool({ cursorMode: 'never' })
    await handle.showMask({ showCursor: true })
    expect(maskSpies.show).toHaveBeenCalledWith({ showCursor: false })
  })

  it('cursorMode=always 时显式 showCursor: false 仍可临时隐藏光标', async () => {
    const handle = registerPageAgentTool({ cursorMode: 'always' })
    await handle.showMask({ showCursor: false })
    expect(maskSpies.show).toHaveBeenCalledWith({ showCursor: false })
  })

  it('cursorMode=always 时无参 showMask 默认展示光标', async () => {
    const handle = registerPageAgentTool({ cursorMode: 'always' })
    await handle.showMask()
    expect(maskSpies.show).toHaveBeenCalledWith({ showCursor: true })
  })

  it('复现：WXT 聊天结束后呼吸灯与箭头未关闭 —— 前置 registerPageAgentTool 且已 showMask；步骤 dispatch page-agent-chat-end；期望 hideMask 被调用', async () => {
    const handle = registerPageAgentTool()
    await handle.showMask()
    maskSpies.hide.mockClear()

    window.dispatchEvent(new CustomEvent(PAGE_AGENT_CHAT_END_EVENT))

    await vi.waitFor(() => {
      expect(maskSpies.hide).toHaveBeenCalledTimes(1)
    })
  })
})

describe('registerPageAgentTool - 工具注册与注销机制', () => {
  it('复现：executePageAgentTool 中的异步 rejection 应该被外部 catch 捕获并转换为异常内容', async () => {
    let execute: any = null
    const originalRegister = (document as any).modelContext.registerTool
    ;(document as any).modelContext.registerTool = (tool: any, options: any) => {
      if (tool.name === 'page-agent-tool') execute = tool.execute
      originalRegister.call((document as any).modelContext, tool, options)
    }

    registerPageAgentTool()
    ;(document as any).modelContext.registerTool = originalRegister

    expect(execute).toBeDefined()

    vi.mocked(handleClipboard).mockRejectedValueOnce(new Error('Mock clipboard rejection'))

    const result = await execute({ action: 'clipboard', text: 'test' } as any)
    
    expect(result.content).toBeDefined()
    expect(result.content[0].type).toBe('text')
    expect(result.content[0].text).toContain('异常: Error: Mock clipboard rejection')
  })
  it('复现：重复注册时应调用前一次的 AbortController 取消前一个注册', async () => {
    const originalRegister = (document as any).modelContext.registerTool;
    const registerSpy = vi.fn(originalRegister.bind((document as any).modelContext));
    ;(document as any).modelContext.registerTool = registerSpy;

    // 第一次注册
    registerPageAgentTool()
    const firstAbortController = (window as any).__pageAgentToolAbortController
    expect(firstAbortController).toBeDefined()
    
    // 监听第一次注册的 abort 信号
    const abortSpy = vi.fn()
    firstAbortController.signal.addEventListener('abort', abortSpy)

    // 第二次注册
    registerPageAgentTool()
    
    // 验证前一次的 abort 被触发
    expect(abortSpy).toHaveBeenCalledTimes(1)
    
    // 验证控制器已经被替换为新的
    const secondAbortController = (window as any).__pageAgentToolAbortController
    expect(secondAbortController).toBeDefined()
    expect(secondAbortController).not.toBe(firstAbortController)
    
    // 验证 register API 收到 signal
    const firstCallOptions = registerSpy.mock.calls[0][1];
    expect(firstCallOptions?.signal).toBe(firstAbortController.signal);
    const secondCallOptions = registerSpy.mock.calls[1][1];
    expect(secondCallOptions?.signal).toBe(secondAbortController.signal);
    
    // 验证旧工具已被移除 (如果是通过 abort 移除了)
    // 可以尝试从 modelContext.getTools() 取当前注册的工具
    const tools = await (document as any).modelContext.getTools();
    // 实际上由于 registerTool 是同名的，第二次注册可能覆盖或者由于第一次已经 abort，只剩下一个
    expect(tools.filter((t: any) => t.name === 'page-agent-tool').length).toBe(1);
    
    ;(document as any).modelContext.registerTool = originalRegister;
  })
})
