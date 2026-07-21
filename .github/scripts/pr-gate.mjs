#!/usr/bin/env node
/**
 * PR Gate：校验标题、PR Type、Gate Fields、Spec/复现路径等。
 *
 * 用法：
 *   node .github/scripts/pr-gate.mjs --title "fix(next-sdk): x" --body-file ./pr.md
 *   node .github/scripts/pr-gate.mjs --title "..." --body "..."
 *   PR_TITLE=... PR_BODY=... node .github/scripts/pr-gate.mjs
 *
 * 环境变量：
 *   PR_DRAFT=true          Draft 时仅警告不失败（默认硬失败）
 *   GATE_BYPASS=true       跳过 Spec/复现 artifact 校验
 *   GITHUB_WORKSPACE       仓库根（默认 cwd）
 */
import fs from 'node:fs'
import path from 'node:path'

const args = process.argv.slice(2)
function getArg(name) {
  const i = args.indexOf(name)
  if (i >= 0 && args[i + 1]) return args[i + 1]
  return null
}

if (args[0] === '--help' || args[0] === '-h') {
  console.log(`Usage:
  node .github/scripts/pr-gate.mjs --title "type(scope): subject" --body-file <path>
  node .github/scripts/pr-gate.mjs --title "..." --body "..."
Env: PR_TITLE, PR_BODY, PR_DRAFT, GATE_BYPASS, GITHUB_WORKSPACE`)
  process.exit(0)
}

const root = process.env.GITHUB_WORKSPACE || process.cwd()
const title = getArg('--title') || process.env.PR_TITLE || ''
const bodyFile = getArg('--body-file')
const body = bodyFile
  ? fs.readFileSync(bodyFile, 'utf8')
  : getArg('--body') || process.env.PR_BODY || ''
const isDraft = process.env.PR_DRAFT === 'true' || process.env.PR_DRAFT === '1'
const bypass = process.env.GATE_BYPASS === 'true' || process.env.GATE_BYPASS === '1'

const errors = []
const warnings = []

function fail(msg) {
  errors.push(msg)
}
function warn(msg) {
  warnings.push(msg)
}

const TITLE_RE =
  /^(build|chore|ci|docs|feat|fix|perf|refactor|revert|release|style|test|improvement)(\([a-z0-9/_.,-]+\))?!?: .+/i

if (!title.trim()) {
  fail('缺少 PR 标题')
} else if (!TITLE_RE.test(title.trim())) {
  fail(
    `PR 标题不符合约定式提交：type(scope): subject（当前: ${JSON.stringify(title)}）`
  )
}

const TYPE_LABELS = [
  ['bug', 'Bug fix'],
  ['feature', 'Feature'],
  ['style', 'Code style update (formatting, local variables)'],
  ['refactor', 'Refactoring (no functional changes, no api changes)'],
  ['build', 'Build-related changes'],
  ['ci', 'CI-related changes'],
  ['docs', 'Documentation-related changes'],
  ['other', 'Other'],
]

function isChecked(label) {
  // - [x] Label  or - [X] Label
  const re = new RegExp(
    String.raw`^\s*-\s*\[(?:x|X)\]\s*${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\s*$`,
    'm'
  )
  return re.test(body)
}

const checkedTypes = TYPE_LABELS.filter(([, label]) => isChecked(label)).map(([id]) => id)
if (checkedTypes.length === 0) {
  fail('PR Type 未勾选（须有且仅有一个 - [x]）')
} else if (checkedTypes.length > 1) {
  fail(`PR Type 勾选了多个：${checkedTypes.join(', ')}`)
}
const prType = checkedTypes[0] || null

function gateField(name) {
  // 仅在 Gate Fields 章节内解析，避免吃到下一行 `- xxx:`
  const sectionMatch = body.match(
    /##\s*Gate Fields[^\n]*\n([\s\S]*?)(?=\n##\s|\n#\s|$)/i
  )
  const section = sectionMatch ? sectionMatch[1] : body
  const re = new RegExp(String.raw`^\s*-\s*${name}:\s*(.*?)\s*$`, 'mi')
  const m = section.match(re)
  if (!m) return ''
  const v = m[1].trim()
  // 防御误匹配或空行粘连
  if (!v || v.startsWith('- ') || v.startsWith('[')) return ''
  return v
}

const issue = gateField('Issue')
const spec = gateField('Spec')
const repro = gateField('Repro test')
const skipReason = gateField('Skip reason')

const REPRO_RE = /^packages\/[^/]+\/test\/.+\.(test|spec)\.(ts|js|tsx|jsx)$/

function resolveRepoPath(p) {
  if (!p) return null
  const cleaned = p.replace(/^\.\//, '').replace(/\/$/, '')
  return path.join(root, cleaned)
}

if (prType === 'bug') {
  if (issue && !/#\d+/.test(issue)) {
    fail('若填写 Issue，格式须为 #N（例如 #42）；无 Issue 时可留空')
  }
  if (bypass) {
    warn('GATE_BYPASS：跳过 Bug 复现 artifact 校验')
  } else if (!repro) {
    fail('Bug fix 须填写 Repro test: packages/<pkg>/test/....test.ts')
  } else if (!REPRO_RE.test(repro.replace(/^\.\//, ''))) {
    fail(`Repro test 路径格式非法（须在 packages/*/test/ 下的 *.test.ts）：${repro}`)
  } else {
    const abs = resolveRepoPath(repro)
    if (!abs || !fs.existsSync(abs)) {
      fail(`Repro test 文件不存在：${repro}`)
    } else {
      const content = fs.readFileSync(abs, 'utf8')
      if (!content.includes('复现：')) {
        fail(`Repro test 文件须包含中文场景关键字「复现：」：${repro}`)
      }
    }
  }
}

if (prType === 'feature') {
  if (bypass) {
    warn('GATE_BYPASS：跳过 Feature Spec artifact 校验')
  } else if (skipReason && /琐碎|文案|typo|chore/i.test(skipReason)) {
    warn(`Feature 使用 Skip reason 豁免 Spec：${skipReason}`)
  } else if (!spec) {
    fail('Feature 须填写 Spec: packages/<pkg>/specs/REQ-.../')
  } else {
    const normalized = spec.replace(/^\.\//, '').replace(/\/$/, '')
    if (normalized.startsWith('docs/') || /\/test\/specs\//.test(normalized)) {
      fail('Spec 路径不得位于 docs/ 或 test/specs/；须为 packages/<pkg>/specs/REQ-*/')
    } else if (!/^packages\/[^/]+\/specs\/REQ-[^/]+$/.test(normalized)) {
      fail(`Spec 路径格式非法：${spec}`)
    } else {
      const dir = resolveRepoPath(normalized)
      for (const f of ['requirements.md', 'design.md', 'tasks.md']) {
        if (!fs.existsSync(path.join(dir, f))) {
          fail(`Spec 缺少文件：${normalized}/${f}`)
        }
      }
    }
  }
}

if (prType === 'other') {
  const otherInfo = body.includes('## Other information')
    ? body.split('## Other information')[1]?.trim()
    : ''
  if (!otherInfo || otherInfo.length < 8) {
    fail('Other 类型须在 Other information 中写清原因（至少数十字）')
  }
}

if (prType === 'refactor' && !bypass) {
  // 轻量：若标题含 refactor 且 Skip reason 为空，仅提示（完整文件 diff 在 CI 中用 API 增强可选）
  if (!skipReason) {
    warn(
      'Refactoring：若改动了 packages/<pkg> 源码，请确保同包 test/ 有变更，或填写 Skip reason'
    )
  }
}

// 输出
for (const w of warnings) console.log(`::warning::${w}`)
for (const e of errors) console.log(`::error::${e}`)

if (warnings.length) {
  console.log(`\n[pr-gate] warnings (${warnings.length}):`)
  warnings.forEach((w) => console.log(`  - ${w}`))
}
if (errors.length) {
  console.log(`\n[pr-gate] errors (${errors.length}):`)
  errors.forEach((e) => console.log(`  - ${e}`))
  if (isDraft) {
    console.log('[pr-gate] Draft PR：错误降级为警告，不失败')
    process.exit(0)
  }
  process.exit(1)
}

console.log('[pr-gate] OK')
process.exit(0)
