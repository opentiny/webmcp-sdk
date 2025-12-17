import { streamText, stepCountIs, generateText, StreamTextResult } from 'ai'
import {
  experimental_MCPClientConfig as MCPClientConfig,
  experimental_createMCPClient as createMCPClient
} from '@ai-sdk/mcp'
import type { ToolSet } from 'ai'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import type { IAgentModelProviderOption, McpServerConfig } from './type'
import { ProviderV2 } from '@ai-sdk/provider'
import { OpenAIProvider } from '@ai-sdk/openai'
import { createOpenAI } from '@ai-sdk/openai'
import { createDeepSeek } from '@ai-sdk/deepseek'
import { ExtensionClientTransport } from '../transport/ExtensionClientTransport'
import { MessageChannelTransport } from '@opentiny/next'
import { WebMcpClient } from '../WebMcpClient'
import { getAISDKTools } from './utils/getAISDKTools'
import { generateReActToolsPrompt } from './utils/generateReActPrompt'
import { parseReActAction } from './utils/parseReActAction'

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
  /** 是否使用 ReAct 模式（通过提示词而非 function calling 进行工具调用） */
  private useReActMode: boolean = false

  constructor({ llmConfig, mcpServers }: IAgentModelProviderOption) {
    if (!llmConfig) {
      throw new Error('llmConfig is required to initialize AgentModelProvider')
    }
    this.mcpServers = mcpServers || {}
    this.mcpClients = {}
    this.mcpTools = {}

    if (llmConfig.llm) {
      this.llm = llmConfig.llm
    } else if (llmConfig.providerType) {
      const providerType = llmConfig.providerType
      let providerFn: (options: any) => ProviderV2 | OpenAIProvider

      if (typeof providerType === 'string') {
        providerFn = AIProviderFactories[providerType]
      } else {
        providerFn = providerType
      }
      this.llm = providerFn({
        apiKey: llmConfig.apiKey,
        baseURL: llmConfig.baseURL
      })
    } else {
      throw new Error('Either llmConfig.llm or llmConfig.providerType must be provided')
    }

    // 读取 ReAct 模式配置
    this.useReActMode = (llmConfig as any).useReActMode ?? false
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

      // 根据 useAISdkClient 配置决定使用哪种 client 创建方式
      const useAISdkClient = serverConfig.useAISdkClient ?? false

      if (useAISdkClient) {
        // 使用 ai-sdk 的 createMCPClient
        const client = await createMCPClient({ transport: transport as MCPClientConfig['transport'] })
        //@ts-ignore
        client['__transport__'] = transport
        return client
      } else {
        // 使用 WebMcpClient
        const client = new WebMcpClient(
          { name: 'mcp-web-client', version: '1.0.0' },
          { capabilities: { roots: { listChanged: true }, sampling: {}, elicitation: {} } }
        )
        // @ts-ignore transport 已经在前面的条件分支中转换为 Transport 实例，类型系统无法正确推断
        await client.connect(transport)

        //@ts-ignore
        client['__transport__'] = transport

        return client
      }
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
      const transport = client['__transport__']

      // 如果是 InMemoryTransport，不关闭传输层 因为它是配对的，关闭一端会影响另一端（服务端）
      if (
        (transport && transport instanceof InMemoryTransport) ||
        (transport && transport instanceof MessageChannelTransport)
      ) {
        return
      }

      // 其他类型的传输正常关闭
      await transport?.terminateSession?.()
      await transport?.close?.()
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
  /** 兼容两种 client 类型的 tools 获取方法 */
  private async _getClientTools(client: any, serverName: string): Promise<ToolSet | null> {
    if (!client) {
      return null
    }

    try {
      // 判断是否为 ai-sdk 的 client（有 tools 方法）
      if (typeof client.tools === 'function') {
        // ai-sdk 的 client，直接调用 tools() 方法
        return await client.tools()
      } else {
        // WebMcpClient，使用 getAISDKTools 函数
        return await getAISDKTools(client)
      }
    } catch (error: unknown) {
      if (this.onError) {
        this.onError((error as Error)?.message || `Failed to query tools for ${serverName}`, error)
      }
      console.error(`Failed to query tools for ${serverName}`, error)
      return null
    }
  }

  /** 查询所有 mcpClients 的 tools, 失败则保存为null */
  private async _createMpcTools() {
    const clientEntries = Object.entries(this.mcpClients)
    const tools = await Promise.all(
      clientEntries.map(async ([serverName, client]) => {
        const result = await this._getClientTools(client, serverName)
        return { serverName, tools: result }
      })
    )
    // 将结果存储到对象中，使用 serverName 作为键
    this.mcpTools = {}
    tools.forEach(({ serverName, tools: toolsData }) => {
      const normalizedTools = toolsData && typeof toolsData === 'object' ? (toolsData as Record<string, any>) : {}
      this.mcpTools[serverName] = normalizedTools
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
    if (!client) {
      // 创建客户端失败时直接返回，避免后续出现空指针问题
      this.onError?.(`Failed to create MCP client: ${serverName}`)
      return null
    }
    this.mcpClients[serverName] = client
    // 使用兼容的工具获取方法
    const tools = await this._getClientTools(client, serverName)
    // 工具列表可能为 null，统一兜底为空对象，确保类型安全
    this.mcpTools[serverName] = tools && typeof tools === 'object' ? (tools as Record<string, any>) : {}
    this.mcpServers[serverName] = mcpServer
    this.onUpdatedTools?.()

    return client
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

  /** 生成 ReAct 模式的系统提示词（包含工具描述） */
  private _generateReActSystemPrompt(tools: ToolSet, baseSystemPrompt?: string): string {
    const toolsPrompt = generateReActToolsPrompt(tools)
    if (baseSystemPrompt) {
      return `${baseSystemPrompt}${toolsPrompt}`
    }
    return `你是一个智能助手，可以通过调用工具来完成任务。请始终使用中文进行思考和回复。\n${toolsPrompt}`
  }

  /** 执行 ReAct 模式下的工具调用 */
  private async _executeReActToolCall(
    toolName: string,
    args: any,
    tools: ToolSet
  ): Promise<{ success: boolean; result?: any; error?: string }> {
    const tool = tools[toolName]
    if (!tool) {
      return { success: false, error: `工具 ${toolName} 不存在` }
    }

    try {
      const toolInfo = tool as any
      const executeFn = toolInfo.execute || toolInfo.call
      if (typeof executeFn !== 'function') {
        return { success: false, error: `工具 ${toolName} 没有可执行的函数` }
      }

      const result = await executeFn(args, {})
      return { success: true, result }
    } catch (error: any) {
      const errorMsg = error?.message || String(error) || '工具执行失败'
      return { success: false, error: errorMsg }
    }
  }

  /** ReAct 模式的对话实现 */
  private async _chatReAct(
    chatMethod: ChatMethodFn,
    { model, maxSteps = 5, ...options }: Parameters<typeof generateText>[0] & { maxSteps?: number; message?: string }
  ): Promise<any> {
    if (!this.llm) {
      throw new Error('LLM is not initialized')
    }

    await this.initClientsAndTools()

    // 合并所有可用工具
    const allTools = this._tempMergeTools(options.tools) as ToolSet
    const toolNames = Object.keys(allTools)

    // 如果没有工具，回退到普通模式
    if (toolNames.length === 0) {
      return this._chat(chatMethod, { model, maxSteps, ...options })
    }

    // 准备消息历史
    let currentMessages: any[] = []
    if (options.message && !options.messages) {
      currentMessages.push({ role: 'user', content: options.message })
    } else if (options.messages) {
      currentMessages = [...options.messages]
    } else {
      currentMessages = [...this.messages]
    }

    // 生成包含工具描述的系统提示词
    const systemPrompt = this._generateReActSystemPrompt(allTools, options.system as string)
    const systemMessage = { role: 'system', content: systemPrompt }

    // 确保第一条消息是系统提示词
    const messagesWithSystem =
      currentMessages[0]?.role === 'system' ? currentMessages : [systemMessage, ...currentMessages]

    // 判断是否为流式输出
    const isStream = chatMethod === streamText

    // 确保 model 是字符串类型（ReAct 模式下 model 应该是模型名称字符串）
    const modelName = typeof model === 'string' ? model : (model as any)?.modelId || 'default-model'

    if (isStream) {
      // 流式输出模式：创建一个包装的流
      return this._chatReActStream(messagesWithSystem, allTools, modelName, maxSteps, options)
    } else {
      // 非流式输出模式：循环对话直到完成
      return this._chatReActNonStream(messagesWithSystem, allTools, modelName, maxSteps, options)
    }
  }

  /** ReAct 模式非流式对话 */
  private async _chatReActNonStream(
    messages: any[],
    tools: ToolSet,
    model: string,
    maxSteps: number,
    options: any
  ): Promise<any> {
    let currentMessages = [...messages]
    let stepCount = 0

    while (stepCount < maxSteps) {
      stepCount++

      // 调用 LLM（ReAct 模式下不传递 tools，因为工具调用通过提示词实现）
      const { tools: _, ...restOptions } = options
      const result = await generateText({
        // @ts-ignore ProviderV2 是所有llm的父类，在每一个具体的llm类都有一个选择model的函数用法
        model: this.llm(model),
        messages: currentMessages,
        ...restOptions
      })

      const assistantMessage = result.text
      currentMessages.push({ role: 'assistant', content: assistantMessage })

      // 解析工具调用
      const action = parseReActAction(assistantMessage, tools)

      if (!action) {
        // 没有工具调用，返回最终结果
        this.messages = currentMessages
        return {
          text: assistantMessage,
          response: { messages: currentMessages }
        }
      }

      // 执行工具调用
      const toolResult = await this._executeReActToolCall(action.toolName, action.arguments, tools)

      // 添加工具调用结果到消息历史（ReAct 模式下，工具结果作为 user 消息添加）
      const observation = toolResult.success
        ? `Observation: ${JSON.stringify(toolResult.result)}`
        : `Observation: 工具执行失败 - ${toolResult.error}`

      // 在 ReAct 模式下，工具执行结果应该作为 user 消息添加，以便模型继续对话
      currentMessages.push({
        role: 'user',
        content: observation
      })
    }

    // 达到最大步数，返回最后一条消息
    this.messages = currentMessages
    const lastMessage = currentMessages[currentMessages.length - 2]?.content || ''
    return {
      text: lastMessage,
      response: { messages: currentMessages }
    }
  }

  /** ReAct 模式流式对话 */
  private _chatReActStream(messages: any[], tools: ToolSet, model: string, maxSteps: number, options: any): any {
    // 保存 this 引用，以便在异步生成器中使用
    const self = this
    // @ts-ignore ProviderV2 是所有llm的父类，在每一个具体的llm类都有一个选择model的函数用法
    const llmModel = this.llm(model)

    // 创建一个 Promise 来跟踪流完成状态，用于触发 onFinish
    let streamCompleteResolver: (value: any) => void
    let streamCompleteRejecter: (error: any) => void
    const streamCompletePromise = new Promise((resolve, reject) => {
      streamCompleteResolver = resolve
      streamCompleteRejecter = reject
    })

    // 创建一个异步生成器来模拟流式输出
    const stream = new ReadableStream({
      async start(controller) {
        let currentMessages = [...messages]
        let stepCount = 0
        let accumulatedText = ''

        try {
          while (stepCount < maxSteps) {
            stepCount++

            // 移除 tools 选项，ReAct 模式下不传递 tools
            const { tools: _, ...restOptions } = options
            // 调用流式 LLM
            delete restOptions.system
            const result = await streamText({
              ...restOptions,
              model: llmModel,
              messages: currentMessages
            })

            // 收集流式输出
            let assistantText = ''
            for await (const part of result.fullStream) {
              if (part.type === 'text-delta') {
                assistantText += part.text || ''
                // 转发文本增量
                controller.enqueue({
                  type: 'text-delta',
                  text: part.text
                })
              } else if (part.type === 'text-start') {
                controller.enqueue({ type: 'text-start' })
              } else if (part.type === 'text-end') {
                // 暂时不关闭，等待检查是否有工具调用
              } else {
                // 转发其他类型的事件
                controller.enqueue(part)
              }
            }

            accumulatedText += assistantText
            currentMessages.push({ role: 'assistant', content: accumulatedText })

            // 解析工具调用
            const action = parseReActAction(accumulatedText, tools)

            if (!action) {
              // 没有工具调用，结束流
              controller.enqueue({ type: 'text-end' })
              controller.close()
              self.messages = currentMessages
              // 触发 onFinish 回调
              streamCompleteResolver({ messages: currentMessages })
              return
            }

            // 特殊处理: computer 工具的 terminate 操作
            if (action.toolName === 'computer' && action.arguments?.action === 'terminate') {
              // 视为对话结束
              controller.enqueue({ type: 'text-end' })
              controller.close()
              self.messages = currentMessages
              streamCompleteResolver({ messages: currentMessages })
              return
            }

            // 发送工具调用开始事件（符合 tiny-robot 格式）
            const toolCallId = `react-${Date.now()}`
            controller.enqueue({
              type: 'tool-input-start',
              id: toolCallId,
              toolName: action.toolName
            })

            // 发送工具调用参数（显示调用中状态）
            const argsString = JSON.stringify(action.arguments, null, 2)
            controller.enqueue({
              type: 'tool-input-delta',
              id: toolCallId,
              delta: argsString
            })

            // 执行工具调用
            const toolResult = await self._executeReActToolCall(action.toolName, action.arguments, tools)
            debugger
            // 如果结果包含 screenshot，先提取出来，避免 JSON stringify 导致过大
            let screenshot = undefined
            let resultData = toolResult.result
            if (
              toolResult.success &&
              toolResult.result &&
              typeof toolResult.result === 'object' &&
              toolResult.result.screenshot
            ) {
              screenshot = toolResult.result.screenshot
              const { screenshot: _, ...rest } = toolResult.result
              resultData = rest
            }

            // 构造 Observation 文本
            let observationText = ''
            if (toolResult.success) {
              // 尝试从 resultData 中提取纯文本信息 (兼容 extraTools 返回的 { content: [{text: ...}] } 结构)
              if (
                resultData &&
                Array.isArray(resultData.content) &&
                resultData.content.length > 0 &&
                resultData.content[0].text
              ) {
                observationText = resultData.content[0].text
              } else {
                observationText = JSON.stringify(resultData)
              }
            } else {
              observationText = `工具执行失败 - ${toolResult.error}`
            }

            // 如果有截图，添加验证提示
            let finalObservation = `${observationText}`
            if (screenshot) {
              finalObservation += `\n请检查截图以确认操作是否成功。如果成功，请继续下一步；如果失败，请重试。`
            }

            // 发送工具结果（符合 tiny-robot 格式，给 UI 展示用的，不包含 base64 防止卡顿）
            controller.enqueue({
              type: 'tool-result',
              toolCallId: toolCallId,
              result: finalObservation
            })

            // 添加工具结果到消息历史（ReAct 模式下，工具结果作为 user 消息添加）
            if (screenshot) {
              currentMessages.push({
                role: 'user',
                content: [
                  { type: 'text', text: finalObservation },
                  { type: 'image', image: screenshot }
                ]
              })
            } else {
              currentMessages.push({
                role: 'user',
                content: finalObservation
              })
            }

            // 重置累积文本，准备下一轮
            accumulatedText = ''
          }

          // 达到最大步数
          controller.enqueue({ type: 'text-end' })
          controller.close()
          self.messages = currentMessages
          // 触发 onFinish 回调
          streamCompleteResolver({ messages: currentMessages })
        } catch (error: any) {
          controller.error(error)
          streamCompleteRejecter(error)
        }
      }
    })

    // 返回一个类似 streamText 的结果对象
    // response Promise 需要在流结束时 resolve，这样才能触发 onFinish 回调
    return {
      fullStream: stream,
      response: streamCompletePromise
    }
  }

  private async _chat(
    chatMethod: ChatMethodFn,
    { model, maxSteps = 5, ...options }: Parameters<typeof generateText>[0] & { maxSteps?: number; message?: string }
  ): Promise<any> {
    // 如果启用 ReAct 模式，使用 ReAct 实现
    if (this.useReActMode) {
      return this._chatReAct(chatMethod, { model, maxSteps, ...options })
    }

    // 否则使用原有的 function calling 模式
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
