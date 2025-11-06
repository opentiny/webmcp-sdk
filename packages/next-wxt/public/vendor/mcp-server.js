const { ExtensionPageServerTransport, WebMcpServer, z } = WebMCP

// 等待 content proxy 就绪
async function waitForContentProxy() {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve(false)
    }, 1000)
  })
}

async function connect() {
  console.log('MAIN world 脚本已加载，等待 content proxy 就绪...')

  // 等待 content proxy 就绪
  await waitForContentProxy()

  const cookie = document.cookie
  const cookieData = cookie.split('; ').reduce((acc, cookie) => {
    const [key, value] = cookie.split('=')
    acc[key] = value
    return acc
  }, {})

  const serverInfo = {
    name: 'demo-server',
    version: '1.0.0'
  }
  // Create an MCP server
  const server = new WebMcpServer(serverInfo)

  if (window.$next_remoter_mcp_server) {
    window.$next_remoter_mcp_server({ server, z, cookie: cookieData })
    const sessionId = localStorage.getItem('mcp-sessionId')

    // Create pair MCP transports
    const serverTransport = new ExtensionPageServerTransport(sessionId)
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
