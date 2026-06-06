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

export function prepareRunArgsJson(args: string[], fileContent: string | undefined, baseDir: string): string {
  let raw = ''

  if (fileContent !== undefined) {
    raw = fileContent.trim()
  } else if (args.length > 0) {
    const joined = joinShellArgs(args)
    if (joined.startsWith('{') || looksLikeObjectBody(joined)) {
      raw = joined
    } else if (args.every((arg) => arg.includes('='))) {
      raw = buildArgsFromKeyValuePairs(args)
    } else {
      raw = joined
    }
  }

  if (!raw) {
    throw new Error('必须提供参数或通过 -f/--file 指定参数文件')
  }

  const expanded = expandFileRefs(raw, baseDir)
  return parseArgsJson(expanded)
}
