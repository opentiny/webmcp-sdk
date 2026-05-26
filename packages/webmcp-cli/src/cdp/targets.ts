import CDP from 'chrome-remote-interface'
import { DEBUG_PORT, getDebugListUrl } from '../constants.js'

export interface PageTarget {
  id: string
  title: string
  url: string
  type: string
}

/** DevTools、Chrome 内置页等非用户可浏览的 CDP page 目标 */
const NON_BROWSABLE_URL_PREFIXES = [
  'devtools://',
  'chrome-devtools://',
  'chrome://',
  'chrome-extension://',
  'chrome-untrusted://',
  'chrome-search://',
  'edge://',
  'view-source:'
] as const

/**
 * 是否为可注入、可自动化的普通网页标签（排除 DevTools 与 chrome:// 等内置页）
 */
export function isBrowsablePageTarget(target: PageTarget): boolean {
  if (target.type !== 'page') {
    return false
  }
  const url = (target.url || '').trim()
  if (!url) {
    return true
  }
  return !NON_BROWSABLE_URL_PREFIXES.some((prefix) => url.startsWith(prefix))
}

export function filterBrowsablePageTargets(targets: PageTarget[]): PageTarget[] {
  return targets.filter(isBrowsablePageTarget)
}

/**
 * 获取所有调试目标
 */
export async function fetchPageTargets(): Promise<PageTarget[]> {
  const response = await fetch(getDebugListUrl(DEBUG_PORT))
  if (!response.ok) {
    throw new Error(`无法获取标签页列表: HTTP ${response.status}`)
  }
  const list = (await response.json()) as PageTarget[]
  return list
}

/**
 * 获取可浏览的普通网页标签（已过滤 DevTools、chrome:// 等）
 */
export async function fetchBrowsablePageTargets(): Promise<PageTarget[]> {
  return filterBrowsablePageTargets(await fetchPageTargets())
}

/**
 * 查找当前前台可见的标签页（避免始终连到 pages[0] 导致读到别的页的 window）
 */
export async function findActivePageTarget(): Promise<PageTarget> {
  const targets = await CDP.List({ port: DEBUG_PORT })
  const pages = filterBrowsablePageTargets(targets)

  if (pages.length === 0) {
    throw new Error('未找到可用的浏览器标签页')
  }

  if (pages.length === 1) {
    return pages[0]
  }

  for (const page of pages) {
    let client: CDP.Client | null = null
    try {
      client = await CDP({ port: DEBUG_PORT, target: page })
      const { Runtime } = client
      await Runtime.enable()
      const result = await Runtime.evaluate({
        expression: `document.visibilityState === 'visible'`,
        returnByValue: true
      })
      if (result.result.value === true) {
        return page
      }
    } catch {
      // 该标签可能已关闭或不可访问，尝试下一个
    } finally {
      await client?.close()
    }
  }

  // 回退：优先非 about:blank，否则第一个
  const nonBlank = pages.find((p) => p.url && p.url !== 'about:blank')
  return nonBlank ?? pages[0]
}

/**
 * 获取当前活动 page 目标
 */
export async function getActivePageTarget(): Promise<PageTarget> {
  return findActivePageTarget()
}

/**
 * 连接到当前前台可见的标签页
 */
export async function connectToActivePage(): Promise<CDP.Client> {
  const { client } = await connectToActivePageWithTarget()
  return client
}

/**
 * 连接前台标签页并返回 target 信息（避免重复探测且 tabId 与 CDP 会话一致）
 */
export async function connectToActivePageWithTarget(): Promise<{
  client: CDP.Client
  target: PageTarget
}> {
  const target = await findActivePageTarget()
  const client = await CDP({ port: DEBUG_PORT, target })
  return { client, target }
}
