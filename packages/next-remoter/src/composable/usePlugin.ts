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
   * 工具函数：构建服务器名称
   */
  const buildServerName = (pluginIdOrSessionId: string): string => {
    const sessionId = pluginIdOrSessionId.replace('plugin-', '')
    return `mcp-server-${sessionId}`
  }

  /**
   * 工具函数：判断是否为本地工具
   */
  const isLocalPlugin = (pluginId: string): boolean => {
    return pluginId === 'plugin-本地工具列表'
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
   * 工具函数：更新本地工具的启用状态
   */
  const updateLocalToolsState = (toolId: string | null, enabled: boolean) => {
    if (!enabledTools.value) return

    const state = { ...enabledTools.value }
    
    if (toolId === null) {
      // 更新所有本地工具状态
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
   * @param isLocal 是否为本地工具
   * @returns PluginTool 数组
   */
  const buildPluginTools = (serverName: string, isLocal: boolean = false): PluginTool[] => {
    const currTool = agent.mcpTools[serverName]
    if (!currTool) return []

    const enabledToolsState = enabledTools.value || {}

    return Object.keys(currTool).map((key) => {
      const enabled = isLocal ? Boolean(enabledToolsState[key]) : true
      
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
   * 加载 MCP 服务器到插件列表
   * 将已连接的 MCP 服务器转换为插件对象并添加到已安装列表
   */
  const loadMcpServerToPlugin = async (serverName: string, mcpServer: McpServerConfig) => {
    const isLocal = serverName === 'mcp-server-localhost'
    
    // 解析 URL 和 sessionId
    const url = isLocal ? { origin: '本地工具' } : new URL('url' in mcpServer ? mcpServer.url : '')
    const sessionId = isLocal
      ? '本地工具列表'
      : url.searchParams.get('sessionId') || ('sessionId' in mcpServer ? mcpServer.sessionId : '') || ''

    // 构建插件工具列表
    const pluginTools = buildPluginTools(serverName, isLocal)
    if (pluginTools.length === 0) return

    const pluginId = `plugin-${sessionId}`

    // 检查是否已存在，避免重复添加
    const existingPlugin = installedPlugins.value.find((plugin) => plugin.id === pluginId)
    if (existingPlugin) {
      // 更新已存在插件的工具列表和配置
      existingPlugin.tools = pluginTools
      // @ts-ignore
      existingPlugin.originMcpConfig = markRaw(mcpServer) as McpServerConfig
      return
    }

    // 创建新插件对象
    const plugin: PluginInfo = {
      id: pluginId,
      name: url.origin,
      icon: defaultPluginSrc,
      description: sessionId,
      enabled: true,
      expanded: true,
      tools: pluginTools,
      // @ts-ignore
      originMcpConfig: markRaw(mcpServer)
    }

    installedPlugins.value.push(plugin)
  }

  /**
   * 整个插件的打开或关闭
   * 批量更新插件下所有工具的启用状态
   */
  const togglePlugin = (plugin: PluginInfo, enabled: boolean) => {
    const isLocal = isLocalPlugin(plugin.id)

    // 批量更新所有工具的启用状态
    plugin.tools.forEach((tool) => {
      tool.enabled = enabled
      updateIgnoreToolnames(tool.id, enabled)
    })

    // 如果是本地工具，同步更新 enabledTools 状态
    if (isLocal) {
      updateLocalToolsState(null, enabled)
    }
  }

  /**
   * 单个工具的打开或关闭
   * 更新指定工具的启用状态
   */
  const toggleTool = (plugin: PluginInfo, toolId: string, enabled: boolean) => {
    const isLocal = isLocalPlugin(plugin.id)

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
    const serverName = buildServerName(plugin.id)
    await agent.removeMcpServer(serverName)
  }

  /**
   * 添加插件
   * 从市场添加插件到已安装列表
   */
  const addPlugin = async (plugin: PluginInfo) => {
    plugin.addState = 'loading'

    // 准备 MCP 服务器配置
    const mcpServer = {
      type: (plugin as any).type,
      url: (plugin as any).url,
      useAISdkClient: true
    } as McpServerConfig

    const serverName = buildServerName(plugin.id)

    // 插入 MCP 服务器（自动去重并初始化客户端和工具）
    const inserted = await agent.insertMcpServer(serverName, mcpServer)

    if (inserted) {
      // 获取工具列表
      const currTool = agent.mcpTools[serverName]
      if (currTool) {
        // 创建新插件对象
        const newPlugin: PluginInfo = {
          ...plugin,
          id: plugin.id,
          enabled: true,
          tools: Object.keys(currTool).map((key) => ({
            id: key,
            name: key,
            description: currTool[key].description as string,
            enabled: true
          }))
        }

        // 添加到已安装列表
        installedPlugins.value.push(newPlugin)
        plugin.addState = 'added'
        await agent.closeAll()
        return
      }
    }

    // 添加失败，清理资源并还原状态
    await agent.removeMcpServer(serverName)
    plugin.addState = 'idle'
  }

  /**
   * 处理 MCP Client 断开事件
   * 自动清理已断开的插件和资源
   */
  const handleClientDisconnected = async (serverName: string) => {
    // 从 serverName 提取 pluginId
    const pluginId = `plugin-${serverName.replace('mcp-server-', '')}`

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
   * 同步已安装插件的工具状态
   * 当 agent.mcpTools 更新时调用，同步插件工具列表
   */
  const syncInstalledPluginsTools = () => {
    installedPlugins.value.forEach((plugin) => {
      const serverName = buildServerName(plugin.id)

      // 检查客户端连接状态
      const currClient = agent.mcpClients[serverName]
      const currTool = agent.mcpTools[serverName]

      // 客户端断开，标记插件名称
      if (currClient === null) {
        plugin.name = '❌' + plugin.name.replace('❌', '')
      }

      // 工具列表为空，禁用所有工具
      if (currTool === null) {
        plugin.tools.forEach((tool) => (tool.enabled = false))
      } else if (currTool) {
        // 更新工具列表
        plugin.tools = Object.keys(currTool).map((key) => ({
          id: key,
          name: key,
          description: currTool[key].description as string,
          enabled: !agent.ignoreToolnames.includes(key)
        }))
      }
    })
  }

  /**
   * 搜索插件（已安装或市场）
   * 统一的搜索函数
   */
  const searchPlugin = (query: string, item: PluginInfo): boolean => {
    return query.trim() === '' || item.name.toLowerCase().includes(query.toLowerCase())
  }

  /**
   * 初始化插件系统
   * 设置 agent 事件监听器
   */
  const initPluginSystem = (onToolDisconnected?: (pluginName: string) => void) => {
    // 监听工具更新事件
    agent.onUpdatedTools = syncInstalledPluginsTools

    // 可选：监听客户端断开事件
    if (onToolDisconnected) {
      const originalDisconnected = handleClientDisconnected
      return async (serverName: string) => {
        const plugin = await originalDisconnected(serverName)
        if (plugin) {
          onToolDisconnected(plugin.name)
        }
      }
    }
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
    addPlugin,
    handleClientDisconnected,
    syncInstalledPluginsTools,
    searchPlugin,
    initPluginSystem,

    // 工具函数（如果外部需要使用）
    buildServerName,
    isLocalPlugin
  }
}
