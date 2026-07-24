import { ControlFab } from './control-fab'
import { InspectOverlay } from './overlay'
import { INSPECT_UI_ATTR } from './types'

function isMacPlatform(): boolean {
  return (
    /Mac|iPhone|iPad|iPod/i.test(navigator.platform || '') ||
    /Mac OS/i.test(navigator.userAgent || '')
  )
}

/**
 * 检视模式控制器：
 * - 主入口：常驻浮钮（标识受控 + 切换检视）
 * - 次要：Cmd/Ctrl+Shift+C；Esc 仅退出检视（浮钮保留）
 *
 * 注意：pointerdown 上的 preventDefault 会取消后续 click，
 * 因此选中/复制必须在 pointerup 完成，不能依赖 click。
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
  private installed = false
  /** pointerdown 起点，用于区分点击与轻微抖动 */
  private pressX = 0
  private pressY = 0

  /** 安装浮钮 + 快捷键（幂等） */
  install(): void {
    if (this.installed) {
      this.fab.mount(() => this.toggle())
      this.fab.sync(this.active)
      return
    }
    this.installed = true
    this.fab.mount(() => this.toggle())
    window.addEventListener('keydown', this.boundKeyDown, true)
  }

  isActive(): boolean {
    return this.active
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
      if (el.hasAttribute?.(INSPECT_UI_ATTR) || el.closest?.(`[${INSPECT_UI_ATTR}]`)) {
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
}

let singleton: InspectModeController | null = null

export function getInspectModeController(): InspectModeController {
  if (!singleton) singleton = new InspectModeController()
  return singleton
}

export function initElementInspect(): void {
  getInspectModeController().install()
}
