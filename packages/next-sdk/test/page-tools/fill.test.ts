import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { ActionContext } from '../../page-tools/context'
import { handleFill } from '../../page-tools/handlers/fill'

let listeners: AbortController
beforeEach(() => {
  listeners = new AbortController()
  // jsdom 没有 scrollIntoView / elementFromPoint，page-controller 的 inputTextElement 会抛错并落入
  // handleFill 的降级分支；补上两者才能覆盖真实浏览器走的主路径。
  Element.prototype.scrollIntoView = () => {}
  document.elementFromPoint = () => document.body.lastElementChild
})

const contextFor = (el: HTMLElement) =>
  ({
    resolveRefOrError: async () => ({ ok: true, el }),
    buildBrowserStateResponse: async () => ({ content: [{ type: 'text' as const, text: 'state' }] }),
    actionError: async (msg: string) => ({ content: [{ type: 'text' as const, text: msg }], isError: true })
  }) as unknown as ActionContext

afterEach(() => {
  listeners.abort()
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

  // 委托在 document 上的监听器（如 React 根节点）只能收到 composed 事件，期望看到与用户输入后离开输入框相同的
  // input → change → blur；change 早于 input 时，在 input 时更新模型、在 change 时保存的页面会保存旧值。
  const fillInShadowDom = async (tag: 'input' | 'textarea') => {
    const host = document.createElement('div')
    document.body.append(host)
    const el = document.createElement(tag)
    host.attachShadow({ mode: 'open' }).append(el)
    const outside: string[] = []
    for (const type of ['input', 'change', 'blur']) {
      // blur 不冒泡，捕获阶段才能在 document 上收到
      document.addEventListener(type, () => outside.push(type), { capture: true, signal: listeners.signal })
    }

    await handleFill({ index: 0, text: '李四' }, contextFor(el))

    return outside
  }

  it.each(['input', 'textarea'] as const)(
    '复现：shadow DOM 内的 %s；步骤 fill；期望 shadow 外依次收到 input、change、blur 各一次',
    async (tag) => {
      expect(await fillInShadowDom(tag)).toEqual(['input', 'change', 'blur'])
    }
  )

  it('复现：shadow DOM 内的输入框走降级分支；步骤 fill；期望 shadow 外依次收到 input、change、blur 各一次', async () => {
    // 去掉 scrollIntoView 桩，让 inputTextElement 抛错，handleFill 改用原生 value setter 写值
    delete (Element.prototype as { scrollIntoView?: unknown }).scrollIntoView

    expect(await fillInShadowDom('input')).toEqual(['input', 'change', 'blur'])
  })
})
