/** 管理标签页历史记录 */
export const tabHistory = {
  history: [] as Browser.tabs.Tab[],

  add(tab: Browser.tabs.Tab) {
    this.history = this.history.filter((t) => t.id !== tab.id)
    this.history.push(tab)
  },
  /**
   * 激活上一个标签页
   */
  async activePreTab() {
    if (this.history.length < 2) {
      return
    }

    const preTab = this.history[this.history.length - 2]

    try {
      await browser.windows.update(preTab.windowId, { focused: true })
      await browser.tabs.update(preTab.id, { active: true })
    } catch (error) {}
  }
}

// 初始化时，加载一次当前所有的窗口列表
browser.tabs.query({ currentWindow: true }).then((tabs) => {
  tabs.forEach((tab) => tabHistory.add(tab))
})

// 以下监听窗口的标签事件
browser.tabs.onActivated.addListener((activeInfo) => {
  browser.tabs.get(activeInfo.tabId).then((tab) => {
    tabHistory.add(tab)
  })
})

browser.tabs.onCreated.addListener((tab) => tabHistory.add(tab))

browser.tabs.onRemoved.addListener((tabId) => {
  tabHistory.history = tabHistory.history.filter((tab) => tab.id !== tabId)
})
