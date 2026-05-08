;(function () {
  // 防止重复注册
  if (window.__pageAgentToolRegistered) return
  window.__pageAgentToolRegistered = true

  var sdk = window.WebMCP
  if (sdk && typeof sdk.registerPageAgentTool === 'function') {
    sdk.registerPageAgentTool()
    console.log('[next-wxt] page-agent-tool 已注册')
  } else {
    console.warn('[next-wxt] WebMCP.registerPageAgentTool 不可用，跳过注册')
  }
})()
