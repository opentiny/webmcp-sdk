import type { ProviderV2 } from '@ai-sdk/provider'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'

/**
 * 自定义 Provider 配置选项
 */
export interface CustomProviderOptions {
  /** API 密钥，可选 */
  apiKey?: string
  /** API 基础 URL，必需 */
  baseURL: string
  /** 自定义请求头 */
  headers?: Record<string, string>
  /** 自定义 fetch 函数，可用于代理或拦截请求 */
  fetch?: typeof fetch
  /** API 路径，默认为 /chat/completions */
  apiPath?: string
}

/**
 * 创建自定义 Provider
 *
 * 这个 Provider 兼容 OpenAI 格式的 API，可以适配大多数兼容 OpenAI API 的大模型服务
 * 使用 @ai-sdk/openai-compatible 包来处理流解析，确保与 AI SDK 完全兼容
 *
 * @param options Provider 配置选项
 * @returns ProviderV2 实例
 */
export function createCustomProvider(options: CustomProviderOptions): ProviderV2 {
  const { baseURL, apiKey, headers = {}, fetch: customFetch = fetch, apiPath = '/chat/completions' } = options

  // 确保 baseURL 不以斜杠结尾
  const normalizedBaseURL = baseURL.endsWith('/') ? baseURL.slice(0, -1) : baseURL
  // 如果 apiPath 是 /chat/completions，需要去掉它，因为 createOpenAICompatibleProvider 会自动添加
  const basePath = apiPath === '/chat/completions' ? '' : apiPath.replace(/\/chat\/completions$/, '')
  const fullBaseURL = basePath ? `${normalizedBaseURL}${basePath}` : normalizedBaseURL

  // 使用 @ai-sdk/openai-compatible 创建兼容 OpenAI API 的 Provider
  // 这个包已经处理好了所有的流解析逻辑，确保与 AI SDK 完全兼容
  return createOpenAICompatible({
    name: 'custom-provider',
    baseURL: fullBaseURL,
    apiKey: apiKey,
    headers: headers,
    fetch: customFetch
  })
}
