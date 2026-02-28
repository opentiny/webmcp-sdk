<script lang="ts" setup>
import { ref, type Ref, shallowReactive, computed, watch, onMounted } from 'vue'
import { TinyRemoter, type UnifiedModelConfig } from '@opentiny/next-remoter'
import { useBrowserExtensions } from './composable/useBrowserExtensions'
import { useWebAgentServer } from './composable/useWebAgentServer'
import TinyUser from '@opentiny/vue-user'
import { useCustomMarketMcpServers } from './composable/useCustomMarketMcpServers'
import { TrSuggestionPillButton, TrDropdownMenu } from '@opentiny/tiny-robot'
import { AGENT_ROOT, ROBOT_URL } from './const'
import { useGenerateCode } from './composable/useGenerateCode'
import RecordModal from './components/RecordModal.vue'
import QrCodeDialog from './components/QrCodeDialog.vue'
import { getUnifiedSkills } from '@/utils/skills-unified'
import { RENDERER_SETTINGS_KEY } from '@opentiny/genui-sdk-vue'
import { CustomFunction } from '@/utils/customFunction'
import { getModelConfigsWithToken } from './model-manage'
import { getStorageItem, setStorageItem } from './utils/local-storage'
import { StorageKeys } from './utils/storage-keys'

// 从统一入口读取 skills（built-in + 用户在 Options 中的覆盖）
const skills = ref<Record<string, string>>({})
// 模型配置（异步加载，含 TokenTab 缓存的 x-auth-token）
const modelConfigs = ref<UnifiedModelConfig[]>([])
onMounted(async () => {
  skills.value = await getUnifiedSkills()
  modelConfigs.value = await getModelConfigsWithToken()
})

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

// 管理选中的模型 ID（从存储读取，变化时保存）
// modelConfigs 异步加载，初始为空，需用可选链避免 defaultModel 为 undefined 时报错
const defaultModel = modelConfigs.value.find((config) => config.isDefault) || modelConfigs.value[0]
const storedModel = getStorageItem<string>(StorageKeys.SELECTED_MODEL)
const selectedModelId = ref<string>(
  storedModel && modelConfigs.value.some((config) => config.id === storedModel) ? storedModel : (defaultModel?.id ?? '')
)
// modelConfigs 加载完成后，校验 selectedModelId 是否在列表中（含初始为空时的兜底）
watch(modelConfigs, (configs) => {
  if (!configs.length) return
  const defaultId = configs.find((c) => c.isDefault)?.id ?? configs[0].id
  if (!selectedModelId.value || !configs.some((c) => c.id === selectedModelId.value)) {
    selectedModelId.value = defaultId
  }
})

// 管理生成式UI启用状态（从存储读取，变化时保存）
// 使用 localStorage 同步读取，可以在初始化时直接获取值
const storedGenui = getStorageItem<boolean>(StorageKeys.GENUI_ENABLED)
const genuiEnabled = ref<boolean>(storedGenui ?? false)

// 管理默认启用的工具状态（从存储读取，变化时保存）
// 使用 localStorage 同步读取，可以在初始化时直接获取值
const storedEnabledTools = getStorageItem<Record<string, boolean>>(StorageKeys.LOCAL_TOOL_STORAGE)
const enabledTools = ref<Record<string, boolean>>(storedEnabledTools || {})

// 监听 selectedModelId 变化，自动保存到存储（使用 localStorage 同步存储）
watch(selectedModelId, (newId) => {
  setStorageItem(StorageKeys.SELECTED_MODEL, newId)
})

// 监听 genuiEnabled 变化，自动保存到存储（使用 localStorage 同步存储）
watch(genuiEnabled, (newValue) => {
  setStorageItem(StorageKeys.GENUI_ENABLED, newValue)
})

// 监听 enabledTools 变化，自动保存到存储（使用 localStorage 同步存储）
watch(
  enabledTools,
  (newValue) => {
    setStorageItem(StorageKeys.LOCAL_TOOL_STORAGE, newValue)
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

// 二维码对话框状态管理
const isQrCodeDialogVisible = ref(false)
const qrCodeUrl = ref('')
const qrCodeTitle = ref('')

const openQrCodeDialog = (url: string, title: string = '扫码访问') => {
  qrCodeUrl.value = url
  qrCodeTitle.value = title
  isQrCodeDialogVisible.value = true
}

const closeQrCodeDialog = () => {
  isQrCodeDialogVisible.value = false
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
        },
        {
          id: 'show-qrcode',
          text: '展示遥控器二维码'
        }
      ]
    }
  ]
})

// 处理药丸按钮菜单项点击事件，复制文本到剪贴板或展示二维码（中文注释：点击识别码或URL时自动复制到剪贴板，点击展示二维码时弹出对话框）
async function handlePillItemClick(item: any) {
  if (!item?.text) {
    console.warn('handlePillItemClick: item.text 不存在')
    return
  }

  // 如果是展示二维码菜单项，则打开二维码对话框
  if (item.id === 'show-qrcode') {
    const sessionIdStr = typeof sessionId.value === 'string' ? sessionId.value : ''
    const shareUrl = sessionIdStr ? `${ROBOT_URL}?sessionId=${sessionIdStr}` : ''
    if (shareUrl && shareUrl !== '会话尚未建立') {
      openQrCodeDialog(shareUrl, '遥控器地址二维码')
    } else {
      showToast('会话尚未建立，无法生成二维码')
    }
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
      :llmConfigs="modelConfigs"
      v-model:selected-model-id="selectedModelId"
      v-model:genUiAble="genuiEnabled"
      v-model:enabled-tools="enabledTools"
      inBrowserExt
      :custom-market-mcp-servers="customMarketMcpServers"
      :gen-ui-components="genUiComponents"
      :skills="skills"
    >
      <template #header-actions>
        <button v-if="false" class="record-button" type="button" @click="openRecordModal">
          <span class="record-button__icon">+</span>
          自定义添加
        </button>
      </template>
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
    <QrCodeDialog :visible="isQrCodeDialogVisible" :url="qrCodeUrl" :title="qrCodeTitle" @close="closeQrCodeDialog" />
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
