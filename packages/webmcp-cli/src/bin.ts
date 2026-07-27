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
import { watchCommand } from './commands/watch'
import packageJson from '../package.json'

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
  .description('WebMCP CLI for interacting with browser via CDP')
  .version(packageJson.version)
  .option('-w, --workspace <path>', '指定自定义的浏览器工作空间（用户配置目录）路径')
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

program
  .command('watch')
  .description('后台监听页签打开/导航并自动注入 WebMCP（通常由 CLI 自动拉起，也可手动运行）')
  .action(async () => {
    try {
      await watchCommand()
    } catch (error: unknown) {
      handleCommandError(error, 'watch')
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

program.parse(process.argv)
