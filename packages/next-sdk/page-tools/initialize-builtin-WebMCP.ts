import { initializeWebMCPPolyfill } from '@mcp-b/webmcp-polyfill'
import { isBrowser } from '../utils/env'

let initialized = false

export const initializeBuiltinWebMCP = () => {
  if (isBrowser()) {
    try {
      if (initialized) return

      initializeWebMCPPolyfill()

      initialized = true
    } catch (err) {
      console.warn('[next-sdk] 自动注入 modelContext polyfill 失败:', err)
    }
  }
}
