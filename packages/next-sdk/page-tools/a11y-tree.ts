/**
 * a11y-tree.ts
 *
 * 浏览器内语义化 ARIA 树生成器
 *
 * 替代 PageController.getBrowserState().content，输出类似腾讯 KiKi 的
 * YAML 格式树，消除 <div>/<span> 等布局噪音，用标准 ARIA 角色描述节点。
 *
 * 依赖：
 *   - dom-accessibility-api: W3C AccName 规范 JS 实现（计算 accessible name）
 *   - aria-query: 标签名 → ARIA 隐式角色映射
 *   - tabbable: 可交互/可聚焦元素检测（工业级，处理所有边界情况）
 */

import { computeAccessibleName } from 'dom-accessibility-api'
import { isFocusable } from 'tabbable'

// ─── 类型定义 ────────────────────────────────────────────────────────────────

/** ref 索引 → HTMLElement 映射，供 click/fill/select 操作使用 */
export type RefMap = Map<number, HTMLElement>

export interface A11yTreeResult {
  /** 语义化 YAML 文本（供 AI 阅读和 Diff 计算） */
  yaml: string
  /** ref 索引 → HTMLElement 映射（供后续操作使用） */
  refMap: RefMap
  /** 可交互元素总数 */
  interactiveCount: number
}

// ─── 内部计数器（每次 buildA11yTree 重置） ───────────────────────────────────

let _refCounter = 0

// ─── ARIA 隐式角色静态映射表（覆盖问题页面 95%+ 的常用标签）────────────────────

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

// ─── 角色推断 ────────────────────────────────────────────────────────────────

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
  // input 元素根据 type 进一步精确判断
  if (tag === 'input') {
    const inputType = (el as HTMLInputElement).type?.toLowerCase() ?? 'text'
    return INPUT_TYPE_ROLE[inputType] ?? 'textbox'
  }
  return TAG_ROLE_MAP[tag] ?? 'generic'
}

// ─── 交互状态标记 ─────────────────────────────────────────────────────────────

/**
 * 收集节点的 ARIA 状态 token
 * 对标腾讯 KiKi 格式：[checked] [selected] [disabled] [hasPopup] [cursor=pointer]
 */
function getStateTokens(el: Element): string[] {
  const tokens: string[] = []
  const aria = (k: string) => el.getAttribute(k)

  // ARIA 状态
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

  return tokens
}

// ─── 可见性过滤 ──────────────────────────────────────────────────────────────

function isHidden(el: Element): boolean {
  // aria-hidden
  if (el.getAttribute('aria-hidden') === 'true') return true
  // HTML hidden 属性
  if ((el as HTMLElement).hidden) return true
  // CSS display:none / visibility:hidden
  try {
    const style = window.getComputedStyle(el as HTMLElement)
    if (style.display === 'none' || style.visibility === 'hidden') return true
  } catch {
    // 忽略
  }
  return false
}

// ─── 序列化节点 ──────────────────────────────────────────────────────────────

function serializeNode(
  el: Element,
  depth: number,
  refMap: RefMap,
  blacklistSet: Set<Element>,
): string[] {
  if (isHidden(el) || blacklistSet.has(el)) return []

  const role = inferRole(el)
  const tokens = getStateTokens(el)
  const name = computeAccessibleName(el as HTMLElement)
  const interactive = isFocusable(el as HTMLElement) || tokens.includes('cursor=pointer')
  
  let id = ''
  if (interactive) {
    id = ` #${_refCounter++}`
    refMap.set(_refCounter - 1, el as HTMLElement)
  }

  const indent = '  '.repeat(depth)
  const tokenStr = tokens.length > 0 ? ` [${tokens.join(' ')}]` : ''
  const nameStr = name ? ` "${name}"` : ''

  const line = `${indent}- ${role}${id}${tokenStr}${nameStr}`
  const childrenLines: string[] = []
  for (const child of Array.from(el.children)) {
    childrenLines.push(...serializeNode(child, depth + 1, refMap, blacklistSet))
  }

  return [line, ...childrenLines]
}


// ─── 主入口 ──────────────────────────────────────────────────────────────────

/**
 * 生成当前页面的语义化 ARIA YAML 树
 *
 * @param root 遍历起点，默认 document.body
 * @param blacklist 需要跳过的元素（用户自定义黑名单）
 */
export function buildA11yTree(
  root: Element = document.body,
  blacklist: Element[] = [],
): A11yTreeResult {
  _refCounter = 0
  const refMap: RefMap = new Map()
  const blacklistSet = new Set(blacklist)
  const lines: string[] = []

  for (const child of Array.from(root.children)) {
    lines.push(...serializeNode(child, 0, refMap, blacklistSet))
  }

  // 对标腾讯 KiKi 格式：用 yaml 代码块包裹
  const yaml = '```yaml\n' + lines.join('\n') + '\n```'

  return {
    yaml,
    refMap,
    interactiveCount: refMap.size,
  }
}
