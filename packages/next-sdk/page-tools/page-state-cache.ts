/**
 * page-state-cache.ts
 *
 * 页面状态 Diff 缓存模块
 * - 缓存上一次 buildA11yTree 生成的 YAML 文本
 * - 每次操作后计算 diff，只返回 +/- 变化行，大幅节省 Token
 */

import { diffLines } from 'diff'

export interface PageSnapshot {
  url: string
  yaml: string
}

export interface DiffResult {
  /** 是否为全量刷新（首次加载或 URL 变化） */
  isFullRefresh: boolean
  /** 上一次的 URL（用于拼接 URL 变化提示） */
  prevUrl: string
  /** 新增行数 */
  addedLines: number
  /** 删除行数 */
  removedLines: number
  /** 只含 +/- 行的 diff 文本（不含相同行，节省 Token） */
  diffText: string
}

export class PageStateCache {
  private prev: PageSnapshot | null = null

  /** URL 变化或首次调用时，需要全量输出 */
  isFullRefresh(currentUrl: string): boolean {
    return !this.prev || this.prev.url !== currentUrl
  }

  /**
   * 更新缓存并返回 diff 结果
   * @param url 当前页面 URL
   * @param yaml 当前 YAML 树文本
   */
  update(url: string, yaml: string): DiffResult {
    const isFullRefresh = this.isFullRefresh(url)
    const prevUrl = this.prev?.url ?? ''

    let addedLines = 0
    let removedLines = 0
    let diffText = ''

    if (!isFullRefresh && this.prev) {
      const changes = diffLines(this.prev.yaml, yaml)
      const buf: string[] = []
      changes.forEach(part => {
        // 跳过相同行，只保留变化行，大幅节省传给 AI 的 Token 数量
        if (!part.added && !part.removed) return
        const lines = part.value.split('\n').filter(Boolean)
        if (part.added) {
          addedLines += lines.length
          lines.forEach(l => buf.push(`+ ${l}`))
        } else {
          removedLines += lines.length
          lines.forEach(l => buf.push(`- ${l}`))
        }
      })
      diffText = buf.join('\n')
    }

    // 更新缓存
    this.prev = { url, yaml }

    return { isFullRefresh, prevUrl, addedLines, removedLines, diffText }
  }

  /** 强制清空缓存（页面刷新 / 手动重置场景） */
  invalidate(): void {
    this.prev = null
  }
}
