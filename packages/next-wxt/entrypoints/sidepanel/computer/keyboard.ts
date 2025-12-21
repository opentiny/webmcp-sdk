import { type ComputerActionParams, showClickIndicator, getCoordinateConverter } from './utils'

export const handleKeyboardAction = async ({
  page,
  action,
  coordinate,
  text,
  press_enter,
  delete_existing_text
}: ComputerActionParams) => {
  if (action === 'type') {
    if (!text) throw new Error('操作 type 需要文本')

    if (coordinate && coordinate.length === 2) {
      const [x, y] = coordinate
      const convert = getCoordinateConverter()
      const originalCoords = convert(x, y)

      console.log(`[computer] type with click at: AI(${x}, ${y}) -> 原始(${originalCoords.x}, ${originalCoords.y})`)

      // 显示点击效果
      await showClickIndicator(page, originalCoords.x, originalCoords.y)
      await page.mouse.click(originalCoords.x, originalCoords.y)
      await new Promise((r) => setTimeout(r, 200))
    }

    // 处理清空逻辑
    if (delete_existing_text !== false) {
      const isMac = navigator.userAgent.includes('Mac')
      const modifier = isMac ? 'Meta' : 'Control'
      await page.keyboard.down(modifier)
      await page.keyboard.press('KeyA')
      await page.keyboard.up(modifier)
      await page.keyboard.press('Backspace')
      await new Promise((r) => setTimeout(r, 100))
    }

    await page.keyboard.type(text)

    if (press_enter) {
      await page.keyboard.press('Enter')
    }

    return `已成功输入: "${text}"`
  } else if (action === 'key') {
    const keyName = text as any
    if (!keyName) throw new Error('Action key requires key name in text')
    await page.keyboard.press(keyName)
    return `已成功按下: ${keyName}`
  }

  throw new Error(`未知的键盘操作: ${action}`)
}
