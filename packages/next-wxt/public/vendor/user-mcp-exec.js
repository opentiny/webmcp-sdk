/**
 * 用户 MCP 脚本执行桥（经 chrome-extension:// 注入 MAIN world）
 * 在扩展脚本上下文中 new Function，避免页面 CSP 拦截
 * （复现：京东等站直接 scripting.executeScript + new Function 失败，仅剩 page-agent-tool）
 */
;(function () {
  var KEY = '__NEXT_WXT_EXEC_USER_MCP_SCRIPT__'
  if (window[KEY]) return

  window[KEY] = function (code) {
    try {
      if (typeof code !== 'string' || !code) {
        return { ok: false, error: 'empty code' }
      }
      var runner = new Function(code)
      runner()
      return { ok: true }
    } catch (err) {
      var msg = err && err.message ? err.message : String(err)
      console.error('[user-mcp-scripts] 桥接执行失败:', err)
      return { ok: false, error: msg }
    }
  }
})()
