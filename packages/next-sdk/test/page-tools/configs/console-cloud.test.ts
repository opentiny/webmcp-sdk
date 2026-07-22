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

  it(
    '复现：华为云控制台 ti-app-layout 无 landmark，无障碍树侧栏与主区扁平混在一起；' +
      '步骤：构建含 ti-app-layout-left / main / main-content / right 与交互子节点的树；' +
      '期望：输出 navigation/main/region/complementary 分区，且带声明名，侧栏链接嵌套在侧边导航下',
    () => {
      const root = setupRoot(`
        <ti-app-layout>
          <ti-app-layout-left>
            <a href="#/overview">总览</a>
            <a href="#/events">事件</a>
          </ti-app-layout-left>
          <ti-app-layout-main class="ti-app-layout-main-host">
            <ti-app-layout-main-header></ti-app-layout-main-header>
            <ti-app-layout-main-content>
              <tp-layout-content-header><h1>总览</h1></tp-layout-content-header>
              <tp-layout-content-body>
                <button type="button">购买弹性云服务器</button>
              </tp-layout-content-body>
            </ti-app-layout-main-content>
          </ti-app-layout-main>
          <ti-app-layout-right>
            <button type="button">帮助</button>
          </ti-app-layout-right>
        </ti-app-layout>
      `)

      expect(resolveA11yInfo(root.querySelector('ti-app-layout-left')!, a11yConfig)).toMatchObject({
        role: 'navigation',
        name: '侧边导航',
      })
      expect(resolveA11yInfo(root.querySelector('ti-app-layout-main')!, a11yConfig)).toMatchObject({
        role: 'main',
        name: '主内容区',
      })
      expect(resolveA11yInfo(root.querySelector('ti-app-layout-main-content')!, a11yConfig)).toMatchObject({
        role: 'region',
        name: '页面内容',
      })
      expect(resolveA11yInfo(root.querySelector('tp-layout-content-body')!, a11yConfig)).toMatchObject({
        role: 'region',
        name: '页面正文',
      })
      expect(resolveA11yInfo(root.querySelector('ti-app-layout-right')!, a11yConfig)).toMatchObject({
        role: 'complementary',
        name: '右侧面板',
      })

      const { yaml, lines } = buildA11yTree(root, a11yConfig)
      expect(lines.some((l) => /navigation.*"侧边导航"/.test(l))).toBe(true)
      expect(lines.some((l) => /main.*"主内容区"/.test(l))).toBe(true)
      expect(lines.some((l) => /region.*"页面内容"/.test(l))).toBe(true)
      expect(lines.some((l) => /region.*"页面正文"/.test(l))).toBe(true)
      expect(lines.some((l) => /complementary.*"右侧面板"/.test(l))).toBe(true)
      // banner 来自有内容的 tp-layout-content-header；空的 ti-app-layout-main-header 为空壳应省略
      expect(lines.some((l) => /banner.*"页面头部"/.test(l))).toBe(true)
      expect(lines.filter((l) => /banner.*"页面头部"/.test(l))).toHaveLength(1)
      // 复现：空/折叠右栏声明名被 Static-Lift 吸到父级 → `generic "右侧面板"` 错误包住侧栏+主区
      expect(lines.some((l) => /generic.*"右侧面板"/.test(l))).toBe(false)

      const navIdx = lines.findIndex((l) => /navigation.*"侧边导航"/.test(l))
      const overviewIdx = lines.findIndex((l) => /link.*#\d+.*"总览"/.test(l))
      const buyIdx = lines.findIndex((l) => /button.*#\d+.*"购买弹性云服务器"/.test(l))
      expect(navIdx).toBeGreaterThanOrEqual(0)
      expect(overviewIdx).toBeGreaterThan(navIdx)
      expect(buyIdx).toBeGreaterThan(overviewIdx)
      // 侧栏链接应比 navigation 多一层缩进
      expect(lines[overviewIdx].startsWith('  ')).toBe(true)
      expect(yaml).toMatch(/navigation.*"侧边导航"/)
    },
  )

  it(
    '复现：折叠的 ti-app-layout-right 仅有声明名、无有效子节点时，不应把「右侧面板」上提到外层 generic',
    () => {
      const root = setupRoot(`
        <ti-app-layout>
          <ti-app-layout-left>
            <a href="#/overview">总览</a>
          </ti-app-layout-left>
          <ti-app-layout-main>
            <button type="button">购买</button>
          </ti-app-layout-main>
          <ti-app-layout-right></ti-app-layout-right>
        </ti-app-layout>
      `)
      const { lines } = buildA11yTree(root, a11yConfig)
      expect(lines.some((l) => /generic.*"右侧面板"/.test(l))).toBe(false)
      expect(lines.some((l) => /navigation.*"侧边导航"/.test(l))).toBe(true)
      expect(lines.some((l) => /main.*"主内容区"/.test(l))).toBe(true)
      // 空壳 complementary 整段省略
      expect(lines.some((l) => /complementary.*"右侧面板"/.test(l))).toBe(false)
    },
  )

  it(
    '复现：真实 DOM 有 .ti-app-layout-right-container 包裹 ti-app-layout-right；' +
      '中间层 generic 不应把 complementary 声明名吸到外层变成 generic "右侧面板"',
    () => {
      const root = setupRoot(`
        <ti-app-layout>
          <div class="ti-app-layout-left-container">
            <ti-app-layout-left><a href="#/overview">总览</a></ti-app-layout-left>
          </div>
          <div class="ti-app-layout-main-container">
            <ti-app-layout-main><button type="button">购买</button></ti-app-layout-main>
          </div>
          <div class="ti-app-layout-right-container">
            <ti-app-layout-right></ti-app-layout-right>
          </div>
        </ti-app-layout>
      `)
      const { lines, yaml } = buildA11yTree(root, a11yConfig)
      expect(lines.some((l) => /generic.*"右侧面板"/.test(l))).toBe(false)
      expect(yaml).toMatch(/navigation.*"侧边导航"/)
      expect(yaml).toMatch(/main.*"主内容区"/)
      // 侧栏与主区应为兄弟，而不是挂在「右侧面板」下面
      const navIdx = lines.findIndex((l) => /navigation.*"侧边导航"/.test(l))
      const mainIdx = lines.findIndex((l) => /main.*"主内容区"/.test(l))
      expect(navIdx).toBeGreaterThanOrEqual(0)
      expect(mainIdx).toBeGreaterThan(navIdx)
      expect(lines[navIdx].match(/^ */)?.[0].length).toBe(lines[mainIdx].match(/^ */)?.[0].length)
    },
  )

  it(
    '复现：landmark 仅含直接文本、无元素子节点时不得当空壳省略',
    () => {
      const root = setupRoot(`
        <ti-app-layout-main-content>页面说明文案</ti-app-layout-main-content>
      `)
      const { lines } = buildA11yTree(root, a11yConfig)
      expect(lines.some((l) => /region.*"页面内容"/.test(l) || /region.*"页面说明文案"/.test(l))).toBe(true)
      expect(lines.some((l) => /region/.test(l))).toBe(true)
    },
  )

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
