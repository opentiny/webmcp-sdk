/**
 * a11y/search.ts
 *
 * 在无障碍树内执行基于文本或引用的搜索操作。
 */

import type { SearchA11yTreeOptions, SearchA11yTreeResult, A11ySearchMatch } from './types'
import { buildA11yTree } from './build'

/**
 * 在无障碍树中按关键词搜索，返回带行号的匹配结果和上下文
 *
 * 支持的搜索维度（均对同一个 query 字符串做包含匹配）：
 *   - role：如 `button`、`link`、`heading`
 *   - accessible name：节点的语义化名称（引号内文本）
 *   - state token：如 `checked`、`disabled`、`expanded`
 *   - ref 索引：如 `#5`
 *
 * @example
 *   searchA11yTree('button')    // 找全部按钮
 *   searchA11yTree('提交')      // 找名称含"提交"的节点
 *   searchA11yTree('#3')        // 找 ref #3
 */
export function searchA11yTree(
  query: string,
  root: Element = document.body,
  options?: SearchA11yTreeOptions,
): SearchA11yTreeResult {
  const {
    contextLines = 2,
    caseInsensitive = true,
    maxMatches = 20,
    ...treeOptions
  } = options ?? {}

  const safeContextLines = Math.max(0, contextLines)
  const safeMaxMatches = Math.max(1, maxMatches)

  // 复用 buildA11yTree 生成完整树，直接取 lines 数组（不重复构建 DOM 遍历）
  const { lines, refMap, yaml } = buildA11yTree(root, treeOptions)

  const needle = caseInsensitive ? query.toLowerCase() : query
  const totalLines = lines.length

  const isRefQuery = /^#\d+$/.test(query)
  const refRegex = isRefQuery ? new RegExp(`\\s${query}(?:\\s|[\\[]|$)`) : null

  // 找出所有命中行的下标（0-based）
  const hitIndices: number[] = []
  for (let i = 0; i < lines.length; i++) {
    let matched = false
    if (refRegex) {
      matched = refRegex.test(lines[i])
    } else {
      const haystack = caseInsensitive ? lines[i].toLowerCase() : lines[i]
      matched = haystack.includes(needle)
    }
    if (matched) {
      hitIndices.push(i)
    }
  }

  // 合并重叠的上下文区间，避免重复输出行
  const mergedRanges: Array<{ start: number; end: number; hits: number[] }> = []
  let isTruncated = false
  for (const idx of hitIndices) {
    const start = Math.max(0, idx - safeContextLines)
    const end = Math.min(totalLines - 1, idx + safeContextLines)
    const last = mergedRanges[mergedRanges.length - 1]
    if (last && start <= last.end + 1) {
      // 区间重叠或紧邻，合并
      last.end = Math.max(last.end, end)
      last.hits.push(idx)
    } else {
      if (mergedRanges.length >= safeMaxMatches) {
        isTruncated = true
        break
      }
      mergedRanges.push({ start, end, hits: [idx] })
    }
  }

  // 构建结构化结果
  const matches: A11ySearchMatch[] = mergedRanges.map((range) => ({
    lineNumber: range.hits[0] + 1,
    line: lines[range.hits[0]],
    context: Array.from({ length: range.end - range.start + 1 }, (_, k) => ({
      lineNumber: range.start + k + 1,
      line: lines[range.start + k],
    })),
  }))

  // 格式化为可读文本（模仿 grep -n -C 风格，便于 LLM 直接理解）
  const textParts: string[] = [
    `无障碍树搜索结果 — 关键词: "${query}" | 总行数: ${totalLines} | 命中: ${hitIndices.length} 行 | 返回分组: ${matches.length}`,
    '',
  ]

  if (matches.length === 0) {
    textParts.push('（未找到匹配项）')
  } else {
    matches.forEach((match, m) => {
      const range = mergedRanges[m]
      textParts.push(`── 分组 ${m + 1}（第 ${range.start + 1}–${range.end + 1} 行）──`)
      match.context.forEach(({ lineNumber, line }) => {
        const isHit = range.hits.includes(lineNumber - 1)
        const ln = String(lineNumber).padStart(4)
        // 命中行用 >>> 标记，上下文行用普通行号前缀
        textParts.push(isHit ? `>>>${ln} | ${line}` : `   ${ln} | ${line}`)
      })
      textParts.push('')
    })
    if (isTruncated) {
      textParts.push(`⚠️ 命中过多，已截断至前 ${safeMaxMatches} 个分组，建议缩小搜索范围`)
    }
    textParts.push(`提示：如需操作命中元素，使用其 #N 索引；如需查看完整树，请使用 browserState。`)
  }

  return {
    text: textParts.join('\n'),
    matches,
    totalLines,
    matchCount: hitIndices.length,
    refMap,
    yaml,
  }
}
