import { snapshotManagerPool } from './snapshotManagerPool'
import { getCurrentTabId } from './utils'

/**
 * 视觉引导辅助函数
 * 用于支持基于屏幕截图的视觉引导自动化流程
 */

/**
 * 获取当前活动标签页的截图（base64 格式）
 * @param options 截图选项
 * @returns base64 编码的图片数据 URL
 */
export async function captureCurrentTabScreenshot(options?: {
  tabId?: number // 目标标签页 ID，如果不提供则使用当前活动标签页
  fullPage?: boolean // 是否截取整个页面（包括滚动区域）
  type?: 'png' | 'jpeg' // 图片类型
}): Promise<string> {
  // 获取当前标签页
  const currentTabId = options?.tabId || (await getCurrentTabId())

  // 从连接池获取管理器（连接会被复用，不会频繁断开）
  const manager = await snapshotManagerPool.getManager(currentTabId)
  try {
    // 截取截图（返回 base64 data URL）
    // 保持原始尺寸不变
    const screenshotBase64 = await manager.takeScreenshot({
      fullPage: options?.fullPage ?? false,
      type: options?.type ?? 'png' // 默认使用 PNG 格式
    })

    return screenshotBase64
  } finally {
    // 释放连接引用（连接池会管理连接生命周期，不会立即断开）
    await snapshotManagerPool.releaseManager(currentTabId)
  }
}

/**
 * 视觉引导消息构建器
 * 用于构建包含截图的多模态消息
 */
export class VisionGuideMessageBuilder {
  private textParts: string[] = []
  private images: string[] = []

  /**
   * 添加文本内容
   */
  addText(text: string): this {
    this.textParts.push(text)
    return this
  }

  /**
   * 添加截图
   */
  addScreenshot(base64Image: string): this {
    this.images.push(base64Image)
    return this
  }

  /**
   * 添加当前标签页的截图
   */
  async addCurrentTabScreenshot(options?: {
    tabId?: number
    fullPage?: boolean
    type?: 'png' | 'jpeg'
  }): Promise<this> {
    const screenshot = await captureCurrentTabScreenshot(options)
    this.images.push(screenshot)
    return this
  }

  /**
   * 构建多模态消息内容
   * 返回格式符合 AI SDK 的 UserModelMessage.content 格式
   */
  build(): Array<{ type: 'text'; text: string } | { type: 'image'; image: string }> {
    const content: Array<{ type: 'text'; text: string } | { type: 'image'; image: string }> = []

    // 添加文本部分
    if (this.textParts.length > 0) {
      content.push({ type: 'text', text: this.textParts.join('\n\n') })
    }

    // 添加图片部分
    for (const image of this.images) {
      content.push({ type: 'image', image })
    }

    return content
  }

  /**
   * 重置构建器
   */
  reset(): this {
    this.textParts = []
    this.images = []
    return this
  }
}

/**
 * 创建视觉引导消息构建器
 */
export function createVisionGuideMessage(): VisionGuideMessageBuilder {
  return new VisionGuideMessageBuilder()
}
