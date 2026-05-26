#!/usr/bin/env node
import { Command } from 'commander'
import pc from 'picocolors'
import { stateCommand } from './commands/state'
import { runCommand } from './commands/run'
import { openCommand } from './commands/open'

const program = new Command()

function parseTabId(id?: string): number | undefined {
  if (!id) return undefined
  const parsed = parseInt(id, 10)
  if (isNaN(parsed)) throw new Error(`Invalid tabid provided: ${id}`)
  return parsed
}

program
  .name('webmcp-cli')
  .description('WebMCP CLI for interacting with browser via CDP')
  .version('1.0.0')
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
      const msg = error instanceof Error ? error.message : String(error)
      console.error(pc.red(`Error executing state command: ${msg}`))
      process.exit(1)
    }
  })

program
  .command('run <toolName> <argsJson>')
  .description('向指定页签调用指定的 WebMCP 工具执行操作')
  .option('-t, --tabid <id>', '指定页签的 ID')
  .action(async (toolName, argsJson, options) => {
    try {
      const result = await runCommand({
        toolName,
        argsJson,
        tabid: parseTabId(options.tabid)
      })
      console.log(JSON.stringify(result, null, 2))
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error)
      console.error(pc.red(`Error executing run command: ${msg}`))
      process.exit(1)
    }
  })

program
  .command('open <url>')
  .description('在当前浏览器中打开指定网页')
  .option('-t, --tabid <id>', '在指定页签中打开')
  .option('-n, --new-tab', '在一个全新的页签中打开')
  .action(async (url, options) => {
    try {
      const result = await openCommand(url, {
        tabid: parseTabId(options.tabid),
        newTab: options.newTab
      })
      console.log(JSON.stringify(result, null, 2))
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error)
      console.error(pc.red(`Error executing open command: ${msg}`))
      process.exit(1)
    }
  })

program.parse(process.argv)
