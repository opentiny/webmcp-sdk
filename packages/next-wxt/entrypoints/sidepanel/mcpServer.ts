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

  const createProxServer = (meta: any) => {
    return new Proxy(server, {
      get(target, prop, receiver) {
        if (prop === 'registerTool') {
          return (...args: any[]) => {
            const toolName = args[0]
            args[args.length - 1] = async (...args: any[]) => {
              const tabId = (browser as any).hostNameMap.get(meta.name)?.[0]
              if (!tabId) {
                throw new Error(`Tab not found for host: ${meta.name}`)
              }
              const result = new Promise((resolve, reject) => {
                browser.tabs.sendMessage(
                  tabId,
                  {
                    type: 'execute-tool-from-sidepanel-to-content',
                    data: [toolName, ...args]
                  },
                  (response: any) => {
                    resolve(response)
                  }
                )
              })
              return result
            }

            return target[prop](...(args as any))
          }
        }
        return target[prop as keyof typeof target]
      }
    })
  }

  // 遍历并注册所有工具
  for (const { meta, tool, domain } of mcpServers) {
    try {
      console.log(`[Sidepanel MCP] 正在加载工具: ${meta.name} (${domain})`)

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
