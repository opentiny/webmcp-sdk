/**
 * 根据 URL 解析应注入的用户脚本、是否跳过内置
 */

import { matchAny } from './match'
import type { UserMcpScript, UserMcpScriptsStore } from './types'

/**
 * 返回 enabled 且 @match 命中 url 的脚本（按 name 排序，稳定）
 */
export function resolveMatchingScripts(
  store: UserMcpScriptsStore,
  url: string
): UserMcpScript[] {
  return Object.values(store)
    .filter((s) => s.enabled && Array.isArray(s.matches) && matchAny(s.matches, url))
    .sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id))
}

/**
 * 任一匹配且启用的脚本声明 replacesBuiltIn → 跳过内置 mcp-servers
 */
export function shouldSkipBuiltIn(store: UserMcpScriptsStore, url: string): boolean {
  return resolveMatchingScripts(store, url).some((s) => s.replacesBuiltIn)
}
