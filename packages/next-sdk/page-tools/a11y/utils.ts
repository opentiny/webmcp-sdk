/**
 * a11y/utils.ts
 *
 * 存放生成无障碍树时的通用工具函数：节点解析、状态获取、角色推断及纯文本兜底等。
 */

import { isFocusable } from 'tabbable'
import { TAG_ROLE_MAP, INPUT_TYPE_ROLE, DEFAULT_ERROR_SELECTORS, DEFAULT_WARNING_SELECTORS } from './constants'

/**
 * 获取元素的 ARIA 角色
 * 优先级：显式 role 属性 > 标签隐式角色 > 'generic'
 */
export function inferRole(el: Element): string {
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
export function getStateTokens(
  el: Element,
  exposedAttributes?: string[],
  errorSelectors?: string,
  warningSelectors?: string,
): string[] {
  const tokens: string[] = []
  const aria = (k: string) => el.getAttribute(k)

  // 选中状态：优先 aria-checked，其次原生 input.checked
  // 对 <label for="X"> 检测关联 checkbox/radio 的选中状态，帮助 AI 识别复选框当前状态
  const ariaChecked = aria('aria-checked')
  if (ariaChecked === 'true') {
    tokens.push('checked')
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
    }
  }

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

  // 检测校验错误/警告状态（ARIA 标准 + 主流 UI 框架，可配置）
  // 输出 [error] / [warning] token，让 AI 能区分校验错误与普通说明文字
  // 使用 closest() 向上查找，确保嵌套在错误容器内的子元素也能获得 error 语义
  const errorSelector = errorSelectors || DEFAULT_ERROR_SELECTORS
  const warningSelector = warningSelectors || DEFAULT_WARNING_SELECTORS
  const errorAncestor = errorSelector ? el.closest(errorSelector) : null
  if (errorAncestor) {
    tokens.push('error')
  } else {
    const warningAncestor = warningSelector ? el.closest(warningSelector) : null
    if (warningAncestor) {
      tokens.push('warning')
    }
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
export function isHidden(el: Element): boolean {
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

/**
 * 收集子孙节点的文本内容，用作无障碍名字的兜底。
 * 当普通计算无法提取文本时，遍历后代并拼接可见文本。
 */
export function collectDescendantText(el: Element): string {
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
