import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { registerPageAgentTool } from '../../page-tools/page-agent-tool'

/** SimulatorMask.hide() 在 800ms 淡出后才移除 visible */
const HIDE_FADE_MS = 800

function visibleMasks() {
  return document.querySelectorAll('.webmcp-page-agent-wrapper.visible')
}

function resetPageAgentGlobals() {
  window.__nextSdkPageAgentToolEventCleanup?.()
  try {
    ;(window as any).__pageAgentToolAbortController?.abort()
  } catch {
    // registerTool 在 abort 后可能以 AbortError reject，由调用方 catch
  }
  delete (window as any).__pageAgentToolAbortController
  delete (window as any).__pageAgentSimulatorMask
  delete window.__webmcpcli_toolConfig
  document.querySelectorAll('.webmcp-page-agent-wrapper').forEach((el) => el.remove())
}

describe('registerPageAgentTool - 重复注册时的遮罩实例', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    resetPageAgentGlobals()
  })

  afterEach(() => {
    resetPageAgentGlobals()
    vi.useRealTimers()
  })

  it('复现：重复调用 registerPageAgentTool 后，先前句柄的 hideMask 关不掉后一次注册显示的遮罩 —— 步骤 注册 A、注册 B，B.showMask()，A.hideMask()；期望 页面上没有可见遮罩', async () => {
    const handleA = registerPageAgentTool({ removeMaskAfterToolCall: false })
    const handleB = registerPageAgentTool({ removeMaskAfterToolCall: false })

    await handleB.showMask()
    expect(visibleMasks()).toHaveLength(1)

    await handleA.hideMask()
    vi.advanceTimersByTime(HIDE_FADE_MS)

    expect(visibleMasks()).toHaveLength(0)
  })

  it('复现：重复调用 registerPageAgentTool 会在页面上留下多个遮罩元素 —— 步骤 连续注册两次；期望 页面上只有一个遮罩 wrapper', () => {
    registerPageAgentTool()
    registerPageAgentTool()

    expect(document.querySelectorAll('.webmcp-page-agent-wrapper')).toHaveLength(1)
  })

  it('复现：页面与宿主各自打包一份 SDK 时，宿主句柄关不掉页面副本显示的遮罩 —— 步骤 副本 1 注册得到宿主句柄，副本 2 注册并 showMask()，宿主句柄 hideMask()；期望 页面上没有可见遮罩', async () => {
    const hostHandle = registerPageAgentTool({ removeMaskAfterToolCall: false })

    vi.resetModules()
    const pageCopy = await import('../../page-tools/page-agent-tool')
    expect(pageCopy.registerPageAgentTool).not.toBe(registerPageAgentTool)
    const pageHandle = pageCopy.registerPageAgentTool({ removeMaskAfterToolCall: false })

    await pageHandle.showMask()
    expect(visibleMasks()).toHaveLength(1)

    await hostHandle.hideMask()
    vi.advanceTimersByTime(HIDE_FADE_MS)

    expect(visibleMasks()).toHaveLength(0)
  })
})
