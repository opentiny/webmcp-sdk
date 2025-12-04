/**
 * 设计专家需要的 MCP 工具列表
 * 这些工具将在激活该 skill 时自动注册
 * 根据所需域名从 mcp-servers 中动态获取工具
 */
import { getToolsByDomains } from '../utils/getToolsByDomains'
import meta from './meta'

// 定义该 skill 需要的域名列表
const requiredDomains = meta.requiredDomains

// 根据域名动态获取工具列表
const tools = getToolsByDomains(requiredDomains)

export default tools
