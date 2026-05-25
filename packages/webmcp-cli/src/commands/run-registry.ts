import type CDP from 'chrome-remote-interface'
import { connectCdp } from '../connect-cdp.js'
import { handleEvaluate, handleNavigate, handleScreenshot, type RunHandler } from './handlers.js'

const handlers: Record<string, RunHandler> = {
  navigate: handleNavigate,
  screenshot: handleScreenshot,
  evaluate: handleEvaluate
}

/** 已注册的 run 子命令列表 */
export function getRunCommandNames(): string[] {
  return Object.keys(handlers)
}

/**
 * 执行 run 子命令
 */
export async function runCommand(name: string, args: string[]): Promise<void> {
  const handler = handlers[name]
  if (!handler) {
    console.error('命令有误')
    process.exit(1)
  }

  let client: CDP.Client | null = null
  try {
    client = await connectCdp()
    await handler(client, args)
  } catch (error) {
    console.error('执行命令失败:', error instanceof Error ? error.message : error)
    process.exit(1)
  } finally {
    if (client) {
      await client.close()
    }
  }
}
