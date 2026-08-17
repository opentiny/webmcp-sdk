import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { SimulatorMask } from '../../page-tools/page-agent-mask/SimulatorMask'

describe('SimulatorMask 鼠标指针显隐与连续切换逻辑', () => {
  let mask: SimulatorMask

  beforeEach(() => {
    // 模拟 jsdom 环境下的动画与页面宽高
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(1024)
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(768)
  })

  afterEach(() => {
    mask?.dispose()
    vi.restoreAllMocks()
  })

  it('复现：先执行 browserState(无鼠标) 再执行 click(有鼠标) 时鼠标箭头未出现的 Bug —— 步骤 1. show({ showCursor: false })；步骤 2. 连续 show({ showCursor: true })；期望 #cursor 的 style.display 被恢复为 ""', () => {
    mask = new SimulatorMask()

    // 1. 模拟执行 browserState: show({ showCursor: false })
    mask.show({ showCursor: false })
    expect(mask.shown).toBe(true)

    const cursorEl = mask.wrapper.querySelector('.webmcp-page-agent-cursor') as HTMLElement
    expect(cursorEl).not.toBeNull()
    expect(cursorEl.style.display).toBe('none')

    // 2. 遮罩处于 shown=true 状态下，模拟执行 click/fill: show({ showCursor: true })
    mask.show({ showCursor: true })

    // 期望：cursorEl 的 display 应当恢复为空字符串（即显示鼠标）
    expect(cursorEl.style.display).toBe('')
  })

  it('默认为 showCursor: true 时，鼠标样式为 display: ""', () => {
    mask = new SimulatorMask()
    mask.show()
    const cursorEl = mask.wrapper.querySelector('.webmcp-page-agent-cursor') as HTMLElement
    expect(cursorEl.style.display).toBe('')
  })
})
