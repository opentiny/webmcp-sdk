;(function () {
  var doc = document
  var nav = navigator

  // 已初始化，跳过
  if ((doc.modelContext && doc.modelContext.__isNextSdkBridgeSetup) || (nav.modelContext && nav.modelContext.__isNextSdkBridgeSetup) || window.__nextSdkRegisteredTools) {
    return
  }

  // 优先：使用完整 SDK（vendor/next-sdk.js 已加载时可用）
  var sdk = window.WebMCP
  if (sdk && typeof sdk.initializeBuiltinWebMCP === 'function') {
    sdk.initializeBuiltinWebMCP()
    return
  }

  // Fallback：内联最简 polyfill（document.modelContext）
  console.log('[next-wxt] 启用内联 polyfill（document.modelContext）')
  var tools = new Map()
  var ctx = {
    __isNextSdkBridgeSetup: true,
    registerTool: function (config) {
      tools.set(config.name, Object.assign({}, config))
    },
    executeTool: function (name, argsStr) {
      var tool = tools.get(name)
      if (!tool) return Promise.reject(new Error('Tool "' + name + '" not found'))
      var args = typeof argsStr === 'string' ? JSON.parse(argsStr) : argsStr
      return Promise.resolve(tool.execute(args))
    },
    listTools: function () {
      return Array.from(tools.values()).map(function (t) {
        return { name: t.name, title: t.title, description: t.description, inputSchema: t.inputSchema }
      })
    }
  }

  Object.defineProperty(doc, 'modelContext', { value: ctx, writable: true, configurable: true })
  Object.defineProperty(nav, 'modelContext', { value: ctx, writable: true, configurable: true })
  Object.defineProperty(nav, 'modelContextTesting', { value: ctx, writable: true, configurable: true })

  window.__nextSdkRegisteredTools = function () {
    return Array.from(tools.values()).map(function (t) {
      return { name: t.name, title: t.title, description: t.description, inputSchema: t.inputSchema }
    })
  }
})()
