<template>
  <tr-container v-model:show="show" v-model:fullscreen="fullscreen">
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
              <ModelSwitch :model-configs="llmConfigsRef" v-model:selected-model-id="selectedModelId" />
              <!-- 生成式UI开关 GenUI toggle button -->
              <GenUISwitch v-model:genui-enabled="genUiAble" />
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
  type PluginTool,
  type MentionItem
} from '@opentiny/tiny-robot'

import { SchemaRenderer } from '@opentiny/genui-sdk-vue'

import { GeneratingStatus, STATUS } from '@opentiny/tiny-robot-kit'
import { IconNewSession, IconHistory } from '@opentiny/tiny-robot-svgs'
import { useTinyRobotChat } from '../composable/useTinyRobotChat'
import { useCustomMcpServer } from '../composable/useCustomMcpServer'
import { toRef, computed, ref, onMounted, markRaw, h, watch, type Ref } from 'vue'
import { createRemoter, McpServerConfig } from '@opentiny/next-sdk'
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
import useGenUI from '../composable/useGenUI'
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
  /** 本地工具存储状态（可选，用于外部控制）Local tool storage state (optional, for external control) */
  localToolStorage: {
    type: Object as () => Record<string, boolean> | undefined,
    default: undefined
  },
  skills: {
    type: Object as () => MentionItem[],
    default: () => []
  }
})

const emit = defineEmits<{
  'update:localToolStorage': [storage: Record<string, boolean>]
}>()

const fullscreen = defineModel('fullscreen', { type: Boolean, default: false })
const show = defineModel('show', { type: Boolean, default: false })
const selectedModelId = defineModel('selectedModelId', { type: String, default: undefined, required: false })
// 使用 defineModel 定义 genUiAble，实现双向绑定（简化逻辑，统一使用 v-model:genUiAble）
const genUiAble = defineModel('genUiAble', { type: Boolean, default: false, required: false })

// 获取当前选中的模型配置（如果传入了 llmConfigs，则使用传入的配置）
const llmConfigsRef = props.llmConfigs ? (toRef(props, 'llmConfigs') as Ref<UnifiedModelConfig[]>) : undefined
// selectedModelId 已通过 defineModel 定义，可以直接使用
// defineModel 返回的 ref 可以直接传递给 useModel
const { selectedModel } = useModel(llmConfigsRef, selectedModelId, (modelId: string) => {
  // 当模型变化时，更新 selectedModelId（defineModel 会自动处理双向绑定）
  selectedModelId.value = modelId
})

const {
  showHistory,
  agent, // ai-sdk的自定义代理，client通过它和llm 对话。 agent.ignoreToolnames=[] 是记录需要过滤掉的tools
  customAgentProvider, // CustomAgentModelProvider 实例，用于调用 updateLLMConfig
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
  sessionId: toRef(props, 'sessionId'),
  agentRoot: toRef(props, 'agentRoot'),
  systemPrompt: props.systemPrompt || '',
  llmConfig: props.llmConfig,
  inBrowserExt: toRef(props, 'inBrowserExt'),
  skills: props.skills || [], // 传递 skills 列表给 useTinyRobotChat
  selectedModel // 传递当前选中的模型配置
})

customAgentProvider.isGenuiEnabled = genUiAble

// 监听生成式UI状态变化，动态更新 baseURL
// 当生成式UI状态变化时，重新调用 updateLLMConfig 来更新 baseURL
if (props.llmConfigs) {
  watch(genUiAble, () => {
    debugger
    // 当生成式UI状态变化时，重新调用 updateLLMConfig 来更新 baseURL
    if (
      selectedModel.value &&
      'baseURL' in selectedModel.value &&
      'apiKey' in selectedModel.value &&
      'providerType' in selectedModel.value
    ) {
      const model = selectedModel.value
      if (model.baseURL && model.apiKey && model.providerType) {
        customAgentProvider.updateLLMConfig({
          modelId: model.id,
          baseURL: model.baseURL,
          apiKey: model.apiKey,
          providerType: model.providerType,
          useReActMode: model.useReActMode
        })
      }
    }
  })
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

// 对接 mcp server picker 组件
const pluginVisible = ref(false)

// 已安装插件数据
const installedPlugins = ref<PluginInfo[]>([])

// 市场插件数据
const marketPlugins = ref<PluginInfo[]>([...DEFAULT_SERVERS, ...props.customMarketMcpServers])

// 市场分类选项
const marketCategoryOptions = ref<MarketCategoryOption[]>([
  { value: '', label: '全部分类' },
  { value: 'productivity', label: '生产力工具' },
  { value: 'communication', label: '沟通协作' },
  { value: 'development', label: '开发工具' },
  { value: 'ai', label: 'AI 助手' }
])

const { lang, pillItems, promptItems } = getLang(props)

/**
 * 处理 MCP Client 断开事件
 * 自动清理已断开的插件和资源
 */
const handleClientDisconnected = async (serverName: string) => {
  // 从 serverName 提取 pluginId (格式: mcp-server-xxx)
  const pluginId = serverName.replace('mcp-server-', '')
  const fullPluginId = `plugin-${pluginId}`

  // 查找对应的插件
  const plugin = installedPlugins.value.find((p) => p.id === fullPluginId)

  // 从 Agent 中移除 MCP Server
  await agent.removeMcpServer(serverName)

  if (plugin) {
    // 从已安装插件列表中移除
    installedPlugins.value = installedPlugins.value.filter((p) => p.id !== fullPluginId)

    // 还原市场插件状态（如果存在）
    const marketPlugin = marketPlugins.value.find((p) => p.id === fullPluginId)
    if (marketPlugin) {
      marketPlugin.addState = 'idle'
    }

    // 显示提示
    showToast(`工具 "${plugin.name}" 已断开连接`)
  }
}

// 处理扫码结果。 把结果添加到 agent.mcpServers， 以及 插入McpServerPicker的一个Plugin
const handleScanSuccess = async (sessionId: string) => {
  showLoadingToast('添加工具中...')

  if (sessionId) {
    const mcpServer = {
      type: 'streamableHttp',
      url: `${props.agentRoot}mcp?sessionId=${sessionId}`
    } as const
    const serverName = `mcp-server-${sessionId}`
    // 1、 插入McpServers, 此时内部会判断重复。  不重复则插入，并连接和查询tools到agent上。
    const inserted = await agent.insertMcpServer(serverName, mcpServer)

    if (inserted) {
      await loadMcpServerToPlugin(serverName, mcpServer)
      await agent.closeAll()
      showToast('添加工具完成')
    } else {
      showToast('重复添加工具')
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

const loadMcpServerToPlugin = async (serverName: string, mcpServer: McpServerConfig) => {
  const LOCAL_TOOL_STORAGE = props.localToolStorage || {}
  const isLocalTool = serverName === 'mcp-server-localhost'
  const url = isLocalTool ? { origin: '本地工具' } : new URL('url' in mcpServer ? mcpServer.url : '')
  const sessionId = isLocalTool
    ? '本地工具列表'
    : url.searchParams.get('sessionId') || ('sessionId' in mcpServer ? mcpServer.sessionId : '') || ''

  // 直接使用 serverName 获取 tools，无需索引查找
  const currTool = agent.mcpTools[serverName]
  if (currTool) {
    let pluginTools: PluginTool[] = []
    pluginTools = Object.keys(currTool).map((key) => {
      const enabled = isLocalTool ? Boolean(LOCAL_TOOL_STORAGE[key]) : true
      agent.ignoreToolnames = agent.ignoreToolnames.filter((name) => name !== key)
      if (!enabled) {
        agent.ignoreToolnames.push(key)
      }
      return {
        id: key,
        name: key,
        description: currTool[key].description as string,
        enabled
      }
    })

    const pluginId = `plugin-${sessionId}`

    // 检查是否已存在相同的插件，避免重复添加
    const existingPlugin = installedPlugins.value.find((plugin) => plugin.id === pluginId)
    if (existingPlugin) {
      // 如果插件已存在，更新其工具列表和配置
      existingPlugin.tools = pluginTools
      // @ts-ignore
      existingPlugin.originMcpConfig = markRaw(mcpServer) as McpServerConfig
      return
    }

    const plugin: PluginInfo = {
      id: pluginId,
      name: url.origin,
      icon: defaultPluginSrc,
      description: sessionId,
      enabled: true,
      expanded: true,
      tools: pluginTools,
      // @ts-ignore
      originMcpConfig: markRaw(mcpServer) // 缓存对应的mcpServers中的一个引用
    }

    installedPlugins.value.push(plugin)
  }
}

onMounted(async () => {
  // 统一报错
  agent.onError = (msg) => {
    msg && showToast(handleError(msg))
  }

  // 每次chat的过程中会自动更新 tools ，所以已安装的插件需要同步一次
  agent.onUpdatedTools = () => {
    installedPlugins.value.forEach((plugin) => {
      // 通过插件ID找到对应的服务器名称
      const serverName = `mcp-server-${plugin.id.replace('plugin-', '')}`

      // 直接使用 serverName 获取 client 和 tool，无需索引查找
      const currClient = agent.mcpClients[serverName]
      const currTool = agent.mcpTools[serverName]

      // 先判断client 在不在， 不存在后，标记一个 (断)
      if (currClient === null) {
        plugin.name = '❌' + plugin.name.replace('❌', '')
      }

      // 判断 tool是不是 null, 是null则全部禁用
      if (currTool === null) {
        plugin.tools.forEach((tool) => (tool.enabled = false))
      } else if (currTool) {
        plugin.tools = Object.keys(currTool).map((key) => {
          return {
            id: key,
            name: key,
            description: currTool[key].description as string,
            enabled: !agent.ignoreToolnames.includes(key)
          }
        })
      }
    })
  }

  // 初始加载时，url上的sessionId 可能是1个或多个，此时要立即连接后，更新一下插件状态
  await agent.initClientsAndTools()
  await agent.closeAll()

  for (const [serverName, mcpServer] of Object.entries(agent.mcpServers)) {
    await loadMcpServerToPlugin(serverName, mcpServer)
  }
})

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

// 整个插件的打开或关闭
const handlePluginToggle = (_plugin: PluginInfo, enabled: boolean) => {
  const isLocalTool = _plugin.id === 'plugin-本地工具列表'
  const LOCAL_TOOL_STORAGE = props.localToolStorage ? { ...props.localToolStorage } : {}
  _plugin.tools.forEach((tool) => {
    tool.enabled = enabled
    if (enabled) {
      agent.ignoreToolnames = agent.ignoreToolnames.filter((name) => name !== tool.id)
    } else {
      agent.ignoreToolnames.push(tool.id)
    }
  })

  if (isLocalTool) {
    Object.keys(LOCAL_TOOL_STORAGE).forEach((key) => {
      LOCAL_TOOL_STORAGE[key] = enabled
    })
    emit('update:localToolStorage', LOCAL_TOOL_STORAGE)
  }
}

// 某个tool的打开或关闭。  全部tool状态一致时，会同时触发handlePluginToggle 一下。
const handleToolToggle = (_plugin: PluginInfo, toolId: string, enabled: boolean) => {
  const LOCAL_TOOL_STORAGE = props.localToolStorage ? { ...props.localToolStorage } : {}
  const isLocalTool = _plugin.id === 'plugin-本地工具列表'

  _plugin.tools.forEach((tool) => {
    if (tool.id === toolId) {
      tool.enabled = enabled
    }
  })
  if (enabled) {
    agent.ignoreToolnames = agent.ignoreToolnames.filter((name) => name !== toolId)
  } else {
    agent.ignoreToolnames.push(toolId)
  }
  if (isLocalTool) {
    LOCAL_TOOL_STORAGE[toolId] = enabled
    emit('update:localToolStorage', LOCAL_TOOL_STORAGE)
  }
}
// 点垃圾桶图标的插件删除
const handlePluginDelete = async (plugin: PluginInfo) => {
  // 从安装插件删除， 市场插件还原状态。
  const delPlugin = installedPlugins.value.find((item) => item.id === plugin.id)
  if (delPlugin) {
    installedPlugins.value = installedPlugins.value.filter((item) => item.id !== delPlugin.id)
    const findInMarket = marketPlugins.value.find((item) => item.id === delPlugin.id)
    if (findInMarket) {
      findInMarket.addState = 'idle'
    }

    // 移除mcpServers，mcpTools，mcpClients，ignoreToolnames
    // 通过插件ID找到对应的服务器名称
    const serverName = `mcp-server-${plugin.id.replace('plugin-', '')}`
    await agent.removeMcpServer(serverName)
  }
}
// 插件市场中，点击"添加"
const handlePluginAdd = async (plugin: PluginInfo) => {
  plugin.addState = 'loading'

  const newPlugin = {
    ...plugin,
    id: plugin.id,
    enabled: true
  }

  // 立即注册服务，查询工具
  const mcpServer = { type: (plugin as any).type, url: (plugin as any).url, useAISdkClient: true } as McpServerConfig
  const serverName = `mcp-server-${plugin.id}`
  const inserted = await agent.insertMcpServer(serverName, mcpServer) // 插入时，会自动去重，且initClientAndTools
  if (inserted) {
    // 直接使用 serverName 获取 tools，无需索引查找
    const currTool = agent.mcpTools[serverName]
    if (currTool) {
      newPlugin.tools = Object.keys(currTool).map((key) => {
        return {
          id: key,
          name: key,
          description: currTool[key].description as string,
          enabled: true
        }
      })
      installedPlugins.value.push(newPlugin) // 只有client.tools() 成功了，才显示到"已安装列表"
      plugin.addState = 'added'
      await agent.closeAll()
      return
    }
  }
  // 添加失败
  await agent.removeMcpServer(serverName)
  plugin.addState = 'idle'
}

// 搜索已安装或者搜索市场，两个函数一样的。
const handleMcpServerPickerSearchFn = (query: string, item: PluginInfo) => {
  return query.trim() === '' || item.name.toLowerCase().includes(query.toLowerCase())
}

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
  /** mcp client断开时，自动清理已断开的插件和资源  */
  handleClientDisconnected,
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
</style>
