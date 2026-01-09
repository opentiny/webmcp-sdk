/**
 * 统一模型配置中心
 * 所有模型的配置信息都在这里定义，确保配置的一致性
 * Unified model configuration center
 * All model configurations are defined here to ensure consistency
 */

import type { UnifiedModelConfig } from '../types/model-config'

// 全局模型配置列表（由外部通过 setModelConfigs 设置）
// Global model configuration list (set by external through setModelConfigs)
let UNIFIED_MODEL_CONFIGS: UnifiedModelConfig[] = []

/**
 * 设置模型配置列表（由外部传入）
 * Set model configuration list (provided externally)
 * @param configs 模型配置数组 Model configuration array
 */
export function setModelConfigs(configs: UnifiedModelConfig[]) {
  if (configs && configs.length > 0) {
    UNIFIED_MODEL_CONFIGS = configs
  }
}

/**
 * 获取当前的模型配置列表
 * Get current model configuration list
 */
export function getModelConfigs(): UnifiedModelConfig[] {
  return UNIFIED_MODEL_CONFIGS
}

/**
 * 获取默认模型配置
 * Get default model configuration
 * @throws {Error} 如果配置列表为空，抛出错误 If configuration list is empty, throw error
 */
export function getDefaultModelConfig(): UnifiedModelConfig {
  if (UNIFIED_MODEL_CONFIGS.length === 0) {
    throw new Error(
      '[getDefaultModelConfig] No model configurations available. Please provide llmConfigs prop to TinyRemoter component.'
    )
  }
  const defaultModel = UNIFIED_MODEL_CONFIGS.find((config) => config.isDefault)
  return defaultModel || UNIFIED_MODEL_CONFIGS[0]
}

/**
 * 根据模型 ID 获取模型配置
 * Get model configuration by model ID
 */
export function getModelConfig(modelId: string): UnifiedModelConfig | undefined {
  return UNIFIED_MODEL_CONFIGS.find((config) => config.id === modelId)
}
