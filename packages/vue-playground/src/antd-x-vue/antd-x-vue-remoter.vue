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
import { h, ref } from 'vue'
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

const { chatStream, status, messages, stopChat, newConversation } = useNextAgent({
  ui: 'antx',
  llmConfig: { apiKey: 'sk-trial', baseURL: 'https://agent.opentiny.design/api/v1/ai', providerType: 'deepseek' },
  agentRoot: 'https://agent.opentiny.design/api/v1/webmcp-trial/',
  sessionId: '45653e8b-8ba6-4cc5-b037-039faa65c3c1',
  systemPrompt: '你是一个AI助手，会调用工具完成任务',
  model: 'deepseek-ai/DeepSeek-V3'
})
const inputValue = ref('')
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
    if (inputValue.value) {
      chatStream(inputValue.value)
    }
  },
  onCancel() {
    stopChat()
  }
}
</script>

<style lang="less" scoped>
.container {
  height: 100vh;
  padding: 24px;
  gap: 8px;
  background: #fff;
}
.welcomeWrap {
  flex: 1;
  width: 500px;
  margin: auto;
}
</style>
