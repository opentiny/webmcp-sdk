import { selectOptionElement } from '@page-agent/page-controller'
import { dispatchComposedEvents, isInShadowDom, waitForDomSettled } from '../utils/dom'
import type { ActionContext } from '../context'

export async function handleSelect(args: any, ctx: ActionContext) {
  const mode = args.responseMode ?? 'diff'
  if (args.index === undefined || typeof args.text !== 'string') return ctx.errContent('选择结果: 缺少元素索引或文本内容')
  let el = ctx.getRefMap().get(args.index) as HTMLSelectElement | HTMLElement | undefined
  if (!el) return ctx.refreshOnStaleRef('选择', args.index)
  // 若 ref 指向 shadow host，解析其内部真正的 <select>（与 fill 一致）
  let targetSelect: HTMLSelectElement | null = null
  if (el instanceof HTMLSelectElement) {
    targetSelect = el
  } else {
    const innerSelect = el.querySelector('select')
      ?? (el.shadowRoot?.querySelector('select') as HTMLSelectElement | null)
    if (innerSelect) {
      targetSelect = innerSelect
    }
  }

  if (!targetSelect) {
    return ctx.errContent(`选择结果: 无法选择元素 ${args.index}，未找到对应的 <select> 元素`)
  }

  await selectOptionElement(targetSelect, args.text)
  // shadow DOM 内元素：补发 composed:true 的 change 事件
  if (isInShadowDom(targetSelect)) {
    dispatchComposedEvents(targetSelect, 'change')
  }
  // 等待框架异步插入的校验错误/条件渲染内容稳定后再采集状态
  await waitForDomSettled()
  return ctx.buildBrowserStateResponse(mode)
}
