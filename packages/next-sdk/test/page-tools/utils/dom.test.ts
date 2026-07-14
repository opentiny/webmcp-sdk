import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { detectPageDialog, detectValidationErrors, deepQuerySelectorAll } from '../../../page-tools/utils/dom'
import { setA11yConfig } from '../../../page-tools/a11y/config'

function mockRect(el: Element, rect: Partial<DOMRect>) {
  const full = { x: 0, y: 0, width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0, toJSON: () => ({}), ...rect }
  ;(el as any).getBoundingClientRect = () => full as DOMRect
}

function resetWindowGlobals() {
  delete (window as any).__webmcpcli_a11yConfig
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

  it('通过 setA11yConfig 追加的自定义 states.error 选择器检出', () => {
    setA11yConfig({ states: { error: { selector: '.my-custom-error' } } })
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
  it('通过默认 dialogSelectors（role=dialog）检出真正阻塞交互的模态弹窗', () => {
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

  it('通过 setA11yConfig 追加的自定义 dialogSelectors 检出', () => {
    setA11yConfig({ dialogSelectors: ['.my-modal'] })
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
