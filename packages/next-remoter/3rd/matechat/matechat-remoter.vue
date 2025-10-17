<template>
  <McLayout class="container" :style="{ width: fullscreen ? 'unset' : '480px' }">
    <McHeader :title="title" :logoImg="titleLogo">
      <template #operationArea>
        <div class="operations">
          <i class="icon-add-thin" @click="api.createConversation"></i>
        </div>
      </template>
    </McHeader>
    <!-- 无对话时的展示 -->
    <McLayoutContent
      v-if="messages.length === 0"
      style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px"
    >
      <McIntroduction
        :logoImg="welcome.logo"
        :title="welcome.title"
        :description="welcome.description"
      ></McIntroduction>
      <McPrompt
        :list="welcome.prompts.list"
        :direction="welcome.prompts.direction"
        class="intro-prompt"
        @itemClick="api.clickPrompt($event.label)"
      ></McPrompt>
    </McLayoutContent>
    <!-- 对话列表 -->
    <McLayoutContent v-else>
      <template v-for="(msg, idx) in messages" :key="idx">
        <McBubble
          v-if="msg.from === 'user'"
          :content="msg.content"
          :align="'right'"
          :avatarConfig="{ imgSrc: userAvatar }"
        >
        </McBubble>
        <McBubble v-else :content="msg.content" :avatarConfig="{ imgSrc: aiAvatar }" :loading="msg.loading">
          <McMarkdownCard :content="msg.content" theme="light" typing enableThink></McMarkdownCard>
        </McBubble>
      </template>
    </McLayoutContent>

    <McLayoutSender>
      <McInput
        :value="inputValue"
        :maxLength="2000"
        :loading="status !== 'ready'"
        @change="(e) => (inputValue = e)"
        @submit="api.onSubmit"
        @cancel="api.onStop"
      >
      </McInput>
    </McLayoutSender>
  </McLayout>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useNextAgent } from '../../src/composable/useNextAgent'

defineOptions({
  name: 'MatechatRemoter'
})

const props = defineProps({
  /** 是否全屏 */
  fullscreen: {
    type: Boolean,
    default: true
  },
  /** 左上角的标题 */
  title: {
    type: String,
    default: 'MateChat Remoter'
  },
  /** 左上角的标题Logo */
  titleLogo: {
    type: String,
    default: 'https://matechat.gitcode.com/logo.svg'
  },
  /** 无对话时的欢迎界面 */
  welcome: {
    type: Object,
    default: () => ({
      logo: 'https://matechat.gitcode.com/logo.svg',
      title: 'MateChat Remoter',
      description: ['我是你的私人智能助手'],
      /** 该配置参考 MetaChat 的 Prompt 提示组件*/
      prompts: {
        direction: 'horizontal',
        list: [
          {
            value: 'quickSort',
            label: '帮我写一个快速排序',
            iconConfig: { name: 'icon-info-o', color: '#5e7ce0' },
            desc: '使用 js 实现一个快速排序'
          },
          {
            value: 'helpMd',
            label: '你可以帮我做些什么？',
            iconConfig: { name: 'icon-star', color: 'rgb(255, 215, 0)' },
            desc: '了解当前大模型可以帮你做的事'
          }
        ]
      }
    })
  },
  userAvatar: {
    type: String,
    default: 'https://matechat.gitcode.com/png/demo/userAvatar.svg'
  },
  aiAvatar: {
    type: String,
    default: 'https://matechat.gitcode.com/png/demo/userAvatar.svg'
  }
})

const { agent, chatStream, status, messages, stop } = useNextAgent({
  ui: 'matechat',
  llmConfig: { apiKey: 'sk-trial', baseURL: 'https://agent.opentiny.design/api/v1/ai', providerType: 'deepseek' },
  agentRoot: 'https://agent.opentiny.design/api/v1/webmcp-trial/',
  sessionId: '45653e8b-8ba6-4cc5-b037-039faa65c3c1',
  systemPrompt: '你是一个AI助手，会调用工具完成任务',
  model: 'deepseek-ai/DeepSeek-V3'
})
const inputValue = ref('')

const api = {
  createConversation() {
    messages.value = []
    agent.messages = []
  },
  clickPrompt(label: string) {
    inputValue.value = label
  },
  onSubmit() {
    if (inputValue.value) {
      chatStream(inputValue.value)
    }
  },
  onStop: stop
}
</script>

<style lang="less" scoped>
.container {
  margin: 0 auto;
  height: 100vh;
  padding: 20px;
  gap: 8px;
  background: #fff;
}

.operations {
  display: inline-flex;
  gap: 12px;
  font-size: 18px;

  i {
    cursor: pointer;
  }
}
</style>
