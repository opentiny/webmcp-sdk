import { waitForTabLoad } from './utils/utils'
import { getSnapshotManager } from './utils/snapshotManager'
import { waitForPageToolsReady } from './utils/waitForPageTools'

type NativeModelContext = {
  registerTool: (def: {
    name: string
    title?: string
    description?: string
    inputSchema?: object
    execute: (args: any) => Promise<any>
  }) => void
}

export interface BuiltinExtensionTool {
  name: string
  title?: string
  description?: string
  inputSchema?: object
  execute: (args: any) => Promise<any>
}

export const tabsManagerTool: BuiltinExtensionTool = {
  name: 'tabs-manager',
  title: '标签页管理',
  description: '可以在当前环境中，打开新网址，切换标签页，关闭标签页，查询全部标签页等操作',
  inputSchema: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['open', 'switch', 'close', 'switch-pre-tab', 'list-tabs'],
        description:
          '操作类型：open（打开新网址）、switch（切换标签页）、close（关闭标签页）、switch-pre-tab（切换上一个标签页）、list-tabs（查询全部标签页）'
      },
      url: {
        type: 'string',
        description: '要打开的网址。在 open 操作时必须传入该参数。'
      },
      tabId: {
        type: 'number',
        description: '待操作的标签页 ID。在 switch 或 close 操作时必须传入该参数。'
      }
    },
    required: ['action']
  },
  execute: async ({ action, url, tabId }: any) => {
    if (action === 'open') {
      if (!url) return { content: [{ type: 'text', text: '打开新网址工具错误: 缺少网址参数' }] }

      try {
        const { manager } = await getSnapshotManager()
        await manager.highlightPage(false)
      } catch (_) {}

      const isUrlMatch = (tabUrl: string | undefined, targetUrl: string): boolean => {
        if (!tabUrl) return false
        try {
          const current = new URL(tabUrl)
          const expected = new URL(targetUrl)
          if (current.href === expected.href) return true
          return current.origin === expected.origin && current.pathname === expected.pathname
        } catch (_) {
          return tabUrl.startsWith(targetUrl) || targetUrl.startsWith(tabUrl)
        }
      }

      const allTabs = await browser.tabs.query({})
      const matchedTab = allTabs.find((tab) => isUrlMatch(tab.url, url))

      if (matchedTab && matchedTab.id) {
        try {
          await browser.tabs.update(matchedTab.id, { active: true })
          if (matchedTab.status !== 'complete') await waitForTabLoad(matchedTab.id)
          await waitForPageToolsReady(matchedTab.id)
          return {
            content: [{ type: 'text', text: `网址已在标签页中打开，已切换到该标签页, tabId: ${matchedTab.id}` }]
          }
        } catch (_) {
          const createdTab = await browser.tabs.create({ url, active: true })
          await waitForTabLoad(createdTab.id!)
          await waitForPageToolsReady(createdTab.id!)
          return { content: [{ type: 'text', text: `已打开新网址, tabId: ${createdTab.id}` }] }
        }
      } else {
        const createdTab = await browser.tabs.create({ url, active: true })
        await waitForTabLoad(createdTab.id!)
        await waitForPageToolsReady(createdTab.id!)
        return { content: [{ type: 'text', text: `已打开新网址, tabId: ${createdTab.id}` }] }
      }
    }

    if (action === 'switch') {
      if (!tabId) return { content: [{ type: 'text', text: '切换标签页工具错误: 缺少标签页 ID 参数' }] }
      try {
        const { manager } = await getSnapshotManager()
        await manager.highlightPage(false)
      } catch (_) {}
      try {
        const tab = await browser.tabs.get(tabId)
        await browser.tabs.update(tabId, { active: true })
        if (tab.status !== 'complete') await waitForTabLoad(tabId)
        await waitForPageToolsReady(tabId)
        return { content: [{ type: 'text', text: `已切换到标签页 ${tabId}` }] }
      } catch (err: any) {
        return { content: [{ type: 'text', text: `切换标签页工具错误: ${err.message}` }] }
      }
    }

    if (action === 'close') {
      if (!tabId) return { content: [{ type: 'text', text: '关闭标签页工具错误: 缺少标签页 ID 参数' }] }
      try {
        await browser.tabs.remove(tabId)
        return { content: [{ type: 'text', text: `已关闭标签页 ${tabId}` }] }
      } catch (err: any) {
        return { content: [{ type: 'text', text: `关闭标签页工具错误: ${err.message}` }] }
      }
    }

    if (action === 'switch-pre-tab') {
      try {
        const { manager } = await getSnapshotManager()
        await manager.highlightPage(false)
      } catch (_) {}
      try {
        // @ts-ignore
        await browser.runtime.sendMessage({ type: 'active-pre-tab', direction: 'side->bg' })
        return { content: [{ type: 'text', text: '已激活上一个标签页' }] }
      } catch (err: any) {
        return { content: [{ type: 'text', text: `激活上一个标签页工具错误: ${err.message}` }] }
      }
    }

    if (action === 'list-tabs') {
      const allTabs = await browser.tabs.query({})
      return {
        content: [
          {
            type: 'text',
            text: `所有标签页为： ${JSON.stringify(allTabs.map((tab) => ({ tabId: tab.id, url: tab.url, title: tab.title })))}`
          }
        ]
      }
    }
  }
}

export const useExtraTools = (nativeCtx: NativeModelContext) => {
  nativeCtx.registerTool(tabsManagerTool)
}
