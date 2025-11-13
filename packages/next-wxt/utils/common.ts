/** 需要注入到页面的url 白名单 */
export const injectUrls = {
  nextSdk: browser.runtime.getURL('/vendor/next-sdk.js'),
  mcpServer: browser.runtime.getURL('/vendor/mcp-server.js'),
  mcpInjectTools: browser.runtime.getURL('/vendor/mcp-inject-tools.js')
}

/**
 * 插入脚本到网页中插入脚本到网页中
 * @param originUrl 网站的根路径： https://www.baidu.com
 * @param withNextSdk
 * @returns
 */
type ScriptInjectionOptions = {
  hostname: string
  extraScripts?: string[]
  tabId?: number
}

const getServerScriptPath = (hostname: string) =>
  `/mcp-servers/${hostname}/index.js` as Parameters<typeof browser.runtime.getURL>[0]

const performScriptInjection = async ({ hostname, extraScripts = [], tabId }: ScriptInjectionOptions) => {
  const scriptPath = getServerScriptPath(hostname)
  const url = browser.runtime.getURL(scriptPath)
  if (!url) {
    return false
  }
  let script = await fetch(url).then((res) => res.text())
  if (extraScripts.length) {
    script += extraScripts.join('')
  }

  try {
    // 尝试获取已存在的脚本
    const existingScripts = await browser.userScripts.getScripts({
      ids: [url]
    })

    const injectType = existingScripts.length ? 'update' : 'register'
    const isFirstRegister = existingScripts.length === 0

    console.log('existingScripts.length', existingScripts)

    console.log('【Common】 injectType', injectType, url, hostname)

    // 注册或更新用户脚本
    await browser.userScripts[injectType]([
      {
        id: url,
        matches: [`https://${hostname}/*`],
        js: [{ code: script }],
        world: 'MAIN'
      }
    ])

    console.log('existingScripts.length', existingScripts)

    console.log('【Common】 injectType success', injectType, url, hostname)

    if (isFirstRegister) {
      // 首次注册用户脚本后，当前页面不会立刻生效，这里尝试刷新标签页以加载刚注册的脚本
      try {
        if (typeof tabId === 'number') {
          await browser.tabs.reload(tabId)
          console.log('【Common】 首次注册后刷新当前标签页', { hostname, tabId })
        } else {
          const candidates = await browser.tabs.query({ url: [`https://${hostname}/*`, `http://${hostname}/*`] })
          if (candidates.length) {
            await browser.tabs.reload(candidates[0].id!)
            console.log('【Common】 首次注册后刷新匹配标签页', { hostname, tabId: candidates[0].id })
          } else {
            console.warn('【Common】 首次注册后未找到可刷新的标签页', { hostname })
          }
        }
      } catch (refreshError) {
        console.error('【Common】 首次注册后刷新标签页失败', refreshError, { hostname, tabId })
      }
    }

    return true
  } catch (error) {
    // 捕获 userScripts API 调用失败（权限未开启）
    console.error('User Scripts API 调用失败:', error)

    // 创建通知提示用户（使用时间戳确保每次都显示新通知）
    await browser.notifications.create(`userScripts-error-${Date.now()}`, {
      type: 'basic',
      iconUrl: browser.runtime.getURL('/icons/128.png'),
      title: 'User Scripts 权限未开启',
      message: '请在扩展管理页面开启 User Scripts 开关',
      priority: 2
    })

    return false
  }
}

export const injectMainScript = async (hostname: string, tabId?: number, withNextSdk = true) => {
  const extraScripts: string[] = []
  if (withNextSdk) {
    const nextSdkScript = await fetch(injectUrls.nextSdk).then((res) => res.text())
    const mcpServerScript = await fetch(injectUrls.mcpServer).then((res) => res.text())
    extraScripts.push(nextSdkScript.replace('define.amd', 'define.amdx'), mcpServerScript)
  }

  return performScriptInjection({ hostname, extraScripts, tabId })
}

export const injectToolsScript = async (hostname: string, tabId?: number) => {
  const mcpInjectToolsScript = await fetch(injectUrls.mcpInjectTools).then((res) => res.text())

  return performScriptInjection({
    hostname,
    extraScripts: [mcpInjectToolsScript],
    tabId
  })
}
