import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { ActionContext } from '../../page-tools/context'
import { handleScroll } from '../../page-tools/handlers/scroll'

// jsdom 没有布局：用实例属性模拟「内容高于可视高度、overflow:auto」的容器，scrollBy 桩按位移改 scrollTop
function makeScrollable(el: HTMLElement, { scrollHeight = 2000, clientHeight = 200 } = {}) {
  el.style.overflowY = 'auto'
  Object.defineProperty(el, 'scrollHeight', { configurable: true, value: scrollHeight })
  Object.defineProperty(el, 'clientHeight', { configurable: true, value: clientHeight })
  Object.defineProperty(el, 'scrollTop', { configurable: true, writable: true, value: 0 })
  return el
}

beforeEach(() => {
  Element.prototype.scrollBy = function (this: Element, opts?: ScrollToOptions | number) {
    const top = typeof opts === 'object' ? (opts.top ?? 0) : 0
    const max = this.scrollHeight - this.clientHeight
    this.scrollTop = Math.max(0, Math.min(max, this.scrollTop + top))
    this.dispatchEvent(new Event('scrollend'))
  } as Element['scrollBy']
  // 文档本身不可滚动（jsdom 下 scrollHeight 为 0），window.scrollBy 不产生位移
  window.scrollBy = (() => document.dispatchEvent(new Event('scrollend'))) as typeof window.scrollBy
})

afterEach(() => {
  document.body.innerHTML = ''
  // 用例直接在 document 上桩命中测试，还原为 jsdom 原状（未实现）
  Reflect.deleteProperty(document, 'elementFromPoint')
  Reflect.deleteProperty(document, 'elementsFromPoint')
})

const contextFor = (refs: HTMLElement[]) =>
  ({
    resolveRefOrError: async (_action: string, index: number) => ({ ok: true, el: refs[index] }),
    buildBrowserStateResponse: async () => ({ content: [{ type: 'text' as const, text: '{"content":"state"}' }] }),
    errContent: async (msg: string) => ({ content: [{ type: 'text' as const, text: msg }] })
  }) as unknown as ActionContext

describe('handleScroll - 内容在内部滚动容器里', () => {
  it('复现：编号指向容器里的一行；步骤 scroll(index=行)；期望滚动它最近的可滚动祖先并注明容器', async () => {
    const box = makeScrollable(document.createElement('div'))
    box.setAttribute('aria-label', '工单')
    const row = document.createElement('p')
    row.textContent = '工单 #4031'
    box.append(row)
    document.body.append(box)

    const res = await handleScroll({ index: 0, down: true, pixels: 300 }, contextFor([row]))

    expect(box.scrollTop).toBe(300)
    expect(res.content[0].text).toContain('垂直滚动 300px')
    expect(res.content[0].text).toContain('滚动的是所在容器 <div>')
  })

  it('复现：body 不能滚动、内容在面板里；步骤 scroll 不带编号；期望滚动视口中央所在的可滚动容器', async () => {
    const box = makeScrollable(document.createElement('div'))
    box.id = 'feed'
    const row = document.createElement('p')
    box.append(row)
    document.body.append(box)
    document.elementsFromPoint = () => [row]

    const res = await handleScroll({ down: true, pixels: 300 }, contextFor([]))

    expect(box.scrollTop).toBe(300)
    expect(res.content[0].text).toContain('垂直滚动 300px')
    expect(res.content[0].text).toContain('页面本身不能滚动')
    expect(res.content[0].text).toContain('#feed')
  })

  it('视口中央最上层是 SDK 操作遮罩时，滚动遮罩下面那一行所在的容器，不按面积另选容器', async () => {
    const feed = makeScrollable(document.createElement('div'), { scrollHeight: 2000, clientHeight: 200 })
    feed.id = 'feed'
    const row = document.createElement('p')
    feed.append(row)
    const sidebar = makeScrollable(document.createElement('div'), { scrollHeight: 5000, clientHeight: 600 })
    sidebar.id = 'sidebar'
    const mask = document.createElement('div')
    mask.id = 'page-agent-runtime_simulator-mask'
    document.body.append(feed, sidebar, mask)
    document.elementFromPoint = () => mask
    document.elementsFromPoint = () => [mask, row, feed]

    const res = await handleScroll({ down: true, pixels: 300 }, contextFor([]))

    expect(feed.scrollTop).toBe(300)
    expect(sidebar.scrollTop).toBe(0)
    expect(res.content[0].text).toContain('#feed')
  })

  it('视口中央不在任何滚动容器内时，滚动视口里可见面积最大的可滚动容器', async () => {
    const small = makeScrollable(document.createElement('div'), { scrollHeight: 500, clientHeight: 100 })
    const large = makeScrollable(document.createElement('div'))
    small.getBoundingClientRect = () => new DOMRect(0, 0, 300, 100)
    large.getBoundingClientRect = () => new DOMRect(0, 120, 800, 200)
    const blank = document.createElement('p')
    document.body.append(small, large, blank)
    document.elementsFromPoint = () => [blank]

    const res = await handleScroll({ down: true, pixels: 300 }, contextFor([]))

    expect(large.scrollTop).toBe(300)
    expect(small.scrollTop).toBe(0)
    expect(res.content[0].text).toContain('垂直滚动 300px')
  })

  it('numPages 按实际滚动容器的可视高度换算', async () => {
    const box = makeScrollable(document.createElement('div'), { scrollHeight: 2000, clientHeight: 200 })
    const row = document.createElement('p')
    box.append(row)
    document.body.append(box)

    await handleScroll({ index: 0, down: true, numPages: 1 }, contextFor([row]))

    expect(box.scrollTop).toBe(200)
  })

  it('页面上没有任何可滚动区域时，如实返回已到达底部', async () => {
    const p = document.createElement('p')
    document.body.append(p)
    document.elementsFromPoint = () => [p]

    const res = await handleScroll({ down: true, pixels: 300 }, contextFor([]))

    expect(res.content[0].text).toContain('已到达底部')
  })

})

describe('handleScroll - percent 跳到指定位置', () => {
  it('percent 直接跳到容器的指定位置，不需要方向参数，结果报告当前位置的百分比', async () => {
    const box = makeScrollable(document.createElement('div'))
    box.scrollTo = function (this: HTMLElement, opts?: ScrollToOptions | number) {
      this.scrollTop = typeof opts === 'object' ? (opts.top ?? 0) : 0
      queueMicrotask(() => this.dispatchEvent(new Event('scrollend')))
    } as Element['scrollTo']
    const row = document.createElement('p')
    box.append(row)
    document.body.append(box)

    const res = await handleScroll({ index: 0, percent: 74 }, contextFor([row]))

    // (scrollHeight 2000 - clientHeight 200) × 74% = 1332
    expect(box.scrollTop).toBe(1332)
    expect(res.content[0].text).toContain('垂直滚动 1332px')
    expect(res.content[0].text).toContain('位置 74%')
  })
  it('没有可以原生滚动的页面或容器时，不报已到达底部，说明无法按百分比定位', async () => {
    const plain = document.createElement('div')
    plain.style.overflowY = 'hidden'
    document.body.append(plain)
    document.elementsFromPoint = () => [plain]

    const res = await handleScroll({ percent: 75 }, contextFor([]))

    expect(res.content[0].text).not.toContain('已到达底部')
    expect(res.content[0].text).toContain('没有可按百分比定位的滚动区域')
  })

  it('普通滚动的结果也附带当前位置的百分比', async () => {
    const box = makeScrollable(document.createElement('div'))
    const row = document.createElement('p')
    box.append(row)
    document.body.append(box)

    const res = await handleScroll({ index: 0, down: true, pixels: 450 }, contextFor([row]))

    // 450 / (2000 - 200) = 25%
    expect(res.content[0].text).toContain('位置 25%')
  })
})
