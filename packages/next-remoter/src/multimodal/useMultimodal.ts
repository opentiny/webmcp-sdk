/**
 * 多模态消息处理 Composable
 * 统一管理所有多模态相关逻辑：文件选择、验证、模型切换、消息转换
 */

import { ref, computed, watch, type ComputedRef, type Ref, unref } from 'vue'
import type { Attachment } from '@opentiny/tiny-robot'
import { fileToBase64, isImageFile, validateFileSize } from './utils'
import { showToast } from 'vant'
import type { UnifiedModelConfig } from '../types/model-config'

/**
 * 多模态配置（基础版本）
 */
export interface MultimodalConfig {
  /** 最大文件大小（MB） - 支持响应式 */
  maxFileSize?: number | ComputedRef<number>
  /** 支持的文件类型（MIME类型前缀，如 'image/'） - 支持响应式 */
  supportedTypes?: string[] | ComputedRef<string[]>
}

/**
 * 多模态配置（完整版本，支持模型感知）
 */
export interface MultimodalOptionsWithModel {
  /** 当前选中的模型 */
  selectedModel: Ref<UnifiedModelConfig | undefined>
  /** 当前选中的模型 ID */
  selectedModelId: Ref<string | undefined>
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
 * 多模态消息 Composable（基础版本）
 * 适用于不需要模型感知的场景
 */
export function useMultimodal(config: MultimodalConfig = {}) {
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

    // 获取当前配置值（支持响应式）
    const maxFileSize = unref(config.maxFileSize) || 10
    const supportedTypes = unref(config.supportedTypes) || ['image/']

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

/**
 * 多模态消息 Composable（完整版本）
 * 集成模型感知、自动验证、切换处理等高级功能
 * 
 * @param options 包含选中的模型和模型ID
 * @returns 多模态功能的完整API
 */
export function useMultimodalWithModel(options: MultimodalOptionsWithModel) {
  const { selectedModel, selectedModelId } = options

  // 检查模型是否支持多模态
  const hasMultimodalSupport = computed(() => {
    return selectedModel.value?.multimodal?.supportImages ?? false
  })

  // 多模态配置（响应式，自动从模型配置中获取）
  const maxFileSize = computed(() => selectedModel.value?.multimodal?.maxFileSize || 10)
  const supportedTypes = computed(() => selectedModel.value?.multimodal?.supportedMimeTypes || ['image/'])

  // 使用基础版本的 useMultimodal
  const { attachments, handleFilesSelected, clearAttachments } = useMultimodal({
    maxFileSize,
    supportedTypes
  })

  // 监听模型切换，清空不符合新模型要求的附件
  watch(selectedModelId, () => {
    if (attachments.value.length > 0 && selectedModel.value) {
      const newMaxSize = selectedModel.value.multimodal?.maxFileSize || 10
      const newTypes = selectedModel.value.multimodal?.supportedMimeTypes || ['image/']
      
      // 检查现有附件是否符合新模型要求
      const invalidAttachments = attachments.value.filter(att => {
        if (!att.rawFile) return true
        
        // 检查类型
        const isSupported = newTypes.some(type => att.rawFile!.type.startsWith(type))
        if (!isSupported) return true
        
        // 检查大小
        const maxBytes = newMaxSize * 1024 * 1024
        if (att.rawFile.size > maxBytes) return true
        
        return false
      })
      
      // 如果有不符合的附件，清空所有附件并提示
      if (invalidAttachments.length > 0) {
        clearAttachments()
        showToast('切换模型后，之前选择的附件已清空')
      }
    }
  })

  /**
   * 处理文件选择（封装）
   */
  const onFilesSelected = (files: File[]) => {
    handleFilesSelected(files)
  }

  /**
   * 检查是否可以发送附件
   * @returns 如果不能发送，返回 false 并显示提示
   */
  const checkCanSendAttachments = (): boolean => {
    if (attachments.value.length > 0 && !hasMultimodalSupport.value) {
      showToast('当前模型不支持附件，请先移除附件或切换支持多模态的模型')
      return false
    }
    return true
  }

  /**
   * 处理附件：转换为多模态内容
   * @returns 多模态内容数组
   */
  const processAttachments = async (): Promise<any[]> => {
    if (attachments.value.length === 0) {
      return []
    }

    // 使用统一的转换函数
    const multimodalContent = await convertAttachmentsToContent(attachments.value)
    return multimodalContent
  }

  /**
   * 清理附件（发送成功后调用）
   */
  const cleanupAttachments = () => {
    if (attachments.value.length > 0) {
      clearAttachments()
    }
  }

  return {
    // 状态
    hasMultimodalSupport,
    attachments,
    
    // 方法
    onFilesSelected,
    checkCanSendAttachments,
    processAttachments,
    cleanupAttachments,
    
    // 底层方法（供高级使用）
    clearAttachments
  }
}
