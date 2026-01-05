import { markRaw, type Ref } from 'vue'
import type { McpServerConfig, AgentModelProvider } from '@opentiny/next-sdk'
import type { PluginInfo } from '@opentiny/tiny-robot'

/**
 * 解析 JSON 配置并转换为 McpServerConfig 格式
 * 仅支持格式: { "mcpServers": { "server-name": { "url": "...", "type": "..." } } }
 */
const parseMcpConfigFromJson = (jsonString: string): Array<{ name: string; config: McpServerConfig }> => {
  try {
    const parsed = JSON.parse(jsonString)
    const servers: Array<{ name: string; config: McpServerConfig }> = []

    // 验证格式: { "mcpServers": { "server-name": { ... } } }
    if (!parsed.mcpServers || typeof parsed.mcpServers !== 'object') {
      throw new Error('JSON 格式错误：缺少 mcpServers 字段')
    }

    // 遍历所有服务器配置
    for (const [serverName, serverConfig] of Object.entries(parsed.mcpServers)) {
      const config = normalizeMcpConfig(serverConfig as any)
      if (config) {
        servers.push({ name: serverName, config })
      }
    }

    return servers
  } catch (error) {
    throw new Error(`JSON 解析失败: ${error instanceof Error ? error.message : '未知错误'}`)
  }
}

/**
 * 标准化 MCP 配置为 McpServerConfig 格式
 * 支持: { "type": "streamableHttp" | "sse" | "extension", "url": "...", "sessionId"?: "..." }
 */
const normalizeMcpConfig = (config: any): McpServerConfig | null => {
  if (!config || typeof config !== 'object' || !config.url) {
    return null
  }

  const { type, url, sessionId } = config

  // extension 类型需要 sessionId
  if (type === 'extension') {
    if (!sessionId) {
      return null
    }
    return {
      type: 'extension',
      url,
      sessionId,
      useAISdkClient: true
    } as McpServerConfig
  }

  // streamableHttp 或 sse 类型
  if (type === 'streamableHttp' || type === 'sse') {
    return {
      type,
      url,
      useAISdkClient: true
    } as McpServerConfig
  }

  // 如果没有指定 type，默认使用 streamableHttp
  return {
    type: 'streamableHttp',
    url,
    useAISdkClient: true
  } as McpServerConfig
}

/**
 * 自定义添加 MCP 工具的 composable
 * @param agent - MCP Agent 实例
 * @param installedPlugins - 已安装插件列表的响应式引用
 * @param defaultPluginSrc - 默认插件图标
 */
export const useCustomMcpServer = (
  agent: AgentModelProvider,
  installedPlugins: Ref<PluginInfo[]>,
  defaultPluginSrc: string
) => {
  /**
   * 插入单个 MCP 服务器到工具列表
   */
  const insertMcpServerToPlugin = async (
    serverName: string,
    mcpServer: McpServerConfig,
    pluginName: string,
    pluginDescription?: string,
    pluginIcon?: string | null
  ): Promise<boolean> => {
    // 插入 MCP 服务器（会自动去重，并初始化客户端和工具）
    const inserted = await agent.insertMcpServer(serverName, mcpServer)

    if (inserted) {
      // 直接使用 serverName 获取 tools
      const currTool = agent.mcpTools[serverName]

      if (currTool) {
        // 生成插件ID
        const pluginId = serverName.replace('mcp-server-', '')

        // 创建插件信息对象
        const newPlugin: PluginInfo = {
          id: `plugin-${pluginId}`,
          name: pluginName,
          icon: pluginIcon || defaultPluginSrc,
          description: pluginDescription || (typeof mcpServer === 'object' && 'url' in mcpServer ? mcpServer.url : ''),
          enabled: true,
          expanded: true,
          tools: Object.keys(currTool).map((key) => {
            return {
              id: key,
              name: key,
              description: currTool[key].description as string,
              enabled: true
            }
          }),
          // @ts-ignore
          originMcpConfig: markRaw(mcpServer) // 缓存对应的 mcpServer 引用
        }

        // 添加到已安装插件列表
        installedPlugins.value.push(newPlugin)
        return true
      } else {
        // 工具查询失败
        await agent.removeMcpServer(serverName)
        return false
      }
    } else {
      // 重复添加
      return false
    }
  }

  /**
   * 自定义添加 MCP 工具的主处理函数
   * @param _type - 添加类型：'code' 表示 JSON 配置，'form' 表示表单数据
   * @param data - 数据：code 类型为 JSON 字符串，form 类型为对象
   */
  const handleCustomAdd = async (_type: 'code' | 'form', data: any): Promise<void> => {
    // 显示加载提示
    showLoadingToast('添加工具中...')

    try {
      // 处理 code 类型：解析 JSON 配置
      if (_type === 'code') {
        // data 应该是 JSON 字符串
        if (typeof data !== 'string') {
          showToast('添加工具失败：code 类型需要 JSON 字符串格式')
          return
        }

        // 解析 JSON 配置
        const servers = parseMcpConfigFromJson(data)

        if (servers.length === 0) {
          showToast('添加工具失败：JSON 配置格式不正确或未找到有效的服务器配置')
          return
        }

        // 插入所有服务器
        let successCount = 0
        let failCount = 0

        for (const { name, config } of servers) {
          const serverName = `mcp-server-${name}`
          const success = await insertMcpServerToPlugin(serverName, config, name)
          if (success) {
            successCount++
          } else {
            failCount++
          }
        }

        // 关闭所有连接
        await agent.closeAll()

        // 显示结果
        if (failCount === 0) {
          showToast(`成功添加 ${successCount} 个工具`)
        } else if (successCount > 0) {
          showToast(`成功添加 ${successCount} 个工具，${failCount} 个失败`)
        } else {
          showToast('添加工具失败：所有服务器都无法连接')
        }

        return
      }

      // 处理 form 类型：表单数据
      // 如果 data 是字符串，则无法处理，显示错误
      if (typeof data === 'string') {
        showToast('添加工具失败：数据格式不正确')
        return
      }

      // 解构数据对象，headers 可能是字符串或对象
      const {
        description,
        headers: _headers,
        name,
        thumbnail,
        type: mcpType,
        url
      } = data as {
        description?: string
        headers?: string | Record<string, string>
        name?: string
        thumbnail?: string | null
        type?: string
        url?: string
      }

      // 验证必要参数
      if (!name || !url || !mcpType) {
        showToast('添加工具失败：缺少必要参数（名称、URL或类型）')
        return
      }

      // 生成唯一的插件ID（基于名称和时间戳，确保唯一性）
      const pluginId = `custom-${name}-${Date.now()}`
      const serverName = `mcp-server-${pluginId}`

      const mcpServer: McpServerConfig = {
        type: mcpType as 'streamableHttp' | 'sse',
        url,
        useAISdkClient: true
      } as McpServerConfig

      // 插入 MCP 服务器
      const success = await insertMcpServerToPlugin(serverName, mcpServer, name, description, thumbnail)

      if (success) {
        // 关闭所有连接
        await agent.closeAll()
        showToast('添加工具完成')
      } else {
        showToast('重复添加工具或无法获取工具列表')
      }
    } catch (error) {
      // 捕获并显示错误
      console.error('handleCustomAdd error:', error)
      showToast(`添加工具失败：${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  return {
    handleCustomAdd
  }
}
