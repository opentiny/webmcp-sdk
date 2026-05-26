import type CDP from 'chrome-remote-interface'
import { evaluateOnPage } from '../../cdp/page-session.js'

const PAGE_AGENT_ACTIONS = ['browserState', 'click', 'fill', 'select'] as const
type PageAgentAction = (typeof PAGE_AGENT_ACTIONS)[number]

function parseElementIndex(raw: string | undefined): number {
  if (!raw) {
    console.error('命令有误: 请提供元素索引')
    process.exit(1)
  }
  const index = parseInt(raw.replace(/^#/, ''), 10)
  if (Number.isNaN(index)) {
    console.error('命令有误: 元素索引无效')
    process.exit(1)
  }
  return index
}

/**
 * webmcp-cli run page-agent <action> [args...]
 */
export async function runPageAgentCommand(client: CDP.Client, args: string[]): Promise<void> {
  const action = args[0] as PageAgentAction | undefined
  if (!action || !PAGE_AGENT_ACTIONS.includes(action)) {
    console.error('命令有误: page-agent 子命令应为 browserState | click | fill | select')
    process.exit(1)
  }

  let expression: string

  switch (action) {
    case 'browserState':
      expression = `(async () => {
        const pc = window.__webmcpcli_pageController
        if (!pc) throw new Error('PageController 未初始化')
        const ret = await pc.getBrowserState()
        await pc.hideMask()
        await pc.cleanUpHighlights()
        return ret
      })()`
      break
    case 'click': {
      const index = parseElementIndex(args[1])
      expression = `(async () => {
        const pc = window.__webmcpcli_pageController
        if (!pc) throw new Error('PageController 未初始化')
        const ret =  await pc.clickElement(${index})
        await pc.hideMask()
        await pc.cleanUpHighlights()
        return ret
      })()`
      break
    }
    case 'fill': {
      const index = parseElementIndex(args[1])
      const text = args.slice(2).join(' ')
      if (!text) {
        console.error('命令有误: fill 需要提供文本内容')
        process.exit(1)
      }
      expression = `(async () => {
        const pc = window.__webmcpcli_pageController
        if (!pc) throw new Error('PageController 未初始化')
        const ret =  await pc.inputText(${index}, ${JSON.stringify(text)})
        await pc.hideMask()
        await pc.cleanUpHighlights()        
        return ret
      })()`
      break
    }
    case 'select': {
      const index = parseElementIndex(args[1])
      const text = args.slice(2).join(' ')
      if (!text) {
        console.error('命令有误: select 需要提供选项文本')
        process.exit(1)
      }
      expression = `(async () => {
        const pc = window.__webmcpcli_pageController
        if (!pc) throw new Error('PageController 未初始化')
        const ret =  await pc.selectOption(${index}, ${JSON.stringify(text)})
        await pc.hideMask()
        await pc.cleanUpHighlights()     
        return ret
      })()`
      break
    }
  }

  const result = await evaluateOnPage(client, expression, true)
  console.log(JSON.stringify(result, null, 2))
}
