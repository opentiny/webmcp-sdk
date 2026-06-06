import JSON5 from 'json5'
import { mkdirSync, writeFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import {
  insertMissingCommas,
  joinShellArgs,
  normalizeShellDamagedJson,
  parseArgsJson,
  prepareRunArgsJson,
  quoteUnquotedStringValues
} from '../src/parse-run-args.ts'
import { expandFileRefs } from '../src/expand-file-refs.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const fixturesDir = resolve(__dirname, 'fixtures')
mkdirSync(fixturesDir, { recursive: true })
const articlePath = resolve(fixturesDir, 'article.md')
writeFileSync(articlePath, '# Hello\n\nTest content', 'utf-8')

let failed = 0

function assertOk(name, fn) {
  process.stdout.write(`- ${name}: `)
  try {
    fn()
    process.stdout.write('OK\n')
  } catch (error) {
    failed += 1
    const message = error instanceof Error ? error.message : String(error)
    process.stdout.write(`FAIL (${message})\n`)
  }
}

assertOk('bash brace expansion fragments', () => {
  const raw = joinShellArgs(['title:"TinyVue Icon图标"', '"content":"@base64file:./test/fixtures/article.md"'])
  const normalized = normalizeShellDamagedJson(raw)
  const expanded = expandFileRefs(normalized, process.cwd())
  const obj = JSON5.parse(expanded)
  if (!obj.title || !obj.content) throw new Error('missing fields')
})

assertOk('unquoted title value shell damage', () => {
  const damaged = `{title:TinyVue Icon图标组件：函数式图标的优雅打开方式,content:"@base64file:${articlePath.replace(/\\/g, '/')}"}`
  const repaired = quoteUnquotedStringValues(damaged)
  if (!repaired.includes('"TinyVue Icon图标组件：函数式图标的优雅打开方式"')) {
    throw new Error(`unexpected repair: ${repaired}`)
  }
  const expanded = expandFileRefs(repaired, process.cwd())
  JSON5.parse(expanded)
})

assertOk('invalid character T at 1:8 scenario', () => {
  const damaged = `{title:TinyVue Icon,content:"@base64file:${articlePath.replace(/\\/g, '/')}"}`
  parseArgsJson(expandFileRefs(normalizeShellDamagedJson(damaged), process.cwd()))
})

assertOk('key=value format with chinese title', () => {
  const result = prepareRunArgsJson(
    [
      'title=TinyVue Icon图标组件：函数式图标的优雅打开方式',
      `content=@base64file:${articlePath.replace(/\\/g, '/')}`
    ],
    undefined,
    process.cwd()
  )
  JSON5.parse(result)
})

assertOk('missing comma between properties', () => {
  const raw = '{title:"A" "content":"@base64file:./test/fixtures/article.md"}'
  const fixed = insertMissingCommas(raw)
  if (!fixed.includes('"A","content"')) throw new Error(`bad comma insert: ${fixed}`)
})

assertOk('windows backslash path in quoted placeholder', () => {
  const raw = '{"title":"Test","content":"@base64file:' + articlePath + '"}'
  parseArgsJson(expandFileRefs(raw, process.cwd()))
})

process.exit(failed > 0 ? 1 : 0)
