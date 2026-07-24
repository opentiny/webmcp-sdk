import { getCurrentTabId } from './utils'

/**
 * 与 `@opentiny/next-sdk` 的 `PAGE_AGENT_CHAT_END_EVENT` 对齐。
 * 页面 MAIN world 的 page-agent-tool 监听此事件并调用 hideMask（收起呼吸灯与箭头）。
 */
export const PAGE_AGENT_CHAT_END_EVENT = 'page-agent-chat-end'

/**
 * 向当前（或指定）标签页 MAIN world 派发聊天结束事件，收起 page-agent-tool 的 mask/箭头。
 */
export async function dispatchPageAgentChatEnd(tabId?: number): Promise<void> {
  const id = tabId ?? (await getCurrentTabId())
  await browser.scripting.executeScript({
    target: { tabId: id },
    world: 'MAIN',
    func: (eventName: string) => {
      window.dispatchEvent(new CustomEvent(eventName))
    },
    args: [PAGE_AGENT_CHAT_END_EVENT]
  })
}
