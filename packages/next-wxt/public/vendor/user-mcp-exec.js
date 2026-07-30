/**
 * 用户 MCP 脚本执行桥（经 chrome-extension:// 注入 MAIN world）
 * 在扩展脚本上下文中 new Function，避免页面 CSP 拦截
 *
 * 安全：不复用页面预置的同名函数；以不可写属性安装；带所有权标记供 background 校验
 */
;(function () {
  var KEY = '__NEXT_WXT_EXEC_USER_MCP_SCRIPT__'
  var OWNER = '__NEXT_WXT_OWNED__'

  function install() {
    var existing = null
    try {
      existing = Object.getOwnPropertyDescriptor(window, KEY)
    } catch (e) {
      existing = null
    }

    // 页面已抢占且不可配置 → 失败关闭，绝不调用页面函数
    if (existing && existing.configurable === false) {
      var cur = existing.value
      if (!cur || cur[OWNER] !== true) {
        console.error('[user-mcp-scripts] 执行桥被页面抢占且不可覆盖，拒绝安装')
        return
      }
      // 已是本扩展安装的桥
      return
    }

    if (existing && existing.value && existing.value[OWNER] !== true) {
      try {
        delete window[KEY]
      } catch (e) {
        console.error('[user-mcp-scripts] 无法移除页面伪造的执行桥')
        return
      }
    }

    function run(code) {
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
    run[OWNER] = true

    try {
      Object.defineProperty(window, KEY, {
        value: run,
        writable: false,
        configurable: false,
        enumerable: false
      })
    } catch (e) {
      console.error('[user-mcp-scripts] 安装执行桥失败:', e)
    }
  }

  install()
})()
