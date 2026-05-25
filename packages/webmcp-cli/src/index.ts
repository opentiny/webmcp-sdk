#!/usr/bin/env node

import { ensureChromeRunning } from './chrome-launcher.js'
import { listBrowserInfo } from './cdp-client.js'
import { runCommand } from './commands/run-registry.js'
import { printUsage } from './print-usage.js'


/**
 * 主函数
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2)

  // 无参数时显示帮助
  if (args.length === 0) {
    printUsage()
    process.exit(0)
  }

  const command = args[0].toLowerCase()
  const commandArgs = args.slice(1)

  // 验证命令
  const validCommands = ['list', 'run']
  if (!validCommands.includes(command)) {
    console.error('命令有误')
    printUsage()
    process.exit(1)
  }

  // 确保 Chrome 正在运行
  console.log('检查 Chrome 状态...')
  const chromeStatus = await ensureChromeRunning()

  if (chromeStatus === 'not_installed') {
    console.error('用户机器可能未安装chrome, 请用户安装或指定chrome路径')
    process.exit(1)
  } else if (chromeStatus === 'launch_failed') {
    console.error('Chrome 启动失败，请手动启动后重试')
    process.exit(1)
  }

  // 执行命令
  if (command === 'list') {
    await listBrowserInfo()
  } else if (command === 'run') {
    await runCommand(commandArgs)
  }
}

// 处理未捕获的异常
process.on('unhandledRejection', (error) => {
  console.error('未处理的错误:', error instanceof Error ? error.message : error)
  process.exit(1)
})

main().catch((error) => {
  console.error('程序执行失败:', error instanceof Error ? error.message : error)
  process.exit(1)
})
