import type { Page } from 'puppeteer-core'
import { useAutoScreenshot } from '../useAutoScreenshot'

export interface ComputerActionParams {
  page: Page
  action: string
  coordinate?: number[]
  text?: string
  arg?: string
  pixels?: number
  press_enter?: boolean
  delete_existing_text?: boolean
  time?: number
}

// 辅助函数：在页面上显示点击指示器
export const showClickIndicator = async (page: Page, x: number, y: number) => {
  try {
    await page.evaluate(
      (cx, cy) => {
        const div = document.createElement('div')
        div.style.position = 'fixed'
        div.style.left = cx + 'px'
        div.style.top = cy + 'px'
        div.style.width = '30px'
        div.style.height = '30px'
        div.style.marginLeft = '-15px'
        div.style.marginTop = '-15px'
        div.style.borderRadius = '50%'
        div.style.backgroundColor = 'rgba(255, 0, 0, 0.5)'
        div.style.border = '2px solid red'
        div.style.zIndex = '999999'
        div.style.pointerEvents = 'none'
        div.style.transition = 'all 0.5s ease-out'
        div.style.transform = 'scale(0.5)'
        document.body.appendChild(div)

        // 触发动画
        setTimeout(() => {
          div.style.transform = 'scale(2)'
          div.style.opacity = '0.2'
        }, 10)

        // 1秒后移除
        setTimeout(() => {
          div.remove()
        }, 1000)
      },
      x,
      y
    )
  } catch (e) {
    console.warn('[computer] Failed to show click indicator:', e)
  }
}

// 获取坐标转换工具
export const getCoordinateConverter = () => {
  const { convertCompressedCoordinateToOriginal } = useAutoScreenshot()
  return convertCompressedCoordinateToOriginal
}

// 获取截屏工具
export const getScreenshotCapturer = () => {
  const { captureCurrentTab } = useAutoScreenshot()
  return captureCurrentTab
}
