/**
 * 浏览器端 Mock Fetch
 *
 * 这个文件提供了一个浏览器端的 fetch mock 实现，
 * 可以直接在浏览器中模拟 API 响应，无需启动服务器
 *
 * 使用方法：
 * import { createMockFetch } from './providers/mock-fetch'
 *
 * const llmConfig = {
 *   model: 'mock-model',
 *   llm: createCustomProvider({
 *     baseURL: 'http://mock-api',
 *     fetch: createMockFetch()
 *   })
 * }
 */

/**
 * Mock Fetch 配置选项
 */
export interface MockFetchOptions {
  /** 模拟的网络延迟（毫秒），默认 100ms */
  delay?: number
  /** 流式响应中每个字符的延迟（毫秒），默认 30ms */
  streamDelay?: number
  /** 自定义响应文本 */
  responseText?: string
  /** 是否启用日志输出 */
  enableLog?: boolean
}

/**
 * 创建 Mock Fetch 函数
 *
 * @param options Mock 配置选项
 * @returns Mock fetch 函数
 */
export function createMockFetch(options: MockFetchOptions = {}) {
  const {
    delay = 100,
    streamDelay = 30,
    responseText = '你好！这是一个来自浏览器端 Mock 的响应。这段文本会被分成多个片段返回，以模拟流式响应的效果。Mock 功能正常工作！',
    enableLog = true
  } = options

  /**
   * Mock Fetch 实现
   */
  return async function mockFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const url = typeof input === 'string' ? input : input.toString()

    // 只 mock chat/completions 接口
    if (!url.includes('/chat/completions')) {
      // 其他请求使用真实的 fetch
      return fetch(input, init)
    }

    if (enableLog) {
      console.log('[Mock Fetch] 收到请求:', url)
      console.log('[Mock Fetch] 请求配置:', init)
    }

    // 解析请求体
    let requestData: any = {}
    if (init?.body) {
      try {
        requestData = JSON.parse(init.body as string)
      } catch (e) {
        console.error('[Mock Fetch] 解析请求体失败:', e)
      }
    }

    const { model = 'mock-model', messages = [], stream = true } = requestData

    if (enableLog) {
      console.log('[Mock Fetch] 模型:', model)
      console.log('[Mock Fetch] 消息数:', messages.length)
      console.log('[Mock Fetch] 流式响应:', stream)
      console.log('[Mock Fetch] 消息内容:', messages)
    }

    // 模拟网络延迟
    await new Promise((resolve) => setTimeout(resolve, delay))

    if (stream) {
      // 返回流式响应
      return createStreamResponse(responseText, model, streamDelay, enableLog)
    } else {
      // 返回非流式响应
      return createNonStreamResponse(responseText, model, enableLog)
    }
  }
}

/**
 * 创建流式响应（Server-Sent Events）
 */
function createStreamResponse(text: string, model: string, streamDelay: number, enableLog: boolean): Response {
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      const chunks = text.split('')

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i]
        const data = {
          id: `chatcmpl-mock-${Date.now()}-${i}`,
          object: 'chat.completion.chunk',
          created: Math.floor(Date.now() / 1000),
          model: model,
          choices: [
            {
              index: 0,
              delta: {
                content: chunk
              },
              finish_reason: null
            }
          ]
        }

        const sseData = `data: ${JSON.stringify(data)}\n\n`
        controller.enqueue(encoder.encode(sseData))

        // 模拟流式输出的延迟
        await new Promise((resolve) => setTimeout(resolve, streamDelay))
      }

      // 发送结束标记
      controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      controller.close()

      if (enableLog) {
        console.log('[Mock Fetch] 流式响应完成')
      }
    }
  })

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    }
  })
}

/**
 * 创建非流式响应
 */
function createNonStreamResponse(text: string, model: string, enableLog: boolean): Response {
  const response = {
    id: `chatcmpl-mock-${Date.now()}`,
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: model,
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content: text
        },
        finish_reason: 'stop'
      }
    ],
    usage: {
      prompt_tokens: 10,
      completion_tokens: text.length,
      total_tokens: 10 + text.length
    }
  }

  if (enableLog) {
    console.log('[Mock Fetch] 非流式响应:', response)
  }

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  })
}
