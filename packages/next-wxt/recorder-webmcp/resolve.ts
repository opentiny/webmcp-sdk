/**
 * 按 URL 解析应在侧栏注册的 Recorder 工具
 */

import { matchAny } from '../user-mcp-scripts/match'
import type { RecorderWebmcpStore, RecorderWebmcpTool } from './types'

/**
 * 返回 enabled 且 @match 命中 url 的工具（按 name 稳定排序）
 */
export function resolveMatchingRecorderTools(
  store: RecorderWebmcpStore,
  url: string
): RecorderWebmcpTool[] {
  return Object.values(store)
    .filter((t) => t.enabled && Array.isArray(t.matches) && matchAny(t.matches, url))
    .sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id))
}
