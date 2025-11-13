export type ExtractedBlock =
  | { type: 'markdown'; content: string }
  | { type: 'schema-card'; content: string | Record<string, any> }

/** 在处理流消息时，从一段文本中，提取 markdown  schemaJson, 未来会从genui-sdk 中导出 */
export function extractTextAndJson(input: string): ExtractedBlock[] {
  const result: ExtractedBlock[] = []
  let cursor = 0

  while (cursor < input.length) {
    const startFlag = '```schemaJson'
    const start = input.indexOf(startFlag, cursor)
    const prefixLen = startFlag.length

    if (start === -1) {
      // 没有更多 json 块了，全是文字
      const text = input.slice(cursor).trim()
      if (text) result.push({ type: 'markdown', content: text })
      break
    }

    // 提取前面的文字
    const textPart = input.slice(cursor, start).trim()
    if (textPart) result.push({ type: 'markdown', content: textPart })

    // 查找结束标记 ```
    const end = input.indexOf('```', start + prefixLen)

    let jsonText: string
    if (end === -1) {
      // 未闭合的 json，取到文本末尾
      jsonText = input.slice(start + prefixLen).trim()
      cursor = input.length // 跳出循环
    } else {
      jsonText = input.slice(start + prefixLen, end).trim()
      cursor = end + 3
    }

    result.push({ type: 'schema-card', content: jsonText })
  }

  return result
}
