/**
 * agent 命令：委托 Chrome 扩展内 Tiny Robot 子代理自主执行高层任务
 *
 * 用法：
 *   webmcp-cli --mode wxt agent run "帮我把当前商品加入购物车"
 *   webmcp-cli --mode wxt agent run "搜索并收藏前3篇文章" --max-steps 10
 */

import type { WxtBrowserAdapter } from '../adapters/wxt-adapter.js'

export async function handleAgentCommand(adapter: WxtBrowserAdapter, args: string[]): Promise<void> {
  const subCommand = args[0]
  const restArgs = args.slice(1)

  if (!subCommand || subCommand === '--help' || subCommand === '-h') {
    printAgentHelp()
    return
  }

  if (subCommand === 'run') {
    await handleAgentRun(adapter, restArgs)
    return
  }

  console.error(`[错误] 未知子命令: agent ${subCommand}`)
  console.error('运行 webmcp-cli --mode wxt agent --help 查看支持的命令')
  process.exit(1)
}

async function handleAgentRun(adapter: WxtBrowserAdapter, args: string[]): Promise<void> {
  // 提取选项
  let instruction = ''
  let maxSteps: number | undefined
  let tabId: number | undefined
  const isJson = args.includes('--json')

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === '--max-steps' && args[i + 1]) {
      maxSteps = parseInt(args[++i], 10)
    } else if (arg === '--tab' && args[i + 1]) {
      tabId = parseInt(args[++i], 10)
    } else if (!arg.startsWith('-')) {
      instruction = arg
    }
  }

  if (!instruction) {
    console.error('[错误] 请提供任务指令。示例：webmcp-cli --mode wxt agent run "帮我搜索最新新闻"')
    process.exit(1)
  }

  if (!isJson) {
    console.log(`🤖 正在委托 Tiny Robot 子代理执行任务：「${instruction}」`)
    if (maxSteps) console.log(`   最大步数：${maxSteps}`)
  }

  try {
    const result = await adapter.runSubAgent(instruction, { tabId, maxSteps })
    if (isJson) {
      console.log(JSON.stringify(result, null, 2))
    } else {
      console.log('\n✅ 子代理执行完成：')
      console.log(JSON.stringify(result, null, 2))
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (isJson) {
      console.log(JSON.stringify({ success: false, error: msg }))
    } else {
      console.error(`❌ 执行失败：${msg}`)
    }
    process.exit(1)
  }
}

function printAgentHelp(): void {
  console.log(`
webmcp-cli --mode wxt agent - 委托 Chrome 扩展内 Tiny Robot 子代理执行高层任务

用法：
  webmcp-cli --mode wxt agent run "<指令>"   委托子代理自主执行自然语言任务

选项：
  --max-steps <n>    最大执行步数（默认 8，最大 20）
  --tab <tabId>      指定目标标签页 ID
  --json             输出 JSON 格式结果

示例：
  webmcp-cli --mode wxt agent run "帮我把当前商品加入购物车"
  webmcp-cli --mode wxt agent run "搜索并收藏前3篇文章" --max-steps 10
`.trim())
}
