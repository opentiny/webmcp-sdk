import type { FinishReason, LanguageModelRequestMetadata, LanguageModelUsage, StreamTextResult } from 'ai'
import { reactive, ref } from 'vue'
export interface StreamVisitorOption {
  debug?: boolean
  onStart?: (content: StartContent) => void
  onStep?: (content: StepContent) => void
  onReasoning?: (content: ReasoningContent) => void
  onText?: (content: TextContent) => void
  onTool?: (content: ToolContent) => void
  onFinish?: () => void
}

export interface StartContent {
  running: boolean
  steps: StepContent[]
  finishReason?: FinishReason
  totalUsage?: LanguageModelUsage
  /**  工具内部异常的错误信息 */
  error?: any
}

export interface StepContent {
  running: boolean
  contents: (TextContent | ReasoningContent | ToolContent)[]
  finishReason?: FinishReason
  /** 本轮对话的消耗 */
  usage?: LanguageModelUsage
  /** 包含本轮对话的请求体 */
  request: LanguageModelRequestMetadata
}

export interface TextContent {
  type: 'text'
  id: string
  running: boolean
  text: string
}
export interface ReasoningContent {
  type: 'reasoning'
  id: string
  running: boolean
  text: string
}
export interface ToolContent {
  type: 'tool'
  id: string
  running: boolean
  toolCallId: string
  title: string
  toolName: string
  /** 不确定输入参数的工具调用 */
  dynamic: boolean | undefined
  /** 生成tool 调用参数的动态字符串, 在调用 tool 之前，会保存json结果到input属性中 */
  inputStr: string
  /** 工具参数对象 */
  input: any
  /** 工具返回值对象 */
  output: any
  /**  工具内部异常的错误信息 */
  error?: any
}

/** ai-sdk@v6 的流消息访问者， 暴露响应式的数据，它随着流消息到来逐渐的变化
 * @example
 * const stream = await toolLoopAgent.stream({prompt:'xxxx'})
 * const visitor= new StreamVisitor({
 *                 onStart(content){
 *                       -- 保存这个content
 *                    }
 *                 })
 *
 * await visitor.traverse(stream)
 * const result = await visitor.traverse(stream) // 或者保存此处的 result 的Ref响应数据
 */
export class StreamVisitor {
  constructor(public option: StreamVisitorOption = {}) {}

  async traverse(stream: StreamTextResult<{}, never>) {
    const result = ref<StartContent>()
    if (this.option.debug) {
      console.log('【stream-debug】 响应对象体：', result)
    }

    const backgroundRun = async () => {
      let startContent: StartContent
      let stepContent: StepContent
      let reasoningContent: ReasoningContent
      let textContent: TextContent
      let toolContent: ToolContent
      for await (const event of stream.fullStream) {
        if (this.option.debug) {
          console.log('【stream-debug】 ' + (new Date().getTime() / 1000).toString().slice(-6) + event.type, event)
        }

        switch (event.type) {
          case 'start':
            startContent = reactive({
              running: true,
              steps: []
            })
            result.value = startContent
            this.option.onStart?.(startContent)
            break
          case 'start-step':
            stepContent = reactive({
              running: true,
              contents: [],
              request: event.request
            })
            startContent!.steps.push(stepContent)
            this.option.onStep?.(stepContent)
            break
          case 'reasoning-start':
            reasoningContent = reactive({
              type: 'reasoning',
              id: event.id,
              running: true,
              text: ''
            })
            stepContent!.contents.push(reasoningContent)
            this.option.onReasoning?.(reasoningContent)
            break
          case 'reasoning-delta':
            reasoningContent!.text += event.text
            break
          case 'reasoning-end':
            reasoningContent!.running = false
            break
          case 'text-start':
            textContent = reactive({
              type: 'text',
              id: event.id,
              running: true,
              text: ''
            })
            stepContent!.contents.push(textContent)
            this.option.onText?.(textContent)
            break
          case 'text-delta':
            textContent!.text += event.text
            break
          case 'text-end':
            textContent!.running = false
            break
          case 'tool-input-start':
            toolContent = reactive({
              type: 'tool',
              running: true,
              id: event.id,
              toolCallId: event.id,
              title: '',
              toolName: event.toolName,
              dynamic: event.dynamic,
              inputStr: '',
              input: {},
              output: {}
            })
            stepContent!.contents.push(toolContent)
            this.option.onTool?.(toolContent)
            break
          case 'tool-input-delta':
            toolContent!.inputStr += event.delta
            break
          case 'tool-input-end':
            break
          case 'tool-call':
            toolContent!.input = event.input
            break
          case 'tool-result':
            toolContent!.output = event.output
            toolContent!.running = false
            break
          case 'tool-error':
            toolContent!.error = event.error as any
            toolContent!.running = false
            break
          case 'finish-step':
            stepContent!.running = false
            stepContent!.finishReason = event.finishReason
            stepContent!.usage = event.usage
            break
          case 'finish':
            startContent!.running = false
            startContent!.finishReason = event.finishReason
            startContent!.totalUsage = event.totalUsage
            this.option.onFinish?.()
            break
          case 'source':
          case 'file':
            // todo: 待实现
            break
          case 'error':
            if (startContent!) {
              startContent.running = false
              startContent!.error = event.error as any
              startContent!.finishReason = 'error'
            }
            this.option.onFinish?.()
            break
          case 'abort':
            if (startContent!) {
              startContent.running = false
              startContent!.error = { message: event.reason }
              startContent!.finishReason = 'other'
            }
            this.option.onFinish?.()
            break
          default:
            // 忽略未知事件
            break
        }
      }
    }

    backgroundRun()

    return result
  }
}

// ai-sdk@v6 的消息流模型, 根据 qwq-plus/ qwen-flash 统计整理
// 1. 每一个step 就是一轮对话，需要发出一次/completions 请求，会产生一次usage数据
// 2. 消息类类似于单线程的数据流，不会交叉，自动闭合。
// 3. tool-error/tool-result 只显示1个
// 4. 流示例：
// {type: 'start'}
//    {type: 'start-step', request: {…}, warnings: Array(0)}
//       {type: 'reasoning-start', id: 'reasoning-0'}
//          {type: 'reasoning-delta', id: 'reasoning-0', text: '好的，', providerMetadata: undefined}
//       {type: 'reasoning-end', id: 'reasoning-0'}
//       {type: 'text-start', id: 'txt-0'}
//          {type: 'text-delta', id: 'txt-0', text: '当然',providerMetadata: undefined} .....
//       {type: 'text-end', id: 'txt-0'}
//
//       {type: 'tool-input-start', id: 'call_c03d762c3b2143fdb10636', toolName: 'callChat', dynamic: false, title: 'chat'}
//       {type: 'tool-input-delta', id: 'call_c03d762c3b2143fdb10636', delta: '{"question": "'}
//       ...
//       {type: 'tool-input-end', id: 'call_c03d762c3b2143fdb10636'}
//
//       {type: 'tool-call', toolCallId: 'call_c03d762c3b2143fdb10636', toolName: 'callChat', input: {…}, providerExecuted: undefined,title: 'chat'}
//           tool start running.....
//       {type: 'tool-error', toolCallId: 'call_0d5cd79bae974a72b6d043', toolName: 'callChat', input: {…}, error:.., dynamic:false}
//       {type: 'tool-result', toolCallId: 'call_c03d762c3b2143fdb10636', toolName: 'callChat', input: {…}, output: {…}, …}
//
//    {type: 'finish-step', finishReason: 'tool-calls', rawFinishReason: 'tool_calls', usage: {…}, providerMetadata: {…}, …}
//    ---------- 开启下一轮对话
//    {type: 'start-step', request: {…}, warnings: Array(0)}
//         ...
//    {type: 'finish-step', finishReason: 'stop', rawFinishReason: 'stop', usage: {…}, providerMetadata: {…}, …}
//
// {type: 'finish', finishReason: 'stop', rawFinishReason: 'stop', totalUsage: {…}}

// {type: 'abort', reason: 'signal is aborted without reason'}  // abort 会立即停止，之后没有消息
// {type: 'error', error: {......}                              // error 会立即停止，之后没有消息
