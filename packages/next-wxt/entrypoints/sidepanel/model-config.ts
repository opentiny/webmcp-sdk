/**
 * 默认模型配置
 * 用于传递给 TinyRemoter 组件的 llmConfigs prop
 * Default model configuration
 * Used for passing to TinyRemoter component's llmConfigs prop
 */

import type { UnifiedModelConfig } from '@opentiny/next-remoter'
import type { Component } from 'vue'
import { markRaw } from 'vue'
import { builtInAI } from '@built-in-ai/core'
// 从本地导入图标
// Import icons from local directory
import IconModelDeepseek from './icons/icon-model-deepseek.svg'
import IconModelAliyunBailian from './icons/icon-model-aliyun-bailian.svg'
import IconModelBuiltInAI from './icons/icon-model-built-in-ai.svg'

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
    // 多模态能力配置：启用文件上传功能
    multimodal: {
      supportImages: true, // 支持图片上传
      maxFileSize: 10, // 最大文件大小 10MB
      supportedMimeTypes: ['image/'] // 支持的文件类型：所有图片格式
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
