/**
 * @vitest-environment jsdom
 *
 * 元素检视纯逻辑单测
 */
import { afterEach, describe, expect, it } from 'vitest'
import {
  buildDomPath,
  buildElementMeta,
  formatElementMetaText,
  formatInspectRef,
  parseInspectRef,
  pathSegment,
  registerElement,
  resetInspectRegistryForTests,
  serializeHtmlElement,
  truncateHtml,
  getRegisteredElement,
  HTML_ELEMENT_MAX_CHARS,
  INSPECT_ATTR,
} from '../src/inject/element-inspect'

describe('element-inspect clipboard-ref', () => {
  it('formatInspectRef 生成可机读单行引用', () => {
    expect(formatInspectRef('TAB123', 'webmcp-el-1')).toBe(
      'webmcp-inspect:v1 tab=TAB123 el=webmcp-el-1'
    )
  })

  it('parseInspectRef 能从用户粘贴文本中解析', () => {
    const pasted = `请把这个卡片背景改红\nwebmcp-inspect:v1 tab=ABC el=webmcp-el-2\n谢谢`
    expect(parseInspectRef(pasted)).toEqual({
      version: 1,
      tabId: 'ABC',
      elementId: 'webmcp-el-2',
    })
  })

  it('parseInspectRef 非法文本返回 null', () => {
    expect(parseInspectRef('hello')).toBeNull()
    expect(parseInspectRef('')).toBeNull()
  })
})

describe('element-inspect truncateHtml / formatElementMetaText', () => {
  it('truncateHtml 短文本原样返回', () => {
    expect(truncateHtml('<div>ok</div>')).toBe('<div>ok</div>')
  })

  it('truncateHtml 超长时中间省略且不超过上限', () => {
    const long = 'a'.repeat(HTML_ELEMENT_MAX_CHARS + 500)
    const out = truncateHtml(long)
    expect(out.length).toBeLessThanOrEqual(HTML_ELEMENT_MAX_CHARS)
    expect(out.includes('...')).toBe(true)
  })

  it('formatElementMetaText 对齐 Cursor 三行格式', () => {
    const text = formatElementMetaText({
      domPath: 'div#app > div.stat-card.purple',
      position: { top: 163, left: 606, width: 317, height: 139 },
      htmlElement: '<div class="stat-card purple">总库存量</div>',
    })
    expect(text).toBe(
      [
        'DOM Path: div#app > div.stat-card.purple',
        'Position: top=163px, left=606px, width=317px, height=139px',
        'HTML Element: <div class="stat-card purple">总库存量</div>',
      ].join('\n')
    )
  })
})

describe('element-inspect DOM helpers（需要 document）', () => {
  afterEach(() => {
    resetInspectRegistryForTests()
    document.body.innerHTML = ''
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
    expect(pathSegment(card)).toBe('div.stat-card.purple')
    const path = buildDomPath(card)
    expect(path).toContain('div#app')
    expect(path).toContain('div.stat-card.purple')
    expect(path.includes(' > ')).toBe(true)
  })

  it('registerElement 分配稳定 id 并可查询', () => {
    const el = document.createElement('div')
    el.className = 'x'
    document.body.appendChild(el)
    const id1 = registerElement(el)
    const id2 = registerElement(el)
    expect(id1).toMatch(/^webmcp-el-\d+$/)
    expect(id2).toBe(id1)
    expect(el.getAttribute(INSPECT_ATTR)).toBe(id1)
    expect(getRegisteredElement(id1)).toBe(el)
  })

  it('buildElementMeta 含 DOM Path / Position / HTML，且去掉 inspect 属性', () => {
    const el = document.createElement('div')
    el.id = 'target'
    el.className = 'box'
    el.textContent = 'hello'
    document.body.appendChild(el)
    registerElement(el)
    const meta = buildElementMeta(el)
    expect(meta.domPath).toContain('div#target.box')
    expect(meta.position).toMatchObject({
      top: expect.any(Number),
      left: expect.any(Number),
      width: expect.any(Number),
      height: expect.any(Number),
    })
    expect(meta.htmlElement).toContain('hello')
    expect(meta.htmlElement).not.toContain(INSPECT_ATTR)
    expect(serializeHtmlElement(el)).not.toContain(INSPECT_ATTR)
  })

  it('getRegisteredElement 对已卸载元素返回 null', () => {
    const el = document.createElement('span')
    document.body.appendChild(el)
    const id = registerElement(el)
    el.remove()
    expect(getRegisteredElement(id)).toBeNull()
  })
})

describe('element-inspect control fab', () => {
  afterEach(async () => {
    const { ControlFab } = await import('../src/inject/element-inspect')
    ControlFab.resetSessionStateForTests()
    document.getElementById('webmcp-cli-control-fab')?.remove()
    document.getElementById('webmcp-cli-control-fab-mini')?.remove()
    document.getElementById('webmcp-cli-control-fab-style')?.remove()
  })

  it('install 后挂载 WebMCP 浮钮，toggle 切换检视文案', async () => {
    const { getInspectModeController, CONTROL_FAB_ID, ControlFab } = await import(
      '../src/inject/element-inspect'
    )
    ControlFab.resetSessionStateForTests()
    const ctrl = getInspectModeController()
    ctrl.exit()
    ctrl.install()
    const fab = document.getElementById(CONTROL_FAB_ID)
    expect(fab).toBeTruthy()
    expect(fab!.textContent).toContain('WebMCP')
    expect(fab!.dataset.inspecting).toBe('false')

    // 程序化 click（detail=0）走浮钮兼容路径
    fab!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    expect(ctrl.isActive()).toBe(true)
    expect(fab!.dataset.inspecting).toBe('true')
    expect(fab!.textContent).toContain('检视中')

    fab!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    expect(ctrl.isActive()).toBe(false)
    expect(fab!.dataset.inspecting).toBe('false')
    expect(fab!.textContent).toContain('WebMCP')
  })

  it('关闭浮钮后出现迷你入口，点击可恢复', async () => {
    const { getInspectModeController, CONTROL_FAB_ID, CONTROL_FAB_MINI_ID, ControlFab } =
      await import('../src/inject/element-inspect')
    ControlFab.resetSessionStateForTests()
    const ctrl = getInspectModeController()
    ctrl.exit()
    ctrl.install()

    const closeBtn = document.querySelector(
      `#${CONTROL_FAB_ID} .webmcp-fab-close`
    ) as HTMLButtonElement
    expect(closeBtn).toBeTruthy()
    closeBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))

    expect(document.getElementById(CONTROL_FAB_ID)).toBeNull()
    const mini = document.getElementById(CONTROL_FAB_MINI_ID)
    expect(mini).toBeTruthy()
    expect(mini!.textContent).toBe('W')

    mini!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    expect(document.getElementById(CONTROL_FAB_MINI_ID)).toBeNull()
    expect(document.getElementById(CONTROL_FAB_ID)).toBeTruthy()
  })
})
