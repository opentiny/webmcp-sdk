import { connectToActivePage } from '../../cdp/targets.js'
import { ensurePageInjected } from '../../cdp/page-session.js'
import { runModelContextToolCommand } from './model-context-tool.js'
import { runPageAgentCommand } from './page-agent.js'
import { runTabsCommand } from './tabs.js'

/**
 * webmcp run <子命令> [args...]
 * - run page-agent ...
 * - run tabs ...
 * - run <toolName> ...  (modelContext 工具)
 */
export async function runCommand(args: string[]): Promise<void> {
  if (args.length === 0) {
    console.error('命令有误: run 需要提供子命令')
    process.exit(1)
  }

  const first = args[0]

  if (first === 'page-agent') {
    let client = await connectToActivePage()
    try {
      client = await ensurePageInjected(client)
      await runPageAgentCommand(client, args.slice(1))
    } finally {
      await client.close()
    }
    return
  }

  if (first === 'tabs') {
    await runTabsCommand(args.slice(1))
    return
  }

  // modelContext 工具
  let client = await connectToActivePage()
  try {
    client = await ensurePageInjected(client)
    await runModelContextToolCommand(client, first, args.slice(1))
  } finally {
    await client.close()
  }
}
