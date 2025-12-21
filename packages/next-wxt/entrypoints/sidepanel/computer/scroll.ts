import { type ComputerActionParams } from './utils'

export const handleScrollAction = async ({ page, pixels }: ComputerActionParams) => {
  const scrollPixels = pixels || 500
  await page.evaluate((y) => window.scrollBy(0, y), scrollPixels)
  return `已成功滚动 ${scrollPixels > 0 ? '向下' : '向上'} ${Math.abs(scrollPixels)} 像素`
}
