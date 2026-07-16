import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { resolveHighlightRect } from '../../page-tools/page-agent-highlight'

const originalGetComputedStyle = window.getComputedStyle

beforeEach(() => {
  document.body.innerHTML = ''
})

afterEach(() => {
  document.body.innerHTML = ''
  Object.defineProperty(window, 'getComputedStyle', {
    configurable: true,
    value: originalGetComputedStyle,
  })
})

describe('resolveHighlightRect', () => {
  it(
    '场景：ti-icon 宿主 height=0（字形在 ::before），外包有 28×28 可点父节点\n' +
      '问题：旧高亮逻辑跳过 width/height 为 0 的节点，帮助中心 full-screen/close 有 ref 却无框\n' +
      '期望：回退到紧凑父节点矩形',
    () => {
      const wrap = document.createElement('div')
      wrap.style.cssText = 'width:28px;height:28px;position:absolute;left:100px;top:80px;'
      const icon = document.createElement('ti-icon') as HTMLElement
      icon.className = 'ti-global-help-panel-header-icon ti3-icon-full-screen ti3-icon'
      icon.style.cssText = 'width:20px;height:0;display:block;font-size:20px;'
      wrap.appendChild(icon)
      document.body.appendChild(wrap)

      // jsdom 对 getBoundingClientRect 支持有限，手动 stub
      icon.getBoundingClientRect = () =>
        ({ top: 80.5, left: 964, width: 20, height: 0, bottom: 80.5, right: 984, x: 964, y: 80.5, toJSON() {} }) as DOMRect
      wrap.getBoundingClientRect = () =>
        ({ top: 70, left: 960, width: 28, height: 28, bottom: 98, right: 988, x: 960, y: 70, toJSON() {} }) as DOMRect

      const rect = resolveHighlightRect(icon)
      expect(rect).toEqual({ top: 70, left: 960, width: 28, height: 28 })
    },
  )

  it('自身有宽高时直接使用自身矩形，不误用父节点', () => {
    const el = document.createElement('button')
    document.body.appendChild(el)
    el.getBoundingClientRect = () =>
      ({ top: 10, left: 20, width: 40, height: 24, bottom: 34, right: 60, x: 20, y: 10, toJSON() {} }) as DOMRect

    expect(resolveHighlightRect(el)).toEqual({ top: 10, left: 20, width: 40, height: 24 })
  })

  it('宿主仅有宽度时用 font-size 补齐高度', () => {
    const el = document.createElement('ti-icon') as HTMLElement
    document.body.appendChild(el)
    el.getBoundingClientRect = () =>
      ({ top: 80, left: 100, width: 20, height: 0, bottom: 80, right: 120, x: 100, y: 80, toJSON() {} }) as DOMRect
    Object.defineProperty(window, 'getComputedStyle', {
      configurable: true,
      value: () => ({ fontSize: '20px' }) as CSSStyleDeclaration,
    })

    const rect = resolveHighlightRect(el)
    expect(rect).not.toBeNull()
    expect(rect!.width).toBe(20)
    expect(rect!.height).toBe(20)
  })
})

describe('isRectInViewport（通过 highlight 间接验证）', () => {
  it(
    '场景：侧栏链接 left 略为负值，旧逻辑要求矩形完全落在视口内会整框跳过\n' +
      '期望：与视口有交集即绘制高亮',
    async () => {
      const { highlight, unhighlight, HIGHLIGHT_CONTAINER_ID } = await import(
        '../../page-tools/page-agent-highlight'
      )
      const el = document.createElement('a')
      document.body.appendChild(el)
      el.getBoundingClientRect = () =>
        ({
          top: 100,
          left: -17,
          width: 259,
          height: 32,
          bottom: 132,
          right: 242,
          x: -17,
          y: 100,
          toJSON() {},
        }) as DOMRect

      Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1100 })
      Object.defineProperty(window, 'innerHeight', { configurable: true, value: 962 })

      const refMap = new Map<number, HTMLElement>([[42, el]])
      highlight(refMap)
      const overlay = document.querySelector(
        `#${HIGHLIGHT_CONTAINER_ID} [data-ref-index="42"]`,
      ) as HTMLElement | null
      expect(overlay).not.toBeNull()
      expect(overlay!.style.left).toBe('-17px')
      unhighlight()
    },
  )
})
