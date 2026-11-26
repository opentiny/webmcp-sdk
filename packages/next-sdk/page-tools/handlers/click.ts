import { clickElement } from '@page-agent/page-controller'
import { beginAction } from '../utils/network'
import { REF_ACTION_LABELS, type ActionContext } from '../context'

export async function handleClick(args: any, ctx: ActionContext) {
  const mode = args.responseMode ?? 'diff'
  if (args.index === undefined) return ctx.actionError(`${REF_ACTION_LABELS.click}结果: 缺少元素索引`)
  const resolved = await ctx.resolveRefOrError('click', args.index)
  if (!resolved.ok) return resolved.error
  const el = resolved.el

  // 若 ref 指向 shadow host，解析其内部真正的可点击元素
  let targetEl = el as HTMLElement
  if (el.shadowRoot && !(el instanceof HTMLButtonElement) && !(el instanceof HTMLAnchorElement)) {
    const innerClickable = el.shadowRoot.querySelector(
      'button, a, [role="button"], [role="link"]'
    ) as HTMLElement | null
    if (innerClickable) {
      targetEl = innerClickable
    }
  }
  const action = beginAction()
  await clickElement(targetEl)
  // 等待动作期间发起的请求返回、框架异步插入的内容稳定后再采集状态
  await action.settle()
  // 操作成功后自动返回 diff/both/full
  return ctx.buildBrowserStateResponse(mode)
}
