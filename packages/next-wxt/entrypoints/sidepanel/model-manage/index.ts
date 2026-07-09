/**
 * 模型配置入口
 * 根据 VITE_MODEL_CONFIG 环境变量选择 open（外部）或 inner（内部）配置
 */

import type { UnifiedModelConfig } from '@opentiny/next-remoter'
import { INTERNET_BASE_MODEL_CONFIGS } from './internet-model-config'
import { INTRANET_BASE_MODEL_CONFIGS } from './intranet-model-config'
import { getStoredToken } from '../utils/token-storage'
import { getCustomModels, getWebAgentUrl, setCustomModels } from './model-storage'
import type { Component } from 'vue'
import { markRaw } from 'vue'

import { AGENT_ROOT } from '../const'
export const DEFAULT_WEB_AGENT_URL = (AGENT_ROOT || 'http://127.0.0.1:3000/api/v1/webmcp').replace(/\/$/, '')

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
 * 初始化默认模型到本地缓存（如果尚未初始化）
 */
export async function initializeDefaultModelsIfNeeded(): Promise<any[]> {
  const customModelsParams = await getCustomModels()
  console.log('[initializeDefaultModelsIfNeeded] customModels IDs from storage:', customModelsParams?.map(m => m.id))
  if (customModelsParams !== null) {
    return customModelsParams
  }

  console.log('[initializeDefaultModelsIfNeeded] Initializing with BASE_MODEL_CONFIGS...')
  const initialModels = BASE_MODEL_CONFIGS.map(b => {
    let iconType: 'builtin' | 'url' = 'builtin'
    let iconValue = 'builtin-ai'
    
    if (b.providerType === 'deepseek') iconValue = 'deepseek'
    else if (b.label?.toLowerCase().includes('qwen') || b.label?.includes('bailian')) iconValue = 'aliyun'
    else if (b.id === 'built-in-ai') iconValue = 'builtin-ai'

    return {
      id: b.id,
      label: b.label || b.id,
      model: b.model || '',
      providerType: b.providerType as string,
      apiKey: b.apiKey || '',
      baseURL: b.baseURL || '',
      genuiUrl: b.genuiUrl || '',
      useReActMode: b.useReActMode || false,
      iconType,
      iconValue,
      isDefault: b.isDefault || false
    }
  })
  await setCustomModels(initialModels)
  return initialModels
}

/**
 * 异步获取合并后的模型配置
 * inner 模式：为 agent.opentiny.design 的配置注入 TokenTab 缓存的 x-auth-token
 * open 模式：不注入 token
 */
export async function getModelConfigsWithToken(): Promise<UnifiedModelConfig[]> {
  const needToken = isInnerMode
  const token = needToken ? await getStoredToken() : ''
  const customModelsParams = await initializeDefaultModelsIfNeeded()
  const customWebAgentUrl = await getWebAgentUrl()

  const customConfigs: UnifiedModelConfig[] = customModelsParams.map((c) => {
    const baseModel = BASE_MODEL_CONFIGS.find(b => b.id === c.id)

    let icon: any = c.iconValue
    if (c.iconType === 'builtin') {
      icon = BUILTIN_ICONS[c.iconValue] || null
    }

    const finalConfig: UnifiedModelConfig = {
      ...(baseModel || {}),
      id: c.id,
      label: c.label,
      model: c.model,
      providerType: c.providerType as any,
      apiKey: c.apiKey || '',
      baseURL: c.baseURL || '',
      genuiUrl: c.genuiUrl || '',
      useReActMode: c.useReActMode || false,
      icon,
      isDefault: c.isDefault || false
    }

    if (customWebAgentUrl && customWebAgentUrl.trim() !== '') {
      try {
        const customUrl = new URL(customWebAgentUrl)
        const hasPath = customUrl.pathname && customUrl.pathname.length > 1
        
        const replaceUrl = (originalUrl?: string) => {
          if (!originalUrl?.includes(DEFAULT_WEB_AGENT_URL)) return originalUrl
          
          if (hasPath) {
            // 如果用户输入了完整路径，则全量替换
            return originalUrl.replace(DEFAULT_WEB_AGENT_URL, customWebAgentUrl.trim().replace(/\/$/, ''))
          } else {
            // 如果只有域名，则只替换域名部分，保留后缀路径
            return originalUrl.replace(/^https?:\/\/[^\/]+/, customUrl.origin)
          }
        }

        finalConfig.baseURL = replaceUrl(finalConfig.baseURL)
        finalConfig.genuiUrl = replaceUrl(finalConfig.genuiUrl)
      } catch (e) {
        // 无效 URL 则不替换
      }
    }

    if (needToken && token) {
      finalConfig.headers = { ...finalConfig.headers, 'x-auth-token': token }
    }

    return finalConfig
  })

  return customConfigs
}
