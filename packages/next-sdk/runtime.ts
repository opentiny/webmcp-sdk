import { initializeBuiltinWebMCP } from './page-tools/initialize-builtin-WebMCP'
import { registerPageAgentTool } from './page-tools/page-agent-tool'

if (typeof window !== 'undefined') {
  ;(window as any).initializeBuiltinWebMCP = initializeBuiltinWebMCP
  ;(window as any).registerPageAgentTool = registerPageAgentTool

  // 之前版本存在WebMCP.registerPageAgentTool, 当前先临时兼容，后续再移除
  if (!(window as any).WebMCP) {
    ;(window as any).WebMCP = {}
  }
  ;(window as any).WebMCP.registerPageAgentTool = registerPageAgentTool

  // 作为 IIFE 注入到页面 MAIN world 时自动注册 page-agent-tool
  // 避免 content script 需要额外触发（会被 CSP 内联 script 限制拦截）
  registerPageAgentTool()
}

export { initializeBuiltinWebMCP, registerPageAgentTool }
