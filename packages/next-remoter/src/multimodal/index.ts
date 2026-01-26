/**
 * 多模态消息功能导出
 */

// 导出所有多模态相关功能
export { useMultimodal, useMultimodalWithModel, convertAttachmentsToContent } from './useMultimodal'
export type { MultimodalConfig, MultimodalOptionsWithModel } from './useMultimodal'
export { fileToBase64, isImageFile, validateFileSize } from './utils'
