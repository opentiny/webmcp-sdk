import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { buildA11yTree } from '../../../page-tools/a11y/build'

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

describe('buildA11yTree - 白名单/黑名单', () => {
  it('黑名单：Element 引用会排除该元素及其子树', () => {
    const root = setupRoot(`
      <button id="keep">保留</button>
      <div id="excluded"><button id="child">子按钮</button></div>
    `)
    const excluded = root.querySelector('#excluded') as Element
    const { yaml } = buildA11yTree(root, { blacklist: [excluded] })
    expect(yaml).toContain('保留')
    expect(yaml).not.toContain('子按钮')
  })

  it('黑名单：CSS 选择器字符串（含属性选择器）动态解析排除元素', () => {
    const root = setupRoot(`
      <button data-track="pixel">追踪像素按钮</button>
      <button>正常按钮</button>
    `)
    const { yaml } = buildA11yTree(root, { blacklist: ['[data-track="pixel"]'] })
    expect(yaml).not.toContain('追踪像素按钮')
    expect(yaml).toContain('正常按钮')
  })

  it('白名单：Element 引用强制分配 ref（即使原本不是交互元素）', () => {
    const root = setupRoot(`<div id="card">自定义卡片</div>`)
    const card = root.querySelector('#card') as Element
    const { refMap } = buildA11yTree(root, { whitelist: [card] })
    expect(Array.from(refMap.values())).toContain(card)
  })

  it('白名单：CSS 选择器字符串强制分配 ref', () => {
    const root = setupRoot(`<div class="custom-clickable-card">卡片内容</div>`)
    const { yaml, refMap } = buildA11yTree(root, { whitelist: ['.custom-clickable-card'] })
    expect(refMap.size).toBeGreaterThan(0)
    expect(yaml).toMatch(/#\d+.*"卡片内容"/)
  })

  it('白名单与黑名单混合使用：分别生效且不互相影响', () => {
    const root = setupRoot(`
      <div id="whitelisted">白名单卡片</div>
      <button id="blacklisted">黑名单按钮</button>
    `)
    const whitelisted = root.querySelector('#whitelisted') as Element
    const blacklisted = root.querySelector('#blacklisted') as Element
    const { yaml, refMap } = buildA11yTree(root, { whitelist: [whitelisted], blacklist: [blacklisted] })
    expect(Array.from(refMap.values())).toContain(whitelisted)
    expect(yaml).not.toContain('黑名单按钮')
  })
})

describe('buildA11yTree - roles 自定义角色规则', () => {
  it('无 role 属性的 .tab-item 被识别为 tab 并出现在 YAML 输出中', () => {
    const root = setupRoot(`<div class="my-tabs"><div class="tab-item">概览</div></div>`)
    const { yaml } = buildA11yTree(root, {
      roles: [{ role: 'tab', selector: '.tab-item' }],
    })
    expect(yaml).toMatch(/-\s+tab\b.*"概览"/)
  })

  it('显式 role 不会被普通规则覆盖，force:true 时才覆盖', () => {
    const root = setupRoot(`<div class="tab-item" role="button">按钮态Tab</div>`)
    const notForced = buildA11yTree(root, { roles: [{ role: 'tab', selector: '.tab-item' }] })
    expect(notForced.yaml).toContain('button')
    expect(notForced.yaml).not.toMatch(/-\s+tab\b/)

    const forced = buildA11yTree(root, { roles: [{ role: 'tab', selector: '.tab-item', force: true }] })
    expect(forced.yaml).toMatch(/-\s+tab\b/)
  })
})

describe('buildA11yTree - states 自定义状态规则', () => {
  it('按钮组通过 class 判定 selected', () => {
    const root = setupRoot(`<div class="btn-group"><button class="btn is-checked">选中项</button></div>`)
    const { yaml } = buildA11yTree(root, {
      states: { selected: { selector: '.btn-group .btn.is-checked' } },
    })
    expect(yaml).toMatch(/\[selected\]/)
  })

  it('报错元素通过 match 函数判定 error', () => {
    const root = setupRoot(`<div class="err-text">用户名不能为空</div>`)
    const errEl = root.querySelector('.err-text') as HTMLElement
    errEl.style.color = 'rgb(245, 34, 45)'
    const { yaml } = buildA11yTree(root, {
      states: { error: { match: (e) => window.getComputedStyle(e).color === 'rgb(245, 34, 45)' } },
    })
    expect(yaml).toMatch(/\[error\]/)
  })
})

describe('buildA11yTree - 树形状选项回归（不受本次重构影响）', () => {
  it('pruneUnnamed 默认 true：无 ref 且无 name 的容器被透明穿透', () => {
    const root = setupRoot(`<div><div><button>按钮</button></div></div>`)
    const { yaml } = buildA11yTree(root)
    // 外层无意义的 generic 容器被穿透，只剩 button 一行结构
    const lines = yaml.split('\n').filter((l) => l.trim().startsWith('-'))
    expect(lines.some((l) => l.includes('button'))).toBe(true)
    expect(lines.every((l) => !l.includes('generic'))).toBe(true)
  })

  it('preserveRoles 强制保留指定角色，即使无 name 也不穿透', () => {
    const root = setupRoot(`<table><tbody><tr><td>单元格</td></tr></tbody></table>`)
    const { yaml } = buildA11yTree(root, { preserveRoles: ['table', 'row'] })
    expect(yaml).toContain('table')
    expect(yaml).toContain('row')
  })
})
