import { DEFAULT_DIALOG_SELECTORS, DEFAULT_ERROR_SELECTORS } from '../constants'

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
  const selectors = (window.__webmcpcli_dialogSelectors ?? DEFAULT_DIALOG_SELECTORS)

  for (const selector of selectors) {
    try {
      for (const el of document.querySelectorAll(selector)) {
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
  const selectors = (window.__webmcpcli_errorSelectors ?? DEFAULT_ERROR_SELECTORS)

  for (const selector of selectors) {
    try {
      for (const el of document.querySelectorAll(selector)) {
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
