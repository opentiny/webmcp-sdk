/**
 * MCP 工具注册中心
 * 统一管理静态工具和动态工具的注册流程
 */

import getMcpToolByHostname from '../mcp-servers'
import { registerDynamicToolsByHostname } from './dynamicMcpLoader'
import { z } from 'zod'

/**
 * 为指定域名注册所有 MCP 工具（包括静态和动态）
 * @param hostname - 域名（如 'excalidraw.com'）
 * @param server - MCP Server 实例
 * @param cookie - Cookie 数据（可选）
 * @returns 注册结果统计
 */
export async function registerAllMcpToolsForHostname(
  hostname: string,
  server: any,
  cookie: Record<string, any> = {}
): Promise<{
  staticRegistered: boolean
  dynamicCount: number
  total: number
}> {
  let staticRegistered = false
  let dynamicCount = 0
  
  // 1. 注册静态 MCP 工具（来自 mcp-servers 目录）
  const staticTool = getMcpToolByHostname(hostname)
  if (staticTool) {
    try {
      staticTool({ server, z, cookie })
      staticRegistered = true
      console.log(`[mcpToolRegistry] 成功注册静态工具: ${hostname}`)
    } catch (e) {
      console.error(`[mcpToolRegistry] 注册静态工具失败: ${hostname}`, e)
    }
  }
  
  // 2. 注册动态 MCP 工具（来自用户配置）
  try {
    dynamicCount = await registerDynamicToolsByHostname(hostname, server, cookie)
  } catch (e) {
    console.error(`[mcpToolRegistry] 注册动态工具失败: ${hostname}`, e)
  }
  
  const total = (staticRegistered ? 1 : 0) + dynamicCount
  
  console.log(`[mcpToolRegistry] 域名 ${hostname} 共注册 ${total} 个工具（静态: ${staticRegistered ? 1 : 0}, 动态: ${dynamicCount}）`)
  
  return {
    staticRegistered,
    dynamicCount,
    total
  }
}

/**
 * 为指定 URL 注册所有 MCP 工具
 * @param url - 完整的 URL
 * @param server - MCP Server 实例
 * @param cookie - Cookie 数据（可选）
 * @returns 注册结果统计
 */
export async function registerAllMcpToolsForUrl(
  url: string,
  server: any,
  cookie: Record<string, any> = {}
): Promise<{
  staticRegistered: boolean
  dynamicCount: number
  total: number
}> {
  try {
    const urlObj = new URL(url)
    const hostname = urlObj.hostname
    
    return await registerAllMcpToolsForHostname(hostname, server, cookie)
  } catch (e) {
    console.error('[mcpToolRegistry] URL 解析失败:', e)
    return {
      staticRegistered: false,
      dynamicCount: 0,
      total: 0
    }
  }
}
