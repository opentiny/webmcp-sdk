import { existsSync, readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import type CDP from 'chrome-remote-interface'
import { connectToActivePage, fetchBrowsablePageTargets, getActivePageTarget } from './targets.js'

// 由 scripts/build-inject.mjs (esbuild) 打包的单文件 IIFE，已内联 @mcp-b/webmcp-polyfill 与 @page-agent/page-controller
function resolveInjectBundlePath(): string {
  const here = dirname(fileURLToPath(import.meta.url))
  const candidates = [
    join(here, '../inject-bundle.js'), // dist/cdp -> dist/inject-bundle.js
    join(here, '../../dist/inject-bundle.js') // src/cdp -> dist/inject-bundle.js (tsx dev)
  ]
  for (const path of candidates) {
    if (existsSync(path)) {
      return path
    }
  }
  throw new Error('inject-bundle.js 未找到，请先执行 pnpm build:inject')
}

let cachedInjectBundle: string | null = null

function getInjectBundle(): string {
  if (!cachedInjectBundle) {
    cachedInjectBundle = readFileSync(resolveInjectBundlePath(), 'utf-8')
  }
  return cachedInjectBundle
}

function formatEvaluateError(details?: { text?: string; exception?: { description?: string } }): string {
  return details?.exception?.description || details?.text || '页面脚本执行失败'
}

/**
 * 在页面上下文中执行表达式并返回结果
 */
export async function evaluateOnPage<T>(
  client: CDP.Client,
  expression: string,
  awaitPromise = true
): Promise<T> {
  const { Runtime } = client
  await Runtime.enable()

  const result = await Runtime.evaluate({
    expression,
    awaitPromise,
    returnByValue: true
  })

  if (result.exceptionDetails) {
    throw new Error(formatEvaluateError(result.exceptionDetails))
  }

  return result.result.value as T
}

/**
 * 注入 WebMCP CLI 页面运行时脚本
 */
export async function ensurePageInjected(client?: CDP.Client): Promise<CDP.Client> {
  const c = client ?? (await connectToActivePage())

  const already = await evaluateOnPage<boolean>(c, '!!window.__webmcpcli_init', false)
  if (already) {
    return c
  }

  const bundle = getInjectBundle()
  try {
    await evaluateOnPage(c, bundle, true)
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    throw new Error(`页面脚本注入失败: ${msg}`)
  }

  const inited = await evaluateOnPage<boolean>(c, '!!window.__webmcpcli_init', false)
  if (!inited) {
    throw new Error('页面脚本注入失败: __webmcpcli_init 未设置')
  }

  return c
}

/**
 * 获取当前标签页 ID 与其它标签页信息
 */
export async function getTabsContext(activeTabId?: string): Promise<{
  currentTabId: string
  currentUrl: string
  otherTabs: Array<{ url: string; title: string; tabId: string }>
}> {
  const current = activeTabId
    ? (await fetchBrowsablePageTargets()).find((t) => t.id === activeTabId) ??
      (await getActivePageTarget())
    : await getActivePageTarget()
  const pages = await fetchBrowsablePageTargets()

  const otherTabs = pages
    .filter((t) => t.id !== current.id)
    .map((t) => ({
      url: t.url || '',
      title: t.title || '',
      tabId: t.id
    }))

  return {
    currentTabId: current.id,
    currentUrl: current.url || '',
    otherTabs
  }
}
