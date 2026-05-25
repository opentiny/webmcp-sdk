import CDP from 'chrome-remote-interface'
import { DEBUG_PORT } from '../../constants.js'
import { fetchBrowsablePageTargets } from '../../cdp/targets.js'

const TABS_ACTIONS = ['open', 'close', 'switch'] as const

/**
 * webmcp run tabs <open|close|switch> [arg]
 */
export async function runTabsCommand(args: string[]): Promise<void> {
  const action = args[0]
  const arg = args[1]

  if (!action || !TABS_ACTIONS.includes(action as (typeof TABS_ACTIONS)[number])) {
    console.error('命令有误: tabs 子命令应为 open | close | switch')
    process.exit(1)
  }

  const client = await CDP({ port: DEBUG_PORT })
  try {
    const { Target } = client

    if (action === 'open') {
      if (!arg) {
        console.error('命令有误: tabs open 需要提供 URL')
        process.exit(1)
      }
      const { targetId } = await Target.createTarget({ url: arg })
      await Target.activateTarget({ targetId })
      console.log(JSON.stringify({ action: 'open', tabId: targetId, url: arg }, null, 2))
      return
    }

    if (!arg) {
      console.error(`命令有误: tabs ${action} 需要提供 tabId`)
      process.exit(1)
    }

    const targets = await fetchBrowsablePageTargets()
    const exists = targets.some((t) => t.id === arg)
    if (!exists) {
      console.error(`命令有误: 未找到 tabId: ${arg}`)
      process.exit(1)
    }

    if (action === 'close') {
      await Target.closeTarget({ targetId: arg })
      console.log(JSON.stringify({ action: 'close', tabId: arg }, null, 2))
      return
    }

    if (action === 'switch') {
      await Target.activateTarget({ targetId: arg })
      console.log(JSON.stringify({ action: 'switch', tabId: arg }, null, 2))
    }
  } finally {
    await client.close()
  }
}
