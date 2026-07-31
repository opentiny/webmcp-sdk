/**
 * 用户 MCP 脚本 ↔ mcp-servers 目录格式（zip）打包
 *
 * 与源码内置结构对齐：
 *   <folder>/index.ts
 *   <folder>/meta.ts   // export default { name, description, ... }
 *
 * 行为对齐 Skills：导出 zip 解压即文件夹；导入 zip 写回 storage。
 */

import JSZip from 'jszip'
import type { UserMcpScript } from './types'

export type PackMeta = {
  name: string
  description?: string
  matches?: string[]
  enabled?: boolean
  replacesBuiltIn?: boolean
  id?: string
}

export type PackedScriptEntry = {
  folder: string
  source: string
  meta: PackMeta
}

/** 从 @match 提取可用作目录名的 host 提示 */
export function hostHintFromMatch(pattern: string): string | null {
  const p = (pattern || '').trim()
  if (!p) return null
  // *://www.baidu.com/*  |  https://excalidraw.com/foo  |  *://*.example.com/*
  const m = p.match(/^(?:\*|https?):\/{0,2}([^/]+)/i)
  if (!m) return null
  let host = m[1]
  // 去掉端口（目录名不含端口）
  host = host.replace(/:\d+$/, '')
  if (host.startsWith('*.')) host = host.slice(2)
  if (!host || host.includes('*') || host.includes(':')) return null
  return host
}

export function sanitizeFolderName(raw: string): string {
  const s = (raw || '')
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
  return s || 'script'
}

/**
 * 为脚本分配唯一目录名（优先 match host，其次 name）
 */
export function folderNameForScript(script: UserMcpScript, used: Set<string>): string {
  const fromMatch = script.matches?.map(hostHintFromMatch).find(Boolean)
  const base = sanitizeFolderName(fromMatch || script.name || script.id)
  let name = base
  let n = 2
  while (used.has(name)) {
    name = `${base}-${n++}`
  }
  used.add(name)
  return name
}

/** 生成与 mcp-servers 一致的 meta.ts 文本 */
export function serializeMetaTs(meta: PackMeta): string {
  const body: Record<string, unknown> = {
    name: meta.name
  }
  if (meta.description) body.description = meta.description
  if (meta.matches?.length) body.matches = meta.matches
  if (typeof meta.enabled === 'boolean') body.enabled = meta.enabled
  if (typeof meta.replacesBuiltIn === 'boolean') body.replacesBuiltIn = meta.replacesBuiltIn
  if (meta.id) body.id = meta.id
  return `export default ${JSON.stringify(body, null, 2)}\n`
}

/**
 * 解析 meta.ts / meta.js（export default { ... }）或纯 JSON
 */
export function parseMetaModule(content: string): PackMeta | null {
  const trimmed = (content || '').trim()
  if (!trimmed) return null

  const tryObject = (raw: string): PackMeta | null => {
    try {
      const value = new Function(`"use strict"; return (${raw});`)()
      if (!value || typeof value !== 'object' || Array.isArray(value)) return null
      const name = typeof value.name === 'string' ? value.name : undefined
      if (!name) return null
      return {
        name,
        description: typeof value.description === 'string' ? value.description : undefined,
        matches: Array.isArray(value.matches) ? value.matches.map(String) : undefined,
        enabled: typeof value.enabled === 'boolean' ? value.enabled : undefined,
        replacesBuiltIn:
          typeof value.replacesBuiltIn === 'boolean' ? value.replacesBuiltIn : undefined,
        id: typeof value.id === 'string' ? value.id : undefined
      }
    } catch {
      return null
    }
  }

  if (trimmed.startsWith('{')) {
    try {
      const obj = JSON.parse(trimmed)
      if (!obj || typeof obj !== 'object' || Array.isArray(obj) || typeof obj.name !== 'string') {
        return null
      }
      return {
        name: obj.name,
        description: typeof obj.description === 'string' ? obj.description : undefined,
        matches: Array.isArray(obj.matches) ? obj.matches.map(String) : undefined,
        enabled: typeof obj.enabled === 'boolean' ? obj.enabled : undefined,
        replacesBuiltIn:
          typeof obj.replacesBuiltIn === 'boolean' ? obj.replacesBuiltIn : undefined,
        id: typeof obj.id === 'string' ? obj.id : undefined
      }
    } catch {
      return tryObject(trimmed)
    }
  }

  const m = trimmed.match(/export\s+default\s+([\s\S]+?)\s*;?\s*$/)
  if (m) return tryObject(m[1])
  return null
}

function normalizeZipEntryPath(zipPath: string): string | null {
  let p = zipPath.replace(/\\/g, '/')
  if (p.includes('..') || p.startsWith('/')) return null
  p = p.replace(/^\.\//, '')
  // 允许用户直接压缩整个 mcp-servers 目录
  if (p.startsWith('mcp-servers/')) p = p.slice('mcp-servers/'.length)
  if (!p || p === 'index.ts' || p === 'types.d.ts' || p.endsWith('/')) return null
  return p
}

/**
 * 将脚本列表打包为 mcp-servers 目录结构的 zip Blob
 */
export async function exportUserMcpScriptsZip(scripts: UserMcpScript[]): Promise<Blob> {
  const zip = new JSZip()
  const used = new Set<string>()
  for (const script of scripts) {
    const folder = folderNameForScript(script, used)
    zip.file(
      `${folder}/meta.ts`,
      serializeMetaTs({
        name: script.name,
        description: script.description,
        matches: script.matches,
        enabled: script.enabled,
        replacesBuiltIn: script.replacesBuiltIn,
        id: script.id
      })
    )
    zip.file(`${folder}/index.ts`, script.source)
  }
  return zip.generateAsync({ type: 'blob' })
}

/**
 * 从 zip 解析出 mcp-servers 风格条目（不写 storage）
 */
export async function parseUserMcpScriptsZip(
  data: ArrayBuffer | Blob | Uint8Array
): Promise<{ ok: true; entries: PackedScriptEntry[] } | { ok: false; error: string }> {
  let loaded: JSZip
  try {
    loaded = await JSZip.loadAsync(data)
  } catch {
    return { ok: false, error: '无法读取 zip 文件' }
  }

  const byFolder = new Map<string, { meta?: string; index?: string }>()
  const fileEntries = Object.entries(loaded.files).filter(([, z]) => !z.dir)

  for (const [zipPath, zipObj] of fileEntries) {
    const normalized = normalizeZipEntryPath(zipPath)
    if (!normalized) continue
    const parts = normalized.split('/')
    if (parts.length !== 2) continue
    const [folder, file] = parts
    if (!folder || !file) continue
    const lower = file.toLowerCase()
    const bucket = byFolder.get(folder) || {}
    if (lower === 'meta.ts' || lower === 'meta.js' || lower === 'meta.json') {
      bucket.meta = await zipObj.async('string')
    } else if (lower === 'index.ts' || lower === 'index.js') {
      bucket.index = await zipObj.async('string')
    }
    byFolder.set(folder, bucket)
  }

  const entries: PackedScriptEntry[] = []
  for (const [folder, files] of byFolder) {
    if (files.index == null || !(files.index || '').trim()) continue
    let meta: PackMeta | null = files.meta ? parseMetaModule(files.meta) : null
    if (!meta) {
      // 内置 mcp-servers 风格：仅有 index，用目录名补全
      meta = { name: folder, description: undefined }
    }
    if (!meta.matches?.length) {
      meta = {
        ...meta,
        matches: [`*://${folder}/*`]
      }
    }
    entries.push({ folder, source: files.index, meta })
  }

  if (!entries.length) {
    return { ok: false, error: '压缩包中未找到合法的 mcp-servers 目录（需含 */index.ts 与可选 meta.ts）' }
  }
  return { ok: true, entries }
}
