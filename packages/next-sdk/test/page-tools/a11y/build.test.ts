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
      roles: [{ role: 'tab', selector: '.tab-item' }]
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
  it('aria-disabled 的 role=button 不分配 ref', () => {
    const root = setupRoot(`<div role="button" aria-disabled="true" tabindex="0">禁用</div>`)
    const { refMap } = buildA11yTree(root)
    expect(refMap.size).toBe(0)
  })

  it('按钮组通过 class 判定 selected', () => {
    const root = setupRoot(`<div class="btn-group"><button class="btn is-checked">选中项</button></div>`)
    const { yaml } = buildA11yTree(root, {
      states: { selected: { selector: '.btn-group .btn.is-checked' } }
    })
    expect(yaml).toMatch(/\[selected\]/)
  })

  it('报错元素通过 match 函数判定 error', () => {
    const root = setupRoot(`<div class="err-text">用户名不能为空</div>`)
    const errEl = root.querySelector('.err-text') as HTMLElement
    errEl.style.color = 'rgb(245, 34, 45)'
    const { yaml } = buildA11yTree(root, {
      states: { error: { match: (e) => window.getComputedStyle(e).color === 'rgb(245, 34, 45)' } }
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

/**
 * 非内容节点与 CSS 噪声过滤
 *
 * 背景（华为云控制台实测）：body 内联 iconfont `<style>@font-face { src: url(data:font/...;base64,...) }</style>`，
 * 若被 textContent / 静态上提吸进 generic name，单行可达数万 token。
 *
 * 规则：
 * - style / script / noscript / template 等不进树
 * - 文本收集跳过上述子树，禁止裸 textContent
 * - 名称若像 @font-face / data:font / 长 base64 则视为噪声丢弃
 */
describe('buildA11yTree - 非内容节点与 CSS 噪声过滤', () => {
  /** 模拟控制台 iconfont 内联样式（base64 截短但仍足够触发噪声检测） */
  const ICONFONT_STYLE = `
    @font-face {
      font-family: iconfont;
      src: url("data:font/woff2;base64,d09GMgABAAAAAAPEAAsAAAAAB/gAAAN2AAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHFQGYACDHAqDIIJ2ATYCJAMQCwoABCAFhGcHSxsBB8gehXEzfcQqKjPbRwsC1KUnyf7/2EHgrYTsFJCm8kQEY8JTYfXRWpt/xGxCOouop7eEncye2R5WCUk0kSmNBCF+oxKiaAKzwvv0p3JGCZ8FQDrGpjlobfxg8QIFqHtarSAbqFdPBbkKsDNYi/wvQQAG2cySr2/cLkH71FE8gGFqMfgC4kIxdZKpQiNvR6spFLgQONCVGmI7OsgN8iWwzf+86CBXuECiK4x9eo5fMeCpmc4GZdkWqJ+4PATkaAnogALSF+YUE+v9o6kJU+nUYJT9ppZCABcuJDTTvKqzwbZJ5ab0LvMvDwQSBcKBke8OQD6VVtCMzUFA8yoOEjobsijgqYx3AU5gLXCCkoT3kEhUXOzYYK0h7hLPja/vC9F01jQ3nQbrlumx6U66/u5LY/6+TQH9FG+VA5TjK64t/7G7/XdvDNwbOH5vU9AMK3i/4b7xggA0A8L3OYVmXTO9Np0Vqu/o64CA6pcB+56AOaB/M8ZF/49935Y+7vtAZ07XjucSD9zz3soVceepcQ+eMR7VHjGeI8JKof9h9WH76dnH4lLP42pn3Ycd2L2rxsPXs9q2eNREgQPhG7rypU6nz8Xm0P8XfQJp6lawCzj50PeTb6t/SM+zf7a7LTng0y+3p82/y/+wf79ti9c7haYiB1mLene8qxHHEtv+tP1IXK/3ulfyqil5D+sVUWTfrjZW/DPwTndjjsVIYCbEWeqWqgXs1T3lDdjUcVX9DcVhX3Vjywiv8n8uUwPgd7dLP/2gTaOb4hsoYPkXMwwFiZoaBk0rU9vKf4Gx4ZITEjBMF3yiHPjyOoTRD84HgQu/GBInYVC4iKU0SSp0THLhwEUFDNJYWW/iR0QNQnMDEjkjIPDmERJPrkHhzQulSarQCeQNDrz5hUF/4bGbSaIYU5eQyslAbRHaY8KAWSbuCy2QmXlqUhSvUJLaZBRlQcpm1yigpI856XxT4XMZstmhj6vseeR5IUazQ4d0LlhzeTQpiqzsKoI+w4clEggVDmGAaJyA2OiEBDCXzNPfV4AwyfBQSUCqkkpIsUnhiIyABFBr+gDquJB9Ug4xUeBwGAgjITI+yCrvJTwlFYJE5cMcCB2OgNUhETGJaJIYqhemN/q3twswMPbThBRKaELHsXCSeqrajePHBWE8MNvmTHQH6VaWkpupNgAAAA==") format("woff2");
    }
  `

  it(
    '场景：body 内联 iconfont <style> 含 @font-face data:font;base64（控制台实测）\n' +
      '问题：style 被当成 generic，整段 CSS/base64 进入 YAML，token 爆炸\n' +
      '期望：style 不进树；交互节点文案保留；无 @font-face / base64 / data:font',
    () => {
      const root = setupRoot(`
        <div>
          <style type="text/css">${ICONFONT_STYLE}</style>
          <a href="/console">云服务器控制台</a>
          <button type="button">包年/包月</button>
        </div>
      `)
      const { yaml, lines } = buildA11yTree(root)

      expect(yaml).not.toMatch(/@font-face/i)
      expect(yaml).not.toMatch(/base64,/i)
      expect(yaml).not.toMatch(/data:font\//i)
      expect(lines.some((l) => /link.*"云服务器控制台"/.test(l))).toBe(true)
      expect(lines.some((l) => /button.*"包年\/包月"/.test(l))).toBe(true)
    }
  )

  it(
    '场景：混合子树中 style 与面包屑/链接并列（对应日志里 generic "@font-face..." 包住整页）\n' +
      '问题：Static-Lift 把 style 文案上提到含交互子树的父 generic name\n' +
      '期望：父级不上提 CSS；面包屑链接正常；YAML 无字体噪声',
    () => {
      const root = setupRoot(`
        <div id="page-root">
          <style type="text/css">${ICONFONT_STYLE}</style>
          <span>/</span>
          <a href="/ecs">云服务器控制台</a>
          <span>/</span>
          <a href="/ecs/list">弹性云服务器</a>
          <span>购买弹性云服务器</span>
        </div>
      `)
      const { yaml, lines } = buildA11yTree(root)

      expect(yaml).not.toMatch(/@font-face/i)
      expect(yaml).not.toMatch(/base64,/i)
      expect(yaml).not.toMatch(/data:font\//i)
      // 父节点 name 不得是 CSS
      expect(lines.every((l) => !/generic\s+"@font-face/.test(l))).toBe(true)
      expect(lines.some((l) => /link.*"云服务器控制台"/.test(l))).toBe(true)
      expect(lines.some((l) => /link.*"弹性云服务器"/.test(l))).toBe(true)
      expect(yaml).toContain('购买弹性云服务器')
    }
  )

  it(
    '场景：<script> 内含业务字符串\n' +
      '问题：script 文本若被收集，会污染 name 且泄露无用源码\n' +
      '期望：script 不进树，YAML 不含脚本内字符串',
    () => {
      const root = setupRoot(`
        <div>
          <script>window.__SECRET_MARKER__ = "should-not-appear-in-a11y"</script>
          <button type="button">提交</button>
        </div>
      `)
      const { yaml, lines } = buildA11yTree(root)

      expect(yaml).not.toContain('should-not-appear-in-a11y')
      expect(yaml).not.toContain('__SECRET_MARKER__')
      expect(lines.some((l) => /button.*"提交"/.test(l))).toBe(true)
    }
  )

  it(
    '场景：<noscript> 降级文案与可见按钮并存\n' +
      '问题：noscript 内容对开启 JS 的 Agent 无意义，却可能被 textContent 吸收\n' +
      '期望：noscript 不进树；按钮文案保留',
    () => {
      const root = setupRoot(`
        <div>
          <noscript>请启用 JavaScript 以使用控制台</noscript>
          <button type="button">立即购买</button>
        </div>
      `)
      const { yaml, lines } = buildA11yTree(root)

      expect(yaml).not.toContain('请启用 JavaScript')
      expect(lines.some((l) => /button.*"立即购买"/.test(l))).toBe(true)
    }
  )

  it(
    '场景：<template> 内含未激活的 DOM 文案\n' +
      '问题：template 内容默认不可见，不应出现在 a11y YAML\n' +
      '期望：template 内文案不出现；页面真实按钮保留',
    () => {
      const root = setupRoot(`
        <div>
          <template><span>模板内隐藏文案-TEMPLATE_MARKER</span></template>
          <button type="button">自定义购买</button>
        </div>
      `)
      const { yaml, lines } = buildA11yTree(root)

      expect(yaml).not.toContain('TEMPLATE_MARKER')
      expect(lines.some((l) => /button.*"自定义购买"/.test(l))).toBe(true)
    }
  )

  it(
    '场景：纯静态折叠时父节点 textContent 含 style（无交互子树）\n' +
      '问题：规则 1 折叠兜底若用裸 textContent，仍会把 @font-face 拼进父 name\n' +
      '期望：折叠后的 option/generic 名称不含 CSS 噪声，只保留可见文案',
    () => {
      const root = setupRoot(`
        <div role="option">
          <style type="text/css">${ICONFONT_STYLE}</style>
          <span>可用区</span>
          <span>随机分配</span>
        </div>
      `)
      const { yaml, lines } = buildA11yTree(root)
      const contentLines = lines.filter((l) => l.trim().startsWith('-'))

      expect(yaml).not.toMatch(/@font-face/i)
      expect(yaml).not.toMatch(/base64,/i)
      expect(contentLines.some((l) => l.includes('可用区'))).toBe(true)
      expect(contentLines.some((l) => l.includes('随机分配'))).toBe(true)
    }
  )
})

/**
 * 父子文字去重与折叠（Static-Lift + Interactive-Keep）
 *
 * 背景（华为云控制台 ECS 快速购买页实测）：
 * AccName 会把 button/link 等子节点文案汇总进 row/cell/generic 父节点，
 * YAML 出现大量「父 name ≈ 全部子文案拼接」的重复，浪费 LLM token。
 *
 * 规则：
 * 1. 子树全静态 → 折叠为一行，文字留在父节点
 * 2. 混合子树 → 静态文案上提到父 name（成功才省略静态子）；交互分支保留；
 *    禁止吸收交互文案；上提失败则静态子独立输出（文字不丢弃）
 */
describe('buildA11yTree - 父子文字去重与折叠', () => {
  it(
    '场景：混合子树——静态标签 + 多个按钮（计费模式）\n' +
      '问题：AccName 汇总成 row/cell "计费模式 包年/包月 按需计费"，与子 button 重复\n' +
      '期望：静态文案上提到 cell，交互按钮保留为子节点：\n' +
      '  - cell "计费模式"\n' +
      '    - button "包年/包月"\n' +
      '    - button "按需计费"',
    () => {
      const root = setupRoot(`
        <div role="row">
          <div role="cell">
            <span>计费模式</span>
            <button type="button">包年/包月</button>
            <button type="button">按需计费</button>
          </div>
        </div>
      `)
      const { yaml, lines } = buildA11yTree(root)

      expect(yaml.split('包年/包月').length - 1).toBe(1)
      expect(yaml.split('按需计费').length - 1).toBe(1)
      expect(yaml.split('计费模式').length - 1).toBe(1)
      expect(yaml).not.toMatch(/"计费模式\s*包年\/包月\s*按需计费"/)
      expect(lines.some((l) => /cell\s+"计费模式"/.test(l))).toBe(true)
      expect(lines.some((l) => /button.*"包年\/包月"/.test(l))).toBe(true)
      expect(lines.some((l) => /button.*"按需计费"/.test(l))).toBe(true)
      // 静态 span 已上提，不应再单独输出一层 generic "计费模式"
      expect(lines.filter((l) => /"计费模式"/.test(l))).toHaveLength(1)
    }
  )

  it(
    '场景：纯文字节点 + 多个按钮\n' +
      '问题：丢失文字节点\n' +
      '期望：文字节点上提到 cell，交互按钮保留为子节点：\n' +
      '  - cell "计费模式"\n' +
      '    - button "包年/包月"\n' +
      '    - button "按需计费"',
    () => {
      const root = setupRoot(`
        <div role="row">
          <div role="cell">
            计费模式
            <button type="button">包年/包月</button>
            <button type="button">按需计费</button>
          </div>
        </div>
      `)
      const { yaml, lines } = buildA11yTree(root)

      // 保字：裸文本「计费模式」不得丢失
      expect(yaml.split('计费模式').length - 1).toBe(1)
      expect(yaml.split('包年/包月').length - 1).toBe(1)
      expect(yaml.split('按需计费').length - 1).toBe(1)
      expect(yaml).not.toMatch(/"计费模式\s*包年\/包月\s*按需计费"/)
      expect(lines.some((l) => /cell\s+"计费模式"/.test(l))).toBe(true)
      expect(lines.some((l) => /button.*"包年\/包月"/.test(l))).toBe(true)
      expect(lines.some((l) => /button.*"按需计费"/.test(l))).toBe(true)
      expect(lines.filter((l) => /"计费模式"/.test(l))).toHaveLength(1)
    }
  )

  it(
    '场景：可交互按钮外包一层同文案的布局容器（如顶栏「打开服务列表」）\n' +
      '问题：修复前输出两层同名节点浪费 token：\n' +
      '  - generic "打开服务列表"\n' +
      '    - button "打开服务列表"\n' +
      '期望：无静态兄弟可上提时父容器穿透，只保留一行 button（文字不丢）',
    () => {
      const root = setupRoot(`
        <div>
          <button type="button" title="打开服务列表">打开服务列表</button>
        </div>
      `)
      const { lines } = buildA11yTree(root)
      const contentLines = lines.filter((l) => l.trim().startsWith('-'))

      expect(contentLines).toHaveLength(1)
      expect(contentLines[0]).toMatch(/button.*"打开服务列表"/)
      expect(yamlHasDuplicateAccessibleName(lines, '打开服务列表')).toBe(false)
    }
  )

  it(
    '场景：纯展示信息的嵌套 option/region/span（如「其他配置 → 可用区 : 随机分配」）\n' +
      '问题：修复前层层重复同一语义：\n' +
      '  - option "可用区 : 随机分配"\n' +
      '    - region "可用区: 随机分配"\n' +
      '      - generic "可用区"\n' +
      '期望：子树无可交互节点时折叠为一行，文字只留在父 option 上',
    () => {
      const root = setupRoot(`
        <div role="option">
          <div role="region" aria-label="可用区: 随机分配">
            <span>可用区</span>
            <span>随机分配</span>
          </div>
        </div>
      `)
      const { lines } = buildA11yTree(root)
      const contentLines = lines.filter((l) => l.trim().startsWith('-'))

      expect(contentLines).toHaveLength(1)
      expect(contentLines[0]).toMatch(/option/)
      expect(contentLines[0]).toMatch(/可用区/)
      expect(contentLines[0]).toMatch(/随机分配/)
      expect(contentLines.some((l) => l.includes('region'))).toBe(false)
    }
  )

  it(
    '场景：带 aria-label 的 region 内仅含交互控件（如「基础配置」）\n' +
      '问题：若父节点吸收子按钮文案，会变成 "基础配置 包年/包月"\n' +
      '期望：父保留 aria-label，子 button 独立保留文案',
    () => {
      const root = setupRoot(`
        <section aria-label="基础配置">
          <button type="button">包年/包月</button>
        </section>
      `)
      const { yaml, lines } = buildA11yTree(root)

      expect(lines.some((l) => /region.*"基础配置"/.test(l))).toBe(true)
      expect(lines.some((l) => /button.*"包年\/包月"/.test(l))).toBe(true)
      expect(yaml).not.toMatch(/"基础配置\s*包年\/包月"/)
    }
  )

  it(
    '场景：aria-label 与额外静态说明并存（声明名 ≠ 说明文案）\n' +
      '问题：若因有 aria-label 而丢弃说明 span，AI 会丢失业务提示\n' +
      '期望：region 保留「基础配置」，说明「以下选项创建后不可更改」仍作为子节点输出，按钮独立',
    () => {
      const root = setupRoot(`
        <section aria-label="基础配置">
          <span>以下选项创建后不可更改</span>
          <button type="button">包年/包月</button>
        </section>
      `)
      const { yaml, lines } = buildA11yTree(root)

      expect(lines.some((l) => /region.*"基础配置"/.test(l))).toBe(true)
      expect(lines.some((l) => l.includes('以下选项创建后不可更改'))).toBe(true)
      expect(lines.some((l) => /button.*"包年\/包月"/.test(l))).toBe(true)
      expect(yaml).not.toMatch(/"基础配置\s*以下选项/)
      expect(yaml).not.toMatch(/"基础配置\s*包年\/包月"/)
    }
  )

  it(
    '场景：可点击父容器内再嵌套可点击子节点（如用户头像菜单 GT-zzcr）\n' +
      '问题：修复前父子同名：\n' +
      '  - generic #15 [cursor=pointer] "GT-zzcr"\n' +
      '    - menuitem #16 "GT-zzcr"\n' +
      '期望：父节点可保留 ref，但不输出从子节点吸收的同名文案；「GT-zzcr」只出现在子交互节点上',
    () => {
      const root = setupRoot(`
        <div id="user-menu">
          <button type="button">GT-zzcr</button>
        </div>
      `)
      const userMenu = root.querySelector('#user-menu') as Element
      const { lines } = buildA11yTree(root, { whitelist: [userMenu] })
      const namedLines = lines.filter((l) => /"GT-zzcr"/.test(l))

      expect(namedLines).toHaveLength(1)
      expect(namedLines[0]).toMatch(/button.*"GT-zzcr"/)
      const parentWithRef = lines.find((l) => /^\s*- generic #\d+/.test(l))
      expect(parentWithRef).toBeTruthy()
      expect(parentWithRef!).not.toMatch(/"GT-zzcr"/)
    }
  )

  it(
    '场景：混合子树——标签 + combobox + 说明 + 链接（区域行）\n' +
      '问题：cell AccName 把交互文案也拼进长 name，与子节点重复且浪费 token\n' +
      '期望：静态文案全部上提到 cell（文字不丢），交互节点保留为子级：\n' +
      '  - cell "区域 云服务器创建后无法更改区域。"\n' +
      '    - combobox "华北-北京四"\n' +
      '    - link "如何选择区域"',
    () => {
      const root = setupRoot(`
        <div role="row">
          <div role="cell">
            <span>区域</span>
            <div role="combobox" tabindex="0" aria-label="华北-北京四">华北-北京四</div>
            <span>云服务器创建后无法更改区域。</span>
            <a href="/help">如何选择区域</a>
          </div>
        </div>
      `)
      const { yaml, lines } = buildA11yTree(root)

      // 保字：两段静态文案都必须出现
      expect(yaml).toContain('区域')
      expect(yaml).toContain('云服务器创建后无法更改区域。')
      expect(lines.some((l) => /combobox.*"华北-北京四"/.test(l))).toBe(true)
      expect(lines.some((l) => /link.*"如何选择区域"/.test(l))).toBe(true)
      // 上提后挂在 cell 上，且不得吸收交互文案
      expect(lines.some((l) => /cell\s+"区域\s+云服务器创建后无法更改区域。"/.test(l))).toBe(true)
      expect(yaml).not.toMatch(/cell\s+"[^"]*华北-北京四[^"]*"/)
      expect(yaml).not.toMatch(/cell\s+"[^"]*如何选择区域[^"]*"/)
    }
  )
})

/**
 * 通用 cursor:pointer 可点击元素识别
 *
 * 背景（华为云控制台实测）：Angular/自定义组件中大量「无 role、无 tabindex、仅靠 (click) 绑定」的
 * 可点击卡片（如 <div id="resource-card" class="card-wrapper">），此前因 role=generic 被漏判为不可交互。
 *
 * 规则（对齐 browser-use 等业界 DOM 提取器）：cursor:pointer 是可点击性的通用兜底信号；
 * 但 CSS cursor 会向子孙继承，故以「自身声明指针手势」（元素为 pointer 且父级非 pointer）
 * 定位真正的可点击边界元素，避免容器把 ref 传染给全部子孙。
 */
describe('buildA11yTree - 通用 cursor:pointer 可点击元素识别', () => {
  it(
    '场景：无 role / 无 tabindex 的自定义可点击卡片（cursor:pointer）\n' +
      '问题：role=generic 被漏判为不可交互，卡片拿不到 ref\n' +
      '期望：卡片自身分配 ref，且带 cursor=pointer token 与内容名',
    () => {
      const root = setupRoot(`
        <div class="card-list">
          <div id="resource-card" class="card-wrapper">
            <span class="image-ECS"></span>
            <div class="info">
              <div class="info-title">弹性云服务器 ECS</div>
              <div class="info-content">
                <span class="instance-number">1</span>
                <span class="service-name">云服务器</span>
              </div>
            </div>
          </div>
        </div>
      `)
      const card = root.querySelector('#resource-card') as HTMLElement
      card.style.cursor = 'pointer'

      const { yaml, refMap } = buildA11yTree(root)

      expect(Array.from(refMap.values())).toContain(card)
      expect(yaml).toMatch(/#\d+.*cursor=pointer.*"[^"]*弹性云服务器 ECS[^"]*"/)
    }
  )

  it(
    '场景：可点击卡片内部子孙继承 cursor:pointer\n' +
      '问题：若仅凭 computed cursor 判定，父容器可点击性会传染给全部子孙，产生大量误报 ref\n' +
      '期望：只有自身声明 pointer 的卡片拿到 ref，仅继承 pointer 的内部子节点不再各自分配 ref',
    () => {
      const root = setupRoot(`
        <div class="card-list">
          <div id="resource-card" class="card-wrapper">
            <div id="inner-info" class="info">
              <div class="info-title">弹性云服务器 ECS</div>
            </div>
          </div>
        </div>
      `)
      const card = root.querySelector('#resource-card') as HTMLElement
      const inner = root.querySelector('#inner-info') as HTMLElement
      // 卡片与子节点的 computed cursor 都是 pointer（模拟继承），但只有卡片是"自身声明"边界
      card.style.cursor = 'pointer'
      inner.style.cursor = 'pointer'

      const { refMap } = buildA11yTree(root)
      const refElements = Array.from(refMap.values())

      expect(refElements).toContain(card)
      expect(refElements).not.toContain(inner)
    }
  )

  it(
    '场景：无 name 的 tp-icon.common-icon 箭头图标（父级 cursor=auto，自身 cursor=pointer）\n' +
      '问题：虽是真正可点击边界，但因 role=generic 且无 name 被漏判\n' +
      '期望：tp-icon 分配 ref，并通过 exposedAttributes 输出 data-qa-id token',
    () => {
      const root = setupRoot(`
        <div class="ti-container-head">
          <span class="suite-icon-container">
            <span>
              <tp-icon class="common-icon" data-qa-id="ecm.ecs-dashboard.b" id="arrow-icon">
                <svg><path d="M15 11"/></svg>
              </tp-icon>
            </span>
          </span>
        </div>
      `)
      const icon = root.querySelector('#arrow-icon') as HTMLElement
      icon.style.cursor = 'pointer'

      const { yaml, refMap } = buildA11yTree(root, {
        roles: [{ role: 'button', selector: 'tp-icon.common-icon' }],
        exposedAttributes: ['data-qa-id']
      })

      expect(Array.from(refMap.values())).toContain(icon)
      expect(yaml).toMatch(/button #\d+.*cursor=pointer.*data-qa-id=.*ecm\.ecs-dashboard\.b/)
    }
  )

  it('场景：普通静态 generic 容器（无 cursor:pointer）\n' + '期望：不因本次改动误判为可交互（无 ref）', () => {
    const root = setupRoot(`
        <div class="plain-card">
          <div class="title">纯展示卡片</div>
        </div>
      `)
    const plain = root.querySelector('.plain-card') as HTMLElement

    const { refMap } = buildA11yTree(root)
    expect(Array.from(refMap.values())).not.toContain(plain)
  })

  it(
    '场景（华为云控制台实测）：卡片的 cursor:pointer 定义在 :hover 伪类上\n' +
      '问题：静止态 getComputedStyle 读到 auto，仅凭 computed cursor 会漏判这类可点击卡片\n' +
      '期望：扫描样式表识别 :hover 手势，卡片自身分配 ref；仅继承的子孙不分配',
    () => {
      const root = setupRoot(`
        <style>
          .container-wrapper .shadow:hover { cursor: pointer; }
        </style>
        <div class="container-wrapper">
          <div id="resource-card" class="shadow card-wrapper">
            <span class="mr20 image-ECS"></span>
            <div class="info">
              <div class="info-title">弹性云服务器 ECS</div>
              <div class="info-content">
                <span class="instance-number">1</span>
                <span class="service-name">云服务器</span>
              </div>
            </div>
          </div>
        </div>
      `)
      const card = root.querySelector('#resource-card') as HTMLElement
      const info = root.querySelector('.info') as HTMLElement

      const { yaml, refMap } = buildA11yTree(root)
      const refElements = Array.from(refMap.values())

      expect(refElements).toContain(card)
      expect(refElements).not.toContain(info)
      expect(yaml).toMatch(/#\d+.*"[^"]*弹性云服务器 ECS[^"]*"/)
    }
  )

  it('场景：:focus 伪类下声明 cursor:pointer\n' + '期望：同样识别为可点击（覆盖 focus/active 等交互态手势）', () => {
    const root = setupRoot(`
        <style>
          .focusable-tile:focus { cursor: pointer; }
        </style>
        <div class="focusable-tile">可聚焦磁贴</div>
      `)
    const tile = root.querySelector('.focusable-tile') as HTMLElement

    const { refMap } = buildA11yTree(root)
    expect(Array.from(refMap.values())).toContain(tile)
  })
})

/** 统计某 accessible name 是否在多行 YAML 中重复出现（父子同名的典型信号） */
function yamlHasDuplicateAccessibleName(lines: string[], name: string): boolean {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`"${escaped}"`)
  return lines.filter((l) => re.test(l)).length > 1
}
