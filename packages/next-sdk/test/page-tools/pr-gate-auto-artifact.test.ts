import { describe, it, expect } from 'vitest'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  collectReproCandidates,
  collectSpecCandidates,
  resolveArtifact,
  resolveArtifactField,
  normalizeRepoPath,
  inferPrType,
  parseConventionalTitleType,
  parseLabels,
  hasExactLabel
} from '../../../../.github/scripts/lib/pr-gate-artifacts.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..')

describe('pr-gate auto artifact', () => {
  it('normalizeRepoPath 去掉 ./ 与反斜杠', () => {
    expect(normalizeRepoPath('./packages/foo/test/a.test.ts')).toBe('packages/foo/test/a.test.ts')
    expect(normalizeRepoPath('packages\\foo\\test\\a.test.ts')).toBe('packages/foo/test/a.test.ts')
  })

  it('parseLabels：JSON 数组无损；逗号分隔不按冒号切开', () => {
    expect(parseLabels('["bug","skip-spec"]')).toEqual(['bug', 'skip-spec'])
    expect(parseLabels('bug,skip-spec')).toEqual(['bug', 'skip-spec'])
    expect(parseLabels('gate-bypass:pending')).toEqual(['gate-bypass:pending'])
  })

  it('hasExactLabel：含冒号的近似名不触发豁免', () => {
    expect(hasExactLabel(['gate-bypass'], 'gate-bypass')).toBe(true)
    expect(hasExactLabel(['gate-bypass:pending'], 'gate-bypass')).toBe(false)
    expect(hasExactLabel(['skip-spec'], 'skip-spec')).toBe(true)
    expect(hasExactLabel(['skip-spec:ok'], 'skip-spec')).toBe(false)
  })

  it('inferPrType：标题优先；无标题时多标签冲突不得择一通过', () => {
    expect(parseConventionalTitleType('fix(next-wxt): hide mask')).toBe('fix')
    expect(inferPrType('fix(next-wxt): hide mask', [])).toMatchObject({
      prType: 'bug',
      source: 'title'
    })
    expect(inferPrType('feat(next-sdk): add landmark', ['bug'])).toMatchObject({
      prType: 'feature',
      source: 'title',
      conflict: true
    })
    expect(inferPrType('WIP: something', ['enhancement'])).toMatchObject({
      prType: 'feature',
      source: 'label'
    })

    const a = inferPrType('invalid title', ['documentation', 'bug'])
    expect(a).toMatchObject({ prType: null, labelConflict: true })
    expect(a.labelTypes).toEqual(['docs', 'bug'])

    const b = inferPrType('invalid title', ['bug', 'documentation'])
    expect(b).toMatchObject({ prType: null, labelConflict: true })
    expect(b.labelTypes).toEqual(['bug', 'docs'])
  })

  it('collectReproCandidates：仅收录含「复现：」且路径合法的测试文件', () => {
    const files = [
      'packages/next-sdk/test/page-tools/pr-gate-repro.fixture.test.ts',
      'packages/next-sdk/page-tools/page-agent-tool.ts',
      'README.md'
    ]
    const got = collectReproCandidates(files, { root })
    expect(got).toEqual(['packages/next-sdk/test/page-tools/pr-gate-repro.fixture.test.ts'])
  })

  it('collectSpecCandidates：完整 REQ 目录才入选', () => {
    const files = [
      'packages/next-sdk/specs/REQ-20260724-pr-gate-auto-artifact/requirements.md',
      'packages/next-sdk/specs/REQ-20260724-pr-gate-auto-artifact/design.md',
      'packages/next-sdk/specs/REQ-20260724-pr-gate-auto-artifact/tasks.md'
    ]
    const got = collectSpecCandidates(files, { root })
    expect(got).toEqual(['packages/next-sdk/specs/REQ-20260724-pr-gate-auto-artifact'])
  })

  it('resolveArtifact：唯一候选通过；多候选/零候选报错（不再依赖 Gate Fields）', () => {
    expect(resolveArtifact({ candidates: ['packages/a/test/x.test.ts'], kind: 'Repro test' })).toEqual({
      value: 'packages/a/test/x.test.ts'
    })

    const multi = resolveArtifact({
      candidates: ['packages/a/test/x.test.ts', 'packages/b/test/y.test.ts'],
      kind: 'Repro test'
    })
    expect('error' in multi).toBe(true)
    if ('error' in multi) {
      expect(multi.error).toContain('多个候选')
      expect(multi.error).not.toContain('Gate Fields')
    }

    const empty = resolveArtifact({ candidates: [], kind: 'Spec' })
    expect('error' in empty).toBe(true)
    if ('error' in empty) {
      expect(empty.error).toContain('skip-spec')
    }

    expect(
      resolveArtifactField({
        explicit: 'packages/a/test/x.test.ts',
        candidates: [],
        kind: 'Repro test'
      })
    ).toEqual({ value: 'packages/a/test/x.test.ts', inferred: false })
  })
})
