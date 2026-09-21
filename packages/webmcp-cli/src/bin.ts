#!/usr/bin/env node
import fs from 'fs'
import path from 'path'
import os from 'os'
import { Command } from 'commander'
import pc from 'picocolors'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { getFileBaseDir } from './expand-file-refs'
import { prepareRunArgsJson } from './parse-run-args'
import { stateCommand } from './commands/state'
import { runCommand } from './commands/run'
import { setClipboard } from './commands/clipboard'
import {
  tabsOpenCommand,
  tabsCloseCommand,
  tabsSwitchCommand,
  tabsBackCommand,
  tabsForwardCommand
} from './commands/tabs'
import packageJson from '../package.json'

// ─── WXT 模式预检：在 Commander 解析前提取 --mode 参数 ──────────────────────
// 支持：--mode wxt / --mode cdp / WEBMCP_MODE=wxt 环境变量
function extractMode(argv: string[]): { mode: 'cdp' | 'wxt'; filteredArgv: string[] } {
  let mode: 'cdp' | 'wxt' = (process.env.WEBMCP_MODE === 'wxt') ? 'wxt' : 'cdp'
  const filteredArgv: string[] = []
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--mode' && argv[i + 1]) {
      const val = argv[i + 1].toLowerCase()
      if (val === 'wxt' || val === 'cdp') mode = val
      i++ // 跳过值
    } else if (argv[i].startsWith('--mode=')) {
      const val = argv[i].split('=')[1]?.toLowerCase()
      if (val === 'wxt' || val === 'cdp') mode = val
    } else {
      filteredArgv.push(argv[i])
    }
  }
  return { mode, filteredArgv }
}

const { mode: CLI_MODE, filteredArgv: FILTERED_ARGV } = extractMode(process.argv)

const program = new Command()

function parseTabId(id?: string): string | undefined {
  if (!id) return undefined
  return id
}

/** 解析 browserState 返回文本：新格式为纯 JSON；兼容旧前缀 / 尾部告警 */
function tryParseBrowserStateText(text: string): Record<string, unknown> & { content: string } | null {
  const tryParse = (jsonStr: string) => {
    try {
      const parsed = JSON.parse(jsonStr) as Record<string, unknown>
      if (parsed && typeof parsed.content === 'string') {
        return parsed as Record<string, unknown> & { content: string }
      }
    } catch {
      // ignore
    }
    return null
  }

  const direct = tryParse(text)
  if (direct) return direct

  if (text.startsWith('浏览器状态: ')) {
    let jsonStr = text.substring('浏览器状态: '.length)
    const firstNewline = jsonStr.indexOf('\n')
    if (firstNewline !== -1) {
      const maybeJson = jsonStr.substring(0, firstNewline)
      if (tryParse(maybeJson)) jsonStr = maybeJson
    }
    return tryParse(jsonStr)
  }

  return null
}

function cleanOldLogs(baseDir: string, logDir: string) {
  try {
    // 1. 清理原本根目录下的旧版单文件和旧版日期文件
    const oldLogFile = path.join(baseDir, 'webmcp-cli.log')
    if (fs.existsSync(oldLogFile)) {
      try { fs.unlinkSync(oldLogFile) } catch {}
    }
    if (fs.existsSync(baseDir)) {
      const baseFiles = fs.readdirSync(baseDir)
      for (const file of baseFiles) {
        if (/^webmcp-cli-\d{4}-\d{2}-\d{2}\.log$/.test(file)) {
          try { fs.unlinkSync(path.join(baseDir, file)) } catch {}
        }
      }
    }

    // 2. 清理 logs 目录下超过 7 天的日志
    if (!fs.existsSync(logDir)) return
    const files = fs.readdirSync(logDir)
    const logFilePattern = /^webmcp-cli-(\d{4}-\d{2}-\d{2})\.log$/
    const now = Date.now()
    const maxAgeMs = 7 * 24 * 60 * 60 * 1000 // 7天

    for (const file of files) {
      const match = file.match(logFilePattern)
      if (match) {
        const fileDateStr = match[1]
        const fileDate = new Date(fileDateStr).getTime()
        if (isNaN(fileDate)) continue
        if (now - fileDate > maxAgeMs) {
          try {
            fs.unlinkSync(path.join(logDir, file))
          } catch {
            // 忽略单文件删除失败
          }
        }
      }
    }
  } catch (e) {
    // 忽略清理日志本身的错误
  }
}

function formatLogResult(result: any): string {
  if (result === undefined || result === null) {
    return 'null'
  }

  try {
    if (typeof result !== 'object') {
      return String(result)
    }

    // 深拷贝 result，防止意外修改原始数据导致控制台输出受影响
    const clone = JSON.parse(JSON.stringify(result))
    let a11yTreeStr = ''
    let searchResultStr = ''

    // 检测 page-agent-tool 的 browserState/操作 动作返回
    if (
      clone &&
      Array.isArray(clone.content) &&
      clone.content.length > 0 &&
      clone.content[0] &&
      typeof clone.content[0].text === 'string'
    ) {
      const text = clone.content[0].text
      const browserState = tryParseBrowserStateText(text)
      if (browserState) {
        a11yTreeStr = browserState.content
        // 替换 clone 中的 content 部分，避免在 JSON 序列化时产生超长难读的字符串
        browserState.content = '[Formatted A11y Tree - See details below]'
        clone.content[0].text = JSON.stringify(browserState, null, 2)
      } else if (
        text.includes('A11y Tree 搜索结果') ||
        text.includes('无障碍树搜索结果') ||
        text.includes('无障碍树搜索') ||
        text.includes('命中行') ||
        text.includes('context:')
      ) {
        // 如果是 searchTree 的返回，或者其他可能包含 A11y Tree 搜索结构的多行文本
        searchResultStr = text
        clone.content[0].text = '[Search A11y Tree Result - See details below]'
      }
    }

    let out = JSON.stringify(clone, null, 2)
    if (a11yTreeStr) {
      out += `\n\n[FORMATTED A11Y TREE]:\n${a11yTreeStr}`
    }
    if (searchResultStr) {
      out += `\n\n[FORMATTED SEARCH RESULT]:\n${searchResultStr}`
    }
    return out
  } catch (e) {
    // 降级使用标准 stringify
    try {
      return JSON.stringify(result, null, 2)
    } catch {
      return String(result)
    }
  }
}

function writeLog(commandName: string, args: any, result: any, error?: any) {
  try {
    const baseDir = process.env.WEBMCP_WORKSPACE || path.join(os.homedir(), '.webmcp_chrome_profile')
    const logDir = path.join(baseDir, 'logs')
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true })
    }
    const todayStr = new Date().toISOString().split('T')[0]
    const logFile = path.join(logDir, `webmcp-cli-${todayStr}.log`)

    const timestamp = new Date().toISOString()
    let logText = `========================================\n`
    logText += `[${timestamp}] COMMAND: ${commandName}\n`
    logText += `ARGS:\n${JSON.stringify(args, null, 2)}\n\n`

    if (error) {
      logText += `ERROR:\n${error instanceof Error ? error.stack : String(error)}\n`
    } else if (result) {
      logText += `RESULT:\n`
      const formattedResult = formatLogResult(result)
      logText += formattedResult.split('\n').map(line => `  ${line}`).join('\n') + '\n'
    } else {
      logText += `RESULT: null\n`
    }
    logText += `========================================\n\n`

    fs.appendFileSync(logFile, logText, 'utf-8')
    cleanOldLogs(baseDir, logDir)
  } catch (e) {
    // 忽略日志写入本身的错误，防止阻塞主流程
  }
}

function handleCommandError(error: unknown, commandName: string, args?: any): never {
  const msg = error instanceof Error ? error.message : String(error)
  writeLog(commandName, args, null, error)
  console.error(pc.red(`Error executing ${commandName} command: ${msg}`))
  process.exit(1)
}

program
  .name('webmcp-cli')
  .description(
    'WebMCP CLI — 支持两种浏览器连接模式：\n' +
    '  --mode cdp（默认）: 基于 Puppeteer + CDP 直连浏览器（独立 profile）\n' +
    '  --mode wxt        : 基于 WebSocket + Chrome 扩展桥接（复用用户数据）'
  )
  .version(packageJson.version)
  .option('-w, --workspace <path>', '指定自定义的浏览器工作空间（用户配置目录）路径，仅 CDP 模式有效')
  .hook('preAction', (thisCommand) => {
    const opts = thisCommand.opts()
    if (opts.workspace) {
      process.env.WEBMCP_WORKSPACE = opts.workspace
    }
  })

program
  .command('state')
  .description('获取浏览器当前页签或指定页签的导航元数据（url、title、webmcpTools、所有页签列表）')
  .option('-t, --tabid <id>', '指定页签的 ID')
  .action(async (options) => {
    const args = { tabid: parseTabId(options.tabid) }
    try {
      const result = await stateCommand(args)
      writeLog('state', args, result)
      console.log(formatLogResult(result))
    } catch (error: unknown) {
      handleCommandError(error, 'state', args)
    }
  })

program
  .command('run <toolName> [args...]')
  .description('向指定页签调用指定的 WebMCP 工具执行操作')
  .option('-t, --tabid <id>', '指定页签的 ID')
  .option(
    '-f, --file <path>',
    '从指定 .json 文件读取整个参数（文件内容即为参数 JSON）。\n' +
      '如需在参数中内联引用文件，使用占位符语法：\n' +
      '  @file:<path>       读取文件原始文本\n' +
      '  @base64file:<path> 读取文件并 Base64 编码\n' +
      '示例：webmcp-cli run mytool \'{"content":"@base64file:./doc.md"}\''
  )
  .action(async (toolName, args, options) => {
    let finalArgsJson = ''
    const rawArgs = { toolName, args, file: options.file, tabid: options.tabid }
    try {
      let fileContent: string | undefined
      let fileBaseDir = process.cwd()

      if (options.file) {
        const filePath = resolve(process.cwd(), options.file)
        fileBaseDir = getFileBaseDir(options.file)
        try {
          fileContent = readFileSync(filePath, 'utf-8')
        } catch (e: any) {
          throw new Error(`无法读取文件 "${filePath}": ${e.message}`)
        }
      }

      finalArgsJson = prepareRunArgsJson(args ?? [], fileContent, fileBaseDir)

      const result = await runCommand({
        toolName,
        argsJson: finalArgsJson,
        tabid: parseTabId(options.tabid)
      })
      writeLog('run', { ...rawArgs, finalArgsJson }, result)
      console.log(formatLogResult(result))
    } catch (error: unknown) {
      handleCommandError(error, 'run', { ...rawArgs, finalArgsJson })
    }
  })


program
  .command('clipboard <content>')
  .description('将内容设置到系统剪贴板')
  .action(async (content) => {
    const args = { content }
    try {
      await setClipboard(content)
      const result = { success: true, message: '内容已设置到系统剪贴板' }
      writeLog('clipboard', args, result)
      console.log(JSON.stringify(result, null, 2))
    } catch (error: unknown) {
      handleCommandError(error, 'clipboard', args)
    }
  })

const tabs = program.command('tabs').description('管理浏览器标签页')

tabs
  .command('open <url>')
  .description('打开新网页')
  .action(async (url) => {
    const args = { url }
    try {
      const result = await tabsOpenCommand(url)
      writeLog('tabs open', args, result)
      console.log(JSON.stringify(result, null, 2))
    } catch (error: unknown) {
      handleCommandError(error, 'tabs open', args)
    }
  })

tabs
  .command('close <tabid>')
  .description('关闭指定 tabid 的标签页')
  .action(async (tabid) => {
    const args = { tabid }
    try {
      const result = await tabsCloseCommand(tabid)
      writeLog('tabs close', args, result)
      console.log(JSON.stringify(result, null, 2))
    } catch (error: unknown) {
      handleCommandError(error, 'tabs close', args)
    }
  })

tabs
  .command('switch <tabid>')
  .description('激活并切换到指定 tabid 的标签页')
  .action(async (tabid) => {
    const args = { tabid }
    try {
      const result = await tabsSwitchCommand(tabid)
      writeLog('tabs switch', args, result)
      console.log(JSON.stringify(result, null, 2))
    } catch (error: unknown) {
      handleCommandError(error, 'tabs switch', args)
    }
  })

tabs
  .command('back [tabid]')
  .description('将当前或指定标签页导航后退一步')
  .action(async (tabid) => {
    const args = { tabid: parseTabId(tabid) }
    try {
      const result = await tabsBackCommand(args.tabid)
      writeLog('tabs back', args, result)
      console.log(JSON.stringify(result, null, 2))
    } catch (error: unknown) {
      handleCommandError(error, 'tabs back', args)
    }
  })

tabs
  .command('forward [tabid]')
  .description('将当前或指定标签页导航前进一步')
  .action(async (tabid) => {
    const args = { tabid: parseTabId(tabid) }
    try {
      const result = await tabsForwardCommand(args.tabid)
      writeLog('tabs forward', args, result)
      console.log(JSON.stringify(result, null, 2))
    } catch (error: unknown) {
      handleCommandError(error, 'tabs forward', args)
    }
  })

// CDP 模式：mcp 子命令（以 MCP Server 方式启动，CDP 底层）
program
  .command('mcp')
  .description('以标准 MCP Server 模式启动（stdio 传输，CDP 底层）。\n使用 --mode wxt mcp 切换到 WXT 桥接底层。')
  .option('--agent', '以子代理模式启动（收敛工具为高层委托接口）')
  .action(async (opts) => {
    try {
      const { startMcpServer } = await import('./mcp/server.js')
      await startMcpServer({ mode: 'cdp', agentMode: opts.agent ? 'agent' : 'tools' })
    } catch (error: unknown) {
      handleCommandError(error, 'mcp', {})
    }
  })

// ─── 模式路由 ────────────────────────────────────────────────────────────────
if (CLI_MODE === 'wxt') {
  // WXT 模式：路由到独立的 WXT 命令处理器
  void handleWxtMode(FILTERED_ARGV.slice(2)).catch((error: unknown) => {
    handleCommandError(error, `wxt:${FILTERED_ARGV[2] ?? 'help'}`, {})
  })
} else {
  // CDP 模式（默认）：走 Commander 原有逻辑，完全向后兼容
  program.parse(FILTERED_ARGV)
}

async function handleWxtMode(args: string[]): Promise<void> {
  const command = args[0]

  // 生命周期命令（无需 adapter）
  if (command === 'daemon' || command === 'server') {
    const { runDaemonProcess } = await import('./bridge/daemon.js')
    await runDaemonProcess(args.slice(1))
    return
  }

  if (command === 'stop') {
    const { stopBridgeDaemon } = await import('./bridge/daemon.js')
    const stopped = await stopBridgeDaemon()
    console.log(stopped ? '✅ 已停止后台 WebSocket 桥接服务' : 'ℹ️ 当前没有运行中的后台桥接服务')
    return
  }

  if (command === 'token') {
    const subArgs = args.slice(1)
    let wsPort: number | undefined
    const cleanArgs: string[] = []
    for (let i = 0; i < subArgs.length; i++) {
      if ((subArgs[i] === '--ws-port' || subArgs[i] === '--port') && subArgs[i + 1]) {
        wsPort = parseInt(subArgs[++i], 10) || undefined
      } else {
        cleanArgs.push(subArgs[i])
      }
    }

    const action = cleanArgs[0]
    let tokenToSet: string | undefined
    if (action === 'set' && cleanArgs[1]) {
      tokenToSet = cleanArgs[1].trim()
    } else if (action && action !== 'get' && !action.startsWith('-')) {
      tokenToSet = action.trim()
    }

    const { resolveOrCreateAuthToken } = await import('./bridge/bridge-client.js')
    if (tokenToSet) {
      resolveOrCreateAuthToken(tokenToSet)
      console.log('✅ Token 已成功保存至 ~/.robot-wxt/bridge-token')
      const { stopBridgeDaemon, ensureBridgeDaemon } = await import('./bridge/daemon.js')
      await stopBridgeDaemon(wsPort)
      await ensureBridgeDaemon({ token: tokenToSet, port: wsPort })
      console.log('💡 后续所有 CLI 命令与 MCP 工具均将自动使用此凭据，无需重复输入。')
      return
    }

    console.log(resolveOrCreateAuthToken())
    return
  }

  if (command === 'mcp') {
    // MCP Server 模式（WXT 底层）
    const { startMcpServer } = await import('./mcp/server.js')
    const isAgent = args.includes('--agent') || args.includes('--mode=agent')
    const tokenIdx = args.indexOf('--token')
    const token = tokenIdx !== -1 ? args[tokenIdx + 1] : undefined
    const wsPortIdx = args.indexOf('--ws-port')
    const wsPort = wsPortIdx !== -1 ? parseInt(args[wsPortIdx + 1], 10) || undefined : undefined
    await startMcpServer({ mode: 'wxt', agentMode: isAgent ? 'agent' : 'tools', token, wsPort })
    return
  }

  if (!command || command === '--help' || command === '-h') {
    printWxtHelp()
    return
  }

  // 需要 adapter 的命令：提取 token、ws-port、tab 等公共选项
  let token: string | undefined
  let wsPort: number | undefined
  const commandArgs: string[] = []
  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--token' && args[i + 1]) { token = args[++i] }
    else if (args[i] === '--ws-port' && args[i + 1]) { wsPort = parseInt(args[++i], 10) || undefined }
    else { commandArgs.push(args[i]) }
  }

  const { ensureBridgeDaemon } = await import('./bridge/daemon.js')
  const isJson = commandArgs.includes('--json')
  await ensureBridgeDaemon({ token, port: wsPort, silent: isJson })

  const { WxtBrowserAdapter } = await import('./adapters/wxt-adapter.js')
  const adapter = new WxtBrowserAdapter(token, wsPort)
  await adapter.ensureConnected()

  try {
    switch (command) {
      case 'state': {
        const tabIdx = commandArgs.indexOf('--tab')
        const tabId = tabIdx !== -1 ? commandArgs[tabIdx + 1] : undefined
        const result = await adapter.getState(tabId ? parseInt(tabId, 10) : undefined)
        console.log(JSON.stringify(result, null, 2))
        break
      }
      case 'run': {
        const toolName = commandArgs.find((a) => !a.startsWith('-'))
        const argsStr = commandArgs.slice(commandArgs.indexOf(toolName!) + 1).find((a) => !a.startsWith('-'))
        if (!toolName) { console.error('[错误] 请提供工具名称'); process.exit(1) }
        const toolArgs = argsStr ? JSON.parse(argsStr) : {}
        const result = await adapter.callTool(toolName, toolArgs)
        console.log(JSON.stringify(result, null, 2))
        break
      }
      case 'tabs': {
        const tabAction = commandArgs[0] as 'open' | 'close' | 'switch' | 'back' | 'forward'
        const tabArgs = commandArgs.slice(1)
        const url = tabArgs.find((a) => a.startsWith('http'))
        const tabIdVal = tabArgs.find((a) => !a.startsWith('-') && !a.startsWith('http'))
        const result = await adapter.tabs(tabAction, {
          url,
          tabId: tabIdVal ? parseInt(tabIdVal, 10) : undefined
        })
        console.log(JSON.stringify(result, null, 2))
        break
      }
      case 'agent': {
        const { handleAgentCommand } = await import('./commands/agent.js')
        await handleAgentCommand(adapter, commandArgs)
        break
      }
      case 'skills':
      case 'skill': {
        const { handleSkillsCommand } = await import('./commands/skills.js')
        await handleSkillsCommand(adapter, commandArgs)
        break
      }
      default:
        console.error(`[错误] WXT 模式下未知命令: ${command}`)
        printWxtHelp()
        process.exit(1)
    }
  } finally {
    await adapter.dispose()
  }
}

function printWxtHelp(): void {
  console.log(`
webmcp-cli --mode wxt — WXT 桥接模式（通过 Chrome 扩展连接，复用用户数据）

命令：
  state                   获取当前活跃 tab 信息与页面工具列表
  run <tool> [args]       调用页面 WebMCP 工具
  tabs <action> [...]     管理标签页（open/close/switch/back/forward）
  agent run "<指令>"      委托 Tiny Robot 子代理自主执行高层任务
  skills list             列出已注册的 Skills 技能
  skills get <name>       读取指定技能的详细指令
  token [get|set <t>]     查看或保存认证 Token
  stop                    停止后台 WebSocket 桥接服务
  mcp                     以 MCP Server 模式启动

选项：
  --token <token>         认证 Token（优先于 ~/.robot-wxt/bridge-token）
  --ws-port <port>        WS 桥接端口（默认 18999）
  --json                  输出 JSON 格式

示例：
  webmcp-cli --mode wxt state
  webmcp-cli --mode wxt agent run "帮我把商品加入购物车"
  webmcp-cli --mode wxt mcp --agent
  `.trim())
}
