<script lang="ts" setup>
import { ref, type Ref, shallowReactive, computed, watch, onMounted } from 'vue'
import { TinyRemoter, type UnifiedModelConfig } from '@opentiny/next-remoter'
import { useBrowserExtensions } from './composable/useBrowserExtensions'

import TinyUser from '@opentiny/vue-user'
import { useCustomMarketMcpServers } from './composable/useCustomMarketMcpServers'
import { useGenerateCode } from './composable/useGenerateCode'
import RecordModal from './components/RecordModal.vue'
import { getUnifiedSkills } from '@/utils/skills-unified'
import { RENDERER_SETTINGS_KEY } from '@opentiny/genui-sdk-vue'
import { CustomFunction } from '@/utils/customFunction'
import { getModelConfigsWithToken } from './model-manage'
import { getStorageItem, setStorageItem } from './utils/local-storage'
import { StorageKeys } from './utils/storage-keys'
import { getSnapshotManager } from './accessibility/utils'

// 从统一入口读取 skills（built-in + 用户在 Options 中的覆盖）
const skills = ref<Record<string, string>>({})
// 模型配置（异步加载，含 TokenTab 缓存的 x-auth-token）
const modelConfigs = ref<UnifiedModelConfig[]>([])
onMounted(async () => {
  try {
    skills.value = await getUnifiedSkills()
    modelConfigs.value = await getModelConfigsWithToken()
  } catch (error) {
    console.error('加载 skills 或模型配置失败', error)
    modelConfigs.value = []
  }
})

const remoterRef = ref() as Ref<InstanceType<typeof TinyRemoter>>
useBrowserExtensions(remoterRef)

// 注重生成式UI所要求的，自定义Function
provide(RENDERER_SETTINGS_KEY, {
  Function: CustomFunction
})

const genUiComponents = shallowReactive({ TinyUser })
// 汇总自定义 MCP Server 配置（中文注释：用于传给 TinyRemoter 的插件市场）
const customMarketMcpServers = useCustomMarketMcpServers()

// 管理选中的模型 ID（从存储读取，变化时保存）
// modelConfigs 异步加载，初始用 storedModel，加载完成后由 watch 校验并兜底
const storedModel = getStorageItem<string>(StorageKeys.SELECTED_MODEL)
const selectedModelId = ref<string>(storedModel ?? '')
// modelConfigs 加载完成后，校验 selectedModelId 是否在列表中（含初始为空时的兜底）
watch(
  modelConfigs,
  (configs) => {
    if (!configs.length) return
    const defaultId = configs.find((c) => c.isDefault)?.id ?? configs[0].id
    if (!configs.some((c) => c.id === selectedModelId.value)) {
      selectedModelId.value = defaultId
    }
  },
  { immediate: true }
)

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

browser.runtime.onMessage.addListener((message) => {
  if (message.type === 'reload-sidepanel') {
    location.reload()
  }
})

// 每一轮对话，都要清除一下页面高亮
const clearHighlightPage = async () => {
  try {
    const { manager } = await getSnapshotManager()
    await manager.highlightPage(false)
  } catch (error) {
    console.error('清除页面高亮失败', error)
  }
}
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
      :llmConfig="{
        baseURL: 'https://api.deepseek.com/v1',
        apiKey: 'sk-08ef2acffb774302aa9eb6f802ddd05a',
        model: 'deepseek-chat'
      }"
      v-model:genUiAble="genuiEnabled"
      v-model:enabled-tools="enabledTools"
      inBrowserExt
      :custom-market-mcp-servers="customMarketMcpServers"
      :gen-ui-components="genUiComponents"
      :skills="skills"
      @chat-stream-finish="clearHighlightPage"
    >
      <template #header-actions>
        <button v-if="false" class="record-button" type="button" @click="openRecordModal">
          <span class="record-button__icon">+</span>
          自定义添加
        </button>
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
  div[type='markdown'] {
    font-size: 16px;
    margin: 10px 0;
  }

  p {
    font-size: 16px;
    margin: 10px 0;
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
