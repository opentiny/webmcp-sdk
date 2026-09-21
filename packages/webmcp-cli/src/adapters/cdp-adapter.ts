/**
 * CdpBrowserAdapter
 *
 * 基于 Puppeteer + CDP 协议实现的 BrowserAdapter，
 * 复用现有 browser.ts 的连接逻辑和 commands/ 下的实现。
 */

import type { Browser, Page } from 'puppeteer-core'
import {
  connectBrowser,
  getTargetPage,
  injectIntoPage,
  getPageTargetId,
  getPageTargets,
  getTargetIdFromTarget,
  activateTabById,
  setLastActiveTabId
} from '../browser.js'
import type { BrowserAdapter, BrowserStateResult, TabsOptions } from './interface.js'

export class CdpBrowserAdapter implements BrowserAdapter {
  private browser: Browser | null = null

  private async getBrowser(): Promise<Browser> {
    if (!this.browser) {
      this.browser = await connectBrowser()
    }
    return this.browser
  }

  async getState(tabId?: string | number): Promise<BrowserStateResult> {
    const browser = await this.getBrowser()
    const tabIdStr = tabId != null ? String(tabId) : undefined
    const page = await getTargetPage(browser, tabIdStr)
    await injectIntoPage(page)

    const state = await page.evaluate(async () => {
      const url = document.URL
      const title = document.title
      const mcp = (document as any).modelContext || (navigator as any).modelContext
      let webmcpTools: Array<{ name: string; description?: string }> = []
      if (mcp && typeof mcp.getTools === 'function') {
        try {
          const toolsResult = await mcp.getTools()
          const list = (toolsResult?.tools || toolsResult || []) as Array<{ name?: string; description?: string }>
          webmcpTools = list
            .filter((t) => t && typeof t.name === 'string')
            .map((t) => ({
              name: t.name as string,
              description: typeof t.description === 'string' ? t.description.slice(0, 200) : undefined
            }))
        } catch {
          webmcpTools = []
        }
      }
      return { url, title, webmcpTools }
    })

    const activeTabId = await getPageTargetId(page).catch(() => null)
    const pages = await browser.pages()
    const tabs = await Promise.all(
      pages.map(async (p) => {
        const pUrl = p.url()
        if (pUrl.startsWith('devtools://')) return null
        const pTitle = await Promise.race([
          p.title().catch(() => 'Unknown'),
          new Promise<string>((resolve) => setTimeout(() => resolve('Unknown'), 500))
        ])
        return {
          tabId: await getPageTargetId(p).catch(() => pUrl),
          title: pTitle,
          url: pUrl
        }
      })
    )

    return {
      ...state,
      activeTabId: activeTabId ?? undefined,
      tabs: tabs.filter(Boolean) as BrowserStateResult['tabs']
    }
  }

  async callTool(toolName: string, args: Record<string, unknown>, tabId?: string | number): Promise<unknown> {
    const browser = await this.getBrowser()
    const tabIdStr = tabId != null ? String(tabId) : undefined
    const page = await getTargetPage(browser, tabIdStr)
    const urlBefore = page.url()
    await injectIntoPage(page)

    const argsJson = JSON.stringify(args)
    try {
      const result = await page.evaluate(async (name, inputString) => {
        // @ts-expect-error WebMCP APIs are experimental
        const mcp = document.modelContext || navigator.modelContext
        if (!mcp || typeof mcp.executeTool !== 'function') {
          throw new Error('当前页面没有注入 WebMCP 环境 (document.modelContext 未找到)')
        }
        const tools = await mcp.getTools()
        const toolObj = tools.find((t: any) => t.name === name)
        if (!toolObj) throw new Error(`Tool ${name} not found`)
        let res = await mcp.executeTool(toolObj, inputString)
        if (typeof res === 'string') {
          try { res = JSON.parse(res) } catch { /* 保留原始字符串 */ }
        }
        if (res === undefined || res === null) {
          throw new Error('工具 execute 未返回结果')
        }
        if (typeof res === 'object' && (res as { success?: boolean }).success === false) {
          const failed = res as { error?: string; message?: string }
          throw new Error(failed.error || failed.message || '工具执行失败')
        }
        return res
      }, toolName, argsJson)
      return result
    } catch (evalError: unknown) {
      const errMsg = evalError instanceof Error ? evalError.message : String(evalError)
      const isContextDestroyed =
        errMsg.includes('context was destroyed') ||
        errMsg.includes('Execution context was destroyed') ||
        (errMsg.includes('Cannot read properties of null') && errMsg.includes('context'))

      if (isContextDestroyed) {
        await new Promise(resolve => setTimeout(resolve, 800))
        const newUrl = page.url()
        if (newUrl && newUrl !== urlBefore) {
          return { success: true, message: `工具 ${toolName} 执行完成，页面已导航至 ${newUrl}`, navigatedTo: newUrl }
        }
      }
      throw evalError
    }
  }

  async tabs(action: 'open' | 'close' | 'switch' | 'back' | 'forward', options: TabsOptions): Promise<unknown> {
    const browser = await this.getBrowser()
    const tabIdStr = options.tabId != null ? String(options.tabId) : undefined

    switch (action) {
      case 'open': {
        if (!options.url) throw new Error('tabs open 需要 url 参数')
        const page = await browser.newPage()
        await page.goto(options.url)
        await injectIntoPage(page)
        const tabId = await getPageTargetId(page)
        setLastActiveTabId(tabId)
        return { success: true, tabId, url: options.url }
      }
      case 'close': {
        const page = await getTargetPage(browser, tabIdStr)
        await page.close()
        return { success: true }
      }
      case 'switch': {
        if (!tabIdStr) throw new Error('tabs switch 需要 tabId 参数')
        await activateTabById(browser, tabIdStr)
        setLastActiveTabId(tabIdStr)
        return { success: true, tabId: tabIdStr }
      }
      case 'back': {
        const page = await getTargetPage(browser, tabIdStr)
        await page.goBack()
        return { success: true }
      }
      case 'forward': {
        const page = await getTargetPage(browser, tabIdStr)
        await page.goForward()
        return { success: true }
      }
    }
  }

  async dispose(): Promise<void> {
    if (this.browser) {
      await this.browser.disconnect().catch(() => {})
      this.browser = null
    }
  }
}
