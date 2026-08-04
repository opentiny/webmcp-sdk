/**
 * Recorder WebMCP 默认工具模板
 */

import type { RecorderWebmcpToolInput } from './types'

export function createDefaultRecorderToolMeta(partial?: {
  name?: string
  title?: string
  description?: string
  matches?: string[]
}): RecorderWebmcpToolInput {
  const title = partial?.title?.trim() || partial?.name?.trim() || 'Recorder 示例自动化'
  const asciiSlug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 40)
  const toolName =
    partial?.name?.trim() ||
    (asciiSlug ? `recorder_${asciiSlug}` : `recorder_tool_${Math.random().toString(36).slice(2, 8)}`)

  return {
    name: toolName.startsWith('recorder_') ? toolName : `recorder_${toolName}`,
    title,
    description:
      partial?.description ??
      '由 Options「Recorder 自动化」管理的示例工具：打开匹配站点首页（可按需改 steps）。',
    matches: partial?.matches?.length ? partial.matches : ['*://example.com/*'],
    enabled: true,
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false
    },
    steps: [
      {
        op: 'goto',
        url: 'https://example.com/'
      }
    ]
  }
}
