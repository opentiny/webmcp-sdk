import type { Page } from 'puppeteer-core'
import type { PreScannedTooltip } from '@opentiny/next-sdk/page-tools/constants'

/** 预扫描候选数量上限，避免页面有大量 tp-helptip 时阻塞过久 */
const MAX_PRESCAN_CANDIDATES = 15

/**
 * CLI 端预扫描 tp-helptip：用 Puppeteer 真实鼠标 hover，通过 MutationObserver
 * 检测 body 下是否新增了 tip 弹窗节点。有则提取文本，标记为 tooltip。
 *
 * 仅 hover 不 click——browserState 应为只读观测，不能改状态。
 * 结果存入 window.__webmcpcli_preScannedTooltips 供 scanForDynamicTooltips 消费。
 */
export async function preScanTooltips(page: Page): Promise<void> {
  try {
    // 1. 获取所有可见的 tp-helptip 元素坐标
    const tips = await page.evaluate(() => {
      const els = Array.from(document.querySelectorAll('tp-helptip'))
      return els.map((el, i) => {
        const rect = el.getBoundingClientRect()
        return {
          index: i,
          x: Math.round(rect.x + rect.width / 2),
          y: Math.round(rect.y + rect.height / 2),
          visible: rect.width > 0 && rect.height > 0
        }
      }).filter(t => t.visible && t.x >= 0 && t.y >= 0)
    })

    if (!tips || tips.length === 0) return

    const results: PreScannedTooltip[] = []
    const capped = tips.slice(0, MAX_PRESCAN_CANDIDATES)

    for (const tip of capped) {
      // 2. 滚动元素到可视区域
      await page.evaluate((idx: number) => {
        const els = document.querySelectorAll('tp-helptip')
        const el = els[idx]
        if (el) el.scrollIntoView({ block: 'center' })
      }, tip.index)
      await new Promise(r => setTimeout(r, 200))

      // 3. 重新获取坐标（滚动后位置可能变化）
      const coords = await page.evaluate((idx: number) => {
        const els = document.querySelectorAll('tp-helptip')
        const el = els[idx] as HTMLElement
        if (!el) return null
        const rect = el.getBoundingClientRect()
        return { x: Math.round(rect.x + rect.width / 2), y: Math.round(rect.y + rect.height / 2) }
      }, tip.index)
      if (!coords) continue

      // 4. 设置 MutationObserver 捕获 hover 期间新增的 DOM 节点
      await page.evaluate(() => {
        const obs = new MutationObserver((mutations) => {
          for (const mutation of mutations) {
            for (const node of Array.from(mutation.addedNodes)) {
              if (node instanceof Element) {
                const arr = (window as unknown as TipScanWindow).__tipScanAdded
                if (arr) {
                  arr.push(node)
                }
              }
            }
          }
        })
        ;(window as unknown as TipScanWindow).__tipScanAdded = []
        ;(window as unknown as TipScanWindow).__tipScanObserver = obs
        obs.observe(document.body, { childList: true, subtree: true })
      })

      // 5. 真实鼠标 hover 检测 tooltip
      await page.mouse.move(coords.x, coords.y)
      await new Promise(r => setTimeout(r, 800))

      const tooltipText = await page.evaluate(() => {
        const w = window as unknown as TipScanWindow
        if (w.__tipScanObserver) w.__tipScanObserver.disconnect()
        const added: Element[] = w.__tipScanAdded || []

        for (const node of added) {
          if (node.classList?.contains('webmcp-page-agent-wrapper')) continue
          const rect = node.getBoundingClientRect()
          if (rect.width < 1 || rect.height < 1) continue
          const style = window.getComputedStyle(node as HTMLElement)
          if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') continue
          const text = (node.textContent || '').trim().replace(/\s+/g, ' ')
          if (text.length > 1 && text.length < 500) return text.substring(0, 200)
        }
        return ''
      })

      // 移开鼠标，关闭可能的 tooltip
      await page.mouse.move(0, 0)
      await new Promise(r => setTimeout(r, 300))

      if (tooltipText) {
        results.push({ index: tip.index, text: tooltipText, type: 'tooltip' })
      }
    }

    // 6. 存储预扫描结果到页面上下文
    if (results.length > 0) {
      await page.evaluate((data) => {
        ;(window as unknown as TipScanWindow).__webmcpcli_preScannedTooltips = data
      }, results)
    }
  } catch {
    // 预扫描失败不应阻断工具执行
  }
}

/** 预扫描过程中临时挂在 window 上的观察器和节点列表 */
interface TipScanWindow {
  __tipScanObserver?: MutationObserver
  __tipScanAdded?: Element[]
  __webmcpcli_preScannedTooltips?: PreScannedTooltip[]
}
