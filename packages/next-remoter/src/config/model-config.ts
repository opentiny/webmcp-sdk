/**
 * 统一模型配置中心
 * 所有模型的配置信息都在这里定义，确保配置的一致性
 * Unified model configuration center
 * All model configurations are defined here to ensure consistency
 */

import IconModelAliyunBailian from '../components/icons/icon-model-aliyun-bailian.svg'
import IconModelDeepseek from '../components/icons/icon-model-deepseek.svg'
import type { UnifiedModelConfig } from '../types/model-config'
import type { Component } from 'vue'

/**
 * 统一的模型配置列表
 * Unified model configuration list
 */
export const UNIFIED_MODEL_CONFIGS: UnifiedModelConfig[] = [
  {
    id: 'deepseek-ai/DeepSeek-V3',
    label: 'DeepSeek-V3',
    apiKey: 'sk-trial',
    apiUrl: 'https://agent.opentiny.design/api/v1/ai',
    providerType: 'deepseek',
    icon: IconModelDeepseek as unknown as Component,
    isDefault: true
  },
  {
    id: 'deepseek-ai/DeepSeek-R1',
    label: 'DeepSeek-R1',
    apiKey: 'sk-trial',
    apiUrl: 'https://agent.opentiny.design/api/v1/ai',
    providerType: 'deepseek',
    icon: IconModelDeepseek as unknown as Component
  },
  {
    id: 'qwen-vl-max',
    label: 'qwen-vl-max',
    apiKey: 'sk-trial',
    apiUrl: 'https://agent.opentiny.design/api/v1/ai',
    providerType: 'deepseek',
    icon: IconModelAliyunBailian as unknown as Component
  }
]

/**
 * 获取默认模型配置
 * Get default model configuration
 */
export function getDefaultModelConfig(): UnifiedModelConfig {
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
