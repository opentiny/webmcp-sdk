// 等待 content proxy 就绪
async function waitForContentProxy() {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve(false)
    }, 100)
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

function createZodProxy() {
  // 使用 Proxy 模拟 zod 的无限链式调用
  let proxy
  const handler = {
    get(_t, prop) {
      if (prop === Symbol.toStringTag) return 'ProxyZod'
      if (prop === 'toString') return () => '[object ProxyZod]'
      return proxy
    },
    apply() {
      return proxy
    }
  }
  proxy = new Proxy(function () {}, handler)
  return proxy
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

  const toolsMap = new Map() // 记录工具名称与回调映射方便调用

  const server = {
    registerTool: (...args) => {
      const toolName = args[0]
      const callback = args[args.length - 1]
      console.log('registerTool', toolName, callback)
      toolsMap.set(toolName, callback)
    }
  }

  window.addEventListener('message', (event) => {
    if (event.data.type === 'execute-tool-from-sidepanel-to-content') {
      const { requestId, data } = event.data // 拿到请求ID和调用参数
      const toolName = data[0]
      const callback = toolsMap.get(toolName)
      if (callback) {
        const [, ...toolArgs] = data
        Promise.resolve(callback(...toolArgs)) // 调用工具函数并兼容多参数
          .then((response) => {
            window.postMessage(
              {
                type: 'execute-tool-from-content-to-sidepanel',
                direction: 'page->content',
                data: { requestId, result: response }
              },
              '*'
            )
          })
          .catch((error) => {
            window.postMessage(
              {
                type: 'execute-tool-from-content-to-sidepanel',
                direction: 'page->content',
                data: { requestId, result: { error: error?.message ?? 'Unknown error' } }
              },
              '*'
            )
          })
      } else {
        window.postMessage(
          {
            type: 'execute-tool-from-content-to-sidepanel',
            direction: 'page->content',
            data: { requestId, result: { error: `tool ${toolName} not found` } }
          },
          '*'
        )
      }
    }
    if (event.data.type === 'sidepanel-ready-to-page') {
      window.postMessage({ type: 'define-tool-from-page-to-content', data: { host: window.location.hostname } }, '*')
    }
  })

  window.postMessage({ type: 'define-tool-from-page-to-content', data: { host: window.location.hostname } }, '*')

  if (window.$next_remoter_mcp_server) {
    window.$next_remoter_mcp_server({ server, z: createZodProxy(), cookie: getCookieData() })
  } else {
    console.error('window.$next_remoter_mcp_server 未定义')
  }
}

connect()
