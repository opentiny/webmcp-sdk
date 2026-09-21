/**
 * MCP 工具 Schema 定义（统一层）
 *
 * 工具名称与描述在 CDP 和 WXT 两种模式下保持一致。
 * 底层实现由 bin.ts 根据 --mode 路由到对应 adapter。
 */

import { z } from 'zod'

// ─── 通用工具（两种模式均支持） ──────────────────────────────────────────────

export const BrowserStateInput = z.object({
  tabId: z.union([z.string(), z.number()]).optional().describe(
    '目标 tab ID。CDP 模式为 target UUID 字符串；WXT 模式为 Chrome tab ID 数值。不传时使用当前活跃 tab。'
  )
})

export const BrowserToolCallInput = z.object({
  toolName: z
    .string()
    .describe('页面 WebMCP 工具名称（可从 browser_state 返回的 webmcpTools 列表中获取）'),
  toolArgs: z.record(z.unknown()).optional().describe('工具参数，与工具的 inputSchema 对齐'),
  tabId: z.union([z.string(), z.number()]).optional().describe('目标 tab ID，不传时使用当前活跃 tab')
})

export const BrowserTabsOpenInput = z.object({
  url: z
    .string()
    .url()
    .refine((val) => /^https?:\/\//i.test(val), { message: '只允许打开 http 或 https 协议的 URL' })
    .describe('要打开的 URL（仅支持 http/https 协议）')
})

export const BrowserTabsCloseInput = z.object({
  tabId: z.union([z.string(), z.number()]).optional().describe(
    '要关闭的 tab ID，不传时关闭当前活跃 tab'
  )
})

export const BrowserTabsSwitchInput = z.object({
  tabId: z.union([z.string(), z.number()]).describe(
    '要切换到的 tab ID（可从 browser_state 返回的 tabs 列表中获取）'
  ),
  activateVisible: z
    .boolean()
    .optional()
    .describe('是否在前台显式切换 Chrome 可见活动标签（仅 WXT 模式有效，默认 false）')
})

export const BrowserTabsNavInput = z.object({
  tabId: z.union([z.string(), z.number()]).optional().describe('目标 tab ID，不传时使用当前活跃 tab')
})

// ─── WXT 专属工具 ──────────────────────────────────────────────────────────

export const BrowserSubAgentRunInput = z.object({
  instruction: z.string().describe('要委托给 Tiny Robot 子代理执行的高层自然语言任务指令'),
  tabId: z.number().optional().describe('目标 tab ID，不传时使用当前活跃 tab'),
  maxSteps: z.number().min(1).max(20).optional().describe('最大自主规划执行步数（默认 8，最大 20）')
})

export const BrowserSkillsListInput = z.object({}).describe('获取当前浏览器扩展中已注册的所有 Skills 技能元数据列表')

export const BrowserSkillsReadInput = z.object({
  name: z.string().describe('要读取的技能名称（可从 browser_skills_list 返回的列表中获取）')
})
