/** 需要注入到页面的url 白名单 */
export const injectUrls = {
  nextSdk: browser.runtime.getURL('/vendor/next-sdk.js'),
  'https://opentiny.design': browser.runtime.getURL('/mcp-servers/opentiny.design/index.js'),
  'https://www.baidu.com': browser.runtime.getURL('/mcp-servers/www.baidu.com/index.js'),
  'https://excalidraw.com': browser.runtime.getURL('/mcp-servers/excalidraw.com/index.js')
}

const nextSdkScript = fetch(injectUrls.nextSdk).then((res) => res.text())

/**
 * 插入脚本到网页中插入脚本到网页中
 * @param originUrl 网站的根路径： https://www.baidu.com
 * @param withNextSdk
 * @returns
 */
export const injectMainScript = async (originUrl: keyof typeof injectUrls, withNextSdk = true) => {
  if (!injectUrls[originUrl]) {
    return false
  }

  const url = injectUrls[originUrl]
  let script = await fetch(url).then((res) => res.text())
  if (withNextSdk) script += await nextSdkScript

  const existingScripts = await browser.userScripts.getScripts({
    ids: [url]
  })

  const injectType = existingScripts.length ? 'update' : 'register'

  await browser.userScripts[injectType]([
    {
      id: url,
      matches: [`${originUrl}/*`],
      js: [{ code: script }],
      world: 'MAIN'
    }
  ])

  return true
}
