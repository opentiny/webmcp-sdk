#!/usr/bin/env node
import { Command } from 'commander'
import pc from 'picocolors'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { getFileBaseDir } from './expand-file-refs'
import { prepareRunArgsJson } from './parse-run-args'
import { stateCommand } from './commands/state'
import { runCommand } from './commands/run'
import { evaluateCommand } from './commands/evaluate'
import { setClipboard } from './commands/clipboard'
import {
  tabsOpenCommand,
  tabsCloseCommand,
  tabsSwitchCommand,
  tabsBackCommand,
  tabsForwardCommand
} from './commands/tabs'
import packageJson from '../package.json'

const program = new Command()

function parseTabId(id?: string): string | undefined {
  if (!id) return undefined
  return id
}

function handleCommandError(error: unknown, commandName: string): never {
  const msg = error instanceof Error ? error.message : String(error)
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
  .description('获取浏览器当前页签或指定页签的状态（内容、所有页签列表、可用 WebMCP 工具列表）')
  .option('-t, --tabid <id>', '指定页签的 ID')
  .action(async (options) => {
    try {
      const result = await stateCommand({ tabid: parseTabId(options.tabid) })
      console.log(JSON.stringify(result, null, 2))
    } catch (error: unknown) {
      handleCommandError(error, 'state')
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

      const finalArgsJson = prepareRunArgsJson(args ?? [], fileContent, fileBaseDir)

      const result = await runCommand({
        toolName,
        argsJson: finalArgsJson,
        tabid: parseTabId(options.tabid)
      })
      console.log(JSON.stringify(result, null, 2))
    } catch (error: unknown) {
      handleCommandError(error, 'run')
    }
  })

program
  .command('evaluate <jsScript>')
  .description('向当前网页或指定页签注入并执行 JavaScript 代码')
  .option('-t, --tabid <id>', '指定页签的 ID')
  .action(async (jsScript, options) => {
    try {
      const result = await evaluateCommand({
        jsScript,
        tabid: parseTabId(options.tabid)
      })
      console.log(JSON.stringify(result, null, 2))
    } catch (error: unknown) {
      handleCommandError(error, 'evaluate')
    }
  })

program
  .command('clipboard <content>')
  .description('将内容设置到系统剪贴板')
  .action(async (content) => {
    try {
      await setClipboard(content)
      console.log(JSON.stringify({ success: true, message: '内容已设置到系统剪贴板' }, null, 2))
    } catch (error: unknown) {
      handleCommandError(error, 'clipboard')
    }
  })

const tabs = program.command('tabs').description('管理浏览器标签页')

tabs
  .command('open <url>')
  .description('打开新网页')
  .action(async (url) => {
    try {
      const result = await tabsOpenCommand(url)
      console.log(JSON.stringify(result, null, 2))
    } catch (error: unknown) {
      handleCommandError(error, 'tabs open')
    }
  })

tabs
  .command('close <tabid>')
  .description('关闭指定 tabid 的标签页')
  .action(async (tabid) => {
    try {
      const result = await tabsCloseCommand(tabid)
      console.log(JSON.stringify(result, null, 2))
    } catch (error: unknown) {
      handleCommandError(error, 'tabs close')
    }
  })

tabs
  .command('switch <tabid>')
  .description('激活并切换到指定 tabid 的标签页')
  .action(async (tabid) => {
    try {
      const result = await tabsSwitchCommand(tabid)
      console.log(JSON.stringify(result, null, 2))
    } catch (error: unknown) {
      handleCommandError(error, 'tabs switch')
    }
  })

tabs
  .command('back [tabid]')
  .description('将当前或指定标签页导航后退一步')
  .action(async (tabid) => {
    try {
      const result = await tabsBackCommand(parseTabId(tabid))
      console.log(JSON.stringify(result, null, 2))
    } catch (error: unknown) {
      handleCommandError(error, 'tabs back')
    }
  })

tabs
  .command('forward [tabid]')
  .description('将当前或指定标签页导航前进一步')
  .action(async (tabid) => {
    try {
      const result = await tabsForwardCommand(parseTabId(tabid))
      console.log(JSON.stringify(result, null, 2))
    } catch (error: unknown) {
      handleCommandError(error, 'tabs forward')
    }
  })

program.parse(process.argv)
