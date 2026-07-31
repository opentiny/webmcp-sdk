/**
 * @match URL 匹配（v1）
 * 支持：*://host/path、*://*.host/*、http(s)://*（不含端口）
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
  const m = trimmed.match(MATCH_RE)
  if (!m?.groups) {
    return {
      ok: false,
      error: `非法 @match：${trimmed}（示例：*://*.example.com/*）`
    }
  }
  // host 含端口时与 URL.hostname 无法对齐，明确拒绝
  if (m.groups.host.includes(':')) {
    return {
      ok: false,
      error: `不支持带端口的 @match：${trimmed}（请去掉 :port）`
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
  if (host.includes(':')) return false

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

  // path 匹配：pathname + search（不含 hash）
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
