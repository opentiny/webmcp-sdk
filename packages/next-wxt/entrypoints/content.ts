import { onMessage, sendMessage } from 'webext-bridge/content-script'

export default defineContentScript({
  // matches: ["<all_urls>"],
  // matches: ["*://*/*"],
  matches: ['*://*.baidu.com/*'],
  runAt: 'document_end',
  async main() {}
})
