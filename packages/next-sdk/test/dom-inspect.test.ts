/**
 * @vitest-environment jsdom
 *
 * DOM 检视纯逻辑与 FAB 挂载单测
 */
import { afterEach, describe, expect, it } from 'vitest'
import {
  CONTROL_FAB_ID,
  ControlFab,
  HTML_ELEMENT_MAX_CHARS,
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
  document.getElementById('opentiny-dom-inspect-fab-mini')?.remove()
  document.getElementById('opentiny-dom-inspect-fab-style')?.remove()
  document.body.innerHTML = ''
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
  it('复现：剪贴板应对齐 Cursor ELEMENT/PATH/ATTRIBUTES/… 分区 —— 前置同 class 列表项；步骤 buildElementMeta+format；期望含分区标题、开标签、兄弟 [n]、INNER TEXT', () => {
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

    expect(text.startsWith('ELEMENT\n')).toBe(true)
    expect(text).toContain('ELEMENT\n<div class="tr-prompt medium prompt-item">')
    expect(text).toContain('\nPATH\n')
    expect(text).toContain('div.tr-prompt medium prompt-item[3]')
    expect(text).toContain('\nATTRIBUTES\n')
    expect(text).toContain('class:\ntr-prompt medium prompt-item')
    expect(text).toContain('\nCOMPUTED STYLES\n')
    expect(text).toContain('color:')
    expect(text).toContain('\nPOSITION & SIZE\n')
    expect(text).toContain('top:')
    expect(text).toContain('\nINNER TEXT\n')
    expect(text).toContain('库存与销售')
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

  it('brandLabel 自定义 idle 文案', () => {
    ControlFab.resetSessionStateForTests()
    enableInspectAssist({ brandLabel: 'OpenTiny' })
    const fab = document.getElementById(CONTROL_FAB_ID)
    expect(fab!.textContent).toContain('OpenTiny')
  })

  it('disableInspectAssist 拆除 FAB', () => {
    ControlFab.resetSessionStateForTests()
    enableInspectAssist()
    expect(document.getElementById(CONTROL_FAB_ID)).toBeTruthy()
    disableInspectAssist()
    expect(document.getElementById(CONTROL_FAB_ID)).toBeNull()
  })
})
