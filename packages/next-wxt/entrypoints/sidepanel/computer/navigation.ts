import { type ComputerActionParams } from './utils'

export const handleNavigationAction = async ({ page, action, arg, text }: ComputerActionParams) => {
  const historyArg = action === 'history_back' ? 'back' : action === 'history_forward' ? 'forward' : arg || text

  try {
    if (historyArg === 'back') {
      await page.goBack()
      return '已成功后退到上一页'
    } else if (historyArg === 'forward') {
      await page.goForward()
      return '已成功前进到下一页'
    } else {
      throw new Error('history 操作需要有效的参数 "back" 或 "forward"')
    }
  } catch (err: any) {
    if (err.message?.includes('History entry to navigate to not found')) {
      return `无法${historyArg === 'back' ? '后退' : '前进'}：没有更多的历史记录。`
    } else {
      throw err
    }
  }
}
