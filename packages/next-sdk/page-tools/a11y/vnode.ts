/**
 * a11y/vnode.ts
 *
 * 处理无障碍树节点 (VNode) 的构建、剪枝与序列化逻辑。
 */

import { computeAccessibleName } from 'dom-accessibility-api'
import { isFocusable, isTabbable } from 'tabbable'
import type { VNode, RefMap, A11yTreeOptions } from './types'
import { isHidden, inferRole, getStateTokens, collectDescendantText, getComposedChildren } from './utils'

/**
 * 递归将 DOM 元素转换为 VNode 中间表示
 * @param el 当前 DOM 元素
 * @param refCounter 引用计数器（使用对象引用避免全局可变状态）
 * @param refMap ref 索引 → 元素映射
 * @param blacklistSet 用户自定义黑名单
 * @param whitelistSet 用户自定义白名单
 * @param exposedAttributes 需要暴露的自定义属性
 * @param errorSelectors 错误选择器
 * @param warningSelectors 警告选择器
 */
export function buildVNode(
  el: Element,
  refCounter: { value: number },
  refMap: RefMap,
  blacklistSet: Set<Element>,
  whitelistSet: Set<Element>,
  exposedAttributes?: string[],
  errorSelectors?: string | string[],
  warningSelectors?: string | string[],
  /** 祖先节点是否已是可交互节点（已分配 ref）。为 true 时，纯 CSS 继承的 cursor=pointer 不再额外分配 ref */
  ancestorIsInteractive = false,
): VNode | null {
  if (isHidden(el) || blacklistSet.has(el)) return null

  const role = inferRole(el)
  const tokens = getStateTokens(el, exposedAttributes, errorSelectors, warningSelectors)
  
  let name = computeAccessibleName(el as HTMLElement)
  const isTrulyInteractive = isTabbable(el as HTMLElement)
  const isVisuallyClickable = tokens.includes('cursor=pointer')
  // 包含白名单属性的节点也视为白名单节点（确保不被剪枝并分配 ref 操作索引）
  const isWhitelisted = whitelistSet.has(el) || (exposedAttributes?.some(attr => el.hasAttribute(attr)) ?? false)
  // <label for="..."> 原生可点击：浏览器将点击转发到关联的表单控件（checkbox/radio 等）
  // Angular/React 自定义组件常隐藏原生 input，仅暴露 label 文本和自定义 skin
  const isLabelFor = el.tagName.toLowerCase() === 'label' && el.hasAttribute('for')

  // 兜底方案：如果 AccName 计算结果为空，但该节点具有明显的交互性或属于结构性列表项，
  // 我们从其子树收集纯文本作为其 fallback name，以防 AI 丢失可读上下文。
  // 注意：不要对 <select> / combobox / listbox 等下拉组件进行文本兜底，以防它们吸收所有子选项文本导致极其嘈杂。
  if (!name.trim()) {
    const tag = el.tagName.toLowerCase()
    const isDropdown = tag === 'select' || role === 'combobox' || role === 'listbox'
    if (!isDropdown) {
      const isInteractiveTag = ['button', 'a', 'input', 'textarea', 'li', 'label'].includes(tag)
      if (isTrulyInteractive || isWhitelisted || isVisuallyClickable || isInteractiveTag || role === 'listitem' || role === 'option') {
        name = collectDescendantText(el)
      }
    }
  }

  // 最终兜底：非交互元素（如错误提示 ti-error-msg、状态信息）的纯文本捕获。
  // 仅当元素没有有价值的子元素时触发，避免与子节点文本重复：
  // - 叶子 span（只有文本节点）→ 捕获文本作为 name
  // - 容器元素（有 element 子节点）→ 不触发，由子节点各自捕获
  if (!name.trim()) {
    const hasElementChildren = getComposedChildren(el).length > 0
    if (!hasElementChildren) {
      const text = collectDescendantText(el)
      if (text) {
        name = text
      }
    }
  }

  // generic 无 name 时，即使有 cursor=pointer 也不分配 ref：
  // cursor 通常是 CSS 继承传播的，这类 div 本身无法被有意义地操作。
  // 此外，当祖先节点已是可交互节点时，子节点仅凭 isVisuallyClickable（CSS 继承）
  // 不再额外分配 ref，避免父节点 cursor:pointer 传染给所有子孙导致高亮泛滥。
  //
  // 例外：<a>/<button>/<input> 等语义性交互标签，无论祖先是否已有 ref，
  // 始终强制分配 ref，因为它们在 HTML 语义上就是独立的操作单元。
  const tagName = el.tagName.toLowerCase()
  const isSemanticInteractiveTag =
    (tagName === 'a' && el.hasAttribute('href')) ||
    (['button', 'input', 'select', 'textarea'].includes(tagName) && !el.hasAttribute('disabled'))

  // 虽然有些元素有 tabindex="0" (isTrulyInteractive)，但如果它是 generic 且没有 cursor:pointer，
  // 往往是开发者加的结构化 focus 容器（如 tp-card），而非真正的可交互按钮，我们在此过滤掉它们。
  const isMeaningfullyInteractive = isTrulyInteractive && !(role === 'generic' && !isVisuallyClickable)

  const interactive =
    isMeaningfullyInteractive ||
    isWhitelisted ||
    isLabelFor ||
    isSemanticInteractiveTag ||
    (!ancestorIsInteractive && isVisuallyClickable && (role !== 'generic' || name !== ''))

  let ref: number | undefined
  if (interactive) {
    ref = refCounter.value
    refMap.set(ref, el as HTMLElement)
    refCounter.value++
  }

  const children: VNode[] = []
  for (const child of getComposedChildren(el)) {
    const childVNode = buildVNode(
      child,
      refCounter,
      refMap,
      blacklistSet,
      whitelistSet,
      exposedAttributes,
      errorSelectors,
      warningSelectors,
      // 将当前节点的交互性向下传递，子节点据此决定是否抑制 cursor=pointer
      interactive || ancestorIsInteractive,
    )
    if (childVNode) children.push(childVNode)
  }

  return { role, name, tokens, ref, el: el as HTMLElement, children }
}

/**
 * 判断 VNode 子树是否包含任何有价值的节点（有 ref 或有 accessible name）
 * 用于过滤空容器子树，避免输出无内容的嵌套层级
 */
export function hasValue(vnode: VNode): boolean {
  if (vnode.ref !== undefined || vnode.name.trim() !== '') return true
  return vnode.children.some(hasValue)
}

/**
 * 检查节点子树中是否存在任何有 ref 的可交互子节点。
 * 用于判断父节点是否可以安全省略其子节点输出。
 */
function hasInteractiveDescendant(vnode: VNode): boolean {
  return vnode.children.some(c => c.ref !== undefined || hasInteractiveDescendant(c))
}

/**
 * 找到子树中恰好唯一一个有 ref 的节点，若有多个则返回 null。
 * 用于判断是否可将该子节点与父节点合并输出。
 */
function findSingleRefDescendant(vnode: VNode): VNode | null {
  const refs: VNode[] = []
  const collect = (v: VNode) => {
    if (v.ref !== undefined) refs.push(v)
    if (refs.length > 1) return  // 超过一个就提前退出
    v.children.forEach(collect)
  }
  vnode.children.forEach(collect)
  return refs.length === 1 ? refs[0] : null
}

/**
 * 判断节点是否需要透明穿透（跳过本节点但保留子节点）
 *
 * 统一规则：无 ref（非交互）且无 accessible name → 穿透
 * 这样可以同时：
 * - 去掉 generic/list/listitem 等纯布局噪音（无 name 时穿透）
 * - 保留有 name 的 listitem（有 name 时保留，兼顾内容理解场景）
 */
export function shouldPassThrough(vnode: VNode, opts: Required<A11yTreeOptions>): boolean {
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
export function serializeVNode(
  vnode: VNode,
  depth: number,
  opts: Required<A11yTreeOptions>,
): string[] {
  if (shouldPassThrough(vnode, opts)) {
    // 透明穿透：跳过本节点，子节点保持当前 depth（层级不增加）
    // 同时过滤掉整棵子树都无价値的空容器，避免输出无意义的嵌套
    return vnode.children
      .filter(c => hasValue(c))
      .flatMap(c => serializeVNode(c, depth, opts))
  }

  const indent = '  '.repeat(depth)
  const refStr = vnode.ref !== undefined ? ` #${vnode.ref}` : ''
  const safeTokens = vnode.tokens.map(t => t.replace(/[\r\n]+/g, ' ').replace(/"/g, '\\"'))
  const tokenStr = safeTokens.length > 0 ? ` [${safeTokens.join(' ')}]` : ''

  if (vnode.ref !== undefined) {
    if (!hasInteractiveDescendant(vnode)) {
      // 子树无任何 ref 节点 → 直接省略子节点
      // 父节点的 name 已由 computeAccessibleName 汇总了子树文本，信息不会丢失
      const safeName = vnode.name ? vnode.name.replace(/[\r\n]+/g, ' ').replace(/"/g, '\\"') : ''
      const nameStr = safeName ? ` "${safeName}"` : ''
      return [`${indent}- ${vnode.role}${refStr}${tokenStr}${nameStr}`]
    }

    // 子树中唯一一个 ref 节点且是无子 ref 的 generic 时，将其 name 提升到父节点，省略子节点输出。
    // 场景：`listitem #22 [active]` 内部只有 `generic #23 "总览"`，
    //       点击意义相同时，就展示为一行 `- listitem #22 [active] "总览"`。
    const singleChild = findSingleRefDescendant(vnode)
    if (singleChild && singleChild.role === 'generic' && !hasInteractiveDescendant(singleChild)) {
      const mergedName = (vnode.name.trim() || singleChild.name.trim())
        .replace(/[\r\n]+/g, ' ')
        .replace(/"/g, '\\"')
      const nameStr = mergedName ? ` "${mergedName}"` : ''
      return [`${indent}- ${vnode.role}${refStr}${tokenStr}${nameStr}`]
    }
  }

  const safeName = vnode.name ? vnode.name.replace(/[\r\n]+/g, ' ').replace(/"/g, '\\"') : ''
  const nameStr = safeName ? ` "${safeName}"` : ''
  const line = `${indent}- ${vnode.role}${refStr}${tokenStr}${nameStr}`

  const childLines = vnode.children.flatMap(c => serializeVNode(c, depth + 1, opts))
  return [line, ...childLines]
}
