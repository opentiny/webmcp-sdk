import { onMounted, onUnmounted } from 'vue'
import { MSG_REMOTER_READY, MSG_TOOL_REGISTERED, MSG_TOOL_UNREGISTERED } from '@opentiny/next-sdk'

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

  let disposed = false
  let refreshingCatalog = false
  let refreshQueued = false

  const flushToolCatalogChange = async () => {
    if (!onToolCatalogChanged || disposed) return
    if (refreshingCatalog) {
      refreshQueued = true
      return
    }

    refreshingCatalog = true
    try {
      do {
        refreshQueued = false
        try {
          await onToolCatalogChanged()
        } catch (error) {
          console.warn('[useRouteBasedTools] refresh tool catalog failed:', error)
        }
      } while (refreshQueued && !disposed)
    } finally {
      refreshingCatalog = false
    }
  }

  const handleToolCatalogChanged = (event: MessageEvent) => {
    if (
      !isTrustedSource(event.source) ||
      (event.data?.type !== MSG_TOOL_REGISTERED && event.data?.type !== MSG_TOOL_UNREGISTERED)
    ) {
      return
    }
    void flushToolCatalogChange()
  }

  let listenersActive = false
  const start = () => {
    if (listenersActive) return
    disposed = false
    listenersActive = true
    window.addEventListener('message', handleToolCatalogChanged)
    if (isInIframe && window.parent) {
      window.parent.postMessage({ type: MSG_REMOTER_READY }, '*')
    }
  }

  const stop = () => {
    if (!listenersActive) return
    disposed = true
    refreshQueued = false
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
