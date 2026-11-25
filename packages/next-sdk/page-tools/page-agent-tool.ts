import { initializeBuiltinWebMCP, isBuiltinWebMCPPolyfill } from './initialize-builtin-WebMCP'
import { zodToJsonSchema } from 'zod-to-json-schema'
import pageAgentPrompt from './page-agent-prompt.md?raw'
import { PageController } from '@page-agent/page-controller'
import { buildA11yTree, ElementRefAllocator, type RefMap } from './a11y-tree'
import { PageStateCache, type SnapshotKind } from './page-state-cache'
import { SimulatorMask } from './page-agent-mask/SimulatorMask'
import { highlight, unhighlight, globalRemoveListener } from './page-agent-highlight'
import { setupPageAgentToolEventBridge } from './page-agent-tool-event'

import type { PageAgentToolOptions } from './constants'
import { inputSchema, type PageAgentToolInput } from './schema'
import {
  createActionErrorResult,
  createSessionResetErrorResult,
  createStaleRefErrorResult,
  REF_ACTION_LABELS,
  type ActionContext,
  type BrowserStateResponseMode,
  type BrowserStateSnapshot,
  type PageAgentToolErrorResult,
  type RefActionName
} from './context'
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
import { handleClipboard } from './handlers/clipboard'

/** 宿主调用 showMask 时可覆盖是否展示 AI 鼠标图标 */
export type ShowMaskOptions = {
  showCursor?: boolean
}

/** registerPageAgentTool 返回的句柄，暴露对内部 SimulatorMask 显隐与会话状态重置的控制 */
export type PageAgentToolHandle = {
  showMask: (options?: ShowMaskOptions) => Promise<void>
  hideMask: () => Promise<void>
  /** 新建或清空会话时由宿主调用，重置页面快照缓存、版本号 rev、DOM 元素 #ref 绑定映射并清除高亮 */
  resetSession?: () => void
}

/** registerPageAgentTool 实际返回句柄（始终提供 resetSession） */
export type RegisteredPageAgentToolHandle = PageAgentToolHandle & {
  resetSession: () => void
}

declare global {
  interface Window {
    /** 页面内所有 registerPageAgentTool 调用共用的遮罩实例，页面中存在多份 SDK 副本时同样共用 */
    __pageAgentSimulatorMask?: SimulatorMask
    /** 当前生效注册实例的会话重置函数，使重复注册后旧句柄调用 resetSession() 仍作用于最新实例 */
    __pageAgentResetSession?: () => void
  }
}

/**
 * 重复注册时复用页面上已有的遮罩，使先前返回的句柄仍能控制当前显示的遮罩。
 * 遮罩已被 dispose 或其元素已被移出文档时，释放旧实例的全局监听与动画循环后重新创建。
 */
function acquireSimulatorMask(): SimulatorMask {
  const existing = window.__pageAgentSimulatorMask
  if (existing?.wrapper?.isConnected) return existing
  existing?.dispose()
  const mask = new SimulatorMask()
  window.__pageAgentSimulatorMask = mask
  return mask
}

type CursorKind = 'host' | 'pointer' | 'observe'

function resolveShowCursor(kind: CursorKind, explicit?: boolean): boolean {
  const mode = getPageAgentToolConfig().cursorMode ?? 'actionOnly'
  // 优先级：never（全局关闭）> 显式 showCursor > always（未传参时默认出光标）> actionOnly 按 kind
  if (mode === 'never') return false
  if (explicit !== undefined) return explicit
  if (mode === 'always') return true
  return kind === 'pointer'
}

/** 在浏览器页面中注册 page-agent-tool, 用于页面的内容获取和操作，页面的动效 */
export function registerPageAgentTool(options: PageAgentToolOptions = {}): RegisteredPageAgentToolHandle {
  initializeBuiltinWebMCP()

  // 完整工具配置（顶层选项 enableHighlight + 统一无障碍配置 a11yConfig）：与默认配置合并后
  // 得到运行期唯一生效的配置（存于 window.__webmcpcli_toolConfig），后续可通过
  // setPageAgentToolConfig 在运行期继续修改（追加式合并/函数式过滤/整体替换）
  setPageAgentToolConfig(options, { mode: 'replace' })

  window.__webmcpcli_beforeGetBrowserState = window.__webmcpcli_beforeGetBrowserState || null // 指定网站覆盖该函数，可在其中调用 setPageAgentToolConfig 动态调整当前页面的配置

  // 保留 PageController ，先关闭内置mask, 再手工绑定当前项目的mask类
  const pageController = new PageController({ enableMask: false })
  const simulatorMask = acquireSimulatorMask()

  // @ts-ignore — PageController.mask / maskReady 为 private，需替换为项目内 SimulatorMask
  pageController.maskReady = (async () => {
    // @ts-ignore
    pageController.mask = simulatorMask
  })()

  // ─── 会话级状态缓存与稳定元素 #ref 分配器 ────────────────────────────────
  const stateCache = new PageStateCache()
  const refAllocator = new ElementRefAllocator()
  // 会话代次：每次 endTurn() 或 resetSession() 递增，用于拦截前序已发起的异步动作续体污染后续状态
  let sessionGeneration = 0

  // 当前最新快照中活跃的 ref 索引 → HTMLElement 映射（每次 buildA11yTree 后更新）
  let currentRefMap: RefMap = new Map()

  function endTurn(): void {
    sessionGeneration++
    stateCache.invalidate()
  }

  function resetSession(): void {
    sessionGeneration++
    stateCache.reset()
    refAllocator.reset()
    currentRefMap = new Map()
    unhighlight()
  }

  async function errContent(msg: string) {
    return { content: [{ type: 'text' as const, text: msg }] }
  }

  /**
   * 为单次工具调用构建带会话代次守卫的执行上下文：
   * 在此捕获一次 expectedGeneration，避免在多个内部辅助函数间逐层透传代次参数。
   */
  function createInvocationContext(expectedGeneration: number): ActionContext {
    const isStale = () => expectedGeneration !== sessionGeneration

    const withGenerationGuard = async <T,>(
      run: () => T | Promise<T>,
    ): Promise<T | PageAgentToolErrorResult> => {
      if (isStale()) {
        return createSessionResetErrorResult(window.location.href)
      }
      return run()
    }

    const guardedError = async <T,>(
      buildError: () => T | Promise<T>,
    ): Promise<T | PageAgentToolErrorResult> =>
      withGenerationGuard(async () => {
        const result = await buildError()
        getPageAgentToolConfig().removeMaskAfterToolCall && (await pageController.hideMask())
        return result
      })

    const buildBrowserStateResponse = async (
      responseMode: BrowserStateResponseMode = 'diff',
    ): Promise<{ content: Array<{ type: 'text'; text: string }> }> =>
      // 异步操作等待期间若发生了 endTurn() 或 resetSession()，禁止旧续体向新会话分配 ref 或写入 stateCache 基线
      withGenerationGuard(async () => {
        const url = window.location.href
        const title = document.title

        // 生成语义化 ARIA YAML 树 + 刷新活跃 refMap（传入会话级 refAllocator，使存活元素保持稳定 #ref）
        const { yaml, lines, refMap } = buildA11yTree(document.body, {
          ...getPageAgentToolConfig().a11yConfig,
          refAllocator
        })
        currentRefMap = refMap

        // 高亮交互元素，且增加全局移除高亮的监听（读取运行期生效的配置，支持 setPageAgentToolConfig 动态修改）
        if (getPageAgentToolConfig().enableHighlight) {
          highlight(refMap)
          globalRemoveListener()
        }

        // 直接传入预拆分的 lines，避免重复剥离围栏与按行拆分
        const diff = stateCache.update(url, yaml, {
          forceFull: responseMode === 'full',
          lines
        })

        // 检测页面弹窗/遮罩层（确认框、提示框等），让 AI 优先处理
        const dialogs = detectPageDialog()
        // 检测表单校验错误，提醒 AI 优先修复
        const validationErrors = detectValidationErrors()
        // 检测 hover 后可见的 tooltip / 浮层提示（框架 portal 插入 body 的内容）
        const tooltips = detectVisibleTooltips()

        // 根据 responseMode 与熔断结果确定最终 kind 及 content
        let kind: SnapshotKind = diff.kind
        let displayContent = ''
        if (responseMode === 'full') {
          kind = 'full'
          displayContent = yaml
        } else if (responseMode === 'diff') {
          kind = diff.kind
          displayContent = diff.kind === 'full' ? yaml : diff.diffText
        } else if (responseMode === 'both') {
          kind = diff.kind
          displayContent = `【全量页面树】:\n${yaml}\n\n【增量差异】:\n${diff.kind === 'full' ? '（首次/刷新/大幅变化，无增量差异）' : diff.diffText}`
        }

        // 全部字段平铺进 stateObj，直接返回 JSON 便于反序列化（与宿主快照折叠层及 webmcp-cli 对齐）
        const stateObj: BrowserStateSnapshot = {
          kind,
          url,
          title,
          rev: diff.rev,
          ...(diff.kind === 'diff' && kind === 'diff' ? { baseRev: diff.baseRev } : {}),
          content: displayContent,
          ...(dialogs.length > 0 ? { dialogs } : {}),
          ...(validationErrors.length > 0 ? { validationErrors } : {}),
          ...(tooltips.length > 0 ? { tooltips } : {})
        }
        return { content: [{ type: 'text', text: JSON.stringify(stateObj) }] }
      })

    const actionError = (msg: string) =>
      guardedError(() => createActionErrorResult(msg, buildBrowserStateResponse))

    const staleRefError = (actionLabel: string, index: number) =>
      guardedError(() =>
        createStaleRefErrorResult(actionLabel, index, window.location.href, stateCache.getCurrentRev())
      )

    return {
      pageController,
      refAllocator,
      setRefMap: (map: RefMap) => {
        if (isStale()) return
        currentRefMap = map
      },
      buildBrowserStateResponse,
      resolveRefOrError: async (action: RefActionName, index: number) => {
        const el = isStale() ? undefined : currentRefMap.get(index)
        if (el && el.isConnected) {
          return { ok: true, el }
        }
        return {
          ok: false,
          error: await staleRefError(REF_ACTION_LABELS[action], index)
        }
      },
      errContent,
      actionError
    }
  }

  function borderTargetElement(index: number | undefined) {
    if (index === undefined) return
    const el = currentRefMap.get(index)
    if (el) simulatorMask.borderElement(el)
  }

  function showMaskFor(kind: CursorKind) {
    simulatorMask.show({ showCursor: resolveShowCursor(kind) })
  }

  function hideCursorKeepMask() {
    const mode = getPageAgentToolConfig().cursorMode ?? 'actionOnly'
    if (mode === 'always') return
    if (simulatorMask.shown) {
      simulatorMask.show({ showCursor: false })
    }
  }

  function createHandle(): RegisteredPageAgentToolHandle {
    // 每次调用时读取当前共用的遮罩：后续注册替换了遮罩时，本句柄仍作用于页面上正在使用的实例
    const currentMask = () => window.__pageAgentSimulatorMask ?? simulatorMask
    return {
      showMask: async (options?: ShowMaskOptions) => {
        currentMask().show({ showCursor: resolveShowCursor('host', options?.showCursor) })
      },
      hideMask: async () => {
        currentMask().hide()
      },
      resetSession: () => {
        // 与遮罩保持一致：重复注册后旧句柄同样委托给当前生效实例的 resetSession
        ;(window.__pageAgentResetSession ?? resetSession)()
      }
    }
  }

  async function executePageAgentTool(args: PageAgentToolInput) {
    const invocationGeneration = sessionGeneration
    const ctx = createInvocationContext(invocationGeneration)
    try {
      let ret: { content: Array<{ type: 'text'; text: string }> }

      switch (args.action) {
        // ─── 感知/脚本类：仅呼吸灯，无鼠标图标 ──────────────────────────────
        case 'browserState':
          showMaskFor('observe')
          ret = await handleBrowserState(args, ctx)
          getPageAgentToolConfig().removeMaskAfterToolCall && (await pageController.hideMask())
          break
        case 'executeJavascript':
          if (getPageAgentToolConfig().enableExecuteJavascript) {
            showMaskFor('observe')
            ret = await handleExecuteJavascript(args, ctx)
            getPageAgentToolConfig().removeMaskAfterToolCall && (await pageController.hideMask())
          } else {
            ret = { content: [{ type: 'text' as const, text: '当前环境禁用 executeJavascript 工具' }] }
          }
          break
        case 'searchTree':
          showMaskFor('observe')
          ret = await handleSearchTree(args, ctx)
          getPageAgentToolConfig().removeMaskAfterToolCall && (await pageController.hideMask())
          break
        // ─── 滚动类：仅呼吸灯，无静止鼠标图标 ───────────────────────────────
        case 'scroll':
          showMaskFor('observe')
          ret = await handleScroll(args, ctx)
          getPageAgentToolConfig().removeMaskAfterToolCall && (await pageController.hideMask())
          break
        // ─── 精准操作类：呼吸灯 + 鼠标图标 ─────────────────────────────────
        case 'click':
          showMaskFor('pointer')
          borderTargetElement(args.index)
          ret = await handleClick(args, ctx)
          getPageAgentToolConfig().removeMaskAfterToolCall && (await pageController.hideMask())
          break
        case 'fill':
          showMaskFor('pointer')
          borderTargetElement(args.index)
          ret = await handleFill(args, ctx)
          getPageAgentToolConfig().removeMaskAfterToolCall && (await pageController.hideMask())
          break
        case 'select':
          showMaskFor('pointer')
          borderTargetElement(args.index)
          ret = await handleSelect(args, ctx)
          getPageAgentToolConfig().removeMaskAfterToolCall && (await pageController.hideMask())
          break
        case 'hover':
          showMaskFor('pointer')
          borderTargetElement(args.index)
          const el = args.index !== undefined ? currentRefMap.get(args.index) : undefined
          if (el) {
            const rect = el.getBoundingClientRect()
            simulatorMask.setCursorPosition(rect.left + rect.width / 2, rect.top + rect.height / 2)
          }
          ret = await handleHover(args, ctx)
          getPageAgentToolConfig().removeMaskAfterToolCall && (await pageController.hideMask())
          break
        case 'clipboard':
          ret = await handleClipboard(args, ctx)
          break
        default:
          ret = { content: [{ type: 'text' as const, text: `未知操作: ${args.action}` }] }
      }
      return ret
    } catch (error) {
      // 仅对指针/输入类 DOM 交互异常包装为带最新整页状态的错误返回；
      // scroll（可在无 index 时滚动窗口）与只读/脚本类动作保持原样抛错以兼容既有调用约定
      if (
        args.action === 'click' ||
        args.action === 'fill' ||
        args.action === 'select' ||
        args.action === 'hover'
      ) {
        return ctx.actionError(
          `${REF_ACTION_LABELS[args.action]}执行异常: ${error instanceof Error ? error.message : String(error)}`
        )
      }
      getPageAgentToolConfig().removeMaskAfterToolCall && (await pageController.hideMask())
      throw error
    } finally {
      simulatorMask.removeBorderElement()
      hideCursorKeepMask()
    }
  }

  // ─── 工具注册（名称与 inputSchema 与原版完全一致）────────────────────────
  // replace 语义：重复调用前先注销同名工具（polyfill 对重复 register 会抛错）
  const modelContext = (document as any).modelContext
  if (!modelContext) {
    console.warn('[next-sdk] modelContext is not available, skipping page-agent-tool registration.')
    return createHandle()
  }
  // Chrome 146+ 原生 registerTool 在非 origin-keyed 文档上 reject SecurityError DOMException；
  // 强制 polyfill 后若仍读到 native，禁止调用，避免注册失败或杀渲染进程。
  if (!isBuiltinWebMCPPolyfill(modelContext)) {
    console.warn(
      '[next-sdk] page-agent-tool 跳过原生 modelContext.registerTool（Chrome 146+ 可能抛出 DOMException）'
    )
    return createHandle()
  }
  try {
    if ((window as any).__pageAgentToolAbortController) {
      ;(window as any).__pageAgentToolAbortController.abort()
    }
  } catch {
    // 首次注册或不存在时忽略
  }

  const abortController = new AbortController()
  ;(window as any).__pageAgentToolAbortController = abortController
  // 注销旧实例后才更新全局 resetSession 指针，避免提前返回（如跳过原生 modelContext）覆盖仍在运行的旧实例
  window.__pageAgentResetSession = resetSession

  const executeJavascriptPrompt = getPageAgentToolConfig().enableExecuteJavascript
    ? ''
    : '\n 当前环境已经禁用 executeJavascript 工具，请勿使用它。\n'

  // 5.x registerTool 返回 Promise；校验失败不能变成未处理 rejection
  void Promise.resolve(
    modelContext.registerTool(
      {
        name: 'page-agent-tool',
        description: pageAgentPrompt + executeJavascriptPrompt,
        // @ts-ignore
        inputSchema: zodToJsonSchema(inputSchema) as any,
        async execute(args: PageAgentToolInput) {
          try {
            return await executePageAgentTool(args)
          } catch (error) {
            return { content: [{ type: 'text' as const, text: `异常: ${String(error)}` }] }
          }
        }
      },
      { signal: abortController.signal }
    )
  ).catch((err: unknown) => {
    const detail =
      err instanceof DOMException
        ? `${err.name}${err.message ? `: ${err.message}` : ''} (DOMException)`
        : err instanceof Error
          ? `${err.name}: ${err.message}`
          : String(err)
    console.warn('[next-sdk] page-agent-tool 注册失败:', detail, err)
  })

  setupPageAgentToolEventBridge(executePageAgentTool, pageController, {
    getRefMap: () => currentRefMap,
    endTurn
  })

  return createHandle()
}
