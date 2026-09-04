/**
 * a11y/utils.ts
 *
 * 存放生成无障碍树时的通用工具函数：可见性判断、纯文本兜底、Shadow DOM 组合树遍历等。
 * 角色推断与状态 token 解析已统一迁移到 ./config（resolveA11yRole/resolveA11yStates/resolveA11yInfo）。
 */

import { isTabbable } from 'tabbable'
import { isEditingHost, resolveA11yRole, type ResolvedA11yConfig } from './config'
import { deepQuerySelectorAll } from '../utils/dom'

/**
 * 非内容元素：不应进入无障碍树，其内部文本也不得被 AccName / textContent 兜底吸收。
 * 云控制台常见在 body 内联 `<style>@font-face { src: url(data:font/...;base64,...) }</style>`，
 * 若不剔除，整段 base64 会变成 generic 的 name，严重浪费 LLM token。
 */
const NON_CONTENT_TAGS = new Set([
  'script',
  'style',
  'noscript',
  'template',
  'link',
  'meta',
  'head',
  'title',
])

export function isNonContentElement(el: Element): boolean {
  return NON_CONTENT_TAGS.has(el.tagName.toLowerCase())
}

/**
 * 判断元素是否"自身"呈现 cursor:pointer（而非从祖先继承而来）。
 *
 * 背景：CSS 的 `cursor` 属性会向子孙继承。可点击容器（如 <a>、自定义卡片 .card-wrapper）
 * 一旦设置 cursor:pointer，其内部所有子孙的 computed cursor 都会变成 pointer。
 * 若仅凭「computed cursor === pointer」判定交互性，会让容器的可点击性"传染"给全部子孙，
 * 产生大量误报 ref（父容器 cursor:pointer 泛滥到每个子节点）。
 *
 * 业界主流 DOM 提取器（如 browser-use 的 doesElementHaveInteractivePointer）同样以
 * cursor:pointer 作为可点击性的核心兜底信号，并通过与父元素对比来定位真正的可点击"边界元素"。
 * 因此这里的判定为：元素自身 computed cursor 为 pointer，且其父元素不是 pointer —— 说明
 * 该元素（或命中它的 CSS 规则）主动声明了指针手势，是真正意义上的可点击目标。
 *
 * 无父元素（如 shadow host 边界、游离节点）时，没有可继承来源，视为自身声明。
 */
export function hasOwnPointerCursor(el: Element): boolean {
  try {
    if (window.getComputedStyle(el as HTMLElement).cursor !== 'pointer') return false
    const parent = el.parentElement
    if (!parent) return true
    return window.getComputedStyle(parent).cursor !== 'pointer'
  } catch {
    // 忽略跨域 iframe 等无法访问 style 的场景
    return false
  }
}

/** 交互态伪类：cursor 常只在这些状态下声明为 pointer（如卡片 hover 时才显示手势） */
const INTERACTION_PSEUDO_RE = /:(hover|focus|focus-visible|focus-within|active)\b/gi

/**
 * 递归遍历样式表规则（含 @media / @supports 等分组规则），收集在交互伪类下声明
 * cursor:pointer 的选择器，并去掉伪类得到"主体选择器"。
 */
function collectInteractivePointerSelectors(rules: CSSRuleList, out: Set<string>): void {
  for (const rule of Array.from(rules)) {
    const styleRule = rule as CSSStyleRule
    const grouping = rule as CSSGroupingRule
    // @media / @supports 等分组规则：自身无 selectorText，递归其子规则
    if (!styleRule.selectorText && grouping.cssRules) {
      collectInteractivePointerSelectors(grouping.cssRules, out)
      continue
    }
    const sel = styleRule.selectorText
    if (!sel || !styleRule.style || styleRule.style.cursor !== 'pointer') continue
    if (!/:(hover|focus|focus-visible|focus-within|active)\b/i.test(sel)) continue
    for (const part of sel.split(',')) {
      const base = part.replace(INTERACTION_PSEUDO_RE, '').trim()
      // 去掉伪类后可能为空（如 `:hover`）或过宽（`*`），跳过以免误伤全页
      if (base && base !== '*') out.add(base)
    }
  }
}

/**
 * 收集页面中"仅在 :hover/:focus/:active 等交互态下声明 cursor:pointer"的元素集合。
 *
 * 背景（华为云控制台实测）：大量可点击卡片（如 `.container-wrapper .shadow:hover{cursor:pointer}`）
 * 只在鼠标悬停时才显示手势，静止态 `getComputedStyle(el).cursor` 读到的是 `auto`，
 * 因此仅凭 computed cursor 的判定（含业界 getComputedStyle 方案）会漏判这类元素。
 * 这里通过扫描样式表把这类"交互态手势"补齐，作为可点击性的兜底信号。
 *
 * 每次构建树只调用一次（O(规则数) 扫描 + 一次合并查询），避免逐元素扫描样式表。
 */
export function collectHoverPointerElements(root: Element): Set<Element> {
  const set = new Set<Element>()
  const selectorSet = new Set<string>()
  try {
    for (const sheet of Array.from(document.styleSheets)) {
      let rules: CSSRuleList | null = null
      try {
        rules = sheet.cssRules
      } catch {
        // 跨域样式表无法访问 cssRules，跳过
        continue
      }
      if (rules) collectInteractivePointerSelectors(rules, selectorSet)
    }
  } catch {
    return set
  }
  if (selectorSet.size === 0) return set

  const selectors = Array.from(selectorSet)
  // 优先合并为单条选择器一次性查询；若含非法片段导致整体失败，退化为逐条查询保证鲁棒
  try {
    for (const el of deepQuerySelectorAll(selectors.join(', '), root)) set.add(el)
    return set
  } catch {
    for (const sel of selectors) {
      try {
        for (const el of deepQuerySelectorAll(sel, root)) set.add(el)
      } catch {
        // 忽略非法选择器
      }
    }
  }
  return set
}

/** 判断元素是否应被跳过（不可见、非内容或在黑名单中） */
export function isHidden(el: Element): boolean {
  if (isNonContentElement(el)) return true
  if (el.getAttribute('aria-hidden') === 'true') return true
  if ((el as HTMLElement).hidden) return true
  try {
    const style = window.getComputedStyle(el as HTMLElement)
    if (style.display === 'none' || style.visibility === 'hidden') return true
    // opacity:0 是常见的视觉隐藏方式，元素对用户不可见
    if (style.opacity === '0') return true
    // 宽或高为 0 且有 overflow 裁剪时，子内容实际不可见（如折叠的侧边栏 width:0 !important）
    // 若 overflow 为 visible，子内容仍然溢出可见，不能过滤
    const isClipX = style.overflowX !== 'visible'
    const isClipY = style.overflowY !== 'visible'
    if (parseFloat(style.width) === 0 && isClipX) return true
    if (parseFloat(style.height) === 0 && isClipY) return true
  } catch {
    // 忽略跨域 iframe 等无法访问 style 的场景
  }
  return false
}


/**
 * 收集元素自身或子孙节点的 title，用作图标按钮等无文本节点的名字兜底。
 * 云控制台常见模式：可点击容器无 aria-label，title 挂在内部 span 上。
 */
export function collectTitleLabel(el: Element): string {
  const selfTitle = el.getAttribute('title')?.trim()
  if (selfTitle) return selfTitle

  const titled = el.querySelector('[title]')
  const childTitle = titled?.getAttribute('title')?.trim()
  if (childTitle) return childTitle

  return ''
}

/**
 * 收集子孙节点的文本内容，用作无障碍名字的兜底。
 * 当普通计算无法提取文本时，遍历后代并拼接可见文本。
 * @param config 已规整的无障碍配置；传入后角色判断会尊重页面自定义 roles 规则
 */
export function collectDescendantText(el: Element, config?: ResolvedA11yConfig): string {
  let text = ''
  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      text += (node.textContent ?? '') + ' '
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as Element
      // 根节点若是 style/script 则整段丢弃；子孙遇到非内容标签则跳过子树
      if (element !== el && isNonContentElement(element)) return
      if (isHidden(element) && element !== el) return
      // 根为非内容元素时不收集（防御）
      if (element === el && isNonContentElement(element)) return

      // 如果遇到嵌套的列表项或其他交互/语义节点，停止向下遍历该子树，避免兜底文本重复吸收
      if (element !== el) {
        const tag = element.tagName.toLowerCase()
        const role = resolveA11yRole(element, config)
        const isInteractiveTag = ['button', 'a', 'input', 'select', 'textarea', 'li', 'option'].includes(tag)
        const isInteractiveRole = ['button', 'link', 'checkbox', 'radio', 'textbox', 'listitem', 'option', 'combobox', 'listbox'].includes(role)
        const isTrulyInteractive = isTabbable(element as HTMLElement)
        const isOwnPointer = hasOwnPointerCursor(element)
        const isMeaningfullyInteractive = isTrulyInteractive && !(role === 'generic' && !isOwnPointer)

        if (isMeaningfullyInteractive || isInteractiveTag || isInteractiveRole || isEditingHost(element)) {
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
export function getComposedChildren(el: Element): Element[] {
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
 * 提取元素的 tooltip / 帮助提示文本
 *
 * 按以下优先级查找（返回首个非空结果）：
 * 1. title 属性
 * 2. aria-describedby 引用的元素文本
 * 3. data-tooltip / data-tips 自定义属性
 * 4. 框架级 tooltip 内容（如 Tiny3 tp-helptip 内的 .tp-helptip-label 文本）
 * 4b. 框架级 overflow 指令（Tiny3 tioverflow / Angular Material matTooltip）
 *
 * 即使 tooltip 容器被隐藏（display:none / opacity:0），也提取其文本内容，
 * 让 AI 无需 hover 即可获取帮助信息。
 */
export function extractTooltipText(el: Element): string {
  // 1. title 属性
  const title = el.getAttribute('title')
  if (title && title.trim()) {
    return title.trim().replace(/"/g, '\\"').substring(0, 200)
  }

  // 2. aria-describedby → 查找引用元素的文本（即使隐藏也提取）
  const describedby = el.getAttribute('aria-describedby')
  if (describedby) {
    for (const id of describedby.split(/\s+/)) {
      const ref = document.getElementById(id)
      if (ref) {
        const text = (ref.textContent || '').trim().replace(/\s+/g, ' ')
        if (text) {
          return text.replace(/"/g, '\\"').substring(0, 200)
        }
      }
    }
  }

  // 3. data-tooltip / data-tips 自定义属性
  for (const attr of ['data-tooltip', 'data-tips', 'data-tip']) {
    const val = el.getAttribute(attr)
    if (val && val.trim()) {
      return val.trim().replace(/"/g, '\\"').substring(0, 200)
    }
  }

  // 4. 框架级 tooltip 内容检测
  // Tiny3 tp-helptip: 查找子元素 .tp-helptip-label 的文本
  const tag = el.tagName.toLowerCase()
  if (tag === 'tp-helptip' || el.closest('tp-helptip')) {
    const helptipRoot = tag === 'tp-helptip' ? el : el.closest('tp-helptip')!
    const label = helptipRoot.querySelector('.tp-helptip-label, [class*="tp-helptip-label"]')
    if (label) {
      const text = (label.textContent || '').trim()
      if (text) {
        return text.replace(/"/g, '\\"').substring(0, 200)
      }
    }
  }

  // 4b. 框架级 tooltip 内容检测
  // Angular Material matTooltip: 属性值即 tooltip 文本
  const matTooltip = el.getAttribute('mattooltip') || el.getAttribute('matTooltip')
  if (matTooltip && matTooltip.trim()) {
    return matTooltip.trim().replace(/"/g, '\\"').substring(0, 200)
  }

  return ''
}
