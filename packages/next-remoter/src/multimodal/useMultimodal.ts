/**
 * 多模态消息处理 Composable
 * 负责处理文件选择和转换为多模态消息内容
 */

import { ref } from 'vue'
import type { Attachment } from '@opentiny/tiny-robot'
import { fileToBase64, isImageFile, validateFileSize } from './utils'
import { showToast } from 'vant'

/**
 * 多模态配置
 */
export interface MultimodalConfig {
  /** 最大文件大小（MB） */
  maxFileSize?: number
  /** 支持的文件类型（MIME类型前缀，如 'image/'） */
  supportedTypes?: string[]
}

/**
 * 将附件转换为多模态消息内容（AI SDK 格式）
 * @param attachments 附件列表
 * @returns Promise<Array> 多模态消息内容数组
 */
export async function convertAttachmentsToContent(attachments: Attachment[]): Promise<any[]> {
  if (attachments.length === 0) return []

  const content: any[] = []

  for (const attachment of attachments) {
    if (!attachment.rawFile) continue

    try {
      // 转换为base64
      const base64Data = await fileToBase64(attachment.rawFile)

      // 添加到内容数组（使用 AI SDK 标准格式）
      if (isImageFile(attachment.rawFile)) {
        content.push({
          type: 'image',
          image: base64Data  // AI SDK 使用 image 字段，不是 image_url
        })
      }
    } catch (error) {
      console.error('文件转换失败:', error)
      showToast({
        type: 'fail',
        message: '文件处理失败'
      })
    }
  }

  return content
}

/**
 * 多模态消息 Composable
 */
export function useMultimodal(config: MultimodalConfig = {}) {
  const {
    maxFileSize = 10, // 默认10MB
    supportedTypes = ['image/'] // 默认只支持图片
  } = config

  // 附件列表（用于UI显示）
  const attachments = ref<Attachment[]>([])

  /**
   * 处理文件选择
   * @param files 选择的文件列表
   */
  const handleFilesSelected = async (files: File[]) => {
    if (!files || files.length === 0) return

    // 清空之前的附件
    clearAttachments()

    for (const file of files) {
      // 验证文件类型
      const isSupported = supportedTypes.some(type => file.type.startsWith(type))
      if (!isSupported) {
        showToast({
          type: 'fail',
          message: `不支持的文件类型: ${file.type}`
        })
        continue
      }

      // 验证文件大小
      if (!validateFileSize(file, maxFileSize)) {
        showToast({
          type: 'fail',
          message: `文件大小超过 ${maxFileSize}MB 限制`
        })
        continue
      }

      // 添加到附件列表（用于UI显示）
      attachments.value.push({
        rawFile: file,
        url: URL.createObjectURL(file)
      })
    }
  }

  /**
   * 清空附件
   */
  const clearAttachments = () => {
    // 释放 URL 对象
    attachments.value.forEach(att => {
      if (att.url) {
        URL.revokeObjectURL(att.url)
      }
    })
    attachments.value = []
  }

  return {
    attachments,
    handleFilesSelected,
    clearAttachments
  }
}
