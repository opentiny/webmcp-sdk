import { describe, expect, it } from 'vitest'
import { resolveMatchingRecorderTools } from '../../recorder-webmcp/resolve'
import type { RecorderWebmcpStore, RecorderWebmcpTool } from '../../recorder-webmcp/types'

function tool(
  partial: Partial<RecorderWebmcpTool> & Pick<RecorderWebmcpTool, 'id' | 'name' | 'matches'>
): RecorderWebmcpTool {
  return {
    title: partial.name,
    description: '',
    enabled: true,
    inputSchema: { type: 'object', properties: {} },
    steps: [{ op: 'goto', url: 'https://example.com/' }],
    updatedAt: 1,
    ...partial
  }
}

describe('resolveMatchingRecorderTools', () => {
  const store: RecorderWebmcpStore = {
    a: tool({
      id: 'a',
      name: 'recorder_alpha',
      matches: ['*://opentiny.design/*'],
      enabled: true
    }),
    b: tool({
      id: 'b',
      name: 'recorder_beta',
      matches: ['*://*.example.com/*'],
      enabled: true
    }),
    c: tool({
      id: 'c',
      name: 'recorder_off',
      matches: ['*://opentiny.design/*'],
      enabled: false
    })
  }

  it('只返回 enabled 且匹配当前 URL 的工具', () => {
    const list = resolveMatchingRecorderTools(store, 'https://opentiny.design/')
    expect(list.map((t) => t.id)).toEqual(['a'])
  })

  it('子域匹配', () => {
    const list = resolveMatchingRecorderTools(store, 'https://www.example.com/x')
    expect(list.map((t) => t.id)).toEqual(['b'])
  })

  it('无匹配返回空', () => {
    expect(resolveMatchingRecorderTools(store, 'https://none.test/')).toEqual([])
  })
})
