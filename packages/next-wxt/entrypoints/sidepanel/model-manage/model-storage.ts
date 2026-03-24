import { storage } from '@wxt-dev/storage'

export interface CustomModelConfig {
  id: string
  label: string
  model: string
  providerType: string
  apiKey?: string
  baseURL?: string
  genuiUrl?: string
  useReActMode?: boolean
  iconType: 'builtin' | 'url'
  iconValue: string
  isDefault?: boolean
}

export const CUSTOM_MODELS_KEY = 'local:NEXT_WXT_CUSTOM_MODELS'
export const WEB_AGENT_URL_KEY = 'local:NEXT_WXT_WEB_AGENT_URL'
export const CONNECT_TYPE_KEY = 'local:NEXT_WXT_CONNECT_TYPE'

export async function getCustomModels(): Promise<CustomModelConfig[] | null> {
  try {
    const data = (await storage.getItem(CUSTOM_MODELS_KEY)) as any
    if (data === null) return null
    if (Array.isArray(data)) return data
    if (typeof data === 'object') {
      // 如果存成了 { "0": {...}, "1": {...} } 格式，转回数组
      return Object.values(data) as CustomModelConfig[]
    }
    return []
  } catch {
    return null
  }
}

export async function setCustomModels(models: CustomModelConfig[]): Promise<void> {
  await storage.setItem(CUSTOM_MODELS_KEY, models)
}

export async function getWebAgentUrl(): Promise<string | null> {
  try {
    const data = await storage.getItem(WEB_AGENT_URL_KEY)
    if (data === null) return null
    return typeof data === 'string' ? data : ''
  } catch {
    return null
  }
}

export async function setWebAgentUrl(url: string): Promise<void> {
  await storage.setItem(WEB_AGENT_URL_KEY, url)
}
