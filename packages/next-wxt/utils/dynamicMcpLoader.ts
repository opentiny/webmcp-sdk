/**
 * 动态 MCP 工具加载器
 * 从 storage 加载用户自定义的动态 MCP 工具，并动态注册到系统中
 */

import { storage } from '@wxt-dev/storage'
import { STORAGE_KEYS } from '../entrypoints/options/types'
import type { DynamicMcpTool } from '../entrypoints/options/types'
import { z } from 'zod'

/**
 * 检查 URL 是否匹配给定的模式
 * @param url - 完整的 URL
 * @param domain - 域名
 * @param pattern - URL 匹配模式（可选，支持通配符 *）
 * @returns 是否匹配
 */
function matchesUrlPattern(url: string, domain: string, pattern?: string): boolean {
  try {
    const urlObj = new URL(url)
    
    // 检查域名是否匹配
    if (!urlObj.hostname.includes(domain)) {
      return false
    }
    
    // 如果没有指定 pattern，匹配该域名下所有页面
    if (!pattern) {
      return true
    }
    
    // 将通配符模式转换为正则表达式
    const regexPattern = pattern
      .replace(/[.+?^${}()|[\]\\]/g, '\\$&') // 转义特殊字符
      .replace(/\*/g, '.*') // 将 * 转换为 .*
    
    const regex = new RegExp(`^${regexPattern}$`)
    return regex.test(urlObj.pathname)
  } catch (e) {
    console.error('[dynamicMcpLoader] URL 解析失败:', e)
    return false
  }
}

/**
 * 加载所有动态 MCP 工具配置
 * @returns 动态工具列表
 */
export async function loadDynamicMcpTools(): Promise<DynamicMcpTool[]> {
  try {
    const data = (await storage.getMeta(STORAGE_KEYS.DYNAMIC_MCP_TOOLS)) || { list: [] }
    const tools = Array.isArray(data.list) ? data.list : []
    
    // 只返回已启用的工具
    return tools.filter((tool: DynamicMcpTool) => tool.enabled)
  } catch (e) {
    console.error('[dynamicMcpLoader] 加载动态工具失败:', e)
    return []
  }
}

/**
 * 根据当前 URL 获取匹配的动态工具
 * @param url - 当前页面的 URL
 * @returns 匹配的工具列表
 */
export async function getMatchedDynamicTools(url: string): Promise<DynamicMcpTool[]> {
  const allTools = await loadDynamicMcpTools()
  
  return allTools.filter(tool => {
    return matchesUrlPattern(url, tool.domain, tool.urlPattern)
  })
}

/**
 * 根据域名获取匹配的动态工具
 * @param hostname - 域名（如 'excalidraw.com'）
 * @returns 匹配的工具列表
 */
export async function getDynamicToolsByHostname(hostname: string): Promise<DynamicMcpTool[]> {
  const allTools = await loadDynamicMcpTools()
  
  return allTools.filter(tool => {
    return tool.domain === hostname
  })
}

/**
 * 执行动态工具代码并注册到 MCP Server
 * @param tool - 动态工具配置
 * @param server - MCP Server 实例
 * @param cookie - Cookie 数据（可选）
 * @returns 是否成功注册
 */
export function registerDynamicTool(
  tool: DynamicMcpTool,
  server: any,
  cookie: Record<string, any> = {}
): boolean {
  try {
    // 使用 Function 构造函数动态执行代码
    // 注意：这里使用 default export 格式，与现有的 mcp-servers 保持一致
    const codeWrapper = `
      return (function() {
        ${tool.code}
      })();
    `
    
    const moduleFactory = new Function(codeWrapper)
    const moduleExports = moduleFactory()
    
    // 获取默认导出的函数
    const toolFunction = moduleExports.default || moduleExports
    
    if (typeof toolFunction !== 'function') {
      console.error(`[dynamicMcpLoader] 工具 ${tool.name} 的代码未导出函数`)
      return false
    }
    
    // 执行工具注册函数
    toolFunction({ server, z, cookie })
    
    console.log(`[dynamicMcpLoader] 成功注册动态工具: ${tool.name}`)
    return true
  } catch (e) {
    console.error(`[dynamicMcpLoader] 注册动态工具 ${tool.name} 失败:`, e)
    return false
  }
}

/**
 * 批量注册匹配的动态工具
 * @param url - 当前页面的 URL
 * @param server - MCP Server 实例
 * @param cookie - Cookie 数据（可选）
 * @returns 成功注册的工具数量
 */
export async function registerMatchedDynamicTools(
  url: string,
  server: any,
  cookie: Record<string, any> = {}
): Promise<number> {
  const matchedTools = await getMatchedDynamicTools(url)
  
  let successCount = 0
  for (const tool of matchedTools) {
    const success = registerDynamicTool(tool, server, cookie)
    if (success) {
      successCount++
    }
  }
  
  console.log(`[dynamicMcpLoader] 为 ${url} 注册了 ${successCount}/${matchedTools.length} 个动态工具`)
  return successCount
}

/**
 * 批量注册指定域名的动态工具
 * @param hostname - 域名
 * @param server - MCP Server 实例
 * @param cookie - Cookie 数据（可选）
 * @returns 成功注册的工具数量
 */
export async function registerDynamicToolsByHostname(
  hostname: string,
  server: any,
  cookie: Record<string, any> = {}
): Promise<number> {
  const tools = await getDynamicToolsByHostname(hostname)
  
  let successCount = 0
  for (const tool of tools) {
    const success = registerDynamicTool(tool, server, cookie)
    if (success) {
      successCount++
    }
  }
  
  console.log(`[dynamicMcpLoader] 为域名 ${hostname} 注册了 ${successCount}/${tools.length} 个动态工具`)
  return successCount
}
