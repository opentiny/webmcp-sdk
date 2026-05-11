import { getCurrentTabId, waitForTabLoad } from './utils/utils'
import { getSnapshotManager } from './accessibility/utils'
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

export const getBuiltinExtensionTools = (): BuiltinExtensionTool[] => {
  return [
    {
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
    },
    {
      name: 'page-agent-tool',
      title: 'Page Agent 工具',
      description: `用于分析和操作当前浏览器页面的通用工具。
每次执行 click、fill、select 动作前，**必须**先调用 browserState 获取页面最新状态。
- browserState：获取页面标题、URL、HTML 无障碍树内容（包含可操作元素及其索引）
- click：根据元素索引点击
- fill：根据元素索引填写文本
- select：根据元素索引选择下拉框选项
- scroll：滚动页面（不带 index：滚动整个文档；带 index：滚动该元素的最近可滚动祖先）
- executeJavascript：执行 JavaScript 代码`,
      inputSchema: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['browserState', 'click', 'fill', 'select', 'scroll', 'executeJavascript'],
            description: '执行的动作名称'
          },
          index: { type: 'number', description: '元素索引（click/fill/select 时必须提供）' },
          text: { type: 'string', description: '文本内容（fill/select 时必须提供）' },
          down: { type: 'boolean', description: '上下滚动方向（scroll 时必须提供）' },
          right: { type: 'boolean', description: '水平滚动方向（scroll 时可选）' },
          numPages: { type: 'number', description: '滚动页数（建议 0.1，最大 5）' },
          pixels: { type: 'number', description: '滚动像素数' },
          script: { type: 'string', description: 'JavaScript 代码（executeJavascript 时必须提供）' }
        },
        required: ['action']
      },
      execute: async (args: any) => {
        const tabId = await getCurrentTabId()
        if (!tabId) {
          return { content: [{ type: 'text', text: 'Error: 无法获取当前标签页' }] }
        }

        const callPageControl = async (action: string, ...payload: any[]) => {
          const res = await browser.tabs.sendMessage(tabId, {
            type: 'PAGE_CONTROL',
            action,
            payload
          })
          if (!res?.success) throw new Error(res?.error || 'PAGE_CONTROL 调用失败')
          return res.result
        }

        try {
          await callPageControl('show_mask')

          let result: any
          if (args.action === 'browserState') {
            result = await callPageControl('get_browser_state')
            await callPageControl('hide_mask')
            await callPageControl('clean_up_highlights')
            return { content: [{ type: 'text', text: `浏览器状态: ${JSON.stringify(result)}` }] }
          } else if (args.action === 'click') {
            if (args.index == null) return { content: [{ type: 'text', text: '点击结果: 缺少元素索引' }] }
            await callPageControl('update_tree')
            result = await callPageControl('click_element', args.index)
          } else if (args.action === 'fill') {
            if (args.index == null || !args.text) return { content: [{ type: 'text', text: '填写结果: 缺少元素索引或文本' }] }
            await callPageControl('update_tree')
            result = await callPageControl('input_text', args.index, args.text)
          } else if (args.action === 'select') {
            if (args.index == null || !args.text) return { content: [{ type: 'text', text: '选择结果: 缺少元素索引或文本' }] }
            await callPageControl('update_tree')
            result = await callPageControl('select_option', args.index, args.text)
          } else if (args.action === 'scroll') {
            if (!args.down && !args.right) return { content: [{ type: 'text', text: '滚动结果: 缺少滚动方向参数' }] }
            await callPageControl('update_tree')
            const scrollArgs = { index: args.index, numPages: args.numPages, pixels: args.pixels }
            result = args.right
              ? await callPageControl('scroll_horizontally', { ...scrollArgs, right: args.right })
              : await callPageControl('scroll', { ...scrollArgs, down: args.down })
          } else if (args.action === 'executeJavascript') {
            if (!args.script) return { content: [{ type: 'text', text: '脚本执行异常: 缺少 JavaScript 代码' }] }
            result = await callPageControl('execute_javascript', args.script)
          }

          await callPageControl('hide_mask')
          await callPageControl('clean_up_highlights')
          return { content: [{ type: 'text', text: `${args.action} 结果: ${JSON.stringify(result)}` }] }
        } catch (error: any) {
          return { content: [{ type: 'text', text: `page-agent-tool 异常: ${error.message}` }] }
        }
      }
    }
  ]
}

export const useExtraTools = (nativeCtx: NativeModelContext) => {
  const tools = getBuiltinExtensionTools()
  tools.forEach(tool => nativeCtx.registerTool(tool))
}
