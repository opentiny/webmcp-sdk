import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  detectPageDialog,
  detectValidationErrors,
  detectVisibleTooltips,
  deepQuerySelectorAll,
} from '../../../page-tools/utils/dom'
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
    expect(result).toEqual(['用户名不能为空'])
  })

  it('通过 setPageAgentToolConfig 追加的自定义 states.error 选择器检出', () => {
    setPageAgentToolConfig({ a11yConfig: { states: { error: { selector: '.my-custom-error' } } } })
    const err = document.createElement('div')
    err.className = 'my-custom-error'
    err.textContent = '自定义错误文案'
    document.body.appendChild(err)
    mockRect(err, { width: 100, height: 20 })

    expect(detectValidationErrors()).toEqual(['自定义错误文案'])
  })

  it('无校验错误时返回空数组', () => {
    expect(detectValidationErrors()).toEqual([])
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
    expect(result).toHaveLength(1)
    expect(result[0].text).toContain('确认删除该记录吗')
    expect(result[0].buttons).toEqual([])
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

    const result = detectPageDialog()
    expect(result).toHaveLength(1)
    expect(result[0].text).toContain('自定义配置检测到的模态弹窗内容')
  })

  it('非模态（非 fixed/absolute 或 z-index 过低）的弹窗不会被误报', () => {
    const notModal = document.createElement('div')
    notModal.setAttribute('role', 'dialog')
    notModal.textContent = '这是一个静态定位的普通提示框内容'
    document.body.appendChild(notModal)
    mockRect(notModal, { width: 400, height: 200, left: 300, right: 700, top: 250, bottom: 450 })

    expect(detectPageDialog()).toEqual([])
  })

  it('无弹窗时返回空数组', () => {
    expect(detectPageDialog()).toEqual([])
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
    expect(result).toEqual(['提示文案'])
  })

  it('检测 Tiny3 tp-helptip 可见 tooltip', () => {
    setPageAgentToolConfig(consoleCloudPageAgentToolOptions)
    const tip = document.createElement('tp-helptip')
    tip.textContent = '帮助提示内容'
    document.body.appendChild(tip)
    mockRect(tip, { width: 24, height: 24 })

    const result = detectVisibleTooltips()
    expect(result).toEqual(['帮助提示内容'])
  })

  it('隐藏的 tooltip 不被检测', () => {
    const tip = document.createElement('div')
    tip.setAttribute('role', 'tooltip')
    tip.textContent = '隐藏的提示'
    tip.style.display = 'none'
    document.body.appendChild(tip)
    mockRect(tip, { width: 0, height: 0 })

    expect(detectVisibleTooltips()).toEqual([])
  })

  it('无可见 tooltip 时返回空数组', () => {
    expect(detectVisibleTooltips()).toEqual([])
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
    // 只检测到 1 个 tooltip（父级），子级被跳过；textContent 会包含子节点文本
    expect(result).toHaveLength(1)
    expect(result[0]).toContain('外层提示')
  })
})

