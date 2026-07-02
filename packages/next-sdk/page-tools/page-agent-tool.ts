import { initializeBuiltinWebMCP } from './initialize-builtin-WebMCP'
import { z } from 'zod'
import { zodToJsonSchema } from 'zod-to-json-schema'
import pageAgentPrompt from './page-agent-prompt.md?raw'
import { PageController, clickElement, inputTextElement, selectOptionElement } from '@page-agent/page-controller'
import { buildA11yTree, searchA11yTree, type RefMap } from './a11y-tree'
import { PageStateCache } from './page-state-cache'

declare global {
  interface Window {
    __webmcpcli_interactiveWhitelist?: Element[]
    __webmcpcli_interactiveBlacklist?: Element[]
    __webmcpcli_exposedAttributes?: string[]
    __webmcpcli_beforeGetBrowserState?: (() => void) | null
  }
}

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

  // 保留 PageController 仅用于 showMask/hideMask（UX 遮罩层）
  const pageController = new PageController({ enableMask: true })

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
    index: z.number().min(0).optional().describe('执行动作 of the element index, 动作为 click,fill,select时，必须提供元素索引'),
    text: z.string().optional().describe('执行动作的文本内容, 动作为 fill,select 时，必须提供文本内容'),
    down: z.boolean().optional().describe('执行上下滚动时，必须提供down参数'),
    right: z.boolean().optional().describe('执行水平滚动方向, 必须提供right参数'),
    numPages: z
      .number()
      .optional()
      .describe('执行动作的滚动页数, 动作为 scroll时，可以提供滚动页数，建议每次滚动0.1页，该值不要大于5.'),
    pixels: z.number().int().min(0).optional().describe('执行动作的滚动像素数，动作为 scroll时，可以提供滚动像素数'),
    script: z.string().optional().describe('执行的javascript代码，动作为 executeJavascript时，必须提供script参数'),
    query: z.string().optional().describe('搜索关键词，动作为 searchTree 时必须提供。支持按 role（如 button、link）、节点名称、状态（如 checked）或 ref 索引（如 #3）搜索'),
    contextLines: z.number().int().min(0).max(10).default(2).describe('searchTree 时每个命中行前后保留的上下文行数，默认 2'),
    maxMatches: z.number().int().min(1).max(50).default(20).describe('searchTree 时最大返回分组数，默认 20'),
    responseMode: z.enum(['full', 'diff', 'both'] as const)
      .optional()
      .default('diff')
      .describe('返回浏览器状态的模式。full: 仅返回当前全量 A11y 树；diff: 仅返回与上一次状态的增量差异；both: 同时返回全量 A11y 树与增量差异。默认值为 diff。')
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

  // ─── 核心：构建 browserState 响应（全量 or 增量 Diff）────────────────────
  async function buildBrowserStateResponse(responseMode: 'full' | 'diff' | 'both' = 'diff'): Promise<{ content: Array<{ type: string; text: string }> }> {
    const url = window.location.href
    const title = document.title

    // 获取用户自定义黑名单与白名单及额外暴露的属性
    const blacklist = (window.__webmcpcli_interactiveBlacklist ?? []) as Element[]
    const whitelist = (window.__webmcpcli_interactiveWhitelist ?? []) as Element[]
    const exposedAttributes = (window.__webmcpcli_exposedAttributes ?? []) as string[]

    // 生成语义化 ARIA YAML 树 + 刷新 refMap
    const { yaml, refMap } = buildA11yTree(document.body, blacklist, whitelist, { exposedAttributes })
    currentRefMap = refMap

    // 计算 Diff
    const diff = stateCache.update(url, yaml)

    await pageController.hideMask()

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
    const text = `浏览器状态: ${JSON.stringify(stateObj)}`
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
          if (!el) return errContent(`点击结果: 无效的 ref 索引 ${args.index}，请先调用 browserState 刷新页面状态`)
          await clickElement(el)
          // 操作成功后自动返回 diff/both/full
          return buildBrowserStateResponse(mode)

        // ── fill：输入文本，操作后自动返回 diff ───────────────────────────
        } else if (args.action === 'fill') {
          if (args.index === undefined || !args.text) return errContent('填写结果: 缺少元素索引或文本内容')
          const el = currentRefMap.get(args.index)
          if (!el) return errContent(`填写结果: 无效的 ref 索引 ${args.index}，请先调用 browserState 刷新页面状态`)
          
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
            await inputTextElement(targetEl, args.text)
            // shadow DOM 内元素：inputTextElement 派发的合成事件 composed:false，
            // 补发 composed:true 事件确保事件委托框架（如 React）能收到
            if (isInShadowDom(targetEl)) {
              dispatchComposedEvents(targetEl, 'input', 'change')
            }
          }
          return buildBrowserStateResponse(mode)

        // ── select：选择下拉框，操作后自动返回 diff ───────────────────────
        } else if (args.action === 'select') {
          if (args.index === undefined || !args.text) return errContent('选择结果: 缺少元素索引或文本内容')
          let el = currentRefMap.get(args.index) as HTMLSelectElement | HTMLElement | undefined
          if (!el) return errContent(`选择结果: 无效的 ref 索引 ${args.index}，请先调用 browserState 刷新页面状态`)
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
          return buildBrowserStateResponse(mode)

        // ── scroll：滚动页面，操作后自动返回 diff ─────────────────────────
        } else if (args.action === 'scroll') {
          if (!args.down && !args.right) return errContent('滚动结果: 缺少滚动方向参数')

          // 确定滚动目标（有 index 时滚动该元素容器，否则滚动整个文档）
          const scrollTarget = args.index !== undefined
            ? (currentRefMap.get(args.index) ?? window)
            : window

          if (args.right) {
            const pixels = args.pixels ?? 300
            scrollTarget.scrollBy({ left: args.right ? pixels : -pixels, behavior: 'smooth' })
          } else {
            const pixels = args.pixels ?? Math.round((args.numPages ?? 1) * window.innerHeight)
            scrollTarget.scrollBy({ top: args.down ? pixels : -pixels, behavior: 'smooth' })
          }

          // 等待滚动动画完成后再采集状态
          await new Promise(r => setTimeout(r, 400))
          return buildBrowserStateResponse(mode)
        // ── executeJavascript：执行任意 JS ────────────────────────────────
        } else if (args.action === 'executeJavascript') {
          if (!args.script) return errContent('脚本执行异常: 缺少javascript代码')
          // eslint-disable-next-line no-new-func
          const result = await new Function(`return (async () => { ${args.script} })()`)()
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
          const { text } = searchA11yTree(
            args.query,
            document.body,
            blacklist,
            whitelist,
            {
              contextLines: args.contextLines,
              maxMatches: args.maxMatches,
              exposedAttributes,
            },
          )
          await pageController.hideMask()
          return {
            content: [{ type: 'text', text }]
          }
        }
      } catch (error) {
        await pageController.hideMask()
        return { content: [{ type: 'text', text: `异常: ${String(error)}` }] }
      }
    }
  })
}
