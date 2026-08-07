/**
 * next-sdk 库构建的 external 策略。
 *
 * 浏览器宿主（尤其 Angular/Webpack5）无法解析 Node 内置模块。
 * 因此将 `ai` / `@ai-sdk/*` / MCP SDK / `@opentiny/next` 打进产物，
 * 仅外置明确浏览器安全的共享依赖。
 */

/** 仍保持 external 的包（浏览器安全、宜与宿主去重） */
export const LIB_EXTERNAL_PACKAGES = ['zod', 'ajv', 'qrcode'] as const

/** 禁止出现在 dist 裸 import 中的包（须打进产物） */
export const MUST_BUNDLE_PACKAGE_PREFIXES = [
  'ai',
  '@ai-sdk/',
  '@modelcontextprotocol/sdk',
  '@opentiny/next'
] as const

const NODE_BUILTIN_RE =
  /^(?:node:)?(?:assert|buffer|child_process|cluster|crypto|dgram|dns|domain|events|fs|http|http2|https|net|os|path|punycode|querystring|readline|stream|string_decoder|sys|timers|tls|tty|url|util|v8|vm|zlib|process|constants|module|worker_threads)$/

/** Node 向、不应进入浏览器产物图的包（若被误拉入则 stub） */
export const NODE_ONLY_PACKAGE_PREFIXES = [
  'express',
  'cors',
  'express-rate-limit',
  'raw-body',
  '@hono/node-server',
  'cross-spawn',
  'node:child_process',
  'node:fs',
  'node:http',
  'node:https',
  'node:net',
  'node:tls',
  'node:os',
  'node:path',
  'node:stream',
  'node:crypto',
  'node:process',
  'node:url',
  'node:readline',
  'node:zlib',
  'node:dns',
  'node:worker_threads'
] as const

function packageNameFromId(id: string): string | null {
  const norm = id.replace(/\\/g, '/')
  // bare: zod / zod/v4 / @scope/name / @scope/name/sub
  if (!norm.includes('/') && !norm.startsWith('.')) return norm
  if (norm.startsWith('@')) {
    const parts = norm.split('/')
    if (parts.length >= 2) return `${parts[0]}/${parts[1]}`
    return norm
  }
  if (!norm.includes('node_modules/')) {
    // bare with subpath: zod/v4、@modelcontextprotocol/sdk/client/sse.js
    if (!norm.startsWith('.') && !norm.startsWith('/') && !/^[A-Za-z]:/.test(norm)) {
      const parts = norm.split('/')
      if (parts[0]?.startsWith('@')) return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : parts[0]
      return parts[0] ?? null
    }
    return null
  }
  // .../node_modules/.pnpm/zod@x/node_modules/zod/...
  // .../node_modules/zod/...
  const marker = '/node_modules/'
  let idx = norm.lastIndexOf(marker)
  while (idx !== -1) {
    const rest = norm.slice(idx + marker.length)
    if (rest.startsWith('.pnpm/')) {
      idx = norm.lastIndexOf(marker, idx - 1)
      continue
    }
    if (rest.startsWith('@')) {
      const parts = rest.split('/')
      return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : parts[0]
    }
    return rest.split('/')[0] ?? null
  }
  return null
}

function matchesPrefix(name: string, prefix: string): boolean {
  return name === prefix || name.startsWith(prefix.endsWith('/') ? prefix : `${prefix}/`) || name.startsWith(prefix)
}

/** 是否应作为库构建的 external（白名单） */
export function isLibExternal(id: string): boolean {
  if (!id || id.startsWith('\0') || id.startsWith('.') || id.startsWith('\x00')) return false
  // 虚拟 / 数据 URL
  if (id.startsWith('virtual:') || id.startsWith('data:')) return false

  const pkg = packageNameFromId(id)
  if (!pkg) {
    // 绝对路径且不在 node_modules：本地源码
    if (id.startsWith('/') || /^[A-Za-z]:/.test(id)) return false
    // 其它裸 id（如 node:http）——不当作 npm external，交给 stub 插件
    return false
  }

  return (LIB_EXTERNAL_PACKAGES as readonly string[]).some(
    (dep) => pkg === dep || id === dep || id.startsWith(`${dep}/`)
  )
}

export function isNodeBuiltinId(id: string): boolean {
  return NODE_BUILTIN_RE.test(id)
}

export function isNodeOnlyPackageId(id: string): boolean {
  if (isNodeBuiltinId(id)) return true
  const pkg = packageNameFromId(id)
  if (!pkg) {
    return (NODE_ONLY_PACKAGE_PREFIXES as readonly string[]).some(
      (p) => id === p || id.startsWith(`${p}/`) || id.startsWith(p)
    )
  }
  return (NODE_ONLY_PACKAGE_PREFIXES as readonly string[]).some(
    (p) => pkg === p || matchesPrefix(pkg, p) || id.startsWith(p)
  )
}

/** 扫描 dist 文本时：是否为禁止泄漏的裸 import 说明符 */
export function isForbiddenDistBareImport(specifier: string): boolean {
  if (isNodeBuiltinId(specifier) || isNodeOnlyPackageId(specifier)) return true
  if (specifier === 'ai' || specifier.startsWith('ai/')) return true
  if (specifier.startsWith('@ai-sdk/')) return true
  if (
    specifier === '@modelcontextprotocol/sdk' ||
    specifier.startsWith('@modelcontextprotocol/sdk/')
  ) {
    return true
  }
  if (specifier === '@opentiny/next' || specifier.startsWith('@opentiny/next/')) return true
  return false
}
