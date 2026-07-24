import { INSPECT_REF_PREFIX, type InspectRef } from './types'

/**
 * 格式化剪贴板引用：
 * webmcp-inspect:v1 tab=<TAB_ID> el=<ELEMENT_ID>
 */
export function formatInspectRef(tabId: string, elementId: string): string {
  return `${INSPECT_REF_PREFIX} tab=${tabId} el=${elementId}`
}

/** 从文本中解析检视引用；失败返回 null */
export function parseInspectRef(text: string): InspectRef | null {
  if (!text) return null
  const match = text.match(
    /webmcp-inspect:v1\s+tab=([^\s]+)\s+el=([^\s]+)/
  )
  if (!match) return null
  return {
    version: 1,
    tabId: match[1],
    elementId: match[2],
  }
}
