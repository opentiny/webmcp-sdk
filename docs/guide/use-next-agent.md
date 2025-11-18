# useNextAgent 通用的智能体

```javascript
import { useNextAgent } from '@opentiny/next-remoter'
```

在上一节中，我们知道 `TinyRemoter` 是一个开箱即用的`Tiny Robot UI`开发的对话框界面的Vue 组件，它内部封装了LLM对话和Web应用添加等功能。如果用户需要依赖其它第3方的流行Chat UI组件库进行开发，那么可以考虑使用`useNextAgent`无头 Vue hook 函数，它是一个内部包含了连接LLM会话, 打通WEB应用和聊天界面，并返回和聊天界面常用的变量和函数，达到迅速的对接任意Chat UI组件库应用。

## 快速上手

```typescript
import { useNextAgent } from '@opentiny/next-remoter'

const {
  status,
  messages,
  inputValue,
  chatStream,
  stopChat,
  newConversation,
  addSessionId //
} = useNextAgent({
  ui: 'elplusx',
  llmConfig: { apiKey: '...', baseURL: '...', providerType: 'deepseek' },
  agentRoot: 'https://agent.opentiny.design/api/v1/webmcp-trial/',
  sessionId: '7fbd3f38-3ce1-4125-9475-115f844d288e',
  systemPrompt: '你是一个AI助手，会调用工具完成任务',
  model: 'deepseek-ai/DeepSeek-V3'
})
```

## 参数

```typescript
export type INextAgetOption = {
  /** 代理模型提供器的大语言配置对象，llmConfig.llm 优先级最高 */
  llmConfig: IAgentModelProviderLlmConfig
  /** 访问 llm 时，预置的系统提示词 */
  systemPrompt?: string
  /** 大语言模型 的 modelId， 比如：'deepseek-ai/DeepSeek-V3' */
  model: string
  /** 一次对话中的最大轮数, 最大默认 5轮 */
  maxSteps?: number
  /** 代理的后台地址，比如：'https://agent.opentiny.design/api/v1/webmcp-trial/'，若私有化部署，请填入私有化地址。 */
  agentRoot: string
  /** 初始的受控应用的会话id, 如果多个应用，需要使用英文逗号分隔 */
  sessionId?: string
  /** 设置适配哪种UI框架，以便返回正确格式的message */
  ui?: 'matechat' | 'antdx' | 'elplusx' | 'tdchat'
  /** 自定义流数据处理函数，将 llm 返回的流数据，按自定义的格式，保存到messages 数组中。
   * 如果设置，则代替内部默认的流处理函数。
   */
  processStream?: (stream: ReadableStream<string>, messages: Ref<any[]>, senderContent: string) => Promise<void>
}
```

- llmConfig 统一承载所有 `LLM` 连接方式，可通过 `llmConfig.llm` 或 `llmConfig.providerType` 定义具体 Provider。
- systemPrompt,model,maxStep 都是与`LLM`对话时的基本配置。
- agentRoot 与 sessionId 都是配置智能化WEB应用的信息。 `sessionId` 可以不填写，后面通过 `addSessionId` 来添加待操控的WEB应用。
- ui ：当前函数内置的流行Chat UI库的支持，能返回正确的 `messages` 的会话数据。
- processStream ：如果内置的`messages`的消息体结构不满足业务要求，可以自定义流的处理，保存到`messages`数据中去，比如要实现灵活的动态表单组件，更详细的工具调用查看等等。

## 返回变量&函数

```typescript
return {
  /** 一个AgentModelProvider实例 */
  agent,
  /** agent的实时状态，'ready' | 'submitted' | 'streaming' | 'error' */
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
```

返回变量&函数可以直接在`Vue`模板中绑定使用。

下面以绑定`antd-vue-x`UI库为例，演示如何绑定模板：

```vue
<template>
  <!-- 无对话时的展示 -->
  <Flex gap="middle" vertical class="container">
    <Flex gap="middle" justify="space-between">
      <span>Ant Design X Remoter</span>
      <Button type="text" :icon="h(PlusOutlined)" @click="api.createConversation" />
    </Flex>
    <Divider />
    <div v-if="messages.length === 0" class="welcomeWrap">
      <Welcome
        icon="https://mdn.alipayobjects.com/huamei_iwk9zp/afts/img/A*s5sNRo5LjfQAAAAAAAAAAAAADgCCAQ/fmt.webp"
        title="Ant Design X Remoter"
        description="我是你的私人智能助手"
      />
      <Divider />
      <Prompts title="快速提示" :items="promptItems" @item-click="api.clickPrompt($event.data.label)" />
    </div>
    <!-- 对话列表 -->
    <Flex v-else gap="middle" vertical style="flex: 1">
      <template v-for="(msg, idx) in messages" :key="idx">
        <Bubble
          v-if="msg.from === 'user'"
          placement="end"
          :content="msg.content"
          :avatar="{
            icon: h(UserOutlined),
            style: {
              color: '#f56a00',
              backgroundColor: '#fde3cf'
            }
          }"
        />
        <Bubble
          v-else
          placement="start"
          :content="msg.content"
          :messageRender="renderMarkdown"
          :avatar="{
            icon: h(UserOutlined),
            style: {
              color: '#fff',
              backgroundColor: '#87d068'
            }
          }"
          typing
        />
      </template>
    </Flex>

    <Sender v-model:value="inputValue" :loading="status !== 'ready'" @submit="api.onSubmit" @cancel="api.onCancel" />
  </Flex>
</template>

<script setup lang="ts">
import { h } from 'vue'
import { Welcome, Prompts, Bubble, Sender } from 'ant-design-x-vue'
import { Flex, Button, Divider, Typography } from 'ant-design-vue'
import { BulbOutlined, InfoCircleOutlined, UserOutlined, PlusOutlined } from '@ant-design/icons-vue'
import { useNextAgent } from '@opentiny/next-remoter'
import markdownit from 'markdown-it'

const md = markdownit({ html: true, breaks: true })
const renderMarkdown = (content) =>
  h(Typography, null, {
    default: () => h('div', { innerHTML: md.render(content) })
  })

const { chatStream, status, messages, inputValue, stopChat, newConversation } = useNextAgent({
  ui: 'antdx',
  llmConfig: { apiKey: 'sk-trial', baseURL: 'https://agent.opentiny.design/api/v1/ai', providerType: 'deepseek' },
  agentRoot: 'https://agent.opentiny.design/api/v1/webmcp-trial/',
  sessionId: '',
  systemPrompt: '你是一个AI助手，会调用工具完成任务',
  model: 'deepseek-ai/DeepSeek-V3'
})
const promptItems = [
  {
    key: '1',
    icon: h(BulbOutlined, { style: { color: '#FFD700' } }),
    label: ' 帮我写一个快速排序',
    description: '使用 js 实现一个快速排序'
  },
  {
    key: '2',
    icon: h(InfoCircleOutlined, { style: { color: '#1890FF' } }),
    label: '你可以帮我做些什么？',
    description: '了解当前大模型可以帮你做的事'
  }
]

const api = {
  createConversation() {
    newConversation()
  },
  clickPrompt(label: string) {
    inputValue.value = label
  },
  onSubmit() {
    chatStream()
  },
  onCancel() {
    stopChat()
  }
}
</script>
```

更多Chat UI的使用例子，可以访问仓库源码： [next-sdk/vue-playground](https://www.github.com/opentiny/next-sdk/tree/dev/packages/vue-playground) 查看;
