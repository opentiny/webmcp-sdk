import type { Page } from 'puppeteer-core'

/**
 * CLI 端预扫描 tp-helptip：两阶段识别 tooltip 与帮助按钮
 *
 * 阶段1 - hover 识别 tooltip：用 Puppeteer 真实鼠标 hover，通过 MutationObserver
 *   检测 body 下是否新增了 tip 弹窗节点。有则提取文本，标记为 tooltip。
 * 阶段2 - click 识别帮助按钮：若 hover 未产生 tip 弹窗，则标记为 button，
 *   点击后检测是否出现帮助中心弹窗（如 tp-help-doc-browser），提取"解释说明"文本。
 *
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

    const results: Array<{ index: number; text: string; type: 'tooltip' | 'button' }> = []

    for (const tip of tips) {
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
                ;(window as any).__tipScanAdded = (window as any).__tipScanAdded || []
                ;(window as any).__tipScanAdded.push(node)
              }
            }
          }
        })
        ;(window as any).__tipScanAdded = []
        ;(window as any).__tipScanObserver = obs
        obs.observe(document.body, { childList: true, subtree: true })
      })

      // 5. 阶段1 - 真实鼠标 hover 检测 tooltip
      await page.mouse.move(coords.x, coords.y)
      await new Promise(r => setTimeout(r, 800))

      const tooltipText = await page.evaluate(() => {
        const obs = (window as any).__tipScanObserver
        if (obs) obs.disconnect()
        const added: Element[] = (window as any).__tipScanAdded || []

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
        // hover 产生了 body 下的 tip 弹窗 → 标记为 tooltip
        results.push({ index: tip.index, text: tooltipText, type: 'tooltip' })
        continue
      }

      // 6. 阶段2 - hover 未产生 tip 弹窗 → 标记为 button，点击检测帮助中心弹窗
      await page.mouse.move(coords.x, coords.y)
      await new Promise(r => setTimeout(r, 200))
      await page.mouse.click(coords.x, coords.y)
      await new Promise(r => setTimeout(r, 2000))

      const helpText = await page.evaluate(() => {
        // 检测帮助中心弹窗
        const panel = document.querySelector('.ti-global-help-panel-content, tp-help-doc-browser')
        if (!panel) return ''
        const fullText = (panel.textContent || '').trim().replace(/\s+/g, ' ')

        // 提取 "解释说明" 部分作为帮助摘要
        const explainIdx = fullText.indexOf('解释说明')
        if (explainIdx >= 0) {
          const paramIdx = fullText.indexOf('参数设置', explainIdx)
          const endIdx = paramIdx > explainIdx ? paramIdx : Math.min(fullText.length, explainIdx + 200)
          const explain = fullText.substring(explainIdx, endIdx).replace(/^解释说明\s*/, '').trim()
          if (explain.length > 1) return explain.substring(0, 200)
        }

        // 没有找到"解释说明"段，取前 200 字符
        if (fullText.length > 1) return fullText.substring(0, 200)
        return ''
      })

      // 关闭帮助弹窗
      await page.keyboard.press('Escape').catch(() => {})
      await new Promise(r => setTimeout(r, 500))

      if (helpText) {
        results.push({ index: tip.index, text: helpText, type: 'button' })
      }
    }

    // 7. 存储预扫描结果到页面上下文
    if (results.length > 0) {
      await page.evaluate((data) => {
        ;(window as any).__webmcpcli_preScannedTooltips = data
      }, results)
    }
  } catch {
    // 预扫描失败不应阻断工具执行
  }
}
