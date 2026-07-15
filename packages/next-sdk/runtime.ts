import { initializeBuiltinWebMCP } from './page-tools/initialize-builtin-WebMCP'
import { registerPageAgentTool } from './page-tools/page-agent-tool'
import { getPageAgentToolConfig, setPageAgentToolConfig } from './page-tools/tool-config'
import { defineA11yConfig } from './page-tools/a11y/config'
import {
  consoleCloudPageAgentToolOptions,
  isConsoleCloudHost,
} from './page-tools/configs/console-cloud'

/**
 * runtime IIFE 仅挂载可调用 API，不自动 registerPageAgentTool。
 * 调用方需自行传入 enableHighlight / a11yConfig 等选项后再注册，例如：
 *   registerPageAgentTool({ enableHighlight: true, a11yConfig: { exposedAttributes: ['cf-uba'] } })
 *   registerPageAgentTool(consoleCloudPageAgentToolOptions)
 */
const runtimeApi = {
  initializeBuiltinWebMCP,
  registerPageAgentTool,
  getPageAgentToolConfig,
  setPageAgentToolConfig,
  defineA11yConfig,
  consoleCloudPageAgentToolOptions,
  isConsoleCloudHost,
}

if (typeof window !== 'undefined') {
  Object.assign(window, runtimeApi)

  // 之前版本存在 WebMCP.registerPageAgentTool，当前先临时兼容，后续再移除
  if (!(window as any).WebMCP) {
    ;(window as any).WebMCP = {}
  }
  Object.assign((window as any).WebMCP, runtimeApi)
}

export {
  initializeBuiltinWebMCP,
  registerPageAgentTool,
  getPageAgentToolConfig,
  setPageAgentToolConfig,
  defineA11yConfig,
  consoleCloudPageAgentToolOptions,
  isConsoleCloudHost,
}
