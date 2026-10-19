<template>
  <div
    class="tiny-remoter"
    :style="{
      position: layoutMode,
      display: mode === 'remoter' && !show ? 'none' : undefined,
      width: layoutMode !== 'fixed' ? '100%' : undefined,
      height: layoutMode !== 'fixed' ? '100%' : undefined
    }"
  >
    <!-- 默认扫码入口（浮动在 Header 右侧区域，不破坏原生的标题栏） -->
    <div v-if="!$slots.operations" class="remoter-header-scan">
      <QrCodeScan @scanSuccess="handleScanSuccess" />
    </div>

    <TrChat
      :runtime="runtime"
      :ui="chatUIOptions"
      @prompt-click="handlePromptClick"
    >
      <!-- 仅在外部显式提供 operations 插槽时自定义顶部操作区 -->
      <template v-if="$slots.operations" #layout-header="slotProps">
        <slot name="operations" v-bind="slotProps">
          <QrCodeScan @scanSuccess="handleScanSuccess" />
        </slot>
      </template>

      <!-- 仅在外部显式提供 welcome 插槽时才覆盖默认欢迎区（避免吞掉默认欢迎页和输入框） -->
      <template v-if="$slots.welcome" #layout-empty-state="slotProps">
        <slot name="welcome" v-bind="slotProps" />
      </template>

      <!-- 输入框上方建议与快捷操作区：优先外部 suggestions 插槽，其次渲染 pillItems 药丸按钮 -->
      <template v-if="$slots.suggestions || (pillItems && pillItems.length)" #composer-before="slotProps">
        <slot name="suggestions" v-bind="slotProps">
          <div v-if="pillItems?.length" class="chat-input-pills">
            <template v-for="pill in pillItems" :key="pill.id || pill.text">
              <span v-if="!pill.menus?.length" class="pill-item" @click="handlePillClick(pill)">
                {{ pill.text }}
              </span>
              <span v-else class="pill-group">
                <span
                  v-for="menu in pill.menus"
                  :key="menu.id || menu.text"
                  class="pill-item"
                  @click="handlePillMenuClick(menu)"
                >
                  {{ menu.text }}
                </span>
              </span>
            </template>
          </div>
        </slot>
      </template>

      <!-- 扩展管理动作区 -->
      <template v-if="$slots['header-actions']" #extension-header-actions="slotProps">
        <slot name="header-actions" v-bind="slotProps" />
      </template>

      <!-- 透传其它未显式映射的插槽 -->
      <template v-for="(_, slotName) in forwardSlots" #[slotName]="slotProps">
        <slot :name="slotName" v-bind="slotProps" />
      </template>
    </TrChat>
  </div>
</template>

<script setup lang="ts">
import { computed, h, onMounted, ref, useSlots, type VNode } from 'vue'
import { TrChat, type ChatUIOptions } from '@opentiny/tiny-robot-chat'
import { GenuiRenderer } from '@opentiny/genui-sdk-vue'
import { iconUser } from '@opentiny/vue-icon'
import type { PluginInfo } from '@opentiny/tiny-robot'
import type { MenuItemConfig, McpServerConfig } from '@opentiny/next-sdk'
import IconAssistant from '../../public/svgs/logo-next-no-bg-right.svg'
import QrCodeScan from './QrCodeScan.vue'
import BubbleImageRenderer from './BubbleImageRenderer.vue'
import { useRemoterRuntime } from '../composable/useRemoterRuntime'
import type { UnifiedModelConfig } from '../types/model-config'
import type { ICustomAgentModelProviderLlmConfig } from '../types/type'

defineOptions({
  name: 'TinyRemoter'
})

const props = defineProps({
  /** 后端的代理服务器地址 */
  agentRoot: {
    type: String,
    default: 'https://agent.opentiny.design/api/v1/webmcp-trial/'
  },
  /** 会话 id */
  sessionId: {
    type: String,
    default: undefined
  },
  /** 菜单项配置列表 */
  menuItems: {
    type: Array as () => MenuItemConfig[],
    default: () => []
  },
  /** 二维码 URL */
  qrCodeUrl: {
    type: String
  },
  /** 遥控器 URL */
  remoteUrl: {
    type: String
  },
  /** 系统提示词 */
  systemPrompt: {
    type: String
  },
  /** 智能体名称 */
  title: {
    type: String,
    default: '小提同学'
  },
  /** 国际化语言设置 */
  locale: {
    type: String,
    default: 'zh-CN'
  },
  /** 悬浮AI图标地址 */
  AILogoUrl: {
    type: String
  },
  /** 角色头像配置 */
  roleAvatar: {
    type: Object as () => { user: VNode; assistant: VNode },
    default: () => ({
      user: h(iconUser(), { style: { fontSize: '32px' } }),
      assistant: h(IconAssistant, { style: { fontSize: '32px' } })
    })
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
  /** MCP 服务器配置 */
  mcpServers: {
    type: Object as () => Record<string, McpServerConfig>,
    default: undefined
  },
  /** LLM 配置数组 */
  llmConfigs: {
    type: Array as () => UnifiedModelConfig[],
    default: undefined
  },
  /** 传入的 skill .md 模块 */
  skills: {
    type: Object as () => Record<string, string | (() => Promise<string>)>,
    default: undefined
  },
  /** 布局模式：'static' | 'relative' | 'absolute' | 'fixed' | 'sticky' */
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
    type: Array as () => any[],
    default: undefined
  },
  /** 自定义输入框上方快捷按钮 */
  pillItems: {
    type: Array as () => any[],
    default: undefined
  },
  allowSpeech: {
    type: Boolean,
    default: false
  },
  /** 直接透传给 TrChat 的 UI 配置 */
  ui: {
    type: Object as () => Partial<ChatUIOptions>,
    default: undefined
  }
})

const emit = defineEmits([
  'update:show',
  'update:fullscreen',
  'update:selectedModelId',
  'update:genUiAble',
  'update:enabledTools',
  'before-ai-render',
  'chat-stream-finish',
  'after-send-message',
  'close',
  'mcp-client-disconnected'
])

const fullscreen = defineModel('fullscreen', { type: Boolean, default: false })
const show = defineModel('show', { type: Boolean, default: false })
const selectedModelId = defineModel('selectedModelId', { type: String, default: undefined, required: false })
const genUiAble = defineModel('genUiAble', { type: Boolean, default: false, required: false })
const enabledTools = defineModel('enabledTools', {
  type: Object as () => Record<string, boolean> | undefined,
  default: undefined,
  required: false
})

// 初始化 Remoter 核心运行时
const {
  agent,
  runtime,
  conversation,
  installedPlugins,
  loadMcpServerToPlugin,
  handleClientDisconnected,
  addPluginCore,
  deletePlugin,
  syncInstalledPluginTools,
  handleScanSuccess,
  initMcpServers
} = useRemoterRuntime({
  props,
  emit: emit as any,
  selectedModelId,
  genUiAble,
  enabledTools,
  show,
  fullscreen
})

onMounted(() => {
  initMcpServers()
})

// 自定义卡片渲染器配置
const contentRendererMatches = [
  {
    find: (_msg: any, content: any) => content?.type === 'schema-card',
    renderer: (propsData: any) =>
      h(GenuiRenderer, {
        ...propsData.content,
        customActions: {
          continueChat: {
            execute: (params: any, context: any) => {
              const humanMsg = typeof params === 'string' ? params : params.message
              const llmMsg = `${humanMsg},相关参数为：${JSON.stringify(context?.state || {})}`
              runtime.actions.send({ text: llmMsg })
            }
          }
        },
        generating: conversation.activeConversation.value?.engine?.requestState.value === 'processing',
        customComponents: props.genUiComponents,
        requiredCompleteFieldSelectors: ['[componentName=TinyUser] > props > modelValue']
      })
  },
  {
    find: (_msg: any, content: any) => content?.type === 'image' || content?.type === 'image_url',
    renderer: BubbleImageRenderer as any
  }
]

// 套件 UI 选项组装
const chatUIOptions = computed<ChatUIOptions>(() => {
  // 仅在 fixed 悬浮模式且未显式指定为 normal 时开启 floating
  const isFloating = props.layoutMode === 'fixed' && props.mode === 'remoter'

  return {
    brand: {
      name: props.title
    },
    layout: {
      surface: {
        mode: isFloating ? 'floating' : 'normal'
      }
    },
    bubble: {
      bubbleProvider: {
        contentRendererMatches
      }
    },
    prompts: props.promptItems ? ({ items: props.promptItems } as any) : undefined,
    ...(props.ui || {})
  }
})

// 点击建议卡片自动发送
const handlePromptClick = (payload: any) => {
  const item = payload?.item || payload
  const promptText = item?.description || item?.label || item?.text || (typeof item === 'string' ? item : '')
  if (promptText) {
    runtime.actions.send({ text: promptText })
  }
}

// 点击药丸快捷按钮
const handlePillClick = (pill: any) => {
  const text = pill.inputMessage || pill.text
  if (text) {
    runtime.actions.send({ text })
  }
}

const handlePillMenuClick = (menu: any) => {
  const text = menu.inputMessage || menu.text
  if (text) {
    runtime.actions.send({ text })
  }
}

// 插槽透传计算：排除已显式映射的插槽
const slots = useSlots()
const forwardSlots = computed(() => {
  const result: Record<string, any> = {}
  const handled = new Set(['operations', 'welcome', 'suggestions', 'header-actions'])
  for (const name of Object.keys(slots)) {
    if (!handled.has(name)) {
      result[name] = slots[name]
    }
  }
  return result
})

const internalInput = ref('')

defineExpose({
  agent,
  runtime,
  conversation,
  messages: computed(() => (conversation.activeConversation.value?.engine as any)?.messages?.value || []),
  inputMessage: internalInput,
  abortRequest: () => runtime.actions.abort?.(),
  sendMessage: (text: string) => runtime.actions.send({ text }),
  addMessage: (msg: any) => {
    const eng = conversation.activeConversation.value?.engine as any
    if (eng?.send) {
      eng.send(msg)
    }
  },
  installedPlugins,
  loadMcpServerToPlugin,
  handleClientDisconnected,
  addPluginCore,
  deletePlugin,
  async refreshPluginTools() {
    await agent.refreshTools()
    syncInstalledPluginTools()
  }
})
</script>

<style scoped>
.tiny-remoter {
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  position: relative;
}

.tiny-remoter :deep(.tr-chat) {
  width: 100%;
  height: 100%;
}

/* 扫码按钮悬浮在原生 Header 右侧，保持 Header 原有标题和新建按钮完整 */
.remoter-header-scan {
  position: absolute;
  top: 10px;
  right: 56px;
  z-index: 20;
  display: flex;
  align-items: center;
}

/* 快捷药丸操作条 */
.chat-input-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 6px 12px;
}

.pill-group {
  display: inline-flex;
  gap: 6px;
}

.pill-item {
  display: inline-block;
  padding: 4px 10px;
  font-size: 12px;
  color: #2563eb;
  background-color: #eff6ff;
  border: 1px solid #dbeafe;
  border-radius: 9999px;
  cursor: pointer;
  transition: all 0.2s ease;
  user-select: none;
}

.pill-item:hover {
  background-color: #dbeafe;
  border-color: #bfdbfe;
}
</style>
