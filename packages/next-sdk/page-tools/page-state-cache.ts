/**
 * page-state-cache.ts
 *
 * 页面状态结构化增量 Diff 与版本缓存模块：
 * 1. 维护单调递增的快照版本号 rev，增量更新附带基准版本 baseRev；
 * 2. 基于稳定 #ref 实现变更块（Hunk）内同一元素的 `- 旧行 / + 新行` 就近成对输出；
 * 3. 为深层嵌套变更自动补充去重后的最小父级缩进上下文锚点（`  ` 前缀）；
 * 4. 双重熔断保护：当变化行占比超过 50% 或 diff 文本长度 >= 整页 YAML 长度时，自动回退返回整页树（kind = 'full'）。
 */

import { diffArrays } from 'diff'

export type SnapshotKind = 'full' | 'diff'

export type FullSnapshotReason = 'initial' | 'url_changed' | 'forced' | 'diff_too_large'

export interface PageSnapshot {
  url: string
  yaml: string
  lines: string[]
  rev: number
}

export interface StateCacheUpdateOptions {
  /** 强制作为全量快照输出（如调用方显式指定 responseMode: 'full'） */
  forceFull?: boolean
  /** 允许的最大变更行数比例（0~1），超出则回退整页树，默认 0.5 */
  maxChangeLineRatio?: number
  /** 允许的最大 diffText / fullYaml 字符长度比，达到或超出则回退整页树，默认 1.0（防止 diff 比整页更长） */
  maxDiffCharRatio?: number
}

export interface DiffResult {
  /** 本次实际产出的快照形态（diff 过大熔断时自动变为 'full'） */
  kind: SnapshotKind
  /** 当前快照版本号（从 1 单调递增，reset 后归 0） */
  rev: number
  /** 当 kind === 'diff' 时，指明本 diff 所基于的上一版快照 rev */
  baseRev?: number
  /** 是否为全量输出（等价于 kind === 'full'） */
  isFullRefresh: boolean
  /** 触发全量输出的原因 */
  fullReason?: FullSnapshotReason
  /** 上一次缓存的 URL */
  prevUrl: string
  /** 新增行数（`+ ` 行计数） */
  addedLines: number
  /** 删除行数（`- ` 行计数） */
  removedLines: number
  /** 结构化 +/- 差异文本（无变化时为 `# (no changes)`，全量输出时为空串） */
  diffText: string
}

const DEFAULT_MAX_CHANGE_LINE_RATIO = 0.5
const DEFAULT_MAX_DIFF_CHAR_RATIO = 1.0
const MAX_ANCESTOR_CONTEXT_DEPTH = 2
export const NO_CHANGES_DIFF_TEXT = '# (no changes)'

/** 提取序列化 YAML 行中的稳定元素 #ref（兼容单 token 及空格分隔的多 token ARIA role，如 `button link #10` -> 10） */
const LINE_REF_RE = /^\s*-\s+[^["]+?\s+#(\d+)(?:\s|$)/

interface ComparableLine {
  line: string
  trimmed: string
  /** 最近一层严格更小缩进直接父节点的 trimmed 文本（顶层节点为空串） */
  directParent: string
}

interface IndexedLine {
  index: number
  line: string
  ref: number | null
}

interface ChangeHunk {
  removed: IndexedLine[]
  added: IndexedLine[]
}

function parseLineRef(line: string): number | null {
  const match = LINE_REF_RE.exec(line)
  return match ? Number(match[1]) : null
}

function getIndentWidth(line: string): number {
  let i = 0
  while (i < line.length && line[i] === ' ') i++
  return i
}

/**
 * 剥离外层 ```yaml 代码块围栏，提取无障碍树纯内容行数组
 */
export function extractYamlLines(yaml: string): string[] {
  let body = yaml.trim()
  if (body.startsWith('```yaml')) {
    body = body.slice('```yaml'.length)
  } else if (body.startsWith('```')) {
    body = body.slice(3)
  }
  if (body.endsWith('```')) {
    body = body.slice(0, -3)
  }
  body = body.replace(/^\r?\n/, '').replace(/\r?\n$/, '')
  if (!body) return []
  return body.split(/\r?\n/)
}

/**
 * 从 targetIdx 向上回溯缩进严格更小的父级节点行下标（按外层 -> 内层排序），
 * 最多保留最近的 maxDepth 层父节点作为结构定位锚点。
 */
function findAncestorIndices(lines: string[], targetIdx: number, maxDepth = MAX_ANCESTOR_CONTEXT_DEPTH): number[] {
  if (targetIdx <= 0 || targetIdx >= lines.length) return []
  let currentIndent = getIndentWidth(lines[targetIdx])
  if (currentIndent === 0) return []

  const ancestors: number[] = []
  for (let i = targetIdx - 1; i >= 0 && currentIndent > 0; i--) {
    const indent = getIndentWidth(lines[i])
    if (indent < currentIndent) {
      ancestors.push(i)
      currentIndent = indent
    }
  }
  ancestors.reverse()
  return maxDepth > 0 && ancestors.length > maxDepth
    ? ancestors.slice(ancestors.length - maxDepth)
    : ancestors
}

/**
 * 为行数组预计算 trimmed 文本与直接父节点身份 key：
 * - 若父节点带有稳定 #ref，用 `#ref` 作为父级身份（父节点改名不影响子节点匹配）
 * - 外层包装容器临时插入导致的整棵子树缩进平移（子节点 directParent 未变 → 视为未变化）
 * - 节点真实的父子层级迁移（directParent 变化 → 必须作为差异输出）
 */
function buildComparableLines(lines: string[]): ComparableLine[] {
  const stack: Array<{ indent: number; parentKey: string }> = []
  return lines.map((line) => {
    const indent = getIndentWidth(line)
    const trimmed = line.slice(indent)
    while (stack.length > 0 && stack[stack.length - 1].indent >= indent) {
      stack.pop()
    }
    const directParent = stack.length > 0 ? stack[stack.length - 1].parentKey : ''
    const ref = parseLineRef(line)
    stack.push({ indent, parentKey: ref !== null ? `#${ref}` : trimmed })
    return { line, trimmed, directParent }
  })
}

/**
 * 构建结构感知的增量 Diff：
 * - 使用 trimmed + directParent 语义对比：既忽略外层透明包装切换引起的纯缩进平移，又能准确捕获真实父级变更
 * - 将 Myers 行对比聚合成相邻变更 Hunk
 * - 在 Hunk 内对相同 #ref 的旧行与新行就近成对输出（`- 旧行` 紧邻 `+ 新行`）
 * - 为嵌套层级的变更（含混合 Hunk 中的嵌套删除）补充最小父级缩进上下文锚点（`  ` 前缀，跨 Hunk 去重）
 */
function computeStructuredYamlDiff(
  prevLines: string[],
  currLines: string[],
): { diffText: string; addedLines: number; removedLines: number } {
  if (
    prevLines.length === currLines.length &&
    prevLines.every((line, idx) => line === currLines[idx])
  ) {
    return { diffText: NO_CHANGES_DIFF_TEXT, addedLines: 0, removedLines: 0 }
  }

  const prevComparable = buildComparableLines(prevLines)
  const currComparable = buildComparableLines(currLines)
  const parts = diffArrays(prevComparable, currComparable, {
    comparator: (left, right) =>
      left.trimmed === right.trimmed && left.directParent === right.directParent,
  })
  const hunks: ChangeHunk[] = []
  let prevCursor = 0
  let currCursor = 0
  let activeHunk: ChangeHunk | null = null

  for (const part of parts) {
    if (!part.added && !part.removed) {
      activeHunk = null
      prevCursor += part.value.length
      currCursor += part.value.length
      continue
    }

    if (!activeHunk) {
      activeHunk = { removed: [], added: [] }
      hunks.push(activeHunk)
    }

    if (part.removed) {
      for (const item of part.value) {
        activeHunk.removed.push({
          index: prevCursor++,
          line: item.line,
          ref: parseLineRef(item.line),
        })
      }
    } else if (part.added) {
      for (const item of part.value) {
        activeHunk.added.push({
          index: currCursor++,
          line: item.line,
          ref: parseLineRef(item.line),
        })
      }
    }
  }

  if (hunks.length === 0) {
    return { diffText: NO_CHANGES_DIFF_TEXT, addedLines: 0, removedLines: 0 }
  }

  const outputLines: string[] = []
  const emittedCurrAncestors = new Set<number>()
  const emittedPrevAncestors = new Set<number>()
  let addedLines = 0
  let removedLines = 0

  for (const hunk of hunks) {
    // 0. 抵消同 Hunk 内整行完全相同（含缩进与文本）的伪变更行（例如无 #ref 父节点如 `region "购物车 (2)"` -> `region "购物车 (3)"`
    //    改名带动其下未变更子节点进入同一 Hunk 时，绝不输出相同内容的 `-`/`+` 对，也不计入 added/removed 与熔断比例）
    const identicalRemovedMap = new Map<string, IndexedLine[]>()
    for (const rem of hunk.removed) {
      const list = identicalRemovedMap.get(rem.line)
      if (list) list.push(rem)
      else identicalRemovedMap.set(rem.line, [rem])
    }
    const cancelledRemovedIndices = new Set<number>()
    const effectiveAdded: IndexedLine[] = []
    for (const add of hunk.added) {
      const matches = identicalRemovedMap.get(add.line)
      if (matches && matches.length > 0) {
        const matchedRem = matches.shift()!
        cancelledRemovedIndices.add(matchedRem.index)
      } else {
        effectiveAdded.push(add)
      }
    }
    const effectiveRemoved = hunk.removed.filter((rem) => !cancelledRemovedIndices.has(rem.index))

    if (effectiveRemoved.length === 0 && effectiveAdded.length === 0) {
      continue
    }

    // 1. 识别同 Hunk 内同 #ref 的原地更新，将 `- 旧行` 与 `+ 新行` 就近配对
    const addedRefCounts = new Map<number, number>()
    for (const item of effectiveAdded) {
      if (item.ref !== null) {
        addedRefCounts.set(item.ref, (addedRefCounts.get(item.ref) ?? 0) + 1)
      }
    }

    const removedByUniqueRef = new Map<number, IndexedLine>()
    const removedRefCounts = new Map<number, number>()
    for (const item of effectiveRemoved) {
      if (item.ref !== null) {
        removedRefCounts.set(item.ref, (removedRefCounts.get(item.ref) ?? 0) + 1)
      }
    }
    for (const item of effectiveRemoved) {
      if (
        item.ref !== null &&
        removedRefCounts.get(item.ref) === 1 &&
        addedRefCounts.get(item.ref) === 1
      ) {
        removedByUniqueRef.set(item.ref, item)
      }
    }

    const unpairedRemoved = effectiveRemoved.filter(
      (rem) => rem.ref === null || !removedByUniqueRef.has(rem.ref),
    )
    const hunkRemovedIndices = new Set(effectiveRemoved.map((r) => r.index))
    const hunkAddedIndices = new Set(effectiveAdded.map((a) => a.index))

    // 2. 先输出纯删除行及其最小旧父级锚点（解决混合 Hunk 中嵌套删除被顶层新增掩盖旧父级的问题）
    const emittedAncestorTextsInHunk = new Set<string>()
    if (unpairedRemoved.length > 0) {
      const prevAncestorIndices = findAncestorIndices(prevLines, unpairedRemoved[0].index)
      for (const idx of prevAncestorIndices) {
        if (!emittedPrevAncestors.has(idx) && !hunkRemovedIndices.has(idx)) {
          emittedPrevAncestors.add(idx)
          const text = prevLines[idx]
          emittedAncestorTextsInHunk.add(text.trimStart())
          outputLines.push(`  ${text}`)
        }
      }
      for (const rem of unpairedRemoved) {
        emittedPrevAncestors.add(rem.index)
        outputLines.push(`- ${rem.line}`)
        removedLines++
      }
    }

    // 3. 再输出新增/配对修改行的最小新父级锚点（与同 Hunk 已输出的相同父级文本去重）
    if (effectiveAdded.length > 0) {
      const currAncestorIndices = findAncestorIndices(currLines, effectiveAdded[0].index)
      for (const idx of currAncestorIndices) {
        if (!emittedCurrAncestors.has(idx) && !hunkAddedIndices.has(idx)) {
          emittedCurrAncestors.add(idx)
          const text = currLines[idx]
          if (!emittedAncestorTextsInHunk.has(text.trimStart())) {
            outputLines.push(`  ${text}`)
          }
        }
      }

      // 按新树顺序输出同 #ref 配对变更与纯新增行
      for (const add of effectiveAdded) {
        const pairedOld = add.ref !== null ? removedByUniqueRef.get(add.ref) : undefined
        emittedCurrAncestors.add(add.index)
        if (pairedOld) {
          removedByUniqueRef.delete(add.ref!)
          emittedPrevAncestors.add(pairedOld.index)
          outputLines.push(`- ${pairedOld.line}`)
          outputLines.push(`+ ${add.line}`)
          removedLines++
          addedLines++
        } else {
          outputLines.push(`+ ${add.line}`)
          addedLines++
        }
      }
    }
  }

  if (addedLines === 0 && removedLines === 0) {
    return { diffText: NO_CHANGES_DIFF_TEXT, addedLines: 0, removedLines: 0 }
  }

  return {
    diffText: outputLines.join('\n'),
    addedLines,
    removedLines,
  }
}

export class PageStateCache {
  private prev: PageSnapshot | null = null
  private rev = 0

  /** 获取当前已发布的最新快照版本号（初始或 reset 后为 0） */
  getCurrentRev(): number {
    return this.rev
  }

  /** URL 变化或首次调用时，需要全量输出 */
  isFullRefresh(currentUrl: string): boolean {
    return !this.prev || this.prev.url !== currentUrl
  }

  /**
   * 更新缓存并返回结构化快照/Diff 结果
   * @param url 当前页面 URL
   * @param yaml 当前 YAML 树文本
   * @param options 可选强制全量与熔断阈值配置
   */
  update(url: string, yaml: string, options: StateCacheUpdateOptions = {}): DiffResult {
    const {
      forceFull = false,
      maxChangeLineRatio = DEFAULT_MAX_CHANGE_LINE_RATIO,
      maxDiffCharRatio = DEFAULT_MAX_DIFF_CHAR_RATIO,
    } = options

    const prevSnapshot = this.prev
    const prevUrl = prevSnapshot?.url ?? ''
    const currLines = extractYamlLines(yaml)
    const nextRev = ++this.rev

    let fullReason: FullSnapshotReason | undefined
    if (!prevSnapshot) {
      fullReason = 'initial'
    } else if (prevSnapshot.url !== url) {
      fullReason = 'url_changed'
    } else if (forceFull) {
      fullReason = 'forced'
    }

    if (fullReason || !prevSnapshot) {
      this.prev = { url, yaml, lines: currLines, rev: nextRev }
      return {
        kind: 'full',
        rev: nextRev,
        isFullRefresh: true,
        fullReason: fullReason ?? 'initial',
        prevUrl,
        addedLines: 0,
        removedLines: 0,
        diffText: '',
      }
    }

    const { diffText, addedLines, removedLines } = computeStructuredYamlDiff(
      prevSnapshot.lines,
      currLines,
    )

    // 双重熔断保护：变化行超过半数，或生成的 diff 文本体积达到/超过整页树的阈值比例时，直接回退整页树
    const hasChanges = addedLines > 0 || removedLines > 0
    const totalLines = Math.max(prevSnapshot.lines.length, currLines.length)
    const changedLineRatio = totalLines > 0 ? Math.max(addedLines, removedLines) / totalLines : 0
    const isDiffTooLarge =
      hasChanges &&
      (changedLineRatio > maxChangeLineRatio ||
        (yaml.length > 0 && diffText.length >= yaml.length * maxDiffCharRatio))

    this.prev = { url, yaml, lines: currLines, rev: nextRev }

    if (isDiffTooLarge) {
      return {
        kind: 'full',
        rev: nextRev,
        isFullRefresh: true,
        fullReason: 'diff_too_large',
        prevUrl,
        addedLines,
        removedLines,
        diffText: '',
      }
    }

    return {
      kind: 'diff',
      rev: nextRev,
      baseRev: prevSnapshot.rev,
      isFullRefresh: false,
      prevUrl,
      addedLines,
      removedLines,
      diffText,
    }
  }

  /** 清空上一次快照缓存（保留递增版本号，下次输出自动作为新基线 full） */
  invalidate(): void {
    this.prev = null
  }

  /** 会话级完全重置：清空快照缓存并将版本号 rev 归零（每轮新对话时调用） */
  reset(): void {
    this.prev = null
    this.rev = 0
  }
}
