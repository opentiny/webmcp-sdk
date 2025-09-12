import { streamText, stepCountIs, generateText, StreamTextResult } from 'ai'
import { experimental_createMCPClient as createMCPClient, experimental_MCPClientConfig as MCPClientConfig } from 'ai'
import type { ToolSet } from 'ai'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import type { IAgentModelProviderOption, McpServerConfig } from './type'
import { ProviderV2 } from '@ai-sdk/provider'
import { OpenAIProvider } from '@ai-sdk/openai'
import { createOpenAI } from '@ai-sdk/openai'
import { createDeepSeek } from '@ai-sdk/deepseek'

export const AIProviderFactories = {
  ['openai']: createOpenAI,
  ['deepseek']: createDeepSeek
}

type ChatMethodFn = typeof streamText | typeof generateText

/** 一个通用的ai-sdk的agent封装
 * @summary 内部自动管理了 llm, mcpServer, ai-sdk的clients 和 tools
 * @returns 暴露了 chat, chatStream方法
 */
export class AgentModelProvider {
  llm: ProviderV2 | OpenAIProvider
  /**  mcpServers 允许为配置为 McpServerConfig, 或者任意的 MCPTransport
   * 参考: https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling#initializing-an-mcp-client */
  mcpServers: McpServerConfig[] = []
  /**  ai-sdk的 mcpClient */
  mcpClients: any[] = []
  /** 所有的tools */
  mcpTools: Array<Record<string, any>> = []
  /**  需要实时过滤掉的tools name*/
  ignoreToolnames: string[] = []

  /** chat 时，自动更新 所有的tools 后的事件 */
  onUpdatedTools: (() => void) | undefined
  /** 内部报错时，抛出错误事件 */
  onError: ((msg: string, err?: any) => void) | undefined

  /** 缓存 ai-sdk response 中的 多轮会话 */
  messages: any[] = []

  constructor({ llmConfig, mcpServers, llm }: IAgentModelProviderOption) {
    // 1、保存 mcpServer
    this.mcpServers = mcpServers || []

    // 2、保存 llm
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

  /** 创建一个 ai-sdk的 mcpClient, 创建失败则返回 Null */
  private async _createOneClient(serverConfig: McpServerConfig) {
    try {
      let transport: MCPClientConfig['transport']
      // transport 一定是 streamableHttp 或者就是： ai-sdk允许的 transport
      if ('type' in serverConfig && serverConfig.type.toLocaleLowerCase() === 'streamablehttp') {
        transport = new StreamableHTTPClientTransport(new URL(serverConfig.url))
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
  /** 关闭一个client */
  private async _closeOneClient(client: any) {
    await client['__transport__']?.terminateSession?.()
    await client['__transport__']?.close?.()
    await client?.close?.()
  }
  /** 创建 ai-sdk的 mcpClient, 失败则保存为null */
  private async _createMpcClients() {
    // 使用 Promise.all 并行处理所有 mcpServer 项
    this.mcpClients = await Promise.all(
      this.mcpServers.map(async (server) => {
        return this._createOneClient(server)
      })
    )
  }
  /** 创建所有 mcpClients 的 tools, 失败则保存为null */
  private async _createMpcTools() {
    this.mcpTools = await Promise.all(
      this.mcpClients.map(async (client) => {
        try {
          return client ? await client?.tools?.() : null
        } catch (error: unknown) {
          if (this.onError) {
            this.onError((error as Error)?.message || `Failed to query tools`, error)
          }
          console.error(`Failed to query tools`, error)
          return null
        }
      })
    )
  }
  /** 关闭所有的 clients */
  async closeAll() {
    await Promise.all(
      this.mcpClients.map(async (client) => {
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

  async initClientsAndTools() {
    await this._createMpcClients()
    await this._createMpcTools()
  }

  async updateMcpServers(mcpServers: McpServerConfig[]) {
    await this.closeAll()
    this.mcpServers = mcpServers
    await this.initClientsAndTools()
  }

  async insertMcpServer(mcpServer: McpServerConfig) {
    const find = this.mcpServers.find((item: any) => 'url' in item && 'url' in mcpServer && item.url === mcpServer.url)

    if (!find) {
      this.mcpServers = [...this.mcpServers, mcpServer]
      const client = await this._createOneClient(mcpServer)
      this.mcpClients.push(client)
      this.mcpTools.push((await client?.tools?.()) as Record<string, any>)
      return true
    }
    return false
  }
  /** 通过引用，删除一个 mcpServers mcpClients  mcpTools ignoreToolnames  */
  async removeMcpServer(mcpServer: McpServerConfig) {
    const index = this.mcpServers.findIndex((server) => server === mcpServer)

    this.mcpServers.splice(index, 1)

    const delClient = this.mcpClients[index]
    this.mcpClients.splice(index, 1)
    try {
      await this._closeOneClient(delClient)
    } catch (error) {}

    // 移除 tools
    const delTool = this.mcpTools[index]
    this.mcpTools.splice(index, 1)

    // 移除 ignoreToolnames
    if (delTool) {
      Object.keys(delTool).forEach((toolName) => {
        this.ignoreToolnames = this.ignoreToolnames.filter((name) => name !== toolName)
      })
    }
  }

  /** 创建临时允许调用的tools集合 */
  private _tempMergeTools(extraTool = {}) {
    const toolsResult = this.mcpTools.reduce((acc, curr) => ({ ...acc, ...curr }), {})
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

    this.onUpdatedTools?.()

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
