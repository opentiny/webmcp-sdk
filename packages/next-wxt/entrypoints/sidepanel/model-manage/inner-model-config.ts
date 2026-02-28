/**
 * 内部（inner）模型配置
 * 用于 inner / inner-prod 模式，需 x-auth-token 认证
 */

import type { UnifiedModelConfig } from '@opentiny/next-remoter'
import type { Component } from 'vue'
import { markRaw } from 'vue'
import IconModelDeepseek from '../icons/icon-model-deepseek.svg'

const AGENT_BASE_URL = 'https://agent.opentiny.design'

export const INNER_BASE_MODEL_CONFIGS: UnifiedModelConfig[] = [
  {
    id: 'deepseek-ai/DeepSeek-R1',
    label: 'DeepSeek-R1',
    model: 'deepseek-ai/DeepSeek-R1',
    apiKey: 'sk-trial',
    baseURL: `${AGENT_BASE_URL}/api/v1/ai`,
    providerType: 'deepseek',
    useReActMode: false,
    headers: { 'x-auth-token': '' },
    icon: markRaw(IconModelDeepseek as unknown as Component),
    isDefault: true
  }
]
