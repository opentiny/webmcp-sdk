import { ControlFab } from './control-fab'
import { InspectOverlay } from './overlay'
import { DOM_INSPECT_UI_ATTR, type InspectAssistOptions } from './types'

function isMacPlatform(): boolean {
  return (
    /Mac|iPhone|iPad|iPod/i.test(navigator.platform || '') ||
    /Mac OS/i.test(navigator.userAgent || '')
  )
}

function resolveOptions(options?: InspectAssistOptions): Required<
  Pick<InspectAssistOptions, 'brandLabel' | 'showFab'>
> &
  Pick<InspectAssistOptions, 'onCopied'> {
  return {
    brandLabel: options?.brandLabel ?? 'Inspect',
    showFab: options?.showFab ?? true,
    onCopied: options?.onCopied,
  }
}

/**
 * 检视模式控制器：
 * - 主入口：常驻浮钮（可选）
 * - 次要：Cmd/Ctrl+Shift+C；Esc 仅退出检视（浮钮保留）
 *
 * 注意：选中/复制在 pointerup 完成（pointerdown preventDefault 可能取消后续 click）。
 * 但 <a> 等默认导航挂在 click 上，仍须单独在 capture 阶段拦截 click/auxclick。
 */
export class InspectModeController {
  private active = false
  private overlay = new InspectOverlay()
  private fab = new ControlFab()
  private prevCursor = ''
  private boundKeyDown = (e: KeyboardEvent) => this.onKeyDown(e)
  private boundMouseMove = (e: MouseEvent) => this.onMouseMove(e)
  private boundPointerDown = (e: PointerEvent) => this.onPointerDown(e)
  private boundMouseDown = (e: MouseEvent) => this.onMouseDown(e)
  private boundPointerUp = (e: PointerEvent) => this.onPointerUp(e)
  /** 链接/按钮默认动作在 click 上触发；必须单独拦截，仅拦 pointer/mouse down 不够 */
  private boundClick = (e: MouseEvent) => this.onClick(e)
  private boundAuxClick = (e: MouseEvent) => this.onClick(e)
  private installed = false
  private options = resolveOptions()
  /** pointerdown 起点，用于区分点击与轻微抖动 */
  private pressX = 0
  private pressY = 0

  /** 安装浮钮 + 快捷键（幂等） */
  install(options?: InspectAssistOptions): void {
    this.options = resolveOptions(options)
    this.overlay.setCopyOptions({ onCopied: this.options.onCopied })
    this.fab.setOptions({ brandLabel: this.options.brandLabel })

    if (this.installed) {
      if (this.options.showFab) {
        this.fab.mount(() => this.toggle())
        this.fab.sync(this.active)
      } else {
        this.fab.unmount()
      }
      return
    }

    this.installed = true
    if (this.options.showFab) {
      this.fab.mount(() => this.toggle())
      this.fab.sync(this.active)
    }
    window.addEventListener('keydown', this.boundKeyDown, true)
  }

  /** 拆除浮钮、快捷键与检视态 */
  destroy(): void {
    this.exit()
    if (!this.installed) return
    this.installed = false
    window.removeEventListener('keydown', this.boundKeyDown, true)
    this.fab.unmount()
  }

  isActive(): boolean {
    return this.active
  }

  isInstalled(): boolean {
    return this.installed
  }

  enter(): void {
    if (this.active) return
    this.active = true
    this.prevCursor = document.documentElement.style.cursor
    document.documentElement.style.cursor = 'crosshair'
    this.overlay.mount()
    this.fab.sync(true)
    window.addEventListener('mousemove', this.boundMouseMove, true)
    window.addEventListener('pointerdown', this.boundPointerDown, true)
    window.addEventListener('mousedown', this.boundMouseDown, true)
    window.addEventListener('pointerup', this.boundPointerUp, true)
    window.addEventListener('click', this.boundClick, true)
    window.addEventListener('auxclick', this.boundAuxClick, true)
  }

  exit(): void {
    if (!this.active) return
    this.active = false
    document.documentElement.style.cursor = this.prevCursor
    this.overlay.unmount()
    this.fab.sync(false)
    window.removeEventListener('mousemove', this.boundMouseMove, true)
    window.removeEventListener('pointerdown', this.boundPointerDown, true)
    window.removeEventListener('mousedown', this.boundMouseDown, true)
    window.removeEventListener('pointerup', this.boundPointerUp, true)
    window.removeEventListener('click', this.boundClick, true)
    window.removeEventListener('auxclick', this.boundAuxClick, true)
  }

  toggle(): void {
    if (this.active) this.exit()
    else this.enter()
  }

  private onKeyDown(e: KeyboardEvent): void {
    const mod = isMacPlatform() ? e.metaKey : e.ctrlKey
    if (mod && e.shiftKey && (e.key === 'c' || e.key === 'C')) {
      e.preventDefault()
      e.stopPropagation()
      this.toggle()
      return
    }
    if (this.active && e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      this.exit()
    }
  }

  private resolveTarget(x: number, y: number): Element | null {
    const stack = document.elementsFromPoint(x, y)
    for (const el of stack) {
      if (el.hasAttribute?.(DOM_INSPECT_UI_ATTR) || el.closest?.(`[${DOM_INSPECT_UI_ATTR}]`)) {
        continue
      }
      if (el === document.documentElement || el === document.body) continue
      return el
    }
    return null
  }

  private onMouseMove(e: MouseEvent): void {
    if (!this.active) return
    if (this.overlay.isUiTarget(e.target)) return
    const el = this.resolveTarget(e.clientX, e.clientY)
    if (el) {
      const selected = this.overlay.getSelected()
      if (selected && selected === el) {
        this.overlay.highlight(el, true)
      } else {
        this.overlay.highlight(el, false)
      }
    }
  }

  private onPointerDown(e: PointerEvent): void {
    if (!this.active) return
    if (this.overlay.isUiTarget(e.target)) return
    this.pressX = e.clientX
    this.pressY = e.clientY
    e.preventDefault()
    e.stopPropagation()
  }

  private onMouseDown(e: MouseEvent): void {
    if (!this.active) return
    if (this.overlay.isUiTarget(e.target)) return
    e.preventDefault()
    e.stopPropagation()
  }

  private onPointerUp(e: PointerEvent): void {
    if (!this.active) return
    if (this.overlay.isUiTarget(e.target)) return
    e.preventDefault()
    e.stopPropagation()
    // 拖动/滑动过大则不当作点选
    if (Math.hypot(e.clientX - this.pressX, e.clientY - this.pressY) > 8) return
    const el = this.resolveTarget(e.clientX, e.clientY)
    if (!el) return
    void this.overlay.copyElement(el)
  }

  /** 阻止 <a>/按钮等在检视态下的默认导航或激活 */
  private onClick(e: MouseEvent): void {
    if (!this.active) return
    if (this.overlay.isUiTarget(e.target)) return
    e.preventDefault()
    e.stopPropagation()
    e.stopImmediatePropagation()
  }
}
