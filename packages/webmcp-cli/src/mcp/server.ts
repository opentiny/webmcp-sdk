/**
 * MCP Server 核心（双模式）
 *
 * 通过 @modelcontextprotocol/sdk 的 StdioServerTransport 以标准 MCP 协议对外暴露。
 * 支持两种底层连接模式：
 * - 'cdp'（默认）：基于 Puppeteer + CDP 直连浏览器
 * - 'wxt'：基于 WebSocket + Chrome 扩展桥接（可复用用户数据）
 *
 * 架构：
 * MCP Client（Claude Desktop / Cursor / …）
 *   ──stdio──→ McpServer（本文件）
 *                ├─ CDP 模式: Puppeteer ──CDP──→ 浏览器
 *                └─ WXT 模式: ws://127.0.0.1:18999 ──→ Chrome 扩展 ──→ 页面
 */

import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import type { CdpBrowserAdapter } from '../adapters/cdp-adapter.js'
import type { WxtBrowserAdapter } from '../adapters/wxt-adapter.js'
import packageJson from '../../package.json'
import {
  BrowserStateInput,
  BrowserToolCallInput,
  BrowserTabsOpenInput,
  BrowserTabsCloseInput,
  BrowserTabsSwitchInput,
  BrowserTabsNavInput,
  BrowserSubAgentRunInput,
  BrowserSkillsListInput,
  BrowserSkillsReadInput
} from './tools.js'

const SERVER_NAME = 'webmcp-cli'
const SERVER_VERSION = packageJson.version || '0.0.9'

export type McpMode = 'cdp' | 'wxt'
export type McpAgentMode = 'tools' | 'agent'

export interface McpServerOptions {
  /** 底层连接模式，默认 cdp */
  mode?: McpMode
  /** 工具暴露模式：tools（全量原子工具）| agent（收敛为高层子代理，仅 wxt 模式有效） */
  agentMode?: McpAgentMode
  /** WXT 模式的认证 Token */
  token?: string
  /** WXT 模式的 WS 端口，默认 18999 */
  wsPort?: number
}

export async function startMcpServer(options: McpServerOptions = {}): Promise<void> {
  const mode = options.mode ?? 'cdp'
  const agentMode = options.agentMode ?? 'tools'
  const isAgentMode = agentMode === 'agent'

  const server = new McpServer({ name: SERVER_NAME, version: SERVER_VERSION })

  if (mode === 'cdp') {
    if (isAgentMode) {
      throw new Error('--agent 子代理委托模式仅在 WXT 模式可用，请使用: webmcp-cli --mode wxt mcp --agent')
    }
    await startCdpMcpServer(server, isAgentMode)
  } else {
    await startWxtMcpServer(server, isAgentMode, options)
  }

  const transport = new StdioServerTransport()
  await server.connect(transport)

  process.stderr.write(
    `[webmcp-cli] MCP Server 已启动（${SERVER_NAME} v${SERVER_VERSION}，模式: ${mode}${isAgentMode ? '/agent' : '/tools'}）\n`
  )
}

// ─── CDP 模式 MCP Server ─────────────────────────────────────────────────────

async function startCdpMcpServer(server: McpServer, isAgentMode: boolean): Promise<void> {
  const { CdpBrowserAdapter } = await import('../adapters/cdp-adapter.js')
  const adapter = new CdpBrowserAdapter()

  registerCommonTools(server, adapter, isAgentMode)

  process.on('SIGINT', async () => { await adapter.dispose(); process.exit(0) })
  process.on('SIGTERM', async () => { await adapter.dispose(); process.exit(0) })
}

// ─── WXT 模式 MCP Server ─────────────────────────────────────────────────────

async function startWxtMcpServer(server: McpServer, isAgentMode: boolean, options: McpServerOptions): Promise<void> {
  const { WxtBrowserAdapter } = await import('../adapters/wxt-adapter.js')
  const { ensureBridgeDaemon } = await import('../bridge/daemon.js')

  // 确保后台 daemon 已在运行
  const daemonResult = await ensureBridgeDaemon({
    token: options.token,
    port: options.wsPort,
    silent: true
  })

  const adapter = new WxtBrowserAdapter(options.token, options.wsPort)
  await adapter.ensureConnected()

  if (daemonResult.newlyStarted) {
    process.stderr.write('[webmcp-cli] 🚀 本地桥接服务已启动，正在等待 Chrome 扩展连接...\n')
  }

  const client = adapter.bridgeClient

  // 注册通用工具
  registerCommonTools(server, adapter, isAgentMode)

  // 注册 WXT 专属工具
  registerWxtTools(server, adapter, isAgentMode, server)

  // 注册 Skills Resource（L1/L2/L3）
  registerSkillsResources(server, adapter)

  client.on('connected', () => {
    process.stderr.write('[webmcp-cli] 已连接到 Chrome 扩展\n')
    try {
      server.server.notification({ method: 'notifications/resources/list_changed' })
    } catch { /* ignore */ }
  })
  client.on('disconnected', () => {
    process.stderr.write('[webmcp-cli] 与 Chrome 扩展的连接已断开\n')
  })

  process.on('SIGINT', async () => { await adapter.dispose(); process.exit(0) })
  process.on('SIGTERM', async () => { await adapter.dispose(); process.exit(0) })

  const tokenFingerprint = options.token ? `${options.token.slice(0, 6)}...` : '(auto)'
  process.stderr.write(`[webmcp-cli] 🔑 Token 指纹: ${tokenFingerprint} (完整凭据见 ~/.robot-wxt/bridge-token)\n`)
}

// ─── 通用工具注册（CDP + WXT 均支持） ────────────────────────────────────────

type AnyAdapter = CdpBrowserAdapter | WxtBrowserAdapter

function registerCommonTools(server: McpServer, adapter: AnyAdapter, isAgentMode: boolean): void {
  // browser_state
  server.registerTool(
    'browser_state',
    {
      description:
        '获取当前浏览器状态，包括：当前 tab 的 URL / 标题、所有已打开的 tab 列表、当前页面注册的 WebMCP 工具列表。在执行操作前，建议先调用此工具了解当前浏览器上下文。',
      inputSchema: BrowserStateInput.shape
    },
    async (args) => {
      const result = await adapter.getState(args.tabId)
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] }
    }
  )

  if (!isAgentMode) {
    // browser_tool_call
    server.registerTool(
      'browser_tool_call',
      {
        description:
          '执行当前页面注册的 WebMCP 工具（如 click、input、scroll 等）。工具名称和参数 schema 通过 browser_state 返回的 webmcpTools 字段获取。',
        inputSchema: BrowserToolCallInput.shape
      },
      async (args) => {
        const result = await adapter.callTool(args.toolName, args.toolArgs ?? {}, args.tabId)
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] }
      }
    )

    // browser_tabs_open
    server.registerTool(
      'browser_tabs_open',
      { description: '在浏览器中打开一个新标签页并导航到指定 URL。', inputSchema: BrowserTabsOpenInput.shape },
      async (args) => {
        const result = await adapter.tabs('open', { url: args.url })
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] }
      }
    )

    // browser_tabs_close
    server.registerTool(
      'browser_tabs_close',
      { description: '关闭指定标签页（不指定 tabId 时关闭当前活跃标签页）。', inputSchema: BrowserTabsCloseInput.shape },
      async (args) => {
        const result = await adapter.tabs('close', { tabId: args.tabId })
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] }
      }
    )

    // browser_tabs_switch
    server.registerTool(
      'browser_tabs_switch',
      {
        description: '将焦点切换到指定标签页（tabId 通过 browser_state 返回的 tabs 列表获取）。',
        inputSchema: BrowserTabsSwitchInput.shape
      },
      async (args) => {
        const result = await adapter.tabs('switch', { tabId: args.tabId, activateVisible: args.activateVisible })
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] }
      }
    )

    // browser_tabs_back
    server.registerTool(
      'browser_tabs_back',
      { description: '在指定标签页（或当前活跃标签页）中执行浏览器后退操作。', inputSchema: BrowserTabsNavInput.shape },
      async (args) => {
        const result = await adapter.tabs('back', { tabId: args.tabId })
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] }
      }
    )

    // browser_tabs_forward
    server.registerTool(
      'browser_tabs_forward',
      { description: '在指定标签页（或当前活跃标签页）中执行浏览器前进操作。', inputSchema: BrowserTabsNavInput.shape },
      async (args) => {
        const result = await adapter.tabs('forward', { tabId: args.tabId })
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] }
      }
    )
  }
}

// ─── WXT 专属工具注册 ─────────────────────────────────────────────────────────

function registerWxtTools(
  server: McpServer,
  adapter: WxtBrowserAdapter,
  isAgentMode: boolean,
  mcpServer: McpServer
): void {
  // browser_sub_agent_run
  server.registerTool(
    'browser_sub_agent_run',
    {
      description: isAgentMode
        ? '《Tiny Robot 端侧自主子代理》将复杂或长流程的浏览器操作任务委托给扩展端侧的 Tiny Robot 子代理闭环执行。子代理将在端侧自主观察页面、规划步骤并执行原子操作，执行完毕后返回最终结果，极大地节省主 Agent 上下文 Token。'
        : '《高层任务委托》将复杂、长流程或需反复试错的浏览器操作任务委托给 Chrome 扩展内部的 Tiny Robot 子代理（Sub-Agent）自主闭环执行。子代理将在端侧自主进行页面探索、规划和原子操作，执行完毕后返回最终结果，极大地节省外部主 Agent 的上下文 Token。',
      inputSchema: BrowserSubAgentRunInput.shape
    },
    async (args, extra) => {
      const progressToken = extra?._meta?.progressToken as string | number | undefined
      const onProgress = progressToken != null
        ? (params: any) => {
            if (params?.progressToken && params.progressToken !== progressToken) return
            try {
              mcpServer.server.notification({
                method: 'notifications/progress',
                params: { progressToken, progress: params?.step ?? 0, total: params?.total ?? args.maxSteps ?? 8, message: params?.message ?? '' }
              })
            } catch { /* ignore */ }
          }
        : undefined

      if (onProgress) adapter.bridgeClient.on('progress', onProgress)
      try {
        const result = await adapter.runSubAgent(args.instruction, {
          tabId: args.tabId,
          maxSteps: args.maxSteps,
          progressToken
        })
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] }
      } finally {
        if (onProgress) adapter.bridgeClient.off('progress', onProgress)
      }
    }
  )

  if (!isAgentMode) {
    // browser_skills_list
    server.registerTool(
      'browser_skills_list',
      {
        description:
          '【技能渐进式披露 - L1 索引层】获取当前浏览器扩展中已维护的所有 Skills 技能简短清单（仅返回名称、简介，消耗极少 Token）。在自主执行复杂或垂直领域任务前，可先调用此工具匹配最适用的技能。',
        inputSchema: BrowserSkillsListInput.shape
      },
      async () => {
        const result = await adapter.listSkills()
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] }
      }
    )

    // browser_skills_read
    server.registerTool(
      'browser_skills_read',
      {
        description:
          '【技能渐进式披露 - L2 契约层】根据技能名称按需读取该技能的完整详细执行指令 (instructions)、工作流规范与输入输出契约。',
        inputSchema: BrowserSkillsReadInput.shape
      },
      async (args) => {
        const result = await adapter.getSkill(args.name)
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] }
      }
    )
  }
}

// ─── Skills Resource 注册（L1/L2/L3） ────────────────────────────────────────

function registerSkillsResources(server: McpServer, adapter: WxtBrowserAdapter): void {
  server.registerResource(
    'skills_index',
    'skills://index',
    { description: 'Skills L1：扩展已注册的所有技能列表（仅元数据，消耗极少 Token）', mimeType: 'application/json' },
    async () => {
      try {
        const skills = await adapter.listSkills()
        return { contents: [{ uri: 'skills://index', text: JSON.stringify(skills, null, 2), mimeType: 'application/json' }] }
      } catch (err) {
        return { contents: [{ uri: 'skills://index', text: JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), mimeType: 'application/json' }] }
      }
    }
  )

  const skillDetailTemplate = new ResourceTemplate('skills://{skillName}/detail', { list: undefined })
  server.registerResource(
    'skill_detail',
    skillDetailTemplate,
    { description: 'Skills L2：按技能名实时拉取完整 SOP 执行指令与输入输出契约', mimeType: 'application/json' },
    async (uri, params) => {
      const { skillName } = params as { skillName: string }
      try {
        const detail = await adapter.getSkill(skillName)
        return { contents: [{ uri: uri.href, text: JSON.stringify(detail, null, 2), mimeType: 'application/json' }] }
      } catch (err) {
        return { contents: [{ uri: uri.href, text: JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), mimeType: 'application/json' }] }
      }
    }
  )

  const skillResourceTemplate = new ResourceTemplate('skills://{skillName}/{resourcePath}', { list: undefined })
  server.registerResource(
    'skill_resource',
    skillResourceTemplate,
    { description: 'Skills L3：读取技能关联的深入参考资料或配置文件（按需加载）', mimeType: 'text/plain' },
    async (uri, params) => {
      const { skillName, resourcePath } = params as { skillName: string; resourcePath: string }
      try {
        const text = await adapter.readSkillResource(skillName, resourcePath)
        return { contents: [{ uri: uri.href, text: String(text), mimeType: 'text/plain' }] }
      } catch (err) {
        return { contents: [{ uri: uri.href, text: `读取资源失败: ${err instanceof Error ? err.message : String(err)}`, mimeType: 'text/plain' }] }
      }
    }
  )
}
