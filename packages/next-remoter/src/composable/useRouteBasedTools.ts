import { onMounted, onUnmounted, watch, type Ref } from 'vue'
import {
  getToolRouteMap,
  getActiveRoutes,
  MSG_PAGE_LEAVE,
  MSG_REMOTER_READY,
  MSG_ROUTE_STATE_INITIAL
} from '@opentiny/next-sdk'
import type { PluginInfo, PluginTool } from '@opentiny/tiny-robot'

// 与 page-tool-bridge.ts 中保持一致
const MSG_PAGE_READY = 'next-sdk:page-ready'

/**
 * 路由感知工具过滤 composable
 *
 * 支持两种场景：
 * - 同窗口：业务页面与 Remoter 在同一 window，直接读取 getToolRouteMap/getActiveRoutes
 * - iframe：Remoter 在 iframe 内，通过 remoter-ready 握手获取父窗口的路由状态，
 *   并接收父窗口广播的 page-ready/page-leave，实现按需加载
 *
 * 默认关闭（enabled = false），需显式传入 :pageToolsOnDemand="true" 开启。
 */
export function useRouteBasedTools(options: {
  /** 是否启用路由感知模式，默认 false，支持运行时动态切换 */
  enabled: Ref<boolean>
  /** 仅依赖 ignoreToolnames 的最小 Agent 约束 */
  agent: { ignoreToolnames: string[] }
  /** 已安装插件列表的响应式引用，用于同步 UI 开关状态 */
  installedPlugins: Ref<PluginInfo[]>
}) {
  const { enabled, agent, installedPlugins } = options

  const isInIframe = typeof window !== 'undefined' && window !== window.top

  // iframe 场景：父窗口回传的 toolRouteMap、activeRoutes，用于替代本窗口空的 getToolRouteMap
  let routeStateFromParent: {
    toolRouteMap: Map<string, string>
    activeRoutes: Set<string>
  } | null = null

  // 缓存每个插件的完整工具列表，用于根据当前路由动态筛选显示哪些工具
  const fullToolsByPluginId = new Map<string, PluginTool[]>()

  // 路由路径规范化：去掉尾部斜杠，空路径兜底为 '/'
  const normalizeRoute = (r: string) => r.replace(/\/+$/, '') || '/'

  /** 获取工具路由映射：同窗口用模块 API，iframe 用父窗口回传的数据 */
  const getRouteMap = () =>
    routeStateFromParent?.toolRouteMap ?? (getToolRouteMap() as Map<string, string>)

  /**
   * 根据当前全部激活路由，对所有已注册 withPageTools 工具进行一次全量同步：
   * - 仅激活路由的工具会暴露给大模型（ignoreToolnames 中移除）
   * - 仅激活路由的工具会出现在插件面板，其他路由的工具会从面板中隐藏
   */
  const syncAllRoutes = () => {
    // 功能关闭时不做任何同步，保持原有「所有工具可用」行为
    if (!enabled.value) {
      return
    }

    const activeRoutes = routeStateFromParent?.activeRoutes ?? getActiveRoutes()
    const routeMap = getRouteMap()

    // 1. 计算当前应当激活的「路由绑定工具」ID 集合
    const activeToolIds = new Set<string>()
    const routeToolIds = new Set<string>()
    routeMap.forEach((toolRoute, toolName) => {
      routeToolIds.add(toolName)
      const norm = normalizeRoute(toolRoute)
      const isActiveRoute = activeRoutes.has(norm) || activeRoutes.has(toolRoute)
      if (isActiveRoute) {
        activeToolIds.add(toolName)
      }
    })

    // 2. 更新 ignoreToolnames 的逻辑被移除
    // 现在仅针对 UI 面板中的工具做按需展示，不进行底层大模型工具列表的强制剔除，
    // 因为 AI 会利用 page-tool-bridge 隐式导航目标页面执行工具，或者我们在 prepareStep 中接管。

    // 3. 更新插件面板中的工具列表：
    //    - 首次同步时为每个插件缓存完整工具列表
    //    - 仅对路由绑定工具做「按需展示」，非路由工具保持原状
    installedPlugins.value.forEach((plugin) => {
      if (!fullToolsByPluginId.has(plugin.id)) {
        fullToolsByPluginId.set(plugin.id, plugin.tools.slice())
      }
      const fullList = fullToolsByPluginId.get(plugin.id) || []
      plugin.tools = fullList.filter((tool) => {
        if (!routeToolIds.has(tool.id)) {
          // 非路由绑定工具：始终保留，由用户自行控制开关
          return true
        }
        // 路由绑定工具：仅当前激活路由的工具展示
        return activeToolIds.has(tool.id)
      })
    })
  }

  /** 消息来源合法：同窗口为 window，iframe 内为 window.parent */
  const isTrustedSource = (src: MessageEvent['source']) =>
    src === window || (isInIframe && src === window.parent)

  // 监听 page-ready 消息：某个路由页面挂载，开放该路由的工具
  const handlePageReady = (event: MessageEvent) => {
    if (!isTrustedSource(event.source) || event.data?.type !== MSG_PAGE_READY) return
    // iframe 场景：更新本地 activeRoutes 缓存，供后续 sync 使用
    if (routeStateFromParent) {
      routeStateFromParent.activeRoutes.add(normalizeRoute(event.data.route))
    }
    syncAllRoutes()
  }

  // 监听 page-leave 消息：某个路由页面卸载，屏蔽该路由的工具
  const handlePageLeave = (event: MessageEvent) => {
    if (!isTrustedSource(event.source) || event.data?.type !== MSG_PAGE_LEAVE) return
    if (routeStateFromParent) {
      routeStateFromParent.activeRoutes.delete(normalizeRoute(event.data.route))
    }
    syncAllRoutes()
  }

  // 监听父窗口回传的初始路由状态（仅 iframe 场景）
  const handleRouteStateInitial = (event: MessageEvent) => {
    if (!isTrustedSource(event.source) || event.data?.type !== MSG_ROUTE_STATE_INITIAL) return
    const { toolRouteMap: mapArr, activeRoutes: routesArr } = event.data
    routeStateFromParent = {
      toolRouteMap: new Map(mapArr as [string, string][]),
      activeRoutes: new Set((routesArr as string[]).map(normalizeRoute))
    }
    syncAllRoutes()
  }

  // 当 installedPlugins 发生变化（新增插件或工具数量变化）时，重新同步一次
  const stopWatch = watch(
    () => installedPlugins.value.map((p) => `${p.id}:${p.tools?.length ?? 0}`).join('|'),
    (key, oldKey) => {
      if (key === oldKey) return
      // 在 iframe 场景下，若此时仍未拿到父窗口的初始路由状态，再主动发送一次 remoter-ready
      if (isInIframe && !routeStateFromParent && window.parent) {
        window.parent.postMessage({ type: MSG_REMOTER_READY }, '*')
      }
      syncAllRoutes()
    }
  )

  // 根据 enabled 的运行时变化，注册/注销监听器
  let listenersActive = false
  const start = () => {
    if (listenersActive) return
    listenersActive = true
    window.addEventListener('message', handlePageReady)
    window.addEventListener('message', handlePageLeave)
    window.addEventListener('message', handleRouteStateInitial)
    if (isInIframe && window.parent) {
      window.parent.postMessage({ type: MSG_REMOTER_READY }, '*')
    }
    syncAllRoutes()
  }
  const stop = () => {
    if (!listenersActive) return
    listenersActive = false
    window.removeEventListener('message', handlePageReady)
    window.removeEventListener('message', handlePageLeave)
    window.removeEventListener('message', handleRouteStateInitial)
  }

  onMounted(() => {
    watch(
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
    stopWatch()
  })
}
