/**
 * @vitest-environment node
 */
import { describe, expect, it } from 'vitest'
import { enableInspectAssist } from '../dom-inspect'

describe('dom-inspect SSR 安全性', () => {
  it('复现：非浏览器环境调用 enableInspectAssist 不应访问 DOM 或抛错', () => {
    const handle = enableInspectAssist()

    expect(handle.isActive()).toBe(false)
    expect(() => handle.enter()).not.toThrow()
    expect(() => handle.exit()).not.toThrow()
    expect(() => handle.toggle()).not.toThrow()
    expect(() => handle.disable()).not.toThrow()
  })
})
