import type { RefMap } from '../a11y-tree'
import { computeLabelPosition } from './label-placement'
import {
  PAGE_AGENT_HIGHLIGHT_CONTAINER_ID,
  PAGE_AGENT_HIGHLIGHT_Z_INDEX,
  type ResolvedPageAgentHighlightOptions,
} from './highlight-config'

interface OverlayGroup {
  element: HTMLElement
  overlays: HTMLDivElement[]
  label: HTMLDivElement | null
}

function toHexOpacity(opacity: number): string {
  return Math.floor(opacity * 255).toString(16).padStart(2, '0')
}

function throttle<T extends (...args: unknown[]) => void>(func: T, delay: number): T {
  let lastCall = 0
  return ((...args: unknown[]) => {
    const now = performance.now()
    if (now - lastCall < delay) return
    lastCall = now
    func(...args)
  }) as T
}

export class HighlightRenderer {
  private container: HTMLDivElement | null = null
  private groups: OverlayGroup[] = []
  private readonly onWindowChange: () => void

  constructor(private config: ResolvedPageAgentHighlightOptions) {
    this.onWindowChange = throttle(() => this.updatePositions(), 16)
  }

  updateConfig(config: ResolvedPageAgentHighlightOptions) {
    this.config = config
  }

  private ensureContainer(): HTMLDivElement {
    let container = document.getElementById(PAGE_AGENT_HIGHLIGHT_CONTAINER_ID) as HTMLDivElement | null
    if (!container) {
      container = document.createElement('div')
      container.id = PAGE_AGENT_HIGHLIGHT_CONTAINER_ID
      container.style.position = 'fixed'
      container.style.pointerEvents = 'none'
      container.style.top = '0'
      container.style.left = '0'
      container.style.width = '100%'
      container.style.height = '100%'
      container.style.zIndex = String(PAGE_AGENT_HIGHLIGHT_Z_INDEX)
      container.style.backgroundColor = 'transparent'
      container.setAttribute('data-browser-use-ignore', 'true')
      container.setAttribute('data-page-agent-ignore', 'true')
      container.setAttribute('aria-hidden', 'true')
      document.body.appendChild(container)
    }
    this.container = container
    return container
  }

  render(refMap: RefMap) {
    if (!this.config.enabled) {
      this.clear()
      return
    }

    this.clearOverlaysOnly()
    const container = this.ensureContainer()
    const fragment = document.createDocumentFragment()
    let rendered = 0

    // 收集候选元素：按 DOM 深度降序（深层控件优先），再按面积升序（小控件优先）
    const candidates: Array<{ ref: number; element: HTMLElement; rects: DOMRect[]; depth: number }> = []

    for (const [ref, element] of refMap.entries()) {
      if (!this.isVisible(element)) continue
      const rects = this.getVisibleRects(element)
      if (rects.length === 0) continue
      candidates.push({ ref, element, rects, depth: this.getDomDepth(element) })
    }

    candidates.sort((a, b) => {
      if (b.depth !== a.depth) return b.depth - a.depth
      const aArea = a.rects[0].width * a.rects[0].height
      const bArea = b.rects[0].width * b.rects[0].height
      return aArea - bArea
    })

    // 渲染：跳过已渲染子节点的祖先容器（避免框套框）
    const acceptedElements: HTMLElement[] = []
    for (const { ref, element, rects } of candidates) {
      if (rendered >= this.config.maxElements) break
      // 如果已有某个被接受的元素是当前元素的子节点，说明当前是冗余的父容器
      if (acceptedElements.some(accepted => this.composedContains(element, accepted))) continue

      const color = this.config.colors[ref % this.config.colors.length]
      const borderColor = `${color}${toHexOpacity(this.config.highlightLabelOpacity)}`
      const bgColor = `${color}${toHexOpacity(this.config.highlightOpacity)}`

      const overlays: HTMLDivElement[] = []
      if (this.config.showBorder) {
        for (const rect of rects) {
          const overlay = document.createElement('div')
          overlay.style.cssText = [
            'position:fixed',
            `border:${this.config.borderWidth}px solid ${borderColor}`,
            `background-color:${bgColor}`,
            'pointer-events:none',
            'box-sizing:border-box',
            `top:${rect.top}px`,
            `left:${rect.left}px`,
            `width:${rect.width}px`,
            `height:${rect.height}px`,
          ].join(';')
          fragment.appendChild(overlay)
          overlays.push(overlay)
        }
      }

      let label: HTMLDivElement | null = null
      if (this.config.showLabel) {
        const firstRect = rects[0]
        label = document.createElement('div')
        label.style.cssText = [
          'position:fixed',
          `background:${borderColor}`,
          'color:#FFFFFF',
          'padding:1px 4px',
          'border-radius:4px',
          `font-size:${Math.min(12, Math.max(8, firstRect.height / 2))}px`,
          'line-height:1.2',
          'font-weight:600',
          'white-space:nowrap',
        ].join(';')
        label.textContent = `#${ref}`
        fragment.appendChild(label)

        // label 先加入 DOM 才能测量宽高
        container.appendChild(fragment)
        const labelRect = label.getBoundingClientRect()
        const pos = computeLabelPosition(
          firstRect,
          labelRect.width || 20,
          labelRect.height || 16,
          window.innerWidth,
          window.innerHeight,
        )
        label.style.top = `${pos.top}px`
        label.style.left = `${pos.left}px`
        // 重置 fragment（已 appendChild，后续继续用新 fragment）
      }

      this.groups.push({ element, overlays, label })
      acceptedElements.push(element)
      rendered++
    }

    // 若 label 测量时已 appendChild，这里只追加剩余节点（幂等）
    if (fragment.childNodes.length > 0) {
      container.appendChild(fragment)
    }

    window.addEventListener('scroll', this.onWindowChange, true)
    window.addEventListener('resize', this.onWindowChange)
  }

  private clearOverlaysOnly() {
    for (const group of this.groups) {
      for (const overlay of group.overlays) overlay.remove()
      group.label?.remove()
    }
    this.groups = []
    window.removeEventListener('scroll', this.onWindowChange, true)
    window.removeEventListener('resize', this.onWindowChange)
  }

  private updatePositions() {
    for (const group of this.groups) {
      const visible = this.isVisible(group.element)
      const rects = visible ? this.getVisibleRects(group.element) : []

      for (let i = 0; i < group.overlays.length; i++) {
        const rect = rects[i]
        if (!rect) {
          group.overlays[i].style.display = 'none'
          continue
        }
        const s = group.overlays[i].style
        s.display = 'block'
        s.top = `${rect.top}px`
        s.left = `${rect.left}px`
        s.width = `${rect.width}px`
        s.height = `${rect.height}px`
      }

      if (group.label) {
        const firstRect = rects[0]
        if (!firstRect) {
          group.label.style.display = 'none'
          continue
        }
        group.label.style.display = 'block'
        const labelRect = group.label.getBoundingClientRect()
        const pos = computeLabelPosition(
          firstRect,
          labelRect.width || 20,
          labelRect.height || 16,
          window.innerWidth,
          window.innerHeight,
        )
        group.label.style.top = `${pos.top}px`
        group.label.style.left = `${pos.left}px`
      }
    }
  }

  clear() {
    this.clearOverlaysOnly()
    this.container?.remove()
    this.container = null
  }

  /** 基于 CSS 属性和中心点遮挡判断元素是否可见 */
  private isVisible(element: HTMLElement): boolean {
    if (!element.isConnected) return false
    if (element.getAttribute('aria-hidden') === 'true') return false
    if (element.hasAttribute('hidden') || element.hasAttribute('inert')) return false
    if (element instanceof HTMLInputElement && element.type === 'hidden') return false
    if ((element as HTMLInputElement).disabled) return false
    if (element.getAttribute('aria-disabled') === 'true') return false
    try {
      const style = window.getComputedStyle(element)
      if (style.display === 'none' || style.visibility === 'hidden') return false
      if (Number.parseFloat(style.opacity || '1') <= 0.01) return false
    } catch {
      return false
    }

    // 遮挡检查
    const rects = element.getClientRects()
    if (rects.length === 0) return false
    const rect = rects[0]
    
    // 如果元素的宽或高小于配置的最小值，提前过滤
    if (rect.width < this.config.minWidth || rect.height < this.config.minHeight) return false

    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2

    // 视口检查
    if (centerX < 0 || centerX >= window.innerWidth || centerY < 0 || centerY >= window.innerHeight) {
      return false
    }

    // 检测中心点遮挡 (处理遮罩层、不可见 tab、overflow:hidden 溢出等)
    let topEl = document.elementFromPoint(centerX, centerY)
    if (topEl) {
      // 穿透 ShadowDOM
      while (topEl.shadowRoot) {
        const shadowEl = topEl.shadowRoot.elementFromPoint(centerX, centerY)
        if (!shadowEl || shadowEl === topEl) break
        topEl = shadowEl
      }

      // 如果中心点所在的顶层元素是当前元素本身或其子代节点，则可见
      if (topEl === element || this.composedContains(element, topEl)) {
        return true
      }

      // 处理元素本身 pointer-events: none 的情况，此时 elementFromPoint 会穿透它
      try {
        const style = window.getComputedStyle(element)
        if (style.pointerEvents === 'none' && this.composedContains(topEl, element)) {
          return true
        }
      } catch {}

      // 有些 UI 组件会用绝对定位的 label 盖住 input
      if (topEl.tagName.toLowerCase() === 'label' && (topEl as HTMLLabelElement).htmlFor === element.id) {
        return true
      }

      // 否则认为被遮挡
      return false
    }

    return true
  }

  /** 判断跨 Shadow DOM 的包含关系 */
  private composedContains(parent: Element, child: Element): boolean {
    if (parent.contains(child)) return true
    let cur: Node | null = child
    while (cur) {
      if (cur === parent) return true
      if (cur instanceof ShadowRoot) {
        cur = cur.host
      } else {
        cur = cur.parentNode
      }
    }
    return false
  }

  /** 返回在视口内且满足最小尺寸的 rects */
  private getVisibleRects(element: HTMLElement): DOMRect[] {
    return Array.from(element.getClientRects()).filter((rect) => {
      if (rect.width < this.config.minWidth || rect.height < this.config.minHeight) return false
      if (rect.width * rect.height < this.config.minArea) return false
      return rect.bottom > 0 && rect.top < window.innerHeight
        && rect.right > 0 && rect.left < window.innerWidth
    })
  }

  private getDomDepth(element: HTMLElement): number {
    let depth = 0
    let cur: Node | null = element
    while (cur && cur !== document.body) {
      depth++
      if (cur instanceof ShadowRoot) {
        cur = cur.host
      } else {
        cur = cur.parentNode
      }
    }
    return depth
  }
}
