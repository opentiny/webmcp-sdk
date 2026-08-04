/**
 * Recorder WebMCP 工具存储（独立 key）
 */

import { storage } from '@wxt-dev/storage'
import { validateMatchPatterns } from '../user-mcp-scripts/match'
import { createDefaultRecorderToolMeta } from './template'
import type {
  RecorderStep,
  RecorderWebmcpStore,
  RecorderWebmcpTool,
  RecorderWebmcpToolInput
} from './types'
import { RECORDER_WEBMCP_KEY } from './types'

let storeWriteChain: Promise<unknown> = Promise.resolve()

function withStoreLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = storeWriteChain.then(fn, fn)
  storeWriteChain = run.then(
    () => undefined,
    () => undefined
  )
  return run
}

function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `rwm_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

const STEP_OPS = new Set(['setViewport', 'goto', 'click', 'hover', 'scroll', 'type', 'fill'])

function normalizeSteps(raw: unknown): RecorderStep[] | null {
  if (!Array.isArray(raw)) return null
  const out: RecorderStep[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object' || !('op' in item)) return null
    const op = String((item as { op: string }).op)
    if (!STEP_OPS.has(op)) return null
    out.push(item as RecorderStep)
  }
  return out
}

function normalizeTool(raw: Partial<RecorderWebmcpTool> & { id: string }): RecorderWebmcpTool | null {
  if (!raw.id || typeof raw.name !== 'string') return null
  if (!Array.isArray(raw.matches)) return null
  const steps = normalizeSteps(raw.steps)
  if (!steps) return null
  const inputSchema =
    raw.inputSchema && typeof raw.inputSchema === 'object' && !Array.isArray(raw.inputSchema)
      ? (raw.inputSchema as Record<string, unknown>)
      : { type: 'object', properties: {}, additionalProperties: false }

  return {
    id: raw.id,
    name: raw.name,
    title: typeof raw.title === 'string' && raw.title ? raw.title : raw.name,
    description: typeof raw.description === 'string' ? raw.description : '',
    matches: raw.matches.map(String),
    enabled: raw.enabled !== false,
    inputSchema,
    steps,
    sourceBackup: typeof raw.sourceBackup === 'string' ? raw.sourceBackup : undefined,
    updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : Date.now()
  }
}

export async function getRecorderWebmcpStore(): Promise<RecorderWebmcpStore> {
  try {
    const data = (await storage.getItem(RECORDER_WEBMCP_KEY)) as RecorderWebmcpStore | undefined
    if (!data || typeof data !== 'object') return {}
    const out: RecorderWebmcpStore = {}
    for (const [id, value] of Object.entries(data)) {
      const normalized = normalizeTool({ ...value, id: value?.id || id })
      if (normalized) out[normalized.id] = normalized
    }
    return out
  } catch {
    return {}
  }
}

export async function setRecorderWebmcpStore(store: RecorderWebmcpStore): Promise<void> {
  await storage.setItem(RECORDER_WEBMCP_KEY, store)
}

export async function listRecorderWebmcpTools(): Promise<RecorderWebmcpTool[]> {
  const store = await getRecorderWebmcpStore()
  return Object.values(store).sort(
    (a, b) => b.updatedAt - a.updatedAt || a.name.localeCompare(b.name)
  )
}

export type UpsertResult =
  | { ok: true; tool: RecorderWebmcpTool }
  | { ok: false; error: string }

export async function upsertRecorderWebmcpTool(input: RecorderWebmcpToolInput): Promise<UpsertResult> {
  return withStoreLock(async () => {
    const matchCheck = validateMatchPatterns(input.matches || [])
    if (!matchCheck.ok) return matchCheck

    const name = (input.name || '').trim()
    if (!name) return { ok: false, error: '工具名不能为空' }
    if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(name)) {
      return { ok: false, error: '工具名须以字母开头，仅含字母数字下划线与连字符' }
    }

    const steps = normalizeSteps(input.steps)
    if (!steps || steps.length === 0) {
      return { ok: false, error: 'steps 不能为空且须为合法步骤数组' }
    }

    const store = await getRecorderWebmcpStore()
    // 禁止同名不同 id
    const dup = Object.values(store).find((t) => t.name === name && t.id !== input.id)
    if (dup) return { ok: false, error: `工具名已存在: ${name}` }

    const id = input.id || newId()
    const tool: RecorderWebmcpTool = {
      id,
      name,
      title: (input.title || name).trim(),
      description: (input.description || '').trim(),
      matches: input.matches.map((m) => m.trim()).filter(Boolean),
      enabled: input.enabled !== false,
      inputSchema:
        input.inputSchema && typeof input.inputSchema === 'object'
          ? input.inputSchema
          : { type: 'object', properties: {}, additionalProperties: false },
      steps,
      sourceBackup: input.sourceBackup,
      updatedAt: Date.now()
    }
    store[id] = tool
    await setRecorderWebmcpStore(store)
    return { ok: true, tool }
  })
}

export async function removeRecorderWebmcpTool(id: string): Promise<void> {
  return withStoreLock(async () => {
    const store = await getRecorderWebmcpStore()
    delete store[id]
    await setRecorderWebmcpStore(store)
  })
}

export async function setRecorderWebmcpToolEnabled(
  id: string,
  enabled: boolean
): Promise<UpsertResult> {
  return withStoreLock(async () => {
    const store = await getRecorderWebmcpStore()
    const existing = store[id]
    if (!existing) return { ok: false, error: '工具不存在' }
    const tool = { ...existing, enabled }
    store[id] = tool
    await setRecorderWebmcpStore(store)
    return { ok: true, tool }
  })
}

export async function createRecorderWebmcpToolFromTemplate(partial?: {
  name?: string
  title?: string
  description?: string
  matches?: string[]
}): Promise<UpsertResult> {
  return upsertRecorderWebmcpTool(createDefaultRecorderToolMeta(partial))
}

export function exportRecorderWebmcpToolsJson(tools: RecorderWebmcpTool[]): string {
  return JSON.stringify(tools, null, 2)
}

export async function importRecorderWebmcpToolsJson(json: string): Promise<
  | { ok: true; imported: number; skipped: number }
  | { ok: false; error: string }
> {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    return { ok: false, error: 'JSON 解析失败' }
  }
  const list = Array.isArray(parsed) ? parsed : (parsed as { tools?: unknown })?.tools
  if (!Array.isArray(list)) {
    return { ok: false, error: 'JSON 应为工具数组，或含 tools 字段的对象' }
  }

  return withStoreLock(async () => {
    const store = await getRecorderWebmcpStore()
    let imported = 0
    let skipped = 0
    for (const item of list) {
      if (!item || typeof item !== 'object') {
        skipped++
        continue
      }
      const id = typeof (item as any).id === 'string' && (item as any).id ? (item as any).id : newId()
      const candidate = normalizeTool({ ...(item as any), id })
      if (!candidate) {
        skipped++
        continue
      }
      const matchCheck = validateMatchPatterns(candidate.matches)
      if (!matchCheck.ok) {
        skipped++
        continue
      }
      // 导入默认禁用
      store[id] = { ...candidate, enabled: false, updatedAt: Date.now() }
      imported++
    }
    await setRecorderWebmcpStore(store)
    return { ok: true, imported, skipped }
  })
}
