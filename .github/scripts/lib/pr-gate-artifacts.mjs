/**
 * PR Gate：类型推断 + 从变更文件收集 Repro / Spec 候选。
 * 供 `.github/scripts/pr-gate.mjs` 与单测共用。
 */
import fs from 'node:fs'
import path from 'node:path'

export const REPRO_RE = /^packages\/[^/]+\/test\/.+\.(test|spec)\.(ts|js|tsx|jsx)$/
export const SPEC_DIR_RE = /^(packages\/[^/]+\/specs\/REQ-[^/]+)/

/** 约定式标题 type → 门禁 prType */
export const TITLE_TYPE_TO_PR_TYPE = {
  fix: 'bug',
  feat: 'feature',
  docs: 'docs',
  doc: 'docs',
  refactor: 'refactor',
  style: 'style',
  build: 'build',
  ci: 'ci',
  chore: 'other',
  test: 'other',
  perf: 'other',
  revert: 'other',
  release: 'other',
  improvement: 'other'
}

/** GitHub label（与 labeler.yaml 对齐）→ 门禁 prType */
export const LABEL_TO_PR_TYPE = {
  bug: 'bug',
  enhancement: 'feature',
  documentation: 'docs',
  refactoring: 'refactor',
  chore: 'other'
}

/**
 * @param {string} title
 * @returns {string | null} conventional commit type（小写）
 */
export function parseConventionalTitleType(title) {
  const m = String(title || '')
    .trim()
    .match(
      /^(build|chore|ci|docs?|feat|fix|perf|refactor|revert|release|style|test|improvement)(\([a-z0-9/_.,-]+\))?!?:\s+\S+/i
    )
  if (!m) return null
  const t = m[1].toLowerCase()
  return t === 'doc' ? 'docs' : t
}

/**
 * 标题优先，标签兜底。
 * @param {string} title
 * @param {string[]} labels
 * @returns {{ prType: string | null, source: 'title' | 'label' | null, titleType: string | null, labelType: string | null, conflict: boolean }}
 */
export function inferPrType(title, labels = []) {
  const titleType = parseConventionalTitleType(title)
  const fromTitle = titleType ? TITLE_TYPE_TO_PR_TYPE[titleType] || 'other' : null

  let fromLabel = null
  for (const raw of labels) {
    const key = String(raw || '')
      .trim()
      .toLowerCase()
    if (LABEL_TO_PR_TYPE[key]) {
      fromLabel = LABEL_TO_PR_TYPE[key]
      break
    }
  }

  if (fromTitle) {
    return {
      prType: fromTitle,
      source: 'title',
      titleType,
      labelType: fromLabel,
      conflict: Boolean(fromLabel && fromLabel !== fromTitle)
    }
  }
  if (fromLabel) {
    return {
      prType: fromLabel,
      source: 'label',
      titleType: null,
      labelType: fromLabel,
      conflict: false
    }
  }
  return { prType: null, source: null, titleType: null, labelType: null, conflict: false }
}

/**
 * @param {string[]} changedFiles repo-relative paths
 * @param {{ root: string, readFileSync?: typeof fs.readFileSync, existsSync?: typeof fs.existsSync }} opts
 * @returns {string[]}
 */
export function collectReproCandidates(changedFiles, opts) {
  const root = opts.root
  const readFileSync = opts.readFileSync || fs.readFileSync
  const existsSync = opts.existsSync || fs.existsSync
  const out = []
  const seen = new Set()

  for (const raw of changedFiles) {
    const file = normalizeRepoPath(raw)
    if (!file || !REPRO_RE.test(file) || seen.has(file)) continue
    seen.add(file)
    const abs = path.join(root, file)
    if (!existsSync(abs)) continue
    let content = ''
    try {
      content = readFileSync(abs, 'utf8')
    } catch {
      continue
    }
    if (content.includes('复现：')) out.push(file)
  }
  return out
}

/**
 * @param {string[]} changedFiles
 * @param {{ root: string, existsSync?: typeof fs.existsSync }} opts
 * @returns {string[]} Spec 目录（无尾斜杠）
 */
export function collectSpecCandidates(changedFiles, opts) {
  const root = opts.root
  const existsSync = opts.existsSync || fs.existsSync
  const dirs = new Set()

  for (const raw of changedFiles) {
    const file = normalizeRepoPath(raw)
    if (!file) continue
    const m = file.match(SPEC_DIR_RE)
    if (!m) continue
    dirs.add(m[1])
  }

  const out = []
  for (const dir of dirs) {
    const abs = path.join(root, dir)
    const ok = ['requirements.md', 'design.md', 'tasks.md'].every((f) =>
      existsSync(path.join(abs, f))
    )
    if (ok) out.push(dir)
  }
  return out.sort()
}

/**
 * @param {{ candidates: string[], kind: 'Repro test' | 'Spec' }} args
 * @returns {{ value: string } | { error: string }}
 */
export function resolveArtifact({ candidates, kind }) {
  if (candidates.length === 1) {
    return { value: candidates[0] }
  }
  if (candidates.length > 1) {
    return {
      error:
        `${kind}：本 PR 变更中有多个候选，请只保留本次相关的一个，或打 label gate-bypass：\n` +
        candidates.map((c) => `  - ${c}`).join('\n')
    }
  }
  return {
    error:
      kind === 'Repro test'
        ? 'Bug fix（fix:）须在本 PR 变更中包含唯一含中文「复现：」的测试文件：packages/<pkg>/test/**/*.test.ts'
        : 'Feature（feat:）须在本 PR 变更中包含唯一完整 Spec 目录：packages/<pkg>/specs/REQ-*/（含 requirements/design/tasks）；琐碎改动可打 label skip-spec'
  }
}

/** @deprecated 使用 resolveArtifact；保留别名以免旧调用方瞬时断裂 */
export function resolveArtifactField({ explicit, candidates, kind }) {
  if (explicit) return { value: explicit, inferred: false }
  const r = resolveArtifact({ candidates, kind })
  if ('error' in r) return r
  return { value: r.value, inferred: true }
}

export function normalizeRepoPath(p) {
  if (!p) return ''
  return String(p).trim().replace(/^\.\//, '').replace(/\\/g, '/')
}

/**
 * @param {string} filePath
 * @returns {string[]}
 */
export function readChangedFilesList(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return []
  return fs
    .readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .map((l) => normalizeRepoPath(l))
    .filter(Boolean)
}

/**
 * @param {string} raw comma/空白分隔
 * @returns {string[]}
 */
export function parseLabels(raw) {
  if (!raw) return []
  return String(raw)
    .split(/[,:\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
}
