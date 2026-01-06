/**
 * 模型状态管理 Composable
 * Model state management composable
 */

import { computed, ref, watch } from 'vue'
import { UNIFIED_MODEL_CONFIGS, getDefaultModelConfig } from '../config/model-config'
import type { UnifiedModelConfig } from '../types/model-config'
import { storage, StorageKeys } from '../utils/storage-manager'

/**
 * 获取初始模型 ID
 * 优先从存储读取，失败则使用默认模型
 * Get initial model ID
 * Read from storage first, fallback to default model
 */
const getInitialModelId = (): string => {
  try {
    const modelId = storage.getItem<string>(StorageKeys.SELECTED_MODEL)
    if (modelId) {
      // 验证模型 ID 是否存在于配置列表中
      if (UNIFIED_MODEL_CONFIGS.some((config) => config.id === modelId)) {
        return modelId
      }
    }
  } catch (error) {
    console.warn('[useModel] Failed to parse stored model:', error)
  }

  // 如果读取失败或模型不存在，使用默认模型
  const defaultConfig = getDefaultModelConfig()
  const defaultId = defaultConfig.id
  storage.setItem(StorageKeys.SELECTED_MODEL, defaultId)
  return defaultId
}

// 全局响应式状态：当前选中的模型 ID
const selectedModelId = ref<string>(getInitialModelId())

// 监听模型 ID 变化，自动同步到存储
watch(selectedModelId, (newId) => {
  try {
    storage.setItem(StorageKeys.SELECTED_MODEL, newId)
    console.log('[useModel] Model changed to:', newId)
  } catch (error) {
    console.error('[useModel] Failed to save model to storage:', error)
  }
})

/**
 * 统一的模型管理 composable
 * 提供模型选择和配置管理功能
 * Unified model management composable
 * Provides model selection and configuration management
 */
export default function useModel() {
  // 当前选中的完整模型配置
  const selectedModel = computed<UnifiedModelConfig | undefined>(() => {
    return UNIFIED_MODEL_CONFIGS.find((config) => config.id === selectedModelId.value)
  })

  // 所有可用的模型配置列表
  const availableModels = computed<UnifiedModelConfig[]>(() => {
    return UNIFIED_MODEL_CONFIGS
  })

  /**
   * 设置选中的模型
   * Set selected model
   */
  const setSelectedModel = (modelId: string) => {
    const model = UNIFIED_MODEL_CONFIGS.find((config) => config.id === modelId)
    if (model) {
      selectedModelId.value = modelId
    } else {
      console.warn(`[useModel] Model not found: ${modelId}`)
    }
  }

  return {
    /** 当前选中的模型 ID Current selected model ID */
    selectedModelId,
    /** 当前选中的完整模型配置 Current selected model configuration */
    selectedModel,
    /** 所有可用的模型配置列表 All available model configurations */
    availableModels,
    /** 设置选中的模型 Set selected model */
    setSelectedModel
  }
}
