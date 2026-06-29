import JSON5 from 'json5'
import { expandFileRefs } from './expand-file-refs'

export function cleanJsonString(str: string): string {
  let cleaned = str.trim()
  if (cleaned.startsWith("'") && cleaned.endsWith("'")) {
    cleaned = cleaned.slice(1, -1).trim()
  }
  return cleaned
}

function looksLikeObjectBody(raw: string): boolean {
  return /^("?[\w-]+"?\s*:)/.test(raw)
}

/**
 * 拼接 shell 拆散的参数。
 * 兼容 bash 花括号展开后丢失 `{}` 的情况：title:"...", "content":"..."
 */
export function joinShellArgs(args: string[]): string {
  const cleaned = args.map(cleanJsonString)
  const first = cleaned[0] ?? ''

  if (first.startsWith('{')) {
    return cleaned.join(' ')
  }

  if (looksLikeObjectBody(first)) {
    let joined = cleaned.join(' ')
    if (!joined.startsWith('{')) {
      joined = `{${joined}}`
    }
    if (!joined.endsWith('}')) {
      joined = `${joined}}`
    }
    return joined
  }

  return cleaned.join(' ')
}

/** 在相邻属性之间补逗号：title:"a" "content":"b" → title:"a","content":"b" */
export function insertMissingCommas(raw: string): string {
  return raw.replace(/"(\s+)("?[\w-]+"?\s*:)/g, '",$2')
}

/**
 * 为未加引号的字符串值补引号。
 * 典型 shell 损坏：{title:TinyVue Icon,content:@base64file:./a.md}
 */
export function quoteUnquotedStringValues(raw: string): string {
  return raw.replace(
    /([{,]\s*(?:"([^"]+)"|([\w-]+))\s*:\s*)(?!"@(?:base64)?file:|"|true|false|null|-?\d|\{|\[)([^",}\]]+?)(?=\s*[,}])/g,
    (_match, prefix, _quotedKey, _unquotedKey, value: string) => {
      const trimmed = value.trim()
      if (/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(trimmed)) {
        return prefix + trimmed
      }
      return prefix + JSON.stringify(trimmed)
    }
  )
}

export function normalizeShellDamagedJson(raw: string): string {
  let normalized = raw.trim()
  normalized = insertMissingCommas(normalized)
  normalized = quoteUnquotedStringValues(normalized)
  return normalized
}

export function buildArgsFromKeyValuePairs(args: string[]): string {
  const obj: Record<string, unknown> = {}
  for (const pair of args) {
    const index = pair.indexOf('=')
    if (index === -1) {
      throw new Error(`无效的参数格式 "${pair}"。请使用 key=value，或 JSON / -f 文件。`)
    }
    const key = pair.substring(0, index).trim()
    let val = cleanJsonString(pair.substring(index + 1).trim())

    try {
      obj[key] = JSON.parse(val)
    } catch {
      obj[key] = val
    }
  }
  return JSON.stringify(obj)
}

/**
 * 将用户输入的 JSON / JS 对象字面量解析并规范化为标准 JSON 字符串。
 *
 * 解析顺序：
 * 1. 去除首尾空白及 shell 单引号包裹
 * 2. 使用 JSON5 解析（支持尾随逗号、未加引号的 key 等）
 * 3. 若失败，尝试修复 shell 损坏（缺逗号、未加引号的字符串值）后重试
 *
 * @param raw - 原始参数字符串（可能已被 expandFileRefs 展开 @file 占位符）
 * @returns 规范化后的 JSON 字符串，可直接传给 MCP 工具
 *
 * @example
 * // 标准 JSON
 * parseArgsJson('{"title":"标题","content":"正文"}')
 * // => '{"title":"标题","content":"正文"}'
 *
 * @example
 * // shell 损坏：花括号展开后丢失逗号、值未加引号
 * parseArgsJson('{title:TinyVue Icon,content:"hello"}')
 * // => '{"title":"TinyVue Icon","content":"hello"}'
 *
 * @example
 * // bash 单引号包裹（外层引号会被 cleanJsonString 剥除）
 * parseArgsJson('\'{"title":"标题"}\'')
 * // => '{"title":"标题"}'
 */
export function parseArgsJson(raw: string): string {
  const trimmed = cleanJsonString(raw)
  try {
    return JSON.stringify(JSON5.parse(trimmed))
  } catch (firstError) {
    const repaired = normalizeShellDamagedJson(trimmed)
    try {
      return JSON.stringify(JSON5.parse(repaired))
    } catch {
      const hint =
        '提示：bash 中 JSON 必须用单引号包裹，例如 \'{"title":"标题","content":"@base64file:./article.md"}\'；' +
        '或使用 key=value：title=标题 content=@base64file:./article.md；' +
        '或使用 -f args.json。'
      const message = firstError instanceof Error ? firstError.message : String(firstError)
      throw new Error(`参数不是有效的 JSON 或 JS 对象: ${message}\n${hint}`)
    }
  }
}

/**
 * `webmcp run` 命令的入口：从 CLI 参数或文件内容组装最终 JSON 参数字符串，兼容三种情况。
 *
 * 参数来源优先级：`-f/--file` 文件内容 > 命令行 `args`。
 * 命令行支持三种格式（自动识别）：
 * - JSON 对象：`{"title":"标题"}`
 * - shell 拆散的 JSON 片段：`title:"标题" "content":"正文"`（bash 花括号展开后）
 * - key=value：`title=标题 content=@base64file:./article.md`
 *
 * 组装后会调用 expandFileRefs 展开 `@file` / `@base64file` 占位符，再经 parseArgsJson 规范化。
 *
 * @param args - commander 解析后的剩余参数数组
 * @param fileContent - `-f` 指定文件的文本内容；未指定时为 undefined
 * @param baseDir - 解析 `@file` 相对路径的基准目录（`-f` 时为文件所在目录，否则为 cwd）
 * @returns 规范化后的 JSON 字符串
 *
 * @example
 * // CLI: webmcp run publish-article '{"title":"标题","content":"@base64file:./article.md"}'
 * prepareRunArgsJson(['{"title":"标题","content":"@base64file:./article.md"}'], undefined, process.cwd())
 *
 * @example
 * // CLI: webmcp run publish-article title=标题 content=@base64file:./article.md
 * prepareRunArgsJson(['title=标题', 'content=@base64file:./article.md'], undefined, process.cwd())
 *
 * @example
 * // CLI: webmcp run publish-article -f args.json
 * prepareRunArgsJson([], readFileSync('args.json', 'utf-8'), dirname('args.json'))
 */
export function prepareRunArgsJson(args: string[], fileContent: string | undefined, baseDir: string): string {
  if (fileContent !== undefined) {
    const trimmed = fileContent.trim()
    if (!trimmed) {
      throw new Error('通过 -f/--file 指定的参数文件内容不能为空')
    }
    const expanded = expandFileRefs(trimmed, baseDir)
    return parseArgsJson(expanded)
  }

  if (args.length === 0) {
    // 无参数工具（如 get_article_info）允许省略 args，默认空对象
    return '{}'
  }

  const joined = joinShellArgs(args)
  let raw = ''
  if (joined.startsWith('{') || looksLikeObjectBody(joined)) {
    raw = joined
  } else if (args.every((arg) => arg.includes('='))) {
    raw = buildArgsFromKeyValuePairs(args)
  } else {
    raw = joined
  }

  if (!raw.trim()) {
    throw new Error('未提供有效参数')
  }

  const expanded = expandFileRefs(raw, baseDir)
  return parseArgsJson(expanded)
}
