import { initializeBuiltinWebMCP } from './initialize-builtin-WebMCP'
import { z } from 'zod'
import { zodToJsonSchema } from 'zod-to-json-schema'
import pageAgentPrompt from './page-agent-prompt.md?raw'
import { PageController, clickElement, inputTextElement, selectOptionElement } from '@page-agent/page-controller'
import { buildA11yTree, searchA11yTree, type RefMap } from './a11y-tree'
import { PageStateCache } from './page-state-cache'
import { SimulatorMask } from './page-agent-mask/SimulatorMask'

declare global {
  interface Window {
    __webmcpcli_interactiveWhitelist?: Element[]
    __webmcpcli_interactiveBlacklist?: Element[]
    __webmcpcli_exposedAttributes?: string[]
    __webmcpcli_beforeGetBrowserState?: (() => void) | null
    /** 校验错误元素 CSS 选择器列表（覆盖默认，用于检测页面可见的校验错误） */
    __webmcpcli_errorSelectors?: string[]
    /** 模态弹窗元素 CSS 选择器列表（覆盖默认，用于检测阻塞交互的弹窗） */
    __webmcpcli_dialogSelectors?: string[]
  }
}

/** 校验错误默认选择器：ARIA 标准 + 主流 UI 框架 */
const DEFAULT_ERROR_SELECTORS: string[] = [
  // W3C ARIA 标准（最可靠，框架无关）
  '[role="alert"]',
  '[aria-invalid="true"]',
  // Tiny3 / Lego（华为云）
  '.ti3-unifyvalid-error', '.ti3-error', '.ti-error',
  '.lego-text-error', '.lego-error',
  // Element UI / Element Plus
  '.el-form-item__error',
  // Ant Design
  '.ant-form-item-explain-error',
  // Bootstrap
  '.is-invalid', '.invalid-feedback',
  // Angular
  '.ng-invalid',
  // 通用命名约定
  '.error-msg', '.error-message', '.error-text',
  '.field-error', '.form-error',
  '.is-error', '.has-error',
  '.validate-error', '.valid-error',
]

/** 模态弹窗默认选择器：ARIA 标准 + 主流 UI 框架 */
const DEFAULT_DIALOG_SELECTORS: string[] = [
  // W3C ARIA 标准
  '[role="dialog"]',
  '[role="alertdialog"]',
  // Tiny3 / Lego（华为云）
  '[class*="ti3-modal"]', '[class*="ti3-message-box"]',
  // Element UI / Element Plus
  '[class*="el-dialog"]', '[class*="el-message-box"]',
  // Ant Design
  '[class*="ant-modal"]',
  // Bootstrap
  '[class*="modal-content"]',
  // Vuetify
  '[class*="v-dialog"]',
  // Naive UI
  '[class*="n-modal"]',
]

export interface PageAgentToolOptions {
  /** 允许在无障碍树节点中额外暴露的 DOM 属性白名单 */
  exposedAttributes?: string[]
}

/** 在浏览器页面中注册 page-agent-tool, 用于页面的内容获取和操作，页面的动效 */
export function registerPageAgentTool(options?: PageAgentToolOptions) {
  initializeBuiltinWebMCP()

  window.__webmcpcli_interactiveWhitelist = window.__webmcpcli_interactiveWhitelist || [] // 白名单元素列表，存在则识别为交互元素
  window.__webmcpcli_interactiveBlacklist = window.__webmcpcli_interactiveBlacklist || [] // 黑名单，反之
  window.__webmcpcli_exposedAttributes = window.__webmcpcli_exposedAttributes || options?.exposedAttributes || [] // 额外暴露的自定义属性白名单
  window.__webmcpcli_beforeGetBrowserState = window.__webmcpcli_beforeGetBrowserState || null // 指定网站覆盖该函数，用于设置当前网站的黑白名单
  // 校验错误选择器：默认覆盖 ARIA 标准 + 主流框架，网站可通过 window.__webmcpcli_errorSelectors 覆盖
  window.__webmcpcli_errorSelectors = window.__webmcpcli_errorSelectors || DEFAULT_ERROR_SELECTORS
  // 模态弹窗选择器：同上
  window.__webmcpcli_dialogSelectors = window.__webmcpcli_dialogSelectors || DEFAULT_DIALOG_SELECTORS

  // 保留 PageController ，先关闭内置mask, 再手工绑定当前项目的mask类
  const pageController = new PageController({ enableMask: false })

  // @ts-ignore
  pageController.maskReady = (async () => {
    // @ts-ignore
    pageController.mask = new SimulatorMask()
  })()

  // ─── 状态 Diff 缓存
  const stateCache = new PageStateCache()

  // 当前 ref 索引 → HTMLElement 映射（每次 buildA11yTree 后更新）
  let currentRefMap: RefMap = new Map()

  // ─── inputSchema 与原版完全一致（对外 API 不变）──────────────────────────
  const inputSchema = z.object({
    action: z.enum(['browserState', 'click', 'fill', 'select', 'scroll', 'executeJavascript', 'searchTree'] as const)
      .describe(`执行的动作名称, 每一次执行 'click', 'fill', 'select'动作之前，**必须**要先调用 'browserState' 去获取页面的最新状态。 
        browserState: '查询整个页面的浏览器状态;返回页面的标题、URL、YAML格式的语义化页面树',
        click: '根据元素索引点击;',
        fill: '根据元素索引填写文本;'; 
        select: '根据元素索引选择下拉框选项;'; 
        scroll: '滚动页面的动作，可以指定水平滚动还是上下滚动; 不带元素索引时：滚动整个文档。带元素索引时：滚动该索引处的容器（或其最近的可滚动祖先元素）'
        executeJavascript: '执行javascript代码'
        searchTree: '按关键词搜索无障碍树，返回带行号的匹配节点及上下文，无需获取全量树。适合快速定位特定元素（如所有按钮、特定名称的链接等），显著减少上下文消耗。必须提供 query 参数。'
    `),
    index: z
      .number()
      .min(0)
      .optional()
      .describe('执行动作 of the element index, 动作为 click,fill,select时，必须提供元素索引'),
    text: z.string().optional().describe('执行动作的文本内容, 动作为 fill,select 时，必须提供文本内容'),
    down: z.boolean().optional().describe('执行上下滚动时，必须提供down参数'),
    right: z.boolean().optional().describe('执行水平滚动方向, 必须提供right参数'),
    numPages: z
      .number()
      .optional()
      .describe('执行动作的滚动页数, 动作为 scroll时，可以提供滚动页数，建议每次滚动0.1页，该值不要大于5.'),
    pixels: z.number().int().min(0).optional().describe('执行动作的滚动像素数，动作为 scroll时，可以提供滚动像素数'),
    script: z.string().optional().describe('执行的javascript代码，动作为 executeJavascript时，必须提供script参数'),
    query: z
      .string()
      .optional()
      .describe(
        '搜索关键词，动作为 searchTree 时必须提供。支持按 role（如 button、link）、节点名称、状态（如 checked）或 ref 索引（如 #3）搜索'
      ),
    contextLines: z
      .number()
      .int()
      .min(0)
      .max(10)
      .default(2)
      .describe('searchTree 时每个命中行前后保留的上下文行数，默认 2'),
    maxMatches: z.number().int().min(1).max(50).default(20).describe('searchTree 时最大返回分组数，默认 20'),
    responseMode: z
      .enum(['full', 'diff', 'both'] as const)
      .optional()
      .default('diff')
      .describe(
        '返回浏览器状态的模式。full: 仅返回当前全量 A11y 树；diff: 仅返回与上一次状态的增量差异；both: 同时返回全量 A11y 树与增量差异。默认值为 diff。'
      )
  })

  // ─── 辅助：构建错误响应 ───────────────────────────────────────────────────
  async function errContent(msg: string) {
    await pageController.hideMask()
    return { content: [{ type: 'text', text: msg }] }
  }

  // ─── 辅助：Shadow DOM 事件穿透 ───────────────────────────────────────────
  // 外部包 inputTextElement/selectOptionElement 派发的合成事件 composed:false，
  // 无法穿透 shadow boundary，导致事件委托框架（如 React）收不到 shadow 内元素的
  // input/change 事件。这里对 shadow DOM 内元素补发 composed:true 事件。
  function isInShadowDom(el: Element): boolean {
    return el.getRootNode() instanceof ShadowRoot
  }
  function dispatchComposedEvents(el: Element, ...types: string[]) {
    for (const type of types) {
      el.dispatchEvent(new Event(type, { bubbles: true, composed: true }))
    }
  }

  // ─── 辅助：等待 DOM 变更稳定 ────────────────────────────────────────────
  // click/fill/select 操作后，框架（Angular/React/Vue）可能异步插入校验错误、
  // 条件渲染选项等动态内容。用 MutationObserver 监听 DOM 变更，等待变更平息后
  // 再构建 A11y 树，确保动态插入的内容（如 ng-star-inserted 校验提示）被捕获。
  function waitForDomSettled(timeout = 600, settleTime = 150): Promise<void> {
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
  function detectPageDialog(): string {
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
  function detectValidationErrors(): string {
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


  // ─── 辅助：获取滚动目标的当前位置信息（仿 page-agent getPageInfo）────────
  // 同时支持 window（文档滚动）和任意 Element（容器滚动）
  function getScrollInfo(target: Window | Element = window) {
    if (target === window) {
      const pageHeight = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight)
      const pageWidth = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth)
      const scrollY = window.scrollY
      const scrollX = window.scrollX
      const pixelsBelow = Math.max(0, pageHeight - (window.innerHeight + scrollY))
      const pixelsRight = Math.max(0, pageWidth - (window.innerWidth + scrollX))
      return {
        scrollY, scrollX,
        pixelsAbove: scrollY, pixelsBelow,
        pixelsLeft: scrollX, pixelsRight,
        pagesAbove: window.innerHeight > 0 ? scrollY / window.innerHeight : 0,
        pagesBelow: window.innerHeight > 0 ? pixelsBelow / window.innerHeight : 0,
        atTop: scrollY <= 1,
        atBottom: pixelsBelow <= 1,
        atLeft: scrollX <= 1,
        atRight: pixelsRight <= 1,
      }
    } else {
      const el = target as Element
      const scrollTop = el.scrollTop
      const scrollLeft = el.scrollLeft
      const pixelsBelow = el.scrollHeight - el.clientHeight - scrollTop
      const pixelsRight = el.scrollWidth - el.clientWidth - scrollLeft
      return {
        scrollY: scrollTop, scrollX: scrollLeft,
        pixelsAbove: scrollTop, pixelsBelow: Math.max(0, pixelsBelow),
        pixelsLeft: scrollLeft, pixelsRight: Math.max(0, pixelsRight),
        pagesAbove: el.clientHeight > 0 ? scrollTop / el.clientHeight : 0,
        pagesBelow: el.clientHeight > 0 ? Math.max(0, pixelsBelow) / el.clientHeight : 0,
        atTop: scrollTop <= 1,
        atBottom: pixelsBelow <= 1,
        atLeft: scrollLeft <= 1,
        atRight: pixelsRight <= 1,
      }
    }
  }

  // AI 使用过期 ref 时，自动重建 A11y 树并返回全量状态，
  // 避免 AI 额外往返调用 browserState，减少操作轮次
  async function refreshOnStaleRef(action: string, index: number) {
    const refreshResult = await buildBrowserStateResponse('full')
    const warning = `⚠️ ${action}失败: ref 索引 ${index} 已失效（页面可能已刷新），已自动重新加载页面状态，请使用新的 ref 索引重试。\n`
    return {
      content: [{ type: 'text' as const, text: warning + refreshResult.content[0].text }]
    }
  }

  // ─── 核心：构建 browserState 响应（全量 or 增量 Diff）────────────────────
  async function buildBrowserStateResponse(
    responseMode: 'full' | 'diff' | 'both' = 'diff'
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    const url = window.location.href
    const title = document.title

    // 获取用户自定义黑名单与白名单及额外暴露的属性
    const blacklist = (window.__webmcpcli_interactiveBlacklist ?? []) as Element[]
    const whitelist = (window.__webmcpcli_interactiveWhitelist ?? []) as Element[]
    const exposedAttributes = (window.__webmcpcli_exposedAttributes ?? []) as string[]

    // 生成语义化 ARIA YAML 树 + 刷新 refMap
    const { yaml, refMap } = buildA11yTree(document.body, blacklist, whitelist, {
      exposedAttributes,
      errorSelectors: (window.__webmcpcli_errorSelectors ?? DEFAULT_ERROR_SELECTORS).join(', '),
    })
    currentRefMap = refMap

    // 计算 Diff
    const diff = stateCache.update(url, yaml)

    await pageController.hideMask()

    // 检测页面弹窗/遮罩层（确认框、提示框等），让 AI 优先处理
    const dialogAlert = detectPageDialog()
    // 检测表单校验错误，提醒 AI 优先修复
    const validationErrors = detectValidationErrors()

    // 根据 responseMode 组装 content
    let displayContent = ''
    if (responseMode === 'full') {
      displayContent = yaml
    } else if (responseMode === 'diff') {
      displayContent = diff.isFullRefresh ? yaml : diff.diffText
    } else if (responseMode === 'both') {
      displayContent = `【全量页面树】:\n${yaml}\n\n【增量差异】:\n${diff.isFullRefresh ? '（首次/刷新，无增量差异）' : diff.diffText}`
    }

    // 拼装 JSON 格式状态，与 webmcp-cli 的 state 提取逻辑对齐
    const stateObj = {
      url,
      title,
      content: displayContent
    }
    const text = `浏览器状态: ${JSON.stringify(stateObj)}${dialogAlert}${validationErrors}`
    return { content: [{ type: 'text', text }] }
  }

  // ─── 工具注册（名称与 inputSchema 与原版完全一致）────────────────────────
  ;(document as any).modelContext.registerTool({
    name: 'page-agent-tool',
    description: pageAgentPrompt,
    // @ts-ignore
    inputSchema: zodToJsonSchema(inputSchema) as any,
    async execute(args: any) {
      await pageController.showMask()
      const mode = args.responseMode ?? 'diff'
      try {
        // ── browserState：生成语义化 YAML + Diff ──────────────────────────
        if (args.action === 'browserState') {
          if (window.__webmcpcli_beforeGetBrowserState) {
            window.__webmcpcli_beforeGetBrowserState()
          }
          return buildBrowserStateResponse(mode)

          // ── click：用底层 clickElement(el) 操作，操作后自动返回 diff ───────
        } else if (args.action === 'click') {
          if (args.index === undefined) return errContent('点击结果: 缺少元素索引')
          const el = currentRefMap.get(args.index)
          if (!el) return refreshOnStaleRef('点击', args.index)
          // 若 ref 指向 shadow host，解析其内部真正的可点击元素（与 fill/select 一致）
          // clickElement 派发的合成 pointer/mouse 事件 composed:false 无法穿透 shadow boundary，
          // 需定位到 shadow 树内部的真实可点击元素，使事件在 shadow 树内被组件监听器接收
          let targetEl = el as HTMLElement
          if (el.shadowRoot && !(el instanceof HTMLButtonElement) && !(el instanceof HTMLAnchorElement)) {
            const innerClickable = el.shadowRoot.querySelector(
              'button, a, [role="button"], [role="link"]'
            ) as HTMLElement | null
            if (innerClickable) {
              targetEl = innerClickable
            }
          }
          await clickElement(targetEl)
          // 等待框架异步插入的校验错误/条件渲染内容稳定后再采集状态
          await waitForDomSettled()
          // 操作成功后自动返回 diff/both/full
          return buildBrowserStateResponse(mode)

          // ── fill：输入文本，操作后自动返回 diff ───────────────────────────
        } else if (args.action === 'fill') {
          if (args.index === undefined || !args.text) return errContent('填写结果: 缺少元素索引或文本内容')
          const el = currentRefMap.get(args.index)
          if (!el) return refreshOnStaleRef('填写', args.index)

          let targetEl = el
          if (!(targetEl instanceof HTMLInputElement) && !(targetEl instanceof HTMLTextAreaElement)) {
            // querySelector 不穿透 shadow boundary，对 shadow host 补查其 shadowRoot
            const innerInput = el.querySelector('input, textarea')
              ?? (el.shadowRoot?.querySelector('input, textarea') as HTMLElement | null)
            if (innerInput) {
              targetEl = innerInput as HTMLElement
            }
          }

          if (targetEl instanceof HTMLInputElement && targetEl.readOnly) {
            targetEl.value = args.text
            // composed:true 确保事件穿透 shadow boundary，事件委托框架可捕获
            dispatchComposedEvents(targetEl, 'input', 'change', 'blur')
          } else {
            // 优先尝试标准方式（支持 contenteditable、普通 input/textarea）
            let fillSuccess = false
            try {
              await inputTextElement(targetEl, args.text)
              fillSuccess = true
            } catch (fillErr) {
              // inputTextElement 失败时（如 Angular/React 组件包装的密码框），
              // 降级使用原生 input value 描述符触发框架变更检测
              const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                (targetEl instanceof HTMLTextAreaElement ? HTMLTextAreaElement : HTMLInputElement).prototype,
                'value'
              )?.set
              if (nativeInputValueSetter && (targetEl instanceof HTMLInputElement || targetEl instanceof HTMLTextAreaElement)) {
                nativeInputValueSetter.call(targetEl, args.text)
                // 发送完整事件序列，触发 Angular ngModel / React 合成事件的变更检测
                targetEl.dispatchEvent(new Event('focus', { bubbles: true, composed: true }))
                targetEl.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
                targetEl.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
                targetEl.dispatchEvent(new Event('blur', { bubbles: true, composed: true }))
                fillSuccess = true
              }
            }
            if (!fillSuccess) {
              return errContent(`填写结果: 无法填写元素 ${args.index}，元素不是 input、textarea 或 contenteditable`)
            }
            // shadow DOM 内元素：inputTextElement 派发的合成事件 composed:false，
            // 补发 composed:true 事件确保事件委托框架（如 React）能收到
            if (isInShadowDom(targetEl)) {
              dispatchComposedEvents(targetEl, 'input', 'change')
            }
          }
          // 等待框架异步插入的校验错误/条件渲染内容稳定后再采集状态
          await waitForDomSettled()
          return buildBrowserStateResponse(mode)

          // ── select：选择下拉框，操作后自动返回 diff ───────────────────────
        } else if (args.action === 'select') {
          if (args.index === undefined || !args.text) return errContent('选择结果: 缺少元素索引或文本内容')
          let el = currentRefMap.get(args.index) as HTMLSelectElement | HTMLElement | undefined
          if (!el) return refreshOnStaleRef('选择', args.index)
          // 若 ref 指向 shadow host，解析其内部真正的 <select>（与 fill 一致）
          if (!(el instanceof HTMLSelectElement)) {
            const innerSelect = el.querySelector('select')
              ?? (el.shadowRoot?.querySelector('select') as HTMLSelectElement | null)
            if (innerSelect) {
              el = innerSelect
            }
          }
          await selectOptionElement(el as HTMLSelectElement, args.text)
          // shadow DOM 内元素：补发 composed:true 的 change 事件
          if (isInShadowDom(el)) {
            dispatchComposedEvents(el, 'change')
          }
          // 等待框架异步插入的校验错误/条件渲染内容稳定后再采集状态
          await waitForDomSettled()
          return buildBrowserStateResponse(mode)

          // ── scroll：滚动页面，操作后自动返回位置信息 + diff ───────────────
        } else if (args.action === 'scroll') {
          if (args.down === undefined && args.right === undefined) return errContent('滚动结果: 缺少滚动方向参数')

          // 确定滚动目标（有 index 时滚动该元素容器，否则滚动整个文档）
          const scrollTarget = args.index !== undefined ? (currentRefMap.get(args.index) ?? window) : window

          // 滚动前快照
          const before = getScrollInfo(scrollTarget)

          if (args.right !== undefined) {
            const pixels = args.pixels ?? 300
            scrollTarget.scrollBy({ left: args.right ? pixels : -pixels, behavior: 'smooth' })
          } else {
            const pixels = args.pixels ?? Math.round((args.numPages ?? 1) * window.innerHeight)
            scrollTarget.scrollBy({ top: args.down ? pixels : -pixels, behavior: 'smooth' })
          }

          // 等待滚动动画完成后再采集状态
          await new Promise((r) => setTimeout(r, 400))

          // 滚动后快照，计算实际位移
          const after = getScrollInfo(scrollTarget)
          const deltaY = Math.round(after.scrollY - before.scrollY)
          const deltaX = Math.round(after.scrollX - before.scrollX)

          let scrollMsg: string
          if (Math.abs(deltaY) < 1 && Math.abs(deltaX) < 1) {
            // 实际未发生位移，说明已到达边界
            if (args.right !== undefined) {
              scrollMsg = args.right ? '⚠️ 已到达右边界，无法继续向右滚动' : '⚠️ 已到达左边界，无法继续向左滚动'
            } else {
              scrollMsg = args.down ? '⚠️ 已到达底部，无法继续向下滚动' : '⚠️ 已到达顶部，无法继续向上滚动'
            }
          } else {
            const axis = deltaY !== 0 ? `垂直滚动 ${deltaY}px` : `水平滚动 ${deltaX}px`
            const boundary = after.atBottom ? '，已到达底部' : after.atTop ? '，已到达顶部'
              : after.atRight ? '，已到达右边界' : after.atLeft ? '，已到达左边界' : ''
            scrollMsg = `✅ ${axis}${boundary}`
          }

          // 附加位置信息（参考 page-agent getPageInfo 格式）
          const posInfo = args.right !== undefined
            ? `当前水平滚动位置: scrollX=${Math.round(after.scrollX)}px，左侧 ${after.pagesAbove.toFixed(1)} 屏，右侧 ${after.pagesBelow.toFixed(1)} 屏`
            : `当前滚动位置: scrollY=${Math.round(after.scrollY)}px，上方 ${after.pagesAbove.toFixed(1)} 屏，下方 ${after.pagesBelow.toFixed(1)} 屏`
          const scrollResult = `[滚动结果] ${scrollMsg}\n${posInfo}`

          const stateResult = await buildBrowserStateResponse(mode)
          stateResult.content[0].text = `${scrollResult}\n\n${stateResult.content[0].text}`
          return stateResult
          // ── executeJavascript：执行任意 JS ────────────────────────────────
        } else if (args.action === 'executeJavascript') {
          if (!args.script) return errContent('脚本执行异常: 缺少javascript代码')
          // eslint-disable-next-line no-new-func
          // 方式1：将脚本包裹在 async IIFE 中执行，允许 return 语句
          let result = await new Function(`return (async () => { ${args.script} })()`)()
          // 方式2：若 result 为 undefined（脚本没有 return），降级尝试以表达式方式求值
          // 场景：Agent 写了 "Array.from(...).map(...)" 但没有 return 关键字
          if (result === undefined) {
            try {
              // eslint-disable-next-line no-new-func
              result = await new Function(`return (async () => (${args.script}))()`)()
            } catch {
              // 表达式求值也失败（如含 await/let/const 等语句），保持 undefined
            }
          }
          await pageController.hideMask()
          return {
            content: [{ type: 'text', text: `脚本执行结果: ${JSON.stringify(result)}` }]
          }

          // ── searchTree：关键词搜索无障碍树，返回带行号的精准结果 ──────────
        } else if (args.action === 'searchTree') {
          if (!args.query) return errContent('搜索失败: 缺少 query 参数')
          const blacklist = (window.__webmcpcli_interactiveBlacklist ?? []) as Element[]
          const whitelist = (window.__webmcpcli_interactiveWhitelist ?? []) as Element[]
          const exposedAttributes = (window.__webmcpcli_exposedAttributes ?? []) as string[]
          const result = searchA11yTree(args.query, document.body, blacklist, whitelist, {
            contextLines: args.contextLines,
            maxMatches: args.maxMatches,
            exposedAttributes,
            errorSelectors: (window.__webmcpcli_errorSelectors ?? DEFAULT_ERROR_SELECTORS).join(', '),
          })
          
          currentRefMap = result.refMap
          stateCache.update(window.location.href, result.yaml)
          
          await pageController.hideMask()
          // 检测页面弹窗/遮罩层，帮助 AI 发现可能遮挡目标的确认弹窗
          const dialogAlert = detectPageDialog()
          // 检测表单校验错误，提醒 AI 优先修复
          const validationErrors = detectValidationErrors()
          const alerts = `${dialogAlert}${validationErrors}`
          return {
            content: [{ type: 'text', text: alerts ? `${alerts}\n${result.text}` : result.text }]
          }
        }
      } catch (error) {
        await pageController.hideMask()
        return { content: [{ type: 'text', text: `异常: ${String(error)}` }] }
      }
    }
  })
}
