import { computed, ref, watch, type Ref } from 'vue'
import type { UnifiedModelConfig } from '../types/model-config'

/**
 * 统一的模型管理 composable
 * 提供模型选择和配置管理功能
 * Unified model management composable
 * Provides model selection and configuration management
 * @param modelConfigs 外部传入的模型配置列表（必需）External model configuration list (required)
 * @param initialModelId 初始模型 ID（可选，从外部传入，支持 Ref<string | undefined>）Initial model ID (optional, provided externally, supports Ref<string | undefined>)
 * @param onModelChange 模型变化回调函数（可选，用于通知外部）Model change callback (optional, for notifying external)
 */
export default function useModel(
  modelConfigs?: Ref<UnifiedModelConfig[]> | UnifiedModelConfig[],
  initialModelId?: Ref<string | undefined> | Ref<string> | string,
  onModelChange?: (modelId: string) => void
) {
  // 获取当前可用的模型配置列表
  const currentModelConfigs = computed<UnifiedModelConfig[]>(() => {
    if (modelConfigs) {
      // 如果传入的是 Ref，则使用其 value；否则直接使用数组
      return Array.isArray(modelConfigs) ? modelConfigs : modelConfigs.value
    }
    // 如果没有传入配置，返回空数组
    console.warn('[useModel] No model configurations provided. Please pass modelConfigs prop.')
    return []
  })

  // 获取初始模型 ID
  const getInitialModelId = (): string => {
    const configs = currentModelConfigs.value

    // 如果配置列表为空，抛出错误
    if (configs.length === 0) {
      throw new Error(
        '[useModel] No model configurations available. Please provide llmConfigs prop to TinyRemoter component.'
      )
    }

    // 如果外部传入了初始 ID，优先使用
    if (initialModelId) {
      const id = typeof initialModelId === 'string' ? initialModelId : initialModelId.value
      if (id && configs.some((config) => config.id === id)) {
        return id
      }
    }

    // 否则查找默认模型（isDefault 为 true 的模型）
    const defaultModel = configs.find((config) => config.isDefault)
    if (defaultModel) {
      return defaultModel.id
    }

    // 如果没有默认模型，返回第一个配置的 ID
    return configs[0].id
  }

  // 内部状态：当前选中的模型 ID
  const selectedModelId = ref<string>(getInitialModelId())

  // 如果外部传入了 initialModelId 且是 Ref，监听其变化
  if (initialModelId && typeof initialModelId !== 'string') {
    watch(
      initialModelId,
      (newId) => {
        if (newId && currentModelConfigs.value.some((config) => config.id === newId)) {
          selectedModelId.value = newId
        }
      },
      { immediate: true }
    )
  }

  // 监听内部 selectedModelId 变化，通知外部
  watch(selectedModelId, (newId) => {
    if (onModelChange) {
      onModelChange(newId)
    }
  })

  // 当前选中的完整模型配置
  const selectedModel = computed<UnifiedModelConfig | undefined>(() => {
    return currentModelConfigs.value.find((config) => config.id === selectedModelId.value)
  })

  // 所有可用的模型配置列表
  const availableModels = computed<UnifiedModelConfig[]>(() => {
    return currentModelConfigs.value
  })

  /**
   * 设置选中的模型
   * Set selected model
   */
  const setSelectedModel = (modelId: string) => {
    const model = currentModelConfigs.value.find((config) => config.id === modelId)
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
