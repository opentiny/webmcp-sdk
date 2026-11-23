/**
 * page-state-cache.ts
 *
 * 页面状态结构化增量 Diff 与版本缓存模块：
 * 1. 维护单调递增的快照版本号 rev，增量更新附带基准版本 baseRev；
 * 2. 首尾公共行剥离 + O(N) 低重合快速熔断预判，避免整页重绘时在大树上跑完 Myers 阻塞主线程；
 * 3. 基于 `trimmed + directParent` 语义对比，并在全局变更全集上执行包装层（Wrapper）识别与
 *    父节点改名配对 LCS 抵消，既兼容带子树的直接子节点，又杜绝按序号错配与跨父移动丢失；
 * 4. 按文档顺序输出同 `#ref`/改名父节点同步锚点与变更行，利用预计算 `parentIndex` 以 O(1)
 *    为每个变更行按需补充去重后的最小父级缩进锚点（`  ` 前缀）；
 * 5. 双重熔断保护：当变化行占比超过 50% 或 diff 文本长度 >= 整页 YAML 长度时，自动回退返回整页树（kind = 'full'）。
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
}

export interface DiffResult {
  /** 本次实际产出的快照形态（diff 过大熔断时自动变为 'full'） */
  kind: SnapshotKind
  /** 当前快照版本号（从 1 单调递增，reset 后归 0） */
  rev: number
  /** 当 kind === 'diff' 时，指明本 diff 所基于的上一版快照 rev */
  baseRev?: number
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

const MAX_CHANGE_LINE_RATIO = 0.5
const MAX_DIFF_CHAR_RATIO = 1.0
const MAX_ANCESTOR_CONTEXT_DEPTH = 2
/** 触发 O(N) 低重合快速预判的最小中间变更区间行数 */
const FAST_ABORT_MIN_WINDOW_LINES = 200
export const NO_CHANGES_DIFF_TEXT = '# (no changes)'

/** 提取序列化 YAML 行中的稳定元素 #ref（兼容单 token 及空格分隔的多 token ARIA role，如 `button link #10` -> 10） */
const LINE_REF_RE = /^\s*-\s+[^["]+?\s+#(\d+)(?:\s|$)/

/** 提取无 #ref 行的 role 与名称，供父节点改名配对使用 */
const UNREF_ROLE_NAME_RE = /^-\s+([^\s["]+)(?:\s+\[[^\]]*\])?\s+"([^"]*)"$/

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

interface SnapshotIdentityIndex {
  refKeys: Set<string>
  unrefKeys: Set<string>
}

interface StructuredDiffOutput {
  diffText: string
  addedLines: number
  removedLines: number
  abortedTooLarge?: boolean
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

/** 单次 O(N) 构建快照节点身份集合，供包装层识别判断节点是否原本已存在 */
function buildIdentityIndex(comparable: ComparableLine[]): SnapshotIdentityIndex {
  const refKeys = new Set<string>()
  const unrefKeys = new Set<string>()
  for (const comp of comparable) {
    if (comp.selfKey.startsWith('#')) refKeys.add(comp.selfKey)
    else unrefKeys.add(`${comp.directParent}\0${comp.selfKey}`)
  }
  return { refKeys, unrefKeys }
}

function hasNodeInIdentityIndex(index: SnapshotIdentityIndex, comp: ComparableLine): boolean {
  return comp.selfKey.startsWith('#')
    ? index.refKeys.has(comp.selfKey)
    : index.unrefKeys.has(`${comp.directParent}\0${comp.selfKey}`)
}

function groupByKey<K>(items: IndexedLine[], keyFn: (item: IndexedLine) => K): Map<K, IndexedLine[]> {
  const map = new Map<K, IndexedLine[]>()
  for (const item of items) {
    const key = keyFn(item)
    const list = map.get(key)
    if (list) list.push(item)
    else map.set(key, [item])
  }
  return map
}

/**
 * 归一化无 #ref 容器名称词干（去掉动态括号计数与数字），用于判断两行是否为同一容器改名：
 * - "购物车 (2)" / "购物车 (3)" -> "购物车"
 * - "Y (2)" / "Y (3)" -> "Y"
 * - "L" / "L2" -> "L"
 */
function normalizeNameStem(name: string): string {
  return name
    .replace(/[（(][^）)]*\d+[^）)]*[）)]/g, '')
    .replace(/\d+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * 计算两个无 #ref 父节点行的名称兼容分：
 * - 2：同 role 且归一化词干完全一致（非空）
 * - 1：同 role 且较短词干（长度 >= 2）是较长词干的前缀
 * - 0：不兼容（不同 role 或无实质词干重叠，如 "X" 与 "Y (3)"、"Billing" 与 "Shipping (1)"）
 */
function scoreRenamedParentNames(prevTrimmed: string, currTrimmed: string): number {
  const prevMeta = UNREF_ROLE_NAME_RE.exec(prevTrimmed)
  const currMeta = UNREF_ROLE_NAME_RE.exec(currTrimmed)
  if (!prevMeta || !currMeta || prevMeta[1] !== currMeta[1]) return 0

  const prevStem = normalizeNameStem(prevMeta[2])
  const currStem = normalizeNameStem(currMeta[2])
  if (!prevStem || !currStem) return 0
  if (prevStem === currStem) return 2
  const shorter = prevStem.length <= currStem.length ? prevStem : currStem
  const longer = prevStem.length <= currStem.length ? currStem : prevStem
  if (shorter.length >= 2 && longer.startsWith(shorter)) return 1
  return 0
}

/** 统计两组行序列中整行文本（item.line）的多重集交集大小 */
function countSharedExactLines(left: IndexedLine[], right: IndexedLine[]): number {
  if (left.length === 0 || right.length === 0) return 0
  const counts = new Map<string, number>()
  for (const item of left) {
    counts.set(item.line, (counts.get(item.line) ?? 0) + 1)
  }
  let shared = 0
  for (const item of right) {
    const remain = counts.get(item.line) ?? 0
    if (remain > 0) {
      counts.set(item.line, remain - 1)
      shared++
    }
  }
  return shared
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
 * 单方向包装层（Wrapper）插入/移除抵消（参数化复用，消除插入与移除两侧的镜像代码）：
 * - 仅对真正新插入（或真正被移除）的包装行 W 生效，跳过对侧快照中原本已存在的父节点；
 * - 在全局变更集合上按原序对直接子节点求 trimmed LCS，兼容直接子节点带子树而被 Myers 切入多个 hunk 的场景。
 */
function cancelWrappedNodes(
  wrapperCandidates: IndexedLine[],
  wrapperComparable: ComparableLine[],
  otherIdentity: SnapshotIdentityIndex,
  wrapperSideByParentIdx: Map<number, IndexedLine[]>,
  otherSideByDirectParent: Map<string, IndexedLine[]>,
  cancelledWrapperSide: Set<number>,
  cancelledOtherSide: Set<number>,
): void {
  for (const w of wrapperCandidates) {
    if (cancelledWrapperSide.has(w.index)) continue
    const wComp = wrapperComparable[w.index]
    if (hasNodeInIdentityIndex(otherIdentity, wComp)) continue

    const wrappedChildren = (wrapperSideByParentIdx.get(w.index) ?? []).filter(
      (item) => !cancelledWrapperSide.has(item.index),
    )
    if (wrappedChildren.length === 0) continue

    const otherChildren = (otherSideByDirectParent.get(wComp.directParent) ?? []).filter(
      (item) => !cancelledOtherSide.has(item.index),
    )
    if (otherChildren.length === 0) continue

    cancelByLcs(
      otherChildren,
      wrappedChildren,
      (item) => item.trimmed,
      cancelledOtherSide,
      cancelledWrapperSide,
    )
  }
}

/**
 * 在所有 Hunk 的变更全集上执行两类保序、保父级的安全抵消：
 * 1. 全局包装层（Wrapper）插入/移除识别：解决直接子节点带子树时被 Myers 切分为多 hunk 导致失效的问题；
 * 2. 全局父节点改名配对（按 #ref 身份或无 #ref 词干兼容 + 子节点重合度贪心一对一匹配）+ 整行 LCS 抵消：
 *    - 解决父节点改名下带子树子节点被切入多 hunk 的问题；
 *    - 杜绝按 hunk 序号对齐导致「删除容器 + 改名容器」错配吞掉跨父移动的问题；
 *    - 保留同父重排与跨父移动差异。
 */
function cancelUnchangedGlobally(
  allRemoved: IndexedLine[],
  allAdded: IndexedLine[],
  prevComparable: ComparableLine[],
  currComparable: ComparableLine[],
): {
  cancelledRem: Set<number>
  cancelledAdd: Set<number>
  pairedRenamedParentByCurrIdx: Map<number, number>
} {
  const cancelledRem = new Set<number>()
  const cancelledAdd = new Set<number>()

  // 快照身份索引与全局父子索引均只构建一次（O(N)）
  const prevIdentity = buildIdentityIndex(prevComparable)
  const currIdentity = buildIdentityIndex(currComparable)
  const removedByParentIdx = groupByKey(allRemoved, (r) => prevComparable[r.index].parentIndex)
  const addedByParentIdx = groupByKey(allAdded, (a) => currComparable[a.index].parentIndex)
  const removedByDirectParent = groupByKey(allRemoved, (r) => prevComparable[r.index].directParent)
  const addedByDirectParent = groupByKey(allAdded, (a) => currComparable[a.index].directParent)

  // 1a. Wrapper 插入识别（curr 侧新增包装行 W）
  cancelWrappedNodes(
    allAdded,
    currComparable,
    prevIdentity,
    addedByParentIdx,
    removedByDirectParent,
    cancelledAdd,
    cancelledRem,
  )

  // 1b. Wrapper 移除识别（prev 侧删除包装行 W）
  cancelWrappedNodes(
    allRemoved,
    prevComparable,
    currIdentity,
    removedByParentIdx,
    addedByDirectParent,
    cancelledRem,
    cancelledAdd,
  )

  // 2. 全局父节点改名配对（按缩进由浅入深逐层配对，支持多层容器同时改名）
  const remAfterWrap = allRemoved.filter((r) => !cancelledRem.has(r.index))
  const addAfterWrap = allAdded.filter((a) => !cancelledAdd.has(a.index))
  const remChildrenByParent = groupByKey(remAfterWrap, (r) => prevComparable[r.index].parentIndex)
  const addChildrenByParent = groupByKey(addAfterWrap, (a) => currComparable[a.index].parentIndex)

  const remByIndent = groupByKey(remAfterWrap, (r) => prevComparable[r.index].indent)
  const addByIndent = groupByKey(addAfterWrap, (a) => currComparable[a.index].indent)
  const indents = Array.from(new Set([...remByIndent.keys(), ...addByIndent.keys()])).sort((a, b) => a - b)

  // 记录已配对的改名父节点：prevParentIdx <-> currParentIdx
  const pairedPrevToCurr = new Map<number, number>()
  const pairedRenamedParentByCurrIdx = new Map<number, number>()

  const haveCompatibleOuterParent = (prevParentIdx: number, currParentIdx: number): boolean => {
    const rOuter = prevComparable[prevParentIdx].parentIndex
    const aOuter = currComparable[currParentIdx].parentIndex
    if (rOuter === -1 && aOuter === -1) return true
    if (rOuter === -1 || aOuter === -1) return false
    if (pairedPrevToCurr.get(rOuter) === aOuter) return true
    return prevComparable[prevParentIdx].directParent === currComparable[currParentIdx].directParent
  }

  for (const indent of indents) {
    const remParents = (remByIndent.get(indent) ?? []).filter(
      (r) => !cancelledRem.has(r.index) && (remChildrenByParent.get(r.index)?.length ?? 0) > 0,
    )
    const addParents = (addByIndent.get(indent) ?? []).filter(
      (a) => !cancelledAdd.has(a.index) && (addChildrenByParent.get(a.index)?.length ?? 0) > 0,
    )
    if (remParents.length === 0 || addParents.length === 0) continue

    const candidates: Array<{
      remIdx: number
      addIdx: number
      nameScore: number
      sharedChildren: number
      distance: number
    }> = []

    for (const rParent of remParents) {
      const rComp = prevComparable[rParent.index]
      const rChildren = (remChildrenByParent.get(rParent.index) ?? []).filter(
        (c) => !cancelledRem.has(c.index),
      )
      if (rChildren.length === 0) continue

      for (const aParent of addParents) {
        const aComp = currComparable[aParent.index]
        if (!haveCompatibleOuterParent(rParent.index, aParent.index)) continue

        let nameScore = 0
        if (rComp.selfKey.startsWith('#') || aComp.selfKey.startsWith('#')) {
          // 带 #ref 的父节点只能与同一 #ref 配对，绝不允许不同 #ref 父节点互配
          if (rComp.selfKey !== aComp.selfKey) continue
          nameScore = 3
        } else {
          nameScore = scoreRenamedParentNames(rComp.trimmed, aComp.trimmed)
          if (nameScore === 0) continue
        }

        const aChildren = (addChildrenByParent.get(aParent.index) ?? []).filter(
          (c) => !cancelledAdd.has(c.index),
        )
        const sharedChildren = countSharedExactLines(rChildren, aChildren)
        if (sharedChildren === 0) continue

        candidates.push({
          remIdx: rParent.index,
          addIdx: aParent.index,
          nameScore,
          sharedChildren,
          distance: Math.abs(rParent.index - aParent.index),
        })
      }
    }

    candidates.sort(
      (a, b) =>
        b.nameScore - a.nameScore ||
        b.sharedChildren - a.sharedChildren ||
        a.distance - b.distance,
    )

    const usedRem = new Set<number>()
    const usedAdd = new Set<number>()
    for (const cand of candidates) {
      if (usedRem.has(cand.remIdx) || usedAdd.has(cand.addIdx)) continue
      usedRem.add(cand.remIdx)
      usedAdd.add(cand.addIdx)
      pairedPrevToCurr.set(cand.remIdx, cand.addIdx)
      pairedRenamedParentByCurrIdx.set(cand.addIdx, cand.remIdx)

      const rSeq = (remChildrenByParent.get(cand.remIdx) ?? []).filter(
        (c) => !cancelledRem.has(c.index),
      )
      const aSeq = (addChildrenByParent.get(cand.addIdx) ?? []).filter(
        (c) => !cancelledAdd.has(c.index),
      )
      // 同一改名父节点下，仅抵消位于 LCS 中且整行（含缩进与文本）完全相同的直接子节点
      cancelByLcs(rSeq, aSeq, (item) => item.line, cancelledRem, cancelledAdd)
    }
  }

  return { cancelledRem, cancelledAdd, pairedRenamedParentByCurrIdx }
}

/**
 * 统一的祖先锚点输出 helper：按 O(1) parentIndex 向上追溯最多 2 层并自动去重。
 */
function emitAncestorsFor(
  targetIdx: number,
  comparable: ComparableLine[],
  lines: string[],
  emittedAncestors: Set<number>,
  ownChangeIndices: Set<number>,
  emittedTextsInHunk: Set<string>,
  outputLines: string[],
): void {
  const ancestorIndices = findAncestorIndices(comparable, targetIdx)
  for (const idx of ancestorIndices) {
    if (emittedAncestors.has(idx) || ownChangeIndices.has(idx)) continue
    emittedAncestors.add(idx)
    const text = lines[idx]
    const key = text.trimStart()
    if (!emittedTextsInHunk.has(key)) {
      emittedTextsInHunk.add(key)
      outputLines.push(`  ${text}`)
    }
  }
}

/**
 * O(N) 快速低重合预判：即使所有 trimmed 相同的行全部匹配，未匹配行占比仍必然超过熔断阈值时直接返回 true，
 * 避免整页重绘时在大树上执行 O(ND) Myers 算法阻塞主线程。
 */
function isGuaranteedTooLargeByMultiset(
  prevComparable: ComparableLine[],
  currComparable: ComparableLine[],
  prevStart: number,
  prevEnd: number,
  currStart: number,
  currEnd: number,
  totalLines: number,
): boolean {
  const midPrevLen = prevEnd - prevStart
  const midCurrLen = currEnd - currStart
  if (midPrevLen + midCurrLen < FAST_ABORT_MIN_WINDOW_LINES || totalLines === 0) return false

  const counts = new Map<string, number>()
  for (let i = prevStart; i < prevEnd; i++) {
    const key = prevComparable[i].trimmed
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  let matched = 0
  for (let i = currStart; i < currEnd; i++) {
    const key = currComparable[i].trimmed
    const remain = counts.get(key) ?? 0
    if (remain > 0) {
      counts.set(key, remain - 1)
      matched++
    }
  }
  const minChangedLines = Math.max(midPrevLen - matched, midCurrLen - matched)
  return minChangedLines / totalLines > MAX_CHANGE_LINE_RATIO
}

/**
 * 构建结构感知的增量 Diff
 */
function computeStructuredYamlDiff(prevLines: string[], currLines: string[]): StructuredDiffOutput {
  if (
    prevLines.length === currLines.length &&
    prevLines.every((line, idx) => line === currLines[idx])
  ) {
    return { diffText: NO_CHANGES_DIFF_TEXT, addedLines: 0, removedLines: 0 }
  }

  const prevComparable = buildComparableLines(prevLines)
  const currComparable = buildComparableLines(currLines)

  // 1. 剥离首尾完全相同（含 directParent 一致）的公共区间，缩小 Myers 输入规模
  let prefixLen = 0
  const minLen = Math.min(prevComparable.length, currComparable.length)
  while (
    prefixLen < minLen &&
    prevComparable[prefixLen].line === currComparable[prefixLen].line &&
    prevComparable[prefixLen].directParent === currComparable[prefixLen].directParent
  ) {
    prefixLen++
  }

  let prevEnd = prevComparable.length
  let currEnd = currComparable.length
  while (
    prevEnd > prefixLen &&
    currEnd > prefixLen &&
    prevComparable[prevEnd - 1].line === currComparable[currEnd - 1].line &&
    prevComparable[prevEnd - 1].directParent === currComparable[currEnd - 1].directParent
  ) {
    prevEnd--
    currEnd--
  }

  if (prefixLen === prevEnd && prefixLen === currEnd) {
    return { diffText: NO_CHANGES_DIFF_TEXT, addedLines: 0, removedLines: 0 }
  }

  // 2. 大窗口低重合快速熔断：整页重绘在进入 Myers 前即可 O(N) 返回
  const totalLines = Math.max(prevLines.length, currLines.length)
  if (
    isGuaranteedTooLargeByMultiset(
      prevComparable,
      currComparable,
      prefixLen,
      prevEnd,
      prefixLen,
      currEnd,
      totalLines,
    )
  ) {
    return { diffText: '', addedLines: 0, removedLines: 0, abortedTooLarge: true }
  }

  const parts = diffArrays(
    prevComparable.slice(prefixLen, prevEnd),
    currComparable.slice(prefixLen, currEnd),
    {
      comparator: (left, right) =>
        left.trimmed === right.trimmed && left.directParent === right.directParent,
    },
  )

  const hunks: ChangeHunk[] = []
  const allRemoved: IndexedLine[] = []
  const allAdded: IndexedLine[] = []
  let prevCursor = prefixLen
  let currCursor = prefixLen
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
        const entry: IndexedLine = {
          index: prevCursor++,
          line: item.line,
          trimmed: item.trimmed,
          ref: parseLineRef(item.line),
        }
        activeHunk.removed.push(entry)
        allRemoved.push(entry)
      }
    } else if (part.added) {
      for (const item of part.value) {
        const entry: IndexedLine = {
          index: currCursor++,
          line: item.line,
          trimmed: item.trimmed,
          ref: parseLineRef(item.line),
        }
        activeHunk.added.push(entry)
        allAdded.push(entry)
      }
    }
  }

  if (hunks.length === 0) {
    return { diffText: NO_CHANGES_DIFF_TEXT, addedLines: 0, removedLines: 0 }
  }

  // 3. 在全局变更全集上统一执行 Wrapper 识别与父节点改名 LCS 抵消（一次性构建索引，支持跨 hunk 子树）
  const { cancelledRem, cancelledAdd, pairedRenamedParentByCurrIdx } = cancelUnchangedGlobally(
    allRemoved,
    allAdded,
    prevComparable,
    currComparable,
  )

  const outputLines: string[] = []
  const emittedCurrAncestors = new Set<number>()
  const emittedPrevAncestors = new Set<number>()
  let addedLines = 0
  let removedLines = 0

  for (const hunk of hunks) {
    const effectiveRemoved = hunk.removed.filter((r) => !cancelledRem.has(r.index))
    const effectiveAdded = hunk.added.filter((a) => !cancelledAdd.has(a.index))
    if (effectiveRemoved.length === 0 && effectiveAdded.length === 0) continue

    // 4. 识别同 Hunk 内的同步配对项：同 #ref 唯一配对 或 已配对的改名父节点
    const addedRefCounts = new Map<number, number>()
    for (const item of effectiveAdded) {
      if (item.ref !== null) addedRefCounts.set(item.ref, (addedRefCounts.get(item.ref) ?? 0) + 1)
    }
    const removedRefCounts = new Map<number, number>()
    const removedByIdx = new Map<number, IndexedLine>()
    for (const item of effectiveRemoved) {
      removedByIdx.set(item.index, item)
      if (item.ref !== null) {
        removedRefCounts.set(item.ref, (removedRefCounts.get(item.ref) ?? 0) + 1)
      }
    }
    const removedByUniqueRef = new Map<number, IndexedLine>()
    for (const item of effectiveRemoved) {
      if (
        item.ref !== null &&
        removedRefCounts.get(item.ref) === 1 &&
        addedRefCounts.get(item.ref) === 1
      ) {
        removedByUniqueRef.set(item.ref, item)
      }
    }

    const pairedOldByAddIdx = new Map<number, IndexedLine>()
    const pairedRemIndices = new Set<number>()
    for (const add of effectiveAdded) {
      if (add.ref !== null) {
        const oldByRef = removedByUniqueRef.get(add.ref)
        if (oldByRef && !pairedRemIndices.has(oldByRef.index)) {
          pairedOldByAddIdx.set(add.index, oldByRef)
          pairedRemIndices.add(oldByRef.index)
          continue
        }
      }
      const renamedPrevIdx = pairedRenamedParentByCurrIdx.get(add.index)
      if (renamedPrevIdx !== undefined) {
        const oldParent = removedByIdx.get(renamedPrevIdx)
        if (oldParent && !pairedRemIndices.has(oldParent.index)) {
          pairedOldByAddIdx.set(add.index, oldParent)
          pairedRemIndices.add(oldParent.index)
        }
      }
    }

    const hunkRemovedIndices = new Set(effectiveRemoved.map((r) => r.index))
    const hunkAddedIndices = new Set(effectiveAdded.map((a) => a.index))
    const emittedTextsInHunk = new Set<string>()
    const emittedRemovedInHunk = new Set<number>()

    const emitSingleRemoved = (rem: IndexedLine) => {
      if (emittedRemovedInHunk.has(rem.index)) return
      emittedRemovedInHunk.add(rem.index)
      emitAncestorsFor(
        rem.index,
        prevComparable,
        prevLines,
        emittedPrevAncestors,
        hunkRemovedIndices,
        emittedTextsInHunk,
        outputLines,
      )
      emittedPrevAncestors.add(rem.index)
      outputLines.push(`- ${rem.line}`)
      removedLines++
    }

    const emitSingleAdded = (add: IndexedLine) => {
      emitAncestorsFor(
        add.index,
        currComparable,
        currLines,
        emittedCurrAncestors,
        hunkAddedIndices,
        emittedTextsInHunk,
        outputLines,
      )
      emittedCurrAncestors.add(add.index)
      outputLines.push(`+ ${add.line}`)
      addedLines++
    }

    // 5. 按文档顺序交错输出：在每个同步配对点之前先刷出排在其前的未配对删除行，再按需补全逐行祖先锚点
    let rCursor = 0
    const flushUnpairedRemovedBefore = (limitRemIndex: number) => {
      while (rCursor < effectiveRemoved.length && effectiveRemoved[rCursor].index < limitRemIndex) {
        const rem = effectiveRemoved[rCursor++]
        if (!pairedRemIndices.has(rem.index)) {
          emitSingleRemoved(rem)
        }
      }
    }

    for (const add of effectiveAdded) {
      const pairedOld = pairedOldByAddIdx.get(add.index)
      if (!pairedOld) {
        emitSingleAdded(add)
        continue
      }

      // 先刷出文档中位于 pairedOld 之前的未配对删除行
      flushUnpairedRemovedBefore(pairedOld.index)
      emittedRemovedInHunk.add(pairedOld.index)

      const sameParent =
        prevComparable[pairedOld.index].directParent === currComparable[add.index].directParent
      // 保护兜底：同父级且整行完全一致的配对行不输出、不计入变更
      if (sameParent && pairedOld.line === add.line) {
        emittedPrevAncestors.add(pairedOld.index)
        emittedCurrAncestors.add(add.index)
        continue
      }

      if (!sameParent) {
        // 跨父移动：先补旧父级锚点输出 `- old`，再补新父级锚点输出 `+ new`
        emitAncestorsFor(
          pairedOld.index,
          prevComparable,
          prevLines,
          emittedPrevAncestors,
          hunkRemovedIndices,
          emittedTextsInHunk,
          outputLines,
        )
        emittedPrevAncestors.add(pairedOld.index)
        outputLines.push(`- ${pairedOld.line}`)
        removedLines++

        emitAncestorsFor(
          add.index,
          currComparable,
          currLines,
          emittedCurrAncestors,
          hunkAddedIndices,
          emittedTextsInHunk,
          outputLines,
        )
        emittedCurrAncestors.add(add.index)
        outputLines.push(`+ ${add.line}`)
        addedLines++
      } else {
        // 同父原地更新：先补共同父级锚点，再紧邻输出 `- old` / `+ new`
        emitAncestorsFor(
          add.index,
          currComparable,
          currLines,
          emittedCurrAncestors,
          hunkAddedIndices,
          emittedTextsInHunk,
          outputLines,
        )
        emittedPrevAncestors.add(pairedOld.index)
        emittedCurrAncestors.add(add.index)
        outputLines.push(`- ${pairedOld.line}`)
        outputLines.push(`+ ${add.line}`)
        removedLines++
        addedLines++
      }
    }

    // 刷出最后一个同步配对点之后剩余的未配对删除行
    flushUnpairedRemovedBefore(Number.POSITIVE_INFINITY)
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

  private makeFullResult(
    rev: number,
    fullReason: FullSnapshotReason,
    prevUrl: string,
    addedLines = 0,
    removedLines = 0,
  ): DiffResult {
    return {
      kind: 'full',
      rev,
      fullReason,
      prevUrl,
      addedLines,
      removedLines,
      diffText: '',
    }
  }

  /**
   * 更新缓存并返回结构化快照/Diff 结果
   * @param url 当前页面 URL
   * @param yaml 当前 YAML 树文本
   * @param options 可选强制全量配置
   */
  update(url: string, yaml: string, options: StateCacheUpdateOptions = {}): DiffResult {
    const { forceFull = false } = options

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
      return this.makeFullResult(nextRev, fullReason ?? 'initial', prevUrl)
    }

    const { diffText, addedLines, removedLines, abortedTooLarge } = computeStructuredYamlDiff(
      prevSnapshot.lines,
      currLines,
    )

    // 双重熔断保护：快速预判命中、变化行超过半数或生成的 diff 文本体积达到/超过整页树时，回退整页树
    const hasChanges = addedLines > 0 || removedLines > 0
    const totalLines = Math.max(prevSnapshot.lines.length, currLines.length)
    const changedLineRatio = totalLines > 0 ? Math.max(addedLines, removedLines) / totalLines : 0
    const isDiffTooLarge =
      abortedTooLarge ||
      (hasChanges &&
        (changedLineRatio > MAX_CHANGE_LINE_RATIO ||
          (yaml.length > 0 && diffText.length >= yaml.length * MAX_DIFF_CHAR_RATIO)))

    this.prev = { url, yaml, lines: currLines, rev: nextRev }

    if (isDiffTooLarge) {
      return this.makeFullResult(nextRev, 'diff_too_large', prevUrl, addedLines, removedLines)
    }

    return {
      kind: 'diff',
      rev: nextRev,
      baseRev: prevSnapshot.rev,
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
