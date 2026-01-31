import { StreamTextResult } from 'ai'

export interface StreamVisitorOption {
  onStart?: () => void
  onStartStep?: (request: any, warnings: any[]) => void
  onReasoningStart?: (id: string) => void
  onReasoningDelta?: (id: string, text: string, providerMetadata?: any) => void
  onReasoningEnd?: (id: string) => void
  onTextStart?: (id: string) => void
  onTextDelta?: (id: string, text: string, providerMetadata?: any) => void
  onTextEnd?: (id: string) => void
  onToolInputStart?: (id: string, toolName: string, dynamic?: boolean) => void
  onToolInputDelta?: (id: string, delta: string) => void
  onToolInputEnd?: (id: string) => void
  onToolCall?: (toolCallId: string, toolName: string, input: any, providerExecuted?: any) => void
  onToolResult?: (toolCallId: string, toolName: string, input: any, output: any) => void
  onFinishStep?: (finishReason: string, usage: any, providerMetadata?: any) => void
  onFinish?: (finishReason: string, totalUsage: any) => void
}
/** ai-sdk@v6 的流消息访问者
 * @example
 * const stream = await toolLoopAgent.stream({prompt:'xxxx'})
 * const visitor= new StreamVisitor({})
 *
 * visitor.traverse(stream)
 */
export class StreamVisitor {
  constructor(public option: StreamVisitorOption) {}

  async traverse(stream: StreamTextResult<{}, never>) {
    for await (const event of stream.fullStream) {
      switch (event.type) {
        case 'start':
          this.option.onStart?.()
          break
        case 'start-step':
          this.option.onStartStep?.(event.request, event.warnings)
          break
        case 'reasoning-start':
          this.option.onReasoningStart?.(event.id)
          break
        case 'reasoning-delta':
          this.option.onReasoningDelta?.(event.id, event.text, event.providerMetadata)
          break
        case 'reasoning-end':
          this.option.onReasoningEnd?.(event.id)
          break
        case 'text-start':
          this.option.onTextStart?.(event.id)
          break
        case 'text-delta':
          this.option.onTextDelta?.(event.id, event.text, event.providerMetadata)
          break
        case 'text-end':
          this.option.onTextEnd?.(event.id)
          break
        case 'tool-input-start':
          this.option.onToolInputStart?.(event.id, event.toolName, event.dynamic)
          break
        case 'tool-input-delta':
          this.option.onToolInputDelta?.(event.id, event.delta)
          break
        case 'tool-input-end':
          this.option.onToolInputEnd?.(event.id)
          break
        case 'tool-call':
          this.option.onToolCall?.(event.toolCallId, event.toolName, event.input, event.providerExecuted)
          break
        case 'tool-result':
          this.option.onToolResult?.(event.toolCallId, event.toolName, event.input, event.output)
          break
        case 'finish-step':
          this.option.onFinishStep?.(event.finishReason, event.usage, event.providerMetadata)
          break
        case 'finish':
          this.option.onFinish?.(event.finishReason, event.totalUsage)
          break
        default:
          // 忽略未知事件
          break
      }
    }
  }
}

// ai-sdk@v6 的消息流模型, 根据 qwq-plus/ qwen-flash 统计整理
// 1. 每一个step 就是一轮对话，需要发出一次/completions 请求，会产生一次usage数据
// 2. 消息类类似于单线程的数据流，不会交叉，自动闭合。
// 3. 流示例：
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
//       {type: 'tool-result', toolCallId: 'call_c03d762c3b2143fdb10636', toolName: 'callChat', input: {…}, output: {…}, …}
//
//    {type: 'finish-step', finishReason: 'tool-calls', rawFinishReason: 'tool_calls', usage: {…}, providerMetadata: {…}, …}
//    ---------- 开启下一轮对话
//    {type: 'start-step', request: {…}, warnings: Array(0)}
//         ...
//    {type: 'finish-step', finishReason: 'stop', rawFinishReason: 'stop', usage: {…}, providerMetadata: {…}, …}
//
// {type: 'finish', finishReason: 'stop', rawFinishReason: 'stop', totalUsage: {…}}
