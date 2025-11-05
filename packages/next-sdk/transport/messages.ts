/**
 * wxt 依赖于 next-sdk, 但是 transports 又依赖于事件系统，会造成循环依赖。
 * 由于目前消息都是：“无状态” 发送，所以不是同一份代码也没关系。
 *
 * 所以同步一份“事件系统代码”在这里。
 */
/**
 * 消息系统说明：
 * 1、 根据type, direction 2个条件，进行事件匹配
 * 2、 side, bg 向page 发消息，必须 content 中转一次
 */
declare const chrome: any

// *************************** content - page 的消息 ***************************
type WindowDirection = 'page->content' | 'content->page' | 'page->page' | 'content->content'
type WindowHandler = (data: any) => void
export const sendWindowMessage = (type: string, data: any, direction: WindowDirection) => {
  window.postMessage({ type, direction, data }, '*')
}

export const onWindowMessage = (type: string, cb: WindowHandler, direction: WindowDirection) => {
  const handler = async function (event: MessageEvent<any>) {
    if (event.source === window && event.data.type === type && event.data.direction === direction) {
      await cb(event.data.date)
    }
  }
  window.addEventListener('message', handler)
  return () => window.removeEventListener('message', handler)
}

// *************************** content - side -  bg 通过 runtime中转消息 ***************************
type RuntimeDirection = 'content->side' | 'side->content' | 'side->bg' | 'bg->side' | 'content->bg' | 'bg->content'
type RuntimeHandler = (message: any, sender: any, sendResponse: (response?: any) => void) => any

// 1、runtime 之间直接互发， 但是向content发送时，是广播所有的tabs。
// 2、返回值固定为sender
export const sendRuntimeMessage = (type: string, data: any, direction: RuntimeDirection) => {
  if (direction.endsWith('content')) {
    chrome.tabs.query({}, (tabs: any[]) => {
      tabs.forEach((tab) => {
        chrome.tabs.sendMessage(tab.id!, { type, data, direction, tabId: tab.id! })
      })
    })
  } else {
    return chrome.runtime.sendMessage({ direction, type, data })
  }
}

// 回调只能拿到 data,sender,  不提供 sendResponse。 如果需要返回值， 必须重新发送一个新消息才行。
export const onRuntimeMessage = (type: string, cb: RuntimeHandler, direction: RuntimeDirection, selfTabid?: number) => {
  const handler: RuntimeHandler = (message: any, sender, sendResponse) => {
    if (message.type === type && message.direction === direction) {
      if (!selfTabid || (selfTabid && message.tabId === selfTabid)) {
        const { data } = message
        cb(data, sender, sendResponse)
        sendResponse(sender) // 默认永远返回sender
      }
    }
  }
  chrome.runtime.onMessage.addListener(handler)

  return () => chrome.runtime.onMessage.removeListener(handler)
}
