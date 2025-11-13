const { ExtensionPageServerTransport, WebMcpServer, z } = WebMCP

// 等待 content proxy 就绪
async function waitForContentProxy() {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve(false)
    }, 1000)
  })
}

function getCookieData() {
  return document.cookie.split('; ').reduce((acc, cookie) => {
    const [key, value] = cookie.split('=')
    acc[key] = value
    return acc
  }, {})
}

// 成功返回tabId, 失败返回-1
function getTabId() {
  return new Promise((resolve, reject) => {
    // 先监听，后发送信息。 超时1秒算失败
    function handler(event) {
      if (event.source === window && event.data.type === 'answer-tabid') {
        window.removeEventListener('message', handler)
        resolve(event.data.data.tabId)
      }
    }
    window.addEventListener('message', handler)

    window.postMessage({ type: 'ask-tabid', direction: 'page->content', data: {} }, '*')
    setTimeout(() => {
      reject(-1)
    }, 10000)
  })
}

async function connect() {
  console.log('MAIN world 脚本已加载，等待 content proxy 就绪...')

  await waitForContentProxy()
  const tabId = await getTabId()
  if (tabId === -1) {
    console.log('Main 页面无法查询自己的tabId')
    return
  } else {
    console.log('Main 页面自己的tabId=', tabId)
  }

  const serverInfo = {
    name: 'demo-server',
    version: '1.0.0'
  }
  // Create an MCP server
  const server = new WebMcpServer(serverInfo)

  if (window.$next_remoter_mcp_server) {
    window.$next_remoter_mcp_server({ server, z, cookie: getCookieData() })
    const sessionId = localStorage.getItem('mcp-sessionId')

    // Create pair MCP transports
    const serverTransport = new ExtensionPageServerTransport(sessionId, tabId)
    localStorage.setItem('mcp-sessionId', serverTransport.sessionId)

    console.log(serverTransport.sessionId)

    // Connect the client and server
    await server.connect(serverTransport)
    serverTransport.notifyRegistration(serverInfo)
  } else {
    console.error('window.$next_remoter_mcp_server 未定义')
  }
}

connect()
