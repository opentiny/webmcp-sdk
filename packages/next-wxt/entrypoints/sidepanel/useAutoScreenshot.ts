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
     * 捕获当前活动标签页的截图
     * @returns Promise<string> base64 格式的 PNG 图片 data URL
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

                // 使用 Puppeteer 的 screenshot 方法
                const screenshotBuffer = await page.screenshot({
                    type: 'png',
                    encoding: 'base64'
                })

                // 转换为 data URL 格式
                const dataUrl = `data:image/png;base64,${screenshotBuffer}`

                lastScreenshot.value = dataUrl
                return dataUrl
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
