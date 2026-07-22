import { registerNavigateToPageTool } from './navigate-tool'
import router from '../router'
export { useWebAgentServer } from './useWebAgentServer'

export const createMcpServer = async () => {
  // 自配导航工具：跳转后按 routeToolsMap 握手等待页面工具就绪
  registerNavigateToPageTool(router)
}
