#!/usr/bin/env node

import { ensureChromeRunning } from './chrome-launcher.js'
import { listBrowserInfo, runCommand } from './cdp-client.js'

/**
 * 打印使用说明
 */
function printUsage(): void {
  console.log(`
WebMCP CLI - Chrome 远程调试工具

用法:
  webmcp <command> [args]

命令:
  list              查询浏览器当前情况（标签页、版本信息等）
  run <cmd> [args]  让浏览器执行命令

示例:
  webmcp list
  webmcp run navigate https://example.com
  webmcp run screenshot output.png
  webmcp run evaluate document.title
  `)
}

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

  // 等待一小段时间确保 Chrome 完全就绪
  await new Promise((resolve) => setTimeout(resolve, 500))

  // 执行命令
  if (command === 'list') {
    await listBrowserInfo()
  } else if (command === 'run') {
    if (commandArgs.length === 0) {
      console.error('命令有误: run 需要提供子命令')
      process.exit(1)
    }
    const subCommand = commandArgs[0]
    const subArgs = commandArgs.slice(1)
    await runCommand(subCommand, subArgs)
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
