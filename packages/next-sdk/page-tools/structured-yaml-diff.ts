/**
 * structured-yaml-diff.ts
 *
 * 无障碍 YAML 树的结构感知增量 Diff 纯函数模块：
 * 1. 首尾公共行剥离 + O(N) 低重合快速预判 + Myers 整型键对比与编辑距离上限保护（阈值由 PageStateCache 注入）；
 * 2. 在全局变更全集上执行：
 *    - 包装层（Wrapper）插入/移除抵消：依赖 Myers 公共段建立的新旧精确父节点映射与相邻兄弟窗口，
 *      跳过对侧已有容器（含拆包上移容器与原位改名容器），绝不吞掉跨父/跨位置移动；
 *    - 父节点改名配对（倒排索引 O(M) 候选生成 + 共享子节点与名称兼容排序）+ 整行 LCS 抵消，
 *      兼容行内文案拼装、含转义引号名称、多 token 与无名称 token 更新；
 * 3. 按文档顺序交错输出未配对删除行（位于新增行之前）、新增行与同步配对项，并沿预计算 `parentIndex`
 *    以 O(1) 为每行按需补全去重后的最小父级缩进锚点（跨父移动时强制分别补齐旧父级与新父级锚点）。
 */

import { diffArrays } from 'diff'

const MAX_ANCESTOR_CONTEXT_DEPTH = 2
/** 同 #ref 精确配对分值（高于 scoreUnrefNameSimilarity 的所有无 #ref 分值 0..2） */
const REF_EXACT_PAIR_SCORE = 3
export const NO_CHANGES_DIFF_TEXT = '# (no changes)'

/** 提取序列化 YAML 行中的稳定元素 #ref（兼容单 token 及空格分隔的多 token ARIA role，如 `button link #10` -> 10） */
const LINE_REF_RE = /^\s*-\s+[^["]+?\s+#(\d+)(?:\s|$)/

/**
 * 提取无 #ref 行的 role 与可选名称：
 * - 兼容 0 或多个 `[token]`，且 token 引号内允许转义字符及 `]`（如 `[tooltip="a]b"]`）
 * - 名称引号内允许转义字符（如 `"订单 \"A\" (2)"`）
 */
const UNREF_ROLE_AND_NAME_RE =
  /^-\s+([^\s["]+)(?:\s+\[(?:[^\]"\\]|\\.|"(?:[^"\\]|\\.)*")*\])*(?:\s+"((?:[^"\\]|\\.)*)")?$/

export interface StructuredDiffOptions {
  /** 变更行数占比熔断阈值（默认 0.5） */
  maxChangeLineRatio?: number
  /** 触发 O(N) 低重合快速预判的最小两侧中间变更区间行数之和（默认 200） */
  fastAbortMinWindowLines?: number
  /** Myers 编辑距离上限下界（默认 250） */
  minMyersEditLength?: number
  /** Myers 编辑距离上限上界（默认 800） */
  maxMyersEditLength?: number
}

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
  allChildrenByParent: Map<number, number[]>
  changedTrimmedSet: Set<string>
  refKeys: Set<number>
  cancelled: Set<number>
}

interface AncestorRenderSide {
  comparable: ComparableLine[]
  lines: string[]
  /** 记录本侧所有已输出行的下标（含祖先锚点行与变更行自身），用于常规去重 */
  emittedIndices: Set<number>
  ownChangeIndices: Set<number>
}

export interface StructuredDiffOutput {
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
 * 为行数组单次 O(N) 预计算缩进、ref、parentIndex 与直接父节点身份 key：
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
    return { line, trimmed, indent, ref, parentIndex, directParent }
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
 * 计算两个无 #ref 父节点行的名称兼容分（同 role 前提下，与 REF_EXACT_PAIR_SCORE = 3 组成统一排序分值体系）：
 * - 3（REF_EXACT_PAIR_SCORE）：带 #ref 的同编号精确配对（高于所有无 #ref 分值）
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
 * 为某一缩进层的候选父节点预解析无 #ref 的 role/name、归一化词干索引（按 `${outerParent}\0${role}` 分桶）及层内序号。
 */
function buildUnrefParentLayerIndex(
  parents: IndexedLine[],
  comparable: ComparableLine[],
): {
  metaMap: Map<number, { role: string; name: string } | null>
  stemsByOuterRole: Map<string, Set<string>>
  posInLayer: Map<number, number>
} {
  const metaMap = new Map<number, { role: string; name: string } | null>()
  const stemsByOuterRole = new Map<string, Set<string>>()
  const posInLayer = new Map<number, number>()

  parents.forEach((p, pos) => {
    posInLayer.set(p.index, pos)
    const comp = comparable[p.index]
    if (comp.ref !== null) return
    const meta = parseUnrefRoleAndName(comp.trimmed)
    metaMap.set(p.index, meta)
    if (!meta || !meta.name) return
    const stem = normalizeNameStem(meta.name)
    if (!stem) return
    const key = `${comp.parentIndex}\0${meta.role}`
    let set = stemsByOuterRole.get(key)
    if (!set) {
      set = new Set()
      stemsByOuterRole.set(key, set)
    }
    set.add(stem)
  })

  return { metaMap, stemsByOuterRole, posInLayer }
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
 * 2. 无 #ref 的候选 W 若对侧变更集中已存在相同 trimmed 文本（如移除外层包装后上移的已有容器），跳过；
 * 3. 利用 Myers 公共段建立的精确父节点映射（unchangedToOther），校验包装层父节点与旧直接子节点的父节点为同一节点（杜绝同名卡片跨父误抵消）；
 * 4. 利用包装层在同父级下左右最近未变更兄弟的映射边界，仅允许抵消落在该连续兄弟窗口内的对侧子节点（杜绝跨位置移动误抵消）；
 * 5. 若窗口内存在与 W 同 role、未进入 W 直接子节点且本身为容器或具名节点的无 #ref 变更节点（如原位改名为不相似名称的容器），跳过并交由改名配对处理。
 */
function cancelWrappedNodes(wrapper: WrapperSideContext, other: OtherSideContext): void {
  for (const w of wrapper.candidates) {
    if (wrapper.cancelled.has(w.index)) continue
    const wComp = wrapper.comparable[w.index]
    if (wComp.ref !== null) {
      if (other.refKeys.has(wComp.ref)) continue
    } else if (other.changedTrimmedSet.has(wComp.trimmed)) {
      // 对侧变更集中已有相同 trimmed 的节点（例如拆外层包装后上移的已有容器），并非新包装层
      continue
    }

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

    // 防止窗口内已有无 #ref 容器原位改名（即使名称不相似，如 "待处理" → "已完成"）同时移入/移出相邻节点时被误判为新包装层；
    // 通过排除已在 wrappedChildren 中出现的 trimmed，避免误伤「generic 包装层包住同 role 的 generic 子节点」场景
    if (wComp.ref === null) {
      const wMeta = parseUnrefRoleAndName(wComp.trimmed)
      if (wMeta) {
        const wrappedChildTrimmed = new Set(wrappedChildren.map((c) => c.trimmed))
        const hasSameRoleContainerCounterpart = otherChildren.some((item) => {
          const oComp = other.comparable[item.index]
          if (oComp.ref !== null || wrappedChildTrimmed.has(oComp.trimmed)) return false
          const oMeta = parseUnrefRoleAndName(oComp.trimmed)
          if (!oMeta || oMeta.role !== wMeta.role) return false
          return (
            other.allChildrenByParent.has(item.index) ||
            (wMeta.name !== '' && oMeta.name !== '')
          )
        })
        if (hasSameRoleContainerCounterpart) continue
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
 * 1. 全局包装层（Wrapper）插入/移除识别（精确父节点映射 + 相邻兄弟窗口 + 已有/改名容器守卫）；
 * 2. 全局父节点改名配对（按直接子节点整行建倒排索引，O(M) 生成共享子节点候选）+ 整行 LCS 抵消：
 *    - 带 #ref 父节点仅允许与同一 #ref 且外层父级兼容的节点配对；
 *    - 无 #ref 父节点要求同 role、同外层父级且共享整行相同直接子节点（兼容行内文案拼装如 `订单-3 运行中 → 订单-3 已停止` 及无名称 token 更新如 `- row → - row [selected]`），
 *      当双方有非空且不兼容名称时，若任一方存在同层名称更匹配的真身则拒绝错配，否则仅允许同相对原位改名。
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
  const removedTrimmedSet = new Set(allRemoved.map((r) => r.trimmed))
  const addedTrimmedSet = new Set(allAdded.map((a) => a.trimmed))

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
      allChildrenByParent: prevTreeIdx.childrenByParent,
      changedTrimmedSet: removedTrimmedSet,
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
      allChildrenByParent: currTreeIdx.childrenByParent,
      changedTrimmedSet: addedTrimmedSet,
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

    const {
      metaMap: remMetaMap,
      stemsByOuterRole: remUnrefStemsByOuterRole,
      posInLayer: remPosInLayer,
    } = buildUnrefParentLayerIndex(remParents, prevComparable)
    const {
      metaMap: addMetaMap,
      stemsByOuterRole: addUnrefStemsByOuterRole,
      posInLayer: addPosInLayer,
    } = buildUnrefParentLayerIndex(addParents, currComparable)

    // 按直接子节点整行文本建立倒排索引：childLine -> Map<addParentIdx, count>
    const addParentsByChildLine = new Map<string, Map<number, number>>()
    for (const p of addParents) {
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
    }

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
          nameScore = REF_EXACT_PAIR_SCORE
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
 * 当 `forceDirectParent === true`（跨父移动场景）时，即使直接父节点本身是本 hunk 变更行或先前已输出，
 * 也会在目标行前补出其当前锚点（避免紧跟在另一侧父级上下文下方导致移动去向不可读）。
 */
function emitAncestorsFor(
  targetIdx: number,
  side: AncestorRenderSide,
  emittedTextsInHunk: Set<string>,
  outputLines: string[],
  forceDirectParent = false,
): void {
  const ancestorIndices = findAncestorIndices(side.comparable, targetIdx)
  const directParentIdx = side.comparable[targetIdx]?.parentIndex ?? -1

  for (const idx of ancestorIndices) {
    const text = side.lines[idx]
    const anchorLine = `  ${text}`
    if (forceDirectParent && idx === directParentIdx) {
      side.emittedIndices.add(idx)
      emittedTextsInHunk.add(text.trimStart())
      if (outputLines[outputLines.length - 1] !== anchorLine) {
        outputLines.push(anchorLine)
      }
      continue
    }
    if (side.emittedIndices.has(idx) || side.ownChangeIndices.has(idx)) continue
    side.emittedIndices.add(idx)
    const key = text.trimStart()
    if (!emittedTextsInHunk.has(key)) {
      emittedTextsInHunk.add(key)
      outputLines.push(anchorLine)
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
  prefixLen: number,
  prevEnd: number,
  currEnd: number,
  totalLines: number,
  fastAbortMinWindowLines: number,
  maxChangeLineRatio: number,
): boolean {
  const midPrevLen = prevEnd - prefixLen
  const midCurrLen = currEnd - prefixLen
  if (midPrevLen + midCurrLen < fastAbortMinWindowLines || totalLines === 0) return false

  const counts = new Map<string, number>()
  for (let i = prefixLen; i < prevEnd; i++) {
    const key = prevComparable[i].trimmed
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  let matched = 0
  for (let i = prefixLen; i < currEnd; i++) {
    const key = currComparable[i].trimmed
    const remain = counts.get(key) ?? 0
    if (remain > 0) {
      counts.set(key, remain - 1)
      matched++
    }
  }

  const minChangedLines = Math.max(midPrevLen - matched, midCurrLen - matched)
  return minChangedLines / totalLines > maxChangeLineRatio
}

/**
 * 构建结构感知的增量 Diff
 */
export function computeStructuredYamlDiff(
  prevLines: string[],
  currLines: string[],
  options: StructuredDiffOptions = {},
): StructuredDiffOutput {
  const {
    maxChangeLineRatio = 0.5,
    fastAbortMinWindowLines = 200,
    minMyersEditLength = 250,
    maxMyersEditLength = 800,
  } = options

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
      currEnd,
      totalLines,
      fastAbortMinWindowLines,
      maxChangeLineRatio,
    )
  ) {
    return { diffText: '', addedLines: 0, removedLines: 0, abortedTooLarge: true }
  }

  // 3. 带确定性编辑距离上限的 Myers 对比：将 (directParent, trimmed) 映射为整型 ID，
  //    消除百万次 JS comparator 回调与字符串重复比对，防止大列表倒序/全量改名阻塞主线程
  const maxEditLength = Math.max(minMyersEditLength, Math.min(totalLines, maxMyersEditLength))
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
  const emittedCurrIndices = new Set<number>()
  const emittedPrevIndices = new Set<number>()
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
      emittedIndices: emittedPrevIndices,
      ownChangeIndices: new Set(effectiveRemoved.map((r) => r.index)),
    }
    const currSide: AncestorRenderSide = {
      comparable: currComparable,
      lines: currLines,
      emittedIndices: emittedCurrIndices,
      ownChangeIndices: new Set(effectiveAdded.map((a) => a.index)),
    }
    const emittedTextsInHunk = new Set<string>()
    const emittedRemovedInHunk = new Set<number>()

    const appendRemovedLine = (rem: IndexedLine) => {
      emittedRemovedInHunk.add(rem.index)
      emittedPrevIndices.add(rem.index)
      outputLines.push(`- ${rem.line}`)
      removedLines++
    }

    const appendAddedLine = (add: IndexedLine) => {
      emittedCurrIndices.add(add.index)
      outputLines.push(`+ ${add.line}`)
      addedLines++
    }

    const emitSingleRemoved = (rem: IndexedLine, forceDirectParent = false) => {
      if (emittedRemovedInHunk.has(rem.index)) return
      emitAncestorsFor(rem.index, prevSide, emittedTextsInHunk, outputLines, forceDirectParent)
      appendRemovedLine(rem)
    }

    const emitSingleAdded = (add: IndexedLine, forceDirectParent = false) => {
      emitAncestorsFor(add.index, currSide, emittedTextsInHunk, outputLines, forceDirectParent)
      appendAddedLine(add)
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

    // 6. 按文档顺序交错输出：同区间内未配对删除行先于新增行；
    //    跨父移动强制分别补齐旧父级与新父级锚点，同父改写复用统一登记 helper
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
        emittedPrevIndices.add(pairedOld.index)
        emittedCurrIndices.add(add.index)
        continue
      }

      if (!sameParent) {
        emitSingleRemoved(pairedOld, true)
        emitSingleAdded(add, true)
      } else {
        emitAncestorsFor(add.index, currSide, emittedTextsInHunk, outputLines)
        appendRemovedLine(pairedOld)
        appendAddedLine(add)
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
