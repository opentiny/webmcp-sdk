<template>
  <div style="display: flex; flex-direction: column; gap: 12px; height: 100vh; padding: 24px">
    <div
      v-if="messages.length === 0"
      style="display: flex; flex-direction: column; gap: 12px; flex: 1; width: 540px; margin: auto"
    >
      <Welcome
        icon="https://camo.githubusercontent.com/4ea7fdaabf101c16965c0bd3ead816c9d7726a59b06f0800eb7c9a30212d5a6a/68747470733a2f2f63646e2e656c656d656e742d706c75732d782e636f6d2f656c656d656e742d706c75732d782e706e67"
        title="欢迎使用 Element Plus X Remoter 💖"
        description="我是你的私人智能助手"
      />
      <Prompts
        title="🐵 提示集组件"
        :items="[
          {
            key: 'quickSort',
            label: '帮我写一个快速排序',
            description: '使用 js 实现一个快速排序'
          },
          {
            key: 'helpMd',
            label: '你可以帮我做些什么？',
            description: '了解当前大模型可以帮你做的事'
          }
        ]"
        @item-click="api.clickPrompt($event.label)"
      />
    </div>
    <div v-else style="display: flex; flex-direction: column; gap: 12px; flex: 1; overflow-y: auto">
      <template v-for="(msg, idx) in messages" :key="idx">
        <Bubble
          v-if="msg.from === 'user'"
          :avatar="avatarUser"
          :content="msg.content"
          placement="end"
          avatar-size="48px"
        />
        <Bubble
          v-else
          :content="msg.content"
          :avatar="avatarAI"
          typing
          is-markdown
          placement="start"
          avatar-size="48px"
        >
          <template #footer>
            <div class="footer-container">
              <el-button type="info" :icon="Refresh" size="small" circle />
              <el-button type="success" :icon="Search" size="small" circle />
              <el-button type="warning" :icon="Star" size="small" circle />
              <el-button color="#626aef" :icon="DocumentCopy" size="small" circle />
            </div>
          </template>
        </Bubble>
      </template>
    </div>

    <div>
      <Sender
        ref="senderRef"
        v-model="inputValue"
        clearable
        :loading="status !== 'ready'"
        @submit="api.onSubmit"
        @cancel="api.onCancel"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useNextAgent } from '@opentiny/next-remoter'
import { Welcome, Prompts, Bubble, Sender } from 'vue-element-plus-x'
import { DocumentCopy, Refresh, Search, Star } from '@element-plus/icons-vue'
import { ElButton } from 'element-plus'

const avatarAI = 'https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png'
const avatarUser = 'https://avatars.githubusercontent.com/u/76239030?v=4'

const { chatStream, status, messages, inputValue, stopChat, newConversation } = useNextAgent({
  ui: 'elplusx',
  llmConfig: { apiKey: 'sk-trial', baseURL: 'https://agent.opentiny.design/api/v1/ai', providerType: 'deepseek' },
  agentRoot: 'https://agent.opentiny.design/api/v1/webmcp-trial/',
  sessionId: '7fbd3f38-3ce1-4125-9475-115f844d288e',
  systemPrompt: '你是一个AI助手，会调用工具完成任务',
  model: 'deepseek-ai/DeepSeek-V3'
})

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

<style scoped lang="less">
:deep(.markdown-body) {
  background-color: transparent;
}
</style>
