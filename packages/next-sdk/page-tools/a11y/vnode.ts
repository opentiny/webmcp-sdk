/**
 * a11y/vnode.ts
 *
 * 处理无障碍树节点 (VNode) 的构建、剪枝与序列化逻辑。
 */

import { computeAccessibleName } from 'dom-accessibility-api'
import { isTabbable } from 'tabbable'
import type { VNode, RefMap, A11yTreeShapeOptions } from './types'
import type { ResolvedA11yConfig } from './config'
import { resolveA11yInfo } from './config'
import {
  isHidden,
  isNonContentElement,
  collectDescendantText,
  collectTitleLabel,
  getComposedChildren,
  hasOwnPointerCursor,
  extractTooltipText,
} from './utils'

/**
 * 语义上即为可操作控件的 ARIA 角色。
 * jsdom 下部分带 tabindex 的自定义控件 isTabbable 可能为 false，
 * 若不强制分配 ref，Static-Lift 会把它们误判为静态分支并吸收进父 name。
 */
const INTERACTIVE_ROLES = new Set([
  'button',
  'link',
  'textbox',
  'searchbox',
  'combobox',
  'listbox',
  'checkbox',
  'radio',
  'switch',
  'slider',
  'spinbutton',
  'menuitem',
  'menuitemcheckbox',
  'menuitemradio',
  'tab',
  'treeitem',
])

/**
 * 递归将 DOM 元素转换为 VNode 中间表示
 * @param el 当前 DOM 元素
 * @param refCounter 引用计数器（使用对象引用避免全局可变状态）
 * @param refMap ref 索引 → 元素映射
 * @param blacklistSet 已解析的黑名单元素集合
 * @param whitelistSet 已解析的白名单元素集合
 * @param config 已与默认值合并的统一无障碍配置
 * @param hoverPointerSet 只在 :hover/:focus/:active 下声明 cursor:pointer 的元素集合（静止态读不到手势，靠样式表扫描兜底）
 */
export function buildVNode(
  el: Element,
  refCounter: { value: number },
  refMap: RefMap,
  blacklistSet: Set<Element>,
  whitelistSet: Set<Element>,
  config: ResolvedA11yConfig,
  hoverPointerSet: Set<Element> = new Set(),
): VNode | null {
  // style/script 等非内容节点：不进树（避免 @font-face base64 等被当成 name）
  if (isNonContentElement(el) || isHidden(el) || blacklistSet.has(el)) return null

  const { role, tokens, name: ruleName } = resolveA11yInfo(el, config)
  const declaredName =
    (typeof ruleName === 'string' && ruleName.trim()) || getOwnDeclaredName(el as HTMLElement) || ''

  // Tooltip / 帮助提示文本检测：提取 title、aria-describedby、框架级 tooltip 内容
  // 非交互元素也可能有 tooltip，需分配 ref 使 AI 能 hover 触发动态 tip
  const tooltipText = extractTooltipText(el)
  if (tooltipText) {
    tokens.push(`tooltip="${tooltipText}"`)
  }
  const hasTooltip = tokens.some(t => t.startsWith('tooltip='))

  // 规则声明名优先于 AccName 内容汇总，保证 landmark 等布局节点输出稳定分区名
  let name = declaredName || computeAccessibleName(el as HTMLElement)
  const isTrulyInteractive = isTabbable(el as HTMLElement)
  // computed cursor 为 pointer（含继承）——仅用于「无文本时是否值得兜底收集名字」等宽松场景
  const isVisuallyClickable = tokens.includes('cursor=pointer')
  // 真正的"可点击边界元素"判定（用于是否分配 ref）：
  // 1) 元素自身在静止态声明了 cursor:pointer（父级不是 pointer），排除 CSS 继承传染；
  // 2) 或元素命中了 :hover/:focus/:active 下声明 cursor:pointer 的规则（hoverPointerSet）——
  //    大量卡片只在 hover 时才显示手势，静止态 getComputedStyle 读到 auto，需靠样式表扫描兜底。
  const hasClickableCursor = hasOwnPointerCursor(el) || hoverPointerSet.has(el)
  // 白名单：仅由显式 whitelist 配置驱动，与 exposedAttributes（属性 token 输出）解耦，
  // 避免把 data-qa-id 等追踪属性误当成「强制可交互」信号污染无障碍树。
  const isWhitelisted = whitelistSet.has(el)
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
      if (isTrulyInteractive || isWhitelisted || isVisuallyClickable || hasClickableCursor || isInteractiveTag || role === 'listitem' || role === 'option' || role === 'button') {
        name = collectDescendantText(el, config)
      }
    }
  }

  // 图标按钮常见：可点击容器本身无文本，title/aria 挂在子节点上（如控制台服务列表按钮）
  if (!name.trim() && (isTrulyInteractive || isWhitelisted || isVisuallyClickable || hasClickableCursor || role === 'button')) {
    name = collectTitleLabel(el)
  }

  // 框架级 icon 组件（如 Tiny3 ti-icon）的 name 属性作为无障碍名称兜底。
  // 对帮助/提示类图标使用人类可读名称，避免 AI 无法理解 "cloudx-action-help" 等框架内部命名。
  if (!name.trim() && role === 'button') {
    const iconName = el.getAttribute('name') || ''
    if (iconName.includes('help') || iconName.includes('tip') || iconName.includes('info')) {
      name = '帮助'
    }
  }

  // 有 tooltip 的元素如果无名称，从 tooltip token 提取文本作为兜底名称，
  // 确保 AI 在 A11y 树中能辨识该元素（非交互文本也有 tooltip 场景）
  if (!name.trim() && hasTooltip) {
    const tooltipToken = tokens.find(t => t.startsWith('tooltip='))
    if (tooltipToken) {
      name = tooltipToken.replace(/^tooltip="/, '').replace(/"$/, '')
    }
  }

  // 结构性交互角色（tab/menuitem 等）的标签文字常落在可聚焦子节点内，
// collectDescendantText 会因"遇交互子节点即停"而拿不到 name；
  // 此处用「跳过 style/script」的文本收集，禁止 textContent 把内联 CSS/base64 吸进来
  if (
    !name.trim() &&
    ['tab', 'menuitem', 'option', 'treeitem', 'button'].includes(role)
  ) {
    name = collectVisiblePlainText(el)
  }

  // 最终兜底：非交互元素（如错误提示 ti-error-msg、状态信息）的纯文本捕获。
  // 仅当元素没有有价值的子元素时触发，避免与子节点文本重复：
  // - 叶子 span（只有文本节点）→ 捕获文本作为 name
  // - 容器元素（有 element 子节点）→ 不触发，由子节点各自捕获
  if (!name.trim()) {
    const hasElementChildren = getComposedChildren(el).length > 0
    if (!hasElementChildren) {
      const text = collectDescendantText(el, config)
      if (text) {
        name = text
      }
    }
  }

  // cursor:pointer 是业界公认的"视觉可点击"通用信号（browser-use 等 DOM 提取器均以此为核心兜底判据）。
  // 但 CSS 的 cursor 会向子孙继承，若直接以 computed cursor 判定，可点击容器（<a>、卡片等）会把
  // ref "传染"给所有子孙，导致高亮泛滥。因此改用 hasClickableCursor（自身声明手势 + hover 态手势）来
  // 定位真正的可点击边界元素：这样既能覆盖 <div class="card-wrapper" (click)=...> 这类无语义、无
  // tabindex 的自定义可点击卡片（包括只在 hover 时显示手势的卡片），又能自然排除仅靠继承拿到 pointer
  // 的内部子孙，无需再依赖祖先传播标记。
  //
  // 例外：<a>/<button>/<input> 等语义性交互标签始终强制分配 ref，因为它们在 HTML 语义上
  // 就是独立的操作单元，即使外层容器同样可点击也应各自暴露。
  // 框架级 role 覆盖为 button 的非标准元素（如 tp-helptip ti-icon）同理：
  // 它们语义上就是按钮，即使祖先已有 ref 也应独立可操作（hover/click）。
  const tagName = el.tagName.toLowerCase()
  const isSemanticInteractiveTag =
    (tagName === 'a' && el.hasAttribute('href')) ||
    (['button', 'input', 'select', 'textarea'].includes(tagName) && !el.hasAttribute('disabled')) ||
    (role === 'button' && isVisuallyClickable && !['button', 'a', 'input', 'select', 'textarea'].includes(tagName))

  // 虽然有些元素有 tabindex="0" (isTrulyInteractive)，但如果它是 generic 且没有可点击手势，
  // 往往是开发者加的结构化 focus 容器（如 tp-card），而非真正的可交互按钮，我们在此过滤掉它们。
  const isMeaningfullyInteractive = isTrulyInteractive && !(role === 'generic' && !hasClickableCursor)

  const isDisabled = tokens.includes('disabled')

  const interactive =
    (!isDisabled && isMeaningfullyInteractive) ||
    isWhitelisted ||
    isLabelFor ||
    isSemanticInteractiveTag ||
    (!isDisabled && INTERACTIVE_ROLES.has(role)) ||
    // hasClickableCursor 已排除 CSS 继承（hasOwnPointerCursor）并覆盖 hover 态手势，
    // 无需再要求 role≠generic 或 name≠''——否则无文本的图标按钮（tp-icon.common-icon 等）
    // 虽是真正的可点击边界，仍会因 generic+空名被漏判。
    (!isDisabled && hasClickableCursor) ||
    // 有 tooltip 的元素分配 ref，使 AI 能 hover 触发动态 tip
    hasTooltip

  let ref: number | undefined
  if (interactive) {
    ref = refCounter.value
    refMap.set(ref, el as HTMLElement)
    refCounter.value++
    // 可操作元素默认保留 id（无需 exposedAttributes 配置），便于 AI 定位与跨轮次对齐
    // 用 getAttribute 避免 form 等元素上 name="id" 子节点导致的 DOM clobbering
    const idVal = el.getAttribute('id')
    if (idVal) {
      const idToken = `id="${idVal}"`
      if (!tokens.includes(idToken)) tokens.push(idToken)
    }
  }

  const children: VNode[] = []
  for (const child of getComposedChildren(el)) {
    const childVNode = buildVNode(
      child,
      refCounter,
      refMap,
      blacklistSet,
      whitelistSet,
      config,
      hoverPointerSet,
    )
    if (childVNode) children.push(childVNode)
  }

  const vnode: VNode = {
    role,
    name,
    ...(declaredName ? { declaredName } : {}),
    tokens,
    ref,
    el: el as HTMLElement,
    children,
  }

  // 有可交互子孙时：清空 AccName 内容汇总，仅保留自身声明名。
  // 静态子树文案的上提（Static-Lift）改由 serializeVNode 负责，避免与交互文案混进父 name。
  if (hasInteractiveDescendant(vnode)) {
    vnode.name = declaredName || getOwnDeclaredName(el as HTMLElement)
  }

  return vnode
}

/**
 * 仅取元素自身声明的可访问名，不含内容汇总（name from contents）。
 * 优先使用 VNode 上缓存的 role 规则名 / 构建期声明名。
 */
function resolveDeclaredName(vnode: VNode): string {
  if (vnode.declaredName?.trim()) return vnode.declaredName.trim()
  return getOwnDeclaredName(vnode.el)
}

function getOwnDeclaredName(el: HTMLElement): string {
  if (el.hasAttribute('aria-label') || el.hasAttribute('aria-labelledby')) {
    return computeAccessibleName(el).trim()
  }
  return ''
}

/** 子节点自身无 ref，且子树无可交互子孙 → 纯静态分支（可上提文案） */
function isStaticBranch(vnode: VNode): boolean {
  return vnode.ref === undefined && !hasInteractiveDescendant(vnode)
}

/**
 * 带声明名的布局 / landmark 节点：禁止 Static-Lift 上提到父级，也禁止被父级省略。
 * 否则会出现 `generic "右侧面板"` 包住侧栏+主区、真正的 complementary 节点被吃掉的问题。
 */
const LANDMARK_ROLES = new Set([
  'banner',
  'complementary',
  'contentinfo',
  'form',
  'main',
  'navigation',
  'region',
  'search',
])

function isStructuralNamedNode(vnode: VNode): boolean {
  return !!vnode.declaredName?.trim() || LANDMARK_ROLES.has(vnode.role)
}

/**
 * 空 landmark 壳：仅声明名、无交互子孙、无有价值子 VNode、无直接文本节点。
 * 有直接文本（如 `<region>说明文案</region>`）时不得当空壳省略。
 */
function isEmptyLandmarkShell(vnode: VNode, hasInteractive: boolean): boolean {
  if (!isStructuralNamedNode(vnode) || vnode.ref !== undefined || hasInteractive) return false
  if (vnode.children.some(hasValue)) return false
  if (collectDirectTextNodes(vnode.el).trim()) return false
  const declared = resolveDeclaredName(vnode)
  const name = vnode.name.trim()
  // name 来自内容汇总且与声明名不同 → 有可读内容，保留
  if (name && declared && name !== declared) return false
  if (name && !declared) return false
  return true
}

/** 子树中是否包含 landmark / 声明名节点（中间层 generic 包装器也会命中） */
function containsStructuralNamed(vnode: VNode): boolean {
  return vnode.children.some((c) => isStructuralNamedNode(c) || containsStructuralNamed(c))
}

/**
 * 收集元素可见纯文本，跳过 style/script 等非内容子树。
 * 禁止使用 el.textContent：它会包含内联 @font-face base64，导致 token 爆炸。
 */
function collectVisiblePlainText(el: Element): string {
  return collectDescendantText(el).replace(/\s+/g, ' ').trim()
}

/**
 * 仅收集元素自身的直接文本节点（不含元素子孙）。
 * 用于 Static-Lift：裸文本不会生成 VNode，需从此补采；不可向下穿透，
 * 否则会把嵌套 cell 等容器内文案误提到外层 row。
 */
function collectDirectTextNodes(el: Element): string {
  let text = ''
  for (const node of Array.from(el.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE) {
      text += (node.textContent ?? '') + ' '
    }
  }
  return text.replace(/\s+/g, ' ').trim()
}

/**
 * 收集纯静态分支的展示文案（保字用）。
 * 优先 name，其次递归子节点，最后可见纯文本兜底（不含 style/script）。
 * 不穿透 landmark / 声明名节点：否则中间层 generic 容器会把「右侧面板」吸走再被父级 Static-Lift。
 */
function getStaticDisplayText(vnode: VNode): string {
  if (isStructuralNamedNode(vnode)) {
    // 结构性节点自身若作为 lift 目标本应被上层排除；此处兜底避免误吸收
    return ''
  }
  const childJoined =
    vnode.children.length > 0
      ? vnode.children
          .filter((c) => !isStructuralNamedNode(c))
          .map(getStaticDisplayText)
          .filter(Boolean)
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim()
      : ''
  const plain = vnode.children.length === 0 ? collectVisiblePlainText(vnode.el) : ''
  const named = vnode.name.trim()

  const parts: string[] = []
  if (named && !isNoiseAccessibleName(named)) parts.push(named)
  if (childJoined && !isNoiseAccessibleName(childJoined)) {
    const normNamed = named.replace(/\s+/g, ' ').trim()
    const normChild = childJoined.replace(/\s+/g, ' ').trim()
    // 声明名与子孙文案不同则合并保留，避免仅有 aria-label 时丢掉静态说明
    if (!normNamed || (normChild !== normNamed && !normNamed.includes(normChild))) {
      parts.push(childJoined)
    }
  }
  if (parts.length === 0 && plain && !isNoiseAccessibleName(plain)) parts.push(plain)
  return parts.join(' ').replace(/\s+/g, ' ').trim()
}

/**
 * 名称若像 CSS/字体资源噪声（常见于误吸收的 <style> 内容），视为无效，避免输出到 YAML。
 */
function isNoiseAccessibleName(name: string): boolean {
  const n = name.trim()
  if (!n) return false
  if (/@font-face\b/i.test(n)) return true
  if (/data:(?:font|application|image)\//i.test(n)) return true
  if (/base64,[A-Za-z0-9+/=]{80,}/.test(n)) return true
  return false
}

/**
 * 静态子节点可否省略：仅当其文案已由父 outputName 完整承载（去重且不丢字）。
 * - 父使用自身声明名：仅当子文案与声明名完全相同才可省略
 * - 父使用上提拼接名：子文案作为片段已包含在父名中才可省略
 */
function canOmitStaticChild(
  child: VNode,
  parentOutputName: string,
  parentUsesOwnDeclaredName: boolean,
): boolean {
  // 布局 landmark / 规则声明名节点必须保留独立层级，绝不能被父级吸收
  if (isStructuralNamedNode(child)) return false
  const text = getStaticDisplayText(child)
  if (!text || !parentOutputName.trim()) return false
  const parentNorm = parentOutputName.replace(/\s+/g, ' ').trim()
  const textNorm = text.replace(/\s+/g, ' ').trim()
  if (parentUsesOwnDeclaredName) {
    return textNorm === parentNorm
  }
  return parentNorm.includes(textNorm)
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
export function shouldPassThrough(vnode: VNode, opts: A11yTreeShapeOptions): boolean {
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
 * 将节点 name 转义为 YAML 引号内文本；空名返回空串（调用方决定是否拼引号）。
 */
function formatNameAttr(name: string): string {
  const safe = name.replace(/[\r\n]+/g, ' ').replace(/"/g, '\\"').trim()
  return safe ? ` "${safe}"` : ''
}

/**
 * 将 VNode 序列化为 YAML 行数组
 * 穿透节点时，子节点在当前 depth 平铺输出（不增加缩进层级）
 *
 * 文本折叠规则（Static-Lift + Interactive-Keep，保字优先）：
 * 1. 子树全静态 → 省略子节点，文字保留在父节点
 * 2. 混合子树 → 静态文案上提到父 name（成功才省略静态子节点）；交互分支递归保留；
 *    禁止把交互文案并入父 name；上提失败则静态子节点独立输出，绝不丢字
 */
export function serializeVNode(
  vnode: VNode,
  depth: number,
  opts: A11yTreeShapeOptions,
): string[] {
  const hasInteractive = hasInteractiveDescendant(vnode)
  const forceKeepStructure =
    opts.preserveRoles.includes(vnode.role) || isStructuralNamedNode(vnode)
  const indent = '  '.repeat(depth)
  const refStr = vnode.ref !== undefined ? ` #${vnode.ref}` : ''
  const safeTokens = vnode.tokens.map(t => t.replace(/[\r\n]+/g, ' ').replace(/"/g, '\\"'))
  const tokenStr = safeTokens.length > 0 ? ` [${safeTokens.join(' ')}]` : ''

  // 空 landmark 壳：仅有声明名、无交互、无有价值子节点、无直接文本 → 整段省略
  // （如空的 ti-app-layout-main-header / 折叠右栏）。有直接文本的 landmark 必须保留。
  if (isEmptyLandmarkShell(vnode, hasInteractive)) {
    return []
  }

  // 规则 1：子树无可交互节点，且无需强制保留结构 → 折叠为一行（文字不丢）
  if (!hasInteractive && !forceKeepStructure) {
    if (shouldPassThrough(vnode, opts)) {
      return vnode.children
        .filter(c => hasValue(c))
        .flatMap(c => serializeVNode(c, depth, opts))
    }
    let displayName = vnode.name.trim()
    if (!displayName && vnode.children.length > 0) {
      displayName = collectVisiblePlainText(vnode.el)
    }
    if (isNoiseAccessibleName(displayName)) displayName = ''
    return [`${indent}- ${vnode.role}${refStr}${tokenStr}${formatNameAttr(displayName)}`]
  }

  // preserveRoles / 声明名 landmark 且无交互：保留结构，父级只用声明名，子节点照常输出
  if (!hasInteractive && forceKeepStructure) {
    const outputName = resolveDeclaredName(vnode)
    const line = `${indent}- ${vnode.role}${refStr}${tokenStr}${formatNameAttr(outputName)}`
    const childLines = vnode.children.flatMap(c => serializeVNode(c, depth + 1, opts))
    return [line, ...childLines]
  }

  // ── 混合子树：Static-Lift + Interactive-Keep ──
  const ownDeclaredName = resolveDeclaredName(vnode)
  const parentUsesOwnDeclaredName = ownDeclaredName !== ''
  // 布局 landmark 不参与上提，避免把「右侧面板」吸到外层 generic；
  // 中间层容器（如 .ti-app-layout-right-container）若包裹 landmark，同样排除。
  const staticChildren = vnode.children.filter(
    (c) => isStaticBranch(c) && !isStructuralNamedNode(c) && !containsStructuralNamed(c),
  )
  const liftedStaticName = staticChildren
    .map(getStaticDisplayText)
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
  // 纯文字节点不会生成 VNode 子节点，仅靠 staticChildren 会丢字；
  // 只采直接文本节点，避免穿透把内层 cell 文案误提到外层 row。
  const liftedDirectText = collectDirectTextNodes(vnode.el)
  const effectiveLifted = [liftedStaticName, liftedDirectText]
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()

  // 父 name：声明名优先；否则上提静态子树文案（绝不吸收交互文案）
  let outputName = parentUsesOwnDeclaredName ? ownDeclaredName : effectiveLifted
  if (isNoiseAccessibleName(outputName)) outputName = ''
  // vnode.name（声明名）若被污染同样丢弃
  if (!parentUsesOwnDeclaredName && isNoiseAccessibleName(vnode.name)) {
    outputName = effectiveLifted && !isNoiseAccessibleName(effectiveLifted) ? effectiveLifted : ''
  }

  const willEmitParent =
    vnode.ref !== undefined ||
    outputName !== '' ||
    forceKeepStructure ||
    !opts.pruneUnnamed

  // 父节点不会输出时必须穿透，且不得省略静态子节点（保字）
  if (!willEmitParent) {
    return vnode.children
      .filter(c => hasValue(c))
      .flatMap(c => serializeVNode(c, depth, opts))
  }

  if (vnode.ref !== undefined) {
    // 子树中唯一一个 ref 节点且是无子 ref 的 generic 时，将其 name 提升到父节点，省略子节点输出。
    const singleChild = findSingleRefDescendant(vnode)
    if (
      singleChild &&
      singleChild.role === 'generic' &&
      !hasInteractiveDescendant(singleChild) &&
      staticChildren.length === 0
    ) {
      const mergedName = outputName.trim() || singleChild.name.trim()
      // 合并输出时使用子节点 ref，避免 refMap 中的 #N 在 YAML 里丢失
      const mergedRefStr =
        singleChild.ref !== undefined ? ` #${singleChild.ref}` : refStr
      return [`${indent}- ${vnode.role}${mergedRefStr}${tokenStr}${formatNameAttr(mergedName)}`]
    }
  }

  // 仅省略「文案已由父 outputName 承载」的静态子节点；其余（含全部交互分支）按原序输出
  const childrenToEmit = vnode.children.filter(c => {
    if (!isStaticBranch(c)) return true
    return !canOmitStaticChild(c, outputName, parentUsesOwnDeclaredName)
  })

  const line = `${indent}- ${vnode.role}${refStr}${tokenStr}${formatNameAttr(outputName)}`
  const childLines = childrenToEmit.flatMap(c => serializeVNode(c, depth + 1, opts))
  return [line, ...childLines]
}
