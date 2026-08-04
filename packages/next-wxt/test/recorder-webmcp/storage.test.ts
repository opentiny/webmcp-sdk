import { describe, expect, it, vi, beforeEach } from 'vitest'

const memory = new Map<string, unknown>()

vi.mock('@wxt-dev/storage', () => ({
  storage: {
    getItem: async (key: string) => memory.get(key),
    setItem: async (key: string, value: unknown) => {
      memory.set(key, value)
    }
  }
}))

import {
  RECORDER_WEBMCP_KEY,
  upsertRecorderWebmcpTool,
  getRecorderWebmcpStore,
  setRecorderWebmcpToolEnabled
} from '../../recorder-webmcp'

describe('recorder-webmcp storage', () => {
  beforeEach(() => {
    memory.clear()
  })

  it('upsert 校验非法 match / 空 steps，并写入合法工具', async () => {
    const badMatch = await upsertRecorderWebmcpTool({
      name: 'recorder_bad',
      title: 'bad',
      description: '',
      matches: ['not-a-pattern'],
      enabled: true,
      inputSchema: { type: 'object', properties: {} },
      steps: [{ op: 'goto', url: 'https://example.com/' }]
    })
    expect(badMatch.ok).toBe(false)

    const badSteps = await upsertRecorderWebmcpTool({
      name: 'recorder_bad_steps',
      title: 'bad',
      description: '',
      matches: ['*://example.com/*'],
      enabled: true,
      inputSchema: { type: 'object', properties: {} },
      steps: []
    })
    expect(badSteps.ok).toBe(false)

    const ok = await upsertRecorderWebmcpTool({
      name: 'recorder_ok',
      title: 'OK',
      description: 'demo',
      matches: ['*://example.com/*'],
      enabled: true,
      inputSchema: { type: 'object', properties: {} },
      steps: [{ op: 'goto', url: 'https://example.com/' }]
    })
    expect(ok.ok).toBe(true)
    if (!ok.ok) return
    const store = await getRecorderWebmcpStore()
    expect(store[ok.tool.id]?.name).toBe('recorder_ok')
    expect(memory.has(RECORDER_WEBMCP_KEY)).toBe(true)
  })

  it('禁止同名不同 id', async () => {
    const first = await upsertRecorderWebmcpTool({
      name: 'recorder_dup',
      title: 'A',
      description: '',
      matches: ['*://example.com/*'],
      enabled: true,
      inputSchema: { type: 'object', properties: {} },
      steps: [{ op: 'goto', url: 'https://example.com/' }]
    })
    expect(first.ok).toBe(true)

    const second = await upsertRecorderWebmcpTool({
      name: 'recorder_dup',
      title: 'B',
      description: '',
      matches: ['*://example.com/*'],
      enabled: true,
      inputSchema: { type: 'object', properties: {} },
      steps: [{ op: 'goto', url: 'https://example.com/' }]
    })
    expect(second.ok).toBe(false)
  })

  it('setEnabled 可切换且不要求改 steps', async () => {
    const created = await upsertRecorderWebmcpTool({
      name: 'recorder_toggle',
      title: 'T',
      description: '',
      matches: ['*://example.com/*'],
      enabled: true,
      inputSchema: { type: 'object', properties: {} },
      steps: [{ op: 'click', selectors: ['button'] }]
    })
    expect(created.ok).toBe(true)
    if (!created.ok) return

    const off = await setRecorderWebmcpToolEnabled(created.tool.id, false)
    expect(off.ok).toBe(true)
    if (!off.ok) return
    expect(off.tool.enabled).toBe(false)
  })
})
