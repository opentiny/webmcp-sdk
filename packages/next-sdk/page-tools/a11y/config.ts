/**
 * a11y/config.ts
 *
 * 统一无障碍配置（A11yConfig）：把角色推断、状态推断、白/黑名单、自定义属性、
 * 弹窗选择器等配置项收敛为一个对象，并提供：
 * 1. 声明式规则（roles/states）的合并与匹配逻辑
 * 2. 底层的逐元素解析函数（resolveA11yRole/resolveA11yStates/resolveA11yInfo）
 *
 * 运行期读写 API 统一由 ../tool-config.ts 的 getPageAgentToolConfig/setPageAgentToolConfig 提供
 * （a11yConfig 是其中一个字段），这里不再单独维护一套 get/set。
 */

import { TAG_ROLE_MAP, INPUT_TYPE_ROLE, DEFAULT_ERROR_SELECTORS, DEFAULT_WARNING_SELECTORS, DEFAULT_DIALOG_SELECTORS } from './constants'

// ─── 类型定义 ────────────────────────────────────────────────────────────

export interface A11yMatcher {
  /**
   * 标准 CSS 选择器（用 closest 判断元素自身或祖先是否命中，支持 Shadow DOM 穿透）。
   * 不局限于类名，标签选择器（`li`）、属性选择器（`[data-role="tab"]`、`[aria-selected]`）、
   * id 选择器、组合选择器（`.btn-group > .btn[data-checked="true"]`）等合法 CSS 选择器均可使用。
   * 也支持传入字符串数组，数组内任意一个选择器命中即算命中（等价于用逗号拼接成选择器列表），
   * 便于同一状态存在多个互不相关的 class 命名场景（如新旧版本混用 `is-active` / `active-item`）。
   */
  selector?: string | string[]
  /** 自定义判断函数，优先级高于 selector，用于 CSS 选择器表达不了的场景（如读取计算样式、比较多个属性组合逻辑） */
  match?: (el: Element) => boolean
}

export type A11yStateName =
  | 'checked' | 'selected' | 'pressed' | 'current' | 'expanded' | 'hasPopup'
  | 'disabled' | 'readonly' | 'required' | 'invalid' | 'busy'
  | 'error' | 'warning'
  | (string & {}) // 允许任意自定义状态名，同时保留标准值的自动补全

export interface A11yRoleRule extends A11yMatcher {
  /** 命中后赋予的 ARIA 角色，如 'tab' | 'tabpanel' | 'switch' | 'treeitem' */
  role: string
  /** 为 true 时覆盖元素已有的显式 role 属性，默认 false（不覆盖开发者显式设置） */
  force?: boolean
}

export interface A11yConfig {
  /** 角色推断规则：用于弥补页面缺失的语义 role（如自定义 Tab 组件没有 role=tab） */
  roles?: A11yRoleRule[]
  /** 状态推断规则：key 为状态名，value 为一条或多条规则（命中任意一条即成立），与标准 aria-* 检测结果取"或" */
  states?: Partial<Record<A11yStateName, A11yMatcher | A11yMatcher[]>>
  /** 白名单：强制识别为可交互元素并纳入无障碍树。支持 Element 引用或 CSS 选择器字符串（字符串每次动态解析，适配 SPA 重渲染） */
  whitelist?: Array<Element | string>
  /** 黑名单：强制从无障碍树中排除，规则同上 */
  blacklist?: Array<Element | string>
  /** 额外暴露的自定义 DOM 属性（作为 token 输出，如 [data-testid="xxx"]） */
  exposedAttributes?: string[]
  /** 模态弹窗 CSS 选择器（用于 detectPageDialog 检测阻塞交互的弹窗） */
  dialogSelectors?: string[]
}

/** 单个元素解析出的完整无障碍信息 */
export interface A11yInfo {
  role: string
  tokens: string[]
}

/**
 * 合并/规整后的完整无障碍配置：与用户书写的 {@link A11yConfig} 的唯一区别是
 * states 的每个状态名都统一规范化为数组（不再是 `A11yMatcher | A11yMatcher[]`）。
 * resolveA11yInfo 内部与 getPageAgentToolConfig().a11yConfig 读取到的都是这个类型。
 */
export interface ResolvedA11yConfig {
  roles: A11yRoleRule[]
  states: Partial<Record<A11yStateName, A11yMatcher[]>>
  whitelist: Array<Element | string>
  blacklist: Array<Element | string>
  exposedAttributes: string[]
  dialogSelectors: string[]
}

/** 内置已知状态名（用于区分"标准状态"与"用户自定义状态"，避免重复输出 token） */
const STANDARD_STATE_NAMES: string[] = [
  'checked', 'selected', 'pressed', 'current', 'expanded', 'hasPopup',
  'disabled', 'readonly', 'required', 'invalid', 'busy',
  'error', 'warning',
]

// ─── 默认配置 ────────────────────────────────────────────────────────────

// 检测 CSS 激活/选中状态类名（用于未使用标准 ARIA 的 Tab/选项组件，如按钮组/镜像选择）
// 仅当作为独立 class 词或有连字符前缀时匹配，避免误匹配 "interactive" 等
const DEFAULT_SELECTED_CLASS_RE = /\b(is-active|isActive|is-selected|isSelected|is-current|isCurrent|active-item|activeItem|tab-active|tabActive|active|selected|current)\b/

function defaultSelectedMatch(el: Element): boolean {
  const cls = typeof (el as HTMLElement).className === 'string' ? (el as HTMLElement).className : ''
  if (!cls || !DEFAULT_SELECTED_CLASS_RE.test(cls)) return false
  // 只对有明确角色的元素输出，避免太多噪音
  const role = el.getAttribute('role') || el.tagName.toLowerCase()
  return ['button', 'option', 'a', 'li', 'generic'].includes(role) || role.startsWith('tab')
}

/** 默认生效的无障碍配置：零配置即可覆盖 ARIA 标准 + 主流 UI 框架的常见错误/警告/选中态检测 */
export const DEFAULT_A11Y_CONFIG: ResolvedA11yConfig = {
  roles: [],
  states: {
    selected: [{ match: defaultSelectedMatch }],
    error: [{ selector: DEFAULT_ERROR_SELECTORS }],
    warning: [{ selector: DEFAULT_WARNING_SELECTORS }],
  },
  whitelist: [],
  blacklist: [],
  exposedAttributes: [],
  dialogSelectors: DEFAULT_DIALOG_SELECTORS,
}

// ─── 匹配辅助 ────────────────────────────────────────────────────────────

/** 将 selector 规整为单个 CSS 选择器字符串：数组按逗号拼接为选择器列表，语义等价于"任意一个命中即可" */
function normalizeSelector(selector?: string | string[]): string | undefined {
  if (!selector) return undefined
  const joined = Array.isArray(selector) ? selector.filter(Boolean).join(', ') : selector
  return joined || undefined
}

function matchesRule(el: Element, rule: A11yMatcher): boolean {
  if (rule.match) {
    try {
      return !!rule.match(el)
    } catch {
      return false
    }
  }
  const selector = normalizeSelector(rule.selector)
  if (selector) {
    try {
      return !!el.closest(selector)
    } catch {
      // 忽略非法选择器
      return false
    }
  }
  return false
}

function matchesAnyRule(el: Element, rules?: A11yMatcher | A11yMatcher[]): boolean {
  if (!rules) return false
  const list = Array.isArray(rules) ? rules : [rules]
  return list.some((rule) => matchesRule(el, rule))
}

/** 从状态规则中提取纯 CSS 选择器列表（忽略只有 match 函数、没有 selector 的规则；数组 selector 会被展开），供页面级选择器扫描场景复用 */
export function extractSelectors(rules?: A11yMatcher | A11yMatcher[]): string[] {
  if (!rules) return []
  const list = Array.isArray(rules) ? rules : [rules]
  return list.flatMap((r) => (Array.isArray(r.selector) ? r.selector.filter(Boolean) : r.selector ? [r.selector] : []))
}

// ─── 合并逻辑 ────────────────────────────────────────────────────────────

function concatArr<T>(a?: T[], b?: T[]): T[] {
  return [...(a ?? []), ...(b ?? [])]
}

function normalizeMatcherList(value?: A11yMatcher | A11yMatcher[]): A11yMatcher[] {
  if (!value) return []
  return Array.isArray(value) ? value : [value]
}

function mergeStates(
  base?: A11yConfig['states'],
  patch?: A11yConfig['states'],
): ResolvedA11yConfig['states'] {
  const result: NonNullable<ResolvedA11yConfig['states']> = {}
  // 无论某个状态名是否被 patch 触及，都统一规范化为数组，保证 states.<name> 的返回类型一致，
  // 避免"只有被 patch 过的 key 才是数组，其余仍是单个 matcher 对象"的不一致行为
  const keys = new Set<string>([...Object.keys(base ?? {}), ...Object.keys(patch ?? {})])
  for (const key of keys) {
    result[key] = [...normalizeMatcherList(base?.[key]), ...normalizeMatcherList(patch?.[key])]
  }
  return result
}

/** 合并两份 A11yConfig：数组类字段拼接（additive，不丢失 base 中已有的规则），states 按 key 独立合并 */
export function mergeA11yConfigs(base: A11yConfig, patch: A11yConfig): ResolvedA11yConfig {
  return {
    roles: concatArr(base.roles, patch.roles),
    states: mergeStates(base.states, patch.states),
    whitelist: concatArr(base.whitelist, patch.whitelist),
    blacklist: concatArr(base.blacklist, patch.blacklist),
    exposedAttributes: concatArr(base.exposedAttributes, patch.exposedAttributes),
    dialogSelectors: concatArr(base.dialogSelectors, patch.dialogSelectors),
  }
}

/** 将用户配置与默认配置合并（additive），得到最终生效的完整配置 */
export function mergeA11yConfig(user?: A11yConfig): ResolvedA11yConfig {
  return mergeA11yConfigs(DEFAULT_A11Y_CONFIG, user ?? {})
}

/** 恒等函数，仅用于书写配置时获得 TS 类型提示/校验（风格对齐 defineConfig） */
export function defineA11yConfig(config: A11yConfig): A11yConfig {
  return config
}

// ─── 角色 / 状态解析 ─────────────────────────────────────────────────────

function computeRole(el: Element, resolved: ResolvedA11yConfig): string {
  const explicit = el.getAttribute('role')
  const hasExplicit = !!explicit && explicit !== 'presentation' && explicit !== 'none'

  for (const rule of resolved.roles) {
    if (hasExplicit && !rule.force) continue
    if (matchesRule(el, rule)) return rule.role
  }

  if (hasExplicit) return explicit as string

  const tag = el.tagName.toLowerCase()
  if (tag === 'input') {
    const inputType = (el as HTMLInputElement).type?.toLowerCase() ?? 'text'
    return INPUT_TYPE_ROLE[inputType] ?? 'textbox'
  }
  return TAG_ROLE_MAP[tag] ?? 'generic'
}

function computeStates(el: Element, resolved: ResolvedA11yConfig): string[] {
  const tokens: string[] = []
  const aria = (k: string) => el.getAttribute(k)
  const states = resolved.states
  const has = (name: A11yStateName) => matchesAnyRule(el, states[name])

  // checked：aria-checked 三态（true/false/mixed）优先，其次原生 input.checked / label[for] 关联，最后自定义规则兜底
  const ariaChecked = aria('aria-checked')
  if (ariaChecked === 'true') {
    tokens.push('checked')
  } else if (ariaChecked === 'mixed') {
    tokens.push('checked=mixed')
  } else if (ariaChecked === 'false') {
    tokens.push('unchecked')
  } else {
    const elTag = el.tagName.toLowerCase()
    let nativeChecked: boolean | undefined
    if (elTag === 'input' && ((el as HTMLInputElement).type === 'checkbox' || (el as HTMLInputElement).type === 'radio')) {
      nativeChecked = (el as HTMLInputElement).checked
    } else if (elTag === 'label' && el.hasAttribute('for')) {
      const target = document.getElementById(el.getAttribute('for')!)
      if (target instanceof HTMLInputElement && (target.type === 'checkbox' || target.type === 'radio')) {
        nativeChecked = target.checked
      }
    }
    if (nativeChecked !== undefined) {
      tokens.push(nativeChecked ? 'checked' : 'unchecked')
    } else if (has('checked')) {
      tokens.push('checked')
    }
  }

  // selected：aria-selected 或自定义规则（内置默认规则覆盖常见 class 命名的 Tab/选项选中态）
  if (aria('aria-selected') === 'true' || has('selected')) {
    tokens.push('selected')
  }

  // pressed：toggle 按钮三态（true/false/mixed）
  const ariaPressed = aria('aria-pressed')
  if (ariaPressed === 'true') {
    tokens.push('pressed')
  } else if (ariaPressed === 'mixed') {
    tokens.push('pressed=mixed')
  } else if (ariaPressed !== 'false' && has('pressed')) {
    tokens.push('pressed')
  }

  // current：当前步骤/当前页（面包屑、分页、向导），支持 page/step/location/date/time 等取值
  const ariaCurrent = aria('aria-current')
  if (ariaCurrent && ariaCurrent !== 'false') {
    tokens.push(ariaCurrent === 'true' ? 'current' : `current=${ariaCurrent}`)
  } else if (has('current')) {
    tokens.push('current')
  }

  // disabled
  if (aria('aria-disabled') === 'true' || (el as HTMLInputElement).disabled || has('disabled')) {
    tokens.push('disabled')
  }

  // hasPopup
  const ariaHasPopup = aria('aria-haspopup')
  if ((ariaHasPopup && ariaHasPopup !== 'false') || has('hasPopup')) {
    tokens.push('hasPopup')
  }

  // expanded
  if (aria('aria-expanded') === 'true' || has('expanded')) {
    tokens.push('expanded')
  }

  // invalid：校验失败（元素自身状态，区别于基于选择器判断的 [error] 容器级 token）
  const ariaInvalid = aria('aria-invalid')
  if (ariaInvalid && ariaInvalid !== 'false') {
    tokens.push(ariaInvalid === 'true' ? 'invalid' : `invalid=${ariaInvalid}`)
  } else if (has('invalid')) {
    tokens.push('invalid')
  }

  // readonly
  if (aria('aria-readonly') === 'true' || (el as HTMLInputElement).readOnly || has('readonly')) {
    tokens.push('readonly')
  }

  // required
  if (aria('aria-required') === 'true' || (el as HTMLInputElement).required || has('required')) {
    tokens.push('required')
  }

  // busy：加载中
  if (aria('aria-busy') === 'true' || has('busy')) {
    tokens.push('busy')
  }

  // orientation：滑块/tablist/toolbar 方向
  const orientation = aria('aria-orientation')
  if (orientation) tokens.push(`orientation=${orientation}`)

  // sort：表头排序方向
  const sort = aria('aria-sort')
  if (sort && sort !== 'none') tokens.push(`sort=${sort}`)

  // multiselectable
  if (aria('aria-multiselectable') === 'true') tokens.push('multiselectable')

  // heading level（h1-h6 或 aria-level）
  const headingMatch = el.tagName.match(/^H([1-6])$/)
  if (headingMatch) tokens.push(`level=${headingMatch[1]}`)
  const ariaLevel = aria('aria-level')
  if (ariaLevel && !headingMatch) tokens.push(`level=${ariaLevel}`)

  // cursor=pointer 表示"视觉上可点击"
  try {
    const style = window.getComputedStyle(el as HTMLElement)
    if (style.cursor === 'pointer') tokens.push('cursor=pointer')
  } catch {
    // 某些元素 getComputedStyle 可能抛异常，忽略
  }

  // 记录输入元素的值，以便在 fill/输入后在 A11y 树中显示并产生 Diff
  const tag = el.tagName.toLowerCase()
  if (tag === 'input' || tag === 'textarea' || tag === 'select') {
    const val = (el as HTMLInputElement).value
    if (val !== undefined && val !== '') {
      tokens.push(`value="${val}"`)
    }
  }
  const valuenow = aria('aria-valuenow')
  if (valuenow) tokens.push(`valuenow="${valuenow}"`)
  // aria-valuetext 覆盖 aria-valuenow 的可读文案（如滑块显示"中"而非 50）
  const valuetext = aria('aria-valuetext')
  if (valuetext) tokens.push(`valuetext="${valuetext}"`)

  // link 元素：检测 target=_blank，提示 Agent 该链接会在新标签页打开
  if (tag === 'a' && aria('target') === '_blank') {
    tokens.push('opens-new-tab')
  }

  // 校验错误/警告状态（ARIA 标准 + 主流 UI 框架，可配置），error 优先于 warning
  if (has('error')) {
    tokens.push('error')
  } else if (has('warning')) {
    tokens.push('warning')
  }

  // 自定义状态名（非标准 key），命中则直接输出同名 token，支持完全自定义状态（如 [highlighted]）
  for (const key of Object.keys(states)) {
    if (STANDARD_STATE_NAMES.includes(key)) continue
    if (matchesAnyRule(el, states[key])) tokens.push(key)
  }

  // 额外暴露的自定义属性白名单
  for (const attr of resolved.exposedAttributes) {
    const val = el.getAttribute(attr)
    if (val !== null) tokens.push(`${attr}="${val}"`)
  }

  return Array.from(new Set(tokens))
}

export function resolveA11yRole(el: Element, config?: A11yConfig): string {
  return computeRole(el, mergeA11yConfig(config))
}

export function resolveA11yStates(el: Element, config?: A11yConfig): string[] {
  return computeStates(el, mergeA11yConfig(config))
}

/**
 * 统一入口（供用户直接调用的底层函数）：读取配置 -> 依据 roles/states 规则计算出该元素的
 * 完整无障碍信息（角色 + 状态 token）。buildA11yTree 内部对每个 DOM 节点也是调用这一个函数，
 * 是声明式规则与树生成结果之间唯一的桥接点；用户也可以直接调用它来调试/复用同一套解析逻辑。
 */
export function resolveA11yInfo(el: Element, config?: A11yConfig): A11yInfo {
  const resolved = mergeA11yConfig(config)
  return {
    role: computeRole(el, resolved),
    tokens: computeStates(el, resolved),
  }
}
