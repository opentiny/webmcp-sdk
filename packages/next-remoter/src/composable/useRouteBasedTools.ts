import { onMounted, onUnmounted, watch, type Ref } from 'vue'
import { MSG_REMOTER_READY, MSG_TOOL_CATALOG_CHANGED } from '@opentiny/next-sdk'
import type { PluginInfo } from '@opentiny/tiny-robot'

/**
 * 路由状态在简化模式下不再参与工具筛选，保留类型仅做兼容。
 */
export type RemoteRouteState = null

/**
 * 兼容旧调用：始终返回 null。
 */
export const getRemoteRouteState = (): RemoteRouteState => null

/**
 * 简化后的工具同步：
 * - 不再基于路由维护工具可见性
 * - 仅监听工具目录变化并触发 remoter 侧 refresh
 */
export function useRouteBasedTools(options: {
  enabled: Ref<boolean>
  agent: { ignoreToolnames: string[] }
  installedPlugins: Ref<PluginInfo[]>
  customAgentProvider?: { setRouteStateGetter: (fn: () => RemoteRouteState) => void }
  onToolCatalogChanged?: () => void | Promise<void>
}) {
  const { enabled, customAgentProvider, onToolCatalogChanged } = options

  if (customAgentProvider?.setRouteStateGetter) {
    customAgentProvider.setRouteStateGetter(() => null)
  }

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

  let stopWatch: (() => void) | undefined
  onMounted(() => {
    stopWatch = watch(
      enabled,
      (val) => {
        if (val) start()
        else stop()
      },
      { immediate: true }
    )
  })

  onUnmounted(() => {
    stop()
    stopWatch?.()
  })
}
