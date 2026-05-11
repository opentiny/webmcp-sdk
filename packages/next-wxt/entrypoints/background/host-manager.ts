import { browser } from 'wxt/browser'
import { onRuntimeMessage } from '../../utils/messages'

const STORAGE_KEY_HOST = 'hostManager:hostNameMap'

/**
 * 主机名映射表：host → tabIds[]
 * 保留此表供 tabs-manager 工具快速查找域名对应的 Tab
 */
export const hostNameMap = new Map<string, number[]>()

/** 规范化 URL → hostname */
export const normalizeUrlKey = (value?: string): string | undefined => {
  if (!value) return value
  try {
    const urlObj = new URL(value.startsWith('http') ? value : `https://${value}`)
    return urlObj.hostname || value
  } catch {
    return value.endsWith('/') ? value.slice(0, -1) : value
  }
}

/** 持久化保存 */
const saveState = () => {
  browser.storage.local
    .set({ [STORAGE_KEY_HOST]: Array.from(hostNameMap.entries()) })
    .catch(() => {})
}

/** 从 Storage 恢复状态（验证 Tab 是否仍然有效） */
const restoreState = async () => {
  try {
    const res = await browser.storage.local.get([STORAGE_KEY_HOST])
    if (Array.isArray(res[STORAGE_KEY_HOST])) {
      for (const [k, v] of res[STORAGE_KEY_HOST] as [string, number[]][]) {
        if (!hostNameMap.has(k)) {
          const validTabs: number[] = []
          for (const tid of v || []) {
            try {
              const tab = await browser.tabs.get(tid)
              if (tab?.id) validTabs.push(tab.id)
            } catch {
              // Tab 已关闭，跳过
            }
          }
          if (validTabs.length > 0) hostNameMap.set(k, validTabs)
        }
      }
    }
  } catch (err) {
    console.warn('【HostManager】恢复状态失败', err)
  }
}

// 向下兼容：挂载到 browser 对象供旧代码访问
// @ts-ignore
;(browser as any).hostNameMap = hostNameMap

export const initHostManager = () => {
  restoreState()

  // Tab 关闭时清理 hostNameMap
  browser.tabs.onRemoved.addListener((tabId) => {
    let changed = false
    for (const [host, tabIds] of hostNameMap.entries()) {
      const idx = tabIds.indexOf(tabId)
      if (idx !== -1) {
        tabIds.splice(idx, 1)
        if (tabIds.length === 0) hostNameMap.delete(host)
        changed = true
        break
      }
    }
    if (changed) saveState()
  })

  // Tab 激活时更新顺序（最后激活的排在末尾，供 tabs-manager 获取最新 Tab）
  browser.tabs.onActivated.addListener(({ tabId }) => {
    let changed = false
    for (const [host, tabIds] of hostNameMap.entries()) {
      const idx = tabIds.indexOf(tabId)
      if (idx !== -1) {
        tabIds.splice(idx, 1)
        tabIds.push(tabId)
        changed = true
        break
      }
    }
    if (changed) saveState()
  })

  // 接收 content.ts 的 host 注册（用于 tabs-manager 快速查找）
  onRuntimeMessage(
    'define-tool-from-content-to-sidepanel',
    (data: { host: string }, sender: Browser.runtime.MessageSender) => {
      const canonicalHost = normalizeUrlKey(sender.url)
      const tabId = sender.tab?.id
      if (tabId === undefined || !canonicalHost) return

      // 从旧 host 分组中移除该 tabId
      for (const [existingHost, tabIds] of hostNameMap.entries()) {
        if (existingHost !== canonicalHost) {
          const idx = tabIds.indexOf(tabId)
          if (idx !== -1) {
            tabIds.splice(idx, 1)
            if (tabIds.length === 0) hostNameMap.delete(existingHost)
          }
        }
      }

      const existing = hostNameMap.get(canonicalHost)
      if (existing) {
        if (!existing.includes(tabId)) existing.push(tabId)
      } else {
        hostNameMap.set(canonicalHost, [tabId])
      }
      saveState()
    },
    'content->bg'
  )

  // 供 sidepanel 查询 Tab ID
  browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === 'get-host-tab-ids') {
      const canonicalHost = normalizeUrlKey(message.host)
      sendResponse(canonicalHost ? hostNameMap.get(canonicalHost) || [] : [])
    }
  })
}
