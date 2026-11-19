import { describe, it, expect, afterEach } from 'vitest'
import { SimulatorMask } from '../../page-tools/page-agent-mask/SimulatorMask'

describe('SimulatorMask 用户点击穿透', () => {
  let mask: SimulatorMask

  afterEach(() => {
    mask?.dispose()
  })

  it('复现：遮罩显示后、尚未执行任何 click 动作时，用户点击被遮罩拦截 —— 步骤 new SimulatorMask() 后 show()；期望 wrapper 的 pointer-events 为 none', () => {
    mask = new SimulatorMask()
    mask.show()

    expect(getComputedStyle(mask.wrapper).pointerEvents).toBe('none')
  })

  it('click 动作执行期间（EnablePassThrough）与结束后（DisablePassThrough），遮罩都保持点击穿透', () => {
    mask = new SimulatorMask()
    mask.show()

    window.dispatchEvent(new CustomEvent('PageAgent::EnablePassThrough'))
    expect(getComputedStyle(mask.wrapper).pointerEvents).toBe('none')

    window.dispatchEvent(new CustomEvent('PageAgent::DisablePassThrough'))

    expect(getComputedStyle(mask.wrapper).pointerEvents).toBe('none')
  })
})
