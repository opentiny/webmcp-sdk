import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { resolveA11yInfo } from '../../../page-tools/a11y/config'
import {
  consoleCloudPageAgentToolOptions,
  isConsoleCloudHost,
} from '../../../page-tools/configs/console-cloud'
import { buildA11yTree } from '../../../page-tools/a11y-tree'
import { collectTitleLabel } from '../../../page-tools/a11y/utils'

function el(html: string): Element {
  const wrapper = document.createElement('div')
  wrapper.innerHTML = html.trim()
  document.body.appendChild(wrapper)
  return wrapper.firstElementChild as Element
}

function setupRoot(html: string): HTMLElement {
  const root = document.createElement('div')
  root.innerHTML = html.trim()
  document.body.appendChild(root)
  return root
}

beforeEach(() => {
  document.body.innerHTML = ''
})

afterEach(() => {
  document.body.innerHTML = ''
})

const a11yConfig = consoleCloudPageAgentToolOptions.a11yConfig!

describe('isConsoleCloudHost', () => {
  it('匹配控制台主域与子控制台，且要求 console 前为域名边界', () => {
    expect(isConsoleCloudHost('console.huaweicloud.com')).toBe(true)
    expect(isConsoleCloudHost('ecs.console.huaweicloud.com')).toBe(true)
    expect(isConsoleCloudHost('www.huaweicloud.com')).toBe(false)
    expect(isConsoleCloudHost('www.baidu.com')).toBe(false)
    expect(isConsoleCloudHost('xconsole.huaweicloud.com')).toBe(false)
  })
})

describe('consoleCloudPageAgentToolOptions', () => {
  it('导出完整 PageAgentToolOptions，并暴露 cf-uba / data-qa-id / name', () => {
    expect(consoleCloudPageAgentToolOptions.enableHighlight).toBe(false)
    expect(a11yConfig.exposedAttributes).toContain('cf-uba')
    expect(a11yConfig.exposedAttributes).toContain('data-qa-id')
    expect(a11yConfig.exposedAttributes).toContain('name')
  })

  it('data-qa-id 仅输出属性 token，不自动赋予 ref', () => {
    const root = setupRoot(`
      <div id="page-root">
        <div data-qa-id="static-marker">静态文案</div>
      </div>
    `)
    const container = root.querySelector('#page-root') as Element
    const staticEl = root.querySelector('[data-qa-id="static-marker"]') as Element
    const info = resolveA11yInfo(staticEl, a11yConfig)
    expect(info.tokens).toContain('data-qa-id="static-marker"')
    const { refMap } = buildA11yTree(container, a11yConfig)
    expect(Array.from(refMap.values())).not.toContain(staticEl)
  })

  it('Tiny3 Tab：.ti3-tabs-text → tab，选中态随父 li.ti3-tab-active', () => {
    const wrap = el(
      '<ul class="ti3-tabs"><li class="ti3-tab-li ti3-tab-active"><span class="ti3-tabs-text" tabindex="0">总览</span></li></ul>',
    )
    const tab = wrap.querySelector('.ti3-tabs-text')!
    const info = resolveA11yInfo(tab, a11yConfig)
    expect(info.role).toBe('tab')
    expect(info.tokens).toContain('selected')
    // li 本身不再标成 tab，避免与内部可聚焦节点双重角色
    expect(resolveA11yInfo(wrap.querySelector('li')!, a11yConfig).role).toBe('listitem')
  })

  it('Tiny3 Tablist：ul.ti3-tabs → tablist，且不把角色传染给子节点', () => {
    const list = el('<ul class="ti3-tabs"><li class="ti3-tab-li"><span class="ti3-tabs-text">A</span></li></ul>')
    expect(resolveA11yInfo(list, a11yConfig).role).toBe('tablist')
    const child = list.querySelector('li')!
    expect(resolveA11yInfo(child, a11yConfig).role).not.toBe('tablist')
    expect(resolveA11yInfo(list.querySelector('.ti3-tabs-text')!, a11yConfig).role).toBe('tab')
  })

  it('服务列表图标容器 → button + hasPopup', () => {
    const btn = el('<div class="modules-service-list-menu-service-icon-container" cf-uba="serviceList..open"></div>')
    const info = resolveA11yInfo(btn, a11yConfig)
    expect(info.role).toBe('button')
    expect(info.tokens).toContain('hasPopup')
    expect(info.tokens.some((t) => t.includes('cf-uba='))).toBe(true)
  })

  it(
    '场景：帮助中心头部 ti-icon / tp-icon（固定/全屏/关闭）\n' +
      '问题：自定义图标标签无 button 语义，Agent 无法点击固定/全屏/关闭\n' +
      '期望：识别为 button；有 name 属性的图标输出 name token，正文可为空',
    () => {
      const root = el(`
        <div class="ti-global-help-panel-header-right">
          <tp-icon name="cloudx-action-fixed" class="ti-global-help-panel-header-icon"></tp-icon>
          <ti-icon class="ti-global-help-panel-header-icon ti3-icon-full-screen ti3-icon"></ti-icon>
          <ti-icon name="close" class="ti-global-help-panel-header-icon ti-global-help-panel-close ti3-icon-close ti3-icon"></ti-icon>
        </div>
      `)

      const fixed = root.querySelector('tp-icon')!
      const fullScreen = root.querySelector('ti-icon.ti3-icon-full-screen')!
      const close = root.querySelector('ti-icon[name="close"]')!

      expect(resolveA11yInfo(fixed, a11yConfig).role).toBe('button')
      expect(resolveA11yInfo(fullScreen, a11yConfig).role).toBe('button')
      expect(resolveA11yInfo(close, a11yConfig).role).toBe('button')

      const { yaml, refMap, lines } = buildA11yTree(root, a11yConfig)
      expect(refMap.size).toBeGreaterThanOrEqual(3)
      expect(Array.from(refMap.values())).toEqual(expect.arrayContaining([fixed, fullScreen, close]))
      expect(lines.some((l) => /button.*\[.*name=.*cloudx-action-fixed/.test(l))).toBe(true)
      expect(lines.some((l) => /button.*\[.*name=.*close/.test(l))).toBe(true)
      expect(lines.some((l) => /button.*\[.*name=full-screen/.test(l))).toBe(false)
      expect(lines.some((l) => /button.*"cloudx-action-fixed"/.test(l))).toBe(false)
      expect(lines.some((l) => /button.*"full-screen"/.test(l))).toBe(false)
      expect(lines.some((l) => /button.*"close"/.test(l))).toBe(false)
      expect(yaml).not.toMatch(/@font-face/i)
    },
  )

  it('区域选择触发器 → combobox', () => {
    const box = el('<div class="ti3-select-dominator-container"><span>华北-北京四</span></div>')
    expect(resolveA11yInfo(box, a11yConfig).role).toBe('combobox')
  })

  it('服务列表侧栏项 → menuitem + selected', () => {
    const item = el(
      '<ul class="components-service-list-left-box-sidebar-visit-panel"><li class="components-service-list-left-box-active">收藏和访问</li></ul>',
    )
    const li = item.querySelector('li')!
    const info = resolveA11yInfo(li, a11yConfig)
    expect(info.role).toBe('menuitem')
    expect(info.tokens).toContain('selected')
  })
})

describe('collectTitleLabel', () => {
  it('优先取自身 title，否则取子孙 title', () => {
    expect(collectTitleLabel(el('<div title="自身"></div>'))).toBe('自身')
    expect(
      collectTitleLabel(el('<div class="icon"><span title="打开服务列表"></span></div>')),
    ).toBe('打开服务列表')
  })
})

describe('consoleCloud 图标动作标识', () => {
  it('ti-icon / tp-icon：name 属性经 exposedAttributes 输出 token', () => {
    expect(resolveA11yInfo(el('<tp-icon name="cloudx-action-fixed"></tp-icon>'), a11yConfig).tokens).toContain(
      'name="cloudx-action-fixed"',
    )
    expect(resolveA11yInfo(el('<ti-icon name="close" class="ti3-icon-close"></ti-icon>'), a11yConfig).tokens).toContain(
      'name="close"',
    )
    expect(
      resolveA11yInfo(
        el('<ti-icon class="ti-global-help-panel-header-icon ti3-icon-full-screen ti3-icon"></ti-icon>'),
        a11yConfig,
      ).tokens,
    ).not.toContain('name=full-screen')
  })
})
