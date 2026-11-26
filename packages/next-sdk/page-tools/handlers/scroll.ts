import {
  describeScrollContainer,
  findLargestScrollContainer,
  findScrollableAncestor,
  getScrollInfo,
  waitForScrollEnd
} from '../utils/scroll'
import { REF_ACTION_LABELS, withStateFields, type ActionContext } from '../context'

export async function handleScroll(args: any, ctx: ActionContext) {
  const mode = args.responseMode ?? 'diff'
  if (args.down === undefined && args.right === undefined)
    return ctx.errContent(`${REF_ACTION_LABELS.scroll}结果: 缺少滚动方向参数`)

  // 确定滚动目标：有 index 时滚动该元素或其最近的可滚动祖先；没有 index 且文档本身不能沿该方向滚动时，
  // 改为滚动视口中央所在的可滚动容器（后台管理布局、聊天窗口常把 body 设为 overflow:hidden，内容在内部面板里滚动）
  const vertical = args.right === undefined
  const forward = vertical ? args.down : args.right
  let scrollTarget: Element | Window = window
  let containerNote = ''
  if (args.index !== undefined) {
    const resolved = await ctx.resolveRefOrError('scroll', args.index)
    if (!resolved.ok) return resolved.error
    scrollTarget = findScrollableAncestor(resolved.el, vertical) ?? window
    if (scrollTarget !== window && scrollTarget !== resolved.el)
      containerNote = `（滚动的是所在容器 ${describeScrollContainer(scrollTarget as Element)}）`
  } else {
    const page = getScrollInfo(window)
    const pageCanMove = vertical ? (forward ? !page.atBottom : !page.atTop) : forward ? !page.atRight : !page.atLeft
    if (!pageCanMove) {
      const center = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2)
      const container = findScrollableAncestor(center, vertical) ?? findLargestScrollContainer(vertical)
      if (container) {
        scrollTarget = container
        containerNote = `（页面本身不能滚动，已滚动容器 ${describeScrollContainer(container)}）`
      }
    }
  }
  const pageSize = scrollTarget === window ? window.innerHeight : (scrollTarget as Element).clientHeight

  // 滚动前快照
  const before = getScrollInfo(scrollTarget)

  if (args.right !== undefined) {
    const pixels = args.pixels ?? 300
    scrollTarget.scrollBy({ left: args.right ? pixels : -pixels, behavior: 'smooth' })
  } else {
    const pixels = args.pixels ?? Math.round((args.numPages ?? 1) * pageSize)
    scrollTarget.scrollBy({ top: args.down ? pixels : -pixels, behavior: 'smooth' })
  }

  // 等待滚动动画完成后再采集状态（scrollend + 超时兜底）
  await waitForScrollEnd(scrollTarget)

  // 滚动后快照，计算实际位移
  const after = getScrollInfo(scrollTarget)
  const deltaY = Math.round(after.scrollY - before.scrollY)
  const deltaX = Math.round(after.scrollX - before.scrollX)
  const isHorizontal = args.right !== undefined

  let scrollMsg: string
  if (Math.abs(deltaY) < 1 && Math.abs(deltaX) < 1) {
    // 实际未发生位移，说明已到达边界
    if (isHorizontal) {
      scrollMsg = args.right ? '⚠️ 已到达右边界，无法继续向右滚动' : '⚠️ 已到达左边界，无法继续向左滚动'
    } else {
      scrollMsg = args.down ? '⚠️ 已到达底部，无法继续向下滚动' : '⚠️ 已到达顶部，无法继续向上滚动'
    }
    scrollMsg += containerNote
  } else {
    const axis = isHorizontal ? `水平滚动 ${deltaX}px` : `垂直滚动 ${deltaY}px`
    let boundary = ''
    if (isHorizontal) {
      if (args.right && after.atRight) boundary = '，已到达右边界'
      else if (!args.right && after.atLeft) boundary = '，已到达左边界'
    } else {
      if (args.down && after.atBottom) boundary = '，已到达底部'
      else if (!args.down && after.atTop) boundary = '，已到达顶部'
    }
    scrollMsg = `✅ ${axis}${boundary}${containerNote}`
  }

  // 附加位置信息（参考 page-agent getPageInfo 格式）
  const posInfo = args.right !== undefined
    ? `当前水平滚动位置: scrollX=${Math.round(after.scrollX)}px，左侧 ${after.pagesAbove.toFixed(1)} 屏，右侧 ${after.pagesBelow.toFixed(1)} 屏`
    : `当前滚动位置: scrollY=${Math.round(after.scrollY)}px，上方 ${after.pagesAbove.toFixed(1)} 屏，下方 ${after.pagesBelow.toFixed(1)} 屏`
  const scrollResult = `[滚动结果] ${scrollMsg}\n${posInfo}`

  const stateResult = await ctx.buildBrowserStateResponse(mode)
  stateResult.content[0].text = withStateFields(stateResult.content[0].text, { scrollResult })
  return stateResult
}
