import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { ActionContext } from '../../page-tools/context'
import { handleFill } from '../../page-tools/handlers/fill'

// jsdom 没有 scrollIntoView / elementFromPoint，page-controller 的 inputTextElement 会抛错并落入
// handleFill 的降级分支；补上两者才能覆盖真实浏览器走的主路径。
beforeEach(() => {
  Element.prototype.scrollIntoView = () => {}
  document.elementFromPoint = () => document.body.lastElementChild
})

const contextFor = (el: HTMLElement) =>
  ({
    getRefMap: () => new Map([[0, el]]),
    buildBrowserStateResponse: async () => ({ content: [{ type: 'text' as const, text: 'state' }] }),
    actionError: async (msg: string) => ({ content: [{ type: 'text' as const, text: msg }], isError: true })
  }) as unknown as ActionContext

afterEach(() => {
  document.body.innerHTML = ''
})

describe('handleFill - 依赖 change / blur 的表单', () => {
  it.each(['input', 'textarea'] as const)(
    '复现：%s 只在 change 时写回模型（Knockout value 绑定）；步骤 fill；期望模型拿到新值',
    async (tag) => {
      const el = document.createElement(tag)
      el.value = '王五'
      document.body.append(el)
      const model = { value: '王五' }
      el.addEventListener('change', () => {
        model.value = el.value
      })

      await handleFill({ index: 0, text: '李四' }, contextFor(el))

      expect(model.value).toBe('李四')
    }
  )

  it('复现：输入框失焦才校验；步骤 fill；期望校验执行一次且读到新值，输入框不再持有焦点', async () => {
    const input = document.createElement('input')
    document.body.append(input)
    const validated: string[] = []
    input.addEventListener('blur', () => validated.push(input.value))

    await handleFill({ index: 0, text: '13800138000' }, contextFor(input))

    expect(validated).toEqual(['13800138000'])
    expect(document.activeElement).not.toBe(input)
  })

  it('复现：shadow DOM 内的输入框；步骤 fill；期望 change 只派发一次、早于 blur，且能被 shadow 外监听到', async () => {
    const host = document.createElement('div')
    document.body.append(host)
    const input = document.createElement('input')
    host.attachShadow({ mode: 'open' }).append(input)
    const events: string[] = []
    input.addEventListener('change', () => events.push('change'))
    input.addEventListener('blur', () => events.push('blur'))
    let outsideChanges = 0
    document.addEventListener('change', () => outsideChanges++)

    await handleFill({ index: 0, text: '李四' }, contextFor(input))

    expect(events).toEqual(['change', 'blur'])
    expect(outsideChanges).toBe(1)
  })
})
