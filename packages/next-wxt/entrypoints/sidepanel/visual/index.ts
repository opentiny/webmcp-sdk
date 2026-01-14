import { type VisualActionParams, getScreenshotCapturer } from './utils'
import { handleMouseAction } from './mouse'
import { handleKeyboardAction } from './keyboard'
import { handleScreenAction } from './screen'
import { handleNavigationAction } from './navigation'
import { handleScrollAction } from './scroll'
import { handleWaitAction } from './wait'

export const executeVisualAction = async (params: VisualActionParams) => {
  const { action } = params
  let mwMessage = ''

  if (['left_click', 'right_click', 'middle_click', 'double_click'].includes(action)) {
    mwMessage = await handleMouseAction(params)
  } else if (action === 'type' || action === 'key') {
    mwMessage = await handleKeyboardAction(params)
  } else if (action === 'screenshot' || action === 'cursor_position') {
    mwMessage = await handleScreenAction(params)
  } else if (action === 'scroll') {
    mwMessage = await handleScrollAction(params)
  } else if (action === 'wait') {
    mwMessage = await handleWaitAction(params)
  } else if (['history', 'history_back', 'history_forward'].includes(action)) {
    mwMessage = await handleNavigationAction(params)
  } else {
    mwMessage = `操作 ${action} 执行成功`
  }

  // 捕获新截图作为反馈
  // 等待一段时间，保证输入或者切换面板可以完全展示出来再进行截屏
  await new Promise((resolve) => setTimeout(resolve, 1000))
  const captureFn = getScreenshotCapturer()
  const screenshotDataUrl = await captureFn()

  // 提取 base64
  const base64Match = screenshotDataUrl.match(/^data:image\/\w+;base64,(.+)$/)
  const screenshotBase64 = base64Match ? base64Match[1] : screenshotDataUrl

  return {
    content: [{ type: 'text' as const, text: mwMessage }],
    screenshot: screenshotBase64
  }
}
