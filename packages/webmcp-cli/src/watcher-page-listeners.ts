import type { Page } from 'puppeteer-core'

/**
 * 同一 Page 实例只挂一次导航监听（WeakSet 在任何 await 前占位，避免并发 prepare 重复 on）。
 * @returns 是否本次新挂载了监听
 */
export function ensureWatcherPageListeners(
  page: Page,
  onNavigate: () => void,
  prepared: WeakSet<Page>
): boolean {
  if (prepared.has(page)) return false
  // 必须在任何 await 之前占位，防止 targetcreated/targetchanged 并发重复挂载
  prepared.add(page)
  page.on('framenavigated', (frame) => {
    if (frame !== page.mainFrame()) return
    onNavigate()
  })
  page.on('domcontentloaded', () => {
    onNavigate()
  })
  page.on('load', () => {
    onNavigate()
  })
  return true
}
