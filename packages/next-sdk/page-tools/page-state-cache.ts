/**
 * page-state-cache.ts
 *
 * 页面状态结构化增量 Diff 与版本缓存模块：
 * 1. 维护单调递增的快照版本号 rev，增量更新附带基准版本 baseRev；
 * 2. 基于 `trimmed + directParent` 语义对比，配合包装层（Wrapper）识别与同父槽位 LCS 抵消，
 *    既能消除外层临时包装引起的纯缩进平移与父节点动态计数改名噪声，又能准确捕获跨父移动与同父重排；
 * 3. 在 Hunk 内对相同 #ref 的旧行与新行就近成对输出（`- 旧行` 紧邻 `+ 新行`），并利用预计算的
 *    `parentIndex` 以 O(1) 补充去重后的最小父级缩进上下文锚点（`  ` 前缀）；
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
  indent: number
  /** 直接父节点在行数组中的下标（顶层节点为 -1），供 O(1) 祖先上下文查找 */
  parentIndex: number
  /** 最近一层严格更小缩进直接父节点的身份 key（带 #ref 用 `#N`，否则用 trimmed 文本；顶层为空串） */
  directParent: string
  /** 本行作为父节点时的身份 key */
  selfKey: string
}

interface IndexedLine {
  index: number
  line: string
  trimmed: string
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
 * 沿预计算的 parentIndex 链表向上跳转最多 maxDepth 步（O(1)），返回从外层到内层排序的祖先下标。
 */
function findAncestorIndices(
  comparable: ComparableLine[],
  targetIdx: number,
  maxDepth = MAX_ANCESTOR_CONTEXT_DEPTH,
): number[] {
  if (targetIdx < 0 || targetIdx >= comparable.length || maxDepth <= 0) return []
  const ancestors: number[] = []
  let cur = comparable[targetIdx].parentIndex
  while (cur !== -1 && ancestors.length < maxDepth) {
    ancestors.push(cur)
    cur = comparable[cur].parentIndex
  }
  ancestors.reverse()
  return ancestors
}

/**
 * 为行数组单次 O(N) 预计算缩进、parentIndex 与直接父节点身份 key：
 * - 若父节点带有稳定 #ref，用 `#ref` 作为父级身份（父节点改名不影响子节点匹配）
 * - 记录 parentIndex 供后续 O(1) 祖先上下文查询
 */
function buildComparableLines(lines: string[]): ComparableLine[] {
  const stack: Array<{ index: number; indent: number; selfKey: string }> = []
  return lines.map((line, index) => {
    const indent = getIndentWidth(line)
    const trimmed = line.slice(indent)
    while (stack.length > 0 && stack[stack.length - 1].indent >= indent) {
      stack.pop()
    }
    const parent = stack.length > 0 ? stack[stack.length - 1] : null
    const parentIndex = parent ? parent.index : -1
    const directParent = parent ? parent.selfKey : ''
    const ref = parseLineRef(line)
    const selfKey = ref !== null ? `#${ref}` : trimmed
    stack.push({ index, indent, selfKey })
    return { line, trimmed, indent, parentIndex, directParent, selfKey }
  })
}

/**
 * 对两个有序序列按 key 求 LCS（利用 diffArrays 的未变更段），将配对成功的元素下标分别写入两个排除集合。
 */
function cancelByLcs(
  remSeq: IndexedLine[],
  addSeq: IndexedLine[],
  keyFn: (item: IndexedLine) => string,
  cancelledRem: Set<number>,
  cancelledAdd: Set<number>,
): void {
  if (remSeq.length === 0 || addSeq.length === 0) return
  const parts = diffArrays(remSeq.map(keyFn), addSeq.map(keyFn))
  let rIdx = 0
  let aIdx = 0
  for (const part of parts) {
    if (part.removed) {
      rIdx += part.value.length
    } else if (part.added) {
      aIdx += part.value.length
    } else {
      for (let k = 0; k < part.value.length; k++) {
        cancelledRem.add(remSeq[rIdx++].index)
        cancelledAdd.add(addSeq[aIdx++].index)
      }
    }
  }
}

/**
 * 在单个 Hunk 内执行两类保序、保父级的安全抵消：
 * 1. 包装层（Wrapper）插入/移除识别：新增包装行 W 下按原序挂接的原直接子节点（或移除 W 后按原序回到上层的子节点）按未变化跳过，只输出 `+ W` / `- W`；
 * 2. 同父槽位原地改名 LCS 抵消：无 #ref 父节点改名（如 `region "购物车 (2)" -> "购物车 (3)"`）带动其下子节点进入 Hunk 时，
 *    仅在相同父槽位下对整行文本序列求 LCS 并抵消，绝不抵消跨父移动或同父重排。
 */
function cancelUnchangedInHunk(
  hunk: ChangeHunk,
  prevComparable: ComparableLine[],
  currComparable: ComparableLine[],
): { effectiveRemoved: IndexedLine[]; effectiveAdded: IndexedLine[] } {
  const cancelledRem = new Set<number>()
  const cancelledAdd = new Set<number>()

  const prevRefKeys = new Set<string>()
  const prevUnrefKeys = new Set<string>()
  for (const comp of prevComparable) {
    if (comp.selfKey.startsWith('#')) prevRefKeys.add(comp.selfKey)
    else prevUnrefKeys.add(`${comp.directParent}\0${comp.selfKey}`)
  }
  const currRefKeys = new Set<string>()
  const currUnrefKeys = new Set<string>()
  for (const comp of currComparable) {
    if (comp.selfKey.startsWith('#')) currRefKeys.add(comp.selfKey)
    else currUnrefKeys.add(`${comp.directParent}\0${comp.selfKey}`)
  }

  // 1a. Wrapper 插入识别：hunk.added 中真正新插入的包装行 W（父节点为 P，且 W 本身未在旧快照中存在），其直接子节点在 hunk.removed 中原直接挂在 P 下且保持相对顺序
  for (const w of hunk.added) {
    if (cancelledAdd.has(w.index)) continue
    const wComp = currComparable[w.index]
    const existedInPrev = wComp.selfKey.startsWith('#')
      ? prevRefKeys.has(wComp.selfKey)
      : prevUnrefKeys.has(`${wComp.directParent}\0${wComp.selfKey}`)
    if (existedInPrev) continue
    const wrappedAdded = hunk.added.filter(
      (a) => !cancelledAdd.has(a.index) && currComparable[a.index].parentIndex === w.index,
    )
    if (wrappedAdded.length === 0) continue
    const origRemoved = hunk.removed.filter(
      (r) => !cancelledRem.has(r.index) && prevComparable[r.index].directParent === wComp.directParent,
    )
    if (origRemoved.length === 0) continue
    cancelByLcs(origRemoved, wrappedAdded, (item) => item.trimmed, cancelledRem, cancelledAdd)
  }

  // 1b. Wrapper 移除识别（对称）：hunk.removed 中真正被移除的包装行 W（父节点为 P，且 W 本身未在新快照中存在），其原直接子节点在 hunk.added 中回到 P 下且保持相对顺序
  for (const w of hunk.removed) {
    if (cancelledRem.has(w.index)) continue
    const wComp = prevComparable[w.index]
    const existsInCurr = wComp.selfKey.startsWith('#')
      ? currRefKeys.has(wComp.selfKey)
      : currUnrefKeys.has(`${wComp.directParent}\0${wComp.selfKey}`)
    if (existsInCurr) continue
    const wrappedRemoved = hunk.removed.filter(
      (r) => !cancelledRem.has(r.index) && prevComparable[r.index].parentIndex === w.index,
    )
    if (wrappedRemoved.length === 0) continue
    const restoredAdded = hunk.added.filter(
      (a) => !cancelledAdd.has(a.index) && currComparable[a.index].directParent === wComp.directParent,
    )
    if (restoredAdded.length === 0) continue
    cancelByLcs(wrappedRemoved, restoredAdded, (item) => item.trimmed, cancelledRem, cancelledAdd)
  }

  // 2. 同父槽位原地改名 LCS 抵消（防止跨父移动和同父重排被误抵消）
  const remAfterWrap = hunk.removed.filter((r) => !cancelledRem.has(r.index))
  const addAfterWrap = hunk.added.filter((a) => !cancelledAdd.has(a.index))

  const remParentSlotByIdx = new Map<number, string>()
  const remIndentOrder = new Map<number, number>()
  for (const r of remAfterWrap) {
    const indent = prevComparable[r.index].indent
    const order = remIndentOrder.get(indent) ?? 0
    remIndentOrder.set(indent, order + 1)
    remParentSlotByIdx.set(r.index, `hunk:${indent}:${order}`)
  }

  const addParentSlotByIdx = new Map<number, string>()
  const addIndentOrder = new Map<number, number>()
  for (const a of addAfterWrap) {
    const indent = currComparable[a.index].indent
    const order = addIndentOrder.get(indent) ?? 0
    addIndentOrder.set(indent, order + 1)
    addParentSlotByIdx.set(a.index, `hunk:${indent}:${order}`)
  }

  const getRemSlot = (item: IndexedLine): string => {
    const comp = prevComparable[item.index]
    if (comp.parentIndex === -1) return 'root'
    const base = remParentSlotByIdx.get(comp.parentIndex) ?? `same:${comp.directParent}`
    // 带 #ref 的父节点身份已知，必须纳入槽位键，避免不同 #ref 父节点互换位置时误抵消跨父移动的子节点
    return comp.directParent.startsWith('#') ? `${base}|${comp.directParent}` : base
  }
  const getAddSlot = (item: IndexedLine): string => {
    const comp = currComparable[item.index]
    if (comp.parentIndex === -1) return 'root'
    const base = addParentSlotByIdx.get(comp.parentIndex) ?? `same:${comp.directParent}`
    return comp.directParent.startsWith('#') ? `${base}|${comp.directParent}` : base
  }

  const remBySlot = new Map<string, IndexedLine[]>()
  for (const r of remAfterWrap) {
    const slot = getRemSlot(r)
    const list = remBySlot.get(slot)
    if (list) list.push(r)
    else remBySlot.set(slot, [r])
  }
  const addBySlot = new Map<string, IndexedLine[]>()
  for (const a of addAfterWrap) {
    const slot = getAddSlot(a)
    const list = addBySlot.get(slot)
    if (list) list.push(a)
    else addBySlot.set(slot, [a])
  }

  for (const [slot, rSeq] of remBySlot.entries()) {
    const aSeq = addBySlot.get(slot)
    if (!aSeq) continue
    // 同一父槽位内，仅抵消位于 LCS 中且整行（含缩进与文本）完全相同的行
    cancelByLcs(rSeq, aSeq, (item) => item.line, cancelledRem, cancelledAdd)
  }

  return {
    effectiveRemoved: hunk.removed.filter((r) => !cancelledRem.has(r.index)),
    effectiveAdded: hunk.added.filter((a) => !cancelledAdd.has(a.index)),
  }
}

/**
 * 构建结构感知的增量 Diff
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
          trimmed: item.trimmed,
          ref: parseLineRef(item.line),
        })
      }
    } else if (part.added) {
      for (const item of part.value) {
        activeHunk.added.push({
          index: currCursor++,
          line: item.line,
          trimmed: item.trimmed,
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
    // 0. Wrapper 插入/移除识别 + 同父槽位保序 LCS 抵消
    const { effectiveRemoved, effectiveAdded } = cancelUnchangedInHunk(
      hunk,
      prevComparable,
      currComparable,
    )

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

    // 2. 先输出纯删除行及其最小旧父级锚点（O(1) 沿 parentIndex 查找）
    const emittedAncestorTextsInHunk = new Set<string>()
    if (unpairedRemoved.length > 0) {
      const prevAncestorIndices = findAncestorIndices(prevComparable, unpairedRemoved[0].index)
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
      const currAncestorIndices = findAncestorIndices(currComparable, effectiveAdded[0].index)
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
          // 若同 #ref 配对行发生了跨父级移动，补充尚未输出过的旧父级锚点（同父级则去重）
          if (prevComparable[pairedOld.index].directParent !== currComparable[add.index].directParent) {
            const oldParentIndices = findAncestorIndices(prevComparable, pairedOld.index)
            for (const idx of oldParentIndices) {
              if (!emittedPrevAncestors.has(idx) && !hunkRemovedIndices.has(idx)) {
                emittedPrevAncestors.add(idx)
                const text = prevLines[idx]
                if (!emittedAncestorTextsInHunk.has(text.trimStart())) {
                  emittedAncestorTextsInHunk.add(text.trimStart())
                  outputLines.push(`  ${text}`)
                }
              }
            }
          }
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

  /** 会话级完全重置：清空快照缓存并将版本号 rev 归零（新建/清空会话时调用） */
  reset(): void {
    this.prev = null
    this.rev = 0
  }
}
