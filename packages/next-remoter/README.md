# next-remoter

目前是提供给`Vue的开发用户`的一个开箱即用的组件。

核心代码在 `components, composable` 中， `tiny-robot-chat.vue` 是真正的组件

1. `index.ts` 是用于导出 Vue 组件的包，供用户使用
2. `App.vue` 是部署在服务器上，扫码访问的页面

## 设想`Vue的开发用户`的使用流程

```html
<tiny-remoter 
  ref="remoterRef" 
  v-model:show="showAiChat" 
  :sessionId="sessionId" 
  :title="项目名字"
  :llmConfig="llmConfig"
>
  <template #welcome>
    <!-- 自定义标题+图标
    自定义的Promts, 点击后调用 sendMessage()
    其它任意欢迎界面元素 -->
  </template>
  <template #suggestions>
    <!-- 输入框上面的提示词。  有丰富的用法，并不仅是点击，插入一个模板，详见官网。 所以用插槽代替 -->
  </template>
</tiny-remoter>
```

```typescript
import { createRemoter } from 'next-sdk'
import { TinyRemoter } from 'remoter'

const showAiChat = ref(false)
const remoterRef = ref()

// 配置自定义LLM（可选）
const llmConfig = {
  apiKey: 'your-api-key',
  baseURL: 'https://api.openai.com/v1',
  providerType: 'openai'
}

// 1、 创建 server,client
const [serverTransport, clientTransport] = createMessageChannelPairTransport()
const server = new WebMcpServer({ name: 'demo-server', version: '1.0.0' })
const client = new WebMcpClient({ name: 'demo-client', version: '1.0.0' })

await server.connect(serverTransport)
await client.connect(clientTransport)

const { sessionId } = await client.connect({
  url: 'https://agent.opentiny.design/api/v1/webmcp-trial/mcp',
  agent: true
})

// 2. 创建页面的浮动块
createRemoter({
  sessionId,
  qrCodeUrl: 'https://ai.opentiny.design/next-remoter',
  onShowAIChat: () => {
    showAiChat.value = true
  }
})

// 3. remoterRef实例
// v-model:fullscreen  双向绑定是否全屏
// v-model:show  双向绑定是否显示，内部关闭是emit('update:show',false)
// sessionId     必须传
// title         左上角的 container.title
// agentRoot     后端代理的地址，有默认值

// remoterRef实例需要：
// expose({  sendMessage, abortRequest,  messages,  messageState,senderRef})

//  currentTemplate,  clearTemplate, 模板相关的功能先去掉，方便跨UI chat 框架适配。

## LLM配置

TinyRemoter组件支持自定义大语言模型配置，统一通过 `llmConfig` 传入：

### 1. 使用 llmConfig.providerType 配置对象

```typescript
const llmConfig = {
  apiKey: 'your-api-key',
  baseURL: 'https://api.openai.com/v1',
  providerType: 'openai' // 支持 'openai' | 'deepseek' 或自定义Provider函数
}
```

### 2. 使用自定义Provider实例（通过 llmConfig.llm）

```typescript
import { createOpenAI } from '@ai-sdk/openai'

const customProvider = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: 'https://api.openai.com/v1'
})

const llmConfig = {
  llm: customProvider
}
```

然后在组件中使用：

```html
<tiny-remoter 
  :llmConfig="llmConfig"
  :sessionId="sessionId" 
/>
```

### 支持的提供商

- OpenAI (`providerType: 'openai'`)
- DeepSeek (`providerType: 'deepseek'`)
- 其他ai-sdk兼容的提供商（通过自定义Provider函数）

## 构建发包

```shell
pnpm i
pnpm -F @opentiny/next-remoter build
cd packages/next-remoter
npm publish
```
