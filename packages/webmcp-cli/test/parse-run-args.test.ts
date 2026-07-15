import JSON5 from 'json5'
import { mkdirSync, writeFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { beforeAll, describe, expect, it } from 'vitest'
import {
  insertMissingCommas,
  joinShellArgs,
  normalizeShellDamagedJson,
  parseArgsJson,
  prepareRunArgsJson,
  quoteUnquotedStringValues,
} from '../src/parse-run-args'
import { expandFileRefs } from '../src/expand-file-refs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const fixturesDir = resolve(__dirname, 'fixtures')
const articlePath = resolve(fixturesDir, 'article.md')

beforeAll(() => {
  mkdirSync(fixturesDir, { recursive: true })
  writeFileSync(articlePath, '# Hello\n\nTest content', 'utf-8')
})

describe('parse-run-args', () => {
  it('bash brace expansion fragments', () => {
    const raw = joinShellArgs(['title:"TinyVue Icon图标"', '"content":"@base64file:./test/fixtures/article.md"'])
    const normalized = normalizeShellDamagedJson(raw)
    const expanded = expandFileRefs(normalized, process.cwd())
    const obj = JSON5.parse(expanded) as { title?: string; content?: string }
    expect(obj.title).toBeTruthy()
    expect(obj.content).toBeTruthy()
  })

  it('unquoted title value shell damage', () => {
    const damaged = `{title:TinyVue Icon图标组件：函数式图标的优雅打开方式,content:"@base64file:${articlePath.replace(/\\/g, '/')}"}`
    const repaired = quoteUnquotedStringValues(damaged)
    expect(repaired).toContain('"TinyVue Icon图标组件：函数式图标的优雅打开方式"')
    const expanded = expandFileRefs(repaired, process.cwd())
    expect(() => JSON5.parse(expanded)).not.toThrow()
  })

  it('invalid character T at 1:8 scenario', () => {
    const damaged = `{title:TinyVue Icon,content:"@base64file:${articlePath.replace(/\\/g, '/')}"}`
    expect(() =>
      parseArgsJson(expandFileRefs(normalizeShellDamagedJson(damaged), process.cwd()))
    ).not.toThrow()
  })

  it('key=value format with chinese title', () => {
    const result = prepareRunArgsJson(
      [
        'title=TinyVue Icon图标组件：函数式图标的优雅打开方式',
        `content=@base64file:${articlePath.replace(/\\/g, '/')}`,
      ],
      undefined,
      process.cwd()
    )
    expect(() => JSON5.parse(result)).not.toThrow()
  })

  it('missing comma between properties', () => {
    const raw = '{title:"A" "content":"@base64file:./test/fixtures/article.md"}'
    const fixed = insertMissingCommas(raw)
    expect(fixed).toContain('"A","content"')
  })

  it('empty args default to empty object', () => {
    const result = prepareRunArgsJson([], undefined, process.cwd())
    expect(result).toBe('{}')
  })
})
