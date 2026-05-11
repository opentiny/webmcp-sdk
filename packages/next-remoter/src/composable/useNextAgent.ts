import { type IAgentModelProviderOption, AgentModelProvider, type McpServerConfig } from '@opentiny/next-sdk'
import { type Ref, ref } from 'vue'

export type INextAgetOption = {
  /** 设置适配哪种UI框架，以便返回正确格式的message */
  ui?: 'matechat' | 'antdx' | 'elplusx' | 'tdchat'
  /** 代理的后台地址，比如：'https://agent.opentiny.design/api/v1/webmcp-trial/'，若私有化部署，请填入私有化地址。 */
  agentRoot: string
  /** 初始的受控应用的会话id, 如果多个应用，需要使用英文逗号分隔 */
  sessionId?: string
  /** 访问 llm 时，预置的系统提示词 */
  systemPrompt?: string
  /** 大语言模型 的 modelId， 比如：'deepseek-ai/DeepSeek-V3' */
  model: string
  /** 一次对话中的最大步数（模型-工具循环），默认 30 */
  maxSteps?: number
  /** 自定义流数据处理函数，将 llm 返回的流数据，按自定义的格式，保存到messages 数组中。
   * 如果设置，则代替内部默认的流处理函数。
   */
  processStream?: (stream: ReadableStream<string>, messages: Ref<any[]>, senderContent: string) => Promise<void>
  llmConfig: IAgentModelProviderOption['llmConfig']
}

/** 快速实现Opentiny Next遥控器的智能体
 *
 * @summary
 * 引用 next-sdk 中的 AgentModelProvider 类，实现 llm 的对话，以及添加受控应用。
 * 在一次对话中，实现应用的tool调用，从而达到操控网页的能力。
 */

export function useNextAgent(option: INextAgetOption) {
  const initMcpServers: any = option.sessionId ? createMcpServers(option.sessionId, option.agentRoot) : []
  const agent = new AgentModelProvider({
    llmConfig: option.llmConfig,
    mcpServers: initMcpServers
  })

  // todo: 增加错误监听，updateTools监听，并向外传递 error, 添加session,丢失session, tool更新的事件

  const status: Ref<'ready' | 'submitted' | 'streaming' | 'error'> = ref('ready')
  const messages = ref([])
  const inputValue = ref('')
  let controller: AbortController | null = null

  /** 发起流式会话 */
  async function chatStream() {
    const message = inputValue.value
    if (!message) return

    // 如果是添加sessionId, 则只添加应用，不发出请求。
    if (/^\/[A-Za-z0-9-]{6,}$/.test(message)) {
      addSessionId(message.slice(1))
      return
    }

    status.value = 'submitted'
    controller = new AbortController()

    const result = await agent.chatStream({
      message: message,
      model: option.model,
      system: option.systemPrompt || '',
      abortSignal: controller.signal,
      maxSteps: option.maxSteps || 30,
      onFinish: async () => {
        await agent.closeAll() // agent聊天时，会自动连接一次所有的mcpServers
        status.value = 'ready'
      },
      onError: () => (status.value = 'error'),
      onAbort: () => (status.value = 'ready')
    })

    inputValue.value = ''

    if (option.processStream && typeof option.processStream === 'function') {
      option.processStream(result.fullStream, messages, message)
      return
    }
    if (option.ui === 'matechat') {
      handleStreamForMateChat(result.fullStream, messages as Ref<MatechatMessage[]>, message)
    } else if (option.ui === 'antx') {
      handleStreamForAntx(result.fullStream, messages as Ref<AntXMessage[]>, message)
    } else if (option.ui === 'elplusx') {
      handleStreamForElPlusx(result.fullStream, messages as Ref<AntXMessage[]>, message)
    } else if (option.ui === 'tdchat') {
      handleStreamForTdChat(result.fullStream, messages as Ref<AntXMessage[]>, message)
    } else {
      console.warn('暂时未实现')
    }
  }

  function stopChat() {
    if (controller) {
      controller.abort()
    }
  }

  function newConversation() {
    messages.value = []
    agent.responseMessages = []
  }

  async function addSessionId(sid: string) {
    const res = await fetch(`${option.agentRoot}client?sessionId=${sid}`).then((res) => res.json())
    const sessionId = res?.data?.sessionId || ''
    if (sessionId) {
      const server = createMcpServers(sessionId, option.agentRoot)
      Object.assign(agent.mcpServers, server)
    }
  }
  return {
    /** 一个AgentModelProvider实例 */
    agent,
    /** agent的实时状态 */
    status,
    /** 聊天会话记录 */
    messages,
    /** 输入框的文本 */
    inputValue,
    /** 发起流式对话函数 */
    chatStream,
    /** 中断会话函数 */
    stopChat,
    /** 新建会话函数 */
    newConversation,
    /** 添加一个sessionId的函数,允许是短码 */
    addSessionId
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

  let aiMessage: MatechatAIMessage = {
    from: 'model',
    content: '',
    avatarConfig: { name: 'model' },
    id: Date.now().toString()
  }
  messages.value.push(aiMessage)

  aiMessage = messages.value[messages.value.length - 1] as MatechatAIMessage

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
}

interface AntXMessage {
  from: 'user' | 'model'
  content: string
}
async function handleStreamForAntx(fullStream: ReadableStream<string>, messages: Ref<AntXMessage[]>, message: string) {
  messages.value.push({
    from: 'user',
    content: message
  })

  messages.value.push({
    from: 'model',
    content: ''
  })

  const aiMessage = messages.value[messages.value.length - 1] as AntXMessage

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
}
interface ElPlusXMessage {
  from: 'user' | 'model'
  content: string
}
async function handleStreamForElPlusx(
  fullStream: ReadableStream<string>,
  messages: Ref<ElPlusXMessage[]>,
  message: string
) {
  messages.value.push({
    from: 'user',
    content: message
  })

  messages.value.push({
    from: 'model',
    content: ''
  })

  const aiMessage = messages.value[messages.value.length - 1] as AntXMessage

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
}

export interface TdChatMessage {
  avatar?: string
  name?: string
  role?: string
  datetime?: string
  content?: string
  reasoning?: string
}

async function handleStreamForTdChat(
  fullStream: ReadableStream<string>,
  messages: Ref<TdChatMessage[]>,
  message: string
) {
  messages.value.push({
    role: 'user',
    content: message,
    avatar: 'https://tdesign.gtimg.com/site/avatar.jpg'
  })

  messages.value.push({
    role: 'assistant',
    content: '',
    avatar: 'https://tdesign.gtimg.com/site/chat-avatar.png'
  })

  const aiMessage = messages.value[messages.value.length - 1] as AntXMessage

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
}
