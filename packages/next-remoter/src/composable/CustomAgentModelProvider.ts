import type { ChatCompletionResponse } from '@opentiny/tiny-robot-kit'
import type { ChatCompletionRequest } from '@opentiny/tiny-robot-kit'
import type { StreamHandler } from '@opentiny/tiny-robot-kit'
import { BaseModelProvider } from '@opentiny/tiny-robot-kit'
import type { AIModelConfig } from '@opentiny/tiny-robot-kit'
import { type Ref } from 'vue'
import { AgentModelProvider, McpServerConfig, IAgentModelProviderOption } from '@opentiny/next-sdk'
import { getToday } from './tools'

/** Tiny-robot 所需要的自定义大语言的Provider */
export class CustomAgentModelProvider extends BaseModelProvider {
  transport: any
  /** 一个 ai-sdk agent 封装 */
  agent: AgentModelProvider
  systemPrompt: string

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

  async chatStream(request: ChatCompletionRequest, handler: StreamHandler): Promise<void> {
    // 读取用户最新的请求
    const lastUserMsg = request.messages[request.messages.length - 1]
    if (!lastUserMsg) return

    const result = await this.agent.chatStream({
      message: lastUserMsg.content as string, // 只推入一条消息
      model: 'deepseek-ai/DeepSeek-V3',
      system: this.systemPrompt,
      abortSignal: request.options?.signal,
      tools: { ['get-today']: getToday },
      maxSteps: 15,
      onFinish: async () => {
        await this.agent.closeAll()
        handler.onDone()
      }
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
  }

  /** 同步请求不需要实现 */
  chat(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    throw new Error('Method not implemented.')
  }
}
