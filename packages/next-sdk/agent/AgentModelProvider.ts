import { streamText, stepCountIs, generateText, StreamTextResult } from 'ai'
import { experimental_createMCPClient as createMCPClient, experimental_MCPClientConfig as MCPClientConfig } from 'ai'
import type { ToolSet } from 'ai'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import type { IAgentModelProviderOption, McpServerConfig } from './type'
import { ProviderV2 } from '@ai-sdk/provider'
import { OpenAIProvider } from '@ai-sdk/openai'
import { createOpenAI } from '@ai-sdk/openai'
import { createDeepSeek } from '@ai-sdk/deepseek'
import { ExtensionClientTransport } from '../transport/ExtensionClientTransport'

export const AIProviderFactories = {
  ['openai']: createOpenAI,
  ['deepseek']: createDeepSeek
}

type ChatMethodFn = typeof streamText | typeof generateText

/** 一个通用的ai-sdk的Agent封装
 * @summary 内部自动管理了 llm, mcpServer, ai-sdk的clients 和 tools
 * @returns 暴露了 chat, chatStream方法
 */
export class AgentModelProvider {
  llm: ProviderV2 | OpenAIProvider
  /**  当前mcpServers对象集合。键为服务器名称，值为 McpServerConfig 或任意的 MCPTransport
   * 参考: https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling#initializing-an-mcp-client */
  mcpServers: Record<string, McpServerConfig> = {}
  /** 当前ai-sdk的 mcpClient 对象集合，键为服务器名称 */
  mcpClients: Record<string, any> = {}
  /** 当前 mcpClients 所对应的tools，键为服务器名称 */
  mcpTools: Record<string, Record<string, any>> = {}
  /** 需要实时过滤掉的tools name*/
  ignoreToolnames: string[] = []
  /** Agent 自动更新所有的tools 后的事件 */
  onUpdatedTools: (() => void) | undefined
  /** Agent 内部报错时，抛出的错误事件 */
  onError: ((msg: string, err?: any) => void) | undefined
  /** MCP Client 断开连接时的回调 */
  onClientDisconnected?: (serverName: string, reason?: string) => void
  /** 缓存 ai-sdk response 中的 多轮会话的上下文 */
  messages: any[] = []

  constructor({ llmConfig, mcpServers, llm }: IAgentModelProviderOption) {
    this.mcpServers = mcpServers || {}
    this.mcpClients = {}
    this.mcpTools = {}

    if (llm) {
      this.llm = llm
    } else if (llmConfig) {
      let providerFn: (options: any) => ProviderV2 | OpenAIProvider

      if (typeof llmConfig.providerType === 'string') {
        providerFn = AIProviderFactories[llmConfig.providerType]
      } else {
        providerFn = llmConfig.providerType
      }
      this.llm = providerFn({
        apiKey: llmConfig.apiKey,
        baseURL: llmConfig.baseURL
      })
    } else {
      throw new Error('Either llmConfig or llm must be provided')
    }
  }

  /** 创建一个 ai-sdk的 mcpClient, 创建失败则返回 null */
  private async _createOneClient(serverConfig: McpServerConfig) {
    try {
      let transport: MCPClientConfig['transport']
      // transport 一定是 streamableHttp 或者就是： ai-sdk允许的 transport
      if ('type' in serverConfig && serverConfig.type.toLocaleLowerCase() === 'streamablehttp') {
        transport = new StreamableHTTPClientTransport(new URL((serverConfig as { url: string }).url))
      } else if ('type' in serverConfig && serverConfig.type === 'extension') {
        transport = new ExtensionClientTransport(serverConfig.sessionId)
      } else {
        transport = serverConfig as MCPClientConfig['transport']
      }

      const client = await createMCPClient({ transport: transport as MCPClientConfig['transport'] })
      //@ts-ignore
      client['__transport__'] = transport

      return client
    } catch (error: unknown) {
      if (this.onError) {
        this.onError((error as Error)?.message || `Failed to create MCP client`, error)
      }
      console.error(`Failed to create MCP client`, serverConfig, error)
      return null
    }
  }
  /** 关闭一个 mcpClient */
  private async _closeOneClient(client: any) {
    try {
      await client['__transport__']?.terminateSession?.()
      await client['__transport__']?.close?.()
      await client?.close?.()
    } catch (error) {}
  }
  /** 创建所有 mcpClients */
  private async _createMpcClients() {
    // 使用 Promise.all 并行处理所有 mcpServer 项
    const serverEntries = Object.entries(this.mcpServers)
    const clients = await Promise.all(
      serverEntries.map(async ([serverName, server]) => {
        const client = await this._createOneClient(server)
        return { serverName, client }
      })
    )
    // 将结果存储到对象中，使用 serverName 作为键
    this.mcpClients = {}
    clients.forEach(({ serverName, client }) => {
      this.mcpClients[serverName] = client
    })
  }
  /** 查询所有 mcpClients 的 tools, 失败则保存为null */
  private async _createMpcTools() {
    const clientEntries = Object.entries(this.mcpClients)
    const tools = await Promise.all(
      clientEntries.map(async ([serverName, client]) => {
        try {
          const result = client ? await client?.tools?.() : null
          return { serverName, tools: result }
        } catch (error: unknown) {
          if (this.onError) {
            this.onError((error as Error)?.message || `Failed to query tools`, error)
          }
          console.error(`Failed to query tools`, error)
          return { serverName, tools: null }
        }
      })
    )
    // 将结果存储到对象中，使用 serverName 作为键
    this.mcpTools = {}
    tools.forEach(({ serverName, tools: toolsData }) => {
      this.mcpTools[serverName] = toolsData
    })
  }
  /** 关闭所有的 clients */
  async closeAll() {
    await Promise.all(
      Object.values(this.mcpClients).map(async (client) => {
        try {
          await this._closeOneClient(client)
        } catch (error: unknown) {
          if (this.onError) {
            this.onError((error as Error)?.message || `Failed to close client`, error)
          }
          console.error(`Failed to close client`, error)
        }
      })
    )
  }

  /** 创建所有的 mcpClients，并更新它们的tools */
  async initClientsAndTools() {
    await this._createMpcClients()
    await this._createMpcTools()
    this.onUpdatedTools?.()
  }

  /** 全量更新所有的 mcpServers */
  async updateMcpServers(mcpServers?: Record<string, McpServerConfig>) {
    await this.closeAll()
    this.mcpServers = mcpServers || this.mcpServers
    await this.initClientsAndTools()
  }

  /** 插入一个新的mcpServer，如果已经存在则返回false */
  async insertMcpServer(serverName: string, mcpServer: McpServerConfig) {
    // 检查是否已存在相同名称的服务器
    if (this.mcpServers[serverName]) {
      return false
    }

    const client = await this._createOneClient(mcpServer)
    this.mcpClients[serverName] = client
    this.mcpTools[serverName] = (await client?.tools?.()) as Record<string, any>
    this.mcpServers[serverName] = mcpServer
    this.onUpdatedTools?.()

    return true
  }
  /** 通过服务器名称删除mcpServer： mcpServers mcpClients  mcpTools ignoreToolnames  */
  async removeMcpServer(serverName: string) {
    if (!this.mcpServers[serverName]) {
      return
    }

    // 删除 mcpServer
    delete this.mcpServers[serverName]

    // 关闭并删除 client
    const delClient = this.mcpClients[serverName]
    delete this.mcpClients[serverName]
    try {
      await this._closeOneClient(delClient)
    } catch (error) {}

    // 删除 tools 并清理 ignoreToolnames
    const delTool = this.mcpTools[serverName]
    delete this.mcpTools[serverName]

    if (delTool) {
      Object.keys(delTool).forEach((toolName) => {
        this.ignoreToolnames = this.ignoreToolnames.filter((name) => name !== toolName)
      })
    }

    this.onUpdatedTools?.()
  }

  /** 创建临时允许调用的tools集合 */
  private _tempMergeTools(extraTool = {}) {
    // 将对象的值转换为数组后再 reduce
    const toolsResult = Object.values(this.mcpTools).reduce((acc, curr) => ({ ...acc, ...curr }), {})
    Object.assign(toolsResult, extraTool)

    this.ignoreToolnames.forEach((name) => {
      delete toolsResult[name]
    })
    return toolsResult
  }

  private async _chat(
    chatMethod: ChatMethodFn,
    { model, maxSteps = 5, ...options }: Parameters<typeof generateText>[0] & { maxSteps?: number; message?: string }
  ): Promise<any> {
    if (!this.llm) {
      throw new Error('LLM is not initialized')
    }

    await this.initClientsAndTools()

    const chatOptions = {
      // @ts-ignore  ProviderV2 是所有llm的父类， 在每一个具体的llm 类都有一个选择model的函数用法
      model: this.llm(model),
      stopWhen: stepCountIs(maxSteps),
      ...options,
      tools: this._tempMergeTools(options.tools) as ToolSet
    }

    if (options.message && !options.messages) {
      this.messages.push({ role: 'user', content: options.message })
      chatOptions.messages = [...this.messages]
    }

    const result = chatMethod(chatOptions)

    // 缓存 ai-sdk的多轮对话的消息
    ;(result as StreamTextResult<ToolSet, unknown>)?.response?.then((res: any) => {
      this.messages.push(...res.messages)
    })

    return result
  }

  async chat(options: Parameters<typeof generateText>[0] & { maxSteps?: number; message?: string }): Promise<any> {
    return this._chat(generateText, options)
  }

  async chatStream(options: Parameters<typeof streamText>[0] & { maxSteps?: number; message?: string }): Promise<any> {
    return this._chat(streamText, options as any)
  }
}
