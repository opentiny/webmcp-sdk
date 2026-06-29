import { readFileSync } from 'fs'
import { dirname, isAbsolute, normalize, resolve } from 'path'
import { fileURLToPath } from 'url'

/** 匹配完整 JSON 字符串字面量 */
const JSON_STRING_LITERAL = /"(?:[^"\\]|\\.)*"/g

/** 匹配未加引号的 @file: / @base64file: 占位符（路径中可含反斜杠） */
const UNQUOTED_FILE_REF = /(?<![\\"])@(base64)?file:([^\s"',}\]]+)/g

const FILE_REF_PREFIX = /^@(base64)?file:(.+)$/s

export function resolveFilePath(filePath: string, baseDir: string = process.cwd()): string {
  let normalizedPath = filePath.trim()

  if (
    (normalizedPath.startsWith('"') && normalizedPath.endsWith('"')) ||
    (normalizedPath.startsWith("'") && normalizedPath.endsWith("'"))
  ) {
    normalizedPath = normalizedPath.slice(1, -1).trim()
  }

  if (normalizedPath.startsWith('file://')) {
    normalizedPath = fileURLToPath(normalizedPath)
  }

  if (isAbsolute(normalizedPath)) {
    return normalize(normalizedPath)
  }

  return resolve(baseDir, normalizedPath)
}

/**
 * 解码文件路径：仅折叠 JSON 中的 `\\`，不把 `\t`、`\U` 等当作转义。
 */
export function decodeFilePath(rawPath: string): string {
  return rawPath.replace(/\\\\/g, '\\')
}

function readFileRefContent(filePath: string, baseDir: string, base64: boolean): string {
  const absPath = resolveFilePath(filePath, baseDir)
  let content: string
  try {
    content = readFileSync(absPath, 'utf-8')
  } catch (e: any) {
    throw new Error(`无法读取文件引用 "${filePath}" (${absPath}): ${e.message}`)
  }

  return base64 ? Buffer.from(content, 'utf-8').toString('base64') : content
}

function expandFileRefValue(rawInner: string, baseDir: string): string | null {
  const match = rawInner.match(FILE_REF_PREFIX)
  if (!match) {
    return null
  }

  const [, base64Flag, rawPath] = match
  const filePath = decodeFilePath(rawPath)
  const value = readFileRefContent(filePath, baseDir, Boolean(base64Flag))
  return JSON.stringify(value)
}

function expandQuotedFileRefs(argsJson: string, baseDir: string): string {
  return argsJson.replace(JSON_STRING_LITERAL, (jsonStringLiteral) => {
    const rawInner = jsonStringLiteral.slice(1, -1)
    const replacement = expandFileRefValue(rawInner, baseDir)
    return replacement ?? jsonStringLiteral
  })
}

function expandUnquotedFileRefs(argsJson: string, baseDir: string): string {
  return argsJson.replace(UNQUOTED_FILE_REF, (match, base64Flag, filePath) => {
    const value = readFileRefContent(filePath, baseDir, Boolean(base64Flag))
    return JSON.stringify(value)
  })
}

/**
 * 展开 argsJson 中的文件引用占位符：
 *   @file:<path>       → 读取文件原始文本内容
 *   @base64file:<path> → 读取文件内容并 Base64 编码
 */
export function expandFileRefs(argsJson: string, baseDir: string = process.cwd()): string {
  const withQuotedExpanded = expandQuotedFileRefs(argsJson, baseDir)
  return expandUnquotedFileRefs(withQuotedExpanded, baseDir)
}

/**
 * 确定 `@file` / `@base64file` 相对路径的解析基准目录。
 *
 * 未使用 `-f/--file` 时以 `process.cwd()` 为基准；
 * 使用参数文件时以该文件所在目录为基准，使 `args.json` 内 `./article.md` 等路径
 * 相对于参数文件而非 shell 当前工作目录解析。
 *
 * @example
 * // cwd 为 /home/user/project，执行 webmcp run tool -f test/fixtures/nested/args.json
 * getFileBaseDir('test/fixtures/nested/args.json')
 * // => '/home/user/project/test/fixtures/nested'
 */
export function getFileBaseDir(fileOption?: string): string {
  if (!fileOption) {
    return process.cwd()
  }
  return dirname(resolve(process.cwd(), fileOption))
}
