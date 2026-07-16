import { type RefMap } from '../a11y-tree'

export const HIGHLIGHT_CONTAINER_ID = 'webmcpcli-highlight-container'
export const HIGHLIGHT_CONTAINER_STYLE_ID = 'webmcpcli-highlight-container-style'
const colors = [
  '#FF0000',
  '#00FF00',
  '#0000FF',
  '#FFA500',
  '#800080',
  '#008080',
  '#FF69B4',
  '#4B0082',
  '#FF4500',
  '#2E8B57',
  '#DC143C',
  '#4682B4'
]
// border + label opacity
const opacity = Math.floor(0.3 * 255)
  .toString(16)
  .padStart(2, '0')

const injectStyles = `
      #${HIGHLIGHT_CONTAINER_ID} {
        position: fixed;
        pointer-events: none;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 2147483640;
        background-color: transparent;
      }

      #${HIGHLIGHT_CONTAINER_ID} div {
        position: fixed;
        pointer-events: none;
        background-color: transparent;
        text-align: right;
        box-sizing: border-box;
        border-radius: 4px;
      }

      #${HIGHLIGHT_CONTAINER_ID} div span {
        display: inline-block;
        color: #fff;
        padding: 0 2px;
        border-radius: 4px;
      }
  `

/** 图标热区回退时父节点宽高上限，避免用到整行容器 */
const MAX_ICON_FALLBACK_SIZE = 48

export type HighlightRect = { top: number; left: number; width: number; height: number }

/**
 * 解析高亮矩形。
 * Tiny3 `ti-icon` / `tp-icon` 字形常画在 ::before 上，宿主 getBoundingClientRect 宽或高为 0，
 * 旧逻辑直接跳过导致帮助中心关闭/全屏等图标有 ref 却不高亮。
 */
export function resolveHighlightRect(el: HTMLElement): HighlightRect | null {
  const rect = el.getBoundingClientRect()
  if (rect.width > 0 && rect.height > 0) {
    return { top: rect.top, left: rect.left, width: rect.width, height: rect.height }
  }

  // 优先用紧凑父节点（帮助中心 header 图标外包 28×28 的可点区域）
  let parent: HTMLElement | null = el.parentElement
  for (let depth = 0; depth < 3 && parent; depth++) {
    const pr = parent.getBoundingClientRect()
    if (
      pr.width > 0 &&
      pr.height > 0 &&
      pr.width <= MAX_ICON_FALLBACK_SIZE &&
      pr.height <= MAX_ICON_FALLBACK_SIZE
    ) {
      return { top: pr.top, left: pr.left, width: pr.width, height: pr.height }
    }
    parent = parent.parentElement
  }

  // 单边有尺寸时，用 font-size 补齐另一边
  if (rect.width > 0 || rect.height > 0) {
    try {
      const fs = parseFloat(getComputedStyle(el).fontSize) || 16
      const width = rect.width > 0 ? rect.width : fs
      const height = rect.height > 0 ? rect.height : fs
      return {
        top: rect.height > 0 ? rect.top : rect.top - (height - rect.height) / 2,
        left: rect.width > 0 ? rect.left : rect.left - (width - rect.width) / 2,
        width,
        height,
      }
    } catch {
      /* ignore */
    }
  }

  return null
}

/** 与视口有交集即可（侧栏轻微负 left、贴边控件不应被整框剔除） */
function isRectInViewport(rect: HighlightRect): boolean {
  const vh = window.innerHeight || document.documentElement.clientHeight
  const vw = window.innerWidth || document.documentElement.clientWidth
  return rect.top < vh && rect.top + rect.height > 0 && rect.left < vw && rect.left + rect.width > 0
}

const doHighlight = (refMap: RefMap, parentIframe: HTMLIFrameElement | null = null) => {
  // 1、保证注入脚本
  if (!document.head.querySelector(`#${HIGHLIGHT_CONTAINER_STYLE_ID}`)) {
    const style = document.head.appendChild(document.createElement('style'))
    style.id = HIGHLIGHT_CONTAINER_STYLE_ID
    style.textContent = injectStyles
    document.head.appendChild(style)
  }

  // 2、保证contrainer( container 在 a11y 时已加入黑名单)
  let container = document.getElementById(HIGHLIGHT_CONTAINER_ID)
  if (!container) {
    container = document.createElement('div')
    container.id = HIGHLIGHT_CONTAINER_ID

    document.body.appendChild(container)
  } else {
    container.innerHTML = ''
  }

  let iframeOffset = { x: 0, y: 0 }
  if (parentIframe) {
    const iframeRect = parentIframe.getBoundingClientRect() // Keep getBoundingClientRect for iframe offset
    iframeOffset.x = iframeRect.left
    iframeOffset.y = iframeRect.top
  }
  const fragment = document.createDocumentFragment()

  // 3、 遍历 refMap
  for (const [index, el] of refMap.entries()) {
    const rect = resolveHighlightRect(el)
    if (!rect || !isRectInViewport(rect)) continue

    const color = colors[index % colors.length]
    const textColor = color + opacity

    const overlay = document.createElement('div')
    overlay.style.border = `2px solid ${textColor}`
    overlay.dataset.refIndex = String(index)

    const top = rect.top + iframeOffset.y
    const left = rect.left + iframeOffset.x

    overlay.style.top = `${top}px`
    overlay.style.left = `${left}px`
    overlay.style.width = `${rect.width}px`
    overlay.style.height = `${rect.height}px`

    // 文字
    const text = document.createElement('span')
    text.style.backgroundColor = textColor
    text.style.height = `${Math.max(rect.height - 4, 0)}px`
    text.style.lineHeight = `${Math.max(rect.height - 4, 0)}px`
    text.textContent = index.toString()
    overlay.appendChild(text)

    fragment.appendChild(overlay)
  }

  container.appendChild(fragment)
}

export const highlight = (refMap: RefMap, parentIframe: HTMLIFrameElement | null = null) => {
  doHighlight(refMap, parentIframe)

  // 4、监听滚动和resize事件，更新位置
  const updatePositions = () => doHighlight(refMap, parentIframe)
  const throttleFunction = (func: (...args: any[]) => void, delay: number) => {
    let lastCall = 0
    return (...args: any[]) => {
      const now = performance.now()
      if (now - lastCall < delay) return
      lastCall = now
      return func(...args)
    }
  }

  const throttledUpdatePositions = throttleFunction(updatePositions, 16)
  window.addEventListener('scroll', throttledUpdatePositions, true)
  window.addEventListener('resize', throttledUpdatePositions)

  const cleanupFn = () => {
    window.removeEventListener('scroll', throttledUpdatePositions, true)
    window.removeEventListener('resize', throttledUpdatePositions)
  }
  const win = window as any
  ;(win._highlightCleanupFunctions = win._highlightCleanupFunctions || []).push(cleanupFn)
}

/** 移除高亮， 可反复调用 */
export const unhighlight = () => {
  document.getElementById(HIGHLIGHT_CONTAINER_ID)?.remove()

  const cleanupFunctions = (window as any)._highlightCleanupFunctions || []
  for (const cleanup of cleanupFunctions) {
    if (typeof cleanup === 'function') {
      cleanup()
    }
  }

  ;(window as any)._highlightCleanupFunctions = []
}

/** 全局监听变化，随时准备移除高亮, 可反复调用 */
export const globalRemoveListener = () => {
  if ((window as any).__registerGlobalRemoveListener) return
  ;(window as any).__registerGlobalRemoveListener = true
  window.addEventListener('popstate', () => {
    unhighlight()
  })
  window.addEventListener('hashchange', () => {
    unhighlight()
  })
  window.addEventListener('beforeunload', () => {
    unhighlight()
  })

  const navigation = (window as any).navigation
  if (navigation && typeof navigation.addEventListener === 'function') {
    navigation.addEventListener('navigate', () => {
      unhighlight()
    })
  } else {
    // 定时器
    let currentUrl = window.location.href
    setInterval(() => {
      if (window.location.href !== currentUrl) {
        currentUrl = window.location.href
        unhighlight()
      }
    }, 500)
  }
}
