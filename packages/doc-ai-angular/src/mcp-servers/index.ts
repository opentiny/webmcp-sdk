import type { Router } from '@angular/router'
import { registerNavigateToPageTool } from './navigate-tool'
export { useWebAgentServer } from './useWebAgentServer'

export const createMcpServer = async (router: Router) => {
  // 自配导航工具：跳转后按 routeToolsMap 握手等待页面工具就绪
  registerNavigateToPageTool(router)
}
