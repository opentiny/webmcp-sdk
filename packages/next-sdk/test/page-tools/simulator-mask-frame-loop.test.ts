import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { SimulatorMask } from '../../page-tools/page-agent-mask/SimulatorMask'

/** 手动推进的帧队列：记录待执行的 requestAnimationFrame 回调，由测试决定何时执行一帧。 */
function installFrameQueue() {
  const pending = new Map<number, FrameRequestCallback>()
  let nextId = 1
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
    const id = nextId++
    pending.set(id, callback)
    return id
  })
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => {
    pending.delete(id)
  })
  return {
    pendingCount: () => pending.size,
    runFrames(count: number) {
      for (let i = 0; i < count; i++) {
        const callbacks = [...pending.values()]
        pending.clear()
        callbacks.forEach((callback) => callback(performance.now()))
      }
    }
  }
}

describe('SimulatorMask 光标逐帧回调只在遮罩显示期间运行', () => {
  let mask: SimulatorMask
  let frames: ReturnType<typeof installFrameQueue>

  beforeEach(() => {
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(1000)
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(800)
    frames = installFrameQueue()
  })

  afterEach(() => {
    mask?.dispose()
    vi.restoreAllMocks()
  })

  it('复现：注册后从未显示的遮罩每帧都在调度 requestAnimationFrame —— 前置 new SimulatorMask()；步骤 执行 3 帧；期望 没有待执行的帧回调', () => {
    mask = new SimulatorMask()

    frames.runFrames(3)

    expect(frames.pendingCount()).toBe(0)
  })

  it('复现：hide() 之后光标回调仍逐帧运行 —— 步骤 show({ showCursor: true })、执行若干帧、hide()、再执行 3 帧；期望 没有待执行的帧回调', () => {
    mask = new SimulatorMask()
    mask.show({ showCursor: true })
    frames.runFrames(2)

    mask.hide()
    frames.runFrames(3)

    expect(frames.pendingCount()).toBe(0)
  })

  it('遮罩显示期间光标逐帧移向目标位置，隐藏后再次显示仍能移动', () => {
    mask = new SimulatorMask()
    const cursor = mask.wrapper.querySelector('.webmcp-page-agent-cursor') as HTMLElement

    mask.show({ showCursor: true })
    mask.setCursorPosition(100, 100)
    frames.runFrames(40)
    expect(cursor.style.left).toBe('100px')
    expect(cursor.style.top).toBe('100px')

    mask.hide()
    frames.runFrames(3)
    mask.show({ showCursor: true })
    expect(cursor.style.left).toBe('500px')
    mask.setCursorPosition(200, 300)
    frames.runFrames(40)
    expect(cursor.style.left).toBe('200px')
    expect(cursor.style.top).toBe('300px')
  })

  it('dispose() 后不再调度帧回调', () => {
    mask = new SimulatorMask()
    mask.show({ showCursor: true })
    frames.runFrames(1)

    mask.dispose()
    frames.runFrames(3)

    expect(frames.pendingCount()).toBe(0)
  })
})
