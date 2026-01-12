/**
 * 默认模型配置
 * 用于传递给 TinyRemoter 组件的 llmConfigs prop
 * Default model configuration
 * Used for passing to TinyRemoter component's llmConfigs prop
 */

import type { UnifiedModelConfig } from '@opentiny/next-remoter'
import type { Component } from 'vue'
import { markRaw } from 'vue'

// 从本地导入图标
// Import icons from local directory
import IconModelDeepseek from './icons/icon-model-deepseek.svg'
import IconModelAliyunBailian from './icons/icon-model-aliyun-bailian.svg'

/**
 * 默认的模型配置列表
 * Default model configuration list
 */
export const DEFAULT_MODEL_CONFIGS: UnifiedModelConfig[] = [
  {
    id: 'deepseek-ai/DeepSeek-V3',
    label: 'DeepSeek-V3',
    model: 'deepseek-ai/DeepSeek-V3',
    apiKey: 'sk-trial',
    baseURL: 'https://agent.opentiny.design/api/v1/ai',
    providerType: 'deepseek',
    useReActMode: false,
    icon: markRaw(IconModelDeepseek as unknown as Component),
    isDefault: true
  },
  {
    id: 'deepseek-ai/DeepSeek-R1',
    label: 'DeepSeek-R1',
    model: 'deepseek-ai/DeepSeek-R1',
    apiKey: 'sk-trial',
    baseURL: 'https://agent.opentiny.design/api/v1/ai',
    providerType: 'deepseek',
    useReActMode: false,
    icon: IconModelDeepseek as unknown as Component
  },
  {
    id: 'qwen-vl-max',
    label: 'qwen-vl-max',
    model: 'qwen-vl-max',
    apiKey: 'sk-trial',
    baseURL: 'https://agent.opentiny.design/api/v1/ai',
    providerType: 'deepseek',
    useReActMode: true,
    icon: markRaw(IconModelAliyunBailian as unknown as Component)
  }
]
