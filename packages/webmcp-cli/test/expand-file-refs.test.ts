import { mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import JSON5 from 'json5'
import { beforeAll, describe, expect, it } from 'vitest'
import { expandFileRefs, resolveFilePath } from '../src/expand-file-refs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const fixturesDir = resolve(__dirname, 'fixtures')
const nestedDir = resolve(fixturesDir, 'nested')
const articlePath = resolve(fixturesDir, 'article.md')
const argsPath = resolve(nestedDir, 'args.json')

beforeAll(() => {
  mkdirSync(nestedDir, { recursive: true })
  writeFileSync(articlePath, '# Hello\n\nTest content', 'utf-8')
  writeFileSync(
    argsPath,
    JSON.stringify(
      {
        title: 'TinyVue图标组件使用指南 从入门到玩转',
        content: '@base64file:../article.md',
      },
      null,
      2
    ),
    'utf-8'
  )
})

function assertParseable(input: string, baseDir = process.cwd()) {
  const expanded = expandFileRefs(input, baseDir)
  const obj = JSON5.parse(expanded) as { content?: string }
  expect(obj.content?.length ?? 0).toBeGreaterThan(0)
  return obj
}

describe('expandFileRefs', () => {
  it('relative path from cwd', () => {
    assertParseable(`{"title":"Test","content":"@base64file:./test/fixtures/article.md"}`)
  })

  it('absolute forward slash path', () => {
    assertParseable(`{"title":"Test","content":"@base64file:${articlePath.replace(/\\/g, '/')}"}`)
  })

  it('unicode title with spaces', () => {
    assertParseable(
      `{"title":"TinyVue图标组件使用指南 从入门到玩转","content":"@base64file:${articlePath.replace(/\\/g, '/')}"}`
    )
  })

  it('split shell args joined back together', () => {
    assertParseable(
      [
        `{"title":"TinyVue图标组件使用指南`,
        `从入门到玩转","content":"@base64file:${articlePath.replace(/\\/g, '/')}"}`,
      ].join(' ')
    )
  })

  it('relative path from json file directory', () => {
    assertParseable(readFileSync(argsPath, 'utf-8'), dirname(argsPath))
  })

  it('unquoted placeholder in broken json fragment', () => {
    assertParseable(
      `{title:"TinyVue图标组件使用指南 从入门到玩转",content:@base64file:${articlePath.replace(/\\/g, '/')}}`
    )
  })

  it('windows backslash path in json string (invalid json escapes)', () => {
    assertParseable('{"title":"Test","content":"@base64file:' + articlePath + '"}')
  })

  it('windows backslash path with properly escaped json', () => {
    assertParseable(`{"title":"Test","content":"@base64file:${articlePath.replace(/\\/g, '\\\\')}"}`)
  })

  it('unquoted windows backslash path', () => {
    assertParseable(`{title:"Test",content:@base64file:${articlePath}}`)
  })

  it('resolveFilePath preserves absolute drive paths', () => {
    const resolved = resolveFilePath('D:/tmp/article.md', fixturesDir)
    expect(resolved).toMatch(/D:/i)
    expect(resolved.toLowerCase()).toContain('tmp')
  })
})
