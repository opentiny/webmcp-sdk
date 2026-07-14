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
