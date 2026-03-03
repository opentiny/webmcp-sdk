/**
 * 内部（inner）模型配置
 * 用于 inner / inner-prod 模式，需 x-auth-token 认证
 */

import type { UnifiedModelConfig } from '@opentiny/next-remoter'
import type { Component } from 'vue'
import { markRaw } from 'vue'
import IconModelDeepseek from '../icons/icon-model-deepseek.svg'

const AGENT_BASE_URL = 'https://agent.opentiny.design'

export const INTRANET_BASE_MODEL_CONFIGS: UnifiedModelConfig[] = [
  {
    id: 'deepseek-ai/DeepSeek-V3',
    label: 'DeepSeek-V3',
    model: 'deepseek-ai/DeepSeek-V3',
    apiKey: 'sk-trial',
    baseURL: `${AGENT_BASE_URL}/api/v1/ai`,
    providerType: 'deepseek',
    useReActMode: false,
    headers: { 'x-auth-token': '' },
    icon: markRaw(IconModelDeepseek as unknown as Component),
    isDefault: true
  }
]
