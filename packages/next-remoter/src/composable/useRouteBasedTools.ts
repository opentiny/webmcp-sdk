import { onMounted, onUnmounted, watch, type Ref } from 'vue'
import {
  getToolRouteMap,
  getActiveRoutes,
  getActivePageTools,
  MSG_PAGE_LEAVE,
  MSG_REMOTER_READY,
  MSG_ROUTE_STATE_INITIAL
} from '@opentiny/next-sdk'
import type { PluginInfo, PluginTool } from '@opentiny/tiny-robot'

// 与 page-tool-bridge.ts 中保持一致
const MSG_PAGE_READY = 'next-sdk:page-ready'

/** 路由状态结构；initialized 为 true 表示已收到有效快照（如同窗口本地 map 或 iframe 收到 MSG_ROUTE_STATE_INITIAL） */
export type RemoteRouteState = {
  toolRouteMap: Map<string, string>
  activeRoutes: Set<string>
  /** route -> 已就绪工具集合（可用于更精细的按需过滤） */
  activePageTools: Map<string, Set<string>>
  /** 是否已就绪：iframe 下收到父窗口快照后为 true，未收到前为 false，用于 fail closed */
  initialized: boolean
} | null

/** 按 remoter 实例隔离的路由状态 Map，避免多实例互相覆盖 */
const remoteRouteStateByInstance = new Map<symbol, RemoteRouteState>()

/** 默认单例 key，兼容未显式传入 customAgentProvider 的旧用法 */
const DEFAULT_INSTANCE_KEY = Symbol('default')

/**
 * 获取跨窗口同步后的路由状态（兼容旧 API，返回默认实例的状态）
 * @param instanceKey 可选，指定 remoter 实例 key；不传则返回默认实例（单例模式）
 */
export const getRemoteRouteState = (instanceKey?: symbol): RemoteRouteState => {
  const key = instanceKey ?? DEFAULT_INSTANCE_KEY
  return remoteRouteStateByInstance.get(key) ?? null
}

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
  /** 可选，CustomAgentModelProvider 实例，用于注入实例级 getRemoteRouteState，实现多实例隔离 */
  customAgentProvider?: { setRouteStateGetter: (fn: () => RemoteRouteState) => void }
}) {
  const { enabled, installedPlugins, customAgentProvider } = options

  // 每个 composable 实例使用独立 key，实现多 remoter 隔离
  const instanceKey = Symbol('remoter-route-state')

  const isInIframe = typeof window !== 'undefined' && window !== window.top

  // iframe 场景：父窗口回传的 toolRouteMap、activeRoutes，写入当前实例的 state
  const setRouteState = (state: RemoteRouteState) => {
    remoteRouteStateByInstance.set(instanceKey, state)
  }

  /** 当前实例的路由状态 getter，供 CustomAgentModelProvider 使用 */
  const getInstanceRouteState = (): RemoteRouteState => remoteRouteStateByInstance.get(instanceKey) ?? null

  // 注入到 CustomAgentModelProvider，使 prepareStep 使用本实例的状态
  if (customAgentProvider?.setRouteStateGetter) {
    customAgentProvider.setRouteStateGetter(getInstanceRouteState)
  }

  // iframe 下在收到 MSG_ROUTE_STATE_INITIAL 前先设未初始化状态，便于 prepareStep 做 fail closed
  if (isInIframe) {
    setRouteState({
      toolRouteMap: new Map(),
      activeRoutes: new Set(),
      activePageTools: new Map(),
      initialized: false
    })
  }

  // 缓存每个插件的完整工具列表，用于根据当前路由动态筛选显示哪些工具
  const fullToolsByPluginId = new Map<string, PluginTool[]>()

  // 路由路径规范化：去掉尾部斜杠，空路径兜底为 '/'
  const normalizeRoute = (r: string) => r.replace(/\/+$/, '') || '/'

  /** 获取工具路由映射：同窗口用模块 API，iframe 用父窗口回传的数据 */
  const getRouteMap = () => getInstanceRouteState()?.toolRouteMap ?? (getToolRouteMap() as Map<string, string>)

  /** 获取 route -> active toolNames 映射：同窗口读 SDK 快照，iframe 读父窗口同步状态 */
  const getActivePageToolMap = () => {
    const state = getInstanceRouteState()
    if (state?.activePageTools) {
      return state.activePageTools
    }
    const snapshot = new Map<string, Set<string>>()
    getActivePageTools().forEach((toolNames, route) => {
      snapshot.set(normalizeRoute(route), new Set((toolNames || []).map((name) => String(name))))
    })
    return snapshot
  }

  /**
   * 关闭 route-based 时恢复被隐藏的工具：恢复插件完整工具列表
   * 注意：ignoreToolnames 仅用于「用户从面板手动禁用」的场景，不再在此处做路由级别的写入/清理，
   * 以避免与 CustomAgentModelProvider.prepareStep 中的按路由过滤产生时序竞态。
   */
  const restoreToolsWhenDisabled = () => {
    // 仅恢复插件面板的完整工具列表，不触碰 agent.ignoreToolnames（交由用户手动开关控制）
    installedPlugins.value.forEach((plugin) => {
      const fullList = fullToolsByPluginId.get(plugin.id)
      if (fullList) {
        plugin.tools = fullList.slice()
      }
    })
  }

  /**
   * 根据当前全部激活路由，对所有已注册 withPageTools 工具进行一次全量同步：
   * - 仅激活路由的工具会暴露给大模型（ignoreToolnames 中移除）
   * - 仅激活路由的工具会出现在插件面板，其他路由的工具会从面板中隐藏
   */
  const syncAllRoutes = () => {
    // 功能关闭时：恢复之前被隐藏的工具，然后退出
    if (!enabled.value) {
      restoreToolsWhenDisabled()
      return
    }

    const activeRoutes = getInstanceRouteState()?.activeRoutes ?? getActiveRoutes()
    const routeMap = getRouteMap()
    const activePageToolMap = getActivePageToolMap()

    // 1. 计算当前应当激活的「路由绑定工具」ID 集合
    const activeToolIds = new Set<string>()
    const routeToolIds = new Set<string>()
    routeMap.forEach((toolRoute, toolName) => {
      routeToolIds.add(toolName)
      const norm = normalizeRoute(toolRoute)
      const isActiveRoute = activeRoutes.has(norm) || activeRoutes.has(toolRoute)
      const activeToolsOnRoute = activePageToolMap.get(norm) ?? activePageToolMap.get(toolRoute)
      const isToolReady =
        !activeToolsOnRoute || activeToolsOnRoute.size === 0 ? true : activeToolsOnRoute.has(toolName)
      if (isActiveRoute && isToolReady) {
        activeToolIds.add(toolName)
      }
    })

    // 2. 更新插件面板中的工具列表：
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
  const isTrustedSource = (src: MessageEvent['source']) => src === window || (isInIframe && src === window.parent)

  // 监听 page-ready 消息：某个路由页面挂载，开放该路由的工具
  const handlePageReady = (event: MessageEvent) => {
    if (!isTrustedSource(event.source) || event.data?.type !== MSG_PAGE_READY) return
    // iframe 场景：更新当前实例的 activeRoutes 缓存，供后续 sync 使用
    const state = getInstanceRouteState()
    if (state) {
      const route = normalizeRoute(event.data.route)
      state.activeRoutes.add(route)
      if (Array.isArray(event.data.toolNames)) {
        state.activePageTools.set(route, new Set((event.data.toolNames as unknown[]).map((item) => String(item))))
      }
    }
    syncAllRoutes()
  }

  // 监听 page-leave 消息：某个路由页面卸载，屏蔽该路由的工具
  const handlePageLeave = (event: MessageEvent) => {
    if (!isTrustedSource(event.source) || event.data?.type !== MSG_PAGE_LEAVE) return
    const state = getInstanceRouteState()
    if (state) {
      const route = normalizeRoute(event.data.route)
      state.activeRoutes.delete(route)
      state.activePageTools.delete(route)
    }
    syncAllRoutes()
  }

  // 监听父窗口回传的初始路由状态（仅 iframe 场景），收到后标记为已初始化
  const handleRouteStateInitial = (event: MessageEvent) => {
    if (!isTrustedSource(event.source) || event.data?.type !== MSG_ROUTE_STATE_INITIAL) return
    const { toolRouteMap: mapArr, activeRoutes: routesArr, activePageTools: activePageToolsArr } = event.data
    const normalizedActivePageTools = new Map<string, Set<string>>()
    if (Array.isArray(activePageToolsArr)) {
      const tuples = activePageToolsArr as [string, string[]][]
      tuples.forEach(([route, tools]) => {
        normalizedActivePageTools.set(
          normalizeRoute(route),
          new Set((Array.isArray(tools) ? tools : []).map((item) => String(item)))
        )
      })
    }
    setRouteState({
      toolRouteMap: new Map(mapArr as [string, string][]),
      activeRoutes: new Set((routesArr as string[]).map(normalizeRoute)),
      activePageTools: normalizedActivePageTools,
      initialized: true
    })
    syncAllRoutes()
  }

  // 当 installedPlugins 发生变化（新增插件或工具数量变化）时，重新同步一次
  const stopWatch = watch(
    () => installedPlugins.value.map((p) => `${p.id}:${p.tools?.length ?? 0}`).join('|'),
    (key, oldKey) => {
      if (key === oldKey) return
      // 在 iframe 场景下，若尚未收到父窗口的初始路由状态，再主动发送一次 remoter-ready
      const state = getInstanceRouteState()
      if (isInIframe && (!state || !state.initialized) && window.parent) {
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
    // 关闭时恢复被隐藏的工具，并清理当前实例的 state 避免内存泄漏
    restoreToolsWhenDisabled()
    remoteRouteStateByInstance.delete(instanceKey)
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
    remoteRouteStateByInstance.delete(instanceKey)
  })
}
