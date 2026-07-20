import { waitForDomSettled } from '../utils/dom'
import type { ActionContext } from '../context'
import type { PageAgentToolInput } from '../schema'

export async function handleHover(args: PageAgentToolInput, ctx: ActionContext) {
  if (args.index === undefined) return ctx.errContent('悬浮结果: 缺少元素索引')
  const el = ctx.getRefMap().get(args.index)
  if (!el) return ctx.refreshOnStaleRef('悬浮', args.index)

  // 若 ref 指向 shadow host，解析其内部真正的可交互元素
  let targetEl = el as HTMLElement
  if (el.shadowRoot && !(el instanceof HTMLButtonElement) && !(el instanceof HTMLAnchorElement)) {
    const innerClickable = el.shadowRoot.querySelector(
      'button, a, [role="button"], [role="link"]'
    ) as HTMLElement | null
    if (innerClickable) {
      targetEl = innerClickable
    }
  }

  // 获取元素中心坐标，用于生成符合真实指针位置的事件
  const rect = targetEl.getBoundingClientRect()
  const cx = rect.left + rect.width / 2
  const cy = rect.top + rect.height / 2

  // 派发 hover 事件序列：pointer + mouse，覆盖主流框架（Angular/React/Vue）的 hover 监听
  const eventSequence: Array<{ type: string; bubbles: boolean; usePointer: boolean }> = [
    { type: 'pointerenter', bubbles: false, usePointer: true },
    { type: 'pointerover', bubbles: true, usePointer: true },
    { type: 'pointermove', bubbles: true, usePointer: true },
    { type: 'mouseenter', bubbles: false, usePointer: false },
    { type: 'mouseover', bubbles: true, usePointer: false },
    { type: 'mousemove', bubbles: true, usePointer: false },
  ]

  for (const { type, bubbles, usePointer } of eventSequence) {
    const EventClass = usePointer ? PointerEvent : MouseEvent
    targetEl.dispatchEvent(new EventClass(type, {
      bubbles,
      cancelable: true,
      view: window,
      clientX: cx,
      clientY: cy,
    }))
  }

  // 等待框架异步插入 tooltip / 悬浮菜单等内容稳定
  await waitForDomSettled()

  const mode = (args.responseMode as 'full' | 'diff' | 'both') ?? 'diff'

  // 重建 A11y 树；tooltips / dialogs / validationErrors 已平铺进 browserState 的 stateObj
  return ctx.buildBrowserStateResponse(mode)
}
