import { describe, expect, it, vi, beforeEach } from 'vitest'
import JSZip from 'jszip'

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
  exportUserMcpScriptsZip,
  importUserMcpScriptsZip,
  importUserMcpScriptsJson,
  upsertUserMcpScript,
  listUserMcpScripts,
  removeUserMcpScript,
  parseMetaModule,
  serializeMetaTs,
  hostHintFromMatch,
  folderNameForScript,
  parseUserMcpScriptsZip
} from '../../user-mcp-scripts'
import type { UserMcpScript } from '../../user-mcp-scripts'

describe('user-mcp-scripts mcp-servers zip 打包', () => {
  beforeEach(() => {
    memory.clear()
  })

  it('hostHintFromMatch 提取目录名提示', () => {
    expect(hostHintFromMatch('*://www.baidu.com/*')).toBe('www.baidu.com')
    expect(hostHintFromMatch('https://excalidraw.com/')).toBe('excalidraw.com')
    expect(hostHintFromMatch('*://*.example.com/*')).toBe('example.com')
  })

  it('serialize/parse meta.ts 往返', () => {
    const text = serializeMetaTs({
      name: 'www.baidu.com',
      description: '百度',
      matches: ['*://www.baidu.com/*'],
      enabled: true,
      replacesBuiltIn: false,
      id: 'abc'
    })
    expect(text).toContain('export default')
    const meta = parseMetaModule(text)
    expect(meta?.name).toBe('www.baidu.com')
    expect(meta?.matches).toEqual(['*://www.baidu.com/*'])
    expect(meta?.id).toBe('abc')
  })

  it('可解析内置 mcp-servers 单引号 meta.ts', () => {
    const meta = parseMetaModule(`export default {
  name: 'www.baidu.com',
  description: '百度搜索页面工具集'
}`)
    expect(meta?.name).toBe('www.baidu.com')
    expect(meta?.description).toContain('百度')
  })

  it('导出 zip 为 <folder>/index.ts + meta.ts，导入后字段一致（默认禁用）', async () => {
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

    const blob = await exportUserMcpScriptsZip(await listUserMcpScripts())
    const parsed = await parseUserMcpScriptsZip(await blob.arrayBuffer())
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.entries).toHaveLength(1)
    expect(parsed.entries[0].folder).toBe('a.com')
    expect(parsed.entries[0].source).toBe('// hello')
    expect(parsed.entries[0].meta.replacesBuiltIn).toBe(true)

    await removeUserMcpScript(created.script.id)
    const imported = await importUserMcpScriptsZip(await blob.arrayBuffer())
    expect(imported.ok).toBe(true)
    if (!imported.ok) return
    expect(imported.imported).toBe(1)

    const again = await listUserMcpScripts()
    expect(again[0]?.name).toBe('导出测试')
    expect(again[0]?.replacesBuiltIn).toBe(true)
    expect(again[0]?.source).toBe('// hello')
    expect(again[0]?.enabled).toBe(false)
  })

  it('可导入纯 mcp-servers 风格 zip（无 matches 时按目录名补全）', async () => {
    const zip = new JSZip()
    zip.file(
      'www.baidu.com/meta.ts',
      `export default {
  name: 'www.baidu.com',
  description: '百度搜索页面工具集，由插件注入到 www.baidu.com 页面执行'
}
`
    )
    zip.file('www.baidu.com/index.ts', 'document.modelContext.registerTool({ name: "baidu-search" })')
    const buf = await zip.generateAsync({ type: 'arraybuffer' })

    const imported = await importUserMcpScriptsZip(buf)
    expect(imported.ok).toBe(true)
    if (!imported.ok) return
    expect(imported.imported).toBe(1)

    const list = await listUserMcpScripts()
    expect(list[0]?.name).toBe('www.baidu.com')
    expect(list[0]?.matches).toEqual(['*://www.baidu.com/*'])
    expect(list[0]?.source).toContain('baidu-search')
    expect(list[0]?.enabled).toBe(false)
  })

  it('folderNameForScript 冲突时追加序号', () => {
    const used = new Set<string>()
    const a: UserMcpScript = {
      id: '1',
      name: 'A',
      matches: ['*://same.com/*'],
      enabled: true,
      replacesBuiltIn: false,
      source: '1',
      updatedAt: 1
    }
    const b = { ...a, id: '2', name: 'B' }
    expect(folderNameForScript(a, used)).toBe('same.com')
    expect(folderNameForScript(b, used)).toBe('same.com-2')
  })

  it('仍兼容旧版 JSON 导入', async () => {
    const json = JSON.stringify([
      {
        id: 'legacy-1',
        name: '旧备份',
        matches: ['*://legacy.com/*'],
        enabled: true,
        replacesBuiltIn: false,
        source: '1+1',
        updatedAt: 1
      }
    ])
    const imported = await importUserMcpScriptsJson(json)
    expect(imported.ok).toBe(true)
    if (!imported.ok) return
    expect(imported.imported).toBe(1)
    expect((await listUserMcpScripts())[0]?.enabled).toBe(false)
  })
})
