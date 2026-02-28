/**
 * 外部（open）模型配置
 * 用于 open / open-prod 模式
 */

import type { UnifiedModelConfig } from '@opentiny/next-remoter'
import type { Component } from 'vue'
import { markRaw } from 'vue'
import { builtInAI } from '@built-in-ai/core'
import IconModelDeepseek from '../icons/icon-model-deepseek.svg'
import IconModelAliyunBailian from '../icons/icon-model-aliyun-bailian.svg'
import IconModelBuiltInAI from '../icons/icon-model-built-in-ai.svg'

const AGENT_BASE_URL = 'https://agent.opentiny.design'

export const OPEN_BASE_MODEL_CONFIGS: UnifiedModelConfig[] = [
  {
    id: 'deepseek-ai/DeepSeek-V3',
    label: 'DeepSeek-V3',
    model: 'deepseek-ai/DeepSeek-V3',
    apiKey: 'sk-trial',
    baseURL: `${AGENT_BASE_URL}/api/v1/ai`,
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
    baseURL: `${AGENT_BASE_URL}/api/v1/ai`,
    providerType: 'deepseek',
    useReActMode: false,
    headers: { 'X-Custom-Header': 'my-value', 'X-Trace-Id': 'abc-123' },
    icon: IconModelDeepseek as unknown as Component
  },
  {
    id: 'qwen-vl-max',
    label: 'qwen-vl-max',
    model: 'qwen-vl-max',
    apiKey: 'sk-trial',
    baseURL: `${AGENT_BASE_URL}/api/v1/ai`,
    providerType: 'deepseek',
    useReActMode: true,
    multimodal: {
      supportImages: true,
      maxFileSize: 10,
      supportedMimeTypes: ['image/']
    },
    icon: markRaw(IconModelAliyunBailian as unknown as Component)
  },
  {
    id: 'built-in-ai',
    label: 'built-in-ai',
    model: 'built-in-ai',
    llm: builtInAI as unknown as any,
    useReActMode: true,
    icon: markRaw(IconModelBuiltInAI as unknown as Component)
  }
]
