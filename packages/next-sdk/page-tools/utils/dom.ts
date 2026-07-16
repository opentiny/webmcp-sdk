import { extractSelectors, getSelectorsForRole } from '../a11y/config'
import { getPageAgentToolConfig } from '../tool-config'

// ─── 辅助：Shadow DOM 事件穿透 ───────────────────────────────────────────
// 外部包 inputTextElement/selectOptionElement 派发的合成事件 composed:false，
// 无法穿透 shadow boundary，导致事件委托框架（如 React）收不到 shadow 内元素的
// input/change 事件。这里对 shadow DOM 内元素补发 composed:true 事件。
export function isInShadowDom(el: Element): boolean {
  return el.getRootNode() instanceof ShadowRoot
}

export function dispatchComposedEvents(el: Element, ...types: string[]) {
  for (const type of types) {
    el.dispatchEvent(new Event(type, { bubbles: true, composed: true }))
  }
}

// ─── 辅助：穿透 Shadow DOM 的查询 ─────────────────────────────────────────
export function deepQuerySelectorAll(selector: string, root: Document | Element | ShadowRoot = document): Element[] {
  const elements = Array.from(root.querySelectorAll(selector))
  
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, null)
  let currentNode: Node | null = walker.currentNode
  while (currentNode) {
    if ((currentNode as Element).shadowRoot) {
      elements.push(...deepQuerySelectorAll(selector, (currentNode as Element).shadowRoot!))
    }
    currentNode = walker.nextNode()
  }
  return elements
}

// ─── 辅助：等待 DOM 变更稳定 ────────────────────────────────────────────
// click/fill/select 操作后，框架（Angular/React/Vue）可能异步插入校验错误、
// 条件渲染选项等动态内容。用 MutationObserver 监听 DOM 变更，等待变更平息后
// 再构建 A11y 树，确保动态插入的内容（如 ng-star-inserted 校验提示）被捕获。
export function waitForDomSettled(timeout = 600, settleTime = 150): Promise<void> {
  return new Promise<void>((resolve) => {
    let settled = false
    let settleTimer: ReturnType<typeof setTimeout> | undefined
    const finish = () => {
      if (settled) return
      settled = true
      observer.disconnect()
      if (settleTimer) clearTimeout(settleTimer)
      resolve()
    }
    // 每次有 DOM 变更时重置 settle 计时器；变更平息 settleTime 后视为稳定
    const observer = new MutationObserver(() => {
      if (settleTimer) clearTimeout(settleTimer)
      settleTimer = setTimeout(finish, settleTime)
    })
    // 若无任何变更，settleTime 后直接结束
    settleTimer = setTimeout(finish, settleTime)
    // 超时保护：timeout 后强制结束，避免无限等待
    setTimeout(finish, timeout)
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'hidden'],
    })
  })
}

// ─── 辅助：检测页面级模态弹窗/遮罩层 ────────────────────────────────────
// 仅检测真正阻塞交互的模态弹窗（确认框、提交对话框等），
// 不检测顶部通知横幅、站内消息等非模态提示，避免误报导致 AI 循环
export function detectPageDialog(): string {
  const seen = new Set<Element>()
  const dialogs: string[] = []
  // 仅匹配明确的模态弹窗选择器，避免宽泛子串匹配误报
  // 从 roles 规则中提取 role="dialog" 的选择器（已含默认值 + 用户配置）
  const selectors = getSelectorsForRole(getPageAgentToolConfig().a11yConfig.roles, 'dialog')

  for (const selector of selectors) {
    try {
      for (const el of deepQuerySelectorAll(selector)) {
        if (seen.has(el)) continue
        // 跳过 SDK 自身遮罩
        if (el.id?.includes('page-agent-runtime')) continue
        if (el.closest('#page-agent-runtime_simulator-mask')) continue

        const rect = el.getBoundingClientRect()
        if (rect.width < 50 || rect.height < 50) continue
        const style = window.getComputedStyle(el as HTMLElement)
        if (style.display === 'none' || style.visibility === 'hidden') continue

        // 模态性验证：必须是 fixed/absolute 且 z-index 较高
        const isFixed = style.position === 'fixed' || style.position === 'absolute'
        const zIndex = parseInt(style.zIndex || '0', 10)
        if (!isFixed || zIndex < 100) continue

        // 必须覆盖视口中心区域（真正的模态弹窗会遮挡页面中心）
        const vw = window.innerWidth
        const vh = window.innerHeight
        const coversCenter = rect.left < vw * 0.6 && rect.right > vw * 0.4 &&
                             rect.top < vh * 0.6 && rect.bottom > vh * 0.4
        if (!coversCenter) continue

        seen.add(el)
        const text = (el.textContent || '').trim().replace(/\s+/g, ' ')
        if (text.length > 5) {
          // 提取弹窗内的可交互按钮，帮助 AI 快速决策
          const btns = el.querySelectorAll('button, [role="button"], a')
          const btnTexts = Array.from(btns)
            .map(b => (b.textContent || '').trim())
            .filter(t => t.length > 0 && t.length < 20)
            .slice(0, 5)
          const btnInfo = btnTexts.length ? ` [可操作按钮: ${btnTexts.join(' / ')}]` : ''
          dialogs.push(`${text.substring(0, 300)}${btnInfo}`)
        }
      }
    } catch {
      // 忽略选择器异常
    }
  }

  if (dialogs.length === 0) return ''
  return `\n[页面弹窗检测] 检测到 ${dialogs.length} 个模态弹窗，请优先处理:\n${dialogs.map((d, i) => `${i + 1}. ${d}`).join('\n')}\n`
}

// ─── 辅助：检测页面可见的表单校验错误 ──────────────────────────────────
// 操作后自动扫描页面中的校验错误提示，提取文本并提醒 AI，
// 避免 AI 卡住时不知道是因为有校验错误未处理
export function detectValidationErrors(): string {
  const seen = new Set<Element>()
  const errors: string[] = []
  // 校验错误选择器：ARIA 标准 + 主流 UI 框架（可配置）
  // 统一取 getPageAgentToolConfig().a11yConfig.states.error（已含默认值 + 用户配置）
  const selectors = extractSelectors(getPageAgentToolConfig().a11yConfig.states.error)

  for (const selector of selectors) {
    try {
      for (const el of deepQuerySelectorAll(selector)) {
        if (seen.has(el)) continue
        // 跳过嵌套在已收集的错误元素内的子元素，避免重复
        if (Array.from(seen).some(s => s.contains(el))) continue

        const rect = el.getBoundingClientRect()
        if (rect.width < 1 || rect.height < 1) continue
        const style = window.getComputedStyle(el as HTMLElement)
        if (style.display === 'none' || style.visibility === 'hidden') continue

        const text = (el.textContent || '').trim().replace(/\s+/g, ' ')
        if (text.length > 2 && text.length < 200) {
          seen.add(el)
          errors.push(text)
        }
      }
    } catch {
      // 忽略选择器异常
    }
  }

  if (errors.length === 0) return ''
  return `\n[校验提示] 检测到 ${errors.length} 个表单校验错误，请先修复后再继续:\n${errors.map((e, i) => `${i + 1}. ${e}`).join('\n')}\n`
}

// ─── 辅助：检测 hover 后可见的 tooltip / 浮层提示 ────────────────────────
// hover 操作后，框架会将 tooltip 弹窗插入到 body（portal 模式）。
// 这些浮层在 A11y 树中可能位置分散或被剪枝，此函数显式扫描并提取文本，
// 确保 AI 能读到 hover 触发的提示内容。

/** 获取当前页面所有可见 tooltip 元素（含文本） */
function getVisibleTooltipElements(): Array<{ el: Element; text: string }> {
  const seen = new Set<Element>()
  const tooltips: Array<{ el: Element; text: string }> = []
  const selectors = getSelectorsForRole(getPageAgentToolConfig().a11yConfig.roles, 'tooltip')

  for (const selector of selectors) {
    try {
      for (const el of deepQuerySelectorAll(selector)) {
        if (seen.has(el)) continue
        // 跳过嵌套在已收集的 tooltip 元素内的子元素
        if (Array.from(seen).some(s => s.contains(el))) continue

        const rect = el.getBoundingClientRect()
        if (rect.width < 1 || rect.height < 1) continue
        const style = window.getComputedStyle(el as HTMLElement)
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') continue

        const text = (el.textContent || '').trim().replace(/\s+/g, ' ')
        if (text.length > 1) {
          seen.add(el)
          tooltips.push({ el, text })
        }
      }
    } catch {
      // 忽略选择器异常
    }
  }
  return tooltips
}

export function detectVisibleTooltips(): string {
  const tooltips = getVisibleTooltipElements().map(t => t.text)
  if (tooltips.length === 0) return ''
  return `\n[Tooltip 检测] hover 后检测到 ${tooltips.length} 个可见浮层提示:\n${tooltips.map((t, i) => `${i + 1}. ${t}`).join('\n')}\n`
}

// ─── 辅助：自动 hover 扫描动态 tooltip ─────────────────────────────────
// 对无可视标识（无 title/aria-describedby/data-tooltip）但可能触发 tip 的元素，
// 逐个 hover → 检测新出现的 tooltip → 缓存文本 → 恢复（mouseleave），
// 最终将 element → tooltip 文本映射存入全局缓存，供 extractTooltipText 使用。
//
// 候选条件：仅 cursor: pointer 或 cursor: help 的元素
// 跳过条件：已有静态 tooltip（hasStaticTooltip）、不可见、已缓存

const MAX_SCAN_CANDIDATES = 15
const HOVER_WAIT_MS = 500
const DISMISS_WAIT_MS = 150

function isElementVisible(el: Element): boolean {
  const rect = el.getBoundingClientRect()
  if (rect.width < 1 || rect.height < 1) return false
  const style = window.getComputedStyle(el as HTMLElement)
  if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false
  // 必须在视口内或接近视口
  const vh = window.innerHeight
  const vw = window.innerWidth
  return rect.top < vh && rect.bottom > 0 && rect.left < vw && rect.right > 0
}

function hasStaticTooltip(el: Element): boolean {
  return !!(el.getAttribute('title') || el.getAttribute('aria-describedby') ||
    el.getAttribute('data-tooltip') || el.getAttribute('data-tips') || el.getAttribute('data-tip') ||
    el.getAttribute('mattooltip') || el.getAttribute('matTooltip'))
}

function collectTooltipScanCandidates(): HTMLElement[] {
  const candidates: HTMLElement[] = []

  // 仅扫描配置中 role="tooltip" 选择器匹配的元素（如 tp-helptip）
  // 这类元素自身 cursor 可能为 auto，tooltip 内容需 hover 才动态出现
  // cursor:pointer/help 的元素通常已有静态 tooltip（title 等），由 extractTooltipText 处理
  const tooltipSelectors = getSelectorsForRole(getPageAgentToolConfig().a11yConfig.roles, 'tooltip')
  for (const sel of tooltipSelectors) {
    for (const el of deepQuerySelectorAll(sel)) {
      if (!(el instanceof HTMLElement)) continue
      if (candidates.length >= MAX_SCAN_CANDIDATES) return candidates
      if (hasStaticTooltip(el)) continue
      if (!isElementVisible(el)) continue
      if (window.__webmcpcli_dynamicTooltipCache?.has(el)) continue
      candidates.push(el)
    }
  }
  return candidates
}

function dispatchHoverEvents(el: HTMLElement, enter: boolean) {
  const rect = el.getBoundingClientRect()
  const cx = rect.left + rect.width / 2
  const cy = rect.top + rect.height / 2
  const events = enter
    ? [['pointerenter', false, true], ['pointerover', true, true], ['mouseenter', false, false], ['mouseover', true, false], ['mousemove', true, false]] as const
    : [['pointerout', true, true], ['pointerleave', false, true], ['mouseout', true, false], ['mouseleave', false, false]] as const

  for (const [type, bubbles, usePointer] of events) {
    const Cls = usePointer ? PointerEvent : MouseEvent
    el.dispatchEvent(new Cls(type, { bubbles, cancelable: true, view: window, clientX: cx, clientY: cy }))
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms))
}

// DOM 变更追踪：若自上次扫描后 DOM 无显著变化则跳过重复扫描
let domDirtySinceLastScan = true
let scanObserverInitialized = false

export async function scanForDynamicTooltips(): Promise<void> {
  // 初始化 MutationObserver（仅一次）
  if (!scanObserverInitialized) {
    scanObserverInitialized = true
    const observer = new MutationObserver(() => { domDirtySinceLastScan = true })
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style'] })
  }

  // 初始化/重置缓存
  if (!window.__webmcpcli_dynamicTooltipCache) {
    window.__webmcpcli_dynamicTooltipCache = new WeakMap()
  }
  const cache = window.__webmcpcli_dynamicTooltipCache

  // 优先消费 CLI 端真实鼠标 hover 的预扫描结果（必须在 dirty 检查之前，否则会被跳过）
  // 合成事件（dispatchEvent）无法触发 Angular 等框架的 tooltip 指令，
  // CLI 端通过 Puppeteer page.mouse.move() 真实 hover 后将结果存入 __webmcpcli_preScannedTooltips
  const preScanned = window.__webmcpcli_preScannedTooltips
  if (preScanned && preScanned.length > 0) {
    const tipEls = Array.from(document.querySelectorAll('tp-helptip'))
    for (const item of preScanned) {
      const el = tipEls[item.index]
      if (el) {
        cache.set(el, item.text)
      }
    }
    // 消费完毕，清除预扫描数据
    window.__webmcpcli_preScannedTooltips = undefined
    // 预扫描数据已写入缓存，标记 dirty 确保后续扫描也执行
    domDirtySinceLastScan = true
  }

  // 若 DOM 自上次扫描后无变化则跳过，避免每次 full/both 响应都重新扫描
  if (!domDirtySinceLastScan) return

  const candidates = collectTooltipScanCandidates()
  if (candidates.length === 0) {
    domDirtySinceLastScan = false
    return
  }

  // 记录扫描前已可见的 tooltip（避免误关联）
  const beforeTooltipEls = new Set(getVisibleTooltipElements().map(t => t.el))

  for (const el of candidates) {
    // 使用 MutationObserver 捕获 hover 期间新增的 DOM 节点
    // Angular 等框架将 tooltip overlay 动态插入到 body 下（portal 模式），
    // 这类 overlay 可能不匹配预设的 tooltip 选择器，需要通用的节点检测
    const addedNodes: Element[] = []
    const hoverObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of Array.from(mutation.addedNodes)) {
          if (node instanceof Element) addedNodes.push(node)
        }
      }
    })
    hoverObserver.observe(document.body, { childList: true, subtree: true })

    // hover 触发
    dispatchHoverEvents(el, true)
    await sleep(HOVER_WAIT_MS)

    // 停止观察
    hoverObserver.disconnect()

    // 方式1：检测匹配 tooltip 选择器的新可见元素
    const afterTooltips = getVisibleTooltipElements()
    const newTooltips = afterTooltips.filter(t => !beforeTooltipEls.has(t.el))

    if (newTooltips.length > 0) {
      cache.set(el, newTooltips[0].text.substring(0, 200))
    } else if (addedNodes.length > 0) {
      // 方式2：检测 hover 期间新增的可见且有文本的 overlay 元素
      // 覆盖 Angular portal 模式下插入 body 的 tooltip（类名不匹配预设选择器的情况）
      for (const node of addedNodes) {
        // 跳过 SDK 自身注入的元素
        if (node.classList?.contains('webmcp-page-agent-wrapper')) continue
        const rect = node.getBoundingClientRect()
        if (rect.width < 1 || rect.height < 1) continue
        const style = window.getComputedStyle(node as HTMLElement)
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') continue
        const text = (node.textContent || '').trim().replace(/\s+/g, ' ')
        if (text.length > 1) {
          cache.set(el, text.substring(0, 200))
          break
        }
      }
    }

    // 恢复（mouseleave 关闭 tooltip）
    dispatchHoverEvents(el, false)
    await sleep(DISMISS_WAIT_MS)
  }

  // 扫描完成，清除 dirty 标志（扫描过程中的 DOM 变更回调已在 await 期间执行完毕）
  domDirtySinceLastScan = false
}
