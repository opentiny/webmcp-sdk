import type { UnifiedModelConfig } from '@opentiny/next-remoter'
import type { Component } from 'vue'
import IconModelDeepseek from './icons/icon-model-deepseek.svg'

/**
 * 默认的模型配置列表
 * Default model configuration list
 */
export const INNER_DEFAULT_MODEL_CONFIGS: UnifiedModelConfig[] = [
  {
    id: 'deepseek-ai/DeepSeek-R1',
    label: 'DeepSeek-R2',
    model: 'deepseek-ai/DeepSeek-R1',
    apiKey: 'sk-trial',
    baseURL: 'https://agent.opentiny.design/api/v1/ai',
    providerType: 'deepseek',
    useReActMode: false,
    // 自定义请求 Header
    headers: {
      'x-auth-token': 'my-value'
    },
    icon: IconModelDeepseek as unknown as Component
  }
]
