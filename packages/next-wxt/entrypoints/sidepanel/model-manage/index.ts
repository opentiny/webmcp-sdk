/**
 * 模型配置入口
 * 根据 VITE_MODEL_CONFIG 环境变量选择 open（外部）或 inner（内部）配置
 */

import type { UnifiedModelConfig } from '@opentiny/next-remoter'
import { INTERNET_BASE_MODEL_CONFIGS } from './internet-model-config'
import { INTRANET_BASE_MODEL_CONFIGS } from './intranet-model-config'
import { getStoredToken } from '../utils/token-storage'
import { getCustomModels, getWebAgentUrl } from './model-storage'
import type { Component } from 'vue'
import { markRaw } from 'vue'

import IconModelDeepseek from '../icons/icon-model-deepseek.svg'
import IconModelAliyunBailian from '../icons/icon-model-aliyun-bailian.svg'
import IconModelBuiltInAI from '../icons/icon-model-built-in-ai.svg'

const BUILTIN_ICONS: Record<string, Component> = {
  deepseek: markRaw(IconModelDeepseek as unknown as Component),
  aliyun: markRaw(IconModelAliyunBailian as unknown as Component),
  'builtin-ai': markRaw(IconModelBuiltInAI as unknown as Component)
}

/** 是否为内部模式：VITE_MODEL_CONFIG=inner 或 MODE 包含 inner */
const isInnerMode = import.meta.env.VITE_MODEL_CONFIG === 'inner' || String(import.meta.env.MODE).includes('inner')

/** 当前模式下的基础模型配置 */
export const BASE_MODEL_CONFIGS: UnifiedModelConfig[] = isInnerMode
  ? INTRANET_BASE_MODEL_CONFIGS
  : INTERNET_BASE_MODEL_CONFIGS

/** 同步导出的默认配置（无 token，兼容旧用法） */
export const DEFAULT_MODEL_CONFIGS: UnifiedModelConfig[] = BASE_MODEL_CONFIGS

/**
 * 异步获取合并后的模型配置
 * inner 模式：为 agent.opentiny.design 的配置注入 TokenTab 缓存的 x-auth-token
 * open 模式：不注入 token
 */
export async function getModelConfigsWithToken(): Promise<UnifiedModelConfig[]> {
  const needToken = isInnerMode
  const token = needToken ? await getStoredToken() : ''
  const customModelsParams = await getCustomModels()
  const customWebAgentUrl = await getWebAgentUrl()

  const defaultModels = BASE_MODEL_CONFIGS.map((config) => {
    const finalConfig = { ...config }

    if (customWebAgentUrl && customWebAgentUrl.trim() !== '') {
      if (finalConfig.baseURL?.includes('https://agent.opentiny.design')) {
        finalConfig.baseURL = finalConfig.baseURL.replace('https://agent.opentiny.design', customWebAgentUrl)
      }
      if (finalConfig.genuiUrl?.includes('https://agent.opentiny.design')) {
        finalConfig.genuiUrl = finalConfig.genuiUrl.replace('https://agent.opentiny.design', customWebAgentUrl)
      }
    }

    if (!needToken) return finalConfig
    if (!token) return finalConfig
    const headers = { ...finalConfig.headers, 'x-auth-token': token }
    finalConfig.headers = headers
    return finalConfig
  })

  const customConfigs: UnifiedModelConfig[] = customModelsParams.map((c) => {
    let icon: any = c.iconValue
    if (c.iconType === 'builtin') {
      icon = BUILTIN_ICONS[c.iconValue] || null
    }

    return {
      id: c.id,
      label: c.label,
      model: c.model,
      providerType: c.providerType as any,
      apiKey: c.apiKey || '',
      baseURL: c.baseURL || '',
      genuiUrl: c.genuiUrl || '',
      useReActMode: c.useReActMode || false,
      icon
    }
  })

  return [...customConfigs, ...defaultModels]
}
