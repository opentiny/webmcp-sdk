/**
 * @vitest-environment jsdom
 *
 * DOM 检视纯逻辑与 FAB 挂载单测
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  CONTROL_FAB_ID,
  CONTROL_FAB_MINI_ID,
  ControlFab,
  HTML_ELEMENT_MAX_CHARS,
  InspectOverlay,
  buildDomPath,
  buildElementMeta,
  disableInspectAssist,
  enableInspectAssist,
  formatElementMetaText,
  pathSegment,
  truncateHtml,
} from '../dom-inspect'

afterEach(() => {
  disableInspectAssist()
  ControlFab.resetSessionStateForTests()
  document.getElementById(CONTROL_FAB_ID)?.remove()
  document.getElementById(CONTROL_FAB_MINI_ID)?.remove()
  document.getElementById('opentiny-dom-inspect-fab-style')?.remove()
  if (document.body) document.body.innerHTML = ''
})

describe('dom-inspect truncateHtml', () => {
  it('truncateHtml 短文本原样返回', () => {
    expect(truncateHtml('<div>ok</div>')).toBe('<div>ok</div>')
  })

  it('truncateHtml 超长时中间省略且不超过上限', () => {
    const long = 'a'.repeat(HTML_ELEMENT_MAX_CHARS + 500)
    const out = truncateHtml(long)
    expect(out.length).toBeLessThanOrEqual(HTML_ELEMENT_MAX_CHARS)
    expect(out.includes('...')).toBe(true)
  })
})

describe('dom-inspect Cursor 元素卡片格式', () => {
  it('复现：id/class 以数字开头时 PATH 段须转义 —— 前置 id=1box class=2col；步骤 buildDomPath；期望含 \\31 /\\32 形式', () => {
    const css = globalThis.CSS as { escape?: (v: string) => string } | undefined
    const hadEscape = css && typeof css.escape === 'function'
    const original = hadEscape ? css!.escape!.bind(css) : undefined
    if (css && hadEscape) {
      // 强制走 fallback，覆盖无 CSS.escape 环境
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(css as any).escape = undefined
    }
    try {
      document.body.innerHTML = `<div id="1box" class="2col"><span>x</span></div>`
      const el = document.querySelector('span')!
      const path = buildDomPath(el)
      expect(path).toContain('\\31 ')
      expect(path).toContain('\\32 ')
    } finally {
      if (css && hadEscape && original) {
        css.escape = original
      }
    }
  })

  it('复现：剪贴板键值分行过多不便粘贴 AI —— 前置同 class 列表项；步骤 buildElementMeta+format；期望摘要行、键值同行、【】修改意见引导', () => {
    document.body.innerHTML = `
      <div id="app">
        <div class="app-container">
          <div class="app-right">
            <div class="tr-container remoter-pane">
              <div>
                <div class="tr-prompt tiny-prompt">
                  <div class="tr-prompt__list-container wrap">
                    <div class="tr-prompt medium prompt-item" data-v-ce67a72d="" data-v-641a878e="">其它</div>
                    <div class="tr-prompt medium prompt-item" data-v-ce67a72d="" data-v-641a878e="">占位</div>
                    <div class="tr-prompt medium prompt-item" data-v-ce67a72d="" data-v-641a878e="">
                      📊
                      库存与销售

                      需要商品入库、查销售趋势，还是看财务对账？
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `
    const items = document.querySelectorAll('.prompt-item')
    const target = items[2] as HTMLElement
    const meta = buildElementMeta(target)
    const text = formatElementMetaText(meta)

    expect(meta.element).toBe('<div class="tr-prompt medium prompt-item">')
    expect(meta.path).toContain('div.tr-prompt medium prompt-item[3]')
    expect(meta.path.startsWith('html')).toBe(false)
    expect(meta.attributes.some((a) => a.name === 'class')).toBe(true)
    expect(meta.innerText).toContain('库存与销售')

    expect(text.startsWith('当前选中的元素是：<div class="tr-prompt medium prompt-item">')).toBe(
      true
    )
    expect(text).toContain('\nELEMENT\n<div class="tr-prompt medium prompt-item">')
    expect(text).toContain('\nPATH\n')
    expect(text).toContain('div.tr-prompt medium prompt-item[3]')
    expect(text).toContain('\nATTRIBUTES\n')
    expect(text).toContain('class: tr-prompt medium prompt-item')
    expect(text).not.toContain('class:\ntr-prompt')
    expect(text).toContain('\nCOMPUTED STYLES\n')
    expect(text).toMatch(/^color: /m)
    expect(text).toContain('\nPOSITION & SIZE\n')
    expect(text).toMatch(/^top: /m)
    expect(text).toContain('\nINNER TEXT\n')
    expect(text).toContain('库存与销售')
    expect(text.trimEnd().endsWith('可将修改意见填写到【】中：【】')).toBe(true)
    expect(text).not.toContain('DOM Path:')
    expect(text).not.toContain('HTML Element:')
  })

  it('pathSegment / buildDomPath 生成 Cursor 风格路径', () => {
    document.body.innerHTML = `
      <div id="app">
        <div class="app-container">
          <div class="stat-card purple">总库存量</div>
        </div>
      </div>
    `
    const card = document.querySelector('.stat-card')!
    expect(pathSegment(card)).toBe('div.stat-card purple')
    const path = buildDomPath(card)
    expect(path).toContain('div#app')
    expect(path).toContain('div.stat-card purple')
    expect(path.includes(' > ')).toBe(true)
    expect(path.startsWith('html')).toBe(false)
  })
})

describe('dom-inspect 检视态拦截导航', () => {
  it('复现：检视态点击 a 会发生跳转 —— 前置进入检视；步骤对带 href 的 a 派发 click；期望 click 被 preventDefault，退出检视后不再拦截', () => {
    ControlFab.resetSessionStateForTests()
    document.body.innerHTML = `<a id="nav-link" href="https://example.com/elsewhere">go</a>`
    const link = document.getElementById('nav-link') as HTMLAnchorElement
    const handle = enableInspectAssist({ showFab: false })
    handle.enter()

    const inspectingClick = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      clientX: 10,
      clientY: 10,
    })
    link.dispatchEvent(inspectingClick)
    expect(inspectingClick.defaultPrevented).toBe(true)

    handle.exit()
    const idleClick = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      clientX: 10,
      clientY: 10,
    })
    link.dispatchEvent(idleClick)
    expect(idleClick.defaultPrevented).toBe(false)
  })
})

describe('dom-inspect enableInspectAssist FAB', () => {
  it('enableInspectAssist 挂载 FAB，toggle 切换检视文案', () => {
    ControlFab.resetSessionStateForTests()
    const handle = enableInspectAssist()
    const fab = document.getElementById(CONTROL_FAB_ID)
    expect(fab).toBeTruthy()
    expect(fab!.textContent).toContain('Inspect')
    expect(fab!.dataset.inspecting).toBe('false')

    fab!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    expect(handle.isActive()).toBe(true)
    expect(fab!.dataset.inspecting).toBe('true')
    expect(fab!.textContent).toContain('检视中')

    fab!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    expect(handle.isActive()).toBe(false)
    expect(fab!.dataset.inspecting).toBe('false')
    expect(fab!.textContent).toContain('Inspect')
  })

  it('复现：已挂载 FAB 再次 enable 须 sync 检视态 —— 前置 enter 检视中；步骤再次 enableInspectAssist；期望 aria-pressed/文案仍为检视中', () => {
    ControlFab.resetSessionStateForTests()
    const handle = enableInspectAssist()
    handle.enter()
    const fab = document.getElementById(CONTROL_FAB_ID)!
    expect(fab.dataset.inspecting).toBe('true')

    enableInspectAssist({ brandLabel: 'WebMCP' })
    const remounted = document.getElementById(CONTROL_FAB_ID)!
    expect(remounted.dataset.inspecting).toBe('true')
    expect(remounted.textContent).toContain('检视中')
    expect(remounted.querySelector('.dom-inspect-fab-main')?.getAttribute('aria-pressed')).toBe(
      'true'
    )
  })

  it('brandLabel 自定义 idle 文案', () => {
    ControlFab.resetSessionStateForTests()
    enableInspectAssist({ brandLabel: 'OpenTiny' })
    const fab = document.getElementById(CONTROL_FAB_ID)
    expect(fab!.textContent).toContain('OpenTiny')
  })

  it('复现：已挂载 idle FAB 再次 enable 换 brandLabel 文案不更新 —— 前置 enable({brandLabel:Old})；步骤再 enable({brandLabel:New})；期望浮钮文案为 New', () => {
    ControlFab.resetSessionStateForTests()
    enableInspectAssist({ brandLabel: 'Old' })
    const fab = document.getElementById(CONTROL_FAB_ID)!
    expect(fab.textContent).toContain('Old')

    enableInspectAssist({ brandLabel: 'New' })
    const updated = document.getElementById(CONTROL_FAB_ID)!
    expect(updated.textContent).toContain('New')
    expect(updated.textContent).not.toContain('Old')
    expect(updated.querySelector('.dom-inspect-fab-main')?.getAttribute('title')).toContain('New')
  })

  it('复现：已收起迷你入口再次 enable 换 brandLabel 首字母不更新 —— 前置 enable(Old) 后点 ×；步骤再 enable(New)；期望迷你钮文案为 N', () => {
    ControlFab.resetSessionStateForTests()
    enableInspectAssist({ brandLabel: 'Old' })
    const fab = document.getElementById(CONTROL_FAB_ID)!
    fab.querySelector('.dom-inspect-fab-close')!.dispatchEvent(
      new MouseEvent('click', { bubbles: true, cancelable: true })
    )
    const mini = document.getElementById(CONTROL_FAB_MINI_ID)!
    expect(mini).toBeTruthy()
    expect(mini.textContent).toBe('O')

    enableInspectAssist({ brandLabel: 'New' })
    const updatedMini = document.getElementById(CONTROL_FAB_MINI_ID)!
    expect(updatedMini.textContent).toBe('N')
    expect(updatedMini.title).toContain('New')
  })

  it('复现：二次 enable showFab:false 后快捷键仍可切换检视 —— 前置含 FAB 并 enter；步骤再 enable({showFab:false}) 后派发 Cmd/Ctrl+Shift+C；期望已退出且快捷键无效', () => {
    ControlFab.resetSessionStateForTests()
    const handle = enableInspectAssist()
    handle.enter()
    expect(handle.isActive()).toBe(true)

    enableInspectAssist({ showFab: false })
    expect(document.getElementById(CONTROL_FAB_ID)).toBeNull()
    expect(handle.isActive()).toBe(false)

    const isMac =
      /Mac|iPhone|iPad|iPod/i.test(navigator.platform || '') ||
      /Mac OS/i.test(navigator.userAgent || '')
    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'c',
        metaKey: isMac,
        ctrlKey: !isMac,
        shiftKey: true,
        bubbles: true,
        cancelable: true,
      })
    )
    expect(handle.isActive()).toBe(false)

    // 程序化 enter 仍可用（仅隐藏 FAB / 快捷键，不拆除能力）
    handle.enter()
    expect(handle.isActive()).toBe(true)
  })

  it('disableInspectAssist 拆除 FAB', () => {
    ControlFab.resetSessionStateForTests()
    enableInspectAssist()
    expect(document.getElementById(CONTROL_FAB_ID)).toBeTruthy()
    disableInspectAssist()
    expect(document.getElementById(CONTROL_FAB_ID)).toBeNull()
  })

  it('复现：旧 handle.disable() 不应拆除后续 enable 的新实例 —— 前置 enable→disable→再 enable；步骤旧 handle.disable；期望新 FAB 仍在且新 handle 可用', () => {
    ControlFab.resetSessionStateForTests()
    const oldHandle = enableInspectAssist({ brandLabel: 'Old' })
    oldHandle.disable()
    expect(document.getElementById(CONTROL_FAB_ID)).toBeNull()

    const nextHandle = enableInspectAssist({ brandLabel: 'New' })
    expect(document.getElementById(CONTROL_FAB_ID)).toBeTruthy()
    expect(document.getElementById(CONTROL_FAB_ID)!.textContent).toContain('New')

    // 旧 handle 再 disable 不得误杀当前 singleton
    oldHandle.disable()
    expect(document.getElementById(CONTROL_FAB_ID)).toBeTruthy()
    expect(nextHandle.isActive()).toBe(false)

    nextHandle.enter()
    expect(nextHandle.isActive()).toBe(true)
    // 已销毁 handle 的 enter/isActive 应为安全空操作
    expect(oldHandle.isActive()).toBe(false)
    oldHandle.enter()
    expect(oldHandle.isActive()).toBe(false)
    expect(nextHandle.isActive()).toBe(true)

    nextHandle.disable()
    expect(document.getElementById(CONTROL_FAB_ID)).toBeNull()
  })

  it('复现：恢复贴边位置时先设坐标再 getBoundingClientRect 二次 clamp 会偏移 —— 前置 session 贴边坐标；步骤 mount FAB；期望按真实尺寸 clamp 后 left 不变', () => {
    ControlFab.resetSessionStateForTests()
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 400 })
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 300 })

    const fabWidth = 100
    const savedLeft = 400 - fabWidth - 8 // 292，对真实宽度合法贴边
    sessionStorage.setItem(
      'opentiny-dom-inspect-pos',
      JSON.stringify({ left: savedLeft, top: 100 })
    )

    const descW = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetWidth')
    const descH = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight')
    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
      configurable: true,
      get() {
        return fabWidth
      },
    })
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
      configurable: true,
      get() {
        return 36
      },
    })

    // 旧逻辑：先写入 left 再测量时，贴边后 getBoundingClientRect.width 被放大 → 二次 clamp 左移
    const originalGbr = HTMLElement.prototype.getBoundingClientRect
    HTMLElement.prototype.getBoundingClientRect = function getBoundingClientRect(this: HTMLElement) {
      const left = parseFloat(this.style.left) || 0
      const top = parseFloat(this.style.top) || 0
      const width = left >= savedLeft ? 180 : fabWidth
      return {
        x: left,
        y: top,
        left,
        top,
        right: left + width,
        bottom: top + 36,
        width,
        height: 36,
        toJSON() {
          return {}
        },
      } as DOMRect
    }

    try {
      enableInspectAssist({ brandLabel: 'WebMCP' })
      const el = document.getElementById(CONTROL_FAB_ID)!
      expect(parseFloat(el.style.left)).toBe(savedLeft)
    } finally {
      HTMLElement.prototype.getBoundingClientRect = originalGbr
      if (descW) Object.defineProperty(HTMLElement.prototype, 'offsetWidth', descW)
      else delete (HTMLElement.prototype as { offsetWidth?: number }).offsetWidth
      if (descH) Object.defineProperty(HTMLElement.prototype, 'offsetHeight', descH)
      else delete (HTMLElement.prototype as { offsetHeight?: number }).offsetHeight
    }
  })

  it('复现：关闭浮钮落盘应使用 style left/top 而非 getBoundingClientRect —— 前置手动 style 定位并 mock rect 偏差；步骤点 ×；期望 session 为 style 值', () => {
    ControlFab.resetSessionStateForTests()
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 800 })
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 600 })

    const descW = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetWidth')
    const descH = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight')
    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
      configurable: true,
      get() {
        return 100
      },
    })
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
      configurable: true,
      get() {
        return 36
      },
    })

    const originalGbr = HTMLElement.prototype.getBoundingClientRect
    HTMLElement.prototype.getBoundingClientRect = function getBoundingClientRect() {
      return {
        x: 999,
        y: 888,
        left: 999,
        top: 888,
        right: 1099,
        bottom: 924,
        width: 100,
        height: 36,
        toJSON() {
          return {}
        },
      } as DOMRect
    }

    try {
      enableInspectAssist()
      const fab = document.getElementById(CONTROL_FAB_ID)!
      fab.style.left = '120px'
      fab.style.top = '80px'

      fab
        .querySelector('.dom-inspect-fab-close')!
        .dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))

      const raw = sessionStorage.getItem('opentiny-dom-inspect-pos')
      expect(raw).toBeTruthy()
      const saved = JSON.parse(raw!) as { left: number; top: number }
      expect(saved).toEqual({ left: 120, top: 80 })

      const mini = document.getElementById('opentiny-dom-inspect-fab-mini')!
      expect(mini).toBeTruthy()
      expect(parseFloat(mini.style.left)).toBe(120)
      expect(parseFloat(mini.style.top)).toBe(80)
    } finally {
      HTMLElement.prototype.getBoundingClientRect = originalGbr
      if (descW) Object.defineProperty(HTMLElement.prototype, 'offsetWidth', descW)
      else delete (HTMLElement.prototype as { offsetWidth?: number }).offsetWidth
      if (descH) Object.defineProperty(HTMLElement.prototype, 'offsetHeight', descH)
      else delete (HTMLElement.prototype as { offsetHeight?: number }).offsetHeight
    }
  })
})

describe('dom-inspect clipboard fallback', () => {
  it('复现：clipboard API 失败且 document.body 缺失时 fallback 抛错导致复制失败 —— 前置 writeText reject、body=null；步骤 copyElement；期望仍可复制且挂到 documentElement', async () => {
    const el = document.createElement('div')
    el.textContent = 'hi'
    document.documentElement.appendChild(el)

    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async () => {
          throw new Error('denied')
        },
      },
    })

    const exec = vi.fn(() => true)
    const prevExec = document.execCommand
    document.execCommand = exec as typeof document.execCommand

    const realBody = document.body
    Object.defineProperty(document, 'body', {
      configurable: true,
      get: () => null,
    })

    let copied = ''
    const overlay = new InspectOverlay()
    overlay.setCopyOptions({
      onCopied: (text) => {
        copied = text
      },
    })

    try {
      await overlay.copyElement(el)
      expect(copied).toContain('ELEMENT')
      expect(exec).toHaveBeenCalledWith('copy')
      expect(document.documentElement.querySelector('textarea')).toBeNull()
    } finally {
      Object.defineProperty(document, 'body', {
        configurable: true,
        writable: true,
        value: realBody,
      })
      document.execCommand = prevExec as typeof document.execCommand
      el.remove()
      overlay.unmount()
    }
  })
})
