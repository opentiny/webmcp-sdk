import { mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import JSON5 from 'json5'
import { expandFileRefs, resolveFilePath } from '../src/expand-file-refs.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const fixturesDir = resolve(__dirname, 'fixtures')
const nestedDir = resolve(fixturesDir, 'nested')
mkdirSync(nestedDir, { recursive: true })

const articlePath = resolve(fixturesDir, 'article.md')
writeFileSync(articlePath, '# Hello\n\nTest content', 'utf-8')

const argsPath = resolve(nestedDir, 'args.json')
writeFileSync(
  argsPath,
  JSON.stringify(
    {
      title: 'TinyVue图标组件使用指南 从入门到玩转',
      content: '@base64file:../article.md'
    },
    null,
    2
  ),
  'utf-8'
)

function assertParseable(input, baseDir = process.cwd()) {
  const expanded = expandFileRefs(input, baseDir)
  const obj = JSON5.parse(expanded)
  if (!obj.content || obj.content.length === 0) {
    throw new Error('content should be expanded to non-empty base64 string')
  }
  return obj
}

const cases = [
  {
    name: 'relative path from cwd',
    input: `{"title":"Test","content":"@base64file:./test/fixtures/article.md"}`
  },
  {
    name: 'absolute forward slash path',
    input: `{"title":"Test","content":"@base64file:${articlePath.replace(/\\/g, '/')}"}`
  },
  {
    name: 'unicode title with spaces',
    input: `{"title":"TinyVue图标组件使用指南 从入门到玩转","content":"@base64file:${articlePath.replace(/\\/g, '/')}"}`
  },
  {
    name: 'split shell args joined back together',
    input: [
      `{"title":"TinyVue图标组件使用指南`,
      `从入门到玩转","content":"@base64file:${articlePath.replace(/\\/g, '/')}"}`
    ].join(' ')
  },
  {
    name: 'relative path from json file directory',
    input: readFileSync(argsPath, 'utf-8'),
    baseDir: dirname(argsPath)
  },
  {
    name: 'unquoted placeholder in broken json fragment',
    input: `{title:"TinyVue图标组件使用指南 从入门到玩转",content:@base64file:${articlePath.replace(/\\/g, '/')}}`
  },
  {
    name: 'windows backslash path in json string (invalid json escapes)',
    input: '{"title":"Test","content":"@base64file:' + articlePath + '"}'
  },
  {
    name: 'windows backslash path with properly escaped json',
    input: `{"title":"Test","content":"@base64file:${articlePath.replace(/\\/g, '\\\\')}"}`
  },
  {
    name: 'unquoted windows backslash path',
    input: `{title:"Test",content:@base64file:${articlePath}}`
  }
]

let failed = 0
for (const testCase of cases) {
  process.stdout.write(`- ${testCase.name}: `)
  try {
    assertParseable(testCase.input, testCase.baseDir ?? process.cwd())
    process.stdout.write('OK\n')
  } catch (error) {
    failed += 1
    const message = error instanceof Error ? error.message : String(error)
    process.stdout.write(`FAIL (${message})\n`)
  }
}

const resolved = resolveFilePath('D:/tmp/article.md', fixturesDir)
if (!resolved.includes('D:') || !resolved.toLowerCase().includes('tmp')) {
  failed += 1
  console.error('resolveFilePath should preserve absolute drive paths')
}

process.exit(failed > 0 ? 1 : 0)
