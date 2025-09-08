import type { ChatCompletionResponse } from '@opentiny/tiny-robot-kit'
import type { ChatCompletionRequest } from '@opentiny/tiny-robot-kit'
import type { StreamHandler } from '@opentiny/tiny-robot-kit'
import { BaseModelProvider } from '@opentiny/tiny-robot-kit'
import type { AIModelConfig } from '@opentiny/tiny-robot-kit'
import { type Ref } from 'vue'
import { AgentModelProvider, McpServerConfig, IAgentModelProviderOption } from '@opentiny/next-sdk'
import { tool } from 'ai'
import dayjs from 'dayjs'
import { z } from 'zod'

/** Tiny-robot 所需要的自定义大语言的Provider */
export class CustomAgentModelProvider extends BaseModelProvider {
  transport: any
  /** 一个 ai-sdk agent 封装 */
  agent: AgentModelProvider
  systemPrompt: string
  /** tiny-robot中流消息已经不是真实的多轮对话消息。
   * 所以要把 ai-sdk中记录的 messges缓存起来，做为下次对话时的上下文内容
   * */
  aiSdkMessages: any[] = []
  constructor(config: AIModelConfig, sessionId: Ref<string>, agentRoot: Ref<string>, systemPrompt: string) {
    super(config)
    const options = {
      llmConfig: {
        apiKey: 'sk-trial',
        baseURL: 'https://agent.opentiny.design/api/v1/ai',
        providerType: 'deepseek'
      },
      mcpServers: [] as McpServerConfig[]
    }
    if (sessionId.value && sessionId.value.includes(',')) {
      sessionId.value.split(',').forEach((id) => {
        options.mcpServers.push({
          type: 'streamableHttp',
          url: `${agentRoot.value}mcp?sessionId=${id}`
        })
      })
    } else if (sessionId.value) {
      options.mcpServers.push({
        type: 'streamableHttp',
        url: `${agentRoot.value}mcp?sessionId=${sessionId.value}`
      })
    }

    this.agent = new AgentModelProvider(options as IAgentModelProviderOption)
    this.systemPrompt = systemPrompt
  }

  /** 同步请求不需要实现 */
  chat(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    throw new Error('Method not implemented.')
  }

  async chatStream(request: ChatCompletionRequest, handler: StreamHandler): Promise<void> {
    // 读取用户最新的请求
    const lastUserMsg = request.messages.findLast((msg) => msg.role === 'user' && msg.content !== '')
    if (!lastUserMsg) return
    // 第一次对话，压入system
    if (this.aiSdkMessages.length === 0 && this.systemPrompt) {
      this.aiSdkMessages.push({ role: 'system', content: this.systemPrompt })
    }
    this.aiSdkMessages.push(lastUserMsg)
    const result = await this.agent.chatStream({
      messages: this.aiSdkMessages,
      model: 'deepseek-ai/DeepSeek-V3',
      abortSignal: request.options?.signal,
      tools: {
        'get-today': tool({
          description: '获取今天的日期',
          inputSchema: z.object({}),
          execute: () => ({
            date: `当前日期: ${dayjs().format('YYYY-M-D')}`
          })
        })
      },
      maxSteps: 15
    })

    // 标识每一个markdown块
    let textId = 1
    for await (const part of result.fullStream) {
      // console.log(part, part.type)

      // 文本节点处理。 每个文本块拥有自己的textId
      if (part.type === 'text-start') {
        textId++

        handler.onData({
          type: 'markdown',
          content: '',
          delta: '',
          textId
        })
      } else if (part.type === 'text-delta') {
        handler.onData({
          type: 'markdown',
          delta: part.text,
          textId
        })
      } else if (part.type === 'text-end') {
        handler.onData({
          type: 'markdown',
          delta: '\n\n ',
          textId
        })
      }
      // tool 节点处理
      else if (part.type.startsWith('tool-')) {
        if (part.type == 'tool-input-start') {
          handler.onData({
            type: 'tool',
            id: part.id,
            name: part.toolName,
            status: 'running',
            content: ``
          })
        }

        if (part.type == 'tool-input-delta') {
          handler.onData({
            type: 'tool',
            id: part.id,
            status: 'running',
            delta: part.delta
          })
        }

        if (part.type == 'tool-result') {
          handler.onData({
            type: 'tool',
            id: part.toolCallId,
            status: 'success',
            delta: ''
          })
        }
      }
    }

    // 对话完毕，立即保存 aiSdkMessages
    // const requestMsg = (await result.request).body.messages
    const responseMsg = (await result.response).messages
    this.aiSdkMessages = responseMsg

    handler.onDone()
  }
}
