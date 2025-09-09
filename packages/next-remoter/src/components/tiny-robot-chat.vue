<template>
  <tr-container v-model:show="show" v-model:fullscreen="fullscreen">
    <template #title>
      <h3 class="tr-container__title">{{ title }}</h3>
    </template>
    <template #operations>
      <tr-icon-button
        :icon="IconNewSession"
        v-auto-tip="{ always: true, content: '新建会话', effect: 'dark' }"
        size="28"
        svgSize="20"
        @click="handleCreateConversation()"
      />
      <tr-icon-button
        :icon="IconHistory"
        v-auto-tip="{ always: true, content: '历史会话', effect: 'dark' }"
        size="28"
        svgSize="20"
        @click="showHistory = !showHistory"
      />
      <QrCodeScan @scanSuccess="handleScanSuccess" v-auto-tip="{ always: true, content: '应用扫码', effect: 'dark' }" />

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
import { PromptProps } from '@opentiny/tiny-robot'
import { GeneratingStatus, STATUS } from '@opentiny/tiny-robot-kit'
import { IconNewSession, IconPlugin, IconHistory } from '@opentiny/tiny-robot-svgs'
import { useTinyRobotChat } from '../composable/useTinyRobotChat'
import { h, CSSProperties, toRef, computed, ref, onMounted } from 'vue'
import { createRemoter, McpServerConfig } from '@opentiny/next-sdk'
import QrCodeScan from './qr-code-scan.vue'
import { DEFAULT_SERVERS } from './default-mcps'
import { defaultPluginSrc } from './default-plugin-svg'
import { SYSTEM_PROMPT } from '../const'
import { AutoTip } from '@opentiny/vue-directive'

const VAutoTip = AutoTip

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
    default: SYSTEM_PROMPT
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

const lang: Record<string, { title: string; description: string; placeholder: string; thinking: string }> = {
  'zh-CN': {
    title: 'OpenTiny NEXT',
    description: '我是你的私人智能助手',
    placeholder: '请输入您的问题',
    thinking: '正在思考中...'
  },
  'en-US': {
    title: 'OpenTiny NEXT',
    description: 'I am your private AI assistant',
    placeholder: 'Please enter your question',
    thinking: 'Thinking...'
  }
}

// 自动计算的变量
const senderPlaceholder = computed(() =>
  GeneratingStatus.includes(messageState.status) ? lang[props.locale].thinking : lang[props.locale].placeholder
)

const senderLoading = computed(() => GeneratingStatus.includes(messageState.status))

// 默认的Prompts。 仅做为介绍性文字，点击不触发事件
const promptItems: PromptProps[] = [
  {
    label: props.locale === 'zh-CN' ? '企业办公助手' : 'Enterprise Office Assistant',
    description:
      props.locale === 'zh-CN'
        ? '需要我帮你处理邮件、安排会议、整理文档，还是优化工作流程？'
        : 'Need help with emails, meeting scheduling, document organization, or workflow optimization?',
    icon: h('span', { style: { fontSize: '18px' } as CSSProperties }, '🧠'),
    badge: 'NEW'
  },
  {
    label: props.locale === 'zh-CN' ? '开发技术支持' : 'Development Support',
    description:
      props.locale === 'zh-CN'
        ? '遇到代码问题？需要架构建议？还是想了解最新的技术趋势？'
        : 'Facing code issues? Need architecture advice? Or want to learn about latest tech trends?',
    icon: h('span', { style: { fontSize: '18px' } as CSSProperties }, '💻')
  },
  {
    label: props.locale === 'zh-CN' ? '项目管理协作' : 'Project Management',
    description:
      props.locale === 'zh-CN'
        ? '需要项目规划、任务分配、进度跟踪，还是团队协作建议？'
        : 'Need project planning, task assignment, progress tracking, or team collaboration advice?',
    icon: h('span', { style: { fontSize: '18px' } as CSSProperties }, '📊')
  }
]

// 默认的 SuggestionPills
const mapMake = (str: string, id: number) => {
  const [text, inputMessage] = str.split('#')
  return { id, text, inputMessage }
}
const pillItems = [
  {
    id: 'office',
    text: props.locale === 'zh-CN' ? '办公助手' : 'Office Assistant',
    menus: [
      '接收邮件#请同步邮箱的新邮件。',
      '编写邮件#请新建一个邮件，收件人为 opentiny-next@meeting.com, 内容为举办一个临时会议。',
      '安排会议#创建一个临时的在线会议，主题为讨论问题，时长为1小时。',
      '整理文档#请分析附件中的销售情况，把销售额绘制成折线图。'
    ].map(mapMake)
  },
  {
    id: 'development',
    text: props.locale === 'zh-CN' ? '开发支持' : 'Development Support',
    menus: [
      '遇到代码问题#请检查当前位置的报错原因。',
      '架构建议#请使用NodeJs实现一个分块上传文件的模块。',
      '最新的技术趋势#请分析Vue与React 框架的优劣分别是什么？'
    ].map(mapMake)
  },
  {
    id: 'management',
    text: props.locale === 'zh-CN' ? '项目管理' : 'Project Management',
    menus: [
      '项目规划#如何开展品牌推广的活动？',
      '任务分配#将本季度的销售任务分配给三个人，并生成甘特图进行跟踪。',
      '进度跟踪#分析团队的任务完成情况。'
    ].map(mapMake)
  }
]
const handlePillItemClick = (item: ReturnType<typeof mapMake>) => {
  inputMessage.value = item.inputMessage
}

// 处理扫码结果。 把结果添加到 agent.mcpServers， 以及 插入McpServerPicker的一个Plugin
const handleScanSuccess = async (sessionId: string) => {
  if (sessionId) {
    const mcpServer = {
      type: 'streamableHttp',
      url: `${props.agentRoot}mcp?sessionId=${sessionId}`
    } as const
    // 1、 插入McpServers, 此时内部会判断重复。  不重复则插入，并连接和查询tools到agent上。
    const inserted = await agent.insertMcpServer(mcpServer)

    if (inserted) {
      loadMcpServerToPlugin(mcpServer)
      showToast('添加工具完成')
    }
  } else {
    showToast('添加工具失败')
  }
}

function loadMcpServerToPlugin(mcpServer: McpServerConfig) {
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
    const plugin: PluginInfo = {
      id: `plugin-${sessionId}`,
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
    agent.removeMcpServer(mcpServer)
  }
}
// 页面加载时，要判断 agent上，初始就加载的 agent.mcpServer，加载后记录在 agent.mcpTools下
onMounted(async () => {
  // 统一报错
  agent.onError = (msg) => {
    msg && showToast(msg)
  }

  await agent.initClientsAndTools()
  agent.mcpServers.forEach((mcpServer) => {
    loadMcpServerToPlugin(mcpServer)
  })

  // 每次chat的过程中，更新 tools 后，已安装的插件需要同步一次
  agent.onUpdatedTools = () => {
    installedPlugins.value.forEach((plugin) => {
      const mcpServer = plugin.originMcpConfig
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
    onShowAIChat: () => {
      show.value = true
    }
  })
}

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
const handlePluginDelete = (plugin: PluginInfo) => {
  // 从安装插件删除， 市场插件还原状态。
  const delPlugin = installedPlugins.value.find((item) => item.id === plugin.id)
  if (delPlugin) {
    installedPlugins.value = installedPlugins.value.filter((item) => item.id !== delPlugin.id)
    const findInMarket = marketPlugins.value.find((item) => item.id === delPlugin.id)
    if (findInMarket) {
      findInMarket.addState = 'idle'
    }

    // 移除mcpServers，mcpTools，mcpClients，ignoreToolnames
    agent.removeMcpServer(delPlugin.originMcpConfig)
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
      return
    }
  }
  // 添加失败
  agent.removeMcpServer(mcpServer)
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
