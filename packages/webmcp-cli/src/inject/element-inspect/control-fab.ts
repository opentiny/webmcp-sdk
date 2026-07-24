import { INSPECT_UI_ATTR } from './types'

export const CONTROL_FAB_ID = 'webmcp-cli-control-fab'
export const CONTROL_FAB_MINI_ID = 'webmcp-cli-control-fab-mini'
const FAB_STYLE_ID = 'webmcp-cli-control-fab-style'

const IDLE_LABEL = 'WebMCP'
const ACTIVE_LABEL = '检视中'
const POS_KEY = 'webmcp-cli-fab-pos'
const CLOSED_KEY = 'webmcp-cli-fab-closed'
const DRAG_THRESHOLD = 5

type FabPos = { left: number; top: number }

function ensureFabStyles(): void {
  if (document.getElementById(FAB_STYLE_ID)) return
  const style = document.createElement('style')
  style.id = FAB_STYLE_ID
  style.setAttribute(INSPECT_UI_ATTR, '')
  style.textContent = `
    #${CONTROL_FAB_ID} {
      position: fixed;
      z-index: 2147483647;
      display: inline-flex;
      align-items: center;
      gap: 2px;
      padding: 4px 4px 4px 12px;
      border-radius: 999px;
      background: #0f172a;
      box-shadow: 0 8px 24px rgba(15, 23, 42, 0.35);
      pointer-events: auto;
      user-select: none;
      touch-action: none;
      cursor: grab;
      transition: background 0.15s ease, box-shadow 0.15s ease;
    }
    #${CONTROL_FAB_ID}:active { cursor: grabbing; }
    #${CONTROL_FAB_ID}[data-inspecting="true"] {
      background: #2563eb;
      box-shadow: 0 8px 24px rgba(37, 99, 235, 0.45);
    }
    #${CONTROL_FAB_ID} .webmcp-fab-main {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      border: none;
      background: transparent;
      color: #f8fafc;
      font: 600 13px/1.2 ui-sans-serif, system-ui, -apple-system, sans-serif;
      letter-spacing: 0.02em;
      cursor: inherit;
      padding: 6px 4px 6px 0;
    }
    #${CONTROL_FAB_ID} .webmcp-fab-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #22c55e;
      box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.25);
      flex-shrink: 0;
    }
    #${CONTROL_FAB_ID}[data-inspecting="true"] .webmcp-fab-dot {
      background: #fff;
      box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.28);
      animation: webmcp-fab-pulse 1.2s ease-in-out infinite;
    }
    #${CONTROL_FAB_ID} .webmcp-fab-close {
      width: 24px;
      height: 24px;
      margin-right: 2px;
      border: none;
      border-radius: 50%;
      background: transparent;
      color: rgba(248, 250, 252, 0.75);
      font: 16px/1 ui-sans-serif, system-ui, sans-serif;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    #${CONTROL_FAB_ID} .webmcp-fab-close:hover {
      background: rgba(255, 255, 255, 0.14);
      color: #fff;
    }
    #${CONTROL_FAB_MINI_ID} {
      position: fixed;
      z-index: 2147483647;
      width: 36px;
      height: 36px;
      border: none;
      border-radius: 50%;
      background: #0f172a;
      color: #f8fafc;
      font: 700 12px/1 ui-sans-serif, system-ui, sans-serif;
      box-shadow: 0 6px 18px rgba(15, 23, 42, 0.35);
      cursor: pointer;
      pointer-events: auto;
      touch-action: none;
    }
    #${CONTROL_FAB_MINI_ID}[data-inspecting="true"] {
      background: #2563eb;
    }
    @keyframes webmcp-fab-pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.55; }
    }
  `
  document.documentElement.appendChild(style)
}

function readPos(): FabPos | null {
  try {
    const raw = sessionStorage.getItem(POS_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as FabPos
    if (typeof parsed.left === 'number' && typeof parsed.top === 'number') return parsed
  } catch {
    /* ignore */
  }
  return null
}

function writePos(pos: FabPos): void {
  try {
    sessionStorage.setItem(POS_KEY, JSON.stringify(pos))
  } catch {
    /* ignore */
  }
}

function readClosed(): boolean {
  try {
    return sessionStorage.getItem(CLOSED_KEY) === '1'
  } catch {
    return false
  }
}

function writeClosed(closed: boolean): void {
  try {
    if (closed) sessionStorage.setItem(CLOSED_KEY, '1')
    else sessionStorage.removeItem(CLOSED_KEY)
  } catch {
    /* ignore */
  }
}

function defaultPos(): FabPos {
  return {
    left: Math.max(8, window.innerWidth - 140),
    top: Math.max(8, window.innerHeight - 64),
  }
}

function clampPos(left: number, top: number, width: number, height: number): FabPos {
  const maxL = Math.max(8, window.innerWidth - width - 8)
  const maxT = Math.max(8, window.innerHeight - height - 8)
  return {
    left: Math.min(Math.max(8, left), maxL),
    top: Math.min(Math.max(8, top), maxT),
  }
}

/**
 * 可拖动、可关闭的控制浮钮：标识受控 + 切换检视。
 * 关闭后留下迷你入口，可一键恢复。
 *
 * 点击与拖动统一走 pointerdown/move/up，避免 setPointerCapture / preventDefault 吞掉 click。
 */
export class ControlFab {
  private root: HTMLDivElement | null = null
  private mini: HTMLButtonElement | null = null
  private onToggle: (() => void) | null = null
  private inspecting = false

  mount(onToggle: () => void): void {
    this.onToggle = onToggle
    ensureFabStyles()
    if (readClosed()) {
      this.showMini()
      return
    }
    this.showFab()
  }

  /** 同步检视态视觉 */
  sync(inspecting: boolean): void {
    this.inspecting = inspecting
    if (this.root) {
      this.root.dataset.inspecting = inspecting ? 'true' : 'false'
      const label = this.root.querySelector('.webmcp-fab-label')
      if (label) label.textContent = inspecting ? ACTIVE_LABEL : IDLE_LABEL
      const main = this.root.querySelector('.webmcp-fab-main') as HTMLButtonElement | null
      if (main) {
        main.setAttribute('aria-pressed', inspecting ? 'true' : 'false')
        main.title = inspecting
          ? '检视中 · 点击退出（Esc 亦可）· 可拖动'
          : 'WebMCP CLI 已注入 · 点击切换元素检视 · 可拖动'
      }
    }
    if (this.mini) {
      this.mini.dataset.inspecting = inspecting ? 'true' : 'false'
      this.mini.title = inspecting
        ? '检视中 · 点击展开 WebMCP 浮钮'
        : 'WebMCP CLI 已注入 · 点击展开浮钮'
    }
  }

  isMounted(): boolean {
    return (
      (!!this.root && document.documentElement.contains(this.root)) ||
      (!!this.mini && document.documentElement.contains(this.mini))
    )
  }

  /** 供测试：重置本页 session 关闭/位置状态 */
  static resetSessionStateForTests(): void {
    try {
      sessionStorage.removeItem(POS_KEY)
      sessionStorage.removeItem(CLOSED_KEY)
    } catch {
      /* ignore */
    }
  }

  private showFab(): void {
    this.hideMini()
    writeClosed(false)
    if (this.root && document.documentElement.contains(this.root)) {
      this.applyPos(this.root)
      this.sync(this.inspecting)
      return
    }
    const root = document.createElement('div')
    root.id = CONTROL_FAB_ID
    root.setAttribute(INSPECT_UI_ATTR, '')
    root.setAttribute('role', 'group')
    root.innerHTML = `
      <button type="button" class="webmcp-fab-main" aria-pressed="false">
        <span class="webmcp-fab-dot" aria-hidden="true"></span>
        <span class="webmcp-fab-label">${IDLE_LABEL}</span>
      </button>
      <button type="button" class="webmcp-fab-close" aria-label="关闭浮钮" title="关闭">×</button>
    `
    this.bindPointer(root, {
      onActivate: (target) => {
        if (target instanceof Element && target.closest('.webmcp-fab-close')) {
          this.close()
          return
        }
        this.onToggle?.()
      },
    })
    root.addEventListener('pointerdown', (e) => e.stopPropagation(), true)
    root.addEventListener('mousedown', (e) => e.stopPropagation(), true)
    document.documentElement.appendChild(root)
    this.root = root
    this.applyPos(root)
    this.sync(this.inspecting)
  }

  private showMini(): void {
    this.hideFab()
    writeClosed(true)
    if (this.mini && document.documentElement.contains(this.mini)) {
      this.applyPos(this.mini)
      this.sync(this.inspecting)
      return
    }
    const mini = document.createElement('button')
    mini.id = CONTROL_FAB_MINI_ID
    mini.type = 'button'
    mini.setAttribute(INSPECT_UI_ATTR, '')
    mini.textContent = 'W'
    mini.title = 'WebMCP CLI 已注入 · 点击展开浮钮'
    this.bindPointer(mini, {
      onActivate: () => {
        this.showFab()
      },
    })
    mini.addEventListener('pointerdown', (e) => e.stopPropagation(), true)
    mini.addEventListener('mousedown', (e) => e.stopPropagation(), true)
    document.documentElement.appendChild(mini)
    this.mini = mini
    this.applyPos(mini)
    this.sync(this.inspecting)
  }

  private close(): void {
    this.persistCurrentPos()
    this.showMini()
  }

  private hideFab(): void {
    this.root?.remove()
    this.root = null
  }

  private hideMini(): void {
    this.mini?.remove()
    this.mini = null
  }

  private applyPos(el: HTMLElement): void {
    const saved = readPos()
    const pos = saved ?? defaultPos()
    el.style.left = `${pos.left}px`
    el.style.top = `${pos.top}px`
    el.style.right = 'auto'
    el.style.bottom = 'auto'
    const rect = el.getBoundingClientRect()
    const clamped = clampPos(pos.left, pos.top, rect.width || 40, rect.height || 36)
    el.style.left = `${clamped.left}px`
    el.style.top = `${clamped.top}px`
  }

  private persistCurrentPos(): void {
    const el = this.root || this.mini
    if (!el) return
    const rect = el.getBoundingClientRect()
    writePos({ left: rect.left, top: rect.top })
  }

  private bindPointer(
    el: HTMLElement,
    opts: { onActivate: (target: EventTarget | null) => void }
  ): void {
    let startX = 0
    let startY = 0
    let origLeft = 0
    let origTop = 0
    let moved = false
    let pointerId: number | null = null

    const onMove = (e: PointerEvent) => {
      if (pointerId !== null && e.pointerId !== pointerId) return
      const dx = e.clientX - startX
      const dy = e.clientY - startY
      if (!moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return
      moved = true
      const next = clampPos(
        origLeft + dx,
        origTop + dy,
        el.getBoundingClientRect().width,
        el.getBoundingClientRect().height
      )
      el.style.left = `${next.left}px`
      el.style.top = `${next.top}px`
    }

    const onUp = (e: PointerEvent) => {
      if (pointerId !== null && e.pointerId !== pointerId) return
      window.removeEventListener('pointermove', onMove, true)
      window.removeEventListener('pointerup', onUp, true)
      window.removeEventListener('pointercancel', onUp, true)
      const wasMoved = moved
      pointerId = null
      if (wasMoved) {
        writePos({
          left: parseFloat(el.style.left) || 0,
          top: parseFloat(el.style.top) || 0,
        })
        return
      }
      e.preventDefault()
      e.stopPropagation()
      opts.onActivate(e.target)
    }

    el.addEventListener(
      'pointerdown',
      (e) => {
        if (e.button !== 0) return
        e.stopPropagation()
        const rect = el.getBoundingClientRect()
        startX = e.clientX
        startY = e.clientY
        origLeft = rect.left
        origTop = rect.top
        moved = false
        pointerId = e.pointerId
        window.addEventListener('pointermove', onMove, true)
        window.addEventListener('pointerup', onUp, true)
        window.addEventListener('pointercancel', onUp, true)
      },
      true
    )

    // 供单测 HTMLElement.click()（detail === 0）；真实点击已在 pointerup 处理
    el.addEventListener(
      'click',
      (e) => {
        if (e.detail !== 0) return
        e.preventDefault()
        e.stopPropagation()
        opts.onActivate(e.target)
      },
      true
    )
  }
}
