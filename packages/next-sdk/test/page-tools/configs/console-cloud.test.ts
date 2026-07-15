import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { resolveA11yInfo } from '../../../page-tools/a11y/config'
import {
  consoleCloudPageAgentToolOptions,
  isConsoleCloudHost,
} from '../../../page-tools/configs/console-cloud'
import { collectTitleLabel } from '../../../page-tools/a11y/utils'

function el(html: string): Element {
  const wrapper = document.createElement('div')
  wrapper.innerHTML = html.trim()
  document.body.appendChild(wrapper)
  return wrapper.firstElementChild as Element
}

beforeEach(() => {
  document.body.innerHTML = ''
})

afterEach(() => {
  document.body.innerHTML = ''
})

const a11yConfig = consoleCloudPageAgentToolOptions.a11yConfig!

describe('isConsoleCloudHost', () => {
  it('匹配控制台主域与子控制台', () => {
    expect(isConsoleCloudHost('console.huaweicloud.com')).toBe(true)
    expect(isConsoleCloudHost('ecs.console.huaweicloud.com')).toBe(true)
    expect(isConsoleCloudHost('www.huaweicloud.com')).toBe(false)
    expect(isConsoleCloudHost('www.baidu.com')).toBe(false)
  })
})

describe('consoleCloudPageAgentToolOptions', () => {
  it('导出完整 PageAgentToolOptions，并暴露 cf-uba', () => {
    expect(consoleCloudPageAgentToolOptions.enableHighlight).toBe(false)
    expect(a11yConfig.exposedAttributes).toContain('cf-uba')
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
