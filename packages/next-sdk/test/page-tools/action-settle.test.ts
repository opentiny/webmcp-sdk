import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { ActionContext } from '../../page-tools/context'
import { handleClick } from '../../page-tools/handlers/click'

// jsdom 没有 scrollIntoView / elementFromPoint，page-controller 的 clickElement 依赖二者
beforeEach(() => {
  Element.prototype.scrollIntoView = () => {}
  document.elementFromPoint = () => document.querySelector('button')
})

afterEach(() => {
  document.body.innerHTML = ''
})

/** 模拟服务端延迟 delayMs 后返回 JSON 的接口 */
const slowFetch = (delayMs: number, body: unknown) =>
  (() =>
    new Promise((resolve) => setTimeout(() => resolve(new Response(JSON.stringify(body))), delayMs))) as typeof fetch

// 页面上的 window.fetch 只赋值一次（动作首次执行时会包装它），各用例通过 fetchImpl 切换接口行为
let fetchImpl: typeof fetch
beforeAll(() => {
  window.fetch = ((...args: Parameters<typeof fetch>) => fetchImpl(...args)) as typeof fetch
})

const contextFor = (el: HTMLElement, snapshots: string[]) =>
  ({
    resolveRefOrError: async () => ({ ok: true, el }),
    buildBrowserStateResponse: async () => {
      snapshots.push(document.body.textContent ?? '')
      return { content: [{ type: 'text' as const, text: 'state' }] }
    },
    actionError: async (msg: string) => ({ content: [{ type: 'text' as const, text: msg }], isError: true })
  }) as unknown as ActionContext

describe('handleClick - 点击后等待页面请求完成再返回状态', () => {
  it('复现：点击触发的接口 800ms 后返回；步骤 click；期望返回的页面状态里已有查询结果', async () => {
    fetchImpl = slowFetch(800, { total: 3 })
    document.body.innerHTML = '<button>查询</button><p id="out"></p>'
    const button = document.querySelector('button')!
    button.addEventListener('click', async () => {
      document.getElementById('out')!.textContent = '搜索中…'
      const data = await (await window.fetch('api/search')).json()
      document.getElementById('out')!.textContent = `查询完成：共 ${data.total} 条`
    })
    const snapshots: string[] = []

    await handleClick({ index: 0 }, contextFor(button, snapshots))

    expect(snapshots.at(-1)).toContain('查询完成：共 3 条')
  })

  it('点击前就在进行的请求（如轮询）不拖慢点击返回', async () => {
    fetchImpl = slowFetch(10_000, {})
    document.body.innerHTML = '<button>展开</button>'
    const button = document.querySelector('button')!
    // 先执行一次动作，确保之后页面发出的请求都被计数
    await handleClick({ index: 0 }, contextFor(button, []))
    void window.fetch('api/poll')
    const started = Date.now()

    await handleClick({ index: 0 }, contextFor(button, []))

    expect(Date.now() - started).toBeLessThan(1500)
  })
})
