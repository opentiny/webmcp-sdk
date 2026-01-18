<template>
  <tr-container
    v-model:show="show"
    v-model:fullscreen="fullscreen"
    :style="{
      position: layoutMode,
      width: layoutMode !== 'fixed' ? 'unset' : undefined,
      height: layoutMode !== 'fixed' ? '100%' : undefined
    }"
  >
    <template #title>
      <h3 class="tr-container__title">{{ title }}</h3>
    </template>
    <template #operations>
      <slot name="operations">
        <tr-icon-button :icon="IconNewSession" size="28" svgSize="20" @click="handleCreateConversation()" />
        <tr-icon-button :icon="IconHistory" size="28" svgSize="20" @click="showHistory = !showHistory" />
        <QrCodeScan @scanSuccess="handleScanSuccess" />

        <!-- 历史会话抽屉 -->
        <Transition name="drawer-slide" appear>
          <div v-if="showHistory" class="drawer-overlay" @click="showHistory = false">
            <div class="drawer-container" @click.stop style="--tr-history-item-selected-bg: #ebeeff">
              <h4>历史会话</h4>
              <TrHistory
                class="tr-history-demo"
                :selected="conversationState.currentId"
                :data="conversationState.conversations"
                :showRenameControls="true"
                @close="showHistory = false"
                @item-click="handleHistorySelect"
                @item-title-change="handleHistoryUpdateTitle"
                @item-action="handleHistoryDelete"
              ></TrHistory>
            </div>
          </div>
        </Transition>
      </slot>
    </template>
    <tr-bubble-provider :content-renderers="contentRenderer">
      <slot name="welcome" v-if="messages.length === 0">
        <div style="flex: 1">
          <tr-welcome :title="lang[locale].title" :description="lang[locale].description" :icon="welcomeIcon">
          </tr-welcome>
          <tr-prompts :items="promptItems" :wrap="true" class="tiny-prompts" item-class="prompt-item"></tr-prompts>
        </div>
      </slot>
      <tr-bubble-list
        v-else
        style="flex: 1"
        :items="messages"
        :roles="roles"
        auto-scroll
        :loading="messageState.status === STATUS.PROCESSING"
        loading-role="assistant"
      >
      </tr-bubble-list>
    </tr-bubble-provider>

    <template #footer>
      <div class="chat-input">
        <slot name="suggestions">
          <div class="chat-input-pills">
            <tr-dropdown-menu
              v-for="pill in pillItems"
              :key="pill.id"
              :items="pill.menus"
              @item-click="handlePillItemClick"
              trigger="click"
            >
              <template #trigger>
                <TrSuggestionPillButton>{{ pill.text }}</TrSuggestionPillButton>
              </template>
            </tr-dropdown-menu>
          </div>
        </slot>
        <tr-sender
          ref="senderRef"
          mode="multiple"
          v-model="inputMessage"
          :placeholder="senderPlaceholder"
          :clearable="!!inputMessage"
          :loading="senderLoading"
          :showWordLimit="true"
          :maxLength="20000"
          :extensions="senderExtensions"
          @submit="handleSendMessageCustom"
          @cancel="abortRequest"
        >
          <template #footer>
            <div class="action-buttons">
              <!-- 插件开关 Plugin toggle button -->
              <PluginToggleButton :installed-plugins="installedPlugins" @click="pluginVisible = !pluginVisible" />
              <!-- 模型切换组件 Model switch component -->
              <ModelSwitch
                v-if="llmConfigsRef && llmConfigsRef.length > 0"
                :model-configs="llmConfigsRef"
                v-model:selected-model-id="selectedModelId"
              />
              <!-- 生成式UI开关 GenUI toggle button -->
              <GenUISwitch v-if="inBrowserExt" v-model:genui-enabled="genUiAble" />
            </div>
          </template>
        </tr-sender>

        <!-- 插件面板 -->
        <TrMcpServerPicker
          v-model:visible="pluginVisible"
          :popup-config="{ type: 'drawer' }"
          :show-custom-add-button="true"
          marketTabTitle="MCP市场"
          installedTabTitle="已添加MCP服务"
          title="扩展"
          :installedPlugins="installedPlugins"
          :marketPlugins="marketPlugins"
          :market-category-options="marketCategoryOptions"
          :installed-search-fn="handleMcpServerPickerSearchFn"
          :market-search-fn="handleMcpServerPickerSearchFn"
          @plugin-toggle="handlePluginToggle"
          @plugin-add="handlePluginAdd"
          @plugin-delete="handlePluginDelete"
          @tool-toggle="handleToolToggle"
          @plugin-create="handleCustomAdd"
        >
          <template #header-actions>
            <slot name="header-actions" />
          </template>
        </TrMcpServerPicker>
      </div>
    </template>
  </tr-container>
</template>

<script setup lang="ts">
import {
  TrBubbleList,
  TrContainer,
  TrSender,
  TrWelcome,
  TrBubbleProvider,
  TrPrompts,
  TrDropdownMenu,
  TrSuggestionPillButton,
  TrIconButton,
  BubbleMarkdownContentRenderer,
  TrMcpServerPicker,
  TrHistory,
  type PluginInfo,
  type MarketCategoryOption,
  type MentionItem
} from '@opentiny/tiny-robot'

import { SchemaRenderer } from '@opentiny/genui-sdk-vue'
import { GeneratingStatus, STATUS } from '@opentiny/tiny-robot-kit'
import { IconNewSession, IconHistory } from '@opentiny/tiny-robot-svgs'
import { useTinyRobotChat } from '../composable/useTinyRobotChat'
import { useCustomMcpServer } from '../composable/useCustomMcpServer'
import { usePlugin } from '../composable/usePlugin'
import { toRef, computed, ref, onMounted, h, watch, type Ref } from 'vue'
import { createRemoter } from '@opentiny/next-sdk'
import QrCodeScan from './QrCodeScan.vue'
import ModelSwitch from './ModelSwitch.vue'
import PluginToggleButton from './PluginToggleButton.vue'
import { DEFAULT_SERVERS } from './default-mcps'
import { defaultPluginSrc } from './default-plugin-svg'
import { getLang, mapMake } from './lang'
import { handleError } from './error-handle'
import { ICustomAgentModelProviderLlmConfig } from '../types/type'
import type { MenuItemConfig } from '@opentiny/next-sdk'
import useModel from '../composable/useModel'
import GenUISwitch from './GenUISwitch.vue'
import type { UnifiedModelConfig } from '../types/model-config'

defineOptions({
  name: 'TinyRemoter'
})

const props = defineProps({
  /** 必传的会话id */
  sessionId: {
    type: String,
    default: ''
  },
  /** 后端的代理服务器地址 */
  agentRoot: {
    type: String,
    default: 'https://agent.opentiny.design/api/v1/webmcp-trial/'
  },
  /** 系统提示词 */
  systemPrompt: {
    type: String,
    default: '你是一个智能生活助手，擅长通过工具调用帮助用户完成任务'
  },
  /** 左上角的标题 */
  title: {
    type: String,
    default: 'OpenTiny NEXT'
  },
  /** 语言 en-US、zh-CN */
  locale: {
    type: String,
    default: 'zh-CN'
  },
  remoteUrl: {
    type: String
  },
  menuItems: {
    type: Array as () => MenuItemConfig[],
    default: () => []
  },
  qrCodeUrl: {
    type: String
  },
  /** 悬浮AI图标的地址 */
  AILogoUrl: {
    type: String
  },
  /** 展示模式： 'remoter' | 'chat-dialog'
   * 遥控器模式： 自动在右下角显示一个AI图标，点击展开多个菜单项。
   * 对话框模式： 直接显示一个对话框界面
   *  */
  mode: {
    type: String,
    default: 'remoter'
  },
  /** 大语言模型配置对象 */
  llmConfig: {
    type: Object as () => ICustomAgentModelProviderLlmConfig | undefined,
    default: undefined
  },
  /** 设置组件运行在普通页面还是浏览器的扩展中 */
  inBrowserExt: {
    type: Boolean,
    default: false
  },
  /** 生成式UI 需要引入的组件。生成式UI内置了一批组件，如果需要引入新组件，需要通过这里导入。
   * 参考示例： shallowReactive({TinyUser, TinyAlert }) */
  genUiComponents: {
    type: Object,
    default: () => ({})
  },
  /** 自定义 MCP 市场服务列表 */
  customMarketMcpServers: {
    type: Array as () => PluginInfo[],
    default: () => []
  },
  /** LLM 配置数组，每一项基于 llmConfig 格式，额外包含 id、label、icon、isDefault、useReActMode 字段 */
  llmConfigs: {
    type: Array as () => UnifiedModelConfig[],
    default: undefined
  },
  skills: {
    type: Object as () => MentionItem[],
    default: () => []
  },
  /** 布局模式：支持所有 CSS position 属性值 'static' | 'relative' | 'absolute' | 'fixed' | 'sticky' */
  layoutMode: {
    type: String as () => 'static' | 'relative' | 'absolute' | 'fixed' | 'sticky',
    default: 'fixed'
  }
})

const fullscreen = defineModel('fullscreen', { type: Boolean, default: false })
const show = defineModel('show', { type: Boolean, default: false })
const selectedModelId = defineModel('selectedModelId', { type: String, default: undefined, required: false })
// 使用 defineModel 定义 genUiAble，实现双向绑定（简化逻辑，统一使用 v-model:genUiAble）
const genUiAble = defineModel('genUiAble', { type: Boolean, default: false, required: false })
// 使用 defineModel 定义 enabledTools，实现双向绑定（默认启用的工具状态）
const enabledTools = defineModel('enabledTools', {
  type: Object as () => Record<string, boolean> | undefined,
  default: undefined,
  required: false
})

// 获取当前选中的模型配置（如果传入了 llmConfigs，则使用传入的配置）
const llmConfigsRef = props.llmConfigs ? (toRef(props, 'llmConfigs') as Ref<UnifiedModelConfig[]>) : undefined

const { selectedModel } = useModel(llmConfigsRef, selectedModelId)

const {
  showHistory,
  agent,
  customAgentProvider,
  welcomeIcon,
  conversationState,
  messages,
  messageState,
  inputMessage,
  abortRequest,
  roles,
  senderRef,
  sendMessage,
  handleSendMessage,
  handleHistoryUpdateTitle,
  handleHistoryDelete,
  handleHistorySelect,
  handleCreateConversation,
  addMessage,
  send
} = useTinyRobotChat({
  agentRoot: toRef(props, 'agentRoot'),
  systemPrompt: props.systemPrompt || '',
  llmConfig: props.llmConfig,
  skills: props.skills || []
})

customAgentProvider.isGenuiEnabled = genUiAble

// 统一的 LLM 配置更新函数（合并模型切换和生成式UI状态变化的逻辑）
const updateLLMConfigFromModel = () => {
  if (selectedModel.value) {
    const model = selectedModel.value
    customAgentProvider.updateLLMConfig({
      modelId: model.id,
      baseURL: model.baseURL || '',
      apiKey: model.apiKey || '',
      providerType: model.providerType,
      useReActMode: model.useReActMode,
      llm: model.llm
    })
  }
}

// 监听模型切换和生成式UI状态变化，统一更新 LLM 配置
if (props.llmConfigs) {
  // 监听模型切换
  watch(selectedModel, updateLLMConfigFromModel, { immediate: true })
}

if (props.inBrowserExt) {
  // 监听生成式UI状态变化
  watch(genUiAble, updateLLMConfigFromModel)
}

// 自定义消息渲染器 ---- 默认支持markdown 和 生成式UI（生成式UI有很多流处理，不容易解耦出来，所以统一处理）
const contentRenderer = {
  markdown: new BubbleMarkdownContentRenderer({ mdConfig: { html: true } }),
  'schema-card': (schemaCardProps: any) =>
    h(SchemaRenderer, {
      ...schemaCardProps,
      onAction: ({ llmFriendlyMessage, humanFriendlyMessage }: any) => {
        addMessage({
          role: 'user',
          content: llmFriendlyMessage,
          uiContent: [{ type: 'text', content: humanFriendlyMessage }]
        })
        send()
      },
      generating: GeneratingStatus.includes(messageState.status),
      customComponents: props.genUiComponents,
      requiredCompleteFieldSelectors: ['[componentName=TinyUser] > props > modelValue']
    })
}

// 使用插件管理 composable（统一管理插件的增删改查）
const {
  installedPlugins,
  marketPlugins,
  pluginVisible,
  loadMcpServerToPlugin,
  togglePlugin,
  toggleTool,
  deletePlugin,
  addPluginFromMarket,
  addPluginFromScan, // 从扫码添加插件（统一接口）
  searchPlugin
} = usePlugin(agent, enabledTools, defaultPluginSrc)

// 初始化市场插件数据
marketPlugins.value = [...DEFAULT_SERVERS, ...props.customMarketMcpServers]

// 市场分类选项
const marketCategoryOptions = ref<MarketCategoryOption[]>([
  { value: '', label: '全部分类' },
  { value: 'productivity', label: '生产力工具' },
  { value: 'communication', label: '沟通协作' },
  { value: 'development', label: '开发工具' },
  { value: 'ai', label: 'AI 助手' }
])

const { lang, pillItems, promptItems } = getLang(props)

// 处理扫码结果（使用统一的插件添加接口）
const handleScanSuccess = async (sessionId: string) => {
  showLoadingToast('添加工具中...')

  if (sessionId) {
    // 使用统一的扫码添加接口
    const success = await addPluginFromScan(sessionId, props.agentRoot)

    if (success) {
      showToast('添加工具完成')
    } else {
      showToast('重复添加工具或添加失败')
    }
  } else {
    showToast('添加工具失败')
  }
}

const handleSendMessageCustom = async (inputValue: string, templateDataParam?: any[]) => {
  const input = inputMessage.value
  if (/^\/[A-Za-z0-9-]{6,}$/.test(input)) {
    const res = await fetch(`${props.agentRoot}client?sessionId=${input.slice(1)}`).then((res) => res.json())
    const sessionId = res?.data?.sessionId

    if (sessionId) {
      await handleScanSuccess(sessionId)
    } else {
      showToast('添加工具失败,请检查识别码是否正确')
    }

    inputMessage.value = ''
  } else {
    await handleSendMessage(inputValue, templateDataParam)
  }
}

// 自动计算的变量
const senderPlaceholder = computed(() =>
  GeneratingStatus.includes(messageState.status) ? lang[props.locale].thinking : lang[props.locale].placeholder
)

const senderLoading = computed(() => GeneratingStatus.includes(messageState.status))

const handlePillItemClick = (item: ReturnType<typeof mapMake>) => {
  inputMessage.value = item.inputMessage
}

// 如果是遥控器模式，则初始化右下角的AI 图标
let isCreateRemoter = false
watch(
  () => props.sessionId,
  (value) => {
    if (value && props.mode === 'remoter' && !isCreateRemoter) {
      createRemoter({
        sessionId: props.sessionId,
        qrCodeUrl: props.qrCodeUrl,
        remoteUrl: props.remoteUrl,
        menuItems: props.menuItems,
        logoUrl: props.AILogoUrl,
        onShowAIChat: () => (show.value = true)
      })

      isCreateRemoter = true
    }
  },
  { immediate: true }
)

// 后续的每次sessionId变化，都认为是扫码添加了
watch(
  () => props.sessionId,
  (value) => {
    if (value) {
      handleScanSuccess(value)
    }
  }
)

if (props.sessionId) {
  handleScanSuccess(props.sessionId)
}

onMounted(async () => {
  // 统一报错
  agent.onError = (msg: string) => {
    msg && showToast(handleError(msg))
  }

  // 自动连接已标记为 'added' 的自定义市场 MCP 服务器
  // 这样用户可以通过设置 enabled: true 和 addState: 'added' 让服务器默认连接
  const preInstalledPlugins = marketPlugins.value.filter((plugin) => plugin.addState === 'added' && plugin.enabled)

  // 批量添加预安装的插件（使用统一的市场添加接口）
  for (const plugin of preInstalledPlugins) {
    await addPluginFromMarket(plugin)
  }
})

// 插件操作事件处理器（直接使用 usePlugin 返回的方法）
const handlePluginToggle = togglePlugin
const handleToolToggle = toggleTool
const handlePluginDelete = deletePlugin
const handlePluginAdd = addPluginFromMarket
const handleMcpServerPickerSearchFn = searchPlugin

// 使用自定义 MCP 服务器添加 composable
const { handleCustomAdd } = useCustomMcpServer(agent, installedPlugins, defaultPluginSrc)

// 定义插槽
defineSlots<{
  welcome(): any
  suggestions(): any
  operations(): any
  'header-actions'(): any
}>()

// 定义输出：  暴露一些重要方法，方便用户写插槽时，可以使用。
defineExpose({
  /** 大模型代理 */
  agent,
  /** 欢迎图标 */
  welcomeIcon,
  /** 对话消息 */
  messages,
  /** 对话消息状态 */
  messageState,
  /** 对话卡片的角色配置 */
  roles,
  /** 输入框的文本 */
  inputMessage,
  /** 输入框组件的实例 */
  senderRef,
  /** 取消发送 */
  abortRequest,
  /** 发送消息 */
  sendMessage,
  /** 向插件市场添加一个server */
  loadMcpServerToPlugin,
  /** 添加消息 */
  addMessage
})

//  加载skills， 暂时先不watch 变化
const senderExtensions = [TrSender.mention(props.skills)]
</script>

<style scoped lang="less">
/** 避免输入框没有外边距 */
.chat-input {
  margin-top: 8px;
  padding: 10px 15px;
  position: relative;
}

.tr-container {
  container-type: inline-size;

  :deep(.tr-welcome__title-wrapper) {
    display: flex;
    align-items: center;
    justify-content: center;

    .tr-welcome__title {
      font-size: 24px;
      font-weight: 600;
    }
  }

  :deep(.tr-container__header) {
    padding: 16px 32px !important;
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

:deep(.tr-welcome__icon) {
  width: 48px;
  height: 48px;
}

.action-buttons {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sender-left-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 28px;
  padding: 0 6px;
  border-radius: 6px;
  cursor: pointer;
  & svg {
    font-size: 20px;
  }

  &:hover {
    background-color: #f5f5f5;
    svg {
      color: #1476ff;
    }
  }
}

:deep(.tr-icon-button) {
  display: flex;
  align-items: center;
}

:deep(.tr-bubble__content-items) {
  p {
    word-break: break-all;
  }
}

@media (max-width: 600px) {
  :deep(.mcp-server-picker.popup-type-drawer) {
    width: 100% !important;
  }

  /* 移动端抽屉样式优化 */
  .drawer-container {
    width: 85%;
    max-width: none;
  }
}

/* 抽屉动画样式 */
.drawer-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: var(--tr-z-index-popover);
  background-color: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(2px);
}

.drawer-container {
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  width: 76%;
  max-width: 400px;
  background: white;
  box-shadow: 4px 0 20px rgba(0, 0, 0, 0.1);
  transform: translateX(0);

  padding: 0 24px 24px 24px;
}

/* 抽屉滑入滑出动画 */
.drawer-slide-enter-active,
.drawer-slide-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.drawer-slide-enter-active .drawer-container,
.drawer-slide-leave-active .drawer-container {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.drawer-slide-enter-from {
  opacity: 0;
}

.drawer-slide-enter-from .drawer-container {
  transform: translateX(-100%);
}

.drawer-slide-leave-to {
  opacity: 0;
}

.drawer-slide-leave-to .drawer-container {
  transform: translateX(-100%);
}

.tr-history-demo {
  height: 100%;
  width: 100%;
}

/* 助手消息操作按钮样式 */
:deep(.tr-bubble__content-wrapper) {
  p {
    margin: 0;
    line-height: 1.5;
  }

  /* 所有助手消息的按钮组基础样式 */
  .assistant-actions {
    transition:
      opacity 0.2s ease,
      visibility 0.2s ease;
  }

  /* 最新助手消息的按钮组常驻显示 */
  .assistant-actions.latest-assistant {
    opacity: 1;
    visibility: visible;
  }

  /* 历史助手消息的按钮组默认隐藏，悬浮时显示 */
  .assistant-actions.historical-assistant {
    opacity: 0;
    visibility: hidden;
  }

  /* 悬浮时显示历史助手消息的按钮组 */
  &:hover .assistant-actions.historical-assistant {
    opacity: 1;
    visibility: visible;
  }

  /* 确保按钮组在状态切换时不会影响布局 */
  .assistant-actions {
    min-height: 32px; /* 保持一致的高度 */
  }
}
</style>
