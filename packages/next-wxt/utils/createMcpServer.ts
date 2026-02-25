import { WebMcpServer, ContentScriptServerTransport, z } from '@opentiny/next-sdk'
import getMcpToolByHostname from '../mcp-servers'

const getCookieData = () => {
  const cookie = document.cookie
  const cookieData = cookie.split('; ').reduce(
    (acc, cookie) => {
      const [key, value] = cookie.split('=')
      acc[key] = value
      return acc
    },
    {} as Record<string, string>
  )
  return cookieData
}

export const createMcpServer = async (tabId: number) => {
  const serverInfo = {
    name: 'demo-server',
    version: '1.0.0'
  }

  const cookieData = getCookieData()
  const server = new WebMcpServer(serverInfo)

  // 获取当前页面域名和完整 URL
  const hostname = window.location.hostname
  const currentUrl = window.location.href
  const mcpTool = getMcpToolByHostname(hostname, currentUrl)

  // 如果找到匹配的工具配置，则注册
  if (mcpTool) {
    console.log('找到匹配的 MCP 工具配置，正在注册...', { hostname, currentUrl })
    mcpTool({ server, z, cookie: cookieData })
  } else {
    console.log('当前域名没有配置 MCP 工具')
  }

  const _sessionId = localStorage.getItem('mcp-sessionId')
  const serverTransport = new ContentScriptServerTransport(_sessionId, tabId)
  const sessionId = serverTransport.sessionId
  localStorage.setItem('mcp-sessionId', sessionId)

  await server.connect(serverTransport)

  // 向插件注册server
  serverTransport.notifyRegistration(serverInfo)

  return sessionId
}

export const createProxyMcpServer = async (tabId: number) => {
  const cookieData = getCookieData()

  // 获取当前页面域名和完整 URL
  const hostname = window.location.hostname
  const currentUrl = window.location.href
  const mcpTool = getMcpToolByHostname(hostname, currentUrl)
  const toolMap = new Map<string, any>()

  const server = {
    registerTool: (...args: any[]) => {
      const toolName = args[0]
      const callback = args[args.length - 1]
      toolMap.set(toolName, callback)
    }
  }

  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'execute-tool-from-sidepanel-to-content') {
      const toolName = message.data[0]
      const callback = toolMap.get(toolName)

      // 触发页面动画：显示工具调用状态
      sendWindowMessage('update-page-app-message', { status: 'run', message: toolName }, 'page->content')

      if (callback) {
        callback(message.data[1])
          .then((response: any) => {
            // 工具执行完成，恢复状态
            sendWindowMessage('update-page-app-message', { status: 'ready', message: '' }, 'page->content')
            sendResponse(response)
          })
          .catch((error: any) => {
            // 工具执行失败，也要恢复状态
            sendWindowMessage('update-page-app-message', { status: 'ready', message: '' }, 'page->content')
            sendResponse({ error: error.message })
          })
      } else {
        // 工具不存在，恢复状态
        sendWindowMessage('update-page-app-message', { status: 'ready', message: '' }, 'page->content')
        sendResponse({ error: `工具 ${toolName} 不存在` })
      }

      return true
    }
  })

  onRuntimeMessage(
    'sidepanel-ready',
    () => {
      sendRuntimeMessage(
        'define-tool-from-content-to-sidepanel',
        {
          host: window.location.hostname
        },
        'content->side'
      )
    },
    'side->content',
    tabId
  )

  sendRuntimeMessage(
    'define-tool-from-content-to-sidepanel',
    {
      host: window.location.hostname
    },
    'content->side'
  )

  // 如果找到匹配的工具配置，则注册
  if (mcpTool) {
    console.log('找到匹配的 MCP 工具配置，正在注册...', { hostname, currentUrl })
    mcpTool({ server, z, cookie: cookieData })
  } else {
    console.log('当前域名没有配置 MCP 工具')
  }
}
