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
}

export const CUSTOM_MODELS_KEY = 'local:NEXT_WXT_CUSTOM_MODELS'
export const WEB_AGENT_URL_KEY = 'local:NEXT_WXT_WEB_AGENT_URL'

export async function getCustomModels(): Promise<CustomModelConfig[]> {
  try {
    const data = await storage.getItem(CUSTOM_MODELS_KEY)
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

export async function setCustomModels(models: CustomModelConfig[]): Promise<void> {
  await storage.setItem(CUSTOM_MODELS_KEY, models)
}

export async function getWebAgentUrl(): Promise<string> {
  try {
    const data = await storage.getItem(WEB_AGENT_URL_KEY)
    return typeof data === 'string' ? data : ''
  } catch {
    return ''
  }
}

export async function setWebAgentUrl(url: string): Promise<void> {
  await storage.setItem(WEB_AGENT_URL_KEY, url)
}
