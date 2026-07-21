import { initializeBuiltinWebMCP } from './initialize-builtin-WebMCP'
import { zodToJsonSchema } from 'zod-to-json-schema'
import pageAgentPrompt from './page-agent-prompt.md?raw'
import { PageController } from '@page-agent/page-controller'
import { buildA11yTree, type RefMap } from './a11y-tree'
import { PageStateCache } from './page-state-cache'
import { SimulatorMask } from './page-agent-mask/SimulatorMask'
import { highlight, unhighlight, globalRemoveListener } from './page-agent-highlight'
import { setupPageAgentToolEventBridge } from './page-agent-tool-event'

import type { PageAgentToolOptions } from './constants'
import { inputSchema, type PageAgentToolInput } from './schema'
import { createActionErrorResult, withStateFields, type ActionContext } from './context'
import { detectPageDialog, detectValidationErrors, detectVisibleTooltips } from './utils/dom'
import { getPageAgentToolConfig, setPageAgentToolConfig } from './tool-config'

import { handleBrowserState } from './handlers/browserState'
import { handleClick } from './handlers/click'
import { handleFill } from './handlers/fill'
import { handleSelect } from './handlers/select'
import { handleScroll } from './handlers/scroll'
import { handleExecuteJavascript } from './handlers/executeJavascript'
import { handleSearchTree } from './handlers/searchTree'
import { handleHover } from './handlers/hover'

/** 在浏览器页面中注册 page-agent-tool, 用于页面的内容获取和操作，页面的动效 */
export function registerPageAgentTool(options: PageAgentToolOptions = {}) {
  initializeBuiltinWebMCP()

  // 完整工具配置（顶层选项 enableHighlight + 统一无障碍配置 a11yConfig）：与默认配置合并后
  // 得到运行期唯一生效的配置（存于 window.__webmcpcli_toolConfig），后续可通过
  // setPageAgentToolConfig 在运行期继续修改（追加式合并/函数式过滤/整体替换）
  setPageAgentToolConfig(options, { mode: 'replace' })

  window.__webmcpcli_beforeGetBrowserState = window.__webmcpcli_beforeGetBrowserState || null // 指定网站覆盖该函数，可在其中调用 setPageAgentToolConfig 动态调整当前页面的配置

  // 保留 PageController ，先关闭内置mask, 再手工绑定当前项目的mask类
  const pageController = new PageController({ enableMask: false })
  const simulatorMask = new SimulatorMask()

  // @ts-ignore — PageController.mask / maskReady 为 private，需替换为项目内 SimulatorMask
  pageController.maskReady = (async () => {
    // @ts-ignore
    pageController.mask = simulatorMask
  })()

  // ─── 状态 Diff 缓存
  const stateCache = new PageStateCache()

  // 当前 ref 索引 → HTMLElement 映射（每次 buildA11yTree 后更新）
  let currentRefMap: RefMap = new Map()

  // ─── 辅助：构建错误响应 ───────────────────────────────────────────────────
  async function errContent(msg: string) {
    return { content: [{ type: 'text' as const, text: msg }] }
  }

  async function actionError(msg: string) {
    const result = await createActionErrorResult(msg, buildBrowserStateResponse)
    options.removeMaskAfterToolCall && (await pageController.hideMask())
    return result
  }

  // AI 使用过期 ref 时，自动重建 A11y 树并返回全量状态，
  // 避免 AI 额外往返调用 browserState，减少操作轮次
  async function refreshOnStaleRef(action: string, index: number) {
    const refreshResult = await buildBrowserStateResponse('full')
    const warning = `⚠️ ${action}失败: ref 索引 ${index} 已失效（页面可能已刷新），已自动重新加载页面状态，请使用新的 ref 索引重试。`
    return {
      content: [
        {
          type: 'text' as const,
          text: withStateFields(refreshResult.content[0].text, { warning })
        }
      ]
    }
  }

  // ─── 核心：构建 browserState 响应（全量 or 增量 Diff）────────────────────
  async function buildBrowserStateResponse(
    responseMode: 'full' | 'diff' | 'both' = 'diff'
  ): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
    const url = window.location.href
    const title = document.title

    // 生成语义化 ARIA YAML 树 + 刷新 refMap（统一读取运行期生效的配置，支持 setPageAgentToolConfig 动态修改）
    const { yaml, refMap } = buildA11yTree(document.body, getPageAgentToolConfig().a11yConfig)
    currentRefMap = refMap

    // 高亮交互元素，且增加全局移除高亮的监听（读取运行期生效的配置，支持 setPageAgentToolConfig 动态修改）
    if (getPageAgentToolConfig().enableHighlight) {
      highlight(refMap)
      globalRemoveListener()
    }

    // 计算 Diff
    const diff = stateCache.update(url, yaml)

    // 检测页面弹窗/遮罩层（确认框、提示框等），让 AI 优先处理
    const dialogs = detectPageDialog()
    // 检测表单校验错误，提醒 AI 优先修复
    const validationErrors = detectValidationErrors()
    // 检测 hover 后可见的 tooltip / 浮层提示（框架 portal 插入 body 的内容）
    const tooltips = detectVisibleTooltips()

    // 根据 responseMode 组装 content
    let displayContent = ''
    if (responseMode === 'full') {
      displayContent = yaml
    } else if (responseMode === 'diff') {
      displayContent = diff.isFullRefresh ? yaml : diff.diffText
    } else if (responseMode === 'both') {
      displayContent = `【全量页面树】:\n${yaml}\n\n【增量差异】:\n${diff.isFullRefresh ? '（首次/刷新，无增量差异）' : diff.diffText}`
    }

    // 全部字段平铺进 stateObj，直接返回 JSON 便于反序列化（与 webmcp-cli 的 state 提取逻辑对齐）
    const stateObj = {
      url,
      title,
      content: displayContent,
      ...(dialogs.length > 0 ? { dialogs } : {}),
      ...(validationErrors.length > 0 ? { validationErrors } : {}),
      ...(tooltips.length > 0 ? { tooltips } : {})
    }
    return { content: [{ type: 'text', text: JSON.stringify(stateObj) }] }
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
    errContent,
    actionError
  }

  function borderTargetElement(index: number | undefined) {
    if (index === undefined) return
    const el = currentRefMap.get(index)
    if (el) simulatorMask.borderElement(el)
  }

  async function executePageAgentTool(args: PageAgentToolInput) {
    try {
      let ret: { content: Array<{ type: 'text'; text: string }> }

      switch (args.action) {
        case 'browserState':
          ret = await handleBrowserState(args, actionContext)
          break
        case 'click':
          await pageController.showMask()
          borderTargetElement(args.index)
          ret = await handleClick(args, actionContext)
          options.removeMaskAfterToolCall && (await pageController.hideMask())
          break
        case 'fill':
          await pageController.showMask()
          borderTargetElement(args.index)
          ret = await handleFill(args, actionContext)
          options.removeMaskAfterToolCall && (await pageController.hideMask())
          break
        case 'select':
          await pageController.showMask()
          borderTargetElement(args.index)
          ret = await handleSelect(args, actionContext)
          options.removeMaskAfterToolCall && (await pageController.hideMask())
          break
        case 'scroll':
          await pageController.showMask()
          ret = await handleScroll(args, actionContext)
          options.removeMaskAfterToolCall && (await pageController.hideMask())
          break
        case 'executeJavascript':
          ret = await handleExecuteJavascript(args, actionContext)
          break
        case 'searchTree':
          ret = await handleSearchTree(args, actionContext)
          break
        case 'hover':
          ret = await handleHover(args, actionContext)
          break
        default:
          ret = { content: [{ type: 'text' as const, text: `未知操作: ${args.action}` }] }
      }
      return ret
    } catch (error) {
      const actionNames = {
        click: '点击',
        fill: '填写',
        select: '选择'
      } as const
      if (args.action in actionNames) {
        return actionError(
          `${actionNames[args.action as keyof typeof actionNames]}执行异常: ${error instanceof Error ? error.message : String(error)}`
        )
      }
      options.removeMaskAfterToolCall && (await pageController.hideMask())
      throw error
    } finally {
      simulatorMask.removeBorderElement()
    }
  }

  // ─── 工具注册（名称与 inputSchema 与原版完全一致）────────────────────────
  // replace 语义：重复调用前先注销同名工具（polyfill 对重复 register 会抛错）
  const modelContext = (document as any).modelContext
  if (!modelContext) {
    console.warn('[next-sdk] modelContext is not available, skipping page-agent-tool registration.')
    return
  }
  try {
    modelContext.unregisterTool?.('page-agent-tool')
  } catch {
    // 首次注册或不存在时忽略
  }
  modelContext.registerTool({
    name: 'page-agent-tool',
    description: pageAgentPrompt,
    // @ts-ignore
    inputSchema: zodToJsonSchema(inputSchema) as any,
    async execute(args: PageAgentToolInput) {
      try {
        return executePageAgentTool(args)
      } catch (error) {
        return { content: [{ type: 'text' as const, text: `异常: ${String(error)}` }] }
      }
    }
  })

  setupPageAgentToolEventBridge(executePageAgentTool, pageController)
}
