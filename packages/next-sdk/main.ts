import { registerOnPage, registerPageAgentTool } from './src/index'
import { NextAgent } from './src/index'
import { createDeepSeek } from '@ai-sdk/deepseek'
import { tool } from 'ai'
import { z } from 'zod'

// ----------------------------- 用户注册 -----------------------------
registerOnPage({
  name: 'xxx 控制台服务',
  description: '当前服务有哪些功能，有哪些工具。。。'
})

// 注册页面上的pageAgent工具
registerPageAgentTool()

// 注册页面工具
const controller = new AbortController()
document.modelContext.registerTool(
  {
    name: 'getDateTime',
    title: '当前时间',
    description: '获取当前时间',
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    },
    execute: async () => {
      return `当前时间是: ${new Date().toLocaleTimeString()}`
    }
  },
  {
    signal: controller.signal
  }
)

// 反注册工具（页面离开时)
// controller.abort()

// ----------------------------- 测试AGENT -----------------------------

const deepseek = createDeepSeek({
  apiKey: 'sk-1234',
  baseURL: 'https://api.deepseek.com'
})

// 1. 构造agent, 参考 ：https://ai-sdk.dev/docs/agents/building-agents#creating-an-agent
const agent = new NextAgent({
  model: deepseek('deepseek-chat')
  // .........  ToolLoopAgentSettings 支持的其它参数
  // 比如： tools, stopWhen, temperature, ...
})

console.log(agent)

// 3. 发起对话
// agent.chatStream({
//   role: 'user',
//   content: '查询我的esc机器'
// })

// // 4. 取消对话
// agent.cancelChat()

// // 5. 重复上次对话
// agent.reLastChat()

// // 6. agent的属性
agent.debugStream = true // 在控制台上，打印流消息
// agent.messages = [] // 与 llm 接口对话的消息体
// agent.uiMessages = [] // llm 流消息返回的消息体
// agent.status = ref('init') // 智能体当前状态
// agent.extraTools = {} // ai-sdk 支持的 ToolSet 对象

// agent.$conversation = {} // 多个会话管理，可以切换，保存会话等
// agent.$promptManager = {} // 提示词管理
// agent.$mcpServers = [] // mcpServer管理

// // 6.1 extraTools
// import { tool } from 'ai'
// import { z } from 'zod'

const weatherTool = tool({
  description: '查询某地天气',
  inputSchema: z.object({
    city: z.string().describe('城市')
  }),
  execute: async ({ city }) => {
    return { temperature: 24, conditions: '晴' }
  }
})

agent.extraTools = {
  weatherTool
}

// // 6.2 会话管理，自动localstorage保存
// agent.$conversation.conversations = [] // 会话列表， 第一条为当前会话
// agent.$conversation.createConversation() // 创建新会话，并放置在列表的顶部
// agent.$conversation.switchConversation(conv) // 切换某个记录为当前会话
// agent.$conversation.deleteConversation(conv) // 删除某个记录， 不允许删除当前会话
// agent.$conversation.renameConversation(conv, '新标题') // 重命名会话标题

// // 6.3 提示词管理
agent.$promptManager.setStatic('xxx') // 设置固定的词
// agent.$promptManager.setSkillMeta('xxx') // 设置技能包的结果（可以不使用）
// agent.$promptManager.setTemp('xxx') // 设置临时值
// agent.$promptManager.appendTemp('xxx') // 追加临时值
// agent.$promptManager.getAll() // 获取全部的提示词。 （不必手动获取， agent在每一次对话前，会调用一次）

// // 6.4 mcpServer管理， 目前支持3种: PageServer / StreamableHttpServer / SSEServer
// // 1. mcpServer添加后，它会自动连接Server,并获取它的实时工具。
// // 2. agent在每一次对话前，会刷新实时工具，再与llm会话。
// agent.$mcpServers.mcpServers = [] // mcp列表， 请勿修改
// agent.$mcpServers.ignoreToolNames = ['getWeather'] // 临时忽略的工具名
// agent.$mcpServers.tools = {} // ai-sdk规范的 ToolSet 对象

// // 添加服务， 自动生成内部id
agent.$mcpServers.addMcpServer({
  name: '页面服务',
  type: 'page',
  window
})
// agent.$mcpServers.addMcpServer({
//   name: 'http 服务',
//   type: 'http',
//   url: 'https://.......',
//   headers: {} // 可选
// })
// agent.$mcpServers.addMcpServer({
//   name: 'sse 服务',
//   type: 'sse',
//   url: 'https://.......',
//   headers: {}
// })

// // 移除服务， 传入id 或 mcpSever对象
// agent.$mcpServers.removeMcpServer('page-1')
// agent.$mcpServers.removeMcpServer({id:'http-2', ... })

// 3. 发起对话
agent.chatStream({
  role: 'user',
  content: '调用工具，查询当前整个页面的浏览器状态'
})
