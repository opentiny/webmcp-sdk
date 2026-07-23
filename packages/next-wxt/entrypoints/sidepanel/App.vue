<script lang="ts" setup>
import { ref, type Ref, shallowReactive, computed, watch, onMounted, provide } from 'vue'
import { TinyRemoter, type UnifiedModelConfig } from '@opentiny/next-remoter'
import { useBrowserExtensions } from './composable/useBrowserExtensions'

import TinyUser from '@opentiny/vue-user'
import { useCustomMarketMcpServers } from './composable/useCustomMarketMcpServers'
import { getUnifiedSkills } from '@/utils/skills-unified'
import { RENDERER_SETTINGS_KEY } from '@opentiny/genui-sdk-vue'
import { CustomFunction } from '@/utils/customFunction'
import { getModelConfigsWithToken } from './model-manage'
import { getStorageItem, setStorageItem } from './utils/local-storage'
import { StorageKeys } from './utils/storage-keys'
import { getSnapshotManager } from './utils/snapshotManager'
import { getWebAgentUrl } from './model-manage/model-storage'
// 从统一入口读取 skills（built-in + 用户在 Options 中的覆盖）
const skills = ref<Record<string, string>>({})
// 模型配置（异步加载，含 TokenTab 缓存的 x-auth-token）
const modelConfigs = ref<UnifiedModelConfig[]>([])

const webAgentUrl = ref<string>('')
getWebAgentUrl().then((url) => {
  webAgentUrl.value = url || ''
})
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
// MCP 市场条目（与「已添加 → 浏览器内置工具」无关；页面 WebMCP 不走这里）
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
      @chat-stream-finish="clearHighlightPage"
      :agent-root="webAgentUrl"
    >
    </TinyRemoter>
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
</style>
