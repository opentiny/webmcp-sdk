/**
 * structured-yaml-diff.ts
 *
 * 无障碍 YAML 树的结构感知增量 Diff 纯函数模块：
 * 1. 首尾公共行剥离 + O(N) 低重合快速预判 + Myers 整型键对比与编辑距离上限保护（阈值由 PageStateCache 集中注入）；
 * 2. 在全局变更全集上执行 `cancelWrapperAndRenamedParentShifts`：
 *    - 无 #ref 包装层（Wrapper）插入/移除抵消：依赖 Myers 公共段建立的新旧精确父节点映射与相邻兄弟窗口，
 *      跳过窗口内对侧已有容器（含拆包上移容器与原位改名容器）及带 #ref 交互容器，绝不吞掉跨父/跨位置移动；
 *    - 父节点改名配对（倒排索引 O(M) 候选生成 + 共享子节点与名称兼容排序）+ 整行 LCS 抵消，
 *      兼容行内文案拼装、含转义引号名称、多 token 与无名称 token 更新；
 * 3. 维护单调缩进上下文栈 `activeStack` 按文档顺序输出：同父同缩进修改紧邻成对输出，跨父移动与缩进平移按各自
 *    父级文档位置自然输出，自动去重且外层祖先变化时联动补齐内层祖先，绝不把已删除/旧名称父节点当上下文输出。
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

/** 熔断策略配置（所有阈值均由调用方 PageStateCache 集中定义并必填传入） */
export interface StructuredDiffOptions {
  /** 变更行数占比熔断阈值 */
  maxChangeLineRatio: number
  /** 触发 O(N) 低重合快速预判的最小两侧中间变更区间行数之和 */
  fastAbortMinWindowLines: number
  /** Myers 编辑距离上限下界 */
  minMyersEditLength: number
  /** Myers 编辑距离上限上界 */
  maxMyersEditLength: number
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
  /** 对侧变更行按 trimmed 分桶后的下标列表，用于限定在兄弟窗口内检查已有容器 */
  changedIndicesByTrimmed: Map<string, number[]>
  cancelled: Set<number>
}

interface ContextEntry {
  indent: number
  /** 规范化节点身份键（curr 树存在对应节点时用 `curr:${currIdx}`，仅旧树存在时用 `prev:${prevIdx}`） */
  nodeKey: string
  /** 是否由 `- ` 删除行压栈；删除行仅可匹配旧侧子删除行，不可满足 curr 侧祖先匹配 */
  fromRemoved: boolean
}

interface ResolvedAncestorEntry {
  indent: number
  line: string
  nodeKey: string
  /** 是否跳过 `  ` 上下文行输出（如已删除旧父节点或已作为纯新增 `+` 行输出的新包装容器） */
  skipContext: boolean
}

export interface DiffContextTrackerInput {
  prevComparable: ComparableLine[]
  currComparable: ComparableLine[]
  prevToCurrUnchanged: Map<number, number>
  pairedPrevToCurr: Map<number, number>
  currUniqueRefIdx: Map<number, number>
  effectiveRemovedAll: Set<number>
}

const currNodeKey = (idx: number): string => `curr:${idx}`
const prevNodeKey = (idx: number): string => `prev:${idx}`
const outerRoleKey = (parentIndex: number, role: string): string => `${parentIndex}\0${role}`

function pushMapItem<K, V>(map: Map<K, V[]>, key: K, value: V): V[] {
  let list = map.get(key)
  if (!list) {
    list = []
    map.set(key, list)
  }
  list.push(value)
  return list
}

function getOrCreateMap<K, V>(map: Map<K, V>, key: K, create: () => V): V {
  let val = map.get(key)
  if (val === undefined) {
    val = create()
    map.set(key, val)
  }
  return val
}

function filterUncancelled(items: readonly IndexedLine[] | undefined, cancelled: Set<number>): IndexedLine[] {
  if (!items || items.length === 0) return []
  return items.filter((item) => !cancelled.has(item.index))
}

/**
 * 独立可测的单调缩进上下文栈管理器：
 * - 记录输出流中已呈现给读者的祖先链，按 `(indent, nodeKey)` 节点身份匹配而非文本匹配；
 * - 区分 `- ` 删除行（`fromRemoved: true`）与当前侧行，避免新行误挂到已删除同名父节点下；
 * - 补齐锚点时仅输出与当前栈分叉之后的层级；已删除旧父节点与已输出的纯新增包装层不以 `  ` 上下文行重复输出。
 */
export class DiffContextTracker {
  private readonly stack: ContextEntry[] = []
  private readonly emittedPureAddedCurrIndices = new Set<number>()
  private readonly input: DiffContextTrackerInput

  constructor(input: DiffContextTrackerInput) {
    this.input = input
  }

  private push(indent: number, nodeKey: string, fromRemoved: boolean): void {
    while (this.stack.length > 0 && this.stack[this.stack.length - 1].indent >= indent) {
      this.stack.pop()
    }
    this.stack.push({ indent, nodeKey, fromRemoved })
  }

  private resolvePrevNodeKey(prevIdx: number): { nodeKey: string; mappedCurrIdx?: number } {
    const unchangedCurr = this.input.prevToCurrUnchanged.get(prevIdx)
    if (unchangedCurr !== undefined) {
      return { nodeKey: currNodeKey(unchangedCurr), mappedCurrIdx: unchangedCurr }
    }
    const prevComp = this.input.prevComparable[prevIdx]
    const mappedCurrIdx =
      this.input.pairedPrevToCurr.get(prevIdx) ??
      (prevComp.ref !== null ? this.input.currUniqueRefIdx.get(prevComp.ref) : undefined)
    if (mappedCurrIdx !== undefined && this.input.currComparable[mappedCurrIdx].indent === prevComp.indent) {
      return { nodeKey: currNodeKey(mappedCurrIdx), mappedCurrIdx }
    }
    return { nodeKey: prevNodeKey(prevIdx) }
  }

  private resolveAncestor(idx: number, side: 'prev' | 'curr', isDirectParent: boolean): ResolvedAncestorEntry {
    if (side === 'curr') {
      const comp = this.input.currComparable[idx]
      // 非直接父节点的纯新增已输出容器（如外层 `+ - generic "计算中..."`）不再以 `  ` 上下文行重复输出
      const skipContext = !isDirectParent && this.emittedPureAddedCurrIndices.has(idx)
      return { indent: comp.indent, line: comp.line, nodeKey: currNodeKey(idx), skipContext }
    }
    const prevComp = this.input.prevComparable[idx]
    const { nodeKey, mappedCurrIdx } = this.resolvePrevNodeKey(idx)
    if (mappedCurrIdx !== undefined) {
      const currComp = this.input.currComparable[mappedCurrIdx]
      return { indent: currComp.indent, line: currComp.line, nodeKey, skipContext: false }
    }
    const deleted = this.input.effectiveRemovedAll.has(idx)
    return { indent: prevComp.indent, line: prevComp.line, nodeKey, skipContext: deleted }
  }

  private matchesEntry(entry: ContextEntry, want: ResolvedAncestorEntry, side: 'prev' | 'curr'): boolean {
    if (side === 'curr' && entry.fromRemoved) return false
    return entry.indent === want.indent && entry.nodeKey === want.nodeKey
  }

  /** 记录输出了一行 `- ` 删除行 */
  recordRemoved(prevIdx: number): void {
    const comp = this.input.prevComparable[prevIdx]
    const { nodeKey } = this.resolvePrevNodeKey(prevIdx)
    this.push(comp.indent, nodeKey, true)
  }

  /** 记录输出了一行 `+ ` 新增行；isPureAdd 标记其为无旧侧对应的纯新增行 */
  recordAdded(currIdx: number, isPureAdd: boolean): void {
    const comp = this.input.currComparable[currIdx]
    if (isPureAdd) {
      this.emittedPureAddedCurrIndices.add(currIdx)
    }
    this.push(comp.indent, currNodeKey(currIdx), false)
  }

  /** 为目标行补齐缺失的祖先锚点行，并写入 outputLines */
  ensureAncestors(targetIdx: number, side: 'prev' | 'curr', outputLines: string[]): void {
    const comparable = side === 'prev' ? this.input.prevComparable : this.input.currComparable
    const targetIndent = comparable[targetIdx].indent
    const ancestorIndices = findAncestorIndices(comparable, targetIdx)
    if (ancestorIndices.length === 0) return

    const desired = ancestorIndices.map((idx, pos) =>
      this.resolveAncestor(idx, side, pos === ancestorIndices.length - 1),
    )

    const currentChain = this.stack.filter((entry) => entry.indent < targetIndent)

    // 逐层向下定位第一个与 currentChain 分叉的祖先层级，分叉点及之后的内层祖先一并补齐
    let matchedPrefix = 0
    let chainPos = 0
    for (let k = 0; k < desired.length; k++) {
      let foundAt = -1
      for (let j = chainPos; j < currentChain.length; j++) {
        if (this.matchesEntry(currentChain[j], desired[k], side)) {
          foundAt = j
          break
        }
      }
      if (foundAt !== -1) {
        matchedPrefix = k + 1
        chainPos = foundAt + 1
      } else {
        break
      }
    }

    // 若 desired 各层均已在 currentChain 中命中，但 currentChain 末尾还挂着更深的内层祖先，
    // 则回退 1 层重出直接父级锚点，明确上下文已切回该父级
    if (matchedPrefix === desired.length) {
      const lastDesired = desired[desired.length - 1]
      const tailOfChain = currentChain[currentChain.length - 1]
      if (tailOfChain && !this.matchesEntry(tailOfChain, lastDesired, side)) {
        matchedPrefix = desired.length - 1
      }
    }

    for (let k = matchedPrefix; k < desired.length; k++) {
      const anc = desired[k]
      if (!anc.skipContext) {
        outputLines.push(`  ${anc.line}`)
      }
      // 跳过纯新增外层包装行输出时仍恢复其逻辑栈位，避免后续同级兄弟反复分叉重出内层祖先
      if (!anc.skipContext || side === 'curr') {
        this.push(anc.indent, anc.nodeKey, false)
      }
    }
  }
}

export interface StructuredDiffOutput {
  diffText: string
  addedLines: number
  removedLines: number
  abortedTooLarge?: boolean
}

function createNoChangesOutput(): StructuredDiffOutput {
  return { diffText: NO_CHANGES_DIFF_TEXT, addedLines: 0, removedLines: 0 }
}

function createAbortedTooLargeOutput(): StructuredDiffOutput {
  return { diffText: '', addedLines: 0, removedLines: 0, abortedTooLarge: true }
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

function buildTreeChildrenIndex(comparable: ComparableLine[]): {
  childrenByParent: Map<number, number[]>
  siblingPos: Map<number, number>
} {
  const childrenByParent = new Map<number, number[]>()
  const siblingPos = new Map<number, number>()
  for (let i = 0; i < comparable.length; i++) {
    const list = pushMapItem(childrenByParent, comparable[i].parentIndex, i)
    siblingPos.set(i, list.length - 1)
  }
  return { childrenByParent, siblingPos }
}

function buildChangedIndicesByTrimmed(items: IndexedLine[]): Map<string, number[]> {
  const map = new Map<string, number[]>()
  for (const item of items) {
    pushMapItem(map, item.trimmed, item.index)
  }
  return map
}

function groupByKey<K>(items: IndexedLine[], keyFn: (item: IndexedLine) => K): Map<K, IndexedLine[]> {
  const map = new Map<K, IndexedLine[]>()
  for (const item of items) {
    pushMapItem(map, keyFn(item), item)
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
    getOrCreateMap(stemsByOuterRole, outerRoleKey(comp.parentIndex, meta.role), () => new Set()).add(stem)
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
  onMatch?: (remItem: IndexedLine, addItem: IndexedLine) => void,
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
        const remItem = remSeq[rIdx++]
        const addItem = addSeq[aIdx++]
        cancelledRem.add(remItem.index)
        cancelledAdd.add(addItem.index)
        onMatch?.(remItem, addItem)
      }
    }
  }
}

interface IdenticalSiblingLayerContext {
  prevComparable: ComparableLine[]
  currComparable: ComparableLine[]
  prevChildrenByParent: Map<number, number[]>
  prevToCurrUnchanged: Map<number, number>
  currToPrevUnchanged: Map<number, number>
  pairedPrevToCurr: Map<number, number>
  cancelledRem: Set<number>
  cancelledAdd: Set<number>
}

/**
 * 在同一缩进层内，针对外层父节点已确认未变更（prevToCurrUnchanged）的直接子节点，
 * 按已锚定未变更兄弟切分出的连续兄弟区间逐段执行整行 LCS 抵消：
 * - 典型场景：容器跨父移动（如 group "C" 从 list "A" 移入 list "B"）时，Myers 优先匹配移动子树
 *   而将未变化的目标父节点 list "B"（及可能伴随拆开的未变化子节点）拆进两个 Hunk；
 * - 仅在两侧位于同一对未变更兄弟锚点之间时才允许抵消，严格保证不吞掉任何同父重排。
 */
function cancelIdenticalSiblingsInLayer(
  remLayerNodes: IndexedLine[],
  addLayerNodes: IndexedLine[],
  ctx: IdenticalSiblingLayerContext,
): void {
  if (remLayerNodes.length === 0 || addLayerNodes.length === 0) return
  const {
    prevComparable,
    currComparable,
    prevChildrenByParent,
    prevToCurrUnchanged,
    currToPrevUnchanged,
    pairedPrevToCurr,
    cancelledRem,
    cancelledAdd,
  } = ctx

  const remByCurrOuter = new Map<number, { prevOuter: number; items: IndexedLine[] }>()
  for (const r of remLayerNodes) {
    const prevOuter = prevComparable[r.index].parentIndex
    const currOuter = prevOuter === -1 ? -1 : prevToCurrUnchanged.get(prevOuter)
    if (currOuter === undefined) continue
    let group = remByCurrOuter.get(currOuter)
    if (!group) {
      group = { prevOuter, items: [] }
      remByCurrOuter.set(currOuter, group)
    }
    group.items.push(r)
  }

  const addByCurrOuter = groupByKey(addLayerNodes, (a) => currComparable[a.index].parentIndex)

  for (const [currOuter, { prevOuter, items: remItems }] of remByCurrOuter.entries()) {
    const addItems = addByCurrOuter.get(currOuter)
    if (!addItems || addItems.length === 0) continue

    // 收集该外层父节点下所有未变更直接兄弟锚点，按单调递增顺序将两侧切成 K+1 个对应兄弟区间
    const prevAllChildren = prevChildrenByParent.get(prevOuter) ?? []
    const anchors: Array<{ prevIdx: number; currIdx: number }> = []
    for (const pChildIdx of prevAllChildren) {
      const mappedCurrIdx = prevToCurrUnchanged.get(pChildIdx)
      if (
        mappedCurrIdx !== undefined &&
        currComparable[mappedCurrIdx].parentIndex === currOuter
      ) {
        anchors.push({ prevIdx: pChildIdx, currIdx: mappedCurrIdx })
      }
    }

    let rPos = 0
    let aPos = 0
    for (let seg = 0; seg <= anchors.length; seg++) {
      const prevUpper = seg < anchors.length ? anchors[seg].prevIdx : Number.POSITIVE_INFINITY
      const currUpper = seg < anchors.length ? anchors[seg].currIdx : Number.POSITIVE_INFINITY

      const segRem: IndexedLine[] = []
      while (rPos < remItems.length && remItems[rPos].index < prevUpper) {
        segRem.push(remItems[rPos++])
      }
      const segAdd: IndexedLine[] = []
      while (aPos < addItems.length && addItems[aPos].index < currUpper) {
        segAdd.push(addItems[aPos++])
      }

      if (segRem.length > 0 && segAdd.length > 0) {
        cancelByLcs(segRem, segAdd, (item) => item.line, cancelledRem, cancelledAdd, (r, a) => {
          prevToCurrUnchanged.set(r.index, a.index)
          currToPrevUnchanged.set(a.index, r.index)
          pairedPrevToCurr.set(r.index, a.index)
        })
      }
    }
  }
}

/**
 * 单方向无交互包装层（Wrapper）插入/移除抵消（参数化复用，两侧仅传上下文对象）：
 * 1. 带 #ref 的交互容器不作为纯包装层折叠（与 prompt「无交互容器」说明严格一致）；
 * 2. 利用 Myers 公共段建立的精确父节点映射（unchangedToOther），校验包装层父节点与旧直接子节点的父节点为同一节点；
 * 3. 利用包装层在同父级下左右最近未变更兄弟的映射边界 `(otherLowerBound, otherUpperBound)` 限定候选窗口：
 *    - 若窗口内对侧变更行中已存在与 W 相同 trimmed 的节点（拆外层包装上移的已有容器），跳过（不误伤别处同名加载提示消失）；
 *    - 仅抵消落在该连续兄弟窗口内的对侧子节点（杜绝跨位置移动误抵消）；
 * 4. 若窗口内存在与 W 同 role、未进入 W 直接子节点且本身有子节点或具名的无 #ref 变更节点（原位改名容器），跳过并交由改名配对处理。
 */
function cancelWrappedNodes(wrapper: WrapperSideContext, other: OtherSideContext): void {
  for (const w of wrapper.candidates) {
    if (wrapper.cancelled.has(w.index)) continue
    const wComp = wrapper.comparable[w.index]
    // 仅对无 #ref 的无交互包装容器执行包装层折叠
    if (wComp.ref !== null) continue

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

    // 将兄弟窗口收紧到 expectedOtherParentIdx 的子树范围 [parentIdx, subtreeEnd)，
    // 确保其他分支（例如前面或后面的侧栏区域）的同名节点绝不会落入本父节点窗口内
    if (expectedOtherParentIdx !== -1) {
      otherLowerBound = Math.max(otherLowerBound, expectedOtherParentIdx)
      const parentIndent = other.comparable[expectedOtherParentIdx].indent
      for (let j = expectedOtherParentIdx + 1; j < other.comparable.length; j++) {
        if (other.comparable[j].indent <= parentIndent) {
          otherUpperBound = Math.min(otherUpperBound, j)
          break
        }
      }
    }

    // 仅当对侧相同 trimmed 的变更节点位于本窗口内时（如拆外层包装后上移的已有容器）才跳过，
    // 避免页面其他区域的同名节点（如侧栏加载提示消失）误阻断本区域的真包装层抵消
    const sameTrimmedIndices = other.changedIndicesByTrimmed.get(wComp.trimmed)
    if (sameTrimmedIndices?.some((idx) => idx > otherLowerBound && idx < otherUpperBound)) {
      continue
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
 * 在所有 Hunk 的变更全集上执行两类保序、保父级的结构平移抵消：
 * 1. 全局无交互包装层（Wrapper）插入/移除抵消（精确父节点映射 + 相邻兄弟窗口 + 窗口内已有/改名容器守卫）；
 * 2. 全局父节点改名配对（按直接子节点整行建倒排索引，O(M) 生成共享子节点候选）+ 整行 LCS 抵消。
 */
function cancelWrapperAndRenamedParentShifts(
  allRemoved: IndexedLine[],
  allAdded: IndexedLine[],
  prevComparable: ComparableLine[],
  currComparable: ComparableLine[],
  prevToCurrUnchanged: Map<number, number>,
  currToPrevUnchanged: Map<number, number>,
): {
  cancelledRem: Set<number>
  cancelledAdd: Set<number>
  pairedPrevToCurr: Map<number, number>
  pairedRenamedParentByCurrIdx: Map<number, number>
} {
  const cancelledRem = new Set<number>()
  const cancelledAdd = new Set<number>()

  const prevTreeIdx = buildTreeChildrenIndex(prevComparable)
  const currTreeIdx = buildTreeChildrenIndex(currComparable)
  const removedByParentIdx = groupByKey(allRemoved, (r) => prevComparable[r.index].parentIndex)
  const addedByParentIdx = groupByKey(allAdded, (a) => currComparable[a.index].parentIndex)
  const removedIndicesByTrimmed = buildChangedIndicesByTrimmed(allRemoved)
  const addedIndicesByTrimmed = buildChangedIndicesByTrimmed(allAdded)

  // 1a. Wrapper 插入识别（curr 侧新增无交互包装行 W）
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
      changedIndicesByTrimmed: removedIndicesByTrimmed,
      cancelled: cancelledRem,
    },
  )

  // 1b. Wrapper 移除识别（prev 侧删除无交互包装行 W）
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
      changedIndicesByTrimmed: addedIndicesByTrimmed,
      cancelled: cancelledAdd,
    },
  )

  // 2. 全局父节点改名配对（按缩进由浅入深，借助子节点整行倒排索引 O(M) 生成候选）
  const remAfterWrap = filterUncancelled(allRemoved, cancelledRem)
  const addAfterWrap = filterUncancelled(allAdded, cancelledAdd)
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

  const siblingLayerCtx: IdenticalSiblingLayerContext = {
    prevComparable,
    currComparable,
    prevChildrenByParent: prevTreeIdx.childrenByParent,
    prevToCurrUnchanged,
    currToPrevUnchanged,
    pairedPrevToCurr,
    cancelledRem,
    cancelledAdd,
  }

  for (const indent of indents) {
    // 2a. 先在同一未变更外层父节点的对应兄弟区间内，抵消因跨父移动被 Myers 拆进不同 Hunk 的未变化同行节点
    cancelIdenticalSiblingsInLayer(
      filterUncancelled(remByIndent.get(indent), cancelledRem),
      filterUncancelled(addByIndent.get(indent), cancelledAdd),
      siblingLayerCtx,
    )

    // 2b. 再对本层仍未抵消且有直接子节点的父节点做改名配对与子节点整行 LCS 抵消
    const remParents = filterUncancelled(remByIndent.get(indent), cancelledRem).filter(
      (r) => (remChildrenByParent.get(r.index)?.length ?? 0) > 0,
    )
    const addParents = filterUncancelled(addByIndent.get(indent), cancelledAdd).filter(
      (a) => (addChildrenByParent.get(a.index)?.length ?? 0) > 0,
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
      for (const child of filterUncancelled(addChildrenByParent.get(p.index), cancelledAdd)) {
        const parentCounts = getOrCreateMap(addParentsByChildLine, child.line, () => new Map())
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
      const rChildren = filterUncancelled(remChildrenByParent.get(rParent.index), cancelledRem)
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
          // 若任一方在同外层父级下存在同词干真身，则拒绝跨容器错配；否则仅允许同相对位置改名
          if (rMeta.name && aMeta.name && nameScore === 0) {
            const rStem = normalizeNameStem(rMeta.name)
            const aStem = normalizeNameStem(aMeta.name)
            const rHasExactNameMatch =
              rStem !== '' &&
              (addUnrefStemsByOuterRole.get(outerRoleKey(aComp.parentIndex, rMeta.role))?.has(rStem) ?? false)
            const aHasExactNameMatch =
              aStem !== '' &&
              (remUnrefStemsByOuterRole.get(outerRoleKey(rComp.parentIndex, aMeta.role))?.has(aStem) ?? false)
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

    // 排序优先级：共享子节点数优先，其次名称兼容分，最后行号距离
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
      if (prevComparable[cand.remIdx].line !== currComparable[cand.addIdx].line) {
        pairedRenamedParentByCurrIdx.set(cand.addIdx, cand.remIdx)
      }

      const rSeq = filterUncancelled(remChildrenByParent.get(cand.remIdx), cancelledRem)
      const aSeq = filterUncancelled(addChildrenByParent.get(cand.addIdx), cancelledAdd)
      cancelByLcs(rSeq, aSeq, (item) => item.line, cancelledRem, cancelledAdd, (r, a) => {
        pairedPrevToCurr.set(r.index, a.index)
      })
    }
  }

  return { cancelledRem, cancelledAdd, pairedPrevToCurr, pairedRenamedParentByCurrIdx }
}

/**
 * 构建当前树中唯一出现的 `#ref -> 行下标` 索引，供旧侧祖先映射至当前侧最新行文本使用。
 */
function buildUniqueRefIndex(comparable: ComparableLine[]): Map<number, number> {
  const counts = new Map<number, number>()
  const indexByRef = new Map<number, number>()
  for (let i = 0; i < comparable.length; i++) {
    const ref = comparable[i].ref
    if (ref === null) continue
    const next = (counts.get(ref) ?? 0) + 1
    counts.set(ref, next)
    if (next === 1) indexByRef.set(ref, i)
    else indexByRef.delete(ref)
  }
  return indexByRef
}

interface DiffWindowRange {
  prefixLen: number
  prevEnd: number
  currEnd: number
  totalLines: number
}

/**
 * O(N) 快速低重合预判：即使所有 trimmed 相同的行全部匹配，未匹配行占比仍必然超过熔断阈值时直接返回 true，
 * 避免整页重绘时在大树上执行 O(ND) Myers 算法阻塞主线程。
 */
function isGuaranteedTooLargeByMultiset(
  prevComparable: ComparableLine[],
  currComparable: ComparableLine[],
  window: DiffWindowRange,
  fastAbortMinWindowLines: number,
  maxChangeLineRatio: number,
): boolean {
  const { prefixLen, prevEnd, currEnd, totalLines } = window
  const midPrevLen = prevEnd - prefixLen
  const midCurrLen = currEnd - prefixLen
  if (midPrevLen + midCurrLen < fastAbortMinWindowLines) return false

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
  options: StructuredDiffOptions,
): StructuredDiffOutput {
  const {
    maxChangeLineRatio,
    fastAbortMinWindowLines,
    minMyersEditLength,
    maxMyersEditLength,
  } = options

  if (
    prevLines.length === currLines.length &&
    prevLines.every((line, idx) => line === currLines[idx])
  ) {
    return createNoChangesOutput()
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
    return createNoChangesOutput()
  }

  // 2. 大窗口低重合快速熔断：整页重绘在进入 Myers 前即可 O(N) 返回
  const totalLines = Math.max(prevLines.length, currLines.length)
  if (
    isGuaranteedTooLargeByMultiset(
      prevComparable,
      currComparable,
      { prefixLen, prevEnd, currEnd, totalLines },
      fastAbortMinWindowLines,
      maxChangeLineRatio,
    )
  ) {
    return createAbortedTooLargeOutput()
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
    return createAbortedTooLargeOutput()
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
    return createNoChangesOutput()
  }

  // 4. 全局变更全集上统一执行无交互包装层抵消与父节点改名配对 LCS 抵消
  const { cancelledRem, cancelledAdd, pairedPrevToCurr, pairedRenamedParentByCurrIdx } =
    cancelWrapperAndRenamedParentShifts(
      allRemoved,
      allAdded,
      prevComparable,
      currComparable,
      prevToCurrUnchanged,
      currToPrevUnchanged,
    )

  const currUniqueRefIdx = buildUniqueRefIndex(currComparable)
  const effectiveRemovedAll = new Set<number>(
    allRemoved.filter((r) => !cancelledRem.has(r.index)).map((r) => r.index),
  )

  const outputLines: string[] = []
  const contextTracker = new DiffContextTracker({
    prevComparable,
    currComparable,
    prevToCurrUnchanged,
    pairedPrevToCurr,
    currUniqueRefIdx,
    effectiveRemovedAll,
  })
  let addedLines = 0
  let removedLines = 0

  const isSameLogicalParent = (prevIdx: number, currIdx: number): boolean => {
    const prevComp = prevComparable[prevIdx]
    const currComp = currComparable[currIdx]
    if (prevComp.directParent === currComp.directParent) return true
    if (prevComp.parentIndex !== -1 && currComp.parentIndex !== -1) {
      return pairedPrevToCurr.get(prevComp.parentIndex) === currComp.parentIndex
    }
    return false
  }

  for (const hunk of hunks) {
    const effectiveRemoved = filterUncancelled(hunk.removed, cancelledRem)
    const effectiveAdded = filterUncancelled(hunk.added, cancelledAdd)
    if (effectiveRemoved.length === 0 && effectiveAdded.length === 0) continue

    // 5. 识别同 Hunk 内的「同父同步配对项」：
    //    - 同 #ref 唯一配对且逻辑父节点相同（含已配对改名的无 #ref 父节点），或已配对改名父节点本身，就近成对输出 `- / +`；
    //    - 跨父移动不绑定配对，让 `-` 留在旧父级文档位置、`+` 留在新父级文档位置自然输出
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
        if (
          oldByRef &&
          !pairedRemIndices.has(oldByRef.index) &&
          oldByRef.line !== add.line &&
          isSameLogicalParent(oldByRef.index, add.index)
        ) {
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

    const emittedRemovedInHunk = new Set<number>()

    const appendRemovedLine = (rem: IndexedLine) => {
      emittedRemovedInHunk.add(rem.index)
      outputLines.push(`- ${rem.line}`)
      contextTracker.recordRemoved(rem.index)
      removedLines++
    }

    const appendAddedLine = (add: IndexedLine, isPureAdd: boolean) => {
      outputLines.push(`+ ${add.line}`)
      contextTracker.recordAdded(add.index, isPureAdd)
      addedLines++
    }

    const emitSingleRemoved = (rem: IndexedLine) => {
      if (emittedRemovedInHunk.has(rem.index)) return
      contextTracker.ensureAncestors(rem.index, 'prev', outputLines)
      appendRemovedLine(rem)
    }

    const emitSingleAdded = (add: IndexedLine, isPureAdd: boolean) => {
      contextTracker.ensureAncestors(add.index, 'curr', outputLines)
      appendAddedLine(add, isPureAdd)
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

    const hasUnpairedRemovedBetween = (startRemIdx: number, endRemIdx: number): boolean => {
      for (let r = rCursor; r < effectiveRemoved.length; r++) {
        const rem = effectiveRemoved[r]
        if (rem.index >= endRemIdx) break
        if (rem.index > startRemIdx && !pairedRemIndices.has(rem.index)) return true
      }
      return false
    }

    // 6. 按文档顺序输出：同区间内未配对删除行（含跨父移出）先于新增行（含跨父移入）
    for (let i = 0; i < effectiveAdded.length; i++) {
      const add = effectiveAdded[i]
      const pairedOld = pairedOldByAddIdx.get(add.index)
      if (!pairedOld) {
        flushUnpairedRemovedBefore(nextSyncRemLimit[i])
        const isPureAdd =
          add.ref === null || !removedRefCounts.has(add.ref)
        emitSingleAdded(add, isPureAdd)
        continue
      }

      flushUnpairedRemovedBefore(pairedOld.index)

      // 同父改写但缩进变化（如外层插入/移除包装层同时修改多个子节点）：
      // 将连续同旧父 & 同新父的配对项合批，先统一在旧父级下输出全部 `-` 行，再统一在新父级下输出全部 `+` 行
      if (prevComparable[pairedOld.index].indent !== currComparable[add.index].indent) {
        const batch: Array<{ rem: IndexedLine; add: IndexedLine }> = [{ rem: pairedOld, add }]
        const prevParentIdx = prevComparable[pairedOld.index].parentIndex
        const currParentIdx = currComparable[add.index].parentIndex
        let lastRemIdx = pairedOld.index

        while (i + 1 < effectiveAdded.length) {
          const nextAdd = effectiveAdded[i + 1]
          const nextOld = pairedOldByAddIdx.get(nextAdd.index)
          if (
            !nextOld ||
            prevComparable[nextOld.index].indent === currComparable[nextAdd.index].indent ||
            prevComparable[nextOld.index].parentIndex !== prevParentIdx ||
            currComparable[nextAdd.index].parentIndex !== currParentIdx ||
            hasUnpairedRemovedBetween(lastRemIdx, nextOld.index)
          ) {
            break
          }
          batch.push({ rem: nextOld, add: nextAdd })
          lastRemIdx = nextOld.index
          i++
        }

        for (const pair of batch) {
          emitSingleRemoved(pair.rem)
        }
        for (const pair of batch) {
          emitSingleAdded(pair.add, false)
        }
      } else {
        contextTracker.ensureAncestors(add.index, 'curr', outputLines)
        appendRemovedLine(pairedOld)
        appendAddedLine(add, false)
      }
    }

    flushUnpairedRemovedBefore(Number.POSITIVE_INFINITY)
  }

  if (addedLines === 0 && removedLines === 0) {
    return createNoChangesOutput()
  }

  return {
    diffText: outputLines.join('\n'),
    addedLines,
    removedLines,
  }
}
