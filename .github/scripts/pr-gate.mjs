#!/usr/bin/env node
/**
 * PR Gate：约定式标题 +（可选）标签定类型；从变更文件校验 Repro / Spec。
 *
 * 用法：
 *   node .github/scripts/pr-gate.mjs --title "fix(next-sdk): x" --changed-files-file ./changed.txt
 *   node .github/scripts/pr-gate.mjs --title "feat: y" --labels '["enhancement"]' --changed-files-file ./changed.txt
 *
 * 环境变量：
 *   PR_TITLE / PR_LABELS / PR_DRAFT / GATE_BYPASS / SKIP_SPEC / GITHUB_WORKSPACE
 */
import fs from 'node:fs'
import path from 'node:path'
import {
  REPRO_RE,
  collectReproCandidates,
  collectSpecCandidates,
  resolveArtifact,
  readChangedFilesList,
  inferPrType,
  parseLabels,
  hasExactLabel
} from './lib/pr-gate-artifacts.mjs'

const args = process.argv.slice(2)
function getArg(name) {
  const i = args.indexOf(name)
  if (i >= 0 && args[i + 1]) return args[i + 1]
  return null
}

if (args[0] === '--help' || args[0] === '-h') {
  console.log(`Usage:
  node .github/scripts/pr-gate.mjs --title "type(scope): subject" --changed-files-file <path>
  node .github/scripts/pr-gate.mjs --title "..." --labels '["bug","skip-spec"]' --changed-files-file <path>
Env: PR_TITLE, PR_LABELS, PR_DRAFT, GATE_BYPASS, SKIP_SPEC, GITHUB_WORKSPACE`)
  process.exit(0)
}

const root = process.env.GITHUB_WORKSPACE || process.cwd()
const title = getArg('--title') || process.env.PR_TITLE || ''
const labels = parseLabels(getArg('--labels') || process.env.PR_LABELS || '')
const isDraft = process.env.PR_DRAFT === 'true' || process.env.PR_DRAFT === '1'
const bypass =
  process.env.GATE_BYPASS === 'true' ||
  process.env.GATE_BYPASS === '1' ||
  hasExactLabel(labels, 'gate-bypass') ||
  hasExactLabel(labels, 'emergency')
const skipSpec =
  process.env.SKIP_SPEC === 'true' ||
  process.env.SKIP_SPEC === '1' ||
  hasExactLabel(labels, 'skip-spec')
const changedFilesFile = getArg('--changed-files-file')
const changedFiles = changedFilesFile ? readChangedFilesList(changedFilesFile) : []

const errors = []
const warnings = []

function fail(msg) {
  errors.push(msg)
}
function warn(msg) {
  warnings.push(msg)
}

const TITLE_RE =
  /^(build|chore|ci|docs?|feat|fix|perf|refactor|revert|release|style|test|improvement)(\([a-z0-9/_.,-]+\))?!?: .+/i

const titleOk = Boolean(title.trim()) && TITLE_RE.test(title.trim())
if (!title.trim()) {
  fail('缺少 PR 标题')
}

const inferred = inferPrType(title, labels)
const prType = inferred.prType

if (inferred.labelConflict) {
  fail(
    `标签类型冲突（${inferred.labelTypes.join(' / ')}），无法兜底推断 PR 类型：请修正约定式标题，或只保留一个类型标签（bug / enhancement / documentation / refactoring）`
  )
} else if (!titleOk) {
  fail(
    `PR 标题不符合约定式提交：type(scope): subject（当前: ${JSON.stringify(title)}）`
  )
} else if (!prType) {
  fail(
    '无法判断 PR 类型：请使用约定式标题（fix/feat/docs/…），或打标签 bug / enhancement / documentation / refactoring'
  )
} else {
  console.log(
    `::notice::PR 类型=${prType}（来源=${inferred.source}${inferred.titleType ? `, title=${inferred.titleType}` : ''}${inferred.labelType ? `, label→${inferred.labelType}` : ''}）`
  )
  if (inferred.conflict) {
    warn(
      `标题推断为 ${prType}，但标签指向 ${inferred.labelTypes.join(' / ')}；以标题为准`
    )
  }
}

function resolveRepoPath(p) {
  if (!p) return null
  const cleaned = p.replace(/^\.\//, '').replace(/\/$/, '')
  return path.join(root, cleaned)
}

if (prType === 'bug') {
  if (bypass) {
    warn('GATE_BYPASS：跳过 Bug 复现 artifact 校验')
  } else {
    const candidates = collectReproCandidates(changedFiles, { root })
    const resolved = resolveArtifact({ candidates, kind: 'Repro test' })
    if ('error' in resolved) {
      fail(resolved.error)
    } else {
      const repro = resolved.value.replace(/^\.\//, '')
      console.log(`::notice::Repro test: ${repro}`)
      if (!REPRO_RE.test(repro)) {
        fail(`Repro test 路径格式非法：${repro}`)
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
  }
}

if (prType === 'feature') {
  if (bypass) {
    warn('GATE_BYPASS：跳过 Feature Spec artifact 校验')
  } else if (skipSpec) {
    warn('skip-spec：跳过 Feature Spec artifact 校验')
  } else {
    const candidates = collectSpecCandidates(changedFiles, { root })
    const resolved = resolveArtifact({ candidates, kind: 'Spec' })
    if ('error' in resolved) {
      fail(resolved.error)
    } else {
      const spec = resolved.value
      console.log(`::notice::Spec: ${spec}`)
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
}

if (prType === 'refactor' && !bypass) {
  warn(
    'Refactoring：若改动了 packages/<pkg> 源码，请确保同包 test/ 有变更，或打 label gate-bypass'
  )
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
