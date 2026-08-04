/**
 * Recorder WebMCP：侧栏注册与扩展侧 puppeteer 执行（不进 MAIN world）
 */

import {
  getRecorderWebmcpStore,
  resolveMatchingRecorderTools,
  upsertRecorderWebmcpTool,
  type RecorderWebmcpTool,
  type RecorderWebmcpToolInput
} from '@/recorder-webmcp'
import { runRecorderSteps } from '@/recorder-webmcp/runtime'

type NativeModelContext = {
  registerTool: (def: {
    name: string
    title?: string
    description?: string
    inputSchema?: object
    execute: (args: any) => Promise<any>
  }) => void
  unregisterTool?: (name: string) => void
}

const SAVE_TOOL_NAME = 'recorder_webmcp_save'

/** 由 mcpServer 注入，避免循环依赖；用于 save 后刷新（同页收不到 runtime 消息） */
let externalRefresh: (() => Promise<void>) | null = null

export function setRecorderWebmcpRefresh(fn: () => Promise<void>) {
  externalRefresh = fn
}

/** 当前已注册的、按页面 match 的工具名（不含 save） */
const registeredByMatch = new Set<string>()

function clearMatchedTools(nativeCtx: NativeModelContext) {
  for (const name of registeredByMatch) {
    try {
      nativeCtx.unregisterTool?.(name)
    } catch {
      // ignore
    }
  }
  registeredByMatch.clear()
}

function toToolDef(tool: RecorderWebmcpTool, boundTabId: number) {
  return {
    name: tool.name,
    title: tool.title,
    description: tool.description,
    inputSchema: tool.inputSchema,
    execute: async (args: Record<string, unknown> = {}) => {
      try {
        const { getSnapshotManager } = await import('./utils/snapshotManager')
        const { manager } = await getSnapshotManager(boundTabId)
        const page = manager.getPage()
        if (!page) {
          return { content: [{ type: 'text', text: 'Error: 无法连接页面（puppeteer Page 为空）' }] }
        }
        const result = await runRecorderSteps(page, tool.steps, args || {})
        if (!result.ok) {
          return {
            content: [
              {
                type: 'text',
                text: `执行失败（已完成 ${result.completed}/${tool.steps.length} 步）: ${result.error}`
              }
            ]
          }
        }
        return {
          content: [
            {
              type: 'text',
              text: `已成功执行工具 ${tool.name}（${result.completed} 步）`
            }
          ]
        }
      } catch (err: any) {
        return {
          content: [{ type: 'text', text: `Error: ${err?.message || String(err)}` }]
        }
      }
    }
  }
}

/**
 * 落盘工具：供 Skill / Agent 写入结构化 Recorder 工具（始终注册，不按 match 隐藏）
 */
export const recorderWebmcpSaveTool = {
  name: SAVE_TOOL_NAME,
  title: '保存 Recorder WebMCP 工具',
  description:
    '将 Chrome Recorder（Puppeteer）转化后的结构化工具写入扩展存储。参数 tool 为完整工具对象（name/title/description/matches/inputSchema/steps，可选 sourceBackup/enabled/id）。保存后按当前激活页重新同步工具列表。',
  inputSchema: {
    type: 'object',
    properties: {
      tool: {
        type: 'object',
        description:
          'RecorderWebmcpTool 定义：name（建议 recorder_ 前缀）、title、description、matches、inputSchema、steps；可选 id、enabled、sourceBackup'
      }
    },
    required: ['tool']
  },
  execute: async ({ tool }: { tool: RecorderWebmcpToolInput }) => {
    if (!tool || typeof tool !== 'object') {
      return { content: [{ type: 'text', text: 'Error: 缺少 tool 对象' }] }
    }
    const result = await upsertRecorderWebmcpTool({
      ...tool,
      enabled: tool.enabled !== false
    })
    if (!result.ok) {
      return { content: [{ type: 'text', text: `保存失败: ${result.error}` }] }
    }
    try {
      await browser.runtime.sendMessage({ type: 'recorder-webmcp-updated' })
    } catch {
      // ignore
    }
    try {
      await externalRefresh?.()
    } catch {
      // ignore
    }
    return {
      content: [
        {
          type: 'text',
          text: `已保存 Recorder 工具「${result.tool.name}」(id=${result.tool.id})。请确认当前页 URL 命中 @match 后即可在工具列表中看到。`
        }
      ]
    }
  }
}

/**
 * 初始化：注册 save 工具；返回按 tab 同步 match 工具的方法
 */
export function useRecorderWebmcpTools(nativeCtx: NativeModelContext) {
  nativeCtx.registerTool(recorderWebmcpSaveTool)

  const syncRecorderToolsForTab = async (tabId: number) => {
    clearMatchedTools(nativeCtx)

    let url = ''
    try {
      const tab = await browser.tabs.get(tabId)
      url = tab.url || ''
    } catch {
      return
    }

    if (
      !url ||
      url.startsWith('chrome://') ||
      url.startsWith('edge://') ||
      url.startsWith('about:')
    ) {
      return
    }

    const store = await getRecorderWebmcpStore()
    const matched = resolveMatchingRecorderTools(store, url)

    for (const tool of matched) {
      if (tool.name === SAVE_TOOL_NAME) continue
      if (registeredByMatch.has(tool.name)) continue
      nativeCtx.registerTool(toToolDef(tool, tabId))
      registeredByMatch.add(tool.name)
    }
  }

  return { syncRecorderToolsForTab }
}
