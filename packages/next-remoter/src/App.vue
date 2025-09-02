<template>
  <div>
    <tiny-remoter
      ref="robotRef"
      v-model:show="show"
      v-model:fullscreen="fullscreen"
      :title="title"
      :locale="locale"
      :sessionId="sessionId"
      :agentRoot="agentRoot"
      :systemPrompt="systemPrompt"
      mode="chat-dialog"
    >
      <template #welcome v-if="welcomeTitle">
        <div style="flex: 1">
          <tr-welcome :title="welcomeTitle" :description="welcomeDesc" :icon="robotRef?.welcomeIcon"> </tr-welcome>
          <tr-prompts :items="promptItems" :wrap="true" class="tiny-prompts" item-class="prompt-item"></tr-prompts>
        </div>
      </template>
      <template #suggestions v-if="suggestions.length > 0">
        <div class="chat-input-pills">
          <TrSuggestionPillButton v-for="sgg in suggestions" :key="sgg" @click="handleSuggestionClick(sgg)">{{
            sgg
          }}</TrSuggestionPillButton>
        </div>
      </template>
    </tiny-remoter>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { TinyRemoter } from './index'
import { TrWelcome, TrPrompts, TrSuggestionPillButton } from '@opentiny/tiny-robot'

const show = ref(true)
const fullscreen = ref(true)
const robotRef = ref<InstanceType<typeof TinyRemoter>>()

const query = new URLSearchParams(window.location.search)

// 1、语言 en-US、zh-CN
const locale = query.get('lang') || 'zh-CN'

// 2、会话ID， 必传
const sessionId = query.get('sessionId') || ''

// 3、组件内部的已经有默认值。 这里允许通过url 更换agent地址。
const agentRoot = query.get('agentRoot') || 'https://agent.opentiny.design/api/v1/webmcp-trial/'

// 4、标题
const title = query.get('title') || 'OpenTiny Next'

// 5、  定制接收 prompts, suggestion的参数
const welcomeTitle = query.get('welcome-title')
const welcomeDesc = query.get('welcome-desc')
const systemPrompt = query.get('system-prompt') || ''

const promts = query.getAll('promt') || [] // promt=你好&promt=世界
const promptItems = promts.map((str) => ({ label: str }))

const suggestions = query.getAll('suggestion') || [] // suggestion=你好&suggestion=世界
function handleSuggestionClick(str: string) {
  robotRef.value.inputMessage = str
}
</script>

<style scoped lang="less">
:deep(.tr-container__header-operations) {
  .tr-icon-button {
    display: none;
  }

  .tr-icon-button:first-child {
    display: flex;
  }
}

.tiny-prompts {
  padding: 16px 24px;

  :deep(.prompt-item) {
    width: 100%;
    box-sizing: border-box;

    @container (width >=64rem) {
      width: calc(50% - 8px);
    }

    .tr-prompt__content-label {
      font-size: 14px;
      line-height: 24px;
    }
  }
}

.chat-input-pills {
  margin-bottom: 8px;
  display: flex;
  gap: 16px;
}
</style>
