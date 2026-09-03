import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  getPageAgentToolConfig,
  setPageAgentToolConfig,
  DEFAULT_PAGE_AGENT_TOOL_CONFIG
} from '../../page-tools/tool-config'

function resetWindowGlobals() {
  delete window.__webmcpcli_toolConfig
}

beforeEach(() => {
  resetWindowGlobals()
})

afterEach(() => {
  resetWindowGlobals()
})

describe('getPageAgentToolConfig / setPageAgentToolConfig', () => {
  it('未初始化时返回默认配置', () => {
    expect(getPageAgentToolConfig()).toEqual(DEFAULT_PAGE_AGENT_TOOL_CONFIG)
  })

  it('merge 模式下只覆盖传入的字段，未传入字段保持原值', () => {
    setPageAgentToolConfig({ enableHighlight: false })
    const current = getPageAgentToolConfig()
    expect(current.enableHighlight).toBe(false)
  })

  it('merge 模式下只覆盖传入的字段，removeMaskAfterToolCall字段保持原值', () => {
    setPageAgentToolConfig({ removeMaskAfterToolCall: false })
    const current = getPageAgentToolConfig()
    expect(current.removeMaskAfterToolCall).toBe(false)
  })

  it('merge 模式下只覆盖传入的字段，removeMaskAfterToolCall字段保持原值', () => {
    setPageAgentToolConfig({ removeMaskAfterToolCall: true })
    const current = getPageAgentToolConfig()
    expect(current.removeMaskAfterToolCall).toBe(true)
  })

  it('函数式 patch：入参为当前生效配置，返回值与默认配置合并', () => {
    setPageAgentToolConfig({ enableHighlight: false })
    const next = setPageAgentToolConfig((current) => ({ enableHighlight: !current.enableHighlight }))
    expect(next.enableHighlight).toBe(true)
    expect(getPageAgentToolConfig().enableHighlight).toBe(true)
  })

  it('replace 模式丢弃之前的运行期状态，只与默认值重新合并', () => {
    setPageAgentToolConfig({ enableHighlight: true })
    setPageAgentToolConfig({}, { mode: 'replace' })
    expect(getPageAgentToolConfig().enableHighlight).toBe(false)
  })

  it('setPageAgentToolConfig 后 getPageAgentToolConfig 读到最新值', () => {
    const next = setPageAgentToolConfig({ enableHighlight: false })
    expect(getPageAgentToolConfig()).toEqual(next)
  })

  it('未初始化时 cursorMode 默认为 actionOnly', () => {
    expect(getPageAgentToolConfig().cursorMode).toBe('actionOnly')
    expect(DEFAULT_PAGE_AGENT_TOOL_CONFIG.cursorMode).toBe('actionOnly')
  })

  it('merge 模式下可覆盖 cursorMode，未传入字段保持原值', () => {
    setPageAgentToolConfig({ cursorMode: 'never' })
    expect(getPageAgentToolConfig().cursorMode).toBe('never')
    expect(getPageAgentToolConfig().enableHighlight).toBe(false)
  })

  it('复现：函数式 patch 只改其它字段时 cursorMode 被重置为 actionOnly —— 前置 cursorMode=never；步骤函数式只改 enableHighlight；期望 cursorMode 仍为 never', () => {
    setPageAgentToolConfig({ cursorMode: 'never', enableHighlight: false })
    const next = setPageAgentToolConfig((current) => ({ enableHighlight: !current.enableHighlight }))
    expect(next.enableHighlight).toBe(true)
    expect(next.cursorMode).toBe('never')
    expect(getPageAgentToolConfig().cursorMode).toBe('never')
  })
})

describe('setPageAgentToolConfig - a11yConfig 子字段', () => {
  it('未初始化时 a11yConfig 与默认无障碍配置等价', () => {
    const config = getPageAgentToolConfig().a11yConfig
    expect(config.roles).toEqual(DEFAULT_PAGE_AGENT_TOOL_CONFIG.a11yConfig.roles)
    expect(config.whitelist).toEqual([])
    expect(config.blacklist).toEqual([])
    expect(config.exposedAttributes).toEqual([])
  })

  it('merge 模式下多次调用累加合并（拼接而非覆盖）', () => {
    setPageAgentToolConfig({ a11yConfig: { roles: [{ role: 'tab', selector: '.tab-1' }] } })
    setPageAgentToolConfig({ a11yConfig: { roles: [{ role: 'tabpanel', selector: '.panel-1' }] } })
    const current = getPageAgentToolConfig().a11yConfig
    // 默认 roles（dialog/tooltip）在前，用户 roles 累加在后
    const userRoles = current.roles.filter(r => r.role === 'tab' || r.role === 'tabpanel')
    expect(userRoles).toEqual([
      { role: 'tab', selector: '.tab-1' },
      { role: 'tabpanel', selector: '.panel-1' }
    ])
  })

  it('函数式 patch 可用于过滤/移除旧规则（真正移除，不会因再次合并而复活）', () => {
    setPageAgentToolConfig({
      a11yConfig: {
        roles: [
          { role: 'tab', selector: '.tab-1' },
          { role: 'keep-me', selector: '.k' }
        ]
      }
    })
    setPageAgentToolConfig((current) => ({
      a11yConfig: { roles: current.a11yConfig.roles.filter((r) => r.role !== 'tab') }
    }))
    const result = getPageAgentToolConfig().a11yConfig
    expect(result.roles.some((r) => r.role === 'tab')).toBe(false)
    expect(result.roles.some((r) => r.role === 'keep-me')).toBe(true)
  })

  it('函数式 patch 过滤 a11y 规则时，未返回的 cursorMode 仍保持原值', () => {
    setPageAgentToolConfig({
      cursorMode: 'always',
      a11yConfig: { roles: [{ role: 'tab', selector: '.tab-1' }] }
    })
    setPageAgentToolConfig((current) => ({
      a11yConfig: { roles: current.a11yConfig.roles.filter((r) => r.role !== 'tab') }
    }))
    expect(getPageAgentToolConfig().cursorMode).toBe('always')
    expect(getPageAgentToolConfig().a11yConfig.roles.some((r) => r.role === 'tab')).toBe(false)
  })

  it('replace 模式丢弃之前的运行期状态，只与默认值重新合并', () => {
    setPageAgentToolConfig({ a11yConfig: { roles: [{ role: 'tab', selector: '.old' }] } })
    setPageAgentToolConfig({ a11yConfig: { roles: [{ role: 'v2', selector: '.new' }] } }, { mode: 'replace' })
    const result = getPageAgentToolConfig().a11yConfig
    // replace 模式重置为默认 + 新规则，旧规则 .old 不应存在
    expect(result.roles.some(r => r.role === 'v2' && (r as any).selector === '.new')).toBe(true)
    expect(result.roles.some(r => (r as any).selector === '.old')).toBe(false)
  })

  it('a11yConfig 与 enableHighlight 可在同一次 patch 中一起设置，互不影响', () => {
    setPageAgentToolConfig({ enableHighlight: false, a11yConfig: { roles: [{ role: 'dialog', selector: '.my-modal' }] } })
    const current = getPageAgentToolConfig()
    expect(current.enableHighlight).toBe(false)
    expect(current.a11yConfig.roles.some(r => r.role === 'dialog' && r.selector === '.my-modal')).toBe(true)
  })
})
