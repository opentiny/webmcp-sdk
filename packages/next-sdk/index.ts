// 从相关包中，导出一些常用变量，方便用户导入
import Ajv from 'ajv'
export { Ajv }
export { z } from 'zod'
export { AuthClientProvider } from '@opentiny/next'
export { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js'
export { UriTemplate } from '@modelcontextprotocol/sdk/shared/uriTemplate.js'
export { completable } from '@modelcontextprotocol/sdk/server/completable.js'
export { getDisplayName } from '@modelcontextprotocol/sdk/shared/metadataUtils.js'
export { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
export type * from 'zod'
export type * from '@opentiny/next'
export type * from '@modelcontextprotocol/sdk/types.js'
export type * from '@modelcontextprotocol/sdk/shared/protocol.js'
export type * from '@modelcontextprotocol/sdk/shared/transport.js'
export type * from '@modelcontextprotocol/sdk/client/sse.js'
export type * from '@modelcontextprotocol/sdk/client/streamableHttp.js'
export type * from '@modelcontextprotocol/sdk/server/mcp.js'

// 2大核心模块
export * from './WebMcpServer'
export * from './WebMcpClient'

// 快速创建一个悬浮图标和菜单，是扫码和聊天框的入口
export * from './remoter/createRemoter'

// 一个通用的ai-sdk的agent封装
export { AgentModelProvider } from './agent/AgentModelProvider'

// 快速 从官方 mcp 或 WebMcpClient 这2种client中， 抽取成 ai-sdk 所需要的 tool的对象
export { getAISDKTools } from './agent/utils/getAISDKTools'

// 方便的二维码类
export { QrCode, type QrCodeOption } from './remoter/QrCode'
export type * from './agent/type'

// Web MCP 页面工具桥接：工具调用自动导航 + 页面消息通信
export * from './page-tools/bridge'

// Web 端 Skill 公共能力：解析 skill 文档、生成 systemPrompt、内置 list_skills / get_skill_content 工具
export {
  getSkillOverviews,
  formatSkillsForSystemPrompt,
  getSkillMdContent,
  getMainSkillPaths,
  getMainSkillPathByName,
  parseSkillFrontMatter,
  createSkillTools,
  type SkillMeta,
  type SkillToolsSet
} from './skills/index'

export * from '@mcp-b/webmcp-polyfill'

export { initializeBuiltinWebMCP } from './page-tools/initialize-builtin-WebMCP'
export { registerPageAgentTool } from './page-tools/page-agent-tool'
export { PAGE_AGENT_TOOL_CALL_EVENT, PAGE_AGENT_TOOL_RESULT_EVENT } from './page-tools/page-agent-tool-event'
export type { PageAgentToolCallEventDetail, PageAgentToolResultEventDetail } from './page-tools/page-agent-tool-event'
export type { PageAgentToolOptions } from './page-tools/constants'

// 统一无障碍配置（A11yConfig）：角色/状态规则、白/黑名单、自定义属性、弹窗选择器，
// 以及供用户直接调用的底层解析函数与运行期读写 API
export {
  DEFAULT_A11Y_CONFIG,
  defineA11yConfig,
  resolveA11yInfo,
  resolveA11yRole,
  resolveA11yStates,
  mergeA11yConfig,
  mergeA11yConfigs,
  getA11yConfig,
  setA11yConfig,
  extractSelectors,
} from './page-tools/a11y/config'
export type { A11yConfig, A11yRoleRule, A11yMatcher, A11yStateName, A11yInfo } from './page-tools/a11y/config'

// 无障碍树构建与搜索：供高级用户直接生成/搜索自定义根节点下的无障碍树
export { buildA11yTree } from './page-tools/a11y/build'
export { searchA11yTree } from './page-tools/a11y/search'
export type { A11yTreeOptions, A11yTreeResult, SearchA11yTreeOptions, SearchA11yTreeResult, VNode, RefMap } from './page-tools/a11y/types'
