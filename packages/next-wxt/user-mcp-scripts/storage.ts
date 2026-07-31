/**
 * 用户 MCP 脚本存储（独立于 skills-overrides）
 */

import { storage } from '@wxt-dev/storage'
import { validateMatchPatterns } from './match'
import { createDefaultScriptMeta } from './template'
import { parseUserMcpScriptsZip } from './pack'
import type { UserMcpScript, UserMcpScriptInput, UserMcpScriptsStore } from './types'
import { USER_MCP_SCRIPTS_KEY } from './types'

/** 串行化读改写，避免并发丢更新 */
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
  return `ums_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

function normalizeScript(raw: Partial<UserMcpScript> & { id: string }): UserMcpScript | null {
  if (!raw.id || typeof raw.name !== 'string' || typeof raw.source !== 'string') return null
  if (!Array.isArray(raw.matches)) return null
  return {
    id: raw.id,
    name: raw.name,
    description: typeof raw.description === 'string' ? raw.description : undefined,
    matches: raw.matches.map(String),
    enabled: raw.enabled !== false,
    replacesBuiltIn: Boolean(raw.replacesBuiltIn),
    source: raw.source,
    updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : Date.now()
  }
}

export async function getUserMcpScriptsStore(): Promise<UserMcpScriptsStore> {
  try {
    const data = (await storage.getItem(USER_MCP_SCRIPTS_KEY)) as UserMcpScriptsStore | undefined
    if (!data || typeof data !== 'object') return {}
    const out: UserMcpScriptsStore = {}
    for (const [id, value] of Object.entries(data)) {
      const normalized = normalizeScript({ ...value, id: value?.id || id })
      if (normalized) out[normalized.id] = normalized
    }
    return out
  } catch {
    return {}
  }
}

export async function setUserMcpScriptsStore(store: UserMcpScriptsStore): Promise<void> {
  await storage.setItem(USER_MCP_SCRIPTS_KEY, store)
}

export async function listUserMcpScripts(): Promise<UserMcpScript[]> {
  const store = await getUserMcpScriptsStore()
  return Object.values(store).sort(
    (a, b) => b.updatedAt - a.updatedAt || a.name.localeCompare(b.name)
  )
}

export type UpsertResult =
  | { ok: true; script: UserMcpScript }
  | { ok: false; error: string }

/**
 * 新建或更新脚本；校验 @match
 */
export async function upsertUserMcpScript(input: UserMcpScriptInput): Promise<UpsertResult> {
  return withStoreLock(async () => {
    const matchCheck = validateMatchPatterns(input.matches || [])
    if (!matchCheck.ok) return matchCheck

    const name = (input.name || '').trim()
    if (!name) return { ok: false, error: '名称不能为空' }
    if (!(input.source || '').trim()) return { ok: false, error: '脚本源码不能为空' }

    const store = await getUserMcpScriptsStore()
    const id = input.id || newId()
    const script: UserMcpScript = {
      id,
      name,
      description: input.description?.trim() || undefined,
      matches: input.matches.map((m) => m.trim()).filter(Boolean),
      enabled: input.enabled !== false,
      replacesBuiltIn: Boolean(input.replacesBuiltIn),
      source: input.source,
      updatedAt: Date.now()
    }
    store[id] = script
    await setUserMcpScriptsStore(store)
    return { ok: true, script }
  })
}

export async function removeUserMcpScript(id: string): Promise<void> {
  return withStoreLock(async () => {
    const store = await getUserMcpScriptsStore()
    delete store[id]
    await setUserMcpScriptsStore(store)
  })
}

/**
 * 仅切换启用状态，不更新 updatedAt，避免侧栏排序跳动
 */
export async function setUserMcpScriptEnabled(id: string, enabled: boolean): Promise<UpsertResult> {
  return withStoreLock(async () => {
    const store = await getUserMcpScriptsStore()
    const existing = store[id]
    if (!existing) return { ok: false, error: '脚本不存在' }
    const script = { ...existing, enabled }
    store[id] = script
    await setUserMcpScriptsStore(store)
    return { ok: true, script }
  })
}

/**
 * 用默认模板创建一条脚本
 */
export async function createUserMcpScriptFromTemplate(partial?: {
  name?: string
  description?: string
  matches?: string[]
}): Promise<UpsertResult> {
  const meta = createDefaultScriptMeta(partial)
  return upsertUserMcpScript(meta)
}

/**
 * 导出为可分享的 JSON 数组（不含内部无关字段）
 */
export function exportUserMcpScriptsJson(scripts: UserMcpScript[]): string {
  const payload = scripts.map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    matches: s.matches,
    enabled: s.enabled,
    replacesBuiltIn: s.replacesBuiltIn,
    source: s.source,
    updatedAt: s.updatedAt
  }))
  return JSON.stringify(payload, null, 2)
}

/**
 * 从 JSON 导入（合并到现有 store；同 id 覆盖）。
 * 导入项一律先禁用，需用户审阅后手动启用。
 * @deprecated 主路径已改为 mcp-servers 目录 zip；保留以兼容旧备份。
 */
export async function importUserMcpScriptsJson(json: string): Promise<
  | { ok: true; imported: number; skipped: number }
  | { ok: false; error: string }
> {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    return { ok: false, error: 'JSON 解析失败' }
  }
  const list = Array.isArray(parsed) ? parsed : (parsed as any)?.scripts
  if (!Array.isArray(list)) {
    return { ok: false, error: 'JSON 应为脚本数组，或含 scripts 字段的对象' }
  }

  return withStoreLock(async () => {
    const store = await getUserMcpScriptsStore()
    let imported = 0
    let skipped = 0
    for (const item of list) {
      if (!item || typeof item !== 'object') {
        skipped++
        continue
      }
      const id = typeof item.id === 'string' && item.id ? item.id : newId()
      const candidate = normalizeScript({ ...item, id })
      if (!candidate) {
        skipped++
        continue
      }
      const matchCheck = validateMatchPatterns(candidate.matches)
      if (!matchCheck.ok) {
        skipped++
        continue
      }
      store[id] = { ...candidate, enabled: false, updatedAt: Date.now() }
      imported++
    }
    await setUserMcpScriptsStore(store)
    return { ok: true, imported, skipped }
  })
}

/**
 * 从 mcp-servers 风格 zip 导入（合并；同 id 覆盖）。
 * 导入项一律先禁用。缺 matches 时按目录名生成 `*://<folder>/*`。
 */
export async function importUserMcpScriptsZip(
  data: ArrayBuffer | Blob | Uint8Array
): Promise<{ ok: true; imported: number; skipped: number } | { ok: false; error: string }> {
  const parsed = await parseUserMcpScriptsZip(data)
  if (!parsed.ok) return parsed

  return withStoreLock(async () => {
    const store = await getUserMcpScriptsStore()
    let imported = 0
    let skipped = 0
    for (const entry of parsed.entries) {
      const id =
        (typeof entry.meta.id === 'string' && entry.meta.id) ||
        `ums_${entry.folder.replace(/[^a-zA-Z0-9._-]/g, '_')}`
      const matches = entry.meta.matches?.length ? entry.meta.matches : [`*://${entry.folder}/*`]
      const matchCheck = validateMatchPatterns(matches)
      if (!matchCheck.ok) {
        skipped++
        continue
      }
      const name = (entry.meta.name || entry.folder).trim()
      if (!name || !(entry.source || '').trim()) {
        skipped++
        continue
      }
      store[id] = {
        id,
        name,
        description: entry.meta.description,
        matches,
        enabled: false,
        replacesBuiltIn: Boolean(entry.meta.replacesBuiltIn),
        source: entry.source,
        updatedAt: Date.now()
      }
      imported++
    }
    await setUserMcpScriptsStore(store)
    return { ok: true, imported, skipped }
  })
}
