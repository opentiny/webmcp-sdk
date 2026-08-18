/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { handleClipboard } from '../../page-tools/handlers/clipboard'
import type { ActionContext } from '../../page-tools/context'
import type { PageAgentToolInput } from '../../page-tools/schema'

const originalClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard')

function restoreClipboard() {
  if (originalClipboard) {
    Object.defineProperty(navigator, 'clipboard', originalClipboard)
  } else {
    Reflect.deleteProperty(navigator, 'clipboard')
  }
}

function mockClipboard(overrides: {
  writeText?: (text: string) => Promise<void>
  readText?: () => Promise<string>
}) {
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: {
      writeText: overrides.writeText ?? vi.fn(async () => {}),
      readText: overrides.readText ?? vi.fn(async () => ''),
    },
  })
}

const ctx = {} as ActionContext

afterEach(() => {
  restoreClipboard()
})

describe('handleClipboard', () => {
  it('复现：传入 text 时应写入剪切板并返回成功文案 —— 前置 mock writeText；步骤 handleClipboard({ action: clipboard, text })；期望 writeText 被调用且返回「复制到剪切板成功」', async () => {
    const writeText = vi.fn(async () => {})
    mockClipboard({ writeText })

    const args: PageAgentToolInput = { action: 'clipboard', text: 'hello', contextLines: 2, maxMatches: 20 }
    const result = await handleClipboard(args, ctx)

    expect(writeText).toHaveBeenCalledWith('hello')
    expect(result.content[0]?.text).toBe('复制到剪切板成功')
  })

  it('复现：未传 text 时应读取剪切板 —— 前置 mock readText 返回内容；步骤 handleClipboard({ action: clipboard })；期望返回「剪切板内容为: …」', async () => {
    const readText = vi.fn(async () => 'copied-value')
    mockClipboard({ readText })

    const args: PageAgentToolInput = { action: 'clipboard', contextLines: 2, maxMatches: 20 }
    const result = await handleClipboard(args, ctx)

    expect(readText).toHaveBeenCalledTimes(1)
    expect(result.content[0]?.text).toBe('剪切板内容为: copied-value')
  })

  it('复现：writeText 被拒绝时应返回失败文案且不抛异常 —— 前置 writeText reject；步骤写入；期望「操作剪切板失败: …」', async () => {
    mockClipboard({
      writeText: vi.fn(async () => {
        throw new Error('denied')
      }),
    })

    const args: PageAgentToolInput = { action: 'clipboard', text: 'x', contextLines: 2, maxMatches: 20 }
    const result = await handleClipboard(args, ctx)

    expect(result.content[0]?.text).toBe('操作剪切板失败: denied')
  })

  it('复现：readText 失败时应返回失败文案且不抛异常 —— 前置 readText reject；步骤读取；期望「操作剪切板失败: …」', async () => {
    mockClipboard({
      readText: vi.fn(async () => {
        throw new Error('not allowed')
      }),
    })

    const args: PageAgentToolInput = { action: 'clipboard', contextLines: 2, maxMatches: 20 }
    const result = await handleClipboard(args, ctx)

    expect(result.content[0]?.text).toBe('操作剪切板失败: not allowed')
  })
})
