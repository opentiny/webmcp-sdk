import { onMounted, onUnmounted } from 'vue'
import { MSG_REMOTER_READY, MSG_TOOL_CATALOG_CHANGED } from '@opentiny/next-sdk'

/**
 * 简化后的工具同步：
 * - 仅监听工具目录变化并触发 remoter 侧 refresh
 */
export function useRouteBasedTools(options: {
  onToolCatalogChanged?: () => void | Promise<void>
}) {
  const { onToolCatalogChanged } = options

  const isInIframe = typeof window !== 'undefined' && window !== window.top
  const isTrustedSource = (src: MessageEvent['source']) => src === window || (isInIframe && src === window.parent)

  const handleToolCatalogChanged = (event: MessageEvent) => {
    if (!isTrustedSource(event.source) || event.data?.type !== MSG_TOOL_CATALOG_CHANGED) return
    if (onToolCatalogChanged) {
      void Promise.resolve(onToolCatalogChanged())
    }
  }

  let listenersActive = false
  const start = () => {
    if (listenersActive) return
    listenersActive = true
    window.addEventListener('message', handleToolCatalogChanged)
    if (isInIframe && window.parent) {
      window.parent.postMessage({ type: MSG_REMOTER_READY }, '*')
    }
  }

  const stop = () => {
    if (!listenersActive) return
    listenersActive = false
    window.removeEventListener('message', handleToolCatalogChanged)
  }

  onMounted(() => {
    start()
  })

  onUnmounted(() => {
    stop()
  })
}
