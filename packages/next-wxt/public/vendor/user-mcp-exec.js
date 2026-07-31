/**
 * 用户 MCP 脚本执行桥（经 chrome-extension:// 注入 MAIN world）
 * 在扩展脚本上下文中 new Function，避免页面 CSP 拦截。
 *
 * 安全模型（能力令牌，非可伪造属性）：
 * 1. 本文件只安装一次性 bind 入口（不执行用户源码）
 * 2. background 经 scripting.executeScript 传入随机 capability token 调用 bind
 * 3. bind 用闭包保存 token，安装不可配置的 exec(code, capability)；校验失败则拒绝
 * 4. 静态标记如 __NEXT_WXT_OWNED__ 可被页面伪造，故不再使用
 *
 * 约定顺序（见 content.ts / wxt.config.ts）：
 *   runtime → register-page-agent-tool → 本脚本 → background bind(token) → exec(code, token)
 */
;(function () {
  var BIND_KEY = '__NEXT_WXT_BIND_USER_MCP_BRIDGE__'
  var EXEC_KEY = '__NEXT_WXT_EXEC_USER_MCP_SCRIPT__'

  function bind(token) {
    if (typeof token !== 'string' || token.length < 32) {
      return { ok: false, error: 'invalid token' }
    }

    var existing = null
    try {
      existing = Object.getOwnPropertyDescriptor(window, EXEC_KEY)
    } catch (e) {
      existing = null
    }

    // 已锁定：无法改写闭包 token（需整页刷新后由扩展重新 bind）
    if (existing && existing.configurable === false) {
      return { ok: false, error: 'bridge locked', locked: true }
    }

    if (existing) {
      try {
        delete window[EXEC_KEY]
      } catch (e) {
        return { ok: false, error: 'cannot clear forged bridge' }
      }
    }

    function run(code, capability) {
      if (capability !== token) {
        return { ok: false, error: 'unauthorized' }
      }
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

    try {
      Object.defineProperty(window, EXEC_KEY, {
        value: run,
        writable: false,
        configurable: false,
        enumerable: false
      })
    } catch (e) {
      return { ok: false, error: 'defineProperty failed' }
    }

    // 一次性 bind：成功后移除入口，降低页面后续窃听新 token 的窗口
    try {
      delete window[BIND_KEY]
    } catch (e) {
      /* ignore */
    }

    return { ok: true }
  }

  function installBind() {
    var existing = null
    try {
      existing = Object.getOwnPropertyDescriptor(window, BIND_KEY)
    } catch (e) {
      existing = null
    }

    if (existing && existing.configurable === false) {
      console.error('[user-mcp-scripts] bind 入口被页面抢占且不可覆盖，拒绝安装')
      return
    }

    if (existing) {
      try {
        delete window[BIND_KEY]
      } catch (e) {
        console.error('[user-mcp-scripts] 无法移除页面伪造的 bind 入口')
        return
      }
    }

    try {
      Object.defineProperty(window, BIND_KEY, {
        value: bind,
        writable: false,
        configurable: true,
        enumerable: false
      })
    } catch (e) {
      console.error('[user-mcp-scripts] 安装 bind 入口失败:', e)
    }
  }

  installBind()
})()
