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
          @submit="handleSendMessageCustom"
          @cancel="abortRequest"
        >
          <template #header v-if="attachments.length > 0">
            <div class="attachments-container">
              <TrAttachments v-model:items="attachments" />
            </div>
          </template>
          <template #footer>
            <div class="action-buttons">
              <!-- 插件开关 Plugin toggle button -->
              <PluginToggleButton :installed-plugins="installedPlugins" @click="pluginVisible = !pluginVisible" />
              <!-- 模型切换组件 Model switch component, 是否显示依赖于 props.llmConfigs, 所以无需 hasXXx 属性 -->
              <ModelSwitch
                v-if="llmConfigsRef && llmConfigsRef.length > 0"
                :model-configs="llmConfigsRef"
                v-model:selected-model-id="selectedModelId"
              />
              <!-- 生成式UI开关：仅当当前模型配置同时包含 genuiUrl 和 baseURL 时显示 -->
              <GenUISwitch v-if="showGenUISwitch" v-model:genui-enabled="genUiAble" />
              <!-- 文件上传按钮 File upload button (v0.4.x 新API)， hasMultimodalSupport 值依赖于用户选中模型，而非简单的props 传入。-->
              <TrUploadButton
                v-if="hasMultimodalSupport"
                accept="image/*,application/pdf,.doc,.docx,.txt"
                :multiple="true"
                @select="onFilesSelected"
              />
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
          :installed-search-fn="searchPlugin"
          :market-search-fn="searchPlugin"
          @plugin-toggle="togglePlugin"
          @plugin-add="addPluginFromMarket"
          @plugin-delete="deletePlugin"
          @tool-toggle="toggleTool"
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
  TrAttachments,
  TrUploadButton
} from '@opentiny/tiny-robot'

import type { PluginInfo, MarketCategoryOption } from '@opentiny/tiny-robot'

import { GenuiRenderer } from '@opentiny/genui-sdk-vue'
import { GeneratingStatus, STATUS } from '@opentiny/tiny-robot-kit'
import { IconNewSession, IconHistory } from '@opentiny/tiny-robot-svgs'
import { useTinyRobotChat } from '../composable/useTinyRobotChat'
import { useCustomMcpServer } from '../composable/useCustomMcpServer'
import { usePlugin } from '../composable/usePlugin'
import { useRouteBasedTools } from '../composable/useRouteBasedTools'
import { useSkillWithTools } from '../composable/useSkill'
import { useMessageRoles } from '../composable/useMessageRoles'
import { useConversationHistory } from '../composable/useConversationHistory'
import { usePluginSession } from '../composable/usePluginSession'
import { useMultimodalWithModel } from '../multimodal'
import { toRef, computed, ref, onMounted, h, watch, type Ref, type ComponentInstance, VNode } from 'vue'
import QrCodeScan from './QrCodeScan.vue'
import ModelSwitch from './ModelSwitch.vue'
import PluginToggleButton from './PluginToggleButton.vue'
import GenUISwitch from './GenUISwitch.vue'
import BubbleImageRenderer from './BubbleImageRenderer.vue'
import { defaultPluginSrc } from './default-plugin-svg'
import { getLang, mapMake } from './lang'
import { handleError } from './error-handle'
import { ICustomAgentModelProviderLlmConfig } from '../types/type'
import type { MenuItemConfig } from '@opentiny/next-sdk'
import useModel from '../composable/useModel'
import type { UnifiedModelConfig } from '../types/model-config'
import type { McpServerConfig } from '@opentiny/next-sdk'

import { IconUser } from '@opentiny/tiny-robot-svgs'
import IconAssistant from '../../public/svgs/logo-next-no-bg-right.svg'

defineOptions({
  name: 'TinyRemoter'
})

const props = defineProps({
  /** 会话 id，可选；未传时仅显示「打开对话框」，不展示扫码等菜单 */
  sessionId: {
    type: String,
    default: undefined
  },
  /** 后端的代理服务器地址 */
  agentRoot: {
    type: String,
    default: 'https://agent.opentiny.design/api/v1/webmcp-trial/'
  },
  /** 系统提示词 */
  systemPrompt: {
    type: String,
    default: '你是一个智能助手，擅长通过工具调用帮助用户解决问题和满足用户需求'
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
    type: Array as () => MenuItemConfig[]
  },
  qrCodeUrl: {
    type: String
  },
  /** 悬浮AI图标的地址 */
  AILogoUrl: {
    type: String
  },
  /** 角色user,assistant的头像配置, 值为 VNode, 比如： h(IconUser, { style: { fontSize: '32px' } }) */
  roleAvatar: {
    type: Object as () => { user: VNode; assistant: VNode },
    default: () => {
      return {
        user: h(IconUser, { style: { fontSize: '32px' } }),
        assistant: h(IconAssistant, { style: { fontSize: '32px' } })
      }
    }
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
    default: () => ({
      baseURL: 'https://agent.opentiny.design/api/v1/ai/',
      genuiUrl: 'https://agent.opentiny.design/api/v1/ai/prompt'
    })
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
  /** 自定义 MCP 市场服务列表一般是后台的mcp工具常驻存在 */
  customMarketMcpServers: {
    type: Array as () => PluginInfo[],
    default: () => []
  },
  /** MCP 服务器配置：业界格式 { "服务器名称": McpServerConfig }，name 即对象的 key */
  mcpServers: {
    type: Object as () => Record<string, McpServerConfig>,
    default: undefined
  },
  /** LLM 配置数组，每一项基于 llmConfig 格式，额外包含 id、label、icon、isDefault、useReActMode 字段 */
  llmConfigs: {
    type: Array as () => UnifiedModelConfig[],
    default: undefined
  },
  /**
   * 用户层传入的 skill .md 模块（Record<path, content>，如 Vite import.meta.glob 得到的结果），
   * 由 remoter 调用 next-sdk 的 skill 能力处理：生成 systemPrompt 技能说明、内置 get_skill_content 工具，大模型可自动识别并加载技能
   */
  skills: {
    type: Object as () => Record<string, string | (() => Promise<string>)>,
    default: undefined
  },
  /** 布局模式：支持所有 CSS position 属性值 'static' | 'relative' | 'absolute' | 'fixed' | 'sticky' */
  layoutMode: {
    type: String as () => 'static' | 'relative' | 'absolute' | 'fixed' | 'sticky',
    default: 'fixed'
  },
  debugStream: {
    type: Boolean,
    default: false
  },
  /** 自定义欢迎区建议卡片（与 tr-prompts 的 items 格式一致）。不传则使用内置默认文案 */
  promptItems: {
    type: Array,
    default: undefined
  },
  /** 自定义输入框上方快捷操作按钮（与 pill 下拉菜单格式一致）。不传则使用内置默认文案 */
  pillItems: {
    type: Array,
    default: undefined
  }
})

// 定义事件
const emit = defineEmits<{
  /** 在 AI 消息渲染之前触发，用户此时可以修改消息内容
   *  uiContent包含当前流返回的消息类型：markdown, reasoning,tool,或其它自定义的消息。
   *
   * @param currMessage - 当前消息对象，包含 role , content, uiContent 字段。
   */
  (e: 'before-ai-render', currMessage: { role: string; content: string; uiContent: any[] }): void
  (e: 'chat-stream-finish'): void
}>()

const fullscreen = defineModel('fullscreen', { type: Boolean, default: false })
const show = defineModel('show', { type: Boolean, default: false })

const selectedModelId = defineModel('selectedModelId', { type: String, default: undefined, required: false })
const genUiAble = defineModel('genUiAble', { type: Boolean, default: false, required: false })
const enabledTools = defineModel('enabledTools', {
  type: Object as () => Record<string, boolean> | undefined,
  default: undefined,
  required: false
})

// 获取当前选中的模型配置（如果传入了 llmConfigs，则使用传入的配置）
const llmConfigsRef = props.llmConfigs ? (toRef(props, 'llmConfigs') as Ref<UnifiedModelConfig[]>) : undefined

const { selectedModel } = useModel(llmConfigsRef, selectedModelId)

// 是否显示生成式 UI 开关：仅当当前模型配置中同时包含 genuiUrl 和 baseURL 时显示（不再依赖 inBrowserExt）
const showGenUISwitch = computed(() => {
  const config = llmConfigsRef?.value?.length
    ? selectedModel.value
    : (props.llmConfig as UnifiedModelConfig | undefined)
  if (!config) return false
  return !!(config.baseURL && config.genuiUrl)
})

// 初始化多模态功能（统一入口）
const {
  hasMultimodalSupport,
  attachments,
  onFilesSelected,
  checkCanSendAttachments,
  processAttachments,
  cleanupAttachments
} = useMultimodalWithModel({
  selectedModel,
  selectedModelId
})

// ===== 1. 使用 useTinyRobotChat composable（核心聊天逻辑）=====
const {
  agent,
  customAgentProvider,
  conversationState,
  messages,
  messageState,
  inputMessage,
  abortRequest,
  senderRef,
  sendMessage,
  handleSendMessage: handleSendMessageBase, // 重命名为 Base，稍后包装
  addMessage,
  send,
  // 基础会话方法（供其他 composable 使用）
  createConversation,
  switchConversation,
  deleteConversation,
  getCurrentConversation
} = useTinyRobotChat({
  systemPrompt: props.systemPrompt || '',
  llmConfig: props.llmConfig,
  emit: emit as (e: string, ...args: any[]) => void
})
watch(
  () => props.systemPrompt,
  (prompt) => {
    customAgentProvider.promptManager.setStatic(prompt)
  }
)

customAgentProvider.isGenuiEnabled = genUiAble
customAgentProvider.debugStream = props.debugStream

// ===== 2. 使用 useSkillWithTools composable（仅 skills + next-sdk，无 @ 提及）=====
const skillsRef = toRef(props, 'skills')
const { processSkillMentions } = useSkillWithTools({
  skillsRef,
  customAgentProvider
})

// ===== 3. 组合聊天逻辑和 skills 逻辑：创建包装的 handleSendMessage 函数 =====
const handleSendMessage = async (inputValue: string, attachmentsContent?: any[]): Promise<boolean> => {
  // 将 processSkillMentions 作为 skillProcessor 传递给基础的 handleSendMessage
  return handleSendMessageBase(inputValue, attachmentsContent, processSkillMentions)
}

// ===== 4. 使用 useMessageRoles composable（消息气泡 UI 配置）=====
const { welcomeIcon, roles } = useMessageRoles({
  props,
  messages,
  messageState,
  inputMessage,
  handleSendMessage
})

// ===== 5. 使用 useConversationHistory composable（会话历史管理）=====
const { showHistory, handleCreateConversation, handleHistorySelect, handleHistoryUpdateTitle, handleHistoryDelete } =
  useConversationHistory({
    createConversation,
    switchConversation,
    deleteConversation,
    getCurrentConversation,
    abortRequest,
    conversationState,
    customAgentProvider
  })

// 统一的 LLM 配置更新函数（合并模型切换和生成式UI状态变化的逻辑）
const updateLLMConfigFromModel = () => {
  if (selectedModel.value) {
    const model = selectedModel.value
    customAgentProvider.updateLLMConfig({
      model: model.model || '',
      baseURL: model.baseURL || '',
      genuiUrl: model.genuiUrl || '',
      apiKey: model.apiKey || '',
      providerType: model.providerType,
      useReActMode: model.useReActMode,
      llm: model.llm,
      // 传递 providerOptions，确保 model-config 中的自定义请求体（如 user/userId）能生效
      providerOptions: model.providerOptions,
      // 传递 headers，确保 model-config 中的自定义请求 Header 能生效
      headers: model.headers
    })
  } else {
    customAgentProvider.updateLLMConfig(customAgentProvider.llmConfig)
  }
}

// 监听模型切换和生成式UI状态变化，统一更新 LLM 配置
if (props.llmConfigs) {
  // 监听模型切换
  watch(selectedModel, updateLLMConfigFromModel, { immediate: true })
}

// 监听生成式 UI 开关变化并同步到 LLM 配置（updateLLMConfigFromModel 内部会判断 selectedModel，无选中模型时不会执行）
watch(genUiAble, updateLLMConfigFromModel, { immediate: true })

// 自定义消息渲染器 ---- 默认支持markdown 和 生成式UI（生成式UI有很多流处理，不容易解耦出来，所以统一处理）
const contentRenderer = {
  markdown: new BubbleMarkdownContentRenderer({ mdConfig: { html: true } }),
  'schema-card': (schemaCardProps: any) =>
    h(GenuiRenderer, {
      ...schemaCardProps,
      customActions: {
        continueChat: {
          execute: (params: any, context: any) => {
            const humanFriendlyMessage = typeof params === 'string' ? params : params.message
            const llmFriendlyMessage = `${humanFriendlyMessage},相关参数为：${JSON.stringify(context?.state || {})}`
            addMessage({
              role: 'user',
              content: llmFriendlyMessage,
              uiContent: [{ type: 'markdown', content: humanFriendlyMessage }]
            })
            send()
          }
        }
      },
      generating: GeneratingStatus.includes(messageState.status),
      customComponents: props.genUiComponents,
      requiredCompleteFieldSelectors: ['[componentName=TinyUser] > props > modelValue']
    }),
  // 图片渲染器：使用独立的 BubbleImageRenderer 组件
  image: BubbleImageRenderer
}

function registerContentRenderer(key: string, renderer: (content: any) => VNode) {
  contentRenderer[key] = renderer
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
  addPluginCore,
  addPluginFromMarket,
  addPluginFromScan, // 从扫码添加插件（统一接口）
  handleClientDisconnected, // 处理客户端断开连接
  searchPlugin,
  syncInstalledPluginTools
} = usePlugin(agent, enabledTools, defaultPluginSrc)

// ===== 页面工具目录变化监听（用于同步刷新 remoter 工具面板）=====
useRouteBasedTools({
  onToolCatalogChanged: async () => {
    await agent.refreshTools()
    syncInstalledPluginTools()
  }
})

// 初始化市场插件数据
marketPlugins.value = [...props.customMarketMcpServers]

// 市场分类选项
const marketCategoryOptions = ref<MarketCategoryOption[]>([
  { value: '', label: '全部分类' },
  { value: 'productivity', label: '生产力工具' },
  { value: 'communication', label: '沟通协作' },
  { value: 'development', label: '开发工具' },
  { value: 'ai', label: 'AI 助手' }
])

const langResult = getLang(props)
// 优先使用父组件传入的电商/业务定制文案，未传则使用内置默认
const pillItems = computed(() => props.pillItems ?? langResult.pillItems)
const promptItems = computed(() => props.promptItems ?? langResult.promptItems)
const lang = langResult.lang

// ===== 6. 使用 usePluginSession composable（sessionId 相关逻辑）=====
const {
  handleScanSuccess,
  handleSessionIdInput,
  initialize: initializePluginSession
} = usePluginSession({
  sessionId: toRef(props, 'sessionId'),
  agentRoot: toRef(props, 'agentRoot'),
  mode: props.mode,
  qrCodeUrl: props.qrCodeUrl,
  remoteUrl: props.remoteUrl,
  menuItems: toRef(props, 'menuItems'),
  AILogoUrl: props.AILogoUrl,
  show,
  addPluginFromScan,
  inputMessage
})

const handleSendMessageCustom = async (inputValue: string) => {
  // 尝试处理识别码输入（如 /abc123）
  const isSessionIdInput = await handleSessionIdInput(inputMessage.value)

  // 如果是识别码，已经处理完毕，直接返回
  if (isSessionIdInput) {
    return
  }

  // 不是识别码，按正常消息处理
  // 检查是否可以发送附件
  if (!checkCanSendAttachments()) {
    return
  }

  // 处理附件
  const multimodalContent = await processAttachments()

  // 发送消息
  try {
    await handleSendMessage(inputValue, multimodalContent)
    // 发送成功后清理附件
    cleanupAttachments()
  } catch (error) {
    console.error('发送消息失败:', error)
    // 发送失败，保留附件，让用户可以重试
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

// 初始化 sessionId 相关逻辑（遥控器模式、扫码添加等）
initializePluginSession()

onMounted(async () => {
  // 初始化会话（每次刷新都是新会话）
  setTimeout(() => {
    handleCreateConversation()
  }, 100)

  // 统一报错
  agent.onError = (msg: string) => {
    msg && showToast(handleError(msg))
  }

  // 自动连接已标记为 'added' 的自定义市场 MCP 服务器
  const preInstalledPlugins = marketPlugins.value.filter((plugin) => plugin.addState === 'added' && plugin.enabled)

  // 批量添加预安装的插件
  for (const plugin of preInstalledPlugins) {
    await addPluginFromMarket(plugin)
  }

  if (props.mcpServers) {
    for (const [name, config] of Object.entries(props.mcpServers)) {
      await loadMcpServerToPlugin(name, config)
    }
  }
})

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
  senderRef: senderRef as Ref<ComponentInstance<typeof TrSender>>,
  /** 取消发送 */
  abortRequest,
  /** 发送消息 */
  sendMessage,
  /** 向插件市场添加一个server */
  loadMcpServerToPlugin,
  /** 处理客户端断开连接 */
  handleClientDisconnected,
  /** 添加消息 */
  addMessage,
  /** 已安装的插件 */
  installedPlugins,
  /** 添加插件核心方法 */
  addPluginCore,
  /** 删除插件核心方法 */
  deletePlugin,
  /** 注册内容渲染器 */
  registerContentRenderer,
  /**
   * 刷新已安装插件的工具列表（从 agent.mcpTools 同步到 UI）
   * 适用于 builtin client 工具变化后的快速刷新，避免 remove + reload 导致的 UI 闪烁
   */
  async refreshPluginTools() {
    await agent.refreshTools()
    syncInstalledPluginTools()
  }
})
</script>

<style scoped lang="less">
/** 避免输入框没有外边距 */
.chat-input {
  margin-top: 8px;
  padding: 10px 15px;
  position: relative;
}

/* 附件容器样式 */
.attachments-container {
  padding: 8px 0;
  margin-bottom: 8px;
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
  display: flex;
  flex-direction: column;
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
  flex: 1;
  min-height: 0;
  overflow-y: auto;
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
    min-height: 32px;
  }
}
</style>
