import { type VisualActionParams } from './utils'

export const handleScreenAction = async ({ action }: VisualActionParams) => {
  if (action === 'screenshot') {
    return '已成功截图'
  } else if (action === 'cursor_position') {
    return '当前坐标系统基于截图，请在截图中观察鼠标位置（如果可见）。'
  }

  throw new Error(`未知的屏幕操作: ${action}`)
}
