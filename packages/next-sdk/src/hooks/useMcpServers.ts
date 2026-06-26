import { ref } from 'vue'
import type { NextMcpServer, RemoteServer } from '../servers/servers'
import type { NextAgent } from '../next-agent'
import type { ToolSet } from 'ai'
import { beforeRemoveServer, buildRemoteTools, isRemoteServer } from '../servers/remoteServer'
import { buildPageTools } from '../servers/pageServer'
/** 管理自定义的MCP服务 */
export function useMcpServers(agent: NextAgent) {
  /** 所有MCP服务， 尽量不要直接操作mcpServers, 而是调用 addMcpServer(server)*/
  const mcpServers = ref<NextMcpServer[]>([])
  // 最终传递给 ToolLoopAgent 的工具，不要修改引用地址
  const tools: ToolSet = {}
  /** 生成服务ID */
  let _guid = 0

  /** 添加MCP服务， iframe，page的服务只允许添加一次 */
  async function addMcpServer(server: NextMcpServer) {
    const onceServerTypes = ['page']
    if (onceServerTypes.includes(server.type) && mcpServers.value.find((s) => onceServerTypes.includes(s.type))) {
      console.warn(`${server.type} MCP服务已存在， 请重复添加`)
      return
    }
    server.id = `${server.type}-${_guid++}`
    mcpServers.value.push(server)
  }

  /** 添加MCP服务 */
  async function removeMcpServer(serverOrId: NextMcpServer | string) {
    const server: NextMcpServer | undefined =
      typeof serverOrId === 'string' ? mcpServers.value.find((s) => s.id === serverOrId) : serverOrId
    if (!server) return

    if (isRemoteServer(server)) {
      await beforeRemoveServer(server as RemoteServer)
    }

    mcpServers.value = mcpServers.value.filter((s) => s !== server)
  }

  // 打开 MCP服务
  async function openMcpServers() {
    // 清空工具
    Object.keys(tools).forEach((key) => {
      delete tools[key]
    })

    // 打开并收集
    for (const server of mcpServers.value) {
      if (server.type === 'page') {
        await buildPageTools(server)
      } else if (isRemoteServer(server)) {
        await buildRemoteTools(server as RemoteServer)
      }
      Object.assign(tools, server.tools || {})
    }
  }

  // 对话结束后，才一次性关闭
  async function closeMcpServers() {
    for (const server of mcpServers.value) {
      if (isRemoteServer(server)) {
        await (server as RemoteServer).client?.close()
      }
    }
  }

  // ************ 生命周期 ************
  agent.on('chatStart', async () => {
    await openMcpServers()
  })

  agent.on('chatEnd', async () => {
    await closeMcpServers()
  })

  return {
    mcpServers,
    tools,
    addMcpServer,
    removeMcpServer,
    openMcpServers,
    closeMcpServers
  }
}
