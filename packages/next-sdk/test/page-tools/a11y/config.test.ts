import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  resolveA11yRole,
  resolveA11yStates,
  resolveA11yInfo,
  mergeA11yConfig,
  mergeA11yConfigs,
  defineA11yConfig,
  extractSelectors,
  type A11yConfig,
} from '../../../page-tools/a11y/config'

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

describe('resolveA11yRole', () => {
  it('标签隐式角色：无规则时按 TAG_ROLE_MAP 推断', () => {
    expect(resolveA11yRole(el('<button>btn</button>'))).toBe('button')
    expect(resolveA11yRole(el('<a href="#">link</a>'))).toBe('link')
  })

  it('INPUT_TYPE_ROLE：不同 type 的 input 角色不同', () => {
    expect(resolveA11yRole(el('<input type="checkbox" />'))).toBe('checkbox')
    expect(resolveA11yRole(el('<input type="radio" />'))).toBe('radio')
    expect(resolveA11yRole(el('<input type="text" />'))).toBe('textbox')
  })

  it('无匹配时兜底为 generic', () => {
    expect(resolveA11yRole(el('<div></div>'))).toBe('generic')
  })

  it('显式 role 属性优先，且不会被普通规则覆盖', () => {
    const target = el('<div role="dialog" class="tab-item"></div>')
    const config = defineA11yConfig({ roles: [{ role: 'tab', selector: '.tab-item' }] })
    expect(resolveA11yRole(target, config)).toBe('dialog')
  })

  it('自定义 selector 规则命中后赋予新角色', () => {
    const target = el('<div class="tab-item"></div>')
    const config = defineA11yConfig({ roles: [{ role: 'tab', selector: '.tab-item' }] })
    expect(resolveA11yRole(target, config)).toBe('tab')
  })

  it('自定义 match 函数规则命中后赋予新角色', () => {
    const target = el('<div data-kind="switcher"></div>')
    const config = defineA11yConfig({
      roles: [{ role: 'switch', match: (e) => e.getAttribute('data-kind') === 'switcher' }],
    })
    expect(resolveA11yRole(target, config)).toBe('switch')
  })

  it('force: true 时覆盖元素已有的显式 role', () => {
    const target = el('<div role="button" class="tab-item"></div>')
    const config = defineA11yConfig({ roles: [{ role: 'tab', selector: '.tab-item', force: true }] })
    expect(resolveA11yRole(target, config)).toBe('tab')
  })

  it('多条规则按数组顺序命中第一条生效', () => {
    const target = el('<div class="a b"></div>')
    const config = defineA11yConfig({
      roles: [
        { role: 'first', selector: '.a' },
        { role: 'second', selector: '.b' },
      ],
    })
    expect(resolveA11yRole(target, config)).toBe('first')
  })
})

describe('resolveA11yStates - 标准 ARIA 零配置检测', () => {
  it('checked: aria-checked=true/false', () => {
    expect(resolveA11yStates(el('<div role="checkbox" aria-checked="true"></div>'))).toContain('checked')
    expect(resolveA11yStates(el('<div role="checkbox" aria-checked="false"></div>'))).toContain('unchecked')
  })

  it('checked: aria-checked=mixed 三态', () => {
    expect(resolveA11yStates(el('<div role="checkbox" aria-checked="mixed"></div>'))).toContain('checked=mixed')
  })

  it('checked: 原生 checkbox/radio 的 checked 属性', () => {
    const checkbox = el('<input type="checkbox" />') as HTMLInputElement
    checkbox.checked = true
    expect(resolveA11yStates(checkbox)).toContain('checked')

    const radio = el('<input type="radio" />') as HTMLInputElement
    expect(resolveA11yStates(radio)).toContain('unchecked')
  })

  it('checked: label[for] 关联的 checkbox 状态', () => {
    const wrapper = document.createElement('div')
    wrapper.innerHTML = '<input id="c1" type="checkbox" /><label for="c1">选项</label>'
    document.body.appendChild(wrapper)
    const input = wrapper.querySelector('#c1') as HTMLInputElement
    input.checked = true
    const label = wrapper.querySelector('label') as Element
    expect(resolveA11yStates(label)).toContain('checked')
  })

  it('selected: aria-selected=true', () => {
    expect(resolveA11yStates(el('<div role="tab" aria-selected="true"></div>'))).toContain('selected')
  })

  it('selected: 内置 class 启发式（如 is-active）', () => {
    expect(resolveA11yStates(el('<button class="is-active">Tab1</button>'))).toContain('selected')
  })

  it('pressed: aria-pressed 三态', () => {
    expect(resolveA11yStates(el('<button aria-pressed="true"></button>'))).toContain('pressed')
    expect(resolveA11yStates(el('<button aria-pressed="mixed"></button>'))).toContain('pressed=mixed')
    expect(resolveA11yStates(el('<button aria-pressed="false"></button>'))).not.toContain('pressed')
  })

  it('current: aria-current 各种取值', () => {
    expect(resolveA11yStates(el('<a aria-current="true"></a>'))).toContain('current')
    expect(resolveA11yStates(el('<a aria-current="page"></a>'))).toContain('current=page')
    expect(resolveA11yStates(el('<a aria-current="step"></a>'))).toContain('current=step')
  })

  it('disabled: aria-disabled 与原生 disabled', () => {
    expect(resolveA11yStates(el('<div aria-disabled="true"></div>'))).toContain('disabled')
    const btn = el('<button disabled></button>') as HTMLButtonElement
    expect(resolveA11yStates(btn)).toContain('disabled')
  })

  it('expanded: aria-expanded=true', () => {
    expect(resolveA11yStates(el('<button aria-expanded="true"></button>'))).toContain('expanded')
  })

  it('hasPopup: aria-haspopup 非 false 值', () => {
    expect(resolveA11yStates(el('<button aria-haspopup="menu"></button>'))).toContain('hasPopup')
    expect(resolveA11yStates(el('<button aria-haspopup="false"></button>'))).not.toContain('hasPopup')
  })

  it('invalid: aria-invalid 取值', () => {
    expect(resolveA11yStates(el('<input aria-invalid="true" />'))).toContain('invalid')
    expect(resolveA11yStates(el('<input aria-invalid="spelling" />'))).toContain('invalid=spelling')
  })

  it('readonly: aria-readonly 与原生 readOnly', () => {
    expect(resolveA11yStates(el('<input aria-readonly="true" />'))).toContain('readonly')
    const input = el('<input />') as HTMLInputElement
    input.readOnly = true
    expect(resolveA11yStates(input)).toContain('readonly')
  })

  it('required: aria-required 与原生 required', () => {
    expect(resolveA11yStates(el('<input aria-required="true" />'))).toContain('required')
    const input = el('<input />') as HTMLInputElement
    input.required = true
    expect(resolveA11yStates(input)).toContain('required')
  })

  it('busy: aria-busy=true', () => {
    expect(resolveA11yStates(el('<div aria-busy="true"></div>'))).toContain('busy')
  })

  it('orientation: aria-orientation', () => {
    expect(resolveA11yStates(el('<div aria-orientation="vertical"></div>'))).toContain('orientation=vertical')
  })

  it('sort: aria-sort，排除 none', () => {
    // 用 div + role="columnheader" 代替裸 <th>，避免 innerHTML 解析时因缺少 <table>/<tr> 上下文被浏览器/jsdom 丢弃
    expect(resolveA11yStates(el('<div role="columnheader" aria-sort="ascending"></div>'))).toContain('sort=ascending')
    expect(resolveA11yStates(el('<div role="columnheader" aria-sort="none"></div>'))).not.toContain('sort=none')
  })

  it('multiselectable: aria-multiselectable=true', () => {
    expect(resolveA11yStates(el('<div aria-multiselectable="true"></div>'))).toContain('multiselectable')
  })

  it('valuenow/valuetext', () => {
    const tokens = resolveA11yStates(el('<div aria-valuenow="50" aria-valuetext="中"></div>'))
    expect(tokens).toContain('valuenow="50"')
    expect(tokens).toContain('valuetext="中"')
  })

  it('heading level：h1-h6 与 aria-level', () => {
    expect(resolveA11yStates(el('<h2>标题</h2>'))).toContain('level=2')
    expect(resolveA11yStates(el('<div role="heading" aria-level="3"></div>'))).toContain('level=3')
  })

  it('cursor=pointer', () => {
    const target = el('<div></div>') as HTMLElement
    target.style.cursor = 'pointer'
    expect(resolveA11yStates(target)).toContain('cursor=pointer')
  })

  it('value=""：input/textarea/select 有值时输出', () => {
    const input = el('<input />') as HTMLInputElement
    input.value = 'hello'
    expect(resolveA11yStates(input)).toContain('value="hello"')
  })

  it('opens-new-tab：a[target=_blank]', () => {
    expect(resolveA11yStates(el('<a target="_blank"></a>'))).toContain('opens-new-tab')
  })
})

describe('resolveA11yStates - 自定义规则', () => {
  it('states.<标准名> 用 selector 命中标准状态名', () => {
    const target = el('<button class="btn is-checked"></button>')
    const config = defineA11yConfig({ states: { selected: { selector: '.is-checked' } } })
    expect(resolveA11yStates(target, config)).toContain('selected')
  })

  it('states.<标准名> 用 match 函数命中', () => {
    const target = el('<span class="form-tip--warn">警告文本</span>')
    const config = defineA11yConfig({ states: { warning: { selector: '.form-tip--warn' } } })
    expect(resolveA11yStates(target, config)).toContain('warning')
  })

  it('selector 支持字符串数组：命中数组中任意一个 class 均视为选中', () => {
    const legacy = el('<button class="btn is-active"></button>')
    const modern = el('<button class="btn is-checked"></button>')
    const none = el('<button class="btn"></button>')
    const config = defineA11yConfig({
      states: { selected: { selector: ['.is-active', '.is-checked'] } },
    })
    expect(resolveA11yStates(legacy, config)).toContain('selected')
    expect(resolveA11yStates(modern, config)).toContain('selected')
    expect(resolveA11yStates(none, config)).not.toContain('selected')
  })

  it('error 与 warning 同时命中时只输出 error（优先级）', () => {
    const target = el('<div class="is-error is-warning">错误</div>')
    const config = defineA11yConfig({
      states: {
        error: { selector: '.is-error' },
        warning: { selector: '.is-warning' },
      },
    })
    const tokens = resolveA11yStates(target, config)
    expect(tokens).toContain('error')
    expect(tokens).not.toContain('warning')
  })

  it('命中非标准自定义状态名时直接输出同名 token', () => {
    const target = el('<div class="highlight-row"></div>')
    const config = defineA11yConfig({ states: { highlighted: { selector: '.highlight-row' } } })
    expect(resolveA11yStates(target, config)).toContain('highlighted')
  })

  it('exposedAttributes：属性存在时输出属性 token，不存在时不输出', () => {
    const withAttr = el('<div data-testid="foo"></div>')
    const withoutAttr = el('<div></div>')
    const config = defineA11yConfig({ exposedAttributes: ['data-testid'] })
    expect(resolveA11yStates(withAttr, config)).toContain('data-testid="foo"')
    const tokensWithout = resolveA11yStates(withoutAttr, config)
    expect(tokensWithout.some((t) => t.includes('data-testid'))).toBe(false)
  })
})

describe('resolveA11yInfo', () => {
  it('整合 role 与 tokens 的返回结构', () => {
    const target = el('<div class="tab-item" aria-selected="true"></div>')
    const config = defineA11yConfig({ roles: [{ role: 'tab', selector: '.tab-item' }] })
    const info = resolveA11yInfo(target, config)
    expect(info.role).toBe('tab')
    expect(info.tokens).toContain('selected')
  })
})

describe('mergeA11yConfig / mergeA11yConfigs', () => {
  it('默认值与用户配置按数组拼接，不丢默认规则', () => {
    const merged = mergeA11yConfig({ roles: [{ role: 'tab', selector: '.tab' }] })
    expect(merged.roles).toEqual([{ role: 'tab', selector: '.tab' }])
    // 默认 states.error/warning/selected 规则仍然存在
    expect(merged.states.error?.length).toBeGreaterThan(0)
    expect(merged.states.warning?.length).toBeGreaterThan(0)
    expect(merged.states.selected?.length).toBeGreaterThan(0)
  })

  it('states 按 key 独立合并', () => {
    const merged = mergeA11yConfig({ states: { current: { selector: '.step-current' } } })
    expect(merged.states.current).toEqual([{ selector: '.step-current' }])
    expect(merged.states.error?.length).toBeGreaterThan(0)
  })

  it('未提供的字段回退默认空数组', () => {
    const merged = mergeA11yConfig()
    expect(merged.whitelist).toEqual([])
    expect(merged.blacklist).toEqual([])
    expect(merged.exposedAttributes).toEqual([])
  })

  it('mergeA11yConfigs 对两份任意 A11yConfig 做加法合并', () => {
    const a: A11yConfig = { whitelist: ['.a'] }
    const b: A11yConfig = { whitelist: ['.b'] }
    const merged = mergeA11yConfigs(a, b)
    expect(merged.whitelist).toEqual(['.a', '.b'])
  })
})

describe('defineA11yConfig', () => {
  it('恒等返回', () => {
    const config: A11yConfig = { roles: [{ role: 'tab', selector: '.tab' }] }
    expect(defineA11yConfig(config)).toBe(config)
  })
})

describe('extractSelectors', () => {
  it('从规则数组中提取纯选择器，忽略只有 match 的规则', () => {
    const selectors = extractSelectors([{ selector: '.a' }, { match: () => true }, { selector: '.b' }])
    expect(selectors).toEqual(['.a', '.b'])
  })

  it('数组类型的 selector 会被展开为独立的选择器字符串', () => {
    const selectors = extractSelectors([{ selector: ['.a', '.b'] }, { selector: '.c' }])
    expect(selectors).toEqual(['.a', '.b', '.c'])
  })

  it('无规则时返回空数组', () => {
    expect(extractSelectors(undefined)).toEqual([])
  })
})
