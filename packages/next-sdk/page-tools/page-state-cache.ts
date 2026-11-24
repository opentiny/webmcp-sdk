/**
 * page-state-cache.ts
 *
 * 页面状态版本缓存与熔断协议模块：
 * 1. 维护单调递增的快照版本号 rev，增量更新附带基准版本 baseRev；
 * 2. 集中定义全部熔断策略参数并透传给 `structured-yaml-diff.ts` 计算结构感知增量 Diff；
 * 3. 执行三项熔断保护（前置大窗口 O(N) 低重合预判 / Myers 编辑距离上限、变化行占比 > 50%、diff 字符体积 >= 整页 YAML），
 *    命中任一项时统一回退整页树（kind = 'full', fullReason = 'diff_too_large'）。
 */

import {
  computeStructuredYamlDiff,
  extractYamlLines,
  NO_CHANGES_DIFF_TEXT,
  type StructuredDiffOptions,
} from './structured-yaml-diff'

export { NO_CHANGES_DIFF_TEXT }

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

/** 三项熔断保护策略常量（集中定义于此，避免 diff 模块与缓存层分头维护） */
const MAX_CHANGE_LINE_RATIO = 0.5
const MAX_DIFF_CHAR_RATIO = 1.0
const FAST_ABORT_MIN_WINDOW_LINES = 200
const MIN_MYERS_EDIT_LENGTH = 250
const MAX_MYERS_EDIT_LENGTH = 800

const DIFF_CIRCUIT_BREAKER_OPTIONS: StructuredDiffOptions = {
  maxChangeLineRatio: MAX_CHANGE_LINE_RATIO,
  fastAbortMinWindowLines: FAST_ABORT_MIN_WINDOW_LINES,
  minMyersEditLength: MIN_MYERS_EDIT_LENGTH,
  maxMyersEditLength: MAX_MYERS_EDIT_LENGTH,
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
      DIFF_CIRCUIT_BREAKER_OPTIONS,
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
