import { buildElementMeta, formatElementMetaText } from './metadata'
import { DOM_INSPECT_UI_ATTR, type ElementMeta } from './types'

const BOX_ID = 'opentiny-dom-inspect-box'
const LABEL_ID = 'opentiny-dom-inspect-label'
const TOAST_ID = 'opentiny-dom-inspect-toast'
const STYLE_ID = 'opentiny-dom-inspect-style'

const ACCENT = '#3b82f6'

export type OverlayCopyOptions = {
  onCopied?: (text: string, meta: ElementMeta) => void
}

function ensureStyles(): void {
  if (document.getElementById(STYLE_ID)) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.setAttribute(DOM_INSPECT_UI_ATTR, '')
  style.textContent = `
    #${BOX_ID} {
      position: fixed;
      pointer-events: none;
      box-sizing: border-box;
      border: 2px solid ${ACCENT};
      z-index: 2147483646;
      background: rgba(59, 130, 246, 0.08);
    }
    #${LABEL_ID} {
      position: fixed;
      pointer-events: none;
      z-index: 2147483647;
      background: ${ACCENT};
      color: #fff;
      font: 12px/1.2 ui-sans-serif, system-ui, sans-serif;
      padding: 2px 6px;
      border-radius: 2px 2px 0 0;
      white-space: nowrap;
    }
    #${TOAST_ID} {
      position: fixed;
      z-index: 2147483647;
      right: 20px;
      bottom: 72px;
      background: rgba(15, 23, 42, 0.92);
      color: #fff;
      font: 13px/1.4 ui-sans-serif, system-ui, sans-serif;
      padding: 8px 14px;
      border-radius: 8px;
      pointer-events: none;
      box-shadow: 0 8px 20px rgba(15, 23, 42, 0.28);
    }
  `
  document.documentElement.appendChild(style)
}

function markUi(el: HTMLElement): void {
  el.setAttribute(DOM_INSPECT_UI_ATTR, '')
}

export class InspectOverlay {
  private box: HTMLDivElement | null = null
  private label: HTMLDivElement | null = null
  private toastEl: HTMLDivElement | null = null
  private toastTimer: ReturnType<typeof setTimeout> | null = null
  private labelResetTimer: ReturnType<typeof setTimeout> | null = null
  private selected: Element | null = null
  private hoverTarget: Element | null = null
  private copyOptions: OverlayCopyOptions = {}

  setCopyOptions(options: OverlayCopyOptions): void {
    this.copyOptions = options
  }

  mount(): void {
    ensureStyles()
    if (!this.box) {
      this.box = document.createElement('div')
      this.box.id = BOX_ID
      markUi(this.box)
      document.documentElement.appendChild(this.box)
    }
    if (!this.label) {
      this.label = document.createElement('div')
      this.label.id = LABEL_ID
      markUi(this.label)
      document.documentElement.appendChild(this.label)
    }
  }

  unmount(): void {
    this.hideToast()
    if (this.labelResetTimer) {
      clearTimeout(this.labelResetTimer)
      this.labelResetTimer = null
    }
    this.box?.remove()
    this.label?.remove()
    this.toastEl?.remove()
    this.box = null
    this.label = null
    this.toastEl = null
    this.selected = null
    this.hoverTarget = null
  }

  isUiTarget(target: EventTarget | null): boolean {
    if (!(target instanceof Element)) return false
    return !!target.closest(`[${DOM_INSPECT_UI_ATTR}]`)
  }

  highlight(el: Element | null, selected: boolean): void {
    this.mount()
    if (!el || !this.box || !this.label) {
      this.clearHighlight()
      return
    }
    this.hoverTarget = el
    if (selected) this.selected = el

    const rect = el.getBoundingClientRect()
    Object.assign(this.box.style, {
      display: 'block',
      top: `${rect.top}px`,
      left: `${rect.left}px`,
      width: `${Math.max(rect.width, 1)}px`,
      height: `${Math.max(rect.height, 1)}px`,
    })

    const tag = el.tagName.toLowerCase()
    if (!selected || this.label.dataset.copied !== '1') {
      this.label.textContent = tag
    }
    this.label.style.display = 'block'
    const labelH = this.label.offsetHeight || 18
    let labelTop = rect.top - labelH
    if (labelTop < 0) labelTop = rect.top
    this.label.style.top = `${labelTop}px`
    this.label.style.left = `${rect.left}px`
  }

  getSelected(): Element | null {
    return this.selected
  }

  clearHighlight(): void {
    if (this.box) this.box.style.display = 'none'
    if (this.label) {
      this.label.style.display = 'none'
      delete this.label.dataset.copied
    }
    this.hoverTarget = null
  }

  /** 选中元素后复制 Cursor 格式元信息 */
  async copyElement(el: Element): Promise<void> {
    this.selected = el
    this.highlight(el, true)
    const meta = buildElementMeta(el)
    const text = formatElementMetaText(meta)
    const ok = await this.writeClipboard(text)
    if (ok) {
      this.flashCopiedLabel(el)
      this.showToast('已复制元素信息')
      this.copyOptions.onCopied?.(text, meta)
    } else {
      this.showToast('复制失败')
    }
  }

  private flashCopiedLabel(el: Element): void {
    if (!this.label) return
    const tag = el.tagName.toLowerCase()
    this.label.dataset.copied = '1'
    this.label.textContent = `${tag} · 已复制`
    if (this.labelResetTimer) clearTimeout(this.labelResetTimer)
    this.labelResetTimer = setTimeout(() => {
      if (!this.label) return
      delete this.label.dataset.copied
      if (this.selected) {
        this.label.textContent = this.selected.tagName.toLowerCase()
      }
      this.labelResetTimer = null
    }, 1600)
  }

  private async writeClipboard(text: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      try {
        const ta = document.createElement('textarea')
        markUi(ta)
        ta.value = text
        ta.style.position = 'fixed'
        ta.style.left = '-9999px'
        document.body.appendChild(ta)
        ta.select()
        const ok = document.execCommand('copy')
        ta.remove()
        return ok
      } catch {
        return false
      }
    }
  }

  showToast(message: string): void {
    this.mount()
    if (!this.toastEl) {
      this.toastEl = document.createElement('div')
      this.toastEl.id = TOAST_ID
      markUi(this.toastEl)
      document.documentElement.appendChild(this.toastEl)
    }
    this.toastEl.textContent = message
    this.toastEl.style.display = 'block'
    if (this.toastTimer) clearTimeout(this.toastTimer)
    this.toastTimer = setTimeout(() => this.hideToast(), 1600)
  }

  private hideToast(): void {
    if (this.toastEl) this.toastEl.style.display = 'none'
    if (this.toastTimer) {
      clearTimeout(this.toastTimer)
      this.toastTimer = null
    }
  }
}
