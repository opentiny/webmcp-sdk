import { type IAgentModelProviderOption, AgentModelProvider, type McpServerConfig } from '@opentiny/next-sdk'
import { markRaw, Ref, ref } from 'vue'

export type INextAgetOption = {
  /** 设置适配哪种UI框架，以便返回正确格式的message */
  ui: 'matechat' | 'antx' | 'elementplusx' | 'tdchat'
  /** 代理的后台地址，比如：'https://agent.opentiny.design/api/v1/webmcp-trial/'，若私有化部署，请填入私有化地址。 */
  agentRoot: string
  /** 初始的受控应用的会话id, 如果多个应用，需要使用英文逗号分隔 */
  sessionId?: string
  /** 访问 llm 时，预置的系统提示词 */
  systemPrompt?: string
  /** 大语言模型 的 modelId， 比如：'deepseek-ai/DeepSeek-V3' */
  model: string
  /** 一次对话中的最大轮数, 最大默认 5轮 */
  maxSteps?: number
} & Partial<Pick<IAgentModelProviderOption, 'llm' | 'llmConfig'>>

/** 快速实现Opentiny Next遥控器的智能体
 *
 * @summary
 * 引用 next-sdk 中的 AgentModelProvider 类，实现 llm 的对话，以及添加受控应用。
 * 在一次对话中，实现应用的tool调用，从而达到操控网页的能力。
 */

export function useNextAgent(option: INextAgetOption) {
  const initMcpServers: any = option.sessionId ? createMcpServers(option.sessionId, option.agentRoot) : []
  const agent = new AgentModelProvider({
    llm: option.llm,
    llmConfig: option.llmConfig,
    mcpServers: initMcpServers
  })

  const status: Ref<'ready' | 'submitted' | 'streaming' | 'error'> = ref('ready')
  const messages = ref([])
  const controller: Ref<AbortController | null> = ref(null)

  /** 发起流式会话   */
  async function chatStream(message: string, signal?: AbortSignal) {
    if (!message) return

    status.value = 'submitted'
    controller.value = markRaw(new AbortController())

    const result = await agent.chatStream({
      message: message,
      model: option.model,
      system: option.systemPrompt || '',
      abortSignal: controller.value.signal,
      maxSteps: option.maxSteps || 5,
      onFinish: async () => {
        await agent.closeAll() // agent聊天时，会自动连接一次所有的mcpServers
        status.value = 'ready'
      },
      onError: () => {
        status.value = 'error'
      },
      onAbort: () => {
        status.value = 'ready'
      }
    })

    if (option.ui === 'matechat') {
      handleStreamForMateChat(result.fullStream, messages as Ref<MatechatMessage[]>, message)
    } else {
      console.warn('暂时未实现')
    }
  }

  function stop() {
    if (controller.value) {
      controller.value.abort()
    }
  }

  return {
    /** 一个AgentModelProvider实例 */
    agent,
    /** 发起流式对话 */
    chatStream,
    /** agent的实时状态 */
    status,
    /** 聊天会话记录 */
    messages,
    /** 中断会话 */
    stop
  }
}

/**
 * 创建MCP服务器配置
 * @param sessionId 会话ID，支持逗号分隔的多个ID
 * @param agentRoot 代理根路径
 * @returns MCP服务器配置对象，键为服务器名称，值为配置对象
 */
function createMcpServers(sessionId: string, agentRoot: string): Record<string, McpServerConfig> {
  if (!sessionId) return {}

  const sessionIds = sessionId.includes(',') ? sessionId.split(',').map((id) => id.trim()) : [sessionId]

  const servers: Record<string, McpServerConfig> = {}
  sessionIds.forEach((id) => {
    servers[`mcp-server-${id}`] = {
      type: 'streamableHttp' as const,
      url: `${agentRoot}mcp?sessionId=${id}`
    }
  })
  return servers
}

interface MatechatUserMessage {
  from: 'user'
  content: string
  avatarConfig: { name: 'user' }
}
interface MatechatAIMessage {
  from: 'model'
  content: string
  avatarConfig: { name: 'model' }
  id: string
  loading: boolean
}
type MatechatMessage = MatechatUserMessage | MatechatAIMessage

/** 处理流生成matechat的消息体 */
async function handleStreamForMateChat(
  fullStream: ReadableStream<string>,
  messages: Ref<MatechatMessage[]>,
  message: string
) {
  messages.value.push({
    from: 'user',
    content: message,
    avatarConfig: { name: 'user' }
  })

  const aiMessage: MatechatAIMessage = {
    from: 'model',
    content: '',
    avatarConfig: { name: 'model' },
    id: Date.now().toString(),
    loading: true
  }
  messages.value.push(aiMessage)

  for await (const part of fullStream) {
    // 处理文本流数据
    if (part.type.startsWith('text-')) {
      if (part.text) aiMessage.content += part.text
    }

    // 处理工具流数据
    else if (part.type.startsWith('tool-')) {
      if (part.delta) aiMessage.content += part.delta
    }

    // 处理推理数据
    else if (part.type.startsWith('reasoning-')) {
      if (part.text) aiMessage.content += part.text
    }
  }

  aiMessage.loading = false
}
