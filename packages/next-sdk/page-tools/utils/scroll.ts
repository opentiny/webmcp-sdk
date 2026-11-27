// ─── 辅助：获取滚动目标的当前位置信息（仿 page-agent getPageInfo）────────
// 同时支持 window（文档滚动）和任意 Element（容器滚动）
export function getScrollInfo(target: Window | Element = window) {
  if (target === window) {
    const pageHeight = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight)
    const pageWidth = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth)
    const scrollY = window.scrollY
    const scrollX = window.scrollX
    const pixelsBelow = Math.max(0, pageHeight - (window.innerHeight + scrollY))
    const pixelsRight = Math.max(0, pageWidth - (window.innerWidth + scrollX))
    return {
      scrollY, scrollX,
      pixelsAbove: scrollY, pixelsBelow,
      pixelsLeft: scrollX, pixelsRight,
      pagesAbove: window.innerHeight > 0 ? scrollY / window.innerHeight : 0,
      pagesBelow: window.innerHeight > 0 ? pixelsBelow / window.innerHeight : 0,
      atTop: scrollY <= 1,
      atBottom: pixelsBelow <= 1,
      atLeft: scrollX <= 1,
      atRight: pixelsRight <= 1,
    }
  } else {
    const el = target as Element
    const scrollTop = el.scrollTop
    const scrollLeft = el.scrollLeft
    const pixelsBelow = el.scrollHeight - el.clientHeight - scrollTop
    const pixelsRight = el.scrollWidth - el.clientWidth - scrollLeft
    return {
      scrollY: scrollTop, scrollX: scrollLeft,
      pixelsAbove: scrollTop, pixelsBelow: Math.max(0, pixelsBelow),
      pixelsLeft: scrollLeft, pixelsRight: Math.max(0, pixelsRight),
      pagesAbove: el.clientHeight > 0 ? scrollTop / el.clientHeight : 0,
      pagesBelow: el.clientHeight > 0 ? Math.max(0, pixelsBelow) / el.clientHeight : 0,
      atTop: scrollTop <= 1,
      atBottom: pixelsBelow <= 1,
      atLeft: scrollLeft <= 1,
      atRight: pixelsRight <= 1,
    }
  }
}

// 等待 smooth scroll 结束：优先监听 scrollend，超时兜底（边界无位移时 scrollend 可能不触发）
export function waitForScrollEnd(target: Window | Element, timeout = 2000): Promise<void> {
  return new Promise((resolve) => {
    let settled = false
    const el = target === window ? document : (target as Element)
    const finish = () => {
      if (settled) return
      settled = true
      el.removeEventListener('scrollend', onScrollEnd)
      clearTimeout(timer)
      resolve()
    }
    const onScrollEnd = () => finish()
    const timer = setTimeout(finish, timeout)
    el.addEventListener('scrollend', onScrollEnd, { once: true })
  })
}

function canScroll(el: Element, vertical: boolean): boolean {
  // 先比较尺寸再取计算样式：快照遍历每个元素都会调用，多数元素内容不超出
  if (vertical ? el.scrollHeight <= el.clientHeight + 1 : el.scrollWidth <= el.clientWidth + 1) return false
  const view = el.ownerDocument.defaultView ?? window
  const style = view.getComputedStyle(el)
  return /(auto|scroll|overlay)/.test(vertical ? style.overflowY : style.overflowX)
}

/**
 * 快照中可滚动区域的 token，如 `scrollable="上方 1.0 屏，下方 3.0 屏"`；不能滚动时返回 undefined。
 * 文档本身的滚动位置由 scroll 结果报告，不在这里标出。
 */
export function scrollContainerToken(el: Element): string | undefined {
  if (el === el.ownerDocument.body || el === el.ownerDocument.documentElement) return undefined
  const vertical = canScroll(el, true)
  if (!vertical && !canScroll(el, false)) return undefined
  const info = getScrollInfo(el)
  const parts = vertical
    ? [`上方 ${info.pagesAbove.toFixed(1)} 屏`, `下方 ${info.pagesBelow.toFixed(1)} 屏`]
    : [
        `左侧 ${(el.clientWidth > 0 ? info.pixelsLeft / el.clientWidth : 0).toFixed(1)} 屏`,
        `右侧 ${(el.clientWidth > 0 ? info.pixelsRight / el.clientWidth : 0).toFixed(1)} 屏`
      ]
  return `scrollable="${parts.join('，')}"`
}

// SDK 自己的操作遮罩与高亮层盖在页面最上层，命中测试要跳过它们
const SDK_OVERLAY_SELECTOR = '#page-agent-runtime_simulator-mask, #webmcpcli-highlight-container'

/** 坐标处最上层的页面元素，跳过 SDK 遮罩与高亮层 */
export function pageElementFromPoint(x: number, y: number): Element | null {
  return document.elementsFromPoint(x, y).find((el) => !el.closest(SDK_OVERLAY_SELECTOR)) ?? null
}

/**
 * 从 el 自身开始向上找能沿指定方向滚动的元素，穿过 shadow root 边界。
 * 到达 body / html 仍未找到时返回 null，由调用方滚动 window。
 */
export function findScrollableAncestor(el: Element | null, vertical: boolean): Element | null {
  let cur = el
  while (cur && cur !== cur.ownerDocument.body && cur !== cur.ownerDocument.documentElement) {
    if (canScroll(cur, vertical)) return cur
    cur = cur.parentElement ?? ((cur.getRootNode() as ShadowRoot).host ?? null)
  }
  return null
}

/** 用于滚动结果文案：标签名 + id / aria-label，便于模型知道实际滚动的是哪个区域 */
export function describeScrollContainer(el: Element): string {
  const label = el.getAttribute('aria-label')
  return `<${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}>${label ? ` "${label}"` : ''}`
}

/** 视口内可见面积最大、能沿指定方向滚动的元素；中心点不在任何滚动容器内时的回落 */
export function findLargestScrollContainer(vertical: boolean): Element | null {
  let best: Element | null = null
  let bestArea = 0
  for (const el of document.body.querySelectorAll('*')) {
    // 先用布局尺寸粗筛，避免对每个元素取计算样式
    if (vertical ? el.scrollHeight <= el.clientHeight + 1 : el.scrollWidth <= el.clientWidth + 1) continue
    if (!canScroll(el, vertical)) continue
    const r = el.getBoundingClientRect()
    const w = Math.min(r.right, window.innerWidth) - Math.max(r.left, 0)
    const h = Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0)
    const area = w > 0 && h > 0 ? w * h : 0
    if (area > bestArea) {
      best = el
      bestArea = area
    }
  }
  return best
}
