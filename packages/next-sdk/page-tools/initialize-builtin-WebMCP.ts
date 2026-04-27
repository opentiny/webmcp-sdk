import { initializeWebMCPPolyfill } from '@mcp-b/webmcp-polyfill'
import { setupModelContextBridge } from './bridge'
import { isBrowser } from '../utils/env'

let initialized = false

export const initializeBuiltinWebMCP = () => {
  if (isBrowser()) {
    try {
      if (initialized) return

      initializeWebMCPPolyfill()
      setupModelContextBridge()

      initialized = true
    } catch (err) {
      console.warn('[next-sdk] 自动注入 modelContext polyfill 和桥接同步失败:', err)
    }
  }
}
