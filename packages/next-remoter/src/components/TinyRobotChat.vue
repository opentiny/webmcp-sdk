<template>
  <div
    v-show="show"
    class="next-remoter-container"
    :class="{
      'is-fullscreen': fullscreen,
      [`layout-${layoutMode}`]: true
    }"
  >
    <!-- 直接基于 TrChat 组件组装，作为聊天主容器 -->
    <TrChat
      ref="chatSuiteRef"
      :runtime="chatRuntime"
      :ui="chatUI"
      :title="title"
      class="next-remoter-chat"
    >
      <!-- 顶部操作栏定制：注入左侧会话切换、标题、右上角扫码、全屏与关闭按钮 -->
      <template #layout-header="{ title: headerTitle, toggleLeftAside, createConversation }">
        <div class="next-remoter-header">
          <div class="header-left">
            <button
              type="button"
              class="header-btn"
              @click="toggleLeftAside"
              title="历史会话"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <path d="M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.954 8.954 0 0 0 13 21a9 9 0 0 0 0-18zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/>
              </svg>
            </button>
            <button
              type="button"
              class="header-btn"
              @click="createConversation()"
              title="新建会话"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
              </svg>
            </button>
            <h3 class="header-title">{{ headerTitle || title }}</h3>
          </div>
          <div class="header-right">
            <slot name="operations">
              <QrCodeScan @scanSuccess="handleScanSuccess" />
            </slot>
            <!-- 全屏切换按钮 -->
            <button
              type="button"
              class="header-btn"
              @click="fullscreen = !fullscreen"
              :title="fullscreen ? '还原' : '全屏'"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path v-if="fullscreen" d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-14v3h3v2h-5V5h2z"/>
                <path v-else d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
              </svg>
            </button>
            <!-- 关闭按钮 -->
            <button
              type="button"
              class="header-btn header-btn-close"
              @click="show = false"
              title="关闭"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>
          </div>
        </div>
      </template>

      <!-- 欢迎区域插槽透传 -->
      <template #welcome-footer v-if="$slots.welcome && messages.length === 0">
        <slot name="welcome" />
      </template>

      <!-- 输入框前置区域：包含附件卡片与快捷操作胶囊 -->
      <template #composer-before>
        <div v-if="attachments.length > 0" class="attachments-container">
          <TrAttachments v-model:items="attachments" />
        </div>
        <slot name="suggestions">
          <div v-if="pillItems && pillItems.length > 0" class="chat-input-pills">
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
      </template>

      <!-- 输入框底部扩展按钮：模型与 WebMCP 由 TrChat 内置接管，仅保留 GenUI 开关与文件上传 -->
      <template #sender-footer>
        <div class="action-buttons">
          <!-- 生成式UI开关：仅当当前模型配置同时包含 genuiUrl 和 baseURL 时显示 -->
          <GenUISwitch v-if="showGenUISwitch" v-model:genui-enabled="genUiAble" />
          <!-- 文件上传按钮 File upload button -->
          <TrUploadButton
            v-if="hasMultimodalSupport"
            accept="image/*,application/pdf,.doc,.docx,.txt"
            :multiple="true"
            @select="onFilesSelected"
          />
        </div>
      </template>

      <!-- 输入框右下角：语音按钮 -->
      <template #sender-footer-right>
        <VoiceButton v-if="allowSpeech" />
      </template>
    </TrChat>
  </div>
</template>

<script setup lang="ts">
import {
  TrSender,
  TrDropdownMenu,
  TrSuggestionPillButton,
  TrAttachments,
  TrUploadButton,
  VoiceButton
} from '@opentiny/tiny-robot'

import { TrChat, type ChatUIOptions } from '@opentiny/tiny-robot-chat'
import type { PluginInfo } from '@opentiny/tiny-robot'
import { GenuiRenderer } from '@opentiny/genui-sdk-vue'
import { useTinyRobotChat, type UIMessage } from '../composable/useTinyRobotChat'
import { useCustomMcpServer } from '../composable/useCustomMcpServer'
import { usePlugin } from '../composable/usePlugin'
import { useRouteBasedTools } from '../composable/useRouteBasedTools'
import { useSkillWithTools } from '../composable/useSkill'
import { useMessageRoles } from '../composable/useMessageRoles'
import { useConversationHistory } from '../composable/useConversationHistory'
import { usePluginSession } from '../composable/usePluginSession'
import { useMultimodalWithModel } from '../multimodal'
import { toRef, computed, ref, onMounted, h, watch, defineComponent, type Ref, type ComponentInstance, type VNode } from 'vue'
import QrCodeScan from './QrCodeScan.vue'
import GenUISwitch from './GenUISwitch.vue'
import BubbleImageRenderer from './BubbleImageRenderer.vue'
import { defaultPluginSrc } from './default-plugin-svg'
import { getLang } from './lang'
import { handleError } from './error-handle'
import type { ICustomAgentModelProviderLlmConfig } from '../types/type'
import type { MenuItemConfig } from '@opentiny/next-sdk'
import useModel from '../composable/useModel'
import type { UnifiedModelConfig } from '../types/model-config'
import type { McpServerConfig } from '@opentiny/next-sdk'
import { GeneratingStatus } from '../const'

import { IconUser } from '@opentiny/tiny-robot-svgs'
import IconAssistant from '../../public/svgs/logo-next-no-bg-right.svg'

defineOptions({
  name: 'TinyRemoter'
})

const props = defineProps({
  /** 后端的代理服务器地址 */
  agentRoot: {
    type: String,
    default: 'https://agent.opentiny.design/api/v1/webmcp-trial/'
  },
  /** 会话 id，可选；未传时仅显示「打开对话框」，不展示扫码等菜单 */
  sessionId: {
    type: String,
    default: undefined
  },
  menuItems: {
    type: Array as () => MenuItemConfig[]
  },
  remoteUrl: {
    type: String
  },
  qrCodeUrl: {
    type: String
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
  /** 悬浮AI图标的地址 */
  AILogoUrl: {
    type: String
  },
  /** 角色user,assistant的头像配置 */
  roleAvatar: {
    type: Object as () => { user: VNode; assistant: VNode },
    default: () => {
      return {
        user: h(IconUser, { style: { fontSize: '32px' } }),
        assistant: h(IconAssistant, { style: { fontSize: '32px' } })
      }
    }
  },
  /** 展示模式： 'remoter' | 'chat-dialog' */
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
  /** 生成式UI 需要引入的组件 */
  genUiComponents: {
    type: Object,
    default: () => ({})
  },
  /** 自定义 MCP 市场服务列表 */
  customMarketMcpServers: {
    type: Array as () => PluginInfo[],
    default: () => []
  },
  /** MCP 服务器配置：业界格式 { "服务器名称": McpServerConfig } */
  mcpServers: {
    type: Object as () => Record<string, McpServerConfig>,
    default: undefined
  },
  /** LLM 配置数组 */
  llmConfigs: {
    type: Array as () => UnifiedModelConfig[],
    default: undefined
  },
  /** 用户层传入的 skill .md 模块 */
  skills: {
    type: Object as () => Record<string, string | (() => Promise<string>)>,
    default: undefined
  },
  /** 布局模式 */
  layoutMode: {
    type: String as () => 'static' | 'relative' | 'absolute' | 'fixed' | 'sticky',
    default: 'fixed'
  },
  debugStream: {
    type: Boolean,
    default: false
  },
  /** 自定义欢迎区建议卡片 */
  promptItems: {
    type: Array,
    default: undefined
  },
  /** 自定义输入框上方快捷操作按钮 */
  pillItems: {
    type: Array,
    default: undefined
  },
  /** 支持语音输入功能 */
  allowSpeech: {
    type: Boolean,
    default: false
  }
})

// 定义事件
const emit = defineEmits<{
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

// 获取当前选中的模型配置
const llmConfigsRef = props.llmConfigs ? (toRef(props, 'llmConfigs') as Ref<UnifiedModelConfig[]>) : undefined
const { selectedModel } = useModel(llmConfigsRef, selectedModelId)

// 是否显示生成式 UI 开关
const showGenUISwitch = computed(() => {
  const config = llmConfigsRef?.value?.length
    ? selectedModel.value
    : (props.llmConfig as UnifiedModelConfig | undefined)
  if (!config) return false
  return !!(config.baseURL && config.genuiUrl)
})

// 初始化多模态功能
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

// ===== 1. 使用 useTinyRobotChat composable =====
const {
  agent,
  customAgentProvider,
  chatRuntime,
  conversationState,
  messages,
  messageState,
  inputMessage,
  abortRequest,
  senderRef,
  sendMessage,
  handleSendMessage: handleSendMessageBase,
  addMessage,
  send,
  createConversation,
  switchConversation,
  deleteConversation,
  getCurrentConversation
} = useTinyRobotChat({
  systemPrompt: props.systemPrompt || '',
  llmConfig: props.llmConfig,
  emit: emit as (e: string, ...args: any[]) => void,
  modelOptions: {
    llmConfigs: llmConfigsRef,
    selectedModelId
  }
})

watch(
  () => props.systemPrompt,
  (prompt) => {
    customAgentProvider.promptManager.setStatic(prompt)
  }
)

customAgentProvider.isGenuiEnabled = genUiAble
customAgentProvider.debugStream = props.debugStream

// ===== 2. 使用 useSkillWithTools composable (WebSkills 支持) =====
const skillsRef = toRef(props, 'skills') as Ref<Record<string, string> | undefined>
const { processSkillMentions } = useSkillWithTools({
  skillsRef,
  customAgentProvider
})

// ===== 3. 组合聊天逻辑和 skills 逻辑 =====
const handleSendMessage = async (inputValue: string, attachmentsContent?: any[]): Promise<boolean> => {
  return handleSendMessageBase(inputValue, attachmentsContent, processSkillMentions)
}

// ===== 4. 消息角色与头像配置 =====
const { welcomeIcon, roles } = useMessageRoles({
  props,
  messages,
  messageState,
  inputMessage,
  handleSendMessage
})

// ===== 5. 会话历史管理 =====
const { handleCreateConversation } = useConversationHistory({
  createConversation,
  switchConversation,
  deleteConversation,
  getCurrentConversation,
  abortRequest,
  conversationState,
  customAgentProvider
})

// 统一的 LLM 配置更新函数
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
      providerOptions: model.providerOptions,
      headers: model.headers
    })
  } else {
    customAgentProvider.updateLLMConfig(customAgentProvider.llmConfig)
  }
}

if (props.llmConfigs) {
  watch(selectedModel, updateLLMConfigFromModel, { immediate: true })
}
watch(genUiAble, updateLLMConfigFromModel, { immediate: true })

// 自定义消息渲染器 (支持 markdown、生成式UI与图片)
const contentRenderer: Record<string, any> = {
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
  image: BubbleImageRenderer
}

function registerContentRenderer(key: string, renderer: (content: any) => VNode) {
  contentRenderer[key] = renderer
}

// ===== 6. 使用 usePlugin composable (WebMCP 工具管理) =====
const {
  installedPlugins,
  marketPlugins,
  loadMcpServerToPlugin,
  toggleTool,
  deletePlugin,
  addPluginCore,
  addPluginFromMarket,
  addPluginFromScan,
  handleClientDisconnected,
  syncInstalledPluginTools
} = usePlugin(agent, enabledTools, defaultPluginSrc)

// 将 WebMCP 运行时动态赋给 chatRuntime.composer
const mcpRuntime = computed(() => ({
  servers: computed(() =>
    installedPlugins.value.map((p) => ({
      id: p.name,
      name: p.name,
      description: p.description,
      installed: true,
      enabled: p.enabled ?? true
    }))
  ),
  tools: computed(() => {
    const result: Record<string, any[]> = {}
    for (const p of installedPlugins.value) {
      result[p.name] = (p.tools || []).map((t) => ({
        id: t.name,
        name: t.name,
        description: t.description,
        enabled: enabledTools?.value ? (enabledTools.value[t.name] ?? (t.enabled ?? true)) : (t.enabled ?? true)
      }))
    }
    return result
  }),
  addServer: async () => {},
  removeServer: async () => {},
  setServerEnabled: async (id: string, enabled: boolean) => {
    const p = installedPlugins.value.find((item) => item.name === id)
    if (p) p.enabled = enabled
  },
  setToolEnabled: async (serverId: string, toolId: string, enabled: boolean) => {
    if (enabledTools?.value) {
      enabledTools.value[toolId] = enabled
    }
    const plugin = installedPlugins.value.find((item) => item.name === serverId)
    if (plugin) {
      toggleTool(plugin, toolId, enabled)
    }
  }
}))

;(chatRuntime.value.composer as any).mcp = mcpRuntime.value

// 页面工具目录变化监听（WebMCP 路由联动刷新）
useRouteBasedTools({
  onToolCatalogChanged: async () => {
    await agent.refreshTools()
    syncInstalledPluginTools()
  }
})

// 初始化市场插件数据
marketPlugins.value = [...props.customMarketMcpServers]

const langResult = getLang(props)
const pillItems = computed<any[]>(() => (props.pillItems as any[]) ?? (langResult.pillItems as any[]))
const promptItems = computed<any[]>(() => (props.promptItems as any[]) ?? (langResult.promptItems as any[]))
const lang = langResult.lang

// ===== 7. 扫码与遥控会话管理 =====
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
  const isSessionIdInput = await handleSessionIdInput(inputMessage.value)
  if (isSessionIdInput) {
    return
  }

  if (!checkCanSendAttachments()) {
    return
  }

  const multimodalContent = await processAttachments()

  try {
    await handleSendMessage(inputValue, multimodalContent)
    cleanupAttachments()
  } catch (error) {
    console.error('发送消息失败:', error)
  }
}

// 绑定完整的发送消息逻辑（含识别码与附件多模态）
chatRuntime.value.actions.send = async (payload: { text: string }) => {
  await handleSendMessageCustom(payload.text)
  return true
}

// 占位符与加载状态
const senderPlaceholder = computed(() =>
  GeneratingStatus.includes(messageState.status) ? lang[props.locale].thinking : lang[props.locale].placeholder
)

const handlePillItemClick = (item: any) => {
  inputMessage.value = item.inputMessage
}

const GenuiContentRenderer = defineComponent({
  props: {
    message: { type: Object as () => any, required: true },
    contentIndex: { type: Number, default: 0 }
  },
  setup(compProps) {
    return () => {
      const content = compProps.message?.content
      return h(GenuiRenderer as any, {
        content,
        generating: GeneratingStatus.includes(messageState.status),
        customComponents: props.genUiComponents,
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
        }
      })
    }
  }
})

// 组装 TrChat 的 UI 配置
const chatUI = computed<ChatUIOptions>(() => ({
  brand: {
    name: props.title,
    logo: props.AILogoUrl
  },
  welcome: {
    title: lang[props.locale]?.title,
    description: lang[props.locale]?.description,
    icon: welcomeIcon
  },
  prompts: {
    items: promptItems.value
  },
  bubble: {
    autoScroll: true,
    bubbleList: {
      roles: roles as any,
      roleConfigs: {
        system: { hidden: true }
      }
    },
    bubbleProvider: {
      contentRendererMatches: [
        {
          find: (_msg: any, content: any) => content?.type === 'schema-card',
          renderer: GenuiContentRenderer as any
        },
        {
          find: (_msg: any, content: any) => content?.type === 'image',
          renderer: BubbleImageRenderer as any
        }
      ]
    }
  },
  sender: {
    maxLength: 20000,
    placeholder: senderPlaceholder.value
  }
}))

const chatSuiteRef = ref<ComponentInstance<typeof TrChat>>()

// 初始化 sessionId 相关逻辑
initializePluginSession()

onMounted(async () => {
  setTimeout(() => {
    handleCreateConversation()
  }, 100)

  agent.onError = (msg: string) => {
    msg && showToast(handleError(msg))
  }

  const preInstalledPlugins = marketPlugins.value.filter((plugin) => plugin.addState === 'added' && plugin.enabled)
  for (const plugin of preInstalledPlugins) {
    await addPluginFromMarket(plugin)
  }

  if (props.mcpServers) {
    for (const [name, config] of Object.entries(props.mcpServers)) {
      await loadMcpServerToPlugin(name, config)
    }
  }
})

// 自定义 MCP 服务器添加
useCustomMcpServer(agent, installedPlugins, defaultPluginSrc)

// 定义插槽
defineSlots<{
  welcome(): any
  suggestions(): any
  operations(): any
  'header-actions'(): any
}>()

// 定义输出：暴露全部 17 个方法和属性，确保向后兼容
defineExpose({
  agent,
  welcomeIcon,
  messages: messages as Ref<UIMessage[]>,
  messageState: messageState as unknown as any,
  roles,
  inputMessage,
  senderRef: senderRef as Ref<ComponentInstance<typeof TrSender>>,
  chatSuiteRef: chatSuiteRef as Ref<any>,
  abortRequest,
  sendMessage,
  loadMcpServerToPlugin,
  handleClientDisconnected,
  addMessage,
  installedPlugins,
  addPluginCore,
  deletePlugin,
  registerContentRenderer,
  async refreshPluginTools() {
    await agent.refreshTools()
    syncInstalledPluginTools()
  }
})
</script>

<style scoped lang="less">
.next-remoter-container {
  display: flex;
  flex-direction: column;
  background: #ffffff;
  overflow: hidden;
  box-sizing: border-box;
  z-index: var(--tr-z-index-dialog, 1000);
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);

  &.layout-fixed {
    position: fixed;
    bottom: 24px;
    right: 24px;
    width: 440px;
    height: 680px;
    max-height: calc(100vh - 48px);
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  }

  &.layout-relative {
    position: relative;
    width: 100%;
    height: 100%;
  }

  &.layout-absolute {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
  }

  &.layout-static {
    position: static;
    width: 100%;
    height: 100%;
  }

  &.is-fullscreen {
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    right: 0 !important;
    bottom: 0 !important;
    width: 100vw !important;
    height: 100vh !important;
    max-height: none !important;
    border-radius: 0 !important;
    z-index: var(--tr-z-index-dialog, 1000) !important;
  }
}

.next-remoter-chat {
  flex: 1;
  min-height: 0;
  height: 100%;
  width: 100%;

  :deep(.tr-chat-ui) {
    height: 100%;
    min-height: 0;
  }
}

.next-remoter-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  height: 48px;
  padding: 0 16px;
  border-bottom: 1px solid #f0f0f0;
  background: #ffffff;
  box-sizing: border-box;

  .header-left {
    display: flex;
    align-items: center;
    gap: 8px;

    .header-title {
      font-size: 16px;
      font-weight: 600;
      color: #191919;
      margin: 0;
    }
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .header-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 6px;
    border: none;
    background: transparent;
    cursor: pointer;
    color: #595959;
    transition: all 0.2s;

    &:hover {
      background: #f5f5f5;
      color: #1476ff;
    }

    &.header-btn-close:hover {
      background: #fee2e2;
      color: #ef4444;
    }
  }
}

.attachments-container {
  padding: 8px 0;
  margin-bottom: 8px;
}

.chat-input-pills {
  margin-bottom: 8px;
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.action-buttons {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
