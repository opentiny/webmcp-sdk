/**
 * page-state-cache.ts
 *
 * 页面状态结构化增量 Diff 与版本缓存模块：
 * 1. 维护单调递增的快照版本号 rev，增量更新附带基准版本 baseRev；
 * 2. 首尾公共行剥离 + O(N) 低重合快速预判 + Myers 编辑距离上限保护，避免整页重绘、大列表倒序或批量改名阻塞主线程；
 * 3. 基于 `trimmed + directParent` 语义对比，并在全局变更全集上执行：
 *    - 包装层（Wrapper）插入/移除抵消：依赖 Myers 公共段建立的新旧精确父节点映射与相邻兄弟窗口，绝不吞掉跨父/跨位置移动；
 *    - 父节点改名配对（倒排索引 O(M) 候选生成 + 共享子节点与名称兼容排序）+ 整行 LCS 抵消，兼容行内文案拼装、无名称 token 更新与带子树子节点；
 * 4. 按文档顺序交错输出未配对删除行（位于新增行之前）、新增行与同步配对项，并沿预计算 `parentIndex` 以 O(1) 为每行按需补全去重后的最小父级缩进锚点；
 * 5. 三项熔断保护（前置快速预判/超限、变化行占比 > 50%、diff 字符体积 >= 整页 YAML），触发时统一回退整页树（kind = 'full', fullReason = 'diff_too_large'）。
 */

import { diffArrays } from 'diff'

export type SnapshotKind = 'full' | 'diff'

export type FullSnapshotReason = 'initial' | 'url_changed' | 'forced' | 'diff_too_large'

export interface PageSnapshot {
  url: string
  lines: string[]
  rev: number
}

export interface StateCacheUpdateOptions {
  /** 强制作为全量快照输出（如调用方显式指定 responseMode: 'full'） */
  forceFull?: boolean
}

export interface FullDiffResult {
  kind: 'full'
  /** 当前快照版本号（从 1 单调递增，reset 后归 0） */
  rev: number
  /** 触发全量输出的原因 */
  fullReason: FullSnapshotReason
  /** 上一次缓存的 URL */
  prevUrl: string
  /** 新增行数（`+ ` 行计数） */
  addedLines: number
  /** 删除行数（`- ` 行计数） */
  removedLines: number
  /** 全量输出时恒为空串 */
  diffText: ''
}

export interface IncrementalDiffResult {
  kind: 'diff'
  /** 当前快照版本号（从 1 单调递增，reset 后归 0） */
  rev: number
  /** 本次增量 diff 所基于的上一版快照 rev */
  baseRev: number
  /** 上一次缓存的 URL */
  prevUrl: string
  /** 新增行数（`+ ` 行计数） */
  addedLines: number
  /** 删除行数（`- ` 行计数） */
  removedLines: number
  /** 结构化 +/- 差异文本（无变化时为 `# (no changes)`） */
  diffText: string
}

export type DiffResult = FullDiffResult | IncrementalDiffResult

const MAX_CHANGE_LINE_RATIO = 0.5
const MAX_DIFF_CHAR_RATIO = 1.0
const MAX_ANCESTOR_CONTEXT_DEPTH = 2
/** 触发 O(N) 低重合快速预判的最小两侧中间变更区间行数之和 */
const FAST_ABORT_MIN_WINDOW_LINES = 200
/** Myers diffArrays 编辑距离硬上限区间，避免大列表倒序/全量改名阻塞主线程 */
const MIN_MYERS_EDIT_LENGTH = 250
const MAX_MYERS_EDIT_LENGTH = 800
export const NO_CHANGES_DIFF_TEXT = '# (no changes)'

/** 提取序列化 YAML 行中的稳定元素 #ref（兼容单 token 及空格分隔的多 token ARIA role，如 `button link #10` -> 10） */
const LINE_REF_RE = /^\s*-\s+[^["]+?\s+#(\d+)(?:\s|$)/

/** 提取无 #ref 行的 role 与可选名称（兼容 `- row`、`- row [selected]`、`- listitem "订单-3 运行中"`） */
const UNREF_ROLE_AND_NAME_RE = /^-\s+([^\s["]+)(?:\s+\[[^\]]*\])?(?:\s+"([^"]*)")?$/

interface ComparableLine {
  line: string
  trimmed: string
  indent: number
  /** 行内解析出的稳定 #ref（无 ref 时为 null），单次预计算避免重复正则解析 */
  ref: number | null
  /** 直接父节点在行数组中的下标（顶层节点为 -1），供 O(1) 祖先上下文查找 */
  parentIndex: number
  /** 最近一层严格更小缩进直接父节点的身份 key（带 #ref 用 `#N`，否则用 trimmed 文本；顶层为空串） */
  directParent: string
  /** 本行作为父节点时的身份 key */
  selfKey: string
  /** 快照内节点身份键：带 #ref 为 `#N`，无 #ref 为 `${directParent}\0${selfKey}` */
  identityKey: string
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

interface WrapperSideContext {
  candidates: IndexedLine[]
  comparable: ComparableLine[]
  byParentIdx: Map<number, IndexedLine[]>
  allChildrenByParent: Map<number, number[]>
  siblingPos: Map<number, number>
  unchangedToOther: Map<number, number>
  cancelled: Set<number>
}

interface OtherSideContext {
  comparable: ComparableLine[]
  byParentIdx: Map<number, IndexedLine[]>
  refKeys: Set<number>
  cancelled: Set<number>
}

interface AncestorRenderSide {
  comparable: ComparableLine[]
  lines: string[]
  emittedAncestors: Set<number>
  ownChangeIndices: Set<number>
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
 * 沿预计算的 parentIndex 链表向上跳转最多 MAX_ANCESTOR_CONTEXT_DEPTH 步（O(1)），返回从外层到内层排序的祖先下标。
 */
function findAncestorIndices(comparable: ComparableLine[], targetIdx: number): number[] {
  if (targetIdx < 0 || targetIdx >= comparable.length) return []
  const ancestors: number[] = []
  let cur = comparable[targetIdx].parentIndex
  while (cur !== -1 && ancestors.length < MAX_ANCESTOR_CONTEXT_DEPTH) {
    ancestors.push(cur)
    cur = comparable[cur].parentIndex
  }
  ancestors.reverse()
  return ancestors
}

/**
 * 为行数组单次 O(N) 预计算缩进、ref、parentIndex、直接父节点身份 key 与节点身份键：
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
    const identityKey = ref !== null ? selfKey : `${directParent}\0${selfKey}`
    stack.push({ index, indent, selfKey })
    return { line, trimmed, indent, ref, parentIndex, directParent, selfKey, identityKey }
  })
}

function buildRefKeySet(comparable: ComparableLine[]): Set<number> {
  const refKeys = new Set<number>()
  for (const comp of comparable) {
    if (comp.ref !== null) refKeys.add(comp.ref)
  }
  return refKeys
}

function buildTreeChildrenIndex(comparable: ComparableLine[]): {
  childrenByParent: Map<number, number[]>
  siblingPos: Map<number, number>
} {
  const childrenByParent = new Map<number, number[]>()
  const siblingPos = new Map<number, number>()
  for (let i = 0; i < comparable.length; i++) {
    const pIdx = comparable[i].parentIndex
    let list = childrenByParent.get(pIdx)
    if (!list) {
      list = []
      childrenByParent.set(pIdx, list)
    }
    siblingPos.set(i, list.length)
    list.push(i)
  }
  return { childrenByParent, siblingPos }
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

/** 通用多重集交集计数（O(L + R)） */
function countMultisetIntersection<T>(
  left: readonly T[],
  right: readonly T[],
  keyFn: (item: T) => string,
  leftStart = 0,
  leftEnd = left.length,
  rightStart = 0,
  rightEnd = right.length,
): number {
  if (leftStart >= leftEnd || rightStart >= rightEnd) return 0
  const counts = new Map<string, number>()
  for (let i = leftStart; i < leftEnd; i++) {
    const key = keyFn(left[i])
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  let matched = 0
  for (let i = rightStart; i < rightEnd; i++) {
    const key = keyFn(right[i])
    const remain = counts.get(key) ?? 0
    if (remain > 0) {
      counts.set(key, remain - 1)
      matched++
    }
  }
  return matched
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

function parseUnrefRoleAndName(trimmed: string): { role: string; name: string } | null {
  const match = UNREF_ROLE_AND_NAME_RE.exec(trimmed)
  if (!match) return null
  return { role: match[1], name: match[2] ?? '' }
}

/**
 * 计算两个无 #ref 父节点行的名称兼容分（仅在同 role 时有效）：
 * - 2：归一化词干完全一致（如 "购物车 (2)" 与 "购物车 (3)"、"Billing" 与 "Billing (1)"）
 * - 1：一方词干是另一方前缀（长度 >= 2），或行内拼装名称共享首段标识词（如 "订单-3 运行中" 与 "订单-3 已停止"）
 * - 0：无名称或名称无重叠
 */
function scoreUnrefNameSimilarity(prevName: string, currName: string): number {
  if (!prevName || !currName) return 0
  const prevStem = normalizeNameStem(prevName)
  const currStem = normalizeNameStem(currName)
  if (prevStem && currStem) {
    if (prevStem === currStem) return 2
    const shorter = prevStem.length <= currStem.length ? prevStem : currStem
    const longer = prevStem.length <= currStem.length ? currStem : prevStem
    if (shorter.length >= 2 && longer.startsWith(shorter)) return 1
  }
  // 兼容行内文本拼装容器名（如 "订单-3 运行中" vs "订单-3 已停止"）：首词一致即判为相关改名
  const prevHead = prevName.split(/\s+/)[0]
  const currHead = currName.split(/\s+/)[0]
  if (prevHead && prevHead === currHead) return 1
  return 0
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
 * 单方向包装层（Wrapper）插入/移除抵消（参数化复用，两侧仅传上下文对象）：
 * 1. 带 #ref 的节点若在对侧快照中原本已存在则跳过（避免把已有父节点改名并移入/移出子节点误判为包装层）；
 * 2. 利用 Myers 公共段建立的精确父节点映射（unchangedToOther），校验包装层父节点与旧直接子节点的父节点为同一节点（杜绝同名卡片跨父误抵消）；
 * 3. 利用包装层在同父级下左右最近未变更兄弟的映射边界，仅允许抵消落在该连续兄弟窗口内的对侧子节点（杜绝跨位置移动误抵消）；
 * 4. 若窗口内存在与 W 同 role 且名称兼容的对侧删除父节点，说明是原位改名容器而非新包装层，跳过。
 */
function cancelWrappedNodes(wrapper: WrapperSideContext, other: OtherSideContext): void {
  for (const w of wrapper.candidates) {
    if (wrapper.cancelled.has(w.index)) continue
    const wComp = wrapper.comparable[w.index]
    if (wComp.ref !== null && other.refKeys.has(wComp.ref)) continue

    // 精确映射包装层的父节点到对侧快照中的同一父节点下标
    const expectedOtherParentIdx =
      wComp.parentIndex === -1 ? -1 : wrapper.unchangedToOther.get(wComp.parentIndex)
    if (expectedOtherParentIdx === undefined) continue

    const wrappedChildren = (wrapper.byParentIdx.get(w.index) ?? []).filter(
      (item) => !wrapper.cancelled.has(item.index),
    )
    if (wrappedChildren.length === 0) continue

    // 计算 w 在同父兄弟序列中左右最近未变更兄弟对应的对侧下标窗口 (otherLowerBound, otherUpperBound)
    const siblings = wrapper.allChildrenByParent.get(wComp.parentIndex) ?? []
    const pos = wrapper.siblingPos.get(w.index)
    if (pos === undefined) continue

    let otherLowerBound = -1
    for (let i = pos - 1; i >= 0; i--) {
      const mapped = wrapper.unchangedToOther.get(siblings[i])
      if (mapped !== undefined) {
        otherLowerBound = mapped
        break
      }
    }
    let otherUpperBound = Number.POSITIVE_INFINITY
    for (let i = pos + 1; i < siblings.length; i++) {
      const mapped = wrapper.unchangedToOther.get(siblings[i])
      if (mapped !== undefined) {
        otherUpperBound = mapped
        break
      }
    }

    const otherChildren = (other.byParentIdx.get(expectedOtherParentIdx) ?? []).filter(
      (item) =>
        !other.cancelled.has(item.index) &&
        item.index > otherLowerBound &&
        item.index < otherUpperBound,
    )
    if (otherChildren.length === 0) continue

    // 防止窗口内已有无 #ref 父节点改名并将原兄弟节点移入其下被误当成新包装层
    if (wComp.ref === null) {
      const wMeta = parseUnrefRoleAndName(wComp.trimmed)
      if (wMeta && wMeta.name) {
        const hasRenamedCounterpartInWindow = otherChildren.some((item) => {
          const oComp = other.comparable[item.index]
          if (oComp.ref !== null) return false
          const oMeta = parseUnrefRoleAndName(oComp.trimmed)
          return (
            oMeta !== null &&
            oMeta.role === wMeta.role &&
            scoreUnrefNameSimilarity(oMeta.name, wMeta.name) > 0
          )
        })
        if (hasRenamedCounterpartInWindow) continue
      }
    }

    cancelByLcs(
      otherChildren,
      wrappedChildren,
      (item) => item.trimmed,
      other.cancelled,
      wrapper.cancelled,
    )
  }
}

/**
 * 在所有 Hunk 的变更全集上执行两类保序、保父级的安全抵消：
 * 1. 全局包装层（Wrapper）插入/移除识别（精确父节点映射 + 相邻兄弟窗口校验）；
 * 2. 全局父节点改名配对（按直接子节点整行建倒排索引，O(M) 生成共享子节点候选）+ 整行 LCS 抵消：
 *    - 带 #ref 父节点仅允许与同一 #ref 且外层父级兼容的节点配对；
 *    - 无 #ref 父节点要求同 role、同外层父级且共享整行相同直接子节点（兼容行内文案拼装如 `订单-3 运行中 → 订单-3 已停止` 及无名称 token 更新如 `- row → - row [selected]`），
 *      当双方有非空且不兼容名称时，若任一方存在同层名称更匹配的真身则拒绝错配（防止 Billing/Shipping 跨父交换或删除 X + 改名 Y 错配）。
 */
function cancelUnchangedGlobally(
  allRemoved: IndexedLine[],
  allAdded: IndexedLine[],
  prevComparable: ComparableLine[],
  currComparable: ComparableLine[],
  prevToCurrUnchanged: Map<number, number>,
  currToPrevUnchanged: Map<number, number>,
): {
  cancelledRem: Set<number>
  cancelledAdd: Set<number>
  pairedRenamedParentByCurrIdx: Map<number, number>
} {
  const cancelledRem = new Set<number>()
  const cancelledAdd = new Set<number>()

  const prevRefKeys = buildRefKeySet(prevComparable)
  const currRefKeys = buildRefKeySet(currComparable)
  const prevTreeIdx = buildTreeChildrenIndex(prevComparable)
  const currTreeIdx = buildTreeChildrenIndex(currComparable)
  const removedByParentIdx = groupByKey(allRemoved, (r) => prevComparable[r.index].parentIndex)
  const addedByParentIdx = groupByKey(allAdded, (a) => currComparable[a.index].parentIndex)

  // 1a. Wrapper 插入识别（curr 侧新增包装行 W）
  cancelWrappedNodes(
    {
      candidates: allAdded,
      comparable: currComparable,
      byParentIdx: addedByParentIdx,
      allChildrenByParent: currTreeIdx.childrenByParent,
      siblingPos: currTreeIdx.siblingPos,
      unchangedToOther: currToPrevUnchanged,
      cancelled: cancelledAdd,
    },
    {
      comparable: prevComparable,
      byParentIdx: removedByParentIdx,
      refKeys: prevRefKeys,
      cancelled: cancelledRem,
    },
  )

  // 1b. Wrapper 移除识别（prev 侧删除包装行 W）
  cancelWrappedNodes(
    {
      candidates: allRemoved,
      comparable: prevComparable,
      byParentIdx: removedByParentIdx,
      allChildrenByParent: prevTreeIdx.childrenByParent,
      siblingPos: prevTreeIdx.siblingPos,
      unchangedToOther: prevToCurrUnchanged,
      cancelled: cancelledRem,
    },
    {
      comparable: currComparable,
      byParentIdx: addedByParentIdx,
      refKeys: currRefKeys,
      cancelled: cancelledAdd,
    },
  )

  // 2. 全局父节点改名配对（按缩进由浅入深，借助子节点整行倒排索引 O(M) 生成候选）
  const remAfterWrap = allRemoved.filter((r) => !cancelledRem.has(r.index))
  const addAfterWrap = allAdded.filter((a) => !cancelledAdd.has(a.index))
  const remChildrenByParent = groupByKey(remAfterWrap, (r) => prevComparable[r.index].parentIndex)
  const addChildrenByParent = groupByKey(addAfterWrap, (a) => currComparable[a.index].parentIndex)

  const remByIndent = groupByKey(remAfterWrap, (r) => prevComparable[r.index].indent)
  const addByIndent = groupByKey(addAfterWrap, (a) => currComparable[a.index].indent)
  const indents = Array.from(new Set([...remByIndent.keys(), ...addByIndent.keys()])).sort((a, b) => a - b)

  const pairedPrevToCurr = new Map<number, number>()
  const pairedRenamedParentByCurrIdx = new Map<number, number>()

  const haveCompatibleOuterParent = (prevParentIdx: number, currParentIdx: number): boolean => {
    const rOuter = prevComparable[prevParentIdx].parentIndex
    const aOuter = currComparable[currParentIdx].parentIndex
    if (rOuter === -1 && aOuter === -1) return true
    if (rOuter === -1 || aOuter === -1) return false
    if (prevToCurrUnchanged.get(rOuter) === aOuter) return true
    if (pairedPrevToCurr.get(rOuter) === aOuter) return true
    return false
  }

  for (const indent of indents) {
    const remParents = (remByIndent.get(indent) ?? []).filter(
      (r) => !cancelledRem.has(r.index) && (remChildrenByParent.get(r.index)?.length ?? 0) > 0,
    )
    const addParents = (addByIndent.get(indent) ?? []).filter(
      (a) => !cancelledAdd.has(a.index) && (addChildrenByParent.get(a.index)?.length ?? 0) > 0,
    )
    if (remParents.length === 0 || addParents.length === 0) continue

    // 预解析当前缩进层父节点的 role/name 与归一化词干索引（用于快速识别是否存在明确同名真身）
    const remMetaMap = new Map<number, { role: string; name: string } | null>()
    const addMetaMap = new Map<number, { role: string; name: string } | null>()
    const remUnrefStemsByOuterRole = new Map<string, Set<string>>()
    const addUnrefStemsByOuterRole = new Map<string, Set<string>>()
    const remPosInLayer = new Map<number, number>()
    const addPosInLayer = new Map<number, number>()

    remParents.forEach((p, pos) => {
      remPosInLayer.set(p.index, pos)
      const comp = prevComparable[p.index]
      if (comp.ref === null) {
        const meta = parseUnrefRoleAndName(comp.trimmed)
        remMetaMap.set(p.index, meta)
        if (meta && meta.name) {
          const stem = normalizeNameStem(meta.name)
          if (stem) {
            const key = `${comp.parentIndex}\0${meta.role}`
            let set = remUnrefStemsByOuterRole.get(key)
            if (!set) {
              set = new Set()
              remUnrefStemsByOuterRole.set(key, set)
            }
            set.add(stem)
          }
        }
      }
    })

    // 按直接子节点整行文本建立倒排索引：childLine -> Map<addParentIdx, count>
    const addParentsByChildLine = new Map<string, Map<number, number>>()
    addParents.forEach((p, pos) => {
      addPosInLayer.set(p.index, pos)
      const comp = currComparable[p.index]
      if (comp.ref === null) {
        const meta = parseUnrefRoleAndName(comp.trimmed)
        addMetaMap.set(p.index, meta)
        if (meta && meta.name) {
          const stem = normalizeNameStem(meta.name)
          if (stem) {
            const key = `${comp.parentIndex}\0${meta.role}`
            let set = addUnrefStemsByOuterRole.get(key)
            if (!set) {
              set = new Set()
              addUnrefStemsByOuterRole.set(key, set)
            }
            set.add(stem)
          }
        }
      }
      const children = addChildrenByParent.get(p.index) ?? []
      for (const child of children) {
        if (cancelledAdd.has(child.index)) continue
        let parentCounts = addParentsByChildLine.get(child.line)
        if (!parentCounts) {
          parentCounts = new Map()
          addParentsByChildLine.set(child.line, parentCounts)
        }
        parentCounts.set(p.index, (parentCounts.get(p.index) ?? 0) + 1)
      }
    })

    const candidates: Array<{
      remIdx: number
      addIdx: number
      sharedChildren: number
      nameScore: number
      distance: number
    }> = []

    for (const rParent of remParents) {
      const rComp = prevComparable[rParent.index]
      const rChildren = (remChildrenByParent.get(rParent.index) ?? []).filter(
        (c) => !cancelledRem.has(c.index),
      )
      if (rChildren.length === 0) continue

      // 统计本 rParent 中各子行出现次数，再查倒排表累计与各 addParent 的多重集交集大小
      const rLineCounts = new Map<string, number>()
      for (const child of rChildren) {
        rLineCounts.set(child.line, (rLineCounts.get(child.line) ?? 0) + 1)
      }
      const sharedByAddParent = new Map<number, number>()
      for (const [line, rCount] of rLineCounts.entries()) {
        const addCounts = addParentsByChildLine.get(line)
        if (!addCounts) continue
        for (const [addIdx, aCount] of addCounts.entries()) {
          sharedByAddParent.set(
            addIdx,
            (sharedByAddParent.get(addIdx) ?? 0) + Math.min(rCount, aCount),
          )
        }
      }

      for (const [addIdx, sharedChildren] of sharedByAddParent.entries()) {
        const aComp = currComparable[addIdx]
        if (!haveCompatibleOuterParent(rParent.index, addIdx)) continue

        let nameScore = 0
        if (rComp.ref !== null || aComp.ref !== null) {
          // 带 #ref 的父节点仅允许与同一 #ref 配对
          if (rComp.ref !== aComp.ref) continue
          nameScore = 3
        } else {
          const rMeta = remMetaMap.get(rParent.index) ?? null
          const aMeta = addMetaMap.get(addIdx) ?? null
          if (!rMeta || !aMeta || rMeta.role !== aMeta.role) continue

          nameScore = scoreUnrefNameSimilarity(rMeta.name, aMeta.name)
          // 双方均有非空名称且名称完全不相关时（如 Billing vs Shipping(1)、X vs Y(3)）：
          // 若任一方在同外层父级下存在同词干的真身，则禁止跨容器错配；否则仅允许同相对原位改名
          if (rMeta.name && aMeta.name && nameScore === 0) {
            const rStem = normalizeNameStem(rMeta.name)
            const aStem = normalizeNameStem(aMeta.name)
            const rHasExactNameMatch =
              rStem !== '' &&
              (addUnrefStemsByOuterRole.get(`${aComp.parentIndex}\0${rMeta.role}`)?.has(rStem) ?? false)
            const aHasExactNameMatch =
              aStem !== '' &&
              (remUnrefStemsByOuterRole.get(`${rComp.parentIndex}\0${aMeta.role}`)?.has(aStem) ?? false)
            if (rHasExactNameMatch || aHasExactNameMatch) continue
            if (remPosInLayer.get(rParent.index) !== addPosInLayer.get(addIdx)) continue
          }
        }

        candidates.push({
          remIdx: rParent.index,
          addIdx,
          sharedChildren,
          nameScore,
          distance: Math.abs(rParent.index - addIdx),
        })
      }
    }

    // 排序：共享子节点数优先，其次名称兼容分，最后行号距离
    candidates.sort(
      (a, b) =>
        b.sharedChildren - a.sharedChildren ||
        b.nameScore - a.nameScore ||
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
      cancelByLcs(rSeq, aSeq, (item) => item.line, cancelledRem, cancelledAdd)
    }
  }

  return { cancelledRem, cancelledAdd, pairedRenamedParentByCurrIdx }
}

/**
 * 统一的祖先锚点输出 helper：按 O(1) parentIndex 向上追溯最多 MAX_ANCESTOR_CONTEXT_DEPTH 层并自动去重。
 */
function emitAncestorsFor(
  targetIdx: number,
  side: AncestorRenderSide,
  emittedTextsInHunk: Set<string>,
  outputLines: string[],
): void {
  const ancestorIndices = findAncestorIndices(side.comparable, targetIdx)
  for (const idx of ancestorIndices) {
    if (side.emittedAncestors.has(idx) || side.ownChangeIndices.has(idx)) continue
    side.emittedAncestors.add(idx)
    const text = side.lines[idx]
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

  const matched = countMultisetIntersection(
    prevComparable,
    currComparable,
    (item) => item.trimmed,
    prevStart,
    prevEnd,
    currStart,
    currEnd,
  )
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

  // 1. 剥离首尾完全相同（含 directParent 一致）的公共区间，缩小 Myers 输入规模并登记未变更行精确映射
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

  // 3. 带确定性编辑距离上限的 Myers 对比：将 (directParent, trimmed) 映射为整型 ID，
  //    消除百万次 JS comparator 回调与字符串重复比对，防止大列表倒序/全量改名阻塞主线程
  const maxEditLength = Math.max(MIN_MYERS_EDIT_LENGTH, Math.min(totalLines, MAX_MYERS_EDIT_LENGTH))
  const keyToId = new Map<string, number>()
  let nextKeyId = 0
  const internKey = (comp: ComparableLine): number => {
    const key = `${comp.directParent}\0${comp.trimmed}`
    let id = keyToId.get(key)
    if (id === undefined) {
      id = nextKeyId++
      keyToId.set(key, id)
    }
    return id
  }
  const prevIds = new Array<number>(prevEnd - prefixLen)
  for (let i = prefixLen; i < prevEnd; i++) {
    prevIds[i - prefixLen] = internKey(prevComparable[i])
  }
  const currIds = new Array<number>(currEnd - prefixLen)
  for (let i = prefixLen; i < currEnd; i++) {
    currIds[i - prefixLen] = internKey(currComparable[i])
  }
  const parts = diffArrays(prevIds, currIds, { maxEditLength })
  if (!parts) {
    return { diffText: '', addedLines: 0, removedLines: 0, abortedTooLarge: true }
  }

  // 建立新旧树未变更行的一一对应映射（前缀 + Myers 公共段 + 后缀），供全局包装层与父节点配对精确定位
  const prevToCurrUnchanged = new Map<number, number>()
  const currToPrevUnchanged = new Map<number, number>()
  for (let i = 0; i < prefixLen; i++) {
    prevToCurrUnchanged.set(i, i)
    currToPrevUnchanged.set(i, i)
  }
  const suffixLen = prevComparable.length - prevEnd
  for (let i = 0; i < suffixLen; i++) {
    prevToCurrUnchanged.set(prevEnd + i, currEnd + i)
    currToPrevUnchanged.set(currEnd + i, prevEnd + i)
  }

  const hunks: ChangeHunk[] = []
  const allRemoved: IndexedLine[] = []
  const allAdded: IndexedLine[] = []
  let prevCursor = prefixLen
  let currCursor = prefixLen
  let activeHunk: ChangeHunk | null = null

  for (const part of parts) {
    const count = part.value.length
    if (!part.added && !part.removed) {
      activeHunk = null
      for (let k = 0; k < count; k++) {
        prevToCurrUnchanged.set(prevCursor, currCursor)
        currToPrevUnchanged.set(currCursor, prevCursor)
        prevCursor++
        currCursor++
      }
      continue
    }

    if (!activeHunk) {
      activeHunk = { removed: [], added: [] }
      hunks.push(activeHunk)
    }

    if (part.removed) {
      for (let k = 0; k < count; k++) {
        const idx = prevCursor++
        const item = prevComparable[idx]
        const entry: IndexedLine = {
          index: idx,
          line: item.line,
          trimmed: item.trimmed,
          ref: item.ref,
        }
        activeHunk.removed.push(entry)
        allRemoved.push(entry)
      }
    } else if (part.added) {
      for (let k = 0; k < count; k++) {
        const idx = currCursor++
        const item = currComparable[idx]
        const entry: IndexedLine = {
          index: idx,
          line: item.line,
          trimmed: item.trimmed,
          ref: item.ref,
        }
        activeHunk.added.push(entry)
        allAdded.push(entry)
      }
    }
  }

  if (hunks.length === 0) {
    return { diffText: NO_CHANGES_DIFF_TEXT, addedLines: 0, removedLines: 0 }
  }

  // 4. 全局变更全集上统一执行 Wrapper 识别与父节点改名配对 LCS 抵消
  const { cancelledRem, cancelledAdd, pairedRenamedParentByCurrIdx } = cancelUnchangedGlobally(
    allRemoved,
    allAdded,
    prevComparable,
    currComparable,
    prevToCurrUnchanged,
    currToPrevUnchanged,
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

    // 5. 识别同 Hunk 内的同步配对项：同 #ref 唯一配对 或 已配对的改名父节点
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

    // 预计算每个新增项之后最近一个同步配对点对应的旧行下标，确保同区间内未配对删除行始终先于新增行输出
    const nextSyncRemLimit = new Array<number>(effectiveAdded.length).fill(Number.POSITIVE_INFINITY)
    let nextLimit = Number.POSITIVE_INFINITY
    for (let i = effectiveAdded.length - 1; i >= 0; i--) {
      const paired = pairedOldByAddIdx.get(effectiveAdded[i].index)
      if (paired) nextLimit = paired.index
      nextSyncRemLimit[i] = nextLimit
    }

    const prevSide: AncestorRenderSide = {
      comparable: prevComparable,
      lines: prevLines,
      emittedAncestors: emittedPrevAncestors,
      ownChangeIndices: new Set(effectiveRemoved.map((r) => r.index)),
    }
    const currSide: AncestorRenderSide = {
      comparable: currComparable,
      lines: currLines,
      emittedAncestors: emittedCurrAncestors,
      ownChangeIndices: new Set(effectiveAdded.map((a) => a.index)),
    }
    const emittedTextsInHunk = new Set<string>()
    const emittedRemovedInHunk = new Set<number>()

    const emitSingleRemoved = (rem: IndexedLine) => {
      if (emittedRemovedInHunk.has(rem.index)) return
      emittedRemovedInHunk.add(rem.index)
      emitAncestorsFor(rem.index, prevSide, emittedTextsInHunk, outputLines)
      emittedPrevAncestors.add(rem.index)
      outputLines.push(`- ${rem.line}`)
      removedLines++
    }

    const emitSingleAdded = (add: IndexedLine) => {
      emitAncestorsFor(add.index, currSide, emittedTextsInHunk, outputLines)
      emittedCurrAncestors.add(add.index)
      outputLines.push(`+ ${add.line}`)
      addedLines++
    }

    let rCursor = 0
    const flushUnpairedRemovedBefore = (limitRemIndex: number) => {
      while (rCursor < effectiveRemoved.length && effectiveRemoved[rCursor].index < limitRemIndex) {
        const rem = effectiveRemoved[rCursor++]
        if (!pairedRemIndices.has(rem.index)) {
          emitSingleRemoved(rem)
        }
      }
    }

    // 6. 按文档顺序交错输出：同区间内未配对删除行先于新增行，跨父移动复用单行输出 helper
    for (let i = 0; i < effectiveAdded.length; i++) {
      const add = effectiveAdded[i]
      const pairedOld = pairedOldByAddIdx.get(add.index)
      if (!pairedOld) {
        flushUnpairedRemovedBefore(nextSyncRemLimit[i])
        emitSingleAdded(add)
        continue
      }

      flushUnpairedRemovedBefore(pairedOld.index)

      const sameParent =
        prevComparable[pairedOld.index].directParent === currComparable[add.index].directParent
      if (sameParent && pairedOld.line === add.line) {
        emittedRemovedInHunk.add(pairedOld.index)
        emittedPrevAncestors.add(pairedOld.index)
        emittedCurrAncestors.add(add.index)
        continue
      }

      if (!sameParent) {
        emitSingleRemoved(pairedOld)
        emitSingleAdded(add)
      } else {
        emittedRemovedInHunk.add(pairedOld.index)
        emitAncestorsFor(add.index, currSide, emittedTextsInHunk, outputLines)
        emittedPrevAncestors.add(pairedOld.index)
        emittedCurrAncestors.add(add.index)
        outputLines.push(`- ${pairedOld.line}`)
        outputLines.push(`+ ${add.line}`)
        removedLines++
        addedLines++
      }
    }

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
  ): FullDiffResult {
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
      this.prev = { url, lines: currLines, rev: nextRev }
      return this.makeFullResult(nextRev, fullReason ?? 'initial', prevUrl)
    }

    const { diffText, addedLines, removedLines, abortedTooLarge } = computeStructuredYamlDiff(
      prevSnapshot.lines,
      currLines,
    )

    // 三项熔断保护：前置快速预判/超限、变化行超过半数、diff 文本体积达到/超过整页树，任一命中均回退整页树
    const hasChanges = addedLines > 0 || removedLines > 0
    const totalLines = Math.max(prevSnapshot.lines.length, currLines.length)
    const changedLineRatio = totalLines > 0 ? Math.max(addedLines, removedLines) / totalLines : 0
    const isDiffTooLarge =
      abortedTooLarge ||
      (hasChanges &&
        (changedLineRatio > MAX_CHANGE_LINE_RATIO ||
          (yaml.length > 0 && diffText.length >= yaml.length * MAX_DIFF_CHAR_RATIO)))

    this.prev = { url, lines: currLines, rev: nextRev }

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
