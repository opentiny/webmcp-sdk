<template>
  <tr-container v-model:show="show" v-model:fullscreen="fullscreen">
    <template #title>
      <h3 class="tr-container__title">{{ title }}</h3>
    </template>
    <template #operations>
      <tr-icon-button :icon="IconNewSession" size="28" svgSize="20" @click="handleCreateConversation()" />
      <tr-icon-button :icon="IconHistory" size="28" svgSize="20" @click="showHistory = !showHistory" />
      <QrCodeScan @scanSuccess="handleScanSuccess" />

      <!-- 历史会话抽屉 -->
      <Transition name="drawer-slide" appear>
        <div v-if="showHistory" class="drawer-overlay" @click="showHistory = false">
          <div class="drawer-container" @click.stop>
            <TrHistory
              class="tr-history-demo"
              tab-title="历史会话"
              :selected="conversationState.currentId"
              :data="conversationState.conversations"
              @close="showHistory = false"
              @item-click="handleHistorySelect"
              @item-title-change="handleHistoryUpdateTitle"
              @item-delete="handleHistoryDelete"
            ></TrHistory>
          </div>
        </div>
      </Transition>
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
          :maxLength="1000"
          @submit="handleSendMessageCustom"
          @cancel="abortRequest"
        >
          <template #footer-left>
            <div class="sender-left-icon">
              <!-- 插件开关 -->
              <IconPlugin @click="pluginVisible = !pluginVisible"></IconPlugin>
            </div>
          </template>
        </tr-sender>

        <!-- 插件面板 -->
        <TrMcpServerPicker
          v-model:visible="pluginVisible"
          :popup-config="{ type: 'drawer' }"
          :show-custom-add-button="false"
          marketTabTitle="MCP 市场"
          :installedPlugins="installedPlugins"
          :marketPlugins="marketPlugins"
          :market-category-options="marketCategoryOptions"
          :installed-search-fn="handleMcpServerPickerSearchFn"
          :market-search-fn="handleMcpServerPickerSearchFn"
          @plugin-toggle="handlePluginToggle"
          @plugin-add="handlePluginAdd"
          @plugin-delete="handlePluginDelete"
          @tool-toggle="handleToolToggle"
        >
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
  type PluginTool
} from '@opentiny/tiny-robot'

import { GeneratingStatus, STATUS } from '@opentiny/tiny-robot-kit'
import { IconNewSession, IconPlugin, IconHistory } from '@opentiny/tiny-robot-svgs'
import { useTinyRobotChat } from '../composable/useTinyRobotChat'
import { toRef, computed, ref, onMounted, watch } from 'vue'
import { createRemoter, McpServerConfig } from '@opentiny/next-sdk'
import QrCodeScan from './qr-code-scan.vue'
import { DEFAULT_SERVERS } from './default-mcps'
import { defaultPluginSrc } from './default-plugin-svg'
import { getLang, mapMake } from './lang'

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
  }
})

const fullscreen = defineModel('fullscreen', { type: Boolean, default: false })
const show = defineModel('show', { type: Boolean, default: false })
const isInitClientsAndTools = ref(false)

// 对接 mcp server picker 组件
const pluginVisible = ref(false)

// 已安装插件数据
const installedPlugins = ref<PluginInfo[]>([])

// 市场插件数据
const marketPlugins = ref<PluginInfo[]>([...DEFAULT_SERVERS])

// 市场分类选项
const marketCategoryOptions = ref<MarketCategoryOption[]>([
  { value: '', label: '全部分类' },
  { value: 'productivity', label: '生产力工具' },
  { value: 'communication', label: '沟通协作' },
  { value: 'development', label: '开发工具' },
  { value: 'ai', label: 'AI 助手' }
])

const { lang, pillItems, promptItems } = getLang(props)

const {
  showHistory,
  agent, // ai-sdk的自定义代理，client通过它和llm 对话。 agent.ignoreToolnames=[] 是记录需要过滤掉的tools
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
  handleCreateConversation
} = useTinyRobotChat({
  sessionId: toRef(props, 'sessionId'),
  agentRoot: toRef(props, 'agentRoot'),
  systemPrompt: props.systemPrompt || ''
})

const handleSendMessageCustom = async () => {
  const input = inputMessage.value
  if (/^\/[A-Za-z0-9-]{6,}$/.test(input)) {
    showLoadingToast('添加工具中...')
    const res = await fetch(`${props.agentRoot}client?sessionId=${input.slice(1)}`).then((res) => res.json())
    const sessionId = res?.data?.sessionId

    if (sessionId) {
      await handleScanSuccess(sessionId)
      showToast('添加工具完成')
    } else {
      showToast('添加工具失败,请检查 code 码是否正确')
    }

    inputMessage.value = ''
  } else {
    handleSendMessage()
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

// 处理扫码结果。 把结果添加到 agent.mcpServers， 以及 插入McpServerPicker的一个Plugin
const handleScanSuccess = async (sessionId: string) => {
  if (!isInitClientsAndTools.value) {
    await agent.initClientsAndTools()
    isInitClientsAndTools.value = true
  }

  if (sessionId) {
    const mcpServer = {
      type: 'streamableHttp',
      url: `${props.agentRoot}mcp?sessionId=${sessionId}`
    } as const
    // 1、 插入McpServers, 此时内部会判断重复。  不重复则插入，并连接和查询tools到agent上。
    const inserted = await agent.insertMcpServer(mcpServer)

    if (inserted) {
      await loadMcpServerToPlugin(mcpServer)
      await agent.closeAll()
      showToast('添加工具完成')
    }
  } else {
    showToast('添加工具失败')
  }
}

const loadMcpServerToPlugin = async (mcpServer: McpServerConfig) => {
  // 先查找 index, 由它可以找到相应的 client, tool
  const index = agent.mcpServers.findIndex((svc) => svc.url === mcpServer.url)
  // 解析url, 获得sessionId
  const url = new URL(mcpServer.url)
  const sessionId = url.searchParams.get('sessionId') || ''
  // 查询 tools
  const currTool = agent.mcpTools[index]
  if (currTool) {
    let pluginTools: PluginTool[] = []
    pluginTools = Object.keys(currTool).map((key) => {
      return {
        id: key,
        name: key,
        description: currTool[key].description as string,
        enabled: true
      }
    })

    const pluginId = `plugin-${sessionId}`

    // 检查是否已存在相同的插件，避免重复添加
    const existingPlugin = installedPlugins.value.find((plugin) => plugin.id === pluginId)
    if (existingPlugin) {
      // 如果插件已存在，更新其工具列表和配置
      existingPlugin.tools = pluginTools
      existingPlugin.originMcpConfig = mcpServer as McpServerConfig
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
      originMcpConfig: mcpServer // 缓存对应的mcpServers中的一个引用
    }

    installedPlugins.value.push(plugin)
  } else {
    await agent.removeMcpServer(mcpServer)
  }
}

watch(
  () => pluginVisible.value,
  async (value) => {
    if (value) {
      if (!isInitClientsAndTools.value) {
        showLoadingToast('查询工具中·...')
        await agent.initClientsAndTools()
        isInitClientsAndTools.value = true
        showToast('查询工具完成')
      }

      for (const mcpServer of agent.mcpServers) {
        await loadMcpServerToPlugin(mcpServer)
      }

      await agent.closeAll()
    }
  },
  { once: true }
)

// 页面加载时，要判断 agent上，初始就加载的 agent.mcpServer，加载后记录在 agent.mcpTools下
onMounted(async () => {
  // 统一报错
  agent.onError = (msg) => {
    msg && showToast(msg)
  }

  // 每次chat的过程中，更新 tools 后，已安装的插件需要同步一次
  agent.onUpdatedTools = () => {
    installedPlugins.value.forEach((plugin) => {
      const mcpServer = plugin.originMcpConfig as McpServerConfig
      const index = agent.mcpServers.findIndex((server) => server === mcpServer)
      if (index !== -1) {
        const currTool = agent.mcpTools[index]
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
})

// 自定义消息渲染器
const contentRenderer = { markdown: new BubbleMarkdownContentRenderer({ mdConfig: { html: true } }) }

// 如果是遥控器模式，则初始化右下角的AI 图标
if (props.mode === 'remoter') {
  createRemoter({
    sessionId: props.sessionId,
    qrCodeUrl: props.qrCodeUrl,
    remoteUrl: props.remoteUrl,
    onShowAIChat: () => {
      show.value = true
    }
  })
}

// 整个插件的打开或关闭
const handlePluginToggle = (plugin: PluginInfo, enabled: boolean) => {
  // Keep empty!
}

// 某个tool的打开或关闭。  全部tool状态一致时，会同时触发handlePluginToggle 一下。
const handleToolToggle = (plugin: PluginInfo, toolId: string, enabled: boolean) => {
  if (enabled) {
    agent.ignoreToolnames = agent.ignoreToolnames.filter((name) => name !== toolId)
  } else {
    agent.ignoreToolnames.push(toolId)
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
    await agent.removeMcpServer(delPlugin.originMcpConfig as McpServerConfig)
  }
}
// 插件市场中，点击“添加”
const handlePluginAdd = async (plugin: PluginInfo, isAdd: boolean) => {
  plugin.addState = 'loading'

  const newPlugin = {
    ...plugin,
    id: plugin.id,
    enabled: true
  }

  // 立即注册服务，查询工具
  const mcpServer = { type: plugin.type, url: plugin.url }
  const inserted = await agent.insertMcpServer(mcpServer) // 插入时，会自动去重，且initClientAndTools
  if (inserted) {
    newPlugin.originMcpConfig = mcpServer
    const index = agent.mcpServers.findIndex((svc) => svc.url === mcpServer.url)
    // 查询 tools
    const currTool = agent.mcpTools[index]
    if (currTool) {
      newPlugin.tools = Object.keys(currTool).map((key) => {
        return {
          id: key,
          name: key,
          description: currTool[key].description as string,
          enabled: true
        }
      })
      installedPlugins.value.push(newPlugin) // 只有client.tools() 成功了，才显示到“已安装列表”
      plugin.addState = 'added'
      await agent.closeAll()
      return
    }
  }
  // 添加失败
  await agent.removeMcpServer(mcpServer)
  plugin.addState = 'idle'
}

// 搜索已安装或者搜索市场，两个函数一样的。
const handleMcpServerPickerSearchFn = (query: string, item: PluginInfo) => {
  return query.trim() === '' || item.name.toLowerCase().includes(query.toLowerCase())
}

// 定义插槽
defineSlots<{
  welcome(): any
  suggestions(): any
}>()

// 定义输出：  暴露一些重要方法，方便用户写插槽时，可以使用。
defineExpose({
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
  sendMessage
})
</script>

<style scoped lang="less">
/** 避免输入框没有外边距 */
.chat-input {
  margin-top: 8px;
  padding: 10px 15px;
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
