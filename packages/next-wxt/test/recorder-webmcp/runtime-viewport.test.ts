import { describe, expect, it, vi } from 'vitest'
import { runRecorderSteps } from '../../recorder-webmcp/runtime'
import type { Page } from 'puppeteer-core'

/**
 * 复现：执行 Recorder WebMCP 时右侧大片空白
 * —— 前置：Recorder 脚本含 setViewport（如 width:1459）；扩展已用 defaultViewport:null 连接；
 * —— 步骤：runRecorderSteps 执行含 setViewport 的 steps；
 * —— 期望：不调用 page.setViewport，保持浏览器原有视口/窗口尺寸。
 */
describe('runRecorderSteps viewport', () => {
  it('复现：执行 Recorder WebMCP 时右侧大片空白 —— 前置含 setViewport 步骤；执行后不改视口；期望跳过 setViewport', async () => {
    const setViewport = vi.fn(async () => {})
    const goto = vi.fn(async () => {})
    const page = {
      setViewport,
      goto,
      locator: vi.fn(),
      mouse: { wheel: vi.fn() }
    } as unknown as Page

    const result = await runRecorderSteps(page, [
      { op: 'setViewport', width: 1459, height: 1318 },
      { op: 'goto', url: 'https://opentiny.design/' }
    ])

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.completed).toBe(2)
    expect(setViewport).not.toHaveBeenCalled()
    expect(goto).toHaveBeenCalledWith('https://opentiny.design/', {
      waitUntil: 'domcontentloaded',
      timeout: 5000
    })
  })
})
