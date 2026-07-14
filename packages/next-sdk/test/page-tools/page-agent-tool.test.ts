import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { registerPageAgentTool } from '../../page-tools/page-agent-tool'
import { getA11yConfig } from '../../page-tools/a11y/config'

function resetWindowGlobals() {
  delete (window as any).__webmcpcli_a11yConfig
  delete (window as any).__webmcpcli_beforeGetBrowserState
  // 注意：initializeBuiltinWebMCP() 内部用模块级单例 flag 控制只初始化一次 document.modelContext，
  // 且没有对外暴露重置能力，因此这里不删除 document.modelContext，避免二次调用时因单例 flag
  // 仍为 true 而不会重新创建 modelContext，导致 registerTool 拿到 undefined
}

beforeEach(() => {
  resetWindowGlobals()
})

afterEach(() => {
  resetWindowGlobals()
})

describe('registerPageAgentTool - 统一无障碍配置接入', () => {
  it('仅传 options.a11yConfig 时，与默认配置合并生效', () => {
    registerPageAgentTool({
      a11yConfig: { roles: [{ role: 'tab', selector: '.tab-item' }] },
    })
    const config = getA11yConfig()
    expect(config.roles).toEqual([{ role: 'tab', selector: '.tab-item' }])
    // 默认内置规则仍然存在（不会被覆盖丢失）
    expect(config.states.error?.length).toBeGreaterThan(0)
    expect(window.__webmcpcli_a11yConfig).toBe(config)
  })

  it('不传 a11yConfig 时，使用默认配置初始化', () => {
    registerPageAgentTool()
    const config = getA11yConfig()
    expect(config.roles).toEqual([])
    expect(config.states.error?.length).toBeGreaterThan(0)
  })

  it('a11yConfig 中的 whitelist/exposedAttributes 与默认配置合并，互不覆盖', () => {
    registerPageAgentTool({
      a11yConfig: {
        whitelist: ['.new-whitelist'],
        exposedAttributes: ['data-config-attr'],
      },
    })
    const config = getA11yConfig()
    expect(config.whitelist).toContain('.new-whitelist')
    expect(config.exposedAttributes).toContain('data-config-attr')
  })

  it('重复调用 registerPageAgentTool 以 replace 模式重新初始化，不会无限累加旧配置', () => {
    registerPageAgentTool({ a11yConfig: { roles: [{ role: 'tab', selector: '.v1' }] } })
    registerPageAgentTool({ a11yConfig: { roles: [{ role: 'tab', selector: '.v2' }] } })
    const config = getA11yConfig()
    expect(config.roles).toEqual([{ role: 'tab', selector: '.v2' }])
  })
})
