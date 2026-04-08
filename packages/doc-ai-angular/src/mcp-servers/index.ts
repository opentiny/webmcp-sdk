import { registerNavigateTool } from '@opentiny/next-sdk'
import registerFinanceTools from './finance/tools'
export { useWebAgentServer } from './useWebAgentServer'

export const createMcpServer = async () => {
  registerNavigateTool((navigator as any).modelContext)

  // 仅保留财务工具在 mcp-servers 侧声明（其余工具已迁移到业务页面内一体化定义）
  registerFinanceTools()
}
