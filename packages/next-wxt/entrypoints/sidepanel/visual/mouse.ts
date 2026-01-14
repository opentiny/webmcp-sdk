import { type VisualActionParams, showClickIndicator, getCoordinateConverter } from './utils'

export const handleMouseAction = async ({ page, action, coordinate }: VisualActionParams) => {
  if (!coordinate || coordinate.length !== 2) {
    throw new Error(`操作 ${action} 需要有效的坐标 [x, y]`)
  }

  const [x, y] = coordinate
  const convert = getCoordinateConverter()
  const originalCoords = convert(x, y)
  const finalX = originalCoords.x
  const finalY = originalCoords.y

  console.log(`[visual] ${action} 坐标转换: AI(${x}, ${y}) -> 原始(${finalX}, ${finalY})`)

  const clickOptions: any = {}
  if (action === 'right_click') clickOptions.button = 'right'
  if (action === 'middle_click') clickOptions.button = 'middle'
  if (action === 'double_click') clickOptions.clickCount = 2

  // 显示点击效果
  await showClickIndicator(page, finalX, finalY)
  await page.mouse.click(finalX, finalY, clickOptions)

  return `成功执行 ${action} 于 [${finalX}, ${finalY}]`
}
