import { ref } from 'vue'
import { snapshotManagerPool } from './utils/snapshotManagerPool'

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
   * @returns Promise<string> 压缩后的图片 Data URL (JPEG 格式)
   */
    const compressImage = (dataUrl: string, quality = 0.6, maxWidth = 512): Promise<string> => {
        return new Promise((resolve, reject) => {
            const img = new Image()
            img.onload = () => {
                try {
                    // 计算缩放比例
                    let width = img.width
                    let height = img.height

                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width)
                        width = maxWidth
                    }

                    // 创建 Canvas 进行压缩
                    const canvas = document.createElement('canvas')
                    canvas.width = width
                    canvas.height = height

                    const ctx = canvas.getContext('2d')
                    if (!ctx) {
                        reject(new Error('无法创建 Canvas 上下文'))
                        return
                    }

                    ctx.drawImage(img, 0, 0, width, height)

                    // 转换为 JPEG 格式进行压缩（PNG 压缩率低）
                    const compressedDataUrl = canvas.toDataURL('image/jpeg', quality)
                    resolve(compressedDataUrl)
                } catch (e) {
                    reject(e)
                }
            }
            img.onerror = (e) => reject(e)
            img.src = dataUrl
        })
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

                // 使用 Puppeteer 的 screenshot 方法 (先获取 PNG)
                const screenshotBuffer = await page.screenshot({
                    type: 'png',
                    encoding: 'base64'
                })

                // 转换为 data URL 格式
                const originalDataUrl = `data:image/png;base64,${screenshotBuffer}`

                // 压缩图片
                const compressedDataUrl = await compressImage(originalDataUrl)
                console.log(`[useAutoScreenshot] 图片压缩: ${originalDataUrl.length} -> ${compressedDataUrl.length}`)

                lastScreenshot.value = compressedDataUrl
                return compressedDataUrl
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

    return {
        captureCurrentTab,
        isCapturing,
        lastScreenshot
    }
}
