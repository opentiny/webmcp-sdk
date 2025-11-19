import { WebMcpServer, z, createMessageChannelPairTransport } from '@opentiny/next-sdk'
import { getAllMcpServersByIsAlwaysEnabled } from '@/mcp-servers'
import { useExtraTools } from './extraTools'

export const createMcpServer = async () => {
  const [serverTransport, clientTransport] = createMessageChannelPairTransport()
  const server = new WebMcpServer({ name: 'sidepanel-mcp-server', version: '1.0.0' })

  // 获取所有 type='sideMcpServer' 的工具配置
  const mcpServers = getAllMcpServersByIsAlwaysEnabled()

  const createProxServer = (meta: { name: string; url: string; [key: string]: any }) => {
    const resolveTargetUrl = (toolName: string) => {
      return meta.toolsJumpLinks?.[toolName] ?? meta.url
    }

    const isUrlMatch = (tabUrl: string | undefined, targetUrl: string) => {
      if (!tabUrl) return false
      try {
        const current = new URL(tabUrl)
        const expected = new URL(targetUrl)
        if (current.href === expected.href) {
          return true
        }
        return current.origin === expected.origin && current.pathname === expected.pathname
      } catch (error) {
        return tabUrl.startsWith(targetUrl)
      }
    }

    const findMatchedTabId = async (targetUrl: string, toolName: string) => {
      const tabIds: number[] | undefined = (browser as any).hostNameMap.get(meta.name)
      if (!tabIds || tabIds.length === 0) {
        return
      }

      if (!meta.toolsJumpLinks?.[toolName]) {
        return tabIds[tabIds.length - 1]
      }

      for (let index = tabIds.length - 1; index >= 0; index -= 1) {
        const candidateId = tabIds[index]
        try {
          const tab = await browser.tabs.get(candidateId)
          if (tab && isUrlMatch(tab.url, targetUrl)) {
            return candidateId
          }
        } catch (error) {
          console.warn(`【Sidepanel MCP】查询 tab 失败, tabId: ${candidateId}`, error)
        }
      }
    }

    return new Proxy(server, {
      get(target, prop) {
        if (prop === 'registerTool') {
          return (...args: any[]) => {
            const toolName = args[0]
            args[args.length - 1] = async (...args: any[]) => {
              const targetUrl = resolveTargetUrl(toolName)
              let tabId: number | undefined

              const matchedTabId = await findMatchedTabId(targetUrl, toolName)

              if (!matchedTabId) {
                // 页面未打开或地址不匹配，需要打开新页签并等待初始化
                try {
                  // 打开新页签（直接激活以显示页签切换效果）
                  const createdTab = await browser.tabs.create({ url: targetUrl, active: true })

                  // 等待 content script 初始化完成并注册到 hostNameMap
                  tabId = await (browser as any).waitForHostInit(targetUrl)

                  if (tabId === undefined || tabId === null) {
                    tabId = createdTab.id
                  }
                } catch (error) {
                  throw new Error(`无法打开或初始化页面: ${meta.name}`)
                }
              } else {
                // 使用最后一个激活的 tabId
                tabId = matchedTabId
                try {
                  await browser.tabs.update(tabId, { active: true })
                } catch (error) {
                  console.warn(`【Sidepanel MCP】激活已存在 tab 失败, tabId: ${tabId}`, error)
                }
              }

              if (tabId === undefined || tabId === null) {
                throw new Error(`未找到可用的页面: ${meta.name}`)
              }

              console.log('【Sidepanel MCP】执行工具:', { toolName, tabId, args })

              // 执行工具调用
              const result = await new Promise((resolve, reject) => {
                browser.tabs.sendMessage(
                  tabId!,
                  {
                    type: 'execute-tool-from-sidepanel-to-content',
                    data: [toolName, ...args]
                  },
                  (response: any) => {
                    if (browser.runtime.lastError) {
                      reject(new Error(browser.runtime.lastError.message))
                    } else {
                      resolve(response)
                    }
                  }
                )
              })

              return result
            }

            return (target[prop] as any)(...args)
          }
        }
        return target[prop as keyof typeof target]
      }
    })
  }

  // 遍历并注册所有工具
  for (const { meta, tool } of mcpServers) {
    try {
      // 调用工具注册函数
      tool({ server: createProxServer(meta), z })

      console.log(`[Sidepanel MCP] ✓ 工具加载成功: ${meta.name}`)
    } catch (error) {
      console.error(`[Sidepanel MCP] ✗ 工具加载失败: ${meta.name}`, error)
    }
  }

  // 注册插件内部自带的工具
  useExtraTools(server)

  // 连接服务器到 InMemoryTransport
  await server.connect(serverTransport)

  return { server, clientTransport }
}
