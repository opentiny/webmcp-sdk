import { onMounted, onUnmounted } from 'vue'

type ModelContextLike = {
  addEventListener?: (type: 'toolchange', listener: () => void) => void
  removeEventListener?: (type: 'toolchange', listener: () => void) => void
}

function resolveModelContext(): ModelContextLike | null {
  if (typeof window === 'undefined' || typeof document === 'undefined') return null

  const isInIframe = window !== window.top
  try {
    const doc = isInIframe ? window.parent.document : document
    return ((doc as unknown as { modelContext?: ModelContextLike }).modelContext as ModelContextLike | undefined) || null
  } catch {
    // 跨域 iframe 无法访问 parent.document
    return null
  }
}

/**
 * 监听 WebMCP 工具目录变化并触发 remoter 侧 refresh。
 * 依赖标准 `modelContext` 的 `toolchange` 事件（同源 iframe 读 parent.document.modelContext）。
 */
export function useRouteBasedTools(options: {
  onToolCatalogChanged?: () => void | Promise<void>
}) {
  const { onToolCatalogChanged } = options

  let disposed = false
  let refreshingCatalog = false
  let refreshQueued = false
  let modelContext: ModelContextLike | null = null

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

  const onToolChange = () => {
    void flushToolCatalogChange()
  }

  let listenersActive = false
  const start = () => {
    if (listenersActive) return
    disposed = false
    listenersActive = true
    modelContext = resolveModelContext()
    modelContext?.addEventListener?.('toolchange', onToolChange)
  }

  const stop = () => {
    if (!listenersActive) return
    disposed = true
    refreshQueued = false
    listenersActive = false
    modelContext?.removeEventListener?.('toolchange', onToolChange)
    modelContext = null
  }

  onMounted(() => {
    start()
  })

  onUnmounted(() => {
    stop()
  })
}
