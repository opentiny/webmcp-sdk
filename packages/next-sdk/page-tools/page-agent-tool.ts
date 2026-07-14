import { initializeBuiltinWebMCP } from './initialize-builtin-WebMCP'
import { zodToJsonSchema } from 'zod-to-json-schema'
import pageAgentPrompt from './page-agent-prompt.md?raw'
import { PageController } from '@page-agent/page-controller'
import { buildA11yTree, type RefMap } from './a11y-tree'
import { PageStateCache } from './page-state-cache'
import { SimulatorMask } from './page-agent-mask/SimulatorMask'
import { highlight, unhighlight, globalRemoveListener } from './page-agent-highlight'

import { DEFAULT_ERROR_SELECTORS, DEFAULT_DIALOG_SELECTORS, type PageAgentToolOptions } from './constants'
import { inputSchema, type PageAgentToolInput } from './schema'
import type { ActionContext } from './context'
import { detectPageDialog, detectValidationErrors } from './utils/dom'

import { handleBrowserState } from './handlers/browserState'
import { handleClick } from './handlers/click'
import { handleFill } from './handlers/fill'
import { handleSelect } from './handlers/select'
import { handleScroll } from './handlers/scroll'
import { handleExecuteJavascript } from './handlers/executeJavascript'
import { handleSearchTree } from './handlers/searchTree'

/** 在浏览器页面中注册 page-agent-tool, 用于页面的内容获取和操作，页面的动效 */
export function registerPageAgentTool(options: PageAgentToolOptions = {}) {
  initializeBuiltinWebMCP()

  // 默认启用元素高亮
  if (typeof options.enableHighlight === 'undefined') {
    options.enableHighlight = true
  }

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

  // ─── 辅助：构建错误响应 ───────────────────────────────────────────────────
  async function errContent(msg: string) {
    await pageController.hideMask()
    return { content: [{ type: 'text' as const, text: msg }] }
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
  ): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
    const url = window.location.href
    const title = document.title

    // 获取用户自定义黑名单与白名单及额外暴露的属性
    const blacklist = (window.__webmcpcli_interactiveBlacklist ?? []) as Element[]
    const whitelist = (window.__webmcpcli_interactiveWhitelist ?? []) as Element[]
    const exposedAttributes = (window.__webmcpcli_exposedAttributes ?? []) as string[]

    // 生成语义化 ARIA YAML 树 + 刷新 refMap
    const { yaml, refMap } = buildA11yTree(document.body, blacklist, whitelist, {
      exposedAttributes,
      errorSelectors: (window.__webmcpcli_errorSelectors ?? DEFAULT_ERROR_SELECTORS).join(', ')
    })
    currentRefMap = refMap

    // 高亮交互元素，且增加全局移除高亮的监听
    if (options?.enableHighlight) {
      highlight(refMap)
      globalRemoveListener()
    }

    // 计算 Diff
    const diff = stateCache.update(url, yaml)

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

  // 组装上下文传递给 handlers
  const actionContext: ActionContext = {
    pageController,
    stateCache,
    getRefMap: () => currentRefMap,
    setRefMap: (map: RefMap) => {
      currentRefMap = map
    },
    buildBrowserStateResponse,
    refreshOnStaleRef,
    errContent
  }

  // ─── 工具注册（名称与 inputSchema 与原版完全一致）────────────────────────
  ;(document as any).modelContext.registerTool({
    name: 'page-agent-tool',
    description: pageAgentPrompt,
    // @ts-ignore
    inputSchema: zodToJsonSchema(inputSchema) as any,
    async execute(args: PageAgentToolInput) {
      try {
        switch (args.action) {
          case 'browserState':
            return await handleBrowserState(args, actionContext)
          case 'click':
            await pageController.showMask()
            pageController.mask.borderElement(currentRefMap.get(args.index))
            const ret = await handleClick(args, actionContext)
            pageController.mask.removeBorderElement()
            await pageController.hideMask()
            return ret
          case 'fill':
            await pageController.showMask()
            pageController.mask.borderElement(currentRefMap.get(args.index))
            const ret = await handleFill(args, actionContext)
            pageController.mask.removeBorderElement()

            await pageController.hideMask()
            return ret
          case 'select':
            await pageController.showMask()
            pageController.mask.borderElement(currentRefMap.get(args.index))
            const ret = await handleSelect(args, actionContext)
            pageController.mask.removeBorderElement()
            await pageController.hideMask()
            return ret
          case 'scroll':
            await pageController.showMask()
            const ret = await handleScroll(args, actionContext)
            await pageController.hideMask()
            return ret
          case 'executeJavascript':
            return await handleExecuteJavascript(args, actionContext)
          case 'searchTree':
            return await handleSearchTree(args, actionContext)
          default:
            // @ts-ignore
            return { content: [{ type: 'text', text: `未知操作: ${args.action}` }] }
        }
      } catch (error) {
        return { content: [{ type: 'text', text: `异常: ${String(error)}` }] }
      }
    }
  })
}
