type Placement =
  | 'top' | 'top-start' | 'top-end'
  | 'bottom' | 'bottom-start' | 'bottom-end'
  | 'left' | 'left-start' | 'left-end'
  | 'right' | 'right-start' | 'right-end'

type Trigger = 'hover' | 'focus' | 'click'

interface Options {
  content?: string | (() => string)
  placement?: Placement
  trigger?: Trigger
  delay?: number
  hideDelay?: number
  container?: HTMLElement
  className?: string
}

const DEFAULTS: Required<Options> = {
  content: '',
  placement: 'top',
  trigger: 'hover',
  delay: 150,
  hideDelay: 150,
  container: document.body,
  className: 'native-tooltip'
}

export class Tooltip {
  private el: HTMLElement
  private opts: Required<Options>
  private tip: HTMLDivElement | null = null
  private showTimer = 0
  private hideTimer = 0
  private clickOutside: ((e: MouseEvent) => void) | null = null

  constructor (el: HTMLElement | string, options: Options = {}) {
    this.el = typeof el === 'string' ? document.querySelector(el)! : el
    if (!this.el) throw new Error('Tooltip: invalid element')
    this.opts = { ...DEFAULTS, ...options }
    this.bindEvents()
  }

  /* 公开 API */
  public open (): void {
    if (this.isShown()) return
    this.clearTimer()
    this.showTimer = window.setTimeout(() => {
      this.render()
      this.opts.container.appendChild(this.tip!)
      this.reposition()
      this.attachExtraEvents()
    }, this.opts.delay)
  }

  public close (): void {
    this.clearTimer()
    this.hideTimer = window.setTimeout(() => {
      this.tip?.remove()
      this.detachExtraEvents()
    }, this.opts.hideDelay)
  }

  public toggle (): void {
    this.isShown() ? this.close() : this.open()
  }

  public destroy (): void {
    this.close()
    const t = this.opts.trigger
    this.el.removeEventListener('mouseenter', this.open)
    this.el.removeEventListener('mouseleave', this.close)
    this.el.removeEventListener('focus', this.open)
    this.el.removeEventListener('blur', this.close)
    if (t === 'click') this.el.removeEventListener('click', this.toggle)
  }

  /* 私有方法 */
  private bindEvents (): void {
    const t = this.opts.trigger
    if (t === 'hover') {
      this.el.addEventListener('mouseenter', () => this.open())
      this.el.addEventListener('mouseleave', () => this.close())
    } else if (t === 'focus') {
      this.el.addEventListener('focus', () => this.open())
      this.el.addEventListener('blur', () => this.close())
    } else if (t === 'click') {
      this.el.addEventListener('click', () => this.toggle())
    }
  }

  private render (): void {
    if (this.tip) return
    const content = typeof this.opts.content === 'function'
      ? this.opts.content()
      : this.opts.content
    this.tip = document.createElement('div')
    this.tip.className = `${this.opts.className} ${this.opts.className}--${this.opts.placement}`
    this.tip.innerHTML = `
      <div class="${this.opts.className}__arrow"></div>
      <div class="${this.opts.className}__inner">${content}</div>
    `
  }

  private reposition (): void {
    const list = this.placementList(this.opts.placement)
    for (const pl of list) {
      const style = this.calcStyle(pl)
      if (this.checkViewport(style)) {
        this.applyStyle(style)
        this.tip!.className = `${this.opts.className} ${this.opts.className}--${pl}`
        return
      }
    }
    this.applyStyle(this.calcStyle('top'))
  }

  private calcStyle (placement: Placement): { top: number, left: number } {
    const tr = this.el.getBoundingClientRect()
    const tp = this.tip!.getBoundingClientRect()
    const st = window.pageYOffset || document.documentElement.scrollTop
    const sl = window.pageXOffset || document.documentElement.scrollLeft
    const arrow = 6

    const [main, sub = 'center'] = placement.split('-') as [string, string | undefined]
    let top = 0, left = 0

    if (main === 'top')        top = tr.top + st - tp.height - arrow
    else if (main === 'bottom') top = tr.bottom + st + arrow
    else if (main === 'left')  left = tr.left + sl - tp.width - arrow
    else if (main === 'right') left = tr.right + sl + arrow

    if (main === 'top' || main === 'bottom') {
      if (sub === 'start')      left = tr.left + sl
      else if (sub === 'end')   left = tr.right + sl - tp.width
      else                      left = (tr.left + tr.right) / 2 + sl - tp.width / 2
    }
    if (main === 'left' || main === 'right') {
      if (sub === 'start')      top = tr.top + st
      else if (sub === 'end')   top = tr.bottom + st - tp.height
      else                      top = (tr.top + tr.bottom) / 2 + st - tp.height / 2
    }
    return { top: Math.round(top), left: Math.round(left) }
  }

  private applyStyle ({ top, left }: { top: number, left: number }): void {
    Object.assign(this.tip!.style, {
      position: 'absolute',
      top: `${top}px`,
      left: `${left}px`
    })
  }

  private checkViewport ({ top, left }: { top: number, left: number }): boolean {
    const pad = 5
    const w = window.innerWidth
    const h = window.innerHeight
    const tp = this.tip!.getBoundingClientRect()
    return left >= pad && top >= pad &&
           left + tp.width <= w - pad &&
           top + tp.height <= h - pad
  }

  private placementList (pl: Placement): Placement[] {
    const map: Record<string, Placement[]> = {
      top: ['top', 'bottom', 'top-start', 'bottom-start', 'top-end', 'bottom-end'],
      bottom: ['bottom', 'top', 'bottom-start', 'top-start', 'bottom-end', 'top-end'],
      left: ['left', 'right', 'left-start', 'right-start', 'left-end', 'right-end'],
      right: ['right', 'left', 'right-start', 'left-start', 'right-end', 'left-end']
    }
    return map[pl.split('-')[0]] || map.top
  }

  private attachExtraEvents (): void {
    if (this.opts.trigger === 'click') {
      this.clickOutside = (e: MouseEvent) => {
        const path = e.composedPath() as EventTarget[]
        if (!path.includes(this.el) && !path.includes(this.tip!)) this.close()
      }
      document.addEventListener('mousedown', this.clickOutside)
    } else if (this.opts.trigger === 'hover') {
      this.tip!.addEventListener('mouseenter', () => this.clearTimer())
      this.tip!.addEventListener('mouseleave', () => this.close())
    }
  }

  private detachExtraEvents (): void {
    if (this.clickOutside) {
      document.removeEventListener('mousedown', this.clickOutside)
      this.clickOutside = null
    }
  }

  private clearTimer (): void {
    clearTimeout(this.showTimer)
    clearTimeout(this.hideTimer)
  }

  private isShown (): boolean {
    return Boolean(this.tip?.parentNode)
  }
}

/* ===== 样式内联 ===== */
const STYLE_ID = 'native-tooltip-style';

(() => {
  if (document.getElementById(STYLE_ID)) return;   // 已注入就跳过
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
.native-tooltip {
  position: absolute;
  z-index: 9999;
  max-width: 200px;
  padding: 6px 10px;
  font-size: 12px;
  line-height: 1.4;
  color: #fff;
  background: #191919;
  border-radius: 4px;
  pointer-events: none;
  box-shadow: 0px 4px 8px 0px rgba(0, 0, 0, 0.2);
}
.native-tooltip__arrow {
  position: absolute;
  width: 0; height: 0;
  border: 6px solid transparent;
}
.native-tooltip--top    .native-tooltip__arrow { bottom: -12px; left: 50%; transform: translateX(-50%); border-top-color: rgba(0,0,0,.75); }
.native-tooltip--bottom .native-tooltip__arrow { top: -12px; left: 50%; transform: translateX(-50%); border-bottom-color: rgba(0,0,0,.75); }
.native-tooltip--left   .native-tooltip__arrow { right: -12px; top: 50%; transform: translateY(-50%); border-left-color: rgba(0,0,0,.75); }
.native-tooltip--right  .native-tooltip__arrow { left: -12px; top: 50%; transform: translateY(-50%); border-right-color: rgba(0,0,0,.75); }
`;
  document.head.appendChild(style);
})();