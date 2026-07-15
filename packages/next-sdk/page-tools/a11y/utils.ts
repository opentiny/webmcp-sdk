/**
 * a11y/utils.ts
 *
 * 存放生成无障碍树时的通用工具函数：可见性判断、纯文本兜底、Shadow DOM 组合树遍历等。
 * 角色推断与状态 token 解析已统一迁移到 ./config（resolveA11yRole/resolveA11yStates/resolveA11yInfo）。
 */

import { isTabbable } from 'tabbable'
import { resolveA11yRole } from './config'

/** 判断元素是否应被跳过（不可见或在黑名单中） */
export function isHidden(el: Element): boolean {
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
        const role = resolveA11yRole(element)
        const isInteractiveTag = ['button', 'a', 'input', 'select', 'textarea', 'li', 'option'].includes(tag)
        const isInteractiveRole = ['button', 'link', 'checkbox', 'radio', 'textbox', 'listitem', 'option', 'combobox', 'listbox'].includes(role)
        const isTrulyInteractive = isTabbable(element as HTMLElement)
        let isCursorPointer = false
        try {
          isCursorPointer = window.getComputedStyle(element as HTMLElement).cursor === 'pointer'
        } catch { /* ignore */ }
        const isMeaningfullyInteractive = isTrulyInteractive && !(role === 'generic' && !isCursorPointer)
        
        if (isMeaningfullyInteractive || isInteractiveTag || isInteractiveRole) {
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
