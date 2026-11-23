import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { registerPageAgentTool } from '../../page-tools/page-agent-tool'

/** SimulatorMask.hide() 在 800ms 淡出后才移除 visible */
const HIDE_FADE_MS = 800

function visibleMasks() {
  return document.querySelectorAll('.webmcp-page-agent-wrapper.visible')
}

/** SimulatorMask 构造时注入的样式标签 */
function maskStyles() {
  return [...document.head.querySelectorAll('style')].filter((el) =>
    el.textContent?.includes('.webmcp-page-agent-wrapper')
  )
}

function resetPageAgentGlobals() {
  window.__nextSdkPageAgentToolEventCleanup?.()
  try {
    ;(window as any).__pageAgentToolAbortController?.abort()
  } catch {
    // registerTool 在 abort 后可能以 AbortError reject，由调用方 catch
  }
  delete (window as any).__pageAgentToolAbortController
  window.__pageAgentSimulatorMask?.dispose()
  delete window.__pageAgentSimulatorMask
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

  it('复现：一次注册关闭遮罩后 800ms 内另一次注册重新显示，淡出结束时遮罩被隐藏 —— 步骤 注册 A、注册 B，A.showMask()、A.hideMask()，未满 800ms 时 B.showMask()；期望 淡出时长过后遮罩仍可见', async () => {
    const handleA = registerPageAgentTool({ removeMaskAfterToolCall: false })
    const handleB = registerPageAgentTool({ removeMaskAfterToolCall: false })

    await handleA.showMask()
    await handleA.hideMask()
    vi.advanceTimersByTime(HIDE_FADE_MS / 2)
    await handleB.showMask()
    vi.advanceTimersByTime(HIDE_FADE_MS)

    expect(visibleMasks()).toHaveLength(1)
  })

  it('复现：遮罩元素被移出文档后再次注册，先前句柄关不掉新遮罩 —— 步骤 注册 A，移除遮罩元素，注册 B，B.showMask()，A.hideMask()；期望 页面上没有可见遮罩，旧遮罩实例已释放', async () => {
    const handleA = registerPageAgentTool({ removeMaskAfterToolCall: false })
    const detachedMask = window.__pageAgentSimulatorMask!
    const onDispose = vi.fn()
    detachedMask.addEventListener('dispose', onDispose)
    detachedMask.wrapper.remove()

    const handleB = registerPageAgentTool({ removeMaskAfterToolCall: false })
    await handleB.showMask()
    expect(visibleMasks()).toHaveLength(1)

    await handleA.hideMask()
    vi.advanceTimersByTime(HIDE_FADE_MS)

    expect(visibleMasks()).toHaveLength(0)
    expect(onDispose).toHaveBeenCalledTimes(1)
  })

  it('复现：遮罩元素反复被移出文档后再次注册，head 中累积遮罩样式 —— 步骤 注册，移除遮罩元素，再注册，重复两次；期望 遮罩样式数量与首次注册后相同', () => {
    registerPageAgentTool()
    const stylesAfterFirst = maskStyles().length

    for (let i = 0; i < 2; i++) {
      window.__pageAgentSimulatorMask!.wrapper.remove()
      registerPageAgentTool()
    }

    expect(maskStyles()).toHaveLength(stylesAfterFirst)
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
