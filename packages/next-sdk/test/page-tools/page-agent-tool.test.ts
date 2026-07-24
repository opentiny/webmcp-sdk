import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// jsdom 无 WebGL2，避免 SimulatorMask → ai-motion 初始化刷 stderr
// show/hide 委托到模块级 spy，便于在句柄测试中断言 pageController.showMask/hideMask 是否触达 mask
const maskSpies = vi.hoisted(() => ({ show: vi.fn(), hide: vi.fn() }))
vi.mock('../../page-tools/page-agent-mask/SimulatorMask', () => ({
  SimulatorMask: class SimulatorMask {
    show() {
      maskSpies.show()
    }
    hide() {
      maskSpies.hide()
    }
    dispose() {}
  },
}))

import { registerPageAgentTool } from '../../page-tools/page-agent-tool'
import { PAGE_AGENT_CHAT_END_EVENT } from '../../page-tools/page-agent-tool-event'
import { getPageAgentToolConfig, setPageAgentToolConfig } from '../../page-tools/tool-config'

function resetWindowGlobals() {
  delete window.__webmcpcli_toolConfig
  delete window.__webmcpcli_beforeGetBrowserState
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
