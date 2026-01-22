import { ref } from 'vue'
import { snapshotManagerPool } from '../utils/snapshotManagerPool'

// 模块级变量：存储最后一次截图的尺寸信息，用于坐标转换（所有实例共享）
let lastScreenshotSize: {
  originalWidth: number      // 截图的实际宽度（物理像素）
  originalHeight: number     // 截图的实际高度（物理像素）
  compressedWidth: number    // 压缩后的宽度（当前未压缩，等于 originalWidth）
  compressedHeight: number   // 压缩后的高度（当前未压缩，等于 originalHeight）
  viewportWidth: number      // 页面视口的 CSS 宽度
  viewportHeight: number     // 页面视口的 CSS 高度
} | null = null

/**
 * 自动截图 Composable
 * 使用 Puppeteer 的截图功能，复用现有的 snapshotManager
 */
export const useAutoScreenshot = () => {
  const isCapturing = ref(false)
  const lastScreenshot = ref<string | null>(null)

  /**
   * 获取当前活动标签页 ID
   */
  const getCurrentTabId = async (): Promise<number> => {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true })
    if (!tabs[0]?.id) {
      throw new Error('无法获取当前活动标签页')
    }
    return tabs[0].id
  }

  /**
   * 压缩图片
   * @param dataUrl 原始图片 Data URL
   * @param quality 图片质量 (0-1)
   * @param maxWidth 最大宽度
   * @returns Promise<{dataUrl: string, originalWidth: number, originalHeight: number, compressedWidth: number, compressedHeight: number}> 压缩后的图片信息和尺寸
   */
  const compressImage = (
    dataUrl: string,
    quality = 0.6,
    maxWidth = 512
  ): Promise<{
    dataUrl: string
    originalWidth: number
    originalHeight: number
    compressedWidth: number
    compressedHeight: number
  }> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        try {
          // 保存原始尺寸
          const originalWidth = img.width
          const originalHeight = img.height

          // 计算缩放后的尺寸
          let compressedWidth = originalWidth
          let compressedHeight = originalHeight

          if (originalWidth > maxWidth) {
            compressedHeight = Math.round((originalHeight * maxWidth) / originalWidth)
            compressedWidth = maxWidth
          }

          // 创建 Canvas 进行压缩
          const canvas = document.createElement('canvas')
          canvas.width = compressedWidth
          canvas.height = compressedHeight

          const ctx = canvas.getContext('2d')
          if (!ctx) {
            reject(new Error('无法创建 Canvas 上下文'))
            return
          }

          ctx.drawImage(img, 0, 0, compressedWidth, compressedHeight)

          // 转换为 JPEG 格式进行压缩（PNG 压缩率低）
          const compressedDataUrl = canvas.toDataURL('image/jpeg', quality)

          resolve({
            dataUrl: compressedDataUrl,
            originalWidth,
            originalHeight,
            compressedWidth,
            compressedHeight
          })
        } catch (e) {
          reject(e)
        }
      }
      img.onerror = (e) => reject(e)
      img.src = dataUrl
    })
  }

  /**
   * 保存截图到本地
   * @param dataUrl 图片的 data URL (base64 格式)
   * @param filename 文件名（可选，默认使用时间戳）
   */
  const saveScreenshotToLocal = async (dataUrl: string, filename?: string): Promise<void> => {
    try {
      // 从 data URL 中提取图片类型和 base64 数据
      const base64Match = dataUrl.match(/^data:image\/(\w+);base64,(.+)$/)
      if (!base64Match) {
        throw new Error('无效的图片数据格式')
      }

      const imageType = base64Match[1] // 'png' 或 'jpeg'
      const base64Data = base64Match[2]

      // 将 base64 转换为二进制数据
      const binaryString = atob(base64Data)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }

      // 创建 Blob
      const blob = new Blob([bytes], { type: `image/${imageType}` })

      // 创建 Blob URL
      const blobUrl = URL.createObjectURL(blob)

      // 生成文件名（使用时间戳）
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
      const defaultFilename = `screenshot-${timestamp}.${imageType}`
      const finalFilename = filename || defaultFilename

      // 创建隐藏的 <a> 标签并触发下载
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = finalFilename
      link.style.display = 'none'
      document.body.appendChild(link)
      link.click()

      // 清理：移除链接元素并释放 Blob URL
      setTimeout(() => {
        document.body.removeChild(link)
        URL.revokeObjectURL(blobUrl)
      }, 100)

      console.log(`[useAutoScreenshot] 截图已保存到本地: ${finalFilename}`)
    } catch (error: any) {
      console.error('[useAutoScreenshot] 保存截图失败:', error)
      // 不抛出错误，避免影响主流程
    }
  }

  /**
   * 捕获当前活动标签页的截图
   * @returns Promise<string> base64 格式的 JPEG 图片 data URL
   */
  const captureCurrentTab = async (): Promise<string> => {
    if (isCapturing.value) {
      throw new Error('正在捕获截图，请稍候')
    }

    let tabId: number | null = null
    try {
      isCapturing.value = true

      // 获取当前活动标签页 ID
      tabId = await getCurrentTabId()

      // 从连接池获取 manager
      const manager = await snapshotManagerPool.getManager(tabId)

      try {
        const page = manager.getPage()
        if (!page) {
          throw new Error('页面未连接，请先确保标签页已加载')
        }

        // 获取页面视口的实际 CSS 尺寸（用于坐标转换）
        const viewportSize = await page.evaluate(() => ({
          width: window.innerWidth,
          height: window.innerHeight,
          devicePixelRatio: window.devicePixelRatio
        }))

        // 使用 Puppeteer 的 screenshot 方法 (先获取 PNG)
        const screenshotBuffer = await page.screenshot({
          type: 'png',
          encoding: 'base64'
        })

        // 转换为 data URL 格式
        const originalDataUrl = `data:image/png;base64,${screenshotBuffer}`

        // 压缩图片用于 AI 分析（减小数据传输量）
        const compressedResult = await compressImage(originalDataUrl, 0.8, 1024)

        // 保存尺寸信息到模块级变量
        lastScreenshotSize = {
          originalWidth: compressedResult.originalWidth,     // 原始截图尺寸
          originalHeight: compressedResult.originalHeight,
          compressedWidth: compressedResult.compressedWidth,   // 压缩后尺寸（AI看到的）
          compressedHeight: compressedResult.compressedHeight, // 压缩后尺寸（AI看到的）
          viewportWidth: viewportSize.width,                 // 视口CSS尺寸
          viewportHeight: viewportSize.height
        }

        // 返回压缩后的图片给 AI
        lastScreenshot.value = compressedResult.dataUrl
        return compressedResult.dataUrl
      } finally {
        // 释放 manager
        if (tabId !== null) {
          await snapshotManagerPool.releaseManager(tabId)
        }
      }
    } finally {
      isCapturing.value = false
    }
  }

  /**
   * 将压缩后截图的坐标转换为原始页面坐标
   * @param x 压缩后截图上的 x 坐标
   * @param y 压缩后截图上的 y 坐标
   * @returns {x: number, y: number} 原始页面坐标，如果无法转换则返回原坐标
   */
  const convertCompressedCoordinateToOriginal = (x: number, y: number): { x: number; y: number } => {
    if (!lastScreenshotSize) {
      console.warn('[useAutoScreenshot] 没有截图尺寸信息，无法转换坐标，返回原坐标')
      return { x, y }
    }

    const { originalWidth, originalHeight, compressedWidth, compressedHeight, viewportWidth, viewportHeight } = lastScreenshotSize

    // 第一步：从压缩图坐标转换到原始截图坐标
    const imageScaleX = originalWidth / compressedWidth
    const imageScaleY = originalHeight / compressedHeight
    const scaledX = x * imageScaleX
    const scaledY = y * imageScaleY

    // 第二步：从原始截图坐标转换到视口CSS坐标
    const viewportToScreenshotRatioX = viewportWidth / originalWidth
    const viewportToScreenshotRatioY = viewportHeight / originalHeight
    const cssX = Math.round(scaledX * viewportToScreenshotRatioX)
    const cssY = Math.round(scaledY * viewportToScreenshotRatioY)

    return { x: cssX, y: cssY }
  }

  return {
    captureCurrentTab,
    isCapturing,
    lastScreenshot,
    convertCompressedCoordinateToOriginal
  }
}
