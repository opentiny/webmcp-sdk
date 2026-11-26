import { selectOptionElement } from '@page-agent/page-controller'
import { dispatchComposedEvents, isInShadowDom } from '../utils/dom'
import { beginAction, withSettleNote } from '../utils/network'
import { REF_ACTION_LABELS, type ActionContext } from '../context'

export async function handleSelect(args: any, ctx: ActionContext) {
  const mode = args.responseMode ?? 'diff'
  if (args.index === undefined || typeof args.text !== 'string')
    return ctx.actionError(`${REF_ACTION_LABELS.select}结果: 缺少元素索引或文本内容`)
  const resolved = await ctx.resolveRefOrError('select', args.index)
  if (!resolved.ok) return resolved.error
  const el = resolved.el as HTMLSelectElement | HTMLElement
  // 若 ref 指向 shadow host，解析其内部真正的 <select>（与 fill 一致）
  let targetSelect: HTMLSelectElement | null = null
  if (el instanceof HTMLSelectElement) {
    targetSelect = el
  } else {
    const innerSelect =
      el.querySelector('select') ?? (el.shadowRoot?.querySelector('select') as HTMLSelectElement | null)
    if (innerSelect) {
      targetSelect = innerSelect
    }
  }

  if (!targetSelect) {
    return ctx.actionError(`${REF_ACTION_LABELS.select}结果: 无法选择元素 ${args.index}，未找到对应的 <select> 元素`)
  }

  const action = beginAction()
  await selectOptionElement(targetSelect, args.text)
  // shadow DOM 内元素：补发 composed:true 的 change 事件
  if (isInShadowDom(targetSelect)) {
    dispatchComposedEvents(targetSelect, 'change')
  }
  // 等待动作期间发起的请求返回、框架异步插入的内容稳定后再采集状态
  const settleNote = await action.settle()
  return withSettleNote(await ctx.buildBrowserStateResponse(mode), settleNote)
}
