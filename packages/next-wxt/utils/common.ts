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

/** 打印日志系统 */
const storageKey = 'local:next-wxt'

type LogFrom = 'background' | 'page' | 'content-script' | 'side-panel' | 'popup'
interface LogExtra {
  sessionId?: string
  tabId?: string
  [anykey: string]: any
}
type LogItem = Array<{
  from: LogFrom
  message: string
  extra: LogExtra
  t: string //
}>

type LogMeta = { list: LogItem }

/** 初始化日志 */
export const initLog = async () => {
  await storage.removeMeta(storageKey)
  await storage.setMeta(storageKey, { list: [] })
}

/** 插入日志 */
export const insertLog = async (from: LogFrom, message: string, extra: LogExtra = {}) => {
  const meta = await storage.getMeta<LogMeta>(storageKey)
  if (!meta.list) {
    await initLog()
  }

  const time = new Date()
  const t = `${time.toLocaleTimeString()} ${time.getMilliseconds()}`
  meta.list.push({ from, message, extra, t })
  await storage.setMeta(storageKey, meta)
}

/** 打印日志 */
export const printLog = async () => {
  const meta = await storage.getMeta<LogMeta>(storageKey)
  meta.list.forEach((item) => {
    console.log(`${formatFrom(item.from)} ${item.message}`, item.extra, item.t)
  })
}

const formatFrom = (from: LogFrom) => {
  const map = { background: 0, page: 0, 'content-script': 4, 'side-panel': 8, popup: 8 }
  return ' '.repeat(map[from]) + `【${from}】:`
}
