import { registerNavigateTool } from '@opentiny/next-sdk'
import type { PageAwareServer, WebMcpServer } from '@opentiny/next-sdk'
import registerFinanceTools from './finance/tools'

/**
 * 注册所有模块的工具代码，抽离公共逻辑以减少重复
 */
export const registerAllTools = (server: PageAwareServer) => {
  // registerNavigateTool 需要 WebMcpServer 实例。
  // 由于 PageAwareServer 是通过 Proxy 包装的，除了 registerTool 被拦截外，
  // 其他属性调用都会转发给原始的 rawServer，因此这里可以安全地进行断言。
  registerNavigateTool(server as unknown as WebMcpServer)
  
  // 仅保留财务工具在 mcp-servers 侧声明（其余工具已迁移到业务页面内一体化定义）
  registerFinanceTools(server)
}
