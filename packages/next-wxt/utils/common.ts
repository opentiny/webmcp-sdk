/** 需要注入到页面的url 白名单 */
export const injectUrls = {
  nextSdk: browser.runtime.getURL('/vendor/next-sdk.js'),
  mcpServer: browser.runtime.getURL('/vendor/mcp-server.js')
}

/**
 * 插入脚本到网页中插入脚本到网页中
 * @param originUrl 网站的根路径： https://www.baidu.com
 * @param withNextSdk
 * @returns
 */
export const injectMainScript = async (hostname: string, withNextSdk = true) => {
  const nextSdkScript = await fetch(injectUrls.nextSdk).then((res) => res.text())
  const mcpServerScript = await fetch(injectUrls.mcpServer).then((res) => res.text())
  const url = browser.runtime.getURL(`/mcp-servers/${hostname}/index.js`)
  if (!url) {
    return false
  }
  let script = await fetch(url).then((res) => res.text())
  if (withNextSdk) script = script + nextSdkScript.replace('define.amd', 'define.amdx') + mcpServerScript

  try {
    // 尝试获取已存在的脚本
    const existingScripts = await browser.userScripts.getScripts({
      ids: [url]
    })

    const injectType = existingScripts.length ? 'update' : 'register'

    // 注册或更新用户脚本
    await browser.userScripts[injectType]([
      {
        id: url,
        matches: [`https://${hostname}/*`],
        js: [{ code: script }],
        world: 'MAIN'
      }
    ])

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
