import { initializeBuiltinWebMCP } from './initialize-builtin-WebMCP'

/** 在浏览器页面中注册 page-agent-tool, 用于页面的内容获取和操作，页面的动效 */
export async function registerPageAgentTool() {
  initializeBuiltinWebMCP()
}
