<script lang="ts" setup>
import { ref, type Ref, shallowReactive, computed, onBeforeMount, watch } from 'vue'
import { TinyRemoter } from '@opentiny/next-remoter'
import { useBrowserExtensions } from './useBrowserExtensions'
import { useWebAgentServer } from './useWebAgentServer'
import TinyUser from '@opentiny/vue-user'
import { useCustomMarketMcpServers } from './useCustomMarketMcpServers'
import { TrSuggestionPillButton, TrDropdownMenu } from '@opentiny/tiny-robot'
import { AGENT_ROOT, ROBOT_URL } from './const'
import { useGenerateCode } from './useGenerateCode'
import RecordModal from './components/RecordModal.vue'
import { getAllSkills } from '@/skills'
import { RENDERER_SETTINGS_KEY } from '@opentiny/genui-sdk-vue'
import { useAutoScreenshot } from './useAutoScreenshot'
import { CustomFunction } from '@/utils/customFunction'
import { DEFAULT_MODEL_CONFIGS } from './model-config'
import { storage } from '@wxt-dev/storage'
import { StorageKeys } from './utils/storage-keys'

// 初始化自动截图功能
const { captureCurrentTab } = useAutoScreenshot()

const llmConfig = {
  apiKey: import.meta.env.VITE_LLM_API_KEY,
  baseURL: import.meta.env.VITE_LLM_BASE_URL,
  providerType: 'deepseek',
  model: import.meta.env.VITE_LLM_MODEL,
  maxSteps: 30,
  /**
   * beforeChatStream 钩子：在消息发送前自动添加截图
   * 当 skill 是视觉操作专家时，自动捕获当前页面截图并添加到消息中
   */
  beforeChatStream: async (lastUserMsg: any, systemPrompt: string) => {
    // 检查是否是视觉操作专家 skill（通过 systemPrompt 判断）
    // 检查多个可能的标识符
    const isVisionExpert =
      systemPrompt.includes('视觉操作专家') ||
      systemPrompt.includes('vision-expert') ||
      systemPrompt.includes('# 视觉操作专家')

    console.log('[beforeChatStream] isVisionExpert:', isVisionExpert)

    if (!isVisionExpert) {
      // 不是视觉专家，返回原始消息
      return lastUserMsg
    }

    try {
      // 自动捕获当前页面截图
      const screenshot = await captureCurrentTab()

      // 获取原始文本内容
      const textContent =
        typeof lastUserMsg.content === 'string'
          ? lastUserMsg.content
          : lastUserMsg.content.find((part: any) => part.type === 'text')?.text || ''

      // 从 data URL 中提取 base64 字符串
      // screenshot 格式: "data:image/png;base64,iVBORw0KG..."
      // 需要提取: "iVBORw0KG..."
      const base64Match = screenshot.match(/^data:image\/\w+;base64,(.+)$/)
      const base64String = base64Match ? base64Match[1] : screenshot

      // 在原始消息的文本内容中添加截图标记，让用户在 UI 上看到截图提示
      // 保持原始消息的字符串格式，方便 bubble 组件渲染
      const textWithScreenshotTag = `${textContent}\n📸 *已自动附加当前页面截图*`

      // 更新原始消息对象，让 UI 显示带有截图标记的文本
      lastUserMsg.content = textWithScreenshotTag

      // 构建多模态消息：文本 + 截图
      // 这个消息会传递给 AI SDK（使用原始文本，不带标记）
      // 根据 AI SDK 文档，ImagePart 的 image 字段可以是：
      // - base64 字符串（不带前缀）
      // - data URL（带 data:image/png;base64, 前缀）
      // - URL
      const multimodalMsg = {
        role: 'user',
        content: [
          { type: 'text', text: textContent }, // AI 看到的是原始文本（不带标记）
          { type: 'image', image: base64String } // 使用纯 base64 字符串
        ]
      }

      return multimodalMsg
    } catch (error) {
      console.error('[Auto Screenshot] 截图捕获失败:', error)
      // 降级：返回原始消息
      return lastUserMsg
    }
  }
}

const allSkills = getAllSkills().map((skill: any) => ({
  label: skill.meta.label,
  value: skill.prompt, // 完整的提示词内容，用于组合
  tools: skill.tools || [] // 该 skill 需要的 MCP 工具名称列表
}))

// 从 skill 系统加载 skill 列表，传递完整的 skill 信息给 remoter
const skills = ref<Array<{ label: string; value: string }>>(allSkills)

const remoterRef = ref() as Ref<InstanceType<typeof TinyRemoter>>
useBrowserExtensions(remoterRef)

// 注重生成式UI所要求的，自定义Function
provide(RENDERER_SETTINGS_KEY, {
  Function: CustomFunction
})

// 通过 Web Agent 服务获取实时 sessionId（中文注释：供短码/URL 使用）
const sessionId = ref('')

useWebAgentServer()
  .then((id) => {
    sessionId.value = id
  })
  .catch((error) => {
    console.error('useWebAgentServer 初始化失败', error)
    sessionId.value = ''
  })

const genUiComponents = shallowReactive({ TinyUser })
// 汇总自定义 MCP Server 配置（中文注释：用于传给 TinyRemoter 的插件市场）
const customMarketMcpServers = useCustomMarketMcpServers()
const isDev = import.meta.env.DEV

// 管理选中的模型 ID（从存储读取，变化时保存）
const defaultModel = DEFAULT_MODEL_CONFIGS.find((config) => config.isDefault) || DEFAULT_MODEL_CONFIGS[0]
// 先使用默认值创建 ref，然后在 onBeforeMount 中加载存储值
// 注意：使用 shallowRef 避免深度响应式，因为值会在 onBeforeMount 中更新
const selectedModelId = ref<string>(defaultModel.id)

// 管理生成式UI启用状态（从存储读取，变化时保存）
const genuiEnabled = ref<boolean>(false)

// 管理本地工具存储状态（从存储读取，变化时保存）
const localToolStorage = ref<Record<string, boolean>>({})

// 标志：是否已从存储加载初始值（用于避免在加载时触发 watch）
let isInitialized = false

// 在组件挂载前加载存储值，确保在 TinyRobotChat 初始化时就有正确的值
// 使用 onBeforeMount 确保在子组件初始化之前加载
onBeforeMount(async () => {
  try {
    // 加载选中的模型 ID（使用 @wxt-dev/storage 统一存储接口）
    const storedModel = (await storage.getMeta(StorageKeys.SELECTED_MODEL)) as unknown as string | undefined
    if (storedModel && DEFAULT_MODEL_CONFIGS.some((config) => config.id === storedModel)) {
      selectedModelId.value = storedModel
    }

    // 加载生成式UI启用状态（使用 @wxt-dev/storage 后需要确保类型正确）
    const storedGenui = (await storage.getMeta(StorageKeys.GENUI_ENABLED)) as unknown
    // 确保存储的值是布尔类型，避免类型错误（@wxt-dev/storage 可能返回对象）
    if (typeof storedGenui === 'boolean') {
      genuiEnabled.value = storedGenui
    }

    // 加载本地工具存储状态
    const storedLocalTool = (await storage.getMeta(StorageKeys.LOCAL_TOOL_STORAGE)) as unknown as
      | Record<string, boolean>
      | undefined
    if (storedLocalTool) {
      localToolStorage.value = storedLocalTool
    }
  } catch (error) {
    console.warn('[App] Failed to load stored data:', error)
  } finally {
    // 标记初始化完成，之后的变化才会保存到存储
    isInitialized = true
  }
})

// 监听 selectedModelId 变化，自动保存到存储（使用 @wxt-dev/storage 统一存储接口）
watch(selectedModelId, async (newId) => {
  // 只有在初始化完成后才保存，避免在加载存储值时触发
  if (!isInitialized) {
    return
  }
  try {
    await storage.setMeta(StorageKeys.SELECTED_MODEL, newId as unknown as Record<string, unknown>)
  } catch (error) {
    console.error('[App] Failed to save model to storage:', error)
  }
})

// 监听 genuiEnabled 变化，自动保存到存储（使用 @wxt-dev/storage 统一存储接口）
watch(genuiEnabled, async (newValue) => {
  // 只有在初始化完成后才保存，避免在加载存储值时触发
  if (!isInitialized) {
    return
  }
  try {
    await storage.setMeta(StorageKeys.GENUI_ENABLED, newValue as unknown as Record<string, unknown>)
  } catch (error) {
    console.error('[App] Failed to save genui enabled to storage:', error)
  }
})

// 监听 localToolStorage 变化，自动保存到存储（使用 @wxt-dev/storage 统一存储接口）
watch(
  localToolStorage,
  async (newValue) => {
    // 只有在初始化完成后才保存，避免在加载存储值时触发
    if (!isInitialized) {
      return
    }
    try {
      await storage.setMeta(StorageKeys.LOCAL_TOOL_STORAGE, newValue as unknown as Record<string, unknown>)
    } catch (error) {
      console.error('[App] Failed to save local tool storage:', error)
    }
  },
  { deep: true }
)
const { isRecording, startRecording, stopRecording, toggleRecording } = useGenerateCode()
const isRecordModalVisible = ref(false)
const openRecordModal = () => {
  isRecordModalVisible.value = true
}

const closeRecordModal = () => {
  isRecordModalVisible.value = false
}

const handleStartRecording = async () => {
  try {
    await startRecording()
    showToast('录制操作成功: 已开始录制')
  } catch (error: any) {
    console.error('handleStartRecording error', error)
    showToast(`录制操作失败: ${error?.message || '未知错误'}`)
  }
}

const handleStopRecording = async () => {
  try {
    await stopRecording()
    showToast('录制操作成功: 已停止录制')
  } catch (error: any) {
    console.error('handleStopRecording error', error)
    showToast(`录制操作失败: ${error?.message || '未知错误'}`)
  }
}

// pillItems 依赖 sessionId 动态生成识别码与分享链接
const pillItems = computed(() => {
  const fallbackText = '会话尚未建立'
  // 确保 sessionId.value 是字符串类型，避免类型错误（使用 @wxt-dev/storage 后可能返回其他类型）
  const sessionIdStr = typeof sessionId.value === 'string' ? sessionId.value : ''
  const shortCode = sessionIdStr ? sessionIdStr.slice(-6) : fallbackText
  const shareUrl = sessionIdStr ? `${ROBOT_URL}?sessionId=${sessionIdStr}` : fallbackText
  const connectType = import.meta.env.VITE_WEB_AGENT_CONNECT_TYPE
  const agentRoot = connectType === 'sse' ? AGENT_ROOT + 'sse' : AGENT_ROOT + 'mcp'

  return [
    {
      id: 'copy-session-id',
      text: '复制会话信息',
      menus: [
        {
          id: 'copy-session-id-sort-code',
          text: `识别码：${shortCode}`
        },
        {
          id: 'copy-session-id-mcp-url',
          text: `Agent连接地址：${agentRoot}/?sessionId=${sessionIdStr}`
        },
        {
          id: 'copy-session-id-url',
          text: `遥控器地址：${shareUrl}`
        }
      ]
    }
  ]
})

// 处理药丸按钮菜单项点击事件，复制文本到剪贴板（中文注释：点击识别码或URL时自动复制到剪贴板，只复制冒号后面的内容）
async function handlePillItemClick(item: any) {
  if (!item?.text) {
    console.warn('handlePillItemClick: item.text 不存在')
    return
  }

  // 提取冒号后面的字符串（中文注释：如果文本包含冒号，只复制冒号后面的部分；否则复制整个文本）
  const textToCopy = item.text.includes('：')
    ? item.text.split('：')[1]?.trim() || item.text
    : item.text.includes(':')
      ? item.text.split(':')[1]?.trim() || item.text
      : item.text

  try {
    // 使用 Clipboard API 复制文本到剪贴板
    await navigator.clipboard.writeText(textToCopy)
    showToast('已复制到剪贴板')
  } catch (error) {
    showToast('复制到剪贴板失败')
  }
}

browser.runtime.onMessage.addListener((message) => {
  if (message.type === 'reload-sidepanel') {
    location.reload()
  }
})
</script>

<template>
  <div class="sidepanel-wrapper">
    <TinyRemoter
      ref="remoterRef"
      mode="chat-dialog"
      :browserExtensions="useBrowserExtensions"
      show
      fullscreen
      title=""
      :llmConfig="llmConfig"
      :llmConfigs="DEFAULT_MODEL_CONFIGS"
      v-model:selected-model-id="selectedModelId"
      v-model:genui-enabled="genuiEnabled"
      v-model:local-tool-storage="localToolStorage"
      inBrowserExt
      :custom-market-mcp-servers="customMarketMcpServers"
      :gen-ui-components="genUiComponents"
      :skills="skills"
    >
      <!-- todo: 后期等屏幕录制开发完成再放开 -->
      <!-- <template #header-actions>
        <button v-if="isDev" class="record-button" type="button" @click="openRecordModal">
          <span class="record-button__icon">+</span>
          自定义添加
        </button>
      </template> -->
      <template #suggestions>
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
      </template>
    </TinyRemoter>
    <RecordModal
      :visible="isRecordModalVisible"
      :isRecording="isRecording"
      @close="closeRecordModal"
      @start-recording="handleStartRecording"
      @stop-recording="handleStopRecording"
    />
  </div>
</template>

<style>
.tr-dropdown-menu__list-item {
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>

<style scoped>
:deep(.tr-container__header-operations) {
  .tr-icon-button {
    display: none;
  }

  .tr-icon-button:first-child,
  .tr-icon-button:nth-child(2) {
    display: flex;
  }
}

:deep(.tr-bubble__content-items) {
  p {
    font-size: 16px;
  }

  li {
    font-size: 14px;
    color: #555;
  }

  .tr-bubble__text {
    font-size: 16px;
  }
}

.chat-input-pills {
  margin-bottom: 8px;
  display: flex;
  gap: 16px;
}

.sidepanel-wrapper {
  position: relative;
}

.record-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  border-radius: 999px;
  border: 1px solid rgba(79, 140, 255, 0.4);
  background: rgba(79, 140, 255, 0.08);
  color: #2b5bd9;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition:
    background 0.2s ease,
    box-shadow 0.2s ease;
}

.record-button__icon {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #2b5bd9;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  line-height: 1;
}

.record-button:hover {
  background: rgba(79, 140, 255, 0.16);
  box-shadow: 0 4px 12px rgba(43, 91, 217, 0.2);
}
</style>
