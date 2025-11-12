import { WebMcpServer, z, InMemoryTransport } from '@opentiny/next-sdk'
import { getAllMcpServersByIsAlwaysEnabled } from '@/mcp-servers'

// 使用 InMemoryTransport 创建传输对
// InMemoryTransport 适用于客户端和服务器在同一进程中的场景
const [serverTransport, clientTransport] = InMemoryTransport.createLinkedPair()

export { clientTransport }

export const createMcpServer = async () => {
  const server = new WebMcpServer({ name: 'sidepanel-mcp-server', version: '1.0.0' })

  // 获取所有 type='sideMcpServer' 的工具配置
  const mcpServers = getAllMcpServersByIsAlwaysEnabled()

  const createProxServer = (meta: { name: string; url: string; [key: string]: any }) => {
    return new Proxy(server, {
      get(target, prop, receiver) {
        if (prop === 'registerTool') {
          return (...args: any[]) => {
            const toolName = args[0]
            args[args.length - 1] = async (...args: any[]) => {
              let tabId: number | undefined
              const tabIds = (browser as any).hostNameMap.get(meta.name)

              if (!tabIds || tabIds.length === 0) {
                // 页面未打开，需要打开新页签并等待初始化
                try {
                  // 打开新页签（直接激活以显示页签切换效果）
                  const tab = await browser.tabs.create({ url: meta.url, active: true })

                  // 等待 content script 初始化完成并注册到 hostNameMap
                  tabId = await (browser as any).waitForHostInit(meta.name)
                } catch (error) {
                  throw new Error(`无法打开或初始化页面: ${meta.name}`)
                }
              } else {
                // 使用最后一个激活的 tabId
                tabId = tabIds[tabIds.length - 1]
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
  for (const { meta, tool, domain } of mcpServers) {
    try {
      // 调用工具注册函数
      tool({ server: createProxServer(meta), z })

      console.log(`[Sidepanel MCP] ✓ 工具加载成功: ${meta.name}`)
    } catch (error) {
      console.error(`[Sidepanel MCP] ✗ 工具加载失败: ${meta.name}`, error)
    }
  }

  // 连接服务器到 InMemoryTransport
  await server.connect(serverTransport)
  return server
}
