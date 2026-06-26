import { ToolLoopAgent, type ModelMessage, type ToolLoopAgentSettings, type ToolSet, type UserModelMessage } from 'ai'
import type { StartContent } from './streamVisitor'
import { StreamVisitor } from './streamVisitor'
import { DelayedPromise } from '@ai-sdk/provider-utils'
import { ref, type Ref } from 'vue'
import { useConversation } from './hooks/useConversation'
import { usePromptManager } from './hooks/usePromptManager'
import { useMcpServers } from './hooks/useMcpServers'
import { useStatus, type NextAgentStatus } from './hooks/useStatus'
import { useSkills } from './hooks/useSkills'
import { useTools } from './hooks/useTools'

/** 用户界面渲染的消息体 */
export type UIMessage =
  | UserModelMessage
  | {
      role: 'assistant'
      content: Ref<StartContent | undefined>
    }
/** 生命周期存储集合 */
const cbMap = {
  initAgent: [] as Function[], // 初始化智能体后触发
  chatStart: [] as Function[], // 压入usr消息后触发
  chatStep: [] as Function[], // 每次返回step数据后触发
  chatEnd: [] as Function[], // 压入ai消息后触发
  reChat: [] as Function[] // 重新发起对话, 清除上次对话记录后, 发出新请求之前触发
}
export class NextAgent {
  /** 调试流， 是否打印流数据 */
  debugStream: boolean = true

  // **************** 智能体管理 ****************
  /** 主体智能体 */
  private mainAgent: ToolLoopAgent | null = null
  /** 智能体参数设置 */
  settings: ToolLoopAgentSettings = {} as any
  /** 对话取消信号， eg. agent.abortSignal.abort() */
  private abortController?: AbortController

  // **************** 消息管理 ****************
  /** 对话消息, 包含用户消息和ai回复。在ai 对话结束才一次性插入 */
  messages: Ref<ModelMessage[]> = ref([])
  /** 用户界面渲染的消息体。 其中ai 的消息为 ref 的响应式数据， 根据流事件，进行实时更新 */
  uiMessages: Ref<UIMessage[]> = ref([])

  // **************** 生命周期管理 ****************
  emit = async (type: keyof typeof cbMap, ...args: any[]) => {
    for (const cb of cbMap[type]) await cb(...args)
  }

  on = (type: keyof typeof cbMap, cb: Function) => cbMap[type].push(cb)

  // ****************  状态管理 ($打头是状态管理变量)  ****************
  $conversations = useConversation(this)
  $prompts = usePromptManager(this)
  $mcpServers = useMcpServers(this)
  $skills = useSkills(this)
  $tools = useTools(this)
  // 不用添加到 $mcpServers中，就能加载的tools
  extraTools: ToolSet = {}
  status: Ref<NextAgentStatus> = useStatus(this)

  /** 初始化智能体， 设置大语言模型
   *  @param settings 智能体参数设置, 参考 ai-sdk 的 ToolLoopAgent() 的入参：https://ai-sdk.dev/docs/reference/ai-sdk-core/tool-loop-agent#parameters
   *
   * @requires
   * model:  设置大语言模型，必值项。  eg. xxProvider('modelId') 的返回值
   *
   *  如果后期需要修改智能体参数，可以调用 agent.setupAgent(newSettings)!
   */
  constructor(settings: ToolLoopAgentSettings) {
    this.setupAgent(settings)
  }

  /** 设置ToolLoopAgent */
  setupAgent(settings: ToolLoopAgentSettings) {
    this.settings = settings

    this.mainAgent = new ToolLoopAgent({
      ...settings,
      tools: this.$tools.finalTools
    })

    // oxlint-disable-next-line typescript/no-floating-promises
    this.emit('initAgent')
  }
  /** 发起对话， 参数 message 为标准的ai-sdk参数  */
  async chatStream(message: UserModelMessage) {
    this.abortController = new AbortController()

    this.messages.value.push(message)
    this.uiMessages.value.push(message)

    await this.emit('chatStart', message)

    const streamResult = await this.mainAgent!.stream({
      messages: this.messages.value,
      abortSignal: this.abortController.signal
    })

    const dp = new DelayedPromise<void>()
    const visitor = new StreamVisitor({
      debug: this.debugStream,
      onFinish: async () => {
        try {
          // stream.response.message 就是ai-sdk 包装的ai 多轮对话消息, 拼接到**主消息列表**
          const aiMessages = (await streamResult.response).messages // WARN: abort时， 这个流会错误，取不回response.messages,就会丢弃掉ai的消息
          this.messages.value = this.messages.value.concat(aiMessages)
        } catch (error) {
          console.error('StreamVisitor onFinish error', error)
        }

        await this.emit('chatEnd') // abort 时, messages只有用户消息，没有ai消息
        dp.resolve()
      },
      onStep: async () => {
        await this.emit('chatStep')
      }
    })
    // 立即返回的一个ref数据，拼接到 **UI消息列表**
    const startContent = visitor.traverse(streamResult)
    this.uiMessages.value.push({
      role: 'assistant',
      content: startContent
    })

    return dp.promise
  }

  /** 取消当前对话， reason 可选，默认值为 "用户取消" */
  cancelChat(reason: string = '用户取消') {
    this.abortController?.abort(reason)
  }

  /** 重复上次对话 */
  async reLastChat() {
    // 加载状态，不允许重复对话。只有结束了，才显示 重复按钮
    if (['streaming', 'processing'].includes(this.status.value)) return

    // 截断UI 消息
    let lastUserIndex = this.uiMessages.value.findLastIndex((msg) => msg.role === 'user')
    if (lastUserIndex === -1) return
    this.uiMessages.value = this.uiMessages.value.slice(0, lastUserIndex)

    // 截断对话消息，并获取最后一条用户消息
    lastUserIndex = this.messages.value.findLastIndex((msg) => msg.role === 'user')
    if (lastUserIndex === -1) return

    const lastUserMessage = this.messages.value[lastUserIndex] as UserModelMessage
    this.messages.value = this.messages.value.slice(0, lastUserIndex)

    await this.emit('reChat')

    // 重新调用 chatStream
    await this.chatStream(lastUserMessage)
  }
}
