import { beforeEach, describe, expect, it } from 'vitest'
import { buildA11yTree } from '../../../page-tools/a11y/build'
import type { ActionContext } from '../../../page-tools/context'
import { handleScroll } from '../../../page-tools/handlers/scroll'

// jsdom 没有布局：用实例属性模拟内容超出可视高度的容器
function makeScrollable(el: HTMLElement, { scrollHeight = 1000, clientHeight = 200, scrollTop = 200 } = {}) {
  el.style.overflowY = 'auto'
  Object.defineProperty(el, 'scrollHeight', { configurable: true, value: scrollHeight })
  Object.defineProperty(el, 'clientHeight', { configurable: true, value: clientHeight })
  Object.defineProperty(el, 'scrollTop', { configurable: true, writable: true, value: scrollTop })
  return el
}

beforeEach(() => {
  document.body.innerHTML = ''
})

describe('browserState 快照标出可滚动区域', () => {
  it('没有名称的滚动面板也分配编号，并标出上方、下方剩余的屏数', () => {
    const panel = makeScrollable(document.createElement('div'))
    panel.innerHTML = '<p>C-0101 · 客户 1</p><p>C-0102 · 客户 2</p>'
    document.body.append(panel)

    const { yaml, refMap } = buildA11yTree(document.body)

    const line = yaml.split('\n').find((l) => l.includes('scrollable='))
    expect(line).toMatch(/#\d+ \[scrollable=\\?"上方 1\.0 屏，下方 3\.0 屏\\?"\]/)
    expect([...refMap.values()]).toContain(panel)
  })

  it('内容没有超出、或 overflow 不允许滚动的元素不标 scrollable', () => {
    const fits = makeScrollable(document.createElement('div'), { scrollHeight: 200, clientHeight: 200, scrollTop: 0 })
    fits.textContent = '内容未超出'
    const clipped = makeScrollable(document.createElement('div'))
    clipped.style.overflowY = 'hidden'
    clipped.textContent = '只裁剪不滚动'
    document.body.append(fits, clipped)

    expect(buildA11yTree(document.body).yaml).not.toContain('scrollable=')
  })
  it('scroll 传快照里面板的编号，滚动的是这个面板', async () => {
    const panel = makeScrollable(document.createElement('div'), { scrollTop: 0 })
    panel.innerHTML = '<p>C-0101 · 客户 1</p>'
    panel.scrollBy = function (this: HTMLElement, opts?: ScrollToOptions | number) {
      this.scrollTop += typeof opts === 'object' ? (opts.top ?? 0) : 0
      this.dispatchEvent(new Event('scrollend'))
    } as Element['scrollBy']
    document.body.append(panel)
    const { yaml, refMap } = buildA11yTree(document.body)
    const index = Number(/#(\d+) \[scrollable=/.exec(yaml)![1])
    const ctx = {
      resolveRefOrError: async (_action: string, i: number) => ({ ok: true, el: refMap.get(i) }),
      buildBrowserStateResponse: async () => ({ content: [{ type: 'text' as const, text: '{}' }] })
    } as unknown as ActionContext

    await handleScroll({ index, down: true, numPages: 1 }, ctx)

    expect(panel.scrollTop).toBe(200)
  })
})
