/**
 * 油猴风格 @match 解析与匹配（v1）
 * 支持：*://host/path、*://*.host/*、http(s)://*
 */

const MATCH_RE =
  /^(?<scheme>\*|https?|file|ftp):\/\/(?<host>\*|(\*\.)?[^/*]+)(?<path>\/.*)$/i

/**
 * 校验单个 @match 模式是否合法
 */
export function validateMatchPattern(pattern: string): { ok: true } | { ok: false; error: string } {
  const trimmed = pattern.trim()
  if (!trimmed) {
    return { ok: false, error: '匹配模式不能为空' }
  }
  if (!MATCH_RE.test(trimmed)) {
    return {
      ok: false,
      error: `非法 @match：${trimmed}（示例：*://*.example.com/*）`
    }
  }
  return { ok: true }
}

/**
 * 批量校验 matches
 */
export function validateMatchPatterns(
  patterns: string[]
): { ok: true } | { ok: false; error: string } {
  if (!patterns.length) {
    return { ok: false, error: '至少需要一条 @match' }
  }
  for (const p of patterns) {
    const r = validateMatchPattern(p)
    if (!r.ok) return r
  }
  return { ok: true }
}

/**
 * 将 @match host 段转为正则（不含 ^$）
 * - `*` → 任意 host
 * - `*.example.com` → 含子域与 apex
 * - 其它 → 精确 host（大小写不敏感）
 */
function hostToRegexSource(host: string): string {
  if (host === '*') return '[^/]+'
  if (host.startsWith('*.')) {
    const rest = escapeRegex(host.slice(2))
    return `(?:[^/]+\\.)?${rest}`
  }
  return escapeRegex(host)
}

/**
 * 将 path 段（含开头 /）转为正则；`*` 匹配任意（含空）
 */
function pathToRegexSource(path: string): string {
  let out = ''
  for (let i = 0; i < path.length; i++) {
    const ch = path[i]
    if (ch === '*') {
      out += '.*'
    } else {
      out += escapeRegex(ch)
    }
  }
  return out
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * 将单个 @match 编译为 RegExp（匹配完整 href 的 origin+pathname+search 风格：protocol//host/path）
 * 使用 URL 解析后与 pattern 比较，避免把 hash 算进 path。
 */
export function matchPatternToRegExp(pattern: string): RegExp | null {
  const m = pattern.trim().match(MATCH_RE)
  if (!m?.groups) return null
  const { scheme, host, path } = m.groups
  const schemeSrc = scheme === '*' ? 'https?' : escapeRegex(scheme.toLowerCase())
  const hostSrc = hostToRegexSource(host.toLowerCase())
  const pathSrc = pathToRegexSource(path)
  return new RegExp(`^${schemeSrc}:\\/\\/${hostSrc}${pathSrc}$`, 'i')
}

/**
 * 判断 url 是否命中单个 @match
 */
export function matchUrl(pattern: string, url: string): boolean {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return false
  }

  const m = pattern.trim().match(MATCH_RE)
  if (!m?.groups) return false
  const { scheme, host, path: pathPat } = m.groups

  const urlScheme = parsed.protocol.replace(/:$/, '').toLowerCase()
  if (scheme === '*') {
    if (urlScheme !== 'http' && urlScheme !== 'https') return false
  } else if (scheme.toLowerCase() !== urlScheme) {
    return false
  }

  const urlHost = parsed.hostname.toLowerCase()
  const patHost = host.toLowerCase()
  if (patHost === '*') {
    // ok
  } else if (patHost.startsWith('*.')) {
    const suffix = patHost.slice(2)
    if (urlHost !== suffix && !urlHost.endsWith(`.${suffix}`)) return false
  } else if (urlHost !== patHost) {
    return false
  }

  // path 匹配：pathname + search（不含 hash），与油猴常见行为接近
  const urlPath = `${parsed.pathname}${parsed.search}`
  const pathRe = new RegExp(`^${pathToRegexSource(pathPat)}$`, 'i')
  return pathRe.test(urlPath)
}

/**
 * 任一 pattern 命中即为匹配
 */
export function matchAny(patterns: string[], url: string): boolean {
  return patterns.some((p) => matchUrl(p, url))
}
