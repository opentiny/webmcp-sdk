/**
 * 在 MAIN world 显式调用 registerPageAgentTool（带站点配置）。
 * 由 content script 经 <script src="chrome-extension://..."> 注入，避开 content 侧不可用的 chrome.scripting。
 */
;(() => {
  const api = window.WebMCP || window.NextSDK || window
  const register = api.registerPageAgentTool || window.registerPageAgentTool
  if (typeof register !== 'function') {
    console.warn('[next-wxt] registerPageAgentTool 未找到，请确认 vendor/runtime.js 已注入')
    return
  }

  const isConsoleCloud =
    typeof api.isConsoleCloudHost === 'function' && api.isConsoleCloudHost(location.hostname)
  const options = isConsoleCloud
    ? api.consoleCloudPageAgentToolOptions || { enableHighlight: false }
    : { a11yConfig: { exposedAttributes: ['cf-uba'] } }
  register(options)
})()
