import { ref } from 'vue'

/**
 * 自动截图 Composable
 * 用于在发送消息前自动捕获当前标签页的截图
 */
export const useAutoScreenshot = () => {
    const isCapturing = ref(false)
    const lastScreenshot = ref<string | null>(null)

    /**
     * 捕获当前活动标签页的截图
     * @returns Promise<string> base64 格式的 PNG 图片 data URL
     */
    const captureCurrentTab = async (): Promise<string> => {
        if (isCapturing.value) {
            throw new Error('正在捕获截图，请稍候')
        }

        try {
            isCapturing.value = true

            // 获取当前活动标签页
            const tabs = await browser.tabs.query({ active: true, currentWindow: true })
            if (!tabs[0]?.id) {
                throw new Error('无法获取当前标签页')
            }

            const tab = await browser.tabs.get(tabs[0].id)
            if (!tab.windowId) {
                throw new Error('无法获取窗口 ID')
            }

            // 捕获截图
            const dataUrl = await browser.tabs.captureVisibleTab(tab.windowId, {
                format: 'png'
            })

            lastScreenshot.value = dataUrl
            return dataUrl
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
