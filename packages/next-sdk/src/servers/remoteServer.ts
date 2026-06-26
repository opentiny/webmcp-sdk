import { createMCPClient } from '@ai-sdk/mcp'
import type { NextMcpServer, RemoteServer } from './servers'
import type { ToolSet } from 'ai'

export const isRemoteServer = (server: NextMcpServer) => ['iframe', 'streamable-http', 'sse'].includes(server.type)

/** 构建远程服务的工具 */
export async function buildRemoteTools(server: RemoteServer) {
  try {
    const client = await createMCPClient({
      transport: {
        type: server.type,
        url: server.url,
        headers: server.headers || {}
      }
    })
    server.client = client

    server.tools = (await client.tools()) as ToolSet
  } catch (error) {
    console.error('buildRemoteTools error', error)
  }
}

/** 移除远程服务的工具 */
export async function beforeRemoveServer(server: RemoteServer) {
  if (server.client) {
    server.client = undefined
    server.tools = undefined
  }
}
