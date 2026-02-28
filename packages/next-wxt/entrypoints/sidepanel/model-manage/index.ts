/**
 * 模型配置入口
 * 根据 VITE_MODEL_CONFIG 环境变量选择 open（外部）或 inner（内部）配置
 */

import type { UnifiedModelConfig } from '@opentiny/next-remoter'
import { OPEN_BASE_MODEL_CONFIGS } from './open-model-config'
import { INNER_BASE_MODEL_CONFIGS } from './inner-model-config'
import { getStoredToken } from '../utils/token-storage'

/** 使用 agent.opentiny.design 的配置需注入 x-auth-token */
const AGENT_BASE_URL = 'https://agent.opentiny.design'

/** 是否为内部模式：VITE_MODEL_CONFIG=inner 或 MODE 包含 inner */
const isInnerMode =
  import.meta.env.VITE_MODEL_CONFIG === 'inner' ||
  String(import.meta.env.MODE).includes('inner')

/** 当前模式下的基础模型配置 */
export const BASE_MODEL_CONFIGS: UnifiedModelConfig[] = isInnerMode
  ? INNER_BASE_MODEL_CONFIGS
  : OPEN_BASE_MODEL_CONFIGS

/** 同步导出的默认配置（无 token，兼容旧用法） */
export const DEFAULT_MODEL_CONFIGS: UnifiedModelConfig[] = BASE_MODEL_CONFIGS

/**
 * 异步获取合并后的模型配置，注入 TokenTab 缓存的 x-auth-token
 */
export async function getModelConfigsWithToken(): Promise<UnifiedModelConfig[]> {
  const token = await getStoredToken()
  return BASE_MODEL_CONFIGS.map((config) => {
    const baseURL = config.baseURL ?? ''
    if (!baseURL.includes(AGENT_BASE_URL)) return { ...config }
    const headers = { ...config.headers, 'x-auth-token': token || '' }
    return { ...config, headers }
  })
}
