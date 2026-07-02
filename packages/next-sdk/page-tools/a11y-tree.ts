/**
 * a11y-tree.ts
 *
 * 浏览器内语义化 ARIA 树生成器（重构版）
 *
 * 核心改进：
 * 1. 两阶段处理：buildVNode（构建中间树）→ serializeVNode（剪枝序列化）
 * 2. 统一剪枝规则：无 ref 且无 accessible name → 透明穿透（跳过本节点，保留子节点）
 *    - 兼顾操作场景（去掉 generic/list/listitem 噪音）
 *    - 兼顾内容理解场景（有 name 的 listitem 等节点保留）
 * 3. 修复全局可变状态：refCounter 改为局部对象，消除并发调用隐患
 *
 * 依赖：
 *   - dom-accessibility-api: W3C AccName 规范 JS 实现（计算 accessible name）
 *   - tabbable: 可交互/可聚焦元素检测（工业级，处理所有边界情况）
 */

import { computeAccessibleName } from 'dom-accessibility-api'
import { isFocusable } from 'tabbable'

// ─── 类型定义 ────────────────────────────────────────────────────────────────

/** ref 索引 → HTMLElement 映射，供 click/fill/select 操作使用 */
export type RefMap = Map<number, HTMLElement>

/** 内部中间态节点，与 DOM 解耦，便于剪枝和序列化 */
interface VNode {
  role: string
  /** W3C AccName 算法计算出的语义化名称 */
  name: string
  tokens: string[]
  /** 只有交互节点才有 ref */
  ref?: number
  el: HTMLElement
  children: VNode[]
}

export interface A11yTreeOptions {
  /**
   * 是否启用剪枝：无 ref 且无 accessible name 的节点透明穿透
   * 默认 true（推荐）
   */
  pruneUnnamed?: boolean
  /**
   * 强制保留的角色列表，即使无 name 也不穿透（优先级最高）
   * 例如：['table', 'row'] 用于保留表格结构
   */
  preserveRoles?: string[]
  /**
   * 允许在无障碍树节点中作为 token 额外输出的 DOM 属性白名单
   * 包含这些属性的节点会被自动视为需要暴露/交互的节点（分配 ref 并保留），
   * 且属性及其值会显示在节点的 token 列表中，如 [cf-uba="cloudShell"]
   */
  exposedAttributes?: string[]
}

export interface A11yTreeResult {
  /** 语义化 YAML 文本（供 AI 阅读和 Diff 计算） */
  yaml: string
  /** ref 索引 → HTMLElement 映射（供后续操作使用） */
  refMap: RefMap
  /** 可交互元素总数 */
  interactiveCount: number
  /** 原始行数组（不含 yaml 代码块包裹），供搜索使用 */
  lines: string[]
}

/** 关键词搜索选项 */
export interface SearchA11yTreeOptions extends A11yTreeOptions {
  /**
   * 每个匹配行前后保留的上下文行数（类似 grep -C N）
   * 默认 2
   */
  contextLines?: number
  /**
   * 是否大小写不敏感，默认 true
   */
  caseInsensitive?: boolean
  /**
   * 最大返回匹配分组数（防止命中过多撑爆上下文），默认 20
   */
  maxMatches?: number
}

/** 单个匹配分组 */
export interface A11ySearchMatch {
  /** 主命中行行号（1-based） */
  lineNumber: number
  /** 主命中行内容 */
  line: string
  /** 含上下文的行列表（带行号） */
  context: Array<{ lineNumber: number; line: string }>
}

/** searchA11yTree 返回值 */
export interface SearchA11yTreeResult {
  /** 格式化后可直接发给 LLM 的文本 */
  text: string
  /** 结构化匹配列表 */
  matches: A11ySearchMatch[]
  /** 无障碍树总行数 */
  totalLines: number
  /** 原始命中行数（去重前） */
  matchCount: number
}

// ─── ARIA 隐式角色静态映射表（覆盖页面 95%+ 的常用标签）───────────────────────

const TAG_ROLE_MAP: Record<string, string> = {
  a: 'link',
  article: 'article',
  aside: 'complementary',
  button: 'button',
  caption: 'caption',
  cell: 'cell',
  checkbox: 'checkbox',
  code: 'code',
  columnheader: 'columnheader',
  combobox: 'combobox',
  datalist: 'listbox',
  dd: 'definition',
  details: 'group',
  dialog: 'dialog',
  dt: 'term',
  em: 'emphasis',
  fieldset: 'group',
  figure: 'figure',
  footer: 'contentinfo',
  form: 'form',
  h1: 'heading',
  h2: 'heading',
  h3: 'heading',
  h4: 'heading',
  h5: 'heading',
  h6: 'heading',
  header: 'banner',
  hr: 'separator',
  img: 'img',
  input: 'textbox',         // 默认，具体 type 下面会覆盖
  li: 'listitem',
  link: 'link',
  main: 'main',
  mark: 'mark',
  math: 'math',
  menu: 'list',
  menuitem: 'menuitem',
  meter: 'meter',
  nav: 'navigation',
  ol: 'list',
  option: 'option',
  output: 'status',
  p: 'paragraph',
  progress: 'progressbar',
  rowheader: 'rowheader',
  search: 'search',
  section: 'region',
  select: 'listbox',
  strong: 'strong',
  summary: 'button',
  table: 'table',
  tbody: 'rowgroup',
  td: 'cell',
  textarea: 'textbox',
  tfoot: 'rowgroup',
  th: 'columnheader',
  thead: 'rowgroup',
  time: 'time',
  tr: 'row',
  ul: 'list',
}

// input[type=*] 的角色覆盖
const INPUT_TYPE_ROLE: Record<string, string> = {
  button: 'button',
  checkbox: 'checkbox',
  color: 'textbox',
  email: 'textbox',
  file: 'textbox',
  image: 'button',
  number: 'spinbutton',
  radio: 'radio',
  range: 'slider',
  reset: 'button',
  search: 'searchbox',
  submit: 'button',
  tel: 'textbox',
  text: 'textbox',
  url: 'textbox',
}

// ─── 工具函数 ────────────────────────────────────────────────────────────────

/**
 * 获取元素的 ARIA 角色
 * 优先级：显式 role 属性 > 标签隐式角色 > 'generic'
 */
function inferRole(el: Element): string {
  const explicit = el.getAttribute('role')
  if (explicit && explicit !== 'presentation' && explicit !== 'none') {
    return explicit
  }
  const tag = el.tagName.toLowerCase()
  if (tag === 'input') {
    const inputType = (el as HTMLInputElement).type?.toLowerCase() ?? 'text'
    return INPUT_TYPE_ROLE[inputType] ?? 'textbox'
  }
  return TAG_ROLE_MAP[tag] ?? 'generic'
}

/**
 * 收集节点的 ARIA 状态 token
 * 格式：[checked] [selected] [disabled] [hasPopup] [cursor=pointer] [value="..."]
 */
function getStateTokens(el: Element, exposedAttributes?: string[]): string[] {
  const tokens: string[] = []
  const aria = (k: string) => el.getAttribute(k)

  const checked = aria('aria-checked')
  if (checked === 'true') tokens.push('checked')
  else if (checked === 'false') tokens.push('unchecked')

  if (aria('aria-selected') === 'true') tokens.push('selected')

  const disabled = aria('aria-disabled') === 'true' || (el as HTMLInputElement).disabled
  if (disabled) tokens.push('disabled')

  const hasPopup = aria('aria-haspopup')
  if (hasPopup && hasPopup !== 'false') tokens.push('hasPopup')

  if (aria('aria-expanded') === 'true') tokens.push('expanded')

  // heading level（h1-h6）
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
  const valuenow = el.getAttribute('aria-valuenow')
  if (valuenow) {
    tokens.push(`valuenow="${valuenow}"`)
  }

  // link 元素：检测 target=_blank，提示 Agent 该链接会在新标签页打开
  if (el.tagName.toLowerCase() === 'a' && el.getAttribute('target') === '_blank') {
    tokens.push('opens-new-tab')
  }

  // 检测 CSS 激活/选中状态类名（用于未使用标准 ARIA 的 Tab/选项组件，如华为云镜像选择）
  // 若元素携带常见激活类名，输出 [active] token，帮助 Agent 判断当前选中项
  const cls = typeof el.className === 'string' ? el.className : ''
  const ACTIVE_CLASS_PATTERNS = [
    'is-active', 'isActive',
    'is-selected', 'isSelected',
    'is-current', 'isCurrent',
    'active-item', 'activeItem',
    'tab-active', 'tabActive',
    // 仅当作为独立 class 词或有连字符前缀时匹配 "active"，避免误匹配 "interactive" 等
    /\bactive\b/,
    /\bselected\b/,
    /\bcurrent\b/,
  ]
  const hasActiveClass = ACTIVE_CLASS_PATTERNS.some(p =>
    typeof p === 'string' ? cls.split(/\s+/).includes(p) : p.test(cls)
  )
  // 只对有 cursor=pointer 或明确角色的元素输出 active token，避免太多噪音
  const roleForActive = el.getAttribute('role') || el.tagName.toLowerCase()
  const roles = roleForActive.split(/\s+/)
  const isTabLike = roles.some(r => ['button', 'option', 'a', 'li', 'generic'].includes(r) || r.startsWith('tab'))
  if (hasActiveClass && isTabLike && !tokens.includes('checked') && !tokens.includes('selected')) {
    tokens.push('active')
  }

  // 额外暴露的自定义属性白名单
  if (exposedAttributes) {
    for (const attr of exposedAttributes) {
      const val = el.getAttribute(attr)
      if (val !== null) {
        tokens.push(`${attr}="${val}"`)
      }
    }
  }

  return tokens
}

/** 判断元素是否应被跳过（不可见或在黑名单中） */
function isHidden(el: Element): boolean {
  if (el.getAttribute('aria-hidden') === 'true') return true
  if ((el as HTMLElement).hidden) return true
  try {
    const style = window.getComputedStyle(el as HTMLElement)
    if (style.display === 'none' || style.visibility === 'hidden') return true
  } catch {
    // 忽略
  }
  return false
}

/** 收集子孙节点的文本内容，用作无障碍名字的兜底 */
function collectDescendantText(el: Element): string {
  let text = ''
  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      text += (node.textContent ?? '') + ' '
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as Element
      if (isHidden(element)) return

      // 如果遇到嵌套的列表项或其他交互/语义节点，停止向下遍历该子树，避免兜底文本重复吸收
      if (element !== el) {
        const tag = element.tagName.toLowerCase()
        const role = inferRole(element)
        const isInteractiveTag = ['button', 'a', 'input', 'select', 'textarea', 'li', 'option'].includes(tag)
        const isInteractiveRole = ['button', 'link', 'checkbox', 'radio', 'textbox', 'listitem', 'option', 'combobox', 'listbox'].includes(role)
        const isTrulyInteractive = isFocusable(element as HTMLElement)

        let isVisuallyClickable = false
        try {
          const style = window.getComputedStyle(element as HTMLElement)
          if (style.cursor === 'pointer') {
            isVisuallyClickable = true
          }
        } catch {
          // 忽略
        }

        if (isTrulyInteractive || isVisuallyClickable || isInteractiveTag || isInteractiveRole) {
          return
        }
      }

      for (const child of Array.from(element.childNodes)) {
        walk(child)
      }
    }
  }
  walk(el)
  return text.trim().replace(/\s+/g, ' ')
}

// ─── 阶段 1：构建 VNode 中间树 ────────────────────────────────────────────────

/**
 * 获取元素在 composed tree（组合树）中的有效子元素
 *
 * Shadow DOM 场景下，简单拼接 el.children + el.shadowRoot.children 不符合浏览器
 * 实际渲染和无障碍树使用的组合树语义：slotted 节点应出现在 <slot> 的位置而非
 * host 下，<slot> 本身不应作为噪音节点出现，未被任何 slot 接收的 light children
 * 在组合树中不可见。
 *
 * 因此：有 shadowRoot 时遍历 shadow tree，遇到 <slot> 用 assignedElements 替换；
 * 无 shadowRoot 时直接遍历 light DOM children。
 */
function getComposedChildren(el: Element): Element[] {
  // <slot> 可嵌套在 shadow tree 的任意层级（如 <div><slot/></div>），递归时
  // wrapper 节点无 shadowRoot 走 light 分支，因此两个分支都需解析 <slot>。
  // light DOM 中不会出现 <slot>，检查无副作用。
  const source = el.shadowRoot ? el.shadowRoot.children : el.children
  const result: Element[] = []
  for (const node of Array.from(source)) {
    if (node instanceof HTMLSlotElement) {
      const assigned = node.assignedElements({ flatten: true })
      // 有分配节点时用 slotted 内容；否则用 slot 的 fallback content
      result.push(...(assigned.length > 0 ? assigned : Array.from(node.children)))
    } else {
      result.push(node)
    }
  }
  return result
}

/**
 * 递归将 DOM 元素转换为 VNode 中间表示
 * @param el 当前 DOM 元素
 * @param refCounter 引用计数器（使用对象引用避免全局可变状态）
 * @param refMap ref 索引 → 元素映射
 * @param blacklistSet 用户自定义黑名单
 */
function buildVNode(
  el: Element,
  refCounter: { value: number },
  refMap: RefMap,
  blacklistSet: Set<Element>,
  whitelistSet: Set<Element>,
  exposedAttributes?: string[],
): VNode | null {
  if (isHidden(el) || blacklistSet.has(el)) return null

  const role = inferRole(el)
  const tokens = getStateTokens(el, exposedAttributes)
  
  let name = computeAccessibleName(el as HTMLElement)
  const isTrulyInteractive = isFocusable(el as HTMLElement)
  const isVisuallyClickable = tokens.includes('cursor=pointer')
  // 包含白名单属性的节点也视为白名单节点（确保不被剪枝并分配 ref 操作索引）
  const isWhitelisted = whitelistSet.has(el) || (exposedAttributes?.some(attr => el.hasAttribute(attr)) ?? false)

  // 兜底方案：如果 AccName 计算结果为空，但该节点具有明显的交互性或属于结构性列表项，
  // 我们从其子树收集纯文本作为其 fallback name，以防 AI 丢失可读上下文。
  // 注意：不要对 <select> / combobox / listbox 等下拉组件进行文本兜底，以防它们吸收所有子选项文本导致极其嘈杂。
  if (!name.trim()) {
    const tag = el.tagName.toLowerCase()
    const isDropdown = tag === 'select' || role === 'combobox' || role === 'listbox'
    if (!isDropdown) {
      const isInteractiveTag = ['button', 'a', 'input', 'textarea', 'li'].includes(tag)
      if (isTrulyInteractive || isWhitelisted || isVisuallyClickable || isInteractiveTag || role === 'listitem' || role === 'option') {
        name = collectDescendantText(el)
      }
    }
  }

  // generic 无 name 时，即使有 cursor=pointer 也不分配 ref：
  // cursor 通常是 CSS 继承传播的，这类 div 本身无法被有意义地操作
  const interactive = isTrulyInteractive || isWhitelisted || (isVisuallyClickable && (role !== 'generic' || name !== ''))

  let ref: number | undefined
  if (interactive) {
    ref = refCounter.value
    refMap.set(ref, el as HTMLElement)
    refCounter.value++
  }

  const children: VNode[] = []
  for (const child of getComposedChildren(el)) {
    const childVNode = buildVNode(child, refCounter, refMap, blacklistSet, whitelistSet, exposedAttributes)
    if (childVNode) children.push(childVNode)
  }

  return { role, name, tokens, ref, el: el as HTMLElement, children }
}

// ─── 阶段 2：剪枝序列化 ──────────────────────────────────────────────────────

/**
 * 判断 VNode 子树是否包含任何有价值的节点（有 ref 或有 accessible name）
 * 用于过滤空容器子树，避免输出无内容的嵌套层级
 */
function hasValue(vnode: VNode): boolean {
  if (vnode.ref !== undefined || vnode.name.trim() !== '') return true
  return vnode.children.some(hasValue)
}

/**
 * 判断节点是否需要透明穿透（跳过本节点但保留子节点）
 *
 * 统一规则：无 ref（非交互）且无 accessible name → 穿透
 * 这样可以同时：
 * - 去掉 generic/list/listitem 等纯布局噪音（无 name 时穿透）
 * - 保留有 name 的 listitem（有 name 时保留，兼顾内容理解场景）
 */
function shouldPassThrough(vnode: VNode, opts: Required<A11yTreeOptions>): boolean {
  if (!opts.pruneUnnamed) return false
  // preserveRoles 中的角色强制保留
  if (opts.preserveRoles.includes(vnode.role)) return false
  // 有 ref（交互节点）→ 永远保留
  if (vnode.ref !== undefined) return false
  // 有 accessible name → 保留（兼顾内容理解场景）
  if (vnode.name.trim() !== '') return false
  // 无 ref 且无 name → 透明穿透
  return true
}

/**
 * 将 VNode 序列化为 YAML 行数组
 * 穿透节点时，子节点在当前 depth 平铺输出（不增加缩进层级）
 */
function serializeVNode(
  vnode: VNode,
  depth: number,
  opts: Required<A11yTreeOptions>,
): string[] {
  if (shouldPassThrough(vnode, opts)) {
    // 透明穿透：跳过本节点，子节点保持当前 depth（层级不增加）
    // 同时过滤掉整棵子树都无价值的空容器，避免输出无意义的嵌套
    return vnode.children
      .filter(c => hasValue(c))
      .flatMap(c => serializeVNode(c, depth, opts))
  }

  const indent = '  '.repeat(depth)
  const refStr = vnode.ref !== undefined ? ` #${vnode.ref}` : ''
  const tokenStr = vnode.tokens.length > 0 ? ` [${vnode.tokens.join(' ')}]` : ''
  const nameStr = vnode.name ? ` "${vnode.name}"` : ''
  const line = `${indent}- ${vnode.role}${refStr}${tokenStr}${nameStr}`

  const childLines = vnode.children.flatMap(c => serializeVNode(c, depth + 1, opts))
  return [line, ...childLines]
}

// ─── 主入口 ──────────────────────────────────────────────────────────────────

const DEFAULT_OPTIONS: Required<A11yTreeOptions> = {
  pruneUnnamed: true,
  preserveRoles: [],
  exposedAttributes: [],
}

/**
 * 生成当前页面的语义化 ARIA YAML 树
 *
 * @param root 遍历起点，默认 document.body
 * @param blacklist 需要跳过的元素（用户自定义黑名单）
 * @param whitelist 需要识别为可交互的白名单元素列表
 * @param options 过滤选项
 */
export function buildA11yTree(
  root: Element = document.body,
  blacklist: Element[] = [],
  whitelist: Element[] = [],
  options?: A11yTreeOptions,
): A11yTreeResult {
  const opts: Required<A11yTreeOptions> = { ...DEFAULT_OPTIONS, ...options }
  // 使用对象引用避免全局可变状态，消除并发调用隐患
  const refCounter = { value: 0 }
  const refMap: RefMap = new Map()
  const blacklistSet = new Set(blacklist)
  const whitelistSet = new Set(whitelist)
  const lines: string[] = []

  for (const child of getComposedChildren(root)) {
    const vnode = buildVNode(child, refCounter, refMap, blacklistSet, whitelistSet, opts.exposedAttributes)
    if (vnode) {
      lines.push(...serializeVNode(vnode, 0, opts))
    }
  }

  const yaml = '```yaml\n' + lines.join('\n') + '\n```'

  return {
    yaml,
    refMap,
    interactiveCount: refMap.size,
    lines,
  }
}

// ─── 关键词搜索 ──────────────────────────────────────────────────────────────

/**
 * 在无障碍树中按关键词搜索，返回带行号的匹配结果和上下文
 *
 * 支持的搜索维度（均对同一个 query 字符串做包含匹配）：
 *   - role：如 `button`、`link`、`heading`
 *   - accessible name：节点的语义化名称（引号内文本）
 *   - state token：如 `checked`、`disabled`、`expanded`
 *   - ref 索引：如 `#5`
 *
 * @example
 *   searchA11yTree('button')    // 找全部按钮
 *   searchA11yTree('提交')      // 找名称含"提交"的节点
 *   searchA11yTree('#3')        // 找 ref #3
 */
export function searchA11yTree(
  query: string,
  root: Element = document.body,
  blacklist: Element[] = [],
  whitelist: Element[] = [],
  options?: SearchA11yTreeOptions,
): SearchA11yTreeResult {
  const {
    contextLines = 2,
    caseInsensitive = true,
    maxMatches = 20,
    ...treeOptions
  } = options ?? {}

  // 复用 buildA11yTree 生成完整树，直接取 lines 数组（不重复构建 DOM 遍历）
  const { lines } = buildA11yTree(root, blacklist, whitelist, treeOptions)

  const needle = caseInsensitive ? query.toLowerCase() : query
  const totalLines = lines.length

  const isRefQuery = /^#\d+$/.test(query)
  const refRegex = isRefQuery ? new RegExp(`\\s${query}(?:\\s|[\\[]|$)`) : null

  // 找出所有命中行的下标（0-based）
  const hitIndices: number[] = []
  for (let i = 0; i < lines.length; i++) {
    let matched = false
    if (refRegex) {
      matched = refRegex.test(lines[i])
    } else {
      const haystack = caseInsensitive ? lines[i].toLowerCase() : lines[i]
      matched = haystack.includes(needle)
    }
    if (matched) {
      hitIndices.push(i)
    }
  }

  // 合并重叠的上下文区间，避免重复输出行
  const mergedRanges: Array<{ start: number; end: number; hits: number[] }> = []
  let isTruncated = false
  for (const idx of hitIndices) {
    const start = Math.max(0, idx - contextLines)
    const end = Math.min(totalLines - 1, idx + contextLines)
    const last = mergedRanges[mergedRanges.length - 1]
    if (last && start <= last.end + 1) {
      // 区间重叠或紧邻，合并
      last.end = Math.max(last.end, end)
      last.hits.push(idx)
    } else {
      if (mergedRanges.length >= maxMatches) {
        isTruncated = true
        break
      }
      mergedRanges.push({ start, end, hits: [idx] })
    }
  }

  // 构建结构化结果
  const matches: A11ySearchMatch[] = mergedRanges.map((range) => ({
    lineNumber: range.hits[0] + 1,
    line: lines[range.hits[0]],
    context: Array.from({ length: range.end - range.start + 1 }, (_, k) => ({
      lineNumber: range.start + k + 1,
      line: lines[range.start + k],
    })),
  }))

  // 格式化为可读文本（模仿 grep -n -C 风格，便于 LLM 直接理解）
  const textParts: string[] = [
    `无障碍树搜索结果 — 关键词: "${query}" | 总行数: ${totalLines} | 命中: ${hitIndices.length} 行 | 返回分组: ${matches.length}`,
    '',
  ]

  if (matches.length === 0) {
    textParts.push('（未找到匹配项）')
  } else {
    matches.forEach((match, m) => {
      const range = mergedRanges[m]
      textParts.push(`── 分组 ${m + 1}（第 ${range.start + 1}–${range.end + 1} 行）──`)
      match.context.forEach(({ lineNumber, line }) => {
        const isHit = range.hits.includes(lineNumber - 1)
        const ln = String(lineNumber).padStart(4)
        // 命中行用 >>> 标记，上下文行用普通行号前缀
        textParts.push(isHit ? `>>>${ln} | ${line}` : `   ${ln} | ${line}`)
      })
      textParts.push('')
    })
    if (isTruncated) {
      textParts.push(`⚠️ 命中过多，已截断至前 ${maxMatches} 个分组，建议缩小搜索范围`)
    }
    textParts.push(`提示：如需操作命中元素，使用其 #N 索引；如需查看完整树，请使用 browserState。`)
  }

  return {
    text: textParts.join('\n'),
    matches,
    totalLines,
    matchCount: hitIndices.length,
  }
}
