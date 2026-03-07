/**
 * Angular CLI 构建用：仅导出本应用需要的 next-sdk 能力，避免拉入 createRemoter（含 .svg?url 等 Vite 语法），
 * 从而让 ng build 无需处理 SVG 资源即可通过。
 */
export {
  setNavigator,
  withPageTools,
  registerPageTool,
  type RouteConfig,
  type PageAwareServer,
} from '../../../next-sdk/page-tool-bridge'
export { WebMcpServer, createMessageChannelServerTransport } from '../../../next-sdk/WebMcpServer'
