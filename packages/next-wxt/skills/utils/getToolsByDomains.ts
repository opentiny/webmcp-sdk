/**
 * 根据域名列表从 mcp-servers 中动态获取工具列表
 * 通过模拟 server 并代理 registerTool 方法来收集工具信息
 */

import getMcpToolByHostname from '../../mcp-servers'
import { z } from 'zod'

/**
 * 工具信息接口
 */
export interface ToolInfo {
  /** 工具名称 */
  name: string
  /** 工具标题 */
  title?: string
  /** 工具描述 */
  description?: string
}

/**
 * 根据域名列表获取所有工具名称
 * @param domains - 域名列表（如 ['excalidraw.com', 'opentiny.design']）
 * @returns 工具名称数组（已去重）
 */
export function getToolsByDomains(domains: string[]): string[] {
  const toolSet = new Set<string>()

  // 遍历所有域名，收集工具信息
  for (const domain of domains) {
    const mcpTool = getMcpToolByHostname(domain)

    if (mcpTool) {
      // 创建一个 proxy server，拦截 registerTool 调用
      const proxyServer = {
        registerTool: (
          name: string,
          config: {
            title?: string
            description?: string
            inputSchema?: any
            outputSchema?: any
            annotations?: any
          },
          callback?: any
        ) => {
          // 收集工具名称（使用 Set 自动去重）
          toolSet.add(name)

          // 返回一个模拟的注册工具对象（符合 registerTool 的返回类型）
          return {
            name,
            config,
            callback
          }
        }
      }

      try {
        // 调用工具注册函数，让它注册工具到我们的 proxy server
        mcpTool({ server: proxyServer, z, cookie: {} })
      } catch (error) {
        console.warn(`[getToolsByDomains] 获取域名 ${domain} 的工具失败:`, error)
      }
    }
  }

  // 返回工具名称数组（已去重）
  return Array.from(toolSet)
}

/**
 * 根据域名列表获取所有工具信息（包含名称和描述）
 * @param domains - 域名列表
 * @returns 工具信息数组
 */
export function getToolsInfoByDomains(domains: string[]): ToolInfo[] {
  const tools: ToolInfo[] = []

  // 遍历所有域名，收集工具信息
  for (const domain of domains) {
    const mcpTool = getMcpToolByHostname(domain)

    if (mcpTool) {
      // 创建一个 proxy server，拦截 registerTool 调用
      const toolMap = new Map<string, ToolInfo>()

      const proxyServer = {
        registerTool: (
          name: string,
          config: {
            title?: string
            description?: string
            inputSchema?: any
            outputSchema?: any
            annotations?: any
          },
          callback?: any
        ) => {
          // 收集工具信息
          toolMap.set(name, {
            name,
            title: config.title,
            description: config.description
          })

          // 返回一个模拟的注册工具对象
          return {
            name,
            config,
            callback
          }
        }
      }

      try {
        // 调用工具注册函数
        mcpTool({ server: proxyServer, z, cookie: {} })

        // 将收集到的工具添加到结果列表
        toolMap.forEach((toolInfo) => {
          tools.push(toolInfo)
        })
      } catch (error) {
        console.warn(`[getToolsInfoByDomains] 获取域名 ${domain} 的工具失败:`, error)
      }
    }
  }

  return tools
}
