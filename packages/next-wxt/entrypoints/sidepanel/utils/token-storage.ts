/**
 * LLM Token 存储读取
 * TokenTab 页面生成的 token 存入 local:llm-token，此处供 sidepanel 模型配置使用
 */

import { storage } from '@wxt-dev/storage'

export const TOKEN_STORAGE_KEY = 'local:llm-token'

/**
 * 异步获取缓存的 LLM Token（TokenTab 页面生成后写入）
 * 兼容旧版 getMeta 存储，读取时自动迁移到 getItem
 */
export async function getStoredToken(): Promise<string> {
  try {
    let token = (await storage.getItem(TOKEN_STORAGE_KEY)) as string | undefined
    if (!token || typeof token !== 'string') {
      const fromMeta = (await storage.getMeta(TOKEN_STORAGE_KEY)) as string | { token?: string } | undefined
      token = typeof fromMeta === 'string' ? fromMeta : fromMeta?.token
      if (token && typeof token === 'string') {
        await storage.setItem(TOKEN_STORAGE_KEY, token)
      }
    }
    return token && typeof token === 'string' ? token : ''
  } catch {
    return ''
  }
}
