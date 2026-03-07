/**
 * Angular 构建用：仅导出本应用需要的 next-sdk 能力，避免拉入 createRemoter 等含 .svg?url 的模块，
 * 使 ng build 无需解析 next-sdk 整包即可通过。
 */
export {
  setNavigator,
  withPageTools,
  registerPageTool,
  type RouteConfig,
  type PageAwareServer
} from '../../../next-sdk/page-tool-bridge'
export { WebMcpServer, createMessageChannelServerTransport } from '../../../next-sdk/WebMcpServer'
