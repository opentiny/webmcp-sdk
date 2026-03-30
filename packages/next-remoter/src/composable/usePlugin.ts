import { ref, markRaw, type Ref } from 'vue'
import type { PluginInfo, PluginTool } from '@opentiny/tiny-robot'
import type { McpServerConfig } from '@opentiny/next-sdk'

/**
 * 插件管理 Composable
 * 统一管理插件的增删改查逻辑
 */
export function usePlugin(
  agent: any,
  enabledTools: Ref<Record<string, boolean> | undefined>,
  defaultPluginSrc: string
) {
  // 已安装插件列表
  const installedPlugins = ref<PluginInfo[]>([])

  // 市场插件列表
  const marketPlugins = ref<PluginInfo[]>([])

  // 插件面板显示状态
  const pluginVisible = ref(false)

  /**
   * 工具函数：判断是否为本地工具（通过 serverName 判断）
   */
  const isLocalTool = (serverName: string): boolean => {
    const config = agent.mcpServers[serverName]
    return config?.type === 'local'
  }

  /**
   * 工具函数：更新 agent 的 ignoreToolnames
   * @param toolId 工具ID
   * @param enabled 是否启用
   */
  const updateIgnoreToolnames = (toolId: string, enabled: boolean) => {
    if (enabled) {
      // 启用工具：从忽略列表中移除
      agent.ignoreToolnames = agent.ignoreToolnames.filter((name: string) => name !== toolId)
    } else {
      // 禁用工具：添加到忽略列表
      if (!agent.ignoreToolnames.includes(toolId)) {
        agent.ignoreToolnames.push(toolId)
      }
    }
  }

  /**
   * 工具函数：更新本地工具的启用状态到 enabledTools
   * 只有本地工具的状态才需要持久化
   */
  const updateLocalToolsState = (toolId: string | null, enabled: boolean) => {
    if (!enabledTools.value) {
      enabledTools.value = {}
    }

    const state = { ...enabledTools.value }

    if (toolId === null) {
      // 更新所有本地工具状态（批量操作）
      // 注意：这里需要获取本地工具的所有 toolId
      // 由于这个函数是通用的，实际的 toolId 列表在调用处提供
      Object.keys(state).forEach((key) => {
        state[key] = enabled
      })
    } else {
      // 更新单个工具状态
      state[toolId] = enabled
    }

    enabledTools.value = state
  }

  /**
   * 工具函数：还原市场插件状态
   */
  const resetMarketPluginState = (pluginId: string) => {
    const marketPlugin = marketPlugins.value.find((p) => p.id === pluginId)
    if (marketPlugin) {
      marketPlugin.addState = 'idle'
    }
  }

  /**
   * 工具函数：从 MCP Tools 构建 PluginTool 列表
   * @param serverName 服务器名称
   * @returns PluginTool 数组
   */
  const buildPluginTools = (serverName: string): PluginTool[] => {
    const currTool = agent.mcpTools[serverName]
    if (!currTool) return []

    const isLocal = isLocalTool(serverName)
    const enabledToolsState = enabledTools.value || {}

    return Object.keys(currTool).map((key) => {
      // 本地工具：优先从已持久化的 enabledTools 读取，新工具默认开启 (true)
      // 域名工具：始终默认打开 (true)
      const isDefined = Object.prototype.hasOwnProperty.call(enabledToolsState, key)
      const enabled = isLocal ? (isDefined ? enabledToolsState[key] : true) : true

      // 同步更新 ignoreToolnames
      updateIgnoreToolnames(key, enabled)

      return {
        id: key,
        name: key,
        description: currTool[key].description as string,
        enabled
      }
    })
  }

  /**
   * 根据 agent.mcpTools 的最新快照，刷新已安装插件的工具列表。
   * 适用于 MCP Server 运行时增删工具后的 UI 同步。
   */
  const syncInstalledPluginTools = () => {
    installedPlugins.value.forEach((plugin) => {
      const prevEnabledMap = new Map(plugin.tools.map((tool) => [tool.id, tool.enabled]))
      const latestTools = buildPluginTools(plugin.id).map((tool) => {
        const enabled = prevEnabledMap.has(tool.id) ? Boolean(prevEnabledMap.get(tool.id)) : tool.enabled
        updateIgnoreToolnames(tool.id, enabled)
        return { ...tool, enabled }
      })
      plugin.tools = latestTools
    })

    const allToolIds = new Set(installedPlugins.value.flatMap((plugin) => plugin.tools.map((tool) => tool.id)))
    agent.ignoreToolnames = agent.ignoreToolnames.filter((toolName: string) => allToolIds.has(toolName))
  }

  /**
   * 统一的插件添加核心函数
   * 处理所有来源的插件添加：市场、扫码、已存在的MCP服务器
   * @param config 插件配置
   * @returns 是否添加成功
   */
  const addPluginCore = async (config: {
    pluginId: string
    name: string
    description: string
    icon?: string
    mcpServer: McpServerConfig
  }): Promise<boolean> => {
    const serverName = config.pluginId

    const inserted = await agent.insertMcpServer(serverName, config.mcpServer)
    if (!inserted) {
      return false
    }

    // 获取工具列表
    const currTool = agent.mcpTools[serverName]
    if (!currTool) {
      await agent.removeMcpServer(serverName)
      return false
    }

    // 构建工具列表
    const tools = buildPluginTools(serverName)
    // 如果没有工具，并且不是内置服务器，清理已注册的MCP服务器并返回
    // 这是因为内置 WebMCP 服务器 (mcp-server-builtin-webmcp) 在首次加载根路由时，可能由于业务页面未 Mount 而没有任何工具，
    // 我们必须保留它并安装，以便后续页面切换动态注册工具时能够被 sync 到 UI。
    if (tools.length === 0 && config.mcpServer?.type !== 'builtin') {
      await agent.removeMcpServer(serverName)
      return false
    }

    // 检查是否已存在，如果存在则更新
    const existingPlugin = installedPlugins.value.find((p) => p.id === config.pluginId)
    if (existingPlugin) {
      existingPlugin.tools = tools
      // @ts-ignore
      existingPlugin.originMcpConfig = markRaw(config.mcpServer)
      return true
    }

    // 创建新插件对象
    const plugin: PluginInfo = {
      id: config.pluginId,
      name: config.name,
      icon: config.icon || defaultPluginSrc,
      description: config.description,
      enabled: true,
      expanded: false,
      tools,
      // @ts-ignore
      originMcpConfig: markRaw(config.mcpServer)
    }

    // 添加插件到已安装列表
    installedPlugins.value.push(plugin)

    return true
  }

  /**
   * 从已存在的 MCP 服务器加载插件
   * 用于初始化时加载已连接的MCP服务器
   */
  const loadMcpServerToPlugin = async (serverName: string, mcpServer: McpServerConfig) => {
    // 解析 URL 和 sessionId
    let pluginName: string
    let description: string

    if ('type' in mcpServer && mcpServer.type === 'local') {
      pluginName = '本地工具'
      description = '本地工具列表'
    } else if ('type' in mcpServer && mcpServer.type === 'builtin') {
      // 浏览器内置 WebMCP（Chrome 146+）：没有 url，使用固定名称标识
      pluginName = '浏览器内置工具'
      description = '通过 navigator.modelContextTesting 暴露的浏览器原生 MCP 工具'
    } else {
      const url = new URL(mcpServer.url)
      pluginName = url.origin
      description = url.searchParams.get('sessionId') || ('sessionId' in mcpServer ? mcpServer.sessionId : '') || ''
    }

    // 使用统一的添加核心函数
    await addPluginCore({
      pluginId: serverName,
      name: pluginName,
      description: description,
      mcpServer
    })
  }

  /**
   * 整个插件的打开或关闭
   * 批量更新插件下所有工具的启用状态
   */
  const togglePlugin = (plugin: PluginInfo, enabled: boolean) => {
    const isLocal = isLocalTool(plugin.id)

    // 批量更新所有工具的启用状态
    plugin.tools.forEach((tool) => {
      tool.enabled = enabled
      updateIgnoreToolnames(tool.id, enabled)

      // 如果是本地工具，同步更新 enabledTools 状态
      if (isLocal) {
        updateLocalToolsState(tool.id, enabled)
      }
    })
  }

  /**
   * 单个工具的打开或关闭
   * 更新指定工具的启用状态
   */
  const toggleTool = (plugin: PluginInfo, toolId: string, enabled: boolean) => {
    const isLocal = isLocalTool(plugin.id)

    // 更新指定工具的启用状态
    plugin.tools.forEach((tool) => {
      if (tool.id === toolId) {
        tool.enabled = enabled
      }
    })

    // 更新 agent 的忽略列表
    updateIgnoreToolnames(toolId, enabled)

    // 如果是本地工具，同步更新 enabledTools 状态
    if (isLocal) {
      updateLocalToolsState(toolId, enabled)
    }
  }

  /**
   * 删除插件
   * 从已安装列表中移除插件，并清理相关资源
   */
  const deletePlugin = async (plugin: PluginInfo) => {
    // 从已安装列表中查找并移除插件
    const delPlugin = installedPlugins.value.find((item) => item.id === plugin.id)
    if (!delPlugin) return

    installedPlugins.value = installedPlugins.value.filter((item) => item.id !== delPlugin.id)

    // 还原市场插件状态
    resetMarketPluginState(delPlugin.id)

    // 从 agent 中移除 MCP 服务器（包括 mcpServers、mcpTools、mcpClients、ignoreToolnames）
    const serverName = plugin.id
    await agent.removeMcpServer(serverName)
  }

  /**
   * 从市场添加插件到已安装列表
   * @param plugin 市场插件信息
   */
  const addPluginFromMarket = async (plugin: PluginInfo) => {
    plugin.addState = 'loading'

    // 准备 MCP 服务器配置
    const mcpServer = {
      type: (plugin as any).type,
      url: (plugin as any).url,
      headers: (plugin as any).headers,
      useAISdkClient: true
    } as McpServerConfig

    // 使用统一的添加核心函数
    const success = await addPluginCore({
      pluginId: plugin.id,
      name: plugin.name,
      description: plugin.description || '',
      icon: plugin.icon,
      mcpServer
    })

    plugin.addState = success ? 'added' : 'idle'
  }

  /**
   * 从扫码添加插件
   * @param sessionId 会话ID
   * @param agentRoot 代理服务器地址
   * @returns 是否添加成功
   */
  const addPluginFromScan = async (sessionId: string, agentRoot: string): Promise<boolean> => {
    // 构建 MCP 服务器配置
    const mcpServer = {
      type: 'streamableHttp',
      url: `${agentRoot}mcp?sessionId=${sessionId}`
    } as const

    // 解析URL获取origin作为插件名称
    const url = new URL(`${agentRoot}mcp?sessionId=${sessionId}`)

    // 使用统一的添加核心函数
    return await addPluginCore({
      pluginId: `plugin-${sessionId}`,
      name: url.origin,
      description: sessionId,
      mcpServer
    })
  }

  /**
   * 处理 MCP Client 断开事件
   * 自动清理已断开的插件和资源
   */
  const handleClientDisconnected = async (serverName: string) => {
    // 从 serverName 提取 pluginId
    const pluginId = serverName

    // 查找对应的插件
    const plugin = installedPlugins.value.find((p) => p.id === pluginId)

    // 从 Agent 中移除 MCP Server
    await agent.removeMcpServer(serverName)

    if (plugin) {
      // 从已安装插件列表中移除
      installedPlugins.value = installedPlugins.value.filter((p) => p.id !== pluginId)

      // 还原市场插件状态
      resetMarketPluginState(pluginId)

      return plugin
    }

    return null
  }

  /**
   * 搜索插件（已安装或市场）
   * 统一的搜索函数
   */
  const searchPlugin = (query: string, item: PluginInfo): boolean => {
    return query.trim() === '' || item.name.toLowerCase().includes(query.toLowerCase())
  }

  return {
    // 状态
    installedPlugins,
    marketPlugins,
    pluginVisible,

    // 核心方法
    loadMcpServerToPlugin,
    togglePlugin,
    toggleTool,
    deletePlugin,
    addPluginCore, // 添加插件的核心方法
    addPluginFromMarket, // 从市场添加插件（明确的方法名）
    addPluginFromScan, // 从扫码添加插件（新增）
    handleClientDisconnected,
    searchPlugin,
    syncInstalledPluginTools
  }
}
