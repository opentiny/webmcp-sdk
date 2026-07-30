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
  USER_MCP_SCRIPTS_KEY,
  exportUserMcpScriptsJson,
  importUserMcpScriptsJson,
  upsertUserMcpScript,
  getUserMcpScriptsStore,
  listUserMcpScripts,
  removeUserMcpScript
} from '../../user-mcp-scripts'

describe('user-mcp-scripts storage', () => {
  beforeEach(() => {
    memory.clear()
  })

  it('upsert 校验非法 match 并写入合法脚本', async () => {
    const bad = await upsertUserMcpScript({
      name: 'bad',
      matches: ['not-a-pattern'],
      enabled: true,
      replacesBuiltIn: false,
      source: '1'
    })
    expect(bad.ok).toBe(false)

    const ok = await upsertUserMcpScript({
      name: 'ok',
      matches: ['*://example.com/*'],
      enabled: true,
      replacesBuiltIn: false,
      source: 'console.log(1)'
    })
    expect(ok.ok).toBe(true)
    if (!ok.ok) return
    const store = await getUserMcpScriptsStore()
    expect(store[ok.script.id]?.name).toBe('ok')
    expect(memory.has(USER_MCP_SCRIPTS_KEY)).toBe(true)
  })

  it('导出再导入保持关键字段', async () => {
    const created = await upsertUserMcpScript({
      name: '导出测试',
      description: 'd',
      matches: ['*://a.com/*'],
      enabled: true,
      replacesBuiltIn: true,
      source: '// hello'
    })
    expect(created.ok).toBe(true)
    if (!created.ok) return

    const json = exportUserMcpScriptsJson(await listUserMcpScripts())
    await removeUserMcpScript(created.script.id)
    expect(await listUserMcpScripts()).toEqual([])

    const imported = await importUserMcpScriptsJson(json)
    expect(imported.ok).toBe(true)
    if (!imported.ok) return
    expect(imported.imported).toBe(1)

    const again = await listUserMcpScripts()
    expect(again[0]?.name).toBe('导出测试')
    expect(again[0]?.replacesBuiltIn).toBe(true)
    expect(again[0]?.source).toBe('// hello')
  })
})
