<template>
  <div>
    <tiny-remoter
      ref="robotRef"
      v-model:show="show"
      v-model:fullscreen="fullscreen"
      v-model:selectedModelId="selectedModelId"
      :title="title"
      :gen-ui-able="true"
      :locale="locale"
      :sessionId="sessionId"
      :agentRoot="agentRoot"
      :systemPrompt="systemPrompt"
      :customMarketMcpServers="customMarketMcpServers"
      :skills="skills"
      :llmConfigs="llmConfigs"
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
import { OFFICE_PROMPT, SHOP_PROMPT } from './const'
import IconModelDeepseek from './components/icons/icon-model-deepseek.svg'
import IconModelAliyunBailian from './components/icons/icon-model-aliyun-bailian.svg'
import IconModelBuiltInAI from './components/icons/icon-model.svg'
import { markRaw } from 'vue'
import { builtInAI } from '@built-in-ai/core'
import type { Component } from 'vue'
import type { UnifiedModelConfig } from './types/model-config'

const props = defineProps({
  support: String // 支持什么应用：  office: 办公场景，  shop: 电商场景
})

const show = ref(true)
const fullscreen = ref(true)
const robotRef = ref<InstanceType<typeof TinyRemoter>>()
// 当前选中的模型ID（用于双向绑定，确保模型切换状态能正确同步）
const selectedModelId = ref<string>()

const query = new URLSearchParams(window.location.search)

// 1、语言 en-US、zh-CN
const locale: string = query.get('lang') || 'zh-CN'

// 2、会话ID， 必传
const sessionId = ref<string>(query.get('sessionId') || '')

// 3、组件内部的已经有默认值。 这里允许通过url 更换agent地址。
const agentRoot = query.get('agentRoot') || 'https://agent.opentiny.design/api/v1/webmcp-trial/'

// 4、标题
const title = query.get('title') || 'OpenTiny NEXT'

// 5、  定制接收 prompts, suggestion的参数
const welcomeTitle = query.get('welcome-title')
const welcomeDesc = query.get('welcome-desc')
const systemPrompt = query.get('system-prompt') || (props.support === 'office' ? OFFICE_PROMPT : SHOP_PROMPT)

const promts = query.getAll('promt') || [] // promt=你好&promt=世界
const promptItems = promts.map((str) => ({ label: str }))

const suggestions = query.getAll('suggestion') || [] // suggestion=你好&suggestion=世界
function handleSuggestionClick(str: string) {
  robotRef.value!.inputMessage = str
}

// skills 需要传入 Record<string, string>，由 next-sdk 解析为技能元数据
const skills = ref<Record<string, string>>({
  'skill-drawing-expert': '你是一个画图专家，你具有....',
  'skill-office-assistant': '你是一个办公助手，你具有....'
})

// 自定义市场 MCP 服务器列表
// enabled: true 表示该服务器默认启用
// addState: 'added' 表示该服务器已添加，会自动连接并显示在"已添加MCP服务"列表中
const customMarketMcpServers = ref([
  {
    id: '12306-mcp-server-custom',
    name: '12306购票搜索服务器',
    description: '12306购票搜索服务器',
    icon: 'https://agent.opentiny.design/public-assets/icons/icon-12306.webp',
    enabled: true, // 默认启用
    addState: 'added' as const, // 标记为已添加，会自动连接
    tools: [],
    url: 'https://agent.opentiny.design/api/v1/mcp-server/12306/mcp',
    type: 'StreamableHTTP'
  }
])

const llmConfigs = ref<UnifiedModelConfig[]>([
  {
    id: 'deepseek-ai/DeepSeek-V3',
    label: 'DeepSeek-V3',
    model: 'deepseek-ai/DeepSeek-V3',
    apiKey: 'sk-trial',
    baseURL: 'https://agent.opentiny.design/api/v1/ai/',
    genuiUrl: 'https://agent.opentiny.design/api/v1/ai/prompt',
    providerType: 'deepseek' as const,
    useReActMode: false,
    icon: markRaw(IconModelDeepseek as unknown as Component)
  },
  {
    id: 'deepseek-ai/DeepSeek-R1',
    label: 'DeepSeek-R1',
    model: 'deepseek-ai/DeepSeek-R1',
    apiKey: 'sk-trial',
    baseURL: 'https://agent.opentiny.design/api/v1/ai',
    genuiUrl: 'https://agent.opentiny.design/api/v1/ai/prompt',
    providerType: 'deepseek' as const,
    useReActMode: false,
    icon: IconModelDeepseek as unknown as Component
  },
  {
    id: 'qwen-vl-max',
    label: 'qwen-vl-max',
    model: 'qwen-vl-max',
    apiKey: 'sk-trial',
    baseURL: 'https://agent.opentiny.design/api/v1/ai',
    genuiUrl: 'https://agent.opentiny.design/api/v1/ai/prompt',
    providerType: 'deepseek' as const,
    useReActMode: true,
    isDefault: true,
    icon: markRaw(IconModelAliyunBailian as unknown as Component),
    // 多模态能力配置：启用文件上传功能
    multimodal: {
      supportImages: true, // 支持图片上传
      maxFileSize: 10, // 最大文件大小 10MB
      supportedMimeTypes: ['image/'] // 支持的文件类型：所有图片格式
    }
  },
  {
    id: 'built-in-ai',
    label: 'built-in-ai',
    model: 'built-in-ai',
    llm: builtInAI as unknown as any,
    useReActMode: true,
    icon: markRaw(IconModelBuiltInAI as unknown as Component)
  }
])
</script>

<style scoped lang="less">
:deep(.tr-container__header-operations) {
  .tr-icon-button {
    display: none;
  }

  .tr-icon-button:first-child,
  .tr-icon-button:nth-child(2) {
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
