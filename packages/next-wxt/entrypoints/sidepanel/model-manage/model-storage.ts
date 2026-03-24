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
    const data = await storage.getItem(CUSTOM_MODELS_KEY)
    if (data === null) return null
    
    // 强制转换为数组或对象进行初步检查
    let models: any[] = []
    if (Array.isArray(data)) {
      models = data
    } else if (typeof data === 'object' && data !== null) {
      // 兼容旧版的索引对象格式 { "0": {...} }
      models = Object.values(data)
    } else {
      return null
    }

    // 结构验证：确保至少有核心字段且是数组
    const isValid = models.every(m => m && typeof m === 'object' && m.id && m.label)
    return isValid ? (models as CustomModelConfig[]) : null
  } catch {
    return null
  }
}

export async function setCustomModels(models: CustomModelConfig[]): Promise<void> {
  await storage.setItem(CUSTOM_MODELS_KEY, models)
}

/**
 * 获取标准化的连接类型
 * 确保 'sse', 'mcp', 'socket', 'stream' 都能正确映射到 SDK 期望的类型
 */
export async function getConnectType(): Promise<'sse' | 'socket' | 'stream'> {
  const storedType = await storage.getItem<string>(CONNECT_TYPE_KEY)
  const envType = import.meta.env.VITE_WEB_AGENT_CONNECT_TYPE
  const finalType = (storedType || envType || 'stream').toLowerCase()

  if (finalType === 'sse') return 'sse'
  if (finalType === 'socket') return 'socket'
  // stream 和 mcp 都映射为 stream (MCP-over-HTTP)
  if (finalType === 'stream' || finalType === 'mcp') return 'stream'
  
  return 'stream'
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
