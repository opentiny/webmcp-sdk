import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  detectPageDialog,
  detectValidationErrors,
  detectVisibleTooltips,
  scanForDynamicTooltips,
  deepQuerySelectorAll,
} from '../../../page-tools/utils/dom'
import { extractTooltipText } from '../../../page-tools/a11y/utils'
import { setPageAgentToolConfig } from '../../../page-tools/tool-config'
import { consoleCloudPageAgentToolOptions } from '../../../page-tools/configs/console-cloud'

function mockRect(el: Element, rect: Partial<DOMRect>) {
  const full: DOMRect = {
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    toJSON: () => ({}),
    ...rect,
  }
  Object.defineProperty(el, 'getBoundingClientRect', {
    configurable: true,
    value: () => full,
  })
}

function resetWindowGlobals() {
  delete window.__webmcpcli_toolConfig
  delete window.__webmcpcli_dynamicTooltipCache
  delete window.__webmcpcli_preScannedTooltips
}

beforeEach(() => {
  resetWindowGlobals()
  document.body.innerHTML = ''
})

afterEach(() => {
  resetWindowGlobals()
  document.body.innerHTML = ''
})

describe('detectValidationErrors', () => {
  it('通过默认 states.error 选择器（ARIA 标准 + 主流框架）检出校验错误', () => {
    const err = document.createElement('div')
    err.className = 'el-form-item__error'
    err.textContent = '用户名不能为空'
    document.body.appendChild(err)
    mockRect(err, { width: 100, height: 20 })

    const result = detectValidationErrors()
    expect(result).toContain('用户名不能为空')
    expect(result).toContain('[校验提示]')
  })

  it('通过 setPageAgentToolConfig 追加的自定义 states.error 选择器检出', () => {
    setPageAgentToolConfig({ a11yConfig: { states: { error: { selector: '.my-custom-error' } } } })
    const err = document.createElement('div')
    err.className = 'my-custom-error'
    err.textContent = '自定义错误文案'
    document.body.appendChild(err)
    mockRect(err, { width: 100, height: 20 })

    expect(detectValidationErrors()).toContain('自定义错误文案')
  })

  it('无校验错误时返回空字符串', () => {
    expect(detectValidationErrors()).toBe('')
  })
})

describe('detectPageDialog', () => {
  it('通过默认 roles 规则（role=dialog）检出真正阻塞交互的模态弹窗', () => {
    const dialog = document.createElement('div')
    dialog.setAttribute('role', 'dialog')
    dialog.textContent = '确认删除该记录吗？此操作不可撤销。'
    dialog.style.position = 'fixed'
    dialog.style.zIndex = '1000'
    document.body.appendChild(dialog)
    mockRect(dialog, { width: 400, height: 200, left: 300, right: 700, top: 250, bottom: 450 })

    const result = detectPageDialog()
    expect(result).toContain('[页面弹窗检测]')
    expect(result).toContain('确认删除该记录吗')
  })

  it('通过 setPageAgentToolConfig 追加的自定义 dialog role 规则检出', () => {
    setPageAgentToolConfig({ a11yConfig: { roles: [{ role: 'dialog', selector: '.my-modal' }] } })
    const dialog = document.createElement('div')
    dialog.className = 'my-modal'
    dialog.textContent = '自定义配置检测到的模态弹窗内容'
    dialog.style.position = 'fixed'
    dialog.style.zIndex = '1000'
    document.body.appendChild(dialog)
    mockRect(dialog, { width: 400, height: 200, left: 300, right: 700, top: 250, bottom: 450 })

    expect(detectPageDialog()).toContain('自定义配置检测到的模态弹窗内容')
  })

  it('非模态（非 fixed/absolute 或 z-index 过低）的弹窗不会被误报', () => {
    const notModal = document.createElement('div')
    notModal.setAttribute('role', 'dialog')
    notModal.textContent = '这是一个静态定位的普通提示框内容'
    document.body.appendChild(notModal)
    mockRect(notModal, { width: 400, height: 200, left: 300, right: 700, top: 250, bottom: 450 })

    expect(detectPageDialog()).toBe('')
  })

  it('无弹窗时返回空字符串', () => {
    expect(detectPageDialog()).toBe('')
  })
})

describe('deepQuerySelectorAll', () => {
  it('可以穿透 Shadow DOM 查询元素', () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const shadow = host.attachShadow({ mode: 'open' })
    const btn = document.createElement('button')
    btn.textContent = 'Shadow 内部按钮'
    shadow.appendChild(btn)

    const found = deepQuerySelectorAll('button', document.body)
    expect(found).toContain(btn)
  })
})

// ─── detectVisibleTooltips ──────────────────────────────────────────────

describe('detectVisibleTooltips', () => {
  it('检测 ARIA role=tooltip 的可见 tooltip', () => {
    const tip = document.createElement('div')
    tip.setAttribute('role', 'tooltip')
    tip.textContent = '提示文案'
    document.body.appendChild(tip)
    mockRect(tip, { width: 200, height: 40 })

    const result = detectVisibleTooltips()
    expect(result).toContain('提示文案')
    expect(result).toContain('[Tooltip 检测]')
  })

  it('检测 Tiny3 tp-helptip 可见 tooltip', () => {
    setPageAgentToolConfig(consoleCloudPageAgentToolOptions)
    const tip = document.createElement('tp-helptip')
    tip.textContent = '帮助提示内容'
    document.body.appendChild(tip)
    mockRect(tip, { width: 24, height: 24 })

    const result = detectVisibleTooltips()
    expect(result).toContain('帮助提示内容')
  })

  it('隐藏的 tooltip 不被检测', () => {
    const tip = document.createElement('div')
    tip.setAttribute('role', 'tooltip')
    tip.textContent = '隐藏的提示'
    tip.style.display = 'none'
    document.body.appendChild(tip)
    mockRect(tip, { width: 0, height: 0 })

    expect(detectVisibleTooltips()).toBe('')
  })

  it('无可见 tooltip 时返回空字符串', () => {
    expect(detectVisibleTooltips()).toBe('')
  })

  it('嵌套的 tooltip 只收集父级（子元素不重复收集）', () => {
    const parent = document.createElement('div')
    parent.setAttribute('role', 'tooltip')
    parent.textContent = '外层提示'
    const child = document.createElement('div')
    child.setAttribute('role', 'tooltip')
    child.textContent = '内层提示'
    parent.appendChild(child)
    document.body.appendChild(parent)
    mockRect(parent, { width: 200, height: 40 })
    mockRect(child, { width: 100, height: 20 })

    const result = detectVisibleTooltips()
    // 只检测到 1 个 tooltip（父级），子级被跳过
    expect(result).toContain('1 个可见浮层提示')
    expect(result).toContain('外层提示')
  })
})

// ─── scanForDynamicTooltips ─────────────────────────────────────────────

describe('scanForDynamicTooltips', () => {
  it('消费 CLI 预扫描结果写入 __webmcpcli_dynamicTooltipCache', async () => {
    setPageAgentToolConfig(consoleCloudPageAgentToolOptions)

    const tip1 = document.createElement('tp-helptip')
    const tip2 = document.createElement('tp-helptip')
    document.body.appendChild(tip1)
    document.body.appendChild(tip2)
    mockRect(tip1, { width: 24, height: 24 })
    mockRect(tip2, { width: 24, height: 24 })

    window.__webmcpcli_preScannedTooltips = [
      { index: 0, text: 'CLI 预扫描 tooltip 文案', type: 'tooltip' },
      { index: 1, text: 'CLI 预扫描帮助按钮文案', type: 'button' },
    ]

    await scanForDynamicTooltips()

    const cache = window.__webmcpcli_dynamicTooltipCache!
    expect(cache.get(tip1)).toBe('CLI 预扫描 tooltip 文案')
    expect(cache.get(tip2)).toBe('CLI 预扫描帮助按钮文案')
    // 消费完毕后应清除
    expect(window.__webmcpcli_preScannedTooltips).toBeUndefined()
  })

  it('无预扫描数据时走合成事件扫描路径', async () => {
    setPageAgentToolConfig(consoleCloudPageAgentToolOptions)

    const tip = document.createElement('tp-helptip')
    document.body.appendChild(tip)
    mockRect(tip, { width: 24, height: 24 })

    // 无 preScanned 数据，应走合成事件路径（jsdom 中不会产生新 DOM 节点）
    await scanForDynamicTooltips()

    // 缓存应被初始化，即使没有命中
    expect(window.__webmcpcli_dynamicTooltipCache).toBeDefined()
  })

  it('已有静态 tooltip 的元素跳过合成事件扫描', async () => {
    setPageAgentToolConfig(consoleCloudPageAgentToolOptions)

    const tip = document.createElement('tp-helptip')
    tip.setAttribute('title', '已有静态 title')
    document.body.appendChild(tip)
    mockRect(tip, { width: 24, height: 24 })

    // 清除预扫描数据确保走候选收集逻辑
    delete window.__webmcpcli_preScannedTooltips

    await scanForDynamicTooltips()

    // 有 title 的元素会被 collectTooltipScanCandidates 跳过，不写入缓存
    const cache = window.__webmcpcli_dynamicTooltipCache
    expect(cache?.get(tip)).toBeUndefined()
  })
})

// ─── extractTooltipText 优先级5（动态缓存）─────────────────────────────

describe('extractTooltipText - 优先级5 动态缓存', () => {
  it('从 __webmcpcli_dynamicTooltipCache 读取缓存的 tooltip 文本', () => {
    const el = document.createElement('div')
    document.body.appendChild(el)

    window.__webmcpcli_dynamicTooltipCache = new WeakMap()
    window.__webmcpcli_dynamicTooltipCache.set(el, '动态扫描到的 tooltip 内容')

    expect(extractTooltipText(el)).toBe('动态扫描到的 tooltip 内容')
  })

  it('动态缓存优先级低于 title 属性', () => {
    const el = document.createElement('div')
    el.setAttribute('title', '静态 title 优先')
    document.body.appendChild(el)

    window.__webmcpcli_dynamicTooltipCache = new WeakMap()
    window.__webmcpcli_dynamicTooltipCache.set(el, '动态缓存内容')

    expect(extractTooltipText(el)).toBe('静态 title 优先')
  })

  it('动态缓存优先级低于 aria-describedby', () => {
    const ref = document.createElement('div')
    ref.id = 'desc-ref'
    ref.textContent = 'aria 描述文本'
    document.body.appendChild(ref)

    const el = document.createElement('div')
    el.setAttribute('aria-describedby', 'desc-ref')
    document.body.appendChild(el)

    window.__webmcpcli_dynamicTooltipCache = new WeakMap()
    window.__webmcpcli_dynamicTooltipCache.set(el, '动态缓存内容')

    expect(extractTooltipText(el)).toBe('aria 描述文本')
  })

  it('缓存中文本含双引号时会被转义', () => {
    const el = document.createElement('div')
    document.body.appendChild(el)

    window.__webmcpcli_dynamicTooltipCache = new WeakMap()
    window.__webmcpcli_dynamicTooltipCache.set(el, '含"引号"的文本')

    expect(extractTooltipText(el)).toBe('含\\"引号\\"的文本')
  })

  it('无缓存且无静态 tooltip 标识时返回空字符串', () => {
    const el = document.createElement('div')
    document.body.appendChild(el)

    expect(extractTooltipText(el)).toBe('')
  })
})
