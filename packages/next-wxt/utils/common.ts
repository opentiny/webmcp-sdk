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
        matches: [`${originUrl}/*`],
        js: [{ code: script }],
        world: 'MAIN',
        runAt: 'document_idle'
      }
    ])

    return true
  } catch (error) {
    // 捕获 userScripts API 调用失败（权限未开启）
    console.error('User Scripts API 调用失败:', error)

    // 创建通知提示用户（使用时间戳确保每次都显示新通知）
    await browser.notifications.create(`userScripts-error-${Date.now()}`, {
      type: 'basic',
      iconUrl: browser.runtime.getURL('/icon/128.png'),
      title: 'User Scripts 权限未开启',
      message: '请在扩展管理页面开启 User Scripts 开关',
      priority: 2
    })

    return false
  }
}

/** 打印日志系统 */
const storageKey = 'local:next-wxt'
const sessionRegistryKey = 'local:next-wxt-session'

// event-end 是要打印一个事件循环结束的标记
type LogFrom = 'event-end' | 'background' | 'server-transport' | 'client-transport' | 'content-script' | 'side-panel'
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

type SessionRegistry = Map<
  string,
  {
    tabIds: number[]
    serverInfo: any
    timestamp: number
  }
>

/** 初始化日志 */
export const initLog = async () => {
  await storage.removeMeta(sessionRegistryKey)
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

/** 插入全局的 SessionRegistry*/
export const insertSessionRegistry = async (map: SessionRegistry) => {
  for (const entry of map.entries()) {
    await storage.setMeta<any>(sessionRegistryKey, { [entry[0]]: entry[1] })
  }
}

/** 打印日志 */
export const printLog = async () => {
  const reg = await storage.getMeta<any>(sessionRegistryKey)
  const regTable = []
  for (const sessionId in reg) {
    regTable.push({ sessionId, tabIds: reg[sessionId].tabIds.join(','), serverInfo: reg[sessionId].serverInfo.url })
  }
  console.table(regTable)
  console.log()

  const meta = await storage.getMeta<LogMeta>(storageKey)
  meta.list.forEach((item) => {
    if (item.from === 'event-end') {
      console.log(`============= ${item.from}: ${item.message + '事件流转结束！\n'}`)
    } else {
      console.log(`${formatFrom(item.from)} ${item.t}: ${item.message}`, item.extra)
    }
  })
}

const formatFrom = (from: LogFrom) => {
  const map = {
    'event-end': 0,
    background: 0,
    page: 0,
    'server-transport': 4,
    'content-script': 8,
    'side-panel': 12,
    'client-transport': 16
  }
  return ' '.repeat(map[from]) + `【${from}】`
}
