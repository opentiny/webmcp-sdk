/**
 * ReAct 模式使用示例 - 带图片的多轮对话
 * 演示 Magentic-UI 风格的消息管理策略
 */

import { AgentModelProvider } from '../packages/next-sdk/agent/AgentModelProvider'

// 1. 创建 Agent（启用 ReAct 模式）
const agent = new AgentModelProvider({
  llmConfig: {
    providerType: 'openai',
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: 'http://localhost:5000/v1', // 本地 Fara-7B vLLM 服务
    useReActMode: true // 启用 ReAct 模式
  },
  mcpServers: {
    // 你的 MCP 服务器配置
  }
})

// 2. 基础使用（默认保留3张图片）
async function example1_basic() {
  const result = await agent.chatStream({
    message: '帮我打开网页并截图',
    model: 'microsoft/Fara-7B',
    maxSteps: 10
    // maxImages: 3 (默认值)
  })

  for await (const chunk of result.fullStream) {
    if (chunk.type === 'text-delta') {
      process.stdout.write(chunk.text)
    }
  }
}

// 3. 自定义图片数量（适用于图片密集型任务）
async function example2_moreImages() {
  const result = await agent.chatStream({
    message: '监控这个网页的变化，每秒截图一次',
    model: 'microsoft/Fara-7B',
    maxSteps: 10,
    maxImages: 5 // 保留最多5张图片
  })

  for await (const chunk of result.fullStream) {
    if (chunk.type === 'text-delta') {
      process.stdout.write(chunk.text)
    }
  }
}

// 4. 复杂任务示例（多步骤，完整上下文）
async function example3_complexTask() {
  const result = await agent.chatStream({
    message: `
      执行以下任务：
      1. 打开 https://www.bing.com
      2. 搜索 "TypeScript 教程"
      3. 点击第一个结果
      4. 滚动到页面底部
      5. 截图并告诉我页面的主要内容
    `,
    model: 'microsoft/Fara-7B',
    maxSteps: 20,
    maxImages: 3 // 即使任务很长，也只保留最新的3张图片
  })

  for await (const chunk of result.fullStream) {
    console.log('Chunk:', chunk)
  }
}

// 5. 带截图的工具调用示例
async function example4_withScreenshots() {
  // 第一次调用：打开网页
  const result1 = await agent.chatStream({
    message: '打开 https://example.com',
    model: 'microsoft/Fara-7B',
    maxSteps: 5
  })

  for await (const chunk of result1.fullStream) {
    if (chunk.type === 'tool-result') {
      console.log('工具调用结果:', chunk)
    }
  }

  // 第二次调用：继续操作（会保留之前的文本上下文）
  const result2 = await agent.chatStream({
    message: '点击页面中的第一个链接',
    model: 'microsoft/Fara-7B',
    maxSteps: 5
  })

  for await (const chunk of result2.fullStream) {
    if (chunk.type === 'tool-result') {
      console.log('工具调用结果:', chunk)
    }
  }
}

// 6. 处理消息历史（手动管理）
async function example5_messageHistory() {
  // 手动构建消息历史（包含图片）
  const messages = [
    { role: 'user', content: '打开网页' },
    { role: 'assistant', content: 'Thought: 我需要访问网页\nAction: visit_url...' },
    {
      role: 'user',
      content: [
        { type: 'text', text: 'Observation: 页面已加载' },
        { type: 'image', image: 'base64_screenshot_1' }
      ]
    },
    { role: 'assistant', content: 'Thought: 页面加载成功...' },
    {
      role: 'user',
      content: [
        { type: 'text', text: 'Observation: 已滚动' },
        { type: 'image', image: 'base64_screenshot_2' }
      ]
    }
  ]

  const result = await agent.chatStream({
    messages: messages, // 传入历史消息
    model: 'microsoft/Fara-7B',
    maxSteps: 10,
    maxImages: 3 // 只保留最新的3张图片，但保留所有文本
  })

  for await (const chunk of result.fullStream) {
    console.log('Chunk:', chunk)
  }
}

// 7. 调试模式：查看实际发送给模型的消息
async function example6_debug() {
  // 启用调试日志
  agent.onError = (msg, err) => {
    console.error('Agent Error:', msg, err)
  }

  const result = await agent.chatStream({
    message: '执行一个复杂任务',
    model: 'microsoft/Fara-7B',
    maxSteps: 10,
    maxImages: 2,
    // 可以通过拦截器查看实际发送的消息
    onStepFinish: (step: any) => {
      console.log('Step finished:', step)
      console.log('Messages sent to model:', step.messages)
    }
  })

  for await (const chunk of result.fullStream) {
    // 处理流式输出
  }
}

// 8. 性能优化：大量操作时的配置
async function example7_performance() {
  const result = await agent.chatStream({
    message: '执行50个连续的页面操作',
    model: 'microsoft/Fara-7B',
    maxSteps: 50,
    maxImages: 2, // 降低图片数量，减少 token 消耗
    // 其他性能优化选项
    temperature: 0, // 降低随机性，提高可预测性
    timeout: 60000 // 增加超时时间
  })

  for await (const chunk of result.fullStream) {
    // 处理流式输出
  }
}

// 运行示例
async function main() {
  console.log('=== 示例 1: 基础使用 ===')
  await example1_basic()

  console.log('\n=== 示例 2: 自定义图片数量 ===')
  await example2_moreImages()

  console.log('\n=== 示例 3: 复杂任务 ===')
  await example3_complexTask()

  console.log('\n=== 示例 4: 带截图的工具调用 ===')
  await example4_withScreenshots()

  console.log('\n=== 示例 5: 消息历史管理 ===')
  await example5_messageHistory()

  console.log('\n=== 示例 6: 调试模式 ===')
  await example6_debug()

  console.log('\n=== 示例 7: 性能优化 ===')
  await example7_performance()
}

// 如果直接运行此文件
if (require.main === module) {
  main().catch(console.error)
}

export {
  example1_basic,
  example2_moreImages,
  example3_complexTask,
  example4_withScreenshots,
  example5_messageHistory,
  example6_debug,
  example7_performance
}
