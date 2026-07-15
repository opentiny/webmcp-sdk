import { clickElement } from '@page-agent/page-controller'
import { waitForDomSettled } from '../utils/dom'
import type { ActionContext } from '../context'

export async function handleClick(args: any, ctx: ActionContext) {
  const mode = args.responseMode ?? 'diff'
  if (args.index === undefined) return ctx.actionError('点击结果: 缺少元素索引')
  const el = ctx.getRefMap().get(args.index)
  if (!el) {
    return ctx.actionError(
      `点击失败: ref 索引 ${args.index} 已失效（页面可能已刷新），已自动重新加载页面状态，请使用新的 ref 索引重试。`
    )
  }

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
  await clickElement(targetEl)
  // 等待框架异步插入的校验错误/条件渲染内容稳定后再采集状态
  await waitForDomSettled()
  // 操作成功后自动返回 diff/both/full
  return ctx.buildBrowserStateResponse(mode)
}
